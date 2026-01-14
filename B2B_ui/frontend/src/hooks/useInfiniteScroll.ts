import { useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  fetchPosts, 
  selectFeedHasMore, 
  selectFeedLoading,
  selectFeedError,
  selectFeedOffset 
} from '@/store/slices/feedSlice';

export const useInfiniteScroll = () => {
  const dispatch = useAppDispatch();
  const hasMore = useAppSelector(selectFeedHasMore);
  const loading = useAppSelector(selectFeedLoading);
  const error = useAppSelector(selectFeedError);
  const currentOffset = useAppSelector(selectFeedOffset);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  const fetchMorePosts = useCallback(() => {
    if (loadingRef.current || loading || !hasMore || error) {
      return;
    }

    loadingRef.current = true;
    
    dispatch(fetchPosts({ 
      offset: currentOffset, 
      limit: 20,
      refresh: false 
    })).finally(() => {
      loadingRef.current = false;
    });
  }, [dispatch, loading, hasMore, error, currentOffset]);

  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && hasMore && !loading && !error) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting) {
            fetchMorePosts();
          }
        },
        {
          rootMargin: '100px', // Start loading 100px before the element is visible
          threshold: 0.1,
        }
      );

      observerRef.current.observe(node);
    }
  }, [hasMore, loading, error, fetchMorePosts]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { setTriggerRef, fetchMorePosts };
};