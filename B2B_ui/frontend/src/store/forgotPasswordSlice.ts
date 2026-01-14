

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../lib/api';
import { RootState } from './index';

type ApiResponse = {
  status: number;
  message: string;
  success: boolean;
  data?: unknown;
};


export const sendOTPAsync = createAsyncThunk<
  ApiResponse,
  string,
  { rejectValue: string }
>(
  'forgotPassword/sendOTP',
  async (email, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to send OTP');
    }
  }
);

export const resendOTPAsync = createAsyncThunk<
  ApiResponse,
  void,
  { state: RootState; rejectValue: string }
>(
  'forgotPassword/resendOTP',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const email = state.forgotPassword.email;
      const response = await apiClient.post<ApiResponse>('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to resend OTP');
    }
  }
);

export const resetPasswordAsync = createAsyncThunk<
  ApiResponse,
  { email: string; otp: string; newPassword: string },
  { rejectValue: string }
>(
  'forgotPassword/resetPassword',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/reset-password', { email, otp, newPassword });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to reset password');
    }
  }
);


interface ForgotPasswordState {
  email: string;
  loading: boolean;
  error: string | null;
  isOTPSent: boolean;
  isOTPVerified: boolean;
  isPasswordReset: boolean;
}

const initialState: ForgotPasswordState = {
  email: '',
  loading: false,
  error: null,
  isOTPSent: false,
  isOTPVerified: false,
  isPasswordReset: false,
};

const forgotPasswordSlice = createSlice({
  name: 'forgotPassword',
  initialState,
  reducers: {
    clearForgotPasswordState: (state) => {
      state.email = '';
      state.loading = false;
      state.error = null;
      state.isOTPSent = false;
      state.isOTPVerified = false;
      state.isPasswordReset = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send OTP
      .addCase(sendOTPAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isOTPSent = false;
      })
      .addCase(sendOTPAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isOTPSent = !!action.payload?.success;
        state.error = action.payload?.success ? null : (action.payload?.message || 'Failed to send OTP');
        if (action.meta && action.meta.arg) {
          state.email = action.meta.arg;
        }
      })
      .addCase(sendOTPAsync.rejected, (state, action) => {
        state.loading = false;
        state.isOTPSent = false;
        state.error = action.payload as string || 'Failed to send OTP';
      })

      // Resend OTP
      .addCase(resendOTPAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendOTPAsync.fulfilled, (state, action) => {
        state.isOTPSent = !!action.payload?.success;
        state.error = action.payload?.success ? null : (action.payload?.message || 'Failed to resend OTP');
      })
      .addCase(resendOTPAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to resend OTP';
      })

      // Reset Password
      .addCase(resetPasswordAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isPasswordReset = false;
      })
      .addCase(resetPasswordAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isPasswordReset = !!action.payload?.success;
        state.error = action.payload?.success ? null : (action.payload?.message || 'Failed to reset password');
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.loading = false;
        state.isPasswordReset = false;
        state.error = action.payload as string || 'Failed to reset password';
      });
  },
});

export const { clearForgotPasswordState } = forgotPasswordSlice.actions;
export default forgotPasswordSlice.reducer;
