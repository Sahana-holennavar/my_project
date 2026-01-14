/**
 * Conversation Model
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import { config } from '../config/env';

export interface IConversation {
  id: string;
  is_group: boolean;
  title: string | null;
  created_by: string;
  created_at: Date;
}

export interface IConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: Date;
}

export class Conversation {
  /**
   * Create a new conversation
   */
  static async create(
    createdBy: string,
    isGroup: boolean = false,
    title: string | null = null
  ): Promise<IConversation> {
    const query = `
      INSERT INTO "${config.DB_SCHEMA}".conversations (created_by, is_group, title)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = (await database.query(query, [
      createdBy,
      isGroup,
      title,
    ])) as QueryResult<IConversation>;

    if (!result.rows[0]) {
      throw new Error('Failed to create conversation');
    }

    return result.rows[0];
  }

  /**
   * Get conversation by ID
   */
  static async findById(conversationId: string): Promise<IConversation | null> {
    const query = `
      SELECT * FROM "${config.DB_SCHEMA}".conversations
      WHERE id = $1
    `;

    const result = (await database.query(query, [conversationId])) as QueryResult<IConversation>;
    return result.rows[0] || null;
  }

  /**
   * Get all conversations for a user
   */
  static async findByUserId(userId: string): Promise<IConversation[]> {
    const query = `
      SELECT DISTINCT c.*
      FROM "${config.DB_SCHEMA}".conversations c
      INNER JOIN "${config.DB_SCHEMA}".conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
      ORDER BY c.created_at DESC
    `;

    const result = (await database.query(query, [userId])) as QueryResult<IConversation>;
    return result.rows;
  }

  /**
   * Check if a direct conversation exists between two users
   */
  static async findDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<IConversation | null> {
    const query = `
      SELECT c.*
      FROM "${config.DB_SCHEMA}".conversations c
      WHERE c.is_group = false
        AND c.id IN (
          SELECT cp1.conversation_id
          FROM "${config.DB_SCHEMA}".conversation_participants cp1
          WHERE cp1.user_id = $1
        )
        AND c.id IN (
          SELECT cp2.conversation_id
          FROM "${config.DB_SCHEMA}".conversation_participants cp2
          WHERE cp2.user_id = $2
        )
        AND (
          SELECT COUNT(*)
          FROM "${config.DB_SCHEMA}".conversation_participants cp3
          WHERE cp3.conversation_id = c.id
        ) = 2
      LIMIT 1
    `;

    const result = (await database.query(query, [userId1, userId2])) as QueryResult<IConversation>;
    return result.rows[0] || null;
  }

  /**
   * Delete a conversation
   */
  static async delete(conversationId: string): Promise<boolean> {
    const query = `
      DELETE FROM "${config.DB_SCHEMA}".conversations
      WHERE id = $1
    `;

    const result = (await database.query(query, [conversationId])) as QueryResult;
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Update conversation title
   */
  static async updateTitle(conversationId: string, title: string): Promise<boolean> {
    const query = `
      UPDATE "${config.DB_SCHEMA}".conversations
      SET title = $1
      WHERE id = $2
    `;

    const result = (await database.query(query, [title, conversationId])) as QueryResult;
    return result.rowCount !== null && result.rowCount > 0;
  }
}
