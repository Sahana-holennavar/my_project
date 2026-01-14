import { Pool, QueryResult } from 'pg';
import { config } from '../config/env';

export interface Notification {
  id: string;
  user_id: string;
  content: string;
  payload: any;
  type: string;
  read: boolean;
  delivery_method: 'email' | 'in_app';
  created_at: Date;
}

export class NotificationModel {
  public pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const result: QueryResult<Notification> = await this.pool.query(
      `INSERT INTO "${config.DB_SCHEMA}".notifications (user_id, content, payload, type, read, delivery_method)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        notification.user_id,
        notification.content,
        notification.payload,
        notification.type,
        notification.read,
        notification.delivery_method
      ]
    );
    if (!result.rows[0]) {
      throw new Error('Failed to create notification');
    }
    return result.rows[0];
  }

  // Static method for queue integration
  static async create(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    // You must provide a pool instance, e.g., NotificationModel.pool
    if (!this.prototype.pool) throw new Error('Pool not initialized');
    return await this.prototype.create.call({ pool: this.prototype.pool }, notification);
  }

  async findByUserId(user_id: string): Promise<Notification[]> {
    const result = await this.pool.query(
      `SELECT * FROM "${config.DB_SCHEMA}".notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [user_id]
    );
    return result.rows;
  }

  async markAsRead(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE "${config.DB_SCHEMA}".notifications SET read = TRUE WHERE id = $1`,
      [id]
    );
  }

  async getUnreadCount(user_id: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM "b2b".notifications WHERE user_id = $1 AND read = FALSE`,
      [user_id]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
