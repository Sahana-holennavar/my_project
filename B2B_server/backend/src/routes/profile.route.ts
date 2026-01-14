import { Router } from 'express';
import { profileController } from '../controllers/profileController';
import { auth } from '../middleware/auth';
import { uploadBanner, uploadProfileImage, uploadResume, uploadCertificate } from '../middleware/multerConfig';

const router = Router();

/**
 * @route   POST /profile/create
 * @desc    Create user profile
 * @access  Private
 */
router.post('/create', (req, res, next) => auth.authenticateToken(req, res, next), (req, res, next) => profileController.createProfile(req, res, next));

/**
 * @route   PUT /profile/edit
 * @desc    Edit user profile field (supports both JSON and multipart/form-data for certificate uploads)
 * @access  Private
 * @note    For certificate uploads, use multipart/form-data with field 'certificate' and JSON 'data' field.
 *          For JSON-only updates, use application/json Content-Type.
 */
router.put('/edit', 
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => {
    // Only apply multer if Content-Type indicates multipart/form-data
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      uploadCertificate(req, res, (err: any) => {
        // Handle multer errors
        if (err) {
          // For file size errors, pass to controller to handle gracefully
          if (err.code === 'LIMIT_FILE_SIZE') {
            console.warn('File size limit exceeded:', err.message);
            // Continue - controller will handle and save certification without file
            return next();
          }
          // For unexpected file errors (like wrong field name), continue but log for debugging
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            console.warn('Unexpected file field:', err.message);
            console.warn('Expected field name: certificate');
            // Continue - controller will handle gracefully
            return next();
          }
          // For file filter errors (invalid file type)
          if (err.message && err.message.includes('Invalid file format')) {
            console.warn('Invalid file format:', err.message);
            // Pass error to controller to handle with proper response
            return next(err);
          }
          // For other errors, pass them along
          console.error('Multer error:', err);
          return next(err);
        }
        next();
      });
    } else {
      next();
    }
  },
  (req, res, next) => profileController.editProfile(req, res, next)
);

/**
 * @route   DELETE /profile/avatar
 * @desc    Remove user avatar
 * @access  Private
 */
router.delete('/avatar', 
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => profileController.removeAvatar(req, res, next)
);

/**
 * @route   DELETE /profile/banner
 * @desc    Remove user banner (sets to null)
 * @access  Private
 */
router.delete('/banner', 
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => profileController.removeBanner(req, res, next)
);

/**
 * @route   POST /profile/upload-resume
 * @desc    Upload resume file to S3
 * @access  Private
 */
router.post('/upload-resume', 
  (req, res, next) => auth.authenticateToken(req, res, next), 
  uploadResume, 
  (req, res, next) => profileController.uploadResume(req, res, next)
);

/**
 * @route   POST /profile/upload-avatar
 * @desc    Upload avatar file to S3
 * @access  Private
 */
router.post('/upload-avatar', 
  (req, res, next) => auth.authenticateToken(req, res, next), 
  uploadProfileImage, 
  (req, res, next) => profileController.uploadAvatar(req, res, next)
);

router.post('/upload-banner', 
  (req, res, next) => auth.authenticateToken(req, res, next), 
  uploadBanner, 
  (req, res, next) => profileController.uploadBanner(req, res, next)
);

/**
 * @route   GET /profile/search
 * @desc    Search user profiles by first/last name (supports fuzzy matches)
 * @query   q: string (optional when sort=recent)
 * @query   sort: 'recent' to get latest profiles without query
 * @access  Public
 */
router.get('/search', (req, res, next) => profileController.searchProfiles(req, res, next));

/**
 * @route   GET /profile/:userId
 * @desc    Get user profile (complete or partial based on auth)
 * @access  Public (with optional auth)
 */
router.get('/:userId', (req, res, next) => profileController.getProfile(req, res, next));

export default router;
