export type JobType = 'full_time' | 'part_time' 
export type JobStatus = 'active' | 'inactive' | 'closed' | 'draft'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type WorkLocation = 'onsite' | 'remote' | 'hybrid'
export type JobMode = 'onsite' | 'remote' | 'hybrid'
export type ApplicationStatus = 'applied' | 'selected' | 'rejected' | 'pending' | 'reviewed'
export type ApplicationStatusType = ApplicationStatus

export interface Applicant {
  user_id: string
  name: string
  email: string
  profile_picture?: string
  user_type: 'professional' | 'student'
}

export interface JobApplication {
  id: string
  job_id: string
  user_id: string
  resume_url: string
  phone: string
  email: string
  additional_info?: {
    portfolio?: string
    linkedin?: string
    [key: string]: string | undefined
  } | null
  status: ApplicationStatus
  created_at: string
  updated_at: string
  applicant: Applicant
}

export interface JobInfo {
  id: string
  title: string
  company_id: string
  status: string
  total_applications: number
}

export interface ApplicationsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface JobApplicationsResponse {
  applications: JobApplication[]
  pagination: ApplicationsPagination
  filters_applied: {
    status: string
    job_id: string
  }
  job_info: JobInfo
}

export interface JobPosting {
  id: string
  title: string
  job_description: string
  employment_type: JobType
  skills: string[]
  created_at: string
  updated_at: string
  status: JobStatus
  job_mode: JobMode
  location: {
    city: string
    state: string
    country: string
  } | string
  experience_level: Record<string, unknown>
  company_id: string
  created_by_id: string
  company_name?: string
  // Additional fields for UI compatibility
  jobId?: string
  profileId?: string
  description?: string
  department?: string
  jobType?: JobType
  experienceLevel?: ExperienceLevel
  postedBy?: {
    userId: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateJobPostingData {
  title: string
  job_description: string
  employment_type: JobType
  skills: string[]
  status: JobStatus
  job_mode: JobMode
  location: {
    city: string
    state: string
    country: string
  }
  experience_level: {
    min: number
    max: number
  }
  // Optional fields for backward compatibility
  description?: string
  department?: string
  jobType?: JobType
  experienceLevel?: ExperienceLevel
  salaryRange?: {
    min: number
    max: number
    currency: string
  }
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  applicationDeadline?: string
}

export interface UpdateJobPostingData extends Partial<CreateJobPostingData> {
  id?: string
}

export interface JobsResponse {
  data: JobPosting[]
}

// Helper function to transform API response to UI-compatible format
export const transformJobForUI = (job: JobPosting): JobPosting & {
  jobId: string;
  profileId: string;
  description: string;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  applicationsCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  postedBy: { userId: string; name: string };
  location: string;
} => ({
  ...job,
  jobId: job.id,
  profileId: job.company_id,
  description: job.job_description,
  jobType: job.employment_type,
  experienceLevel: 'mid' as ExperienceLevel, // Default since backend returns object
  applicationsCount: 0,
  viewsCount: 0,
  createdAt: job.created_at,
  updatedAt: job.updated_at,
  postedBy: {
    userId: job.created_by_id,
    name: 'User' // Default since not provided by API
  },
  location: typeof job.location === 'object' ? 'Not specified' : job.location
});

export interface CreateJobApplicationData {
  resume: File
  phone: string
  email: string
  full_name: string
  address: string
  portfolioUrl?: string
  linkedinUrl?: string
  githubUrl?: string
}

export interface MyApplication extends JobApplication {
  applicationId: string  // Alias for id for UI compatibility
  jobId: string  // Alias for job_id for UI compatibility
  appliedAt: string  // Alias for created_at for UI compatibility
  resume: string  // Alias for resume_url for UI compatibility
  job: {
    id: string
    title: string
    companyName?: string
    profileId?: string
  }
}

export interface ApplicationDetails extends MyApplication {
  updatedAt: string  // Alias for updated_at for UI compatibility
  job: {
    id: string
    title: string
    companyName?: string
    profileId?: string
    company_id?: string
    job_description?: string
    employment_type?: string
    job_mode?: string
    location?: {
      city: string
      state: string
      country: string
    } | string
  }
}

export interface UpdateApplicationData {
  resume?: string
  phone?: string
  email?: string
  additional_info?: {
    portfolio?: string
    linkedin?: string
    github?: string
    [key: string]: string | undefined
  }
}

export interface UserApplicationStatus {
  hasApplied: boolean
  application?: JobApplication
}
