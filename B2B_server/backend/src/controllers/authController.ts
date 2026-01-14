import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { otpService } from '../services/otpService';
import { emailService } from '../services/emailService';
import { RegisterUserData, LoginUserData, DeactivateAccountData, OAuthUserData } from '../models/User';
import ResponseUtil, { SuccessMessages, ErrorMessages, ValidationError } from '../utils/response';
import { auditLogger } from '../utils/auditLogger';
import { googleAuthUtil } from '../utils/google.utils';

class AuthController {
  /**
   * Input validation - check required fields and formats for basic registration
   */
  private validateRegistrationInput(body: any): ValidationError[] {
    const { email, password, profile_data } = body;
    const errors: ValidationError[] = [];

    // Check if profile_data is provided (should be rejected)
    if (profile_data) {
      errors.push({ 
        field: 'profile_data', 
        message: 'Use roles endpoint for role assignment / profile setup' 
      });
    }

    // Single validation block - check all required fields at once
    const requiredFields = [
      { field: 'email', value: email, message: 'Email is required' },
      { field: 'password', value: password, message: 'Password is required' }
    ];

    // Single loop to check all required fields
    requiredFields.forEach(({ field, value, message }) => {
      if (!value) errors.push({ field, message });
    });

    // Format validation - single block with all format checks
    const formatValidations = [
      { 
        field: 'email', 
        value: email, 
        condition: email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: 'Invalid email format' 
      },
      { 
        field: 'password', 
        value: password, 
        condition: password && password.length < 8,
        message: 'Password must be at least 8 characters' 
      }
    ];

    // Single loop for all format validations
    formatValidations.forEach(({ field, condition, message }) => {
      condition && errors.push({ field, message });
    });

    return errors;
  }

  /**
   * Input validation for login - check required fields and formats
   */
  private validateLoginInput(body: any): ValidationError[] {
    const { email, password } = body;
    const errors: ValidationError[] = [];

    // Single validation block - check all required fields at once
    const requiredFields = [
      { field: 'email', value: email, message: 'Email is required' },
      { field: 'password', value: password, message: 'Password is required' }
    ];

    // Single loop to check all required fields
    requiredFields.forEach(({ field, value, message }) => {
      if (!value) errors.push({ field, message });
    });

    // Format validation - single block with all format checks
    const formatValidations = [
      { 
        field: 'email', 
        value: email, 
        condition: email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: 'Invalid email format' 
      }
    ];

    // Single loop for all format validations
    formatValidations.forEach(({ field, condition, message }) => {
      condition && errors.push({ field, message });
    });

    return errors;
  }

  /**
   * Input validation for forgot password - check email format
   */
  private validateForgotPasswordInput(body: any): ValidationError[] {
    const { email } = body;
    const errors: ValidationError[] = [];

    // Check if email is provided
    if (!email) {
      errors.push({ field: 'email', message: 'Email is required' });
    }

    // Check email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    return errors;
  }

  /**
   * Input validation for reset password - check required fields and password strength
   */
  private validateResetPasswordInput(body: any): ValidationError[] {
    const { email, otp, newPassword } = body;
    const errors: ValidationError[] = [];

    // Check required fields
    const requiredFields = [
      { field: 'email', value: email, message: 'Email is required' },
      { field: 'otp', value: otp, message: 'OTP is required' },
      { field: 'newPassword', value: newPassword, message: 'New password is required' }
    ];

    requiredFields.forEach(({ field, value, message }) => {
      if (!value) errors.push({ field, message });
    });

    // Check email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Check OTP format (6 digits)
    if (otp && (!/^\d{6}$/.test(otp))) {
      errors.push({ field: 'otp', message: 'OTP must be exactly 6 digits' });
    }

    // Check password strength
    if (newPassword) {
      if (newPassword.length < 8) {
        errors.push({ field: 'newPassword', message: 'Password must be at least 8 characters' });
      }
      if (!/[A-Z]/.test(newPassword)) {
        errors.push({ field: 'newPassword', message: 'Password must contain at least one uppercase letter' });
      }
      if (!/[a-z]/.test(newPassword)) {
        errors.push({ field: 'newPassword', message: 'Password must contain at least one lowercase letter' });
      }
      if (!/\d/.test(newPassword)) {
        errors.push({ field: 'newPassword', message: 'Password must contain at least one number' });
      }
    }

    return errors;
  }

  /**
   * Register a new user
   * @route POST /auth/register
   * @access Public
   */
  async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Registration request received:', req.body);
      // Validate input
      const validationErrors = this.validateRegistrationInput(req.body);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        
        // Special handling for profile_data rejection
        if (validationErrors.some(error => error.field === 'profile_data')) {
          ResponseUtil.validationError(res, 'Profile data not accepted during registration. Assign role via /roles endpoint.', validationErrors);
          return;
        }
        
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, validationErrors);
        return;
      }

      const { email, password } = req.body;

      // Prepare user data
      const registrationData: RegisterUserData = {
        email: email.toLowerCase().trim(),
        password
      };

      console.log('Calling authService.registerUser...');
      // Register user
      const result = await authService.registerUser(registrationData);

      console.log('Registration successful, sending response...');
      
      // Log successful registration
      await auditLogger.logAuthEvent(
        'USER_REGISTERED',
        `User registered with email: ${registrationData.email}`,
        req,
        result.user.id
      );
      
      // Success response - following ticket format
  ResponseUtil.created(res, 'User registered successfully. Please assign a role using /roles endpoint.', result);

    } catch (error) {
      console.error('Registration controller error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'Email already exists',
          action: () => ResponseUtil.conflict(res, ErrorMessages.EMAIL_ALREADY_EXISTS)
        },
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Login user
   * @route POST /auth/login
   * @access Public
   */
  async loginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Login request received:', req.body);
      
      // Validate input
      const validationErrors = this.validateLoginInput(req.body);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, validationErrors);
        return;
      }

      const { email, password, remember_me } = req.body;

      // Prepare login data
      const loginData: LoginUserData = {
        email: email.toLowerCase().trim(),
        password,
        remember_me: remember_me || false
      };

      console.log('Calling authService.loginUser...');
      // Login user
      const result = await authService.loginUser(loginData);

      console.log('Login successful, sending response...');
      
      // Log successful login
      await auditLogger.logAuthEvent(
        'USER_LOGIN',
        `User logged in successfully: ${loginData.email}`,
        req,
        result.user.id
      );
      
      // Success response - following ticket format
      ResponseUtil.success(res, 'Login successful', {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          tutorial_status: result.user.tutorial_status
        }
      });

    } catch (error) {
      console.error('Login controller error:', error);
      
      // Log failed login attempt
      const { email } = req.body;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await auditLogger.logFailedLogin(email || 'unknown', errorMessage, req);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'User not found',
          action: () => ResponseUtil.notFound(res, 'User not found')
        },
        { 
          condition: error instanceof Error && error.message === 'Invalid credentials',
          action: () => ResponseUtil.unauthorized(res, 'Invalid credentials')
        },
        { 
          condition: error instanceof Error && error.message.includes('This account was created with Google authentication'),
          action: () => ResponseUtil.unauthorized(res, 'This account was created with Google authentication. Please use "Sign in with Google" or set a password first.')
        },
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Send password reset OTP
   * @route POST /auth/forgot-password
   * @access Public
   */
  async sendPasswordResetOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Forgot password request received:', req.body);

      // Validate input
      const validationErrors = this.validateForgotPasswordInput(req.body);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, validationErrors);
        return;
      }

      const { email } = req.body;

      // Call findUserByEmail(email)
      console.log('Looking up user by email...');
      const user = await userService.findUserByEmail(email.toLowerCase().trim());

      if (!user) {
        ResponseUtil.validationError(res, 'Email not found', [
          { field: 'email', message: 'Email not registered' }
        ]);
        return;
      }

      // Call generateOTP()
      console.log('Generating OTP...');
      const otp = otpService.generateOTP();

      // Set expiry time (15 minutes from now)
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);

      // Call saveOTPToDatabase(userId, otp, expiryTime)
      console.log('Saving OTP to database...');
      await otpService.saveOTPToDatabase(user.id, otp, expiryTime);

      // Call sendOTPEmail(email, otp)
      console.log('Sending OTP email...');
      await emailService.sendOTPEmail(email.toLowerCase().trim(), otp);

      console.log('OTP sent successfully');
      // Return success response
      ResponseUtil.success(res, 'OTP sent successfully to your email');

    } catch (error) {
      console.error('Send password reset OTP error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Reset password with OTP
   * @route POST /auth/reset-password
   * @access Public
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Reset password request received:', req.body);

      // Validate input
      const validationErrors = this.validateResetPasswordInput(req.body);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        
        // Check for password strength errors specifically
        if (validationErrors.some(error => error.field === 'newPassword')) {
          ResponseUtil.validationError(res, 'Password too weak', validationErrors);
          return;
        }
        
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, validationErrors);
        return;
      }

      const { email, otp, newPassword } = req.body;

      // Call findUserByEmail(email)
      console.log('Looking up user by email...');
      const user = await userService.findUserByEmail(email.toLowerCase().trim());

      if (!user) {
        ResponseUtil.validationError(res, 'Email not found', [
          { field: 'email', message: 'Email not registered' }
        ]);
        return;
      }

      // Call validateOTP(userId, otp)
      console.log('Validating OTP...');
      const otpValidation = await otpService.validateOTP(user.id, otp);

      if (!otpValidation.valid) {
        if (otpValidation.message.includes('expired')) {
          ResponseUtil.validationError(res, 'OTP expired', [
            { field: 'otp', message: otpValidation.message }
          ]);
        } else if (otpValidation.message.includes('already been used')) {
          ResponseUtil.validationError(res, 'OTP already used', [
            { field: 'otp', message: otpValidation.message }
          ]);
        } else {
          ResponseUtil.validationError(res, 'Invalid OTP', [
            { field: 'otp', message: otpValidation.message }
          ]);
        }
        return;
      }

      // Hash the new password
      console.log('Hashing new password...');
      const hashedPassword = await authService.hashPassword(newPassword);

      // Call updateUserPassword(userId, hashedPassword)
      console.log('Updating user password...');
      await userService.updateUserPassword(user.id, hashedPassword);

      // Call markOTPAsUsed(otpId)
      console.log('Marking OTP as used...');
      await otpService.markOTPAsUsed(otpValidation.otpId!);

      // Call cleanupExpiredOTPs()
      console.log('Cleaning up expired OTPs...');
      await otpService.cleanupExpiredOTPs();

      console.log('Password reset successful');
      
      // Log password update
      await auditLogger.logPasswordUpdate(user.id, req);
      
      // Return success response
      ResponseUtil.success(res, 'Password reset successful');

    } catch (error) {
      console.error('Reset password error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Deactivate user account
   * @route POST /auth/deactivate-account
   * @access Private
   */
  async deactivateAccountController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Deactivate account request received:', req.body);
      
      // Extract user ID from authenticated token (set by auth middleware)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      // Validate request body
      const validationErrors = userService.validateDeactivationRequest(req.body);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        ResponseUtil.validationError(res, 'Invalid request data', validationErrors);
        return;
      }

      // Deactivate user account
      console.log('Deactivating user account...');
      const result = await userService.deactivateUserService(userId);

      console.log('Account deactivated successfully');
      
      // Log account deactivation
      await auditLogger.logAccountDeactivation(userId, req);
      
      // Success response - following ticket format
      ResponseUtil.success(res, 'Account deactivated successfully', {
        user: result
      });

    } catch (error) {
      console.error('Deactivate account controller error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'User not found',
          action: () => ResponseUtil.notFound(res, 'User not found')
        },
        { 
          condition: error instanceof Error && error.message === 'User account is already deactivated',
          action: () => ResponseUtil.conflict(res, 'User account is already deactivated')
        },
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Delete user account (soft delete with 30-day grace period)
   * @route DELETE /auth/delete-account
   * @access Private
   */
  async deleteAccountController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Delete account request received');
      
      // Extract user ID from authenticated token (set by auth middleware)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      // Delete user account (soft delete)
      console.log('Deleting user account...');
      const result = await authService.deleteAccountService(userId);

      console.log('Account deleted successfully');
      
      // Log account deletion
      await auditLogger.logAccountDeletion(userId, req);
      
      // Success response - following ticket format
      ResponseUtil.success(res, 'Account deleted successfully', {
        user: result
      });

    } catch (error) {
      console.error('Delete account controller error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'User not found',
          action: () => ResponseUtil.notFound(res, 'User not found')
        },
        { 
          condition: error instanceof Error,
          action: () => {
            console.error('Server error details:', (error as Error).message, (error as Error).stack);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            console.error('Unknown error type:', error);
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Handle Google OAuth authentication
   * @route POST /auth/google
   * @access Public
   */
  async handleGoogleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Google OAuth request received');

      // Validate token presence
      const { token } = req.body;

      if (!token) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'token', message: 'Token cannot be empty' }
        ]);
        return;
      }

      // Validate token format (basic check)
      if (typeof token !== 'string' || token.trim().length === 0) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, [
          { field: 'token', message: 'Token must be a non-empty string' }
        ]);
        return;
      }

      // Check if Google OAuth is configured
      if (!googleAuthUtil.isConfigured()) {
        ResponseUtil.serverError(res, 'Google OAuth is not configured');
        return;
      }

      // Verify Google token and extract user data
      let googleUser;
      try {
        googleUser = await googleAuthUtil.verifyGoogleToken(token);
      } catch (error) {
        console.error('Google token verification failed:', error);
        ResponseUtil.unauthorized(res, 'Invalid or expired Google token');
        return;
      }

      // Check if user already exists with Google provider
      let user = await authService.findUserByEmailAndProvider(
        googleUser.email, 
        'google'
      );

      let isNewUser = false;

      if (!user) {
        // Create new user
        console.log('Creating new OAuth user:', googleUser.email);

        const oauthUserData: OAuthUserData = {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          provider: 'google',
          provider_id: googleUser.sub,
        };

        try {
          user = await authService.createOAuthUser(oauthUserData);
          isNewUser = true;
        } catch (error) {
          console.error('Failed to create OAuth user:', error);
          
          // Handle specific error for existing email with different provider
          if (error instanceof Error && error.message.includes('already exists using')) {
            ResponseUtil.conflict(res, error.message);
            return;
          }

          ResponseUtil.serverError(res, 'Failed to create user account');
          return;
        }
      } else {
        // Update last login for existing user
        console.log('Existing OAuth user logging in:', googleUser.email);
        await authService.updateLastLogin(user.id);
      }

      // Get user's role
      const userRole = await authService.getUserRole(user.id);
      const roleName = userRole ? userRole.role_name : 'company';

      // Generate JWT tokens
      const tokens = authService.generateTokens(
        user.id,
        user.email,
        roleName,
        false // remember_me not applicable for OAuth
      );

      // Log authentication event
      await auditLogger.logAuthEvent(
        isNewUser ? 'USER_REGISTERED' : 'USER_LOGIN',
        `User ${isNewUser ? 'registered' : 'logged in'} via Google OAuth: ${user.email}`,
        req,
        user.id
      );

      // Format response according to requirements
      const responseData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          picture: user.picture || '',
          provider: 'google',
          role: roleName,
          ...(isNewUser ? { created_at: user.created_at.toISOString() } : {}),
          ...(!isNewUser ? { last_login: user.last_login?.toISOString() } : {}),
        },
      };

      // Send appropriate response
      if (isNewUser) {
        ResponseUtil.created(res, 'Account created successfully', responseData);
      } else {
        ResponseUtil.success(res, 'Login successful', responseData);
      }
    } catch (error) {
      console.error('Google OAuth controller error:', error);

      // Error handling
      if (error instanceof Error) {
        console.error('Server error details:', error.message, error.stack);
      }
      
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Set/Update password for authenticated user
   * @route POST /auth/set-password
   * @access Private (requires JWT token)
   */
  async setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Set password request received');

      // Get user ID from JWT token (set by auth middleware)
      const userId = (req as any).user?.userId;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Validate input
      const { newPassword, currentPassword } = req.body;
      const errors: ValidationError[] = [];

      // Validate new password
      if (!newPassword) {
        errors.push({ field: 'newPassword', message: 'New password is required' });
      } else if (newPassword.length < 8) {
        errors.push({ field: 'newPassword', message: 'Password must be at least 8 characters' });
      }

      if (errors.length > 0) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, errors);
        return;
      }

      // Set password
      const result = await authService.setPasswordForUser(userId, newPassword, currentPassword);

      // Log the event
      await auditLogger.logAuthEvent(
        'PASSWORD_UPDATED',
        result.isNewPassword ? 'User set password for OAuth account' : 'User updated password',
        req,
        userId
      );

      // Success response with different message based on whether this is new or updated
      const message = result.isNewPassword 
        ? 'Password set successfully! You can now login with email and password.'
        : 'Password updated successfully!';
      
      ResponseUtil.success(res, message);

    } catch (error) {
      console.error('Set password controller error:', error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Current password is required to update existing password') {
          ResponseUtil.validationError(res, error.message, [
            { field: 'currentPassword', message: 'Current password is required to change existing password' }
          ]);
          return;
        }

        if (error.message === 'Current password is incorrect') {
          ResponseUtil.unauthorized(res, 'Current password is incorrect');
          return;
        }

        console.error('Server error details:', error.message, error.stack);
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Update tutorial status
   * @route PATCH /auth/tutorial-status
   * @access Private (requires authentication)
   */
  async updateTutorialStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Update tutorial status request received:', req.body);
      
      // Get userId from JWT token (set by auth middleware)
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Validate input
      const { tutorial_status } = req.body;
      const errors: ValidationError[] = [];

      if (!tutorial_status) {
        errors.push({ field: 'tutorial_status', message: 'Tutorial status is required' });
      } else {
        const validStatuses = ['incomplete', 'complete', 'skipped'];
        if (!validStatuses.includes(tutorial_status)) {
          errors.push({ 
            field: 'tutorial_status', 
            message: 'Invalid tutorial status. Must be one of: incomplete, complete, skipped' 
          });
        }
      }

      if (errors.length > 0) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, errors);
        return;
      }

      console.log('Calling authService.updateTutorialStatus...');
      // Update tutorial status
      const result = await authService.updateTutorialStatus(userId, tutorial_status);

      console.log('Tutorial status updated successfully');
      
      // Log the event
      await auditLogger.logAuthEvent(
        'TUTORIAL_STATUS_UPDATED',
        `User updated tutorial status to: ${tutorial_status}`,
        req,
        userId
      );

      // Success response
      ResponseUtil.success(res, 'Tutorial status updated successfully', { user: result });

    } catch (error) {
      console.error('Update tutorial status controller error:', error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          ResponseUtil.notFound(res, 'User not found');
          return;
        }

        if (error.message.includes('Invalid tutorial status')) {
          ResponseUtil.validationError(res, error.message, [
            { field: 'tutorial_status', message: error.message }
          ]);
          return;
        }

        console.error('Server error details:', error.message, error.stack);
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}

export const authController = new AuthController();
export default authController;
