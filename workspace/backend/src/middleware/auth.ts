import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '../lib/mongodb';

export type UserType = 'ADMIN' | 'CLIENT' | 'TRANSPORTER';

async function findUserById(id: string): Promise<any> {
  try {
    const usersCollection = getUsersCollection();
    return await usersCollection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('MongoDB error:', error);
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: UserType;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Find user in database using direct MongoDB connection
    const user = await findUserById(decoded.id);

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or account is not active'
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      userType: user.userType
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
    return;
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.userType !== 'ADMIN') {
    res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
    return;
  }
  next();
};

export const requireClientOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.userType !== 'CLIENT' && req.user.userType !== 'ADMIN')) {
    res.status(403).json({
      error: 'Client or admin access required',
      message: 'This endpoint requires client or administrator privileges'
    });
    return;
  }
  next();
};

export const requireTransporterOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.userType !== 'TRANSPORTER' && req.user.userType !== 'ADMIN')) {
    res.status(403).json({
      error: 'Transporter or admin access required',
      message: 'This endpoint requires transporter or administrator privileges'
    });
    return;
  }
  next();
};