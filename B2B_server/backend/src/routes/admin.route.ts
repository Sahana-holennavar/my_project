import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

/**
 * @route   POST /admin/login
 * @desc    Admin login - checks admin role and returns JWT tokens
 * @access  Public
 */
router.post('/login', (req, res, next) => adminController.adminLogin(req, res, next));

/**
 * @route   POST /admin/logout
 * @desc    Admin logout - invalidate token
 * @access  Private - Admin Only
 */
router.post(
  '/logout',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.logout(req, res, next)
);

/**
 * @route   POST /admin/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', (req, res, next) => adminController.refreshToken(req, res, next));

/**
 * @route   GET /admin/verify
 * @desc    Verify token and return user info
 * @access  Private - Admin Only
 */
router.get(
  '/verify',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.verifyToken(req, res, next)
);

/**
 * @route   GET /admin/dashboard/stats
 * @desc    Get dashboard statistics (admin only)
 * @access  Private - Admin Only
 */
router.get(
  '/dashboard/stats',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getDashboardStats(req, res, next)
);

/**
 * @route   GET /admin/dashboard/analytics
 * @desc    Get dashboard analytics with time-series data
 * @access  Private - Admin Only
 * @query   days - Number of days for trend data (default: 30, max: 365)
 */
router.get(
  '/dashboard/analytics',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getDashboardAnalytics(req, res, next)
);

/**
 * @route   GET /admin/users
 * @desc    Get list of all users (admin only)
 * @access  Private - Admin Only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 * @query   active - Filter by active status (true/false)
 */
router.get(
  '/users',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.listAllUsers(req, res, next)
);

/**
 * @route   GET /admin/users/export
 * @desc    Export users to CSV (admin only)
 * @access  Private - Admin Only
 * @query   active - Filter by active status (true/false)
 * @query   role - Filter by role
 */
router.get(
  '/users/export',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.exportUsers(req, res, next)
);

/**
 * @route   GET /admin/users/:userId
 * @desc    Get specific user details (admin only)
 * @access  Private - Admin Only
 */
router.get(
  '/users/:userId',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getUserDetails(req, res, next)
);

/**
 * @route   POST /admin/users/:userId/deactivate
 * @desc    Deactivate user account (admin only)
 * @access  Private - Admin Only
 * @body    reason - Optional reason for deactivation
 */
router.post(
  '/users/:userId/deactivate',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.deactivateUser(req, res, next)
);

/**
 * @route   POST /admin/users/:userId/reactivate
 * @desc    Reactivate user account (admin only)
 * @access  Private - Admin Only
 */
router.post(
  '/users/:userId/reactivate',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.reactivateUser(req, res, next)
);

/**
 * @route   GET /admin/organizations
 * @desc    Get list of all organizations/business profiles (admin only)
 * @access  Private - Admin Only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 * @query   search - Search by company name or owner email
 */
router.get(
  '/organizations',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.listOrganizations(req, res, next)
);

/**
 * @route   GET /admin/organizations/:organizationId
 * @desc    Get specific organization details (admin only)
 * @access  Private - Admin Only
 */
router.get(
  '/organizations/:organizationId',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getOrganizationDetails(req, res, next)
);

/**
 * @route   GET /admin/contests
 * @desc    Get list of all contests (admin only)
 * @access  Private - Admin Only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 * @query   status - Filter by contest status
 */
router.get(
  '/contests',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.listContests(req, res, next)
);

/**
 * @route   GET /admin/contests/export
 * @desc    Export contests to CSV (admin only)
 * @access  Private - Admin Only
 * @query   status - Filter by contest status
 */
router.get(
  '/contests/export',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.exportContests(req, res, next)
);

/**
 * @route   GET /admin/contests/:contestId
 * @desc    Get specific contest details (admin only)
 * @access  Private - Admin Only
 */
router.get(
  '/contests/:contestId',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getContestDetails(req, res, next)
);

/**
 * @route   GET /admin/contests/:contestId/registrations
 * @desc    Get registered users for a specific contest (admin only)
 * @access  Private - Admin Only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get(
  '/contests/:contestId/registrations',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getContestRegisteredUsers(req, res, next)
);

/**
 * @route   GET /admin/contests/:contestId/users/:userId/answers
 * @desc    Get submission answers for a specific contest and user (admin only)
 * @access  Private - Admin Only
 */
router.get(
  '/contests/:contestId/users/:userId/answers',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getContestUserAnswers(req, res, next)
);

/**
 * @route   GET /admin/audit-logs
 * @desc    Get audit logs (admin only)
 * @access  Private - Admin Only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   event_type - Filter by event type
 * @query   user_id - Filter by user ID
 */
router.get(
  '/audit-logs',
  (req, res, next) => adminAuth.authenticateAdminToken(req, res, next),
  (req, res, next) => adminController.getAuditLogs(req, res, next)
);

export default router;
