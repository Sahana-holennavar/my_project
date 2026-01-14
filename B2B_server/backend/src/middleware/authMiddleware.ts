import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import ResponseUtil from '../utils/response';

// Extend Express Request type to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: string;
  };
}

/**
 * Middleware to verify JWT token and authenticate requests
 * Adds user data to request object for use in route handlers
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      ResponseUtil.unauthorized(res, 'Access token is required');
      return;
    }

    // Verify token
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          ResponseUtil.unauthorized(res, 'Token has expired');
          return;
        }
        if (err.name === 'JsonWebTokenError') {
          ResponseUtil.unauthorized(res, 'Invalid token');
          return;
        }
        ResponseUtil.unauthorized(res, 'Token verification failed');
        return;
      }

      // Add user data to request
      const payload = decoded as any;
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      };

      next();
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    ResponseUtil.serverError(res, 'Authentication failed');
  }
};

export default authenticateToken;
