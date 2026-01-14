/**
 * Search history utility for managing tag search history in localStorage
 */

const SEARCH_HISTORY_KEY = 'tag_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  tags: string[];
  timestamp: number;
  query?: string;
}

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored) as SearchHistoryItem[];
    // Sort by timestamp (newest first) and limit
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
}

/**
 * Add a search to history
 */
export function addToSearchHistory(tags: string[], query?: string): void {
  if (typeof window === 'undefined' || tags.length === 0) return;
  
  try {
    const history = getSearchHistory();
    
    // Remove duplicate entry (same tags)
    const tagsKey = tags.sort().join(',');
    const filteredHistory = history.filter(
      item => item.tags.sort().join(',') !== tagsKey
    );
    
    // Add new entry at the beginning
    const newEntry: SearchHistoryItem = {
      tags,
      timestamp: Date.now(),
      query,
    };
    
    const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

/**
 * Remove a specific search from history
 */
export function removeFromSearchHistory(tags: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getSearchHistory();
    const tagsKey = tags.sort().join(',');
    const filteredHistory = history.filter(
      item => item.tags.sort().join(',') !== tagsKey
    );
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
}


