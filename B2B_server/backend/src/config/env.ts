import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DATABASE_URL: string;
  DB_SCHEMA: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ALLOWED_ORIGINS: string[];
  BCRYPT_SALT_ROUNDS: number;
  LOG_LEVEL: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_EMAIL: string;
  SMTP_FROM_NAME: string;
  APP_URL: string;
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  RESUME_AWS_S3_BUCKET_NAME: string;
  AWS_S3_REGION: string;
  AWS_S3_PROFILE_BUCKET_NAME: string;
  BUSINESS_PROFILE_AWS_S3_BUCKET_NAME: string;
  BUSINESS_PROFILE_AWS_S3_REGION: string;
  // Job Applications S3 Configuration
  JOB_APPLICATIONS_AWS_S3_BUCKET_NAME: string;
  JOB_APPLICATIONS_AWS_S3_REGION: string;
  // Resume Uploads S3 Configuration
  RESUME_UPLOADS_BUCKET_NAME: string;
  RESUME_UPLOADS_BUCKET_REGION: string;
  // Chat Media S3 Configuration
  CHAT_MEDIA_AWS_S3_BUCKET_NAME: string;
  CHAT_MEDIA_AWS_S3_REGION: string;
  CHAT_MEDIA_MAX_FILE_SIZE_MB: number;
  CHAT_MEDIA_TEMP_UPLOAD_FOLDER: string;
  // File Upload Configuration
  TEMP_UPLOAD_FOLDER: string;
  MAX_FILE_SIZE_MB: number;
  // Posts S3 Configuration (separate from resume bucket)
  POSTS_AWS_S3_BUCKET_NAME: string;
  POSTS_AWS_S3_REGION: string;
  POSTS_TEMP_UPLOAD_FOLDER: string;
  POSTS_MAX_FILE_SIZE_MB: number;
  POSTS_MAX_VIDEO_SIZE_MB: number;
  POSTS_MAX_MEDIA_FILES_PER_POST: number;
  // Private Info Encryption
  PRIVATE_INFO_ENCRYPTION_KEY: string;
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Gemini API Configuration
  GEMINI_API_KEY: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not defined, using default value`);
    return '';
  }
  return value || defaultValue!;
};

const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    console.warn(`Environment variable ${key} is not defined, using default value`);
    return 0;
  }
  const numValue = Number(value || defaultValue);
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return numValue;
};

const getEnvVarAsArray = (key: string, defaultValue: string[] = []): string[] => {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.split(',').map(item => item.trim());
};

export const config: Config = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvVarAsNumber('PORT', 5000),
  API_VERSION: getEnvVar('API_VERSION', 'v1'),
  DB_HOST: getEnvVar('DB_HOST', 'localhost'),
  DB_PORT: getEnvVarAsNumber('DB_PORT', 5432),
  DB_NAME: getEnvVar('DB_NAME', 'postgres'),
  DB_USER: getEnvVar('DB_USER', 'postgres'),
  DB_PASSWORD: getEnvVar('DB_PASSWORD', 'postgres'),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  DB_SCHEMA: getEnvVar('DB_SCHEMA', 'b2b_dev'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'default-jwt-secret-change-in-production'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  ALLOWED_ORIGINS: getEnvVarAsArray('ALLOWED_ORIGINS', ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:4567']),
  BCRYPT_SALT_ROUNDS: getEnvVarAsNumber('BCRYPT_SALT_ROUNDS', 12),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  SMTP_HOST: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: getEnvVarAsNumber('SMTP_PORT', 587),
  SMTP_SECURE: getEnvVar('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: getEnvVar('SMTP_USER', ''),
  SMTP_PASSWORD: getEnvVar('SMTP_PASSWORD', ''),
  SMTP_FROM_EMAIL: getEnvVar('SMTP_FROM_EMAIL', 'noreply@yourdomain.com'),
  SMTP_FROM_NAME: getEnvVar('SMTP_FROM_NAME', 'B2B Platform'),
  APP_URL: getEnvVar('APP_URL', 'http://localhost:3000'),
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: getEnvVar('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: getEnvVar('AWS_SECRET_ACCESS_KEY', ''),
  RESUME_AWS_S3_BUCKET_NAME: getEnvVar('RESUME_AWS_S3_BUCKET_NAME', ''),
  AWS_S3_REGION: getEnvVar('AWS_S3_REGION', 'us-east-1'),
  AWS_S3_PROFILE_BUCKET_NAME: getEnvVar('AWS_PROFILE_PIC_BUCKET_NAME', ''),
  BUSINESS_PROFILE_AWS_S3_BUCKET_NAME: getEnvVar('BUSINESS_PROFILE_AWS_S3_BUCKET_NAME', ''),
  BUSINESS_PROFILE_AWS_S3_REGION: getEnvVar('BUSINESS_PROFILE_AWS_S3_REGION', getEnvVar('AWS_S3_REGION', 'us-east-1')),
  // Job Applications S3 Configuration
  JOB_APPLICATIONS_AWS_S3_BUCKET_NAME: getEnvVar('JOB_APPLICATIONS_AWS_S3_BUCKET_NAME', ''),
  JOB_APPLICATIONS_AWS_S3_REGION: getEnvVar('JOB_APPLICATIONS_AWS_S3_REGION', getEnvVar('AWS_S3_REGION', 'us-east-1')),
  // Resume Uploads S3 Configuration
  RESUME_UPLOADS_BUCKET_NAME: getEnvVar('RESUME_UPLOADS_BUCKET_NAME', 'resume-uploads-techvruk'),
  RESUME_UPLOADS_BUCKET_REGION: getEnvVar('RESUME_UPLOADS_BUCKET_REGION', getEnvVar('AWS_S3_REGION', 'us-east-1')),
  // Chat Media S3 Configuration
  CHAT_MEDIA_AWS_S3_BUCKET_NAME: getEnvVar('CHAT_MEDIA_AWS_S3_BUCKET_NAME', 'techvrook-user-messages'),
  CHAT_MEDIA_AWS_S3_REGION: getEnvVar('CHAT_MEDIA_AWS_S3_REGION', getEnvVar('AWS_S3_REGION', 'us-east-1')),
  CHAT_MEDIA_MAX_FILE_SIZE_MB: getEnvVarAsNumber('CHAT_MEDIA_MAX_FILE_SIZE_MB', 10),
  CHAT_MEDIA_TEMP_UPLOAD_FOLDER: getEnvVar('CHAT_MEDIA_TEMP_UPLOAD_FOLDER', './temp/chat'),
  // File Upload Configuration
  TEMP_UPLOAD_FOLDER: getEnvVar('TEMP_UPLOAD_FOLDER', './temp/uploads'),
  MAX_FILE_SIZE_MB: getEnvVarAsNumber('MAX_FILE_SIZE_MB', 10),
  // Posts S3 Configuration (separate from resume bucket)
  POSTS_AWS_S3_BUCKET_NAME: getEnvVar('POSTS_AWS_S3_BUCKET_NAME', ''),
  POSTS_AWS_S3_REGION: getEnvVar('POSTS_AWS_S3_REGION', 'ap-south-1'),
  POSTS_TEMP_UPLOAD_FOLDER: getEnvVar('POSTS_TEMP_UPLOAD_FOLDER', './temp/posts'),
  POSTS_MAX_FILE_SIZE_MB: getEnvVarAsNumber('POSTS_MAX_FILE_SIZE_MB', 5),
  POSTS_MAX_VIDEO_SIZE_MB: getEnvVarAsNumber('POSTS_MAX_VIDEO_SIZE_MB', 50),
  POSTS_MAX_MEDIA_FILES_PER_POST: getEnvVarAsNumber('POSTS_MAX_MEDIA_FILES_PER_POST', 5),
  // Private Info Encryption
  PRIVATE_INFO_ENCRYPTION_KEY: getEnvVar('PRIVATE_INFO_ENCRYPTION_KEY', ''),
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET', ''),
  // Gemini API Configuration
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', ''),
};

export default config; 