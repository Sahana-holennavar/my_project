/**
 * Message Model
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import { config } from '../config/env';

export interface IMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: any; // JSONB content
  created_at: Date;
  edited_at: Date | null;
  is_forwarded: boolean;
}

export interface IMessageWithSenderInfo {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: any;
  created_at: Date;
  edited_at: Date | null;
  is_forwarded: boolean;
  sender_email: string;
  sender_first_name: string | null;
  sender_last_name: string | null;
  sender_avatar: string | null;
}

export class Message {
  /**
   * Create a new message
   */
  static async create(
    conversationId: string,
    senderId: string,
    content: any,
    isForwarded: boolean = false
  ): Promise<IMessage> {
    const query = `
      INSERT INTO "${config.DB_SCHEMA}".messages (conversation_id, sender_id, content, is_forwarded)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = (await database.query(query, [
      conversationId,
      senderId,
      JSON.stringify(content),
      isForwarded,
    ])) as QueryResult<IMessage>;

    if (!result.rows[0]) {
      throw new Error('Failed to create message');
    }

    return result.rows[0];
  }

  /**
   * Get message by ID
   */
  static async findById(messageId: string): Promise<IMessage | null> {
    const query = `
      SELECT * FROM "${config.DB_SCHEMA}".messages
      WHERE id = $1
    `;

    const result = (await database.query(query, [messageId])) as QueryResult<IMessage>;
    return result.rows[0] || null;
  }

  /**
   * Get messages for a conversation with pagination
   */
  static async findByConversationId(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessageWithSenderInfo[]> {
    const query = `
      SELECT 
        m.*,
        u.email as sender_email,
        up.profile_data->'personal_information'->>'first_name' as sender_first_name,
        up.profile_data->'personal_information'->>'last_name' as sender_last_name,
        up.profile_data->'avatar'->>'fileUrl' as sender_avatar
      FROM "${config.DB_SCHEMA}".messages m
      INNER JOIN "${config.DB_SCHEMA}".users u ON m.sender_id = u.id
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = (await database.query(query, [
      conversationId,
      limit,
      offset,
    ])) as QueryResult<IMessageWithSenderInfo>;

    return result.rows.reverse(); // Reverse to show oldest first
  }

  /**
   * Update message content
   */
  static async update(messageId: string, content: any): Promise<IMessage | null> {
    const query = `
      UPDATE "${config.DB_SCHEMA}".messages
      SET content = $1, edited_at = now()
      WHERE id = $2
      RETURNING *
    `;

    const result = (await database.query(query, [
      JSON.stringify(content),
      messageId,
    ])) as QueryResult<IMessage>;

    return result.rows[0] || null;
  }

  /**
   * Delete a message
   */
  static async delete(messageId: string): Promise<boolean> {
    const query = `
      DELETE FROM "${config.DB_SCHEMA}".messages
      WHERE id = $1
    `;

    const result = (await database.query(query, [messageId])) as QueryResult;
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get latest message for a conversation
   */
  static async getLatestMessage(
    conversationId: string
  ): Promise<IMessageWithSenderInfo | null> {
    const query = `
      SELECT 
        m.*,
        u.email as sender_email,
        up.profile_data->'personal_information'->>'first_name' as sender_first_name,
        up.profile_data->'personal_information'->>'last_name' as sender_last_name,
        up.profile_data->'avatar'->>'fileUrl' as sender_avatar
      FROM "${config.DB_SCHEMA}".messages m
      INNER JOIN "${config.DB_SCHEMA}".users u ON m.sender_id = u.id
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT 1
    `;

    const result = (await database.query(query, [
      conversationId,
    ])) as QueryResult<IMessageWithSenderInfo>;

    return result.rows[0] || null;
  }

  /**
   * Get message count for a conversation
   */
  static async getMessageCount(conversationId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM "${config.DB_SCHEMA}".messages
      WHERE conversation_id = $1
    `;

    const result = (await database.query(query, [conversationId])) as QueryResult<{ count: string }>;
    return result.rows[0] ? parseInt(result.rows[0].count, 10) : 0;
  }
}
