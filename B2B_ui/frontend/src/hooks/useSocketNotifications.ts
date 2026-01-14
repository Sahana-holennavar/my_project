/**
 * React Hook for Socket Notifications
 * Manages WebSocket connection lifecycle and notification state
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNotifications } from '@/components/providers/NotificationProvider';
import type { NotificationPopupData } from '@/components/ui/notification-popup';
import {
  initSocketNotifications,
  getSocketNotifications,
  SocketNotification,
  playNotificationSound,
  requestNotificationPermission,
  showBrowserNotification,
} from '@/lib/api/socket-notifications';

export interface UseSocketNotificationsOptions {
  /**
   * Auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Show browser notifications
   * @default true
   */
  showBrowserNotifications?: boolean;

  /**
   * Play sound on notification
   * @default true
   */
  playSound?: boolean;

  /**
   * Auto-request notification permission
   * @default false
   */
  requestPermission?: boolean;

  /**
   * WebSocket URL override
   */
  wsUrl?: string;

  /**
   * Callback when notification received
   */
  onNotificationReceived?: (notification: SocketNotification) => void;

  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (connected: boolean) => void;

  /**
   * Enable hook
   */
  enabled?: boolean;
}

export interface UseSocketNotificationsReturn {
  /**
   * List of received notifications
   */
  notifications: SocketNotification[];

  /**
   * Connection status
   */
  isConnected: boolean;

  /**
   * Loading state
   */
  isConnecting: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Unread count
   */
  unreadCount: number;

  /**
   * Connect to socket
   */
  connect: () => void;

  /**
   * Disconnect from socket
   */
  disconnect: () => void;

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) => void;

  /**
   * Clear all notifications
   */
  clearAll: () => void;

  /**
   * Remove specific notification
   */
  removeNotification: (notificationId: string) => void;

  /**
   * Request notification history
   */
  requestHistory: (limit?: number) => void;
}

export const useSocketNotifications = (
  options: UseSocketNotificationsOptions = {}
): UseSocketNotificationsReturn => {
  const {
    autoConnect = true,
    showBrowserNotifications = true,
    playSound = true,
    requestPermission = false,
    wsUrl,
    onNotificationReceived,
    onConnectionChange,
    enabled = true,
  } = options;

  const { showNotification } = useNotifications();
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const notificationPermissionRequested = useRef(false);
  const serviceInitialized = useRef(false);
  const unsubscribeCallbacks = useRef<(() => void)[]>([]);
  
  // Use ref to always have the latest showNotification function
  const showNotificationRef = useRef(showNotification);
  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  /**
   * Adapter to convert SocketNotification to NotificationPopupData format
   */
  const adaptSocketNotification = useCallback((notification: SocketNotification): Omit<NotificationPopupData, 'id'> => {
    // Map socket notification types to popup types
    let popupType: NotificationPopupData['type'] = 'general';
    
    switch (notification.type) {
      case 'post_like':
        popupType = 'like';
        break;
      case 'post_comment':
        popupType = 'comment';
        break;
      case 'connection_request':
        popupType = 'connection_request';
        break;
      case 'connection_accepted':
        popupType = 'connection_accepted';
        break;
      case 'connection_rejected':
        popupType = 'connection_rejected';
        break;
      case 'mention':
        popupType = 'mention';
        break;
      case 'system':
        popupType = 'system';
        break;
      case 'message':
        popupType = 'message';
        break;
      default:
        popupType = 'general';
    }

    return {
      type: popupType,
      title: notification.title || 'Notification',
      message: notification.message || '',
      avatar: notification.sender?.avatar,
      userId: notification.sender?.user_id,
      actionUrl: notification.action_url,
      timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
    };
  }, []);

  /**
   * Initialize socket service
   */
  const initService = useCallback(() => {
    // Get or create the service
    const service = serviceInitialized.current 
      ? getSocketNotifications() 
      : initSocketNotifications(wsUrl ? { url: wsUrl } : undefined);
    
    if (!service) {
      console.error('❌ Failed to get socket service');
      return null;
    }

    // Always register callbacks (even if service already exists)
    // This ensures each hook instance gets its own callback
    
    // Clear old callbacks
    unsubscribeCallbacks.current.forEach(unsub => unsub());
    unsubscribeCallbacks.current = [];
    
    const unsubNotification = service.onNotification((notification) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📨 Socket notification received:', notification);
      }
      
      // Add to state
      setNotifications(prev => {
        // Avoid duplicates
        const exists = prev.some(n => n.notification_id === notification.notification_id);
        if (exists) {
          return prev;
        }
        return [notification, ...prev];
      });

      // Show in-app notification popup
      // Adapt socket notification to popup format
      const adaptedNotification = adaptSocketNotification(notification);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📢 Calling showNotification with:', adaptedNotification);
      }
      
      // Use ref to get the latest showNotification function
      try {
        showNotificationRef.current(adaptedNotification);
      } catch (err) {
        console.error('❌ Error calling showNotification:', err);
      }


      // Play sound (disabled)
      // if (playSound && !notification.is_read) {
      //   playNotificationSound();
      // }

      // Show browser notification
      if (showBrowserNotifications && !notification.is_read) {
        showBrowserNotification(notification);
      }

      // Call custom callback
      onNotificationReceived?.(notification);
    });

    // Subscribe to connection changes
    const unsubConnection = service.onConnectionChange((connected) => {
      setIsConnected(connected);
      setIsConnecting(false);
      onConnectionChange?.(connected);
    });

    // Subscribe to errors
    const unsubError = service.onError((err) => {
      console.error('Socket error:', err);
      setError(err);
      setIsConnecting(false);
    });

    // Store unsubscribe functions
    unsubscribeCallbacks.current = [unsubNotification, unsubConnection, unsubError];

    serviceInitialized.current = true;
    return service;
  }, [wsUrl, playSound, showBrowserNotifications, onNotificationReceived, onConnectionChange]);

  /**
   * Connect to socket
   */
  const connect = useCallback(() => {
    if (!enabled) return;
    setIsConnecting(true);
    setError(null);
    const service = initService();
    service?.connect();
  }, [initService, enabled]);

  /**
   * Disconnect from socket
   */
  const disconnect = useCallback(() => {
    const service = getSocketNotifications();
    service?.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    // Update local state
    setNotifications(prev =>
      prev.map(n =>
        n.notification_id === notificationId
          ? { ...n, is_read: true }
          : n
      )
    );

    // Send to server
    const service = getSocketNotifications();
    service?.markAsRead(notificationId);
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Remove specific notification
   */
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.notification_id !== notificationId)
    );
  }, []);

  /**
   * Request notification history
   */
  const requestHistory = useCallback((limit = 20) => {
    const service = getSocketNotifications();
    service?.requestHistory(limit);
  }, []);

  /**
   * Request browser notification permission
   */
  useEffect(() => {
    if (requestPermission && !notificationPermissionRequested.current && enabled) {
      notificationPermissionRequested.current = true;
      requestNotificationPermission();
    }
  }, [requestPermission, enabled]);

  /**
   * Auto-connect on mount and register callbacks
   */
  useEffect(() => {
    if (autoConnect && enabled) {
      initService();
      connect();
    }

    // Cleanup on unmount
    return () => {
      unsubscribeCallbacks.current.forEach(unsub => unsub());
      unsubscribeCallbacks.current = [];
      
      if (autoConnect && enabled) {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, enabled]); // Only run once on mount

  return {
    notifications,
    isConnected,
    isConnecting,
    error,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    clearAll,
    removeNotification,
    requestHistory,
  };
};

// ==================== Utility Hook ====================

/**
 * Hook to get socket connection status only
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const service = getSocketNotifications();
    if (!service) return;

    const unsubscribe = service.onConnectionChange(setIsConnected);
    setIsConnected(service.isConnected());

    return unsubscribe;
  }, []);

  return isConnected;
}

