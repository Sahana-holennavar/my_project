import { Response } from 'express';
import ResponseUtil, { ValidationError } from '../utils/response';
import { applicationsService } from '../services/applicationsService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { validateApplicationData, validateUUID, validateUpdateApplicationData } from '../utils/validators';
import { CreateApplicationData, UpdateApplicationData } from '../models/Application';

class ApplicationsController {
  async applyForJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { jobId } = req.params;
      if (!jobId) {
        ResponseUtil.validationError(res, 'Job ID is required', [
          { field: 'jobId', message: 'Job ID parameter is missing' }
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

      const resumeFile = req.file;
      if (!resumeFile) {
        ResponseUtil.validationError(res, 'Resume file is required', [
          { field: 'resume', message: 'Resume file is required' }
        ]);
        return;
      }

      const validation = validateApplicationData(req.body);
      if (validation.error) {
        const errors: ValidationError[] = validation.error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        ResponseUtil.validationError(res, 'Validation failed', errors);
        return;
      }

      const applicationData: CreateApplicationData = {
        full_name: req.body.full_name,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address
      };

      const application = await applicationsService.applyForJob(jobId, userId, applicationData, resumeFile);

      ResponseUtil.success(res, 'Application submitted successfully', application);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Job not found') {
          ResponseUtil.notFound(res, 'Job not found');
          return;
        }
        if (error.message === 'Job is not active. Applications are only accepted for active jobs.') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'job', message: error.message }
          ]);
          return;
        }
        if (error.message === 'You have already applied for this job') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'application', message: error.message }
          ]);
          return;
        }
        if (error.message === 'Resume file is required') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'resume', message: error.message }
          ]);
          return;
        }
        console.error('Apply for job error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to submit application');
    }
  }

  async getUserApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const status = req.query.status as string;
      const allowedStatuses = ['applied', 'selected', 'rejected'];
      if (status && !allowedStatuses.includes(status)) {
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

      const result = await applicationsService.getUserApplications(
        userId,
        status ? { status } : {},
        { page, limit }
      );

      const totalPages = Math.ceil(result.total / limit);

      const response = {
        applications: result.applications,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };

      const message = result.applications.length === 0 
        ? 'No applications found' 
        : 'Applications retrieved successfully';

      ResponseUtil.success(res, message, response);
    } catch (error) {
      console.error('Get user applications error:', error);
      ResponseUtil.serverError(res, 'Failed to retrieve applications');
    }
  }

  async getApplicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { applicationId } = req.params;
      if (!applicationId) {
        ResponseUtil.validationError(res, 'Application ID is required', [
          { field: 'applicationId', message: 'Application ID parameter is missing' }
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

      const application = await applicationsService.getApplicationById(applicationId, userId);

      ResponseUtil.success(res, 'Application retrieved successfully', application);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          ResponseUtil.notFound(res, 'Application not found');
          return;
        }
        if (error.message === 'Unauthorized access - You can only view your own applications') {
          ResponseUtil.forbidden(res, 'Unauthorized access - You can only view your own applications');
          return;
        }
        console.error('Get application by id error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to retrieve application');
    }
  }

  async updateApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { applicationId } = req.params;
      if (!applicationId) {
        ResponseUtil.validationError(res, 'Application ID is required', [
          { field: 'applicationId', message: 'Application ID parameter is missing' }
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

      const resumeFile = req.file;
      const updateData: UpdateApplicationData = {};

      if (req.body.phone !== undefined) {
        updateData.phone = req.body.phone;
      }

      if (req.body.email !== undefined) {
        updateData.email = req.body.email;
      }

      if (resumeFile) {
        updateData.resume = 'file_upload';
      }

      if (Object.keys(updateData).length === 0 && !resumeFile) {
        ResponseUtil.validationError(res, 'No fields to update', [
          { field: 'body', message: 'At least one field must be provided for update' }
        ]);
        return;
      }

      const validation = validateUpdateApplicationData(updateData);
      if (validation.error) {
        const errors: ValidationError[] = validation.error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        ResponseUtil.validationError(res, 'Validation failed', errors);
        return;
      }

      const application = await applicationsService.updateApplication(applicationId, userId, updateData, resumeFile);

      const resumeUrl = typeof application.resume === 'object' && application.resume?.file_url 
        ? application.resume.file_url 
        : (typeof application.resume === 'string' ? application.resume : '');

      const response = {
        id: application.id,
        job_id: application.job_id,
        user_id: application.user_id,
        resume: resumeUrl,
        phone: application.phone,
        email: application.email,
        status: application.status,
        created_at: application.created_at,
        updated_at: application.updated_at
      };

      ResponseUtil.success(res, 'Application updated successfully', response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          ResponseUtil.notFound(res, 'Application not found');
          return;
        }
        if (error.message === 'Unauthorized access - You can only update your own applications') {
          ResponseUtil.forbidden(res, 'Unauthorized access - You can only update your own applications');
          return;
        }
        if (error.message === 'Cannot edit application after it has been reviewed') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'status', message: error.message }
          ]);
          return;
        }
        if (error.message === 'No fields to update') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'body', message: error.message }
          ]);
          return;
        }
        console.error('Update application error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to update application');
    }
  }

  async revokeApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const { applicationId } = req.params;
      if (!applicationId) {
        ResponseUtil.validationError(res, 'Application ID is required', [
          { field: 'applicationId', message: 'Application ID parameter is missing' }
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

      const result = await applicationsService.revokeApplication(applicationId, userId);

      ResponseUtil.success(res, 'Application revoked successfully', result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          ResponseUtil.notFound(res, 'Application not found');
          return;
        }
        if (error.message === 'Unauthorized access - You can only revoke your own applications') {
          ResponseUtil.forbidden(res, 'Unauthorized access - You can only revoke your own applications');
          return;
        }
        if (error.message.includes('Cannot revoke application after it has been reviewed')) {
          ResponseUtil.validationError(res, error.message, [
            { field: 'status', message: error.message }
          ]);
          return;
        }
        console.error('Revoke application error:', error);
      }
      ResponseUtil.serverError(res, 'Failed to revoke application');
    }
  }
}

export const applicationsController = new ApplicationsController();

