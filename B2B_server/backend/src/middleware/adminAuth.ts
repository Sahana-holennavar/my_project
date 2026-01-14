import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import ResponseUtil from '../utils/response';
import { database } from '../config/database';

// Extend Request interface to include admin user data
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

class AdminAuthMiddleware {
  /**
   * Authenticate and verify admin JWT token
   * Checks if user has admin role
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async authenticateAdminToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      console.log('Admin auth header:', authHeader);
      
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        console.log('No token found in Authorization header');
        ResponseUtil.unauthorized(res, 'Authentication failed - No token provided');
        return;
      }

      // Verify JWT token
      console.log('Verifying admin token...');
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      console.log('Token decoded successfully:', { userId: decoded.userId, email: decoded.email, role: decoded.role });
      
      // Check if user has admin role
      const isAdmin = await this.checkAdminRole(decoded.userId);
      
      if (!isAdmin) {
        console.log('User does not have admin role:', decoded.userId);
        ResponseUtil.forbidden(res, 'Access denied - Admin role required');
        return;
      }

      // Add admin info to request object
      req.admin = {
        id: decoded.userId,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      console.log('Admin user set in request:', req.admin);
      next();
    } catch (error) {
      console.error('Admin token verification error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        ResponseUtil.unauthorized(res, 'Invalid or expired token');
      } else {
        ResponseUtil.serverError(res, 'Authentication error');
      }
    }
  }

  /**
   * Verify that user has admin role in the database
   * @param userId - User ID to verify
   * @returns true if user has admin role, false otherwise
   */
  private async checkAdminRole(userId: string): Promise<boolean> {
    try {
      const query = `
        SELECT ur.role_id, r.name 
        FROM "${config.DB_SCHEMA}".user_roles ur
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = 'admin'
        LIMIT 1
      `;
      
      const result = await database.query(query, [userId]);
      return (result as any).rows.length > 0;
    } catch (error) {
      console.error('Admin role check error:', error);
      throw new Error('Database error during admin role verification');
    }
  }

  /**
   * Middleware to check admin role (without token verification)
   * Use this when you already have authenticated user
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async verifyAdminRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const isAdmin = await this.checkAdminRole(req.user.userId);
      
      if (!isAdmin) {
        console.log('User does not have admin role:', req.user.userId);
        ResponseUtil.forbidden(res, 'Access denied - Admin role required');
        return;
      }

      next();
    } catch (error) {
      console.error('Admin role verification error:', error);
      ResponseUtil.serverError(res, 'Authorization error');
    }
  }
}

export const adminAuth = new AdminAuthMiddleware();
export default adminAuth;
