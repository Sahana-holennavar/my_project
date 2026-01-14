import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { database } from '../config/database';
import { config } from '../config/env';
import ResponseUtil, { ErrorMessages, ValidationError } from '../utils/response';
import { auditLogger } from '../utils/auditLogger';

class AdminController {
  /**
   * Admin login - only allows users with admin role
   * Returns JWT tokens for admin access
   */
  async adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        const errors: ValidationError[] = [];
        if (!email) errors.push({ field: 'email', message: 'Email is required' });
        if (!password) errors.push({ field: 'password', message: 'Password is required' });
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, errors);
        return;
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'email', message: 'Invalid email format' }
        ]);
        return;
      }

      // Get user by email
      const getUserQuery = `SELECT * FROM "${config.DB_SCHEMA}".users WHERE email = $1`;
      const userResult = await database.query(getUserQuery, [email.toLowerCase()]);
      const users = (userResult as any).rows;

      if (users.length === 0) {
        console.log('User not found:', email);
        ResponseUtil.unauthorized(res, 'Invalid email or password');
        return;
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await authService.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        
        // Log failed admin login attempt
        await auditLogger.logAuthEvent(
          'ADMIN_LOGIN_FAILED',
          `Failed admin login attempt for user: ${email}`,
          req,
          user.id
        );

        ResponseUtil.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Verify user is admin
      const adminCheckQuery = `
        SELECT ur.role_id, r.name 
        FROM "${config.DB_SCHEMA}".user_roles ur
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = 'admin'
        LIMIT 1
      `;
      
      const adminResult = await database.query(adminCheckQuery, [user.id]);
      const adminRoles = (adminResult as any).rows;

      if (adminRoles.length === 0) {
        console.log('User does not have admin role:', email);
        
        // Log unauthorized admin login attempt
        await auditLogger.logAuthEvent(
          'ADMIN_LOGIN_DENIED',
          `User without admin role attempted to access admin panel: ${email}`,
          req,
          user.id
        );

        ResponseUtil.forbidden(res, 'Admin access denied - User does not have admin role');
        return;
      }

      // Get user role for token
      const getUserRoleQuery = `
        SELECT r.name 
        FROM "${config.DB_SCHEMA}".user_roles ur
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        LIMIT 1
      `;
      
      const roleResult = await database.query(getUserRoleQuery, [user.id]);
      const userRole = (roleResult as any).rows[0]?.name || 'admin';

      // Generate tokens
      const tokens = authService.generateTokens(user.id, user.email, userRole, req.body.remember_me);

      // Update last login
      const updateLastLoginQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await database.query(updateLastLoginQuery, [user.id]);

      // Log successful admin login
      await auditLogger.logAuthEvent(
        'ADMIN_LOGIN_SUCCESS',
        `Admin user logged in successfully`,
        req,
        user.id
      );

      // Success response
      ResponseUtil.success(res, 'Admin login successful', {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          name: user.name
        }
      });

    } catch (error) {
      console.error('Admin login controller error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get admin dashboard statistics
   * Only accessible to admin users
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Get total users count (excluding admins)
      const userCountQuery = `
        SELECT COUNT(DISTINCT u.id) as count 
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE r.name IS NULL OR r.name != 'admin'
      `;
      const userCountResult = await database.query(userCountQuery);
      const totalUsers = parseInt((userCountResult as any).rows[0].count, 10);

      // Get active users count (excluding admins)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT u.id) as count 
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE u.active = true AND (r.name IS NULL OR r.name != 'admin')
      `;
      const activeUsersResult = await database.query(activeUsersQuery);
      const activeUsers = parseInt((activeUsersResult as any).rows[0].count, 10);

      // Get total companies count
      const companiesCountQuery = `SELECT COUNT(*) as count FROM "${config.DB_SCHEMA}".company_pages`;
      const companiesCountResult = await database.query(companiesCountQuery);
      const totalCompanies = parseInt((companiesCountResult as any).rows[0].count, 10);

      // Get total contests count
      const contestsCountQuery = `SELECT COUNT(*) as count FROM "${config.DB_SCHEMA}".contest`;
      const contestsCountResult = await database.query(contestsCountQuery);
      const totalContests = parseInt((contestsCountResult as any).rows[0].count, 10);

      // Log dashboard access
      await auditLogger.logAuthEvent(
        'ADMIN_DASHBOARD_ACCESSED',
        `Admin accessed dashboard`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Dashboard statistics retrieved', {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          totalCompanies,
          totalContests,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Dashboard stats controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get list of all users (admin only)
   */
  async listAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { page = 1, limit = 10, role, active } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Parse pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;

      // Build dynamic query - Exclude admin users
      let whereClause = `WHERE u.id IS NOT NULL AND (r.name IS NULL OR r.name != 'admin')`;
      const params: any[] = [];

      if (active !== undefined) {
        whereClause += ` AND u.active = $${params.length + 1}`;
        params.push(active === 'true');
      }

      const query = `
        SELECT 
          u.id, 
          u.email, 
          COALESCE(up.first_name || ' ' || up.last_name, u.name) as name,
          u.active,
          u.created_at,
          u.last_login,
          COALESCE(up.profile_pic, u.picture) as picture,
          r.name as role
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        LEFT JOIN "${config.DB_SCHEMA}".user_profile up ON u.id = up.user_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(pageLimit, offset);

      const result = await database.query(query, params);
      const users = (result as any).rows;

      // Get total count
      const countQuery = `SELECT COUNT(DISTINCT u.id) as count FROM "${config.DB_SCHEMA}".users u LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id ${whereClause}`;
      const countParams = params.slice(0, -2);
      const countResult = await database.query(countQuery, countParams);
      const totalCount = parseInt((countResult as any).rows[0].count, 10);

      // Log admin action
      await auditLogger.logAuthEvent(
        'ADMIN_USERS_LIST_VIEWED',
        `Admin viewed users list (page: ${pageNum}, limit: ${pageLimit})`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Users list retrieved', {
        users,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          total: totalCount,
          pages: Math.ceil(totalCount / pageLimit)
        }
      });

    } catch (error) {
      console.error('List users controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get specific user details
   */
  async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { userId } = req.params;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!userId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'userId', message: 'User ID is required' }
        ]);
        return;
      }

      const query = `
        SELECT 
          u.id, 
          u.email, 
          COALESCE(up.first_name || ' ' || up.last_name, u.name) as name,
          u.active,
          u.created_at,
          u.last_login,
          COALESCE(up.profile_pic, u.picture) as picture,
          r.name as role
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        LEFT JOIN "${config.DB_SCHEMA}".user_profile up ON u.id = up.user_id
        WHERE u.id = $1
      `;

      const result = await database.query(query, [userId]);
      const users = (result as any).rows;

      if (users.length === 0) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      const user = users[0];

      // Log admin action
      await auditLogger.logAuthEvent(
        'ADMIN_USER_DETAILS_VIEWED',
        `Admin viewed user details: ${user.email}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'User details retrieved', { user });

    } catch (error) {
      console.error('Get user details controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Deactivate a user account (admin only)
   */
  async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!userId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'userId', message: 'User ID is required' }
        ]);
        return;
      }

      // Prevent self-deactivation
      if (userId === adminId) {
        ResponseUtil.badRequest(res, 'Cannot deactivate your own account');
        return;
      }

      // Check if user exists
      const userQuery = `SELECT id, email FROM "${config.DB_SCHEMA}".users WHERE id = $1`;
      const userResult = await database.query(userQuery, [userId]);
      const users = (userResult as any).rows;

      if (users.length === 0) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      const user = users[0];

      // Deactivate user
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
        RETURNING id, email, active
      `;
      
      const result = await database.query(updateQuery, [userId]);
      const deactivatedUser = (result as any).rows[0];

      // Log admin action
      await auditLogger.logAuthEvent(
        'ADMIN_USER_DEACTIVATED',
        `Admin deactivated user: ${user.email}. Reason: ${reason || 'Not specified'}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'User deactivated successfully', { user: deactivatedUser });

    } catch (error) {
      console.error('Deactivate user controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Reactivate a user account (admin only)
   */
  async reactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { userId } = req.params;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!userId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'userId', message: 'User ID is required' }
        ]);
        return;
      }

      // Check if user exists
      const userQuery = `SELECT id, email FROM "${config.DB_SCHEMA}".users WHERE id = $1`;
      const userResult = await database.query(userQuery, [userId]);
      const users = (userResult as any).rows;

      if (users.length === 0) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      const user = users[0];

      // Reactivate user
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET active = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
        RETURNING id, email, active
      `;
      
      const result = await database.query(updateQuery, [userId]);
      const reactivatedUser = (result as any).rows[0];

      // Log admin action
      await auditLogger.logAuthEvent(
        'ADMIN_USER_REACTIVATED',
        `Admin reactivated user: ${user.email}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'User reactivated successfully', { user: reactivatedUser });

    } catch (error) {
      console.error('Reactivate user controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get audit logs (admin only)
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { page = 1, limit = 20, event_type, user_id } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const offset = (pageNum - 1) * pageLimit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (event_type) {
        whereClause += ` AND event_type = $${params.length + 1}`;
        params.push(event_type);
      }

      if (user_id) {
        whereClause += ` AND user_id = $${params.length + 1}`;
        params.push(user_id);
      }

      const query = `
        SELECT 
          id, 
          event_type, 
          description,
          user_id,
          timestamp,
          ip_address
        FROM "${config.DB_SCHEMA}".audit_log
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(pageLimit, offset);

      const result = await database.query(query, params);
      const logs = (result as any).rows;

      // Log admin action
      await auditLogger.logAuthEvent(
        'ADMIN_AUDIT_LOGS_VIEWED',
        `Admin viewed audit logs`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Audit logs retrieved', {
        logs,
        pagination: {
          page: pageNum,
          limit: pageLimit
        }
      });

    } catch (error) {
      console.error('Get audit logs controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Admin logout - invalidate token
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Log logout event
      await auditLogger.logAuthEvent(
        'ADMIN_LOGOUT',
        `Admin logged out`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Logout successful', {
        message: 'Token invalidated, please remove from client storage'
      });

    } catch (error) {
      console.error('Logout controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'refresh_token', message: 'Refresh token is required' }
        ]);
        return;
      }

      // Verify refresh token
      const decoded = authService.verifyToken(refresh_token);
      
      if (!decoded || !decoded.userId) {
        ResponseUtil.unauthorized(res, 'Invalid refresh token');
        return;
      }

      // Get user info
      const getUserQuery = `SELECT id, email FROM "${config.DB_SCHEMA}".users WHERE id = $1 AND active = true`;
      const userResult = await database.query(getUserQuery, [decoded.userId]);
      const users = (userResult as any).rows;

      if (users.length === 0) {
        ResponseUtil.unauthorized(res, 'User not found or inactive');
        return;
      }

      // Get user role
      const getUserRoleQuery = `
        SELECT r.name 
        FROM "${config.DB_SCHEMA}".user_roles ur
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        LIMIT 1
      `;
      const roleResult = await database.query(getUserRoleQuery, [decoded.userId]);
      const userRole = (roleResult as any).rows[0]?.name || 'user';

      // Generate new access token
      const tokens = authService.generateTokens(decoded.userId, users[0].email, userRole, false);

      // Log token refresh
      await auditLogger.logAuthEvent(
        'ADMIN_TOKEN_REFRESHED',
        `Admin refreshed access token`,
        req,
        decoded.userId
      );

      ResponseUtil.success(res, 'Token refreshed successfully', {
        access_token: tokens.access_token,
        expires_in: tokens.expires_in
      });

    } catch (error) {
      console.error('Refresh token controller error:', error);
      if (error instanceof Error && error.message.includes('jwt')) {
        ResponseUtil.unauthorized(res, 'Invalid or expired refresh token');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Verify token and return user info
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const adminEmail = req.admin?.email;
      const adminRole = req.admin?.role;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Get full user info
      const getUserQuery = `
        SELECT u.id, u.email, u.name, u.active, u.created_at, r.name as role
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE u.id = $1
      `;
      const userResult = await database.query(getUserQuery, [adminId]);
      const users = (userResult as any).rows;

      if (users.length === 0) {
        ResponseUtil.unauthorized(res, 'User not found');
        return;
      }

      const user = users[0];

      ResponseUtil.success(res, 'Token is valid', {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error('Verify token controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get all organizations/business profiles
   */
  async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { page = 1, limit = 10, search } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (search) {
        whereClause += ` AND (LOWER(cp.company_profile_data->>'companyName') LIKE $${params.length + 1} OR LOWER(u.email) LIKE $${params.length + 1})`;
        params.push(`%${(search as string).toLowerCase()}%`);
      }

      const query = `
        SELECT 
          cp.id,
          cp.company_profile_data->>'companyName' as company_name,
          cp.owner_id,
          cp.created_at,
          u.email as owner_email,
          COALESCE(u.name, u.email) as owner_name,
          u.picture as owner_picture,
          (COUNT(DISTINCT cpm.user_id) + 1) as member_count
        FROM "${config.DB_SCHEMA}".company_pages cp
        LEFT JOIN "${config.DB_SCHEMA}".users u ON cp.owner_id = u.id
        LEFT JOIN "${config.DB_SCHEMA}".company_pages_members cpm ON cp.id = cpm.company_page_id
        ${whereClause}
        GROUP BY cp.id, cp.company_profile_data, cp.owner_id, cp.created_at, u.email, u.name, u.picture
        ORDER BY cp.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(pageLimit, offset);

      const result = await database.query(query, params);
      const organizations = (result as any).rows;

      // Get members for each organization
      for (const org of organizations) {
        const membersQuery = `
          SELECT 
            u.id,
            COALESCE(u.name, u.email) as name,
            u.email,
            u.picture,
            cpm.role
          FROM "${config.DB_SCHEMA}".company_pages_members cpm
          LEFT JOIN "${config.DB_SCHEMA}".users u ON cpm.user_id = u.id
          WHERE cpm.company_page_id = $1
          ORDER BY cpm.created_at DESC
          LIMIT 5
        `;
        const membersResult = await database.query(membersQuery, [org.id]);
        const members = (membersResult as any).rows;
        
        // Add owner as first member
        org.members = [
          {
            id: org.owner_id,
            name: org.owner_name,
            email: org.owner_email,
            picture: org.owner_picture,
            role: 'owner'
          },
          ...members
        ];
      }

      const countQuery = `SELECT COUNT(*) as count FROM "${config.DB_SCHEMA}".company_pages cp LEFT JOIN "${config.DB_SCHEMA}".users u ON cp.owner_id = u.id ${whereClause}`;
      const countParams = params.slice(0, -2);
      const countResult = await database.query(countQuery, countParams);
      const totalCount = parseInt((countResult as any).rows[0].count, 10);

      await auditLogger.logAuthEvent(
        'ADMIN_ORGANIZATIONS_LIST_VIEWED',
        `Admin viewed organizations list`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Organizations list retrieved', {
        organizations,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          total: totalCount,
          pages: Math.ceil(totalCount / pageLimit)
        }
      });

    } catch (error) {
      console.error('List organizations controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get organization details by ID
   */
  async getOrganizationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { organizationId } = req.params;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!organizationId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'organizationId', message: 'Organization ID is required' }
        ]);
        return;
      }

      const query = `
        SELECT 
          cp.id,
          cp.company_profile_data->>'companyName' as company_name,
          cp.owner_id,
          cp.company_profile_data->>'description' as description,
          cp.company_profile_data->>'industry' as industry,
          cp.company_profile_data->>'website' as website,
          cp.company_profile_data->>'logoUrl' as logo_url,
          cp.company_profile_data->>'bannerUrl' as banner_url,
          cp.company_profile_data,
          cp.created_at,
          cp.updated_at,
          u.email as owner_email,
          COALESCE(u.name, u.email) as owner_name,
          u.picture as owner_picture,
          (COUNT(DISTINCT cpm.user_id) + 1) as member_count,
          COUNT(DISTINCT j.id) as jobs_count,
          COUNT(DISTINCT posts.id) as posts_count
        FROM "${config.DB_SCHEMA}".company_pages cp
        LEFT JOIN "${config.DB_SCHEMA}".users u ON cp.owner_id = u.id
        LEFT JOIN "${config.DB_SCHEMA}".company_pages_members cpm ON cp.id = cpm.company_page_id
        LEFT JOIN "${config.DB_SCHEMA}".jobs j ON cp.id = j.company_page_id
        LEFT JOIN "${config.DB_SCHEMA}".company_posts posts ON cp.id = posts.company_page_id
        WHERE cp.id = $1
        GROUP BY cp.id, cp.company_profile_data, cp.owner_id, 
                 cp.created_at, cp.updated_at, 
                 u.email, u.name, u.picture
      `;

      const result = await database.query(query, [organizationId]);
      const organizations = (result as any).rows;

      if (organizations.length === 0) {
        ResponseUtil.notFound(res, 'Organization not found');
        return;
      }

      const organization = organizations[0];

      // Get members list
      const membersQuery = `
        SELECT 
          cpm.user_id,
          cpm.role,
          cpm.created_at,
          u.email,
          COALESCE(u.name, u.email) as name,
          u.picture
        FROM "${config.DB_SCHEMA}".company_pages_members cpm
        LEFT JOIN "${config.DB_SCHEMA}".users u ON cpm.user_id = u.id
        WHERE cpm.company_page_id = $1
        ORDER BY cpm.created_at DESC
      `;

      const membersResult = await database.query(membersQuery, [organizationId]);
      const members = (membersResult as any).rows;
      
      // Add owner as first member
      organization.members = [
        {
          user_id: organization.owner_id,
          name: organization.owner_name,
          email: organization.owner_email,
          picture: organization.owner_picture,
          role: 'owner',
          created_at: organization.created_at
        },
        ...members
      ];

      await auditLogger.logAuthEvent(
        'ADMIN_ORGANIZATION_DETAILS_VIEWED',
        `Admin viewed details for organization: ${organizationId}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Organization details retrieved', organization);

    } catch (error) {
      console.error('Get organization details controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get all contests with details
   */
  async listContests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { page = 1, limit = 10, status } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND c.status = $${params.length + 1}`;
        params.push(status);
      }

      const query = `
        SELECT 
          c.id,
          c.title,
          c.description,
          c.created_by as organizer_id,
          c.start_time,
          c.end_time,
          c.status,
          c.created_at,
          u.email as organizer_email,
          COALESCE(u.name, u.email) as organizer_name,
          COUNT(DISTINCT ca.user_id) as submission_count
        FROM "${config.DB_SCHEMA}".contest c
        LEFT JOIN "${config.DB_SCHEMA}".users u ON c.created_by = u.id
        LEFT JOIN "${config.DB_SCHEMA}".contest_answers ca ON c.id = ca.contest_id
        ${whereClause}
        GROUP BY c.id, u.email, u.name
        ORDER BY c.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(pageLimit, offset);

      const result = await database.query(query, params);
      const contests = (result as any).rows;

      const countQuery = `SELECT COUNT(*) as count FROM "${config.DB_SCHEMA}".contest c ${whereClause}`;
      const countParams = params.slice(0, -2);
      const countResult = await database.query(countQuery, countParams);
      const totalCount = parseInt((countResult as any).rows[0].count, 10);

      await auditLogger.logAuthEvent(
        'ADMIN_CONTESTS_LIST_VIEWED',
        `Admin viewed contests list`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Contests list retrieved', {
        contests,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          total: totalCount,
          pages: Math.ceil(totalCount / pageLimit)
        }
      });

    } catch (error) {
      console.error('List contests controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get contest details by ID
   */
  async getContestDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { contestId } = req.params;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!contestId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'contestId', message: 'Contest ID is required' }
        ]);
        return;
      }

      const query = `
        SELECT 
          c.id,
          c.title,
          c.description,
          c.organizer_id,
          c.company_page_id,
          c.start_date,
          c.end_date,
          c.status,
          c.max_participants,
          c.prize,
          c.rules,
          c.banner_url,
          c.created_at,
          c.updated_at,
          u.email as organizer_email,
          u.name as organizer_name,
          cp.company_name,
          COUNT(DISTINCT cr.user_id) as registered_count,
          COUNT(DISTINCT cs.user_id) as submission_count,
          COUNT(DISTINCT CASE WHEN cs.winner = true THEN cs.user_id END) as winner_count
        FROM "${config.DB_SCHEMA}".contests c
        LEFT JOIN "${config.DB_SCHEMA}".users u ON c.organizer_id = u.id
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON c.company_page_id = cp.id
        LEFT JOIN "${config.DB_SCHEMA}".contest_registrations cr ON c.id = cr.contest_id
        LEFT JOIN "${config.DB_SCHEMA}".contest_submissions cs ON c.id = cs.contest_id
        WHERE c.id = $1
        GROUP BY c.id, u.email, u.name, cp.company_name
      `;

      const result = await database.query(query, [contestId]);
      const contests = (result as any).rows;

      if (contests.length === 0) {
        ResponseUtil.notFound(res, 'Contest not found');
        return;
      }

      const contest = contests[0];

      // Get questions for the contest
      const questionsQuery = `
        SELECT 
          id,
          question_text,
          question_type,
          options,
          required,
          display_order
        FROM "${config.DB_SCHEMA}".contest_questions
        WHERE contest_id = $1
        ORDER BY display_order ASC
      `;

      const questionsResult = await database.query(questionsQuery, [contestId]);
      contest.questions = (questionsResult as any).rows;

      await auditLogger.logAuthEvent(
        'ADMIN_CONTEST_DETAILS_VIEWED',
        `Admin viewed details for contest: ${contestId}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Contest details retrieved', contest);

    } catch (error) {
      console.error('Get contest details controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get registered users for a specific contest
   */
  async getContestRegisteredUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { contestId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!contestId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'contestId', message: 'Contest ID is required' }
        ]);
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const offset = (pageNum - 1) * pageLimit;

      const query = `
        SELECT 
          ca.id as answer_id,
          ca.user_id,
          ca.submitted_at,
          u.email,
          COALESCE(up.first_name || ' ' || up.last_name, u.name, ca.user_info->>'name', u.email) as name,
          ca.id as submission_id,
          ca.winner,
          ca.answer,
          COALESCE(up.profile_pic, u.picture) as picture
        FROM "${config.DB_SCHEMA}".contest_answers ca
        LEFT JOIN "${config.DB_SCHEMA}".users u ON ca.user_id = u.id
        LEFT JOIN "${config.DB_SCHEMA}".user_profile up ON ca.user_id = up.user_id
        WHERE ca.contest_id = $1
        ORDER BY ca.submitted_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await database.query(query, [contestId, pageLimit, offset]);
      const participants = (result as any).rows;

      const countQuery = `SELECT COUNT(*) as count FROM "${config.DB_SCHEMA}".contest_answers WHERE contest_id = $1`;
      const countResult = await database.query(countQuery, [contestId]);
      const totalCount = parseInt((countResult as any).rows[0].count, 10);

      await auditLogger.logAuthEvent(
        'ADMIN_CONTEST_REGISTRATIONS_VIEWED',
        `Admin viewed registrations for contest: ${contestId}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Contest participants retrieved', {
        contest_id: contestId,
        participants,
        pagination: {
          page: pageNum,
          limit: pageLimit,
          total: totalCount,
          pages: Math.ceil(totalCount / pageLimit)
        }
      });

    } catch (error) {
      console.error('Get contest registrations controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get submission answers for a specific contest and user
   */
  async getContestUserAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { contestId, userId } = req.params;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      if (!contestId || !userId) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'contestId', message: 'Contest ID is required' },
          { field: 'userId', message: 'User ID is required' }
        ]);
        return;
      }

      const query = `
        SELECT 
          ca.id as submission_id,
          ca.contest_id,
          ca.user_id,
          ca.answer,
          ca.submitted_at,
          ca.winner,
          ca.user_info,
          ca.has_profile,
          c.title as contest_title,
          c.problem_statement,
          u.email,
          COALESCE(u.name, u.email) as name
        FROM "${config.DB_SCHEMA}".contest_answers ca
        LEFT JOIN "${config.DB_SCHEMA}".contest c ON ca.contest_id = c.id
        LEFT JOIN "${config.DB_SCHEMA}".users u ON ca.user_id = u.id
        WHERE ca.contest_id = $1 AND ca.user_id = $2
      `;

      const result = await database.query(query, [contestId, userId]);
      const submissions = (result as any).rows;

      if (submissions.length === 0) {
        ResponseUtil.notFound(res, 'Submission not found for this user and contest');
        return;
      }

      const submission = submissions[0];

      await auditLogger.logAuthEvent(
        'ADMIN_CONTEST_SUBMISSION_VIEWED',
        `Admin viewed submission for contest: ${contestId}, user: ${userId}`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Contest submission retrieved', {
        submission: {
          id: submission.submission_id,
          contest_id: submission.contest_id,
          contest_title: submission.contest_title,
          user: {
            id: submission.user_id,
            email: submission.email,
            name: submission.name
          },
          problem_statement: submission.problem_statement,
          answer: submission.answer,
          user_info: submission.user_info,
          has_profile: submission.has_profile,
          submitted_at: submission.submitted_at,
          winner: submission.winner
        }
      });

    } catch (error) {
      console.error('Get contest user answers controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Export users to CSV
   */
  async exportUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { active, role } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      let whereClause = `WHERE u.id IS NOT NULL AND (r.name IS NULL OR r.name != 'admin')`;
      const params: any[] = [];

      if (active !== undefined) {
        whereClause += ` AND u.active = $${params.length + 1}`;
        params.push(active === 'true');
      }

      if (role) {
        whereClause += ` AND r.name = $${params.length + 1}`;
        params.push(role);
      }

      const query = `
        SELECT 
          u.id, 
          u.email, 
          u.name,
          u.active,
          u.provider,
          u.created_at,
          u.last_login,
          COALESCE(r.name, 'user') as role
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_roles ur ON u.id = ur.user_id
        LEFT JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
      `;

      const result = await database.query(query, params);
      const users = (result as any).rows;

      // Convert to CSV
      const csvHeader = 'ID,Email,Name,Active,Provider,Role,Created At,Last Login\n';
      const csvRows = users.map((user: any) => {
        return [
          user.id,
          user.email,
          user.name || '',
          user.active,
          user.provider || 'local',
          user.role,
          user.created_at,
          user.last_login || ''
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      await auditLogger.logAuthEvent(
        'ADMIN_USERS_EXPORTED',
        `Admin exported ${users.length} users`,
        req,
        adminId
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
      res.send(csv);

    } catch (error) {
      console.error('Export users controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Export contests to CSV
   */
  async exportContests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { status } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND c.status = $${params.length + 1}`;
        params.push(status);
      }

      const query = `
        SELECT 
          c.id,
          c.title,
          c.description,
          c.status,
          c.start_time,
          c.end_time,
          c.created_at,
          u.email as organizer_email,
          COALESCE(u.name, u.email) as organizer_name,
          COUNT(DISTINCT ca.user_id) as submission_count
        FROM "${config.DB_SCHEMA}".contest c
        LEFT JOIN "${config.DB_SCHEMA}".users u ON c.created_by = u.id
        LEFT JOIN "${config.DB_SCHEMA}".contest_answers ca ON c.id = ca.contest_id
        ${whereClause}
        GROUP BY c.id, u.email, u.name
        ORDER BY c.created_at DESC
      `;

      const result = await database.query(query, params);
      const contests = (result as any).rows;

      const csvHeader = 'ID,Title,Description,Status,Start Time,End Time,Organizer Email,Organizer Name,Submissions,Created At\n';
      const csvRows = contests.map((contest: any) => {
        return [
          contest.id,
          `"${contest.title || ''}"`,
          `"${(contest.description || '').substring(0, 100)}"`,
          contest.status,
          contest.start_time || '',
          contest.end_time || '',
          contest.organizer_email || '',
          contest.organizer_name || '',
          contest.submission_count || 0,
          contest.created_at
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      await auditLogger.logAuthEvent(
        'ADMIN_CONTESTS_EXPORTED',
        `Admin exported ${contests.length} contests`,
        req,
        adminId
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contests_export_${Date.now()}.csv"`);
      res.send(csv);

    } catch (error) {
      console.error('Export contests controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get dashboard analytics with time-series data
   */
  async getDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin?.userId;
      const { days = 30 } = req.query;

      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      const daysCount = Math.min(365, Math.max(7, parseInt(days as string, 10) || 30));

      // User registration trends
      const userTrendsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "${config.DB_SCHEMA}".users
        WHERE created_at >= NOW() - INTERVAL '${daysCount} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // Contest creation trends
      const contestTrendsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "${config.DB_SCHEMA}".contest
        WHERE created_at >= NOW() - INTERVAL '${daysCount} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // Organization creation trends
      const orgTrendsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE created_at >= NOW() - INTERVAL '${daysCount} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const [userTrends, contestTrends, orgTrends] = await Promise.all([
        database.query(userTrendsQuery),
        database.query(contestTrendsQuery),
        database.query(orgTrendsQuery)
      ]);

      await auditLogger.logAuthEvent(
        'ADMIN_ANALYTICS_VIEWED',
        `Admin viewed dashboard analytics (${daysCount} days)`,
        req,
        adminId
      );

      ResponseUtil.success(res, 'Dashboard analytics retrieved', {
        period: {
          days: daysCount,
          start_date: new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        },
        trends: {
          user_registrations: (userTrends as any).rows,
          contest_creation: (contestTrends as any).rows,
          organization_creation: (orgTrends as any).rows
        }
      });

    } catch (error) {
      console.error('Dashboard analytics controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
