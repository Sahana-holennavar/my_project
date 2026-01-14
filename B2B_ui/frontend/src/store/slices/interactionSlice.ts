import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api';
import type { RootState } from '../index';

// Types for Interactions
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    avatar?: string;
    user_type: string;
  };
}

export interface InteractionState {
  // User interactions tracking
  likedPosts: string[];
  savedPosts: string[];
  reportedPosts: string[];
  
  // Comments for posts
  postComments: { [postId: string]: Comment[] };
  
  // Loading states
  loading: {
    like: boolean;
    save: boolean;
    comment: boolean;
    share: boolean;
    report: boolean;
  };
  
  // Error states
  error: string | null;
  
  // UI states
  commentModalOpen: boolean;
  shareModalOpen: boolean;
  reportModalOpen: boolean;
  currentPostId: string | null;
}

const initialState: InteractionState = {
  likedPosts: [],
  savedPosts: [],
  reportedPosts: [],
  postComments: {},
  loading: {
    like: false,
    save: false,
    comment: false,
    share: false,
    report: false,
  },
  error: null,
  commentModalOpen: false,
  shareModalOpen: false,
  reportModalOpen: false,
  currentPostId: null,
};

// API Response Types
interface ApiResponse<T> {
  status: number;
  message: string;
  success: boolean;
  data: T;
}

interface LikeResponse {
  post_id: string;
  liked: boolean;
  likes_count: number;
}

interface CommentResponse {
  comment: Comment;
  comments_count: number;
}

interface ShareResponse {
  post_id: string;
  shared: boolean;
  shares_count: number;
}

interface SaveResponse {
  post_id: string;
  saved: boolean;
  saves_count: number;
}

interface ReportResponse {
  post_id: string;
  reported: boolean;
  reason: string;
}

// Async Thunks
export const likePost = createAsyncThunk<
  LikeResponse,
  { postId: string },
  { rejectValue: string }
>(
  'interactions/likePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<LikeResponse>>(
        '/interactions/like',
        { post_id: postId }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to like post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to like post');
    }
  }
);

export const unlikePost = createAsyncThunk<
  LikeResponse,
  { postId: string },
  { rejectValue: string }
>(
  'interactions/unlikePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<LikeResponse>>(
        '/interactions/dislike',
        { post_id: postId }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to unlike post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to unlike post');
    }
  }
);

export const commentOnPost = createAsyncThunk<
  CommentResponse,
  { postId: string; commentText: string },
  { rejectValue: string }
>(
  'interactions/commentOnPost',
  async ({ postId, commentText }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<CommentResponse>>(
        '/interactions/comment',
        { 
          post_id: postId, 
          comment_text: commentText 
        }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to comment on post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to comment on post');
    }
  }
);

export const sharePost = createAsyncThunk<
  ShareResponse,
  { postId: string; shareUserId?: string },
  { rejectValue: string }
>(
  'interactions/sharePost',
  async ({ postId, shareUserId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<ShareResponse>>(
        '/interactions/share',
        { 
          post_id: postId,
          share_userid: shareUserId 
        }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to share post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to share post');
    }
  }
);

export const savePost = createAsyncThunk<
  SaveResponse,
  { postId: string },
  { rejectValue: string }
>(
  'interactions/savePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<SaveResponse>>(
        '/interactions/save',
        { post_id: postId }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to save post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save post');
    }
  }
);

export const unsavePost = createAsyncThunk<
  SaveResponse,
  { postId: string },
  { rejectValue: string }
>(
  'interactions/unsavePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<SaveResponse>>(
        '/interactions/unsave',
        { post_id: postId }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to unsave post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to unsave post');
    }
  }
);

export const reportPost = createAsyncThunk<
  ReportResponse,
  { postId: string; reason: string },
  { rejectValue: string }
>(
  'interactions/reportPost',
  async ({ postId, reason }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse<ReportResponse>>(
        '/interactions/report',
        { 
          post_id: postId, 
          reason: reason 
        }
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to report post');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to report post');
    }
  }
);

export const fetchPostComments = createAsyncThunk<
  { postId: string; comments: Comment[] },
  { postId: string },
  { rejectValue: string }
>(
  'interactions/fetchPostComments',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<{ comments: Comment[] }>>(
        `/interactions/comments/${postId}`
      );
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch comments');
      }
      
      return { postId, comments: response.data.comments };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch comments');
    }
  }
);

const interactionSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    // UI State Management
    openCommentModal: (state, action: PayloadAction<string>) => {
      state.commentModalOpen = true;
      state.currentPostId = action.payload;
    },
    
    closeCommentModal: (state) => {
      state.commentModalOpen = false;
      state.currentPostId = null;
    },
    
    openShareModal: (state, action: PayloadAction<string>) => {
      state.shareModalOpen = true;
      state.currentPostId = action.payload;
    },
    
    closeShareModal: (state) => {
      state.shareModalOpen = false;
      state.currentPostId = null;
    },
    
    openReportModal: (state, action: PayloadAction<string>) => {
      state.reportModalOpen = true;
      state.currentPostId = action.payload;
    },
    
    closeReportModal: (state) => {
      state.reportModalOpen = false;
      state.currentPostId = null;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Initialize user interactions (for when user logs in)
    initializeUserInteractions: (state, action: PayloadAction<{
      likedPosts: string[];
      savedPosts: string[];
      reportedPosts: string[];
    }>) => {
      state.likedPosts = action.payload.likedPosts;
      state.savedPosts = action.payload.savedPosts;
      state.reportedPosts = action.payload.reportedPosts;
    },
    
    // Clear all interactions (for when user logs out)
    clearUserInteractions: (state) => {
      state.likedPosts = [];
      state.savedPosts = [];
      state.reportedPosts = [];
      state.postComments = {};
    },
    
    // Optimistic like toggle (for immediate UI feedback)
    toggleLikeOptimistic: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const index = state.likedPosts.indexOf(postId);
      if (index > -1) {
        state.likedPosts.splice(index, 1);
      } else {
        state.likedPosts.push(postId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Like Post
      .addCase(likePost.pending, (state) => {
        state.loading.like = true;
        state.error = null;
      })
      .addCase(likePost.fulfilled, (state, action) => {
        state.loading.like = false;
        state.error = null;
        const payload = action.payload as LikeResponse | null;
        if (!payload) return;
        const { post_id, liked } = payload;

        if (liked) {
          if (!state.likedPosts.includes(post_id)) {
            state.likedPosts.push(post_id);
          }
        } else {
          state.likedPosts = state.likedPosts.filter(id => id !== post_id);
        }
      })
      .addCase(likePost.rejected, (state, action) => {
        state.loading.like = false;
        state.error = action.payload || 'Failed to like post';
      })
      
      // Unlike Post
      .addCase(unlikePost.pending, (state) => {
        state.loading.like = true;
        state.error = null;
      })
      .addCase(unlikePost.fulfilled, (state, action) => {
        state.loading.like = false;
        state.error = null;
        const payload = action.payload as LikeResponse | null;
        if (!payload) return;
        const { post_id, liked } = payload;

        if (liked) {
          if (!state.likedPosts.includes(post_id)) {
            state.likedPosts.push(post_id);
          }
        } else {
          state.likedPosts = state.likedPosts.filter(id => id !== post_id);
        }
      })
      .addCase(unlikePost.rejected, (state, action) => {
        state.loading.like = false;
        state.error = action.payload || 'Failed to unlike post';
      })
      
      // Comment on Post
      .addCase(commentOnPost.pending, (state) => {
        state.loading.comment = true;
        state.error = null;
      })
      .addCase(commentOnPost.fulfilled, (state, action) => {
        state.loading.comment = false;
        state.error = null;
        const payload = action.payload as CommentResponse | null;
        if (!payload) return;
        // const { comment } = payload;

        // Add comment to the post's comments
        // if (!state.postComments[comment.post_id]) {
        //   state.postComments[comment.post_id] = [];
        // }
        // state.postComments[comment.post_id].push(comment);
      })
      .addCase(commentOnPost.rejected, (state, action) => {
        state.loading.comment = false;
        state.error = action.payload || 'Failed to comment on post';
      })
      
      // Share Post
      .addCase(sharePost.pending, (state) => {
        state.loading.share = true;
        state.error = null;
      })
      .addCase(sharePost.fulfilled, (state) => {
        state.loading.share = false;
        state.error = null;
        // Share count is updated in the feed slice
      })
      .addCase(sharePost.rejected, (state, action) => {
        state.loading.share = false;
        state.error = action.payload || 'Failed to share post';
      })
      
      // Save Post
      .addCase(savePost.pending, (state) => {
        state.loading.save = true;
        state.error = null;
      })
      .addCase(savePost.fulfilled, (state, action) => {
        state.loading.save = false;
        state.error = null;
        const payload = action.payload as SaveResponse | null;
        if (!payload) return;
        const { post_id, saved } = payload;

        if (saved) {
          if (!state.savedPosts.includes(post_id)) {
            state.savedPosts.push(post_id);
          }
        } else {
          state.savedPosts = state.savedPosts.filter(id => id !== post_id);
        }
      })
      .addCase(savePost.rejected, (state, action) => {
        state.loading.save = false;
        state.error = action.payload || 'Failed to save post';
      })
      
      // Unsave Post
      .addCase(unsavePost.pending, (state) => {
        state.loading.save = true;
        state.error = null;
      })
      .addCase(unsavePost.fulfilled, (state, action) => {
        state.loading.save = false;
        state.error = null;
        const payload = action.payload as SaveResponse | null;
        if (!payload) return;
        const { post_id, saved } = payload;

        if (saved) {
          if (!state.savedPosts.includes(post_id)) {
            state.savedPosts.push(post_id);
          }
        } else {
          state.savedPosts = state.savedPosts.filter(id => id !== post_id);
        }
      })
      .addCase(unsavePost.rejected, (state, action) => {
        state.loading.save = false;
        state.error = action.payload || 'Failed to unsave post';
      })
      
      // Report Post
      .addCase(reportPost.pending, (state) => {
        state.loading.report = true;
        state.error = null;
      })
      .addCase(reportPost.fulfilled, (state, action) => {
        state.loading.report = false;
        state.error = null;
        const payload = action.payload as ReportResponse | null;
        if (!payload) return;
        const { post_id, reported } = payload;

        if (reported) {
          if (!state.reportedPosts.includes(post_id)) {
            state.reportedPosts.push(post_id);
          }
        }
      })
      .addCase(reportPost.rejected, (state, action) => {
        state.loading.report = false;
        state.error = action.payload || 'Failed to report post';
      })
      
      // Fetch Post Comments
      .addCase(fetchPostComments.pending, (state) => {
        state.loading.comment = true;
        state.error = null;
      })
      .addCase(fetchPostComments.fulfilled, (state, action) => {
        state.loading.comment = false;
        state.error = null;
        const payload = action.payload as { postId: string; comments: Comment[] } | null;
        if (!payload) return;
        const { postId, comments } = payload;
        state.postComments[postId] = comments;
      })
      .addCase(fetchPostComments.rejected, (state, action) => {
        state.loading.comment = false;
        state.error = action.payload || 'Failed to fetch comments';
      });
  },
});

export const {
  openCommentModal,
  closeCommentModal,
  openShareModal,
  closeShareModal,
  openReportModal,
  closeReportModal,
  clearError,
  initializeUserInteractions,
  clearUserInteractions,
  toggleLikeOptimistic,
} = interactionSlice.actions;

export default interactionSlice.reducer;

// Selectors
export const selectLikedPosts = (state: RootState) => state.interactions.likedPosts;
export const selectSavedPosts = (state: RootState) => state.interactions.savedPosts;
export const selectReportedPosts = (state: RootState) => state.interactions.reportedPosts;
export const selectPostComments = (state: RootState) => state.interactions.postComments;
export const selectInteractionLoading = (state: RootState) => state.interactions.loading;
export const selectInteractionError = (state: RootState) => state.interactions.error;
export const selectCommentModalOpen = (state: RootState) => state.interactions.commentModalOpen;
export const selectShareModalOpen = (state: RootState) => state.interactions.shareModalOpen;
export const selectReportModalOpen = (state: RootState) => state.interactions.reportModalOpen;
export const selectCurrentPostId = (state: RootState) => state.interactions.currentPostId;

// Helper selectors
export const selectIsPostLiked = (postId: string) => (state: RootState) => 
  state.interactions.likedPosts.includes(postId);

export const selectIsPostSaved = (postId: string) => (state: RootState) => 
  state.interactions.savedPosts.includes(postId);

export const selectIsPostReported = (postId: string) => (state: RootState) => 
  state.interactions.reportedPosts.includes(postId);

export const selectCommentsForPost = (postId: string) => (state: RootState) => 
  state.interactions.postComments[postId] || [];
