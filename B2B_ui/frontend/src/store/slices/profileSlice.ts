/**
 * Update a section in profile using PATCH /profile/:id
 */
export const updateProfileSection = createAsyncThunk<
  ProfileData,
  {
    userId: string;
    sectionType:
      | "education"
      | "experience"
      | "skills"
      | "projects"
      | "awards"
      | "certifications";
    sectionData: Education | Experience | Skill | Project | Award | Certification;
    currentSections: (Education | Experience | Skill | Project | Award | Certification)[];
  },
  { rejectValue: ProfileError }
>("profile/updateProfileSection", async ({ userId, sectionType, sectionData, currentSections }, { rejectWithValue }) => {
  try {
    const response = await patchProfileSection(userId, sectionType, sectionData, currentSections);
    if (!response.success || !response.data) {
      throw {
        message: "Failed to update section",
        code: 500,
        type: "SERVER_ERROR",
      };
    }
    return response.data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to update section",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});

/**
 * Update privacy settings using PUT /profile/edit
 */
export const updateProfilePrivacySettings = createAsyncThunk<
  ProfileData,
  {
    userId: string;
    privacySettings: PrivacySettings;
  },
  { rejectValue: ProfileError }
>("profile/updatePrivacySettings", async ({ userId, privacySettings }, { rejectWithValue }) => {
  try {
    const response = await updatePrivacySettings(userId, privacySettings);
    if (!response.success || !response.data) {
      throw {
        message: "Failed to update privacy settings",
        code: 500,
        type: "SERVER_ERROR",
      };
    }
    return response.data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to update privacy settings",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  getProfile,
  createProfile,
  updateHeroSection,
  addProfileSection,
  patchProfileSection,
  updatePrivacySettings,
  type ProfileData,
  type ProfileError,
  type PersonalInformation,
  type About,
  type Education,
  type Experience,
  type Skill,
  type Project,
  type Award,
  type Certification,
  type PrivacySettings,
} from "@/lib/api/profile";

// ============================================
// STATE TYPES
// ============================================

export interface ProfileState {
  // Profile data
  profile: ProfileData | null;
  isComplete: boolean;
  isPartial: boolean;

  // Loading states
  loading: boolean;
  updating: boolean;
  addingSections: {
    education: boolean;
    experience: boolean;
    skills: boolean;
    projects: boolean;
    awards: boolean;
    certifications: boolean;
  };

  // Error handling
  error: ProfileError | null;
  lastFetchTime: number | null;

  // Form state management
  heroFormDraft: HeroFormDraft | null;
  showHeroModal: boolean;
  showAddSectionsModal: boolean;
  activeSectionForm:
    | "education"
    | "experience"
    | "skills"
    | "projects"
    | "awards"
    | "certifications"
    | null;
}

export interface HeroFormDraft {
  personal_information: Partial<PersonalInformation>;
  about?: Partial<About>;
  savedAt: number;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: ProfileState = {
  profile: null,
  isComplete: false,
  isPartial: false,
  loading: false,
  updating: false,
  addingSections: {
    education: false,
    experience: false,
    skills: false,
    projects: false,
    awards: false,
    certifications: false,
  },
  error: null,
  lastFetchTime: null,
  heroFormDraft: null,
  showHeroModal: false,
  showAddSectionsModal: false,
  activeSectionForm: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Fetch user profile by user ID
 */
export const fetchProfile = createAsyncThunk<
  { profile: ProfileData | null; isComplete: boolean; isPartial: boolean },
  string,
  { rejectValue: ProfileError }
>("profile/fetchProfile", async (userId, { rejectWithValue }) => {
  try {
    const response = await getProfile(userId);

    if (!response.success) {
      // Check if it's an unauthorized error
      if (response.message?.toLowerCase().includes('unauthorized') || 
          response.message?.toLowerCase().includes('token')) {
        return rejectWithValue({
          message: "Session expired",
          code: 401,
          type: "UNAUTHORIZED",
        } as ProfileError);
      }

      return {
        profile: null,
        isComplete: false,
        isPartial: false,
      };
    }

    return {
      profile: response.data || null,
      isComplete: response.isComplete || false,
      isPartial: response.isPartial || false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    if (typeof error === "object" && error !== null && "code" in error && 
        (error as { code: number }).code === 401) {
      return rejectWithValue({
        message: "Session expired",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to fetch profile",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});

/**
 * Create new profile (first-time setup)
 * Uses POST /profile/create then fetches full profile
 */
export const createNewProfile = createAsyncThunk<
  ProfileData,
  { heroData: HeroFormDraft; userId: string },
  { rejectValue: ProfileError }
>("profile/createNewProfile", async ({ heroData, userId }, { rejectWithValue }) => {
  try {
    // Step 1: Create profile using POST /profile/create
    const createResponse = await createProfile({
      personal_information: heroData.personal_information,
      about: heroData.about,
    });

    if (!createResponse.success || !createResponse.data) {
      throw {
        message: "Failed to create profile",
        code: 500,
        type: "SERVER_ERROR",
      };
    }

    // Step 2: Fetch complete profile to populate all sections
    const fetchResponse = await getProfile(userId);

    if (!fetchResponse.success || !fetchResponse.data) {
      // If fetch fails, return created data (better than nothing)
      return createResponse.data;
    }

    return fetchResponse.data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to create profile",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});

/**
 * Update hero section of existing profile
 * Uses PATCH /profile/{userId}
 */
export const updateHero = createAsyncThunk<
  ProfileData,
  { userId: string; heroData: HeroFormDraft },
  { rejectValue: ProfileError }
>("profile/updateHero", async ({ userId, heroData }, { rejectWithValue }) => {
  try {
    const response = await updateHeroSection(userId, {
      personal_information: heroData.personal_information,
      about: heroData.about,
    });

    if (!response.success || !response.data) {
      throw {
        message: "Failed to update hero section",
        code: 500,
        type: "SERVER_ERROR",
      };
    }

    return response.data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to update hero section",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});

/**
 * Add a section to profile
 */
export const addSection = createAsyncThunk<
  ProfileData,
  {
    userId: string;
    sectionType:
      | "education"
      | "experience"
      | "skills"
      | "projects"
      | "awards"
      | "certifications";
    sectionData: Education | Experience | Skill | Project | Award | Certification;
  },
  { rejectValue: ProfileError }
>("profile/addSection", async ({ userId, sectionType, sectionData }, { rejectWithValue }) => {
  try {
    const response = await addProfileSection(userId, sectionType, sectionData);

    if (!response.success || !response.data) {
      throw {
        message: "Failed to add section",
        code: 500,
        type: "SERVER_ERROR",
      };
    }

    return response.data;
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      return rejectWithValue(error as ProfileError);
    }
    return rejectWithValue({
      message: "Failed to add section",
      code: 500,
      type: "SERVER_ERROR",
    });
  }
});

// ============================================
// SLICE
// ============================================

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    // Modal management
    openHeroModal: (state) => {
      state.showHeroModal = true;
    },
    closeHeroModal: (state) => {
      state.showHeroModal = false;
    },
    openAddSectionsModal: (state) => {
      state.showAddSectionsModal = true;
    },
    closeAddSectionsModal: (state) => {
      state.showAddSectionsModal = false;
      state.activeSectionForm = null;
    },

    // Section form management
    setActiveSectionForm: (
      state,
      action: PayloadAction<
        | "education"
        | "experience"
        | "skills"
        | "projects"
        | "awards"
        | "certifications"
        | null
      >
    ) => {
      state.activeSectionForm = action.payload;
    },

    // Draft management
    saveHeroFormDraft: (state, action: PayloadAction<HeroFormDraft>) => {
      state.heroFormDraft = {
        ...action.payload,
        savedAt: Date.now(),
      };
    },
    clearHeroFormDraft: (state) => {
      state.heroFormDraft = null;
    },

    // Error management
    clearError: (state) => {
      state.error = null;
    },

    // Reset profile state
    resetProfile: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
        state.isComplete = action.payload.isComplete;
        state.isPartial = action.payload.isPartial;
        state.lastFetchTime = Date.now();
        state.error = null;

        // Show hero modal if profile not found or incomplete
        if (!action.payload.profile || !action.payload.isComplete) {
          state.showHeroModal = true;
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || {
          message: "Failed to fetch profile",
          code: 500,
          type: "SERVER_ERROR",
        };

        // Show hero modal on 404 (user not found)
        if (action.payload?.type === "NOT_FOUND") {
          state.showHeroModal = true;
        }
      });

    // Create new profile
    builder
      .addCase(createNewProfile.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(createNewProfile.fulfilled, (state, action) => {
        state.updating = false;
        state.profile = action.payload;
        state.isComplete = true;
        state.isPartial = false;
        state.showHeroModal = false;
        state.heroFormDraft = null;
        state.error = null;
      })
      .addCase(createNewProfile.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || {
          message: "Failed to create profile",
          code: 500,
          type: "SERVER_ERROR",
        };
      });

    // Update hero section
    builder
      .addCase(updateHero.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateHero.fulfilled, (state, action) => {
        state.updating = false;
        state.profile = action.payload;
        state.isComplete = true;
        state.isPartial = false;
        state.showHeroModal = false;
        state.heroFormDraft = null;
        state.error = null;
      })
      .addCase(updateHero.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || {
          message: "Failed to update hero section",
          code: 500,
          type: "SERVER_ERROR",
        };
      });

    // Add section
    builder
      .addCase(addSection.pending, (state, action) => {
        const sectionType = action.meta.arg.sectionType;
        state.addingSections[sectionType] = true;
        state.error = null;
      })
      .addCase(addSection.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.addingSections = {
          education: false,
          experience: false,
          skills: false,
          projects: false,
          awards: false,
          certifications: false,
        };
        state.activeSectionForm = null;
        state.error = null;
      })
      .addCase(addSection.rejected, (state, action) => {
        state.addingSections = {
          education: false,
          experience: false,
          skills: false,
          projects: false,
          awards: false,
          certifications: false,
        };
        state.error = action.payload || {
          message: "Failed to add section",
          code: 500,
          type: "SERVER_ERROR",
        };
      });

    // Update profile section (for adding/editing sections)
    builder
      .addCase(updateProfileSection.pending, (state, action) => {
        const sectionType = action.meta.arg.sectionType;
        state.addingSections[sectionType] = true;
        state.error = null;
      })
      .addCase(updateProfileSection.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.addingSections = {
          education: false,
          experience: false,
          skills: false,
          projects: false,
          awards: false,
          certifications: false,
        };
        state.activeSectionForm = null;
        state.error = null;
      })
      .addCase(updateProfileSection.rejected, (state, action) => {
        state.addingSections = {
          education: false,
          experience: false,
          skills: false,
          projects: false,
          awards: false,
          certifications: false,
        };
        state.error = action.payload || {
          message: "Failed to update section",
          code: 500,
          type: "SERVER_ERROR",
        };
      })
      // Update privacy settings
      .addCase(updateProfilePrivacySettings.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateProfilePrivacySettings.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.updating = false;
        state.error = null;
      })
      .addCase(updateProfilePrivacySettings.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || {
          message: "Failed to update privacy settings",
          code: 500,
          type: "SERVER_ERROR",
        };
      });
  },
});

// ============================================
// EXPORTS
// ============================================

export const {
  openHeroModal,
  closeHeroModal,
  openAddSectionsModal,
  closeAddSectionsModal,
  setActiveSectionForm,
  saveHeroFormDraft,
  clearHeroFormDraft,
  clearError,
  resetProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
