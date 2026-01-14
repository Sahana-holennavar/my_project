import { config } from '../config/env';
import { database } from '../config/database';
import { UserProfile, CreateProfileData, CreateProfileResponse, EditProfileResponse } from './UserProfile';

/**
 * UserProfile Model Class
 * Handles database operations for user profiles
 */
export class UserProfileModel {
  /**
   * Find user profile by user ID
   */
  static async findByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const query = `
        SELECT user_id, role, profile_data, privacy_settings, created_at, updated_at
        FROM "${config.DB_SCHEMA}".user_profiles 
        WHERE user_id = $1
      `;
      const result = await database.query(query, [userId]) as any;
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('Find user profile by ID error:', error);
      throw new Error('Database error during profile lookup');
    }
  }

  /**
   * Update JSONB field in user profile
   */
  static async updateJSONBField(userId: string, profileData: any): Promise<any> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".user_profiles 
        SET profile_data = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING user_id, profile_data, updated_at
      `;
      
      const result = await database.query(query, [JSON.stringify(profileData), userId]) as any;
      
      if (result.rows.length === 0) {
        throw new Error('Profile update failed - no rows affected');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Update JSONB field error:', error);
      throw new Error('Database error during profile update');
    }
  }

  /**
   * Create new user profile
   */
  static async createProfile(userId: string, role: string, profileData: any, privacySettings: any): Promise<CreateProfileResponse> {
    try {
      const query = `
        INSERT INTO "${config.DB_SCHEMA}".user_profiles 
        (user_id, role, profile_data, privacy_settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING user_id, profile_data, created_at
      `;
      
      const result = await database.query(query, [
        userId, 
        role, 
        JSON.stringify(profileData), 
        JSON.stringify(privacySettings)
      ]) as any;
      
      return {
        profile_id: result.rows[0].user_id,
        user_id: result.rows[0].user_id,
        profile_data: result.rows[0].profile_data,
        created_at: result.rows[0].created_at
      };
    } catch (error) {
      console.error('Create profile error:', error);
      throw new Error('Database error during profile creation');
    }
  }

  /**
   * Check if user profile exists
   */
  static async profileExists(userId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM "${config.DB_SCHEMA}".user_profiles 
        WHERE user_id = $1
      `;
      const result = await database.query(query, [userId]) as any;
      return result.rows.length > 0;
    } catch (error) {
      console.error('Check profile exists error:', error);
      throw new Error('Database error during profile existence check');
    }
  }

  /**
   * Get profile by user ID with role information
   */
  static async getProfileWithRole(userId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          up.user_id, 
          up.role, 
          up.profile_data, 
          up.privacy_settings, 
          up.created_at, 
          up.updated_at,
          r.name as role_name
        FROM "${config.DB_SCHEMA}".user_profiles up
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON up.user_id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE up.user_id = $1
      `;
      const result = await database.query(query, [userId]) as any;
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('Get profile with role error:', error);
      throw new Error('Database error during profile retrieval with role');
    }
  }
}

export default UserProfileModel;
