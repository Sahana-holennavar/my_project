import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { database } from '../config/database';
import { 
  RegisterUserData, 
  RegisterUserResponse,
  LoginUserData,
  LoginUserResponse,
  Role,
  AuthTokens,
  OAuthUserData,
  UserRecord,
} from '../models/User';
import { CreateSessionData } from '../models/Session';

class AuthService {
  /**
   * Hash password using bcrypt
   * Comment: Essential for user registration security
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = config.BCRYPT_SALT_ROUNDS;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password using bcrypt
   * Comment: Required for login authentication
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      throw new Error('Password verification failed');
    }
  }

  /**
   * Generate JWT tokens for authentication
   * Comment: Required for login response as per ticket API requirements
   */
  generateTokens(userId: string, email: string, role: string, rememberMe: boolean = false): AuthTokens {
    try {
      const payload = { userId, email, role };

      const accessToken = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: '1h', // Access token expires in 1 hour
        issuer: 'b2b-server',
        audience: 'b2b-client',
      } as SignOptions);

      const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: '30d',
        issuer: 'b2b-server', 
        audience: 'b2b-client',
      } as SignOptions);

      // Calculate expiry time in seconds
      const decoded = jwt.decode(accessToken) as any;
      const expirationTime = decoded ? (decoded.exp - decoded.iat) : 3600;

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expirationTime
      };
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify JWT token and return decoded payload
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  /**
   * Check if email already exists
   * Comment: Required to prevent duplicate emails as per ticket test cases
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const query = `SELECT id FROM "${config.DB_SCHEMA}".users WHERE email = $1`;
      const result = await database.query(query, [email.toLowerCase()]);
      return (result as any).rows.length > 0;
    } catch (error) {
      console.error('Email check error:', error);
      throw new Error('Database error during email check');
    }
  }

  /**
   * Get role by name for user assignment
   * Comment: Required to assign user roles during registration
   */
  async getRoleByName(roleName: string): Promise<Role | null> {
    try {
      const query = `SELECT * FROM "${config.DB_SCHEMA}".roles WHERE name = $1`;
      const result = await database.query(query, [roleName]);
      
      if ((result as any).rows.length > 0) {
        return (result as any).rows[0];
      }
      return null;
    } catch (error) {
      console.error('Role lookup error:', error);
      throw new Error('Database error during role lookup');
    }
  }

  /**
   * Get all roles available in the roles table
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const query = `SELECT * FROM "${config.DB_SCHEMA}".roles ORDER BY name ASC`;
      const result = await database.query(query);
      return (result as any).rows;
    } catch (error) {
      console.error('Get all roles error:', error);
      throw new Error('Database error during fetching roles');
    }
  }

  /**
   * Get user's assigned role
   */
  async getUserRole(userId: string): Promise<any> {
    try {
      const query = `
        SELECT ur.user_id, ur.role_id, r.name as role_name
        FROM "${config.DB_SCHEMA}".user_roles ur
        JOIN "${config.DB_SCHEMA}".roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;
      const result = await database.query(query, [userId]);
      
      if ((result as any).rows.length > 0) {
        return (result as any).rows[0];
      }
      return null;
    } catch (error) {
      console.error('Get user role error:', error);
      
      // In development mode, if database fails, return null (no role assigned yet)
      if (config.NODE_ENV === 'development' && error instanceof Error && error.message.includes('Connection')) {
        console.warn('Database unavailable, returning null for development');
        return null;
      }
      
      throw new Error('Database error during fetching user role');
    }
  }

  /**
   * Assign or update role for a user. Checks role existence then upserts into user_roles.
   */
  async assignOrUpdateUserRole(userId: string, roleName: string): Promise<any> {
    try {
      const client = await database.getClient();

      try {
        await client.query('BEGIN');

        // Check user exists
        const userQuery = `SELECT id, email FROM "${config.DB_SCHEMA}".users WHERE id = $1`;
        const userResult = await client.query(userQuery, [userId]);
        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        // Check role exists
        const role = await this.getRoleByName(roleName);
        if (!role) {
          throw new Error(`Role '${roleName}' not found`);
        }

        // Update existing role assignment first
        const updateQuery = `
          UPDATE "${config.DB_SCHEMA}".user_roles
          SET role_id = $1
          WHERE user_id = $2
          RETURNING user_id, role_id
        `;
        const updateResult = await client.query(updateQuery, [role.id, userId]);

        if (updateResult.rows.length > 0) {
          await client.query('COMMIT');
          return updateResult.rows[0];
        }

        // If no existing row was updated, insert a new one
        const insertQuery = `
          INSERT INTO "${config.DB_SCHEMA}".user_roles (user_id, role_id)
          VALUES ($1, $2)
          RETURNING user_id, role_id
        `;
        const insertResult = await client.query(insertQuery, [userId, role.id]);

        await client.query('COMMIT');
        return insertResult.rows[0];
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // Ignore rollback errors
        }
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Assign/update user role error:', error);
      
      // In development mode, if database fails, return mock success response
      if (config.NODE_ENV === 'development' && error instanceof Error && error.message.includes('Connection')) {
        console.warn('Database unavailable, returning mock role assignment for development');
        return {
          user_id: userId,
          role_id: 1,
          role_name: roleName
        };
      }
      
      if (error instanceof Error) throw error;
      throw new Error('Failed to assign/update role');
    }
  }

  /**
   * Find user by email for login
   * Comment: Required for login authentication with grace period handling
   */
  async findUserByEmail(email: string): Promise<any> {
    try {
      const query = `

        SELECT u.id, u.email, u.password_hash, u.active, u.deleted_at, u.provider, u.provider_id, u.tutorial_status, up.role, up.profile_data
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
        WHERE u.email = $1
      `;
      const result = await database.query(query, [email.toLowerCase()]) as any;
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // Handle grace period logic for deleted accounts
        if (user.deleted_at) {
          const deletedAt = new Date(user.deleted_at);
          const now = new Date();
          const daysDiff = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 30) {
            // Within grace period - restore account and remove deleted_at
            console.log('User within grace period, restoring account...');
            const restoreQuery = `
              UPDATE "${config.DB_SCHEMA}".users 
              SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `;
            await database.query(restoreQuery, [user.id]);
            
            // Remove deleted_at from user object
            user.deleted_at = null;
            console.log('Account restored successfully');
          } else {
            // Beyond grace period - treat as user not found
            console.log('User beyond grace period, treating as not found');
            return null;
          }
        }
        
        return user;
      }
      return null;
    } catch (error) {
      console.error('User lookup error:', error);
      throw new Error('Database error during user lookup');
    }
  }

  /**
   * Create session for user
   * Comment: Required for session tracking as per ticket requirements
   */
  async createSession(sessionData: CreateSessionData): Promise<void> {
    try {
      const query = `
        INSERT INTO "${config.DB_SCHEMA}".auth_sessions (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `;
      await database.query(query, [
        sessionData.user_id,
        sessionData.token,
        sessionData.expires_at
      ]);
    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
* Reactivate user account
* Comment: Required for automatic reactivation during login
*/
  async reactivateUser(userId: string): Promise<void> {
    try {
      const query = `
  UPDATE "${config.DB_SCHEMA}".users 
  SET active = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  `;
      await database.query(query, [userId]);
    } catch (error) {
      console.error('User reactivation error:', error);
      throw new Error('Failed to reactivate user account');
    }
  } 
   
  /**
   * Register a new user - main registration logic
   * Comment: Core function implementing ticket requirements - simplified to basic user creation only
   */
  async registerUser(userData: RegisterUserData): Promise<RegisterUserResponse> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const { email, password } = userData;

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Query for existing users with that email (only select columns that exist in the schema)
      const existingUserQuery = `
        SELECT id, deleted_at, active, updated_at
        FROM "${config.DB_SCHEMA}".users
        WHERE email = $1
      `;
      const existingUserResult = await client.query(existingUserQuery, [normalizedEmail]);

      if (existingUserResult.rows.length > 0) {
        const rows = existingUserResult.rows;

        // CRITICAL: Check if ANY row is active (active=true AND deleted_at is NULL)
        const anyActive = rows.some((r: any) => {
          // User is active if: active column is true AND deleted_at is null/missing
          const isActive = (r.active === true) && (r.deleted_at === null || r.deleted_at === undefined);
          return isActive;
        });

        if (anyActive) {
          // At least one active user exists with this email -> reject immediately
          throw new Error('Email already exists');
        }

        // All rows are soft-deleted (deleted_at is set). 
        // Now verify that ALL rows are truly soft-deleted AND at least one is old enough (>=30 days)
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        
        let allSoftDeleted = true;
        let hasEligibleRow = false;

        for (const r of rows) {
          // Double-check: if deleted_at is missing/null, this row is NOT soft-deleted
          if (!r.deleted_at) {
            allSoftDeleted = false;
            break;
          }

          // Calculate days since deletion
          const days = Math.floor((now.getTime() - new Date(r.deleted_at).getTime()) / msPerDay);
          if (days >= 30) {
            hasEligibleRow = true;
          }
        }

        // Reject if not all rows are soft-deleted OR if none are old enough
        if (!allSoftDeleted || !hasEligibleRow) {
          throw new Error('Email already exists');
        }

        // All rows are soft-deleted AND at least one is >=30 days old
        // -> Allow creating a new user row (do NOT reactivate old rows)
        console.log(`Email ${normalizedEmail} has ${rows.length} soft-deleted row(s), all eligible for re-registration`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);
      // Insert new user row
      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".users (email, password_hash, active, two_factor)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email
      `;
      const insertValues = [normalizedEmail, passwordHash, true, false];
      const insertResult = await client.query(insertQuery, insertValues);
      const newUser = insertResult.rows[0];

      if (!newUser) throw new Error('Failed to create user');

      await client.query('COMMIT');

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Registration error:', error);
      if (error instanceof Error) throw error;
      throw new Error('Registration failed');
    } finally {
      client.release();
    }
  }

  /**
   * Login user - main login logic
   * Comment: Core function implementing ticket requirements
   */
  async loginUser(loginData: LoginUserData): Promise<LoginUserResponse> {
    try {
      console.log('Starting user login for:', loginData.email);
      
      const { email, password, remember_me } = loginData;
      
      // Find user by email
      console.log('Looking up user by email...');
      const user = await this.findUserByEmail(email);
      
      // Single validation block
      const validations = [
        { condition: !user, error: 'Invalid credentials' },
        { condition: user && !user.password_hash, error: 'This account was created with Google authentication. Please use "Sign in with Google" or set a password first.' }
        // Note: Removed inactive user check - reactivation will be handled after password verification
      ];

      // Execute validations
      const validationError = validations.find(v => v.condition);
      if (validationError) {
        throw new Error(validationError.error);
      }
      
      // Verify password
      console.log('Verifying password...');
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Handle account reactivation if user was deactivated (AFTER password verification)
      if (!user.active) {
        console.log('User account is deactivated, reactivating...');
        await this.reactivateUser(user.id);
        console.log('User account reactivated successfully');
      }
      
      console.log('Password verified, generating tokens...');
      
      // Generate tokens
      const tokens = this.generateTokens(user.id, user.email, user.role, remember_me);
      
      // Create session
      console.log('Creating session...');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
      
      await this.createSession({
        user_id: user.id,
        token: tokens.refresh_token,
        expires_at: expiresAt
      });
      
      console.log('Login successful');
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tutorial_status: user.tutorial_status || 'incomplete'
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      
      // Single error handling
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Delete user account (soft delete with 30-day grace period)
   * Comment: Implements account deletion with soft delete and session cleanup
   */
  async deleteAccountService(userId: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      console.log('Starting account deletion for user:', userId);
      await client.query('BEGIN');
      
      // First, check if user exists
      const userQuery = `
        SELECT u.id, u.email, u.deleted_at
        FROM "${config.DB_SCHEMA}".users u
        WHERE u.id = $1
      `;
      const userResult = await client.query(userQuery, [userId]) as any;
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      // Check if user is already deleted
      if (user.deleted_at) {
        throw new Error('User account is already deleted');
      }

      // Set deleted_at timestamp (soft delete)
      console.log('Setting deleted_at timestamp...');
      const deleteQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, deleted_at
      `;
      const deleteResult = await client.query(deleteQuery, [userId]) as any;
      
      // Clean up all sessions for this user
      console.log('Cleaning up user sessions...');
      const sessionCleanupQuery = `
        DELETE FROM "${config.DB_SCHEMA}".auth_sessions 
        WHERE user_id = $1
      `;
      await client.query(sessionCleanupQuery, [userId]);
      
      await client.query('COMMIT');
      
      console.log('Account deletion successful');
      
      return {
        id: deleteResult.rows[0].id,
        email: deleteResult.rows[0].email,
        deleted_at: deleteResult.rows[0].deleted_at
      };

    } catch (error) {
      console.error('Account deletion error:', error);
      await client.query('ROLLBACK');
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Account deletion failed');
    } finally {
      client.release();
    }
  }

  /**
   * Set or update password for authenticated user
   * Allows OAuth users to set a password for traditional login
   * Also allows existing users to update their password
   * @param userId - User's ID from JWT token
   * @param newPassword - New password to set
   * @param currentPassword - Current password (optional, required if user already has password)
   * @param forceUpdate - Force update without current password verification (admin use)
   */
  async setPasswordForUser(userId: string, newPassword: string, currentPassword?: string, forceUpdate: boolean = false): Promise<{isNewPassword: boolean}> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      // Get user's current password hash and provider
      const userQuery = `
        SELECT id, email, password_hash, provider
        FROM "${config.DB_SCHEMA}".users
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const isNewPassword = !user.password_hash; // Track if this is first password

      // If user already has a password and not forcing update, verify current password
      if (user.password_hash && !forceUpdate) {
        if (!currentPassword) {
          throw new Error('Current password is required to update existing password');
        }

        const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password (this works for both setting new password and updating existing one)
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateQuery, [hashedPassword, userId]);

      await client.query('COMMIT');
      
      return { isNewPassword };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Set password error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to set password');
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email and provider (for OAuth)
   * @param email - User's email address
   * @param provider - Authentication provider (google, facebook, etc.)
   * @returns User record or null if not found
   */
  async findUserByEmailAndProvider(email: string, provider: string): Promise<UserRecord | null> {
    try {
      const query = `
        SELECT id, email, password_hash, active, two_factor, provider, 
               provider_id, name, picture, last_login, created_at, updated_at
        FROM "${config.DB_SCHEMA}".users 
        WHERE email = $1 AND provider = $2
      `;
      const result = await database.query(query, [email.toLowerCase(), provider]);
      
      if ((result as any).rows.length > 0) {
        return (result as any).rows[0];
      }
      return null;
    } catch (error) {
      console.error('Find user by email and provider error:', error);
      throw new Error('Database error during user lookup');
    }
  }

  /**
   * Create a new OAuth user
   * @param userData - OAuth user data from provider
   * @returns Created user record
   */
  async createOAuthUser(userData: OAuthUserData): Promise<UserRecord> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      // Check if user with same email exists with different provider
      const existingUserQuery = `
        SELECT email, provider FROM "${config.DB_SCHEMA}".users 
        WHERE email = $1 AND provider != $2
      `;
      const existingResult = await client.query(existingUserQuery, [
        userData.email.toLowerCase(), 
        userData.provider
      ]);

      if (existingResult.rows.length > 0) {
        throw new Error(
          `Account with email ${userData.email} already exists using ${existingResult.rows[0].provider} provider`
        );
      }

      // Create user with OAuth data
      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".users 
        (email, password_hash, provider, provider_id, name, picture, active, last_login)
        VALUES ($1, NULL, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
        RETURNING id, email, provider, provider_id, name, picture, 
                  active, two_factor, last_login, created_at, updated_at
      `;

      const values = [
        userData.email.toLowerCase(),
        userData.provider,
        userData.provider_id,
        userData.name,
        userData.picture,
      ];

      const result = await client.query(insertQuery, values);
      const user = result.rows[0];

      // Assign default role (company role as per requirements)
      const roleQuery = `SELECT id FROM "${config.DB_SCHEMA}".roles WHERE name = 'company'`;
      const roleResult = await client.query(roleQuery);

      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await client.query(
          `INSERT INTO "${config.DB_SCHEMA}".user_roles (user_id, role_id) VALUES ($1, $2)`,
          [user.id, roleId]
        );
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create OAuth user error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create OAuth user');
    } finally {
      client.release();
    }
  }

  /**
   * Update user's last login timestamp
   * @param userId - User's ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await database.query(query, [userId]);
    } catch (error) {
      console.error('Update last login error:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Update user's tutorial status
   * @param userId - User's ID from JWT token
   * @param tutorialStatus - New tutorial status (incomplete, complete, skipped)
   */
  async updateTutorialStatus(userId: string, tutorialStatus: string): Promise<any> {
    try {
      // Validate tutorial status
      const validStatuses = ['incomplete', 'complete', 'skipped'];
      if (!validStatuses.includes(tutorialStatus)) {
        throw new Error('Invalid tutorial status. Must be one of: incomplete, complete, skipped');
      }

      // Check if user exists
      const userCheckQuery = `
        SELECT id, email FROM "${config.DB_SCHEMA}".users WHERE id = $1
      `;
      const userCheckResult = await database.query(userCheckQuery, [userId]);

      if ((userCheckResult as any).rows.length === 0) {
        throw new Error('User not found');
      }

      const user = (userCheckResult as any).rows[0];

      // Update tutorial status
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".users 
        SET tutorial_status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING id, email, tutorial_status
      `;
      const result = await database.query(updateQuery, [tutorialStatus, userId]);

      if ((result as any).rows.length === 0) {
        throw new Error('Failed to update tutorial status');
      }

      return {
        id: (result as any).rows[0].id,
        email: (result as any).rows[0].email,
        tutorial_status: (result as any).rows[0].tutorial_status
      };
    } catch (error) {
      console.error('Update tutorial status error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update tutorial status');
    }
  }
}

export const authService = new AuthService();
export default authService;
