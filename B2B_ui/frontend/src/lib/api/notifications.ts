import { env } from "@/lib/env";
import { tokenStorage } from "@/lib/tokens";

// --- TYPES ---
export type NotificationStatus = "pending" | "accepted" | "rejected" | "all";
export type NotificationType = "connect_request";

export interface SenderDetails {
  id: string;
  name: string;
  email: string;
}

export interface NotificationItem {
  notification_id: string;
  sender_id: string;
  recipient_id: string;
  sender_details: SenderDetails;
  type: NotificationType;
  connect_request: "pending" | "accepted" | "rejected";
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unread_count: number;
  pending_count: number;
}

export interface NotificationsResponse {
  status: number;
  message: string;
  success: boolean;
  data?: NotificationsData;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: NotificationType;
}

// --- API FUNCTIONS ---

/**
 * Fetch notifications from the API
 * @param params - Query parameters for filtering notifications
 * @returns Promise with notifications response
 */
export async function getNotifications(
  params: GetNotificationsParams = {}
): Promise<NotificationsResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        status: 401,
        message: "Authentication required",
        success: false,
        errors: [
          {
            field: "authorization",
            message: "No access token found",
          },
        ],
      };
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.type) queryParams.append("type", params.type);

    const queryString = queryParams.toString();
    const url = `${env.API_URL}/connection/notifications${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const data = await response.json();

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      return {
        status: 401,
        message: data.message || "Authentication required",
        success: false,
        errors: data.errors || [
          {
            field: "authorization",
            message: "Invalid or expired token",
          },
        ],
      };
    }

    // Handle 400 - Bad Request
    if (response.status === 400) {
      return {
        status: 400,
        message: data.message || "Invalid request parameters",
        success: false,
        errors: data.errors,
      };
    }

    // Handle 200 - Success
    if (response.status === 200 && data.success) {
      return {
        status: 200,
        message: data.message,
        success: true,
        data: data.data,
      };
    }

    // Handle unexpected responses
    return {
      status: response.status,
      message: data.message || "Failed to fetch notifications",
      success: false,
      errors: data.errors,
    };
  } catch (error) {
    console.error("💥 Error fetching notifications:", error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : "Network error",
      success: false,
      errors: [
        {
          field: "network",
          message: "Failed to connect to server",
        },
      ],
    };
  }
}

/**
 * Mark a notification as read
 * @param notificationId - UUID of the notification
 * @returns Promise with success status
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const tokens = tokenStorage.getStoredTokens();

    if (!tokens?.access_token) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    const response = await fetch(
      `${env.API_URL}/connection/notifications/read`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          notification_id: notificationId,
        }),
      }
    );

    const data = await response.json();

    if (response.status === 200 && data.success) {
      return {
        success: true,
        message: data.message || "Notification marked as read",
      };
    }

    return {
      success: false,
      message: data.message || "Failed to mark notification as read",
    };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      message: "Network error",
    };
  }
}
