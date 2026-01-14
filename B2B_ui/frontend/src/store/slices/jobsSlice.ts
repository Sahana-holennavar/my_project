import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { jobsApi } from '@/lib/api';
import type { JobPosting, CreateJobPostingData, JobStatus, ExperienceLevel, WorkLocation } from '@/types/jobs';

interface JobsState {
  jobs: JobPosting[];
  currentJob: JobPosting | null;
  loading: boolean;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: string | null;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  summary: {
    totalJobs: number;
    activeJobs: number;
    inactiveJobs: number;
    draftJobs: number;
  };
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  loading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: null,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  },
  summary: {
    totalJobs: 0,
    activeJobs: 0,
    inactiveJobs: 0,
    draftJobs: 0,
  },
};

// Async thunks
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async ({
    profileId,
    params = {},
  }: {
    profileId: string;
    params?: {
      page?: number;
      limit?: number;
      status?: string;
    };
  }) => {
    const response = await jobsApi.getJobs(profileId, params);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch jobs');
    }
    return { response: response.data, params };
  }
);

export const fetchSingleJob = createAsyncThunk(
  'jobs/fetchSingleJob',
  async ({
    profileId,
    jobId,
  }: {
    profileId: string;
    jobId: string;
  }) => {
    const response = await jobsApi.getJob(profileId, jobId);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch job');
    }
    return response.data;
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async ({
    profileId,
    jobData,
  }: {
    profileId: string;
    jobData: CreateJobPostingData;
  }) => {
    const response = await jobsApi.createJob(profileId, jobData);
    if (!response.success) {
      throw new Error(response.message || 'Failed to create job');
    }
    return response.data;
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({
    profileId,
    jobId,
    jobData,
  }: {
    profileId: string;
    jobId: string;
    jobData: Partial<CreateJobPostingData>;
  }) => {
    const response = await jobsApi.updateJob(profileId, jobId, jobData);
    if (!response.success) {
      throw new Error(response.message || 'Failed to update job');
    }
    return { jobId, data: response.data, updatedFields: jobData };
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async ({
    profileId,
    jobId,
  }: {
    profileId: string;
    jobId: string;
  }) => {
    const response = await jobsApi.deleteJob(profileId, jobId);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete job');
    }
    return jobId;
  }
);

export const toggleJobStatus = createAsyncThunk(
  'jobs/toggleJobStatus',
  async ({
    profileId,
    jobId,
    status,
  }: {
    profileId: string;
    jobId: string;
    status: 'active' | 'inactive';
  }) => {
    // Use the updateJob API with just the status field for partial update
    const response = await jobsApi.updateJob(profileId, jobId, { status });
    if (!response.success) {
      throw new Error(response.message || 'Failed to toggle job status');
    }
    return { jobId, status };
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearJobs: (state) => {
      state.jobs = [];
      state.pagination = initialState.pagination;
      state.summary = initialState.summary;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentJob: (state, action: PayloadAction<JobPosting | null>) => {
      state.currentJob = action.payload;
    },
    updateJobInList: (state, action: PayloadAction<{ jobId: string; updates: Partial<JobPosting> }>) => {
      const { jobId, updates } = action.payload;
      const jobIndex = state.jobs.findIndex(job => (job.jobId || job.id) === jobId);
      if (jobIndex !== -1) {
        state.jobs[jobIndex] = { ...state.jobs[jobIndex], ...updates };
      }
    },
    removeJobFromList: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(job => (job.jobId || job.id) !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch jobs
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        
        // Handle different response structures
        let jobsArray: JobPosting[] = [];
        const responseData = action.payload.response;
        
        if (Array.isArray(responseData)) {
          jobsArray = responseData;
        } else if (responseData && typeof responseData === 'object' && 'jobs' in responseData) {
          jobsArray = (responseData as { jobs: JobPosting[] }).jobs || [];
        } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          jobsArray = (responseData as { data: JobPosting[] }).data || [];
        }
        
        // Transform jobs to UI format
        const transformedJobs = jobsArray.map((job: JobPosting & { 
          workLocation?: WorkLocation; 
          applicationsCount?: number; 
          viewsCount?: number; 
          requirements?: string[];
          responsibilities?: string[];
          benefits?: string[];
        }): JobPosting => ({
          // Core required fields
          id: job.id,
          title: job.title,
          job_description: job.job_description || job.description || '',
          employment_type: job.employment_type || job.jobType || 'full_time',
          skills: job.skills || [],
          created_at: job.created_at || job.createdAt || new Date().toISOString(),
          updated_at: job.updated_at || job.updatedAt || new Date().toISOString(),
          status: job.status || 'active',
          job_mode: job.job_mode || job.workLocation || 'remote',
          location: typeof job.location === 'string' ? job.location : 
                   (job.location?.city ? `${job.location.city}, ${job.location.state}, ${job.location.country}` : 'Not specified'),
          experience_level: job.experience_level || { min: 1, max: 3 },
          company_id: job.company_id || '',
          created_by_id: job.created_by_id || '',
          company_name: job.company_name,
          // Optional UI compatibility fields
          jobId: job.id,
          profileId: job.company_id,
          description: job.job_description || job.description,
          jobType: job.employment_type || job.jobType,
          experienceLevel: 'mid' as ExperienceLevel,
          postedBy: {
            userId: job.created_by_id || '',
            name: 'User'
          },
          createdAt: job.created_at || job.createdAt,
          updatedAt: job.updated_at || job.updatedAt
        }));
        
        state.jobs = transformedJobs;
        
        // Calculate summary
        state.summary = {
          totalJobs: transformedJobs.length,
          activeJobs: transformedJobs.filter((job: JobPosting) => job.status === 'active').length,
          inactiveJobs: transformedJobs.filter((job: JobPosting) => job.status === 'inactive').length,
          draftJobs: transformedJobs.filter((job: JobPosting) => job.status === 'draft').length,
        };
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch jobs';
      })
      
      // Fetch single job
      .addCase(fetchSingleJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSingleJob.fulfilled, (state, action) => {
        state.loading = false;
        // Transform job to UI format
        const job = action.payload;
        if (job) {
          const transformedJob = {
            ...job,
            jobId: job.id || job.jobId,
            profileId: job.company_id || job.profileId,
            description: job.job_description || job.description,
            workLocation: job.job_mode  || 'remote',
            jobType: job.employment_type || job.jobType,
            company_name: job.company_name,
            experienceLevel: 'mid' as ExperienceLevel,
            createdAt: job.created_at || job.createdAt,
            updatedAt: job.updated_at || job.updatedAt,
            postedBy: job.postedBy || {
              userId: job.created_by_id || '',
              name: 'User'
            },
            location: typeof job.location === 'string' ? job.location : 
                     (job.location?.city ? `${job.location.city}, ${job.location.state}, ${job.location.country}` : 'Not specified')
          };
          state.currentJob = transformedJob;
        }
      })
      .addCase(fetchSingleJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch job';
      })
      
      // Create job
      .addCase(createJob.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.createLoading = false;
        // Add basic job info to state, full data will be fetched separately
        if (action.payload) {
          const newJob: JobPosting = {
            id: action.payload.id,
            title: action.payload.title,
            status: action.payload.status as JobStatus,
            created_at: action.payload.created_at,
            // Default values for required fields
            job_description: '',
            employment_type: 'full_time',
            skills: [],
            updated_at: action.payload.created_at,
            job_mode: 'remote',
            location: 'Not specified',
            experience_level: {},
            company_id: '',
            created_by_id: ''
          };
          state.jobs.unshift(newJob);
          
          // Update summary
          state.summary.totalJobs++;
          if (action.payload.status === 'active') state.summary.activeJobs++;
          else if (action.payload.status === 'inactive') state.summary.inactiveJobs++;
          else if (action.payload.status === 'draft') state.summary.draftJobs++;
        }
      })
      .addCase(createJob.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.error.message || 'Failed to create job';
      })
      
      // Update job
      .addCase(updateJob.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.updateLoading = false;
        // Update job in list with the updated fields
        const { jobId, updatedFields } = action.payload;
        const jobIndex = state.jobs.findIndex(job => (job.jobId || job.id) === jobId);
        if (jobIndex !== -1) {
          // Merge the updated fields into the existing job
          state.jobs[jobIndex] = { 
            ...state.jobs[jobIndex], 
            ...updatedFields,
            updated_at: new Date().toISOString()
          };
          
          // Update summary if status changed
          if (updatedFields.status && updatedFields.status !== state.jobs[jobIndex].status) {
            const oldStatus = state.jobs[jobIndex].status;
            const newStatus = updatedFields.status;
            
            // Update summary counts
            if (oldStatus === 'active' && newStatus === 'inactive') {
              state.summary.activeJobs--;
              state.summary.inactiveJobs++;
            } else if (oldStatus === 'inactive' && newStatus === 'active') {
              state.summary.inactiveJobs--;
              state.summary.activeJobs++;
            } else if (oldStatus === 'draft' && newStatus === 'active') {
              state.summary.draftJobs--;
              state.summary.activeJobs++;
            } else if (oldStatus === 'active' && newStatus === 'draft') {
              state.summary.activeJobs--;
              state.summary.draftJobs++;
            }
          }
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.error.message || 'Failed to update job';
      })
      
      // Delete job
      .addCase(deleteJob.pending, (state, action) => {
        state.deleteLoading = action.meta.arg.jobId;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.deleteLoading = null;
        
        // Find the job before deleting to update summary
        const deletedJob = state.jobs.find(job => (job.jobId || job.id) === action.payload);
        
        // Remove job from list
        state.jobs = state.jobs.filter(job => (job.jobId || job.id) !== action.payload);
        
        // Update summary
        if (deletedJob) {
          state.summary.totalJobs--;
          if (deletedJob.status === 'active') state.summary.activeJobs--;
          else if (deletedJob.status === 'inactive') state.summary.inactiveJobs--;
          else if (deletedJob.status === 'draft') state.summary.draftJobs--;
        }
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.deleteLoading = null;
        state.error = action.error.message || 'Failed to delete job';
      })
      
      // Toggle job status
      .addCase(toggleJobStatus.fulfilled, (state, action) => {
        const { jobId, status } = action.payload;
        const jobIndex = state.jobs.findIndex(job => (job.jobId || job.id) === jobId);
        if (jobIndex !== -1) {
          const oldStatus = state.jobs[jobIndex].status;
          state.jobs[jobIndex].status = status;
          
          // Update summary
          if (oldStatus === 'active' && status === 'inactive') {
            state.summary.activeJobs--;
            state.summary.inactiveJobs++;
          } else if (oldStatus === 'inactive' && status === 'active') {
            state.summary.inactiveJobs--;
            state.summary.activeJobs++;
          }
        }
      })
      .addCase(toggleJobStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to toggle job status';
      });
  },
});

export const {
  clearJobs,
  clearError,
  setCurrentJob,
  updateJobInList,
  removeJobFromList,
} = jobsSlice.actions;

export default jobsSlice.reducer;
