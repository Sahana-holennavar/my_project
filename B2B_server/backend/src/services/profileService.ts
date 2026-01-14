import { config } from '../config/env';
import { database } from '../config/database';
import { 
  UserProfile, 
  CreateProfileData, 
  CreateProfileResponse, 
  ProfileData,
  PersonalInformation,
  PrivacySettings
} from '../models/UserProfile';
import { UserProfileModel } from '../models/UserProfileModel';
import { authService } from './authService';
import { ValidationError } from '../utils/response';
import ValidationHelpers from '../utils/validationHelpers';

type ProfileSearchSort = 'recent';

interface ProfileSearchItem {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface ProfileSearchResult {
  results: ProfileSearchItem[];
  page: number;
  limit: number;
  has_more: boolean;
  total_candidates: number;
}

interface ProfileSearchOptions {
  sort?: ProfileSearchSort;
}

class ProfileService {
  private schemaCache: Map<string, any> = new Map();
  private schemaCacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    // Schema is now loaded from database on-demand
  }

  /**
   * Load profile schema from database
   * Uses caching to reduce database queries
   */
  private async loadProfileSchemaFromDB(role?: string): Promise<any> {
    try {
      const now = Date.now();
      const cacheKey = role || 'all';

      // Check if cache is still valid
      if (this.schemaCache.has(cacheKey) && (now - this.schemaCacheTimestamp) < this.CACHE_TTL) {
        return this.schemaCache.get(cacheKey);
      }

      
      // Query schema from database
      let query = `
        SELECT role, field_name, field_type, required, rules, display_order
        FROM "${config.DB_SCHEMA}".profile_schema
      `;
      
      const params: any[] = [];
      if (role) {
        query += ` WHERE role = $1`;
        params.push(role);
      }
      
      query += ` ORDER BY display_order ASC`;
      
      const result = await database.query(query, params) as any;
      
      if (result.rows.length === 0) {
        throw new Error(`No schema found in database${role ? ` for role: ${role}` : ''}. Please run the population script.`);
      }

      // Transform database rows into structured schema
      const schema: any = { profile_schema: {} };
      
      for (const row of result.rows) {
        const roleKey = row.role;
        const [section, fieldName] = row.field_name.split('.');
        
        if (!schema.profile_schema[roleKey]) {
          schema.profile_schema[roleKey] = {};
        }
        
        if (!schema.profile_schema[roleKey][section]) {
          schema.profile_schema[roleKey][section] = {};
        }
        
        // Parse rules from JSONB
        const rules = typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules;
        schema.profile_schema[roleKey][section][fieldName] = rules;
      }

      // Update cache
      this.schemaCache.set(cacheKey, schema);
      this.schemaCacheTimestamp = now;
      
      return schema;
      
    } catch (error) {
      console.error('Error loading profile schema from database:', error);
      throw new Error('Failed to load profile schema from database. Please ensure the schema is populated.');
    }
  }

  /**
   * Clear schema cache (useful for testing or after schema updates)
   */
  public clearSchemaCache(): void {
    this.schemaCache.clear();
    this.schemaCacheTimestamp = 0;
  }

  /**
   * Create user profile
   */
  async createProfile(profileData: CreateProfileData, userId: string, userRole: string): Promise<CreateProfileResponse> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if profile already exists
      const profileExists = await this.checkProfileExists(userId);
      if (profileExists) {
        throw new Error('Profile already exists for this user');
      }
      
      // Validate profile data against schema
      const validationResult = await this.validateProfileData(profileData.profile_data, userRole);
      if (!validationResult.valid) {
        // Create a custom error with detailed validation errors
        const validationError = new Error('Profile validation failed');
        (validationError as any).validationErrors = validationResult.errors;
        throw validationError;
      }
      
      // Set default privacy settings if not provided
      const privacySettings = this.getDefaultPrivacySettings(userRole);
      
      // Create profile record
      const profileQuery = `
        INSERT INTO "${config.DB_SCHEMA}".user_profiles (
          user_id, role, profile_data, privacy_settings, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING user_id, role, profile_data, created_at
      `;
      
      const profileValues = [
        userId,
        userRole,
        JSON.stringify(profileData.profile_data),
        JSON.stringify(privacySettings)
      ];
      
      const profileResult = await client.query(profileQuery, profileValues);
      const newProfile = profileResult.rows[0];
      
      await client.query('COMMIT');
      
      return {
        profile_id: newProfile.user_id,
        user_id: newProfile.user_id,
        profile_data: newProfile.profile_data,
        created_at: newProfile.created_at.toISOString()
      };
      
    } catch (error) {
      console.error('Profile creation error:', error);
      await client.query('ROLLBACK');
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Profile creation failed');
    } finally {
      client.release();
    }
  }

  /**
   * Check if profile already exists for user
   */
  async checkProfileExists(userId: string): Promise<boolean> {
    try {
      const query = `
        SELECT user_id FROM "${config.DB_SCHEMA}".user_profiles 
        WHERE user_id = $1
      `;
      const result = await database.query(query, [userId]) as any;
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Profile existence check error:', error);
      throw new Error('Database error during profile existence check');
    }
  }

  /**
   * Validate profile data against schema loaded from database
   */
  async validateProfileData(profileData: ProfileData, userRole: string): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];
    
    try {
      // Handle null or undefined role by defaulting to 'student'
      const effectiveRole = userRole || 'student';
      
      // Load schema from database
      const schema = await this.loadProfileSchemaFromDB(effectiveRole);
      
      // Get schema for user role
      const roleSchema = schema.profile_schema[effectiveRole];
      
      if (!roleSchema) {
        errors.push({ field: 'role', message: `Invalid user role: ${effectiveRole}` });
        return { valid: false, errors };
      }
      
      // Validate personal information (mandatory section)
      if (profileData.personal_information) {
        const personalErrors = await this.validateSection(
          profileData.personal_information, 
          roleSchema.personal_information, 
          'personal_information',
          effectiveRole
        );
        errors.push(...personalErrors);
      } else {
        errors.push({ field: 'personal_information', message: 'Personal information is required' });
      }
      
      // Validate optional sections if provided
      if (profileData.about && roleSchema.about) {
        const aboutErrors = await this.validateSection(
          profileData.about,
          roleSchema.about,
          'about',
          effectiveRole
        );
        errors.push(...aboutErrors);
      }
      
      if (profileData.experience && profileData.experience.length > 0 && roleSchema.experience) {
        if (!Array.isArray(profileData.experience)) {
          errors.push({ field: 'experience', message: 'Experience section must be an array' });
        } else {
          const experienceErrors = await this.validateArraySection(
            profileData.experience,
            roleSchema.experience,
            'experience'
          );
          errors.push(...experienceErrors);
        }
      }
      
      if (profileData.education && profileData.education.length > 0 && roleSchema.education) {
        if (!Array.isArray(profileData.education)) {
          errors.push({ field: 'education', message: 'Education section must be an array' });
        } else {
          const educationErrors = await this.validateArraySection(
            profileData.education,
            roleSchema.education,
            'education'
          );
          errors.push(...educationErrors);
        }
      }
      
      if (profileData.skills && profileData.skills.length > 0 && roleSchema.skills) {
        if (!Array.isArray(profileData.skills)) {
          errors.push({ field: 'skills', message: 'Skills section must be an array' });
        } else {
          if (profileData.skills.length > 50) {
            errors.push({ field: 'skills', message: 'Maximum 50 skills allowed per profile' });
          }
          const skillsErrors = await this.validateArraySection(
            profileData.skills,
            roleSchema.skills,
            'skills'
          );
          errors.push(...skillsErrors);
        }
      }
      
      if (profileData.projects && profileData.projects.length > 0 && roleSchema.projects) {
        if (!Array.isArray(profileData.projects)) {
          errors.push({ field: 'projects', message: 'Projects section must be an array' });
        } else {
          const projectsErrors = await this.validateArraySection(
            profileData.projects,
            roleSchema.projects,
            'projects'
          );
          errors.push(...projectsErrors);
        }
      }
      
      if (profileData.awards && profileData.awards.length > 0 && roleSchema.awards) {
        if (!Array.isArray(profileData.awards)) {
          errors.push({ field: 'awards', message: 'Awards section must be an array' });
        } else {
          const awardsErrors = await this.validateArraySection(
            profileData.awards,
            roleSchema.awards,
            'awards'
          );
          errors.push(...awardsErrors);
        }
      }
      
      if (profileData.certifications && profileData.certifications.length > 0 && roleSchema.certifications) {
        if (!Array.isArray(profileData.certifications)) {
          errors.push({ field: 'certifications', message: 'Certifications section must be an array' });
        } else {
          const certificationsErrors = await this.validateArraySection(
            profileData.certifications,
            roleSchema.certifications,
            'certifications'
          );
          errors.push(...certificationsErrors);
        }
      }
      
      return { valid: errors.length === 0, errors };
      
    } catch (error) {
      console.error('Profile validation error:', error);
      errors.push({ field: 'validation', message: 'Profile validation failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return { valid: false, errors };
    }
  }

  /**
   * Validate a single section against schema rules
   */
  private async validateSection(data: any, sectionSchema: any, sectionName: string, userRole?: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    if (!sectionSchema) {
    return errors;
  }

    for (const [fieldName, rules] of Object.entries(sectionSchema)) {
      const fieldRules = rules as any;
      const fieldValue = data[fieldName];
      const fieldPath = `${sectionName}.${fieldName}`;

      // Check required fields
      if (fieldRules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        errors.push({
          field: fieldPath,
          message: fieldRules.message || `${fieldName} is required`
        });
        continue;
      }

      // Skip validation if field is optional and not provided
      if (!fieldRules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        continue;
      }

      // Validate based on field type
      const fieldErrors = this.validateField(fieldValue, fieldRules, fieldPath);
      errors.push(...fieldErrors);
    }
    
    // Special cross-field validation for education section
    if (sectionName === 'education' && data.start_year && data.end_year) {
      if (data.end_year <= data.start_year) {
        errors.push({
          field: `${sectionName}.end_year`,
          message: 'End year must be after start year'
        });
      }
    }
    
    // Special cross-field validation for experience section
    if (sectionName === 'experience' && data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (endDate <= startDate) {
        errors.push({
          field: `${sectionName}.end_date`,
          message: 'End date must be after start date'
        });
      }
    }
    
    return errors;
  }

  /**
   * Validate array section (experience, education, skills, etc.)
   */
  private async validateArraySection(dataArray: any[], sectionSchema: any, sectionName: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const itemErrors = await this.validateSection(item, sectionSchema, `${sectionName}[${i}]`);
      errors.push(...itemErrors);
    }
    
    return errors;
  }

  /**
   * Validate individual field against its rules
   */
  private validateField(value: any, rules: any, fieldPath: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      // Type-specific validation
      switch (rules.type) {
        case 'text':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be text` });
            break;
          }
          if (rules.min_length && value.length < rules.min_length) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${rules.min_length} characters` });
          }
          if (rules.max_length && value.length > rules.max_length) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${rules.max_length} characters` });
          }
          if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} format is invalid` });
          }
          break;

        case 'email':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be an email` });
            break;
          }
          if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid email` });
          }
          break;

        case 'number':
          if (typeof value !== 'number') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a number` });
            break;
          }
          
          // Handle dynamic min/max values
          let minValue = rules.min;
          let maxValue = rules.max;
          
          if (typeof minValue === 'string') {
            if (minValue === 'current_year') {
              minValue = new Date().getFullYear();
            } else if (minValue === 'start_year') {
              // For end_year validation, we need to get the start_year value
              // This is a limitation - we'd need the parent object to access start_year
              // For now, we'll skip this validation and handle it in a different way
              minValue = undefined;
            }
          }
          
          if (typeof maxValue === 'string') {
            if (maxValue === 'current_year') {
              maxValue = new Date().getFullYear();
            } else if (maxValue === 'current_year_plus_10') {
              maxValue = new Date().getFullYear() + 10;
            }
          }
          
          if (minValue !== undefined && value < minValue) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${minValue}` });
          }
          if (maxValue !== undefined && value > maxValue) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${maxValue}` });
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a boolean` });
          }
          break;

        case 'date':
          // Basic date validation
          if (rules.no_future) {
            const dateValue = new Date(value);
            if (dateValue > new Date()) {
              errors.push({ field: fieldPath, message: rules.message || `${fieldPath} cannot be in the future` });
            }
          }
          break;

        case 'url':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a URL` });
            break;
          }
          try {
            new URL(value);
          } catch {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid URL` });
          }
          break;

        case 'enum':
          if (rules.values) {
            // Normalize value: trim whitespace and handle case-insensitive comparison
            const normalizedValue = typeof value === 'string' ? value.trim() : value;
            const normalizedRules = rules.values.map((v: any) => 
              typeof v === 'string' ? v.trim() : v
            );
            
            // Case-insensitive comparison
            const valueFound = normalizedRules.some((allowedValue: any) => 
              String(allowedValue).toLowerCase() === String(normalizedValue).toLowerCase()
            );
            
            if (!valueFound) {
              const allowedValues = rules.values.join(', ');
              const receivedValue = value !== null && value !== undefined ? String(value) : 'null/undefined';
              errors.push({ 
                field: fieldPath, 
                message: `${rules.message || fieldPath + ' validation failed'}. Allowed values: [${allowedValues}]. Received: "${receivedValue}"` 
              });
            }
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be an array` });
            break;
          }
          if (rules.max_items && value.length > rules.max_items) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must have at most ${rules.max_items} items` });
          }
          break;

        case 'rich_text':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be text` });
            break;
          }
          if (rules.min_length && value.length < rules.min_length) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at least ${rules.min_length} characters` });
          }
          if (rules.max_length && value.length > rules.max_length) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be at most ${rules.max_length} characters` });
          }
          break;

        case 'country_code':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a string` });
            break;
          }
          // Basic ISO 3166-1 alpha-2 country code validation
          const countryCodePattern = /^[A-Z]{2}$/;
          if (!countryCodePattern.test(value)) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a valid ISO 3166-1 country code` });
          }
          break;

        case 'phone':
          if (typeof value !== 'string') {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be a string` });
            break;
          }
          // International phone number validation
          const phonePattern = /^\+?[1-9]\d{1,14}$/;
          if (!phonePattern.test(value)) {
            errors.push({ field: fieldPath, message: rules.message || `${fieldPath} must be in international format` });
          }
          break;
      }
    } catch (error) {
      errors.push({ field: fieldPath, message: 'Validation error occurred' });
    }
    
    return errors;
  }


  /**
   * Get default privacy settings based on user role
   */
  private getDefaultPrivacySettings(userRole: string): PrivacySettings {
    return {
      profile_visibility: 'Connections Only',
      contact_visibility: 'Connections Only',
      experience_visibility: 'Public',
      skills_visibility: true,
      recruiter_contact: userRole === 'professional'
    };
  }

  /**
   * Edit user profile field
   */
  async editProfile(userId: string, fieldData: any, fieldName: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get existing profile
      const existingProfile = await this.getUserProfile(userId);
      if (!existingProfile) {
        throw new Error('User profile not found');
      }
      
      // Get user role for validation
      const roleData = await authService.getUserRole(userId);
      if (!roleData || !roleData.role_name) {
        throw new Error('User role not found');
      }
      
      // Validate the field data
      const validationResult = await this.validateProfileField(fieldData, fieldName, roleData.role_name);
      
      if (!validationResult.valid) {
        const validationError = new Error('Profile field validation failed');
        (validationError as any).validationErrors = validationResult.errors;
        throw validationError;
      }
      
      // Merge the field data with existing profile
      const mergedProfile = await this.mergeJSONBField(existingProfile.profile_data, fieldData, fieldName);
      
      // Update the profile in database
      const result = await this.updateJSONBField(userId, mergedProfile);
      
      await client.query('COMMIT');
      
      return {
        profile_id: existingProfile.user_id,
        user_id: existingProfile.user_id,
        profile_data: mergedProfile,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Profile edit error:', error);
      await client.query('ROLLBACK');
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Profile edit failed');
    } finally {
      client.release();
    }
  }

  /**
   * Normalize profile data to fix double nesting issues
   * Fixes cases where fields like personal_information.personal_information exist
   * This happens when data is incorrectly nested during edits
   */
  private normalizeProfileData(profileData: any): any {
    if (!profileData || typeof profileData !== 'object') {
      return profileData;
    }

    const normalized = { ...profileData };
    let hasDoubleNesting = false;

    // List of fields that might have double nesting issues
    const fieldsToCheck = [
      'personal_information',
      'education',
      'about',
      'experience',
      'skills',
      'projects',
      'certifications',
      'awards'
    ];

    // Fix double nesting for each field
    for (const fieldName of fieldsToCheck) {
      if (normalized[fieldName] && 
          typeof normalized[fieldName] === 'object' && 
          !Array.isArray(normalized[fieldName]) &&
          normalized[fieldName][fieldName]) {
        console.warn(`Fixing double-nested '${fieldName}' in profile data`);
        normalized[fieldName] = normalized[fieldName][fieldName];
        hasDoubleNesting = true;
      }
    }

    // If we found and fixed double nesting, log it for monitoring
    if (hasDoubleNesting) {
      console.warn('Profile data contained double-nested fields and was normalized');
    }

    return normalized;
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<any> {
    const profile = await UserProfileModel.findByUserId(userId);
    if (profile && profile.profile_data) {
      // Normalize profile data to fix any double nesting issues
      const originalData = JSON.stringify(profile.profile_data);
      profile.profile_data = this.normalizeProfileData(profile.profile_data);
      const normalizedData = JSON.stringify(profile.profile_data);
      
      // If normalization changed the data, save it back to fix the database
      if (originalData !== normalizedData) {
        console.log('Saving normalized profile data back to database to fix double nesting');
        // Save asynchronously to avoid blocking the response
        this.updateJSONBField(userId, profile.profile_data).catch(error => {
          console.error('Failed to save normalized profile data:', error);
        });
      }
    }
    return profile;
  }

  /**
   * Get complete user profile (all data)
   * Used when user is viewing their own profile
   */
  async getCompleteUserProfile(userId: string): Promise<any> {
    try {
      const profile = await UserProfileModel.findByUserId(userId);
      if (!profile) {
        return null;
      }

      // Normalize profile data to fix any double nesting issues
      const normalizedProfileData = this.normalizeProfileData(profile.profile_data);

      return {
        id: profile.user_id,
        role: profile.role,
        profile_data: normalizedProfileData,
        privacy_settings: profile.privacy_settings,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };
    } catch (error) {
      console.error('Get complete user profile error:', error);
      throw new Error('Failed to fetch complete user profile');
    }
  }

  /**
   * Get partial user profile (public data only)
   * Used when user is viewing someone else's profile or no auth
   */
  async getPartialUserProfile(userId: string): Promise<any> {
    try {
      const profile = await UserProfileModel.findByUserId(userId);
      if (!profile) {
        return null;
      }

      // Normalize profile data first to fix any double nesting issues
      const normalizedProfileData = this.normalizeProfileData(profile.profile_data);
      
      // Extract only public fields from profile_data
      const profileData = normalizedProfileData || {};
      
      const partialProfileData = {
        visibility_allowed_fields: {
          personal_information: profileData.personal_information || {},
          about: profileData.about || {},
          avatar: profileData.avatar?.fileUrl || null,
          banner: profileData.banner?.fileUrl || null,
          skills: profileData.skills || [],
          projects: profileData.projects || [],
          education: profileData.education || [],
          experience: profileData.experience || []
        }
      };

      // If experience visibility is Connections Only, do not expose partial profile
      if (profile.privacy_settings?.experience_visibility === 'Connections Only' ||
         profile.privacy_settings?.experience_visibility === 'Hidden') {
        if (partialProfileData.visibility_allowed_fields && 'experience' in partialProfileData.visibility_allowed_fields) {
          delete (partialProfileData.visibility_allowed_fields as any).experience;
        }
      }
      if (profile.privacy_settings?.contact_visibility === 'Connections Only' ||
         profile.privacy_settings?.contact_visibility === 'Hidden') {
        if (partialProfileData.visibility_allowed_fields && 'personal_information' in partialProfileData.visibility_allowed_fields) {
          delete (partialProfileData.visibility_allowed_fields as any).personal_information.phone_number;
          delete (partialProfileData.visibility_allowed_fields as any).personal_information.email;
          delete (partialProfileData.visibility_allowed_fields as any).personal_information.postal_code;
        }
      }
      if (profile.privacy_settings?.skills_visibility === false ) {
        if (partialProfileData.visibility_allowed_fields && 'skills' in partialProfileData.visibility_allowed_fields) {
          delete (partialProfileData.visibility_allowed_fields as any).skills;
        }
      }

      return {
        id: profile.user_id,
        role: profile.role,
        profile_data: partialProfileData,
        privacy_settings: profile.privacy_settings,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };
    } catch (error) {
      console.error('Get partial user profile error:', error);
      throw new Error('Failed to fetch partial user profile');
    }
  }

  /**
   * Search profiles by name with a fuzzy ranking fallback
   * - Uses ILIKE in SQL to prefilter results (fast, indexes may apply)
   * - Ranks results by Levenshtein distance in JS for closest matches
   */
  async searchProfiles(searchTerm: string, page = 1, limit = 20, options: ProfileSearchOptions = {}): Promise<ProfileSearchResult> {
    try {
      const sanitizedLimit = Math.min(Math.max(limit, 1), 100);
      const sanitizedPage = Math.max(page, 1);
      const normalizedTerm = (searchTerm || '').trim();

      if (normalizedTerm.length === 0 && options.sort === 'recent') {
        return await this.searchProfilesByRecent(sanitizedPage, sanitizedLimit);
      }

      if (normalizedTerm.length === 0) {
        return {
          results: [],
          page: sanitizedPage,
          limit: sanitizedLimit,
          has_more: false,
          total_candidates: 0
        };
      }

      return await this.searchProfilesByTerm(normalizedTerm, sanitizedPage, sanitizedLimit);
    } catch (error) {
      console.error('Profile search error:', error);
      throw new Error('Failed to search profiles');
    }
  }

  private async searchProfilesByTerm(searchTerm: string, page: number, limit: number): Promise<ProfileSearchResult> {
    const pattern = `%${searchTerm}%`;

    const query = `
      SELECT
        user_id,
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'first_name') AS first_name,
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'last_name') AS last_name,
        jsonb_extract_path_text(profile_data::jsonb, 'avatar', 'fileUrl') AS avatar_url
      FROM "${config.DB_SCHEMA}".user_profiles
      WHERE (
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'first_name') ILIKE $1 OR
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'last_name') ILIKE $1 OR
        (COALESCE(jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'first_name'), '') || ' ' || COALESCE(jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'last_name'), '')) ILIKE $1
      )
      LIMIT $2
    `;

    const prefetch = Math.min(page * limit, 1000);
    const dbResult = await database.query(query, [pattern, prefetch]) as any;
    const rows = (dbResult && dbResult.rows) ? dbResult.rows : [];

    const term = searchTerm.toLowerCase();

    const scored = rows.map((r: any) => {
      const first = (r.first_name || '').toString();
      const last = (r.last_name || '').toString();
      const full = `${first} ${last}`.trim();

      const candidates = [first, last, full].map(s => (s || '').toLowerCase());

      const distances = candidates.map((candidate: string) => this.levenshtein(term, candidate));
      const best = Math.min(...distances);

      return {
        user_id: r.user_id,
        first_name: first || null,
        last_name: last || null,
        avatar_url: r.avatar_url || null,
        score: best
      };
    });

    scored.sort((a: any, b: any) => a.score - b.score);

    const totalCandidates = scored.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems: ProfileSearchItem[] = scored.slice(start, end).map((s: any) => ({
      user_id: s.user_id,
      first_name: s.first_name,
      last_name: s.last_name,
      avatar_url: s.avatar_url
    }));

    const hasMore = end < totalCandidates;

    return {
      results: pageItems,
      page,
      limit,
      has_more: hasMore,
      total_candidates: totalCandidates
    };
  }

  private async searchProfilesByRecent(page: number, limit: number): Promise<ProfileSearchResult> {
    const offset = (page - 1) * limit;

    const recentQuery = `
      SELECT
        user_id,
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'first_name') AS first_name,
        jsonb_extract_path_text(profile_data::jsonb, 'personal_information', 'last_name') AS last_name,
        jsonb_extract_path_text(profile_data::jsonb, 'avatar', 'fileUrl') AS avatar_url,
        created_at
      FROM "${config.DB_SCHEMA}".user_profiles
      ORDER BY created_at DESC
      OFFSET $1
      LIMIT $2
    `;

    const dbResult = await database.query(recentQuery, [offset, limit]) as any;
    const rows = (dbResult && dbResult.rows) ? dbResult.rows : [];

    const items: ProfileSearchItem[] = rows.map((row: any) => ({
      user_id: row.user_id,
      first_name: row.first_name ? row.first_name.toString() : null,
      last_name: row.last_name ? row.last_name.toString() : null,
      avatar_url: row.avatar_url ? row.avatar_url.toString() : null
    }));

    const totalQuery = `SELECT COUNT(*)::int AS total FROM "${config.DB_SCHEMA}".user_profiles`;
    const totalResult = await database.query(totalQuery) as any;
    const totalCount = totalResult?.rows?.[0]?.total ?? items.length;

    const hasMore = offset + items.length < totalCount;

    return {
      results: items,
      page,
      limit,
      has_more: hasMore,
      total_candidates: totalCount
    };
  }

  /**
   * Compute Levenshtein distance between two strings
   */
  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;

    // Use two-row DP to reduce memory and avoid TS undefined issues
  let prev: number[] = new Array(al + 1).fill(0);
  const curr: number[] = new Array(al + 1).fill(0);

  for (let j = 0; j <= al; j++) prev[j] = j;

    for (let i = 1; i <= bl; i++) {
      curr[0] = i;
      for (let j = 1; j <= al; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
  const deletion = (prev[j] ?? 0) + 1;
  const insertion = (curr[j - 1] ?? 0) + 1;
  const substitution = (prev[j - 1] ?? 0) + cost;
        curr[j] = Math.min(deletion, insertion, substitution);
      }
  // copy curr to prev for next iteration
  prev = curr.slice();
  // reset curr for next iteration
  curr.fill(0);
    }

  return prev[al] ?? al;
  }

  /**
   * Validate profile field against schema
   */
  async validateProfileField(fieldData: any, fieldName: string, userRole: string): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];
    
    try {
      // Load schema from database
      const schema = await this.loadProfileSchemaFromDB(userRole);
      
      // Get schema for user role
      const roleSchema = schema.profile_schema?.[userRole];
      
      if (!roleSchema) {
        errors.push({ field: 'role', message: `Invalid user role: ${userRole}` });
        return { valid: false, errors };
      }
      
      // Get the field schema
      const fieldSchema = this.getFieldSchema(roleSchema, fieldName);
      if (!fieldSchema) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' is not allowed for role '${userRole}'` });
        return { valid: false, errors };
      }
      
      // Get the actual field data
      const actualFieldData = fieldData[fieldName];
      
      // Check if field data exists
      if (!actualFieldData) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' data is required` });
        return { valid: false, errors };
      }
      
      // Handle array fields (education, experience, skills, etc.)
      if (Array.isArray(actualFieldData)) {
        const arrayErrors = await this.validateArraySection(actualFieldData, fieldSchema, fieldName);
        errors.push(...arrayErrors);
      } else {
        // Handle single field validation
        const fieldErrors = this.validateField(actualFieldData, fieldSchema, fieldName);
        errors.push(...fieldErrors);
      }
      
      return { valid: errors.length === 0, errors };
      
    } catch (error) {
      console.error('Profile field validation error:', error);
      errors.push({ field: 'validation', message: 'Profile field validation failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return { valid: false, errors };
    }
  }

  /**
   * Get field schema from role schema
   */
  private getFieldSchema(roleSchema: any, fieldName: string): any {
    if (!roleSchema || typeof roleSchema !== 'object') {
      return null;
    }
    
    // Handle nested fields like 'education.degree'
    const fieldParts = fieldName.split('.');
    
    if (fieldParts.length === 1) {
      // Top-level field
      return roleSchema[fieldName];
    } else if (fieldParts.length === 2) {
      // Nested field like 'education.degree'
      const [section, field] = fieldParts;
      if (section && field && roleSchema[section] && typeof roleSchema[section] === 'object') {
        return roleSchema[section][field];
      }
    }
    
    return null;
  }

  /**
   * Merge JSONB field with existing profile data
   */
  async mergeJSONBField(existingProfile: any, newFieldData: any, fieldName: string): Promise<any> {
    try {
      // Deep clone existing profile
      const mergedProfile = JSON.parse(JSON.stringify(existingProfile));
      
      // Merge the new field data
      if (newFieldData[fieldName] !== undefined) {
        const fieldValue = newFieldData[fieldName];
        
        // Handle double nesting issue: if fieldValue is an object with the same key as fieldName,
        // unwrap it (e.g., if personal_information contains { personal_information: {...} })
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue) && fieldValue[fieldName]) {
          console.warn(`Detected double nesting for field '${fieldName}', unwrapping...`);
          mergedProfile[fieldName] = fieldValue[fieldName];
        } else {
          mergedProfile[fieldName] = fieldValue;
        }
      }
      
      return mergedProfile;
    } catch (error) {
      console.error('Profile merge error:', error);
      throw new Error('Failed to merge profile data');
    }
  }

  /**
   * Update JSONB field in database
   */
  async updateJSONBField(userId: string, updatedProfile: any): Promise<any> {
    return await UserProfileModel.updateJSONBField(userId, updatedProfile);
  }

  /**
   * Update user resume data (replaces existing resume)
   * @param userId - User ID
   * @param resumeData - Resume file information
   * @returns Updated profile with resume data
   */
  async updateUserResume(userId: string, resumeData: any): Promise<any> {
    try {
      // Check if profile exists
      const profileExists = await this.checkProfileExists(userId);
      if (!profileExists) {
        throw new Error('User profile not found. Please create a profile first.');
      }

      // Get current profile
      const currentProfile = await this.getUserProfile(userId);
      
      // Clean up profile_data structure and remove duplicates
      let cleanProfileData = currentProfile.profile_data;
      
      // Fix double-nested profile_data structure
      if (cleanProfileData && cleanProfileData.profile_data) {
        cleanProfileData = cleanProfileData.profile_data;
      }
      
      // Remove resume from profile_data if it exists
      if (cleanProfileData && cleanProfileData.resume) {
        delete cleanProfileData.resume;
      }
      
      // Remove duplicate fields from profile_data (these should only be at top level)
      if (cleanProfileData) {
        delete cleanProfileData.user_id;
        delete cleanProfileData.role;
        delete cleanProfileData.created_at;
        delete cleanProfileData.updated_at;
        delete cleanProfileData.privacy_settings;
      }
      
      // Create clean profile structure
      const resume = {
      ...cleanProfileData,
        resume: resumeData,
        privacy_settings: currentProfile.privacy_settings,
      }

      // Update in database
      const result = await this.updateJSONBField(userId, resume);

      console.log(`Resume updated successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('Error updating user resume:', error);
      throw error;
    }
  }

    async updateUserAvatar(userId: string, avatarData: any): Promise<any> {
    try {
      // Check if profile exists
      const profileExists = await this.checkProfileExists(userId);
      if (!profileExists) {
        throw new Error('User profile not found. Please create a profile first.');
      }
      const currentProfile = await this.getUserProfile(userId);
      
      let cleanProfileData = currentProfile.profile_data;
      
      if (cleanProfileData && cleanProfileData.profile_data) {
        cleanProfileData = cleanProfileData.profile_data;
      }

      if (cleanProfileData && cleanProfileData.avatar) {
        delete cleanProfileData.avatar;
      }
      
      // Remove duplicate fields from profile_data (these should only be at top level)
      if (cleanProfileData) {
        delete cleanProfileData.user_id;
        delete cleanProfileData.role;
        delete cleanProfileData.created_at;
        delete cleanProfileData.updated_at;
        delete cleanProfileData.privacy_settings;
      }
      
      const avatar = {
      ...cleanProfileData,
        avatar: avatarData,
        privacy_settings: currentProfile.privacy_settings,
      }

      const result = await this.updateJSONBField(userId, avatar);

      console.log(`User avatar updated successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('Error updating user avatar:', error);
      throw error;
    }
  }

    async updateUserBanner(userId: string, bannerData: any): Promise<any> {
    try {
      // Check if profile exists
      const profileExists = await this.checkProfileExists(userId);
      if (!profileExists) {
        throw new Error('User profile not found. Please create a profile first.');
      }
      const currentProfile = await this.getUserProfile(userId);
      
      let cleanProfileData = currentProfile.profile_data;
      
      if (cleanProfileData && cleanProfileData.profile_data) {
        cleanProfileData = cleanProfileData.profile_data;
      }

      if (cleanProfileData && cleanProfileData.banner) {
        delete cleanProfileData.banner;
      }
      
      // Remove duplicate fields from profile_data (these should only be at top level)
      if (cleanProfileData) {
        delete cleanProfileData.user_id;
        delete cleanProfileData.role;
        delete cleanProfileData.created_at;
        delete cleanProfileData.updated_at;
        delete cleanProfileData.privacy_settings;
      }
    
      const banner ={
        ...cleanProfileData,
        banner: bannerData,
        privacy_settings: currentProfile.privacy_settings,
      }

      const result = await this.updateJSONBField(userId, banner);

      console.log(`User banner updated successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('Error updating user banner:', error);
      throw error;
    }
  }

  /**
   * Remove user avatar (set to null)
   * @param userId - User ID
   * @returns Updated profile
   */
  async removeUserAvatar(userId: string): Promise<any> {
    try {
      // Check if profile exists
      const profileExists = await this.checkProfileExists(userId);
      if (!profileExists) {
        throw new Error('User profile not found. Please create a profile first.');
      }

      const currentProfile = await this.getUserProfile(userId);
      let cleanProfileData = currentProfile.profile_data;
      
      if (cleanProfileData && cleanProfileData.profile_data) {
        cleanProfileData = cleanProfileData.profile_data;
      }

      // Remove avatar from profile data
      if (cleanProfileData && cleanProfileData.avatar) {
        delete cleanProfileData.avatar;
      }

      // Remove duplicate fields from profile_data
      if (cleanProfileData) {
        delete cleanProfileData.user_id;
        delete cleanProfileData.role;
        delete cleanProfileData.created_at;
        delete cleanProfileData.updated_at;
        delete cleanProfileData.privacy_settings;
      }

      const updatedProfile = {
        ...cleanProfileData,
        avatar: null,
        privacy_settings: currentProfile.privacy_settings,
      };

      const result = await this.updateJSONBField(userId, updatedProfile);

      console.log(`User avatar removed successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('Error removing user avatar:', error);
      throw error;
    }
  }

  /**
   * Remove user banner (set to null)
   * @param userId - User ID
   * @returns Updated profile
   */
  async removeUserBanner(userId: string): Promise<any> {
    try {
      // Check if profile exists
      const profileExists = await this.checkProfileExists(userId);
      if (!profileExists) {
        throw new Error('User profile not found. Please create a profile first.');
      }

      const currentProfile = await this.getUserProfile(userId);
      let cleanProfileData = currentProfile.profile_data;
      
      if (cleanProfileData && cleanProfileData.profile_data) {
        cleanProfileData = cleanProfileData.profile_data;
      }

      // Remove banner from profile data
      if (cleanProfileData && cleanProfileData.banner) {
        delete cleanProfileData.banner;
      }

      // Remove duplicate fields from profile_data
      if (cleanProfileData) {
        delete cleanProfileData.user_id;
        delete cleanProfileData.role;
        delete cleanProfileData.created_at;
        delete cleanProfileData.updated_at;
        delete cleanProfileData.privacy_settings;
      }

      const updatedProfile = {
        ...cleanProfileData,
        banner: null,
        privacy_settings: currentProfile.privacy_settings,
      };

      const result = await this.updateJSONBField(userId, updatedProfile);

      console.log(`User banner removed successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('Error removing user banner:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();
export default profileService;
