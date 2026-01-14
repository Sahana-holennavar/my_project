import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Multer configuration types
type MulterConfigType = 'resume' | 'posts' | 'profileImage' | 'banner' | 'certificate' | 'businessProfile' | 'privateInfo' | 'jobApplicationResume' | 'resumeEvaluation' | 'contestSubmission';

interface MulterConfig {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  tempFolder: string;
  fieldName: string;
}

// Multer configurations for different upload types
const MULTER_CONFIGS: Record<MulterConfigType, MulterConfig> = {
  resume: {
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'resume',
  },
  posts: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ],
    maxFileSize: config.POSTS_MAX_VIDEO_SIZE_MB * 1024 * 1024, // Use video size as max
    maxFiles: config.POSTS_MAX_MEDIA_FILES_PER_POST,
    tempFolder: config.POSTS_TEMP_UPLOAD_FOLDER,
    fieldName: 'media',
  },
  profileImage: {
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'avatar',
  },
  banner: {
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'banner'
  },
  certificate: {
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'certificate'
  },
  businessProfile: {
    allowedExtensions: ['.mp4', '.mov'],
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
    ],
    maxFileSize: config.POSTS_MAX_VIDEO_SIZE_MB * 1024 * 1024, // Use video size limit
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'company_introduction_video',
  },
  privateInfo: {
    allowedExtensions: ['.pdf', '.png', '.jpeg', '.jpg'],
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 2, // registration_certificate and business_license
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'privateInfo', // Not used for fields()
  },
  contestSubmission: {
    allowedExtensions: ['.pdf', '.zip'],
    allowedMimeTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB max
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'submission',
  },
  jobApplicationResume: {
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'resume',
  },
  resumeEvaluation: {
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
    maxFileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    tempFolder: config.TEMP_UPLOAD_FOLDER,
    fieldName: 'file',
  }
};

/**
 * Dynamic file filter function for both resume and posts
 * @param configType - Type of configuration ('resume' or 'posts')
 * @returns File filter function
 */
export const createFileFilter = (configType: MulterConfigType) => {
  const multerConfig = MULTER_CONFIGS[configType];
  
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check if file extension is allowed
    const isValidExtension = multerConfig.allowedExtensions.includes(fileExtension);
    
    // Check if MIME type is allowed
    const isValidMimeType = multerConfig.allowedMimeTypes.includes(file.mimetype);
    
    // Accept file only if both extension and MIME type are valid
    if (isValidExtension && isValidMimeType) {
      cb(null, true);
    } else {
      const errorMessage = configType === 'resume' 
        ? `Invalid file format. Only ${multerConfig.allowedExtensions.join(', ')} files are allowed`
        : `Unsupported media type. Allowed types: ${multerConfig.allowedExtensions.join(', ')}`;
      
      cb(new Error(errorMessage));
    }
  };
};

/**
 * File filter function to validate resume files (convenience function)
 */
export const resumeFileFilter = createFileFilter('resume');

/**
 * File filter function to validate media files (convenience function)
 */
export const mediaFileFilter = createFileFilter('posts');

/**
 * Configure and return multer middleware (dynamic function for both resume and posts)
 * @param configType - Type of configuration ('resume' or 'posts')
 * @returns Configured multer instance
 */
export const configureMulter = (configType: MulterConfigType): multer.Multer => {
  const multerConfig = MULTER_CONFIGS[configType];
  
  // Ensure temp folder exists
  if (!fs.existsSync(multerConfig.tempFolder)) {
    fs.mkdirSync(multerConfig.tempFolder, { recursive: true });
  }
  
  // Configure storage
  const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      cb(null, multerConfig.tempFolder);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      // Generate temporary filename with timestamp
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExtension = path.extname(file.originalname);
      const tempFileName = `temp_${timestamp}_${randomString}${fileExtension}`;
      cb(null, tempFileName);
    },
  });
  
  // Configure multer with storage, file filter, and size limits
  const upload = multer({
    storage: storage,
    fileFilter: createFileFilter(configType),
    limits: {
      fileSize: multerConfig.maxFileSize,
      files: multerConfig.maxFiles,
    },
  });
  
  return upload;
};

/**
 * Configure and return multer middleware for resume uploads (convenience function)
 * @returns Configured multer instance
 */
export const configureResumeMulter = (): multer.Multer => {
  return configureMulter('resume');
};

/**
 * Configure and return multer middleware for media uploads (convenience function)
 * @returns Configured multer instance
 */
export const configureMediaMulter = (): multer.Multer => {
  return configureMulter('posts');
};

export const configureProfileImageMulter = (): multer.Multer => {
  return configureMulter('profileImage');
}

export const configureBusinessProfileMulter = (): multer.Multer => {
  return configureMulter('businessProfile');
}

// Export configured multer instances
export const uploadResume = configureMulter('resume').single('resume');
export const uploadProfileImage = configureMulter('profileImage').single('profileImage');
export const uploadMedia = configureMulter('posts').array('media', config.POSTS_MAX_MEDIA_FILES_PER_POST);
// Single-file upload for a primary post media item (used by business profile posts)
export const uploadSinglePostMedia = configureMulter('posts').single('media');
export const uploadBanner = configureMulter('banner').single('banner');
export const uploadCertificate = configureMulter('certificate').single('certificate');
export const uploadBusinessAvatar = configureMulter('profileImage').single('avatar');
// Optional file upload for business profile (doesn't fail if no file provided)
export const uploadBusinessProfileVideo = configureMulter('businessProfile').single('company_introduction_video');

/**
 * Configure multer for private info files (registration_certificate and business_license)
 * Uses fields() to handle multiple optional files
 */
export const configurePrivateInfoMulter = (): multer.Multer => {
  return configureMulter('privateInfo');
};

// Export configured multer instance for contest submissions
export const uploadContestSubmission = configureMulter('contestSubmission').single('submission');

/**
 * Upload middleware for private info files
 * Handles both registration_certificate and business_license as optional files
 */
export const uploadPrivateInfoFiles = configureMulter('privateInfo').fields([
  { name: 'registration_certificate', maxCount: 1 },
  { name: 'business_license', maxCount: 1 },
]);

export const configureJobApplicationResumeMulter = (): multer.Multer => {
  return configureMulter('jobApplicationResume');
};

export const uploadJobApplicationResume = configureMulter('jobApplicationResume').single('resume');

export const configureResumeEvaluationMulter = (): multer.Multer => {
  return configureMulter('resumeEvaluation');
};

export const uploadResumeEvaluation = configureMulter('resumeEvaluation').single('file');
