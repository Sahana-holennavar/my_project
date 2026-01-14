/**
 * Notification Summary Wrapper
 * Wraps NotificationSummaryBar with auth context
 */
'use client';

import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { NotificationSummaryBar } from './NotificationSummaryBar';
import { useAppSelector } from '@/store/hooks';

export function NotificationSummaryWrapper() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { counts } = useNotificationCounts({
    autoFetch: true,
    enablePolling: false, // Don't poll for the summary bar, just fetch once
  });

  // Only show if authenticated
  if (!isAuthenticated || !user) {
    
    return null;
  }

  return (
    <NotificationSummaryBar
      userId={user.id}
      unreadCount={counts.unreadCount}
      pendingConnectionsCount={counts.pendingConnectionsCount}
      companyInvitationsCount={counts.companyInvitationsCount}
      showOnce={true}
      autoHideDuration={15000} // Auto-hide after 15 seconds
    />
  );
}
