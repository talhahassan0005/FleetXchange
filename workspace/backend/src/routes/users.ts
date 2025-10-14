import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get all users (Admin only)
router.get('/', requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userType').optional().isIn(['ADMIN', 'CLIENT', 'TRANSPORTER']),
  query('status').optional().isIn(['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'])
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
  const userType = req.query.userType as string;
  const status = req.query.status as string;

  const where: any = {};
  if (userType) where.userType = userType;
  if (status) where.status = status;

  // Get users using MongoDB
  const usersCollection = getUsersCollection();
  
  // Convert Prisma-style where clause to MongoDB query
  const mongoQuery: any = {};
  if (where.userType) mongoQuery.userType = where.userType;
  if (where.status) mongoQuery.status = where.status;
  
  const [users, total] = await Promise.all([
    usersCollection
      .find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    usersCollection.countDocuments(mongoQuery)
  ]);
  
  // Convert MongoDB documents to expected format
  const formattedUsers = users.map(user => ({
    id: user._id.toString(),
    email: user.email,
    userType: user.userType,
    status: user.status,
    companyName: user.companyName,
    contactPerson: user.contactPerson,
    phone: user.phone,
    address: user.address,
    businessRegistration: user.businessRegistration,
    taxId: user.taxId,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    _count: {
      loads: 0, // TODO: Implement count queries
      bids: 0,
      documents: 0
    }
  }));

  res.json({
    users: formattedUsers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get user by ID (Admin only)
router.get('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const usersCollection = getUsersCollection();
  
  const user = await usersCollection.findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        _id: 1,
        email: 1,
        userType: 1,
        status: 1,
        companyName: 1,
        contactPerson: 1,
        phone: 1,
        address: 1,
        businessRegistration: 1,
        taxId: 1,
        createdAt: 1,
        lastLogin: 1
      }
    }
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  // Convert MongoDB document to expected format
  const formattedUser = {
    id: user._id.toString(),
    email: user.email,
    userType: user.userType,
    status: user.status,
    companyName: user.companyName,
    contactPerson: user.contactPerson,
    phone: user.phone,
    address: user.address,
    businessRegistration: user.businessRegistration,
    taxId: user.taxId,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    loads: [], // TODO: Implement loads query
    bids: [], // TODO: Implement bids query
    documents: [] // TODO: Implement documents query
  };

  res.json({ user: formattedUser });
}));

// Update user status (Admin only)
router.put('/:id/status', requireAdmin, [
  body('status').isIn(['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED']),
  body('reason').optional().isString()
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
  const { status, reason } = req.body;

  const usersCollection = getUsersCollection();
  
  const user = await usersCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, email: 1, status: 1 } }
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  const updatedUser = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        status,
        updatedAt: new Date()
      } 
    }
  );

  // TODO: Log the status change
  console.log(`User ${user.email} status changed to ${status} by admin ${req.user!.email}`);

  res.json({
    message: 'User status updated successfully',
    user: {
      id: user._id.toString(),
      email: user.email,
      status
    }
  });
}));

// Delete user (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const usersCollection = getUsersCollection();
  
  // Check if user exists
  const user = await usersCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, email: 1, userType: 1 } }
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  // Prevent deletion of admin users
  if (user.userType === 'ADMIN') {
    throw createError('Cannot delete admin users', 400);
  }

  // Delete user
  await usersCollection.deleteOne({ _id: new ObjectId(id) });

  // TODO: Log the deletion
  console.log(`User ${user.email} deleted by admin ${req.user!.email}`);

  res.json({
    message: 'User deleted successfully'
  });
}));

// Get user statistics (Admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const usersCollection = getUsersCollection();
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    clientUsers,
    transporterUsers,
    recentUsers
  ] = await Promise.all([
    usersCollection.countDocuments(),
    usersCollection.countDocuments({ status: 'ACTIVE' }),
    usersCollection.countDocuments({ status: 'PENDING' }),
    usersCollection.countDocuments({ userType: 'CLIENT' }),
    usersCollection.countDocuments({ userType: 'TRANSPORTER' }),
    usersCollection.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    })
  ]);

  res.json({
    totalUsers,
    activeUsers,
    pendingUsers,
    clientUsers,
    transporterUsers,
    recentUsers
  });
}));

export default router;