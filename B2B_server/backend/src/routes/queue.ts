import { Router } from 'express';
import { getQueueDashboard, getJobStatusById, enqueueNotification } from '../controllers/queueController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Protect all queue routes with standard authentication
router.use(authenticateToken);

// Public enqueue endpoint - any authenticated user can enqueue
router.post('/enqueue', enqueueNotification);

// Admin-only endpoints
router.get('/admin/queues', getQueueDashboard);
router.get('/jobs/status/:jobId', getJobStatusById);

export default router;
