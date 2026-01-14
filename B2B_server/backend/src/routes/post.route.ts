/**
 * Post Routes - API endpoints for post operations
 * Implements post creation, retrieval, and deletion
 */

import { Router } from 'express';
import { postController } from '../controllers/postController';
import { auth } from '../middleware/auth';
import { uploadMedia } from '../middleware/multerConfig';
import { postRateLimit } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/posts/create-post
 * @desc    Create a new post with text and media content
 * @access  Private
 * @body    {
 *   content: string,
 *   type: 'text' | 'image' | 'video',
 *   audience: 'public' | 'private' | 'connections',
 *   media: File[] (optional)
 * }
 */
router.post('/create-post',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postRateLimit(req, res, next),
  uploadMedia,
  (req, res, next) => postController.createPost(req, res, next)
);

/**
 * @route   GET /api/posts/feed
 * @desc    Get posts feed with filtering and pagination
 * @access  Private
 * @query   tags: string (comma-separated hashtags)
 * @query   startDate: string (ISO date format)
 * @query   endDate: string (ISO date format)
 * @query   limit: number (default: 20, max: 100)
 * @query   offset: number (default: 0)
 */
router.get('/feed',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postController.getBrowseFeed(req, res, next)
);

/**
 * @route   GET /api/posts/:id
 * @desc    Get post by ID
 * @access  Private
 */
router.get('/:id',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postController.getPostById(req, res, next)
);

/**
 * @route   PUT /api/posts/:id
 * @desc    Update post by ID
 * @access  Private
 * @body    {
 *   content: string,
 *   media: MediaItem[] (optional - existing media to keep)
 * }
 */
router.put('/:id',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postRateLimit(req, res, next),
  uploadMedia,
  (req, res, next) => postController.updatePost(req, res, next)
);

/**
 * @route   GET /api/posts/user/:userId
 * @desc    Get posts by user ID
 * @access  Private
 * @query   limit: number (default: 20)
 * @query   offset: number (default: 0)
 */
router.get('/user/:userId',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postController.getPostsByUserId(req, res, next)
);

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete post by ID
 * @access  Private
 */
router.delete('/:id',
  (req, res, next) => auth.authenticateToken(req, res, next),
  (req, res, next) => postController.deletePost(req, res, next)
);

export default router;
