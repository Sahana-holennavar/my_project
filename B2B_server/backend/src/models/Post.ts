/**
 * Post Model - TypeScript interfaces for post-related data structures
 * Matches the b2b_dev.posts table schema
 */

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  filename: string;
  size?: number;
  uploadedAt: string;
}

export interface PostContent {
  text: string;
  mentions: string[];
  hashtags: string[];
}

export interface Post {
  id?: string;
  user_id: string;
  content: PostContent; // JSONB structure
  type: 'text' | 'image' | 'video';
  audience: 'public' | 'private' | 'connections';
  media?: MediaItem[];
  tags?: string[]; // Keep for backward compatibility
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePostData {
  content: string;
  type: 'text' | 'image' | 'video';
  audience: 'public' | 'private' | 'connections';
  media?: MediaItem[] | undefined;
  tags?: string[] | undefined;
  mentions?: string[] | undefined;
}

export interface CreatePostResponse {
  post: Post;
}

// Enhanced post view interfaces
export interface PostAuthor {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface EnhancedPost extends Post {
  author: PostAuthor;
}

export interface PostViewResponse {
  post: EnhancedPost;
}

export interface PostValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ContentModerationResult {
  isAppropriate: boolean;
  flaggedTerms?: string[] | undefined;
  reason?: string | undefined;
}

export interface HashtagExtractionResult {
  hashtags: string[];
}

export interface MentionExtractionResult {
  mentions: string[];
}

// Rate limiting interface
export interface RateLimitInfo {
  userId: string;
  requestCount: number;
  windowStart: Date;
  isLimitExceeded: boolean;
}
