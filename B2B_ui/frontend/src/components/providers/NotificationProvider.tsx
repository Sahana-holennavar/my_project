'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import {
  NotificationContainer,
  useNotificationPopup,
  NotificationPopupData,
} from '@/components/ui/notification-popup';

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationPopupData, 'id'>) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right';
  maxVisible?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'top-right',
  maxVisible = 3,
}) => {
  const { notifications, showNotification, closeNotification, clearAll } =
    useNotificationPopup();

  return (
    <NotificationContext.Provider value={{ showNotification, clearAll }}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onClose={closeNotification}
        position={position}
        maxVisible={maxVisible}
      />
    </NotificationContext.Provider>
  );
};
