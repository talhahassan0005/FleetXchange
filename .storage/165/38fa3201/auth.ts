import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: UserType;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, userType: true, status: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or account is not active'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.userType !== 'ADMIN') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
  }
  next();
};

export const requireClientOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.userType !== 'CLIENT' && req.user.userType !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Client or admin access required',
      message: 'This endpoint requires client or administrator privileges'
    });
  }
  next();
};

export const requireTransporterOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.userType !== 'TRANSPORTER' && req.user.userType !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Transporter or admin access required',
      message: 'This endpoint requires transporter or administrator privileges'
    });
  }
  next();
};