/**
 * Socket Chat Service
 * Manages WebSocket connection for real-time chat functionality
 */
'use client';

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../tokens';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: unknown;
  created_at: Date;
  edited_at: Date | null;
  is_forwarded: boolean;
  sender_email?: string;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  sender_avatar?: string | null;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  title: string | null;
  created_by: string;
  created_at: Date;
  participants?: ConversationParticipant[];
  lastMessage?: ChatMessage;
  messageCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: Date;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
}

// Socket event payloads
export interface StartConversationPayload {
  recipientId: string;
  initialMessage?: unknown;
}

export interface SendMessagePayload {
  conversationId: string;
  content: unknown;
  isForwarded?: boolean;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

// Socket response types
export interface StartConversationResponse {
  success: boolean;
  conversation: Conversation;
  message?: ChatMessage;
  isNew: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message: ChatMessage;
}

export interface JoinConversationResponse {
  success: boolean;
  conversationDetails: Conversation;
}

// Event callback types
export type NewConversationCallback = (data: {
  conversation: Conversation;
  message?: ChatMessage;
}) => void;

export type NewMessageCallback = (data: {
  conversationId: string;
  message: ChatMessage;
  senderInfo: { id: string; email: string };
}) => void;

export type UserTypingCallback = (data: {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}) => void;

export type MessageUpdatedCallback = (data: {
  conversationId: string;
  message: ChatMessage;
}) => void;

export type MessageDeletedCallback = (data: {
  conversationId: string;
  messageId: string;
}) => void;

export type ConnectionCallback = (connected: boolean) => void;

class SocketChatService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private listenersRegistered = false;
  
  // Event listeners
  private newConversationCallbacks: Set<NewConversationCallback> = new Set();
  private newMessageCallbacks: Set<NewMessageCallback> = new Set();
  private userTypingCallbacks: Set<UserTypingCallback> = new Set();
  private messageUpdatedCallbacks: Set<MessageUpdatedCallback> = new Set();
  private messageDeletedCallbacks: Set<MessageDeletedCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();

  /**
   * Initialize socket connection
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        return;
      }

      this.isConnecting = true;
      const tokens = tokenStorage.getStoredTokens();

      if (!tokens?.access_token) {
        this.isConnecting = false;
        reject(new Error('No authentication token found'));
        return;
      }

      try {
        this.socket = io("http://localhost:3000", {
          auth: {
            token: tokens.access_token,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('[SocketChat] Connected');
          this.isConnecting = false;
          this.notifyConnectionCallbacks(true);
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('[SocketChat] Disconnected');
          this.notifyConnectionCallbacks(false);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SocketChat] Connection error:', error);
          this.isConnecting = false;
          reject(error);
        });

        // Register chat event listeners
        this.registerEventListeners();
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listenersRegistered = false;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Register all chat event listeners
   */
  private registerEventListeners(): void {
    if (!this.socket) return;
    
    // Prevent registering listeners multiple times
    if (this.listenersRegistered) {
      console.log('[SocketChat] Listeners already registered, skipping');
      return;
    }

    console.log('[SocketChat] Registering event listeners');
    this.listenersRegistered = true;

    // Listen for new conversations
    this.socket.on('chat:new_conversation', (data) => {
      console.log('[SocketChat] New conversation:', data);
      this.notifyNewConversationCallbacks(data);
    });

    // Listen for new messages
    this.socket.on('chat:new_message', (data) => {
      console.log('[SocketChat] New message:', data);
      this.notifyNewMessageCallbacks(data);
    });

    // Listen for typing indicators
    this.socket.on('chat:user_typing', (data) => {
      this.notifyUserTypingCallbacks(data);
    });

    // Listen for message updates
    this.socket.on('chat:message_updated', (data) => {
      console.log('[SocketChat] Message updated:', data);
      this.notifyMessageUpdatedCallbacks(data);
    });

    // Listen for message deletes
    this.socket.on('chat:message_deleted', (data) => {
      console.log('[SocketChat] Message deleted:', data);
      this.notifyMessageDeletedCallbacks(data);
    });
  }

  // ============ Socket Event Emitters ============

  /**
   * Start a new conversation
   */
  startConversation(
    payload: StartConversationPayload
  ): Promise<StartConversationResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'chat:start_conversation',
        payload,
        (response: StartConversationResponse) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error('Failed to start conversation'));
          }
        }
      );
    });
  }

  /**
   * Send a message
   */
  sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'chat:send_message',
        payload,
        (response: SendMessageResponse) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error('Failed to send message'));
          }
        }
      );
    });
  }

  /**
   * Join a conversation room
   */
  joinConversation(
    payload: JoinConversationPayload
  ): Promise<JoinConversationResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'chat:join_conversation',
        payload,
        (response: JoinConversationResponse) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error('Failed to join conversation'));
          }
        }
      );
    });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(
        'chat:leave_conversation',
        { conversationId },
        (response: { success: boolean }) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(payload: TypingPayload): void {
    if (!this.socket?.connected) return;
    this.socket.emit('chat:typing', payload);
  }

  // ============ Event Listener Management ============

  onNewConversation(callback: NewConversationCallback): () => void {
    this.newConversationCallbacks.add(callback);
    return () => this.newConversationCallbacks.delete(callback);
  }

  onNewMessage(callback: NewMessageCallback): () => void {
    this.newMessageCallbacks.add(callback);
    return () => this.newMessageCallbacks.delete(callback);
  }

  onUserTyping(callback: UserTypingCallback): () => void {
    this.userTypingCallbacks.add(callback);
    return () => this.userTypingCallbacks.delete(callback);
  }

  onMessageUpdated(callback: MessageUpdatedCallback): () => void {
    this.messageUpdatedCallbacks.add(callback);
    return () => this.messageUpdatedCallbacks.delete(callback);
  }

  onMessageDeleted(callback: MessageDeletedCallback): () => void {
    this.messageDeletedCallbacks.add(callback);
    return () => this.messageDeletedCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  // ============ Notification Helpers ============

  private notifyNewConversationCallbacks(data: { conversation: Conversation; message?: ChatMessage }): void {
    this.newConversationCallbacks.forEach((callback) => callback(data));
  }

  private notifyNewMessageCallbacks(data: { conversationId: string; message: ChatMessage; senderInfo: { id: string; email: string } }): void {
    this.newMessageCallbacks.forEach((callback) => callback(data));
  }

  private notifyUserTypingCallbacks(data: { conversationId: string; userId: string; isTyping: boolean }): void {
    this.userTypingCallbacks.forEach((callback) => callback(data));
  }

  private notifyMessageUpdatedCallbacks(data: { conversationId: string; message: ChatMessage }): void {
    this.messageUpdatedCallbacks.forEach((callback) => callback(data));
  }

  private notifyMessageDeletedCallbacks(data: { conversationId: string; messageId: string }): void {
    this.messageDeletedCallbacks.forEach((callback) => callback(data));
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }
}

// Export singleton instance
export const socketChatService = new SocketChatService();
