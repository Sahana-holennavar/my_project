import fs from 'fs';
import path from 'path';

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Maximum file size (5MB in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validates resume file format, size, and MIME type
 * @param file - The uploaded file object
 * @returns Validation result with success status and error message if failed
 */
export const validateResumeFile = (
  file: Express.Multer.File
): { isValid: boolean; error?: string } => {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'Resume file is required',
    };
  }

  // Validate file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Invalid file format. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
    };
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file MIME type',
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { isValid: true };
};

/**
 * Generates unique filename for resume storage
 * Format: userId_YYYY-MM-DD_HH-mm-ss_originalName
 * @param userId - User ID
 * @param originalName - Original file name
 * @returns Formatted unique filename
 */
export const generateUniqueFileName = (
  userId: string,
  originalName: string
): string => {
  // Get current timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Format timestamp as YYYY-MM-DD_HH-mm-ss
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  // Clean original filename (remove path and keep only filename)
  const cleanOriginalName = path.basename(originalName);

  // Sanitize filename - remove special characters except dots, hyphens, and underscores
  const sanitizedName = cleanOriginalName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Construct unique filename: userId_timestamp_originalName
  const uniqueFileName = `${userId}_${timestamp}_${sanitizedName}`;

  return uniqueFileName;
};

/**
 * Cleans up temporary file from the filesystem
 * @param filePath - Path to the temporary file
 * @returns Promise resolving to cleanup status
 */
export const cleanupTempFile = async (
  filePath: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: true,
        message: 'File does not exist, no cleanup needed',
      };
    }

    // Delete the file
    await fs.promises.unlink(filePath);

    console.log(`Temporary file cleaned up successfully: ${filePath}`);
    return {
      success: true,
      message: 'Temporary file cleaned up successfully',
    };
  } catch (error) {
    console.error(`Error cleaning up temporary file: ${filePath}`, error);
    return {
      success: false,
      message: `Failed to cleanup temporary file: ${error}`,
    };
  }
};

/**
 * Get file extension from filename
 * @param filename - File name
 * @returns File extension
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

/**
 * Format file size to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

