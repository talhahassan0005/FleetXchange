import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { getMessagesCollection, getLoadsCollection, getBidsCollection, getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get messages
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('loadId').optional().isString(),
  query('userId').optional().isString()
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
  const userId = req.query.userId as string;

  const where: any = {};
  if (loadId) where.loadId = loadId;
  if (userId) {
    where.$or = [
      { senderId: userId },
      { receiverId: userId }
    ];
  }

  // Get messages using MongoDB
  const messagesCollection = getMessagesCollection();
  const usersCollection = getUsersCollection();
  
  // Convert Prisma-style where clause to MongoDB query
  const mongoQuery: any = { 
    [`deletedBy.${req.user!.id}`]: { $exists: false }
  };
  if (where.loadId) mongoQuery.loadId = where.loadId;
  if (where.$or) mongoQuery.$or = where.$or;
  
  const [messages, total] = await Promise.all([
    messagesCollection
      .find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    messagesCollection.countDocuments(mongoQuery)
  ]);
  
  // Add user information to each message
  for (const message of messages) {
    const sender = await usersCollection.findOne(
      { _id: new ObjectId(message.senderId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.sender = sender;
    
    const receiver = await usersCollection.findOne(
      { _id: new ObjectId(message.receiverId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.receiver = receiver;
    
    message.id = message._id.toString();
    delete (message as any)._id;
  }

  res.json({
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get messages by load ID
router.get('/load/:loadId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { loadId } = req.params;

  // Verify the load exists and user has access
  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(loadId), deletedAt: { $exists: false } });

  if (!load) {
    throw createError('Load not found', 404);
  }

  // Check if user has access to this load
  let hasAccess = false;
  if (req.user!.userType === 'ADMIN') {
    hasAccess = true;
  } else if (req.user!.userType === 'CLIENT' && load.clientId === req.user!.id) {
    hasAccess = true;
  } else if (req.user!.userType === 'TRANSPORTER' && load.assignedTransporterId === req.user!.id) {
    hasAccess = true;
  }

  // If transporter, also check if they have bid on this load
  if (!hasAccess && req.user!.userType === 'TRANSPORTER') {
    const bidsCollection = getBidsCollection();
    const hasBid = await bidsCollection.findOne({
        loadId: loadId,
        transporterId: req.user!.id
    });
    hasAccess = !!hasBid;
  }

  if (!hasAccess) {
    throw createError('Access denied', 403);
  }

  // Get messages for this load
  const messagesCollection = getMessagesCollection();
  const usersCollection = getUsersCollection();
  
  const messages = await messagesCollection
    .find({ loadId, deletedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();

  // Add user information to each message
  for (const message of messages) {
    const sender = await usersCollection.findOne(
      { _id: new ObjectId(message.senderId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.sender = sender;
    
    const receiver = await usersCollection.findOne(
      { _id: new ObjectId(message.receiverId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.receiver = receiver;
    
    message.id = message._id.toString();
    delete (message as any)._id;
  }

  res.json({ messages });
}));

// Get message by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const messagesCollection = getMessagesCollection();
  const usersCollection = getUsersCollection();
  
  const message = await messagesCollection.findOne({ _id: new ObjectId(id) });

  if (!message) {
    throw createError('Message not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && 
      message.senderId !== req.user!.id && 
      message.receiverId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Add related data
  const sender = await usersCollection.findOne(
    { _id: new ObjectId(message.senderId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
  );
  message.sender = sender;

  const receiver = await usersCollection.findOne(
    { _id: new ObjectId(message.receiverId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
  );
  message.receiver = receiver;

  // Mark as read if user is the receiver
  if (message.receiverId === req.user!.id && !message.isRead) {
    await messagesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRead: true, updatedAt: new Date() } }
    );
    message.isRead = true;
  }

  message.id = message._id.toString();
  delete (message as any)._id;

  res.json({ message });
}));

// Create message
router.post('/', [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('loadId').optional().isString().withMessage('Load ID must be a string')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { receiverId, content, loadId } = req.body;

  // Validate receiver exists and is active
  const usersCollection = getUsersCollection();
  const receiver = await usersCollection.findOne(
    { _id: new ObjectId(receiverId) },
    { projection: { _id: 1, email: 1, companyName: 1, status: 1 } }
  );

  if (!receiver) {
    throw createError('Receiver not found', 404);
  }

  if (receiver.status !== 'ACTIVE') {
    throw createError('Receiver is not active', 400);
  }

  // Get sender info
  const sender = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
    { projection: { _id: 1, email: 1, companyName: 1 } }
  );

  // Get load info if provided
  let load = null;
  if (loadId) {
    const loadsCollection = getLoadsCollection();
    load = await loadsCollection.findOne(
      { _id: new ObjectId(loadId), deletedAt: { $exists: false } },
      { projection: { _id: 1, title: 1, clientId: 1 } }
    );
  }

  // Create message in database
  const messagesCollection = getMessagesCollection();
  const newMessage = await messagesCollection.insertOne({
      senderId: req.user!.id,
      receiverId,
    content,
      loadId: loadId || null,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  res.status(201).json({
    message: 'Message sent successfully',
    data: {
      id: newMessage.insertedId.toString(),
      senderId: req.user!.id,
      receiverId,
      content,
      loadId: loadId || null,
      isRead: false,
      createdAt: new Date(),
      sender,
      receiver,
      load
    }
  });
}));

// Mark message as read
router.put('/:id/read', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const messagesCollection = getMessagesCollection();
  
  const existingMessage = await messagesCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, receiverId: 1, isRead: 1 } }
  );

  if (!existingMessage) {
    throw createError('Message not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingMessage.receiverId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (existingMessage.isRead) {
    return res.json({ message: 'Message already marked as read' });
  }

  await messagesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { isRead: true, updatedAt: new Date() } }
  );

  return res.json({ message: 'Message marked as read' });
}));

// Mark all messages as read for a conversation
router.put('/conversation/:userId/read', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { userId } = req.params;

  // Validate the other user exists
  const usersCollection = getUsersCollection();
  const otherUser = await usersCollection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { _id: 1 } }
  );

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  const messagesCollection = getMessagesCollection();
  const result = await messagesCollection.updateMany(
    {
      senderId: userId,
      receiverId: req.user!.id,
      isRead: false
    },
    { $set: { isRead: true, updatedAt: new Date() } }
  );

  res.json({
    message: `${result.modifiedCount} messages marked as read`
  });
}));

// Get conversation between two users
router.get('/conversation/:userId', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  // Validate the other user exists
  const usersCollection = getUsersCollection();
  const otherUser = await usersCollection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, userType: 1 } }
  );

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  const messagesCollection = getMessagesCollection();
  const [messages, total] = await Promise.all([
    messagesCollection
      .find({
        $or: [
          { senderId: req.user!.id, receiverId: userId },
          { senderId: userId, receiverId: req.user!.id }
        ],
        [`deletedBy.${req.user!.id}`]: { $exists: false }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    messagesCollection.countDocuments({
      $or: [
          { senderId: req.user!.id, receiverId: userId },
          { senderId: userId, receiverId: req.user!.id }
        ],
        [`deletedBy.${req.user!.id}`]: { $exists: false }
    })
  ]);

  // Add user information to each message
  for (const message of messages) {
    const sender = await usersCollection.findOne(
      { _id: new ObjectId(message.senderId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.sender = sender;
    
    const receiver = await usersCollection.findOne(
      { _id: new ObjectId(message.receiverId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    message.receiver = receiver;
    
    message.id = message._id.toString();
    delete (message as any)._id;
  }

  res.json({
    messages,
      otherUser,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    }
  });
}));

// Delete message
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const messagesCollection = getMessagesCollection();
  
  const message = await messagesCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, senderId: 1, createdAt: 1 } }
  );

  if (!message) {
    throw createError('Message not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && message.senderId !== req.user!.id) {
      throw createError('Access denied', 403);
    }

  await messagesCollection.deleteOne({ _id: new ObjectId(id) });

  res.json({ message: 'Message deleted successfully' });
}));

// Get unread message count
router.get('/unread/count', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const messagesCollection = getMessagesCollection();
  
  const unreadCount = await messagesCollection.countDocuments({
      receiverId: req.user!.id,
    isRead: false,
    [`deletedBy.${req.user!.id}`]: { $exists: false }
  });

  res.json({ unreadCount });
}));

// Clear conversation (soft delete)
router.delete('/conversation/:otherUserId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { otherUserId } = req.params;

  // Validate the other user exists
  const usersCollection = getUsersCollection();
  const otherUser = await usersCollection.findOne(
    { _id: new ObjectId(otherUserId) },
    { projection: { _id: 1, companyName: 1, userType: 1 } }
  );

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  // Soft delete all messages between current user and other user (WhatsApp-style per-user deletion)
  const messagesCollection = getMessagesCollection();
  const result = await messagesCollection.updateMany(
    {
      $or: [
        { senderId: req.user!.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user!.id }
      ]
    },
    { 
      $set: { 
        [`deletedBy.${req.user!.id}`]: new Date(),
        updatedAt: new Date() 
      } 
    }
  );

  res.json({
    message: `${result.modifiedCount} messages cleared from conversation`
  });
}));

export default router;