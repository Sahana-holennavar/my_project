import { Response } from 'express';
import ResponseUtil, { ValidationError } from '../utils/response';
import { jobsService } from '../services/jobsService';
import { applicationsService } from '../services/applicationsService';
import { auditLoggerService } from '../services/auditLoggerService';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { validateCreateJob, validateUpdateJob, validateUUID, validateApplicationStatusUpdate  } from '../utils/validators';
import { CreateJobData, UpdateJobData, JobResponse, SearchJobCriteria, SearchJobsResponse, PaginationMetadata } from '../models/Job';
import { GetApplicationsResponse } from '../models/Application';

class JobsController {
  async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || 'unknown';
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }
      const validation = validateCreateJob(req.body);
      if (validation.error) {
        const errors: ValidationError[] = validation.error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        ResponseUtil.validationError(res, 'Validation failed', errors);
        return;
      }
      const jobData: CreateJobData = {
        title: req.body.title,
        job_description: req.body.job_description,
        employment_type: req.body.employment_type,
        skills: req.body.skills || [],
        status: req.body.status || 'active',
        job_mode: req.body.job_mode,
        location: req.body.location,
        experience_level: req.body.experience_level
      };
      const job = await jobsService.createJob(jobData, profileId, userId);
      const response: JobResponse = {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: job.skills,
        created_at: job.created_at.toISOString(),
        updated_at: job.updated_at.toISOString(),
        status: job.status,
        job_mode: job.job_mode,
        location: job.location,
        experience_level: job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      };
      // Audit log: job created
      try {
        const userProfile = await userService.getUserProfileInfo(userId);
        const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userId;
        await auditLoggerService.createAuditLog({
          event: 'JOB_CREATED',
          user_id: userId,
          action: `User ${userName} (${userRole}) created job ${job.id}`,
          ip_address: req.ip ?? null
        });
      } catch (auditError) {
        console.error('Audit log (create job) failed:', auditError);
      }
      ResponseUtil.success(res, 'Job created successfully', response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Business profile not found') {
          ResponseUtil.notFound(res, 'Business profile not found');
          return;
        }
        if (error.message.includes('Exact job posting already exists')) {
          ResponseUtil.validationError(res, 'Job posting already exists', [
            { field: 'job', message: 'An identical job posting with same title, location, experience level, employment type, and job mode already exists' }
          ]);
          return;
        }
        console.error('Create job error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to create job');
    }
  }


  async getAllJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }
      // Pagination params
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const { jobs, total } = await jobsService.getAllJobs(profileId, page, limit);
      const response: JobResponse[] = jobs.map(job => ({
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: job.skills,
        created_at: job.created_at.toISOString(),
        updated_at: job.updated_at.toISOString(),
        status: job.status,
        job_mode: job.job_mode,
        location: job.location,
        experience_level: job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      }));
      ResponseUtil.success(res, 'Jobs retrieved successfully', {
        jobs: response,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Get all jobs error:', error);
      ResponseUtil.serverError(res, 'Failed to retrieve jobs');
    }
  }

  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const { profileId, jobId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }
      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }
      const job = await jobsService.getJobById(jobId, profileId);
      if (!job) {
        ResponseUtil.notFound(res, 'Job not found');
        return;
      }
      const response: JobResponse = {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: job.skills,
        created_at: job.created_at.toISOString(),
        updated_at: job.updated_at.toISOString(),
        status: job.status,
        job_mode: job.job_mode,
        location: job.location,
        experience_level: job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id,
        ...(job.company_name && { company_name: job.company_name })
      };
      ResponseUtil.success(res, 'Job retrieved successfully', response);
    } catch (error) {
      console.error('Get job by ID error:', error);
      ResponseUtil.serverError(res, 'Failed to retrieve job');
    }
  }

  async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || 'unknown';
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const { profileId, jobId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }
      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }
      const validation = validateUpdateJob(req.body);
      if (validation.error) {
        const errors: ValidationError[] = validation.error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        ResponseUtil.validationError(res, 'Validation failed', errors);
        return;
      }
      const updateData: UpdateJobData = {
        title: req.body.title,
        job_description: req.body.job_description,
        employment_type: req.body.employment_type,
        skills: req.body.skills,
        status: req.body.status,
        job_mode: req.body.job_mode,
        location: req.body.location,
        experience_level: req.body.experience_level
      };
      const job = await jobsService.updateJob(jobId, profileId, updateData);
      const response: JobResponse = {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: job.skills,
        created_at: job.created_at.toISOString(),
        updated_at: job.updated_at.toISOString(),
        status: job.status,
        job_mode: job.job_mode,
        location: job.location,
        experience_level: job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      };
      // Audit log: job updated
      try {
        const userProfile = await userService.getUserProfileInfo(userId);
        const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userId;
        await auditLoggerService.createAuditLog({
          event: 'JOB_UPDATED',
          user_id: userId,
          action: `User ${userName} (${userRole}) updated job ${job.id}`,
          ip_address: req.ip ?? null
        });
      } catch (auditError) {
        console.error('Audit log (update job) failed:', auditError);
      }
      ResponseUtil.success(res, 'Job updated successfully', response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Job not found') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        if (error.message.includes('Exact job posting already exists')) {
          ResponseUtil.validationError(res, 'Job posting already exists', [
            { field: 'job', message: 'An identical job posting with same title, location, experience level, employment type, and job mode already exists' }
          ]);
          return;
        }
        if (error.message === 'No fields to update') {
          ResponseUtil.validationError(res, 'No fields to update', [
            { field: 'body', message: 'At least one field must be provided for update' }
          ]);
          return;
        }
        console.error('Update job error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to update job');
    }
  }

  async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || 'unknown';
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      const { profileId, jobId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }
      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }
      await jobsService.deleteJob(jobId, profileId);
      // Audit log: job deleted
      try {
        const userProfile = await userService.getUserProfileInfo(userId);
        const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userId;
        await auditLoggerService.createAuditLog({
          event: 'JOB_DELETED',
          user_id: userId,
          action: `User ${userName} (${userRole}) deleted job ${jobId}`,
          ip_address: req.ip ?? null
        });
      } catch (auditError) {
        console.error('Audit log (delete job) failed:', auditError);
      }
      ResponseUtil.success(res, 'Job deleted successfully', null);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Job not found') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        console.error('Delete job error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to delete job');
    }
  }

  async searchJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Extract and validate search parameters
      const title = req.query.title ? (req.query.title as string).trim() : undefined;
      const job_mode = req.query.job_mode ? (req.query.job_mode as string).trim() : undefined;
      const location = req.query.location ? (req.query.location as string).trim() : undefined;
      const employment_type = req.query.employment_type ? (req.query.employment_type as string).trim() : undefined;
      const skills = req.query.skills ? (req.query.skills as string).trim() : undefined;

      // Parse experience levels
      const experience_min = req.query.experience_min ? parseInt(req.query.experience_min as string, 10) : undefined;
      const experience_max = req.query.experience_max ? parseInt(req.query.experience_max as string, 10) : undefined;

      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      // Validate job_mode enum values
      if (job_mode && !['onsite', 'remote', 'hybrid'].includes(job_mode)) {
        ResponseUtil.validationError(res, 'Invalid job_mode value', [
          { field: 'job_mode', message: 'Invalid job_mode value. Must be: onsite, remote, or hybrid' }
        ]);
        return;
      }

      // Validate employment_type enum values
      if (employment_type && !['full_time', 'part_time'].includes(employment_type)) {
        ResponseUtil.validationError(res, 'Invalid employment_type value', [
          { field: 'employment_type', message: 'Invalid employment_type value. Must be: full_time or part_time' }
        ]);
        return;
      }

      // Validate experience ranges
      if (experience_min !== undefined && isNaN(experience_min)) {
        ResponseUtil.validationError(res, 'Invalid experience_min value', [
          { field: 'experience_min', message: 'experience_min must be a valid number' }
        ]);
        return;
      }

      if (experience_max !== undefined && isNaN(experience_max)) {
        ResponseUtil.validationError(res, 'Invalid experience_max value', [
          { field: 'experience_max', message: 'experience_max must be a valid number' }
        ]);
        return;
      }

      if (experience_min !== undefined && experience_max !== undefined && experience_min > experience_max) {
        ResponseUtil.validationError(res, 'Invalid experience range', [
          { field: 'experience_range', message: 'experience_min cannot be greater than experience_max' }
        ]);
        return;
      }

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        ResponseUtil.validationError(res, 'Invalid page number', [
          { field: 'page', message: 'page must be a positive number' }
        ]);
        return;
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        ResponseUtil.validationError(res, 'Invalid limit value', [
          { field: 'limit', message: 'limit must be between 1 and 100' }
        ]);
        return;
      }

      // Build search criteria - only include defined values
      const searchCriteria: SearchJobCriteria = {
        ...(title && { title }),
        ...(job_mode && { job_mode: job_mode as any }),
        ...(location && { location }),
        ...(employment_type && { employment_type: employment_type as any }),
        ...(experience_min !== undefined && { experience_min }),
        ...(experience_max !== undefined && { experience_max }),
        ...(skills && { skills }),
        page,
        limit
      };

      // Call search service
      const searchResult = await jobsService.searchJobs(searchCriteria);

      // Transform results to JobResponse format
      const jobResponses: JobResponse[] = searchResult.jobs.map(job => ({
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: job.skills,
        created_at: job.created_at.toISOString(),
        updated_at: job.updated_at.toISOString(),
        status: job.status,
        job_mode: job.job_mode,
        location: job.location,
        experience_level: job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      }));

      // Build pagination metadata
      const totalPages = Math.ceil(searchResult.total / searchResult.limit);
      const pagination: PaginationMetadata = {
        total: searchResult.total,
        page: searchResult.page,
        limit: searchResult.limit,
        totalPages,
        hasNext: searchResult.page < totalPages,
        hasPrevious: searchResult.page > 1
      };

      // Build filters_applied object
      const filters_applied: Partial<SearchJobCriteria> = {};
      if (title) filters_applied.title = title;
      if (job_mode) filters_applied.job_mode = job_mode as any;
      if (location) filters_applied.location = location;
      if (employment_type) filters_applied.employment_type = employment_type as any;
      if (experience_min !== undefined) filters_applied.experience_min = experience_min;
      if (experience_max !== undefined) filters_applied.experience_max = experience_max;
      if (skills) filters_applied.skills = skills;

      // Build response
      const response: SearchJobsResponse = {
        jobs: jobResponses,
        pagination,
        filters_applied
      };

      // Return success response
      const message = searchResult.total === 0 ? 'No jobs found matching your criteria' : 'Search completed successfully';
      ResponseUtil.success(res, message, response);
    } catch (error) {
      console.error('Search jobs error:', error);
      ResponseUtil.serverError(res, 'Failed to search jobs');
    }
  }

   async reviewApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || 'unknown';
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { profileId, jobId, applicationId } = req.params;
      
      // Validate required parameters
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }
      
      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }
      
      if (!applicationId) {
        ResponseUtil.validationError(res, 'Application ID is required', [
          { field: 'applicationId', message: 'Application ID parameter is missing' }
        ]);
        return;
      }

      // Validate UUID formats
      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }

      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }

      const applicationIdValidation = validateUUID(applicationId, 'Application ID');
      if (applicationIdValidation.error) {
        const errorMessage = applicationIdValidation.error.details?.[0]?.message || 'Invalid application ID format';
        ResponseUtil.validationError(res, 'Invalid application ID format', [
          { field: 'applicationId', message: errorMessage }
        ]);
        return;
      }

      // Validate request body
      const validation = validateApplicationStatusUpdate(req.body);
      if (validation.error) {
        const errors: ValidationError[] = validation.error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        ResponseUtil.validationError(res, 'Validation failed', errors);
        return;
      }
      
      const { status } = req.body;
      
      const application = await jobsService.reviewApplication(
        applicationId,
        jobId,
        profileId,
        status,
        userId
      );

      const statusMessage = status === 'selected' ? 'selected' : 'rejected';
      
      // Audit log: application reviewed
      try {
        const userProfile = await userService.getUserProfileInfo(userId);
        const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userId;
        await auditLoggerService.createAuditLog({
          event: 'APPLICATION_REVIEWED',
          user_id: userId,
          action: `User ${userName} (${userRole}) ${statusMessage} application ${applicationId} for job ${jobId}`,
          ip_address: req.ip ?? null
        });
      } catch (auditError) {
        console.error('Audit log (review application) failed:', auditError);
      }

      ResponseUtil.success(res, `Application ${statusMessage} successfully`, application);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Job not found') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        if (error.message === 'Application not found') {
          ResponseUtil.notFound(res, 'Application not found');
          return;
        }
        if (error.message === 'Job does not belong to this business profile') {
          ResponseUtil.forbidden(res, 'Unauthorized access');
          return;
        }
        if (error.message === 'Application does not belong to this job') {
          ResponseUtil.forbidden(res, 'Unauthorized access');
          return;
        }
        if (error.message === 'Application is already selected') {
          ResponseUtil.validationError(res, 'Application is already selected', [
            { field: 'status', message: 'Cannot select an application that is already selected' }
          ]);
          return;
        }
        if (error.message === 'Application is already rejected') {
          ResponseUtil.validationError(res, 'Application is already rejected', [
            { field: 'status', message: 'Cannot reject an application that is already rejected' }
          ]);
          return;
        }
        console.error('Review application error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to review application');
    }
  }
  async getJobApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { profileId, jobId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }

      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }

      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }

      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }

      const status = req.query.status as string || 'applied';
      const allowedStatuses = ['applied', 'selected', 'rejected'];
      if (!allowedStatuses.includes(status)) {
        ResponseUtil.validationError(res, 'Invalid status filter', [
          { field: 'status', message: `Status must be one of: ${allowedStatuses.join(', ')}` }
        ]);
        return;
      }

      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);

      if (page < 1) {
        ResponseUtil.validationError(res, 'Invalid page number', [
          { field: 'page', message: 'Page must be greater than 0' }
        ]);
        return;
      }

      if (limit < 1 || limit > 100) {
        ResponseUtil.validationError(res, 'Invalid limit', [
          { field: 'limit', message: 'Limit must be between 1 and 100' }
        ]);
        return;
      }

      const result = await applicationsService.getJobApplications(
        jobId,
        profileId,
        { status },
        { page, limit }
      );

      const applications = applicationsService.getApplicationsWithUserDetails(result.applications);

      const totalPages = Math.ceil(result.total / limit);

      const response: GetApplicationsResponse = {
        applications,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        },
        filters_applied: {
          status,
          job_id: jobId
        },
        job_info: result.jobInfo
      };

      const message = applications.length === 0 
        ? 'No applications found for this job' 
        : 'Applications retrieved successfully';

      ResponseUtil.success(res, message, response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Job not found or does not belong to this business profile') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        console.error('Get job applications error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to retrieve job applications');
    }
  }

  async getApplicationResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { profileId, jobId, applicationId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile ID is required', [
          { field: 'profileId', message: 'Profile ID parameter is missing' }
        ]);
        return;
      }

      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
        ]);
        return;
      }

      if (!applicationId) {
        ResponseUtil.validationError(res, 'Application ID is required', [
          { field: 'applicationId', message: 'Application ID parameter is missing' }
        ]);
        return;
      }

      const profileIdValidation = validateUUID(profileId, 'Profile ID');
      if (profileIdValidation.error) {
        const errorMessage = profileIdValidation.error.details?.[0]?.message || 'Invalid profile ID format';
        ResponseUtil.validationError(res, 'Invalid profile ID format', [
          { field: 'profileId', message: errorMessage }
        ]);
        return;
      }

      const jobIdValidation = validateUUID(jobId, 'Job ID');
      if (jobIdValidation.error) {
        const errorMessage = jobIdValidation.error.details?.[0]?.message || 'Invalid job ID format';
        ResponseUtil.validationError(res, 'Invalid job ID format', [
          { field: 'jobId', message: errorMessage }
        ]);
        return;
      }

      const applicationIdValidation = validateUUID(applicationId, 'Application ID');
      if (applicationIdValidation.error) {
        const errorMessage = applicationIdValidation.error.details?.[0]?.message || 'Invalid application ID format';
        ResponseUtil.validationError(res, 'Invalid application ID format', [
          { field: 'applicationId', message: errorMessage }
        ]);
        return;
      }

      const resumeData = await applicationsService.getApplicationResume(applicationId, jobId, profileId);

      ResponseUtil.success(res, 'Resume retrieved successfully', resumeData);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          ResponseUtil.notFound(res, 'Application not found');
          return;
        }
        if (error.message === 'Job not found or does not belong to this business profile') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        if (error.message === 'Application does not belong to this job') {
          ResponseUtil.forbidden(res, 'Application does not belong to this job');
          return;
        }
        if (error.message === 'Resume not found') {
          ResponseUtil.notFound(res, 'Resume not found for this application');
          return;
        }
        console.error('Get application resume error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to retrieve resume');
    }
  }
}

export const jobsController = new JobsController();
export default jobsController;

