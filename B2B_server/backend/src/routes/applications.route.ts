import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { uploadJobApplicationResume } from '../middleware/multerConfig';
import { applicationsController } from '../controllers/applicationsController';

const router = Router({ mergeParams: true });

router.post('/:jobId/apply',
  authenticateToken,
  uploadJobApplicationResume,
  (req, res) => {
    applicationsController.applyForJob(req as any, res);
  }
);

router.get('/applications',
  authenticateToken,
  (req, res) => {
    applicationsController.getUserApplications(req as any, res);
  }
);

router.get('/applications/:applicationId',
  authenticateToken,
  (req, res) => {
    applicationsController.getApplicationById(req as any, res);
  }
);

router.put('/applications/:applicationId',
  authenticateToken,
  uploadJobApplicationResume,
  (req, res) => {
    applicationsController.updateApplication(req as any, res);
  }
);

router.delete('/applications/:applicationId',
  authenticateToken,
  (req, res) => {
    applicationsController.revokeApplication(req as any, res);
  }
);

export default router;

