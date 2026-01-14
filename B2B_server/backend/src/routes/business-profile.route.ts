import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { businessProfileController } from '../controllers/business-profileController';
import { checkOwnership } from '../middleware/ownership';
import {
  uploadBusinessProfileVideo,
  uploadPrivateInfoFiles,
  uploadBanner,
  uploadBusinessAvatar,
  configureMulter,
  uploadSinglePostMedia,
} from '../middleware/multerConfig';
import { postRateLimit } from '../middleware/rateLimiter';
import jobsRoutes from './jobs.route';

const router = Router();

/**
 * Optional file upload middleware - doesn't fail if no file is provided
 * Allows both form-data (with file) and JSON (without file) requests
 */
const optionalFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploadBusinessProfileVideo(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 400,
          message: 'File too large. Maximum size is 50MB',
          success: false,
        });
      }
      if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
        return next();
      }
      return res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
    }
    next();
  });
};

/**
 * Optional file upload middleware for private info files
 * Handles both registration_certificate and business_license as optional files
 * Allows both form-data (with files) and JSON (without files) requests
 */
const optionalPrivateInfoFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploadPrivateInfoFiles(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 400,
          message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB`,
          success: false,
        });
      }
      if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
        return next();
      }
      return res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
    }
    next();
  });
};

/**
 * Banner upload middleware with error handling
 * Handles file size exceeded error (413 status)
 */
const bannerUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  uploadBanner(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          status: 413,
          message: 'File size exceeds maximum limit of 10MB',
          success: false,
        });
        return;
      }
      res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
      return;
    }
    next();
  });
};

/**
 * Avatar upload middleware with error handling
 * Handles file size exceeded error (413 status) and invalid file format (400 status)
 */
const avatarUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  uploadBusinessAvatar(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          status: 413,
          message: 'File size exceeds maximum limit of 5MB',
          success: false,
        });
        return;
      }
      if (err.message && (err.message.includes('Invalid file format') || err.message.includes('Unsupported media type'))) {
        res.status(400).json({
          status: 400,
          message: 'Invalid file format. Only jpg, jpeg, png allowed',
          success: false,
        });
        return;
      }
      res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
      return;
    }
    next();
  });
};

/**
 * @route   POST /business-profile/create-business-profile
 * @desc    Create company business profile
 * @access  Private
 */
router.post('/create-business-profile', authenticateToken, (req, res) => {
  businessProfileController.createBusinessProfile(req, res);
});

/**
 * @route   POST /business-profile/:profileId/about
 * @desc    Create about section for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with company_introduction_video file) and JSON
 */
router.post('/:profileId/about', authenticateToken, checkOwnership, optionalFileUpload, (req, res) => {
  businessProfileController.createAbout(req, res);
});

/**
 * @route   GET /business-profile/:profileId/about
 * @desc    Retrieve about section for business profile
 * @access  Private (respecting privacy settings)
 */
router.get('/:profileId/about', authenticateToken, (req, res) => {
  businessProfileController.getAbout(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/about
 * @desc    Update about section for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with company_introduction_video file) and JSON
 */
router.put('/:profileId/about', authenticateToken, checkOwnership, optionalFileUpload, (req, res) => {
  businessProfileController.updateAbout(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/about
 * @desc    Delete about section for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/about', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteAbout(req, res);
});

/**
 * @route   POST /business-profile/:profileId/projects
 * @desc    Create a new project for business profile
 * @access  Private (owner only)
 */
router.post('/:profileId/projects', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.createProject(req, res);
});

/**
 * @route   GET /business-profile/:profileId/projects
 * @desc    Get all projects for business profile (with pagination)
 * @access  Private
 * @query   page (optional, default: 1), limit (optional, default: 20)
 */
router.get('/:profileId/projects', authenticateToken, (req, res) => {
  businessProfileController.getProjects(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/projects/:projectId
 * @desc    Update a project for business profile
 * @access  Private (owner only)
 */
router.put('/:profileId/projects/:projectId', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.updateProject(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/projects/:projectId
 * @desc    Delete a project for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/projects/:projectId', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteProject(req, res);
});

/**
 * @route   POST /business-profile/:profileId/private-info
 * @desc    Create private info for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with registration_certificate and business_license files) and JSON
 */
router.post('/:profileId/private-info', authenticateToken, checkOwnership, optionalPrivateInfoFileUpload, (req, res) => {
  businessProfileController.createPrivateInfo(req, res);
});

/**
 * @route   GET /business-profile/:profileId/private-info
 * @desc    Retrieve private info for business profile
 * @access  Private (owner only)
 */
router.get('/:profileId/private-info', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.getPrivateInfo(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/private-info
 * @desc    Update private info for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with registration_certificate and business_license files) and JSON
 */
router.put('/:profileId/private-info', authenticateToken, checkOwnership, optionalPrivateInfoFileUpload, (req, res) => {
  businessProfileController.updatePrivateInfo(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/private-info
 * @desc    Delete private info for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/private-info', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deletePrivateInfo(req, res);
});

/**
 * @route   POST /business-profile/:profileId/banner
 * @desc    Upload banner for business profile
 * @access  Private (owner only)
 * @body    multipart/form-data with field 'banner' (jpg/jpeg/png, max 10MB)
 */
router.post('/:profileId/banner', authenticateToken, checkOwnership, bannerUploadMiddleware, (req, res) => {
  businessProfileController.uploadBanner(req, res);
});

/**
 * @route   GET /business-profile/:profileId/banner
 * @desc    Get banner for business profile
 * @access  Private
 */
router.get('/:profileId/banner', authenticateToken, (req, res) => {
  businessProfileController.getBanner(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/banner
 * @desc    Update banner for business profile
 * @access  Private (owner only)
 * @body    multipart/form-data with field 'banner' (jpg/jpeg/png, max 10MB)
 */
router.put('/:profileId/banner', authenticateToken, checkOwnership, bannerUploadMiddleware, (req, res) => {
  businessProfileController.updateBanner(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/banner
 * @desc    Delete banner for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/banner', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteBanner(req, res);
});

const achievementCertificatesUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const upload = configureMulter('certificate').array('certificates', 10);
  upload(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 413,
          message: `File size exceeds maximum limit of ${process.env.MAX_FILE_SIZE_MB || 5}MB`,
          success: false,
        });
      }
      if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
        return next();
      }
      return res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
    }
    next();
  });
};

/**
 * Business post media upload middleware with error handling
 * Accepts a single 'media' file (image/video)
 */
const businessPostMediaUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  uploadSinglePostMedia(req, res, (err) => {
    if (err) {
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          status: 413,
          message: 'File size exceeds maximum limit',
          success: false,
        });
        return;
      }
      res.status(400).json({
        status: 400,
        message: err.message || 'File upload error',
        success: false,
      });
      return;
    }
    next();
  });
};

/**
 * @route   POST /business-profile/:profileId/achievements
 * @desc    Create achievement for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with certificate files) and JSON
 */
router.post('/:profileId/achievements', authenticateToken, checkOwnership, achievementCertificatesUploadMiddleware, (req, res) => {
  businessProfileController.createAchievement(req, res);
});

/**
 * @route   GET /business-profile/:profileId/achievements
 * @desc    Get all achievements for business profile (with pagination)
 * @access  Private
 * @query   page (optional, default: 1), limit (optional, default: 20)
 */
router.get('/:profileId/achievements', authenticateToken, (req, res) => {
  businessProfileController.getAchievements(req, res);
});

/**
 * @route   GET /business-profile/:profileId/achievements/:achievementId
 * @desc    Get single achievement for business profile
 * @access  Private
 */
router.get('/:profileId/achievements/:achievementId', authenticateToken, (req, res) => {
  businessProfileController.getAchievement(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/achievements/:achievementId
 * @desc    Update achievement for business profile
 * @access  Private (owner only)
 * @body    Supports both form-data (with certificate files) and JSON
 */
router.put('/:profileId/achievements/:achievementId', authenticateToken, checkOwnership, achievementCertificatesUploadMiddleware, (req, res) => {
  businessProfileController.updateAchievement(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/achievements/:achievementId
 * @desc    Delete achievement for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/achievements/:achievementId', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteAchievement(req, res);
});

/**
 * @route   POST /business-profile/:profileId/avatar
 * @desc    Upload avatar for business profile
 * @access  Private (owner only)
 * @body    multipart/form-data with field 'avatar' (jpg/jpeg/png, max 5MB)
 */
router.post('/:profileId/avatar', authenticateToken, checkOwnership, avatarUploadMiddleware, (req, res) => {
  businessProfileController.uploadAvatar(req, res);
});

/**
 * @route   GET /business-profile/:profileId/avatar
 * @desc    Get avatar for business profile
 * @access  Private
 */
router.get('/:profileId/avatar', authenticateToken, (req, res) => {
  businessProfileController.getAvatar(req, res);
});

/**
 * @route   PUT /business-profile/:profileId/avatar
 * @desc    Update avatar for business profile
 * @access  Private (owner only)
 * @body    multipart/form-data with field 'avatar' (jpg/jpeg/png, max 5MB)
 */
router.put('/:profileId/avatar', authenticateToken, checkOwnership, avatarUploadMiddleware, (req, res) => {
  businessProfileController.updateAvatar(req, res);
});

/**
 * @route   DELETE /business-profile/:profileId/avatar
 * @desc    Delete avatar for business profile
 * @access  Private (owner only)
 */
router.delete('/:profileId/avatar', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteAvatar(req, res);
});

/**
 * Business Posts - CRUD
 */
router.post(
  '/:profileId/posts',
  authenticateToken,
  checkOwnership,
  postRateLimit,
  businessPostMediaUploadMiddleware,
  (req, res) => {
    businessProfileController.createBusinessPost(req as any, res);
  }
);

router.get('/:profileId/posts', authenticateToken, (req, res) => {
  businessProfileController.getBusinessPosts(req as any, res);
});

router.get('/:profileId/posts/:postId', authenticateToken, (req, res) => {
  businessProfileController.getBusinessPost(req as any, res);
});

router.put(
  '/:profileId/posts/:postId',
  authenticateToken,
  checkOwnership,
  businessPostMediaUploadMiddleware,
  (req, res) => {
    businessProfileController.updateBusinessPost(req as any, res);
  }
);

router.delete('/:profileId/posts/:postId', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deleteBusinessPost(req as any, res);
});

router.get('/:profileId/privacy-settings', authenticateToken, (req, res) => {
  businessProfileController.getPrivacySettings(req as any, res);
});

router.put('/:profileId/privacy-settings', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.updatePrivacySettings(req as any, res);
});

router.delete('/:profileId/privacy-settings', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.deletePrivacySettings(req as any, res);
});

router.post('/:profileId/invitations', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.sendInvitation(req as any, res);
});

router.delete('/:profileId/invitations/:invitationId', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.cancelInvitation(req as any, res);
});

router.get('/:profileId/invitations', authenticateToken, checkOwnership, (req, res) => {
  businessProfileController.getProfileInvitations(req as any, res);
});

router.use('/:profileId/job', jobsRoutes);

export default router;