import { apiClient } from "../api";

// Base API URL for business profiles
const BUSINESS_PROFILE_BASE = "/business-profile";

// Types for API responses
export interface BusinessAboutData {
  description?: string;
  mission?: string;
  vision?: string;
  core_values?: string;
  founder_message?: string;
  founded?: string;
  employees?: string;
  headquarters?: string;
  createdAt: string;
  updatedAt: string;
  company_introduction_video?: {
    fileId: string;
    fileUrl: string;
    filename: string;
    uploadedAt: string;
  };
}

export interface BusinessPrivateInfo {
  legalName: string;
  ein: string;
  taxId: string;
  createdAt: string;
  updatedAt: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  business_license: {
    fileId: string;
    fileUrl: string;
    filename: string;
    uploadedAt: string;
  };
  registration_certificate: {
    fileId: string;
    fileUrl: string;
    filename: string;
    uploadedAt: string;
  };
}

export interface BusinessProject {
  projectId: string;
  title: string;
  description: string;
  client?: string | null;
  status?: string | null;
  startDate: string;
  endDate?: string | null;
  project_url?: string | null;
  technologies?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAchievement {
  achievementId: string;
  award_name: string;
  description?: string;
  date_received: string;
  icon?: string;
  issuer?: string;
  category?: string;
  awarding_organization?: string;
  certificateUrl?: Array<{ file_url: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  fileId: string;
  fileUrl: string;
  filename: string;
  uploadedAt: string;
}

// API Response wrapper - matches actual endpoint structure
export interface ApiResponse<T> {
  status: number;
  message: string;
  success: boolean;
  data?: T;
  error?: string;
}

// Specific response types for each endpoint
export interface AchievementsResponse {
  achievements: BusinessAchievement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectsResponse {
  profileId: string;
  projects: BusinessProject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BannerResponse {
  bannerUrl: string;
  banner: MediaFile;
}

export interface AvatarResponse {
  avatarUrl: string;
  avatar: MediaFile;
}

export interface PrivateInfoResponse {
  profileId: string;
  ein: string;
  taxId: string;
  createdAt: string;
  legalName: string;
  updatedAt: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  business_license: MediaFile;
  registration_certificate: MediaFile;
}

/**
 * Get business profile about section
 */
export const getBusinessAbout = async (profileId: string): Promise<ApiResponse<BusinessAboutData>> => {
  try {
    const response = await apiClient.get<ApiResponse<BusinessAboutData>>(`${BUSINESS_PROFILE_BASE}/${profileId}/about`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch about section";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get business profile private info (owner only)
 */
export const getBusinessPrivateInfo = async (profileId: string): Promise<ApiResponse<PrivateInfoResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<PrivateInfoResponse>>(`${BUSINESS_PROFILE_BASE}/${profileId}/private-info`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch private info";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create business profile private info (owner only)
 */
export const createBusinessPrivateInfo = async (
  profileId: string,
  privateInfoData: {
    taxId: string;
    ein: string;
    legalName: string;
    bankDetails: {
      accountNumber: string;
      routingNumber: string;
      bankName: string;
    };
    registration_certificate?: File;
    business_license?: File;
  }
): Promise<ApiResponse<PrivateInfoResponse>> => {
  try {
    const formData = new FormData();
    
    // Add text fields
    formData.append('taxId', privateInfoData.taxId);
    formData.append('ein', privateInfoData.ein);
    formData.append('legalName', privateInfoData.legalName);
    formData.append('bankDetails', JSON.stringify(privateInfoData.bankDetails));
    
    // Add file fields if provided
    if (privateInfoData.registration_certificate) {
      formData.append('registration_certificate', privateInfoData.registration_certificate);
    }
    if (privateInfoData.business_license) {
      formData.append('business_license', privateInfoData.business_license);
    }
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/private-info`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create private info' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to create private info',
        success: false,
        error: errorData.message || 'Failed to create private info',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create private info";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business profile private info (owner only)
 */
export const updateBusinessPrivateInfo = async (
  profileId: string,
  privateInfoData: {
    taxId?: string;
    ein?: string;
    legalName?: string;
    bankDetails?: {
      accountNumber?: string;
      routingNumber?: string;
      bankName?: string;
    };
    registration_certificate?: File;
    business_license?: File;
  }
): Promise<ApiResponse<PrivateInfoResponse>> => {
  try {
    const formData = new FormData();
    
    // Add text fields if provided
    if (privateInfoData.taxId) formData.append('taxId', privateInfoData.taxId);
    if (privateInfoData.ein) formData.append('ein', privateInfoData.ein);
    if (privateInfoData.legalName) formData.append('legalName', privateInfoData.legalName);
    if (privateInfoData.bankDetails) formData.append('bankDetails', JSON.stringify(privateInfoData.bankDetails));
    
    // Add file fields if provided
    if (privateInfoData.registration_certificate) {
      formData.append('registration_certificate', privateInfoData.registration_certificate);
    }
    if (privateInfoData.business_license) {
      formData.append('business_license', privateInfoData.business_license);
    }
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/private-info`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update private info' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to update private info',
        success: false,
        error: errorData.message || 'Failed to update private info',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update private info";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business profile private info (owner only)
 */
export const deleteBusinessPrivateInfo = async (
  profileId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/private-info`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete private info";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get business profile projects
 */
export const getBusinessProjects = async (profileId: string): Promise<ApiResponse<ProjectsResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<ProjectsResponse>>(`${BUSINESS_PROFILE_BASE}/${profileId}/projects`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch projects";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create business project
 */
export const createBusinessProject = async (
  profileId: string,
  projectData: Partial<BusinessProject>
): Promise<ApiResponse<BusinessProject>> => {
  try {
    const response = await apiClient.post<ApiResponse<BusinessProject>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/projects`,
      projectData
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create project";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business project
 */
export const updateBusinessProject = async (
  profileId: string,
  projectId: string,
  projectData: Partial<BusinessProject>
): Promise<ApiResponse<BusinessProject>> => {
  try {
    const response = await apiClient.put<ApiResponse<BusinessProject>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/projects/${projectId}`,
      projectData
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update project";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business project
 */
export const deleteBusinessProject = async (
  profileId: string,
  projectId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/projects/${projectId}`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get business profile achievements
 */
export const getBusinessAchievements = async (profileId: string): Promise<ApiResponse<AchievementsResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<AchievementsResponse>>(`${BUSINESS_PROFILE_BASE}/${profileId}/achievements`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch achievements";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get business profile banner
 */
export const getBusinessBanner = async (profileId: string): Promise<ApiResponse<BannerResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<BannerResponse>>(`${BUSINESS_PROFILE_BASE}/${profileId}/banner`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch banner";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get business profile avatar
 */
export const getBusinessAvatar = async (profileId: string): Promise<ApiResponse<AvatarResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<AvatarResponse>>(`${BUSINESS_PROFILE_BASE}/${profileId}/avatar`);
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch avatar";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Upload business profile avatar
 */
export const uploadBusinessAvatar = async (
  profileId: string,
  avatarFile: File
): Promise<ApiResponse<AvatarResponse>> => {
  try {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to upload avatar' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to upload avatar',
        success: false,
        error: errorData.message || 'Failed to upload avatar',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business profile avatar
 */
export const updateBusinessAvatar = async (
  profileId: string,
  avatarFile: File
): Promise<ApiResponse<AvatarResponse>> => {
  try {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/avatar`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update avatar' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to update avatar',
        success: false,
        error: errorData.message || 'Failed to update avatar',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update avatar";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business profile avatar
 */
export const deleteBusinessAvatar = async (
  profileId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/avatar`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete avatar";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Upload business profile banner
 */
export const uploadBusinessBanner = async (
  profileId: string,
  bannerFile: File
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const formData = new FormData();
    formData.append('banner', bannerFile);
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/banner`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to upload banner' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to upload banner',
        success: false,
        error: errorData.message || 'Failed to upload banner',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload banner";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business profile banner
 */
export const updateBusinessBanner = async (
  profileId: string,
  bannerFile: File
): Promise<ApiResponse<BannerResponse>> => {
  try {
    const formData = new FormData();
    formData.append('banner', bannerFile);
    
    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/banner`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update banner' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to update banner',
        success: false,
        error: errorData.message || 'Failed to update banner',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update banner";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business profile banner
 */
export const deleteBusinessBanner = async (
  profileId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/banner`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete banner";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create/Update business profile about section
 */
export const postBusinessAbout = async (
  profileId: string, 
  aboutData: Partial<BusinessAboutData>
): Promise<ApiResponse<BusinessAboutData>> => {
  try {
    const response = await apiClient.post<ApiResponse<BusinessAboutData>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/about`,
      aboutData
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create about section";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business profile about section
 */
export const updateBusinessAbout = async (
  profileId: string, 
  aboutData: Partial<BusinessAboutData>
): Promise<ApiResponse<BusinessAboutData>> => {
  try {
    const response = await apiClient.put<ApiResponse<BusinessAboutData>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/about`,
      aboutData
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update about section";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business profile about section
 */
export const deleteBusinessAbout = async (
  profileId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/about`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete about section";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get single business achievement
 */
export const getBusinessAchievement = async (
  profileId: string,
  achievementId: string
): Promise<ApiResponse<{ achievement: BusinessAchievement }>> => {
  try {
    const response = await apiClient.get<ApiResponse<{ achievement: BusinessAchievement }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/achievements/${achievementId}`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch achievement";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create business achievement
 */
export const createBusinessAchievement = async (
  profileId: string,
  achievementData: Omit<BusinessAchievement, 'achievementId' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<{ achievement: BusinessAchievement }>> => {
  try {
    const formData = new FormData();
    
    // Add achievement data
    formData.append('award_name', achievementData.award_name);
    if (achievementData.description) formData.append('description', achievementData.description);
    formData.append('date_received', achievementData.date_received);
    if (achievementData.awarding_organization) formData.append('awarding_organization', achievementData.awarding_organization);
    if (achievementData.category) formData.append('category', achievementData.category);
    if (achievementData.issuer) formData.append('issuer', achievementData.issuer);
    if (achievementData.icon) formData.append('icon', achievementData.icon);
    
    // Handle certificate URLs if provided
    if (achievementData.certificateUrl && achievementData.certificateUrl.length > 0) {
      formData.append('certificateUrl', JSON.stringify(achievementData.certificateUrl));
    }

    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/achievements`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create achievement' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to create achievement',
        success: false,
        error: errorData.message || 'Failed to create achievement',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create achievement";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update business achievement
 */
export const updateBusinessAchievement = async (
  profileId: string,
  achievementId: string,
  achievementData: Partial<Omit<BusinessAchievement, 'achievementId' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResponse<{ achievement: BusinessAchievement }>> => {
  try {
    const formData = new FormData();
    
    // Add achievement data
    if (achievementData.award_name) formData.append('award_name', achievementData.award_name);
    if (achievementData.description) formData.append('description', achievementData.description);
    if (achievementData.date_received) formData.append('date_received', achievementData.date_received);
    if (achievementData.awarding_organization) formData.append('awarding_organization', achievementData.awarding_organization);
    if (achievementData.category) formData.append('category', achievementData.category);
    if (achievementData.issuer) formData.append('issuer', achievementData.issuer);
    if (achievementData.icon) formData.append('icon', achievementData.icon);
    
    // Handle certificate URLs if provided
    if (achievementData.certificateUrl) {
      formData.append('certificateUrl', JSON.stringify(achievementData.certificateUrl));
    }

    // Import necessary functions
    const { tokenStorage } = await import('../tokens');
    const { env } = await import('../env');
    
    const tokens = tokenStorage.getStoredTokens();
    const headers: Record<string, string> = {};
    
    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    
    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(`${env.API_URL}${BUSINESS_PROFILE_BASE}/${profileId}/achievements/${achievementId}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update achievement' }));
      return {
        status: response.status,
        message: errorData.message || 'Failed to update achievement',
        success: false,
        error: errorData.message || 'Failed to update achievement',
      };
    }
    
    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update achievement";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Delete business achievement
 */
export const deleteBusinessAchievement = async (
  profileId: string,
  achievementId: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${BUSINESS_PROFILE_BASE}/${profileId}/achievements/${achievementId}`
    );
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete achievement";
    return {
      status: 500,
      message: errorMessage,
      success: false,
      error: errorMessage,
    };
  }
};