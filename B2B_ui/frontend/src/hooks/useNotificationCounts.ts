/**
 * React Hook for Notification Counts
 * Fetches notification counts via straight API call (not socket)
 * Use this after login to display notification badges
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getNotifications } from '@/lib/api/notifications';
import { useAppSelector } from '@/store/hooks';

export interface NotificationCounts {
  /** Total unread notifications count */
  unreadCount: number;
  /** Pending connection requests count */
  pendingConnectionsCount: number;
  /** Company/Business invitations count (placeholder for future implementation) */
  companyInvitationsCount: number;
  /** Total count of all notifications */
  totalCount: number;
}

export interface UseNotificationCountsOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollingInterval?: number;
  /** Enable polling (default: false) */
  enablePolling?: boolean;
}

export interface UseNotificationCountsReturn {
  /** Notification counts */
  counts: NotificationCounts;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Manually refresh counts */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage notification counts
 * @param options - Configuration options
 * @returns Notification counts and utilities
 * 
 * @example
 * ```tsx
 * const { counts, isLoading, refresh } = useNotificationCounts({
 *   autoFetch: true,
 *   enablePolling: true,
 *   pollingInterval: 60000 // 1 minute
 * });
 * 
 * // Display counts
 * <Badge count={counts.unreadCount} />
 * <Badge count={counts.pendingConnectionsCount} />
 * ```
 */
export function useNotificationCounts(
  options: UseNotificationCountsOptions = {}
): UseNotificationCountsReturn {
  const {
    autoFetch = true,
    pollingInterval = 30000,
    enablePolling = false,
  } = options;

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [counts, setCounts] = useState<NotificationCounts>({
    unreadCount: 0,
    pendingConnectionsCount: 0,
    companyInvitationsCount: 0,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notification counts from API
   */
  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) {
      // Reset counts if not authenticated
      setCounts({
        unreadCount: 0,
        pendingConnectionsCount: 0,
        companyInvitationsCount: 0,
        totalCount: 0,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch notifications with minimal data (just need counts)
      const response = await getNotifications({
        page: 1,
        limit: 1, // We only need counts, not actual data
      });

      if (response.success && response.data) {
        const newCounts: NotificationCounts = {
          unreadCount: response.data.unread_count || 0,
          pendingConnectionsCount: response.data.pending_count || 0,
          companyInvitationsCount: 0, // TODO: Add when company invitations API is available
          totalCount: response.data.total || 0,
        };

        setCounts(newCounts);
      } else {
        setError(response.message || 'Failed to fetch notification counts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Error fetching notification counts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchCounts();
    }
  }, [autoFetch, isAuthenticated, fetchCounts]);

  // Polling
  useEffect(() => {
    if (!enablePolling || !isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      fetchCounts();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, isAuthenticated, pollingInterval, fetchCounts]);

  return {
    counts,
    isLoading,
    error,
    refresh: fetchCounts,
  };
}
