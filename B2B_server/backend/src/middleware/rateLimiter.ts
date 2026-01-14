/**
 * Rate Limiting Middleware
 * Implements rate limiting for post creation (max 10 posts per hour per user)
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitInfo } from '../models/Post';

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitInfo>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Maximum 10 posts per hour
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
};

/**
 * Rate limiting middleware for post creation
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next function
 */
export const postRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      // If no user ID, skip rate limiting (should be handled by auth middleware)
      next();
      return;
    }

    const now = new Date();
    const userKey = `post_creation_${userId}`;
    
    // Get existing rate limit info for user
    let rateLimitInfo = rateLimitStore.get(userKey);

    if (!rateLimitInfo) {
      // First request for this user
      rateLimitInfo = {
        userId,
        requestCount: 1,
        windowStart: now,
        isLimitExceeded: false
      };
      rateLimitStore.set(userKey, rateLimitInfo);
      next();
      return;
    }

    // Check if window has expired
    const timeSinceWindowStart = now.getTime() - rateLimitInfo.windowStart.getTime();
    
    if (timeSinceWindowStart >= RATE_LIMIT_CONFIG.windowMs) {
      // Reset window
      rateLimitInfo.requestCount = 1;
      rateLimitInfo.windowStart = now;
      rateLimitInfo.isLimitExceeded = false;
      rateLimitStore.set(userKey, rateLimitInfo);
      next();
      return;
    }

    // Check if limit exceeded
    if (rateLimitInfo.requestCount >= RATE_LIMIT_CONFIG.maxRequests) {
      rateLimitInfo.isLimitExceeded = true;
      rateLimitStore.set(userKey, rateLimitInfo);
      
      res.status(429).json({
        status: 429,
        message: 'Rate limit exceeded. Maximum 10 posts per hour allowed.',
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          details: `You have exceeded the maximum of ${RATE_LIMIT_CONFIG.maxRequests} posts per hour. Please try again later.`,
          retryAfter: Math.ceil((RATE_LIMIT_CONFIG.windowMs - timeSinceWindowStart) / 1000) // seconds
        }
      });
      return;
    }

    // Increment request count
    rateLimitInfo.requestCount++;
    rateLimitStore.set(userKey, rateLimitInfo);
    
    next();

  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request to proceed
    next();
  }
};

/**
 * Get rate limit info for a user
 * @param userId - User ID
 * @returns Rate limit information
 */
export const getRateLimitInfo = (userId: string): RateLimitInfo | null => {
  const userKey = `post_creation_${userId}`;
  return rateLimitStore.get(userKey) || null;
};

/**
 * Reset rate limit for a user (admin function)
 * @param userId - User ID
 * @returns Success status
 */
export const resetRateLimit = (userId: string): boolean => {
  try {
    const userKey = `post_creation_${userId}`;
    rateLimitStore.delete(userKey);
    return true;
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return false;
  }
};

/**
 * Clean up expired rate limit entries
 * This should be called periodically to prevent memory leaks
 */
export const cleanupExpiredRateLimits = (): void => {
  try {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, rateLimitInfo] of rateLimitStore.entries()) {
      const timeSinceWindowStart = now.getTime() - rateLimitInfo.windowStart.getTime();
      
      if (timeSinceWindowStart >= RATE_LIMIT_CONFIG.windowMs) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    expiredKeys.forEach(key => rateLimitStore.delete(key));
    
    console.log(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
  } catch (error) {
    console.error('Error cleaning up expired rate limits:', error);
  }
};

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000);
