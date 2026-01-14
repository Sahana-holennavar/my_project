/**
 * Socket Service - Manages Socket.IO connections and real-time notifications
 * Handles user connection tracking and message broadcasting
 */

import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';
import { ResumeStatusPayload } from '../types/socket.types';
import { ChatService } from './chatService';

interface UserSocket {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

interface UserProfileInfo {
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

interface InteractionNotification {
  type: 'like' | 'comment' | 'reply' | 'share' | 'save' | 'report';
  postId: string;
  postOwnerId: string;
  interactorId: string;
  interactorName?: string;
  message: string;
  timestamp: Date;
  metadata?: any;
  interactorProfile?: UserProfileInfo;
}

export class SocketService {
  private io: SocketIOServer | null = null;
  private resumeStatusNamespace: Namespace | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

 
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.ALLOWED_ORIGINS || ['http://localhost:4000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('Socket.IO service initialized');
    return this.io;
  }

  /**
   * Setup Socket.IO middleware for authentication
   * Creates a reusable authentication middleware function
   */
  private createAuthMiddleware() {
    return (socket: Socket, next: any) => {
      try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        const namespace = socket.nsp?.name || '/';

        if (!token) {
          console.error(`❌ [${namespace}] No token provided in auth or query`);
          return next(new Error('Authentication token required'));
        }

        console.log(`🔑 [${namespace}] Token received, verifying...`);
        
        // Verify JWT token
        const decoded = jwt.verify(token as string, config.JWT_SECRET) as any;
        
        console.log(`🔓 [${namespace}] JWT decoded:`, { userId: decoded.userId, email: decoded.email, allKeys: Object.keys(decoded) });
        
        if (!decoded.userId) {
          console.error(`❌ [${namespace}] Token missing userId field. Token contains:`, Object.keys(decoded));
          return next(new Error('Invalid token payload - userId not found'));
        }

        // Attach user data to socket
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;

        console.log(`✅ [${namespace}] User authenticated: ${decoded.userId}`);
        next();
      } catch (error) {
        console.error(`❌ Socket authentication error:`, error);
        next(new Error('Authentication failed'));
      }
    };
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    const authMiddleware = this.createAuthMiddleware();
    
    // Apply to default namespace
    this.io.use(authMiddleware);
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    // Default namespace
    this.registerConnectionHandlers(this.io);

    // Resume status namespace exposed at /api/resumes/status
    this.resumeStatusNamespace = this.io.of('/api/resumes/status');
    
    // Apply authentication middleware to the namespace
    const authMiddleware = this.createAuthMiddleware();
    this.resumeStatusNamespace.use(authMiddleware);
    
    this.registerConnectionHandlers(this.resumeStatusNamespace);
  }

  /**
   * Register shared connection handlers for a namespace
   */
  private registerConnectionHandlers(target: SocketIOServer | Namespace): void {
    target.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const namespace = socket.nsp?.name || '/';
      
      console.log(`User connected: ${userId} (socket: ${socket.id}, ns: ${namespace})`);

      // Track user connection
      this.addUserSocket(userId, socket.id);

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Successfully connected to real-time server',
        namespace,
        userId,
        socketId: socket.id,
        timestamp: new Date()
      });

      // Handle user manually joining their own room
      socket.on('join', (data: { userId: string }) => {
        if (data.userId === userId) {
          socket.join(`user:${userId}`);
          console.log(`User ${userId} joined their room`);
        }
      });

      // ============ CHAT EVENT HANDLERS ============

      // Start a new conversation
      socket.on('chat:start_conversation', async (data: { recipientId: string; initialMessage?: any }, callback) => {
        try {
          console.log(`User ${userId} starting conversation with ${data.recipientId}`);

          if (!data.recipientId) {
            if (callback) {
              callback({ success: false, error: 'Recipient ID is required' });
            }
            return;
          }

          // Start conversation using chat service
          const result = await ChatService.startConversation(
            userId,
            data.recipientId,
            data.initialMessage
          );

          // Join conversation room
          socket.join(`conversation:${result.conversation.id}`);

          // Notify recipient if they're online
          if (this.isUserConnected(data.recipientId)) {
            this.sendToUser(data.recipientId, 'chat:new_conversation', {
              conversation: result.conversation,
              message: result.message,
            });
          }

          // Send response back to sender
          if (callback) {
            callback({
              success: true,
              conversation: result.conversation,
              message: result.message,
              isNew: result.isNew,
            });
          }

          console.log(`Conversation ${result.conversation.id} ${result.isNew ? 'created' : 'retrieved'}`);
        } catch (error) {
          console.error('Error starting conversation:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to start conversation',
            });
          }
        }
      });

      // Send a message in a conversation
      socket.on('chat:send_message', async (data: { conversationId: string; content: any; isForwarded?: boolean }, callback) => {
        try {
          console.log(`User ${userId} sending message to conversation ${data.conversationId}`);

          if (!data.conversationId || !data.content) {
            if (callback) {
              callback({ success: false, error: 'Conversation ID and content are required' });
            }
            return;
          }

          // Send message using chat service
          const message = await ChatService.sendMessage(
            data.conversationId,
            userId,
            data.content,
            data.isForwarded || false
          );

          // Get conversation details to notify participants
          const conversationDetails = await ChatService.getConversationDetails(
            data.conversationId,
            userId
          );

          if (conversationDetails) {
            // Notify all other participants
            conversationDetails.participants.forEach((participant) => {
              if (participant.user_id !== userId && this.isUserConnected(participant.user_id)) {
                this.sendToUser(participant.user_id, 'chat:new_message', {
                  conversationId: data.conversationId,
                  message,
                  senderInfo: {
                    id: userId,
                    email: socket.data.email,
                  },
                });
              }
            });
          }

          // Send response back to sender
          if (callback) {
            callback({
              success: true,
              message,
            });
          }

          console.log(`Message ${message.id} sent in conversation ${data.conversationId}`);
        } catch (error) {
          console.error('Error sending message:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to send message',
            });
          }
        }
      });

      // Join a conversation room
      socket.on('chat:join_conversation', async (data: { conversationId: string }, callback) => {
        try {
          console.log(`User ${userId} joining conversation ${data.conversationId}`);

          if (!data.conversationId) {
            if (callback) {
              callback({ success: false, error: 'Conversation ID is required' });
            }
            return;
          }

          // Verify user is a participant
          const conversationDetails = await ChatService.getConversationDetails(
            data.conversationId,
            userId
          );

          if (!conversationDetails) {
            if (callback) {
              callback({ success: false, error: 'Conversation not found or access denied' });
            }
            return;
          }

          // Join the conversation room
          socket.join(`conversation:${data.conversationId}`);

          if (callback) {
            callback({
              success: true,
              conversationDetails,
            });
          }

          console.log(`User ${userId} joined conversation room ${data.conversationId}`);
        } catch (error) {
          console.error('Error joining conversation:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to join conversation',
            });
          }
        }
      });

      // Leave a conversation room
      socket.on('chat:leave_conversation', (data: { conversationId: string }, callback) => {
        try {
          console.log(`User ${userId} leaving conversation ${data.conversationId}`);

          if (!data.conversationId) {
            if (callback) {
              callback({ success: false, error: 'Conversation ID is required' });
            }
            return;
          }

          socket.leave(`conversation:${data.conversationId}`);

          if (callback) {
            callback({ success: true });
          }

          console.log(`User ${userId} left conversation room ${data.conversationId}`);
        } catch (error) {
          console.error('Error leaving conversation:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to leave conversation',
            });
          }
        }
      });

      // Update a message
      socket.on('chat:update_message', async (data: { messageId: string; content: any }, callback) => {
        try {
          console.log(`User ${userId} updating message ${data.messageId}`);

          if (!data.messageId || !data.content) {
            if (callback) {
              callback({ success: false, error: 'Message ID and content are required' });
            }
            return;
          }

          // Update message using chat service
          const updatedMessage = await ChatService.updateMessage(
            data.messageId,
            userId,
            data.content
          );

          // Get conversation details to notify participants
          const conversationDetails = await ChatService.getConversationDetails(
            updatedMessage.conversation_id,
            userId
          );

          if (conversationDetails) {
            // Notify all participants (including sender for multi-device sync)
            conversationDetails.participants.forEach((participant) => {
              if (this.isUserConnected(participant.user_id)) {
                this.sendToUser(participant.user_id, 'chat:message_updated', {
                  conversationId: updatedMessage.conversation_id,
                  message: updatedMessage,
                  updatedBy: userId,
                });
              }
            });
          }

          // Send response back to sender
          if (callback) {
            callback({
              success: true,
              message: updatedMessage,
            });
          }

          console.log(`Message ${updatedMessage.id} updated in conversation ${updatedMessage.conversation_id}`);
        } catch (error) {
          console.error('Error updating message:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to update message',
            });
          }
        }
      });

      // Delete a message
      socket.on('chat:delete_message', async (data: { messageId: string }, callback) => {
        try {
          console.log(`User ${userId} deleting message ${data.messageId}`);

          if (!data.messageId) {
            if (callback) {
              callback({ success: false, error: 'Message ID is required' });
            }
            return;
          }

          // Delete message using chat service
          const result = await ChatService.deleteMessage(data.messageId, userId);

          if (!result.deleted) {
            if (callback) {
              callback({ success: false, error: 'Failed to delete message' });
            }
            return;
          }

          // Get conversation details to notify participants
          if (result.conversationId) {
            const conversationDetails = await ChatService.getConversationDetails(
              result.conversationId,
              userId
            );

            if (conversationDetails) {
              // Notify all participants (including sender for multi-device sync)
              conversationDetails.participants.forEach((participant) => {
                if (this.isUserConnected(participant.user_id)) {
                  this.sendToUser(participant.user_id, 'chat:message_deleted', {
                    conversationId: result.conversationId,
                    messageId: data.messageId,
                    deletedBy: userId,
                  });
                }
              });
            }
          }

          // Send response back to sender
          if (callback) {
            callback({
              success: true,
              messageId: data.messageId,
            });
          }

          console.log(`Message ${data.messageId} deleted from conversation ${result.conversationId}`);
        } catch (error) {
          console.error('Error deleting message:', error);
          if (callback) {
            callback({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to delete message',
            });
          }
        }
      });

      // Typing indicator
      socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
        try {
          if (!data.conversationId) return;

          // Broadcast typing status to other users in the conversation
          socket.to(`conversation:${data.conversationId}`).emit('chat:user_typing', {
            conversationId: data.conversationId,
            userId,
            isTyping: data.isTyping,
          });

          console.log(`User ${userId} typing status in conversation ${data.conversationId}: ${data.isTyping}`);
        } catch (error) {
          console.error('Error handling typing indicator:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${userId} (socket: ${socket.id}, ns: ${namespace}), reason: ${reason}`);
        this.removeUserSocket(userId, socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${userId} (ns: ${namespace}):`, error);
      });

      // Auto-join user to their personal room
      const roomName = `user:${userId}`;
      socket.join(roomName);
      console.log(`✅ User ${userId} auto-joined room: ${roomName} on namespace ${namespace}`);
    });
  }

  /**
   * Add user socket connection
   */
  private addUserSocket(userId: string, socketId: string): void {
    // Add to user -> sockets mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Add to socket -> user mapping
    this.socketUsers.set(socketId, userId);
  }

  /**
   * Remove user socket connection
   */
  private removeUserSocket(userId: string, socketId: string): void {
    // Remove from user -> sockets mapping
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    // Remove from socket -> user mapping
    this.socketUsers.delete(socketId);
  }

  /**
   * Send interaction notification to post owner
   */
  sendInteractionNotification(notification: InteractionNotification): void {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    const { postOwnerId, type, postId, interactorId, message, metadata, interactorProfile } = notification;

    // Don't send notification if user is interacting with their own post
    if (postOwnerId === interactorId) {
      console.log('Skipping self-interaction notification');
      return;
    }

    // Check if post owner is connected
    if (!this.isUserConnected(postOwnerId)) {
      console.log(`User ${postOwnerId} is not connected, notification not sent`);
      return;
    }

    // Prepare notification payload
    const payload = {
      type,
      postId,
      interactorId,
      message,
      timestamp: new Date(),
      metadata,
      interactorProfile
    };

    // Send to user's room
    // this.io.to(`user:${postOwnerId}`).emit('interaction:notification', payload);
    this.sendToUser(postOwnerId, 'interaction:notification', payload);

    console.log(`Interaction notification sent to user ${postOwnerId}: ${type} on post ${postId}`);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get socket count for a user
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Broadcast message to all connected users
   */
  broadcastToAll(event: string, data: any): void {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    this.io.emit(event, data);
  }

  /**
   * Send message to specific user (all their sockets)
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit resume evaluation status updates to the dedicated namespace, with fallback to default
   */
  sendResumeStatus(userId: string, payload: ResumeStatusPayload): void {
    const normalizedPayload: ResumeStatusPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    if (typeof normalizedPayload.progress === 'number') {
      normalizedPayload.progress = Math.max(0, Math.min(100, normalizedPayload.progress));
    }

    const target = this.resumeStatusNamespace || this.io;
    if (!target) {
      console.warn('⚠️ Socket.IO not initialized - cannot send resume status');
      return;
    }

    const roomName = `user:${userId}`;
    const namespaceName = target instanceof SocketIOServer ? '/' : (target as Namespace).name;
    
    console.log(`📤 EMITTING resume:status | User: ${userId} | Namespace: ${namespaceName} | Room: ${roomName}`);
    console.log(`   └─ Step: ${payload.step} | Status: ${payload.status} | Details: ${payload.details || 'N/A'}`);

    // Emit to all sockets in the user's room
    target.to(roomName).emit('resume:status', normalizedPayload);
    console.log(`✅ Event sent successfully`);
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Disconnect all sockets and cleanup
   */
  async shutdown(): Promise<void> {
    if (!this.io) return;

    console.log('Shutting down Socket.IO service...');
    
    // Disconnect all clients
    const sockets = await this.io.fetchSockets();
    sockets.forEach(socket => socket.disconnect(true));

    // Clear tracking maps
    this.userSockets.clear();
    this.socketUsers.clear();

    // Close server
    this.io.close();
    this.io = null;

    console.log('Socket.IO service shut down');
  }
}

export const socketService = new SocketService();
