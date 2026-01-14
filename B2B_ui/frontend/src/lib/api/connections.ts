import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/tokens';

/**
 * Connection Request Response
 */
export interface ConnectionRequestData {
  notification_id: string;
  sender_id: string;
  recipient_id: string;
  type: 'connect_request';
  accepted: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface ConnectionRequestResponse {
  status: number;
  message: string;
  success: boolean;
  data?: ConnectionRequestData;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Send a connection request to another user
 * POST /api/connection/request
 */
export async function sendConnectionRequest(
  recipientId: string
): Promise<ConnectionRequestResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recipientId)) {
      return {
        status: 400,
        message: 'Invalid recipient ID format',
        success: false,
        errors: [
          {
            field: 'recipient_id',
            message: 'Recipient ID must be a valid UUID',
          },
        ],
      };
    }

    // Get auth token
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to send connection requests',
          },
        ],
      };
    }

    const response = await fetch(`${env.API_URL}/connection/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        recipient_id: recipientId,
      }),
    });

    const data = await response.json();

    // Return the response as-is from backend
    return {
      status: response.status,
      message: data.message || 'Connection request processed',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('Connection request error:', error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Failed to send connection request',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Accept a connection request
 * POST /api/connection/accept
 * @param senderId - UUID of the user who sent the connection request
 */
export async function acceptConnectionRequest(
  senderId: string
): Promise<ConnectionRequestResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(senderId)) {
      return {
        status: 400,
        message: 'Invalid sender ID format',
        success: false,
        errors: [
          {
            field: 'sender_id',
            message: 'Sender ID must be a valid UUID',
          },
        ],
      };
    }

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to accept connection requests',
          },
        ],
      };
    }

    const requestBody = {
      sender_id: senderId,
      connection_status: 'accepted', // Note: API uses "connection_status" (typo in API)
    };

    const response = await fetch(`${env.API_URL}/connection/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connection request accepted',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Accept connection error:', error);
    return {
      status: 500,
      message: 'Failed to accept connection request',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Reject a connection request
 * POST /api/connection/reject
 * @param recipientId - UUID of the recipient (the user rejecting the request)
 */
/**
 * Reject a connection request received from another user
 * POST /api/connection/reject
 * @param senderId - UUID of the user who sent you the connection request
 */
export async function rejectConnectionRequest(
  senderId: string
): Promise<ConnectionRequestResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(senderId)) {
      return {
        status: 400,
        message: 'Invalid sender ID format',
        success: false,
        errors: [
          {
            field: 'sender_id',
            message: 'Sender ID must be a valid UUID',
          },
        ],
      };
    }

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to reject connection requests',
          },
        ],
      };
    }

    const requestBody = {
      sender_id: senderId,
    };

    const response = await fetch(`${env.API_URL}/connection/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connection request rejected',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Reject connection error:', error);
    return {
      status: 500,
      message: 'Failed to reject connection request',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Withdraw a connection request that was sent
 * DELETE /api/connection/withdraw
 * @param recipientId - UUID of the user to whom the request was sent
 */
export async function withdrawConnectionRequest(
  recipientId: string
): Promise<ConnectionRequestResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recipientId)) {
      return {
        status: 400,
        message: 'Invalid recipient ID format',
        success: false,
        errors: [
          {
            field: 'recipient_id',
            message: 'Recipient ID must be a valid UUID',
          },
        ],
      };
    }

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to withdraw connection requests',
          },
        ],
      };
    }

    const requestBody = {
      recipient_id: recipientId,
    };

    const response = await fetch(`${env.API_URL}/connection/withdraw`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connection request withdrawn',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Withdraw connection error:', error);
    return {
      status: 500,
      message: 'Failed to withdraw connection request',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Remove/Disconnect an existing connection
 * DELETE /api/connection/remove
 * @param userId - UUID of the user to disconnect from
 */
export async function removeConnection(
  userId: string
): Promise<ConnectionRequestResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return {
        status: 400,
        message: 'Invalid user ID format',
        success: false,
        errors: [
          {
            field: 'user_id',
            message: 'User ID must be a valid UUID',
          },
        ],
      };
    }

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to remove connections',
          },
        ],
      };
    }

    const response = await fetch(`${env.API_URL}/connection/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        connected_user_id: userId,
      }),
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connection removed successfully',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Remove connection error:', error);
    return {
      status: 500,
      message: 'Failed to remove connection',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Check connection status with a user
 * GET /api/connection/status/:user_id
 */
export interface ConnectionStatusResponse {
  status: number;
  message: string;
  success: boolean;
  data?: {
    user_id: string;
    is_connected: boolean;
    connection_id?: string;
    connected_since?: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function checkConnectionStatus(
  userId: string
): Promise<ConnectionStatusResponse> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return {
        status: 400,
        message: 'Invalid user ID format',
        success: false,
        errors: [
          {
            field: 'user_id',
            message: 'User ID must be a valid UUID',
          },
        ],
      };
    }

    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Not authenticated',
        success: false,
        errors: [
          {
            field: 'auth',
            message: 'No authentication token found',
          },
        ],
      };
    }

    const response = await fetch(`${env.API_URL}/connection/status/${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connection status retrieved',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Check connection status error:', error);
    return {
      status: 500,
      message: 'Failed to check connection status',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Get connections list
 * GET /api/connection/list
 */
export interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  profile_pic?: string;
  company?: string;
  designation?: string;
}

export interface ConnectionData {
  connection_id: string;
  user_id: string;
  connected_id: string;
  connected_user: ConnectedUser;
  created_at: string;
  updated_at: string;
}

export interface ConnectionsListResponse {
  status: number;
  message: string;
  success: boolean;
  data?: {
    connections: ConnectionData[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ConnectionRecommendation {
  user_id: string;
  name: string;
  email?: string;
  headline?: string;
  profession?: string;
  company?: string;
  profile_pic?: string;
  joined_at?: string;
  mutual_connections?: number;
}

export interface ConnectionRecommendationsResponse {
  status: number;
  message: string;
  success: boolean;
  data?: ConnectionRecommendation[] | { recommendations?: ConnectionRecommendation[] };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface GetConnectionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'pending' | 'blocked';
}

export async function getConnectionsList(
  params: GetConnectionsParams = {}
): Promise<ConnectionsListResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Not authenticated',
        success: false,
        errors: [
          {
            field: 'auth',
            message: 'No authentication token found',
          },
        ],
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const url = `${env.API_URL}/connection/list${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Connections fetched successfully',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Get connections list error:', error);
    return {
      status: 500,
      message: 'Failed to fetch connections',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

export async function getConnectionRecommendations(
  limit = 6
): Promise<ConnectionRecommendationsResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Not authenticated',
        success: false,
        errors: [
          {
            field: 'auth',
            message: 'No authentication token found',
          },
        ],
      };
    }

    const params = new URLSearchParams({
      limit: String(limit),
      sort: 'recent',
      page: '1',
    });

    const url = `${env.API_URL}/profile/search?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    const payload = data?.data;

    const raw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(payload?.profiles)
            ? payload.profiles
            : Array.isArray(data?.profiles)
              ? data.profiles
              : [];

    const recommendations = raw
      .map((item: Record<string, unknown>): ConnectionRecommendation => {
        const personalInfo = (item.personal_information || {}) as Record<string, unknown>;
        const aboutInfo = (item.about || {}) as Record<string, unknown>;

        const firstName = (item.first_name as string | undefined) ?? (personalInfo.first_name as string | undefined) ?? '';
        const lastName = (item.last_name as string | undefined) ?? (personalInfo.last_name as string | undefined) ?? '';

        const normalizedName = [firstName, lastName]
          .map((part) => (typeof part === 'string' ? part.trim() : ''))
          .filter(Boolean)
          .join(' ');

        const professionValue =
          (item.profession as string | undefined) ??
          (item.industry as string | undefined) ??
          (personalInfo.profession as string | undefined) ??
          (aboutInfo.industry as string | undefined) ??
          (item.role as string | undefined);

        const userId = (item.user_id as string | undefined) ?? (item.id as string | undefined) ?? (item.userId as string | undefined) ?? '';
        const displayName =
          (item.name as string | undefined) ??
          (normalizedName || undefined) ??
          (item.username as string | undefined) ??
          'Unknown User';

        return {
          user_id: userId,
          name: displayName,
          email:
            (item.email as string | undefined) ??
            (item.user_email as string | undefined) ??
            (personalInfo.email as string | undefined),
          headline:
            (item.headline as string | undefined) ??
            (item.professional_summary as string | undefined) ??
            (aboutInfo.professional_summary as string | undefined) ??
            (aboutInfo.headline as string | undefined),
          profession: professionValue,
          company: (item.company as string | undefined) ?? (item.organization as string | undefined) ?? (aboutInfo.company as string | undefined),
          profile_pic:
            (item.avatar_url as string | undefined) ??
            (item.profile_pic as string | undefined) ??
            (item.profile_picture as string | undefined) ??
            (item.avatar as string | undefined) ??
            (personalInfo.profile_picture as string | undefined),
          joined_at: (item.joined_at as string | undefined) ?? (item.created_at as string | undefined),
          mutual_connections: (item.mutual_connections as number | undefined) ?? (item.mutuals as number | undefined),
        };
      })
      .filter((rec: ConnectionRecommendation) => Boolean(rec.user_id));

    return {
      status: response.status,
      message: data.message || 'Recommendations fetched successfully',
      success: data.success ?? response.ok,
      data: recommendations,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Get connection recommendations error:', error);
    return {
      status: 500,
      message: 'Failed to fetch connection recommendations',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Get sent connection requests (pending requests sent by the user)
 * GET /api/connection/sent
 */
export interface SentRequestData {
  notification_id: string;
  sender_id: string;
  recipient_id: string;
  type: string;
  read: boolean;
  created_at: string;
  payload?: {
    from: string;
    connect_request: string;
  };
  recipient_email?: string;
  recipient_role?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_profile_pic?: string;
}

export interface SentRequestsResponse {
  status: number;
  message: string;
  success: boolean;
  data?: SentRequestData[];
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface GetSentRequestsParams {
  recipient?: string; // Email or UUID to filter by specific recipient
}

export async function getSentRequests(
  params: GetSentRequestsParams = {}
): Promise<SentRequestsResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in to view sent requests',
          },
        ],
      };
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.recipient) queryParams.append('recipient', params.recipient);

    const queryString = queryParams.toString();
    const url = `${env.API_URL}/connection/sent${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    return {
      status: response.status,
      message: data.message || 'Sent requests fetched successfully',
      success: data.success || response.ok,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error('💥 Get sent requests error:', error);
    return {
      status: 500,
      message: 'Failed to fetch sent requests',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Check if a specific user has sent a connection request to the current user
 * Gets pending notifications and filters for requests from a specific sender
 */
export interface PendingRequestCheckResponse {
  status: number;
  message: string;
  success: boolean;
  hasPendingRequest: boolean;
  requestData?: Record<string, unknown>;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function checkPendingRequestFromUser(
  senderId: string
): Promise<PendingRequestCheckResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        hasPendingRequest: false,
        errors: [
          {
            field: 'authorization',
            message: 'Please log in',
          },
        ],
      };
    }

    // Fetch all pending notifications
    const url = `${env.API_URL}/connection/notifications?status=pending&type=connect_request`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        status: response.status,
        message: data.message || 'Failed to check pending requests',
        success: false,
        hasPendingRequest: false,
        errors: data.errors,
      };
    }

    // Find request from this specific sender
    const notifications = data.data?.notifications || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestFromUser = notifications.find(
      (notif: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = notif as any;
        return n.sender_id === senderId && n.connect_request === 'pending';
      }
    );

    return {
      status: 200,
      message: 'Check completed',
      success: true,
      hasPendingRequest: !!requestFromUser,
      requestData: requestFromUser,
    };
  } catch (error) {
    console.error('💥 Check pending request error:', error);
    return {
      status: 500,
      message: 'Failed to check pending requests',
      success: false,
      hasPendingRequest: false,
      errors: [
        {
          field: 'network',
          message: 'Network error. Please try again.',
        },
      ],
    };
  }
}

/**
 * Get suggested users for connection
 * GET /api/connection/suggested
 */
export interface SuggestedUser {
  user_id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic?: string;
  role?: string;
  headline?: string;
  company_name?: string;
  created_at: string;
}

export interface SuggestedUsersResponse {
  status: number;
  message: string;
  success: boolean;
  data?: {
    users: SuggestedUser[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function getSuggestedUsers(
  page = 1,
  limit = 20
): Promise<SuggestedUsersResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        status: 401,
        message: 'Authentication required',
        success: false,
        errors: [
          {
            field: 'authorization',
            message: 'No access token found',
          },
        ],
      };
    }

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${env.API_URL}/connection/suggested?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (response.status === 200 && data.success) {
      return {
        status: 200,
        message: data.message || 'Suggested users fetched successfully',
        success: true,
        data: data.data,
      };
    }

    return {
      status: response.status,
      message: data.message || 'Failed to fetch suggested users',
      success: false,
      errors: data.errors,
    };
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Network error',
      success: false,
      errors: [
        {
          field: 'network',
          message: 'Failed to connect to server',
        },
      ],
    };
  }
}
