import { Response } from 'express';
import ResponseUtil, { ErrorMessages } from '../utils/response';
import { ownerService } from '../services/ownerService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

interface AuthenticatedRequestWithRole extends AuthenticatedRequest {
  userRole?: 'owner' | 'admin' | null;
}

class OwnerController {
  async deactivateBusinessPage(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can deactivate the business page');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.deactivateBusinessPage(profileId, userId);

      ResponseUtil.success(res, 'Business page deactivated successfully', {
        profileId: result.profileId,
        profileName: result.profileName,
        isActive: result.isActive,
        deactivatedAt: result.deactivatedAt
      });
    } catch (error) {
      console.error('Deactivate business page controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Only profile owner can deactivate the business page') {
          ResponseUtil.forbidden(res, 'Only profile owner can deactivate the business page');
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getAllPageMembers(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner' && req.userRole !== 'admin') {
        ResponseUtil.forbidden(res, 'Only profile owner or admin can view page members');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const pageParam = req.query.page as string;
      const limitParam = req.query.limit as string;

      if (pageParam !== undefined) {
        const parsedPage = parseInt(pageParam);
        if (isNaN(parsedPage) || parsedPage < 1) {
          ResponseUtil.validationError(res, 'Page must be greater than 0', [
            { field: 'page', message: 'Page must be greater than 0' },
          ]);
          return;
        }
      }

      if (limitParam !== undefined) {
        const parsedLimit = parseInt(limitParam);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          ResponseUtil.validationError(res, 'Limit must be greater than 0', [
            { field: 'limit', message: 'Limit must be greater than 0' },
          ]);
          return;
        }
        if (parsedLimit > 50) {
          ResponseUtil.validationError(res, 'Limit cannot exceed 50', [
            { field: 'limit', message: 'Limit cannot exceed 50' },
          ]);
          return;
        }
      }

      const page = pageParam !== undefined ? parseInt(pageParam) : 1;
      const limit = limitParam !== undefined ? Math.min(parseInt(limitParam), 50) : 10;

      const result = await ownerService.getAllPageMembers(profileId, page, limit);

      ResponseUtil.success(res, 'Page members retrieved successfully', {
        members: result.members,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all page members controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async promoteMember(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId, memberId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can promote members');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!memberId) {
        ResponseUtil.validationError(res, 'Member identifier is required', [
          { field: 'memberId', message: 'Member identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      if (!uuidRegex.test(memberId)) {
        ResponseUtil.validationError(res, 'Invalid member ID format', [
          { field: 'memberId', message: 'Member ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.promoteMember(profileId, memberId, userId);

      ResponseUtil.success(res, 'Member promoted to Admin successfully', {
        memberId: result.memberId,
        userId: result.userId,
        profileId: result.profileId,
        previousRole: result.previousRole,
        currentRole: result.currentRole,
        permissions: result.permissions,
        promotedAt: result.promotedAt
      });
    } catch (error) {
      console.error('Promote member controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Member not found') {
          ResponseUtil.notFound(res, 'Member not found');
          return;
        }
        if (error.message === 'Only profile owner can promote members') {
          ResponseUtil.forbidden(res, 'Only profile owner can promote members');
          return;
        }
        if (error.message === 'Can only promote members with editor role') {
          ResponseUtil.validationError(res, 'Can only promote members with editor role', [
            { field: 'role', message: 'Can only promote members with editor role' }
          ]);
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async demoteMember(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId, memberId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can demote members');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!memberId) {
        ResponseUtil.validationError(res, 'Member identifier is required', [
          { field: 'memberId', message: 'Member identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      if (!uuidRegex.test(memberId)) {
        ResponseUtil.validationError(res, 'Invalid member ID format', [
          { field: 'memberId', message: 'Member ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.demoteMember(profileId, memberId, userId);

      ResponseUtil.success(res, 'Member demoted to Editor successfully', {
        memberId: result.memberId,
        userId: result.userId,
        profileId: result.profileId,
        previousRole: result.previousRole,
        currentRole: result.currentRole,
        permissions: result.permissions,
        demotedAt: result.demotedAt
      });
    } catch (error) {
      console.error('Demote member controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Member not found') {
          ResponseUtil.notFound(res, 'Member not found');
          return;
        }
        if (error.message === 'Only profile owner can demote members') {
          ResponseUtil.forbidden(res, 'Only profile owner can demote members');
          return;
        }
        if (error.message === 'Can only demote members with admin role') {
          ResponseUtil.validationError(res, 'Can only demote members with admin role', [
            { field: 'role', message: 'Can only demote members with admin role' }
          ]);
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async removeMember(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId, memberId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can remove members');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!memberId) {
        ResponseUtil.validationError(res, 'Member identifier is required', [
          { field: 'memberId', message: 'Member identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      if (!uuidRegex.test(memberId)) {
        ResponseUtil.validationError(res, 'Invalid member ID format', [
          { field: 'memberId', message: 'Member ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.removeMember(profileId, memberId, userId);

      ResponseUtil.success(res, 'Member removed from company successfully', {
        memberId: result.memberId,
        userId: result.userId,
        profileId: result.profileId,
        removedAt: result.removedAt
      });
    } catch (error) {
      console.error('Remove member controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Member not found') {
          ResponseUtil.notFound(res, 'Member not found');
          return;
        }
        if (error.message === 'Only profile owner can remove members') {
          ResponseUtil.forbidden(res, 'Only profile owner can remove members');
          return;
        }
        if (error.message === 'Cannot remove the profile owner') {
          ResponseUtil.forbidden(res, 'Cannot remove the profile owner');
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteBusinessProfile(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can delete the business profile');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.deleteBusinessProfile(profileId, userId);

      ResponseUtil.success(res, 'Business profile deleted successfully', {
        profileId: result.profileId,
        profileName: result.profileName,
        deletedAt: result.deletedAt
      });
    } catch (error) {
      console.error('Delete business profile controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Only profile owner can delete the business profile') {
          ResponseUtil.forbidden(res, 'Only profile owner can delete the business profile');
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async reactivateBusinessProfile(req: AuthenticatedRequestWithRole, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      if (req.userRole !== 'owner') {
        ResponseUtil.forbidden(res, 'Only profile owner can reactivate the business profile');
        return;
      }

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await ownerService.reactivateBusinessProfile(profileId, userId);

      ResponseUtil.success(res, 'Business profile reactivated successfully', {
        profileId: result.profileId,
        profileName: result.profileName,
        isActive: result.isActive,
        reactivatedAt: result.reactivatedAt
      });
    } catch (error) {
      console.error('Reactivate business profile controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Only profile owner can reactivate the business profile') {
          ResponseUtil.forbidden(res, 'Only profile owner can reactivate the business profile');
          return;
        }
        if (error.message === 'Business profile is already active') {
          ResponseUtil.validationError(res, 'Business profile is already active', [
            { field: 'isActive', message: 'Business profile is already active' }
          ]);
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}

export const ownerController = new OwnerController();
export default ownerController;

