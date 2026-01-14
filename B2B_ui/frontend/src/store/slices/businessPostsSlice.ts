import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { businessProfilePostsApi } from "@/lib/api";
import type {
  BusinessProfilePost,
  BusinessProfilePostsResponse,
  CreateBusinessProfilePostData,
  UpdateBusinessProfilePostData,
} from "@/types/auth";

export interface BusinessPostsState {
  posts: BusinessProfilePost[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
}

const initialState: BusinessPostsState = {
  posts: [],
  loading: false,
  error: null,
  page: 1,
  limit: 10,
  total: 0,
};

export const fetchBusinessPosts = createAsyncThunk<
  BusinessProfilePostsResponse,
  { profileId: string; page?: number; limit?: number },
  { rejectValue: string }
>(
  "businessPosts/fetch",
  async ({ profileId, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await businessProfilePostsApi.getPosts(profileId, { page, limit });
      if (!response || !response.success || !response.data) {
        return rejectWithValue(response?.message || "Failed to fetch posts");
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch posts");
    }
  }
);

export const createBusinessPost = createAsyncThunk<
  BusinessProfilePost,
  { profileId: string; postData: CreateBusinessProfilePostData },
  { rejectValue: string }
>(
  "businessPosts/create",
  async ({ profileId, postData }, { rejectWithValue }) => {
    try {
      const response = await businessProfilePostsApi.createPost(profileId, postData);
      if (!response || !response.success || !response.data) {
        return rejectWithValue(response?.message || "Failed to create post");
      }

      // Try to return the created post if available
      return response.data.post || response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to create post");
    }
  }
);

export const updateBusinessPost = createAsyncThunk<
  BusinessProfilePost,
  { profileId: string; postId: string; postData: UpdateBusinessProfilePostData },
  { rejectValue: string }
>(
  "businessPosts/update",
  async ({ profileId, postId, postData }, { rejectWithValue }) => {
    try {
      const response = await businessProfilePostsApi.updatePost(profileId, postId, postData);
      if (!response || !response.success || !response.data) {
        return rejectWithValue(response?.message || "Failed to update post");
      }
      return response.data.post || response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to update post");
    }
  }
);

export const deleteBusinessPost = createAsyncThunk<
  { postId: string },
  { profileId: string; postId: string },
  { rejectValue: string }
>(
  "businessPosts/delete",
  async ({ profileId, postId }, { rejectWithValue }) => {
    try {
      const response = await businessProfilePostsApi.deletePost(profileId, postId);
      if (!response || !response.success) {
        return rejectWithValue(response?.message || "Failed to delete post");
      }
      return { postId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to delete post");
    }
  }
);

const businessPostsSlice = createSlice({
  name: "businessPosts",
  initialState,
  reducers: {
    clearBusinessPosts: (state) => {
      state.posts = [];
      state.page = 1;
      state.total = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBusinessPosts.fulfilled, (state, action: PayloadAction<BusinessProfilePostsResponse>) => {
        state.loading = false;
        state.posts = action.payload.posts || [];
        state.total = action.payload.pagination?.total || 0;
        state.page = action.payload.pagination?.page || state.page;
        state.limit = action.payload.pagination?.limit || state.limit;
        state.error = null;
      })
      .addCase(fetchBusinessPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch posts";
      })

      .addCase(createBusinessPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBusinessPost.fulfilled, (state, action: PayloadAction<BusinessProfilePost>) => {
        state.loading = false;
        // Prepend new post
        state.posts = [action.payload, ...state.posts];
        state.total += 1;
        state.error = null;
      })
      .addCase(createBusinessPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create post";
      })

      .addCase(updateBusinessPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBusinessPost.fulfilled, (state, action: PayloadAction<BusinessProfilePost>) => {
        state.loading = false;
        const idx = state.posts.findIndex(p => p.postId === action.payload.postId);
        if (idx !== -1) state.posts[idx] = action.payload;
        state.error = null;
      })
      .addCase(updateBusinessPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update post";
      })

      .addCase(deleteBusinessPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBusinessPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = state.posts.filter(p => p.postId !== action.payload.postId);
        state.total = Math.max(0, state.total - 1);
        state.error = null;
      })
      .addCase(deleteBusinessPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete post";
      });
  },
});

export const { clearBusinessPosts } = businessPostsSlice.actions;
export default businessPostsSlice.reducer;

// Selectors
export const selectBusinessPosts = (state: { businessPosts: BusinessPostsState }) => state.businessPosts.posts;
export const selectBusinessPostsLoading = (state: { businessPosts: BusinessPostsState }) => state.businessPosts.loading;
export const selectBusinessPostsError = (state: { businessPosts: BusinessPostsState }) => state.businessPosts.error;
export const selectBusinessPostsPagination = (state: { businessPosts: BusinessPostsState }) => ({
  page: state.businessPosts.page,
  limit: state.businessPosts.limit,
  total: state.businessPosts.total,
});
