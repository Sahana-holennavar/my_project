import { Pool } from 'pg';
import { database } from '../config/database';
import { 
  Interaction, 
  CreateInteractionParams, 
  InteractionType, 
  INTERACTION_CONFIG,
  InteractionValidationResult 
} from '../models/Interaction';

export class InteractionService {
  private pool: Pool;

  constructor() {
    this.pool = database.getPool();
  }

  /**
   * Create or delete an interaction based on type
   */
  async createInteraction(params: CreateInteractionParams): Promise<Interaction | null> {
    const { user_id, post_id, interaction_type } = params;
    const config = INTERACTION_CONFIG[interaction_type.type];

    if (!config) {
      throw new Error(`Invalid interaction type: ${interaction_type.type}`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate post exists
      await this.validatePostExists(post_id, client);

      // For delete actions (unsave,dislike), handle special logic
      if (config.action === 'delete') {
        // For unsave and dislike, look for existing 'like','save' interaction to remove
      const reverseMap: Record<string, string> = {
        dislike: 'like',
        unsave: 'save',
      };

        const interactionTypeToCheck = reverseMap[interaction_type.type] || interaction_type.type;
        const existingInteraction = await this.checkDuplicateInteraction(user_id, post_id, interactionTypeToCheck, client);
        
        if (existingInteraction) {
          await client.query(
            'DELETE FROM "b2b_dev".interactions WHERE id = $1',
            [existingInteraction.id]
          );
          
          // Update post counter
          if (config.updateCounter) {
            await this.updatePostCounter(post_id, config.updateCounter, -1, client);
          }
          
          await client.query('COMMIT');
          return existingInteraction;
        } else {
          throw new Error(`No existing ${interaction_type.type} interaction found to remove`);
        }
      }
      const existingInteraction = await this.checkDuplicateInteraction(user_id, post_id, interaction_type.type, client);

      if (existingInteraction && interaction_type.type !== 'comment') {
        throw new Error(`User has already ${interaction_type.type}d this post`);
      }      
      // Create interaction record
      const result = await client.query(
        `INSERT INTO "b2b_dev".interactions (user_id, post_id, interaction_type) 
         VALUES ($1, $2, $3) 
         RETURNING id, user_id, post_id, interaction_type, created_at, updated_at`,
        [user_id, post_id, JSON.stringify(interaction_type)]
      );

      const interaction = result.rows[0];

      // Update post counter
      if (config.updateCounter) {
        await this.updatePostCounter(post_id, config.updateCounter, 1, client);
      }

      // Store in comments table if needed
      if (config.storeInComments && (interaction_type.type === 'comment' || interaction_type.type === 'reply')) {
        await this.storeInCommentsTable(interaction_type, post_id, user_id, client);
      }

      await client.query('COMMIT');
      return interaction;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate that post exists
   */
  private async validatePostExists(post_id: string, client: any): Promise<void> {
    const result = await client.query(
      'SELECT id FROM "b2b_dev".posts WHERE id = $1',
      [post_id]
    );

    if (result.rows.length === 0) {
      throw new Error('Post not found');
    }
  }

  /**
   * Check for duplicate interaction
   */
  private async checkDuplicateInteraction(
    user_id: string, 
    post_id: string, 
    interaction_type: string, 
    client: any
  ): Promise<Interaction | null> {
    const result = await client.query(
      `SELECT id, user_id, post_id, interaction_type, created_at, updated_at 
       FROM "b2b_dev".interactions 
       WHERE user_id = $1 AND post_id = $2 AND interaction_type->>'type' = $3`,
      [user_id, post_id, interaction_type]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update post counter
   */
  private async updatePostCounter(post_id: string, counter_type: string, increment: number, client: any): Promise<void> {
    const counterColumn = this.mapCounterType(counter_type);
    await client.query(
      `UPDATE "b2b_dev".posts 
       SET ${counterColumn} = ${counterColumn} + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [increment, post_id]
    );
  }

  /**
   * Map counter type to database column
   */
  private mapCounterType(counterType: string): string {
    const counterMap: Record<string, string> = {
      'likes': 'likes',
      'comments': 'comments', 
      'shares': 'shares',
      'saves': 'saves'
    };
    return counterMap[counterType] || counterType;
  }

  /**
   * Store comment/reply in comments table
   */
  private async storeInCommentsTable(
    interaction_type: InteractionType, 
    post_id: string, 
    user_id: string, 
    client: any
  ): Promise<void> {
    const parent_id = interaction_type.type === 'reply' ? interaction_type.parent_comment_id : null;
    
    await client.query(
      `INSERT INTO "b2b_dev".comments (post_id, user_id, text, parent_id) 
       VALUES ($1, $2, $3, $4)`,
      [post_id, user_id, interaction_type.content, parent_id]
    );
  }

  /**
   * Format interaction data with timestamp
   */
  formatInteractionData(interaction_type: string, metadata: Record<string, any> = {}): InteractionType {
    const config = INTERACTION_CONFIG[interaction_type];
    if (!config) {
      throw new Error(`Invalid interaction type: ${interaction_type}`);
    }

    const baseStructure = { ...config.jsonbStructure };
    baseStructure.timestamp = new Date().toISOString();

    // Merge metadata into structure
    Object.keys(metadata).forEach(key => {
      if (baseStructure.hasOwnProperty(key) || metadata[key] !== undefined) {
        (baseStructure as any)[key] = metadata[key];
      }
    });

    return baseStructure as InteractionType;
  }

  /**
   * Validate interaction parameters
   */
  validateInteractionParams(params: CreateInteractionParams): InteractionValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate user_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!params.user_id || !uuidRegex.test(params.user_id)) {
      errors.push({ field: 'user_id', message: 'User ID must be a valid UUID' });
    }

    if (!params.post_id || !uuidRegex.test(params.post_id)) {
      errors.push({ field: 'post_id', message: 'Post ID must be a valid UUID' });
    }

    if (!params.interaction_type || !params.interaction_type.type) {
      errors.push({ field: 'interaction_type', message: 'Interaction type is required' });
    }

    // Validate interaction type specific fields
    if (params.interaction_type) {
      const { type, content, reason, share_userid, parent_comment_id } = params.interaction_type;

      if ((type === 'comment' || type === 'reply') && (!content || content.trim().length === 0)) {
        errors.push({ field: 'content', message: 'Content is required for comments and replies' });
      }

      if (type === 'report' && (!reason || reason.trim().length === 0)) {
        errors.push({ field: 'reason', message: 'Reason is required for reports' });
      }

      if (type === 'share' && (!share_userid || !uuidRegex.test(share_userid))) {
        errors.push({ field: 'share_userid', message: 'Valid share user ID is required for shares' });
      }

      if (type === 'reply' && (!parent_comment_id || !uuidRegex.test(parent_comment_id))) {
        errors.push({ field: 'parent_comment_id', message: 'Valid parent comment ID is required for replies' });
      }
    }

    return {
      isValid: errors.length === 0,
      ...(errors.length > 0 && { errors })
    };
  }

  /**
   * Get user interactions for a post
   */
  async getUserInteractions(user_id: string, post_id: string): Promise<Interaction[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, post_id, interaction_type, created_at, updated_at 
       FROM "b2b_dev".interactions 
       WHERE user_id = $1 AND post_id = $2`,
      [user_id, post_id]
    );

    return result.rows;
  }

  /**
   * Get all interactions for a post
   */
  async getPostInteractions(post_id: string): Promise<Interaction[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, post_id, interaction_type, created_at, updated_at 
       FROM "b2b_dev".interactions 
       WHERE post_id = $1 
       ORDER BY created_at DESC`,
      [post_id]
    );

    return result.rows;
  }

  /**
   * Get comments stored in the comments table for a post
   */
  async getCommentsForPost(post_id: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT c.id, c.post_id, c.user_id, c.text, c.parent_id, c.created_at,
              up.profile_data->'personal_information'->>'first_name' AS first_name,
              up.profile_data->'personal_information'->>'last_name' AS last_name,
              up.profile_data->'avatar'->>'fileUrl' AS avatar,
              up.role AS user_role
       FROM "b2b_dev".comments c
       LEFT JOIN "b2b_dev".user_profiles up ON c.user_id::text = up.user_id::text
       WHERE c.post_id = $1
       ORDER BY c.created_at DESC`,
      [post_id]
    );

    const rows = result.rows.map((r: any) => {
      const first = r.first_name || '';
      const last = r.last_name || '';
      const name = (first || last) ? `${first}${first && last ? ' ' : ''}${last}` : null;

      return {
        id: r.id,
        post_id: r.post_id,
        user_id: r.user_id,
        text: r.text,
        parent_id: r.parent_id,
        created_at: r.created_at,
        user: {
          name,
          avatar: r.avatar || null,
          user_type: r.user_role || null
        }
      };
    });

    return rows;
  }
}

export const interactionService = new InteractionService();
