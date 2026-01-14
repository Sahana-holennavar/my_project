import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import forgotPasswordReducer from './forgotPasswordSlice';
import createPostReducer from './slices/createPostSlice';
import feedReducer from './slices/feedSlice';
import interactionReducer from './slices/interactionSlice';
import profileReducer from './slices/profileSlice';
import businessProfileReducer from './slices/businessProfileSlice';
import businessPostsReducer from './slices/businessPostsSlice';
import jobsReducer from './slices/jobsSlice';
import jobApplicationsReducer from './slices/jobApplicationsSlice';
import applicationsReducer from './slices/applicationsSlice';
import chatReducer from './slices/chatSlice';
import resumeEvaluatorReducer from './slices/resumeEvaluatorSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    forgotPassword: forgotPasswordReducer,
    createPost: createPostReducer,
    feed: feedReducer,
    interactions: interactionReducer,
    profile: profileReducer,
    businessProfile: businessProfileReducer,
    businessPosts: businessPostsReducer,
    jobs: jobsReducer,
    jobApplications: jobApplicationsReducer,
    applications: applicationsReducer,
    chat: chatReducer,
    resumeEvaluator: resumeEvaluatorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
