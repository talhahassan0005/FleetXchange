import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { getDocumentsCollection, getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { io } from '../server';

const router = express.Router();

// Get all documents
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isString(),
  query('verificationStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED']),
  query('documentType').optional().isString()
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
  const userId = req.query.userId as string;
  const verificationStatus = req.query.verificationStatus as string;
  const documentType = req.query.documentType as string;

  const where: any = {};
  if (userId) where.userId = userId;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (documentType) where.documentType = { $regex: documentType, $options: 'i' };

  // Non-admin users can only see their own documents
  if (req.user!.userType !== 'ADMIN') {
    where.userId = req.user!.id;
  }

  // Get documents using MongoDB
  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  // Convert Prisma-style where clause to MongoDB query
  const mongoQuery: any = {};
  if (where.userId) mongoQuery.userId = where.userId;
  if (where.verificationStatus) mongoQuery.verificationStatus = where.verificationStatus;
  if (where.documentType) mongoQuery.documentType = where.documentType;

  const [documents, total] = await Promise.all([
    documentsCollection
      .find(mongoQuery)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    documentsCollection.countDocuments(mongoQuery)
  ]);
  
  // Add user information to each document
  for (const doc of documents) {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(doc.userId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1, userType: 1 } }
    );
    doc.user = user;
    doc.id = doc._id.toString();
    delete (doc as any)._id;
    
    if (doc.verifiedById) {
      const verifiedBy = await usersCollection.findOne(
        { _id: new ObjectId(doc.verifiedById) },
        { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
      );
      doc.verifiedBy = verifiedBy;
    }
  }

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

// Get documents by user ID
router.get('/user/:userId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { userId } = req.params;

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  const documents = await documentsCollection
    .find({ userId })
    .sort({ uploadedAt: -1 })
    .toArray();

  // Add user information to each document
  for (const doc of documents) {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(doc.userId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    doc.user = user;
    doc.id = doc._id.toString();
    delete (doc as any)._id;
  }

  res.json({ documents });
}));

// Get document by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  const document = await documentsCollection.findOne({ _id: new ObjectId(id) });

  if (!document) {
    throw createError('Document not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Add related data
  const user = await usersCollection.findOne(
    { _id: new ObjectId(document.userId) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1, userType: 1 } }
  );
  document.user = user;

  if (document.verifiedById) {
    const verifiedBy = await usersCollection.findOne(
      { _id: new ObjectId(document.verifiedById) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
    );
    document.verifiedBy = verifiedBy;
  }

  document.id = document._id.toString();
  delete (document as any)._id;

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
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { fileName, fileUrl, documentType } = req.body;

  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  const document = await documentsCollection.insertOne({
      fileName,
      fileUrl,
      documentType,
    userId: req.user!.id,
    verificationStatus: 'PENDING',
    uploadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Get user information
  const user = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
    { projection: { _id: 1, companyName: 1, contactPerson: 1, userType: 1 } }
  );

  // Prepare document data for real-time updates
  const documentData = {
    id: document.insertedId.toString(),
    fileName,
    fileUrl,
    documentType,
    userId: req.user!.id,
    verificationStatus: 'PENDING',
    uploadedAt: new Date(),
    user: user
  };

  // Emit real-time document creation event
  try {
    console.log('🚀 Emitting real-time document upload events...');
    console.log('📊 Document data:', documentData);
    console.log('👤 User ID:', req.user!.id);
    console.log('🔌 Socket.IO instance:', !!io);
    
    // Notify admins about new document upload
    console.log('📤 Emitting global document_uploaded event');
    io.emit('document_uploaded', {
      document: documentData,
      uploadedBy: user
    });

    // Notify the user who uploaded the document
    console.log(`📤 Emitting 'document_uploaded_success' to user_${req.user!.id}`);
    io.to(`user_${req.user!.id}`).emit('document_uploaded_success', {
      document: documentData
    });

    console.log('✅ Real-time document upload events emitted successfully');
  } catch (error) {
    console.error('❌ Failed to emit real-time document upload event:', error);
  }

  res.status(201).json({
    message: 'Document uploaded successfully',
    document: {
      id: document.insertedId.toString(),
      fileName,
      fileUrl,
      documentType,
      verificationStatus: 'PENDING',
      uploadedAt: new Date(),
      user
    }
  });
}));

// Verify document (Admin only)
router.put('/:id/verify', requireAdmin, [
  body('verificationStatus').isIn(['APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED']),
  body('adminNotes').optional().isString()
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
  const { verificationStatus, adminNotes } = req.body;

  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  const existingDocument = await documentsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, userId: 1, verificationStatus: 1 } }
  );

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  const document = await documentsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
      verificationStatus,
        adminNotes: adminNotes || '',
        verifiedById: req.user!.id,
      verifiedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  // Get updated document with user info
  const updatedDocument = await documentsCollection.findOne({ _id: new ObjectId(id) });
  if (updatedDocument) {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(updatedDocument.userId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1, email: 1 } }
    );
    updatedDocument.user = user;
    updatedDocument.id = updatedDocument._id.toString();
    delete (updatedDocument as any)._id;

    // Emit real-time document verification event
    try {
      // Notify the user about document verification status
      io.to(`user_${updatedDocument.userId}`).emit('document_verified', {
        document: updatedDocument,
        verificationStatus,
        adminNotes: adminNotes || '',
        verifiedBy: req.user!.id
      });

      // Emit general document update for admin dashboard
      io.emit('document_verification_updated', {
        document: updatedDocument,
        verificationStatus,
        verifiedBy: req.user!.id
      });

      console.log('✅ Real-time document verification event emitted');
    } catch (error) {
      console.error('❌ Failed to emit real-time document verification event:', error);
    }

  // Send email notification to user
  try {
      const { EmailService } = require('../services/emailService');
      await EmailService.sendDocumentVerificationNotification(
        user!.email,
        user!.companyName || user!.contactPerson || 'User',
        updatedDocument.fileName,
      verificationStatus,
        adminNotes || ''
    );
      console.log('✅ Email notification sent for document verification');
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
    }
  }

  res.json({
    message: 'Document verification updated successfully',
    document: updatedDocument
  });
}));

// Update document (Admin only)
router.put('/:id', requireAdmin, [
  body('fileName').optional().isString(),
  body('documentType').optional().isString(),
  body('adminNotes').optional().isString()
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

  const documentsCollection = getDocumentsCollection();
  
  const existingDocument = await documentsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, userId: 1, verificationStatus: 1 } }
  );

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  const updateData: any = { updatedAt: new Date() };
  if (req.body.fileName) updateData.fileName = req.body.fileName;
  if (req.body.documentType) updateData.documentType = req.body.documentType;
  if (req.body.adminNotes) updateData.adminNotes = req.body.adminNotes;

  const document = await documentsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  res.json({
    message: 'Document updated successfully',
    document: {
      id,
      ...updateData
    }
  });
}));

// Delete document (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;

  const documentsCollection = getDocumentsCollection();
  
  const existingDocument = await documentsCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1, userId: 1, verificationStatus: 1 } }
  );

  if (!existingDocument) {
    throw createError('Document not found', 404);
  }

  await documentsCollection.deleteOne({ _id: new ObjectId(id) });

  res.json({
    message: 'Document deleted successfully'
  });
}));

// Get document statistics (Admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const documentsCollection = getDocumentsCollection();
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
    recentDocuments
  ] = await Promise.all([
    documentsCollection.countDocuments(),
    documentsCollection.countDocuments({ verificationStatus: 'PENDING' }),
    documentsCollection.countDocuments({ verificationStatus: 'APPROVED' }),
    documentsCollection.countDocuments({ verificationStatus: 'REJECTED' }),
    documentsCollection.countDocuments({
      uploadedAt: { $gte: thirtyDaysAgo }
    })
  ]);

  res.json({
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
    recentDocuments
  });
}));

export default router;