/**
 * Interaction Routes - API endpoints for post interactions
 * Implements like, dislike, comment, reply, share, save, unsave, and report functionality
 */

import { Router } from 'express';
import { interactionController } from '../controllers/interactionController';
import { auth } from '../middleware/auth';
import { 
  validateLikeInteraction,
  validateDislikeInteraction,
  validateCommentInteraction,
  validateReplyInteraction,
  validateShareInteraction,
  validateSaveInteraction,
  validateUnsaveInteraction,
  validateReportInteraction
} from '../utils/validators';
import ResponseUtil from '../utils/response';

const router = Router();

/**
 * Validation middleware factory
 */
const createValidationMiddleware = (validator: any) => {
  return (req: any, res: any, next: any) => {
    const { error } = validator(req.body);
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      ResponseUtil.validationError(res, 'Validation failed', errors);
      return;
    }
    
    next();
  };
};

/**
 * @route   POST /api/interactions/like
 * @desc    Like a post
 * @access  Private
 * @body    { "post_id": "uuid-of-post" }
 */
router.post('/like',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateLikeInteraction),
  (req, res, next) => interactionController.handleLikeInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/dislike
 * @desc    Unlike a post (remove like interaction)
 * @access  Private
 * @body    { "post_id": "uuid-of-post" }
 */
router.post('/dislike',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateDislikeInteraction),
  (req, res, next) => interactionController.handleDislikeInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/comment
 * @desc    Comment on a post
 * @access  Private
 * @body    { "post_id": "uuid-of-post", "comment_text": "comment content" }
 */
router.post('/comment',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateCommentInteraction),
  (req, res, next) => interactionController.handleCommentInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/reply
 * @desc    Reply to a comment
 * @access  Private
 * @body    { "post_id": "uuid-of-post", "comment_id": "uuid-of-comment", "reply_text": "reply content" }
 */
router.post('/reply',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateReplyInteraction),
  (req, res, next) => interactionController.handleReplyInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/share
 * @desc    Share a post with another user
 * @access  Private
 * @body    { "post_id": "uuid-of-post", "share_userid": "uuid-of-user-to-share-with" }
 */
router.post('/share',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateShareInteraction),
  (req, res, next) => interactionController.handleShareInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/report
 * @desc    Report a post
 * @access  Private
 * @body    { "post_id": "uuid-of-post", "reason": "report reason" }
 */
router.post('/report',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateReportInteraction),
  (req, res, next) => interactionController.handleReportInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/save
 * @desc    Save a post to user's collection
 * @access  Private
 * @body    { "post_id": "uuid-of-post" }
 */
router.post('/save',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateSaveInteraction),
  (req, res, next) => interactionController.handleSaveInteraction(req, res, next)
);

/**
 * @route   POST /api/interactions/unsave
 * @desc    Remove a post from user's collection
 * @access  Private
 * @body    { "post_id": "uuid-of-post" }
 */
router.post('/unsave',
  (req, res, next) => auth.authenticateToken(req, res, next),
  createValidationMiddleware(validateUnsaveInteraction),
  (req, res, next) => interactionController.handleUnsaveInteraction(req, res, next)
);

/**
 * @route   GET /api/interactions/comments/:post_id
 * @desc    Get all comments for a post
 * @access  Private
 * @params  post_id (url param)
 */
router.get('/comments/:post_id',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => interactionController.getCommentsForPost(req, res, next)
);
export default router;
