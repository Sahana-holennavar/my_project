import { Router, Request, Response } from 'express';
import { cronService } from '../services/CronService';
import { reminderService } from '../services/reminderService';
import { database } from '../config/database';

const router = Router();

/**
 * GET /api/test/cron/status
 * Check if cron service is running
 */
router.get('/cron/status', async (req: Request, res: Response) => {
  try {
    const status = cronService.getStatus();
    res.json({
      success: true,
      status: status.isRunning ? 'running' : 'stopped',
      schedule: '0 0,4,8,12,16,20 * * *',
      message: status.isRunning
        ? 'Cron service is active'
        : 'Cron service is not running',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/test/cron/trigger
 * Manually trigger the cron job for immediate testing
 */
router.post('/cron/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    console.log('🧪 TEST: Manual cron trigger initiated');

    // Get unacted requests
    const unactedRequests = await reminderService.getUnactedRequestsForReminder();

    if (unactedRequests.length === 0) {
      res.json({
        success: true,
        message: 'No unacted requests found to remind',
        total_processed: 0,
        successful: 0,
        failed: 0,
        duration_ms: Date.now() - startTime,
      });
      return;
    }

    console.log(
      `🧪 TEST: Found ${unactedRequests.length} unacted requests to remind`
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each request
    for (const request of unactedRequests) {
      try {
        // Send email based on type
        if (request.request_type === 'connection_request') {
          await (await import('../services/emailService')).emailService.sendConnectionRequestReminder(
            request.recipient_email,
            request.recipient_name,
            request.sender_name,
            request.hours_elapsed
          );
        } else {
          await (await import('../services/emailService')).emailService.sendInvitationRequestReminder(
            request.recipient_email,
            request.recipient_name,
            request.sender_name,
            request.company_name || 'the Company',
            request.hours_elapsed
          );
        }

        // Mark as sent
        await reminderService.recordReminderSent(request.notification_id);

        console.log(
          `🧪 TEST: Reminder sent to ${request.recipient_email} for ${request.request_type}`
        );
        successCount++;
      } catch (error) {
        failureCount++;
        console.error(
          `🧪 TEST: Failed to send reminder to ${request.recipient_email}:`,
          error
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `🧪 TEST: Cron trigger completed. Success: ${successCount}, Failed: ${failureCount}, Duration: ${duration}ms`
    );

    res.json({
      success: true,
      message: 'Cron job executed successfully',
      total_processed: unactedRequests.length,
      successful: successCount,
      failed: failureCount,
      duration_ms: duration,
      requests_processed: unactedRequests.map((r) => ({
        notification_id: r.notification_id,
        recipient_email: r.recipient_email,
        request_type: r.request_type,
        hours_elapsed: r.hours_elapsed,
      })),
    });
  } catch (error) {
    console.error('🧪 TEST: Error during cron trigger:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/test/cron/pending
 * Get list of unacted requests that would receive reminders
 */
router.get('/cron/pending', async (req: Request, res: Response) => {
  try {
    const unactedRequests = await reminderService.getUnactedRequestsForReminder();

    res.json({
      success: true,
      count: unactedRequests.length,
      requests: unactedRequests.map((r) => ({
        notification_id: r.notification_id,
        user_id: r.user_id,
        recipient_email: r.recipient_email,
        recipient_name: r.recipient_name,
        request_type: r.request_type,
        sender_name: r.sender_name,
        company_name: r.company_name,
        created_at: r.created_at,
        hours_elapsed: Math.round(r.hours_elapsed * 100) / 100,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/test/cron/create-test-notification
 * Create a test notification for testing (25+ hours old)
 */
router.post('/cron/create-test-notification', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = database.getPool();

    const { user_id, type = 'connect_request', hours_old = 25 } = req.body;

    if (!user_id) {
      res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
      return;
    }

    const query = `
      INSERT INTO "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications (
        id, user_id, type, content, payload, read, created_at, reminder_email_sent
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        'Test notification for reminder testing',
        jsonb_build_object('from', 'test-sender-' || gen_random_uuid()::text),
        FALSE,
        NOW() - INTERVAL '${hours_old} hours',
        FALSE
      )
      RETURNING id, user_id, type, created_at, reminder_email_sent;
    `;

    const result = await pool.query(query, [user_id, type]);

    const notification = result.rows[0];

    res.json({
      success: true,
      message: `Test notification created (${hours_old} hours old)`,
      notification: {
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        created_at: notification.created_at,
        reminder_email_sent: notification.reminder_email_sent,
      },
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/test/cron/sent-reminders
 * Get list of reminders that have been sent
 */
router.get('/cron/sent-reminders', async (req: Request, res: Response) => {
  try {
    const pool = database.getPool();
    const { limit = 20, hours = 24 } = req.query;

    const query = `
      SELECT
        id,
        user_id,
        type,
        reminder_email_sent_at,
        reminder_count,
        created_at
      FROM "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications
      WHERE reminder_email_sent = TRUE
        AND reminder_email_sent_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY reminder_email_sent_at DESC
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      count: result.rows.length,
      reminders: result.rows.map((r) => ({
        notification_id: r.id,
        user_id: r.user_id,
        type: r.type,
        reminder_email_sent_at: r.reminder_email_sent_at,
        reminder_count: r.reminder_count,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/test/cron/statistics
 * Get overall cron statistics
 */
router.get('/cron/statistics', async (req: Request, res: Response) => {
  try {
    const pool = database.getPool();

    // Get unacted count
    const unactedQuery = `
      SELECT COUNT(*) as count
      FROM "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications
      WHERE type IN ('connect_request', 'page_invite')
        AND read = FALSE
        AND created_at < NOW() - INTERVAL '24 hours'
        AND reminder_email_sent = FALSE;
    `;

    // Get sent count
    const sentQuery = `
      SELECT COUNT(*) as count
      FROM "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications
      WHERE reminder_email_sent = TRUE
        AND reminder_email_sent_at > NOW() - INTERVAL '1 day';
    `;

    // Get by type
    const byTypeQuery = `
      SELECT
        type,
        COUNT(*) as total,
        SUM(CASE WHEN reminder_email_sent = TRUE THEN 1 ELSE 0 END) as reminded,
        SUM(CASE WHEN reminder_email_sent = FALSE THEN 1 ELSE 0 END) as pending
      FROM "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications
      WHERE type IN ('connect_request', 'page_invite')
        AND read = FALSE
      GROUP BY type;
    `;

    const unactedResult = await pool.query(unactedQuery);
    const sentResult = await pool.query(sentQuery);
    const byTypeResult = await pool.query(byTypeQuery);

    res.json({
      success: true,
      statistics: {
        unacted_requests_24h: parseInt(unactedResult.rows[0].count),
        reminders_sent_24h: parseInt(sentResult.rows[0].count),
        by_type: byTypeResult.rows.map((r) => ({
          type: r.type,
          total: parseInt(r.total),
          reminded: parseInt(r.reminded),
          pending: parseInt(r.pending),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/test/cron/cleanup-test-data
 * Delete all test notifications (for cleanup)
 */
router.delete('/cron/cleanup-test-data', async (req: Request, res: Response) => {
  try {
    const pool = database.getPool();

    const query = `
      DELETE FROM "${process.env.DB_SCHEMA || 'b2b_dev'}".notifications
      WHERE created_at < NOW() - INTERVAL '23 hours'
        AND (
          content LIKE '%Test%'
          OR user_id LIKE 'test-%'
        );
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      message: `Deleted ${result.rowCount} test records`,
      deleted_count: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
