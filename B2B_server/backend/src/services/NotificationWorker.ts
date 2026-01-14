import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import { database } from '../config/database';
import { config } from '../config/env';
import { 
  NotificationJobData, 
  PermissionValidationResult, 
  UserPreferences,
  DeliveryChannel
} from '../types/notification.types';
import { NotificationModel } from '../models/Notification';
import { NotificationPreferenceModel } from '../models/NotificationPreference';
import { NotificationAuditModel } from '../models/NotificationAudit';
import { DeliveryCoordinator } from './DeliveryCoordinator';

const QUEUE_NAME = 'notification-queue';

export class NotificationWorker extends Worker<NotificationJobData, any, string> {
  private notificationModel: NotificationModel;
  private notificationPreferenceModel: NotificationPreferenceModel;
  private notificationAuditModel: NotificationAuditModel;
  private deliveryCoordinator: DeliveryCoordinator;

  constructor() {
    super(QUEUE_NAME, async (job: Job<NotificationJobData>) => {
      return await this.processNotification(job);
    }, {
      connection: redis,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 60000, // 60 seconds
      },
    });

    // Initialize database models
    const pool = database.getPool();
    this.notificationModel = new NotificationModel(pool);
    this.notificationPreferenceModel = new NotificationPreferenceModel(pool);
    this.notificationAuditModel = new NotificationAuditModel(pool);
    this.deliveryCoordinator = new DeliveryCoordinator(pool);

    this.setupEventHandlers();
  }

  /**
   * Setup worker event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {

    this.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    this.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  /**
   * Main notification processing orchestration method
   * Coordinates all steps: validation, preferences, persistence, delivery, and audit logging
   */
  async processNotification(job: Job<NotificationJobData>): Promise<any> {
    const correlationId = `notif_${job.id}_${Date.now()}`;
    
    try {
      const { userId, senderId, recipientId, type } = job.data;

      // Step 1: Validate sender permissions
      const permissionResult = await this.validatePermissions(
        senderId || userId,
        recipientId || userId,
        type
      );

      if (!permissionResult.isValid) {
        await this.logDeliveryStatus(job, 'failed', 'validation', new Error(permissionResult.reason));
        throw new Error(`Permission validation failed: ${permissionResult.reason}`);
      }

      // Step 2: Check user preferences for delivery channels
      const userPreferences = await this.checkPreferences(userId, type);

      // Step 3: Persist notification to database
      const notification = await this.persistNotification(job);

      // Step 4: Coordinate multi-channel delivery
      const deliveryResults = await this.deliveryCoordinator.coordinateDelivery(
        job,
        userPreferences.enabledChannels,
        notification.id,
        correlationId
      );

      // Step 5: Log final delivery status
      await this.logDeliveryStatus(job, 'success', 'all_channels', undefined, notification.id);

      return {
        success: true,
        notificationId: notification.id,
        deliveryResults,
        correlationId,
      };
    } catch (error) {
      console.error(`[${correlationId}] Notification processing failed:`, error);
      await this.logDeliveryStatus(job, 'failed', 'processing', error as Error);
      throw error;
    }
  }

  /**
   * Validate sender permissions with comprehensive business rules
   * Checks user active status, company relationships, and role-based permissions
   */
  async validatePermissions(
    senderId: string,
    recipientId: string,
    notificationType: string
  ): Promise<PermissionValidationResult> {
    try {
      // Query both sender and recipient user status in a single database call
      const userQuery = `
        SELECT id, active, deleted_at
        FROM "${config.DB_SCHEMA}".users
        WHERE id = ANY($1::uuid[])
      `;
      
      const result = await database.getPool().query(userQuery, [[senderId, recipientId]]);
      const users = result.rows;

      const sender = users.find((u: any) => u.id === senderId);
      const recipient = users.find((u: any) => u.id === recipientId);

      // Validate sender exists and is active
      if (!sender || !sender.active || sender.deleted_at) {
        return {
          isValid: false,
          reason: 'Sender account is not active or does not exist',
          senderId,
          recipientId,
          notificationType,
        };
      }

      // Validate recipient exists and is active
      if (!recipient || !recipient.active || recipient.deleted_at) {
        return {
          isValid: false,
          reason: 'Recipient account is not active or does not exist',
          senderId,
          recipientId,
          notificationType,
        };
      }

      // TODO: Add company relationship validation when company tables are available
      // - Verify sender and recipient belong to related companies
      // - Check B2B connection status between companies
      // - Validate company subscription status

      // TODO: Add role-based permission checks
      // - Verify sender role has permission to send this notification type
      // - Check recipient role allows receiving this notification type

      return {
        isValid: true,
        senderId,
        recipientId,
        notificationType,
      };
    } catch (error) {
      console.error('Permission validation error:', error);
      return {
        isValid: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        senderId,
        recipientId,
        notificationType,
      };
    }
  }

  /**
   * Check user notification preferences and return enabled delivery channels
   * Returns defaults if no preferences are set
   */
  async checkPreferences(userId: string, notificationType: string): Promise<UserPreferences> {
    try {
      const preferences = await this.notificationPreferenceModel.findByUserId(userId);
      
      // Find preference for this specific notification type
      const typePreference = preferences.find(p => p.type === notificationType);

      // If no preferences found or preferences disabled, use defaults
      if (!typePreference || !typePreference.enabled) {
        return {
          userId,
          enabledChannels: ['in_app'], // Default to in-app only
          preferences: {
            email: false,
            in_app: true,
          },
        };
      }

      // Build enabled channels array based on preferences
      const enabledChannels: DeliveryChannel[] = [];
      if (typePreference.email) enabledChannels.push('email');
      if (typePreference.in_app) enabledChannels.push('in_app');

      return {
        userId,
        enabledChannels,
        preferences: {
          email: typePreference.email,
          in_app: typePreference.in_app,
        },
      };
    } catch (error) {
      console.error('Error checking preferences, using defaults:', error);
      // On error, default to in-app notifications only
      return {
        userId,
        enabledChannels: ['in_app'],
        preferences: {
          email: false,
          in_app: true,
        },
      };
    }
  }

  /**
   * Persist notification to database
   * Creates a permanent record of the notification for retrieval and audit
   */
  async persistNotification(job: Job<NotificationJobData>): Promise<any> {
    try {
      const notification = await this.notificationModel.create({
        user_id: job.data.userId,
        content: job.data.content,
        payload: job.data,
        type: job.data.type,
        read: false,
        delivery_method: 'in_app', // Primary delivery method
      });

      return notification;
    } catch (error) {
      console.error('Failed to persist notification:', error);
      throw new Error(`Notification persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log delivery status to audit table for monitoring and debugging
   * Captures success, failure, and retry attempts with detailed context
   */
  async logDeliveryStatus(
    job: Job<NotificationJobData>,
    status: 'pending' | 'success' | 'failed' | 'retrying',
    channel: string,
    error?: Error,
    notificationId?: string
  ): Promise<void> {
    try {
      await this.notificationAuditModel.logEvent({
        event: `notification_${status}`,
        job_id: String(job.id),
        status,
        retries: job.attemptsMade,
        error_log: error ? `${error.message}\n${error.stack}` : null,
        notification_id: notificationId || null,
        user_id: job.data.userId,
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't throw - audit logging failure shouldn't stop processing
    }
  }
}

