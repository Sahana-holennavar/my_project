import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import ResponseUtil from '../utils/response';
import { invitationsService } from '../services/invitationsService';
import {
  InvitationAlreadyAcceptedError,
  InvitationAlreadyDeclinedError,
  InvitationNotForUserError,
} from '../services/invitationsService';
import { BusinessProfileNotFoundError, InvitationNotFoundError } from '../services/business-profileService';

class InvitationsController {
  async acceptInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, invitationId } = req.params;
      const userId = req.user?.id;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      if (!invitationId) {
        ResponseUtil.validationError(res, 'Invitation identifier is required', [
          { field: 'invitationId', message: 'Invitation identifier is required' },
        ]);
        return;
      }
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const result = await invitationsService.acceptInvitationService(invitationId, userId, profileId);
      ResponseUtil.success(res, 'Invitation accepted successfully', result);
    } catch (error) {
      console.error('Accept invitation error:', error);
      if (error instanceof InvitationNotFoundError) {
        ResponseUtil.notFound(res, 'Invitation not found');
        return;
      }
      if (error instanceof InvitationNotForUserError) {
        ResponseUtil.forbidden(res, 'Forbidden. You are not the recipient of this invitation');
        return;
      }
      if (error instanceof InvitationAlreadyAcceptedError) {
        ResponseUtil.validationError(res, 'Invitation has already been accepted', []);
        return;
      }
      if (error instanceof InvitationAlreadyDeclinedError) {
        ResponseUtil.validationError(res, 'Invitation has already been declined', []);
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, 'Failed to accept invitation');
    }
  }

  async declineInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, invitationId } = req.params;
      const userId = req.user?.id;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      if (!invitationId) {
        ResponseUtil.validationError(res, 'Invitation identifier is required', [
          { field: 'invitationId', message: 'Invitation identifier is required' },
        ]);
        return;
      }
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const result = await invitationsService.declineInvitationService(invitationId, userId, profileId);
      ResponseUtil.success(res, 'Invitation declined', result);
    } catch (error) {
      console.error('Decline invitation error:', error);
      if (error instanceof InvitationNotFoundError) {
        ResponseUtil.notFound(res, 'Invitation not found');
        return;
      }
      if (error instanceof InvitationNotForUserError) {
        ResponseUtil.forbidden(res, 'Forbidden. You are not the recipient of this invitation');
        return;
      }
      if (error instanceof InvitationAlreadyAcceptedError) {
        ResponseUtil.validationError(res, 'Invitation has already been accepted', []);
        return;
      }
      if (error instanceof InvitationAlreadyDeclinedError) {
        ResponseUtil.validationError(res, 'Invitation has already been declined', []);
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, 'Failed to decline invitation');
    }
  }

  async getUserInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const status = (req.query.status as string) || 'pending';
      const validStatuses = ['pending', 'accepted', 'declined', 'all'];
      if (!validStatuses.includes(status)) {
        ResponseUtil.validationError(res, 'Invalid status filter', [
          { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` },
        ]);
        return;
      }
      const result = await invitationsService.getInvitationsByUser(userId, status);
      ResponseUtil.success(res, 'User invitations retrieved successfully', result);
    } catch (error) {
      console.error('Get user invitations error:', error);
      ResponseUtil.serverError(res, 'Failed to retrieve user invitations');
    }
  }
}

export const invitationsController = new InvitationsController();
export default invitationsController;

