export type UserType = 'company' | 'professional' | 'student'
export type UserRole = 'student' | 'professional'
export type RegisterStep = 'role' | 'account' | 'profile'

// Business Profile Management Types
export interface DeactivateBusinessResponse {
  profileId: string;
  profileName: string;
  isActive: boolean;
  deactivatedAt?: string;
  deactivatedBy?: string;
  activatedAt?: string;
  activatedBy?: string;
}

export interface PromoteMemberResponse {
  memberId: string;
  userId: string;
  profileId: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  promotedAt: string;
}

export interface DemoteMemberResponse {
  memberId: string;
  userId: string;
  profileId: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  demotedAt: string;
}

export interface DemoteSelfResponse {
  memberId: string;
  userId: string;
  profileId: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  demotedAt: string;
}

export interface RemoveMemberResponse {
  memberId: string;
  userId: string;
  profileId: string;
  memberName: string;
  previousRole: string;
  removedAt: string;
  removedBy: {
    userId: string;
    name: string;
  };
}

export interface CancelInvitationResponse {
  invitationId: string;
  profileId: string;
  inviteeId: string;
  inviteeName: string;
  status: string;
  cancelledAt: string;
  cancelledBy: {
    userId: string;
    name: string;
  };
}

// Business Profile Types
export interface BusinessProfileData {
  companyName: string
  company_logo?: {
    fileId: string
    fileUrl: string
    filename: string
    uploadedAt: string
  }
  company_type: string
  company_website?: string
  tagline?: string
  industry: string
  company_size: string
  headquater_location?: string
  location?: string
  primary_email: string
  additional_email?: {
    email: string
  }[]
  phone_number?: string
  additional_phone_numbers?: {
    phone_number: string
  }[]
  privacy_settings: {
    profile_visibility: 'public' | 'private'
    contact_visibility: 'public' | 'private'
  }
}

export interface BusinessProfile {
  // Top-level profile info
  profileId: string
  role: 'owner' | 'admin' | 'editor'
  isActive: boolean
  joinedAt: string
  lastActive: string
  
  // Company profile data (nested)
  companyProfileData: {
    // Core company information
    companyName: string
    tagline: string
    industry: string
    company_type: string
    company_size: string
    location: string
    headquater_location: string
    company_website: string
    
    // Contact information
    primary_email: string
    phone_number: string
    additional_email: Array<{ email: string }>
    additional_phone_numbers: Array<{ phone_number: string }>
    
    // Media and branding
    company_logo: { 
      fileId: string
      fileUrl: string
      fileName?: string
      filename?: string
      uploadedAt: string
    }
    avatar: {
      fileId: string
      fileUrl: string
      filename: string
      uploadedAt: string
    }
    banner: {
      fileId: string
      fileUrl: string
      filename: string
      uploadedAt: string
    }
    
    // About section
    about: {
      description: string
      mission: string
      vision: string
      core_values: string
      founder_message: string
      founded: string
      employees: string
      headquarters: string
      createdAt: string
      updatedAt: string
      company_introduction_video?: {
        fileId: string
        fileUrl: string
        filename: string
        uploadedAt: string
      }
    }
    
    // Projects
    projects: Array<{
      projectId: string
      title: string
      description: string
      client?: string | null
      status?: string | null
      startDate: string
      endDate?: string | null
      project_url?: string | null
      technologies?: string | null
      createdAt: string
      updatedAt: string
    }>
    
    // Achievements
    achievements: Array<{
      achievementId: string
      award_name: string
      description?: string
      date_received: string
      icon?: string
      issuer?: string
      category?: string
      awarding_organization?: string
      certificateUrl?: Array<{ file_url: string }>
      createdAt: string
      updatedAt: string
    }>
    
    // Private/sensitive info
    private_info: {
      legalName: string
      ein: string
      taxId: string
      createdAt: string
      updatedAt: string
      bankDetails: {
        bankName: string
        accountNumber: string
        routingNumber: string
      }
      business_license: {
        fileId: string
        fileUrl: string
        filename: string
        uploadedAt: string
      }
      registration_certificate: {
        fileId: string
        fileUrl: string
        filename: string
        uploadedAt: string
      }
    }
  }
  
  // For backward compatibility with existing components and new API response fields
  profileName?: string
  businessName?: string
  logo?: string
  banner?: string
  industry?: string
  description?: string
  company_size?: string
  company_type?: string
  company_website?: string
  primary_email?: string
  additional_emails?: {
    email: string
  }[]
}

// For business profile creation - this matches what the create API expects/returns
export interface CreatedBusinessProfile {
  profileId: string
  owner_id: string
  role: 'owner'
  profile_data: BusinessProfileData
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface BusinessProfilesResponse {
  companyPages: BusinessProfile[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  summary: {
    totalCompanies: number
    adminRoles: number
    editorRoles: number
    ownerRoles: number
    activeCompanies: number
  }
}

export interface BaseProfileData {
  projects?: string
  experience?: string
}

export interface CompanyProfileData extends BaseProfileData {
  company_name: string
  industry: string
  company_size: string
}

export interface ProfessionalProfileData extends BaseProfileData {
  job_title: string
  company: string
  years_experience: number
}

export interface StudentProfileData extends BaseProfileData {
  university: string
  degree: string
  field_of_study: string
  graduation_year: string
  gpa?: number
}

export type ProfileData = CompanyProfileData | ProfessionalProfileData | StudentProfileData

export interface RegisterData {
  user_type: UserType
  name: string
  email: string
  phone: string
  password: string
  profile_data: ProfileData
}

export interface LoginData {
  email: string
  password: string
  remember_me?: boolean
}

export interface User {
  id: string
  email: string
  name: string
  user_type: UserType
  role?: UserRole | null
  tutorial_status?: 'complete' | 'incomplete' | 'skipped'
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface ApiResponse<T> {
  status: number
  message: string
  success: boolean
  data?: T
  errors?: ApiErrorField[]
}

export interface ApiErrorField {
  field: string
  message: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

export interface RegisterFormState {
  step: RegisterStep
  selectedRole: UserRole | null
  selectedUserType: UserType | null
  accountData: {
    name: string
    email: string
    phone: string
    password: string
    acceptTerms: boolean
  } | null
}

// Business Profile Posts Types
export interface BusinessProfilePostMedia {
  url: string;
  size: number;
  type: string;
  filename: string;
  uploadedAt: string;
}

export interface BusinessProfilePost {
  postId: string;
  profileId: string;
  title: string;
  content: string;
  tags: string[];
  media: BusinessProfilePostMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfilePostsResponse {
  posts: BusinessProfilePost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CreateBusinessProfilePostData {
  title: string;
  content: string;
  tags: string[];
  media?: File;
}

export interface UpdateBusinessProfilePostData {
  title: string;
  content: string;
  tags: string[];
  media?: File;
}
