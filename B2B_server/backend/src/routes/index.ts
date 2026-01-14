import { Router } from 'express';
import authRoutes from './auth.route';
import rolesRoutes from './roles.route';
import adminRoutes from './admin.route';
import profileRoutes from './profile.route';
import postRoutes from './post.route';
import interactionRoutes from './interaction.route';
import queueRoutes from './queue';
import workerRoutes from './worker';
import connectionRoutes from './connection.route';
import businessProfileRoutes from './business-profile.route';
import invitationsRoutes from './invitations.route';
import usersRoutes from './users.route';
import membersRoutes from './members.route';
import ownerRoutes from './owner.route';
import contestRoutes from './contest.route';
import testCronRoutes from './testCronRoutes';
import jobsRoutes from './jobs.route';
import applicationsRoutes from './applications.route';
import resumeEvaluationRoutes from './resumeEvaluation.route';
import chatRoutes from './chat.route';

const router = Router();

// API routes without versioning
router.use('/auth', authRoutes);
router.use('/roles', rolesRoutes);
router.use('/admin', adminRoutes);
router.use('/profile', profileRoutes);
router.use('/posts', postRoutes);
router.use('/interactions', interactionRoutes);
router.use('/queue', queueRoutes);
router.use('/worker', workerRoutes);
router.use('/connection', connectionRoutes);
router.use('/invitations', invitationsRoutes);
router.use('/users', usersRoutes);
router.use('/contest', contestRoutes); // Contest routes (includes /contest and /organizer/contest)
router.use('/test', testCronRoutes);
router.use('/jobs', jobsRoutes);
router.use('/applications', applicationsRoutes);
router.use('/user', applicationsRoutes);
router.use('/resumes', resumeEvaluationRoutes);
router.use('/chat', chatRoutes);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date() });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    status: 404,
    message: 'The requested endpoint was not found',
    success: false,
    error: {
      code: 'NOT_FOUND',
      details: `${req.method} ${req.originalUrl} is not available`
    }
  });
});

export default router;
