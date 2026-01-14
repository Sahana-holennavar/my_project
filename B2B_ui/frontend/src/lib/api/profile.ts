/**
 * Patch profile to add/update a section (education, experience, skills, etc.)
 * Uses PUT /profile/edit
 * @param userId - User ID
 * @param sectionType - Type of section to update
 * @param sectionData - Section data to add
 * @param currentSections - Current array of sections (to append new entry)
 * @returns Updated profile response
 */
export async function patchProfileSection(
  userId: string,
  sectionType: "education" | "experience" | "skills" | "projects" | "awards" | "certifications",
  sectionData: Education | Experience | Skill | Project | Award | Certification,
  currentSections: (Education | Experience | Skill | Project | Award | Certification)[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // IMPORTANT: Backend REPLACES entire section, so we must send ALL entries
    // Append new entry to existing sections array
    const updatedSections = [...currentSections, sectionData];

    // Send payload with "field" and "data" wrapper structure
    const payload = {
      field: sectionType,
      data: {
        [sectionType]: updatedSections
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update section",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: `${sectionType} section updated successfully`,
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update section",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update privacy settings
 * Uses PUT /profile/edit
 * @param userId - User ID
 * @param privacySettings - Privacy settings data
 * @returns Updated profile response
 */
export async function updatePrivacySettings(
  userId: string,
  privacySettings: PrivacySettings
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // Send payload with "field" and "data" wrapper structure
    const payload = {
      field: "privacy_settings",
      data: {
        privacy_settings: privacySettings
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update privacy settings",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Privacy settings updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update privacy settings",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}
import { env } from "@/lib/env";
import { tokenStorage } from "@/lib/tokens";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ProfileResponse {
  success: boolean;
  message: string;
  data?: ProfileData;
  isComplete?: boolean; // True if auth token matches and full profile available
  isPartial?: boolean; // True if no auth or token mismatch
}

export interface PrivacySettings {
  profile_visibility: "Public" | "Private" | "Connections Only"; // Default: Connections Only
  contact_visibility: "Public" | "Hidden" | "Connections Only"; // Default: Connections Only
  experience_visibility: "Public" | "Hidden" | "Connections Only"; // Default: Public
  skills_visibility: boolean; // Default: true
  recruiter_contact: boolean; // Default: false for students, true for professionals
}

export interface ProfileData {
  user_id: string;
  personal_information: PersonalInformation;
  about?: About;
  education?: Education[];
  experience?: Experience[];
  skills?: Skill[];
  projects?: Project[];
  awards?: Award[];
  certifications?: Certification[];
  privacy_settings?: PrivacySettings; // Privacy settings (defaults set by system)
  // Avatar and banner from upload API
  avatar?: {
    fileId: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
  };
  banner?: {
    fileId: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
  };
  // Resume from upload API
  resume?: {
    fileId: string;
    fileUrl: string;
    fileName: string;
    uploadedAt: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface PersonalInformation {
  first_name: string; // 2-50 chars, pattern: ^[a-zA-Z\s\-']+$
  last_name: string; // 2-50 chars, pattern: ^[a-zA-Z\s\-']+$
  email: string; // RFC 5322 format, max 254 chars, unique, immutable
  phone_number?: string; // International format, pattern: ^\+?[1-9]\d{1,14}$
  date_of_birth?: string; // Format: YYYY-MM-DD, age 12-125, not in future
  gender?: "Male" | "Female" | "Other" | "Prefer not to say";
  profession?: string; // IT Industry, Biotechnology, Manufacturing, Industrial Automation, R&D, Human Resource, Construction, Architecture, Interior design, Design engineer, or custom (max 100 chars)
  profile_picture?: string;
  cover_photo?: string;
  country: string; // Valid ISO 3166-1 country code
  state_province: string; // 2-100 chars, pattern: ^[a-zA-Z\s\-]+$
  city: string; // 2-100 chars, pattern: ^[a-zA-Z\s\-]+$
  postal_code?: string; // 3-10 chars (kept for backward compatibility, hidden in UI)
}

export interface About {
  professional_summary: string; // 50-2000 chars, HTML allowed
  industry: "Technology" | "Healthcare" | "Finance" | "Education" | "Other";
  // Student statuses: "Studying" | "Looking for internship" | "Looking for job"
  // Professional statuses: "Employed" | "Unemployed" | "Freelancing" | "Consulting" | "Employer"
  current_status: "Studying" | "Looking for internship" | "Looking for job" | "Employed" | "Unemployed" | "Freelancing" | "Consulting" | "Employer";
  website_url?: string;
  linkedin_url?: string;
  github_url?: string;
}

export interface Education {
  institution_name: string; // 2-200 chars
  degree_type: "Bachelor's" | "Master's" | "PhD" | "Diploma" | "Certificate";
  field_of_study: string; // 2-100 chars
  start_year: number; // 1950 to current year
  end_year?: number; // >= start_year, <= current year + 10
  currently_studying?: boolean; // Only one entry can be true
  gpa_grade?: number | string; // 1-10 (numeric) or letter grade (A+, A, B, C, O, etc.)
  percentage?: number; // 0-100
  description?: string;
}

export interface Experience {
  company_name: string; // 2-100 chars, pattern: ^[a-zA-Z0-9\s\-&\.]+$
  job_title: string; // 2-100 chars
  employment_type: "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance";
  industry?: string; // Industry field for experience
  start_date: string; // Format: MM/YYYY, not in future, after age 14
  end_date?: string | null; // Format: MM/YYYY, after start_date, not in future
  job_description?: string; // 50-2000 chars, HTML allowed
  currently_working?: boolean; // Only one entry can be true
}

export interface Skill {
  skill_name: string; // 2-50 chars, max 50 skills per profile
  proficiency_level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  years_of_experience?: number; // 0-50
}

export interface Project {
  id?: number; // Local state management
  project_title: string; // Required: 2-100 chars
  description?: string; // Optional: 0-2000 chars
  technologies?: string[]; // Optional: Max 10 items, each 2-30 chars
  start_date?: string; // Optional: MM/YYYY format, valid date
  end_date?: string; // Optional: MM/YYYY format, valid date
  project_url?: string; // Optional: Valid URL
  github_url?: string; // Optional: Valid URL (should be github.com)
  demo_url?: string; // Optional: Valid URL
  role?: string; // Optional: Max 50 chars
  team_size?: number; // Optional: Integer, min 1, max 50
  currently_working?: boolean; // Optional: true or false
}

export interface Award {
  award_name: string; // 5-100 chars
  issuing_organization: string; // 2-100 chars
  date_received: string; // Format: MM/YYYY, not in future
  description?: string; // 50-500 chars
  certificate_url?: string; // Valid URL format
}

export interface Certification {
  certification_name: string; // 5-100 chars
  issuing_authority: string; // 2-100 chars
  license_number?: string; // Unique within issuing authority
  issue_date: string; // Format: MM/YYYY, not in future
  expiration_date?: string; // Format: MM/YYYY, after issue_date
  verification_url?: string; // Valid URL format
  certificate_url?: string; // Certificate file URL (JPG, PNG, or PDF)
  never_expires?: boolean; // Whether certification never expires
}

export interface ProfileError {
  message: string;
  code: number;
  type: "NOT_FOUND" | "INVALID_UUID" | "UNAUTHORIZED" | "NETWORK_ERROR" | "SERVER_ERROR";
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch user profile by user ID
 * @param userId - User ID from Redux state
 * @returns ProfileResponse with complete/partial/not found data
 */
export async function getProfile(userId: string): Promise<ProfileResponse> {
  try {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw {
        message: "Invalid user ID format",
        code: 400,
        type: "INVALID_UUID",
      } as ProfileError;
    }

    // Get auth token if available
    const tokens = tokenStorage.getStoredTokens();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add auth header if token exists
    if (tokens?.access_token) {
      headers["Authorization"] = `Bearer ${tokens.access_token}`;
    }

    const response = await fetch(`${env.API_URL}/profile/${userId}`, {
      method: "GET",
      headers,
    });

    // Handle 404 - User not found
    if (response.status === 404) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Handle 400 - Invalid UUID
    if (response.status === 400) {
      throw {
        message: "Invalid user ID format",
        code: 400,
        type: "INVALID_UUID",
      } as ProfileError;
    }

    // Handle 401 - Unauthorized (token expired or invalid)
    if (response.status === 401) {
      throw {
        message: "Authentication required - session expired",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // Handle 200 - Profile found
    if (response.status === 200) {
      const data = await response.json();

      console.log('📥 Raw API response:', JSON.stringify(data, null, 2));

      // Determine if this is complete or partial profile
      // Complete: Has auth token and token matches user
      // Partial: No auth token or token doesn't match
      const isComplete = !!(tokens?.access_token && data.data);
      const isPartial = !isComplete;

      // Map API response to ProfileData format
      // API returns: { data: { id, role, profile_data: {...}, created_at, updated_at } }
      // For partial profiles (other users), data is in visibility_allowed_fields
      // For complete profiles (own profile), data is directly in profile_data
      const profileData: ProfileData | undefined = data.data?.profile_data ? (() => {
        const pd = data.data.profile_data;
        const visibleFields = pd.visibility_allowed_fields || {};
        
        console.log('🔑 Has visibility_allowed_fields:', Object.keys(visibleFields).length > 0);
        console.log('📋 Visible fields keys:', Object.keys(visibleFields));
        
        // Use visibility_allowed_fields if it exists (partial profile), otherwise use direct fields (complete profile)
        const sourceData = Object.keys(visibleFields).length > 0 ? visibleFields : pd;

        // Normalize nested structures returned by backend (e.g., personal_information.personal_information)
        const rawPersonalInfo = (
          (sourceData.personal_information?.personal_information as Partial<PersonalInformation> | undefined) ??
          (sourceData.personal_information as Partial<PersonalInformation> | undefined) ??
          (pd.personal_information as Partial<PersonalInformation> | undefined) ??
          {}
        ) as Partial<PersonalInformation>;

        const rawAbout = (
          (sourceData.about?.about as Partial<About> | undefined) ??
          (sourceData.about as Partial<About> | undefined) ??
          (pd.about as Partial<About> | undefined) ??
          undefined
        );

        const rawAvatar = (sourceData.avatar as Record<string, unknown> | string | undefined) ?? pd.avatar;
        const rawBanner = (sourceData.banner as Record<string, unknown> | string | undefined) ?? pd.banner;
        const rawResume = (sourceData.resume as Record<string, unknown> | string | undefined) ?? (pd.resume as Record<string, unknown> | string | undefined);

        const normalizeArray = <T>(value: unknown): T[] => {
          if (Array.isArray(value)) return value as T[];
          if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).items)) {
            return (value as Record<string, unknown>).items as T[];
          }
          if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).experience)) {
            return (value as Record<string, unknown>).experience as T[];
          }
          return [];
        };

        const experienceEntries = normalizeArray<Experience>(sourceData.experience);
        const educationEntries = normalizeArray<Education>(sourceData.education);
        const skillsEntries = normalizeArray<Skill>(sourceData.skills);
        const projectsEntries = normalizeArray<Project>(sourceData.projects);
        const awardsEntries = normalizeArray<Award>(sourceData.awards);
        const certificationsEntries = normalizeArray<Certification>(sourceData.certifications);

        const normalizeMedia = (input: unknown): ProfileData['avatar'] => {
          if (!input) return undefined;
          if (typeof input === 'string') {
            return {
              fileUrl: input,
              fileId: '',
              fileName: '',
              uploadedAt: '',
            };
          }

          if (typeof input === 'object') {
            const obj = input as Record<string, unknown>;
            const fileUrl = (obj.fileUrl ?? obj.file_url) as string | undefined;
            if (!fileUrl) return undefined;
            return {
              fileUrl,
              fileId: ((obj.fileId ?? obj.file_id) as string | undefined) ?? '',
              fileName: ((obj.fileName ?? obj.file_name) as string | undefined) ?? '',
              uploadedAt: ((obj.uploadedAt ?? obj.uploaded_at) as string | undefined) ?? '',
            };
          }

          return undefined;
        };
        
        const normalizedAvatar = normalizeMedia(rawAvatar);
        const normalizedBanner = normalizeMedia(rawBanner);
        const normalizedResume = normalizeMedia(rawResume);
        const normalizedAbout = rawAbout
          ? {
              professional_summary: rawAbout.professional_summary ?? '',
              industry: (rawAbout.industry as About['industry']) ?? 'Other',
              current_status: (rawAbout.current_status as About['current_status']) ?? 'Employed',
              website_url: rawAbout.website_url,
              linkedin_url: rawAbout.linkedin_url,
              github_url: rawAbout.github_url,
            }
          : undefined;
        
        console.log('📊 Source data being used:', {
          hasAbout: !!rawAbout,
          hasEducation: !!sourceData.education,
          educationCount: sourceData.education?.length || 0,
          hasSkills: !!sourceData.skills,
          skillsCount: sourceData.skills?.length || 0,
          hasProjects: !!sourceData.projects,
          projectsCount: sourceData.projects?.length || 0,
        });
        
        return {
          user_id: data.data.id,
          personal_information: {
            first_name: pd.name?.split(' ')[0] || rawPersonalInfo.first_name || '',
            last_name: pd.name?.split(' ').slice(1).join(' ') || rawPersonalInfo.last_name || '',
            email: rawPersonalInfo.email || '',
            phone_number: rawPersonalInfo.phone_number || '',
            date_of_birth: rawPersonalInfo.date_of_birth || '',
            gender: rawPersonalInfo.gender || undefined,
            profession: rawPersonalInfo.profession || '',
            country: rawPersonalInfo.country || '',
            state_province: rawPersonalInfo.state_province || '',
            city: rawPersonalInfo.city || '',
            postal_code: rawPersonalInfo.postal_code || '',
            profile_picture: typeof rawAvatar === 'string' ? rawAvatar : rawPersonalInfo.profile_picture || '',
            cover_photo: typeof rawBanner === 'string' ? rawBanner : rawPersonalInfo.cover_photo || '',
          },
          about: normalizedAbout,
          education: educationEntries,
          experience: experienceEntries,
          skills: skillsEntries,
          projects: projectsEntries,
          awards: awardsEntries,
          certifications: certificationsEntries,
          privacy_settings: data.data.privacy_settings || pd.privacy_settings || sourceData.privacy_settings,
          // Include avatar, banner, and resume from upload API
          // For partial profiles, avatar/banner might be direct strings in visibility_allowed_fields
          avatar: normalizedAvatar,
          banner: normalizedBanner,
          resume: normalizedResume,
          created_at: data.data.created_at,
          updated_at: data.data.updated_at,
        };
      })() : undefined;

      console.log('✨ Mapped profile data:', {
        user_id: profileData?.user_id,
        hasPersonalInfo: !!profileData?.personal_information,
        firstName: profileData?.personal_information?.first_name,
        hasAbout: !!profileData?.about,
        educationCount: profileData?.education?.length || 0,
        experienceCount: profileData?.experience?.length || 0,
        skillsCount: profileData?.skills?.length || 0,
        projectsCount: profileData?.projects?.length || 0,
      });

      return {
        success: true,
        message: isComplete
          ? "Complete profile fetched successfully"
          : "Partial profile fetched successfully",
        data: profileData,
        isComplete,
        isPartial,
      };
    }

    // Handle other status codes
    throw {
      message: `Unexpected response: ${response.status}`,
      code: response.status,
      type: "SERVER_ERROR",
    } as ProfileError;
  } catch (error) {
    // Handle ProfileError types
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw {
        message: "Network error. Please check your connection.",
        code: 0,
        type: "NETWORK_ERROR",
      } as ProfileError;
    }

    // Handle unknown errors
    throw {
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Default privacy settings (all public by default)
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile_visibility: "Public",
  contact_visibility: "Connections Only",
  experience_visibility: "Public",
  skills_visibility: true,
  recruiter_contact: true,
};

/**
 * Create initial profile (first-time setup)
 * Uses POST /profile/create endpoint
 * @param heroData - Hero section data (personal info, about, privacy)
 * @returns Created profile response
 */
export async function createProfile(heroData: {
  personal_information: Partial<PersonalInformation>;
  about?: Partial<About>;
}): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // Construct profile_data payload for creation
    const profileData = {
      personal_information: heroData.personal_information,
      about: heroData.about,
      privacy_settings: DEFAULT_PRIVACY_SETTINGS,
      education: [],
      experience: [],
      skills: [],
      projects: [],
      awards: [],
      certifications: [],
    };

    const response = await fetch(`${env.API_URL}/profile/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ profile_data: profileData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to create profile",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Profile created successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to create profile",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update profile hero section (personal info + about)
 * Uses PUT /profile/edit with field/data structure
 * @param userId - User ID
 * @param heroData - Hero section data (personal info, headline, contact)
 * @returns Updated profile response
 */
export async function updateHeroSection(
  userId: string,
  heroData: {
    personal_information?: Partial<PersonalInformation>;
    about?: Partial<About>;
  }
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // Determine which field is being updated based on what data is provided
    let payload;
    
    // If about data is provided (like status update), update about field
    if (heroData.about && Object.keys(heroData.about).length > 0) {
      payload = {
        field: "about",
        data: {
          about: heroData.about
        }
      };
    }
    // If personal_information is provided, update personal_information field
    else if (heroData.personal_information && Object.keys(heroData.personal_information).length > 0) {
      payload = {
        field: "personal_information",
        data: {
          personal_information: heroData.personal_information
        }
      };
    }
    else {
      throw {
        message: "No data provided to update",
        code: 400,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update profile",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: payload.field === "about" ? "Status updated successfully" : "Personal information updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update personal information",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update education section - sends entire education array
 * @param userId - User ID
 * @param educationData - Complete array of education entries
 * @returns Updated profile response
 */
export async function updateEducationSection(
  userId: string,
  educationData: Education[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const payload = {
      field: "education",
      data: {
        education: educationData
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update education",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Education updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update education",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update the entire skills section
 * @param userId - User ID
 * @param skillsData - Array of skills to update
 * @returns Updated profile response
 */
export async function updateSkillsSection(
  userId: string,
  skillsData: Skill[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const payload = {
      field: "skills",
      data: {
        skills: skillsData
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update skills",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Skills updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update skills",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update the entire projects section
 * @param userId - User ID
 * @param projectsData - Array of projects to update
 * @returns Updated profile response
 */
export async function updateProjectsSection(
  userId: string,
  projectsData: Project[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const payload = {
      field: "projects",
      data: {
        projects: projectsData
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update projects",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Projects updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update projects",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update the entire experience section
 * @param userId - User ID
 * @param experienceData - Array of experience to update
 * @returns Updated profile response
 */
export async function updateExperienceSection(
  userId: string,
  experienceData: Experience[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const payload = {
      field: "experience",
      data: {
        experience: experienceData
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update experience",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Experience updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update experience",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update the entire awards section
 * @param userId - User ID
 * @param awardsData - Array of awards to update
 * @returns Updated profile response
 */
export async function updateAwardsSection(
  userId: string,
  awardsData: Award[]
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const payload = {
      field: "awards",
      data: {
        awards: awardsData
      }
    };

    const response = await fetch(`${env.API_URL}/profile/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to update awards",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: "Awards updated successfully",
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update awards",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Update the entire certifications section
 * @param userId - User ID
 * @param certificationsData - Array of certifications to update
 * @returns Updated profile response
 */
export async function updateCertificationsSection(
  userId: string,
  certificationsData: Certification[],
  certificateFile?: File,
  certificationIndex?: number
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // If certificate file is provided, use FormData, otherwise use JSON
    if (certificateFile) {
      const formData = new FormData();
      formData.append('field', 'certifications');
      // Send certifications array directly as JSON string (not wrapped in object)
      formData.append('data', JSON.stringify(certificationsData));
      
      // Append certificate file with proper field name: 'certificate'
      formData.append('certificate', certificateFile);
      
      // If certificationIndex is provided, include it so backend knows which certification to attach the file to
      if (certificationIndex !== undefined) {
        formData.append('certificationIndex', certificationIndex.toString());
      }

      const response = await fetch(`${env.API_URL}/profile/edit`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || "Failed to update certifications",
          code: response.status,
          type: "SERVER_ERROR",
        } as ProfileError;
      }

      const data = await response.json();
      return {
        success: true,
        message: "Certifications updated successfully",
        data: data.data,
        isComplete: true,
        isPartial: false,
      };
    } else {
      // No file, use JSON as before
      const payload = {
        field: "certifications",
        data: {
          certifications: certificationsData
        }
      };

      const response = await fetch(`${env.API_URL}/profile/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || "Failed to update certifications",
          code: response.status,
          type: "SERVER_ERROR",
        } as ProfileError;
      }

      const data = await response.json();
      return {
        success: true,
        message: "Certifications updated successfully",
        data: data.data,
        isComplete: true,
        isPartial: false,
      };
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to update certifications",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Add a section to the profile (education, experience, skills, etc.)
 * @param userId - User ID
 * @param sectionType - Type of section to add
 * @param sectionData - Section data to add
 * @returns Updated profile response
 */
export async function addProfileSection(
  userId: string,
  sectionType: "education" | "experience" | "skills" | "projects" | "awards" | "certifications",
  sectionData: Education | Experience | Skill | Project | Award | Certification
): Promise<ProfileResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    const response = await fetch(`${env.API_URL}/profile/${userId}/section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        section_type: sectionType,
        data: sectionData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || "Failed to add section",
        code: response.status,
        type: "SERVER_ERROR",
      } as ProfileError;
    }

    const data = await response.json();
    return {
      success: true,
      message: `${sectionType} section added successfully`,
      data: data.data,
      isComplete: true,
      isPartial: false,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error) {
      throw error;
    }
    throw {
      message: error instanceof Error ? error.message : "Failed to add section",
      code: 500,
      type: "SERVER_ERROR",
    } as ProfileError;
  }
}

/**
 * Upload profile image (avatar, banner, or resume)
 * @param imageFile - Image file to upload (jpg/jpeg/png/webp, max 5MB for images; pdf for resume)
 * @param type - Type of upload: 'avatar' | 'banner' | 'resume'
 * @returns Upload response with image URL
 */
export type UploadType = 'avatar' | 'banner' | 'resume';

export interface ProfileImageUploadResponse {
  status: number;
  message: string;
  success: boolean;
  data?: {
    // Avatar response structure from backend
    avatar?: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    };
    // Banner response structure from backend
    banner?: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    };
    // Resume response structure from backend
    resume?: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    };
    // Legacy/fallback fields
    profile_image_url?: string;
    avatar_url?: string;
    banner_url?: string;
    resume_url?: string;
    uploaded_at?: string;
    file_size?: string;
    mime_type?: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function uploadProfileImage(
  imageFile: File,
  type: UploadType = 'avatar'
): Promise<ProfileImageUploadResponse> {
  try {
    const tokens = tokenStorage.getStoredTokens();
    if (!tokens?.access_token) {
      throw {
        message: "Authentication required",
        code: 401,
        type: "UNAUTHORIZED",
      } as ProfileError;
    }

    // Define upload configurations
    const uploadConfigs = {
      avatar: {
        endpoint: '/profile/upload-avatar',
        fieldName: 'profileImage', // Backend expects 'profileImage' for avatar
        validTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        errorMessage: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.',
      },
      banner: {
        endpoint: '/profile/upload-banner',
        fieldName: 'banner', // Backend expects 'banner' for banner
        validTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        errorMessage: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.',
      },
      resume: {
        endpoint: '/profile/upload-resume',
        fieldName: 'resume', // Backend expects 'resume' for resume
        validTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 10 * 1024 * 1024, // 10MB
        errorMessage: 'Invalid file type. Only PDF and DOC/DOCX are allowed.',
      },
    };

    const config = uploadConfigs[type];

    // Validate file type
    if (!config.validTypes.includes(imageFile.type)) {
      return {
        status: 400,
        message: config.errorMessage,
        success: false,
        errors: [
          {
            field: config.fieldName,
            message: config.errorMessage,
          },
        ],
      };
    }

    // Validate file size
    if (imageFile.size > config.maxSize) {
      const sizeMB = Math.round(config.maxSize / (1024 * 1024));
      return {
        status: 400,
        message: `File size exceeds ${sizeMB}MB limit.`,
        success: false,
        errors: [
          {
            field: config.fieldName,
            message: `File size exceeds ${sizeMB}MB limit.`,
          },
        ],
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append(config.fieldName, imageFile);

    const response = await fetch(`${env.API_URL}${config.endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        // Don't set Content-Type header - browser will set it automatically with boundary
      },
      body: formData,
    });

    const data = await response.json();

    return {
      status: data.status || response.status,
      message: data.message || `${type} upload failed`,
      success: data.success || false,
      data: data.data,
      errors: data.errors,
    };
  } catch (error) {
    console.error(`${type} upload error:`, error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : `Failed to upload ${type}`,
      success: false,
      errors: [
        {
          field: type,
          message: error instanceof Error ? error.message : `Failed to upload ${type}`,
        },
      ],
    };
  }
}

/**
 * Helper function to check if profile is complete enough to show "Add Sections"
 * @param profile - Profile data to check
 * @returns True if hero section is complete
 */
export function isHeroSectionComplete(profile: ProfileData | undefined): boolean {
  if (!profile) return false;

  const { personal_information, about } = profile;

  // Check required personal information fields
  const hasPersonalInfo =
    personal_information?.first_name &&
    personal_information?.last_name &&
    personal_information?.email &&
    personal_information?.country &&
    personal_information?.city;

  // Check required about fields (with trimming for whitespace)
  const hasAbout = 
    about?.professional_summary?.trim() && 
    about?.professional_summary?.trim().length >= 50 && // Min 50 chars as per validation
    about?.industry;

  return !!(hasPersonalInfo && hasAbout);
}
