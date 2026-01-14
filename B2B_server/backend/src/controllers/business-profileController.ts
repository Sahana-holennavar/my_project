import { Response } from 'express';
import ResponseUtil, { ErrorMessages } from '../utils/response';
import {
  businessProfileService,
  BusinessProfileValidationError,
  DuplicateCompanyNameError,
  BusinessProfileNotFoundError,
  BusinessProfilePrivacyError,
  AboutSectionExistsError,
  AboutSectionNotFoundError,
  ProjectNotFoundError,
  PrivateInfoExistsError,
  PrivateInfoNotFoundError,
  AchievementNotFoundError,
  UserNotFoundError,
  UserAlreadyMemberError,
  PendingInvitationExistsError,
  InvalidRoleError,
  InvitationNotFoundError,
} from '../services/business-profileService';
import { auditLogger } from '../utils/auditLogger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  uploadBusinessProfileVideo,
  deleteBusinessProfileVideo,
  uploadPrivateInfoFile,
  deletePrivateInfoFile,
  uploadBusinessProfileBanner,
  deleteBusinessProfileBanner,
  uploadAchievementCertificate,
  deleteAchievementCertificate,
  uploadBusinessProfileAvatar,
  deleteBusinessProfileAvatar,
  uploadMediaToS3,
} from '../services/s3Service';
import { generateUniqueFileName, cleanupTempFile } from '../utils/fileUtils';


class BusinessProfileController {
  /**
   * Extract about section data from request (supports both form-data and JSON)
   * @param req - Express request object
   * @returns Extracted about data object
   */
  private extractAboutData(req: AuthenticatedRequest): any {
    const data: any = {};

    if ((req as any).file) {
      if (req.body.description) data.description = req.body.description;
      if (req.body.mission) data.mission = req.body.mission;
      if (req.body.vision) data.vision = req.body.vision;
      if (req.body.core_values) data.core_values = req.body.core_values;
      if (req.body.founder_message) data.founder_message = req.body.founder_message;
      if (req.body.founded) data.founded = req.body.founded;
      if (req.body.employees) data.employees = req.body.employees;
      if (req.body.headquarters) data.headquarters = req.body.headquarters;
    } else {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        Object.assign(data, body);
      } catch {
        Object.assign(data, req.body);
      }
    }

    return data;
  }

  async createBusinessProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const rawBusinessProfile = req.body?.profile_data ?? req.body?.profileData ?? req.body;

      if (!rawBusinessProfile || typeof rawBusinessProfile !== 'object') {
        ResponseUtil.validationError(res, 'Business profile data is required', [
          { field: 'profile_data', message: 'Profile data must be provided as an object' }
        ]);
        return;
      }

      const result = await businessProfileService.createBusinessProfile(userId, rawBusinessProfile);

      const profileData = result?.profile_data as Record<string, unknown> | undefined;
      const companyName = typeof profileData?.companyName === 'string' && profileData.companyName.trim()
        ? profileData.companyName
        : 'Unknown Company';
      await auditLogger.logCompanyProfileCreation(userId, companyName, req);

      ResponseUtil.success(res, 'Business profile created successfully', {
        profileId: result.profile_id,
        ownerId: result.owner_id,
        role: result.role,
        profile_data: result.profile_data,
        privacy_settings: result.privacy_settings,
        is_active: result.is_active,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      });
    } catch (error: unknown) {
      console.error('Business profile creation controller error:', error);

      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }

      if (error instanceof DuplicateCompanyNameError) {
        ResponseUtil.conflict(res, 'Company name already exists');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async createAbout(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedVideoUrl: string | null = null;
    let tempFilePath: string | null = null;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const aboutData = this.extractAboutData(req);
      const file = (req as any).file;

      if (file) {
        try {
          tempFilePath = file.path;
          if (!tempFilePath) {
            throw new Error('File path is missing');
          }
          const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
          const s3Result = await uploadBusinessProfileVideo(tempFilePath, uniqueFileName, profileId);

          aboutData.company_introduction_video = {
            fileId: s3Result.fileId,
            fileUrl: s3Result.fileUrl,
            filename: s3Result.fileName,
            uploadedAt: s3Result.uploadedAt,
          };

          uploadedVideoUrl = s3Result.fileUrl;

          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
        } catch (uploadError) {
          console.error('S3 upload error:', uploadError);
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
          ResponseUtil.serverError(res, 'Failed to upload video file');
          return;
        }
      } 
      const result = await businessProfileService.createAboutService(profileId, aboutData);

      ResponseUtil.success(res, 'About section created successfully', {
        profileId: result.profileId,
        ...result.about,
      });
    } catch (error) {
      console.error('Create about section error:', error);

      if (uploadedVideoUrl) {
        try {
          await deleteBusinessProfileVideo(uploadedVideoUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      if (error instanceof AboutSectionExistsError) {
        ResponseUtil.conflict(res, 'About section already exists');
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getAbout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const requesterId = req.user?.id;
      const result = await businessProfileService.getAboutService(profileId, requesterId);
      ResponseUtil.success(res, 'About section retrieved successfully', result.about);
    } catch (error) {
      console.error('Get about section error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfilePrivacyError) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      if (error instanceof AboutSectionNotFoundError) {
        ResponseUtil.notFound(res, 'About section not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updateAbout(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedVideoUrl: string | null = null;
    let oldVideoUrl: string | null = null;
    let tempFilePath: string | null = null;
    let oldVideoDeleted = false;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      let existingAbout: any = null;
      try {
        const existing = await businessProfileService.getAboutService(profileId, req.user?.id);
        existingAbout = existing.about;
        if (existingAbout?.company_introduction_video?.fileUrl) {
          oldVideoUrl = existingAbout.company_introduction_video.fileUrl;
        }
      } catch {
      }
      const aboutData = this.extractAboutData(req);
      const file = (req as any).file;

      if (file) {
        try {
          tempFilePath = file.path;
          if (!tempFilePath) {
            throw new Error('File path is missing');
          }
          const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
          const s3Result = await uploadBusinessProfileVideo(tempFilePath, uniqueFileName, profileId);

          aboutData.company_introduction_video = {
            fileId: s3Result.fileId,
            fileUrl: s3Result.fileUrl,
            filename: s3Result.fileName,
            uploadedAt: s3Result.uploadedAt,
          };

          uploadedVideoUrl = s3Result.fileUrl;

          if (oldVideoUrl) {
            try {
              await deleteBusinessProfileVideo(oldVideoUrl, profileId);
              oldVideoDeleted = true;
            } catch (deleteError) {
              console.error('Failed to delete old video:', deleteError);
            }
          }
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
        } catch (uploadError) {
          console.error('S3 upload error:', uploadError);
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
          ResponseUtil.serverError(res, 'Failed to upload video file');
          return;
        }
      } else {
        if (aboutData.company_introduction_video === null && oldVideoUrl) {
          try {
            await deleteBusinessProfileVideo(oldVideoUrl, profileId);
            oldVideoDeleted = true;
          } catch (deleteError) {
            console.error('Failed to delete old video:', deleteError);
          }
        }
      }
      const result = await businessProfileService.updateAboutService(profileId, aboutData);

      ResponseUtil.success(res, 'About section updated successfully', {
        profileId: result.profileId,
        ...result.about,
      });
    } catch (error) {
      console.error('Update about section error:', error);

      if (uploadedVideoUrl) {
        try {
          await deleteBusinessProfileVideo(uploadedVideoUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof AboutSectionNotFoundError) {
        ResponseUtil.notFound(res, 'About section not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteAbout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      let videoUrl: string | null = null;
      try {
        const existing = await businessProfileService.getAboutService(profileId, req.user?.id);
        if (existing.about?.company_introduction_video?.fileUrl) {
          videoUrl = existing.about.company_introduction_video.fileUrl;
        }
      } catch {
      }

      await businessProfileService.deleteAboutService(profileId);
       if (videoUrl) {
        try {
          await deleteBusinessProfileVideo(videoUrl, profileId);
        } catch (deleteError) {
          console.error('Failed to delete video from S3 during about section deletion:', deleteError);
        }
      }
      ResponseUtil.success(res, 'About section deleted successfully');
    } catch (error) {
      console.error('Delete about section error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof AboutSectionNotFoundError) {
        ResponseUtil.notFound(res, 'About section not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Extract private info data from request (supports both form-data and JSON)
   * @param req - Express request object
   * @returns Extracted private info data object
   */
  private extractPrivateInfoData(req: AuthenticatedRequest): any {
    const data: any = {};

    // Check if files are present (form-data mode)
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (files) {
      // Extract text fields from req.body (form-data)
      if (req.body.taxId) data.taxId = req.body.taxId;
      if (req.body.ein) data.ein = req.body.ein;
      if (req.body.legalName) data.legalName = req.body.legalName;
      
      // Parse bankDetails if provided as JSON string in form-data
      if (req.body.bankDetails) {
        try {
          data.bankDetails = typeof req.body.bankDetails === 'string' 
            ? JSON.parse(req.body.bankDetails) 
            : req.body.bankDetails;
        } catch {
        }
      }
    } else {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        Object.assign(data, body);
      } catch {
        Object.assign(data, req.body);
      }
    }

    return data;
  }

  async createPrivateInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const uploadedFiles: Array<{ url: string; type: 'registration_certificate' | 'business_license'; path: string }> = [];
    const tempFilePaths: string[] = [];

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      // Extract data from form-data or JSON
      const privateInfoData = this.extractPrivateInfoData(req);
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Handle file uploads if present (form-data mode)
      if (files) {
        // Handle registration_certificate
        if (files.registration_certificate && files.registration_certificate[0]) {
          try {
            const file = files.registration_certificate[0];
            const tempFilePath = file.path;
            if (!tempFilePath) {
              throw new Error('File path is missing');
            }
            tempFilePaths.push(tempFilePath);
            
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadPrivateInfoFile(tempFilePath, uniqueFileName, profileId, 'registration_certificate');

            privateInfoData.registration_certificate = {
              fileId: s3Result.fileId,
              fileUrl: s3Result.fileUrl,
              filename: s3Result.fileName,
              uploadedAt: s3Result.uploadedAt,
            };

            uploadedFiles.push({ url: s3Result.fileUrl, type: 'registration_certificate', path: tempFilePath });

            // Clean up temp file after successful upload
            await cleanupTempFile(tempFilePath);
            tempFilePaths.splice(tempFilePaths.indexOf(tempFilePath), 1);
          } catch (uploadError) {
            console.error('S3 upload error for registration_certificate:', uploadError);
            ResponseUtil.serverError(res, 'Failed to upload registration certificate file');
            return;
          }
        }

        if (files.business_license && files.business_license[0]) {
          try {
            const file = files.business_license[0];
            const tempFilePath = file.path;
            if (!tempFilePath) {
              throw new Error('File path is missing');
            }
            tempFilePaths.push(tempFilePath);
            
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadPrivateInfoFile(tempFilePath, uniqueFileName, profileId, 'business_license');

            privateInfoData.business_license = {
              fileId: s3Result.fileId,
              fileUrl: s3Result.fileUrl,
              filename: s3Result.fileName,
              uploadedAt: s3Result.uploadedAt,
            };

            uploadedFiles.push({ url: s3Result.fileUrl, type: 'business_license', path: tempFilePath });

            await cleanupTempFile(tempFilePath);
            tempFilePaths.splice(tempFilePaths.indexOf(tempFilePath), 1);
          } catch (uploadError) {
            console.error('S3 upload error for business_license:', uploadError);
            ResponseUtil.serverError(res, 'Failed to upload business license file');
            return;
          }
        }
      }

      const result = await businessProfileService.createPrivateInfoService(profileId, privateInfoData);
      auditLogger.logPrivateInfoCreation(req.user?.id || '', profileId, req);
      ResponseUtil.success(res, 'Private info created successfully', {
        profileId: result.profileId,
        ...result.privateInfo,
      });
    } catch (error) {
      console.error('Create private info error:', error);
      for (const file of uploadedFiles) {
        try {
          await deletePrivateInfoFile(file.url, req.params.profileId, file.type);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }
      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      if (error instanceof PrivateInfoExistsError) {
        ResponseUtil.conflict(res, 'Private info already exists');
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getPrivateInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.user?.id;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }
      const result = await businessProfileService.getPrivateInfoService(profileId, userId);
      auditLogger.logPrivateInfoAccess(userId, profileId, req);
      ResponseUtil.success(res, 'Private info retrieved successfully', {
        profileId: result.profileId,
        ...result.privateInfo,
      });
    } catch (error) {
      console.error('Get private info error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof PrivateInfoNotFoundError) {
        ResponseUtil.notFound(res, 'Private info not found');
        return;
      }
      if (error instanceof BusinessProfilePrivacyError) {
        ResponseUtil.forbidden(res, error.message);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updatePrivateInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const uploadedFiles: Array<{ url: string; type: 'registration_certificate' | 'business_license'; path: string }> = [];
    const oldFileUrls: Array<{ url: string; type: 'registration_certificate' | 'business_license' }> = [];
    const tempFilePaths: string[] = [];
    const oldFilesDeleted: string[] = [];
    try {
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      let existingPrivateInfo: any = null;
      try {
        const existing = await businessProfileService.getPrivateInfoService(profileId, req.user?.id || '');
        existingPrivateInfo = existing.privateInfo;
        if (existingPrivateInfo?.registration_certificate?.fileUrl) {
          oldFileUrls.push({ url: existingPrivateInfo.registration_certificate.fileUrl, type: 'registration_certificate' });
        }
        if (existingPrivateInfo?.business_license?.fileUrl) {
          oldFileUrls.push({ url: existingPrivateInfo.business_license.fileUrl, type: 'business_license' });
        }
      } catch {
      }
      const privateInfoData = this.extractPrivateInfoData(req);
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        if (files.registration_certificate && files.registration_certificate[0]) {
          try {
            const file = files.registration_certificate[0];
            const tempFilePath = file.path;
            if (!tempFilePath) {
              throw new Error('File path is missing');
            }
            tempFilePaths.push(tempFilePath);      
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadPrivateInfoFile(tempFilePath, uniqueFileName, profileId, 'registration_certificate');

            privateInfoData.registration_certificate = {
              fileId: s3Result.fileId,
              fileUrl: s3Result.fileUrl,
              filename: s3Result.fileName,
              uploadedAt: s3Result.uploadedAt,
            };

            uploadedFiles.push({ url: s3Result.fileUrl, type: 'registration_certificate', path: tempFilePath });
            const oldFile = oldFileUrls.find(f => f.type === 'registration_certificate');
            if (oldFile) {
              try {
                await deletePrivateInfoFile(oldFile.url, profileId, 'registration_certificate');
                oldFilesDeleted.push(oldFile.url);
              } catch (deleteError) {
                console.error('Failed to delete old registration_certificate:', deleteError);
              }
            }
            await cleanupTempFile(tempFilePath);
            tempFilePaths.splice(tempFilePaths.indexOf(tempFilePath), 1);
          } catch (uploadError) {
            console.error('S3 upload error for registration_certificate:', uploadError);
            ResponseUtil.serverError(res, 'Failed to upload registration certificate file');
            return;
          }
        }
        if (files.business_license && files.business_license[0]) {
          try {
            const file = files.business_license[0];
            const tempFilePath = file.path;
            if (!tempFilePath) {
              throw new Error('File path is missing');
            }
            tempFilePaths.push(tempFilePath);
            
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadPrivateInfoFile(tempFilePath, uniqueFileName, profileId, 'business_license');

            privateInfoData.business_license = {
              fileId: s3Result.fileId,
              fileUrl: s3Result.fileUrl,
              filename: s3Result.fileName,
              uploadedAt: s3Result.uploadedAt,
            };

            uploadedFiles.push({ url: s3Result.fileUrl, type: 'business_license', path: tempFilePath });
            const oldFile = oldFileUrls.find(f => f.type === 'business_license');
            if (oldFile) {
              try {
                await deletePrivateInfoFile(oldFile.url, profileId, 'business_license');
                oldFilesDeleted.push(oldFile.url);
              } catch (deleteError) {
                console.error('Failed to delete old business_license:', deleteError);
              }
            }
            await cleanupTempFile(tempFilePath);
            tempFilePaths.splice(tempFilePaths.indexOf(tempFilePath), 1);
          } catch (uploadError) {
            console.error('S3 upload error for business_license:', uploadError);
            ResponseUtil.serverError(res, 'Failed to upload business license file');
            return;
          }
        }
      } else {
        if (privateInfoData.registration_certificate === null) {
          const oldFile = oldFileUrls.find(f => f.type === 'registration_certificate');
          if (oldFile) {
            try {
              await deletePrivateInfoFile(oldFile.url, profileId, 'registration_certificate');
              oldFilesDeleted.push(oldFile.url);
            } catch (deleteError) {
              console.error('Failed to delete old registration_certificate:', deleteError);
            }
          }
        }
        if (privateInfoData.business_license === null) {
          const oldFile = oldFileUrls.find(f => f.type === 'business_license');
          if (oldFile) {
            try {
              await deletePrivateInfoFile(oldFile.url, profileId, 'business_license');
              oldFilesDeleted.push(oldFile.url);
            } catch (deleteError) {
              console.error('Failed to delete old business_license:', deleteError);
            }
          }
        }
      }
       const result = await businessProfileService.updatePrivateInfoService(profileId, privateInfoData);
      auditLogger.logPrivateInfoUpdate(req.user?.id || '', profileId, req);
      ResponseUtil.success(res, 'Private info updated successfully', {
        profileId: result.profileId,
        ...result.privateInfo,
      });
    } catch (error) {
      console.error('Update private info error:', error);
      for (const file of uploadedFiles) {
        try {
          await deletePrivateInfoFile(file.url, req.params.profileId, file.type);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }
      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof PrivateInfoNotFoundError) {
        ResponseUtil.notFound(res, 'Private info not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deletePrivateInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      let registrationCertUrl: string | null = null;
      let businessLicenseUrl: string | null = null;
      try {
        const existing = await businessProfileService.getPrivateInfoService(profileId, req.user?.id || '');
        if (existing.privateInfo?.registration_certificate?.fileUrl) {
          registrationCertUrl = existing.privateInfo.registration_certificate.fileUrl;
        }
        if (existing.privateInfo?.business_license?.fileUrl) {
          businessLicenseUrl = existing.privateInfo.business_license.fileUrl;
        }
      } catch {
      }
      await businessProfileService.deletePrivateInfoService(profileId);
      if (registrationCertUrl) {
        try {
          await deletePrivateInfoFile(registrationCertUrl, profileId, 'registration_certificate');
        } catch (deleteError) {
          console.error('Failed to delete registration certificate from S3 during deletion:', deleteError);
        }
      }
      if (businessLicenseUrl) {
        try {
          await deletePrivateInfoFile(businessLicenseUrl, profileId, 'business_license');
        } catch (deleteError) {
          console.error('Failed to delete business license from S3 during deletion:', deleteError);
        }
      }
      auditLogger.logPrivateInfoDeletion(req.user?.id || '', profileId, req);
      ResponseUtil.success(res, 'Private info deleted successfully');
    } catch (error) {
      console.error('Delete private info error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof PrivateInfoNotFoundError) {
        ResponseUtil.notFound(res, 'Private info not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      const projectData = req.body;
      const result = await businessProfileService.createProjectService(profileId, projectData);
      auditLogger.logProjectCreation(req.user?.id || '', profileId, result.project.projectId, req);
      ResponseUtil.success(res, 'Project created successfully', {
        profileId: result.profileId,
        ...result.project,
      });
    } catch (error) {
      console.error('Create project error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await businessProfileService.getProjectsService(profileId, page, limit);
      auditLogger.logProjectsAccess(req.user?.id || '', profileId, req);
      ResponseUtil.success(res, 'Projects retrieved successfully', {
        profileId: result.profileId,
        projects: result.projects,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get projects error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, projectId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      if (!projectId) {
        ResponseUtil.validationError(res, 'Project identifier is required', [
          { field: 'projectId', message: 'Project identifier is required' },
        ]);
        return;
      }
      const projectData = req.body;
      const result = await businessProfileService.updateProjectService(profileId, projectId, projectData);
      auditLogger.logProjectUpdate(req.user?.id || '', profileId, projectId, req);
      ResponseUtil.success(res, 'Project updated successfully', {
        profileId: result.profileId,
        ...result.project,
      });
    } catch (error) {
      console.error('Update project error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof ProjectNotFoundError) {
        ResponseUtil.notFound(res, 'Project not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, projectId } = req.params;
      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }
      if (!projectId) {
        ResponseUtil.validationError(res, 'Project identifier is required', [
          { field: 'projectId', message: 'Project identifier is required' },
        ]);
        return;
      }
      await businessProfileService.deleteProjectService(profileId, projectId);
      auditLogger.logProjectDeletion(req.user?.id || '', profileId, projectId, req);
      ResponseUtil.success(res, 'Project deleted successfully');
    } catch (error) {
      console.error('Delete project error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof ProjectNotFoundError) {
        ResponseUtil.notFound(res, 'Project not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async uploadBanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedBannerUrl: string | null = null;
    let tempFilePath: string | null = null;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const file = (req as any).file;

      if (!file) {
        ResponseUtil.validationError(res, 'Banner file is required', [
          { field: 'banner', message: 'Banner file is required' },
        ]);
        return;
      }

      try {
        tempFilePath = file.path;
        if (!tempFilePath) {
          throw new Error('File path is missing');
        }
        const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
        const s3Result = await uploadBusinessProfileBanner(tempFilePath, uniqueFileName, profileId);

        const bannerData = {
          fileId: s3Result.fileId,
          fileUrl: s3Result.fileUrl,
          filename: s3Result.fileName,
          uploadedAt: s3Result.uploadedAt,
        };

        uploadedBannerUrl = s3Result.fileUrl;

        const result = await businessProfileService.uploadBannerService(profileId, bannerData);

        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }

        ResponseUtil.success(res, 'Banner uploaded successfully', {
          bannerUrl: result.banner.fileUrl as string,
          banner: result.banner,
          updatedAt: new Date().toISOString(),
        });
      } catch (uploadError) {
        console.error('S3 upload error:', uploadError);
        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
        ResponseUtil.serverError(res, 'Failed to upload banner file');
        return;
      }
    } catch (error) {
      console.error('Upload banner error:', error);

      if (uploadedBannerUrl) {
        try {
          await deleteBusinessProfileBanner(uploadedBannerUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getBanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const result = await businessProfileService.getBannerService(profileId);

      const bannerUrl = result.banner ? (result.banner.fileUrl as string) : null;

      ResponseUtil.success(res, 'Banner retrieved successfully', {
        bannerUrl,
        banner: result.banner,
      });
    } catch (error) {
      console.error('Get banner error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updateBanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedBannerUrl: string | null = null;
    let oldBannerUrl: string | null = null;
    let tempFilePath: string | null = null;
    let oldBannerDeleted = false;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      let existingBanner: any = null;
      try {
        const existing = await businessProfileService.getBannerService(profileId);
        existingBanner = existing.banner;
        if (existingBanner?.fileUrl) {
          oldBannerUrl = existingBanner.fileUrl as string;
        }
      } catch {
      }

      const file = (req as any).file;

      if (!file) {
        ResponseUtil.validationError(res, 'Banner file is required', [
          { field: 'banner', message: 'Banner file is required' },
        ]);
        return;
      }

      let bannerData: {
        fileId: string;
        fileUrl: string;
        filename: string;
        uploadedAt: string;
      };

      try {
        tempFilePath = file.path;
        if (!tempFilePath) {
          throw new Error('File path is missing');
        }
        const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
        const s3Result = await uploadBusinessProfileBanner(tempFilePath, uniqueFileName, profileId);

        bannerData = {
          fileId: s3Result.fileId,
          fileUrl: s3Result.fileUrl,
          filename: s3Result.fileName,
          uploadedAt: s3Result.uploadedAt,
        };

        uploadedBannerUrl = s3Result.fileUrl;

        if (oldBannerUrl) {
          try {
            await deleteBusinessProfileBanner(oldBannerUrl, profileId);
            oldBannerDeleted = true;
          } catch (deleteError) {
            console.error('Failed to delete old banner:', deleteError);
          }
        }

        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
      } catch (uploadError) {
        console.error('S3 upload error:', uploadError);
        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
        ResponseUtil.serverError(res, 'Failed to upload banner file');
        return;
      }

      const result = await businessProfileService.updateBannerService(profileId, bannerData);

      ResponseUtil.success(res, 'Banner updated successfully', {
        bannerUrl: result.banner.fileUrl as string,
        banner: result.banner,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update banner error:', error);

      if (uploadedBannerUrl) {
        try {
          await deleteBusinessProfileBanner(uploadedBannerUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteBanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      let bannerUrl: string | null = null;
      try {
        const existing = await businessProfileService.getBannerService(profileId);
        if (existing.banner?.fileUrl) {
          bannerUrl = existing.banner.fileUrl as string;
        }
      } catch {
      }

      await businessProfileService.deleteBannerService(profileId);

      if (bannerUrl) {
        try {
          await deleteBusinessProfileBanner(bannerUrl, profileId);
        } catch (deleteError) {
          console.error('Failed to delete banner from S3 during deletion:', deleteError);
        }
      }

      ResponseUtil.success(res, 'Banner deleted successfully', {
        bannerUrl: null,
      });
    } catch (error) {
      console.error('Delete banner error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async createAchievement(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedCertificates: Array<{file_url: string}> = [];
    const tempFilePaths: string[] = [];

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const {
        award_name,
        awarding_organization,
        category,
        date_received,
        description,
        issuer,
        icon,
      } = req.body;

      if (!award_name || !date_received) {
        ResponseUtil.validationError(res, 'Required fields are missing', [
          { field: 'award_name', message: 'Award name is required' },
          { field: 'date_received', message: 'Date received is required' },
        ]);
        return;
      }

      const { randomUUID } = await import('crypto');
      const achievementId = randomUUID();

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      const certificateFiles = Array.isArray(files) ? files.filter((f: any) => f.fieldname === 'certificates') : [];

      if (certificateFiles.length > 0) {
        for (const file of certificateFiles) {
          try {
            const tempFilePath = file.path;
            if (!tempFilePath) {
              continue;
            }
            tempFilePaths.push(tempFilePath);
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadAchievementCertificate(tempFilePath, uniqueFileName, profileId, achievementId);
            uploadedCertificates.push({ file_url: s3Result.fileUrl });
            await cleanupTempFile(tempFilePath);
            const index = tempFilePaths.indexOf(tempFilePath);
            if (index > -1) {
              tempFilePaths.splice(index, 1);
            }
          } catch (uploadError) {
            console.error('Certificate upload error:', uploadError);
          }
        }
      }

      const achievementData = {
        achievementId,
        award_name,
        awarding_organization: awarding_organization || undefined,
        category: category || undefined,
        date_received,
        description: description || undefined,
        issuer: issuer || undefined,
        certificateUrl: uploadedCertificates.length > 0 ? uploadedCertificates : (undefined as any),
        icon: icon || undefined,
      };

      const result = await businessProfileService.createAchievementService(profileId, achievementData);

      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      ResponseUtil.success(res, 'Achievement created successfully', {
        achievementId: result.achievement.achievementId,
        ...result.achievement,
      });
    } catch (error) {
      console.error('Create achievement error:', error);

      for (const cert of uploadedCertificates) {
        try {
          await deleteAchievementCertificate(cert.file_url, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback certificate upload:', rollbackError);
        }
      }

      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, error.message, error.validationErrors);
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedAvatarUrl: string | null = null;
    let tempFilePath: string | null = null;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const file = (req as any).file;

      if (!file) {
        ResponseUtil.validationError(res, 'Avatar file is required', [
          { field: 'avatar', message: 'Avatar file is required' },
        ]);
        return;
      }

      try {
        tempFilePath = file.path;
        if (!tempFilePath) {
          throw new Error('File path is missing');
        }
        const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
        const s3Result = await uploadBusinessProfileAvatar(tempFilePath, uniqueFileName, profileId);

        const avatarData = {
          fileId: s3Result.fileId,
          fileUrl: s3Result.fileUrl,
          filename: s3Result.fileName,
          uploadedAt: s3Result.uploadedAt,
        };

        uploadedAvatarUrl = s3Result.fileUrl;

        const result = await businessProfileService.uploadAvatarService(profileId, avatarData);

        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }

        ResponseUtil.success(res, 'Avatar uploaded successfully', {
          avatarUrl: result.avatar.fileUrl as string,
          avatar: result.avatar,
          updatedAt: new Date().toISOString(),
        });
      } catch (uploadError) {
        console.error('S3 upload error:', uploadError);
        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
        ResponseUtil.serverError(res, 'Failed to upload avatar file');
        return;
      }
    } catch (error) {
      console.error('Upload avatar error:', error);

      if (uploadedAvatarUrl) {
        try {
          await deleteBusinessProfileAvatar(uploadedAvatarUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const result = await businessProfileService.getAvatarService(profileId);

      const avatarUrl = result.avatar ? (result.avatar.fileUrl as string) : null;

      ResponseUtil.success(res, 'Avatar retrieved successfully', {
        avatarUrl,
        avatar: result.avatar,
      });
    } catch (error) {
      console.error('Get avatar error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updateAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedAvatarUrl: string | null = null;
    let oldAvatarUrl: string | null = null;
    let tempFilePath: string | null = null;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      let existingAvatar: any = null;
      try {
        const existing = await businessProfileService.getAvatarService(profileId);
        existingAvatar = existing.avatar;
        if (existingAvatar?.fileUrl) {
          oldAvatarUrl = existingAvatar.fileUrl as string;
        }
      } catch {
      }

      const file = (req as any).file;

      if (!file) {
        ResponseUtil.validationError(res, 'Avatar file is required', [
          { field: 'avatar', message: 'Avatar file is required' },
        ]);
        return;
      }

      let avatarData: {
        fileId: string;
        fileUrl: string;
        filename: string;
        uploadedAt: string;
      };

      try {
        tempFilePath = file.path;
        if (!tempFilePath) {
          throw new Error('File path is missing');
        }
        const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
        const s3Result = await uploadBusinessProfileAvatar(tempFilePath, uniqueFileName, profileId);

        avatarData = {
          fileId: s3Result.fileId,
          fileUrl: s3Result.fileUrl,
          filename: s3Result.fileName,
          uploadedAt: s3Result.uploadedAt,
        };

        uploadedAvatarUrl = s3Result.fileUrl;

        if (oldAvatarUrl) {
          try {
            await deleteBusinessProfileAvatar(oldAvatarUrl, profileId);
          } catch (deleteError) {
            console.error('Failed to delete old avatar:', deleteError);
          }
        }

        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
      } catch (uploadError) {
        console.error('S3 upload error:', uploadError);
        if (tempFilePath) {
          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        }
        ResponseUtil.serverError(res, 'Failed to upload avatar file');
        return;
      }

      const result = await businessProfileService.updateAvatarService(profileId, avatarData);

      ResponseUtil.success(res, 'Avatar updated successfully', {
        avatarUrl: result.avatar.fileUrl as string,
        avatar: result.avatar,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update avatar error:', error);

      if (uploadedAvatarUrl) {
        try {
          await deleteBusinessProfileAvatar(uploadedAvatarUrl, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 upload:', rollbackError);
        }
      }

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, error.message, error.validationErrors);
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      let avatarUrl: string | null = null;
      try {
        const existing = await businessProfileService.getAvatarService(profileId);
        if (existing.avatar?.fileUrl) {
          avatarUrl = existing.avatar.fileUrl as string;
        }
      } catch {
      }

      await businessProfileService.deleteAvatarService(profileId);

      if (avatarUrl) {
        try {
          await deleteBusinessProfileAvatar(avatarUrl, profileId);
        } catch (deleteError) {
          console.error('Failed to delete avatar from S3 during deletion:', deleteError);
        }
      }

      ResponseUtil.success(res, 'Avatar deleted successfully', {
        avatarUrl: null,
      });
    } catch (error) {
      console.error('Delete avatar error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getAchievements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const result = await businessProfileService.getAchievementsService(profileId, page, limit);

      ResponseUtil.success(res, 'Achievements retrieved successfully', {
        achievements: result.achievements,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get achievements error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getAchievement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, achievementId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!achievementId) {
        ResponseUtil.validationError(res, 'Achievement identifier is required', [
          { field: 'achievementId', message: 'Achievement identifier is required' },
        ]);
        return;
      }

      const result = await businessProfileService.getAchievementService(profileId, achievementId);

      ResponseUtil.success(res, 'Achievement retrieved successfully', {
        achievement: result.achievement,
      });
    } catch (error) {
      console.error('Get achievement error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof AchievementNotFoundError) {
        ResponseUtil.notFound(res, 'Achievement not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updateAchievement(req: AuthenticatedRequest, res: Response): Promise<void> {
    let uploadedCertificates: Array<{file_url: string}> = [];
    let oldCertificates: Array<{file_url: string}> = [];
    const tempFilePaths: string[] = [];

    try {
      const { profileId, achievementId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!achievementId) {
        ResponseUtil.validationError(res, 'Achievement identifier is required', [
          { field: 'achievementId', message: 'Achievement identifier is required' },
        ]);
        return;
      }

      let existingAchievement: any = null;
      try {
        const existing = await businessProfileService.getAchievementService(profileId, achievementId);
        existingAchievement = existing.achievement;
        if (existingAchievement?.certificateUrl && Array.isArray(existingAchievement.certificateUrl)) {
          oldCertificates = existingAchievement.certificateUrl;
        }
      } catch {
      }

      const {
        award_name,
        awarding_organization,
        category,
        date_received,
        description,
        issuer,
        icon,
      } = req.body;

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      const certificateFiles = Array.isArray(files) ? files.filter((f: any) => f.fieldname === 'certificates') : [];

      if (certificateFiles.length > 0) {
        for (const file of certificateFiles) {
          try {
            const tempFilePath = file.path;
            if (!tempFilePath) {
              continue;
            }
            tempFilePaths.push(tempFilePath);
            const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
            const s3Result = await uploadAchievementCertificate(tempFilePath, uniqueFileName, profileId, achievementId);
            uploadedCertificates.push({ file_url: s3Result.fileUrl });
            await cleanupTempFile(tempFilePath);
            const index = tempFilePaths.indexOf(tempFilePath);
            if (index > -1) {
              tempFilePaths.splice(index, 1);
            }
          } catch (uploadError) {
            console.error('Certificate upload error:', uploadError);
          }
        }
      }

      const updateData: any = {};
      if (award_name !== undefined) updateData.award_name = award_name;
      if (awarding_organization !== undefined) updateData.awarding_organization = awarding_organization;
      if (category !== undefined) updateData.category = category;
      if (date_received !== undefined) updateData.date_received = date_received;
      if (description !== undefined) updateData.description = description;
      if (issuer !== undefined) updateData.issuer = issuer;
      if (icon !== undefined) updateData.icon = icon;
      if (uploadedCertificates.length > 0) {
        updateData.certificateUrl = uploadedCertificates;
      }

      const result = await businessProfileService.updateAchievementService(profileId, achievementId, updateData);

      if (oldCertificates.length > 0 && uploadedCertificates.length > 0) {
        for (const oldCert of oldCertificates) {
          try {
            await deleteAchievementCertificate(oldCert.file_url, profileId);
          } catch (deleteError) {
            console.error('Failed to delete old certificate:', deleteError);
          }
        }
      }

      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      ResponseUtil.success(res, 'Achievement updated successfully', {
        achievementId: result.achievement.achievementId,
        ...result.achievement,
      });
    } catch (error) {
      console.error('Update achievement error:', error);

      for (const cert of uploadedCertificates) {
        try {
          await deleteAchievementCertificate(cert.file_url, req.params.profileId);
        } catch (rollbackError) {
          console.error('Failed to rollback certificate upload:', rollbackError);
        }
      }

      for (const tempPath of tempFilePaths) {
        try {
          await cleanupTempFile(tempPath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof AchievementNotFoundError) {
        ResponseUtil.notFound(res, 'Achievement not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, error.message, error.validationErrors);
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deleteAchievement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, achievementId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!achievementId) {
        ResponseUtil.validationError(res, 'Achievement identifier is required', [
          { field: 'achievementId', message: 'Achievement identifier is required' },
        ]);
        return;
      }

      let certificates: Array<{file_url: string}> = [];
      try {
        const existing = await businessProfileService.getAchievementService(profileId, achievementId);
        if (existing.achievement?.certificateUrl && Array.isArray(existing.achievement.certificateUrl)) {
          certificates = existing.achievement.certificateUrl as Array<{file_url: string}>;
        }
      } catch {
      }

      await businessProfileService.deleteAchievementService(profileId, achievementId);

      if (certificates.length > 0) {
        for (const cert of certificates) {
          try {
            await deleteAchievementCertificate(cert.file_url, profileId);
          } catch (deleteError) {
            console.error('Failed to delete certificate from S3 during deletion:', deleteError);
          }
        }
      }

      ResponseUtil.success(res, 'Achievement deleted successfully');
    } catch (error) {
      console.error('Delete achievement error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof AchievementNotFoundError) {
        ResponseUtil.notFound(res, 'Achievement not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * =========================
   * Business Posts (posts table)
   * =========================
   */

  /**
   * Create a business post
   * @route POST /business-profile/:profileId/posts
   */
  async createBusinessPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const { title, content, tags } = req.body;

      if (!title) {
        ResponseUtil.validationError(res, 'Title is required', [
          { field: 'title', message: 'Title is required' },
        ]);
        return;
      }

      if (!content) {
        ResponseUtil.validationError(res, 'Content is required', [
          { field: 'content', message: 'Content is required' },
        ]);
        return;
      }

      const mediaItems: any[] = [];
      const file = (req as any).file as Express.Multer.File | undefined;

      if (file) {
        try {
          tempFilePath = file.path;
          if (!tempFilePath) {
            throw new Error('File path is missing');
          }
          const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
          const s3Result = await uploadMediaToS3(tempFilePath, uniqueFileName, `business-profile/${profileId}/posts`);

          mediaItems.push({
            url: s3Result.fileUrl,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            filename: s3Result.fileName,
            size: file.size,
            uploadedAt: s3Result.uploadedAt,
          });

          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        } catch (uploadError) {
          console.error('Business post media upload error:', uploadError);
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
          ResponseUtil.serverError(res, 'Failed to upload media file');
          return;
        }
      }

      const parsedTags: string[] =
        Array.isArray(tags) ? tags : typeof tags === 'string' && tags.length
          ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];

      const result = await businessProfileService.createBusinessPost(profileId, {
        title,
        content,
        tags: parsedTags,
        mediaItems,
      });

      ResponseUtil.success(res, 'Post created successfully', {
        postId: result.postId,
        profileId: result.profileId,
        title: result.title,
        content: result.content,
        status: result.status,
        tags: result.tags,
        media: result.media,
        createdAt: result.createdAt,
      });
    } catch (error) {
      console.error('Create business post error:', error);

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get all business posts for a profile (paginated)
   * @route GET /business-profile/:profileId/posts
   */
  async getBusinessPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await businessProfileService.getBusinessPosts(profileId, page, limit);

      ResponseUtil.success(res, 'Posts retrieved successfully', {
        posts: result.posts,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get business posts error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Get single business post
   * @route GET /business-profile/:profileId/posts/:postId
   */
  async getBusinessPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, postId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!postId) {
        ResponseUtil.validationError(res, 'Post identifier is required', [
          { field: 'postId', message: 'Post identifier is required' },
        ]);
        return;
      }

      const post = await businessProfileService.getBusinessPost(profileId, postId);

      ResponseUtil.success(res, 'Post retrieved successfully', post);
    } catch (error) {
      console.error('Get business post error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof ProjectNotFoundError) {
        ResponseUtil.notFound(res, 'Post not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Update business post
   * @route PUT /business-profile/:profileId/posts/:postId
   */
  async updateBusinessPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      const { profileId, postId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!postId) {
        ResponseUtil.validationError(res, 'Post identifier is required', [
          { field: 'postId', message: 'Post identifier is required' },
        ]);
        return;
      }

      const { title, content, tags } = req.body;

      const mediaItems: any[] = [];
      const file = (req as any).file as Express.Multer.File | undefined;

      if (file) {
        try {
          tempFilePath = file.path;
          if (!tempFilePath) {
            throw new Error('File path is missing');
          }
          const uniqueFileName = generateUniqueFileName(profileId, file.originalname);
          const s3Result = await uploadMediaToS3(tempFilePath, uniqueFileName, `business-profile/${profileId}/posts`);

          mediaItems.push({
            url: s3Result.fileUrl,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            filename: s3Result.fileName,
            size: file.size,
            uploadedAt: s3Result.uploadedAt,
          });

          await cleanupTempFile(tempFilePath);
          tempFilePath = null;
        } catch (uploadError) {
          console.error('Business post media upload error:', uploadError);
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = null;
          }
          ResponseUtil.serverError(res, 'Failed to upload media file');
          return;
        }
      }

      const parsedTags: string[] =
        Array.isArray(tags) ? tags : typeof tags === 'string' && tags.length
          ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];

      // Prepare the payload object
      const updatePayload: any = {
        title,
        content,
        tags: parsedTags,
      };
      // Only include mediaItems if there are actual media files uploaded
      if (mediaItems.length > 0) {
        updatePayload.mediaItems = mediaItems;
      }

      const result = await businessProfileService.updateBusinessPost(profileId, postId, updatePayload);

      ResponseUtil.success(res, 'Post updated successfully', {
        postId: result.postId,
        title: result.title,
        updatedAt: result.updatedAt,
      });
    } catch (error) {
      console.error('Update business post error:', error);

      if (tempFilePath) {
        try {
          await cleanupTempFile(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }

      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      if (error instanceof ProjectNotFoundError) {
        ResponseUtil.notFound(res, 'Post not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * Delete business post
   * @route DELETE /business-profile/:profileId/posts/:postId
   */
  async deleteBusinessPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, postId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!postId) {
        ResponseUtil.validationError(res, 'Post identifier is required', [
          { field: 'postId', message: 'Post identifier is required' },
        ]);
        return;
      }

      await businessProfileService.deleteBusinessPost(profileId, postId);

      ResponseUtil.success(res, 'Post deleted successfully');
    } catch (error) {
      console.error('Delete business post error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof ProjectNotFoundError) {
        ResponseUtil.notFound(res, 'Post not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getPrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const requesterId = req.user?.id;
      const result = await businessProfileService.getPrivacySettings(profileId, requesterId);

      ResponseUtil.success(res, 'Privacy settings retrieved successfully', result);
    } catch (error) {
      console.error('Get privacy settings error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async updatePrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      const updateData = req.body;
      if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
        ResponseUtil.validationError(res, 'Privacy settings data must be provided as an object', [
          { field: 'body', message: 'Privacy settings data must be provided as an object' },
        ]);
        return;
      }

      const result = await businessProfileService.updatePrivacySettings(profileId, updateData);

      ResponseUtil.success(res, 'Privacy settings updated successfully', result);
    } catch (error) {
      console.error('Update privacy settings error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof BusinessProfileValidationError) {
        ResponseUtil.validationError(res, 'Validation failed', error.validationErrors);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async deletePrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      await businessProfileService.deletePrivacySettings(profileId);

      ResponseUtil.success(res, 'Privacy settings reset to default');
    } catch (error) {
      console.error('Delete privacy settings error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async sendInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const { inviteeId, inviteeEmail, role } = req.body;
      const ownerId = req.user?.id;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!ownerId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      const inviteeIdentifier = inviteeId || inviteeEmail;
      if (!inviteeIdentifier) {
        ResponseUtil.validationError(res, 'Invitee identifier is required', [
          { field: 'inviteeId', message: 'Either inviteeId or inviteeEmail is required' },
        ]);
        return;
      }

      if (!role) {
        ResponseUtil.validationError(res, 'Role is required', [
          { field: 'role', message: 'Role is required' },
        ]);
        return;
      }

      const result = await businessProfileService.sendInvitationService(
        profileId,
        inviteeIdentifier,
        role,
        ownerId
      );

      ResponseUtil.success(res, 'Invitation sent successfully', result);
    } catch (error) {
      console.error('Send invitation error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof UserNotFoundError) {
        ResponseUtil.notFound(res, 'User not found with provided ID or email');
        return;
      }
      if (error instanceof UserAlreadyMemberError) {
        ResponseUtil.conflict(res, 'User is already a member of this profile');
        return;
      }
      if (error instanceof PendingInvitationExistsError) {
        ResponseUtil.conflict(res, 'User already has a pending invitation for this profile');
        return;
      }
      if (error instanceof InvalidRoleError) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'role', message: 'Role must be either admin or editor' },
        ]);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async cancelInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId, invitationId } = req.params;
      const userId = req.user?.id;

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (!invitationId) {
        ResponseUtil.validationError(res, 'Invitation identifier is required', [
          { field: 'invitationId', message: 'Invitation identifier is required' },
        ]);
        return;
      }

      if (!userId) {
        ResponseUtil.unauthorized(res, 'Authentication failed');
        return;
      }

      await businessProfileService.cancelInvitationService(invitationId, profileId, userId);

      ResponseUtil.success(res, 'Invitation cancelled successfully', {
        invitationId,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cancel invitation error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      if (error instanceof InvitationNotFoundError) {
        ResponseUtil.notFound(res, 'Invitation not found');
        return;
      }
      if (error instanceof Error && error.message.includes('not pending')) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'invitationId', message: error.message },
        ]);
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  async getProfileInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const status = (req.query.status as string) || 'all';
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);

      if (!profileId) {
        ResponseUtil.validationError(res, 'Profile identifier is required', [
          { field: 'profileId', message: 'Profile identifier is required' },
        ]);
        return;
      }

      if (page < 1) {
        ResponseUtil.validationError(res, 'Validation failed', [
          { field: 'page', message: 'Page must be greater than 0' },
        ]);
        return;
      }

      const result = await businessProfileService.getInvitationsByProfile(profileId, status, page, limit);

      ResponseUtil.success(res, 'Invitations retrieved successfully', result);
    } catch (error) {
      console.error('Get profile invitations error:', error);
      if (error instanceof BusinessProfileNotFoundError) {
        ResponseUtil.notFound(res, 'Business profile not found');
        return;
      }
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}
export const businessProfileController = new BusinessProfileController();
export default businessProfileController;