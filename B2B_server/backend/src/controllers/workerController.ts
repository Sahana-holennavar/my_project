import { Request, Response } from 'express';
import { getJobStatusFromQueue } from '../services/QueueMonitorHelper';
import ResponseUtil, { ErrorMessages } from '../utils/response';

/**
 * Worker Controller
 * Handles API requests related to notification worker job monitoring
 */
class WorkerController {
  /**
   * GET /api/worker/jobs/:jobId/status
   * Retrieve job status and processing details from the notification queue
   * 
   * @param req - Express request with jobId parameter
   * @param res - Express response
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    try {
      // Validate jobId parameter
      if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
        res.status(400).json({
          status: 400,
          message: 'Job ID is required and must be a valid string',
          success: false,
          error: {
            code: 'INVALID_JOB_ID',
            details: 'Job ID parameter is missing or invalid'
          }
        });
        return;
      }
      
      // Retrieve job status from queue monitor
      const jobStatus = await getJobStatusFromQueue(jobId);

      // Handle job not found
      if (!jobStatus) {
        res.status(404).json({
          status: 404,
          message: 'Job not found. Please verify the job ID is correct.',
          success: false,
          error: {
            type: 'JobNotFoundError',
            details: 'No active or recent job found with the provided ID',
            jobId
          }
        });
        return;
      }

      // Return successful response with job details
      ResponseUtil.success(
        res,
        'Job status retrieved successfully',
        jobStatus
      );
    } catch (error) {
      console.error('Error retrieving job status:', error);
      
      ResponseUtil.serverError(
        res,
        error instanceof Error ? error.message : ErrorMessages.SERVER_ERROR
      );
    }
  }
}

export const workerController = new WorkerController();

