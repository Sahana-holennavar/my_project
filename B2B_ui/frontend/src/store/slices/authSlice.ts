
// Account Deactivation Thunk
export const deactivateAccountThunk = createAsyncThunk(
  'auth/deactivateAccount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.deactivateAccount();
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Deactivation failed');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Deactivation failed');
    }
  }
);

// Account Deletion Thunk
export const deleteAccountAsync = createAsyncThunk(
  'auth/deleteAccount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.deleteAccount();
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Account deletion failed');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Account deletion failed');
    }
  }
);
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '@/lib/api'
import { tokenStorage } from '@/lib/tokens'
import type { User, AuthTokens, LoginData, RegisterData } from '@/types/auth'

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginData, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Login failed')
      }
      
      return response.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Registration failed')
      }
      
      return response
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed')
    }
  }
)

export const checkRoleStatus = createAsyncThunk(
  'auth/checkRoleStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getRoleStatus()
      
      if (!response.success || !response.data) {
        return rejectWithValue('No role assigned')
      }
      
      return response.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check role')
    }
  }
)

export const assignRole = createAsyncThunk(
  'auth/assignRole',
  async (role: 'student' | 'professional', { rejectWithValue }) => {
    try {
      const response = await authApi.assignRole(role)
      
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to assign role')
      }
      
      return response.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to assign role')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload
    },
    setAuthData: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user
      state.tokens = action.payload.tokens
      state.isAuthenticated = true
      state.error = null
    },
    clearAuth: (state) => {
      state.user = null
      state.tokens = null
      state.isAuthenticated = false
      state.error = null
      tokenStorage.clearTokens()
    },
    clearError: (state) => {
      state.error = null
    },
    handleDeactivationSuccess: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      tokenStorage.clearTokens();
    },
  },
  extraReducers: (builder) => {
    // Deactivate Account
    builder
      .addCase(deactivateAccountThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deactivateAccountThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
        tokenStorage.clearTokens();
      })
      .addCase(deactivateAccountThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Account
    builder
      .addCase(deleteAccountAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccountAsync.fulfilled, (state) => {
        state.isLoading = false;
        // Clear user data and tokens after successful deletion email sent
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
        tokenStorage.clearTokens();
      })
      .addCase(deleteAccountAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.tokens = {
          access_token: action.payload.access_token,
          refresh_token: action.payload.refresh_token,
          expires_in: action.payload.expires_in,
        }
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Check Role Status
    builder
      .addCase(checkRoleStatus.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(checkRoleStatus.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.user) {
          state.user.role = (action.payload.role_name === 'student' || action.payload.role_name === 'professional')
            ? action.payload.role_name
            : undefined;
        }
      })
      .addCase(checkRoleStatus.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Assign Role
    builder
      .addCase(assignRole.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(assignRole.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.user) {
          state.user.role = (action.payload.role_name === 'student' || action.payload.role_name === 'professional')
            ? action.payload.role_name
            : undefined;
        }
      })
      .addCase(assignRole.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setLoading, setUser, setTokens, setAuthData, clearAuth, clearError } = authSlice.actions
export default authSlice.reducer
