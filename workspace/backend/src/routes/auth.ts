import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
// import { EmailService } from '../services/emailService';
// Using direct MongoDB connection

const router = express.Router();

async function findUserByEmail(email: string): Promise<any> {
  try {
    const usersCollection = getUsersCollection();
    return await usersCollection.findOne({ email });
  } catch (error) {
    console.error('MongoDB error:', error);
    return null;
  }
}

// Generate JWT token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'fleetxchange-super-secret-jwt-key-production-2025';
  
  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: '7d' }
  ) as string;
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
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate email verification token
  const emailVerificationToken = 'temp-token';
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create user using MongoDB
  const usersCollection = getUsersCollection();
  const userData = {
    email,
    password: hashedPassword,
    userType,
    status: 'PENDING',
    companyName,
    contactPerson,
    phone,
    address,
    businessRegistration,
    taxId,
    emailVerified: false,
    emailVerificationToken,
    emailVerificationExpires,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await usersCollection.insertOne(userData);
  const user = { ...userData, _id: result.insertedId };

  const token = generateToken(user._id.toString());

  // Send verification email
  try {
    // await emailService.sendVerificationEmail(email, emailVerificationToken, contactPerson);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email sending fails
  }

  res.status(201).json({
    message: 'User registered successfully. Please check your email to verify your account.',
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

  // Find user in database using direct MongoDB connection
  const user = await findUserByEmail(email);

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Check if user is active (allow PENDING users to login)
  if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
    throw createError('Account is not active. Please contact support.', 401);
  }

  const token = generateToken(user._id.toString());

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
  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
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

  // Convert _id to id for consistency
  const userWithId = { ...user, id: user!._id.toString() };
  delete (userWithId as any)._id;

  res.json({ user: userWithId });
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

  const usersCollection = getUsersCollection();
  const updateData = {
    companyName,
    contactPerson,
    phone,
    address,
    businessRegistration,
    taxId,
    updatedAt: new Date()
  };

  await usersCollection.updateOne(
    { _id: new ObjectId(req.user!.id) },
    { $set: updateData }
  );

  const user = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
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
        updatedAt: 1
      }
    }
  );

  // Convert _id to id for consistency
  const userWithId = { ...user, id: user!._id.toString() };
  delete (userWithId as any)._id;

  res.json({
    message: 'Profile updated successfully',
    user: userWithId
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
  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne(
    { _id: new ObjectId(req.user!.id) },
    { projection: { _id: 1, password: 1 } }
  );

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
  await usersCollection.updateOne(
    { _id: new ObjectId(req.user!.id) },
    { $set: { password: hashedNewPassword, updatedAt: new Date() } }
  );

  res.json({
    message: 'Password changed successfully'
  });
}));

// Verify email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], asyncHandler(async (req: express.Request, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { token } = req.body;

  // Find user with this verification token
  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    throw createError('Invalid or expired verification token', 400);
  }

  // Update user to mark email as verified
  await usersCollection.updateOne(
    { _id: user._id },
    { 
      $set: { 
        emailVerified: true, 
        emailVerificationToken: null, 
        emailVerificationExpires: null,
        updatedAt: new Date()
      } 
    }
  );

  // Send welcome email
  try {
    // await emailService.sendWelcomeEmail(user.email, user.contactPerson, user.userType);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  res.json({
    message: 'Email verified successfully'
  });
}));

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], asyncHandler(async (req: express.Request, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { email } = req.body;

  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({ email });

  if (!user) {
    throw createError('User not found', 404);
  }

  if (user.emailVerified) {
    throw createError('Email already verified', 400);
  }

  // Generate new verification token
  const emailVerificationToken = 'temp-token';
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Update user with new token
  await usersCollection.updateOne(
    { _id: user._id },
    { 
      $set: { 
        emailVerificationToken, 
        emailVerificationExpires,
        updatedAt: new Date()
      } 
    }
  );

  // Send verification email
  try {
    // await emailService.sendVerificationEmail(email, emailVerificationToken, user.contactPerson);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw createError('Failed to send verification email', 500);
  }

  res.json({
    message: 'Verification email sent successfully'
  });
}));

// Register new user
router.post('/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('userType').isIn(['CLIENT', 'TRANSPORTER']).withMessage('User type must be CLIENT or TRANSPORTER'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('contactPerson').notEmpty().withMessage('Contact person is required'),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('businessRegistration').optional().isString(),
  body('taxId').optional().isString()
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
  const usersCollection = getUsersCollection();
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    throw createError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate verification token
  const emailVerificationToken = 'temp-token';
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create user
  const userData = {
    email,
    password: hashedPassword,
    userType,
    status: 'PENDING', // New users start as pending
    companyName,
    contactPerson,
    phone: phone || '',
    address: address || '',
    businessRegistration: businessRegistration || '',
    taxId: taxId || '',
    emailVerified: false,
    emailVerificationToken,
    emailVerificationExpires,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await usersCollection.insertOne(userData);
  const user = { ...userData, _id: result.insertedId };

  // Send welcome email
  try {
    // await emailService.sendWelcomeEmail(user.email, user.contactPerson, user.userType);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  console.log('✅ User registered successfully:', {
    id: user._id.toString(),
    email: user.email,
    userType: user.userType,
    status: user.status
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful! Please check your email for verification.',
    user: {
      id: user._id.toString(),
      email: user.email,
      userType: user.userType,
      status: user.status
    }
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