import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  searchPosts,
  setSearchTags,
  clearSearch,
  selectSearchTags,
  selectSearchActive,
  selectSearchResults,
  selectSearchLoading,
  selectSearchError,
} from '@/store/slices/feedSlice';

export const useSearchPosts = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const searchTags = useAppSelector(selectSearchTags);
  const searchActive = useAppSelector(selectSearchActive);
  const searchResults = useAppSelector(selectSearchResults);
  const searchLoading = useAppSelector(selectSearchLoading);
  const searchError = useAppSelector(selectSearchError);

  // Search function for manual search (no debouncing)
  const handleSearch = useCallback(
    async (tags: string[], options?: { limit?: number; offset?: number }) => {
      if (!tags || tags.length === 0) {
        dispatch(clearSearch());
        return;
      }

      // Filter out empty tags and normalize
      const validTags = tags
        .filter(tag => tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase());

      if (validTags.length === 0) {
        dispatch(clearSearch());
        return;
      }

      // Set search tags in state
      dispatch(setSearchTags(validTags));

      // Perform search
      try {
        await dispatch(searchPosts({
          tags: validTags,
          limit: options?.limit || 20,
          offset: options?.offset || 0,
        })).unwrap();
      } catch (error) {
        console.error('Search failed:', error);
        // Error is handled by the reducer
      }
    },
    [dispatch]
  );

  // Clear search function
  const handleClearSearch = useCallback(() => {
    dispatch(clearSearch());
  }, [dispatch]);

  // Set search tags without performing search (for controlled components)
  const setTags = useCallback(
    (tags: string[]) => {
      dispatch(setSearchTags(tags));
    },
    [dispatch]
  );

  // Check if search is active
  const isSearchActive = searchActive && searchTags.length > 0;

  // Get display posts (search results if searching, otherwise empty)
  const displayPosts = isSearchActive ? searchResults : [];

  return {
    // State
    searchTags,
    searchActive: isSearchActive,
    searchResults,
    searchLoading,
    searchError,
    displayPosts,

    // Actions
    handleSearch,
    handleClearSearch,
    setTags,

    // Computed
    hasSearchResults: searchResults.length > 0,
    searchResultsCount: searchResults.length,
  };
};

export default useSearchPosts;