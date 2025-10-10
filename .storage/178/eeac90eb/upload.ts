import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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

  // Create document record in database
  const document = await prisma.document.create({
    data: {
      fileName: req.file.originalname,
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
    message: 'File uploaded successfully',
    file: {
      id: document.id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      documentType,
      uploadedAt: document.uploadedAt
    },
    document
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

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          fileName: file.originalname,
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

      uploadedFiles.push({
        id: document.id,
        originalName: file.originalname,
        fileName: file.filename,
        fileUrl,
        size: file.size,
        mimeType: file.mimetype,
        documentType,
        uploadedAt: document.uploadedAt
      });

      documents.push(document);
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

  // Find document record to check permissions
  const document = await prisma.document.findFirst({
    where: { fileUrl: `/uploads/${filename}` },
    select: { id: true, userId: true, fileName: true, documentType: true }
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

  // Find document record to check permissions
  const document = await prisma.document.findFirst({
    where: { fileUrl: `/uploads/${filename}` },
    select: { id: true, userId: true, fileName: true, documentType: true }
  });

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

  // Find document record
  const document = await prisma.document.findFirst({
    where: { fileUrl: `/uploads/${filename}` },
    select: { id: true, userId: true, verificationStatus: true }
  });

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

  // Delete document record from database
  await prisma.document.delete({
    where: { id: document.id }
  });

  res.json({
    message: 'File deleted successfully'
  });
}));

// Get file info
router.get('/info/:filename', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Find document record
  const document = await prisma.document.findFirst({
    where: { fileUrl: `/uploads/${filename}` },
    include: {
      user: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true
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

export default router;