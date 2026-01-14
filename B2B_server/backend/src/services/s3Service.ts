import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { profile } from 'console';

// S3 Configuration types

type S3BucketType = 'resume' | 'posts' | 'profileImage' | 'certificate' | 'businessProfile' | 'jobApplication' | 'resumeUpload' | 'chatMedia' | 'contestSubmission' ;

interface S3Config {
  bucketName: string;
  region: string;
  client: S3Client;
}

// Initialize S3 configurations
const s3Configs: Record<S3BucketType, S3Config> = {
  resume: {
    bucketName: config.RESUME_AWS_S3_BUCKET_NAME,
    region: config.AWS_S3_REGION,
    client: new S3Client({
      region: config.AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  posts: {
    bucketName: config.POSTS_AWS_S3_BUCKET_NAME,
    region: config.POSTS_AWS_S3_REGION,
    client: new S3Client({
      region: config.POSTS_AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  profileImage: {
    bucketName: config.AWS_S3_PROFILE_BUCKET_NAME,
    region: config.AWS_S3_REGION,
    client: new S3Client({
      region: config.AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  // Certificate uses the same bucket as profileImage but different folder
  certificate: {
    bucketName: config.AWS_S3_PROFILE_BUCKET_NAME,
    region: config.AWS_S3_REGION,
    client: new S3Client({
      region: config.AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  businessProfile: {
    bucketName: config.BUSINESS_PROFILE_AWS_S3_BUCKET_NAME || config.AWS_S3_PROFILE_BUCKET_NAME,
    region: config.BUSINESS_PROFILE_AWS_S3_REGION || config.AWS_S3_REGION,
    client: new S3Client({
      region: config.BUSINESS_PROFILE_AWS_S3_REGION || config.AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  contestSubmission: {
    bucketName: config.AWS_S3_PROFILE_BUCKET_NAME,
    region: config.AWS_S3_REGION,
    client: new S3Client({
      region: config.AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  jobApplication: {
    bucketName: config.JOB_APPLICATIONS_AWS_S3_BUCKET_NAME,
    region: config.JOB_APPLICATIONS_AWS_S3_REGION,
    client: new S3Client({
      region: config.JOB_APPLICATIONS_AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  resumeUpload: {
    bucketName: config.RESUME_UPLOADS_BUCKET_NAME,
    region: config.RESUME_UPLOADS_BUCKET_REGION,
    client: new S3Client({
      region: config.RESUME_UPLOADS_BUCKET_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
  chatMedia: {
    bucketName: config.CHAT_MEDIA_AWS_S3_BUCKET_NAME,
    region: config.CHAT_MEDIA_AWS_S3_REGION,
    client: new S3Client({
      region: config.CHAT_MEDIA_AWS_S3_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    }),
  },
};

// File type configurations
const FILE_TYPE_CONFIGS = {
  resume: {
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    contentTypes: {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    defaultFolder: 'resumes',
    maxSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  posts: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov'],
    contentTypes: {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
    },
    defaultFolder: 'posts',
    maxSize: config.POSTS_MAX_VIDEO_SIZE_MB * 1024 * 1024,
  },
  profileImage: {
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    contentTypes: {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    },
    defaultFolder: 'avatars',
    maxSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  certificate: {
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    contentTypes: {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    },
    defaultFolder: 'certificates',
    maxSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  businessProfile: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.mp4', '.mov', '.pdf'],
    contentTypes: {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
    },
    defaultFolder: 'business-profile',
    maxSize: config.POSTS_MAX_VIDEO_SIZE_MB * 1024 * 1024,
  },
  contestSubmission: {
    allowedExtensions: ['.pdf', '.zip'],
    contentTypes: {
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    },
    defaultFolder: 'submissions',
    maxSize: 10 * 1024 * 1024, // 10MB
      },
  jobApplication: {
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    contentTypes: {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    defaultFolder: 'job-applications',
    maxSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  resumeUpload: {
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
    contentTypes: {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    },
    defaultFolder: 'resume-uploads',
    maxSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  chatMedia: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.mp4', '.mov', '.mp3', '.wav', '.m4a'],
    contentTypes: {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
    },
    defaultFolder: 'chat-media',
    maxSize: config.CHAT_MEDIA_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
};

/**
 * Upload file to S3 bucket (dynamic function for both resume and posts)
 * @param filePath - Local path to the file
 * @param fileName - Desired filename in S3
 * @param bucketType - Type of bucket ('resume' or 'posts')
 * @param folder - Optional folder prefix in S3 (default based on bucketType)
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadFileToS3 = async (
  filePath: string,
  fileName: string,
  bucketType: S3BucketType = 'resume',
  folder?: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  try {
    // For certificates, use profileImage bucket
    const effectiveBucketType = bucketType === 'certificate' ? 'profileImage' : bucketType;
    
    // Get S3 configuration for the bucket type
    const s3Config = s3Configs[effectiveBucketType];
    // Use certificate config if bucketType is certificate, otherwise use the bucket's config
    const fileConfig = bucketType === 'certificate' 
      ? FILE_TYPE_CONFIGS.certificate 
      : FILE_TYPE_CONFIGS[bucketType];

    // Validate environment variables
    if (!s3Config.bucketName) {
      throw new Error(`${bucketType} AWS S3 bucket name is not configured`);
    }

    if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Read file from local filesystem
    const fileContent = await fs.promises.readFile(filePath);

    // Validate file extension
    const fileExtension = path.extname(fileName).toLowerCase();
    if (!fileConfig.allowedExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file extension. Allowed: ${fileConfig.allowedExtensions.join(', ')}`);
    }

    // Determine content type based on file extension
    const contentType = fileConfig.contentTypes[fileExtension as keyof typeof fileConfig.contentTypes] || 'application/octet-stream';

    // Use default folder if not provided
    const targetFolder = folder || fileConfig.defaultFolder;

    // Construct S3 key (path in bucket)
    const s3Key = `${targetFolder}/${fileName}`;

    // Prepare upload parameters
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ServerSideEncryption: 'AES256' as const, // Enable server-side encryption
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: path.basename(filePath),
        bucketType: bucketType,
      },
    };

    // Execute upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Config.client.send(command);

    // Construct file URL
    const fileUrl = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`;

    // Generate file ID (using S3 key as unique identifier)
    const fileId = `s3_${Buffer.from(s3Key).toString('base64').substring(0, 20)}`;

    console.log(`File uploaded successfully to S3 (${bucketType}): ${fileUrl}`);

    return {
      fileId,
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error uploading file to S3 (${bucketType}):`, error);
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadBufferToS3 = async (
  fileBuffer: Buffer,
  fileName: string,
  bucketType: S3BucketType = 'resume',
  contentType: string,
  folder?: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  try {
    const effectiveBucketType = bucketType === 'certificate' ? 'profileImage' : bucketType;
    const s3Config = s3Configs[effectiveBucketType];
    const fileConfig = bucketType === 'certificate'
      ? FILE_TYPE_CONFIGS.certificate
      : FILE_TYPE_CONFIGS[bucketType];

    if (!s3Config.bucketName) {
      throw new Error(`${bucketType} AWS S3 bucket name is not configured`);
    }

    if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured');
    }

    const targetFolder = folder || fileConfig.defaultFolder;
    const s3Key = `${targetFolder}/${fileName}`;

    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256' as const,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: fileName,
        bucketType: bucketType,
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Config.client.send(command);

    const fileUrl = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`;
    const fileId = `s3_${Buffer.from(s3Key).toString('base64').substring(0, 20)}`;

    return {
      fileId,
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error uploading buffer to S3 (${bucketType}):`, error);
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Upload media file to posts S3 bucket (convenience function)
 * @param filePath - Local path to the file
 * @param fileName - Desired filename in S3
 * @param folder - Optional folder prefix in S3 (default: 'posts')
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadMediaToS3 = async (
  filePath: string,
  fileName: string,
  folder: string = 'posts'
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  return uploadFileToS3(filePath, fileName, 'posts', folder);
};

/**
 * Delete file from S3 bucket (dynamic function for both resume and posts)
 * @param fileName - Name of the file to delete
 * @param bucketType - Type of bucket ('resume' or 'posts')
 * @param folder - Folder prefix in S3 (default based on bucketType)
 * @returns Delete operation result
 */
export const deleteFileFromS3 = async (
  fileName: string,
  bucketType: S3BucketType = 'resume',
  folder?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // For certificates, use profileImage bucket
    const effectiveBucketType = bucketType === 'certificate' ? 'profileImage' : bucketType;
    
    // Get S3 configuration for the bucket type
    const s3Config = s3Configs[effectiveBucketType];
    // Use certificate config if bucketType is certificate, otherwise use the bucket's config
    const fileConfig = bucketType === 'certificate' 
      ? FILE_TYPE_CONFIGS.certificate 
      : FILE_TYPE_CONFIGS[bucketType];

    // Validate bucket name
    if (!s3Config.bucketName) {
      throw new Error(`${bucketType} AWS S3 bucket name is not configured`);
    }

    // Use default folder if not provided
    const targetFolder = folder || fileConfig.defaultFolder;

    // Construct S3 key
    const s3Key = `${targetFolder}/${fileName}`;

    // Prepare delete parameters
    const deleteParams = {
      Bucket: s3Config.bucketName,
      Key: s3Key,
    };

    // Execute delete command
    const command = new DeleteObjectCommand(deleteParams);
    await s3Config.client.send(command);

    console.log(`File deleted successfully from S3 (${bucketType}): ${s3Key}`);

    return {
      success: true,
      message: `File deleted successfully from S3 (${bucketType})`,
    };
  } catch (error) {
    console.error(`Error deleting file from S3 (${bucketType}):`, error);
    return {
      success: false,
      message: `Failed to delete file from S3 (${bucketType}): ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Delete media file from posts S3 bucket (convenience function)
 * @param fileName - Name of the file to delete
 * @param folder - Folder prefix in S3 (default: 'posts')
 * @returns Delete operation result
 */
export const deleteMediaFromS3 = async (
  fileName: string,
  folder: string = 'posts'
): Promise<{ success: boolean; message: string }> => {
  return deleteFileFromS3(fileName, 'posts', folder);
};

/**
 * Generate presigned URL for temporary access to S3 file (dynamic function)
 * Note: This is a placeholder for future implementation
 * Requires @aws-sdk/s3-request-presigner package
 */
export const generatePresignedUrl = async (
  fileName: string,
  bucketType: S3BucketType = 'resume',
  folder?: string,
  expiresIn: number = 3600
): Promise<string> => {
  // Implementation requires @aws-sdk/s3-request-presigner
  // This is a placeholder for future enhancement
  const s3Config = s3Configs[bucketType];
  const fileConfig = FILE_TYPE_CONFIGS[bucketType];
  const targetFolder = folder || fileConfig.defaultFolder;
  const s3Key = `${targetFolder}/${fileName}`;
  return `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`;
};

/**
 * Generate presigned URL for resume files (convenience function)
 */
export const generateResumePresignedUrl = async (
  fileName: string,
  folder: string = 'resumes',
  expiresIn: number = 3600
): Promise<string> => {
  return generatePresignedUrl(fileName, 'resume', folder, expiresIn);
};

/**
 * Generate presigned URL for posts media files (convenience function)
 */
export const generateMediaPresignedUrl = async (
  fileName: string,
  folder: string = 'posts',
  expiresIn: number = 3600
): Promise<string> => {
  return generatePresignedUrl(fileName, 'posts', folder, expiresIn);
};

/**
 * Extract S3 key from certificate URL
 * @param certificateUrl - Full S3 URL of the certificate
 * @returns S3 key (folder/filename)
 */
export const extractS3KeyFromCertificateUrl = (certificateUrl: string): string | null => {
  try {
    // Extract key from URL format: https://bucket.s3.region.amazonaws.com/certificates/filename
    const urlPattern = /https?:\/\/[^\/]+\/(.+)/;
    const match = certificateUrl.match(urlPattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // If URL doesn't match expected format, try to extract from path
    const urlObj = new URL(certificateUrl);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
      return pathParts.join('/');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting S3 key from certificate URL:', error);
    return null;
  }
};

/**
 * Extract filename from S3 key for certificate deletion
 * @param s3Key - S3 key (e.g., "certificates/userId_timestamp_file.pdf")
 * @returns Just the filename part
 */
export const extractFileNameFromS3Key = (s3Key: string): string => {
  const parts = s3Key.split('/');
  return parts[parts.length - 1] || s3Key;
};

/**
 * Upload business profile introduction video to S3
 * @param filePath - Local path to the video file
 * @param fileName - Desired filename in S3
 * @param profileId - Business profile ID for folder organization
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadBusinessProfileVideo = async (
  filePath: string,
  fileName: string,
  profileId: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const folder = `business-profile/${profileId}/videos`;
  return uploadFileToS3(filePath, fileName, 'businessProfile', folder);
};

/**
 * Delete business profile introduction video from S3
 * @param videoUrl - Full S3 URL of the video
 * @param profileId - Business profile ID (optional, for folder context)
 * @returns Delete operation result
 */
export const deleteBusinessProfileVideo = async (
  videoUrl: string,
  profileId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const s3Key = extractS3KeyFromBusinessProfileUrl(videoUrl);
    if (!s3Key) {
      return {
        success: false,
        message: 'Could not extract S3 key from video URL',
      };
    }

    // Extract folder and filename from S3 key
    // Format: business-profile/profileId/videos/filename.mp4
    const keyParts = s3Key.split('/').filter(part => part.length > 0);
    if (keyParts.length === 0) {
      return {
        success: false,
        message: 'Invalid S3 key format',
      };
    }
    
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') : 'business-profile';
    
    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 key',
      };
    }
    
    return deleteFileFromS3(fileName, 'businessProfile', folder);
  } catch (error) {
    console.error('Error deleting business profile video:', error);
    return {
      success: false,
      message: `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Extract S3 key from business profile video URL
 * @param videoUrl - Full S3 URL of the video
 * @returns S3 key (folder/filename) or null if extraction fails
 */
export const extractS3KeyFromBusinessProfileUrl = (videoUrl: string): string | null => {
  try {
    // Extract key from URL format: https://bucket.s3.region.amazonaws.com/business-profile/profileId/videos/filename
    const urlPattern = /https?:\/\/[^\/]+\/(.+)/;
    const match = videoUrl.match(urlPattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // If URL doesn't match expected format, try to extract from path
    const urlObj = new URL(videoUrl);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
      return pathParts.join('/');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting S3 key from business profile video URL:', error);
    return null;
  }
};

/**
 * Upload private info file (registration certificate or business license) to S3
 * @param filePath - Local file path
 * @param fileName - File name
 * @param profileId - Business profile ID
 * @param fileType - Type of file: 'registration_certificate' or 'business_license'
 * @returns Upload result with file metadata
 */
export const uploadPrivateInfoFile = async (
  filePath: string,
  fileName: string,
  profileId: string,
  fileType: 'registration_certificate' | 'business_license'
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const folder = `business-profile/${profileId}/${fileType === 'registration_certificate' ? 'business-registration' : 'business-license'}`;
  return uploadFileToS3(filePath, fileName, 'businessProfile', folder);
};

/**
 * Delete private info file from S3
 * @param fileUrl - Full S3 URL of the file
 * @param profileId - Business profile ID (optional, for folder context)
 * @param fileType - Type of file: 'registration_certificate' or 'business_license'
 * @returns Delete operation result
 */
export const deletePrivateInfoFile = async (
  fileUrl: string,
  profileId?: string,
  fileType?: 'registration_certificate' | 'business_license'
): Promise<{ success: boolean; message: string }> => {
  try {
    const s3Key = extractS3KeyFromBusinessProfileUrl(fileUrl);
    if (!s3Key) {
      return {
        success: false,
        message: 'Could not extract S3 key from file URL',
      };
    }

    // Extract folder and filename from S3 key
    // Format: business-profile/profileId/business-registration/filename.pdf
    // or: business-profile/profileId/business-license/filename.pdf
    const keyParts = s3Key.split('/').filter(part => part.length > 0);
    if (keyParts.length === 0) {
      return {
        success: false,
        message: 'Invalid S3 key format',
      };
    }
    
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') : 'business-profile';
    
    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 key',
      };
    }
    
    return deleteFileFromS3(fileName, 'businessProfile', folder);
  } catch (error) {
    console.error('Error deleting private info file:', error);
    return {
      success: false,
      message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Upload business profile banner to S3
 * @param filePath - Local path to the banner file
 * @param fileName - Desired filename in S3
 * @param profileId - Business profile ID for folder organization
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadBusinessProfileBanner = async (
  filePath: string,
  fileName: string,
  profileId: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const folder = `business-profile/${profileId}/banners`;
  return uploadFileToS3(filePath, fileName, 'businessProfile', folder);
};

/**
 * Delete business profile banner from S3
 * @param bannerUrl - Full S3 URL of the banner
 * @param profileId - Business profile ID (optional, for folder context)
 * @returns Delete operation result
 */
export const deleteBusinessProfileBanner = async (
  bannerUrl: string,
  profileId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const s3Key = extractS3KeyFromBusinessProfileUrl(bannerUrl);
    if (!s3Key) {
      return {
        success: false,
        message: 'Could not extract S3 key from banner URL',
      };
    }

    const keyParts = s3Key.split('/').filter(part => part.length > 0);
    if (keyParts.length === 0) {
      return {
        success: false,
        message: 'Invalid S3 key format',
      };
    }
    
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') : 'business-profile';
    
    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 key',
      };
    }
    
    return deleteFileFromS3(fileName, 'businessProfile', folder);
  } catch (error) {
    console.error('Error deleting business profile banner:', error);
    return {
      success: false,
      message: `Failed to delete banner: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Upload achievement certificate to S3
 * @param filePath - Local path to the certificate file
 * @param fileName - Desired filename in S3
 * @param profileId - Business profile ID for folder organization
 * @param achievementId - Achievement ID for folder organization
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadAchievementCertificate = async (
  filePath: string,
  fileName: string,
  profileId: string,
  achievementId: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const folder = `business-profile/${profileId}/achievements/${achievementId}/certificates`;
  return uploadFileToS3(filePath, fileName, 'businessProfile', folder);
};

/**
 * Upload business profile avatar to S3
 * @param filePath - Local path to the avatar file
 * @param fileName - Desired filename in S3
 * @param profileId - Business profile ID for folder organization
 * @returns Upload response with file ID, URL, and metadata
 */
export const uploadBusinessProfileAvatar = async (
  filePath: string,
  fileName: string,
  profileId: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const folder = `business-profile/${profileId}/avatars`;
  return uploadFileToS3(filePath, fileName, 'businessProfile', folder);
};

/**
 * Delete achievement certificate from S3
 * @param certificateUrl - Full S3 URL of the certificate
 * @param profileId - Business profile ID (optional, for folder context)
 * @returns Delete operation result
 */
export const deleteAchievementCertificate = async (
  certificateUrl: string,
  profileId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const s3Key = extractS3KeyFromBusinessProfileUrl(certificateUrl);
    if (!s3Key) {
      return {
        success: false,
        message: 'Could not extract S3 key from certificate URL',
      };
    }

    const keyParts = s3Key.split('/').filter(part => part.length > 0);
    if (keyParts.length === 0) {
      return {
        success: false,
        message: 'Invalid S3 key format',
      };
    }
    
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') : 'business-profile';
    
    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 key',
      };
    }
    
    return deleteFileFromS3(fileName, 'businessProfile', folder);
  } catch (error) {
    console.error('Error deleting achievement certificate:', error);
    return {
      success: false,
      message: `Failed to delete certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Delete business profile avatar from S3
 * @param avatarUrl - Full S3 URL of the avatar
 * @param profileId - Business profile ID (optional, for folder context)
 * @returns Delete operation result
 */
export const deleteBusinessProfileAvatar = async (
  avatarUrl: string,
  profileId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const s3Key = extractS3KeyFromBusinessProfileUrl(avatarUrl);
    if (!s3Key) {
      return {
        success: false,
        message: 'Could not extract S3 key from avatar URL',
      };
    }

    const keyParts = s3Key.split('/').filter(part => part.length > 0);
    if (keyParts.length === 0) {
      return {
        success: false,
        message: 'Invalid S3 key format',
      };
    }
    
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.length > 1 ? keyParts.slice(0, -1).join('/') : 'business-profile';
    
    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 key',
      };
    }
    
    return deleteFileFromS3(fileName, 'businessProfile', folder);
  } catch (error) {
    console.error('Error deleting business profile avatar:', error);
    return {
      success: false,
      message: `Failed to delete avatar: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Upload contest submission file to S3
 * @param filePath - Local path to the submission file
 * @param contestId - Contest ID for organizing submissions
 * @param userId - User ID who is submitting
 * @returns Upload response with file URL and metadata
 */
export const uploadContestSubmissionToS3 = async (
  filePath: string,
  contestId: string,
  userId: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
    try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(filePath);
    const fileName = `${userId}_${timestamp}${fileExtension}`;
    
    // Create folder structure: submissions/{contestId}/{userId}_{timestamp}.ext
    const folder = `submissions/${contestId}`;
    
    // Upload to S3
    return await uploadFileToS3(filePath, fileName, 'contestSubmission', folder);
  } catch (error) {
    console.error('Error uploading contest submission:', error);
    throw new Error(`Failed to upload submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete contest submission from S3
 * @param fileUrl - Full S3 URL of the submission
 * @returns Delete operation result
 */
export const deleteContestSubmissionFromS3 = async (
  fileUrl: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Extract S3 key from URL
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2 || !urlParts[1]) {
      return {
        success: false,
        message: 'Invalid S3 URL format',
      };
    }

    const s3Key = decodeURIComponent(urlParts[1]);
    const keyParts = s3Key.split('/');
    const fileName = keyParts[keyParts.length - 1];
    const folder = keyParts.slice(0, -1).join('/');

    if (!fileName) {
      return {
        success: false,
        message: 'Could not extract filename from S3 URL',
      };
    }

    return deleteFileFromS3(fileName, 'contestSubmission', folder);
  } catch (error) {
    console.error('Error deleting contest submission:', error);
    return {
      success: false,
      message: `Failed to delete submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
export const uploadJobApplicationResume = async (
  filePath: string,
  userId: string,
  originalFileName?: string
): Promise<{
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}> => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileExtension = originalFileName ? path.extname(originalFileName) : path.extname(filePath);
  const baseFileName = originalFileName ? path.basename(originalFileName, fileExtension) : `resume_${timestamp}`;
  const fileName = `${userId}/${timestamp}_${randomString}_${baseFileName}${fileExtension}`;
  const folder = `job-applications/${userId}`;
  return uploadFileToS3(filePath, fileName, 'jobApplication', folder);
};

