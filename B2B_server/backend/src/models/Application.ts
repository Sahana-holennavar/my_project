export interface ResumeData {
  file_name: string;
  file_url: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  user_id: string;
  full_name: string;
  resume: ResumeData;
  phone: string;
  email: string;
  address: string;
  status: 'applied' | 'selected' | 'rejected';
  created_at: Date;
  updated_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
}

export interface CreateApplicationData {
  full_name: string;
  phone: string;
  email: string;
  address: string;
}

export interface ApplicationResponse {
  id: string;
  job_id: string;
  user_id: string;
  full_name: string;
  resume: ResumeData;
  phone: string;
  email: string;
  address: string;
  status: 'applied' | 'selected' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ApplicantDetails {
  user_id: string;
  name: string;
  email: string;
  profile_picture: string | null;
  user_type: string | null;
}

export interface ApplicationWithUserDetails {
  id: string;
  job_id: string;
  user_id: string;
  resume_url: string;
  phone: string;
  email: string;
  status: 'applied' | 'selected' | 'rejected';
  created_at: string;
  updated_at: string;
  applicant: ApplicantDetails;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface JobInfo {
  id: string;
  title: string;
  company_id: string;
  status: 'active' | 'inactive' | 'closed';
  total_applications: number;
}

export interface GetApplicationsResponse {
  applications: ApplicationWithUserDetails[];
  pagination: PaginationMetadata;
  filters_applied: {
    status: string;
    job_id: string;
  };
  job_info: JobInfo;
}

export interface JobDetails {
  id: string;
  title: string;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  status: 'active' | 'inactive' | 'closed';
  job_description?: string;
  employment_type?: string;
  job_mode?: string;
  location?: any;
}

export interface ApplicationWithJobDetails {
  id: string;
  job_id: string;
  user_id: string;
  resume: string;
  phone: string;
  email: string;
  status: 'applied' | 'selected' | 'rejected';
  created_at: string;
  updated_at: string;
  job: JobDetails;
}

export interface GetUserApplicationsResponse {
  applications: ApplicationWithJobDetails[];
  pagination: PaginationMetadata;
}

export interface UpdateApplicationData {
  phone?: string;
  email?: string;
  resume?: string;
}

