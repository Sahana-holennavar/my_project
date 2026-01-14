/**
 * Profile Creation API Service
 * Based on Postman Collection: Profile Creation API Tests
 * Endpoint: POST /profile/create
 */

import { tokenStorage } from "../tokens";
import { env } from "../env";

// Type Definitions based on API structure
export interface PersonalInformation {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth: string;
  gender?: string;
  profession?: string; // IT Industry, Biotechnology, Manufacturing, Industrial Automation, R&D, Human Resource, Construction, Architecture, Interior design, Design engineer, or custom (max 100 chars)
  country: string;
  state_province: string;
  city: string;
  postal_code?: string;
}

export interface About {
  professional_summary: string;
  industry: string;
  current_status: "Studying" | "Employed" | "Unemployed" | "Freelancing" | "Other";
}

export interface Experience {
  company_name: string;
  job_title: string;
  employment_type: "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance";
  start_date: string; // Format: MM/YYYY
  end_date?: string; // Format: MM/YYYY
  currently_working: boolean;
  job_description: string;
}

export interface Education {
  institution_name: string;
  degree_type: string;
  field_of_study: string;
  start_year: number;
  end_year?: number;
  gpa_grade?: number | string; // 1-10 (numeric) or letter grade (A+, A, B, C, O, etc.)
  percentage?: number; // 0-100
  currently_studying: boolean;
}

export interface Skill {
  skill_name: string;
  proficiency_level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  years_of_experience?: number;
}

export interface Project {
  project_title: string;
  description: string;
  technologies_used: string[];
  project_url?: string;
  start_date: string; // Format: MM/YYYY
  end_date?: string; // Format: MM/YYYY
  project_type: "Academic" | "Professional" | "Personal" | "Open Source";
}

export interface Award {
  award_name: string;
  issuing_organization: string;
  date_received: string; // Format: MM/YYYY
  description: string;
}

export interface Certification {
  certification_name: string;
  issuing_authority: string;
  license_number?: string;
  issue_date: string; // Format: MM/YYYY
  expiration_date?: string; // Format: MM/YYYY
  verification_url?: string;
}

export interface ProfileData {
  personal_information: PersonalInformation;
  about: About;
  experience?: Experience[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  awards?: Award[];
  certifications?: Certification[];
}

export interface ProfileCreationRequest {
  profile_data: ProfileData;
}

export interface ProfileCreationResponse {
  success: boolean;
  status: number;
  message: string;
  data?: {
    profile_id: string;
    user_id: string;
    created_at: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Create a new profile
 * @param profileData The profile data to create
 * @returns Promise with the API response
 */
export async function createProfile(
  profileData: ProfileData
): Promise<ProfileCreationResponse> {
  const tokens = tokenStorage.getStoredTokens();

  if (!tokens?.access_token) {
    throw new Error("Authentication required. Please log in.");
  }

  try {
    const response = await fetch(`${env.API_URL}/profile/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ profile_data: profileData }),
    });

    const data: ProfileCreationResponse = await response.json();

    // Handle different response status codes
    if (response.status === 201) {
      // Success
      return data;
    } else if (response.status === 400) {
      // Validation error
      throw new Error(
        data.errors?.map((e) => `${e.field}: ${e.message}`).join(", ") ||
          "Validation failed"
      );
    } else if (response.status === 401) {
      // Authentication error
      throw new Error("Invalid or expired token. Please log in again.");
    } else if (response.status === 409) {
      // Profile already exists
      throw new Error("Profile already exists for this user.");
    } else {
      // Other errors
      throw new Error(data.message || "Failed to create profile");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error. Please check your connection.");
  }
}

/**
 * Validate profile data before submission
 * @param profileData The profile data to validate
 * @param userRole Optional user role to apply role-specific validation rules
 * @returns Array of validation errors
 */
export function validateProfileData(profileData: ProfileData, userRole?: string): string[] {
  const errors: string[] = [];

  // Personal Information validation
  if (!profileData.personal_information) {
    errors.push("Personal information is required");
    return errors;
  }

  const { personal_information } = profileData;

  if (!personal_information.first_name || personal_information.first_name.length < 2) {
    errors.push("First name must be at least 2 characters");
  }

  if (!personal_information.last_name || personal_information.last_name.length < 2) {
    errors.push("Last name must be at least 2 characters");
  }

  if (!personal_information.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal_information.email)) {
    errors.push("Valid email is required");
  }

  if (!personal_information.date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(personal_information.date_of_birth)) {
    errors.push("Valid date of birth is required (YYYY-MM-DD)");
  }

  if (!personal_information.country) {
    errors.push("Country is required");
  }

  if (!personal_information.state_province) {
    errors.push("State/Province is required");
  }

  if (!personal_information.city) {
    errors.push("City is required");
  }

  if (!personal_information.profession || personal_information.profession.trim().length === 0) {
    errors.push("Profession is required");
  } else if (personal_information.profession.trim().length > 100) {
    errors.push("Profession must not exceed 100 characters");
  }

  // About section validation
  if (!profileData.about) {
    errors.push("About section is required");
  } else {
    if (!profileData.about.professional_summary || profileData.about.professional_summary.length < 50) {
      errors.push("Professional summary must be at least 50 characters");
    }

    // Industry is only required for professionals, not students
    if (userRole !== "student" && !profileData.about.industry) {
      errors.push("Industry is required");
    }

    if (!profileData.about.current_status) {
      errors.push("Current status is required");
    }
  }

  // Education validation (at least one required)
  if (!profileData.education || profileData.education.length === 0) {
    errors.push("At least one education entry is required");
  } else {
    // Validate each education entry
    profileData.education.forEach((edu, index) => {
      if (!edu.institution_name || edu.institution_name.trim().length < 2) {
        errors.push(`Education ${index + 1}: Institution name must be at least 2 characters`);
      } else if (edu.institution_name.trim().length > 100) {
        errors.push(`Education ${index + 1}: Institution name must not exceed 100 characters`);
      }
      
      if (!edu.degree_type || edu.degree_type.trim().length < 2) {
        errors.push(`Education ${index + 1}: Degree type must be at least 2 characters`);
      } else if (edu.degree_type.trim().length > 100) {
        errors.push(`Education ${index + 1}: Degree type must not exceed 100 characters`);
      }
      
      if (!edu.field_of_study || edu.field_of_study.trim().length < 2) {
        errors.push(`Education ${index + 1}: Field of study must be at least 2 characters`);
      } else if (edu.field_of_study.trim().length > 100) {
        errors.push(`Education ${index + 1}: Field of study must not exceed 100 characters`);
      }
    });
  }

  // Skills validation (at least one recommended)
  if (!profileData.skills || profileData.skills.length === 0) {
    errors.push("Adding skills is recommended");
  } else {
    // Validate each skill entry
    profileData.skills.forEach((skill, index) => {
      if (!skill.skill_name || skill.skill_name.trim().length < 2) {
        errors.push(`Skill ${index + 1}: Skill name must be at least 2 characters`);
      } else if (skill.skill_name.trim().length > 50) {
        errors.push(`Skill ${index + 1}: Skill name must not exceed 50 characters`);
      }
      
      if (skill.years_of_experience !== undefined && (skill.years_of_experience < 0 || skill.years_of_experience > 50)) {
        errors.push(`Skill ${index + 1}: Years of experience must be between 0 and 50`);
      }
    });
  }
  
  // Experience validation (if provided)
  if (profileData.experience && profileData.experience.length > 0) {
    profileData.experience.forEach((exp, index) => {
      if (!exp.company_name || exp.company_name.trim().length < 2) {
        errors.push(`Experience ${index + 1}: Company name must be at least 2 characters`);
      } else if (exp.company_name.trim().length > 100) {
        errors.push(`Experience ${index + 1}: Company name must not exceed 100 characters`);
      } else if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(exp.company_name.trim())) {
        errors.push(`Experience ${index + 1}: Company name can only contain letters, numbers, spaces, and common business symbols (-, &, ., comma, parentheses)`);
      }
      
      if (!exp.job_title || exp.job_title.trim().length < 2) {
        errors.push(`Experience ${index + 1}: Job title must be at least 2 characters`);
      } else if (exp.job_title.trim().length > 100) {
        errors.push(`Experience ${index + 1}: Job title must not exceed 100 characters`);
      }
      
      if (exp.job_description && exp.job_description.trim().length > 0) {
        if (exp.job_description.trim().length < 50) {
          errors.push(`Experience ${index + 1}: Job description must be at least 50 characters`);
        } else if (exp.job_description.trim().length > 2000) {
          errors.push(`Experience ${index + 1}: Job description must not exceed 2000 characters`);
        }
      }
    });
  }

  return errors;
}
