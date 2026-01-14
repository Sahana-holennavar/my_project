import { Router } from 'express';
import connectionController from '../controllers/connectionController';
import authenticateToken from '../middleware/authMiddleware';

const router = Router();

// GET /api/connection/suggested - Get suggested users for connection
router.get('/suggested', authenticateToken, (req, res, next) => connectionController.getSuggestedUsers(req as any, res, next));

// GET /api/connection/sent (all sent requests, or filter by recipient username or UUID)
// Example: /api/connection/sent?recipient=username  or  /api/connection/sent?recipient=uuid
router.get('/sent', authenticateToken, (req, res, next) => connectionController.getSentConnectionRequests(req as any, res, next));

// POST /api/connection/request
router.post('/request', authenticateToken, (req, res, next) => connectionController.requestConnection(req as any, res, next));

// POST /api/connection/accept
router.post('/accept', authenticateToken, (req, res, next) => connectionController.acceptConnectionRequest(req as any, res, next));

// POST /api/connection/reject
router.post('/reject', authenticateToken, (req, res, next) => connectionController.rejectConnectionRequest(req as any, res, next));

// DELETE /api/connection/withdraw
router.delete('/withdraw', authenticateToken, (req, res, next) => connectionController.withdrawConnectionRequest(req as any, res, next));

// DELETE /api/connection/remove
router.delete('/remove', authenticateToken, (req, res, next) => connectionController.removeConnection(req as any, res, next));

// GET /api/connection/notifications
router.get('/notifications', authenticateToken, (req, res, next) => connectionController.fetchNotifications(req as any, res, next));

// POST /api/connection/notifications/read
router.post('/notifications/read', authenticateToken, (req, res, next) => connectionController.markNotificationAsRead(req as any, res, next));

// GET /api/connection/list
router.get('/list', authenticateToken, (req, res, next) => connectionController.getConnections(req as any, res, next));

// GET /api/connection/status/:user_id
router.get('/status/:user_id', authenticateToken, (req, res, next) => connectionController.checkConnectionStatus(req as any, res, next));

export default router;
