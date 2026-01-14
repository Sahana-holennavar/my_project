'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, UserPlus, MessageSquare, Heart, Share2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';

export interface NotificationPopupData {
  id: string;
  type: 'connection' | 'message' | 'like' | 'comment' | 'share' | 'general' | 
        'connection_request' | 'connection_accepted' | 'connection_rejected' | 
        'post_like' | 'post_comment' | 'mention' | 'system';
  title: string;
  message: string;
  avatar?: string;
  userId?: string;
  actionUrl?: string;
  timestamp?: Date;
  action?: () => void;
  actionLabel?: string;
}

interface NotificationPopupProps {
  notification: NotificationPopupData;
  onClose: () => void;
  duration?: number; // Auto-dismiss duration in ms (default: 5000)
  position?: 'top-left' | 'top-center' | 'top-right';
}

const getNotificationIcon = (type: NotificationPopupData['type']) => {
  const iconSize = 16;
  
  switch (type) {
    case 'connection':
    case 'connection_request':
      return <UserPlus size={iconSize} className="text-purple-500" />;
    case 'connection_accepted':
      return <CheckCircle size={iconSize} className="text-green-500" />;
    case 'connection_rejected':
      return <X size={iconSize} className="text-red-500" />;
    case 'message':
      return <MessageSquare size={iconSize} className="text-blue-500" />;
    case 'like':
    case 'post_like':
      return <Heart size={iconSize} className="text-red-500" />;
    case 'comment':
    case 'post_comment':
      return <MessageSquare size={iconSize} className="text-purple-500" />;
    case 'mention':
      return <Info size={iconSize} className="text-indigo-500" />;
    case 'share':
      return <Share2 size={iconSize} className="text-orange-500" />;
    case 'system':
      return <AlertCircle size={iconSize} className="text-yellow-500" />;
    case 'general':
    default:
      return <Bell size={iconSize} className="text-neutral-500" />;
  }
};

const getPositionStyles = (position: NotificationPopupProps['position']) => {
  switch (position) {
    case 'top-left':
      return 'left-4';
    case 'top-right':
      return 'right-6';
    case 'top-center':
    default:
      return 'right-6';
  }
};

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onClose,
  duration = 5000,
  position = 'top-right',
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClick = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    } else if (notification.action) {
      notification.action();
    }
    onClose();
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const getSenderName = () => {
    // Extract first and last name from the full notification context if available
    return notification.title.replace('New Connection Request', '').trim() || 'Someone';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className={`fixed bottom-6 ${getPositionStyles(position)} z-[9999] w-full max-w-sm cursor-pointer`}
      onClick={handleClick}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/70 rounded-3xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getNotificationIcon(notification.type)}
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {notification.title}
            </h3>
          </div>
          <button
            onClick={handleCloseClick}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 z-10 relative transition-colors"
          >
            <X size={16} className="text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {notification.avatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={notification.avatar}
                alt="Avatar"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center flex-shrink-0">
              <UserPlus size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
          )}

          {/* User Info */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-neutral-900 dark:text-white truncate text-sm">
              {getSenderName()}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Container component to manage multiple notifications
interface NotificationContainerProps {
  notifications: NotificationPopupData[];
  onClose: (id: string) => void;
  position?: 'top-left' | 'top-center' | 'top-right';
  maxVisible?: number;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
  position = 'top-right',
  maxVisible = 3,
}) => {
  // Show only the latest notifications up to maxVisible
  const visibleNotifications = notifications.slice(-maxVisible).reverse();

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence mode="sync">
        {visibleNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${16 + index * 100}px`,
              ...(position === 'top-left' && { left: '16px' }),
              ...(position === 'top-right' && { right: '16px' }),
              ...(position === 'top-center' && {
                left: '50%',
                transform: 'translateX(-50%)',
              }),
            }}
          >
            <NotificationPopup
              notification={notification}
              onClose={() => onClose(notification.id)}
              position={position}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook to manage notifications
export const useNotificationPopup = () => {
  const [notifications, setNotifications] = useState<NotificationPopupData[]>([]);

  const showNotification = (notification: Omit<NotificationPopupData, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    
    setNotifications((prev) => {
      const newNotifications = [...prev, { ...notification, id }];
      return newNotifications;
    });
  };

  const closeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    showNotification,
    closeNotification,
    clearAll,
  };
};
