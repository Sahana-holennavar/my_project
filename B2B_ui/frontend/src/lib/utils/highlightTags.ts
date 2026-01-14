import React from 'react';

/**
 * Highlights matching tags in content text
 * @param content - The text content to highlight
 * @param searchTags - Array of tags to highlight
 * @returns React element with highlighted content
 */
export const highlightMatchingTags = (
  content: string,
  searchTags: string[]
): React.ReactNode => {
  if (!content || !searchTags || searchTags.length === 0) {
    return content;
  }

  // Create a regex pattern for all search tags (case insensitive)
  const tagPattern = searchTags
    .map(tag => {
      // Escape special regex characters and create pattern for both #tag and tag formats
      const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(#${escapedTag}\\b|\\b${escapedTag}\\b)`;
    })
    .join('|');

  const regex = new RegExp(tagPattern, 'gi');
  
  // Find all matches with their positions
  const matches: Array<{ match: string; index: number; length: number }> = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      length: match[0].length
    });
  }

  // If no matches found, return original content
  if (matches.length === 0) {
    return content;
  }

  // Sort matches by index to process them in order
  matches.sort((a, b) => a.index - b.index);

  // Build the highlighted content
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  matches.forEach((matchInfo, index) => {
    // Add text before the match
    if (matchInfo.index > currentIndex) {
      parts.push(
        React.createElement('span', { key: `text-${index}` }, 
          content.slice(currentIndex, matchInfo.index)
        )
      );
    }

    // Add the highlighted match
    parts.push(
      React.createElement('span', {
        key: `highlight-${index}`,
        className: 'bg-purple-600/30 text-purple-200 px-1 rounded font-medium'
      }, matchInfo.match)
    );

    currentIndex = matchInfo.index + matchInfo.length;
  });

  // Add remaining text after the last match
  if (currentIndex < content.length) {
    parts.push(
      React.createElement('span', { key: 'text-end' }, 
        content.slice(currentIndex)
      )
    );
  }

  return React.createElement(React.Fragment, null, ...parts);
};

/**
 * Alternative function that returns plain HTML string (useful for dangerouslySetInnerHTML)
 * @param content - The text content to highlight
 * @param searchTags - Array of tags to highlight
 * @returns HTML string with highlighted content
 */
export const highlightMatchingTagsHTML = (
  content: string,
  searchTags: string[]
): string => {
  if (!content || !searchTags || searchTags.length === 0) {
    return content;
  }

  // Create a regex pattern for all search tags (case insensitive)
  const tagPattern = searchTags
    .map(tag => {
      // Escape special regex characters and create pattern for both #tag and tag formats
      const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(#${escapedTag}\\b|\\b${escapedTag}\\b)`;
    })
    .join('|');

  const regex = new RegExp(tagPattern, 'gi');
  
  return content.replace(regex, (match) => {
    return `<span class="bg-purple-600/30 text-purple-200 px-1 rounded font-medium">${match}</span>`;
  });
};

/**
 * Extract hashtags from content text
 * @param content - The text content to extract tags from
 * @returns Array of hashtags found in the content
 */
export const extractHashtags = (content: string): string[] => {
  if (!content) return [];
  
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  return [...new Set(hashtags)]; // Remove duplicates
};

/**
 * Check if content contains any of the search tags
 * @param content - The text content to check
 * @param searchTags - Array of tags to search for
 * @returns Boolean indicating if any tags are found
 */
export const containsSearchTags = (
  content: string,
  searchTags: string[]
): boolean => {
  if (!content || !searchTags || searchTags.length === 0) {
    return false;
  }

  const lowerContent = content.toLowerCase();
  return searchTags.some(tag => 
    lowerContent.includes(`#${tag.toLowerCase()}`) ||
    lowerContent.includes(tag.toLowerCase())
  );
};

const highlightTagsUtils = {
  highlightMatchingTags,
  highlightMatchingTagsHTML,
  extractHashtags,
  containsSearchTags,
};

export default highlightTagsUtils;