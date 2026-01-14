/**
 * Conversation Participant Model
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import { config } from '../config/env';

export interface IConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: Date;
}

export interface IParticipantWithUserInfo {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: Date;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
}

export class ConversationParticipant {
  /**
   * Add a participant to a conversation
   */
  static async add(
    conversationId: string,
    userId: string
  ): Promise<IConversationParticipant> {
    const query = `
      INSERT INTO "${config.DB_SCHEMA}".conversation_participants (conversation_id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = (await database.query(query, [
      conversationId,
      userId,
    ])) as QueryResult<IConversationParticipant>;

    if (!result.rows[0]) {
      throw new Error('Failed to add participant');
    }

    return result.rows[0];
  }

  /**
   * Add multiple participants to a conversation
   */
  static async addMultiple(
    conversationId: string,
    userIds: string[]
  ): Promise<IConversationParticipant[]> {
    const values = userIds.map((userId, index) => `($1, $${index + 2})`).join(', ');
    const query = `
      INSERT INTO "${config.DB_SCHEMA}".conversation_participants (conversation_id, user_id)
      VALUES ${values}
      RETURNING *
    `;

    const result = (await database.query(query, [
      conversationId,
      ...userIds,
    ])) as QueryResult<IConversationParticipant>;

    return result.rows;
  }

  /**
   * Get all participants of a conversation
   */
  static async findByConversationId(
    conversationId: string
  ): Promise<IParticipantWithUserInfo[]> {
    const query = `
      SELECT 
        cp.*,
        u.email,
        up.profile_data->'personal_information'->>'first_name' as first_name,
        up.profile_data->'personal_information'->>'last_name' as last_name,
        up.profile_data->'avatar'->>'fileUrl' as avatar
      FROM "${config.DB_SCHEMA}".conversation_participants cp
      INNER JOIN "${config.DB_SCHEMA}".users u ON cp.user_id = u.id
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE cp.conversation_id = $1
      ORDER BY cp.joined_at ASC
    `;

    const result = (await database.query(query, [
      conversationId,
    ])) as QueryResult<IParticipantWithUserInfo>;

    return result.rows;
  }

  /**
   * Check if a user is a participant in a conversation
   */
  static async isParticipant(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const query = `
      SELECT 1 FROM "${config.DB_SCHEMA}".conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
    `;

    const result = (await database.query(query, [conversationId, userId])) as QueryResult;
    return result.rows.length > 0;
  }

  /**
   * Remove a participant from a conversation
   */
  static async remove(conversationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM "${config.DB_SCHEMA}".conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
    `;

    const result = (await database.query(query, [conversationId, userId])) as QueryResult;
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get participant count for a conversation
   */
  static async getParticipantCount(conversationId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM "${config.DB_SCHEMA}".conversation_participants
      WHERE conversation_id = $1
    `;

    const result = (await database.query(query, [conversationId])) as QueryResult<{ count: string }>;
    return result.rows[0] ? parseInt(result.rows[0].count, 10) : 0;
  }
}
