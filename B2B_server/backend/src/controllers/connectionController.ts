import { Request, Response, NextFunction } from 'express';
import ResponseUtil from '../utils/response';
import { connectionService } from '../services/connectionService';
import { socketService } from '../services/SocketService';
import authenticateToken, { AuthenticatedRequest } from '../middleware/authMiddleware';

class ConnectionController {

  /**
   * Get all sent connection requests or a specific one by notification ID
   */
  async getSentConnectionRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const recipient = req.query.recipient as string | undefined;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }
      // Optionally validate recipient (email or UUID)
      if (recipient && recipient.length < 2) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'recipient', message: 'Recipient must be a valid email or UUID' }
        ]);
        return;
      }
      const result = await connectionService.getSentConnectionRequests(userId, recipient);
      if (recipient && (!result || result.length === 0)) {
        ResponseUtil.notFound(res, 'No sent connection requests found for this recipient');
        return;
      }
      ResponseUtil.success(res, 'Sent connection request(s) fetched successfully', result);
    } catch (error) {
      console.error('Get sent connection requests error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch sent connection requests');
    }
  }
  private isValidUUID(id?: string): boolean {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Send socket notification for connection events
   */
  private async sendConnectionNotification(
    recipientId: string,
    senderId: string,
    type: 'connection_request' | 'connection_accepted' | 'connection_rejected',
    metadata?: any
  ): Promise<void> {
    try {
      // Fetch sender's profile information
      const { userService } = await import('../services/userService');
      const senderProfile = await userService.getUserProfileInfo(senderId);

      const messages = {
        connection_request: 'sent you a connection request',
        connection_accepted: 'accepted your connection request',
        connection_rejected: 'rejected your connection request'
      };

      socketService.sendToUser(recipientId, 'connection:notification', {
        type,
        senderId,
        message: messages[type],
        timestamp: new Date(),
        metadata,
        senderProfile
      });

      console.log(`Connection notification sent to ${recipientId}: ${type}`);
    } catch (error) {
      console.error('Error sending connection socket notification:', error);
      // Don't throw - notification failure shouldn't break the connection flow
    }
  }

  async requestConnection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
  const { recipient_id } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      if (!recipient_id || !this.isValidUUID(recipient_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'recipient_id', message: 'recipient_id is required and must be a valid UUID' }
        ]);
        return;
      }

      // Prevent self connection requests
      if (userId === recipient_id) {
        ResponseUtil.validationError(res, 'Cannot send connection request to yourself', [
          { field: 'recipient_id', message: 'Cannot send connection request to yourself' }
        ]);
        return;
      }

      try {
        const notif = await connectionService.createConnectRequest(userId, recipient_id);

        // Map notification to reference response shape
        const data = {
          notification_id: notif.id,
          sender_id: userId,
          recipient_id: recipient_id,
          type: notif.type,
          connect_request: notif.payload?.connect_request ?? 'pending',
          created_at: notif.created_at
        };

        // Send socket notification to recipient
        await this.sendConnectionNotification(recipient_id, userId, 'connection_request', {
          notificationId: notif.id
        });

        // Return 200 per reference
        ResponseUtil.success(res, 'Connection request sent successfully', data);
      } catch (svcErr: any) {
        // Map known service errors to proper HTTP responses
        if (svcErr && svcErr.message === 'RECIPIENT_NOT_FOUND') {
          ResponseUtil.notFound(res, 'User not found');
          return;
        }
        if (svcErr && svcErr.message === 'DUPLICATE_REQUEST') {
          ResponseUtil.conflict(res, 'Connection request already exists');
          return;
        }
        // Unknown service error
        throw svcErr;
      }
    } catch (error) {
      console.error('Connection request error:', error);
      ResponseUtil.serverError(res, 'Failed to send connection request');
    }
  }

  async acceptConnectionRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { sender_id, connection_status } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      // Validate sender_id
      if (!sender_id || !this.isValidUUID(sender_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'sender_id', message: 'sender ID is required and must be a valid UUID' }
        ]);
        return;
      }

      // Validate connection_status
      if (!connection_status || connection_status !== 'accepted') {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'connection_status', message: 'connection_status must be "accepted"' }
        ]);
        return;
      }

      // Prevent self connection acceptance
      if (userId === sender_id) {
        ResponseUtil.validationError(res, 'Cannot accept connection request from yourself', [
          { field: 'sender_id', message: 'Cannot accept connection request from yourself' }
        ]);
        return;
      }

      try {
        const connection = await connectionService.acceptConnection(userId, sender_id);

        // Send socket notification to the original sender
        await this.sendConnectionNotification(sender_id, userId, 'connection_accepted', {
          connectionId: connection.connection_id
        });

        ResponseUtil.success(res, 'Connection request accepted successfully', connection);
      } catch (svcErr: any) {
        // Map known service errors to proper HTTP responses
        if (svcErr && svcErr.message === 'CONNECTION_REQUEST_NOT_FOUND') {
          ResponseUtil.notFound(res, 'Connection request not found');
          return;
        }
        if (svcErr && svcErr.message === 'CONNECTION_ALREADY_EXISTS') {
          ResponseUtil.conflict(res, 'Connection request already accepted');
          return;
        }
        // Unknown service error
        throw svcErr;
      }
    } catch (error) {
      console.error('Accept connection request error:', error);
      ResponseUtil.serverError(res, 'Failed to accept connection request');
    }
  }

  async rejectConnectionRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { sender_id } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      // Validate sender_id
      if (!sender_id || !this.isValidUUID(sender_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'sender_id', message: 'sender ID is required and must be a valid UUID' }
        ]);
        return;
      }

      // Prevent self rejection
      if (userId === sender_id) {
        ResponseUtil.validationError(res, 'Cannot reject connection request from yourself', [
          { field: 'sender_id', message: 'Cannot reject connection request from yourself' }
        ]);
        return;
      }

      try {
        const result = await connectionService.rejectConnection(userId, sender_id);

        // Send socket notification to the original sender
        await this.sendConnectionNotification(sender_id, userId, 'connection_rejected', {
          notificationId: result.notification_id
        });

        ResponseUtil.success(res, 'Connection request rejected successfully', result);
      } catch (svcErr: any) {
        // Map known service errors to proper HTTP responses
        if (svcErr && svcErr.message === 'CONNECTION_REQUEST_NOT_FOUND') {
          ResponseUtil.notFound(res, 'Connection request not found');
          return;
        }
        if (svcErr && svcErr.message === 'CONNECTION_ALREADY_REJECTED') {
          ResponseUtil.conflict(res, 'Connection request already rejected');
          return;
        }
        if (svcErr && svcErr.message === 'CONNECTION_ALREADY_ACCEPTED') {
          ResponseUtil.validationError(res, 'Cannot reject an accepted connection', [
            { field: 'sender_id', message: 'Cannot reject an accepted connection' }
          ]);
          return;
        }
        // Unknown service error
        throw svcErr;
      }
    } catch (error) {
      console.error('Reject connection request error:', error);
      ResponseUtil.serverError(res, 'Failed to reject connection request');
    }
  }

  async withdrawConnectionRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { recipient_id } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      // Validate recipient_id
      if (!recipient_id || !this.isValidUUID(recipient_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'recipient_id', message: 'Recipient ID is required and must be a valid UUID' }
        ]);
        return;
      }

      // Prevent self withdrawal
      if (userId === recipient_id) {
        ResponseUtil.validationError(res, 'Cannot withdraw connection request to yourself', [
          { field: 'recipient_id', message: 'Cannot withdraw connection request to yourself' }
        ]);
        return;
      }

      try {
        const result = await connectionService.withdrawConnectionRequest(userId, recipient_id);

        ResponseUtil.success(res, 'Connection request withdrawn successfully', result);
      } catch (svcErr: any) {
        // Map known service errors to proper HTTP responses
        if (svcErr && svcErr.message === 'CONNECTION_REQUEST_NOT_FOUND') {
          ResponseUtil.notFound(res, 'No pending connection request found to this user');
          return;
        }
        if (svcErr && svcErr.message === 'CANNOT_WITHDRAW_ACCEPTED') {
          ResponseUtil.validationError(res, 'Cannot withdraw accepted connection request', [
            { field: 'recipient_id', message: 'This connection request has already been accepted. Use remove connection instead.' }
          ]);
          return;
        }
        if (svcErr && svcErr.message === 'CANNOT_WITHDRAW_REJECTED') {
          ResponseUtil.validationError(res, 'Cannot withdraw rejected connection request', [
            { field: 'recipient_id', message: 'This connection request has already been rejected' }
          ]);
          return;
        }
        // Unknown service error
        throw svcErr;
      }
    } catch (error) {
      console.error('Withdraw connection request error:', error);
      ResponseUtil.serverError(res, 'Failed to withdraw connection request');
    }
  }

  async getSuggestedUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      const pageParam = req.query.page as string | undefined;
      const limitParam = req.query.limit as string | undefined;

      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 20;

      if (isNaN(page) || page < 1) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'page', message: 'Page must be a positive integer' }
        ]);
        return;
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'limit', message: 'Limit must be a positive integer and <= 100' }
        ]);
        return;
      }

      try {
        const result = await connectionService.getSuggestedUsers(userId, page, limit);

        if (!result.users || result.users.length === 0) {
          ResponseUtil.success(res, 'No suggested users found', { 
            users: [], 
            total: 0, 
            page, 
            limit, 
            total_pages: 0 
          });
          return;
        }

        ResponseUtil.success(res, 'Suggested users fetched successfully', result);
      } catch (svcErr: any) {
        console.error('Get suggested users service error:', svcErr);
        ResponseUtil.serverError(res, 'Failed to fetch suggested users');
      }
    } catch (error) {
      console.error('Get suggested users error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch suggested users');
    }
  }

  async markNotificationAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      const { notification_id } = req.body;

      if (!notification_id || !this.isValidUUID(notification_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'notification_id', message: 'notification_id is required and must be a valid UUID' }
        ]);
        return;
      }

      try {
        const result = await connectionService.markNotificationAsRead(notification_id, userId);
        ResponseUtil.success(res, 'Notification marked as read', result);
      } catch (svcErr: any) {
        if (svcErr && svcErr.message === 'NOTIFICATION_NOT_FOUND') {
          ResponseUtil.notFound(res, 'Notification not found');
          return;
        }
        throw svcErr;
      }
    } catch (error) {
      console.error('Mark notification as read error:', error);
      ResponseUtil.serverError(res, 'Failed to mark notification as read');
    }
  }

  async fetchNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      // Parse and validate query params
      const pageParam = req.query.page as string | undefined;
      const limitParam = req.query.limit as string | undefined;
      const status = (req.query.status as string) || 'all';
      const type = (req.query.type as string) || 'connect_request';

      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 20;

      // Validate page/limit
      if (isNaN(page) || page < 1) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'page', message: 'Page must be a positive integer' }]);
        return;
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'limit', message: 'Limit must be a positive integer and <= 100' }]);
        return;
      }

      const allowedStatus = ['pending', 'accepted', 'rejected', 'all'];
      if (!allowedStatus.includes(status)) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'status', message: 'Status must be one of: pending, accepted, rejected, all' }]);
        return;
      }

      // Only allow connect_request type for now
      if (type !== 'connect_request') {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'type', message: 'Type must be connect_request' }]);
        return;
      }

      // Call service
      try {
        const result = await connectionService.getUserNotifications(userId, page, limit, status, type);

        // Format response per reference
        const data = {
          notifications: result.notifications,
          total: result.total,
          page,
          limit,
          total_pages: Math.ceil(result.total / limit),
          unread_count: result.unread_count,
          pending_count: result.pending_count
        };

        if (!result.notifications || result.notifications.length === 0) {
          ResponseUtil.success(res, 'No notifications found', { notifications: [], total: 0, page, limit, unread_count: 0 });
          return;
        }

        ResponseUtil.success(res, 'Notifications fetched successfully', data);
      } catch (svcErr: any) {
        console.error('Fetch notifications service error:', svcErr);
        ResponseUtil.serverError(res, 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch notifications');
    }
  }

  // GET /api/connection/list
  async getConnections(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      const pageParam = req.query.page as string | undefined;
      const limitParam = req.query.limit as string | undefined;
      const search = req.query.search as string | undefined;

      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 20;

      if (isNaN(page) || page < 1) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'page', message: 'Page must be a positive integer' }]);
        return;
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'limit', message: 'Limit must be a positive integer and <= 100' }]);
        return;
      }

      try {
        const result = await connectionService.fetchUserConnections(userId, page, limit, search);

        const data = {
          connections: result.connections,
          total: result.total,
          page,
          limit,
          total_pages: result.total && limit ? Math.ceil(result.total / limit) : 0
        };

        ResponseUtil.success(res, 'Connections fetched successfully', data);
      } catch (svcErr: any) {
        console.error('Fetch connections service error:', svcErr);
        ResponseUtil.serverError(res, 'Failed to fetch connections');
      }
    } catch (error) {
      console.error('Get connections error:', error);
      ResponseUtil.serverError(res, 'Failed to fetch connections');
    }
  }

  // GET /api/connection/status/:user_id
  async checkConnectionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUserId = req.user?.id;
      const targetUserId = req.params.user_id;

      if (!authUserId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      if (!targetUserId || !this.isValidUUID(targetUserId)) {
        ResponseUtil.validationError(res, 'Validation failed', [{ field: 'user_id', message: 'Invalid user ID format' }]);
        return;
      }

      // Prevent self-check
      if (authUserId === targetUserId) {
        ResponseUtil.validationError(res, 'Cannot check connection status with yourself', [{ field: 'user_id', message: 'Cannot check connection status with yourself' }]);
        return;
      }

      try {
        const status = await connectionService.isUserConnected(authUserId, targetUserId);
        const data = Object.assign({ user_id: targetUserId }, status);
        ResponseUtil.success(res, 'Connection status retrieved successfully', data);
      } catch (svcErr: any) {
        console.error('Check connection status service error:', svcErr);
        ResponseUtil.serverError(res, 'Failed to check connection status');
      }
    } catch (error) {
      console.error('Check connection status error:', error);
      ResponseUtil.serverError(res, 'Failed to check connection status');
    }
  }

  // DELETE /api/connection/remove
  async removeConnection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { connected_user_id } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Unauthorized');
        return;
      }

      // Validate connected_user_id
      if (!connected_user_id || !this.isValidUUID(connected_user_id)) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'connected_user_id', message: 'connected_user_id is required and must be a valid UUID' }
        ]);
        return;
      }

      // Prevent self removal
      if (userId === connected_user_id) {
        ResponseUtil.validationError(res, 'Cannot remove connection with yourself', [
          { field: 'connected_user_id', message: 'Cannot remove connection with yourself' }
        ]);
        return;
      }

      try {
        const result = await connectionService.removeConnection(userId, connected_user_id);

        ResponseUtil.success(res, 'Connection removed successfully', result);
      } catch (svcErr: any) {
        // Map known service errors to proper HTTP responses
        if (svcErr && svcErr.message === 'CONNECTION_NOT_FOUND') {
          ResponseUtil.notFound(res, 'Connection not found');
          return;
        }
        // Unknown service error
        throw svcErr;
      }
    } catch (error) {
      console.error('Remove connection error:', error);
      ResponseUtil.serverError(res, 'Failed to remove connection');
    }
  }
}

export const connectionController = new ConnectionController();
export default connectionController;
