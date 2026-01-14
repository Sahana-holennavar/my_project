import { database } from '../config/database';
import { config } from '../config/env';
import { Pool, QueryResult } from 'pg';

export interface UnactedRequest {
  notification_id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string;
  request_type: 'connection_request' | 'invitation_request';
  sender_name: string;
  company_name?: string;
  created_at: Date;
  hours_elapsed: number;
}

class ReminderService {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  /**
   * Fetch all unacted connection and invitation requests older than 24 hours
   * that haven't had a reminder email sent yet
   */
  async getUnactedRequestsForReminder(): Promise<UnactedRequest[]> {
    try {
      const query = `
        SELECT 
          n.id as notification_id,
          n.user_id,
          u.email as recipient_email,
          COALESCE(
            CONCAT(
              up.profile_data->'personal_information'->>'first_name',
              ' ',
              up.profile_data->'personal_information'->>'last_name'
            ),
            u.email
          ) as recipient_name,
          CASE n.type 
            WHEN 'connect_request' THEN 'connection_request'
            WHEN 'page_invite' THEN 'invitation_request'
          END as request_type,
          COALESCE(
            CONCAT(
              sender_up.profile_data->'personal_information'->>'first_name',
              ' ',
              sender_up.profile_data->'personal_information'->>'last_name'
            ),
            sender_u.email,
            'Someone'
          ) as sender_name,
          cp.company_profile_data->>'companyName' as company_name,
          n.created_at,
          EXTRACT(EPOCH FROM (NOW() - n.created_at)) / 3600 as hours_elapsed
        FROM "${config.DB_SCHEMA}".notifications n
        LEFT JOIN "${config.DB_SCHEMA}".users u ON u.id::text = n.user_id::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id::text = n.user_id::text
        LEFT JOIN "${config.DB_SCHEMA}".users sender_u ON sender_u.id::text = (n.payload->>'from')::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles sender_up ON sender_up.user_id::text = (n.payload->>'from')::text
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON cp.id::text = (n.payload->>'company_id')::text
        WHERE 
          n.type IN ('connect_request', 'page_invite')
          AND n.read = FALSE
          AND n.created_at < NOW() - INTERVAL '24 hours'
          AND n.reminder_email_sent = FALSE
        ORDER BY n.created_at ASC
        LIMIT 100
      `;

      const result: QueryResult<any> = await this.pool.query(query);
      return result.rows as UnactedRequest[];
    } catch (error) {
      console.error('Error fetching unacted requests for reminder:', error);
      throw new Error('Failed to fetch unacted requests for reminder');
    }
  }

  /**
   * Mark that a reminder email has been sent for a notification
   */
  async recordReminderSent(notificationId: string): Promise<void> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".notifications
        SET 
          reminder_email_sent = TRUE,
          reminder_email_sent_at = CURRENT_TIMESTAMP,
          reminder_count = reminder_count + 1
        WHERE id = $1
      `;

      await this.pool.query(query, [notificationId]);
    } catch (error) {
      console.error('Error recording reminder sent:', error);
      throw new Error('Failed to record reminder sent');
    }
  }

  /**
   * Get notification preference for a user
   */
  async getUserNotificationPreference(
    userId: string,
    type: string
  ): Promise<{ email: boolean; in_app: boolean; enabled: boolean } | null> {
    try {
      const query = `
        SELECT email, in_app, enabled
        FROM "${config.DB_SCHEMA}".notification_preferences
        WHERE user_id = $1 AND type = $2
      `;

      const result: QueryResult<any> = await this.pool.query(query, [userId, type]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching notification preference:', error);
      throw new Error('Failed to fetch notification preference');
    }
  }

  /**
   * Check if a reminder has already been sent for a notification
   */
  async hasReminderBeenSent(notificationId: string): Promise<boolean> {
    try {
      const query = `
        SELECT reminder_email_sent
        FROM "${config.DB_SCHEMA}".notifications
        WHERE id = $1
      `;

      const result: QueryResult<{ reminder_email_sent: boolean }> = await this.pool.query(query, [
        notificationId,
      ]);

      return result.rows[0]?.reminder_email_sent || false;
    } catch (error) {
      console.error('Error checking reminder status:', error);
      throw new Error('Failed to check reminder status');
    }
  }

  /**
   * Get all pending reminders (sent but not yet actioned)
   */
  async getPendingReminders(): Promise<UnactedRequest[]> {
    try {
      const query = `
        SELECT 
          n.id as notification_id,
          n.user_id,
          u.email as recipient_email,
          COALESCE(
            CONCAT(
              up.profile_data->'personal_information'->>'first_name',
              ' ',
              up.profile_data->'personal_information'->>'last_name'
            ),
            u.email
          ) as recipient_name,
          CASE n.type 
            WHEN 'connect_request' THEN 'connection_request'
            WHEN 'page_invite' THEN 'invitation_request'
          END as request_type,
          COALESCE(
            CONCAT(
              sender_up.profile_data->'personal_information'->>'first_name',
              ' ',
              sender_up.profile_data->'personal_information'->>'last_name'
            ),
            sender_u.email,
            'Someone'
          ) as sender_name,
          cp.company_profile_data->>'companyName' as company_name,
          n.created_at,
          EXTRACT(EPOCH FROM (NOW() - n.created_at)) / 3600 as hours_elapsed
        FROM "${config.DB_SCHEMA}".notifications n
        LEFT JOIN "${config.DB_SCHEMA}".users u ON u.id::text = n.user_id::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id::text = n.user_id::text
        LEFT JOIN "${config.DB_SCHEMA}".users sender_u ON sender_u.id::text = (n.payload->>'from')::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles sender_up ON sender_up.user_id::text = (n.payload->>'from')::text
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON cp.id::text = (n.payload->>'company_id')::text
        WHERE 
          n.type IN ('connect_request', 'page_invite')
          AND n.read = FALSE
          AND n.reminder_email_sent = TRUE
        ORDER BY n.reminder_email_sent_at DESC
        LIMIT 100
      `;

      const result: QueryResult<any> = await this.pool.query(query);
      return result.rows as UnactedRequest[];
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
      throw new Error('Failed to fetch pending reminders');
    }
  }

}

// Export singleton instance
export const reminderService = new ReminderService();
