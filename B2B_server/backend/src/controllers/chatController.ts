/**
 * Chat Controller - Handles HTTP endpoints for chat functionality
 */

import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import ResponseUtil from '../utils/response';
import { socketService } from '../services/SocketService';
import { uploadBufferToS3 } from '../services/s3Service';
import fs from 'fs';
import path from 'path';

export class ChatController {
  /**
   * Get all conversations for the current user
   */
  static async getUserConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const conversations = await ChatService.getUserConversations(userId);

      ResponseUtil.success(res, 'Conversations retrieved successfully', { conversations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get details of a specific conversation
   */
  static async getConversationDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!conversationId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'conversationId', message: 'Conversation ID is required' }
        ]);
        return;
      }

      const conversation = await ChatService.getConversationDetails(
        conversationId,
        userId
      );

      if (!conversation) {
        ResponseUtil.notFound(res, 'Conversation not found');
        return;
      }

      ResponseUtil.success(res, 'Conversation details retrieved successfully', { conversation });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a participant')) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      next(error);
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!conversationId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'conversationId', message: 'Conversation ID is required' }
        ]);
        return;
      }

      const messages = await ChatService.getMessages(
        conversationId,
        userId,
        limit,
        offset
      );

      ResponseUtil.success(res, 'Messages retrieved successfully', {
        messages,
        pagination: {
          limit,
          offset,
          count: messages.length,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a participant')) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      next(error);
    }
  }

  /**
   * Start a new conversation (HTTP endpoint)
   */
  static async startConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { recipientId, initialMessage } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!recipientId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'recipientId', message: 'Recipient ID is required' }
        ]);
        return;
      }

      const result = await ChatService.startConversation(
        userId,
        recipientId,
        initialMessage
      );

      if (result.isNew) {
        ResponseUtil.created(res, 'Conversation created successfully', result);
      } else {
        ResponseUtil.success(res, 'Existing conversation retrieved successfully', result);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message (HTTP endpoint - can also be done via socket)
   */
  static async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;
      const { content, isForwarded } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!conversationId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'conversationId', message: 'Conversation ID is required' }
        ]);
        return;
      }

      if (!content) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'content', message: 'Message content is required' }
        ]);
        return;
      }

      const message = await ChatService.sendMessage(
        conversationId,
        userId,
        content,
        isForwarded || false
      );

      ResponseUtil.created(res, 'Message sent successfully', { message });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a participant')) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      next(error);
    }
  }

  /**
   * Update a message
   */
  static async updateMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { messageId } = req.params;
      const { content } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!messageId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'messageId', message: 'Message ID is required' }
        ]);
        return;
      }

      if (!content) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'content', message: 'Message content is required' }
        ]);
        return;
      }

      const message = await ChatService.updateMessage(messageId, userId, content);

      // Emit socket event to notify all participants in real-time
      try {
        const conversationDetails = await ChatService.getConversationDetails(
          message.conversation_id,
          userId
        );

        if (conversationDetails) {
          conversationDetails.participants.forEach((participant) => {
            if (socketService.isUserConnected(participant.user_id)) {
              socketService.sendToUser(participant.user_id, 'chat:message_updated', {
                conversationId: message.conversation_id,
                message,
                updatedBy: userId,
              });
            }
          });
        }
      } catch (socketError) {
        // Log socket error but don't fail the request
        console.error('Error emitting socket event for message update:', socketError);
      }

      ResponseUtil.success(res, 'Message updated successfully', { message });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ResponseUtil.notFound(res, error.message);
          return;
        }
        if (error.message.includes('only edit your own')) {
          ResponseUtil.forbidden(res, error.message);
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { messageId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!messageId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'messageId', message: 'Message ID is required' }
        ]);
        return;
      }

      const result = await ChatService.deleteMessage(messageId, userId);

      if (!result.deleted) {
        ResponseUtil.notFound(res, 'Message not found');
        return;
      }

      // Emit socket event to notify all participants in real-time
      try {
        if (result.conversationId) {
          const conversationDetails = await ChatService.getConversationDetails(
            result.conversationId,
            userId
          );

          if (conversationDetails) {
            conversationDetails.participants.forEach((participant) => {
              if (socketService.isUserConnected(participant.user_id)) {
                socketService.sendToUser(participant.user_id, 'chat:message_deleted', {
                  conversationId: result.conversationId,
                  messageId,
                  deletedBy: userId,
                });
              }
            });
          }
        }
      } catch (socketError) {
        // Log socket error but don't fail the request
        console.error('Error emitting socket event for message deletion:', socketError);
      }

      ResponseUtil.success(res, 'Message deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ResponseUtil.notFound(res, error.message);
          return;
        }
        if (error.message.includes('only delete your own')) {
          ResponseUtil.forbidden(res, error.message);
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!conversationId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'conversationId', message: 'Conversation ID is required' }
        ]);
        return;
      }

      const deleted = await ChatService.deleteConversation(conversationId, userId);

      if (!deleted) {
        ResponseUtil.notFound(res, 'Conversation not found');
        return;
      }

      ResponseUtil.success(res, 'Conversation deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          ResponseUtil.notFound(res, error.message);
          return;
        }
        if (error.message.includes('not a participant')) {
          ResponseUtil.forbidden(res, error.message);
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Upload media file for chat
   */
  static async uploadMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!conversationId) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'conversationId', message: 'Conversation ID is required' }
        ]);
        return;
      }

      // Verify user is a participant of the conversation
      const conversationDetails = await ChatService.getConversationDetails(
        conversationId,
        userId
      );

      if (!conversationDetails) {
        ResponseUtil.notFound(res, 'Conversation not found');
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'file', message: 'No file uploaded' }
        ]);
        return;
      }

      const file = req.file;
      
      // Read file buffer
      const fileBuffer = fs.readFileSync(file.path);
      
      // Generate S3 key: conversationId/userId_timestamp_originalFileName
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `${conversationId}/${userId}_${timestamp}_${sanitizedFileName}`;
      
      // Upload to S3
      const uploadResult = await uploadBufferToS3(
        fileBuffer,
        s3Key,
        'chatMedia',
        file.mimetype
      );

      // Clean up temp file
      fs.unlinkSync(file.path);

      // Prepare media metadata for message content JSONB
      const mediaData = {
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' : 
              file.mimetype.startsWith('audio/') ? 'audio' : 'document',
        fileUrl: uploadResult.fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      };

      ResponseUtil.success(res, 'Media uploaded successfully', mediaData);
    } catch (error) {
      // Clean up temp file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error instanceof Error && error.message.includes('not a participant')) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      next(error);
    }
  }
}
