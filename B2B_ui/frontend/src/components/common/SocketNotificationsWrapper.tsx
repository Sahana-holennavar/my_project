/**
 * Example component demonstrating how to use socket notifications
 * This can be placed in the layout or any component that needs real-time notifications
 */
'use client';

import { useEffect } from 'react';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';

export function SocketNotificationsWrapper() {
  const {
    isConnected,
    isConnecting,
    error,
    unreadCount,
  } = useSocketNotifications({
    autoConnect: true, // Auto-connect on mount
    showBrowserNotifications: true, // Show browser push notifications
    playSound: true, // Play sound on new notification
    requestPermission: true, // Request browser notification permission
    // wsUrl: 'ws://your-backend.com/ws/notifications', // Optional: override WebSocket URL
    
    // Optional callbacks
    onNotificationReceived: (notification) => {
      // Custom handling for specific notification types
      if (notification.type === 'connection_request') {
        // Trigger any UI updates needed (e.g., refresh pending requests badge)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('connection:request:received'));
        }
      } else if (notification.type === 'connection_accepted') {
        // Trigger UI updates (e.g., refresh connections list)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('connection:accepted'));
        }
      } else if (notification.type === 'connection_rejected') {
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('connection:rejected'));
        }
      }
    },
    
    onConnectionChange: (connected) => {
      // Connection status changed
    },
  });

  // Log notification count changes
  useEffect(() => {
    if (unreadCount > 0) {
      // Update browser tab title with unread count
      document.title = `(${unreadCount}) B2B Platform`;
    } else {
      document.title = 'B2B Platform';
    }
  }, [unreadCount]);

  // This component doesn't render anything visible
  // It just handles socket connections in the background
  return null;
}

// Example: Advanced usage with manual control
export function ManualSocketControl() {
  const socket = useSocketNotifications({
    autoConnect: false, // Don't auto-connect
  });

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Socket Status:</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                socket.isConnected
                  ? 'bg-green-500'
                  : socket.isConnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {socket.isConnected
                ? 'Connected'
                : socket.isConnecting
                ? 'Connecting...'
                : 'Disconnected'}
            </span>
          </div>
        </div>

        {socket.error && (
          <div className="text-xs text-red-500">
            Error: {socket.error.message}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={socket.connect}
            disabled={socket.isConnected || socket.isConnecting}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          <button
            onClick={socket.disconnect}
            disabled={!socket.isConnected}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span>Notifications: {socket.notifications.length}</span>
            <span>Unread: {socket.unreadCount}</span>
          </div>
          {socket.notifications.length > 0 && (
            <button
              onClick={socket.clearAll}
              className="mt-2 w-full px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
