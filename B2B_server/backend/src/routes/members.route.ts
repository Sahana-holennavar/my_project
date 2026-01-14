import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { membersController } from '../controllers/membersController';

const router = Router();

router.delete('/:profileId/members/revoke', authenticateToken, (req, res) => {
  membersController.revokeRole(req, res);
});

router.put('/:profileId/members/demote', authenticateToken, (req, res) => {
  membersController.demoteRole(req, res);
});

export default router;


