// Type definitions for Notification Queue System

export interface NotificationPayload {
  userId: string;
  content: string;
  type: string;
  senderId?: string;
  companyId?: string;
  recipientId?: string;
  [key: string]: any;
}

export interface NotificationJob {
  id?: string;
  payload: NotificationPayload;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  createdAt?: string;
  correlationId?: string;
}

export interface RetryConfig {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface RateLimitOptions {
  maxJobs: number;
  duration: number; // in seconds
  keyGenerator: (payload: NotificationPayload) => string;
}

export interface JobStatus {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  created_at: string;
  processed_at?: string;
  queue_name: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  attempts: number;
  max_attempts: number;
  next_retry?: string | null;
  payload: NotificationPayload;
}

export interface B2BPayload {
  senderId: string;
  companyId: string;
  recipientId: string;
  recipientCompanyId: string;
  type: string;
  [key: string]: any;
}

// Notification Worker Types
export type DeliveryChannel = 'email' | 'in_app' | 'socket';

export interface PermissionValidationResult {
  isValid: boolean;
  reason?: string;
  senderId: string;
  recipientId: string;
  notificationType: string;
}

export interface DeliveryError extends Error {
  channel: DeliveryChannel;
  retryable: boolean;
  originalError?: Error;
}

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  error?: DeliveryError;
  timestamp: string;
}

export interface UserPreferences {
  userId: string;
  enabledChannels: DeliveryChannel[];
  preferences: {
    email: boolean;
    in_app: boolean;
  };
}

export type NotificationJobData = NotificationPayload;