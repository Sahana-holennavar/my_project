/**
 * Date and Time Formatting Utilities
 * Properly handles timezone conversions for all timestamps
 */

/**
 * Configuration: Set this to match your backend server's timezone
 * Options: 'UTC', 'GST', 'auto'
 * - 'UTC': Server sends timestamps in UTC (most common)
 * - 'GST': Server sends timestamps in Gulf Standard Time (UTC+4)
 * - 'auto': Auto-detect from timestamp format (default)
 */
export const SERVER_TIMEZONE: 'UTC' | 'GST' | 'auto' = 'auto';

/**
 * Manual timezone offset in minutes to add to timestamps
 * If set to -1, will automatically detect user's timezone offset
 * If set to a number, will use that fixed offset
 * Example: For IST (UTC+5:30), set to 330 (5*60 + 30 = 330 minutes)
 * Set to -1 to AUTO-DETECT user's current timezone
 */
export const MANUAL_TIMEZONE_OFFSET_MINUTES = -1; // -1 = Auto-detect, or set to specific offset like 330

/**
 * Get the current user's timezone offset in minutes
 * Detects the offset based on current system time
 * 
 * @returns Timezone offset in minutes (positive for East of UTC, negative for West)
 * 
 * @example
 * getUserTimezoneOffset() // Returns 330 for IST, -300 for EST, etc.
 */
export function getUserTimezoneOffset(): number {
  const now = new Date();
  
  // Create two dates - one in UTC, one in local time
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  
  // Calculate the difference
  const offset = (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
  return offset;
}

/**
 * Get timezone information
 * 
 * @returns Object with timezone name and offset
 */
export function getTimezoneInfo() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = getUserTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  
  return {
    name: timeZone,
    offset: offset,
    display: `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
}

/**
 * Parse a date string and convert from server timezone to local timezone
 * Handles various date formats including those without timezone info
 * 
 * @param dateString - Date string from API
 * @param sourceTimezone - The timezone the server uses (default: SERVER_TIMEZONE)
 * @returns Date object in local timezone
 */
function parseServerDate(dateString: string, sourceTimezone: 'UTC' | 'GST' | 'auto' = SERVER_TIMEZONE): Date {
  if (!dateString) return new Date();

  try {
    // First, try to parse as-is (works if timestamp has timezone info)
    let date = new Date(dateString);
    
    // Determine the offset to apply
    let offsetMinutes = 0;
    
    if (MANUAL_TIMEZONE_OFFSET_MINUTES === -1) {
      // Auto-detect user's timezone offset
      offsetMinutes = getUserTimezoneOffset();
    } else if (MANUAL_TIMEZONE_OFFSET_MINUTES !== 0) {
      // Use manually configured offset
      offsetMinutes = MANUAL_TIMEZONE_OFFSET_MINUTES;
    }
    
    // Apply timezone offset if determined
    if (offsetMinutes !== 0) {
      date = new Date(date.getTime() + (offsetMinutes * 60 * 1000));
      return date;
    }
    
    // Check if the date string has timezone info (Z, +00:00, etc.)
    const hasTimezoneInfo = /Z|[+-]\d{2}:\d{2}$/.test(dateString);
    
    if (!hasTimezoneInfo && sourceTimezone !== 'auto') {
      // If no timezone info and we know the source timezone, adjust
      // Parse the date assuming it's in the source timezone
      
      if (sourceTimezone === 'GST') {
        // GST is UTC+4
        // If server sends "2024-11-30 10:30:00" in GST, we need to subtract 4 hours to get UTC
        const gstOffset = 4 * 60; // 4 hours in minutes
        const parsedDate = new Date(dateString);
        
        // Subtract GST offset to convert to UTC, then JavaScript will handle local conversion
        date = new Date(parsedDate.getTime() - (gstOffset * 60 * 1000));
      }
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing server date:', error, dateString);
    return new Date();
  }
}

/**
 * Format a date string to "time ago" format
 * Properly handles UTC/GST to local timezone conversion
 * 
 * @param dateString - ISO 8601 date string or server timestamp
 * @param sourceTimezone - The timezone the server uses (default: SERVER_TIMEZONE)
 * @returns Human-readable time ago string (e.g., "5m ago", "2h ago", "3d ago")
 * 
 * @example
 * formatTimeAgo("2024-11-30T10:30:00Z") // Auto-detects UTC
 * formatTimeAgo("2024-11-30 10:30:00", "GST") // Converts from GST
 * formatTimeAgo("2024-11-30 10:30:00") // Uses SERVER_TIMEZONE config
 */
export function formatTimeAgo(dateString: string, sourceTimezone: 'UTC' | 'GST' | 'auto' = SERVER_TIMEZONE): string {
  if (!dateString) return 'Unknown';

  try {
    // Parse the date with timezone awareness
    const date = parseServerDate(dateString, sourceTimezone);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    // Get current time in user's local timezone
    const now = new Date();
    
    // Calculate difference in milliseconds
    const diffInMs = now.getTime() - date.getTime();
    
    // Debug logging (can be removed in production)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug('🕐 Time calculation:', {
        input: dateString,
        sourceTimezone,
        parsedDate: date.toISOString(),
        currentTime: now.toISOString(),
        diffMs: diffInMs,
        diffHours: (diffInMs / (1000 * 60 * 60)).toFixed(2),
      });
    }
    
    // If date is in the future (clock skew or timezone issue), show "just now"
    if (diffInMs < 0) {
      console.warn('Date is in the future:', { dateString, diffInMs });
      return 'Just now';
    }
    
    // Convert to seconds
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    // Calculate time units
    const seconds = diffInSeconds;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Return appropriate format based on time difference
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Unknown';
  }
}

/**
 * Format a date to a localized date string
 * 
 * @param dateString - ISO 8601 date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in user's locale
 * 
 * @example
 * formatDate("2024-11-30T10:30:00Z") // "Nov 30, 2024" (US locale)
 * formatDate("2024-11-30T10:30:00Z", { dateStyle: 'full' }) // "Saturday, November 30, 2024"
 */
export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Invalid date';
  }
}

/**
 * Format a date to include both date and time
 * 
 * @param dateString - ISO 8601 date string
 * @returns Formatted date and time string in user's locale
 * 
 * @example
 * formatDateTime("2024-11-30T10:30:00Z") // "Nov 30, 2024, 4:00 PM" (IST)
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting date time:', error, dateString);
    return 'Unknown';
  }
}

/**
 * Get a full timestamp with timezone
 * Useful for debugging timezone issues
 * 
 * @param dateString - ISO 8601 date string
 * @returns Full timestamp with timezone
 * 
 * @example
 * getFullTimestamp("2024-11-30T10:30:00Z") 
 * // "Saturday, November 30, 2024 at 4:00 PM IST"
 */
export function getFullTimestamp(dateString: string): string {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const dateStr = date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });

    return `${dateStr} at ${timeStr}`;
  } catch (error) {
    console.error('Error getting full timestamp:', error, dateString);
    return 'Unknown';
  }
}

/**
 * Check if a date is recent (within last 24 hours)
 * 
 * @param dateString - ISO 8601 date string
 * @returns true if date is within last 24 hours
 */
export function isRecentDate(dateString: string): boolean {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    return diffInHours >= 0 && diffInHours <= 24;
  } catch (error) {
    console.error('Error checking recent date:', error, dateString);
    return false;
  }
}

/**
 * Parse ISO date string and return Date object in local timezone
 * 
 * @param dateString - ISO 8601 date string
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing date:', error, dateString);
    return null;
  }
}

/**
 * Get user's timezone
 * 
 * @returns Timezone string (e.g., "Asia/Kolkata", "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Debug function to log timezone information
 * Useful for troubleshooting timezone issues
 */
export function debugTimezone(dateString: string): void {
  console.group('🕐 Timezone Debug Info');
  console.log('Original string:', dateString);
  console.log('User timezone:', getUserTimezone());
  console.log('User locale:', navigator.language);
  
  const date = new Date(dateString);
  console.log('Parsed date:', date.toString());
  console.log('UTC string:', date.toUTCString());
  console.log('ISO string:', date.toISOString());
  console.log('Local string:', date.toLocaleString());
  console.log('Timestamp (ms):', date.getTime());
  
  const now = new Date();
  console.log('Current time:', now.toString());
  console.log('Diff (seconds):', Math.floor((now.getTime() - date.getTime()) / 1000));
  console.log('Time ago:', formatTimeAgo(dateString));
  console.groupEnd();
}
