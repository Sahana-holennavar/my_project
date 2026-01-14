import { Queue, JobsOptions, QueueOptions } from 'bullmq';
import redis from '../config/redis';
import type { NotificationJob, NotificationPayload } from '../types/notification.types';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { NotificationModel } from '../models/Notification';
import { NotificationAuditModel } from '../models/NotificationAudit';
import { database } from '../config/database';
// import { validateNotificationJob } from '../utils/validators'; // Will be implemented in next step

const queueName = 'notification-queue';

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, then 2s, then 4s
  },
  removeOnComplete: true,
  removeOnFail: false,
};

const queueOptions: QueueOptions = {
  connection: redis as any,
  defaultJobOptions,
};

export class NotificationQueue extends Queue<NotificationPayload, any, string> {
  private rateLimiter: RateLimiterRedis;
  private notificationModel: NotificationModel;
  private auditModel: NotificationAuditModel;

  constructor() {
    super(queueName, queueOptions);
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'notification-rl',
      points: 100, // max 100 jobs
      duration: 60, // per 60 seconds
    });
    // Initialize models with database pool
    this.notificationModel = new NotificationModel(database.getPool());
    this.auditModel = new NotificationAuditModel(database.getPool());
  }

  async setupRateLimit(senderId: string, isAdmin = false) {
    if (isAdmin) return true;
    try {
      await this.rateLimiter.consume(senderId);
      return true;
    } catch (err) {
      let details = 'Rate limit error';
      if (err instanceof Error) {
        details = err.message;
      }
      await this.auditModel.logEvent({
        event: 'rate_limit_block',
        job_id: null,
        status: 'failed',
        retries: 0,
        error_log: details,
        notification_id: null,
        user_id: senderId,
      });
      throw new Error('Rate limit exceeded for sender');
    }
  }

  async enqueue(jobData: NotificationPayload, priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal', delay = 0, isAdmin = false) {
    // 1. Validate payload (to be implemented in next step)
    // const { error } = validateNotificationJob(jobData);
    // if (error) throw new Error(error.details[0].message);

    // 2. Rate limit check
    if (!jobData.senderId) throw new Error('senderId is required for rate limiting');
    await this.setupRateLimit(jobData.senderId, isAdmin);

    // 3. Persist notification to DB
    // Map jobData to Notification fields as needed
    const notification = await this.notificationModel.create({
      user_id: jobData.userId,
      content: jobData.content,
      payload: jobData,
      type: jobData.type,
      read: false,
      delivery_method: 'in_app',
    });

    // 4. Add job to queue
    const job = await this.add(queueName, jobData, {
      priority: this.mapPriority(priority),
      delay,
    });

    // 5. Log audit event
    await this.auditModel.logEvent({
      event: 'job_enqueued',
      job_id: String(job.id),
      status: 'pending',
      retries: 0,
      error_log: null,
      notification_id: notification.id,
      user_id: jobData.senderId || null,
    });

    return job.id;
  }

  private mapPriority(priority: 'urgent' | 'high' | 'normal' | 'low') {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }
}

export default new NotificationQueue();
