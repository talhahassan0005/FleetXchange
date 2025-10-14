import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin, requireClientOrAdmin } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { getLoadsCollection, getUsersCollection } from '../lib/mongodb';
import { getDocumentsCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
// Using direct MongoDB connection

const router = express.Router();

// Get all loads
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['ACTIVE', 'ASSIGNED', 'COMPLETED', 'CANCELLED']),
  query('clientId').optional(),
  query('assignedTransporterId').optional()
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
  const status = req.query.status as string;
  const clientId = req.query.clientId as string;
  const assignedTransporterId = req.query.assignedTransporterId as string;

  console.log('🔍 GET /loads - Query params:', { page, limit, status, clientId, assignedTransporterId });
  console.log('👤 User:', { id: req.user!.id, type: req.user!.userType });

  // Build query for filtering
  const query: any = {};
  
  if (status) {
    query.status = status;
  }
  
  if (clientId) {
    query.clientId = clientId;
  }

  // If assignedTransporterId is provided, filter by it
  if (assignedTransporterId) {
    query.assignedTransporterId = assignedTransporterId;
    console.log('✅ Filtering by assignedTransporterId:', assignedTransporterId);
  }

  // If user is not admin, filter based on user type
  if (req.user!.userType !== 'ADMIN') {
    if (req.user!.userType === 'CLIENT') {
      query.clientId = req.user!.id;
    } else if (req.user!.userType === 'TRANSPORTER') {
      // If assignedTransporterId is explicitly requested, use it
      if (assignedTransporterId) {
        query.assignedTransporterId = assignedTransporterId;
      } else {
        // Otherwise, transporters can see active loads or loads assigned to them
        query.$or = [
          { status: 'ACTIVE' },
          { assignedTransporterId: req.user!.id }
        ];
      }
    }
  }

  // Get loads from database using MongoDB (exclude soft-deleted)
  const loadsCollection = getLoadsCollection();
  const finalQuery = { ...query, deletedAt: { $exists: false } };
  console.log('🔍 Final MongoDB query:', JSON.stringify(finalQuery, null, 2));
  
  const loads = await loadsCollection
    .find(finalQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  console.log('📦 Loads found:', loads.length);
  if (assignedTransporterId && loads.length > 0) {
    console.log('✅ Sample load assignedTransporterId:', loads[0].assignedTransporterId);
  }

  const total = await loadsCollection.countDocuments(finalQuery);

  // Convert MongoDB _id to id for frontend compatibility
  const formattedLoads = loads.map(load => ({
    ...load,
    id: load._id.toString()
  }));

  res.json({
    loads: formattedLoads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get load by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const loadsCollection = getLoadsCollection();
  const usersCollection = getUsersCollection();
  
  const load = await loadsCollection.findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });

  if (!load) {
    throw createError('Load not found', 404);
  }
  
  // Get client and transporter details separately
  const client = load.clientId ? await usersCollection.findOne(
    { _id: new ObjectId(load.clientId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, phone: 1, email: 1 } }
  ) : null;
  
  const assignedTransporter = load.assignedTransporterId ? await usersCollection.findOne(
    { _id: new ObjectId(load.assignedTransporterId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, phone: 1, email: 1 } }
  ) : null;
  
  // Convert _id to id for consistency
  const loadWithId = { ...load, id: load._id.toString() };
  delete (loadWithId as any)._id;
  
  if (client) {
    client.id = client._id.toString();
    delete (client as any)._id;
  }
  
  if (assignedTransporter) {
    assignedTransporter.id = assignedTransporter._id.toString();
    delete (assignedTransporter as any)._id;
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN') {
    if (req.user!.userType === 'CLIENT' && load.clientId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
    if (req.user!.userType === 'TRANSPORTER' && 
        load.status !== 'ACTIVE' && 
        load.assignedTransporterId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
  }

  res.json({ 
    load: {
      ...loadWithId,
      client,
      assignedTransporter,
      bids: [], // TODO: Implement bids if needed
      messages: [] // TODO: Implement messages if needed
    }
  });
}));

// Create new load (Client or Admin only)
router.post('/', requireClientOrAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('cargoType').notEmpty().withMessage('Cargo type is required'),
  body('weight').isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('pickupLocation').notEmpty().withMessage('Pickup location is required'),
  body('deliveryLocation').notEmpty().withMessage('Delivery location is required'),
  body('pickupDate').isISO8601().withMessage('Valid pickup date is required'),
  body('deliveryDate').isISO8601().withMessage('Valid delivery date is required'),
  body('budgetMin').isFloat({ min: 0 }).withMessage('Minimum budget must be a positive number'),
  body('budgetMax').isFloat({ min: 0 }).withMessage('Maximum budget must be a positive number'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'EGP', 'GHS', 'TZS', 'UGX']).withMessage('Invalid currency')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const {
    title,
    description,
    cargoType,
    weight,
    pickupLocation,
    deliveryLocation,
    pickupDate,
    deliveryDate,
    budgetMin,
    budgetMax,
    currency = 'USD'
  } = req.body;

  // Validate date logic
  const pickup = new Date(pickupDate);
  const delivery = new Date(deliveryDate);
  if (delivery <= pickup) {
    throw createError('Delivery date must be after pickup date', 400);
  }

  // Validate budget logic
  if (budgetMax < budgetMin) {
    throw createError('Maximum budget must be greater than minimum budget', 400);
  }

  // Ensure client's documents are verified before allowing posting (clients only)
  if (req.user!.userType === 'CLIENT') {
    const documentsCollection = getDocumentsCollection();
    const verifiedDoc = await documentsCollection.findOne({ userId: req.user!.id, verificationStatus: 'APPROVED' });
    if (!verifiedDoc) {
      throw createError("Your account is under verification. You’ll be able to post loads once approved.", 403);
    }
  }

  // Check for duplicate loads using MongoDB
  const loadsCollection = getLoadsCollection();
  
  const duplicateExists = await loadsCollection.findOne({
      title,
      clientId: req.user!.userType === 'ADMIN' ? req.body.clientId : req.user!.id,
      pickupLocation,
      deliveryLocation,
      budgetMin: parseFloat(budgetMin),
    budgetMax: parseFloat(budgetMax),
    status: 'ACTIVE'
  });

  if (duplicateExists) {
    throw createError('An active load with the same details already exists', 400);
  }

  // Create load in database using MongoDB
  const loadData = {
      title,
      description,
      cargoType,
      weight: parseFloat(weight),
      pickupLocation,
      deliveryLocation,
      pickupDate: pickup.toISOString(),
      deliveryDate: delivery.toISOString(),
      budgetMin: parseFloat(budgetMin),
      budgetMax: parseFloat(budgetMax),
      currency,
      status: 'ACTIVE',
      clientId: req.user!.userType === 'ADMIN' ? req.body.clientId : req.user!.id,
    assignedTransporterId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await loadsCollection.insertOne(loadData);
  const load = { ...loadData, _id: result.insertedId };

  console.log('✅ Load created successfully:', {
    id: load._id.toString(),
    title: load.title,
    clientId: load.clientId,
    status: load.status
  });

  // Send email notification to transporters
  try {
    await EmailService.sendLoadNotificationToTransporters(
      req.user!.email,
      'Client', // Simplified for now
      load.title,
      load._id.toString()
    );
    console.log('✅ Email notification sent to transporters');
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
  }

  // Convert _id to id for consistency
  const loadWithId = { ...load, id: load._id.toString() };
  delete (loadWithId as any)._id;

  res.status(201).json({
    message: 'Load created successfully',
    load: loadWithId
  });
}));

// Update load
router.put('/:id', [
  body('title').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('cargoType').optional().notEmpty(),
  body('weight').optional().isFloat({ min: 0 }),
  body('pickupLocation').optional().notEmpty(),
  body('deliveryLocation').optional().notEmpty(),
  body('pickupDate').optional().isISO8601(),
  body('deliveryDate').optional().isISO8601(),
  body('budgetMin').optional().isFloat({ min: 0 }),
  body('budgetMax').optional().isFloat({ min: 0 })
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

  // Check if load exists and user has permission
  const loadsCollection = getLoadsCollection();
  const existingLoad = await loadsCollection.findOne(
    { _id: new ObjectId(id), deletedAt: { $exists: false } },
    { projection: { _id: 1, clientId: 1, status: 1 } }
  );

  if (!existingLoad) {
    throw createError('Load not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingLoad.clientId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Don't allow updates to completed or cancelled loads
  if (existingLoad.status === 'COMPLETED' || existingLoad.status === 'CANCELLED') {
    throw createError('Cannot update completed or cancelled loads', 400);
  }

  const updateData = { ...req.body };
  delete updateData.clientId; // Prevent changing client

  // Validate dates if provided
  if (updateData.pickupDate && updateData.deliveryDate) {
    const pickup = new Date(updateData.pickupDate);
    const delivery = new Date(updateData.deliveryDate);
    if (delivery <= pickup) {
      throw createError('Delivery date must be after pickup date', 400);
    }
  }

  // Validate budget if provided
  if (updateData.budgetMin && updateData.budgetMax && updateData.budgetMax < updateData.budgetMin) {
    throw createError('Maximum budget must be greater than minimum budget', 400);
  }

  updateData.updatedAt = new Date();
  
  await loadsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );
  
  const load = await loadsCollection.findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
  
  if (!load) {
    throw createError('Load not found after update', 404);
  }
  
  // Get client and transporter details
  const usersCollection = getUsersCollection();
  const client = load.clientId ? await usersCollection.findOne(
    { _id: new ObjectId(load.clientId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
  ) : null;
  
  const assignedTransporter = load.assignedTransporterId ? await usersCollection.findOne(
    { _id: new ObjectId(load.assignedTransporterId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
  ) : null;
  
  // Convert _id to id for consistency
  const loadWithId = { ...load, id: load._id.toString() };
  delete (loadWithId as any)._id;
  
  if (client) {
    client.id = client._id.toString();
    delete (client as any)._id;
  }
  
  if (assignedTransporter) {
    assignedTransporter.id = assignedTransporter._id.toString();
    delete (assignedTransporter as any)._id;
  }

  res.json({
    message: 'Load updated successfully',
    load: {
      ...loadWithId,
      client,
      assignedTransporter
    }
  });
}));

// Update load status
router.put('/:id/status', [
  body('status').isIn(['ACTIVE', 'ASSIGNED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
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
  const { status } = req.body;

  const loadsCollection = getLoadsCollection();
  const existingLoad = await loadsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, clientId: 1, assignedTransporterId: 1, status: 1 } }
  );

  if (!existingLoad) {
    throw createError('Load not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN') {
    if (req.user!.userType === 'CLIENT' && existingLoad.clientId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
    if (req.user!.userType === 'TRANSPORTER' && existingLoad.assignedTransporterId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
  }

  await loadsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } }
  );
  
  const load = await loadsCollection.findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
  
  if (!load) {
    throw createError('Load not found after update', 404);
  }
  
  // Get client and transporter details
  const usersCollection = getUsersCollection();
  const client = load.clientId ? await usersCollection.findOne(
    { _id: new ObjectId(load.clientId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
  ) : null;
  
  const assignedTransporter = load.assignedTransporterId ? await usersCollection.findOne(
    { _id: new ObjectId(load.assignedTransporterId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
  ) : null;
  
  // Convert _id to id for consistency
  const loadWithId = { ...load, id: load._id.toString() };
  delete (loadWithId as any)._id;
  
  if (client) {
    client.id = client._id.toString();
    delete (client as any)._id;
  }
  
  if (assignedTransporter) {
    assignedTransporter.id = assignedTransporter._id.toString();
    delete (assignedTransporter as any)._id;
  }

  res.json({
    message: 'Load status updated successfully',
    load: {
      ...loadWithId,
      client,
      assignedTransporter
    }
  });
}));

// Delete load
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const loadsCollection = getLoadsCollection();
  const existingLoad = await loadsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, clientId: 1, status: 1 } }
  );

  if (!existingLoad) {
    throw createError('Load not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingLoad.clientId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Don't allow deletion of assigned or completed loads
  if (existingLoad.status === 'ASSIGNED' || existingLoad.status === 'COMPLETED') {
    throw createError('Cannot delete assigned or completed loads', 400);
  }

  // Soft delete - set deletedAt timestamp instead of removing the document
  await loadsCollection.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      } 
    }
  );

  res.json({
    message: 'Load deleted successfully'
  });
}));

// Restore soft-deleted load (Admin only)
router.put('/:id/restore', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const loadsCollection = getLoadsCollection();
  
  // Check if load exists and is soft-deleted
  const existingLoad = await loadsCollection.findOne(
    { _id: new ObjectId(id), deletedAt: { $exists: true } },
    { projection: { _id: 1, clientId: 1, status: 1, deletedAt: 1 } }
  );

  if (!existingLoad) {
    throw createError('Soft-deleted load not found', 404);
  }

  // Restore the load by removing deletedAt field
  await loadsCollection.updateOne(
    { _id: new ObjectId(id) },
    { 
      $unset: { deletedAt: 1 },
      $set: { updatedAt: new Date() }
    }
  );

  res.json({
    message: 'Load restored successfully'
  });
}));

// Get soft-deleted loads (Admin only)
router.get('/admin/deleted', requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

  const loadsCollection = getLoadsCollection();
  const usersCollection = getUsersCollection();
  
  // Get soft-deleted loads
  const loads = await loadsCollection
    .find({ deletedAt: { $exists: true } })
    .sort({ deletedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await loadsCollection.countDocuments({ deletedAt: { $exists: true } });

  // Add user information to each load
  for (const load of loads) {
    const client = await usersCollection.findOne(
      { _id: new ObjectId(load.clientId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    load.client = client;
    
    if (load.assignedTransporterId) {
      const transporter = await usersCollection.findOne(
        { _id: new ObjectId(load.assignedTransporterId) },
        { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
      );
      load.assignedTransporter = transporter;
    }
    
    load.id = load._id.toString();
    delete (load as any)._id;
  }

  res.json({
    loads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

export default router;