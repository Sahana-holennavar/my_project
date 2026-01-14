/**
 * Queue Monitor Helper
 * Wrapper around QueueMonitor for worker and controller use
 * Provides simplified interface for job status retrieval
 */

import notificationQueue from './NotificationQueue';
import { QueueMonitor } from './QueueMonitor';
import type { JobStatus } from '../types/notification.types';

// Initialize monitor with the notification queue instance
const queueMonitor = new QueueMonitor(notificationQueue);

/**
 * Get job status from the notification queue
 * Wrapper function for QueueMonitor.getJobStatus()
 * 
 * @param jobId - The unique job identifier
 * @returns Job status object or null if not found
 */
export async function getJobStatusFromQueue(jobId: string): Promise<JobStatus | null> {
  try {
    const status = await queueMonitor.getJobStatus(jobId);
    
    if (!status) {
      return null;
    }

    return status;
  } catch (error) {
    console.error(`Error retrieving job status for ${jobId}:`, error);
    throw new Error(
      `Failed to retrieve job status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get queue statistics
 * Provides overall queue health metrics
 */
export async function getQueueStatistics() {
  try {
    const stats = await queueMonitor.getQueueStats();
    return stats;
  } catch (error) {
    console.error('Error retrieving queue statistics:', error);
    throw new Error(
      `Failed to retrieve queue statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export { queueMonitor };

