import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkOwnership } from '../middleware/ownership';
import { jobsController } from '../controllers/jobsController';

const router = Router({ mergeParams: true });

// Search route - must come before /:jobId to avoid being caught by parameter
router.get('/search', authenticateToken, (req, res) => {
  jobsController.searchJobs(req as any, res);
});

router.post('/', authenticateToken, checkOwnership, (req, res) => {
  jobsController.createJob(req as any, res);
});

router.get('/', authenticateToken, (req, res) => {
  jobsController.getAllJobs(req as any, res);
});

router.get('/:jobId/applications', authenticateToken, checkOwnership, (req, res) => {
  jobsController.getJobApplications(req as any, res);
});

router.get('/:jobId/application/:applicationId/resume', authenticateToken, checkOwnership, (req, res) => {
  jobsController.getApplicationResume(req as any, res);
});

router.get('/:jobId', authenticateToken, (req, res) => {
  jobsController.getJobById(req as any, res);
});

router.put('/:jobId', authenticateToken, checkOwnership, (req, res) => {
  jobsController.updateJob(req as any, res);
});

router.delete('/:jobId', authenticateToken, checkOwnership, (req, res) => {
  jobsController.deleteJob(req as any, res);
});

router.patch('/:jobId/application/:applicationId/status', authenticateToken, checkOwnership, (req, res) => {
  jobsController.reviewApplication(req as any, res);
});

export default router;

