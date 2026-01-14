import { config } from '../config/env';
import { database } from '../config/database';
import bcrypt from 'bcryptjs';
import { ValidationError } from '../utils/response';

class UserService {
  /**
   * Find user by email
   * Comment: Required for password reset functionality
   */
  async findUserByEmail(email: string): Promise<any> {
    try {
      const query = `
        SELECT u.id, u.email, u.password_hash, u.active, up.role, up.profile_data
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
        WHERE u.email = $1
      `;
      const result = await database.query(query, [email.toLowerCase()]) as any;
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('User lookup error:', error);
      throw new Error('Database error during user lookup');
    }
  }

  /**
   * Update user password
   * Comment: Required for password reset functionality
   */
  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await database.query(query, [hashedPassword, userId]);
    } catch (error) {
      console.error('Password update error:', error);
      throw new Error('Database error during password update');
    }
  }

  /**
   * Validate deactivation request
   * Comment: Required for account deactivation functionality
   */
  validateDeactivationRequest(body: any): ValidationError[] {
    const { active } = body;
    const errors: ValidationError[] = [];

    // Check if active field exists
    if (active === undefined || active === null) {
      errors.push({ 
        field: 'active', 
        message: 'Field \'active\' is required and must be \'false\'' 
      });
      return errors;
    }

    // Validate active field value
    if (active !== 'false') {
      errors.push({ 
        field: 'active', 
        message: 'Field \'active\' must be \'false\' for deactivation' 
      });
    }

    return errors;
  }

  /**
   * Deactivate user account
   * Comment: Required for account deactivation functionality
   */
  async deactivateUserService(userId: string): Promise<any> {
    try {
      // First, check if user exists and is currently active
      const userQuery = `
        SELECT u.id, u.email, u.active
        FROM "${config.DB_SCHEMA}".users u
        WHERE u.id = $1
      `;
      const userResult = await database.query(userQuery, [userId]) as any;
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      if (!user.active) {
        throw new Error('User account is already deactivated');
      }

      // Update user to deactivated
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, active
      `;
      const updateResult = await database.query(updateQuery, [userId]) as any;
      
      const updatedUser = updateResult.rows[0];
      
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        active: updatedUser.active,
        deactivatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('User deactivation error:', error);
      throw new Error('Database error during user deactivation');
    }
  }

  /**
   * Get user profile information (name and avatar) for socket notifications
   */
  async getUserProfileInfo(userId: string): Promise<{ firstName: string | null; lastName: string | null; avatar: string | null }> {
    try {
      const query = `
        SELECT 
          up.profile_data->'personal_information'->>'first_name' AS first_name,
          up.profile_data->'personal_information'->>'last_name' AS last_name,
          up.profile_data->'avatar'->>'fileUrl' AS avatar
        FROM "${config.DB_SCHEMA}".user_profiles up
        WHERE up.user_id = $1
      `;
      const result = await database.query(query, [userId]) as any;
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          firstName: row.first_name || null,
          lastName: row.last_name || null,
          avatar: row.avatar || null
        };
      }
      // Return null values if profile not found
      return {
        firstName: null,
        lastName: null,
        avatar: null
      };
    } catch (error) {
      console.error('Error fetching user profile info:', error);
      // Return null values on error - don't break the notification flow
      return {
        firstName: null,
        lastName: null,
        avatar: null
      };
    }
  }

  async getUserCompanyPagesService(
    userId: string,
    page: number = 1,
    limit: number = 10,
    roleFilter: string = 'all',
    includeInactive: boolean = false,
    profileId?: string
  ): Promise<any> {
    try {
      // If role is 'none', fetch public company page by profileId
      if (roleFilter === 'none' && profileId) {
        return await this.getPublicCompanyPageService(profileId, page, limit);
      }
      const offset = (page - 1) * limit;
      let params: any[] = [userId];
      let paramIndex = 2;

      // Build conditions for member pages
      let memberWhereConditions = ['cpm.user_id = $1'];
      
      if (roleFilter && roleFilter !== 'all') {
        params.push(roleFilter);
        memberWhereConditions.push(`cpm.role = $${paramIndex}`);
        paramIndex++;
      }

      // Build conditions for owner pages (always include owner role)
      let ownerWhereConditions = ['cp.owner_id = $1'];
      
      // Add active filter for both queries
      const activeCondition = includeInactive ? '' : 'cp.is_active = true';

      const memberWhereClause = memberWhereConditions.join(' AND ') + (activeCondition ? ` AND ${activeCondition}` : '');
      const ownerWhereClause = ownerWhereConditions.join(' AND ') + (activeCondition ? ` AND ${activeCondition}` : '');

      // UNION query to get both member pages and owned pages
      const query = `
        (
          SELECT 
            cp.id as profile_id,
            cp.company_profile_data,
            cp.is_active,
            cpm.role,
            cpm.created_at as joined_at,
            cpm.updated_at as last_active,
            'member' as source_type
          FROM "${config.DB_SCHEMA}".company_pages_members cpm
          INNER JOIN "${config.DB_SCHEMA}".company_pages cp ON cpm.company_page_id = cp.id
          WHERE ${memberWhereClause}
        )
        UNION
        (
          SELECT 
            cp.id as profile_id,
            cp.company_profile_data,
            cp.is_active,
            'owner' as role,
            cp.created_at as joined_at,
            cp.updated_at as last_active,
            'owner' as source_type
          FROM "${config.DB_SCHEMA}".company_pages cp
          WHERE ${ownerWhereClause}
        )
        ORDER BY joined_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result: any = await database.query(query, params);

      // Count query also needs UNION
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          (
            SELECT cp.id
            FROM "${config.DB_SCHEMA}".company_pages_members cpm
            INNER JOIN "${config.DB_SCHEMA}".company_pages cp ON cpm.company_page_id = cp.id
            WHERE ${memberWhereClause}
          )
          UNION
          (
            SELECT cp.id
            FROM "${config.DB_SCHEMA}".company_pages cp
            WHERE ${ownerWhereClause}
          )
        ) as combined_results
      `;
      const countParams = params.slice(0, params.length - 2);
      const countResult: any = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_companies,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_roles,
          COUNT(CASE WHEN role = 'editor' THEN 1 END) as editor_roles,
          COUNT(CASE WHEN role = 'owner' THEN 1 END) as owner_roles,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_companies
        FROM (
          (
            SELECT cpm.role, cp.is_active
            FROM "${config.DB_SCHEMA}".company_pages_members cpm
            INNER JOIN "${config.DB_SCHEMA}".company_pages cp ON cpm.company_page_id = cp.id
            WHERE cpm.user_id = $1
          )
          UNION
          (
            SELECT 'owner' as role, cp.is_active
            FROM "${config.DB_SCHEMA}".company_pages cp
            WHERE cp.owner_id = $1
          )
        ) as all_pages
      `;
      const summaryResult: any = await database.query(summaryQuery, [userId]);
      const summary = summaryResult.rows[0];

      const companyPages = result.rows.map((row: any) => {
        const companyData = typeof row.company_profile_data === 'string'
          ? JSON.parse(row.company_profile_data)
          : row.company_profile_data;

        const profileName = companyData.companyName || companyData.company_name || 'Unknown Company';
        const logo = companyData.avatar?.fileUrl || companyData.companyLogo?.fileUrl || undefined;
        const banner = companyData.banner?.fileUrl || undefined;
        const industry = companyData.industry || undefined;
        const description = companyData.about?.description || undefined;
        const company_type = companyData.company_type || undefined;
        const company_size =companyData.about?.employees || companyData.company_size || undefined;
        const primary_email = companyData?.primary_email || undefined;
        const company_website = companyData.company_website || undefined;
        const additional_emails = companyData.additional_email || undefined;
        const additional_phone_numbers = companyData.additional_phone_number || undefined;

        return {
          profileId: row.profile_id,
          profileName,
          businessName: profileName,
          company_type,
          company_size,
          logo,
          banner,
          industry,
          description,
          company_website,
          primary_email,
          additional_emails,
          additional_phone_numbers,
          role: row.role,
          isActive: row.is_active,
          joinedAt: row.joined_at,
          lastActive: row.last_active,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        companyPages,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        summary: {
          totalCompanies: parseInt(summary.total_companies, 10),
          adminRoles: parseInt(summary.admin_roles, 10),
          editorRoles: parseInt(summary.editor_roles, 10),
          ownerRoles: parseInt(summary.owner_roles, 10),
          activeCompanies: parseInt(summary.active_companies, 10),
        },
      };
    } catch (error) {
      console.error('Get user company pages error:', error);
      throw new Error('Database error during company pages retrieval');
    }
  }

  async getPublicCompanyPageService(
    profileId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      // Query to get the specific company page by profileId (only active pages)
      const query = `
        SELECT 
          cp.id as profile_id,
          cp.company_profile_data,
          cp.is_active,
          'none' as role,
          cp.created_at as joined_at,
          cp.updated_at as last_active,
          'public' as source_type
        FROM "${config.DB_SCHEMA}".company_pages cp
        WHERE cp.id = $1 AND cp.is_active = true
        LIMIT $2 OFFSET $3
      `;

      const result: any = await database.query(query, [profileId, limit, offset]);

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "${config.DB_SCHEMA}".company_pages cp
        WHERE cp.id = $1 AND cp.is_active = true
      `;
      const countResult: any = await database.query(countQuery, [profileId]);
      const total = parseInt(countResult.rows[0].total, 10);

      const companyPages = result.rows.map((row: any) => {
        const companyData = typeof row.company_profile_data === 'string'
          ? JSON.parse(row.company_profile_data)
          : row.company_profile_data;

        const profileName = companyData.companyName || companyData.company_name || 'Unknown Company';
        const logo = companyData.avatar?.fileUrl || companyData.companyLogo?.fileUrl || undefined;
        const banner = companyData.banner?.fileUrl || undefined;
        const industry = companyData.industry || undefined;
        const description = companyData.about?.description || undefined;
        const company_type = companyData.company_type || undefined;
        const company_size = companyData.about?.employees || companyData.company_size || undefined;
        const primary_email = companyData?.primary_email || undefined;
        const company_website = companyData.company_website || undefined;
        const additional_emails = companyData.additional_email || undefined;
        const additional_phone_numbers = companyData.additional_phone_number || undefined;

        return {
          profileId: row.profile_id,
          profileName,
          businessName: profileName,
          company_type,
          company_size,
          logo,
          banner,
          industry,
          description,
          company_website,
          primary_email,
          additional_emails,
          additional_phone_numbers,
          isActive: row.is_active,
          joinedAt: row.joined_at,
          lastActive: row.last_active,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        companyPages,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        summary: {
          totalCompanies: total,
          adminRoles: 0,
          editorRoles: 0,
          ownerRoles: 0,
          activeCompanies: total,
        },
      };
    } catch (error) {
      console.error('Get public company page error:', error);
      throw new Error('Database error during public company page retrieval');
    }
  }
}

export const userService = new UserService();
export default userService;
