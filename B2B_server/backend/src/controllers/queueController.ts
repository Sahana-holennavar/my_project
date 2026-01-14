import type { Request, Response } from 'express';
import notificationQueue from '../services/NotificationQueue';
import QueueMonitor from '../services/QueueMonitor';
import { setupBullBoard } from '../config/queue-dashboard';
import ResponseUtil from '../utils/response';
import { NotificationJobData } from '../types/notification.types';

const monitor = new QueueMonitor(notificationQueue);

export async function getQueueDashboard(req: Request, res: Response) {
  try {
    // Fetch jobs from BullMQ (waiting, active, completed, failed, delayed)
    const jobs = await notificationQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, 50);
    // Get state for each job (async)
    const jobList = await Promise.all(jobs.map(async job => {
      let status = 'unknown';
      try {
        status = await job.getState();
      } catch (e) {}
      return {
        id: job.id,
        name: job.name,
        status: job.finishedOn ? 'completed' : (job.failedReason ? 'failed' : status),
        data: job.data,
        createdAt: job.timestamp,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason || null
      };
    }));

    res.status(200).json({
      status: 200,
      message: 'Queue dashboard loaded successfully',
      success: true,
      data: {
        dashboard_url: '/api/queue/admin/queues',
        total_queues: 1,
        active_connections: 1,
        server_status: 'healthy',
        last_updated: new Date().toISOString(),
        jobs: jobList
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: 'Failed to load queue dashboard',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getJobStatusById(req: Request, res: Response) {
  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({
      status: 400,
      message: 'Job ID is required',
      success: false,
    });
  }
  const status = await monitor.getJobStatus(jobId);
  if (!status) {
    return res.status(404).json({
      status: 404,
      message: 'Job not found. Please check the job ID.',
      success: false,
      error: {
        type: 'JobNotFoundError',
        details: 'No job exists with the provided job ID',
        job_id: jobId,
        suggested_action: 'Verify the job ID is correct and the job hasn\'t been cleaned up',
      },
    });
  }
  return res.status(200).json({
    status: 200,
    message: 'Job status retrieved successfully',
    success: true,
    data: status,
  });
}

export async function enqueueNotification(req: Request, res: Response) {
  try {
    const { userId, content, type, senderId, recipientId, priority = 'normal' } = req.body;

    // Validate required fields
    if (!userId || !content || !type) {
      return ResponseUtil.validationError(res, 'Missing required fields: userId, content, and type are required', [
        { field: 'userId', message: 'userId is required' },
        { field: 'content', message: 'content is required' },
        { field: 'type', message: 'type is required' }
      ]);
    }

    // Prepare job data
    const jobData: NotificationJobData = {
      userId,
      content,
      type,
      senderId: senderId || userId,
      recipientId: recipientId || userId,
    };

    // Enqueue the notification job
    const jobId = await notificationQueue.enqueue(jobData, priority, 0, false);

    return ResponseUtil.success(res, 'Notification job enqueued successfully', {
      jobId,
      userId,
      type,
      priority,
      status: 'queued',
      enqueuedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error enqueueing notification:', error);
    return ResponseUtil.serverError(res, error instanceof Error ? error.message : 'Failed to enqueue notification');
  }
}
