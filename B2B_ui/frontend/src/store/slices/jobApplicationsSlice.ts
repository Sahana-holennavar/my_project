import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { jobsApi } from '@/lib/api';
import type { JobApplication, ApplicationStatus } from '@/types/jobs';

interface JobApplicationsState {
  applications: JobApplication[];
  selectedApplication: JobApplication | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  
  // Job info
  jobInfo: {
    title: string;
    totalApplications: number;
  };
  
  // Stats
  stats: {
    appliedCount: number;
    selectedCount: number;
    rejectedCount: number;
  };
  
  // Filters
  filters: {
    searchTerm: string;
    statusFilter: string;
  };
}

const initialState: JobApplicationsState = {
  applications: [],
  selectedApplication: null,
  loading: false,
  statsLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  jobInfo: {
    title: '',
    totalApplications: 0,
  },
  stats: {
    appliedCount: 0,
    selectedCount: 0,
    rejectedCount: 0,
  },
  filters: {
    searchTerm: '',
    statusFilter: 'all',
  },
};

// Async thunks
export const fetchApplications = createAsyncThunk(
  'jobApplications/fetchApplications',
  async ({
    profileId,
    jobId,
    params = {},
  }: {
    profileId: string;
    jobId: string;
    params?: {
      page?: number;
      limit?: number;
      status?: string;
    };
  }) => {
    const response = await jobsApi.getJobApplications(profileId, jobId, params);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch applications');
    }
    return response.data;
  }
);

export const fetchApplicationStats = createAsyncThunk(
  'jobApplications/fetchApplicationStats',
  async ({
    profileId,
    jobId,
  }: {
    profileId: string;
    jobId: string;
  }) => {
    // Fetch counts for each status separately
    const [appliedRes, selectedRes, rejectedRes] = await Promise.all([
      jobsApi.getJobApplications(profileId, jobId, { page: 1, limit: 1, status: 'applied' }),
      jobsApi.getJobApplications(profileId, jobId, { page: 1, limit: 1, status: 'selected' }),
      jobsApi.getJobApplications(profileId, jobId, { page: 1, limit: 1, status: 'rejected' }),
    ]);

    return {
      appliedCount: appliedRes.success && appliedRes.data ? appliedRes.data.pagination.total : 0,
      selectedCount: selectedRes.success && selectedRes.data ? selectedRes.data.pagination.total : 0,
      rejectedCount: rejectedRes.success && rejectedRes.data ? rejectedRes.data.pagination.total : 0,
    };
  }
);

export const updateApplicationStatus = createAsyncThunk(
  'jobApplications/updateApplicationStatus',
  async ({
    profileId,
    jobId,
    applicationId,
    status,
  }: {
    profileId: string;
    jobId: string;
    applicationId: string;
    status: ApplicationStatus;
  }) => {
    const response = await jobsApi.updateApplicationStatus(profileId, jobId, applicationId, status);
    if (!response.success) {
      throw new Error(response.message || 'Failed to update application status');
    }
    return { applicationId, status };
  }
);

const jobApplicationsSlice = createSlice({
  name: 'jobApplications',
  initialState,
  reducers: {
    clearApplications: (state) => {
      state.applications = [];
      state.pagination = initialState.pagination;
      state.jobInfo = initialState.jobInfo;
      state.stats = initialState.stats;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedApplication: (state, action: PayloadAction<JobApplication | null>) => {
      state.selectedApplication = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.filters.searchTerm = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.statusFilter = action.payload;
      // Reset to page 1 when filter changes
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch applications
    builder
      .addCase(fetchApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.applications = action.payload.applications;
          state.pagination = {
            total: action.payload.pagination.total,
            page: action.payload.pagination.page,
            limit: action.payload.pagination.limit,
            totalPages: action.payload.pagination.totalPages,
          };
          state.jobInfo = {
            title: action.payload.job_info.title,
            totalApplications: action.payload.job_info.total_applications,
          };
        }
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch applications';
      })
      
      // Fetch application stats
      .addCase(fetchApplicationStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchApplicationStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchApplicationStats.rejected, (state, action) => {
        state.statsLoading = false;
        console.error('Failed to fetch application stats:', action.error.message);
      })
      
      // Update application status
      .addCase(updateApplicationStatus.fulfilled, (state, action) => {
        const { applicationId, status } = action.payload;
        const appIndex = state.applications.findIndex(app => app.id === applicationId);
        if (appIndex !== -1) {
          const oldStatus = state.applications[appIndex].status;
          state.applications[appIndex].status = status;
          state.applications[appIndex].updated_at = new Date().toISOString();
          
          // Update stats
          if (oldStatus === 'applied' && status === 'selected') {
            state.stats.appliedCount--;
            state.stats.selectedCount++;
          } else if (oldStatus === 'applied' && status === 'rejected') {
            state.stats.appliedCount--;
            state.stats.rejectedCount++;
          } else if (oldStatus === 'selected' && status === 'applied') {
            state.stats.selectedCount--;
            state.stats.appliedCount++;
          } else if (oldStatus === 'selected' && status === 'rejected') {
            state.stats.selectedCount--;
            state.stats.rejectedCount++;
          } else if (oldStatus === 'rejected' && status === 'applied') {
            state.stats.rejectedCount--;
            state.stats.appliedCount++;
          } else if (oldStatus === 'rejected' && status === 'selected') {
            state.stats.rejectedCount--;
            state.stats.selectedCount++;
          }
        }
      })
      .addCase(updateApplicationStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update application status';
      });
  },
});

export const {
  clearApplications,
  clearError,
  setSelectedApplication,
  setSearchTerm,
  setStatusFilter,
  setPage,
} = jobApplicationsSlice.actions;

export default jobApplicationsSlice.reducer;
