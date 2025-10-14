import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
// Removed Prisma import - using MongoDB only

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common document types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word documents, images, and text files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Upload single file
router.post('/single', upload.single('file'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const { documentType, description } = req.body;

  if (!documentType) {
    // Clean up uploaded file if validation fails
    fs.unlinkSync(req.file.path);
    throw createError('Document type is required', 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  // Create document record in database using MongoDB
  const { getDocumentsCollection } = require('../lib/mongodb');
  const documentsCollection = getDocumentsCollection();
  
  const document = await documentsCollection.insertOne({
    fileName: req.file.originalname,
    fileUrl,
    documentType,
    userId: req.user!.id,
    verificationStatus: 'PENDING',
    uploadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  res.status(201).json({
    message: 'File uploaded successfully',
    file: {
      id: document.insertedId.toString(),
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      documentType,
      uploadedAt: new Date()
    },
    document: {
      id: document.insertedId.toString(),
      fileName: req.file.originalname,
      fileUrl,
      documentType,
      verificationStatus: 'PENDING',
      uploadedAt: new Date()
    }
  });
}));

// Upload multiple files
router.post('/multiple', upload.array('files', 5), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw createError('No files uploaded', 400);
  }

  const { documentType, description } = req.body;

  if (!documentType) {
    // Clean up uploaded files if validation fails
    files.forEach(file => fs.unlinkSync(file.path));
    throw createError('Document type is required', 400);
  }

  const uploadedFiles = [];
  const documents = [];

  try {
    for (const file of files) {
      const fileUrl = `/uploads/${file.filename}`;

      // Create document record in database using MongoDB
      const { getDocumentsCollection } = require('../lib/mongodb');
      const documentsCollection = getDocumentsCollection();
      
      const document = await documentsCollection.insertOne({
        fileName: file.originalname,
        fileUrl,
        documentType,
        userId: req.user!.id,
        verificationStatus: 'PENDING',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      uploadedFiles.push({
        id: document.insertedId.toString(),
        originalName: file.originalname,
        fileName: file.filename,
        fileUrl,
        size: file.size,
        mimeType: file.mimetype,
        documentType,
        uploadedAt: new Date()
      });

      documents.push({
        id: document.insertedId.toString(),
        fileName: file.originalname,
        fileUrl,
        documentType,
        verificationStatus: 'PENDING',
        uploadedAt: new Date()
      });
    }

    res.status(201).json({
      message: `${files.length} files uploaded successfully`,
      files: uploadedFiles,
      documents
    });
  } catch (error) {
    // Clean up uploaded files if database operations fail
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    throw error;
  }
}));

// Get uploaded file
router.get('/file/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw createError('File not found', 404);
  }

  // Find document record to check permissions using MongoDB
  const { getDocumentsCollection } = require('../lib/mongodb');
  const documentsCollection = getDocumentsCollection();
  
  const document = await documentsCollection.findOne({
    fileUrl: `/uploads/${filename}`
  }, {
    projection: { _id: 1, userId: 1, fileName: 1, documentType: 1 }
  });

  if (!document) {
    throw createError('Document record not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Set appropriate headers
  const stat = fs.statSync(filePath);
  const mimeType = getMimeType(filename);
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

// Download file
router.get('/download/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw createError('File not found', 404);
  }

  // Find document record to check permissions using MongoDB
  const { getDocumentsCollection } = require('../lib/mongodb');
  const documentsCollection = getDocumentsCollection();
  
  const document = await documentsCollection.findOne({
    fileUrl: `/uploads/${filename}`
  }, {
    projection: { _id: 1, userId: 1, fileName: 1, documentType: 1 }
  });
  
  if (document) {
    document.id = document._id.toString();
    delete (document as any)._id;
  }

  if (!document) {
    throw createError('Document record not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Set download headers
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

// Delete uploaded file
router.delete('/file/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Find document record using MongoDB
  const { getDocumentsCollection } = require('../lib/mongodb');
  const documentsCollection = getDocumentsCollection();
  
  const document = await documentsCollection.findOne({
    fileUrl: `/uploads/${filename}`
  }, {
    projection: { _id: 1, userId: 1, verificationStatus: 1 }
  });
  
  if (document) {
    document.id = document._id.toString();
    delete (document as any)._id;
  }

  if (!document) {
    throw createError('Document record not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Users can only delete pending documents
  if (req.user!.userType !== 'ADMIN' && document.verificationStatus === 'APPROVED') {
    throw createError('Cannot delete approved documents', 400);
  }

  // Delete file from filesystem
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete document record from database using MongoDB
  await documentsCollection.deleteOne({ _id: new (require('mongodb')).ObjectId(document.id) });

  res.json({
    message: 'File deleted successfully'
  });
}));

// Get file info
router.get('/info/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Find document record using MongoDB
  const { getDocumentsCollection, getUsersCollection } = require('../lib/mongodb');
  const documentsCollection = getDocumentsCollection();
  const usersCollection = getUsersCollection();
  
  const document = await documentsCollection.findOne({
    fileUrl: `/uploads/${filename}`
  });
  
  if (document) {
    // Add user information
    const user = await usersCollection.findOne(
      { _id: new (require('mongodb')).ObjectId(document.userId) },
      { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
    );
    document.user = user;
    
    if (document.verifiedById) {
      const verifiedBy = await usersCollection.findOne(
        { _id: new (require('mongodb')).ObjectId(document.verifiedById) },
        { projection: { _id: 1, companyName: 1, contactPerson: 1 } }
      );
      document.verifiedBy = verifiedBy;
    }
    
    document.id = document._id.toString();
    delete (document as any)._id;
  }

  if (!document) {
    throw createError('Document not found', 404);
  }

  // Check permissions
  if (req.user!.userType !== 'ADMIN' && document.userId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Get file stats if file exists
  let fileStats = null;
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    fileStats = {
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime
    };
  }

  res.json({
    document,
    fileStats,
    fileExists: fs.existsSync(filePath)
  });
}));

// Helper function to get MIME type
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Download file endpoint - forces download with proper headers
router.get('/download/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw createError('File not found', 404);
  }

  // Get original filename from the stored filename (remove UUID prefix)
  const originalName = filename.split('-').slice(1).join('-') || filename;
  
  // Set headers to force download
  res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
  res.setHeader('Content-Type', getMimeType(filename));
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

export default router;