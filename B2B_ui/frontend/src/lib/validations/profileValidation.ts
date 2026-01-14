/**
 * Profile Validation Utilities
 * 
 * Comprehensive validation rules for student and professional profiles
 * Based on: PROFILE_VALIDATION.md
 */

// ============================================
// VALIDATION PATTERNS
// ============================================

export const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s\-']+$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  stateProvince: /^[a-zA-Z\s\-]+$/,
  city: /^[a-zA-Z\s\-]+$/,
  companyName: /^[a-zA-Z0-9\s\-&\.]+$/,
  country: /^[a-zA-Z\s\-']+$/, // Country names with letters, spaces, hyphens, apostrophes
  linkedinUrl: /^(https?:\/\/)?(www\.)?(linkedin\.com\/in\/|linkedin\.com\/pub\/)[a-zA-Z0-9\-_]+\/?$/,
  githubUrl: /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9\-_]+\/?$/,
  websiteUrl: /^https?:\/\/.+/,
};

// ============================================
// VALIDATION LIMITS
// ============================================

export const VALIDATION_LIMITS = {
  firstName: { min: 2, max: 50 },
  lastName: { min: 2, max: 50 },
  email: { max: 254 },
  postalCode: { min: 3, max: 10 },
  stateProvince: { min: 2, max: 100 },
  city: { min: 2, max: 100 },
  country: { min: 2, max: 100 },
  professionalSummary: { min: 50, max: 2000 },
  institutionName: { min: 2, max: 200 },
  fieldOfStudy: { min: 2, max: 100 },
  companyName: { min: 2, max: 100 },
  jobTitle: { min: 2, max: 100 },
  jobDescription: { min: 50, max: 2000 },
  skillName: { min: 2, max: 50 },
  maxSkills: 50,
  yearsExperience: { min: 0, max: 50 },
  projectTitle: { min: 5, max: 100 },
  projectDescription: { min: 100, max: 2000 },
  maxTechnologies: 20,
  awardName: { min: 5, max: 100 },
  awardOrganization: { min: 2, max: 100 },
  awardDescription: { min: 50, max: 500 },
  certificationName: { min: 5, max: 100 },
  certificationAuthority: { min: 2, max: 100 },
  gpa: { min: 0.0, max: 4.0 },
  startYear: { min: 1950, max: new Date().getFullYear() },
  age: { min: 12, max: 125 },
};

// ============================================
// ENUMS
// ============================================

export const VALID_GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;
export const VALID_INDUSTRIES = ["Technology", "Healthcare", "Finance", "Education", "Other"] as const;

export const STUDENT_STATUSES = [
  "Studying",
  "Looking for internship",
  "Looking for job",
] as const;

export const PROFESSIONAL_STATUSES = [
  "Employed",
  "Unemployed",
  "Freelancing",
  "Consulting",
  "Employer",
] as const;

export const DEGREE_TYPES = [
  "Bachelor's",
  "Master's",
  "PhD",
  "Diploma",
  "Certificate",
] as const;

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
] as const;

export const PROFICIENCY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

export const PROJECT_TYPES = [
  "Personal",
  "Academic",
  "Professional",
  "Open Source",
] as const;

export const PROFILE_VISIBILITIES = [
  "Public",
  "Connections Only",
  "Private",
] as const;

export const CONTACT_VISIBILITIES = [
  "Public",
  "Connections Only",
  "Hidden",
] as const;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate name (first_name, last_name)
 */
export function validateName(name: string, fieldName: string): string | null {
  if (!name || name.trim().length === 0) {
    return `${fieldName} is required`;
  }
  if (name.length < VALIDATION_LIMITS.firstName.min) {
    return `${fieldName} must be at least ${VALIDATION_LIMITS.firstName.min} characters`;
  }
  if (name.length > VALIDATION_LIMITS.firstName.max) {
    return `${fieldName} must not exceed ${VALIDATION_LIMITS.firstName.max} characters`;
  }
  if (!VALIDATION_PATTERNS.name.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return null;
}

/**
 * Validate email
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return "Email is required";
  }
  if (email.length > VALIDATION_LIMITS.email.max) {
    return `Email must not exceed ${VALIDATION_LIMITS.email.max} characters`;
  }
  if (!VALIDATION_PATTERNS.email.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

/**
 * Validate phone number using libphonenumber-js
 * Validates international phone numbers properly
 */
export async function validatePhone(phone: string): Promise<string | null> {
  if (!phone) return null; // Optional field
  
  try {
    // Dynamic import to avoid SSR issues
    const { isValidPhoneNumber } = await import('libphonenumber-js');
    
    if (!isValidPhoneNumber(phone)) {
      return "Please enter a valid international phone number (e.g., +1234567890)";
    }
    return null;
  } catch (error) {
    // Fallback to regex if libphonenumber-js fails to load
    console.warn('libphonenumber-js validation failed, using regex fallback:', error);
    if (!VALIDATION_PATTERNS.phone.test(phone)) {
      return "Please enter a valid international phone number (e.g., +1234567890)";
    }
    return null;
  }
}

// Synchronous version for backwards compatibility (uses regex fallback)
export function validatePhoneSync(phone: string): string | null {
  if (!phone) return null; // Optional field
  if (!VALIDATION_PATTERNS.phone.test(phone)) {
    return "Please enter a valid international phone number (e.g., +1234567890)";
  }
  return null;
}

/**
 * Validate date of birth
 */
export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return "Date of birth is required";
  
  const date = new Date(dob);
  const today = new Date();
  
  if (isNaN(date.getTime())) {
    return "Please enter a valid date (YYYY-MM-DD)";
  }
  
  if (date >= today) {
    return "Date of birth cannot be in the future";
  }
  
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) 
    ? age - 1 
    : age;
  
  if (actualAge < VALIDATION_LIMITS.age.min) {
    return `You must be at least ${VALIDATION_LIMITS.age.min} years old`;
  }
  if (actualAge > VALIDATION_LIMITS.age.max) {
    return `Age cannot exceed ${VALIDATION_LIMITS.age.max} years`;
  }
  
  return null;
}

/**
 * Validate professional summary
 */
export function validateProfessionalSummary(summary: string): string | null {
  if (!summary || summary.trim().length === 0) {
    return null; // Optional field
  }
  if (summary.length < VALIDATION_LIMITS.professionalSummary.min) {
    return `Professional summary must be at least ${VALIDATION_LIMITS.professionalSummary.min} characters`;
  }
  if (summary.length > VALIDATION_LIMITS.professionalSummary.max) {
    return `Professional summary must not exceed ${VALIDATION_LIMITS.professionalSummary.max} characters`;
  }
  return null;
}

/**
 * Validate current status based on user type
 */
export function validateCurrentStatus(
  status: string,
  userType: "student" | "professional"
): string | null {
  if (!status) return null; // Optional field
  
  if (userType === "student") {
    if (!(STUDENT_STATUSES as readonly string[]).includes(status)) {
      return "Invalid status for student profile. Please select: Studying, Looking for internship, or Looking for job";
    }
  } else if (userType === "professional") {
    if (!(PROFESSIONAL_STATUSES as readonly string[]).includes(status)) {
      return "Invalid status for professional profile. Please select: Employed, Unemployed, Freelancing, Consulting, or Employer";
    }
  }
  
  return null;
}

/**
 * Validate GPA
 */
export function validateGPA(gpa: number | undefined): string | null {
  if (gpa === undefined) return null; // Optional field
  if (gpa < VALIDATION_LIMITS.gpa.min || gpa > VALIDATION_LIMITS.gpa.max) {
    return `GPA must be between ${VALIDATION_LIMITS.gpa.min} and ${VALIDATION_LIMITS.gpa.max}`;
  }
  return null;
}

/**
 * Validate year range
 */
export function validateYearRange(
  startYear: number,
  endYear: number | undefined
): string | null {
  const currentYear = new Date().getFullYear();
  
  if (startYear < VALIDATION_LIMITS.startYear.min || startYear > currentYear) {
    return `Start year must be between ${VALIDATION_LIMITS.startYear.min} and ${currentYear}`;
  }
  
  if (endYear !== undefined) {
    if (endYear < startYear) {
      return "End year must be after start year";
    }
    if (endYear > currentYear + 10) {
      return `End year cannot exceed ${currentYear + 10}`;
    }
  }
  
  return null;
}

/**
 * Validate date range (MM/YYYY format)
 */
export function validateDateRange(
  startDate: string,
  endDate: string | undefined | null
): string | null {
  const datePattern = /^(0[1-9]|1[0-2])\/\d{4}$/;
  
  if (!datePattern.test(startDate)) {
    return "Start date must be in MM/YYYY format";
  }
  
  const [startMonth, startYear] = startDate.split("/").map(Number);
  const startDateObj = new Date(startYear, startMonth - 1);
  const today = new Date();
  
  if (startDateObj > today) {
    return "Start date cannot be in the future";
  }
  
  if (endDate && endDate !== null) {
    if (!datePattern.test(endDate)) {
      return "End date must be in MM/YYYY format";
    }
    
    const [endMonth, endYear] = endDate.split("/").map(Number);
    const endDateObj = new Date(endYear, endMonth - 1);
    
    if (endDateObj > today) {
      return "End date cannot be in the future";
    }
    
    if (endDateObj < startDateObj) {
      return "End date must be after start date";
    }
  }
  
  return null;
}

/**
 * Validate company name
 */
export function validateCompanyName(name: string): string | null {
  if (!name || name.trim().length === 0) return null; // Optional field
  
  if (name.length < VALIDATION_LIMITS.companyName.min) {
    return `Company name must be at least ${VALIDATION_LIMITS.companyName.min} characters`;
  }
  if (name.length > VALIDATION_LIMITS.companyName.max) {
    return `Company name must not exceed ${VALIDATION_LIMITS.companyName.max} characters`;
  }
  if (!VALIDATION_PATTERNS.companyName.test(name)) {
    return "Company name can only contain letters, numbers, spaces, hyphens, ampersands, and periods";
  }
  return null;
}

/**
 * Validate skill name
 */
export function validateSkillName(name: string): string | null {
  if (!name || name.trim().length === 0) return "Skill name is required";
  
  if (name.length < VALIDATION_LIMITS.skillName.min) {
    return `Skill name must be at least ${VALIDATION_LIMITS.skillName.min} characters`;
  }
  if (name.length > VALIDATION_LIMITS.skillName.max) {
    return `Skill name must not exceed ${VALIDATION_LIMITS.skillName.max} characters`;
  }
  return null;
}

/**
 * Validate years of experience
 */
export function validateYearsOfExperience(years: number | undefined): string | null {
  if (years === undefined) return null; // Optional field
  
  if (years < VALIDATION_LIMITS.yearsExperience.min || years > VALIDATION_LIMITS.yearsExperience.max) {
    return `Years of experience must be between ${VALIDATION_LIMITS.yearsExperience.min} and ${VALIDATION_LIMITS.yearsExperience.max}`;
  }
  return null;
}

/**
 * Validate project title
 */
export function validateProjectTitle(title: string): string | null {
  if (!title || title.trim().length === 0) return "Project title is required";
  
  if (title.length < VALIDATION_LIMITS.projectTitle.min) {
    return `Project title must be at least ${VALIDATION_LIMITS.projectTitle.min} characters`;
  }
  if (title.length > VALIDATION_LIMITS.projectTitle.max) {
    return `Project title must not exceed ${VALIDATION_LIMITS.projectTitle.max} characters`;
  }
  return null;
}

/**
 * Validate URL
 */
export function validateURL(url: string | undefined): string | null {
  if (!url) return null; // Optional field
  
  try {
    new URL(url);
    return null;
  } catch {
    return "Please enter a valid URL";
  }
}

/**
 * Validate State/Province
 */
export function validateStateProvince(state: string, isRequired: boolean = true): string | null {
  if (!state || state.trim().length === 0) {
    return isRequired ? "State/Province is required" : null;
  }
  
  const trimmed = state.trim();
  
  if (trimmed.length < VALIDATION_LIMITS.stateProvince.min) {
    return `State/Province must be at least ${VALIDATION_LIMITS.stateProvince.min} characters`;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.stateProvince.max) {
    return `State/Province must not exceed ${VALIDATION_LIMITS.stateProvince.max} characters`;
  }
  
  if (!VALIDATION_PATTERNS.stateProvince.test(trimmed)) {
    return "State/Province can only contain letters, spaces, and hyphens";
  }
  
  return null;
}

/**
 * Validate Country
 */
export function validateCountry(country: string, isRequired: boolean = true): string | null {
  if (!country || country.trim().length === 0) {
    return isRequired ? "Country is required" : null;
  }
  
  const trimmed = country.trim();
  
  if (trimmed.length < VALIDATION_LIMITS.country.min) {
    return `Country must be at least ${VALIDATION_LIMITS.country.min} characters`;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.country.max) {
    return `Country must not exceed ${VALIDATION_LIMITS.country.max} characters`;
  }
  
  if (!VALIDATION_PATTERNS.country.test(trimmed)) {
    return "Country can only contain letters, spaces, hyphens, and apostrophes";
  }
  
  return null;
}

/**
 * Validate City
 */
export function validateCity(city: string, isRequired: boolean = true): string | null {
  if (!city || city.trim().length === 0) {
    return isRequired ? "City is required" : null;
  }
  
  const trimmed = city.trim();
  
  if (trimmed.length < VALIDATION_LIMITS.city.min) {
    return `City must be at least ${VALIDATION_LIMITS.city.min} characters`;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.city.max) {
    return `City must not exceed ${VALIDATION_LIMITS.city.max} characters`;
  }
  
  if (!VALIDATION_PATTERNS.city.test(trimmed)) {
    return "City can only contain letters, spaces, and hyphens";
  }
  
  return null;
}

/**
 * Validate LinkedIn URL
 */
export function validateLinkedInURL(url: string | undefined): string | null {
  if (!url) return null; // Optional field
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) return null; // Empty is allowed for optional field
  
  // Check if it's a valid LinkedIn URL pattern
  if (!VALIDATION_PATTERNS.linkedinUrl.test(trimmed)) {
    return "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)";
  }
  
  return null;
}

/**
 * Validate GitHub URL
 */
export function validateGitHubURL(url: string | undefined): string | null {
  if (!url) return null; // Optional field
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) return null; // Empty is allowed for optional field
  
  // Check if it's a valid GitHub URL pattern
  if (!VALIDATION_PATTERNS.githubUrl.test(trimmed)) {
    return "Please enter a valid GitHub profile URL (e.g., https://github.com/username)";
  }
  
  return null;
}

/**
 * Validate Website URL
 */
export function validateWebsiteURL(url: string | undefined): string | null {
  if (!url) return null; // Optional field
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) return null; // Empty is allowed for optional field
  
  // Must start with http:// or https://
  if (!VALIDATION_PATTERNS.websiteUrl.test(trimmed)) {
    return "Please enter a valid website URL starting with http:// or https://";
  }
  
  // Also validate it's a proper URL
  try {
    new URL(trimmed);
    return null;
  } catch {
    return "Please enter a valid website URL";
  }
}

/**
 * Validate Profession
 */
export function validateProfession(profession: string, isRequired: boolean = true): string | null {
  if (!profession || profession.trim().length === 0) {
    return isRequired ? "Profession is required" : null;
  }
  
  const trimmed = profession.trim();
  
  if (trimmed.length > 100) {
    return "Profession must not exceed 100 characters";
  }
  
  return null;
}

// ============================================
// VALIDATION ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  REQUIRED: (field: string) => `${field} is required`,
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  INVALID_FORMAT: (field: string) => `Please enter a valid ${field}`,
  INVALID_PATTERN: (field: string, pattern: string) => `${field} format is invalid. ${pattern}`,
  OUT_OF_RANGE: (field: string, min: number, max: number) => `${field} must be between ${min} and ${max}`,
  FUTURE_DATE: "Date cannot be in the future",
  INVALID_DATE_ORDER: "End date must be after start date",
  AGE_TOO_YOUNG: (min: number) => `You must be at least ${min} years old`,
  AGE_TOO_OLD: (max: number) => `Age cannot exceed ${max} years`,
  MAX_ITEMS: (field: string, max: number) => `Maximum ${max} ${field} allowed`,
  UNIQUE_REQUIRED: (field: string) => `${field} must be unique within your profile`,
};
