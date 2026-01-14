/**
 * Audit Log Model - TypeScript interfaces for audit logging functionality
 * Handles audit log data structures and event type definitions
 * Updated: December 23, 2025
 */

export interface AuditLog {
  id: string;
  event: AuditEventType;
  user_id: string | null;
  action: string;
  timestamp: Date;
  ip_address: string | null;
}

export interface CreateAuditLogData {
  event: AuditEventType;
  user_id?: string | null;
  action: string;
  ip_address?: string | null;
}

export interface BatchAuditLogData {
  logs: CreateAuditLogData[];
}

export interface FieldChange {
  field: string;
  old_value: any;
  new_value: any;
}

export interface ProfileChangeData {
  user_id: string;
  changes: FieldChange[];
  ip_address?: string | null;
}

// Event types as specified in the ticket
export type AuditEventType = 
  // Authentication Events
  | 'USER_LOGIN'
  | 'USER_REGISTERED'
  | 'LOGIN_FAILED'
  | 'PASSWORD_UPDATED'
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_DELETION'
  | 'TUTORIAL_STATUS_UPDATED'
  // Admin Authentication Events
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGIN_DENIED'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_TOKEN_REFRESHED'
  // Profile Events
  | 'PROFILE_CREATION'
  | 'PROFILE_EDITED'
  | 'USER_AVATAR_UPLOADED'
  | 'USER_BANNER_UPLOADED'
  | 'RESUME_UPLOADED'
  | 'COMPANY_PROFILE_CREATED'
  // Post Events
  | 'POST_CREATED'
  | 'POST_UPDATED'
  // Job Events
  | 'JOB_CREATED'
  | 'JOB_UPDATED'
  | 'JOB_DELETED'
  | 'APPLICATION_REVIEWED'
  // Interaction Events
  | 'POST_LIKED'
  | 'POST_DISLIKED'
  | 'COMMENT_POST'
  | 'REPLY_COMMENT'
  | 'POST_SHARE'
  | 'POST_REPORTED'
  | 'POST_SAVED'
  | 'POST_UNSAVED'
  // Project Events
  | 'PROJECT_CREATED'
  | 'PROJECTS_ACCESSED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  // Private Info Events
  | 'PRIVATE_INFO_ACCESSED'
  | 'PRIVATE_INFO_CREATED'
  | 'PRIVATE_INFO_UPDATED'
  | 'PRIVATE_INFO_DELETED'
  // Contest Events
  | 'CONTEST_CREATED'
  | 'CONTEST_UPDATED'
  | 'CONTEST_DELETED'
  | 'CONTEST_STARTED'
  | 'CONTEST_SUBMISSION'
  | 'CONTEST_WINNER_SELECTED'
  // Admin Operations Events
  | 'ADMIN_DASHBOARD_ACCESSED'
  | 'ADMIN_USERS_LIST_VIEWED'
  | 'ADMIN_USER_DETAILS_VIEWED'
  | 'ADMIN_USER_DEACTIVATED'
  | 'ADMIN_USER_REACTIVATED'
  | 'ADMIN_AUDIT_LOGS_VIEWED'
  | 'ADMIN_ORGANIZATIONS_LIST_VIEWED'
  | 'ADMIN_ORGANIZATION_DETAILS_VIEWED'
  | 'ADMIN_CONTESTS_LIST_VIEWED'
  | 'ADMIN_CONTEST_DETAILS_VIEWED'
  | 'ADMIN_CONTEST_REGISTRATIONS_VIEWED'
  | 'ADMIN_CONTEST_SUBMISSION_VIEWED'
  | 'ADMIN_USERS_EXPORTED'
  | 'ADMIN_CONTESTS_EXPORTED'
  | 'ADMIN_ANALYTICS_VIEWED';

export interface AuditLogResponse {
  success: boolean;
  message: string;
  audit_log_id?: string;
  error?: string;
}

export interface BatchAuditLogResponse {
  success: boolean;
  message: string;
  processed_count: number;
  failed_count: number;
  errors?: string[];
}

// Configuration for batch processing
export interface AuditLogConfig {
  batch_size: number;
  flush_interval_ms: number;
  max_retries: number;
  enable_batching: boolean;
}

// Default configuration
export const DEFAULT_AUDIT_CONFIG: AuditLogConfig = {
  batch_size: 10,
  flush_interval_ms: 5000,
  max_retries: 3,
  enable_batching: true
};
