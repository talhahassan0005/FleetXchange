import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get messages
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('loadId').optional().isUUID(),
  query('conversationWith').optional().isUUID(),
  query('messageType').optional().isIn(['BID_NOTIFICATION', 'STATUS_UPDATE', 'GENERAL', 'SYSTEM'])
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const loadId = req.query.loadId as string;
  const conversationWith = req.query.conversationWith as string;
  const messageType = req.query.messageType as string;

  const where: any = {};
  if (loadId) where.loadId = loadId;
  if (messageType) where.messageType = messageType;

  // Filter messages based on user permissions
  if (req.user!.userType !== 'ADMIN') {
    if (conversationWith) {
      where.OR = [
        { senderId: req.user!.id, receiverId: conversationWith },
        { senderId: conversationWith, receiverId: req.user!.id }
      ];
    } else {
      where.OR = [
        { senderId: req.user!.id },
        { receiverId: req.user!.id }
      ];
    }
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            userType: true
          }
        },
        receiver: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            userType: true
          }
        },
        load: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.message.count({ where })
  ]);

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

// Get message by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          userType: true
        }
      },
      receiver: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          userType: true
        }
      },
      load: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  });

  if (!message) {
    throw createError('Message not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && 
      message.senderId !== req.user!.id && 
      message.receiverId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Mark as read if user is the receiver
  if (message.receiverId === req.user!.id && !message.isRead) {
    await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });
  }

  res.json({ message });
}));

// Send message
router.post('/', [
  body('receiverId').isUUID().withMessage('Valid receiver ID is required'),
  body('message').notEmpty().withMessage('Message content is required'),
  body('messageType').optional().isIn(['BID_NOTIFICATION', 'STATUS_UPDATE', 'GENERAL', 'SYSTEM']),
  body('loadId').optional().isUUID()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { receiverId, message, messageType = 'GENERAL', loadId } = req.body;

  // Validate receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, status: true }
  });

  if (!receiver) {
    throw createError('Receiver not found', 404);
  }

  if (receiver.status !== 'ACTIVE') {
    throw createError('Cannot send message to inactive user', 400);
  }

  // Validate load if provided
  if (loadId) {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: { id: true, clientId: true, assignedTransporterId: true }
    });

    if (!load) {
      throw createError('Load not found', 404);
    }

    // Check if user is related to the load
    if (req.user!.userType !== 'ADMIN' && 
        load.clientId !== req.user!.id && 
        load.assignedTransporterId !== req.user!.id) {
      throw createError('Access denied for this load', 403);
    }
  }

  const newMessage = await prisma.message.create({
    data: {
      senderId: req.user!.id,
      receiverId,
      message,
      messageType,
      loadId
    },
    include: {
      sender: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          userType: true
        }
      },
      receiver: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          userType: true
        }
      },
      load: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Message sent successfully',
    data: newMessage
  });
}));

// Mark message as read
router.put('/:id/read', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const existingMessage = await prisma.message.findUnique({
    where: { id },
    select: { id: true, receiverId: true, isRead: true }
  });

  if (!existingMessage) {
    throw createError('Message not found', 404);
  }

  // Only receiver can mark message as read
  if (existingMessage.receiverId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  if (existingMessage.isRead) {
    return res.json({
      message: 'Message already marked as read'
    });
  }

  await prisma.message.update({
    where: { id },
    data: { isRead: true }
  });

  res.json({
    message: 'Message marked as read'
  });
}));

// Mark all messages as read for a conversation
router.put('/conversation/:userId/read', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { userId } = req.params;

  // Validate the other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  const result = await prisma.message.updateMany({
    where: {
      senderId: userId,
      receiverId: req.user!.id,
      isRead: false
    },
    data: { isRead: true }
  });

  res.json({
    message: `${result.count} messages marked as read`
  });
}));

// Get conversation between two users
router.get('/conversation/:userId', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Validate the other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyName: true, contactPerson: true, userType: true }
  });

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user!.id, receiverId: userId },
          { senderId: userId, receiverId: req.user!.id }
        ]
      },
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            userType: true
          }
        },
        load: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.message.count({
      where: {
        OR: [
          { senderId: req.user!.id, receiverId: userId },
          { senderId: userId, receiverId: req.user!.id }
        ]
      }
    })
  ]);

  res.json({
    conversation: {
      otherUser,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Delete message (Admin only or sender within 5 minutes)
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true, senderId: true, createdAt: true }
  });

  if (!message) {
    throw createError('Message not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN') {
    if (message.senderId !== req.user!.id) {
      throw createError('Access denied', 403);
    }

    // Check if message is less than 5 minutes old
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      throw createError('Cannot delete messages older than 5 minutes', 400);
    }
  }

  await prisma.message.delete({
    where: { id }
  });

  res.json({
    message: 'Message deleted successfully'
  });
}));

// Get unread message count
router.get('/unread/count', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const unreadCount = await prisma.message.count({
    where: {
      receiverId: req.user!.id,
      isRead: false
    }
  });

  res.json({ unreadCount });
}));

export default router;