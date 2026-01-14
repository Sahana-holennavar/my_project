import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkOwnership } from '../middleware/ownership';
import { ownerController } from '../controllers/ownerController';

const router = Router();

router.patch('/:profileId/deactivate', authenticateToken, checkOwnership, (req, res) => {
  ownerController.deactivateBusinessPage(req as any, res);
});

router.get('/:profileId/members', authenticateToken, checkOwnership, (req, res) => {
  ownerController.getAllPageMembers(req as any, res);
});

router.put('/:profileId/members/:memberId/promote', authenticateToken, checkOwnership, (req, res) => {
  ownerController.promoteMember(req as any, res);
});

router.put('/:profileId/members/:memberId/demote', authenticateToken, checkOwnership, (req, res) => {
  ownerController.demoteMember(req as any, res);
});

router.delete('/:profileId/members/:memberId', authenticateToken, checkOwnership, (req, res) => {
  ownerController.removeMember(req as any, res);
});

router.delete('/:profileId', authenticateToken, checkOwnership, (req, res) => {
  ownerController.deleteBusinessProfile(req as any, res);
});

router.patch('/:profileId/reactivate', authenticateToken, checkOwnership, (req, res) => {
  ownerController.reactivateBusinessProfile(req as any, res);
});

export default router;

