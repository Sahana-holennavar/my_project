import type { AuthenticatedRequest } from './authMiddleware';
import type { Response, NextFunction } from 'express';
import ResponseUtil from '../utils/response';
import { authService } from '../services/authService';

/**
 * Middleware to check if user has admin or developer role
 * Must be used AFTER authenticateToken middleware
 * Fetches role from database to ensure it's current
 */
export async function queueAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	
	if (!req.user || !req.user.userId) {
		return ResponseUtil.unauthorized(res, 'User not authenticated. Access denied.');
	}

	try {
		
		// Fetch role from database
		const roleData = await authService.getUserRole(req.user.userId);
		
		if (!roleData || !roleData.role_name) {
			return ResponseUtil.unauthorized(res, 'No role assigned. Access denied.');
		}
		
		const userRole = roleData.role_name.toLowerCase();
		
		if (['admin', 'developer'].includes(userRole)) {
			return next();
		}
		
		return ResponseUtil.unauthorized(res, 'Insufficient permissions. Admin or developer access required.');
	} catch (error) {
		return ResponseUtil.serverError(res, 'Error verifying user role');
	}
}
