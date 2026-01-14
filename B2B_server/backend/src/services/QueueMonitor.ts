import { Queue } from 'bullmq';
import type { JobStatus } from '../types/notification.types';
import redis from '../config/redis';

export class QueueMonitor {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async cleanupCompletedJobs(maxAgeSeconds: number, maxCount: number) {
    const jobs = await this.queue.getCompleted();
    const now = Date.now();
    let removed = 0;
    for (const job of jobs) {
      const age = (now - (job.finishedOn || 0)) / 1000;
      if (age > maxAgeSeconds && removed < maxCount) {
        await job.remove();
        removed++;
      }
    }
    return { removed };
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    return {
      jobId: String(job.id),
      status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : job.processedOn ? 'active' : 'waiting',
      progress: job.progress as number,
      created_at: new Date(job.timestamp).toISOString(),
      processed_at: job.processedOn ? new Date(job.processedOn).toISOString() : '',
      queue_name: this.queue.name,
      priority: (job.opts.priority === 1 ? 'urgent' : job.opts.priority === 2 ? 'high' : job.opts.priority === 4 ? 'low' : 'normal'),
      attempts: job.attemptsMade,
      max_attempts: job.opts.attempts || 3,
      next_retry: job.failedReason ? (job.opts.backoff ? 'scheduled' : null) : null,
      payload: job.data,
    };
  }
}

export default QueueMonitor;
