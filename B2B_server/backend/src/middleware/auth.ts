import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import ResponseUtil from '../utils/response';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}

class AuthMiddleware {
  /**
   * Authenticate JWT token
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      console.log('Auth header:', authHeader);
      console.log('JWT_SECRET from config:', config.JWT_SECRET ? 'Present' : 'Missing');
      
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      console.log('Extracted token:', token ? 'Token present' : 'No token');

      if (!token) {
        console.log('No token found in Authorization header');
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      // Verify JWT token
      console.log('Verifying token...');
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      console.log('Token decoded successfully:', { userId: decoded.userId, email: decoded.email, role: decoded.role });
      
      // Add user info to request object
      req.user = {
        id: decoded.userId, // JWT payload uses 'userId', not 'id'
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      console.log('User set in request:', req.user);
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      ResponseUtil.unauthorized(res, 'Invalid or expired token');
    }
  }
}

export const auth = new AuthMiddleware();
export default auth;
