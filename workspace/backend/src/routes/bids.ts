import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin, requireTransporterOrAdmin, requireClientOrAdmin } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { getBidsCollection, getLoadsCollection, getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { io } from '../server';

const router = express.Router();

// Get all bids
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('loadId').optional().isString(),
  query('transporterId').optional().isString(),
  query('status').optional().isIn(['ACTIVE', 'WON', 'LOST', 'WITHDRAWN'])
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const loadId = req.query.loadId as string;
  const transporterId = req.query.transporterId as string;
  const status = req.query.status as string;

  const where: any = {};
  if (loadId) where.loadId = loadId;
  if (transporterId) where.transporterId = transporterId;
  if (status) where.status = status;

  // Non-admin users can only see their own bids
  if (req.user!.userType !== 'ADMIN') {
  if (req.user!.userType === 'TRANSPORTER') {
    where.transporterId = req.user!.id;
  } else if (req.user!.userType === 'CLIENT') {
      // Clients can see bids on their loads
      const loadsCollection = getLoadsCollection();
      const userLoads = await loadsCollection.find(
        { clientId: req.user!.id, deletedAt: { $exists: false } },
        { projection: { _id: 1 } }
      ).toArray();
      const loadIds = userLoads.map(load => load._id.toString());
      where.loadId = { $in: loadIds };
    }
  }

  // Get bids using MongoDB
  const bidsCollection = getBidsCollection();
  const usersCollection = getUsersCollection();
  const loadsCollection = getLoadsCollection();
  
  // Convert Prisma-style where clause to MongoDB query
  const mongoQuery: any = {};
  if (where.loadId) mongoQuery.loadId = where.loadId;
  if (where.transporterId) mongoQuery.transporterId = where.transporterId;
  if (where.status) mongoQuery.status = where.status;
  
  const [bids, total] = await Promise.all([
    bidsCollection
      .find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    bidsCollection.countDocuments(mongoQuery)
  ]);
  
  // Add user and load information to each bid
  for (const bid of bids) {
    const transporter = await usersCollection.findOne(
      { _id: new ObjectId(bid.transporterId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    bid.transporter = transporter;
    
    const load = await loadsCollection.findOne(
      { _id: new ObjectId(bid.loadId) },
      { projection: { _id: 1, title: 1, clientId: 1 } }
    );
    bid.load = load;
    
    bid.id = bid._id.toString();
    delete (bid as any)._id;
  }

  res.json({
    bids,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get bid by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  const usersCollection = getUsersCollection();
  const loadsCollection = getLoadsCollection();
  
  const bid = await bidsCollection.findOne({ _id: new ObjectId(id) });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && 
      bid.transporterId !== req.user!.id && 
      bid.clientId !== req.user!.id) {
      throw createError('Access denied', 403);
  }

  // Add related data
  const transporter = await usersCollection.findOne(
    { _id: new ObjectId(bid.transporterId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
  );
  bid.transporter = transporter;

  const load = await loadsCollection.findOne(
    { _id: new ObjectId(bid.loadId) },
    { projection: { _id: 1, title: 1, clientId: 1, assignedTransporterId: 1 } }
  );
  bid.load = load;

  bid.id = bid._id.toString();
  delete (bid as any)._id;

  res.json({ bid });
}));

// Create bid
router.post('/', requireTransporterOrAdmin, [
  body('loadId').notEmpty().withMessage('Load ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('message').optional().isString().withMessage('Message must be a string')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { loadId, amount, message } = req.body;

  // Check if load exists and is active
  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(loadId) });

  if (!load) {
    throw createError('Load not found', 404);
  }

  if (load.status !== 'ACTIVE') {
    throw createError('Cannot bid on inactive loads', 400);
  }

  // Ensure transporter has verified documents before placing a bid
  if (req.user!.userType === 'TRANSPORTER') {
    const { getDocumentsCollection } = require('../lib/mongodb');
    const documentsCollection = getDocumentsCollection();
    const verifiedDoc = await documentsCollection.findOne({ userId: req.user!.id, verificationStatus: 'APPROVED' });
    if (!verifiedDoc) {
      throw createError('You must complete verification before placing bids.', 403);
    }
  }

  // Check if transporter already has an active bid for this load
  const bidsCollection = getBidsCollection();
  const existingBid = await bidsCollection.findOne({
      loadId,
      transporterId: req.user!.id,
      status: 'ACTIVE'
  });

  if (existingBid) {
    throw createError('You already have an active bid for this load', 400);
  }

  // Create bid in database
  const bid = await bidsCollection.insertOne({
      loadId,
      transporterId: req.user!.id,
      amount: parseFloat(amount),
    message: message || '',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Get transporter info for real-time updates
  const usersCollection = getUsersCollection();
  const transporter = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
    { projection: { _id: 1, email: 1, companyName: 1, contactPerson: 1 } }
  );

  // Prepare bid data for real-time updates
  const bidData = {
    id: bid.insertedId.toString(),
    loadId,
    transporterId: req.user!.id,
    amount: parseFloat(amount),
    message: message || '',
    status: 'ACTIVE',
    createdAt: new Date(),
    transporter: transporter
  };

  // Emit real-time bid creation event
  try {
    console.log('🚀 Emitting real-time bid creation events...');
    console.log('📊 Bid data:', bidData);
    console.log('👤 Load client ID:', load.clientId);
    console.log('🔌 Socket.IO instance:', !!io);
    
    // Notify load owner (client) about new bid
    if (load.clientId && load.clientId !== req.user!.id) {
      console.log(`📤 Emitting 'new_bid' to user_${load.clientId}`);
      io.to(`user_${load.clientId}`).emit('new_bid', {
        loadId: loadId,
        bid: bidData,
        transporterId: req.user!.id
      });
    }

    // Notify all users in the load room
    console.log(`📤 Emitting 'bid_placed' to load_${loadId}`);
    io.to(`load_${loadId}`).emit('bid_placed', {
      loadId: loadId,
      bid: bidData,
      transporterId: req.user!.id
    });

    // Emit general bid update for admin dashboard
    console.log('📤 Emitting global bid_created event');
    io.emit('bid_created', {
      bid: bidData,
      loadTitle: load.title
    });

    console.log('✅ Real-time bid creation events emitted successfully');
  } catch (error) {
    console.error('❌ Failed to emit real-time bid event:', error);
  }

  // Send email notification to client
  try {
    const client = await usersCollection.findOne(
      { _id: new ObjectId(load.clientId) },
      { projection: { email: 1, companyName: 1 } }
    );

    if (transporter && client) {
    await EmailService.sendBidNotificationToClient(
        transporter.email,
        transporter.companyName || 'Transporter',
        client.email,
        load.title,
        parseFloat(amount)
    );
    console.log('✅ Email notification sent to client');
    }
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
  }

  res.status(201).json({
    message: 'Bid created successfully',
    bid: {
      id: bid.insertedId.toString(),
      loadId,
      transporterId: req.user!.id,
      amount: parseFloat(amount),
      message: message || '',
      status: 'ACTIVE',
      createdAt: new Date()
    }
  });
}));

// Update bid
router.put('/:id', requireTransporterOrAdmin, [
  body('amount').optional().isFloat({ min: 0 }),
  body('message').optional().isString()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  
  const existingBid = await bidsCollection.findOne({ _id: new ObjectId(id) });

  if (!existingBid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingBid.transporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (existingBid.status !== 'ACTIVE') {
    throw createError('Cannot update non-active bids', 400);
  }

  const updateData: any = { updatedAt: new Date() };
  if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
  if (req.body.message !== undefined) updateData.message = req.body.message;

  const bid = await bidsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  res.json({
    message: 'Bid updated successfully',
    bid: {
      id,
      ...updateData
    }
  });
}));

// Accept bid (Client only)
router.put('/:id/accept', requireClientOrAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  const loadsCollection = getLoadsCollection();
  
  const bid = await bidsCollection.findOne({ _id: new ObjectId(id) });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check if user owns the load
  const load = await loadsCollection.findOne({ _id: new ObjectId(bid.loadId) });
  if (!load) {
    throw createError('Load not found', 404);
  }

  if (req.user!.userType !== 'ADMIN' && load.clientId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (bid.status !== 'ACTIVE') {
    throw createError('Cannot accept non-active bids', 400);
  }

  // Accept the bid and assign transporter to load
  await bidsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'WON', updatedAt: new Date() } }
  );

  // Update load to assign transporter
  await loadsCollection.updateOne(
    { _id: new ObjectId(bid.loadId) },
    { 
      $set: { 
        assignedTransporterId: bid.transporterId,
        status: 'ASSIGNED',
        updatedAt: new Date()
      } 
    }
  );

  // Reject all other bids for this load
  await bidsCollection.updateMany(
    { 
      loadId: bid.loadId,
      _id: { $ne: new ObjectId(id) },
      status: 'ACTIVE'
    },
    { $set: { status: 'LOST', updatedAt: new Date() } }
  );

  // Emit real-time bid acceptance events
  try {
    // Notify the transporter about bid acceptance
    if (bid.transporterId && bid.transporterId !== req.user!.id) {
      io.to(`user_${bid.transporterId}`).emit('bid_status_changed', {
        loadId: bid.loadId,
        bidId: id,
        status: 'WON',
        loadTitle: load.title
      });
    }

    // Notify all users in the load room
    io.to(`load_${bid.loadId}`).emit('bid_status_changed', {
      loadId: bid.loadId,
      bidId: id,
      status: 'WON',
      changedBy: req.user!.id
    });

    // Emit general bid update for admin dashboard
    io.emit('bid_accepted', {
      bidId: id,
      loadId: bid.loadId,
      transporterId: bid.transporterId,
      loadTitle: load.title
    });

    console.log('✅ Real-time bid acceptance event emitted');
  } catch (error) {
    console.error('❌ Failed to emit real-time bid acceptance event:', error);
  }

  res.json({
    message: 'Bid accepted successfully'
  });
}));

// Reject bid (Client only)
router.put('/:id/reject', requireClientOrAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  const loadsCollection = getLoadsCollection();
  
  const bid = await bidsCollection.findOne({ _id: new ObjectId(id) });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check if user owns the load
  const load = await loadsCollection.findOne({ _id: new ObjectId(bid.loadId) });
  if (!load) {
    throw createError('Load not found', 404);
  }

  if (req.user!.userType !== 'ADMIN' && load.clientId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (bid.status !== 'ACTIVE') {
    throw createError('Cannot reject non-active bids', 400);
  }

  // Reject the bid
  await bidsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'LOST', updatedAt: new Date() } }
  );

  // Emit real-time bid rejection events
  try {
    // Notify the transporter about bid rejection
    if (bid.transporterId && bid.transporterId !== req.user!.id) {
      io.to(`user_${bid.transporterId}`).emit('bid_status_changed', {
        loadId: bid.loadId,
        bidId: id,
        status: 'LOST',
        loadTitle: load.title
      });
    }

    // Notify all users in the load room
    io.to(`load_${bid.loadId}`).emit('bid_status_changed', {
      loadId: bid.loadId,
      bidId: id,
      status: 'LOST',
      changedBy: req.user!.id
    });

    // Emit general bid update for admin dashboard
    io.emit('bid_rejected', {
      bidId: id,
      loadId: bid.loadId,
      transporterId: bid.transporterId,
      loadTitle: load.title
    });

    console.log('✅ Real-time bid rejection event emitted');
  } catch (error) {
    console.error('❌ Failed to emit real-time bid rejection event:', error);
  }

  res.json({
    message: 'Bid rejected successfully'
  });
}));

// Withdraw bid (Transporter only)
router.put('/:id/withdraw', requireTransporterOrAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  
  const bid = await bidsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, transporterId: 1, status: 1 } }
  );

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && bid.transporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (bid.status !== 'ACTIVE') {
    throw createError('Cannot withdraw non-active bids', 400);
  }

  await bidsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'WITHDRAWN', updatedAt: new Date() } }
  );

  res.json({
    message: 'Bid withdrawn successfully'
  });
}));

// Delete bid (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bidsCollection = getBidsCollection();
  
  const bid = await bidsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, status: 1 } }
  );

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  await bidsCollection.deleteOne({ _id: new ObjectId(id) });

  res.json({
    message: 'Bid deleted successfully'
  });
}));

export default router;