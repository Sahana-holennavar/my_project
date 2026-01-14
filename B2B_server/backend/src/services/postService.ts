/**
 * Post Service - Business logic for post operations
 * Handles database operations for posts table
 */

import { database } from '../config/database';
import { config } from '../config/env';
import { Post, CreatePostData, CreatePostResponse } from '../models/Post';
import { MediaItem } from '../models/Post';
import { contentService } from './contentService';
import { uploadMediaToS3 } from './s3Service';

export class PostService {
  /**
   * Create a new post
   * @param userId - User ID creating the post
   * @param postData - Post data including content, type, audience
   * @param mediaFiles - Array of uploaded media files
   * @returns Created post object
   */
  async createPost(
    userId: string,
    postData: CreatePostData,
    mediaFiles?: Express.Multer.File[]
  ): Promise<CreatePostResponse> {
    try {
      // Content validation and moderation
      const contentValidation = contentService.validateContentLength(postData.content);
      if (!contentValidation.isValid) {
        throw new Error(contentValidation.message || 'Content validation failed');
      }

      // Content moderation
      const moderationResult = contentService.moderateContent(postData.content);
      if (!moderationResult.isAppropriate) {
        throw new Error(moderationResult.reason || 'Content contains inappropriate language');
      }

      // Extract hashtags and mentions
      const { hashtags, mentions } = contentService.processContent(postData.content);

      // Validate post type and audience
      if (!['text', 'image', 'video'].includes(postData.type)) {
        throw new Error('Invalid post type. Allowed: text, image, video');
      }

      if (!['public', 'private', 'connections'].includes(postData.audience)) {
        throw new Error('Invalid audience type. Allowed: public, private, connections');
      }

      // Process media files if present
      let mediaItems: MediaItem[] = [];
      if (mediaFiles && mediaFiles.length > 0) {
        // This will be handled by the controller before calling this service
        // The mediaItems will be passed in postData.media
        mediaItems = postData.media || [];
      }

      // Prepare post data for database insertion
      const postRecord = {
        user_id: userId,
        content: {
          text: postData.content.trim(),
          mentions: mentions, // Store mentions in content JSONB
          hashtags: hashtags // Store hashtags in content JSONB
        },
        type: postData.type,
        audience: postData.audience,
        media: mediaItems.length > 0 ? mediaItems : null,
        tags: hashtags, // Keep tags column for backward compatibility
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reposts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert post into database
      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".posts (
          user_id, content, type, audience, media, tags,
          likes, comments, shares, saves, reposts, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        postRecord.user_id,
        JSON.stringify(postRecord.content), // Store as JSONB
        postRecord.type,
        postRecord.audience,
        postRecord.media ? JSON.stringify(postRecord.media) : null,
        JSON.stringify(postRecord.tags),
        postRecord.likes,
        postRecord.comments,
        postRecord.shares,
        postRecord.saves,
        postRecord.reposts,
        postRecord.created_at,
        postRecord.updated_at
      ];

      const result = await database.query(insertQuery, values);
      const createdPost = (result as any).rows[0];

      return {
        post: {
          id: createdPost.id,
          user_id: createdPost.user_id,
          content: createdPost.content, // Now contains {text, mentions, hashtags}
          type: createdPost.type,
          audience: createdPost.audience,
          media: createdPost.media,
          tags: createdPost.tags,
          likes: createdPost.likes,
          comments: createdPost.comments,
          shares: createdPost.shares,
          saves: createdPost.saves,
          reposts: createdPost.reposts,
          created_at: createdPost.created_at,
          updated_at: createdPost.updated_at
        }
      };

    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get post by ID
   * @param postId - Post ID
   * @returns Post object or null if not found
   */
  async getPostById(postId: string): Promise<Post | null> {
    try {
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.id = $1
      `;
      
      const result = await database.query(query, [postId]);
      
      if ((result as any).rows.length === 0) {
        return null;
      }

      const row = (result as any).rows[0] as any;
      const user = {
        name: row.user_first_name + ' ' + row.user_last_name || null,
        avatar: row.user_avatar || null,
        user_type: row.user_type || null
      };
      delete row.user_first_name;
      delete row.user_last_name;
      delete row.user_avatar;
      delete row.user_type;

      return { ...row, user } as Post & { user: any };
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  }

  /**
   * Get posts by user ID
   * @param userId - User ID
   * @param limit - Maximum number of posts to return
   * @param offset - Number of posts to skip
   * @returns Array of post objects
   */
  async getPostsByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Post[]> {
    try {
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.user_id = $1 
        ORDER BY p.created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await database.query(query, [userId, limit, offset]);
      const rawPosts = (result as any).rows as any[];
      return rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });
    } catch (error) {
      console.error('Error getting posts by user ID:', error);
      throw error;
    }
  }

  /**
   * Update post counters (likes, comments, shares, etc.)
   * @param postId - Post ID
   * @param counterType - Type of counter to update
   * @param increment - Whether to increment (true) or decrement (false)
   * @returns Updated post object
   */
  async updatePostCounter(
    postId: string,
    counterType: 'likes' | 'comments' | 'shares' | 'saves' | 'reposts',
    increment: boolean = true
  ): Promise<Post | null> {
    try {
      const operation = increment ? '+' : '-';
      const query = `
        UPDATE "${config.DB_SCHEMA}".posts 
        SET ${counterType} = ${counterType} ${operation} 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await database.query(query, [postId]);
      
      if ((result as any).rows.length === 0) {
        return null;
      }

      return (result as any).rows[0];
    } catch (error) {
      console.error('Error updating post counter:', error);
      throw error;
    }
  }

  /**
   * Delete post by ID
   * @param postId - Post ID
   * @param userId - User ID (for authorization)
   * @returns Success status
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM "${config.DB_SCHEMA}".posts 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await database.query(query, [postId, userId]);
      
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Get posts by hashtag
   * @param hashtag - Hashtag to search for
   * @param limit - Maximum number of posts to return
   * @param offset - Number of posts to skip
   * @returns Array of post objects
   */
  async getPostsByHashtag(
    hashtag: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Post[]> {
    try {
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.tags @> $1
        ORDER BY p.created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await database.query(query, [JSON.stringify([hashtag]), limit, offset]);
      const rawPosts = (result as any).rows as any[];
      return rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });
    } catch (error) {
      console.error('Error getting posts by hashtag:', error);
      throw error;
    }
  }

  /**
   * Get posts by mention
   * @param username - Username to search for
   * @param limit - Maximum number of posts to return
   * @param offset - Number of posts to skip
   * @returns Array of post objects
   */
  async getPostsByMention(
    username: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Post[]> {
    try {
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.mentions @> $1
        ORDER BY p.created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await database.query(query, [JSON.stringify([username]), limit, offset]);
      const rawPosts = (result as any).rows as any[];
      return rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });
    } catch (error) {
      console.error('Error getting posts by mention:', error);
      throw error;
    }
  }

  /**
   * Update post by ID
   * @param postId - Post ID
   * @param userId - User ID (for authorization)
   * @param updateData - Updated post data
   * @returns Updated post object or null if not found/unauthorized
   */
  async updatePost(
    postId: string,
    userId: string,
    updateData: {
      content: string;
      hashtags: string[];
      mentions: string[];
      media: MediaItem[];
    }
  ): Promise<Post | null> {
    try {
      // First, get the existing post to verify ownership
      const existingPost = await this.getPostById(postId);
      if (!existingPost) {
        return null;
      }

      // Verify ownership
      if (existingPost.user_id !== userId) {
        throw new Error('Unauthorized to edit this post');
      }

      // Get existing media for comparison
      const existingMedia = existingPost.media || [];
      const newMedia = updateData.media || [];

      // Find media to delete (existing media not in new media)
      const mediaToDelete = existingMedia.filter(existingItem => 
        !newMedia.some(newItem => newItem.url === existingItem.url)
      );

      // Delete old media from S3
      for (const mediaItem of mediaToDelete) {
        try {
          const { deleteMediaFromS3 } = await import('./s3Service');
          await deleteMediaFromS3(mediaItem.filename);
        } catch (error) {
          console.error('Error deleting old media from S3:', error);
          // Continue with update even if S3 deletion fails
        }
      }

      // Update post in database
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".posts 
        SET 
          content = $1,
          media = $2,
          tags = $3,
          updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `;

      const contentData = {
        text: updateData.content,
        mentions: updateData.mentions,
        hashtags: updateData.hashtags
      };

      const values = [
        JSON.stringify(contentData),
        JSON.stringify(newMedia),
        JSON.stringify(updateData.hashtags),
        postId,
        userId
      ];

      const result = await database.query(updateQuery, values);
      
      if ((result as any).rows.length === 0) {
        return null;
      }

      const updatedPost = (result as any).rows[0];
     
      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Fetch random posts with pagination
   * @param limit - Number of posts to return
   * @param offset - Number of posts to skip
   * @returns Object with posts array and total count
   */
  async fetchPosts(limit: number = 20, offset: number = 0): Promise<{ posts: Post[]; totalCount: number }> {
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".posts WHERE audience = 'public'`;
      const countResult = await database.query(countQuery);
      const totalCount = parseInt((countResult as any).rows[0].count);

      // Get posts with pagination, include user profile fields
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.audience = 'public'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await database.query(query, [limit, offset]);
      const rawPosts = (result as any).rows as any[];

      // Attach user_profile object and shuffle for randomization
      const posts = rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };

        // remove the flat user fields to avoid duplication
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;

        return { ...row, user } as Post & { user: any };
      });

      const shuffledPosts = this.shuffleArray(posts);

      return { posts: shuffledPosts, totalCount };
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  /**
   * Fetch posts by tags with relevance scoring
   * @param tags - Array of tags to search for
   * @param limit - Number of posts to return
   * @param offset - Number of posts to skip
   * @returns Object with posts array and total count
   */
  async fetchPostsByTags(tags: string[], limit: number = 20, offset: number = 0): Promise<{ posts: Post[]; totalCount: number }> {
    try {
      // Get posts that contain any of the specified tags (including user profile fields)
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.audience = 'public' 
        AND (
          ${tags.map((_, index) => `p.tags ? $${index + 1}`).join(' OR ')}
        )
        ORDER BY p.created_at DESC
        LIMIT $${tags.length + 1} OFFSET $${tags.length + 2}
      `;
      
      const params = [...tags, limit, offset];
      const result = await database.query(query, params);
      const rawPosts = (result as any).rows as any[];

      const posts = rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        WHERE p.audience = 'public' 
        AND (
          ${tags.map((_, index) => `p.tags ? $${index + 1}`).join(' OR ')}
        )
      `;
      
      const countResult = await database.query(countQuery, tags);
      const totalCount = parseInt((countResult as any).rows[0].count);

      return { posts, totalCount };
    } catch (error) {
      console.error('Error fetching posts by tags:', error);
      throw error;
    }
  }

  /**
   * Fetch posts by date range
   * @param startDate - Start date (ISO format)
   * @param endDate - End date (ISO format)
   * @param limit - Number of posts to return
   * @param offset - Number of posts to skip
   * @returns Object with posts array and total count
   */
  async fetchPostsByDate(
    startDate?: string, 
    endDate?: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ posts: Post[]; totalCount: number }> {
    try {
      let whereClause = "WHERE audience = 'public'";
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get total count (include join for consistency)
      const countQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        ${whereClause}`;
      const countResult = await database.query(countQuery, params);
      const totalCount = parseInt((countResult as any).rows[0].count);

      // Get posts with pagination and user profile fields
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      const result = await database.query(query, params);
      const rawPosts = (result as any).rows as any[];

      const posts = rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });

      return { posts, totalCount };
    } catch (error) {
      console.error('Error fetching posts by date:', error);
      throw error;
    }
  }

  /**
   * Fetch posts with combined filters
   * @param filterObj - Object containing all filter criteria
   * @returns Object with posts array and total count
   */
  async fetchPostsByFilters(filterObj: {
    tags: string[];
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ posts: Post[]; totalCount: number }> {
    try {
      let whereClause = "WHERE audience = 'public'";
      const params: any[] = [];
      let paramIndex = 1;

      // Add tag filter
      if (filterObj.tags.length > 0) {
        whereClause += ` AND (${filterObj.tags.map((_, index) => `tags ? $${paramIndex + index}`).join(' OR ')})`;
        params.push(...filterObj.tags);
        paramIndex += filterObj.tags.length;
      }

      // Add date filters
      if (filterObj.startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(filterObj.startDate);
        paramIndex++;
      }

      if (filterObj.endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(filterObj.endDate);
        paramIndex++;
      }

      // Get total count (include join for consistency)
      const countQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        ${whereClause}`;
      const countResult = await database.query(countQuery, params);
      const totalCount = parseInt((countResult as any).rows[0].count);

      // Get posts with pagination and include user profile fields
      const query = `
        SELECT p.*, 
          up.profile_data->'personal_information'->>'first_name' AS user_first_name,
          up.profile_data->'personal_information'->>'last_name' AS user_last_name,
          up.profile_data->'avatar'->>'fileUrl' AS user_avatar,
          up.role AS user_type
        FROM "${config.DB_SCHEMA}".posts p
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON p.user_id::text = up.user_id::text
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(filterObj.limit, filterObj.offset);
      const result = await database.query(query, params);
      const rawPosts = (result as any).rows as any[];

      const posts = rawPosts.map(row => {
        const user = {
          name: row.user_first_name + ' ' + row.user_last_name || null,
          avatar: row.user_avatar || null,
          user_type: row.user_type || null
        };
        delete row.user_first_name;
        delete row.user_last_name;
        delete row.user_avatar;
        delete row.user_type;
        return { ...row, user } as Post & { user: any };
      });

      return { posts, totalCount };
    } catch (error) {
      console.error('Error fetching posts by filters:', error);
      throw error;
    }
  }

  /**
   * Shuffle array for randomization (Fisher-Yates algorithm)
   * @param array - Array to shuffle
   * @returns Shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }
}

export const postService = new PostService();
export default postService;
