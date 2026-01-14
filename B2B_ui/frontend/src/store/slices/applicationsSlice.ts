import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { applicationsApi } from '@/lib/api';
import type { JobApplication, CreateJobApplicationData, MyApplication, ApplicationDetails, UpdateApplicationData, ApplicationStatusType } from '@/types/jobs';

function normalizeStatus(status: string): ApplicationStatusType {
  if (status === 'applied' || status === 'pending') return 'applied';
  if (status === 'selected') return 'selected';
  if (status === 'rejected') return 'rejected';
  return 'applied';
}

interface ApplicationsState {
  myApplications: MyApplication[];
  currentApplication: JobApplication | null;
  selectedApplication: ApplicationDetails | null;
  loading: boolean;
  applying: boolean;
  updating: boolean;
  error: string | null;
  filters: {
    status: ApplicationStatusType | 'all';
    search: string;
    sort: 'newest' | 'oldest' | 'company';
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

const initialState: ApplicationsState = {
  myApplications: [],
  currentApplication: null,
  selectedApplication: null,
  loading: false,
  applying: false,
  updating: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
    sort: 'newest',
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  },
};

export const applyForJob = createAsyncThunk(
  'applications/applyForJob',
  async ({ jobId, applicationData }: { jobId: string; applicationData: CreateJobApplicationData }, { rejectWithValue }) => {
    try {
      const response = await applicationsApi.applyForJob(jobId, applicationData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to apply for job');
      }
      return response.data.application;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to apply for job');
    }
  }
);

export const fetchMyApplications = createAsyncThunk(
  'applications/fetchMyApplications',
  async (params: { page?: number; limit?: number; status?: string; search?: string; sort?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await applicationsApi.fetchMyApplications(params);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to fetch applications');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch applications');
    }
  }
);

export const fetchApplicationById = createAsyncThunk(
  'applications/fetchApplicationById',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      const response = await applicationsApi.fetchApplicationById(applicationId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to fetch application details');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch application details');
    }
  }
);

export const updateMyApplication = createAsyncThunk<ApplicationDetails, { applicationId: string; updateData: UpdateApplicationData }>(
  'applications/updateMyApplication',
  async ({ applicationId, updateData }, { rejectWithValue }) => {
    try {
      const response = await applicationsApi.updateApplication(applicationId, updateData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to update application');
      }
      return response.data as ApplicationDetails;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update application');
    }
  }
);

export const withdrawApplication = createAsyncThunk<{ applicationId: string; deleted: boolean; application_id: string; job_id: string; job_title: string }, string>(
  'applications/withdrawApplication',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      const response = await applicationsApi.withdrawApplication(applicationId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.message || 'Failed to withdraw application');
      }
      return { applicationId, ...response.data };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to withdraw application');
    }
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearApplications: (state) => {
      state.myApplications = [];
      state.pagination = initialState.pagination;
    },
    clearSelectedApplication: (state) => {
      state.selectedApplication = null;
    },
    removeApplicationFromList: (state, action: PayloadAction<string>) => {
      const applicationId = action.payload;
      state.myApplications = state.myApplications.filter(app => app.applicationId !== applicationId);
      if (state.pagination.total > 0) {
        state.pagination.total -= 1;
      }
      if (state.selectedApplication?.applicationId === applicationId) {
        state.selectedApplication = null;
      }
      if (state.currentApplication?.id === applicationId) {
        state.currentApplication = null;
      }
    },
    restoreApplication: (state, action: PayloadAction<MyApplication>) => {
      const application = action.payload;
      const exists = state.myApplications.find(app => app.applicationId === application.applicationId);
      if (!exists) {
        state.myApplications.unshift(application);
        state.pagination.total += 1;
      }
    },
    setStatusFilter: (state, action: PayloadAction<ApplicationStatusType | 'all'>) => {
      state.filters.status = action.payload;
    },
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
    },
    setSortFilter: (state, action: PayloadAction<'newest' | 'oldest' | 'company'>) => {
      state.filters.sort = action.payload;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(applyForJob.pending, (state) => {
        state.applying = true;
        state.error = null;
      })
      .addCase(applyForJob.fulfilled, (state, action) => {
        state.applying = false;
        state.currentApplication = action.payload;
        if (action.payload) {
          const existingIndex = state.myApplications.findIndex(
            (app) => app.job_id === action.payload.job_id
          );
          if (existingIndex === -1) {
            state.myApplications.unshift({
              ...action.payload,
              jobId: action.payload.job_id,
              appliedAt: action.payload.created_at,
              resume: action.payload.resume_url,
              job: {
                id: action.payload.job_id,
                title: '',
              },
            } as MyApplication);
          }
        }
      })
      .addCase(applyForJob.rejected, (state, action) => {
        state.applying = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMyApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.loading = false;
        const applications = (action.payload.applications || []).map((app: JobApplication | MyApplication | { id?: string; job_id?: string; jobId?: string; created_at?: string; appliedAt?: string; updated_at?: string; updatedAt?: string; resume?: string; resume_url?: string; status?: string; job?: { id?: string; title?: string; companyName?: string; company_name?: string; profileId?: string; profile_id?: string } }) => {
          // Check if it's already a MyApplication with applicationId
          const myApp = app as MyApplication;
          const jobApp = app as JobApplication;
          const rawApp = app as { id?: string; job_id?: string; jobId?: string; created_at?: string; appliedAt?: string; updated_at?: string; updatedAt?: string; resume?: string; resume_url?: string; status?: string; job?: { id?: string; title?: string; companyName?: string; company_name?: string; profileId?: string; profile_id?: string } };
          
          const jobId = myApp.jobId || rawApp.jobId || jobApp.job_id || rawApp.job_id || '';
          const jobTitle = myApp.job?.title || rawApp.job?.title || '';
          const jobCompanyName = myApp.job?.companyName || rawApp.job?.company_name;
          const jobProfileId = myApp.job?.profileId || rawApp.job?.profile_id;
          
          const normalizedApp: MyApplication = {
            ...app,
            applicationId: myApp.applicationId || rawApp.id || jobApp.id || '',
            jobId: jobId,
            appliedAt: myApp.appliedAt || rawApp.appliedAt || jobApp.created_at || rawApp.created_at || '',
            resume: myApp.resume || rawApp.resume || jobApp.resume_url || rawApp.resume_url || '',
            status: normalizeStatus(app.status || 'applied') as ApplicationStatusType,
            job: myApp.job || {
              id: jobId,
              title: jobTitle,
              companyName: jobCompanyName,
              profileId: jobProfileId,
            },
          } as MyApplication;
          return normalizedApp;
        }) as MyApplication[];
        state.myApplications = applications;
        state.pagination = {
          total: action.payload.pagination?.total || 0,
          page: action.payload.pagination?.page || 1,
          limit: action.payload.pagination?.limit || 20,
          hasMore: action.payload.pagination?.hasNext || false,
        };
      })
      .addCase(fetchMyApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchApplicationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as ApplicationDetails & { id?: string; job_id?: string; created_at?: string; updated_at?: string; job?: { id?: string; job_id?: string; company_name?: string } };
        state.selectedApplication = {
          ...action.payload,
          applicationId: payload.applicationId || payload.id || '',
          jobId: payload.jobId || payload.job_id || '',
          appliedAt: payload.appliedAt || payload.created_at || '',
          updatedAt: payload.updatedAt || payload.updated_at || '',
          job: payload.job ? {
            ...payload.job,
            id: payload.job.id || payload.job.job_id || '',
            companyName: payload.job.companyName || payload.job.company_name || '',
          } : payload.job,
          status: normalizeStatus(payload.status || 'applied') as ApplicationStatusType,
        };
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMyApplication.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateMyApplication.fulfilled, (state, action) => {
        state.updating = false;
        const basePayload = action.payload as JobApplication;
        const extendedPayload = action.payload as unknown as ApplicationDetails;
        const appId = basePayload.id || '';
        const appDetails: ApplicationDetails = {
          ...basePayload,
          applicationId: appId,
          jobId: basePayload.job_id,
          appliedAt: basePayload.created_at,
          updatedAt: basePayload.updated_at,
          resume: basePayload.resume_url,
          job: extendedPayload.job || {
            id: basePayload.job_id,
            title: '',
          },
        };
        state.selectedApplication = appDetails;
        if (appId) {
          const index = state.myApplications.findIndex(app => app.applicationId === appId || app.id === appId);
          if (index !== -1) {
            const currentApp = state.myApplications[index];
            const updatedApp: MyApplication = {
              ...currentApp,
              ...basePayload,
              applicationId: appId,
              id: appId,
              jobId: basePayload.job_id || currentApp.jobId,
              appliedAt: basePayload.created_at || currentApp.appliedAt,
              resume: basePayload.resume_url || currentApp.resume,
              job: appDetails.job || currentApp.job,
            };
            state.myApplications[index] = updatedApp;
          }
        }
      })
      .addCase(updateMyApplication.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addCase(withdrawApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawApplication.fulfilled, (state, action) => {
        state.loading = false;
        const applicationId = (action.payload as { applicationId: string }).applicationId;
        state.myApplications = state.myApplications.filter(app => app.applicationId !== applicationId);
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
        }
        if (state.selectedApplication?.applicationId === applicationId) {
          state.selectedApplication = null;
        }
        if (state.currentApplication?.id === applicationId) {
          state.currentApplication = null;
        }
      })
      .addCase(withdrawApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearApplications, clearSelectedApplication, removeApplicationFromList, restoreApplication, setStatusFilter, setSearchFilter, setSortFilter, clearFilters } = applicationsSlice.actions;
export default applicationsSlice.reducer;
