import type { ValidationResult, MediaFile } from '@/types/posts';

/**
 * Validates post content and media
 */
export function validatePostContent(
  content: string, 
  media: MediaFile[]
): ValidationResult {
  const errors: string[] = [];

  // Check if post has content or media
  if (!content.trim() && media.length === 0) {
    errors.push('Please add some content or media');
  }

  // Check content length
  if (content.length > 5000) {
    errors.push('Content must be under 5000 characters');
  }

  // Check media count
  if (media.length > 5) {
    errors.push('Maximum 5 files allowed');
  }

  // Check media file sizes and types
  for (const mediaFile of media) {
    if (mediaFile.type === 'image') {
      if (mediaFile.size > 5 * 1024 * 1024) { // 5MB
        errors.push(`Image ${mediaFile.name} must be under 5MB`);
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(mediaFile.file.type)) {
        errors.push(`Unsupported image format: ${mediaFile.name}`);
      }
    } else if (mediaFile.type === 'video') {
      if (mediaFile.size > 50 * 1024 * 1024) { // 50MB
        errors.push(`Video ${mediaFile.name} must be under 50MB`);
      }
      if (!['video/mp4', 'video/mov', 'video/quicktime'].includes(mediaFile.file.type)) {
        errors.push(`Unsupported video format: ${mediaFile.name}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single file for upload
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  
  // Check file type
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    errors.push('File type not supported. Use JPG, PNG, GIF, MP4, MOV');
    return { isValid: false, errors };
  }

  // Check file size
  if (isImage && file.size > 5 * 1024 * 1024) {
    errors.push('Image must be under 5MB');
  }
  
  if (isVideo && file.size > 50 * 1024 * 1024) {
    errors.push('Video must be under 50MB');
  }

  // Check specific formats
  if (isImage && !['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    errors.push('Unsupported image format. Use JPG, PNG, or GIF');
  }
  
  if (isVideo && !['video/mp4', 'video/mov', 'video/quicktime'].includes(file.type)) {
    errors.push('Unsupported video format. Use MP4 or MOV');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if text content is empty or only whitespace
 */
export function isContentEmpty(content: string): boolean {
  return !content || content.trim().length === 0;
}

/**
 * Gets character count for content validation
 */
export function getCharacterCount(content: string): number {
  return content.length;
}

/**
 * Checks if character limit is exceeded
 */
export function isCharacterLimitExceeded(content: string, limit: number = 5000): boolean {
  return content.length > limit;
}