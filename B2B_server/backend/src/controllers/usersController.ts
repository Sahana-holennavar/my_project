import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import ResponseUtil from '../utils/response';
import { userService } from '../services/userService';

class UsersController {
  async getUserCompanyPages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const pageParam = req.query.page as string | undefined;
      const limitParam = req.query.limit as string | undefined;
      const roleParam = req.query.role as string | undefined;
      const includeInactiveParam = req.query.includeInactive as string | undefined;
      const profileIdParam = req.query.profileId as string | undefined;

      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 10;
      const roleFilter = roleParam || 'all';
      const includeInactive = includeInactiveParam === 'true';

      if (isNaN(page) || page < 1) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'page', message: 'Page must be a positive integer' },
        ]);
        return;
      }

      if (isNaN(limit) || limit < 1 || limit > 50) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'limit', message: 'Limit must be between 1 and 50' },
        ]);
        return;
      }

      const validRoles = ['admin', 'editor', 'all', 'none'];
      if (roleFilter && !validRoles.includes(roleFilter)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'role', message: 'Role must be one of: admin, editor, all, none' },
        ]);
        return;
      }

      if (roleFilter === 'none' && !profileIdParam) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'profileId', message: 'profileId is required when role is "none"' },
        ]);
        return;
      }

      const result = await userService.getUserCompanyPagesService(
        userId,
        page,
        limit,
        roleFilter,
        includeInactive,
        profileIdParam
      );

      if (result.companyPages.length === 0) {
        ResponseUtil.success(res, 'No company pages found', result);
        return;
      }

      ResponseUtil.success(res, 'Company pages fetched successfully', result);
    } catch (error) {
      console.error('Get user company pages error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch company pages');
    }
  }
}

export const usersController = new UsersController();
export default usersController;

