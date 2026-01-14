import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { invitationsController } from '../controllers/invitationsController';

const router = Router();

router.get('/received', authenticateToken, (req, res) => {
  invitationsController.getUserInvitations(req as any, res);
});

router.put('/:profileId/:invitationId/accept', authenticateToken, (req, res) => {
  invitationsController.acceptInvitation(req as any, res);
});

router.put('/:profileId/:invitationId/decline', authenticateToken, (req, res) => {
  invitationsController.declineInvitation(req as any, res);
});

export default router;

