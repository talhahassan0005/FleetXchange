import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('userType').isIn(['CLIENT', 'TRANSPORTER']).withMessage('Invalid user type'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('contactPerson').notEmpty().withMessage('Contact person is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required')
], asyncHandler(async (req: express.Request, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const {
    email,
    password,
    userType,
    companyName,
    contactPerson,
    phone,
    address,
    businessRegistration,
    taxId
  } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      userType,
      companyName,
      contactPerson,
      phone,
      address,
      businessRegistration,
      taxId
    },
    select: {
      id: true,
      email: true,
      userType: true,
      status: true,
      companyName: true,
      contactPerson: true,
      createdAt: true
    }
  });

  const token = generateToken(user.id);

  res.status(201).json({
    message: 'User registered successfully',
    user,
    token
  });
}));

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req: express.Request, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      userType: true,
      status: true,
      companyName: true,
      contactPerson: true,
      phone: true,
      address: true,
      businessRegistration: true,
      taxId: true,
      lastLogin: true
    }
  });

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw createError('Account is not active. Please contact support.', 401);
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  const token = generateToken(user.id);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthRequest, res: express.Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
      lastLogin: true
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
}));

// Update user profile
router.put('/profile', authenticateToken, [
  body('companyName').optional().notEmpty(),
  body('contactPerson').optional().notEmpty(),
  body('phone').optional().notEmpty(),
  body('address').optional().notEmpty()
], asyncHandler(async (req: AuthRequest, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const {
    companyName,
    contactPerson,
    phone,
    address,
    businessRegistration,
    taxId
  } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      companyName,
      contactPerson,
      phone,
      address,
      businessRegistration,
      taxId
    },
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
      updatedAt: true
    }
  });

  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], asyncHandler(async (req: AuthRequest, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, password: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw createError('Current password is incorrect', 400);
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword }
  });

  res.json({
    message: 'Password changed successfully'
  });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req: AuthRequest, res: express.Response): Promise<void> => {
  const newToken = generateToken(req.user!.id);
  
  res.json({
    message: 'Token refreshed successfully',
    token: newToken
  });
}));

export default router;