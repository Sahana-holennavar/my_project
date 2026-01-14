import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api';
import { postsApi } from '@/lib/api';
import type { MediaFile } from '@/types/posts';

// Types for Feed
export interface FeedPost {
  id: string;
  user_id: string;
  type: 'text' | 'image' | 'video';
  content: {
    text: string;
    hashtags: string[];
    mentions: string[];
  };
  media: Array<{
    url: string;
    size: number;
    type: 'image' | 'video';
    filename: string;
    uploadedAt: string;
  }> | null;
  audience: 'public' | 'private' | 'connections';
  tags: string[];
  views?: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  created_at: string;
  updated_at: string;
  // User info (from join/populate)
  user?: {
    name: string;
    avatar?: string;
    user_type: string;
  };
}

export interface FeedApiResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    posts: FeedPost[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface FeedState {
  posts: FeedPost[];
  currentPost: FeedPost | null;
  loading: boolean;
  error: string | null;
  offset: number;
  hasMore: boolean;
  limit: number;
  total: number;
  isRefreshing: boolean;
  // Search-related state
  searchTags: string[];
  searchActive: boolean;
  searchResults: FeedPost[];
  searchLoading: boolean;
  searchError: string | null;
}

const initialState: FeedState = {
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  offset: 0,
  hasMore: true,
  limit: 20,
  total: 0,
  isRefreshing: false,
  // Search-related state
  searchTags: [],
  searchActive: false,
  searchResults: [],
  searchLoading: false,
  searchError: null,
};

// Async thunk for fetching posts
export const fetchPosts = createAsyncThunk<
  FeedApiResponse,
  { offset?: number; limit?: number; refresh?: boolean },
  { rejectValue: string }
>(
  'feed/fetchPosts',
  async ({ offset = 0, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<FeedApiResponse>(
        `/posts/feed?limit=${limit}&offset=${offset}`
      );
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch posts';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for searching posts by tags
export const searchPosts = createAsyncThunk<
  FeedApiResponse,
  { tags: string[]; limit?: number; offset?: number },
  { rejectValue: string }
>(
  'feed/searchPosts',
  async ({ tags, limit = 20, offset = 0 }, { rejectWithValue }) => {
    try {
      const tagsParam = tags.join(',');
      const response = await apiClient.get<FeedApiResponse>(
        `/posts/feed?tags=${encodeURIComponent(tagsParam)}&limit=${limit}&offset=${offset}`
      );
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search posts';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for refreshing feed
export const refreshFeed = createAsyncThunk<
  FeedApiResponse,
  void,
  { rejectValue: string }
>(
  'feed/refreshFeed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<FeedApiResponse>(
        `/posts/feed?limit=20&offset=0`
      );
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh feed';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for fetching a single post by ID
export const fetchPostById = createAsyncThunk<
  { post: FeedPost },
  string,
  { rejectValue: string }
>(
  'feed/fetchPostById',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<{ post: FeedPost }>(`/posts/${postId}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch post';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating a post
export const updatePost = createAsyncThunk<
  { post: FeedPost },
  { postId: string; content: string; mediaFiles?: MediaFile[] },
  { rejectValue: string }
>(
  'feed/updatePost',
  async ({ postId, content, mediaFiles }, { rejectWithValue }) => {
    try {
      const response = await postsApi.updatePost(postId, content, mediaFiles);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to update post');
      }
      
      // Convert Post to FeedPost format
      const apiPost = response.data.post;
      const feedPost: FeedPost = {
        id: apiPost.id || postId,
        user_id: apiPost.user_id,
        type: 'text', // Default type, could be determined from content
        content: {
          text: apiPost.content[0]?.text || content,
          hashtags: [], // Extract hashtags from text content if needed
          mentions: apiPost.content[0]?.mentions || []
        },
        media: null, // Media handling would need to be implemented separately
        audience: apiPost.audience,
        tags: apiPost.tags,
        views: 0, // Default value
        likes: apiPost.likes,
        comments: apiPost.comments,
        shares: apiPost.shares,
        saves: apiPost.saves,
        reposts: apiPost.reposts,
        created_at: apiPost.created_at,
        updated_at: new Date().toISOString(), // Current timestamp for update
        user: undefined // User info would need to be populated separately
      };
      
      return { post: feedPost };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update post';
      return rejectWithValue(errorMessage);
    }
  }
);

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    // Reducer to manually append posts (used by infinite scroll)
    appendPosts: (state, action: PayloadAction<FeedPost[]>) => {
      const newPosts = action.payload;
      
      // Filter out duplicates by ID
      const existingIds = new Set(state.posts.map(post => post.id));
      const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
      
      state.posts = [...state.posts, ...uniqueNewPosts];
      state.offset += uniqueNewPosts.length;
    },
    
    // Reset feed state
    resetFeed: (state) => {
      state.posts = [];
      state.offset = 0;
      state.hasMore = true;
      state.error = null;
      state.total = 0;
    },
    
    // Update hasMore flag
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update post engagement (likes, comments, etc.)
    updatePostEngagement: (state, action: PayloadAction<{ postId: string; field: 'likes' | 'comments' | 'shares' | 'reposts'; increment: boolean }>) => {
      const { postId, field, increment } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post[field] += increment ? 1 : -1;
      }
      // Also update current post if it matches
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost[field] += increment ? 1 : -1;
      }
    },
    
    // Clear current post
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },

    // Search-related reducers
    setSearchTags: (state, action: PayloadAction<string[]>) => {
      state.searchTags = action.payload;
      state.searchActive = action.payload.length > 0;
      if (action.payload.length === 0) {
        state.searchResults = [];
        state.searchError = null;
      }
    },

    clearSearch: (state) => {
      state.searchTags = [];
      state.searchActive = false;
      state.searchResults = [];
      state.searchError = null;
      state.searchLoading = false;
    },

    clearSearchError: (state) => {
      state.searchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPosts
      .addCase(fetchPosts.pending, (state, action) => {
        const { refresh } = action.meta.arg;
        if (refresh) {
          state.isRefreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        const { refresh } = action.meta.arg;
        state.loading = false;
        state.isRefreshing = false;
        state.error = null;
        
        if (action.payload.success && action.payload.data) {
          const { posts, pagination } = action.payload.data;
          
          // Sort posts by creation date (most recent first)
          const sortedPosts = posts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          if (refresh || state.offset === 0) {
            // Replace all posts on refresh or initial load
            state.posts = sortedPosts;
            state.offset = sortedPosts.length;
          } else {
            // Append posts for infinite scroll
            const existingIds = new Set(state.posts.map(post => post.id));
            const uniqueNewPosts = sortedPosts.filter(post => !existingIds.has(post.id));
            state.posts = [...state.posts, ...uniqueNewPosts];
            state.offset += uniqueNewPosts.length;
          }
          
          state.hasMore = pagination.hasMore;
          state.total = pagination.total;
        }
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.isRefreshing = false;
        state.error = action.payload || 'Failed to fetch posts';
      })
      
      // refreshFeed
      .addCase(refreshFeed.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.error = null;
        
        if (action.payload.success && action.payload.data) {
          const { posts, pagination } = action.payload.data;
          
          // Sort posts by creation date (most recent first)
          const sortedPosts = posts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          state.posts = sortedPosts;
          state.offset = sortedPosts.length;
          state.hasMore = pagination.hasMore;
          state.total = pagination.total;
        }
      })
      .addCase(refreshFeed.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload || 'Failed to refresh feed';
      })
      
      // fetchPostById
      .addCase(fetchPostById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.currentPost = action.payload.post;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch post';
        state.currentPost = null;
      })
      
      // updatePost
      .addCase(updatePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        const updatedPost = action.payload.post;
        
        // Update current post if it matches
        if (state.currentPost && state.currentPost.id === updatedPost.id) {
          state.currentPost = updatedPost;
        }
        
        // Update post in posts array
        const postIndex = state.posts.findIndex(post => post.id === updatedPost.id);
        if (postIndex !== -1) {
          state.posts[postIndex] = updatedPost;
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update post';
      })
      
      // searchPosts
      .addCase(searchPosts.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchError = null;
        
        if (action.payload.success && action.payload.data) {
          const { posts } = action.payload.data;
          
          // Sort search results by relevance (most recent first for now)
          const sortedPosts = posts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          state.searchResults = sortedPosts;
        }
      })
      .addCase(searchPosts.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload || 'Failed to search posts';
        state.searchResults = [];
      });
  },
});

export const { 
  appendPosts, 
  resetFeed, 
  setHasMore, 
  clearError, 
  updatePostEngagement,
  clearCurrentPost,
  setSearchTags,
  clearSearch,
  clearSearchError
} = feedSlice.actions;

export default feedSlice.reducer;

// Selectors
export const selectFeedPosts = (state: { feed: FeedState }) => state.feed.posts;
export const selectFeedLoading = (state: { feed: FeedState }) => state.feed.loading;
export const selectFeedError = (state: { feed: FeedState }) => state.feed.error;
export const selectFeedHasMore = (state: { feed: FeedState }) => state.feed.hasMore;
export const selectFeedIsRefreshing = (state: { feed: FeedState }) => state.feed.isRefreshing;
export const selectFeedTotal = (state: { feed: FeedState }) => state.feed.total;
export const selectFeedOffset = (state: { feed: FeedState }) => state.feed.offset;
export const selectCurrentPost = (state: { feed: FeedState }) => state.feed.currentPost;

// Search selectors
export const selectSearchTags = (state: { feed: FeedState }) => state.feed.searchTags;
export const selectSearchActive = (state: { feed: FeedState }) => state.feed.searchActive;
export const selectSearchResults = (state: { feed: FeedState }) => state.feed.searchResults;
export const selectSearchLoading = (state: { feed: FeedState }) => state.feed.searchLoading;
export const selectSearchError = (state: { feed: FeedState }) => state.feed.searchError;
