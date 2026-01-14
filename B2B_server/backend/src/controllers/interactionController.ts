import { Request, Response, NextFunction } from 'express';
import { interactionService } from '../services/interactionService';
import { postService } from '../services/postService';
import { socketService } from '../services/SocketService';
import ResponseUtil from '../utils/response';
import { auditLogger } from '../utils/auditLogger';
import type { 
  LikeInteractionRequest,
  DislikeInteractionRequest,
  CommentInteractionRequest,
  ReplyInteractionRequest,
  ShareInteractionRequest,
  SaveInteractionRequest,
  UnsaveInteractionRequest,
  ReportInteractionRequest,
  InteractionResponse
} from '../models/Interaction';

class InteractionController {
  /**
   * Send socket notification for interaction
   */
  private async sendInteractionNotification(
    postId: string,
    interactorId: string,
    type: 'like' | 'comment' | 'reply' | 'share' | 'save' | 'report',
    metadata?: any
  ): Promise<void> {
    try {
      // Get post to find owner
      const post = await postService.getPostById(postId);
      if (!post) {
        console.warn(`Post ${postId} not found, skipping notification`);
        return;
      }

      const postOwnerId = post.user_id;

      // Don't notify if user is interacting with their own post
      if (postOwnerId === interactorId) {
        return;
      }

      // Fetch interactor's profile information
      const { userService } = await import('../services/userService');
      const interactorProfile = await userService.getUserProfileInfo(interactorId);

      // Create notification message
      const messages = {
        like: 'liked your post',
        comment: 'commented on your post',
        reply: 'replied to a comment on your post',
        share: 'shared your post',
        save: 'saved your post',
        report: 'reported your post'
      };

      socketService.sendInteractionNotification({
        type,
        postId,
        postOwnerId,
        interactorId,
        message: messages[type],
        timestamp: new Date(),
        metadata,
        interactorProfile
      });
    } catch (error) {
      console.error('Error sending socket notification:', error);
      // Don't throw error, just log it - notification failure shouldn't break the interaction
    }
  }

  /**
   * Handle like interaction
   */
  async handleLikeInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id } = req.body as LikeInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('like');
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log post like interaction
        await auditLogger.logPostInteraction('POST_LIKED', user_id, post_id, undefined, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'like');

        ResponseUtil.success(res, 'Post liked successfully', response);
      } else {
        // Log post like interaction even if no interaction object returned
        await auditLogger.logPostInteraction('POST_LIKED', user_id, post_id, undefined, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'like');

        ResponseUtil.success(res, 'Post liked successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle dislike interaction
   */
  async handleDislikeInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id } = req.body as DislikeInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('dislike');
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      // Log post dislike interaction
      await auditLogger.logPostInteraction('POST_DISLIKED', user_id, post_id, undefined, req);

      ResponseUtil.success(res, 'Post disliked successfully', null);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle comment interaction
   */
  async handleCommentInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id, comment_text } = req.body as CommentInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('comment', { content: comment_text });
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log comment interaction
        await auditLogger.logPostInteraction('COMMENT_POST', user_id, post_id, `Comment: ${comment_text.substring(0, 50)}...`, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'comment', comment_text.substring(0, 100));

        ResponseUtil.success(res, 'Comment added successfully', response);
      } else {
        // Log comment interaction even if no interaction object returned
        await auditLogger.logPostInteraction('COMMENT_POST', user_id, post_id, `Comment: ${comment_text.substring(0, 50)}...`, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'comment',comment_text.substring(0, 100));

        ResponseUtil.success(res, 'Comment added successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle reply interaction
   */
  async handleReplyInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id, comment_id, reply_text } = req.body as ReplyInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('reply', { 
        content: reply_text,
        parent_comment_id: comment_id
      });
      
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log reply interaction
        await auditLogger.logPostInteraction('REPLY_COMMENT', user_id, post_id, `Reply to comment ${comment_id}: ${reply_text.substring(0, 50)}...`, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'reply', {
          commentId: comment_id,
          replyText: reply_text.substring(0, 100)
        });

        ResponseUtil.success(res, 'Reply added successfully', response);
      } else {
        // Log reply interaction even if no interaction object returned
        await auditLogger.logPostInteraction('REPLY_COMMENT', user_id, post_id, `Reply to comment ${comment_id}: ${reply_text.substring(0, 50)}...`, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'reply', {
          commentId: comment_id,
          replyText: reply_text.substring(0, 100)
        });

        ResponseUtil.success(res, 'Reply added successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle share interaction
   */
  async handleShareInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id, share_userid } = req.body as ShareInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('share', { share_userid });
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log post share interaction
        await auditLogger.logPostInteraction('POST_SHARE', user_id, post_id, `Shared with user: ${share_userid}`, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'share', {
          sharedWithUserId: share_userid
        });

        ResponseUtil.success(res, 'Post shared successfully', response);
      } else {
        // Log post share interaction even if no interaction object returned
        await auditLogger.logPostInteraction('POST_SHARE', user_id, post_id, `Shared with user: ${share_userid}`, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'share', {
          sharedWithUserId: share_userid
        });

        ResponseUtil.success(res, 'Post shared successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle report interaction
   */
  async handleReportInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id, reason } = req.body as ReportInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('report', { reason });
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log post report interaction
        await auditLogger.logPostInteraction('POST_REPORTED', user_id, post_id, `Reason: ${reason}`, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'report', reason);

        ResponseUtil.success(res, 'Report submitted successfully', response);
      } else {
        // Log post report interaction even if no interaction object returned
        await auditLogger.logPostInteraction('POST_REPORTED', user_id, post_id, `Reason: ${reason}`, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'report', reason);

        ResponseUtil.success(res, 'Report submitted successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle save interaction
   */
  async handleSaveInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id } = req.body as SaveInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('save');
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      if (interaction) {
        const response: InteractionResponse = {
          interaction_id: interaction.id!,
          user_id: interaction.user_id,
          post_id: interaction.post_id,
          interaction_type: interaction.interaction_type
        };

        // Log post save interaction
        await auditLogger.logPostInteraction('POST_SAVED', user_id, post_id, undefined, req);

        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'save');

        ResponseUtil.success(res, 'Post saved successfully', response);
      } else {
        // Log post save interaction even if no interaction object returned
        await auditLogger.logPostInteraction('POST_SAVED', user_id, post_id, undefined, req);
        
        // Send socket notification
        await this.sendInteractionNotification(post_id, user_id, 'save');

        ResponseUtil.success(res, 'Post saved successfully', null);
      }
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Handle unsave interaction
   */
  async handleUnsaveInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId;
      const { post_id } = req.body as UnsaveInteractionRequest;

      if (!user_id) {
        ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token');
        return;
      }

      const interaction_type = interactionService.formatInteractionData('unsave');
      const interaction = await interactionService.createInteraction({
        user_id,
        post_id,
        interaction_type
      });

      // Log post unsave interaction
      await auditLogger.logPostInteraction('POST_UNSAVED', user_id, post_id, undefined, req);

      ResponseUtil.success(res, 'Post unsaved successfully', null);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /**
   * Get all comments for a post
   */
  async getCommentsForPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user_id = req.user?.userId; // require auth but not strictly used
      const post_id = req.params.post_id as string;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!post_id || !uuidRegex.test(post_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'post_id', message: 'Post ID must be a valid UUID' }]);
        return;
      }

      const comments = await interactionService.getCommentsForPost(post_id);

      ResponseUtil.success(res, 'Comments fetched successfully', { post_id, comments });
    } catch (error) {
      console.error('Get comments error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch comments');
    }
  }

  /**
   * Centralized error handling
   */
  private handleError(error: any, res: Response, next: NextFunction): void {
    console.error('Interaction controller error:', error);

    // Handle specific error types
    const errorHandlers = {
      'Post not found': () => ResponseUtil.notFound(res, 'Post not found'),
      'User has already': () => ResponseUtil.conflict(res, error.message),
      'No existing': () => ResponseUtil.notFound(res, error.message),
      'Authentication required': () => ResponseUtil.unauthorized(res, error.message),
      'Invalid interaction type': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'interaction_type', message: error.message }]),
      'User ID must be a valid UUID': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'user_id', message: 'User ID must be a valid UUID' }]),
      'Post ID must be a valid UUID': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'post_id', message: 'Post ID must be a valid UUID' }]),
      'Content is required': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'content', message: 'Content is required for comments and replies' }]),
      'Reason is required': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'reason', message: 'Reason is required for reports' }]),
      'Valid share user ID': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'share_userid', message: 'Valid share user ID is required for shares' }]),
      'Valid parent comment ID': () => ResponseUtil.validationError(res, 'Validation failed', [{ field: 'parent_comment_id', message: 'Valid parent comment ID is required for replies' }])
    };

    // Find matching error handler
    const matchedHandler = Object.keys(errorHandlers).find(key => error.message.includes(key));
    
    if (matchedHandler) {
      (errorHandlers as any)[matchedHandler]();
    } else {
      // Generic server error for unexpected errors
      ResponseUtil.serverError(res, 'An unexpected error occurred while processing the interaction');
    }
  }
}

export const interactionController = new InteractionController();
