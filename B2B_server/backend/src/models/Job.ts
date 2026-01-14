export interface JobLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface JobExperienceLevel {
  min?: number;
  max?: number;
}

export interface Job {
  id: string;
  title: string;
  job_description: string;
  employment_type: 'full_time' | 'part_time';
  skills: string[];
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'inactive' | 'closed';
  job_mode: 'onsite' | 'remote' | 'hybrid';
  location: JobLocation;
  experience_level: JobExperienceLevel;
  company_id: string;
  created_by_id: string;
  company_name?: string;
}

export interface CreateJobData {
  title: string;
  job_description: string;
  employment_type: 'full_time' | 'part_time';
  skills?: string[];
  status?: 'active' | 'inactive' | 'closed';
  job_mode?: 'onsite' | 'remote' | 'hybrid';
  location?: JobLocation;
  experience_level?: JobExperienceLevel;
}

export interface UpdateJobData {
  title?: string;
  job_description?: string;
  employment_type?: 'full_time' | 'part_time';
  skills?: string[];
  status?: 'active' | 'inactive' | 'closed';
  job_mode?: 'onsite' | 'remote' | 'hybrid';
  location?: JobLocation;
  experience_level?: JobExperienceLevel;
}

export interface CreateJobResponse {
  id: string;
  title: string;
  job_description: string;
  employment_type: 'full_time' | 'part_time';
  skills: string[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'closed';
  job_mode: 'onsite' | 'remote' | 'hybrid';
  location: JobLocation;
  experience_level: JobExperienceLevel;
  company_id: string;
  created_by_id: string;
}

export interface JobResponse {
  id: string;
  title: string;
  job_description: string;
  employment_type: 'full_time' | 'part_time';
  skills: string[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'closed';
  job_mode: 'onsite' | 'remote' | 'hybrid';
  location: JobLocation;
  experience_level: JobExperienceLevel;
  company_id: string;
  created_by_id: string;
  company_name?: string;
}

// Search-related interfaces
export interface SearchJobCriteria {
  title?: string;
  job_mode?: 'onsite' | 'remote' | 'hybrid';
  location?: string;
  employment_type?: 'full_time' | 'part_time';
  experience_min?: number;
  experience_max?: number;
  skills?: string; // Comma-separated skills
  page?: number;
  limit?: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchJobsResponse {
  jobs: JobResponse[];
  pagination: PaginationMetadata;
  filters_applied: Partial<SearchJobCriteria>;
}

export interface SearchJobsServiceResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

