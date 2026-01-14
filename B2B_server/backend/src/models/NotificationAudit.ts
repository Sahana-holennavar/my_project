import { Pool, QueryResult } from 'pg';
import { config } from '../config/env';

export interface NotificationAudit {
  id: string;
  event: string;
  job_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retries: number;
  error_log: string | null;
  timestamp: Date;
  notification_id: string | null;
  user_id: string | null;
}

export class NotificationAuditModel {
  public pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async logEvent(audit: Omit<NotificationAudit, 'id' | 'timestamp'>): Promise<NotificationAudit> {
    const result: QueryResult<NotificationAudit> = await this.pool.query(
      `INSERT INTO "${config.DB_SCHEMA}".notification_audit (event, job_id, status, retries, error_log, notification_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        audit.event,
        audit.job_id,
        audit.status,
        audit.retries,
        audit.error_log,
        audit.notification_id,
        audit.user_id
      ]
    );
    if (!result.rows[0]) throw new Error('Failed to log audit event');
    return result.rows[0];
  }

  // Static method for queue integration
  static async logEvent(audit: Omit<NotificationAudit, 'id' | 'timestamp'>): Promise<NotificationAudit> {
    if (!this.prototype.pool) throw new Error('Pool not initialized');
    return await this.prototype.logEvent.call({ pool: this.prototype.pool }, audit);
  }

  async getStats(status: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".notification_audit WHERE status = $1`,
      [status]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
