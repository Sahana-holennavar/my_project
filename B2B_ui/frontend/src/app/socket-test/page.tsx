'use client';

import React, { useEffect, useState } from 'react';
import { 
  initSocketNotifications, 
  getSocketNotifications,
  SocketNotification,
  formatNotification 
} from '@/lib/api/socket-notifications';
import { tokenStorage } from '@/lib/tokens';

interface NotificationDisplay extends SocketNotification {
  receivedAt: string;
  formatted: ReturnType<typeof formatNotification>;
}

export default function SocketTestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    // Check if user has tokens
    const tokens = tokenStorage.getStoredTokens();
    const hasAuth = !!tokens?.access_token;
    setHasTokens(hasAuth);

    if (!hasAuth) {
      addLog('❌ No authentication token found');
      return;
    }

    addLog('✅ Authentication token found');
    addLog('🚀 Initializing socket connection...');

    // Initialize socket
    const socket = initSocketNotifications();

    if (!socket) {
      addLog('❌ Failed to initialize socket');
      return;
    }

    addLog('✅ Socket service initialized');

    // Subscribe to connection status
    const unsubscribeConnection = socket.onConnectionChange((connected) => {
      setIsConnected(connected);
      addLog(connected ? '✅ Socket connected!' : '❌ Socket disconnected');
    });

    // Subscribe to notifications
    const unsubscribeNotifications = socket.onNotification((notification) => {
      addLog(`📨 Notification received: ${notification.type}`);
      
      const display: NotificationDisplay = {
        ...notification,
        receivedAt: new Date().toISOString(),
        formatted: formatNotification(notification),
      };

      setNotifications(prev => [display, ...prev]);
    });

    // Subscribe to errors
    const unsubscribeErrors = socket.onError((error) => {
      addLog(`❌ Socket error: ${error.message}`);
    });

    // Connect
    socket.connect();
    addLog('🔌 Connection initiated...');

    // Cleanup
    return () => {
      addLog('🧹 Cleaning up socket connection...');
      unsubscribeConnection();
      unsubscribeNotifications();
      unsubscribeErrors();
      socket.disconnect();
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
    addLog('🗑️ Cleared all notifications');
  };

  const clearLogs = () => {
    setConnectionLog([]);
  };

  const testConnection = () => {
    const socket = getSocketNotifications();
    if (socket) {
      addLog(`🔍 Connection status: ${socket.isConnected() ? 'Connected ✅' : 'Disconnected ❌'}`);
    } else {
      addLog('❌ No socket service available');
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      connection_request: '👥',
      connection_accepted: '✅',
      connection_rejected: '❌',
      post_like: '❤️',
      post_comment: '💬',
      post_share: '🔄',
      post_save: '🔖',
      post_report: '⚠️',
      mention: '@',
      message: '💬',
      system: '🔔',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    if (type.startsWith('connection_')) {
      return 'border-blue-500 bg-blue-50';
    }
    if (type.startsWith('post_')) {
      return 'border-purple-500 bg-purple-50';
    }
    return 'border-gray-500 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">Socket.IO Test Dashboard</h1>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auth Status */}
            <div className={`p-4 rounded-lg border-2 ${hasTokens ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="text-sm font-semibold text-gray-600">Authentication</div>
              <div className="text-2xl font-bold mt-2">
                {hasTokens ? '✅ Authenticated' : '❌ Not Authenticated'}
              </div>
              {!hasTokens && (
                <div className="text-sm text-red-600 mt-2">
                  Please log in first at <a href="/login" className="underline">/login</a>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className={`p-4 rounded-lg border-2 ${isConnected ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
              <div className="text-sm font-semibold text-gray-600">Socket Connection</div>
              <div className="text-2xl font-bold mt-2">
                {isConnected ? '🟢 Connected' : '🟠 Disconnected'}
              </div>
              <button
                onClick={testConnection}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Test Connection
              </button>
            </div>

            {/* Notification Count */}
            <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50">
              <div className="text-sm font-semibold text-gray-600">Notifications Received</div>
              <div className="text-2xl font-bold mt-2">
                {notifications.length} total
              </div>
              <button
                onClick={clearNotifications}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                disabled={notifications.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications Panel */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">📬 Live Notifications</h2>
            
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <div className="text-lg">No notifications yet</div>
                <div className="text-sm mt-2">
                  Trigger events using the backend API to see notifications here
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {notifications.map((notif, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getNotificationColor(notif.type)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{getNotificationIcon(notif.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-800">{notif.formatted.title}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(notif.receivedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{notif.formatted.message}</p>
                        
                        {notif.sender && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                            {notif.sender.avatar && (
                              <img
                                src={notif.sender.avatar}
                                alt={notif.sender.name}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="font-semibold">{notif.sender.name}</span>
                            {notif.sender.headline && (
                              <span className="text-gray-500">• {notif.sender.headline}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-200 rounded">
                            {notif.type}
                          </span>
                          {notif.action_url && (
                            <a
                              href={notif.action_url}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Log Panel */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📝 Connection Log</h2>
              <button
                onClick={clearLogs}
                className="text-sm text-red-600 hover:text-red-800 underline"
                disabled={connectionLog.length === 0}
              >
                Clear Logs
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg max-h-[600px] overflow-y-auto">
              {connectionLog.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                connectionLog.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">🧪 Testing Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">1. Test Connection Notifications</h3>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                <div className="mb-2 text-gray-700"># Send connection request (User A to User B)</div>
                <div className="text-blue-600">POST /api/connection/request</div>
                <div className="text-gray-600">{"{ \"recipient_id\": \"user-b-id\" }"}</div>
                
                <div className="mt-4 mb-2 text-gray-700"># Accept connection (User B accepts)</div>
                <div className="text-blue-600">POST /api/connection/accept</div>
                <div className="text-gray-600">{"{ \"sender_id\": \"user-a-id\" }"}</div>
                
                <div className="mt-4 mb-2 text-gray-700"># Reject connection (User B rejects)</div>
                <div className="text-blue-600">POST /api/connection/reject</div>
                <div className="text-gray-600">{"{ \"sender_id\": \"user-a-id\" }"}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">2. Test Interaction Notifications</h3>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                <div className="mb-2 text-gray-700"># Like a post</div>
                <div className="text-blue-600">POST /api/posts/:postId/like</div>
                
                <div className="mt-4 mb-2 text-gray-700"># Comment on a post</div>
                <div className="text-blue-600">POST /api/posts/:postId/comments</div>
                <div className="text-gray-600">{"{ \"content\": \"Great post!\" }"}</div>
                
                <div className="mt-4 mb-2 text-gray-700"># Share a post</div>
                <div className="text-blue-600">POST /api/posts/:postId/share</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">3. Expected Behavior</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Connection events</strong>: Notifications appear with blue border and 👥 icon</li>
                <li><strong>Interaction events</strong>: Notifications appear with purple border and specific icons (❤️, 💬, 🔄, etc.)</li>
                <li><strong>Real-time</strong>: Notifications should appear instantly without page refresh</li>
                <li><strong>Connection log</strong>: Shows all socket events and status changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
