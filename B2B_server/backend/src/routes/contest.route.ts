import express from 'express';
import { ContestController } from '../controllers/contestController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkOrganizerAuth } from '../middleware/organizerAuth';
import { uploadContestSubmission } from '../middleware/multerConfig';

const router = express.Router();

// User routes - Contest submission
router.post(
  '/contest/:contestId/register',
  authenticateToken,
  ContestController.registerForContest
);

router.post(
  '/contest/:contestId/submit',
  authenticateToken,
  uploadContestSubmission,
  ContestController.submitSolution
);

router.get(
  '/contest/:contestId/submission',
  authenticateToken,
  ContestController.getUserSubmission
);

router.get(
  '/contest/:contestId/status',
  authenticateToken,
  ContestController.checkRegistrationStatus
);

router.get(
  '/contest/:contestId',
  ContestController.getContest
);

// Organizer routes - Contest management
router.post(
  '/organizer/contest',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.createContest
);

router.get(
  '/organizer/contest',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.getAllContests
);

router.get(
  '/organizer/contest/:contestId',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.getContest
);

router.put(
  '/organizer/contest/:contestId',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.updateContest
);

router.delete(
  '/organizer/contest/:contestId',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.deleteContest
);

router.patch(
  '/organizer/contest/:contestId/start',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.startContest
);

router.get(
  '/organizer/contest/:contestId/submissions',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.getContestSubmissions
);

router.patch(
  '/organizer/contest/:contestId/winner',
  authenticateToken,
  checkOrganizerAuth,
  ContestController.selectWinner
);

export default router;
