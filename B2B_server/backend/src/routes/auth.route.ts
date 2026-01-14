import { Router } from 'express';
import { authController } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', (req, res, next) => authController.registerUser(req, res, next));

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', (req, res, next) => authController.loginUser(req, res, next));

/**
 * @route   POST /auth/google
 * @desc    Google OAuth authentication (login/register)
 * @access  Public
 */
router.post('/google', (req, res, next) => authController.handleGoogleAuth(req, res, next));

/**
 * @route   POST /auth/forgot-password
 * @desc    Send password reset OTP
 * @access  Public
 */
router.post('/forgot-password', (req, res, next) => authController.sendPasswordResetOTP(req, res, next));

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with OTP verification
 * @access  Public
 */
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

/**
 * @route   POST /auth/set-password
 * @desc    Set/Update password for authenticated user (for OAuth users to enable traditional login)
 * @access  Private
 */
router.post('/set-password', (req, res, next) => auth.authenticateToken(req, res, next), (req, res, next) => authController.setPassword(req, res, next));

/**
 * @route   PATCH /auth/tutorial-status
 * @desc    Update user's tutorial completion status
 * @access  Private
 */
router.patch('/tutorial-status', (req, res, next) => auth.authenticateToken(req, res, next), (req, res, next) => authController.updateTutorialStatus(req, res, next));

/**
 * @route   POST /auth/deactivate-account
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate-account', (req, res, next) => auth.authenticateToken(req, res, next), (req, res, next) => authController.deactivateAccountController(req, res, next));

/**
 * @route   DELETE /auth/delete-account
 * @desc    Delete user account (soft delete with 30-day grace period)
 * @access  Private
 */
router.delete('/delete-account', (req, res, next) => auth.authenticateToken(req, res, next), (req, res, next) => authController.deleteAccountController(req, res, next));

export default router;
