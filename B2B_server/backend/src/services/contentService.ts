/**
 * Content Service - Handles content moderation, hashtag extraction, and mention processing
 * Consolidates content moderation and text processing functionality
 */

import { ContentModerationResult, HashtagExtractionResult, MentionExtractionResult } from '../models/Post';

// Content moderation configuration
const CONTENT_MODERATION_CONFIG = {
  // Simple profanity filter - can be enhanced with ML models
  profanityList: [
    'hate', 'inappropriate', 'profane', 'offensive', 'abusive',
    'harassment', 'discrimination', 'violence', 'threat', 'spam'
  ],
  
  // Content length limits
  maxContentLength: 5000,
  minContentLength: 1,
  
  // Hashtag limits
  maxHashtags: 10,
  hashtagPattern: /#(\w+)/g,
  
  // Mention limits
  maxMentions: 20,
  mentionPattern: /@(\w+)/g,
  
  // Content validation patterns
  patterns: {
    hateSpeech: /\b(hate|kill|destroy|harm)\b/gi,
    spam: /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaa")
    excessiveCaps: /[A-Z]{10,}/g, // Excessive capitalization
    urlSpam: /https?:\/\/[^\s]+/g, // Multiple URLs
  }
};

/**
 * Content Service Class
 */
class ContentService {
  /**
   * Moderate content for inappropriate language and patterns
   * @param content - Text content to moderate
   * @returns Content moderation result
   */
  moderateContent(content: string): ContentModerationResult {
    try {
      // Normalize content for analysis
      const normalizedContent = content.toLowerCase().trim();
      
      // Check for empty content
      if (!normalizedContent) {
        return {
          isAppropriate: false,
          flaggedTerms: ['empty_content'],
          reason: 'Content cannot be empty'
        };
      }
      
      // Check content length
      if (content.length > CONTENT_MODERATION_CONFIG.maxContentLength) {
        return {
          isAppropriate: false,
          flaggedTerms: ['exceeds_length'],
          reason: `Content exceeds maximum length of ${CONTENT_MODERATION_CONFIG.maxContentLength} characters`
        };
      }
      
      if (content.length < CONTENT_MODERATION_CONFIG.minContentLength) {
        return {
          isAppropriate: false,
          flaggedTerms: ['too_short'],
          reason: 'Content is too short'
        };
      }
      
      // Check for profanity
      const profanityFlags = this.checkProfanity(normalizedContent);
      if (profanityFlags.length > 0) {
        return {
          isAppropriate: false,
          flaggedTerms: profanityFlags,
          reason: `Content contains inappropriate language: ${profanityFlags.join(', ')}`
        };
      }
      
      // Check for hate speech patterns
      const hateSpeechFlags = this.checkHateSpeech(content);
      if (hateSpeechFlags.length > 0) {
        return {
          isAppropriate: false,
          flaggedTerms: hateSpeechFlags,
          reason: `Content contains hate speech patterns: ${hateSpeechFlags.join(', ')}`
        };
      }
      
      // Check for spam patterns
      const spamFlags = this.checkSpamPatterns(content);
      if (spamFlags.length > 0) {
        return {
          isAppropriate: false,
          flaggedTerms: spamFlags,
          reason: `Content contains spam patterns: ${spamFlags.join(', ')}`
        };
      }
      
      // Content is appropriate
      return {
        isAppropriate: true,
        flaggedTerms: [],
        reason: 'Content is appropriate'
      };
      
    } catch (error) {
      console.error('Error in content moderation:', error);
      return {
        isAppropriate: false,
        flaggedTerms: ['moderation_error'],
        reason: 'Content moderation failed'
      };
    }
  }
  
  /**
   * Check for profanity in content
   * @param content - Normalized content to check
   * @returns Array of flagged profanity terms
   */
  private checkProfanity(content: string): string[] {
    const flaggedTerms: string[] = [];
    
    // Use a single loop with early exit for better performance
    for (const profanity of CONTENT_MODERATION_CONFIG.profanityList) {
      if (content.includes(profanity)) {
        flaggedTerms.push(profanity);
        // Early exit if too many flags (performance optimization)
        if (flaggedTerms.length >= 5) break;
      }
    }
    
    return flaggedTerms;
  }
  
  /**
   * Check for hate speech patterns
   * @param content - Content to check
   * @returns Array of flagged hate speech patterns
   */
  private checkHateSpeech(content: string): string[] {
    const flaggedTerms: string[] = [];
    const matches = content.match(CONTENT_MODERATION_CONFIG.patterns.hateSpeech);
    
    if (matches) {
      // Remove duplicates and limit results
      const uniqueMatches = [...new Set(matches.map(match => match.toLowerCase()))];
      flaggedTerms.push(...uniqueMatches.slice(0, 3)); // Limit to 3 hate speech flags
    }
    
    return flaggedTerms;
  }
  
  /**
   * Check for spam patterns
   * @param content - Content to check
   * @returns Array of flagged spam patterns
   */
  private checkSpamPatterns(content: string): string[] {
    const flaggedTerms: string[] = [];
    
    // Check for repeated characters
    if (CONTENT_MODERATION_CONFIG.patterns.spam.test(content)) {
      flaggedTerms.push('repeated_characters');
    }
    
    // Check for excessive capitalization
    if (CONTENT_MODERATION_CONFIG.patterns.excessiveCaps.test(content)) {
      flaggedTerms.push('excessive_capitalization');
    }
    
    // Check for multiple URLs (potential spam)
    const urlMatches = content.match(CONTENT_MODERATION_CONFIG.patterns.urlSpam);
    if (urlMatches && urlMatches.length > 3) {
      flaggedTerms.push('excessive_urls');
    }
    
    return flaggedTerms;
  }
  
  /**
   * Extract hashtags from content
   * @param content - Text content to process
   * @returns Hashtag extraction result
   */
  extractHashtags(content: string): HashtagExtractionResult {
    try {
      if (!content || typeof content !== 'string') {
        return { hashtags: [] };
      }
      
      // Extract hashtags using regex
      const matches = content.match(CONTENT_MODERATION_CONFIG.hashtagPattern);
      
      if (!matches) {
        return { hashtags: [] };
      }
      
      // Process hashtags: remove #, convert to lowercase, remove duplicates
      const hashtags = matches
        .map(tag => tag.substring(1).toLowerCase()) // Remove # prefix
        .filter(tag => tag.length > 0 && tag.length <= 50) // Filter valid length
        .filter(tag => /^[a-zA-Z0-9_]+$/.test(tag)) // Only alphanumeric and underscore
        .filter((tag, index, array) => array.indexOf(tag) === index) // Remove duplicates
        .slice(0, CONTENT_MODERATION_CONFIG.maxHashtags); // Limit to max hashtags
      
      return { hashtags };
      
    } catch (error) {
      console.error('Error extracting hashtags:', error);
      return { hashtags: [] };
    }
  }
  
  /**
   * Extract mentions from content
   * @param content - Text content to process
   * @returns Mention extraction result
   */
  extractMentions(content: string): MentionExtractionResult {
    try {
      if (!content || typeof content !== 'string') {
        return { mentions: [] };
      }
      
      // Extract mentions using regex
      const matches = content.match(CONTENT_MODERATION_CONFIG.mentionPattern);
      
      if (!matches) {
        return { mentions: [] };
      }
      
      // Process mentions: remove @, validate format, remove duplicates
      const mentions = matches
        .map(mention => mention.substring(1)) // Remove @ prefix
        .filter(mention => mention.length >= 2 && mention.length <= 30) // Valid length
        .filter(mention => /^[a-zA-Z0-9_]+$/.test(mention)) // Only alphanumeric and underscore
        .filter((mention, index, array) => array.indexOf(mention) === index) // Remove duplicates
        .slice(0, CONTENT_MODERATION_CONFIG.maxMentions); // Limit to max mentions
      
      return { mentions };
      
    } catch (error) {
      console.error('Error extracting mentions:', error);
      return { mentions: [] };
    }
  }
  
  /**
   * Process content for hashtags and mentions (combined operation)
   * @param content - Text content to process
   * @returns Combined processing result
   */
  processContent(content: string): {
    hashtags: string[];
    mentions: string[];
    moderation: ContentModerationResult;
  } {
    return {
      hashtags: this.extractHashtags(content).hashtags,
      mentions: this.extractMentions(content).mentions,
      moderation: this.moderateContent(content)
    };
  }
  
  /**
   * Validate content length
   * @param content - Content to validate
   * @returns Validation result
   */
  validateContentLength(content: string): { isValid: boolean; message?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, message: 'Content cannot be empty' };
    }
    
    if (content.length > CONTENT_MODERATION_CONFIG.maxContentLength) {
      return { 
        isValid: false, 
        message: `Content exceeds maximum length of ${CONTENT_MODERATION_CONFIG.maxContentLength} characters` 
      };
    }
    
    if (content.length < CONTENT_MODERATION_CONFIG.minContentLength) {
      return { 
        isValid: false, 
        message: 'Content is too short' 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Get content statistics
   * @param content - Content to analyze
   * @returns Content statistics
   */
  getContentStats(content: string): {
    length: number;
    wordCount: number;
    hashtagCount: number;
    mentionCount: number;
    hasUrls: boolean;
  } {
    const hashtags = this.extractHashtags(content);
    const mentions = this.extractMentions(content);
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const hasUrls = CONTENT_MODERATION_CONFIG.patterns.urlSpam.test(content);
    
    return {
      length: content.length,
      wordCount: words.length,
      hashtagCount: hashtags.hashtags.length,
      mentionCount: mentions.mentions.length,
      hasUrls
    };
  }
}

// Export singleton instance
export const contentService = new ContentService();

// Export individual functions for backward compatibility
export const moderateContent = (content: string) => contentService.moderateContent(content);
export const extractHashtags = (content: string) => contentService.extractHashtags(content);
export const extractMentions = (content: string) => contentService.extractMentions(content);
export const processContent = (content: string) => contentService.processContent(content);
export const validateContentLength = (content: string) => contentService.validateContentLength(content);
export const getContentStats = (content: string) => contentService.getContentStats(content);

export default contentService;
