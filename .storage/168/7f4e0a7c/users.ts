import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (Admin only)
router.get('/', requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userType').optional().isIn(['ADMIN', 'CLIENT', 'TRANSPORTER']),
  query('status').optional().isIn(['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'])
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const userType = req.query.userType as string;
  const status = req.query.status as string;

  const where: any = {};
  if (userType) where.userType = userType;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        userType: true,
        status: true,
        companyName: true,
        contactPerson: true,
        phone: true,
        address: true,
        businessRegistration: true,
        taxId: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            loads: true,
            bids: true,
            documents: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    users,
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

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      userType: true,
      status: true,
      companyName: true,
      contactPerson: true,
      phone: true,
      address: true,
      businessRegistration: true,
      taxId: true,
      createdAt: true,
      lastLogin: true,
      loads: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      bids: {
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          load: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          documentType: true,
          verificationStatus: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: 'desc' }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
}));

// Update user status (Admin only)
router.put('/:id/status', requireAdmin, [
  body('status').isIn(['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED']).withMessage('Invalid status'),
  body('reason').optional().isString()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const { status, reason } = req.body;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, status: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      email: true,
      userType: true,
      status: true,
      companyName: true,
      contactPerson: true,
      updatedAt: true
    }
  });

  // Log the status change
  await prisma.systemLog.create({
    data: {
      action: 'USER_STATUS_CHANGED',
      details: {
        userId: id,
        oldStatus: user.status,
        newStatus: status,
        reason,
        changedBy: req.user!.id
      },
      userId: req.user!.id
    }
  });

  res.json({
    message: 'User status updated successfully',
    user: updatedUser
  });
}));

// Delete user (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, userType: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Prevent deleting admin users
  if (user.userType === 'ADMIN') {
    throw createError('Cannot delete admin users', 403);
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id }
  });

  // Log the deletion
  await prisma.systemLog.create({
    data: {
      action: 'USER_DELETED',
      details: {
        deletedUserId: id,
        deletedUserEmail: user.email,
        deletedBy: req.user!.id
      },
      userId: req.user!.id
    }
  });

  res.json({
    message: 'User deleted successfully'
  });
}));

// Get user statistics (Admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    clientUsers,
    transporterUsers,
    recentUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { userType: 'CLIENT' } }),
    prisma.user.count({ where: { userType: 'TRANSPORTER' } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ]);

  const stats = {
    totalUsers,
    activeUsers,
    pendingUsers,
    suspendedUsers: totalUsers - activeUsers - pendingUsers,
    clientUsers,
    transporterUsers,
    adminUsers: totalUsers - clientUsers - transporterUsers,
    recentUsers
  };

  res.json({ stats });
}));

export default router;