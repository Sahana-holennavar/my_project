/**
 * Socket Notifications Service
 * Manages WebSocket connection for real-time notifications
 */
'use client';

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../tokens';

export interface SocketNotification {
  notification_id: string;
  type: 
    | 'connection_request' 
    | 'connection_accepted' 
    | 'connection_rejected'
    | 'message' 
    | 'post_like' 
    | 'post_comment' 
    | 'mention' 
    | 'system';
  title: string;
  message: string;
  sender?: {
    user_id: string;
    name: string;
    avatar?: string;
    headline?: string;
  };
  data?: Record<string, unknown>;
  timestamp: string;
  is_read: boolean;
  action_url?: string;
}

// Connection notification payload (from backend)
export interface ConnectionNotificationPayload {
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  senderId: string;
  message: string;
  timestamp: string;
  metadata?: {
    notificationId?: string;
    connectionId?: string;
  };
  senderProfile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    headline?: string;
  };
  senderName?: string;
  notificationId?: string;
  sender?: {
    user_id: string;
    name: string;
    avatar?: string;
    headline?: string;
  };
  senderAvatar?: string;
  senderHeadline?: string;
  data?: Record<string, unknown>;
  notification_id?: string;
  title?: string;
}

// Interaction notification payload (from backend - like, comment, share, etc.)
export interface InteractionNotificationPayload {
  type: 'like' | 'comment' | 'share' | 'save' | 'report';
  postId?: string;
  interactorId: string;
  message: string;
  timestamp: string;
  interactorProfile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    headline?: string;
  };
  data?: Record<string, unknown>;
}

export interface SocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type NotificationCallback = (notification: SocketNotification) => void;
type ConnectionCallback = (connected: boolean) => void;
type ErrorCallback = (error: Error) => void;

class SocketNotificationService {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private heartbeatInterval: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isIntentionallyClosed = false;

  // Callbacks
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  constructor(config: SocketConfig) {
    this.config = config;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.reconnectInterval = config.reconnectInterval || 3000;
    this.heartbeatInterval = config.heartbeatInterval || 30000;
  }

  /**
   * Connect to Socket.IO server
   */
  public connect(): void {
    console.log('🚀 Socket connect() called');
    console.log('Current socket state:', {
      hasSocket: !!this.socket,
      isConnected: this.socket?.connected,
      isConnecting: this.isConnecting
    });
    
    if (this.socket?.connected || this.isConnecting) {
      console.log('Socket already connected or connecting - skipping');
      return;
    }

    this.isConnecting = true;
    this.isIntentionallyClosed = false;

    try {
      console.log('🔐 Getting auth tokens...');
      const tokens = tokenStorage.getStoredTokens();
      
      if (!tokens?.access_token) {
        console.error('❌ No access token available!');
        throw new Error('No access token available');
      }

      console.log('✅ Token found:', tokens.access_token.substring(0, 20) + '...');
      console.log('� Connecting to Socket.IO...');
      console.log('� Base URL:', this.config.url);
      
      // Create Socket.IO connection with auth token
      console.log('🔧 Creating Socket.IO client...');
      this.socket = io(this.config.url, {
        auth: {
          token: tokens.access_token
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We'll handle reconnection ourselves
        timeout: 10000,
      });

      console.log('✅ Socket.IO client created successfully');
      console.log('🎯 Socket.IO connecting to:', this.config.url);

      // Setup event listeners
      console.log('📡 Setting up Socket.IO event listeners...');
      
      this.socket.on('connect', () => {
        console.log('🎉 Socket.IO connect event fired!');
        this.handleOpen();
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnect event fired:', reason);
        this.handleClose(reason);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('⚠️  Socket.IO connect_error event fired:', error);
        this.handleError(error);
      });
      
      // Listen for notification events
      this.socket.on('notification', (data) => {
        console.log('📬 Socket.IO notification event received');
        this.handleMessage(data);
      });
      
      this.socket.on('connection:notification', (data) => {
        console.log('🤝 Socket.IO connection:notification event received');
        this.handleConnectionNotification(data);
      });
      
      this.socket.on('interaction:notification', (data) => {
        console.log('🎯 Socket.IO interaction:notification event received');
        this.handleInteractionNotification(data);
      });
      
      console.log('✅ All Socket.IO event listeners registered');
      
    } catch (error) {
      console.error('❌ Failed to create Socket.IO connection:', error);
      this.isConnecting = false;
      this.notifyError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    console.log('Intentionally disconnecting from Socket.IO');
    this.isIntentionallyClosed = true;
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to notifications
   */
  public onNotification(callback: NotificationCallback): () => void {
    console.log('📝 Registering notification callback, total callbacks:', this.notificationCallbacks.size);
    this.notificationCallbacks.add(callback);
    console.log('✅ Callback registered, new total:', this.notificationCallbacks.size);
    return () => {
      console.log('🗑️  Unregistering notification callback');
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  public onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Send message to server (e.g., mark as read)
   */
  public send(data: Record<string, unknown>): void {
    if (this.socket?.connected) {
      this.socket.emit('message', data);
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  /**
   * Mark notification as read via WebSocket
   */
  public markAsRead(notificationId: string): void {
    this.send({
      type: 'mark_read',
      notification_id: notificationId,
    });
  }

  /**
   * Request notification history
   */
  public requestHistory(limit = 20): void {
    this.send({
      type: 'get_history',
      limit,
    });
  }

  // ==================== Private Methods ====================

  private handleOpen(): void {
    console.log('✅ Socket.IO connected successfully');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    this.notifyConnectionChange(true);
    this.startHeartbeat();

    // Request recent notifications on connect
    this.requestHistory(10);
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      console.log('📨 Socket.IO message received:', data);
      console.log('📋 Message type:', data.type);
      console.log('📦 Full message data:', JSON.stringify(data, null, 2));

      // Handle different message types
      switch (data.type) {
        case 'notification':
          console.log('✉️ Handling regular notification');
          this.handleNotification(data.payload as SocketNotification);
          break;
        
        case 'connection:notification':
          console.log('🤝 Handling connection notification');
          // Handle connection notifications (request, accepted, rejected)
          this.handleConnectionNotification((data.payload as ConnectionNotificationPayload) || (data as unknown as ConnectionNotificationPayload));
          break;
        
        case 'interaction:notification':
          console.log('🎯 Handling interaction notification (like, comment, share, etc.)');
          this.handleInteractionNotification((data.payload as InteractionNotificationPayload) || (data as unknown as InteractionNotificationPayload));
          break;
        
        case 'history':
          // Handle batch notifications
          if (Array.isArray(data.notifications)) {
            data.notifications.forEach((notif: SocketNotification) => {
              this.handleNotification(notif);
            });
          }
          break;

        case 'pong':
          // Heartbeat response
          console.log('Heartbeat received');
          break;

        case 'error':
          console.error('Server error:', data.message);
          this.notifyError(new Error(String(data.message || 'Unknown error')));
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.notifyError(error as Error);
    }
  }

  private handleNotification(notification: SocketNotification): void {
    console.log('📢 handleNotification called:', notification);
    console.log('👥 Number of registered callbacks:', this.notificationCallbacks.size);
    
    if (this.notificationCallbacks.size === 0) {
      console.error('⚠️  NO CALLBACKS REGISTERED! Notification will not be shown.');
      return;
    }
    
    // Notify all subscribers
    let callbackIndex = 0;
    this.notificationCallbacks.forEach(callback => {
      try {
        console.log(`🔔 Calling callback #${++callbackIndex}...`);
        callback(notification);
        console.log(`✅ Callback #${callbackIndex} executed successfully`);
      } catch (error) {
        console.error(`❌ Error in callback #${callbackIndex}:`, error);
      }
    });
    
    console.log(`✅ All ${callbackIndex} callbacks executed`);
  }

  private handleConnectionNotification(payload: ConnectionNotificationPayload): void {
    console.log('🔔 Connection notification received:', payload);
    console.log('🔍 Payload keys:', Object.keys(payload));
    // Type guard: if already a SocketNotification
    if (payload.notification_id && payload.title) {
        console.log('✅ Already a full notification, using directly');
        this.handleNotification(payload as unknown as SocketNotification);
        return;
    }
    // Fallbacks for hybrid payloads
    const senderProfile = payload.senderProfile || {};
    const senderName = senderProfile.firstName && senderProfile.lastName
        ? `${senderProfile.firstName} ${senderProfile.lastName}`
        : payload.senderName || 'User';
    const notification: SocketNotification = {
        notification_id: payload.metadata?.notificationId || payload.notificationId || `conn-${Date.now()}`,
        type: payload.type || 'system',
        title: this.getConnectionTitle(payload.type || 'system'),
        message: payload.message || 'Connection update',
        sender: payload.sender || {
            user_id: payload.senderId || 'unknown',
            name: senderName,
            avatar: senderProfile.avatar || payload.senderAvatar,
            headline: senderProfile.headline || payload.senderHeadline,
        },
        data: payload.metadata || payload.data || {},
        timestamp: payload.timestamp || new Date().toISOString(),
        is_read: false,
        action_url: this.getConnectionActionUrl(payload.type || 'system', payload.senderId || ''),
    };
    console.log('📤 Converted notification:', JSON.stringify(notification, null, 2));
    console.log('👤 Sender name:', senderName);
    console.log('🖼️  Sender avatar:', senderProfile.avatar || payload.senderAvatar);
    // Notify subscribers
    this.handleNotification(notification);
  }

  private getConnectionTitle(type: string): string {
    switch (type) {
      case 'connection_request':
        return 'New Connection Request';
      case 'connection_accepted':
        return 'Connection Accepted';
      case 'connection_rejected':
        return 'Connection Rejected';
      default:
        return 'Connection Update';
    }
  }

  private getConnectionActionUrl(type: string, senderId: string): string {
    switch (type) {
      case 'connection_request':
        return '/connections?tab=invitations';
      case 'connection_accepted':
      case 'connection_rejected':
        return `/user/${senderId}`;
      default:
        return '/connections';
    }
  }

  private handleInteractionNotification(payload: InteractionNotificationPayload): void {
    console.log('🎯 Interaction notification received:', payload);
    console.log('🔍 Payload keys:', Object.keys(payload));
    
    const interactorProfile = payload.interactorProfile || {};
    const interactorName = interactorProfile.firstName && interactorProfile.lastName
        ? `${interactorProfile.firstName} ${interactorProfile.lastName}`
        : 'Someone';
    
    // Map interaction type to notification type
    const notificationType = payload.type === 'like' ? 'post_like' 
      : payload.type === 'comment' ? 'post_comment'
      : payload.type === 'share' ? 'system'
      : 'system';
    
    const notification: SocketNotification = {
        notification_id: `interact-${payload.postId || ''}-${Date.now()}`,
        type: notificationType,
        title: this.getInteractionTitle(payload.type),
        message: payload.message || `${interactorName} ${payload.type}d your post`,
        sender: {
            user_id: payload.interactorId || 'unknown',
            name: interactorName,
            avatar: interactorProfile.avatar,
            headline: interactorProfile.headline,
        },
        data: payload.data || {},
        timestamp: payload.timestamp || new Date().toISOString(),
        is_read: false,
        action_url: payload.postId ? `/posts/${payload.postId}` : '/feed',
    };
    
    console.log('📤 Converted interaction notification:', JSON.stringify(notification, null, 2));
    console.log('👤 Interactor name:', interactorName);
    console.log('🖼️  Interactor avatar:', interactorProfile.avatar);
    
    // Notify subscribers
    this.handleNotification(notification);
  }

  private getInteractionTitle(type: string): string {
    switch (type) {
      case 'like':
        return 'Post Liked';
      case 'comment':
        return 'New Comment';
      case 'share':
        return 'Post Shared';
      case 'save':
        return 'Post Saved';
      case 'report':
        return 'Post Reported';
      default:
        return 'Post Interaction';
    }
  }

  private handleError(error: Error): void {
    console.error('❌ Socket.IO error occurred');
    console.error('Error:', error);
    console.error('Socket connected:', this.socket?.connected);
    
    console.error('💡 Connection error. Possible causes:');
    console.error('   1. Backend Socket.IO server is not running');
    console.error('   2. Backend is not listening on the expected port');
    console.error('   3. CORS or authentication issues');
    console.error('   4. Invalid token or token format');
    
    this.isConnecting = false;
    this.notifyError(error || new Error('Socket.IO connection error'));
  }

  private handleClose(reason: string): void {
    console.log('❌ Socket.IO disconnected');
    console.log('Disconnect reason:', reason);
    
    const reasonExplanations: Record<string, string> = {
      'io server disconnect': 'Server forcefully disconnected the socket',
      'io client disconnect': 'Client disconnected intentionally',
      'ping timeout': 'Connection timed out (no ping response)',
      'transport close': 'Transport connection closed',
      'transport error': 'Transport error occurred',
    };
    
    const disconnectExplanation = reasonExplanations[reason] || reason;
    console.log('💡 Explanation:', disconnectExplanation);
    
    if (reason === 'io server disconnect' || reason === 'transport error') {
      console.error('⚠️  Server disconnected or transport error');
      console.error('   Check if backend Socket.IO server is running');
      console.error('   Expected URL:', this.config.url);
    }
    
    this.isConnecting = false;
    this.cleanup();
    
    this.notifyConnectionChange(false);

    // Reconnect if not intentionally closed
    if (!this.isIntentionallyClosed && reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.cleanup();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  private scheduleReconnect(): void {
  if (this.isIntentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.notifyError(new Error('Failed to reconnect to notification server'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }
}

// ==================== Singleton Instance ====================

let socketService: SocketNotificationService | null = null;

/**
 * Initialize socket notification service
 */
export function initSocketNotifications(config?: Partial<SocketConfig>): SocketNotificationService {
  console.log('🏗️  initSocketNotifications called');
  
  if (socketService) {
    console.warn('⚠️  Socket notification service already initialized - returning existing instance');
    return socketService;
  }
  
  console.log('🆕 Creating new Socket notification service...');

  // Derive WebSocket URL from API URL
  const getWebSocketUrl = (): string => {
    // Check for explicit WebSocket URL in environment
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }

    // Derive from API URL - Socket.IO uses HTTP/HTTPS, not WS/WSS
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const url = new URL(apiUrl);
    
    // Keep http/https protocol for Socket.IO
    // Remove /api from path if present, keep just the base URL
    const baseUrl = `${url.protocol}//${url.host}`;
    
    console.log('🔌 Derived Socket.IO URL:', baseUrl);
    return baseUrl;
  };

  const defaultUrl = getWebSocketUrl();
  
  const fullConfig: SocketConfig = {
    url: defaultUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    ...config,
  };

  console.log('⚙️  Socket service config:', fullConfig);
  
  socketService = new SocketNotificationService(fullConfig);
  console.log('✅ Socket notification service created successfully');
  
  return socketService;
}

/**
 * Get existing socket notification service instance
 */
export function getSocketNotifications(): SocketNotificationService | null {
  return socketService;
}

/**
 * Destroy socket notification service
 */
export function destroySocketNotifications(): void {
  if (socketService) {
    socketService.disconnect();
    socketService = null;
  }
}

// ==================== Utility Functions ====================

/**
 * Format notification for display
 */
export function formatNotification(notification: SocketNotification): {
  title: string;
  message: string;
  icon?: string;
  avatar?: string;
} {
  const formatted = {
    title: notification.title,
    message: notification.message,
    avatar: notification.sender?.avatar,
    icon: undefined as string | undefined,
  };

  // Set icon based on notification type
  switch (notification.type) {
    case 'connection_request':
      formatted.icon = '👥';
      break;
    case 'connection_accepted':
      formatted.icon = '✅';
      break;
    case 'message':
      formatted.icon = '💬';
      break;
    case 'post_like':
      formatted.icon = '❤️';
      break;
    case 'post_comment':
      formatted.icon = '💭';
      break;
    case 'mention':
      formatted.icon = '@';
      break;
    case 'system':
      formatted.icon = '🔔';
      break;
    default:
      formatted.icon = '🔔';
  }

  return formatted;
}

/**
 * Play notification sound
 */
// Notification sound disabled as per user request
export function playNotificationSound(): void {
  // No-op
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification
 */
export function showBrowserNotification(notification: SocketNotification): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const formatted = formatNotification(notification);
    
    const browserNotif = new Notification(formatted.title, {
      body: formatted.message,
      icon: formatted.avatar || '/logo.png',
      badge: '/logo.png',
      tag: notification.notification_id,
      requireInteraction: false,
      silent: false,
    });

    // Handle notification click
    browserNotif.onclick = () => {
      window.focus();
      if (notification.action_url) {
        window.location.href = notification.action_url;
      }
      browserNotif.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => browserNotif.close(), 5000);
  } catch (error) {
    console.error('Failed to show browser notification:', error);
  }
}

// ==================== Export Types ====================

export type {
  NotificationCallback,
  ConnectionCallback,
  ErrorCallback,
};
