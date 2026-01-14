/**
 * Interaction Model - TypeScript interfaces for interaction-related data structures
 * Matches the b2b_dev.interactions table schema
 */

export interface InteractionType {
  type: 'like' | 'dislike' | 'comment' | 'reply' | 'share' | 'save' | 'unsave' | 'report';
  content?: string; // For comments and replies
  reason?: string; // For reports
  share_userid?: string; // For shares
  parent_comment_id?: string; // For replies
  timestamp: string; // ISO timestamp
}

export interface Interaction {
  id?: string;
  user_id: string;
  post_id: string;
  interaction_type: InteractionType;
  created_at?: Date;
  updated_at?: Date;
}

// Request interfaces for each interaction type
export interface LikeInteractionRequest {
  post_id: string;
}

export interface DislikeInteractionRequest {
  post_id: string;
}

export interface CommentInteractionRequest {
  post_id: string;
  comment_text: string;
}

export interface ReplyInteractionRequest {
  post_id: string;
  comment_id: string;
  reply_text: string;
}

export interface ShareInteractionRequest {
  post_id: string;
  share_userid: string;
}

export interface SaveInteractionRequest {
  post_id: string;
}

export interface UnsaveInteractionRequest {
  post_id: string;
}

export interface ReportInteractionRequest {
  post_id: string;
  reason: string;
}

// Response interfaces
export interface InteractionResponse {
  interaction_id: string;
  user_id: string;
  post_id: string;
  interaction_type: InteractionType;
}

export interface InteractionSuccessResponse {
  status: number;
  message: string;
  success: boolean;
  data: InteractionResponse | null;
}

export interface InteractionErrorResponse {
  status: number;
  message: string;
  success: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// Service interfaces
export interface CreateInteractionParams {
  user_id: string;
  post_id: string;
  interaction_type: InteractionType;
}

export interface InteractionValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Configuration for interaction types
export interface InteractionConfig {
  action: 'create' | 'delete';
  updateCounter?: 'likes' | 'comments' | 'shares' | 'saves' | undefined;
  storeInComments?: boolean;
  jsonbStructure: Partial<InteractionType>;
}

export const INTERACTION_CONFIG: Record<string, InteractionConfig> = {
  like: { 
    action: 'create', 
    updateCounter: 'likes',
    jsonbStructure: { type: 'like', timestamp: '' }
  },
  dislike: { 
    action: 'delete', 
    updateCounter: 'likes',
    jsonbStructure: { type: 'dislike', timestamp: '' }
  },
  comment: { 
    action: 'create', 
    updateCounter: 'comments',
    storeInComments: true,
    jsonbStructure: { type: 'comment', content: '', timestamp: '' }
  },
  reply: { 
    action: 'create', 
    updateCounter: 'comments',
    storeInComments: true,
    jsonbStructure: { type: 'reply', content: '', parent_comment_id: '', timestamp: '' }
  },
  share: { 
    action: 'create', 
    updateCounter: 'shares',
    jsonbStructure: { type: 'share', share_userid: '', timestamp: '' }
  },
  save: { 
    action: 'create', 
    updateCounter: 'saves',
    jsonbStructure: { type: 'save', timestamp: '' }
  },
  unsave: { 
    action: 'delete', 
    updateCounter: 'saves',
    jsonbStructure: { type: 'unsave', timestamp: '' }
  },
  report: { 
    action: 'create', 
    updateCounter: undefined,
    jsonbStructure: { type: 'report', reason: '', timestamp: '' }
  }
};
