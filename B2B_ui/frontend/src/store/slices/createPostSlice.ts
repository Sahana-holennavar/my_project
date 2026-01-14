import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { CreatePostState, CreatePostData, CreatePostResponse, CreatePostError } from '@/types/posts';
import { postsApi } from '@/lib/api';

// Initial state
const initialState: CreatePostState = {
  loading: false,
  success: false,
  error: null,
  currentPost: null,
};

// Async thunk for creating a post
export const createPostAsync = createAsyncThunk<
  CreatePostResponse,
  CreatePostData,
  { rejectValue: CreatePostError }
>(
  'createPost/createPostAsync',
async (postData, { rejectWithValue }) => {
    try {
      console.log('Starting post creation with data:', postData);
      
      // Create FormData for multipart request
      const formData = new FormData();
      
      // Add basic post data
      formData.append('content', postData.content);
      formData.append('type', postData.type);
      formData.append('audience', postData.audience);

      console.log('FormData basic fields added:', {
        content: postData.content,
        type: postData.type,
        audience: postData.audience
      });

      // Add media files if present
      if (postData.media && postData.media.length > 0) {
        console.log('Processing media files:', postData.media.length);
        
        // Add actual media files first - THIS IS THE FIX
        postData.media.forEach((mediaFile, index) => {
          console.log(`Adding file ${index}:`, mediaFile.file.name, mediaFile.file.type);
          // Changed from 'file' to 'media' to match Multer configuration
          formData.append('media', mediaFile.file);
        });
      }

      // Log FormData contents
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(key, typeof value === 'string' ? value : `File: ${(value as File).name}`);
      }

      // Use the postsApi to create the post
      console.log('Calling postsApi.createPost...');
      const response = await postsApi.createPost(formData);
      console.log('API response:', response);
      
      return response;
    } catch (error) {
      console.error('Error in createPostAsync:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      return rejectWithValue({
        status: 500,
        message: errorMessage,
        success: false,
      });
    }
  }
);

// Create post slice
const createPostSlice = createSlice({
  name: 'createPost',
  initialState,
  reducers: {
    resetCreatePostState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.currentPost = null;
    },
    setCurrentPost: (state, action: PayloadAction<CreatePostData>) => {
      state.currentPost = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create post pending
      .addCase(createPostAsync.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      // Create post fulfilled
      .addCase(createPostAsync.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
        state.error = null;
        // Reset current post after successful creation
        state.currentPost = null;
      })
      // Create post rejected
      .addCase(createPostAsync.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload?.message || 'Failed to create post';
      });
  },
});

// Export actions
export const { 
  resetCreatePostState, 
  setCurrentPost, 
  clearError, 
  clearSuccess 
} = createPostSlice.actions;

// Export reducer
export default createPostSlice.reducer;