/**
 * Notification Summary Bar Component
 * Displays a dismissible bar showing notification counts after login
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Users, Building2, X } from 'lucide-react';
import { InlineNotificationBadge } from '@/components/ui/notification-badge';
import { cn } from '@/lib/utils';

export interface NotificationSummaryBarProps {
  /** User ID for per-account dismissal tracking */
  userId: string;
  /** Number of unread notifications */
  unreadCount: number;
  /** Number of pending connection requests */
  pendingConnectionsCount: number;
  /** Number of company/business invitations */
  companyInvitationsCount?: number;
  /** Show on first load only (default: true) */
  showOnce?: boolean;
  /** Custom className */
  className?: string;
  /** Auto-hide after duration in milliseconds (0 = never auto-hide) */
  autoHideDuration?: number;
}

/**
 * Summary bar component for displaying notification overview
 * Shows after login with counts of notifications, connection requests, and invitations
 * 
 * @example
 * ```tsx
 * <NotificationSummaryBar
 *   unreadCount={5}
 *   pendingConnectionsCount={3}
 *   companyInvitationsCount={2}
 *   showOnce={true}
 *   autoHideDuration={10000}
 * />
 * ```
 */
export function NotificationSummaryBar({
  userId,
  unreadCount,
  pendingConnectionsCount,
  companyInvitationsCount = 0,
  showOnce = true,
  className,
  autoHideDuration = 0,
}: NotificationSummaryBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const totalCount = unreadCount + pendingConnectionsCount + companyInvitationsCount;

  useEffect(() => {
    // Prevent multiple checks
    if (hasChecked) return;
    setHasChecked(true);

    // Don't show if no notifications
    if (totalCount === 0) {
      setIsVisible(false);
      return;
    }

    // Use localStorage with timestamp to track when summary was last shown
    const localStorageKey = `notification-summary-dismissed-${userId}`;
    
    try {
      const dismissedData = localStorage.getItem(localStorageKey);
      
      if (dismissedData) {
        try {
          const { timestamp } = JSON.parse(dismissedData);
          const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
          const timeSinceDismissed = Date.now() - timestamp;
        
          // If less than 24 hours have passed, don't show
          if (timeSinceDismissed < twentyFourHoursInMs) {
            console.log(`Notification summary dismissed ${Math.floor(timeSinceDismissed / 1000 / 60)} minutes ago, skipping`);
            setIsVisible(false);
            return;
          } else {
            console.log('24 hours have passed since last dismissal, showing notification summary');
            // 24 hours passed, clear the old dismissal
            localStorage.removeItem(localStorageKey);
          }
        } catch (parseError) {
          // Invalid JSON, clear it and show the summary
          console.error('Error parsing notification dismissal data:', parseError);
          localStorage.removeItem(localStorageKey);
        }
      }

      // Show the bar
      console.log('Showing notification summary for the first time or after 24 hours');
      setIsVisible(true);

      // Auto-hide after duration
      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error checking notification summary status:', error);
      // On error, show the summary
      setIsVisible(true);
    }
  }, [totalCount, showOnce, autoHideDuration, userId, hasChecked]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    
    // Save dismissal timestamp to localStorage
    const localStorageKey = `notification-summary-dismissed-${userId}`;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({
        timestamp: Date.now(),
        dismissed: true
      }));
      console.log('Notification summary dismissed and saved to localStorage');
    } catch (error) {
      console.error('Error saving notification summary dismissal:', error);
    }
  };

  // Don't render if no notifications or dismissed
  if (totalCount === 0 || isDismissed) {
    return null;
  }

  const items = [
    {
      icon: Bell,
      label: 'Notification',
      count: unreadCount,
      href: '/notifications',
      show: unreadCount > 0,
    },
    {
      icon: Users,
      label: 'Connection Request',
      count: pendingConnectionsCount,
      href: '/connections',
      show: pendingConnectionsCount > 0,
    },
    {
      icon: Building2,
      label: 'Company Invitation',
      count: companyInvitationsCount,
      href: '/businesses', // Update this when company invitations are implemented
      show: companyInvitationsCount > 0,
    },
  ].filter((item) => item.show);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-50',
            'max-w-2xl w-[calc(100%-2rem)] mx-auto',
            className
          )}
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    You have {totalCount} pending {totalCount === 1 ? 'item' : 'items'}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={handleDismiss}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
                    >
                      <item.icon className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                        {item.count} {item.label}
                        {item.count !== 1 ? 's' : ''}
                      </span>
                      <InlineNotificationBadge count={item.count} size="sm" />
                    </Link>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                aria-label="Dismiss notification summary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to reset the notification summary dismissal for a specific user
 * Call this to force show the summary again (e.g., for testing or admin override)
 * Clears the dismissal flag so summary shows on next mount
 */
export function resetNotificationSummaryDismissal(userId?: string) {
  if (userId) {
    const localStorageKey = `notification-summary-dismissed-${userId}`;
    
    // Clear the dismissal flag so it will display on next mount
    try {
      localStorage.removeItem(localStorageKey);
      console.log('Notification summary dismissal reset for user:', userId);
    } catch (error) {
      console.error('Error resetting notification summary:', error);
    }
  }
}

/**
 * Clear all notification summary data on logout
 * Call this when user logs out to ensure clean state for next session
 */
export function clearNotificationSummaryData() {
  try {
    // Remove all notification summary related keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('notification-summary-dismissed-')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('Cleared all notification summary dismissal data');
  } catch (error) {
    console.error('Error clearing notification summary data:', error);
  }
}
