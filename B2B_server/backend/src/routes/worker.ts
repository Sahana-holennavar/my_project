import { Router } from 'express';
import { workerController } from '../controllers/workerController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * Worker Routes
 * All routes require authentication
 */

/**
 * GET /api/worker/jobs/:jobId/status
 * Retrieve job status and processing details
 * Requires authentication
 */
router.get(
  '/jobs/:jobId/status',
  authenticateToken,
  (req, res) => workerController.getJobStatus(req, res)
);

export default router;

