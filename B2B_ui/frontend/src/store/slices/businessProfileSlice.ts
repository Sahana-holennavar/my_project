import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { businessProfileApi } from "@/lib/api";
import {
  getBusinessAbout,
  getBusinessPrivateInfo,
  createBusinessPrivateInfo,
  updateBusinessPrivateInfo,
  deleteBusinessPrivateInfo,
  getBusinessProjects,
  createBusinessProject,
  updateBusinessProject,
  deleteBusinessProject,
  getBusinessAchievements,
  createBusinessAchievement,
  updateBusinessAchievement,
  deleteBusinessAchievement,
  getBusinessBanner,
  uploadBusinessBanner,
  updateBusinessBanner,
  deleteBusinessBanner,
  getBusinessAvatar,
  uploadBusinessAvatar,
  updateBusinessAvatar,
  deleteBusinessAvatar,
  postBusinessAbout,
  updateBusinessAbout,
  deleteBusinessAbout,
  type BusinessAboutData,
  type BusinessPrivateInfo,
  type BusinessProject,
  type BusinessAchievement,
  type MediaFile,
} from "@/lib/api/businessProfileSections";
import type { BusinessProfileData, BusinessProfile, CreatedBusinessProfile } from "@/types/auth";

// ============================================
// STATE TYPES
// ============================================

export interface BusinessProfileState {
  // Business profiles owned by user
  profiles: BusinessProfile[];
  
  // Current business profile being created/edited
  currentProfile: CreatedBusinessProfile | null;
  
  // Current business profile being viewed/edited for sections
  selectedProfile: BusinessProfile | null;
  
  // Section-specific data for current profile
  sections: {
    about: BusinessAboutData | null;
    privateInfo: BusinessPrivateInfo | null;
    projects: BusinessProject[];
    achievements: BusinessAchievement[];
    banner: MediaFile | null;
    avatar: MediaFile | null;
  };
  
  // Loading states
  loading: boolean;
  creating: boolean;
  fetching: boolean;
  addingSections: {
    about: boolean;
    projects: boolean;
    achievements: boolean;
  };
  deletingSections: {
    about: boolean;
    projects: boolean;
    achievements: boolean;
  };
  avatar: {
    uploading: boolean;
    updating: boolean;
    deleting: boolean;
    fetching: boolean;
  };
  banner: {
    uploading: boolean;
    updating: boolean;
    deleting: boolean;
    fetching: boolean;
  };
  projects: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    fetching: boolean;
  };
  achievements: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    fetching: boolean;
  };
  privateInfo: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    fetching: boolean;
  };
  
  // Section-specific loading states
  sectionLoading: {
    about: boolean;
    privateInfo: boolean;
    projects: boolean;
    achievements: boolean;
    banner: boolean;
    avatar: boolean;
  };
  
  // Error handling
  error: string | null;
  sectionErrors: {
    about: string | null;
    privateInfo: string | null;
    projects: string | null;
    achievements: string | null;
    banner: string | null;
    avatar: string | null;
  };
  
  // Form state
  formData: Partial<BusinessProfileData>;
  
  // Modal and section management
  showAddSectionsModal: boolean;
  activeSectionForm: "about" | "projects" | "achievements" | null;
}

export interface BusinessAboutFormData {
  description?: string;
  mission?: string;
  vision?: string;
  core_values?: string;
  founder_message?: string;
  founded?: string;
  headquarters?: string;
  employees?: string;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: BusinessProfileState = {
  profiles: [],
  currentProfile: null,
  selectedProfile: null,
  sections: {
    about: null,
    privateInfo: null,
    projects: [],
    achievements: [],
    banner: null,
    avatar: null,
  },
  loading: false,
  creating: false,
  fetching: false,
  addingSections: {
    about: false,
    projects: false,
    achievements: false,
  },
  deletingSections: {
    about: false,
    projects: false,
    achievements: false,
  },
  avatar: {
    uploading: false,
    updating: false,
    deleting: false,
    fetching: false,
  },
  banner: {
    uploading: false,
    updating: false,
    deleting: false,
    fetching: false,
  },
  projects: {
    creating: false,
    updating: false,
    deleting: false,
    fetching: false,
  },
  achievements: {
    creating: false,
    updating: false,
    deleting: false,
    fetching: false,
  },
  privateInfo: {
    creating: false,
    updating: false,
    deleting: false,
    fetching: false,
  },
  sectionLoading: {
    about: false,
    privateInfo: false,
    projects: false,
    achievements: false,
    banner: false,
    avatar: false,
  },
  error: null,
  sectionErrors: {
    about: null,
    privateInfo: null,
    projects: null,
    achievements: null,
    banner: null,
    avatar: null,
  },
  formData: {
    companyName: '',
    company_type: '',
    industry: '',
    company_size: '',
    primary_email: '',
    additional_email: [],
    additional_phone_numbers: [],
    privacy_settings: {
      profile_visibility: 'public',
      contact_visibility: 'private'
    }
  },
  showAddSectionsModal: false,
  activeSectionForm: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Create new business profile
 */
export const createBusinessProfile = createAsyncThunk<
  CreatedBusinessProfile,
  BusinessProfileData,
  { rejectValue: string }
>("businessProfile/create", async (businessData, { rejectWithValue }) => {
  try {
    const response = await businessProfileApi.createBusinessProfile(businessData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to create business profile");
    }
    
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to create business profile");
  }
});

/**
 * Fetch business profile about section
 */
export const fetchBusinessAbout = createAsyncThunk<
  BusinessAboutData,
  string,
  { rejectValue: string }
>("businessProfile/fetchAbout", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessAbout(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch about section");
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch about section");
  }
});

/**
 * Fetch business profile private info
 */
export const fetchBusinessPrivateInfo = createAsyncThunk<
  BusinessPrivateInfo,
  string,
  { rejectValue: string }
>("businessProfile/fetchPrivateInfo", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessPrivateInfo(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch private info");
    }
    // Convert PrivateInfoResponse to BusinessPrivateInfo
    const privateInfo: BusinessPrivateInfo = {
      legalName: response.data.legalName,
      ein: response.data.ein,
      taxId: response.data.taxId,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
      bankDetails: response.data.bankDetails,
      business_license: response.data.business_license,
      registration_certificate: response.data.registration_certificate,
    };
    return privateInfo;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch private info");
  }
});

/**
 * Create business profile private info
 */
export const createBusinessPrivateInfoAction = createAsyncThunk<
  BusinessPrivateInfo,
  {
    profileId: string;
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
    };
  },
  { rejectValue: string }
>("businessProfile/createPrivateInfo", async ({ profileId, privateInfoData }, { rejectWithValue }) => {
  try {
    const response = await createBusinessPrivateInfo(profileId, privateInfoData);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to create private info");
    }
    
    // Convert PrivateInfoResponse to BusinessPrivateInfo
    const privateInfo: BusinessPrivateInfo = {
      legalName: response.data.legalName,
      ein: response.data.ein,
      taxId: response.data.taxId,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
      bankDetails: response.data.bankDetails,
      business_license: response.data.business_license,
      registration_certificate: response.data.registration_certificate,
    };
    
    return privateInfo;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to create private info");
  }
});

/**
 * Update business profile private info
 */
export const updateBusinessPrivateInfoAction = createAsyncThunk<
  BusinessPrivateInfo,
  {
    profileId: string;
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
    };
  },
  { rejectValue: string }
>("businessProfile/updatePrivateInfo", async ({ profileId, privateInfoData }, { rejectWithValue }) => {
  try {
    const response = await updateBusinessPrivateInfo(profileId, privateInfoData);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to update private info");
    }
    
    // Convert PrivateInfoResponse to BusinessPrivateInfo
    const privateInfo: BusinessPrivateInfo = {
      legalName: response.data.legalName,
      ein: response.data.ein,
      taxId: response.data.taxId,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
      bankDetails: response.data.bankDetails,
      business_license: response.data.business_license,
      registration_certificate: response.data.registration_certificate,
    };
    
    return privateInfo;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update private info");
  }
});

/**
 * Delete business profile private info
 */
export const deleteBusinessPrivateInfoAction = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("businessProfile/deletePrivateInfo", async (profileId, { rejectWithValue }) => {
  try {
    const response = await deleteBusinessPrivateInfo(profileId);
    if (!response.success) {
      return rejectWithValue(response.error || "Failed to delete private info");
    }
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete private info");
  }
});

/**
 * Fetch business projects
 */
export const fetchBusinessProjects = createAsyncThunk<
  BusinessProject[],
  string,
  { rejectValue: string }
>("businessProfile/fetchProjects", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessProjects(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch projects");
    }
    return response.data.projects;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch projects");
  }
});

/**
 * Create business project
 */
export const createBusinessProjectAction = createAsyncThunk<
  BusinessProject,
  { profileId: string; projectData: Partial<BusinessProject> },
  { rejectValue: string }
>("businessProfile/createProject", async ({ profileId, projectData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await createBusinessProject(profileId, projectData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to create project");
    }
    
    // Refresh projects data after successful creation
    await dispatch(fetchBusinessProjects(profileId));
    
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to create project");
  }
});

/**
 * Update business project
 */
export const updateBusinessProjectAction = createAsyncThunk<
  BusinessProject,
  { profileId: string; projectId: string; projectData: Partial<BusinessProject> },
  { rejectValue: string }
>("businessProfile/updateProject", async ({ profileId, projectId, projectData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await updateBusinessProject(profileId, projectId, projectData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to update project");
    }
    
    // Refresh projects data after successful update
    await dispatch(fetchBusinessProjects(profileId));
    
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update project");
  }
});

/**
 * Delete business project
 */
export const deleteBusinessProjectAction = createAsyncThunk<
  string,
  { profileId: string; projectId: string },
  { rejectValue: string }
>("businessProfile/deleteProject", async ({ profileId, projectId }, { rejectWithValue, dispatch }) => {
  try {
    const response = await deleteBusinessProject(profileId, projectId);
    
    if (!response.success) {
      return rejectWithValue(response.message || "Failed to delete project");
    }
    
    // Refresh projects data after successful deletion
    await dispatch(fetchBusinessProjects(profileId));
    
    return projectId;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete project");
  }
});

/**
 * Fetch business profile achievements
 */
export const fetchBusinessAchievements = createAsyncThunk<
  BusinessAchievement[],
  string,
  { rejectValue: string }
>("businessProfile/fetchAchievements", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessAchievements(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch achievements");
    }
    return response.data.achievements || [];
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch achievements");
  }
});

/**
 * Create business achievement
 */
export const createBusinessAchievementAction = createAsyncThunk<
  BusinessAchievement,
  { profileId: string; achievementData: Omit<BusinessAchievement, 'achievementId' | 'createdAt' | 'updatedAt'> },
  { rejectValue: string }
>("businessProfile/createAchievement", async ({ profileId, achievementData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await createBusinessAchievement(profileId, achievementData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to create achievement");
    }
    
    // Refresh achievements data after successful creation
    await dispatch(fetchBusinessAchievements(profileId));
    
    return response.data.achievement;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to create achievement");
  }
});

/**
 * Update business achievement
 */
export const updateBusinessAchievementAction = createAsyncThunk<
  BusinessAchievement,
  { profileId: string; achievementId: string; achievementData: Partial<Omit<BusinessAchievement, 'achievementId' | 'createdAt' | 'updatedAt'>> },
  { rejectValue: string }
>("businessProfile/updateAchievement", async ({ profileId, achievementId, achievementData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await updateBusinessAchievement(profileId, achievementId, achievementData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to update achievement");
    }
    
    // Refresh achievements data after successful update
    await dispatch(fetchBusinessAchievements(profileId));
    
    return response.data.achievement;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update achievement");
  }
});

/**
 * Delete business achievement
 */
export const deleteBusinessAchievementAction = createAsyncThunk<
  string,
  { profileId: string; achievementId: string },
  { rejectValue: string }
>("businessProfile/deleteAchievement", async ({ profileId, achievementId }, { rejectWithValue, dispatch }) => {
  try {
    const response = await deleteBusinessAchievement(profileId, achievementId);
    
    if (!response.success) {
      return rejectWithValue(response.message || "Failed to delete achievement");
    }
    
    // Refresh achievements data after successful deletion
    await dispatch(fetchBusinessAchievements(profileId));
    
    return achievementId;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete achievement");
  }
});

/**
 * Fetch business banner
 */
export const fetchBusinessBanner = createAsyncThunk<
  MediaFile,
  string,
  { rejectValue: string }
>("businessProfile/fetchBanner", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessBanner(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch banner");
    }
    return response.data.banner;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch banner");
  }
});

/**
 * Upload business banner
 */
export const uploadBusinessBannerAction = createAsyncThunk<
  MediaFile,
  { profileId: string; bannerFile: File },
  { rejectValue: string }
>("businessProfile/uploadBanner", async ({ profileId, bannerFile }, { rejectWithValue, dispatch }) => {
  try {
    const response = await uploadBusinessBanner(profileId, bannerFile);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to upload banner");
    }
    
    // Refresh banner data after successful upload
    await dispatch(fetchBusinessBanner(profileId));
    
    return response.data.banner;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to upload banner");
  }
});

/**
 * Update business banner
 */
export const updateBusinessBannerAction = createAsyncThunk<
  MediaFile,
  { profileId: string; bannerFile: File },
  { rejectValue: string }
>("businessProfile/updateBanner", async ({ profileId, bannerFile }, { rejectWithValue, dispatch }) => {
  try {
    const response = await updateBusinessBanner(profileId, bannerFile);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to update banner");
    }
    
    // Refresh banner data after successful update
    await dispatch(fetchBusinessBanner(profileId));
    
    return response.data.banner;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update banner");
  }
});

/**
 * Delete business banner
 */
export const deleteBusinessBannerAction = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("businessProfile/deleteBanner", async (profileId, { rejectWithValue }) => {
  try {
    const response = await deleteBusinessBanner(profileId);
    
    if (!response.success) {
      return rejectWithValue(response.message || "Failed to delete banner");
    }
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete banner");
  }
});

/**
 * Fetch business profile avatar
 */
export const fetchBusinessAvatar = createAsyncThunk<
  MediaFile,
  string,
  { rejectValue: string }
>("businessProfile/fetchAvatar", async (profileId, { rejectWithValue }) => {
  try {
    const response = await getBusinessAvatar(profileId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.error || "Failed to fetch avatar");
    }
    return response.data.avatar;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch avatar");
  }
});

/**
 * Upload business profile avatar
 */
export const uploadBusinessAvatarAction = createAsyncThunk<
  MediaFile,
  { profileId: string; avatarFile: File },
  { rejectValue: string }
>("businessProfile/uploadAvatar", async ({ profileId, avatarFile }, { rejectWithValue, dispatch }) => {
  try {
    const response = await uploadBusinessAvatar(profileId, avatarFile);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to upload avatar");
    }
    
    // Refresh avatar data after successful upload
    await dispatch(fetchBusinessAvatar(profileId));
    
    return response.data.avatar;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to upload avatar");
  }
});

/**
 * Update business profile avatar
 */
export const updateBusinessAvatarAction = createAsyncThunk<
  MediaFile,
  { profileId: string; avatarFile: File },
  { rejectValue: string }
>("businessProfile/updateAvatar", async ({ profileId, avatarFile }, { rejectWithValue, dispatch }) => {
  try {
    const response = await updateBusinessAvatar(profileId, avatarFile);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to update avatar");
    }
    
    // Refresh avatar data after successful update
    await dispatch(fetchBusinessAvatar(profileId));
    
    return response.data.avatar;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update avatar");
  }
});

/**
 * Delete business profile avatar
 */
export const deleteBusinessAvatarAction = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("businessProfile/deleteAvatar", async (profileId, { rejectWithValue }) => {
  try {
    const response = await deleteBusinessAvatar(profileId);
    
    if (!response.success) {
      return rejectWithValue(response.message || "Failed to delete avatar");
    }
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete avatar");
  }
});

/**
 * Fetch all business profile sections
 */
export const fetchAllBusinessSections = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("businessProfile/fetchAllSections", async (profileId, { dispatch }) => {
  try {
    // Fetch all sections in parallel
    await Promise.allSettled([
      dispatch(fetchBusinessAbout(profileId)),
      dispatch(fetchBusinessProjects(profileId)),
      dispatch(fetchBusinessAchievements(profileId)),
      dispatch(fetchBusinessBanner(profileId)),
      dispatch(fetchBusinessAvatar(profileId)),
      dispatch(fetchUserBusinessProfiles({ includeInactive: true })),
      // Note: Private info is not included as it's owner-only and requires special handling
    ]);
  } catch (error) {
    // Just log the error, don't reject as we want partial success
    console.error("Error fetching some profile sections:", error);
  }
});

/**
 * Add about section to business profile
 */
export const addBusinessAboutSection = createAsyncThunk<
  BusinessAboutData,
  {
    profileId: string;
    aboutData: BusinessAboutFormData;
  },
  { rejectValue: string }
>("businessProfile/addAboutSection", async ({ profileId, aboutData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await postBusinessAbout(profileId, aboutData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to create about section");
    }
    
    // Refresh the about section data after successful creation
    await dispatch(fetchBusinessAbout(profileId));
    
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to create about section");
  }
});

/**
 * Update about section of business profile
 */
export const updateBusinessAboutSection = createAsyncThunk<
  BusinessAboutData,
  {
    profileId: string;
    aboutData: Partial<BusinessAboutData>;
  },
  { rejectValue: string }
>("businessProfile/updateAboutSection", async ({ profileId, aboutData }, { rejectWithValue, dispatch }) => {
  try {
    const response = await updateBusinessAbout(profileId, aboutData);
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to update about section");
    }
    
    // Refresh the about section data after successful update
    await dispatch(fetchBusinessAbout(profileId));
    
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to update about section");
  }
});

/**
 * Delete about section from business profile
 */
export const deleteBusinessAboutSection = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("businessProfile/deleteAboutSection", async (profileId, { rejectWithValue, dispatch }) => {
  try {
    const response = await deleteBusinessAbout(profileId);
    
    if (!response.success) {
      return rejectWithValue(response.message || "Failed to delete about section");
    }
    
    // Clear the about section data after successful deletion
    // No need to refresh since we're clearing it
    
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to delete about section");
  }
});

/**
 * Fetch user's business profiles
 */
export const fetchUserBusinessProfiles = createAsyncThunk<
  BusinessProfile[],
  {
    page?: number;
    limit?: number;
    role?: string;
    includeInactive?: boolean;
  } | void,
  { rejectValue: string }
>("businessProfile/fetchUserProfiles", async (options, { rejectWithValue }) => {
  try {
    const response = await businessProfileApi.getUserBusinessProfiles(options || {});
    
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || "Failed to fetch business profiles");
    }
    
    // Handle the nested response structure
    let profiles: BusinessProfile[] = [];
    
    if (response.data.companyPages && Array.isArray(response.data.companyPages)) {
      profiles = response.data.companyPages;
    } else {
      // Fallback to empty array if structure is unexpected
      profiles = [];
    }
    
    // Transform profiles to ensure backward compatibility for existing components
    return profiles.map(profile => ({
      ...profile,
      // Map API response fields to ensure they're available at top level
      profileName: profile.profileName,
      businessName: profile.businessName,
      logo: profile.logo,
      banner: profile.banner,
      industry: profile.industry,
      description: profile.description,
      company_size: profile.company_size,
      company_type: profile.company_type,
      // Map new contact fields
      company_website: profile.company_website,
      primary_email: profile.primary_email,
      additional_emails: profile.additional_emails,
      // Ensure top-level fields are correctly mapped
      profileId: profile.profileId,
      role: profile.role,
      isActive: profile.isActive,
      joinedAt: profile.joinedAt,
      lastActive: profile.lastActive
    }));
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch business profiles");
  }
});

// ============================================
// SLICE
// ============================================

const businessProfileSlice = createSlice({
  name: "businessProfile",
  initialState,
  reducers: {
    // Form management
    updateFormData: (state, action: PayloadAction<Partial<BusinessProfileData>>) => {
      state.formData = {
        ...state.formData,
        ...action.payload,
      };
    },
    
    resetFormData: (state) => {
      state.formData = {
        companyName: '',
        company_type: '',
        industry: '',
        company_size: '',
        primary_email: '',
        additional_email: [],
        additional_phone_numbers: [],
        privacy_settings: {
          profile_visibility: 'public',
          contact_visibility: 'private'
        }
      };
    },
    
    setCurrentProfile: (state, action: PayloadAction<CreatedBusinessProfile | null>) => {
      state.currentProfile = action.payload;
    },
    
    setSelectedProfile: (state, action: PayloadAction<BusinessProfile | null>) => {
      state.selectedProfile = action.payload;
    },
    
    // Modal management
    openAddSectionsModal: (state) => {
      state.showAddSectionsModal = true;
    },
    
    closeAddSectionsModal: (state) => {
      state.showAddSectionsModal = false;
      state.activeSectionForm = null;
    },
    
    // Section form management
    setActiveSectionForm: (state, action: PayloadAction<"about" | "projects" | "achievements" | null>) => {
      state.activeSectionForm = action.payload;
    },
    
    // Clear section data
    clearSectionData: (state) => {
      state.sections = {
        about: null,
        privateInfo: null,
        projects: [],
        achievements: [],
        banner: null,
        avatar: null,
      };
      state.sectionErrors = {
        about: null,
        privateInfo: null,
        projects: null,
        achievements: null,
        banner: null,
        avatar: null,
      };
    },
    
    // Clear section-specific error
    clearSectionError: (state, action: PayloadAction<keyof BusinessProfileState['sectionErrors']>) => {
      state.sectionErrors[action.payload] = null;
    },
    
    // Error management
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    resetBusinessProfile: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Create business profile
    builder
      .addCase(createBusinessProfile.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createBusinessProfile.fulfilled, (state, action) => {
        state.creating = false;
        state.currentProfile = action.payload;
        // Don't add to profiles array since it has different structure
        // Profiles will be refreshed when user navigates to businesses page
        state.error = null;
        // Reset form data after successful creation
        state.formData = {
          companyName: '',
          company_type: '',
          industry: '',
          company_size: '',
          primary_email: '',
          additional_email: [],
          additional_phone_numbers: [],
          privacy_settings: {
            profile_visibility: 'public',
            contact_visibility: 'private'
          }
        };
      })
      .addCase(createBusinessProfile.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload || "Failed to create business profile";
      });

    // Fetch user business profiles
    builder
      .addCase(fetchUserBusinessProfiles.pending, (state) => {
        state.fetching = true;
        state.error = null;
      })
      .addCase(fetchUserBusinessProfiles.fulfilled, (state, action) => {
        state.fetching = false;
        state.profiles = action.payload;
        state.error = null;
      })
      .addCase(fetchUserBusinessProfiles.rejected, (state, action) => {
        state.fetching = false;
        state.error = action.payload || "Failed to fetch business profiles";
      });
    
    // Add business about section
    builder
      .addCase(addBusinessAboutSection.pending, (state) => {
        state.addingSections.about = true;
        state.error = null;
      })
      .addCase(addBusinessAboutSection.fulfilled, (state, action) => {
        state.addingSections.about = false;
        // Update the sections.about with the returned data
        state.sections.about = action.payload;
        state.showAddSectionsModal = false;
        state.activeSectionForm = null;
        state.error = null;
      })
      .addCase(addBusinessAboutSection.rejected, (state, action) => {
        state.addingSections.about = false;
        state.error = action.payload || "Failed to add about section";
      })
      
      // Update business about section
      .addCase(updateBusinessAboutSection.pending, (state) => {
        state.addingSections.about = true;
        state.error = null;
      })
      .addCase(updateBusinessAboutSection.fulfilled, (state, action) => {
        state.addingSections.about = false;
        // Update the sections.about with the returned data
        state.sections.about = action.payload;
        state.error = null;
      })
      .addCase(updateBusinessAboutSection.rejected, (state, action) => {
        state.addingSections.about = false;
        state.error = action.payload || "Failed to update about section";
      })
      
      // Delete business about section
      .addCase(deleteBusinessAboutSection.pending, (state) => {
        state.deletingSections.about = true;
        state.error = null;
      })
      .addCase(deleteBusinessAboutSection.fulfilled, (state) => {
        state.deletingSections.about = false;
        // Clear the about section data after successful deletion
        state.sections.about = null;
        // Also clear from selected profile if it exists
        if (state.selectedProfile?.companyProfileData?.about) {
          state.selectedProfile.companyProfileData.about = {
            description: '',
            mission: '',
            vision: '',
            core_values: '',
            founder_message: '',
            founded: '',
            employees: '',
            headquarters: '',
            createdAt: '',
            updatedAt: '',
          };
        }
        state.error = null;
      })
      .addCase(deleteBusinessAboutSection.rejected, (state, action) => {
        state.deletingSections.about = false;
        state.error = action.payload || "Failed to delete about section";
      })
      
      // Fetch business about section
      .addCase(fetchBusinessAbout.pending, (state) => {
        state.sectionLoading.about = true;
        state.sectionErrors.about = null;
      })
      .addCase(fetchBusinessAbout.fulfilled, (state, action) => {
        state.sectionLoading.about = false;
        state.sections.about = action.payload;
        state.sectionErrors.about = null;
      })
      .addCase(fetchBusinessAbout.rejected, (state, action) => {
        state.sectionLoading.about = false;
        state.sectionErrors.about = action.payload || "Failed to fetch about section";
      })
      
      // Fetch business private info
      .addCase(fetchBusinessPrivateInfo.pending, (state) => {
        state.sectionLoading.privateInfo = true;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(fetchBusinessPrivateInfo.fulfilled, (state, action) => {
        state.sectionLoading.privateInfo = false;
        state.sections.privateInfo = action.payload;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(fetchBusinessPrivateInfo.rejected, (state, action) => {
        state.sectionLoading.privateInfo = false;
        state.sectionErrors.privateInfo = action.payload || "Failed to fetch private info";
      })
      
      // Create business private info
      .addCase(createBusinessPrivateInfoAction.pending, (state) => {
        state.privateInfo.creating = true;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(createBusinessPrivateInfoAction.fulfilled, (state, action) => {
        state.privateInfo.creating = false;
        state.sections.privateInfo = action.payload;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(createBusinessPrivateInfoAction.rejected, (state, action) => {
        state.privateInfo.creating = false;
        state.sectionErrors.privateInfo = action.payload || "Failed to create private info";
      })
      
      // Update business private info
      .addCase(updateBusinessPrivateInfoAction.pending, (state) => {
        state.privateInfo.updating = true;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(updateBusinessPrivateInfoAction.fulfilled, (state, action) => {
        state.privateInfo.updating = false;
        state.sections.privateInfo = action.payload;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(updateBusinessPrivateInfoAction.rejected, (state, action) => {
        state.privateInfo.updating = false;
        state.sectionErrors.privateInfo = action.payload || "Failed to update private info";
      })
      
      // Delete business private info
      .addCase(deleteBusinessPrivateInfoAction.pending, (state) => {
        state.privateInfo.deleting = true;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(deleteBusinessPrivateInfoAction.fulfilled, (state) => {
        state.privateInfo.deleting = false;
        state.sections.privateInfo = null;
        state.sectionErrors.privateInfo = null;
      })
      .addCase(deleteBusinessPrivateInfoAction.rejected, (state, action) => {
        state.privateInfo.deleting = false;
        state.sectionErrors.privateInfo = action.payload || "Failed to delete private info";
      })
      
      // Fetch business projects
      .addCase(fetchBusinessProjects.pending, (state) => {
        state.sectionLoading.projects = true;
        state.sectionErrors.projects = null;
      })
      .addCase(fetchBusinessProjects.fulfilled, (state, action) => {
        state.sectionLoading.projects = false;
        state.sections.projects = action.payload;
        state.sectionErrors.projects = null;
      })
      .addCase(fetchBusinessProjects.rejected, (state, action) => {
        state.sectionLoading.projects = false;
        state.sectionErrors.projects = action.payload || "Failed to fetch projects";
      })
      
      // Create business project
      .addCase(createBusinessProjectAction.pending, (state) => {
        state.projects.creating = true;
        state.error = null;
      })
      .addCase(createBusinessProjectAction.fulfilled, (state) => {
        state.projects.creating = false;
        state.error = null;
      })
      .addCase(createBusinessProjectAction.rejected, (state, action) => {
        state.projects.creating = false;
        state.error = action.payload || "Failed to create project";
      })
      
      // Update business project
      .addCase(updateBusinessProjectAction.pending, (state) => {
        state.projects.updating = true;
        state.error = null;
      })
      .addCase(updateBusinessProjectAction.fulfilled, (state) => {
        state.projects.updating = false;
        state.error = null;
      })
      .addCase(updateBusinessProjectAction.rejected, (state, action) => {
        state.projects.updating = false;
        state.error = action.payload || "Failed to update project";
      })
      
      // Delete business project
      .addCase(deleteBusinessProjectAction.pending, (state) => {
        state.projects.deleting = true;
        state.error = null;
      })
      .addCase(deleteBusinessProjectAction.fulfilled, (state) => {
        state.projects.deleting = false;
        state.error = null;
      })
      .addCase(deleteBusinessProjectAction.rejected, (state, action) => {
        state.projects.deleting = false;
        state.error = action.payload || "Failed to delete project";
      })
      
      // Fetch business achievements
      .addCase(fetchBusinessAchievements.pending, (state) => {
        state.sectionLoading.achievements = true;
        state.sectionErrors.achievements = null;
      })
      .addCase(fetchBusinessAchievements.fulfilled, (state, action) => {
        state.sectionLoading.achievements = false;
        state.sections.achievements = action.payload;
        state.sectionErrors.achievements = null;
      })
      .addCase(fetchBusinessAchievements.rejected, (state, action) => {
        state.sectionLoading.achievements = false;
        state.sectionErrors.achievements = action.payload || "Failed to fetch achievements";
      })
      
      // Create business achievement
      .addCase(createBusinessAchievementAction.pending, (state) => {
        state.achievements.creating = true;
        state.error = null;
      })
      .addCase(createBusinessAchievementAction.fulfilled, (state) => {
        state.achievements.creating = false;
        state.error = null;
      })
      .addCase(createBusinessAchievementAction.rejected, (state, action) => {
        state.achievements.creating = false;
        state.error = action.payload || "Failed to create achievement";
      })
      
      // Update business achievement
      .addCase(updateBusinessAchievementAction.pending, (state) => {
        state.achievements.updating = true;
        state.error = null;
      })
      .addCase(updateBusinessAchievementAction.fulfilled, (state) => {
        state.achievements.updating = false;
        state.error = null;
      })
      .addCase(updateBusinessAchievementAction.rejected, (state, action) => {
        state.achievements.updating = false;
        state.error = action.payload || "Failed to update achievement";
      })
      
      // Delete business achievement
      .addCase(deleteBusinessAchievementAction.pending, (state) => {
        state.achievements.deleting = true;
        state.error = null;
      })
      .addCase(deleteBusinessAchievementAction.fulfilled, (state) => {
        state.achievements.deleting = false;
        state.error = null;
      })
      .addCase(deleteBusinessAchievementAction.rejected, (state, action) => {
        state.achievements.deleting = false;
        state.error = action.payload || "Failed to delete achievement";
      })
      
      // Fetch business banner
      .addCase(fetchBusinessBanner.pending, (state) => {
        state.sectionLoading.banner = true;
        state.sectionErrors.banner = null;
      })
      .addCase(fetchBusinessBanner.fulfilled, (state, action) => {
        state.sectionLoading.banner = false;
        state.sections.banner = action.payload;
        state.sectionErrors.banner = null;
      })
      .addCase(fetchBusinessBanner.rejected, (state, action) => {
        state.sectionLoading.banner = false;
        state.sectionErrors.banner = action.payload || "Failed to fetch banner";
      })
      
      // Upload business banner
      .addCase(uploadBusinessBannerAction.pending, (state) => {
        state.banner.uploading = true;
        state.error = null;
      })
      .addCase(uploadBusinessBannerAction.fulfilled, (state, action) => {
        state.banner.uploading = false;
        state.sections.banner = action.payload;
        state.error = null;
      })
      .addCase(uploadBusinessBannerAction.rejected, (state, action) => {
        state.banner.uploading = false;
        state.error = action.payload || "Failed to upload banner";
      })
      
      // Update business banner
      .addCase(updateBusinessBannerAction.pending, (state) => {
        state.banner.updating = true;
        state.error = null;
      })
      .addCase(updateBusinessBannerAction.fulfilled, (state, action) => {
        state.banner.updating = false;
        state.sections.banner = action.payload;
        state.error = null;
      })
      .addCase(updateBusinessBannerAction.rejected, (state, action) => {
        state.banner.updating = false;
        state.error = action.payload || "Failed to update banner";
      })
      
      // Delete business banner
      .addCase(deleteBusinessBannerAction.pending, (state) => {
        state.banner.deleting = true;
        state.error = null;
      })
      .addCase(deleteBusinessBannerAction.fulfilled, (state) => {
        state.banner.deleting = false;
        state.sections.banner = null;
        state.error = null;
      })
      .addCase(deleteBusinessBannerAction.rejected, (state, action) => {
        state.banner.deleting = false;
        state.error = action.payload || "Failed to delete banner";
      })
      
      // Fetch business avatar
      .addCase(fetchBusinessAvatar.pending, (state) => {
        state.sectionLoading.avatar = true;
        state.sectionErrors.avatar = null;
      })
      .addCase(fetchBusinessAvatar.fulfilled, (state, action) => {
        state.sectionLoading.avatar = false;
        state.sections.avatar = action.payload;
        state.sectionErrors.avatar = null;
      })
      .addCase(fetchBusinessAvatar.rejected, (state, action) => {
        state.sectionLoading.avatar = false;
        state.sectionErrors.avatar = action.payload || "Failed to fetch avatar";
      });
  },
});

// ============================================
// EXPORTS
// ============================================

export const {
  updateFormData,
  resetFormData,
  setCurrentProfile,
  setSelectedProfile,
  openAddSectionsModal,
  closeAddSectionsModal,
  setActiveSectionForm,
  clearSectionData,
  clearSectionError,
  clearError,
  resetBusinessProfile,
} = businessProfileSlice.actions;

// All async thunks are already exported above

export default businessProfileSlice.reducer;