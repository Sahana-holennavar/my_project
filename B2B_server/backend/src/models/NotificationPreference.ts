import { Pool, QueryResult } from 'pg';
import { config } from '../config/env';

export interface NotificationPreference {
  user_id: string;
  type: string;
  email: boolean;
  in_app: boolean;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export class NotificationPreferenceModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async upsert(pref: Omit<NotificationPreference, 'created_at' | 'updated_at'>): Promise<NotificationPreference> {
    const result: QueryResult<NotificationPreference> = await this.pool.query(
      `INSERT INTO "${config.DB_SCHEMA}".notification_preferences (user_id, type, email, in_app, enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, type) DO UPDATE SET email = $3, in_app = $4, enabled = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [pref.user_id, pref.type, pref.email, pref.in_app, pref.enabled]
    );
    if (!result.rows[0]) throw new Error('Upsert failed');
    return result.rows[0];
  }

  async findByUserId(user_id: string): Promise<NotificationPreference[]> {
    const result = await this.pool.query(
      `SELECT * FROM "${config.DB_SCHEMA}".notification_preferences WHERE user_id = $1`,
      [user_id]
    );
    return result.rows;
  }

  async isChannelEnabled(user_id: string, type: string, channel: 'email' | 'in_app'): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT ${channel} FROM "${config.DB_SCHEMA}".notification_preferences WHERE user_id = $1 AND type = $2`,
      [user_id, type]
    );
    if (!result.rows[0]) return false;
    return !!result.rows[0][channel];
  }
}
