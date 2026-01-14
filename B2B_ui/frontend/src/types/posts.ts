export interface MediaFile {
  file: File;
  type: 'image' | 'video';
  url: string; // blob URL for preview
  name: string;
  size: number;
}

export interface MediaContent {
  url: string;
  type: 'image' | 'video';
}

export interface PostContent {
  text: string;
  mentions: string[];
  media: MediaContent[];
}

export interface Post {
  user_id: string;
  content: PostContent[];
  audience: 'public' | 'private' | 'connections';
  tags: string[];
  created_at: string;
  shares: number;
  saves: number;
  likes: number;
  comments: number;
  reposts: number;
  id?: string;
}

export interface CreatePostData {
  content: string;
  type: 'text' | 'image' | 'video';
  audience: 'public' | 'private' | 'connections';
  media?: MediaFile[];
}

export interface CreatePostResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    post: Post;
  };
}

export interface UpdatePostResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    post: Post;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface CreatePostError {
  status: number;
  message: string;
  success: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface CreatePostState {
  loading: boolean;
  success: boolean;
  error: string | null;
  currentPost: CreatePostData | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PreviewData {
  content: string;
  media: MediaFile[];
  audience: 'public' | 'private' | 'connections';
  user: {
    name: string;
    avatar: string;
    fallback: string;
  };
}