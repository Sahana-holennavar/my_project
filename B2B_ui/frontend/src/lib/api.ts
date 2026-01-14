import { env } from './env'
import { tokenStorage } from './tokens'
import type { AuthTokens } from "@/types/auth"
import type { RegisterData, LoginData, AuthResponse, ApiResponse, BusinessProfilePost, BusinessProfilePostsResponse } from '@/types/auth'
import type { CreatePostResponse, UpdatePostResponse, Post, MediaFile } from '@/types/posts'
import type { FeedPost } from '@/store/slices/feedSlice'
import type { ChallengeSubmissionsResponse, ContestsResponse, ContestResponse, StartContestRequest } from '@/types/challenge'

const API_BASE_URL = env.API_URL

interface RequestConfig extends RequestInit {
  timeout?: number
}

interface UserPostsResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    posts: Post[];
    pagination?: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

interface PostsResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    posts: FeedPost[];
  };
}

interface SearchProfileResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  headline?: string;
  avatar_url: string | null;
}

interface ProfileSearchResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    results: SearchProfileResult[];
    page: number;
    limit: number;
    has_more: boolean;
    total_candidates: number;
  };
}

interface Member {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  joinedAt: string;
  lastActive: string | null;
}

interface MembersResponse {
  status: number;
  message: string;
  success: boolean;
  data: {
    members: Member[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    summary: {
      totalMembers: number;
      admins: number;
      editors: number;
      activeMembers: number;
    };
  };
}

async function fetchWithTimeout(url: string, config: RequestConfig = {}): Promise<Response> {
  const { timeout = 60000, ...fetchConfig } = config
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log('[API] ⏱️ Request timeout after', timeout, 'ms');
    controller.abort('Request timeout');
  }, timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchConfig,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[API] ❌ Request aborted:', error.message);
    }
    throw error
  }
}

async function handleResponse<T>(response: Response, isAuthRequest = false): Promise<T> {
  const contentType = response.headers.get('content-type')
  const responseData = contentType && contentType.includes('application/json') 
    ? await response.json() 
    : { message: await response.text() }

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // If this is an auth request (login/register), return the actual error message
      if (isAuthRequest) {
        throw new Error(responseData.message || 'Authentication failed')
      }
      
      // Otherwise, it's a session expiration for authenticated requests
      const { tokenStorage } = await import('./tokens')
      tokenStorage.clearTokens()
      
      // Redirect to login if we're in the browser and not already on auth pages
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        // Don't redirect if already on auth pages to prevent loops
        if (currentPath !== '/login' && currentPath !== '/register' && !currentPath.startsWith('/forgot-password')) {
          window.location.href = '/login'
        }
      }
      
      throw new Error('Session expired. Please login again.')
    }
    
    throw new Error(responseData.message || `HTTP error! status: ${response.status}`)
  }
  
  return responseData
}

export const apiClient = {
  get: async <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
    const tokens = tokenStorage.getStoredTokens()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      ...config,
    })
    return handleResponse<T>(response)
  },

  post: async <T>(endpoint: string, data?: unknown, config?: RequestConfig & { isAuthRequest?: boolean }): Promise<T> => {
    const tokens = tokenStorage.getStoredTokens()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    } else {
      console.warn('No access token found for POST request to:', endpoint)
    }

    console.log('POST Request Headers:', headers) // Debug log

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
    return handleResponse<T>(response, config?.isAuthRequest || false)
  },

  put: async <T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> => {
    const tokens = tokenStorage.getStoredTokens()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
    return handleResponse<T>(response)
  },

  patch: async <T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> => {
    const tokens = tokenStorage.getStoredTokens()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
    return handleResponse<T>(response)
  },

  delete: async <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
    const tokens = tokenStorage.getStoredTokens()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...config,
    })
    return handleResponse<T>(response)
  },
}

export const authApi = {
  register: async (userData: RegisterData): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData, { isAuthRequest: true })
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed')
    }
  },

  login: async (loginData: LoginData): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', loginData, { isAuthRequest: true })
      
      // Store tokens if login successful
      if (response.success && response.data) {
        const { access_token, refresh_token, expires_in } = response.data
        tokenStorage.setAuthTokens(
          { access_token, refresh_token, expires_in },
          loginData.remember_me || false
        )
      }
      
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed')
    }
  },

  getRoleStatus: async (): Promise<ApiResponse<{ role_name?: string; role_id?: number; user_id?: number }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ role_name?: string; role_id?: number; user_id?: number }>>('/roles/status')
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch role status')
    }
  },

  assignRole: async (role: 'student' | 'professional'): Promise<ApiResponse<{ role_name: string; role_id: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ role_name: string; role_id: number }>>('/roles', { role })
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to assign role')
    }
  },
  deactivateAccount: async (): Promise<ApiResponse<{ user: unknown }>> => {
    try {
  const response = await apiClient.post<ApiResponse<{ user: unknown }>>(
        '/auth/deactivate-account',
        { active: 'false' }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to deactivate account');
    }
  },

  deleteAccount: async (): Promise<ApiResponse<{ emailSent: boolean; message: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ emailSent: boolean; message: string }>>(
        '/auth/delete-account'
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete account');
    }
  },
}
// Forgot Password API
// --- Verification Code (OTP) ---
// To document: Add a screenshot of the received verification code email here.
// Example: ![Verification Code Screenshot](path/to/screenshot.png)

/**
 * Send Verification Code to user's email for password reset
 * @param email User's email address
 */
export async function sendVerificationCode(email: string): Promise<ApiResponse<null>> {
  return apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
}

/**
 * Reset password using Verification Code
 * @param email User's email address
 * @param verificationCode The 6-digit code sent to email
 * @param newPassword New password to set
 */
export async function resetPasswordWithCode(email: string, verificationCode: string, newPassword: string): Promise<ApiResponse<null>> {
  // Send 'otp' as the key to match backend, but keep UI as 'Verification Code'
  return apiClient.post<ApiResponse<null>>('/auth/reset-password', {
    email,
    otp: verificationCode,
    newPassword,
  });
}

// Token management functions
export const setAuthTokens = (tokens: AuthTokens, rememberMe = false) => {
  tokenStorage.setAuthTokens(tokens, rememberMe)
}

export const getStoredTokens = () => {
  return tokenStorage.getStoredTokens()
}

export const clearStoredTokens = () => {
  tokenStorage.clearTokens()
}

// Business Profile API
export const businessProfileApi = {
  createBusinessProfile: async (businessData: import('@/types/auth').BusinessProfileData): Promise<import('@/types/auth').ApiResponse<import('@/types/auth').CreatedBusinessProfile>> => {
    try {
      // Prepare the request data with default company logo structure
      const requestData = {
        ...businessData,
        company_logo: {
          fileId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileUrl: `https://cdn.example.com/logos/${businessData.companyName?.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
          fileName: "logo.png",
          uploadedAt: new Date().toISOString()
        }
      }
      
      const response = await apiClient.post<import('@/types/auth').ApiResponse<import('@/types/auth').CreatedBusinessProfile>>('/business-profile/create-business-profile', {
        profile_data: requestData
      })
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create business profile')
    }
  },

  getUserBusinessProfiles: async (options?: {
    page?: number;
    limit?: number;
    role?: string;
    includeInactive?: boolean;
  }): Promise<import('@/types/auth').ApiResponse<import('@/types/auth').BusinessProfilesResponse>> => {
    try {
      const params = new URLSearchParams();
      
      if (options?.page) {
        params.append('page', options.page.toString());
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options?.role && options.role !== 'all') {
        params.append('role', options.role);
      }
      if (options?.includeInactive) {
        params.append('includeInactive', 'true');
      }
      
      const queryString = params.toString();
      const url = queryString ? `/users/company-pages?${queryString}` : '/users/company-pages';
      
      const response = await apiClient.get<import('@/types/auth').ApiResponse<import('@/types/auth').BusinessProfilesResponse>>(url)
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch business profiles')
    }
  },

  searchProfiles: async (query?: string, sort?: 'recent'): Promise<ProfileSearchResponse> => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (sort) params.append('sort', sort);
      
      const url = `/profile/search${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiClient.get<ProfileSearchResponse>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to search profiles');
    }
  },

  inviteUser: async (profileId: string, inviteeId: string, role: string): Promise<ApiResponse<{
    invitationId: string;
    profileId: string;
    profileName: string;
    inviteeId: string;
    inviteeEmail: string;
    inviteeName: string;
    role: string;
    status: string;
    invitedBy: {
      userId: string;
      name: string;
      email: string;
    };
    createdAt: string;
  }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{
        invitationId: string;
        profileId: string;
        profileName: string;
        inviteeId: string;
        inviteeEmail: string;
        inviteeName: string;
        role: string;
        status: string;
        invitedBy: {
          userId: string;
          name: string;
          email: string;
        };
        createdAt: string;
      }>>(`/business-profile/${profileId}/invitations`, {
        inviteeId,
        role
      });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send invitation');
    }
  },

  getMembers: async (profileId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<MembersResponse> => {
    try {
      const queryString = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, value!.toString()])
      ).toString() : '';
      
      const url = queryString 
        ? `/business-profile/${profileId}/members?${queryString}` 
        : `/business-profile/${profileId}/members`;
      
      const response = await apiClient.get<MembersResponse>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch members');
    }
  },

  getReceivedInvitations: async (status: 'all' | 'pending' | 'accepted' | 'declined' = 'pending'): Promise<ApiResponse<{
    invitations: Array<{
      invitationId: string;
      profileId: string;
      profileName: string;
      profileLogo: string;
      role: string;
      status: 'pending' | 'accepted' | 'declined';
      invitedBy: {
        userId: string;
        name: string;
        email: string;
        avatar?: {
          fileId: string;
          fileUrl: string;
          fileName: string;
          uploadedAt: string;
        };
      };
      message: string;
      createdAt: string;
    }>;
    total: number;
    summary: {
      pending: number;
      accepted: number;
      declined: number;
    };
  }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{
        invitations: Array<{
          invitationId: string;
          profileId: string;
          profileName: string;
          profileLogo: string;
          role: string;
          status: 'pending' | 'accepted' | 'declined';
          invitedBy: {
            userId: string;
            name: string;
            email: string;
            avatar?: {
              fileId: string;
              fileUrl: string;
              fileName: string;
              uploadedAt: string;
            };
          };
          message: string;
          createdAt: string;
        }>;
        total: number;
        summary: {
          pending: number;
          accepted: number;
          declined: number;
        };
      }>>(`/invitations/received?status=${status}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch received invitations');
    }
  },

  acceptInvitation: async (profileId: string, invitationId: string): Promise<ApiResponse<{
    memberId: string;
    userId: string;
    profileId: string;
    profileName: string;
    role: string;
    invitedBy: {
      userId: string;
      name: string;
    };
    joinedAt: string;
  }>> => {
    try {
      const response = await apiClient.put<ApiResponse<{
        memberId: string;
        userId: string;
        profileId: string;
        profileName: string;
        role: string;
        invitedBy: {
          userId: string;
          name: string;
        };
        joinedAt: string;
      }>>(`/invitations/${profileId}/${invitationId}/accept`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  },

  declineInvitation: async (profileId: string, invitationId: string): Promise<ApiResponse<{
    invitationId: string;
    profileName: string;
    status: string;
    declinedAt: string;
  }>> => {
    try {
      const response = await apiClient.put<ApiResponse<{
        invitationId: string;
        profileName: string;
        status: string;
        declinedAt: string;
      }>>(`/invitations/${profileId}/${invitationId}/decline`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to decline invitation');
    }
  },

  revokeMembership: async (profileId: string): Promise<ApiResponse<{
    message: string;
    profileId: string;
    userId: string;
    revokedAt: string;
  }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{
        message: string;
        profileId: string;
        userId: string;
        revokedAt: string;
      }>>(`/business-profile/${profileId}/members/revoke`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to revoke membership');
    }
  },

  getSentInvitations: async (profileId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    invitations: Array<{
      invitationId: string;
      inviteeId: string;
      inviteeEmail: string;
      inviteeName: string;
      inviteeAvatar: string | null;
      role: string;
      status: 'pending' | 'accepted' | 'declined' | 'cancelled';
      createdAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    summary: {
      pending: number;
      accepted: number;
      declined: number;
      cancelled: number;
    };
  }>> => {
    try {
      const queryString = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, value!.toString()])
      ).toString() : '';
      
      const url = queryString 
        ? `/business-profile/${profileId}/invitations?${queryString}` 
        : `/business-profile/${profileId}/invitations`;
      
      const response = await apiClient.get<ApiResponse<{
        invitations: Array<{
          invitationId: string;
          inviteeId: string;
          inviteeEmail: string;
          inviteeName: string;
          inviteeAvatar: string | null;
          role: string;
          status: 'pending' | 'accepted' | 'declined' | 'cancelled';
          createdAt: string;
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        };
        summary: {
          pending: number;
          accepted: number;
          declined: number;
          cancelled: number;
        };
      }>>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch sent invitations');
    }
  },

  deactivateBusinessProfile: async (profileId: string): Promise<ApiResponse<import('@/types/auth').DeactivateBusinessResponse>> => {
    try {
      const response = await apiClient.patch<ApiResponse<import('@/types/auth').DeactivateBusinessResponse>>(`/business-profile/${profileId}/deactivate`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to deactivate business profile');
    }
  },

  reactivateBusinessProfile: async (profileId: string): Promise<ApiResponse<import('@/types/auth').DeactivateBusinessResponse>> => {
    try {
      const response = await apiClient.patch<ApiResponse<import('@/types/auth').DeactivateBusinessResponse>>(`/business-profile/${profileId}/reactivate`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reactivate business profile');
    }
  },

  deleteBusinessProfile: async (profileId: string): Promise<ApiResponse<{ message: string; profileId: string; deletedAt: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message: string; profileId: string; deletedAt: string }>>(`/business-profile/${profileId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete business profile');
    }
  },

  promoteMember: async (profileId: string, memberId: string): Promise<ApiResponse<import('@/types/auth').PromoteMemberResponse>> => {
    try {
      const response = await apiClient.put<ApiResponse<import('@/types/auth').PromoteMemberResponse>>(`/business-profile/${profileId}/members/${memberId}/promote`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to promote member');
    }
  },

  demoteMember: async (profileId: string, memberId: string): Promise<ApiResponse<import('@/types/auth').DemoteMemberResponse>> => {
    try {
      const response = await apiClient.put<ApiResponse<import('@/types/auth').DemoteMemberResponse>>(`/business-profile/${profileId}/members/${memberId}/demote`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to demote member');
    }
  },

  removeMember: async (profileId: string, memberId: string): Promise<ApiResponse<import('@/types/auth').RemoveMemberResponse>> => {
    try {
      const response = await apiClient.delete<ApiResponse<import('@/types/auth').RemoveMemberResponse>>(`/business-profile/${profileId}/members/${memberId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to remove member');
    }
  },

  cancelInvitation: async (profileId: string, invitationId: string): Promise<ApiResponse<import('@/types/auth').CancelInvitationResponse>> => {
    try {
      const response = await apiClient.delete<ApiResponse<import('@/types/auth').CancelInvitationResponse>>(`/business-profile/${profileId}/invitations/${invitationId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    }
  },

  // Self-demotion functionality for admins
  demoteSelf: async (profileId: string): Promise<ApiResponse<import('@/types/auth').DemoteSelfResponse>> => {
    try {
      const response = await apiClient.put<ApiResponse<import('@/types/auth').DemoteSelfResponse>>(`/business-profile/${profileId}/members/demote`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to demote yourself');
    }
  },

  // Get public business profile (for non-members)
  getPublicBusinessProfile: async (profileId: string): Promise<import('@/types/auth').ApiResponse<import('@/types/auth').BusinessProfilesResponse>> => {
    try {
      const params = new URLSearchParams();
      params.append('role', 'none');
      params.append('includeInactive', 'false');
      params.append('profileId', profileId);
      
      const url = `/users/company-pages?${params.toString()}`;
      const response = await apiClient.get<import('@/types/auth').ApiResponse<import('@/types/auth').BusinessProfilesResponse>>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch public business profile');
    }
  }
}

// Business Profile Posts API
export const businessProfilePostsApi = {
  createPost: async (profileId: string, postData: { title: string; content: string; tags: string[]; media?: File }): Promise<ApiResponse<{ post: BusinessProfilePost }>> => {
    try {
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      
      // Send tags as individual form fields instead of JSON string
      postData.tags.forEach((tag, index) => {
        formData.append(`tags[${index}]`, tag);
      });
      
      if (postData.media) {
        formData.append('media', postData.media);
      }

      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};
      
      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/business-profile/${profileId}/posts`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      return handleResponse<ApiResponse<{ post: BusinessProfilePost }>>(response);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create post');
    }
  },

  getPosts: async (profileId: string, options?: { page?: number; limit?: number }): Promise<ApiResponse<BusinessProfilePostsResponse>> => {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      
      const response = await apiClient.get<ApiResponse<BusinessProfilePostsResponse>>(`/business-profile/${profileId}/posts?${params.toString()}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get posts');
    }
  },

  getPost: async (profileId: string, postId: string): Promise<ApiResponse<{ post: BusinessProfilePost }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ post: BusinessProfilePost }>>(`/business-profile/${profileId}/posts/${postId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get post');
    }
  },

  updatePost: async (profileId: string, postId: string, postData: { title: string; content: string; tags: string[]; media?: File }): Promise<ApiResponse<{ post: BusinessProfilePost }>> => {
    try {
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      
      // Send tags as individual form fields instead of JSON string
      postData.tags.forEach((tag, index) => {
        formData.append(`tags[${index}]`, tag);
      });
      
      if (postData.media) {
        formData.append('media', postData.media);
      }

      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};
      
      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/business-profile/${profileId}/posts/${postId}`, {
        method: 'PUT',
        headers,
        body: formData,
      });
      
      return handleResponse<ApiResponse<{ post: BusinessProfilePost }>>(response);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update post');
    }
  },

  deletePost: async (profileId: string, postId: string): Promise<ApiResponse<{ message: string; postId: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message: string; postId: string }>>(`/business-profile/${profileId}/posts/${postId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete post');
    }
  }
}

// Posts API
export const postsApi = {
  createPost: async (formData: FormData): Promise<CreatePostResponse> => {
    try {
      console.log('postsApi.createPost called');
      
      const tokens = tokenStorage.getStoredTokens()
      console.log('Tokens retrieved:', tokens ? 'Found' : 'Not found');
      
      const headers: Record<string, string> = {}
      
      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`
        console.log('Authorization header added');
      } else {
        console.warn('No access token found for post creation!');
      }
      
      console.log('Making request to:', `${API_BASE_URL}/api/posts/create-post`);
      console.log('Full API_BASE_URL:', API_BASE_URL);
      console.log('Request headers:', headers);
      
      // Log FormData contents for debugging
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, `File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}:`, value);
        }
      }
      
      // Note: Content-Type is not set for FormData - browser sets it automatically with boundary
      const response = await fetchWithTimeout(`${API_BASE_URL}/posts/create-post`, {
        method: 'POST',
        headers,
        body: formData,
      })
      
      console.log('Raw response:', response);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await handleResponse(response);
      console.log('Parsed response:', result);
      
      return result as CreatePostResponse;
    } catch (error) {
      console.error('Error in postsApi.createPost:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error);
      
      throw new Error(error instanceof Error ? error.message : 'Failed to create post')
    }
  },

  getPosts: async ({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}): Promise<PostsResponse> => {
    try {
      const response = await apiClient.get<PostsResponse>(`/posts/feed?limit=${limit}&offset=${offset}`)
      return response
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch posts')
    }
  },

  searchPostsByTags: async ({ 
    tags, 
    limit = 20, 
    offset = 0 
  }: { 
    tags: string[]; 
    limit?: number; 
    offset?: number; 
  }): Promise<PostsResponse> => {
    try {
      const tagsParam = tags.join(',');
      const response = await apiClient.get<PostsResponse>(
        `/posts/feed?tags=${encodeURIComponent(tagsParam)}&limit=${limit}&offset=${offset}`
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to search posts');
    }
  },

  updatePost: async (postId: string, content: string, mediaFiles?: MediaFile[]): Promise<UpdatePostResponse> => {
    try {
      // Create FormData for media upload (same as createPost)
      const formData = new FormData();
      formData.append('content', content);
      
      // Add media files if provided (same field name as createPost)
      if (mediaFiles && mediaFiles.length > 0) {
        mediaFiles.forEach((mediaFile) => {
          formData.append('media', mediaFile.file);
        });
      }
      
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};
      
      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/posts/${postId}`, {
        method: 'PUT',
        headers,
        body: formData,
      });
      
      const result = await handleResponse<UpdatePostResponse>(response);
      
      // Check if the response indicates S3/media upload issues
      if (result.message && (result.message.includes('S3') || result.message.includes('bucket') || result.message.includes('AWS'))) {
        // If it's an S3 error but the post was still updated (success: true), 
        // we should still consider it a partial success
        if (result.success && result.data) {
          return result;
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update post');
    }
  },

  getUserPosts: async (userId: string): Promise<UserPostsResponse> => {
    try {
      const response = await apiClient.get<UserPostsResponse>(`/posts/user/${userId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch user posts');
    }
  },
}

// Interactions API
export const interactionsApi = {
  likePost: async (postId: string): Promise<ApiResponse<{ post_id: string; liked: boolean; likes_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; liked: boolean; likes_count: number }>>(
        '/api/v1/interactions/like',
        { post_id: postId }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to like post');
    }
  },

  unlikePost: async (postId: string): Promise<ApiResponse<{ post_id: string; liked: boolean; likes_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; liked: boolean; likes_count: number }>>(
        '/api/v1/interactions/unlike',
        { post_id: postId }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to unlike post');
    }
  },

  commentOnPost: async (postId: string, commentText: string): Promise<ApiResponse<{ comment: unknown; comments_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ comment: unknown; comments_count: number }>>(
        '/api/v1/interactions/comment',
        { 
          post_id: postId, 
          comment_text: commentText 
        }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to comment on post');
    }
  },

  sharePost: async (postId: string, shareUserId?: string): Promise<ApiResponse<{ post_id: string; shared: boolean; shares_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; shared: boolean; shares_count: number }>>(
        '/api/v1/interactions/share',
        { 
          post_id: postId,
          share_userid: shareUserId 
        }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to share post');
    }
  },

  savePost: async (postId: string): Promise<ApiResponse<{ post_id: string; saved: boolean; saves_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; saved: boolean; saves_count: number }>>(
        '/api/v1/interactions/save',
        { post_id: postId }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to save post');
    }
  },

  unsavePost: async (postId: string): Promise<ApiResponse<{ post_id: string; saved: boolean; saves_count: number }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; saved: boolean; saves_count: number }>>(
        '/api/v1/interactions/unsavePost',
        { post_id: postId }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to unsave post');
    }
  },

  reportPost: async (postId: string, reason: string): Promise<ApiResponse<{ post_id: string; reported: boolean; reason: string }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ post_id: string; reported: boolean; reason: string }>>(
        '/api/v1/interactions/report',
        {
          post_id: postId,
          reason: reason
        }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to report post');
    }
  },

  getPostComments: async (postId: string): Promise<ApiResponse<{ comments: unknown[] }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ comments: unknown[] }>>(
        `/api/v1/interactions/comments/${postId}`
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch comments');
    }
  },
}

// Job Management API
export const jobsApi = {
  // Get jobs for a business profile
  getJobs: async (profileId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<import('@/types/jobs').JobPosting[]>> => {
    try {
      const queryString = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, value!.toString()])
      ).toString() : '';
      
      const url = queryString 
        ? `/business-profile/${profileId}/job?${queryString}` 
        : `/business-profile/${profileId}/job`;
      
      const response = await apiClient.get<ApiResponse<import('@/types/jobs').JobPosting[]>>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch jobs');
    }
  },

  // Get a specific job
  getJob: async (profileId: string, jobId: string): Promise<ApiResponse<import('@/types/jobs').JobPosting>> => {
    try {
      const response = await apiClient.get<ApiResponse<import('@/types/jobs').JobPosting>>(
        `/business-profile/${profileId}/job/${jobId}`
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch job');
    }
  },

  // Create a new job posting
  createJob: async (profileId: string, jobData: import('@/types/jobs').CreateJobPostingData): Promise<ApiResponse<{
    id: string;
    title: string;
    status: string;
    created_at: string;
  }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{
        id: string;
        title: string;
        status: string;
        created_at: string;
      }>>(`/business-profile/${profileId}/job`, jobData);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create job');
    }
  },

  // Update a job posting
  updateJob: async (profileId: string, jobId: string, jobData: import('@/types/jobs').UpdateJobPostingData): Promise<ApiResponse<{
    jobId: string;
    profileId: string;
    title: string;
    status: string;
    updatedAt: string;
  }>> => {
    try {
      const response = await apiClient.put<ApiResponse<{
        jobId: string;
        profileId: string;
        title: string;
        status: string;
        updatedAt: string;
      }>>(`/business-profile/${profileId}/job/${jobId}`, jobData);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update job');
    }
  },

  // Delete a job posting
  deleteJob: async (profileId: string, jobId: string): Promise<ApiResponse<{
    jobId: string;
    profileId: string;
    deletedAt: string;
  }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{
        jobId: string;
        profileId: string;
        deletedAt: string;
      }>>(`/business-profile/${profileId}/job/${jobId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete job');
    }
  },

  // Deactivate/Activate a job posting
  toggleJobStatus: async (profileId: string, jobId: string, status: 'active' | 'inactive'): Promise<ApiResponse<{
    jobId: string;
    profileId: string;
    status: string;
    updatedAt: string;
  }>> => {
    try {
      const response = await apiClient.patch<ApiResponse<{
        jobId: string;
        profileId: string;
        status: string;
        updatedAt: string;
      }>>(`/business-profile/${profileId}/jobs/${jobId}/status`, { status });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update job status');
    }
  },

  // Get job applications
  getJobApplications: async (profileId: string, jobId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<import('@/types/jobs').JobApplicationsResponse>> => {
    try {
      // Filter out undefined, null, and empty string values
      const queryString = params ? new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => [key, value!.toString()])
      ).toString() : '';
      
      const url = queryString 
        ? `/business-profile/${profileId}/job/${jobId}/applications?${queryString}` 
        : `/business-profile/${profileId}/job/${jobId}/applications`;
      
      const response = await apiClient.get<ApiResponse<import('@/types/jobs').JobApplicationsResponse>>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch job applications');
    }
  },

  // Update application status
  updateApplicationStatus: async (profileId: string, jobId: string, applicationId: string, status: string): Promise<ApiResponse<{
    id: string;
    job_id: string;
    user_id: string;
    resume_url?: string;
    phone: string;
    email: string;
    additional_info?: {
      portfolio?: string;
      linkedin?: string;
    };
    status: string;
    created_at: string;
    updated_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
  }>> => {
    try {
      const response = await apiClient.patch<ApiResponse<{
        id: string;
        job_id: string;
        user_id: string;
        resume_url?: string;
        phone: string;
        email: string;
        additional_info?: {
          portfolio?: string;
          linkedin?: string;
        };
        status: string;
        created_at: string;
        updated_at: string;
        reviewed_by?: string;
        reviewed_at?: string;
      }>>(`/business-profile/${profileId}/job/${jobId}/application/${applicationId}/status`, { status });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update application status');
    }
  }
}
export const applicationsApi = {
  applyForJob: async (jobId: string, applicationData: import('@/types/jobs').CreateJobApplicationData): Promise<ApiResponse<{ application: import('@/types/jobs').JobApplication }>> => {
    try {
      const formData = new FormData();
      formData.append('resume', applicationData.resume);
      formData.append('phone', applicationData.phone);
      formData.append('email', applicationData.email);
      formData.append('full_name', applicationData.full_name);
      formData.append('address', applicationData.address);
      if (applicationData.portfolioUrl) {
        formData.append('portfolioUrl', applicationData.portfolioUrl);
      }
      if (applicationData.linkedinUrl) {
        formData.append('linkedinUrl', applicationData.linkedinUrl);
      }
      if (applicationData.githubUrl) {
        formData.append('githubUrl', applicationData.githubUrl);
      }

      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const responseData = contentType && contentType.includes('application/json') 
        ? await response.json() 
        : { message: await response.text() };

      if (!response.ok) {
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const errorMessages = responseData.errors.map((err: { field: string; message: string }) => 
            `${err.field}: ${err.message}`
          ).join(', ');
          throw new Error(errorMessages || responseData.message || 'Validation failed');
        }
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      return responseData as ApiResponse<{ application: import('@/types/jobs').JobApplication }>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to apply for job');
    }
  },

  fetchMyApplications: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
  }): Promise<ApiResponse<import('@/types/jobs').JobApplicationsResponse>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sort) queryParams.append('sort', params.sort);

      const queryString = queryParams.toString();
      const url = queryString ? `/user/applications?${queryString}` : '/user/applications';

      const response = await apiClient.get<ApiResponse<import('@/types/jobs').JobApplicationsResponse>>(url);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch applications');
    }
  },

  fetchApplicationById: async (applicationId: string): Promise<ApiResponse<import('@/types/jobs').ApplicationDetails>> => {
    try {
      const response = await apiClient.get<ApiResponse<import('@/types/jobs').ApplicationDetails>>(`/user/applications/${applicationId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch application details');
    }
  },

  updateApplication: async (applicationId: string, updateData: import('@/types/jobs').UpdateApplicationData): Promise<ApiResponse<import('@/types/jobs').ApplicationDetails>> => {
    try {
      const response = await apiClient.put<ApiResponse<import('@/types/jobs').ApplicationDetails>>(`/user/applications/${applicationId}`, updateData);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update application');
    }
  },

  withdrawApplication: async (applicationId: string): Promise<ApiResponse<{ deleted: boolean; application_id: string; job_id: string; job_title: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ deleted: boolean; application_id: string; job_id: string; job_title: string }>>(`/user/applications/${applicationId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to withdraw application');
    }
  },
}

/**
 * Transform backend API response to internal format
 * Backend sends: atsScore, keywordScore, formatScore, overallScore, suggestions[], review
 * Frontend expects: scores {ats, keyword, format, overall}, suggestions, review
 */
function transformEvaluationResponse(
  backendData: {
    evaluationId: string;
    fileId: string;
    fileUrl: string;
    resumeData?: import('@/types/resumeEvaluator').ResumeData;
    atsScore: number;
    keywordScore: number;
    formatScore: number;
    overallScore: number;
    experienceScore?: number;
    suggestions?: import('@/types/resumeEvaluator').SuggestionItem[];
    review?: string;
  }
): import('@/types/resumeEvaluator').StartEvaluationResponse {
  console.log('[API Transform] 🔄 Transforming backend response');
  console.log('[API Transform] Backend scores:', {
    ats: backendData.atsScore,
    keyword: backendData.keywordScore,
    format: backendData.formatScore,
    overall: backendData.overallScore,
  });

  const transformed: import('@/types/resumeEvaluator').StartEvaluationResponse = {
    evaluationId: backendData.evaluationId,
    fileId: backendData.fileId,
    fileUrl: backendData.fileUrl,
    resumeData: backendData.resumeData,
    // Keep original scores
    atsScore: backendData.atsScore,
    keywordScore: backendData.keywordScore,
    formatScore: backendData.formatScore,
    overallScore: backendData.overallScore,
    // Transform to frontend format
    scores: {
      overall: backendData.overallScore || 0,
      ats: backendData.atsScore || 0,
      keyword: backendData.keywordScore || 0,
      format: backendData.formatScore || 0,
      experience: backendData.experienceScore, // Optional
    },
    suggestions: backendData.suggestions || [],
    review: backendData.review || '',
  };

  console.log('[API Transform] ✅ Transformed successfully:', {
    hasScores: !!transformed.scores,
    suggestionsCount: transformed.suggestions?.length || 0,
    reviewLength: transformed.review?.length || 0,
  });

  return transformed;
}

export const resumeEvaluationApi = {
  startResumeEvaluation: async (
    jobName: string,
    jobDescription: string,
    resumeFile: File
  ): Promise<ApiResponse<import('@/types/resumeEvaluator').StartEvaluationResponse>> => {
    try {
      console.log('[ResumeEvaluationAPI] 📤 Starting resume evaluation API call');
      console.log('[ResumeEvaluationAPI] Request data:', {
        jobName,
        jobDescriptionLength: jobDescription.length,
        resumeFileName: resumeFile.name,
        resumeFileSize: resumeFile.size,
        resumeFileType: resumeFile.type,
      });

      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('jobDescription', jobDescription);
      formData.append('jobName', jobName);

      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
        console.log('[ResumeEvaluationAPI] ✅ Auth token found');
      } else {
        console.warn('[ResumeEvaluationAPI] ⚠️ No auth token found');
      }

      const endpoint = `${API_BASE_URL}/resumes/evaluate`;
      console.log('[ResumeEvaluationAPI] 📡 Calling endpoint:', endpoint);
      console.log('[ResumeEvaluationAPI] Request headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'None' });

      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers,
        body: formData,
        timeout: 120000,
      });

      console.log('[ResumeEvaluationAPI] 📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });

      const contentType = response.headers.get('content-type');
      const responseData = contentType && contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      console.log('[ResumeEvaluationAPI] 📋 Response data:', {
        success: responseData.success,
        message: responseData.message,
        hasData: !!responseData.data,
        evaluationId: responseData.data?.evaluationId,
        fileId: responseData.data?.fileId,
        hasScores: !!responseData.data?.scores,
        hasAtsScore: !!responseData.data?.atsScore,
        hasOverallScore: !!responseData.data?.overallScore,
        hasSuggestions: !!responseData.data?.suggestions,
        hasReview: !!responseData.data?.review,
      });

      if (!response.ok) {
        console.error('[ResumeEvaluationAPI] ❌ Response not OK:', {
          status: response.status,
          responseData,
        });
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const errorMessages = responseData.errors.map((err: { field: string; message: string }) =>
            `${err.field}: ${err.message}`
          ).join(', ');
          throw new Error(errorMessages || responseData.message || 'Evaluation failed');
        }
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      // Transform backend response to frontend format
      if (responseData.data) {
        responseData.data = transformEvaluationResponse(responseData.data);
      }

      console.log('[ResumeEvaluationAPI] ✅ API call successful');
      return responseData as ApiResponse<import('@/types/resumeEvaluator').StartEvaluationResponse>;
    } catch (error) {
      console.error('[ResumeEvaluationAPI] ❌ Error in API call:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start resume evaluation');
    }
  },
};

// ============ Chat API ============
export const chatApi = {
  /**
   * Get all conversations for the authenticated user
   */
  getConversations: async (): Promise<ApiResponse<{ conversations: import('@/lib/api/socket-chat').Conversation[] }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ conversations: import('@/lib/api/socket-chat').Conversation[] }>>('/chat/conversations');
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch conversations');
    }
  },

  /**
   * Get a specific conversation by ID
   */
  getConversation: async (conversationId: string): Promise<ApiResponse<{ conversation: import('@/lib/api/socket-chat').Conversation }>> => {
    try {
      const response = await apiClient.get<ApiResponse<{ conversation: import('@/lib/api/socket-chat').Conversation }>>(`/chat/conversations/${conversationId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch conversation');
    }
  },

  /**
   * Get messages for a conversation
   */
  getMessages: async (
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<{
    messages: import('@/lib/api/socket-chat').ChatMessage[];
    pagination: { limit: number; offset: number; count: number };
  }>> => {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const response = await apiClient.get<ApiResponse<{
        messages: import('@/lib/api/socket-chat').ChatMessage[];
        pagination: { limit: number; offset: number; count: number };
      }>>(`/chat/conversations/${conversationId}/messages?${queryParams}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch messages');
    }
  },

  /**
   * Start a new conversation (HTTP fallback)
   */
  startConversation: async (
    recipientId: string,
    initialMessage?: unknown
  ): Promise<ApiResponse<{
    conversation: import('@/lib/api/socket-chat').Conversation;
    message?: import('@/lib/api/socket-chat').ChatMessage;
    isNew: boolean;
  }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{
        conversation: import('@/lib/api/socket-chat').Conversation;
        message?: import('@/lib/api/socket-chat').ChatMessage;
        isNew: boolean;
      }>>('/chat/conversations', { recipientId, initialMessage });
      return response;
    } catch (error) {
      console.error('[chatApi] startConversation error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start conversation');
    }
  },

  /**
   * Send a message (HTTP fallback)
   */
  sendMessage: async (
    conversationId: string,
    content: unknown,
    isForwarded: boolean = false
  ): Promise<ApiResponse<{ message: import('@/lib/api/socket-chat').ChatMessage }>> => {
    try {
      const response = await apiClient.post<ApiResponse<{ message: import('@/lib/api/socket-chat').ChatMessage }>>(
        `/chat/conversations/${conversationId}/messages`,
        { content, isForwarded }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send message');
    }
  },

  /**
   * Update a message
   */
  updateMessage: async (
    messageId: string,
    content: unknown
  ): Promise<ApiResponse<{ message: import('@/lib/api/socket-chat').ChatMessage }>> => {
    try {
      const response = await apiClient.put<ApiResponse<{ message: import('@/lib/api/socket-chat').ChatMessage }>>(
        `/chat/messages/${messageId}`,
        { content }
      );
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update message');
    }
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/chat/messages/${messageId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete message');
    }
  },

  /**
   * Delete a conversation
   */
  deleteConversation: async (conversationId: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/chat/conversations/${conversationId}`);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete conversation');
    }
  },

  /**
   * Upload a file for chat message
   */
  uploadChatFile: async (file: File, conversationId: string): Promise<ApiResponse<{ fileUrl: string; fileType: string; fileName: string }>> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      if (!tokens?.access_token) {
        throw new Error('Not authenticated. Please login again.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      // Make direct fetch call instead of using apiClient to properly handle FormData
      // Note: Don't set Content-Type header - browser will set it with correct boundary
      const response = await fetch(`${env.API_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          tokenStorage.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please login again.');
        }

        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to upload file');
    }
  },
}

export const challengeApi = {
  submitSolution: async (contestId: string, file: File): Promise<ApiResponse<{ submission_id: string }>> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = {};

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const formData = new FormData();
      formData.append('submission', file);

      const response = await fetchWithTimeout(`${API_BASE_URL}/contest/${contestId}/submit`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const responseData = contentType && contentType.includes('application/json') 
        ? await response.json() 
        : { message: await response.text() };

      if (!response.ok) {
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const errorMessages = responseData.errors.map((err: { field: string; message: string }) => 
            `${err.field}: ${err.message}`
          ).join(', ');
          throw new Error(errorMessages || responseData.message || 'Validation failed');
        }
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      return responseData as ApiResponse<{ submission_id: string }>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to submit challenge solution');
    }
  },
  
  getSubmissions: async (contestId: string): Promise<ChallengeSubmissionsResponse> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/organizer/contest/${contestId}/submissions`,
        {
          method: 'GET',
          headers,
        }
      );

      return handleResponse<ChallengeSubmissionsResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch challenge submissions');
    }
  }
}

export const contestApi = {
  getAllContests: async (page = 1, limit = 10): Promise<ContestsResponse> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const offset = (page - 1) * limit;
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/organizer/contest?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers,
        }
      );

      return handleResponse<ContestsResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch contests');
    }
  },

  getContest: async (contestId: string): Promise<ContestResponse> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/contest/${contestId}`,
        {
          method: 'GET',
          headers,
        }
      );

      // Handle response without automatic redirect on 401
      const contentType = response.headers.get('content-type');
      const responseData = contentType && contentType.includes('application/json') 
        ? await response.json() 
        : { message: await response.text() };

      if (!response.ok) {
        // Don't redirect on 401 for public contest viewing
        // Just throw an error that can be caught
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch contest');
    }
  },

  startContest: async (contestId: string, data: StartContestRequest): Promise<ContestResponse> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/organizer/contest/${contestId}/start`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        }
      );

      return handleResponse<ContestResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start contest');
    }
  },

  selectWinner: async (contestId: string, submissionId: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/organizer/contest/${contestId}/winner`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ submission_id: submissionId }),
        }
      );

      type WinnerResponse = ApiResponse<{ message: string }>;
      return handleResponse<WinnerResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to select winner');
    }
  },

  registerForContest: async (
    contestId: string,
    hasProfile: boolean,
    userInfo?: { first_name: string; last_name: string; phone_number: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      // has_profile is a query parameter, not a body field
      const url = `${API_BASE_URL}/contest/${contestId}/register?has_profile=${hasProfile}`;
      
      // Only include body if user doesn't have profile
      const body = !hasProfile && userInfo ? {
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
        phoneNumber: userInfo.phone_number
      } : undefined;

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      return handleResponse<ApiResponse<{ message: string }>>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to register for contest');
    }
  },

  getContestStatus: async (contestId: string): Promise<ApiResponse<{ has_registered: boolean; has_submitted: boolean }>> => {
    try {
      const tokens = tokenStorage.getStoredTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tokens?.access_token) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/contest/${contestId}/status`,
        {
          method: 'GET',
          headers,
        }
      );

      return handleResponse<ApiResponse<{ has_registered: boolean; has_submitted: boolean }>>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch contest status');
    }
  }
}