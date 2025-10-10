import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin, requireTransporterOrAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all bids
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('loadId').optional().isUUID(),
  query('transporterId').optional().isUUID(),
  query('status').optional().isIn(['ACTIVE', 'WON', 'LOST', 'WITHDRAWN'])
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
  const loadId = req.query.loadId as string;
  const transporterId = req.query.transporterId as string;
  const status = req.query.status as string;

  const where: any = {};
  if (loadId) where.loadId = loadId;
  if (transporterId) where.transporterId = transporterId;
  if (status) where.status = status;

  // Filter based on user type
  if (req.user!.userType === 'TRANSPORTER') {
    where.transporterId = req.user!.id;
  } else if (req.user!.userType === 'CLIENT') {
    where.load = { clientId: req.user!.id };
  }

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where,
      skip,
      take: limit,
      include: {
        load: {
          select: {
            id: true,
            title: true,
            pickupLocation: true,
            deliveryLocation: true,
            budgetMin: true,
            budgetMax: true,
            status: true,
            client: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true
              }
            }
          }
        },
        transporter: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bid.count({ where })
  ]);

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

  const bid = await prisma.bid.findUnique({
    where: { id },
    include: {
      load: {
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
              phone: true,
              email: true
            }
          }
        }
      },
      transporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          email: true
        }
      }
    }
  });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN') {
    if (req.user!.userType === 'TRANSPORTER' && bid.transporterId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
    if (req.user!.userType === 'CLIENT' && bid.load.clientId !== req.user!.id) {
      throw createError('Access denied', 403);
    }
  }

  res.json({ bid });
}));

// Create new bid (Transporter only)
router.post('/', requireTransporterOrAdmin, [
  body('loadId').isUUID().withMessage('Valid load ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('pickupDate').isISO8601().withMessage('Valid pickup date is required'),
  body('deliveryDate').isISO8601().withMessage('Valid delivery date is required'),
  body('comments').optional().isString()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { loadId, amount, pickupDate, deliveryDate, comments } = req.body;

  // Check if load exists and is active
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: { id: true, status: true, budgetMin: true, budgetMax: true }
  });

  if (!load) {
    throw createError('Load not found', 404);
  }

  if (load.status !== 'ACTIVE') {
    throw createError('Cannot bid on inactive loads', 400);
  }

  // Validate bid amount is within budget range
  if (amount < load.budgetMin || amount > load.budgetMax) {
    throw createError(`Bid amount must be between ${load.budgetMin} and ${load.budgetMax}`, 400);
  }

  // Check if transporter already has an active bid for this load
  const existingBid = await prisma.bid.findFirst({
    where: {
      loadId,
      transporterId: req.user!.id,
      status: 'ACTIVE'
    }
  });

  if (existingBid) {
    throw createError('You already have an active bid for this load', 409);
  }

  // Validate dates
  const pickup = new Date(pickupDate);
  const delivery = new Date(deliveryDate);
  if (delivery <= pickup) {
    throw createError('Delivery date must be after pickup date', 400);
  }

  const bid = await prisma.bid.create({
    data: {
      loadId,
      transporterId: req.user!.id,
      amount,
      pickupDate: pickup,
      deliveryDate: delivery,
      comments
    },
    include: {
      load: {
        select: {
          id: true,
          title: true,
          client: {
            select: {
              id: true,
              companyName: true
            }
          }
        }
      },
      transporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Bid created successfully',
    bid
  });
}));

// Update bid (Transporter only, before acceptance)
router.put('/:id', [
  body('amount').optional().isFloat({ min: 0 }),
  body('pickupDate').optional().isISO8601(),
  body('deliveryDate').optional().isISO8601(),
  body('comments').optional().isString()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;

  const existingBid = await prisma.bid.findUnique({
    where: { id },
    include: {
      load: {
        select: { budgetMin: true, budgetMax: true, status: true }
      }
    }
  });

  if (!existingBid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingBid.transporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Can only update active bids
  if (existingBid.status !== 'ACTIVE') {
    throw createError('Cannot update non-active bids', 400);
  }

  // Validate amount if provided
  if (req.body.amount) {
    if (req.body.amount < existingBid.load.budgetMin || req.body.amount > existingBid.load.budgetMax) {
      throw createError(`Bid amount must be between ${existingBid.load.budgetMin} and ${existingBid.load.budgetMax}`, 400);
    }
  }

  // Validate dates if provided
  if (req.body.pickupDate && req.body.deliveryDate) {
    const pickup = new Date(req.body.pickupDate);
    const delivery = new Date(req.body.deliveryDate);
    if (delivery <= pickup) {
      throw createError('Delivery date must be after pickup date', 400);
    }
  }

  const bid = await prisma.bid.update({
    where: { id },
    data: req.body,
    include: {
      load: {
        select: {
          id: true,
          title: true
        }
      },
      transporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Bid updated successfully',
    bid
  });
}));

// Accept bid (Client or Admin only)
router.put('/:id/accept', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    include: {
      load: {
        select: {
          id: true,
          clientId: true,
          status: true,
          title: true
        }
      }
    }
  });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && bid.load.clientId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Can only accept active bids on active loads
  if (bid.status !== 'ACTIVE' || bid.load.status !== 'ACTIVE') {
    throw createError('Cannot accept this bid', 400);
  }

  // Use transaction to update bid status and load assignment
  await prisma.$transaction(async (tx) => {
    // Accept the bid
    await tx.bid.update({
      where: { id },
      data: { status: 'WON' }
    });

    // Reject all other bids for this load
    await tx.bid.updateMany({
      where: {
        loadId: bid.loadId,
        id: { not: id },
        status: 'ACTIVE'
      },
      data: { status: 'LOST' }
    });

    // Assign load to transporter
    await tx.load.update({
      where: { id: bid.loadId },
      data: {
        status: 'ASSIGNED',
        assignedTransporterId: bid.transporterId
      }
    });
  });

  const updatedBid = await prisma.bid.findUnique({
    where: { id },
    include: {
      load: {
        include: {
          client: {
            select: {
              id: true,
              companyName: true
            }
          }
        }
      },
      transporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Bid accepted successfully',
    bid: updatedBid
  });
}));

// Withdraw bid (Transporter only)
router.put('/:id/withdraw', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    select: { id: true, transporterId: true, status: true }
  });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && bid.transporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Can only withdraw active bids
  if (bid.status !== 'ACTIVE') {
    throw createError('Cannot withdraw non-active bids', 400);
  }

  const updatedBid = await prisma.bid.update({
    where: { id },
    data: { status: 'WITHDRAWN' },
    include: {
      load: {
        select: {
          id: true,
          title: true
        }
      },
      transporter: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Bid withdrawn successfully',
    bid: updatedBid
  });
}));

// Delete bid (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const bid = await prisma.bid.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!bid) {
    throw createError('Bid not found', 404);
  }

  // Don't allow deletion of won bids
  if (bid.status === 'WON') {
    throw createError('Cannot delete winning bids', 400);
  }

  await prisma.bid.delete({
    where: { id }
  });

  res.json({
    message: 'Bid deleted successfully'
  });
}));

export default router;