/**
 * Post Controller - Handle post-related HTTP requests
 * Implements post creation with content moderation, hashtag/mention extraction, and media upload
 */

import { Request, Response, NextFunction } from 'express';
import { postService } from '../services/postService';
import { uploadMediaToS3 } from '../services/s3Service';
import { contentService } from '../services/contentService';
import { generateUniqueFileName, cleanupTempFile } from '../utils/fileUtils';
import ResponseUtil, { ErrorMessages } from '../utils/response';
import { CreatePostData, MediaItem } from '../models/Post';
import { auditLogger } from '../utils/auditLogger';

// Validation configuration
const VALIDATION_CONFIG = {
  content: {
    maxLength: 5000,
    minLength: 1,
    required: true
  },
  type: {
    allowed: ['text', 'image', 'video'],
    required: true
  },
  audience: {
    allowed: ['public', 'private', 'connections'],
    required: true
  }
};

// Error handling configuration
const ERROR_HANDLERS = [
  {
    condition: (error: Error) => error.message.includes('Content cannot be empty'),
    response: (res: Response) => ResponseUtil.validationError(res, 'Content cannot be empty', [
      { field: 'content', message: 'Content cannot be empty' }
    ])
  },
  {
    condition: (error: Error) => error.message.includes('Content exceeds maximum length'),
    response: (res: Response) => ResponseUtil.validationError(res, 'Content exceeds maximum length of 5000 characters', [
      { field: 'content', message: 'Content exceeds maximum length of 5000 characters' }
    ])
  },
  {
    condition: (error: Error) => error.message.includes('Invalid post type'),
    response: (res: Response) => ResponseUtil.validationError(res, 'Invalid post type', [
      { field: 'type', message: 'Invalid post type. Allowed: text, image, video' }
    ])
  },
  {
    condition: (error: Error) => error.message.includes('Invalid audience type'),
    response: (res: Response) => ResponseUtil.validationError(res, 'Invalid audience type', [
      { field: 'audience', message: 'Invalid audience type. Allowed: public, private, connections' }
    ])
  },
  {
    condition: (error: Error) => error.message.includes('S3 upload failed'),
    response: (res: Response) => ResponseUtil.serverError(res, 'Failed to upload media to storage')
  },
  {
    condition: (error: Error) => error.message.includes('AWS'),
    response: (res: Response) => ResponseUtil.serverError(res, 'Storage service configuration error')
  },
  {
    condition: (error: Error) => error.message.includes('inappropriate'),
    response: (res: Response) => ResponseUtil.validationError(res, 'Content contains inappropriate language', [
      { field: 'content', message: 'Content contains inappropriate language' }
    ])
  }
];

export class PostController {
  /**
   * Validate request data using configuration
   * @param data - Request data to validate
   * @returns Validation result with errors
   */
  private validateRequestData(data: any): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate content
    if (VALIDATION_CONFIG.content.required && (!data.content || data.content.trim().length === 0)) {
      errors.push({ field: 'content', message: 'Content cannot be empty' });
    } else if (data.content && data.content.length > VALIDATION_CONFIG.content.maxLength) {
      errors.push({ field: 'content', message: `Content exceeds maximum length of ${VALIDATION_CONFIG.content.maxLength} characters` });
    }

    // Validate type
    if (VALIDATION_CONFIG.type.required && (!data.type || !VALIDATION_CONFIG.type.allowed.includes(data.type))) {
      errors.push({ field: 'type', message: `Invalid post type. Allowed: ${VALIDATION_CONFIG.type.allowed.join(', ')}` });
    }

    // Validate audience
    if (VALIDATION_CONFIG.audience.required && (!data.audience || !VALIDATION_CONFIG.audience.allowed.includes(data.audience))) {
      errors.push({ field: 'audience', message: `Invalid audience type. Allowed: ${VALIDATION_CONFIG.audience.allowed.join(', ')}` });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Handle errors using configuration-driven approach
   * @param error - Error to handle
   * @param res - Express response object
   */
  private handleError(error: any, res: Response): void {
    if (error instanceof Error) {
      const handler = ERROR_HANDLERS.find(h => h.condition(error));
      if (handler) {
        handler.response(res);
        return;
      }
    }
    ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
  }

  /**
   * Process media files and upload to S3
   * @param mediaFiles - Array of uploaded media files
   * @param userId - User ID for file naming
   * @returns Array of processed media items
   */
  private async processMediaFiles(mediaFiles: Express.Multer.File[], userId: string): Promise<MediaItem[]> {
    const mediaItems: MediaItem[] = [];

    for (const file of mediaFiles) {
      try {
        const uniqueFileName = generateUniqueFileName(userId, file.originalname);
        const s3Result = await uploadMediaToS3(file.path, uniqueFileName);

        const mediaItem: MediaItem = {
          url: s3Result.fileUrl,
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          filename: s3Result.fileName,
          size: file.size,
          uploadedAt: s3Result.uploadedAt
        };

        mediaItems.push(mediaItem);
        await cleanupTempFile(file.path);
      } catch (error) {
        console.error('Error processing media file:', error);
        // Continue with other files
      }
    }

    return mediaItems;
  }

  /**
   * Create a new post
   * @route POST /api/posts/create-post
   * @access Private
   */
  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePaths: string[] = [];

    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized access');
        return;
      }

      // Extract and validate request data
      const { content, type, audience } = req.body;
      const validation = this.validateRequestData({ content, type, audience });
      
      if (!validation.isValid) {
        ResponseUtil.validationError(res, 'Validation failed', validation.errors);
        return;
      }

      // Content moderation
      const moderationResult = contentService.moderateContent(content);
      if (!moderationResult.isAppropriate) {
        ResponseUtil.validationError(res, 'Content contains inappropriate language', [
          { field: 'content', message: 'Content contains inappropriate language' }
        ]);
        return;
      }

      // Extract hashtags and mentions
      const { hashtags, mentions } = contentService.processContent(content);

      // Process media files if present
      const mediaFiles = req.files as Express.Multer.File[];
      let mediaItems: MediaItem[] = [];

      if (mediaFiles && mediaFiles.length > 0) {
        tempFilePaths = mediaFiles.map(file => file.path);
        mediaItems = await this.processMediaFiles(mediaFiles, userId);
        tempFilePaths = []; // Clear after processing
      }

      // Prepare and create post
      const postData: CreatePostData = {
        content: content.trim(),
        type: type as 'text' | 'image' | 'video',
        audience: audience as 'public' | 'private' | 'connections',
        media: mediaItems.length > 0 ? mediaItems : undefined,
        tags: hashtags,
        mentions: mentions
      };

      const result = await postService.createPost(userId, postData, mediaFiles);
      
      // Log post creation
      await auditLogger.logPostCreation(userId, result.post.id || 'unknown', type, req);
      
      ResponseUtil.success(res, 'Post created successfully', result);

    } catch (error) {
      console.error('Post creation controller error:', error);

      // Clean up temp files
      for (const filePath of tempFilePaths) {
        await cleanupTempFile(filePath);
      }

      // Handle error using configuration
      this.handleError(error, res);
    }
  }

  /**
   * Get post by ID with author information
   * @route GET /api/posts/:id
   * @access Private
   */
  async getPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      // Validate post ID format (UUID)
      if (!id) {
        ResponseUtil.validationError(res, 'Post ID is required', [
          { field: 'postId', message: 'Post ID is required' }
        ]);
        return;
      }

      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        ResponseUtil.validationError(res, 'Invalid post ID format', [
          { field: 'postId', message: 'Post ID must be a valid UUID' }
        ]);
        return;
      }

      const post = await postService.getPostById(id);
      if (!post) {
        ResponseUtil.notFound(res, 'Post not found');
        return;
      }

      // Enhance post with author information from JWT token
      const enhancedPost = {
        ...post,
        author: {
          id: currentUser.id,
          name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
          email: currentUser.email,
          avatar: currentUser.avatar || null
        }
      };

      ResponseUtil.success(res, 'Post retrieved successfully', { post: enhancedPost });

    } catch (error) {
      console.error('Error getting post by ID:', error);
      this.handleError(error, res);
    }
  }

  /**
   * Get posts by user ID
   * @route GET /api/posts/user/:userId
   * @access Private
   */
  async getPostsByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!userId) {
        ResponseUtil.validationError(res, 'User ID is required', [
          { field: 'userId', message: 'User ID is required' }
        ]);
        return;
      }

      const posts = await postService.getPostsByUserId(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      ResponseUtil.success(res, 'Posts retrieved successfully', { posts });

    } catch (error) {
      console.error('Error getting posts by user ID:', error);
      this.handleError(error, res);
    }
  }

  /**
   * Update post by ID
   * @route PUT /api/posts/:id
   * @access Private
   */
  async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePaths: string[] = [];

    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const { content, media } = req.body;

      // Validate post ID format (UUID)
      if (!id) {
        ResponseUtil.validationError(res, 'Post ID is required', [
          { field: 'postId', message: 'Post ID is required' }
        ]);
        return;
      }

      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        ResponseUtil.validationError(res, 'Invalid post ID format', [
          { field: 'postId', message: 'Post ID must be a valid UUID' }
        ]);
        return;
      }

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized access');
        return;
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        ResponseUtil.validationError(res, 'Content cannot be empty', [
          { field: 'content', message: 'Post content cannot be empty' }
        ]);
        return;
      }

      if (content.length > 5000) {
        ResponseUtil.validationError(res, 'Content exceeds maximum length of 5000 characters', [
          { field: 'content', message: 'Content exceeds maximum length of 5000 characters' }
        ]);
        return;
      }

      // Content moderation
      const moderationResult = contentService.moderateContent(content);
      if (!moderationResult.isAppropriate) {
        ResponseUtil.validationError(res, 'Content contains inappropriate language', [
          { field: 'content', message: 'Content contains inappropriate language' }
        ]);
        return;
      }

      // Extract hashtags and mentions from updated content
      const { hashtags, mentions } = contentService.processContent(content);

      // Process media files if present
      const mediaFiles = req.files as Express.Multer.File[];
      let mediaItems: MediaItem[] = [];

      if (mediaFiles && mediaFiles.length > 0) {
        tempFilePaths = mediaFiles.map(file => file.path);
        mediaItems = await this.processMediaFiles(mediaFiles, userId);
        tempFilePaths = []; // Clear after processing
      }

      // Parse existing media from request body
      let existingMedia: MediaItem[] = [];
      if (media && Array.isArray(media)) {
        existingMedia = media;
      }

      // Combine existing and new media
      const allMedia = [...existingMedia, ...mediaItems];

      // Update post
      const updatedPost = await postService.updatePost(id, userId, {
        content: content.trim(),
        hashtags,
        mentions,
        media: allMedia
      });

      if (!updatedPost) {
        ResponseUtil.notFound(res, 'Post not found or you do not have permission to edit it');
        return;
      }

      // Log post update with changes
      const changes = ['content', 'hashtags', 'mentions'];
      if (mediaItems.length > 0) changes.push('media');
      await auditLogger.logPostUpdate(userId, id, changes, req);

      ResponseUtil.success(res, 'Post updated successfully', { post: updatedPost });

    } catch (error) {
      console.error('Post update controller error:', error);

      // Clean up temp files
      for (const filePath of tempFilePaths) {
        await cleanupTempFile(filePath);
      }

      // Handle error using configuration
      this.handleError(error, res);
    }
  }

  /**
   * Delete post by ID
   * @route DELETE /api/posts/:id
   * @access Private
   */
  async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!id) {
        ResponseUtil.validationError(res, 'Post ID is required', [
          { field: 'id', message: 'Post ID is required' }
        ]);
        return;
      }

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized access');
        return;
      }

      const success = await postService.deletePost(id, userId);
      if (!success) {
        ResponseUtil.notFound(res, 'Post not found or you do not have permission to delete it');
        return;
      }

      ResponseUtil.success(res, 'Post deleted successfully');

    } catch (error) {
      console.error('Error deleting post:', error);
      this.handleError(error, res);
    }
  }

  /**
   * Get posts feed with filtering and pagination
   * @route GET /api/posts/feed
   * @access Private
   */
  async getBrowseFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized access');
        return;
      }

      // Extract and validate query parameters
      const { tags, startDate, endDate, limit, offset } = req.query;

      // Validate limit (max 100, default 20)
      const parsedLimit = limit ? Math.min(parseInt(limit as string), 100) : 20;
      const parsedOffset = offset ? parseInt(offset as string) : 0;

      // Validate date format if provided
      if (startDate && !this.isValidDate(startDate as string)) {
        ResponseUtil.validationError(res, 'Invalid date format', [
          { field: 'startDate', message: 'Invalid date format. Use ISO 8601 format.' }
        ]);
        return;
      }

      if (endDate && !this.isValidDate(endDate as string)) {
        ResponseUtil.validationError(res, 'Invalid date format', [
          { field: 'endDate', message: 'Invalid date format. Use ISO 8601 format.' }
        ]);
        return;
      }

      // Validate date range
      if (startDate && endDate && new Date(startDate as string) > new Date(endDate as string)) {
        ResponseUtil.validationError(res, 'Invalid date range', [
          { field: 'startDate', message: 'Start date must be before end date.' }
        ]);
        return;
      }

      // Parse tags if provided
      let tagArray: string[] = [];
      if (tags) {
        tagArray = (tags as string).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }

      let posts: any[] = [];
      let totalCount = 0;

      // Determine which service method to call based on parameters
      if (tagArray.length > 0 && (startDate || endDate)) {
        // Combined filters
        const filterObj = {
          tags: tagArray,
          startDate: startDate as string,
          endDate: endDate as string,
          limit: parsedLimit,
          offset: parsedOffset
        };
        const result = await postService.fetchPostsByFilters(filterObj);
        posts = result.posts;
        totalCount = result.totalCount;
      } else if (tagArray.length > 0) {
        // Tag-based search
        const result = await postService.fetchPostsByTags(tagArray, parsedLimit, parsedOffset);
        posts = result.posts;
        totalCount = result.totalCount;
      } else if (startDate || endDate) {
        // Date-based filtering
        const result = await postService.fetchPostsByDate(
          startDate as string,
          endDate as string,
          parsedLimit,
          parsedOffset
        );
        posts = result.posts;
        totalCount = result.totalCount;
      } else {
        // Random posts
        const result = await postService.fetchPosts(parsedLimit, parsedOffset);
        posts = result.posts;
        totalCount = result.totalCount;
      }

      // Format response
      const responseData = {
        posts,
        pagination: {
          total: totalCount,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + parsedLimit < totalCount
        }
      };

      ResponseUtil.success(res, 'Posts fetched successfully', responseData);

    } catch (error) {
      console.error('Error getting posts feed:', error);
      this.handleError(error, res);
    }
  }

  /**
   * Validate date format (ISO 8601)
   * @param dateString - Date string to validate
   * @returns Boolean indicating if date is valid
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }
}

export const postController = new PostController();
export default postController;
