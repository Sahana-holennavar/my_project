import type { MediaFile } from '@/types/posts';

/**
 * Extracts hashtags from text content
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Remove duplicates and limit to 10 hashtags
  const uniqueHashtags = [...new Set(matches.map(tag => tag.slice(1)))]; // Remove # symbol
  return uniqueHashtags.slice(0, 10);
}

/**
 * Extracts mentions from text content
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@[\w]+/g;
  const matches = text.match(mentionRegex);
  
  if (!matches) return [];
  
  // Remove duplicates and @ symbol
  const uniqueMentions = [...new Set(matches.map(mention => mention.slice(1)))];
  return uniqueMentions;
}

/**
 * Creates a blob URL for file preview
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a blob URL to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Converts File to MediaFile with metadata
 */
export function fileToMediaFile(file: File): MediaFile {
  const isVideo = file.type.startsWith('video/');
  
  return {
    file,
    type: isVideo ? 'video' : 'image',
    url: createPreviewUrl(file),
    name: file.name,
    size: file.size,
  };
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates video thumbnail (for future implementation)
 */
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = 1; // Seek to 1 second
    });
    
    video.addEventListener('seeked', () => {
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL();
        resolve(thumbnailUrl);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    });
    
    video.addEventListener('error', () => {
      reject(new Error('Error loading video'));
    });
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Cleans up media files by revoking their blob URLs
 */
export function cleanupMediaFiles(mediaFiles: MediaFile[]): void {
  mediaFiles.forEach(media => {
    revokePreviewUrl(media.url);
  });
}

/**
 * Checks if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Checks if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Formats hashtags for display (with # symbol)
 */
export function formatHashtags(hashtags: string[]): string[] {
  return hashtags.map(tag => `#${tag}`);
}

/**
 * Formats mentions for display (with @ symbol)
 */
export function formatMentions(mentions: string[]): string[] {
  return mentions.map(mention => `@${mention}`);
}