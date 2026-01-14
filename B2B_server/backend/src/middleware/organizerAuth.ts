import { Response, NextFunction } from 'express';
import ResponseUtil from '../utils/response';
import { AuthenticatedRequest } from './authMiddleware';

// Authorized organizer user IDs
const ORGANIZER_IDS = [
  '3c6b22d7-401a-4ce5-85a7-bd951b20e6c2',
  '5d0c28fb-2d00-4fc9-b4f1-d84af699f12b'
];

/**
 * Middleware to verify that the authenticated user is an authorized contest organizer
 */
export const checkOrganizerAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      ResponseUtil.unauthorized(res, 'Authentication failed');
      return;
    }

    if (!ORGANIZER_IDS.includes(userId)) {
      ResponseUtil.forbidden(res, 'Access denied. Only authorized organizers can perform this action.');
      return;
    }

    next();
  } catch (error) {
    console.error('Organizer authorization error:', error);
    ResponseUtil.serverError(res, 'Failed to verify organizer authorization');
  }
};

export default checkOrganizerAuth;
