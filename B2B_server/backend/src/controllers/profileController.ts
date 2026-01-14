import { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { authService } from '../services/authService';
import { CreateProfileData } from '../models/UserProfile';
import ResponseUtil, { ErrorMessages, ValidationError } from '../utils/response';
import { validateResumeFile, generateUniqueFileName, cleanupTempFile } from '../utils/fileUtils';
import { uploadFileToS3, deleteFileFromS3, extractS3KeyFromCertificateUrl, extractFileNameFromS3Key } from '../services/s3Service';
import { auditLogger } from '../utils/auditLogger';

class ProfileController {
  /**
   * Input validation for profile creation
   */
  private validateProfileCreationInput(body: any): ValidationError[] {
    const { profile_data } = body;
    const errors: ValidationError[] = [];

    // Check if profile_data is provided
    if (!profile_data) {
      errors.push({ 
        field: 'profile_data', 
        message: 'Profile data is required' 
      });
      return errors;
    }

    // Check if profile_data is an object
    if (typeof profile_data !== 'object' || Array.isArray(profile_data)) {
      errors.push({ 
        field: 'profile_data', 
        message: 'Profile data must be an object' 
      });
      return errors;
    }

    // Check if personal_information is provided (mandatory section)
    if (!profile_data.personal_information) {
      errors.push({ 
        field: 'profile_data.personal_information', 
        message: 'Personal information is required' 
      });
    }

    return errors;
  }

  /**
   * Create user profile
   * @route POST /profile/create
   * @access Private
   */
  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {      
      // Extract user ID from authenticated token (set by auth middleware)
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }
      
      // Get user role from database (using the same method as getRoleStatus)
      const roleData = await authService.getUserRole(userId);
      
      if (!roleData || !roleData.role_name) {
        ResponseUtil.validationError(res, 'User role required', [
          { field: 'role', message: 'User must have a role assigned before creating profile. Please assign a role first.' }
        ]);
        return;
      }
      
      const effectiveRole = roleData.role_name;

      // Validate input
      const validationErrors = this.validateProfileCreationInput(req.body);
      if (validationErrors.length > 0) {
        ResponseUtil.validationError(res, 'Profile validation failed', validationErrors);
        return;
      }

      const { profile_data } = req.body;

      // Prepare profile data
      const profileData: CreateProfileData = {
        profile_data
      };

      // Create profile
      const result = await profileService.createProfile(profileData, userId, effectiveRole);

      // Log profile creation
      await auditLogger.logProfileCreation(userId, effectiveRole, req);

      // Success response - following ticket format
      ResponseUtil.created(res, 'Profile created successfully', {
        user: result
      });

    } catch (error) {
      console.error('Profile creation controller error:', error);
      
      // Single error handling block
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'Profile already exists for this user',
          action: () => ResponseUtil.conflict(res, 'Profile already exists for this user')
        },
        { 
          condition: error instanceof Error && error.message === 'Profile validation failed',
          action: () => {
            const validationErrors = (error as any).validationErrors || [
              { field: 'profile_data', message: 'Profile data validation failed' }
            ];
            ResponseUtil.validationError(res, 'Profile validation failed', validationErrors);
          }
        },
        { 
          condition: error instanceof Error && error.message.includes('Invalid user role'),
          action: () => ResponseUtil.validationError(res, 'Invalid user role', [
            { field: 'role', message: 'User role is not valid for profile creation' }
          ])
        },
        { 
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Edit user profile field
   * @route PUT /profile/edit
   * @access Private
   */
  async editProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      // Parse request body - handle both JSON and multipart/form-data
      let field: string;
      let data: any;
      const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

      // Debug logging for certificate upload
      console.log('Edit profile request received:', {
        contentType: req.headers['content-type'],
        isMultipart,
        hasFile: !!req.file,
        fileInfo: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        } : null,
        bodyKeys: Object.keys(req.body || {})
      });

      if (isMultipart) {
        // Handle multipart/form-data request
        // Field and data should come from req.body after multer parsing
        field = req.body.field;
        
        // Parse data field - it might be a JSON string or already parsed
        if (req.body.data) {
          if (typeof req.body.data === 'string') {
            try {
              data = JSON.parse(req.body.data);
            } catch (parseError) {
              ResponseUtil.validationError(res, 'Invalid JSON data in form field', [
                { field: 'data', message: 'Data must be valid JSON string' }
              ]);
              return;
            }
          } else {
            data = req.body.data;
          }
        } else {
          ResponseUtil.validationError(res, 'Missing required fields', [
            { field: 'field', message: 'Field name is required' },
            { field: 'data', message: 'Data is required' }
          ]);
          return;
        }

        // Validate field is provided
        if (!field) {
          ResponseUtil.validationError(res, 'Field name is required', [
            { field: 'field', message: 'Field name is required' }
          ]);
          return;
        }

        // Handle certificate upload for certifications field
        if (field === 'certifications') {
          // Validate that data is an array and not empty
          if (!Array.isArray(data)) {
            ResponseUtil.validationError(res, 'Certifications data must be an array', [
              { field: 'data', message: 'Certifications must be an array' }
            ]);
            if (tempFilePath) {
              await cleanupTempFile(tempFilePath);
            }
            return;
          }

          if (data.length === 0) {
            ResponseUtil.validationError(res, 'Certifications array cannot be empty', [
              { field: 'data', message: 'At least one certification is required' }
            ]);
            if (tempFilePath) {
              await cleanupTempFile(tempFilePath);
            }
            return;
          }

          // Check if file was provided
          if (!req.file) {
            console.warn('Certificate upload requested but no file received');
            console.warn('Request details:', {
              contentType: req.headers['content-type'],
              bodyKeys: Object.keys(req.body || {}),
              files: (req as any).files ? Object.keys((req as any).files) : 'none'
            });
            // Continue without file - certification will be saved without certificateUrl
          } else {
            tempFilePath = req.file.path;
            console.log('Certificate file received:', {
              fieldname: req.file.fieldname,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              path: req.file.path
            });

            // Get current profile to find existing certifications
            const currentProfile = await profileService.getUserProfile(userId);
            const currentCertifications = currentProfile?.profile_data?.certifications || [];

            // Find which certification to attach the file to
            // Look for certification without certificateUrl or the first one if all have URLs
            let targetCertIndex = -1;
            for (let i = 0; i < data.length; i++) {
              if (!data[i].certificateUrl) {
                targetCertIndex = i;
                break;
              }
            }
            // If all have URLs, attach to first one (updating)
            if (targetCertIndex === -1 && data.length > 0) {
              targetCertIndex = 0;
            }

            // Only process file upload if file is present
            if (req.file) {
              // Validate that we have a valid target certification
              if (targetCertIndex === -1 || targetCertIndex >= data.length) {
                ResponseUtil.validationError(res, 'Invalid certification data for file upload', [
                  { field: 'data', message: 'No valid certification found to attach certificate file' }
                ]);
                if (tempFilePath) {
                  await cleanupTempFile(tempFilePath);
                }
                return;
              }

              // Track upload success
              let uploadSuccess = false;

              try {
                // Process each certification in the data array
                for (let i = 0; i < data.length; i++) {
                  const cert = data[i];
                  
                  // If this certification has an ID, check if it exists and has an old certificate
                  if (cert.id && currentCertifications.length > 0 && i === targetCertIndex) {
                    const existingCert = currentCertifications.find((c: any) => c.id === cert.id);
                    if (existingCert && existingCert.certificateUrl) {
                      // Delete old certificate from S3 when updating with new file
                      const s3Key = extractS3KeyFromCertificateUrl(existingCert.certificateUrl);
                      if (s3Key) {
                        const fileName = extractFileNameFromS3Key(s3Key);
                        try {
                          await deleteFileFromS3(fileName, 'certificate', 'certificates');
                        } catch (deleteError) {
                          console.warn('Failed to delete old certificate from S3:', deleteError);
                          // Don't fail the upload if old file deletion fails
                        }
                      }
                    }
                  }

                  // Upload new certificate file to the target certification
                  if (i === targetCertIndex && req.file) {
                    try {
                      const uniqueFileName = generateUniqueFileName(userId, req.file.originalname);
                      console.log('Attempting to upload certificate:', {
                        tempPath: req.file.path,
                        fileName: uniqueFileName,
                        originalName: req.file.originalname,
                        size: req.file.size,
                        mimetype: req.file.mimetype
                      });
                      
                      // Check if temp file exists
                      const fs = require('fs');
                      if (!fs.existsSync(req.file.path)) {
                        throw new Error(`Temporary file not found at path: ${req.file.path}`);
                      }
                      
                      const s3Result = await uploadFileToS3(req.file.path, uniqueFileName, 'certificate', 'certificates');
                      
                      cert.certificateUrl = s3Result.fileUrl;
                      cert.fileName = s3Result.fileName;
                      cert.fileSize = req.file.size;
                      
                      uploadSuccess = true;
                      console.log('Certificate uploaded successfully:', s3Result.fileUrl);
                      
                      // Cleanup temp file after successful upload
                      if (tempFilePath) {
                        await cleanupTempFile(tempFilePath);
                        tempFilePath = null;
                      }
                    } catch (uploadErr) {
                      console.error('Certificate S3 upload failed:', uploadErr);
                      console.error('Upload error details:', {
                        message: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
                        stack: uploadErr instanceof Error ? uploadErr.stack : undefined
                      });
                      // Continue without file - certification will be saved without certificateUrl
                      uploadSuccess = false;
                      // Cleanup temp file even on error
                      if (tempFilePath) {
                        await cleanupTempFile(tempFilePath);
                        tempFilePath = null;
                      }
                    }
                  }
                }
              } catch (uploadErr) {
                console.error('Certificate upload processing error:', uploadErr);
                uploadSuccess = false;
                // Cleanup temp file on error
                if (tempFilePath) {
                  await cleanupTempFile(tempFilePath);
                  tempFilePath = null;
                }
              }

              // Store upload status for response
              if (!uploadSuccess) {
                console.warn('Certificate file upload failed, but saving certification without file');
                req.body._certificateUploadFailed = true;
              }
            }
          }
        }
      } else {
        // Regular JSON request
      const validationErrors = this.validateProfileEditInput(req.body);
      if (validationErrors.length > 0) {
        ResponseUtil.validationError(res, 'Profile edit validation failed', validationErrors);
        return;
      }

        field = req.body.field;
        data = req.body.data;

        // Handle certificate deletion when removing/updating certifications
        if (field === 'certifications' && Array.isArray(data)) {
          const currentProfile = await profileService.getUserProfile(userId);
          const currentCertifications = currentProfile?.profile_data?.certifications || [];

          // Check for removed certifications (ones that existed before but not in new data)
          const currentCertIds = new Set(data.map((c: any) => c.id).filter(Boolean));
          const removedCerts = currentCertifications.filter((c: any) => 
            c.id && !currentCertIds.has(c.id) && c.certificateUrl
          );

          // Delete certificates from S3 for removed certifications
          for (const removedCert of removedCerts) {
            const s3Key = extractS3KeyFromCertificateUrl(removedCert.certificateUrl);
            if (s3Key) {
              const fileName = extractFileNameFromS3Key(s3Key);
              try {
                await deleteFileFromS3(fileName, 'certificate', 'certificates');
              } catch (deleteError) {
                console.warn('Failed to delete certificate from S3:', deleteError);
              }
            }
          }
        }
      }

      // Get current profile data for change tracking
      const currentProfile = await profileService.getUserProfile(userId);

      // Wrap data in object with field name for validation (validateProfileField expects { fieldName: data })
      const fieldDataForValidation = { [field]: data };

      // Edit profile
      const result = await profileService.editProfile(userId, fieldDataForValidation, field);

      // Track field-level changes for audit logging
      if (currentProfile && currentProfile.profile_data) {
        await auditLogger.trackProfileChanges(userId, currentProfile.profile_data, data, req);
      }

      // Success response - check if certificate upload had an error
      const hasCertificateUploadError = isMultipart && field === 'certifications' && req.file && req.body._certificateUploadFailed;
      
      ResponseUtil.success(res, 'Profile field updated successfully', {
        profile_id: result.profile_id,
        user_id: result.user_id,
        profile_data: result.profile_data,
        updated_at: result.updated_at,
        ...(hasCertificateUploadError && { 
          warning: 'Certificate upload failed, but certification saved without certificate file' 
        })
      });

    } catch (error) {
      console.error('Profile edit controller error:', error);

      // Cleanup temp file in case of error
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }
      
      // Error handling
      const errorHandlers = [
        { 
          condition: error instanceof Error && error.message === 'User profile not found',
          action: () => ResponseUtil.notFound(res, 'User profile not found')
        },
        { 
          condition: error instanceof Error && error.message === 'Profile field validation failed',
          action: () => {
            const validationErrors = (error as any).validationErrors || [
              { field: 'profile_data', message: 'Profile field validation failed' }
            ];
            ResponseUtil.validationError(res, 'Profile field validation failed', validationErrors);
          }
        },
        {
          condition: error instanceof Error && error.message.includes('S3 upload failed'),
          action: () => ResponseUtil.serverError(res, 'Failed to upload certificate to storage')
        },
        {
          condition: error instanceof Error && error.message.includes('Invalid file format'),
          action: () => ResponseUtil.validationError(res, 'File upload failed', [
            { field: 'certificate', message: 'Invalid file format. Only PDF, JPG, PNG allowed' }
          ])
        },
        { 
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        { 
          condition: true, // default case
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Input validation for profile editing
   */
  private validateProfileEditInput(body: any): ValidationError[] {
    const { field, data } = body;
    const errors: ValidationError[] = [];

    // Check if field is provided
    if (!field) {
      errors.push({ field: 'field', message: 'Field name is required' });
    }

    // Check if data is provided
    if (!data) {
      errors.push({ field: 'data', message: 'Field data is required' });
    }

    // Check if field is a string
    if (field && typeof field !== 'string') {
      errors.push({ field: 'field', message: 'Field name must be a string' });
    }

    // Check if data is an object
    if (data && (typeof data !== 'object' || Array.isArray(data))) {
      errors.push({ field: 'data', message: 'Field data must be an object' });
    }

    return errors;
  }

  /**
   * Upload resume file to S3
   * @route POST /profile/upload-resume
   * @access Private
   */
  async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.validationError(res, 'Unauthorized access', [
          { field: 'authorization', message: 'Authorization token is required' }
        ]);
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        ResponseUtil.validationError(res, 'Resume file is required', [
          { field: 'resume', message: 'Resume file is required' }
        ]);
        return;
      }

      // Store temp file path for cleanup
      tempFilePath = req.file.path;

      // Validate resume file
      const validation = validateResumeFile(req.file);
      if (!validation.isValid) {
        ResponseUtil.validationError(res, 'File upload failed', [
          { field: 'resume', message: validation.error || 'Invalid file' }
        ]);
        return;
      }

      // Generate unique filename
      const uniqueFileName = generateUniqueFileName(userId, req.file.originalname);

      // Upload file to S3
      const s3Result = await uploadFileToS3(req.file.path, uniqueFileName);

      // Prepare resume data for database storage
      const resumeData = {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      };

      // Save resume data to database
      await profileService.updateUserResume(userId, resumeData);

      // Cleanup temp file after successful upload
      await cleanupTempFile(tempFilePath);
      tempFilePath = null; // Mark as cleaned up

      // Log resume upload
      await auditLogger.logFileUpload(
        'RESUME_UPLOADED',
        userId,
        s3Result.fileName,
        req.file.size,
        req
      );

      // Success response
      ResponseUtil.success(res, 'Resume uploaded successfully', {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      });

    } catch (error) {
      console.error('Resume upload controller error:', error);

      // Cleanup temp file in case of error
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }

      // Error handling
      const errorHandlers = [
        {
          condition: error instanceof Error && error.message.includes('File size must be less than'),
          action: () => ResponseUtil.validationError(res, 'File size exceeds maximum limit', [
            { field: 'resume', message: 'File size must be less than 5MB' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('Invalid file format'),
          action: () => ResponseUtil.validationError(res, 'File upload failed', [
            { field: 'resume', message: 'Invalid file format. Only PDF, DOC, DOCX allowed' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('S3 upload failed'),
          action: () => ResponseUtil.serverError(res, 'Failed to upload resume to storage')
        },
        {
          condition: error instanceof Error && error.message.includes('AWS'),
          action: () => ResponseUtil.serverError(res, 'Storage service configuration error')
        },
        {
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        {
          condition: true, // default case
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

    /**
   * Upload avatar file to S3
   * @route POST /profile/upload-avatar
   * @access Private
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.validationError(res, 'Unauthorized access', [
          { field: 'authorization', message: 'Authorization token is required' }
        ]);
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        ResponseUtil.validationError(res, 'Avatar file is required', [
          { field: 'avatar', message: 'Avatar file is required' }
        ]);
        return;
      }

      // Store temp file path for cleanup
      tempFilePath = req.file.path;

      // Generate unique filename
      const uniqueFileName = generateUniqueFileName(userId, req.file.originalname);

      // Upload file to S3
      const s3Result = await uploadFileToS3(req.file.path, uniqueFileName, 'profileImage', 'avatars');

      // Prepare avatar data for database storage
      const avatar = {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      };

      // Save avatar data to database
      await profileService.updateUserAvatar(userId, avatar);

      // Cleanup temp file after successful upload
      await cleanupTempFile(tempFilePath);
      tempFilePath = null; // Mark as cleaned up

      // Log avatar upload
      await auditLogger.logFileUpload(
        'USER_AVATAR_UPLOADED',
        userId,
        s3Result.fileName,
        req.file.size,
        req
      );

      // Success response
      ResponseUtil.success(res, 'User avatar uploaded successfully', {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      });

    } catch (error) {
      console.error('Avatar upload controller error:', error);

      // Cleanup temp file in case of error
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }

      // Error handling
      const errorHandlers = [
        {
          condition: error instanceof Error && error.message.includes('File too large'),
          action: () => ResponseUtil.validationError(res, 'File size exceeds maximum limit', [
            { field: 'avatar', message: 'File size must be less than 5MB' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('Invalid file format'),
          action: () => ResponseUtil.validationError(res, 'File upload failed', [
            { field: 'avatar', message: 'Invalid file format. Only PNG,JPG allowed' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('S3 upload failed'),
          action: () => ResponseUtil.serverError(res, 'Failed to upload avatar image to storage')
        },
        {
          condition: error instanceof Error && error.message.includes('AWS'),
          action: () => ResponseUtil.serverError(res, 'Storage service configuration error')
        },
        {
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        {
          condition: true, // default case
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  async uploadBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.validationError(res, 'Unauthorized access', [
          { field: 'authorization', message: 'Authorization token is required' }
        ]);
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        ResponseUtil.validationError(res, 'Banner file is required', [
          { field: 'banner', message: 'Banner file is required' }
        ]);
        return;
      }

      // Store temp file path for cleanup
      tempFilePath = req.file.path;

      // Generate unique filename
      const uniqueFileName = generateUniqueFileName(userId, req.file.originalname);

      // Upload file to S3
      const s3Result = await uploadFileToS3(req.file.path, uniqueFileName, 'profileImage', 'userBanners');

      // Prepare banner data for database storage
      const banner = {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      };

      // Save banner data to database
      await profileService.updateUserBanner(userId, banner);

      // Cleanup temp file after successful upload
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
        tempFilePath = null; // Mark as cleaned up
      }

      // Log banner upload
      await auditLogger.logFileUpload(
        'USER_BANNER_UPLOADED',
        userId,
        s3Result.fileName,
        req.file.size,
        req
      );

      // Success response
      ResponseUtil.success(res, 'User banner uploaded successfully', {
        fileId: s3Result.fileId,
        fileName: s3Result.fileName,
        fileUrl: s3Result.fileUrl,
        uploadedAt: s3Result.uploadedAt
      });

    } catch (error) {
      console.error('Banner upload controller error:', error);

      // Cleanup temp file in case of error
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }

      // Error handling
      const errorHandlers = [
        {
          condition: error instanceof Error && error.message.includes('File too large'),
          action: () => ResponseUtil.validationError(res, 'File size exceeds maximum limit', [
            { field: 'avatar', message: 'File size must be less than 5MB' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('Invalid file format'),
          action: () => ResponseUtil.validationError(res, 'File upload failed', [
            { field: 'avatar', message: 'Invalid file format. Only PNG,JPG allowed' }
          ])
        },
        {
          condition: error instanceof Error && error.message.includes('S3 upload failed'),
          action: () => ResponseUtil.serverError(res, 'Failed to upload avatar image to storage')
        },
        {
          condition: error instanceof Error && error.message.includes('AWS'),
          action: () => ResponseUtil.serverError(res, 'Storage service configuration error')
        },
        {
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        {
          condition: true, // default case
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      // Execute first matching error handler
      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Search user profiles by name
   * @route GET /profile/search?q=...&limit=...
   * @access Public
   */
  async searchProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const limitParam = req.query.limit as string | undefined;
      const pageParam = req.query.page as string | undefined;
      const sortParam = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : undefined;

      const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
      const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : 1;

      const trimmedQuery = rawQuery.trim();
      const recognizedSort = sortParam === 'recent' ? sortParam : undefined;

      if (trimmedQuery.length === 0 && !recognizedSort) {
        ResponseUtil.validationError(res, 'Search query is required', [
          { field: 'q', message: 'Provide a query or set sort=recent for fallback results' }
        ]);
        return;
      }

      const searchOptions: { sort?: 'recent' } = {};
      if (recognizedSort) {
        searchOptions.sort = recognizedSort;
      }

      const { results, page: outPage, limit: outLimit, has_more, total_candidates } = await profileService.searchProfiles(trimmedQuery, page, limit, searchOptions);

      ResponseUtil.success(res, 'Profiles fetched successfully', { results, page: outPage, limit: outLimit, has_more, total_candidates });
    } catch (error) {
      console.error('Profile search controller error:', error);
      ResponseUtil.serverError(res, 'An unexpected error occurred while searching profiles');
    }
  }

  /**
   * Remove user avatar
   * @route DELETE /profile/avatar
   * @access Private
   */
  async removeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.validationError(res, 'Unauthorized access', [
          { field: 'authorization', message: 'Authorization token is required' }
        ]);
        return;
      }

      // Get current profile to find avatar URL
      const currentProfile = await profileService.getUserProfile(userId);
      if (!currentProfile) {
        ResponseUtil.notFound(res, 'User profile not found');
        return;
      }

      // Extract avatar URL and filename if exists
      const avatarUrl = currentProfile.profile_data?.avatar?.fileUrl;
      if (avatarUrl) {
        try {
          // Extract filename from avatar URL for S3 deletion
          // Avatar URLs are in format: https://bucket.s3.region.amazonaws.com/avatars/filename
          const urlParts = avatarUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          if (fileName && fileName !== 'default-banner.jpg') {
            await deleteFileFromS3(fileName, 'profileImage', 'avatars');
          }
        } catch (deleteError) {
          // Log but continue - deletion failure shouldn't block the operation
          console.warn('Failed to delete avatar from S3:', deleteError);
        }
      }

      // Remove avatar from profile
      await profileService.removeUserAvatar(userId);

      // Log avatar removal
      await auditLogger.createAuditLog(
        'PROFILE_EDITED',
        'Avatar removed',
        req,
        userId
      );

      // Success response
      ResponseUtil.success(res, 'Avatar removed successfully', {
        userId: userId,
        avatarUrl: null
      });

    } catch (error) {
      console.error('Remove avatar controller error:', error);
      
      const errorHandlers = [
        {
          condition: error instanceof Error && error.message.includes('User profile not found'),
          action: () => ResponseUtil.notFound(res, 'User profile not found')
        },
        {
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        {
          condition: true,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Remove user banner
   * @route DELETE /profile/banner
   * @access Private
   */
  async removeBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract user ID from authenticated token
      const userId = (req as any).user?.id;
      
      if (!userId) {
        ResponseUtil.validationError(res, 'Unauthorized access', [
          { field: 'authorization', message: 'Authorization token is required' }
        ]);
        return;
      }

      // Get current profile to find banner URL
      const currentProfile = await profileService.getUserProfile(userId);
      if (!currentProfile) {
        ResponseUtil.notFound(res, 'User profile not found');
        return;
      }

      // Extract banner URL and filename if exists
      const bannerUrl = currentProfile.profile_data?.banner?.fileUrl;
      if (bannerUrl) {
        try {
          // Extract filename from banner URL for S3 deletion
          // Banner URLs are in format: https://bucket.s3.region.amazonaws.com/userBanners/filename
          const urlParts = bannerUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          if (fileName) {
            await deleteFileFromS3(fileName, 'profileImage', 'userBanners');
          }
        } catch (deleteError) {
          // Log but continue - deletion failure shouldn't block the operation
          console.warn('Failed to delete banner from S3:', deleteError);
        }
      }

      // Remove banner (set to null)
      await profileService.removeUserBanner(userId);

      // Log banner removal
      await auditLogger.createAuditLog(
        'PROFILE_EDITED',
        'Banner removed',
        req,
        userId
      );

      // Success response
      ResponseUtil.success(res, 'Banner removed successfully', {
        userId: userId,
        bannerUrl: null
      });

    } catch (error) {
      console.error('Remove banner controller error:', error);
      
      const errorHandlers = [
        {
          condition: error instanceof Error && error.message.includes('User profile not found'),
          action: () => ResponseUtil.notFound(res, 'User profile not found')
        },
        {
          condition: error instanceof Error,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        },
        {
          condition: true,
          action: () => {
            ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
          }
        }
      ];

      errorHandlers.find(handler => handler.condition)?.action();
    }
  }

  /**
   * Get user profile (complete or partial based on auth)
   * @route GET /profile/:userId
   * @access Public (with optional auth)
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // Check if userId exists
      if (!userId) {
        ResponseUtil.validationError(res, 'User ID is required', [
          { field: 'userId', message: 'User ID parameter is missing' }
        ]);
        return;
      }

      // Validate userId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        ResponseUtil.validationError(res, 'Invalid user ID format', [
          { field: 'userId', message: 'Must be a valid UUID' }
        ]);
        return;
      }

      // Check if Authorization header exists
      const authHeader = req.headers.authorization;
      let tokenUserId: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
          tokenUserId = decoded.userId;
        } catch (error) {
          // Invalid token format - return 401 Unauthorized
          ResponseUtil.unauthorized(res, 'Invalid token format');
          return;
        }
      }

      // Determine if user is viewing their own profile
      const isOwnProfile = tokenUserId === userId;

      let profileData;
      if (isOwnProfile) {
        // Get complete profile
        profileData = await profileService.getCompleteUserProfile(userId);
        if (!profileData) {
          ResponseUtil.notFound(res, 'User not found');
          return;
        }
        ResponseUtil.success(res, 'Complete profile fetched successfully', profileData);
      } else {
        // If requester is authenticated (tokenUserId present) and not the profile owner,
        // check connection status. If connected, show more information (complete profile),
        // otherwise show partial profile.
        if (tokenUserId) {
          try {
            const conn = await connectionService.isUserConnected(tokenUserId, userId);
            if (conn && conn.is_connected) {
              // Connected - return complete profile
              profileData = await profileService.getCompleteUserProfile(userId);
              if (!profileData) {
                ResponseUtil.notFound(res, 'User not found');
                return;
              }

              if (profileData.privacy_settings.skills_visibility == false) {
                delete profileData.skills;
              }
              if (profileData.privacy_settings.experience_visibility == 'Hidden') {
                delete profileData.experience;
              }
              if (profileData.privacy_settings.contact_visibility == 'Hidden') {
                  delete profileData.personal_information.email;
                  delete profileData.personal_information.phone_number;
                  delete profileData.personal_information.postal_code;
              }
              ResponseUtil.success(res, 'Complete profile fetched (connected)', profileData);
              return;
            }

          } catch (connErr) {
            // Log and continue to return partial profile on connection check failure
            console.error('Connection check failed in getProfile:', connErr);
          }
        }

        // Default: return partial profile
        profileData = await profileService.getPartialUserProfile(userId);
        if (!profileData) {
          ResponseUtil.notFound(res, 'User not found');
          return;
        }
        ResponseUtil.success(res, 'Partial profile fetched successfully', profileData);
      }

    } catch (error) {
      console.error('Get profile error:', error);
      ResponseUtil.serverError(res, 'An unexpected error occurred while fetching profile');
    }
  }
}

export const profileController = new ProfileController();
export default profileController;
