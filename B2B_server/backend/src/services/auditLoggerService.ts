/**
 * Audit Logger Service - Handles database operations for audit logging
 * Implements batch processing for performance optimization
 */

import { database } from '../config/database';
import { config } from '../config/env';
import { 
  AuditLog, 
  CreateAuditLogData, 
  BatchAuditLogData, 
  AuditLogResponse, 
  BatchAuditLogResponse,
  AuditLogConfig,
  DEFAULT_AUDIT_CONFIG
} from '../models/AuditLog';

class AuditLoggerService {
  private batchQueue: CreateAuditLogData[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private config: AuditLogConfig;

  constructor() {
    this.config = DEFAULT_AUDIT_CONFIG;
    this.startBatchProcessor();
  }

  /**
   * Start the batch processor for handling queued audit logs
   */
  private startBatchProcessor(): void {
    if (!this.config.enable_batching) return;

    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.config.flush_interval_ms);
  }

  /**
   * Stop the batch processor
   */
  public stopBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // Flush any remaining logs
    this.flushBatch();
  }

  /**
   * Add audit log to batch queue
   */
  public async addToBatch(auditData: CreateAuditLogData): Promise<void> {
    if (!this.config.enable_batching) {
      await this.createAuditLog(auditData);
      return;
    }

    this.batchQueue.push(auditData);

    // Flush if batch is full
    if (this.batchQueue.length >= this.config.batch_size) {
      await this.flushBatch();
    }
  }

  /**
   * Flush the current batch to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const logsToProcess = [...this.batchQueue];
    this.batchQueue = [];

    try {
      await this.createBatchAuditLogs(logsToProcess);
    } catch (error) {
      console.error('Batch audit log flush failed:', error);
      // Re-queue failed logs for retry
      this.batchQueue.unshift(...logsToProcess);
    }
  }

  /**
   * Create a single audit log entry
   */
  public async createAuditLog(auditData: CreateAuditLogData): Promise<AuditLogResponse> {
    try {
      const query = `
        INSERT INTO "${config.DB_SCHEMA}".audit_log (event, user_id, action, ip_address)
        VALUES ($1, $2, $3, $4)
        RETURNING id, event, user_id, action, timestamp, ip_address
      `;

      const values = [
        auditData.event,
        auditData.user_id || null,
        auditData.action,
        auditData.ip_address || null
      ];

      const result = await database.query(query, values) as { rows: AuditLog[] };
      const auditLog = result.rows[0] as AuditLog;

      return {
        success: true,
        message: 'Audit log created successfully',
        audit_log_id: auditLog.id
      };
    } catch (error) {
      console.error('Create audit log error:', error);
      return {
        success: false,
        message: 'Failed to create audit log',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create multiple audit log entries in batch
   */
  public async createBatchAuditLogs(auditLogs: CreateAuditLogData[]): Promise<BatchAuditLogResponse> {
    if (auditLogs.length === 0) {
      return {
        success: true,
        message: 'No audit logs to process',
        processed_count: 0,
        failed_count: 0
      };
    }

    try {
      const query = `
        INSERT INTO "${config.DB_SCHEMA}".audit_log (event, user_id, action, ip_address)
        VALUES ${auditLogs.map((_, index) => 
          `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
        ).join(', ')}
        RETURNING id
      `;

      const values = auditLogs.flatMap(log => [
        log.event,
        log.user_id || null,
        log.action,
        log.ip_address || null
      ]);

      const result = await database.query(query, values) as { rows: { id: string }[] };

      return {
        success: true,
        message: `Successfully processed ${result.rows.length} audit logs`,
        processed_count: result.rows.length,
        failed_count: 0
      };
    } catch (error) {
      console.error('Batch audit log creation error:', error);
      return {
        success: false,
        message: 'Failed to create batch audit logs',
        processed_count: 0,
        failed_count: auditLogs.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get audit logs for a specific user
   */
  public async getAuditLogsByUser(userId: string, limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT id, event, user_id, action, timestamp, ip_address
        FROM "${config.DB_SCHEMA}".audit_log
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [userId, limit, offset]) as { rows: AuditLog[] };
      return result.rows;
    } catch (error) {
      console.error('Get audit logs by user error:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Get audit logs by event type
   */
  public async getAuditLogsByEvent(event: string, limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT id, event, user_id, action, timestamp, ip_address
        FROM "${config.DB_SCHEMA}".audit_log
        WHERE event = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [event, limit, offset]) as { rows: AuditLog[] };
      return result.rows;
    } catch (error) {
      console.error('Get audit logs by event error:', error);
      throw new Error('Failed to retrieve audit logs by event');
    }
  }

  /**
   * Get audit logs within a time range
   */
  public async getAuditLogsByTimeRange(
    startDate: Date, 
    endDate: Date, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT id, event, user_id, action, timestamp, ip_address
        FROM "${config.DB_SCHEMA}".audit_log
        WHERE timestamp BETWEEN $1 AND $2
        ORDER BY timestamp DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await database.query(query, [startDate, endDate, limit, offset]) as { rows: AuditLog[] };
      return result.rows;
    } catch (error) {
      console.error('Get audit logs by time range error:', error);
      throw new Error('Failed to retrieve audit logs by time range');
    }
  }

  /**
   * Update batch processing configuration
   */
  public updateConfig(newConfig: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart batch processor with new configuration
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.startBatchProcessor();
  }

  /**
   * Get current batch queue status
   */
  public getBatchStatus(): { queue_size: number; config: AuditLogConfig } {
    return {
      queue_size: this.batchQueue.length,
      config: this.config
    };
  }
}

export const auditLoggerService = new AuditLoggerService();
export default auditLoggerService;
