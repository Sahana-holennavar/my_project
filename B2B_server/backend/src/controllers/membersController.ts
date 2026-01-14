import { Response } from 'express';
import ResponseUtil, { ErrorMessages } from '../utils/response';
import { membersService } from '../services/membersService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

class MembersController {
  async revokeRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

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

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await membersService.revokeMemberRole(userId, profileId);

      ResponseUtil.success(res, 'You have left the company successfully', {
        userId: result.userId,
        profileId: result.profileId,
        profileName: result.profileName,
        previousRole: result.previousRole,
        revokedAt: result.revokedAt
      });
    } catch (error) {
      console.error('Revoke role controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Member record not found') {
          ResponseUtil.forbidden(res, 'Forbidden. You are not a member of this profile');
          return;
        }
        if (error.message === 'Profile owner cannot revoke their role') {
          ResponseUtil.forbidden(res, 'Profile owner cannot revoke their role');
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async demoteRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;

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

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(profileId)) {
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: 'Profile ID must be a valid UUID' },
        ]);
        return;
      }

      const result = await membersService.demoteMemberRole(userId, profileId);

      ResponseUtil.success(res, 'Role demoted to Editor successfully', {
        memberId: result.memberId,
        userId: result.userId,
        profileId: result.profileId,
        profileName: result.profileName,
        previousRole: result.previousRole,
        currentRole: result.currentRole,
        permissions: result.permissions,
        demotedAt: result.demotedAt
      });
    } catch (error) {
      console.error('Demote role controller error:', error);

      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message === 'Member record not found') {
          ResponseUtil.forbidden(res, 'Forbidden. You are not a member of this profile');
          return;
        }
        if (error.message === 'Profile owner cannot demote their role') {
          ResponseUtil.forbidden(res, 'Profile owner cannot demote their role');
          return;
        }
        if (error.message === 'Cannot demote. Editor is the lowest role') {
          ResponseUtil.validationError(res, 'Cannot demote. Editor is the lowest role', [
            { field: 'role', message: 'Cannot demote. Editor is the lowest role' }
          ]);
          return;
        }
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}

export const membersController = new MembersController();
export default membersController;

