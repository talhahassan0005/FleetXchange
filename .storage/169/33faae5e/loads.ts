import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin, requireClientOrAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all loads
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['ACTIVE', 'ASSIGNED', 'COMPLETED', 'CANCELLED']),
  query('clientId').optional().isUUID()
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
  const status = req.query.status as string;
  const clientId = req.query.clientId as string;

  const where: any = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  // If user is not admin, only show their loads or active loads
  if (req.user!.userType !== 'ADMIN') {
    if (req.user!.userType === 'CLIENT') {
      where.clientId = req.user!.id;
    } else if (req.user!.userType === 'TRANSPORTER') {
      // Transporters can see active loads or loads assigned to them
      where.OR = [
        { status: 'ACTIVE' },
        { assignedTransporterId: req.user!.id }
      ];
    }
  }

  const [loads, total] = await Promise.all([
    prisma.load.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true
          }
        },
        assignedTransporter: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true
          }
        },
        _count: {
          select: {
            bids: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.load.count({ where })
  ]);

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

// Get load by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const load = await prisma.load.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          email: true
        }
      },
      assignedTransporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          email: true
        }
      },
      bids: {
        include: {
          transporter: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true
            }
          }
        },
        orderBy: { amount: 'asc' }
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!load) {
    throw createError('Load not found', 404);
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

  res.json({ load });
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
  body('budgetMax').isFloat({ min: 0 }).withMessage('Maximum budget must be a positive number')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
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
    budgetMax
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

  const load = await prisma.load.create({
    data: {
      title,
      description,
      cargoType,
      weight,
      pickupLocation,
      deliveryLocation,
      pickupDate: pickup,
      deliveryDate: delivery,
      budgetMin,
      budgetMax,
      clientId: req.user!.userType === 'ADMIN' ? req.body.clientId : req.user!.id
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Load created successfully',
    load
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
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;

  // Check if load exists and user has permission
  const existingLoad = await prisma.load.findUnique({
    where: { id },
    select: { id: true, clientId: true, status: true }
  });

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

  const load = await prisma.load.update({
    where: { id },
    data: updateData,
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      },
      assignedTransporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Load updated successfully',
    load
  });
}));

// Update load status
router.put('/:id/status', [
  body('status').isIn(['ACTIVE', 'ASSIGNED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const { status } = req.body;

  const existingLoad = await prisma.load.findUnique({
    where: { id },
    select: { id: true, clientId: true, assignedTransporterId: true, status: true }
  });

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

  const load = await prisma.load.update({
    where: { id },
    data: { status },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      },
      assignedTransporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Load status updated successfully',
    load
  });
}));

// Delete load
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const existingLoad = await prisma.load.findUnique({
    where: { id },
    select: { id: true, clientId: true, status: true }
  });

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

  await prisma.load.delete({
    where: { id }
  });

  res.json({
    message: 'Load deleted successfully'
  });
}));

export default router;