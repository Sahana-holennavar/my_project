import cron, { ScheduledTask } from 'node-cron';
import { reminderService, UnactedRequest } from './reminderService';
import { emailService } from './emailService';
import { config } from '../config/env';

class CronService {
  private cronJob: ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Start the cron job for sending reminder emails
   * Runs every 4 hours at the top of the hour (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
   * Schedule: "0 0,4,8,12,16,20 * * *" - every 4 hours
   * Or for testing every minute: "* * * * *"
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⏰ CronService is already running');
      return;
    }

    try {
      // Schedule the cron job to run every 4 hours
      // Cron format: second minute hour day month dayOfWeek
      // "0 0,4,8,12,16,20 * * *" = at minute 0 of hours 0, 4, 8, 12, 16, 20 (every 4 hours)
      this.cronJob = cron.schedule('0 0,4,8,12,16,20 * * *', async () => {
        await this.executeReminder();
      });

      this.isRunning = true;
      console.log('✅ CronService started: Reminder emails will be sent every 4 hours');
      console.log('📅 Schedule: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC');
    } catch (error) {
      console.error('❌ Failed to start CronService:', error);
      throw new Error('Failed to start CronService');
    }
  }

  /**
   * Execute the reminder task
   * Fetches unacted requests older than 24 hours and sends reminder emails
   */
  private async executeReminder(): Promise<void> {
    const executionStartTime = new Date();
    console.log(`\n🔄 Starting reminder cron execution at ${executionStartTime.toISOString()}`);

    try {
      // Fetch unacted requests older than 24 hours
      const unactedRequests = await reminderService.getUnactedRequestsForReminder();

      if (unactedRequests.length === 0) {
        console.log('✓ No pending reminders to send');
        return;
      }

      console.log(`📬 Found ${unactedRequests.length} unacted requests to remind`);

      let successCount = 0;
      let failureCount = 0;

      // Process each unacted request
      for (const request of unactedRequests) {
        try {
          await this.sendReminderEmail(request);
          
          // Record the reminder sent
          await reminderService.recordReminderSent(request.notification_id);

          successCount++;
          console.log(
            `✉️  Reminder sent to ${request.recipient_email} for ${request.request_type}`
          );
        } catch (error) {
          failureCount++;
          console.error(
            `❌ Failed to send reminder to ${request.recipient_email}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // Log summary
      const executionEndTime = new Date();
      const duration = executionEndTime.getTime() - executionStartTime.getTime();
      console.log(
        `\n📊 Reminder execution completed:\n` +
        `   Total processed: ${unactedRequests.length}\n` +
        `   Successful: ${successCount}\n` +
        `   Failed: ${failureCount}\n` +
        `   Duration: ${duration}ms\n` +
        `   Completed at: ${executionEndTime.toISOString()}`
      );
    } catch (error) {
      console.error('❌ Error in reminder cron execution:', error);
    }
  }

  /**
   * Send reminder email based on request type
   */
  private async sendReminderEmail(request: UnactedRequest): Promise<void> {
    if (request.request_type === 'connection_request') {
      await emailService.sendConnectionRequestReminder(
        request.recipient_email,
        request.recipient_name,
        request.sender_name,
        request.hours_elapsed
      );
    } else if (request.request_type === 'invitation_request') {
      await emailService.sendInvitationRequestReminder(
        request.recipient_email,
        request.recipient_name,
        request.sender_name,
        request.company_name || 'the Company',
        request.hours_elapsed
      );
    }
  }

  /**
   * Stop the cron job
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('⏹️  CronService stopped');
    }
  }

  /**
   * Get the current status of the cron job
   */
  public getStatus(): { isRunning: boolean; message?: string } {
    if (!this.cronJob) {
      return { isRunning: false, message: 'CronService not initialized' };
    }

    return {
      isRunning: this.isRunning,
      message: this.isRunning 
        ? 'CronService is running - reminders will be sent every 4 hours at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC'
        : 'CronService is not running',
    };
  }

  /**
   * Manually trigger the reminder job (useful for testing)
   */
  public async triggerManual(): Promise<void> {
    console.log('🚀 Manually triggering reminder execution...');
    await this.executeReminder();
  }
}

// Export singleton instance
export const cronService = new CronService();
export default cronService;
