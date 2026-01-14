/**
 * Socket.IO Type Definitions
 * Custom types for Socket.IO integration
 */

export interface SocketUserData {
  userId: string;
  email: string;
}

export interface UserProfileInfo {
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

export interface InteractionNotificationPayload {
  type: 'like' | 'comment' | 'reply' | 'share' | 'save' | 'report';
  postId: string;
  postOwnerId: string;
  interactorId: string;
  interactorName?: string;
  message: string;
  timestamp: Date;
  metadata?: InteractionMetadata;
  interactorProfile?: UserProfileInfo;
}

export interface ConnectionNotificationPayload {
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  senderId: string;
  message: string;
  timestamp: Date;
  metadata?: ConnectionMetadata;
  senderProfile?: UserProfileInfo;
}

// Resume evaluation status streaming
export type ResumeStatusStep =
  | 'upload'
  | 'parsability_check'
  | 'ocr'
  | 'parsing'
  | 'grading'
  | 'completed'
  | 'failed';

export type ResumeStatusState = 'in_progress' | 'completed' | 'failed';

export interface ResumeStatusPayload {
  evaluationId: string;
  step: ResumeStatusStep;
  status: ResumeStatusState;
  details?: string;
  fileId?: string;
  fileUrl?: string;
  jobName?: string;
  jobDescription?: string;
  progress?: number; // Optional percentage hint for UI
  scores?: {
    overall?: number;
    ats?: number;
    keyword?: number;
    format?: number;
    experience?: number;
  };
  error?: string;
  timestamp?: string;
}

export interface ConnectionMetadata {
  notificationId?: string;
  connectionId?: string;
  [key: string]: any;
}

export interface InteractionMetadata {
  commentText?: string;
  replyText?: string;
  commentId?: string;
  sharedWithUserId?: string;
  reason?: string;
  [key: string]: any;
}

export interface SocketConnectionData {
  message: string;
  userId: string;
  socketId: string;
  timestamp: Date;
}

export interface SocketJoinData {
  userId: string;
}

declare module 'socket.io' {
  interface SocketData extends SocketUserData {}
}
