import { Router } from 'express';
import { roleController } from '../controllers/roleController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /roles - public
 */
router.get('/', (req, res, next) => roleController.getRoles(req, res, next));

/**
 * GET /roles/status - check if logged-in user has a role assigned
 */
router.get('/status', authenticateToken, (req, res, next) => roleController.getRoleStatus(req, res, next));

/**
 * POST /roles - assign or update role for authenticated user
 */
router.post('/', authenticateToken, (req, res, next) => roleController.assignRole(req, res, next));

export default router;
