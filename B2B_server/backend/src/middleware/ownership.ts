import { Response, NextFunction } from 'express';
import { config } from '../config/env';
import { database } from '../config/database';
import ResponseUtil from '../utils/response';
import { AuthenticatedRequest } from './authMiddleware';

interface AuthenticatedRequestWithRole extends AuthenticatedRequest {
  userRole?: 'owner' | 'admin' | null;
}

/**
 * Middleware to verify that the authenticated user owns the targeted business profile or is an admin.
 */
export const checkOwnership = async (
  req: AuthenticatedRequestWithRole,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;

    if (!userId) {
      ResponseUtil.unauthorized(res, 'Authentication failed');
      return;
    }

    if (!profileId) {
      ResponseUtil.validationError(res, 'Profile identifier is required', [
        { field: 'profileId', message: 'Profile identifier is required' },
      ]);
      return;
    }

    const profileQuery = `
      SELECT owner_id
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;

    const profileResult = await database.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string }> };

    if (!profileResult.rows.length) {
      ResponseUtil.notFound(res, 'Business profile not found');
      return;
    }

    const ownerRow = profileResult.rows[0] as { owner_id: string };
    const { owner_id: ownerId } = ownerRow;

    if (ownerId === userId) {
      req.userRole = 'owner';
      next();
      return;
    }

    const memberQuery = `
      SELECT role
      FROM "${config.DB_SCHEMA}".company_pages_members
      WHERE company_page_id = $1 AND user_id = $2 AND role = 'admin'
      LIMIT 1
    `;

    const memberResult = await database.query(memberQuery, [profileId, userId]) as { rows: Array<{ role: string }> };

    if (memberResult.rows.length) {
      req.userRole = 'admin';
      next();
      return;
    }

    ResponseUtil.forbidden(res, 'You do not have permission to modify this business profile');
  } catch (error) {
    console.error('Ownership verification error:', error);
    ResponseUtil.serverError(res, 'Failed to verify business profile ownership');
  }
};

export default checkOwnership;

