import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all documents
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isUUID(),
  query('verificationStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED']),
  query('documentType').optional().isString()
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
  const userId = req.query.userId as string;
  const verificationStatus = req.query.verificationStatus as string;
  const documentType = req.query.documentType as string;

  const where: any = {};
  if (userId) where.userId = userId;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (documentType) where.documentType = { contains: documentType, mode: 'insensitive' };

  // Non-admin users can only see their own documents
  if (req.user!.userType !== 'ADMIN') {
    where.userId = req.user!.id;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            email: true,
            userType: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    }),
    prisma.document.count({ where })
  ]);

  res.json({
    documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get document by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          email: true,
          userType: true,
          phone: true
        }
      },
      verifiedBy: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  if (!document) {
    throw createError('Document not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  res.json({ document });
}));

// Upload document (handled by upload route, but we can create document record)
router.post('/', [
  body('fileName').notEmpty().withMessage('File name is required'),
  body('fileUrl').notEmpty().withMessage('File URL is required'),
  body('documentType').notEmpty().withMessage('Document type is required')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { fileName, fileUrl, documentType } = req.body;

  const document = await prisma.document.create({
    data: {
      fileName,
      fileUrl,
      documentType,
      userId: req.user!.id
    },
    include: {
      user: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Document uploaded successfully',
    document
  });
}));

// Verify document (Admin only)
router.put('/:id/verify', requireAdmin, [
  body('verificationStatus').isIn(['APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED']).withMessage('Invalid verification status'),
  body('adminNotes').optional().isString()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;
  const { verificationStatus, adminNotes } = req.body;

  const existingDocument = await prisma.document.findUnique({
    where: { id },
    select: { id: true, userId: true, verificationStatus: true }
  });

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  const document = await prisma.document.update({
    where: { id },
    data: {
      verificationStatus,
      adminNotes,
      verifiedAt: new Date(),
      verifiedById: req.user!.id
    },
    include: {
      user: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          email: true
        }
      },
      verifiedBy: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  // Log the verification action
  await prisma.systemLog.create({
    data: {
      action: 'DOCUMENT_VERIFIED',
      details: {
        documentId: id,
        userId: existingDocument.userId,
        oldStatus: existingDocument.verificationStatus,
        newStatus: verificationStatus,
        adminNotes,
        verifiedBy: req.user!.id
      },
      userId: req.user!.id
    }
  });

  res.json({
    message: 'Document verification updated successfully',
    document
  });
}));

// Update document (User can update their own pending documents)
router.put('/:id', [
  body('documentType').optional().notEmpty(),
  body('fileName').optional().notEmpty()
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { id } = req.params;

  const existingDocument = await prisma.document.findUnique({
    where: { id },
    select: { id: true, userId: true, verificationStatus: true }
  });

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingDocument.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Users can only update pending documents
  if (req.user!.userType !== 'ADMIN' && existingDocument.verificationStatus !== 'PENDING') {
    throw createError('Cannot update verified documents', 400);
  }

  const document = await prisma.document.update({
    where: { id },
    data: req.body,
    include: {
      user: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
        }
      }
    }
  });

  res.json({
    message: 'Document updated successfully',
    document
  });
}));

// Delete document
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const existingDocument = await prisma.document.findUnique({
    where: { id },
    select: { id: true, userId: true, verificationStatus: true }
  });

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && existingDocument.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Users can only delete pending documents
  if (req.user!.userType !== 'ADMIN' && existingDocument.verificationStatus === 'APPROVED') {
    throw createError('Cannot delete approved documents', 400);
  }

  await prisma.document.delete({
    where: { id }
  });

  res.json({
    message: 'Document deleted successfully'
  });
}));

// Get document statistics (Admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const [
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
    recentDocuments
  ] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.document.count({ where: { verificationStatus: 'APPROVED' } }),
    prisma.document.count({ where: { verificationStatus: 'REJECTED' } }),
    prisma.document.count({
      where: {
        uploadedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })
  ]);

  const stats = {
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
    moreInfoRequiredDocuments: totalDocuments - pendingDocuments - approvedDocuments - rejectedDocuments,
    recentDocuments
  };

  res.json({ stats });
}));

export default router;