import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { usersController } from '../controllers/usersController';

const router = Router();

router.get('/company-pages', authenticateToken, (req, res) => {
  usersController.getUserCompanyPages(req as any, res);
});

export default router;

