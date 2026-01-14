'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare, 
  RefreshCw,
  AlertCircle,
  WifiOff,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { CreatePost, FeedPostCard, InfiniteScrollTrigger } from '@/components/posts';
import { PostDetailModal } from '@/components/posts/PostDetailModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserTutorial } from '@/components/common/UserTutorial';
// import { SearchResultsHeader } from '@/components/SearchResultsHeader';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useSearchPosts } from '@/hooks/useSearchPosts';
import { useTutorialState } from '@/hooks/useTutorialState';
import { 
  fetchPosts, 
  refreshFeed, 
  clearError,
  selectFeedPosts,
  selectFeedLoading,
  selectFeedError,
  selectFeedHasMore,
  selectFeedIsRefreshing,
  selectFeedTotal,
  type FeedPost
} from '@/store/slices/feedSlice';
import '@/styles/tutorial.css';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};


const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) {
    return `${local}****@${domain}`;
  }
  return `${local.slice(0, 2)}****@${domain}`;
};

const LeftSidebar = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.profile);

  // Generate user initials for avatar fallback
  const getUserInitials = () => {
    if (profile) {
      const first = profile?.personal_information?.first_name ?? '';
      const last = profile?.personal_information?.last_name ?? '';
      const firstInitial = first ? first[0].toUpperCase() : '';
      const lastInitial = last ? last[0].toUpperCase() : '';
      const initials = (firstInitial + lastInitial).trim();
      return initials || 'U';
    }
    if (!user?.name || typeof user.name !== 'string') return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  // Banner logic: map industry/profession to image
  const industryImageMap: Record<string, string> = {
    'technology': 'it industry.png',
    'it industry': 'it industry.png',
    'healthcare': 'healthandcare.png',
    'finance': 'finance.png',
    'education': 'education.png',
    'biotechnology': 'Biotechnology.png',
    'manufacturing': 'automation.png',
    'industrial automation': 'automation.png',
    'r&d': 'Research and Development.png',
    'research and development': 'Research and Development.png',
    'human resource': 'Human Resource.jpg',
    'construction': 'constuction.png',
    'architecture': 'Architechture.png',
    'interior design': 'Interior Design.png',
    'design engineer': 'engineering.png',
    'engineering': 'engineering.png',
    'other': 'engineering.png',
  };
  // Determine which field to use for banner selection
  let bannerKey = '';
  if (user?.role === 'student') {
    bannerKey = profile?.personal_information?.profession || '';
  } else {
    bannerKey = profile?.about?.industry || profile?.personal_information?.profession || '';
  }
  const bannerIndustry = (bannerKey || '').toString().trim().toLowerCase();
  // Try to find a matching image
  let defaultBannerImg = '';
  if (bannerIndustry && industryImageMap[bannerIndustry]) {
    defaultBannerImg = `/${industryImageMap[bannerIndustry]}`;
  } else {
    // Try partial match
    const found = Object.keys(industryImageMap).find(key => bannerIndustry.includes(key));
    if (found) defaultBannerImg = `/${industryImageMap[found]}`;
  }
  // Fallback to generic
  if (!defaultBannerImg) defaultBannerImg = '/engineering.png';
  
  type AvatarProps = {
    src?: string;
    alt: string;
    fallback: string;
    className?: string;
  };
  const Avatar = ({ src, alt, fallback, className }: AvatarProps) => {
    const [imgError, setImgError] = useState(false);
    useEffect(() => { setImgError(false); }, [src]);
    return (
      <div className={`relative rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0 ${className || 'w-16 h-16'}`}>
        {!imgError && src && (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {(imgError || !src) && (
          <span className="text-white font-bold">{fallback}</span>
        )}
      </div>
    );
  };

  const fullName = profile
    ? `${profile.personal_information?.first_name ?? ''} ${profile.personal_information?.last_name ?? ''}`.trim()
    : user?.name ?? 'User';

  // const headline = profile?.about?.professional_summary ?? getUserRole();
  const industry = profile?.about?.industry ?? '—';
  const status = profile?.about?.current_status ?? '—';
  const email = profile?.personal_information?.email ?? user?.email ?? 'user@example.com';
  const maskedEmail = maskEmail(email);

  return (
    <motion.aside variants={itemVariants} className="sticky top-20 h-fit">
      <Link href="/profile" className="block" aria-label="View profile">
        <div className="w-full max-w-xs mx-auto">
          <div className="bg-white dark:bg-neutral-950 rounded-lg shadow-lg overflow-hidden dark:border  transition-colors duration-300">
            {/* Banner and Profile Picture */}
            <div className="relative">
              {/* Banner: use profile banner image when available, otherwise gradient fallback */}
              {/* Banner: use profile banner image when available, otherwise industry/profession image, then gradient fallback */}
              {profile?.banner?.fileUrl ? (
                <div
                  className="h-20 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${profile.banner.fileUrl})` }}
                  aria-label="User banner"
                />
              ) : defaultBannerImg ? (
                <img
                  src={defaultBannerImg}
                  alt="Default Banner"
                  className="h-20 w-full object-cover"
                  onError={e => {
                    // If image fails to load, fallback to gradient
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'h-20 w-full bg-gradient-to-r from-blue-500 to-indigo-600';
                    target.parentElement?.appendChild(fallbackDiv);
                  }}
                  aria-label="User banner"
                />
              ) : (
                <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600" aria-label="User banner" />
              )}

              <div className="absolute top-10 left-1/2 -translate-x-1/2">
                <Avatar
                  src={profile?.avatar?.fileUrl}
                  alt="User Avatar"
                  fallback={profile ? getUserInitials() : 'U'}
                  className="w-20 h-20 sm:w-24 md:w-28 sm:h-24 md:h-28 border-4 border-white dark:border-black transition-colors"
                />
              </div>
            </div>

            {/* User Info */}
            <div className="pt-16 pb-4 px-4 text-center border-b border-gray-300 dark:border-gray-800 transition-colors duration-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{fullName}</h2>
            </div>

            {/* Profile Details */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-800 transition-colors duration-300">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Profile Details</h3>

              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'student' ? 'Education' : 'Profession'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{industry}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-sm text-green-700 dark:text-green-400 font-semibold">{status}</p>
              </div>
            </div>

            {/* Contact / Email */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-800 transition-colors duration-300">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Contact</h3>

              <div className="flex items-center text-sm text-gray-700 dark:text-gray-200 font-medium">
                <Mail className="w-4 h-4 mr-2" />
                <span className="truncate">{maskedEmail}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Manage Posts Button - Outside the profile Link to avoid nested Link error */}
      <div className="w-full max-w-xs mx-auto mt-4">
        <Link href="/feed/manage-post">
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Manage Posts
          </Button>
        </Link>
      </div>
    </motion.aside>
  );
};

// Loading Skeleton Component
const PostLoadingSkeleton = () => (
  <div className="animate-pulse">
    <Card className="bg-card border-border rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-muted rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/6"></div>
      </div>
      <div className="h-64 bg-muted rounded-lg mb-4"></div>
      <div className="flex justify-between">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-muted rounded w-16"></div>
        ))}
      </div>
    </Card>
  </div>
);

// Empty State Component
const EmptyFeedState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
      <MessageSquare className="w-12 h-12 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-bold text-foreground mb-2">No posts available</h3>
    <p className="text-muted-foreground mb-6">
      Be the first to share something with the community!
    </p>
    <Button 
      onClick={() => window.location.reload()} 
      className="bg-purple-600 hover:bg-purple-500"
    >
      Refresh Feed
    </Button>
  </motion.div>
);

// Error State Component
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-24 h-24 mx-auto mb-6 bg-red-900/20 rounded-full flex items-center justify-center">
      <AlertCircle className="w-12 h-12 text-red-400" />
    </div>
    <h3 className="text-xl font-bold text-foreground mb-2">Failed to load posts</h3>
    <p className="text-muted-foreground mb-6">
      {error || 'Please try again.'}
    </p>
    <Button 
      onClick={onRetry} 
      className="bg-purple-600 hover:bg-purple-500"
    >
      Try Again
    </Button>
  </motion.div>
);

// Network Status Component
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-5 h-5" />
        <span>You are offline. Please check your connection.</span>
      </div>
    </motion.div>
  );
};


const FeedPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const posts = useAppSelector(selectFeedPosts);
  const loading = useAppSelector(selectFeedLoading);
  const error = useAppSelector(selectFeedError);
  const hasMore = useAppSelector(selectFeedHasMore);
  const isRefreshing = useAppSelector(selectFeedIsRefreshing);
  const total = useAppSelector(selectFeedTotal);

  // Tutorial state hook - prevents redirects during tutorial
  const { isTutorialActiveOnFeed, getCurrentTutorialStep } = useTutorialState();

  // Search functionality for URL params
  const {
    searchTags,
    searchActive,
    searchResults,
    searchLoading,
    searchError,
    handleSearch,
    handleClearSearch,
    searchResultsCount,
  } = useSearchPosts();

  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const { setTriggerRef } = useInfiniteScroll();
  const hasInitializedRef = useRef(false);

  // Check URL params for search tags
  useEffect(() => {
    if (!searchParams) return;
    
    const tagsParam = searchParams.get('tags')
    const queryParam = searchParams.get('q')
    
    if (tagsParam) {
      // Parse comma-separated tags
      const tags = tagsParam.split(',').filter(t => t.trim()).map(t => t.trim().toLowerCase())
      if (tags.length > 0) {
        handleSearch(tags)
      }
    } else if (searchActive) {
      // If no tags in URL but search is active, clear search
      handleClearSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Posts to display (use search results if active, otherwise regular posts)
  const displayPosts = searchActive ? searchResults : posts;
  const isLoading = searchActive ? searchLoading : loading;
  const currentError = searchActive ? searchError : error;

  // Sort posts based on selected criteria
  const sortedPosts = useMemo(() => {
    if (!displayPosts.length) return displayPosts;
    
    const postsToSort = [...displayPosts];
    
    switch (sortBy) {
      case 'latest':
        return postsToSort.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'popular':
        return postsToSort.sort((a, b) => {
          const aEngagement = a.likes + a.comments + a.shares;
          const bEngagement = b.likes + b.comments + b.shares;
          return bEngagement - aEngagement;
        });
      default:
        return postsToSort;
    }
  }, [displayPosts, sortBy]);

  // Initialize feed on component mount - only once
  useEffect(() => {
    if (!hasInitializedRef.current && !loading && !error) {
      hasInitializedRef.current = true;
      dispatch(fetchPosts({ offset: 0, limit: 20, refresh: false }));
    }
  }, [dispatch, loading, error]);

  // Monitor tutorial state to prevent redirects during feed steps
  useEffect(() => {
    const tutorialActive = isTutorialActiveOnFeed();
    const currentStep = getCurrentTutorialStep();
    
    if (tutorialActive) {
      console.log('🎓 [Feed] Tutorial is active on feed - step:', currentStep);
      console.log('🎓 [Feed] Preventing any redirects to profile during tutorial');
    }
  }, [isTutorialActiveOnFeed, getCurrentTutorialStep]);

  const handleRefresh = () => {
    dispatch(clearError());
    dispatch(refreshFeed());
  };

  const handleRetry = () => {
    dispatch(clearError());
    dispatch(fetchPosts({ offset: 0, limit: 20, refresh: true }));
  };

  const handlePostClick = (post: FeedPost) => {
    setSelectedPost(post);
    setShowPostDetail(true);
  };

  const handleClosePostDetail = () => {
    setShowPostDetail(false);
    setSelectedPost(null);
  };

  // Show loading skeletons on initial load
  if (isLoading && displayPosts.length === 0) {
    return (
      <div className="min-h-screen w-full bg-background font-sans text-foreground">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="hidden lg:block lg:col-span-3">
              <LeftSidebar />
            </div>
            
            <div className="col-span-1 lg:col-span-6">
              <motion.main className="space-y-6 pb-24 lg:pb-6">
                <motion.div variants={itemVariants}>
                  <CreatePost />
                </motion.div>
                
                {/* Loading Skeletons */}
                {[1, 2, 3].map((i) => (
                  <PostLoadingSkeleton key={i} />
                ))}
              </motion.main>
            </div>
          </div>
        </div>
        <NetworkStatus />
      </div>
    );
  }

  // Show error state on initial load error
  if (currentError && displayPosts.length === 0) {
    return (
      <div className="min-h-screen w-full bg-background font-sans text-foreground">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="hidden lg:block lg:col-span-3">
              <LeftSidebar />
            </div>
            
            <div className="col-span-1 lg:col-span-6">
              <motion.main className="space-y-6 pb-24 lg:pb-6">
                <motion.div variants={itemVariants}>
                  <CreatePost />
                </motion.div>
                
                <ErrorState error={currentError || 'Unknown error'} onRetry={handleRetry} />
              </motion.main>
            </div>
          </div>
        </div>
        <NetworkStatus />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground selection:bg-purple-500/30">
      {/* User Tutorial Component */}
      <UserTutorial run={true} />
      
      <NetworkStatus />
      
      {/* Main Container with proper responsive grid */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Hidden on mobile, shown on large screens */}
          <div className="hidden lg:block lg:col-span-3">
            <LeftSidebar />
          </div>
          
          {/* Main Content - Full width on mobile, centered on large screens */}
          <div className="col-span-1 lg:col-span-6" data-tour="feed">
            <motion.main 
              variants={containerVariants} 
              initial="hidden" 
              animate="visible" 
              className="space-y-6 pb-24 lg:pb-6"
            >
              {/* Create Post Component */}
              <motion.div variants={itemVariants} data-tour="create-post">
                <CreatePost />
              </motion.div>


              {/* Feed Status */}
              {isRefreshing && posts.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Checking for new posts...</span>
                  </div>
                </motion.div>
              )}

              {/* Feed Posts */}
              <AnimatePresence>
                {sortedPosts.length === 0 ? (
                  <EmptyFeedState />
                ) : (
                  sortedPosts.map((post: FeedPost, index: number) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                      className="relative"
                    >
                      {/* "New" badge for recent posts (within last 24 hours) */}
                      {sortBy === 'latest' && index < 3 && 
                        new Date(post.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                            New
                          </div>
                        </div>
                      )}
                      
                      <FeedPostCard 
                        post={post} 
                        onClick={handlePostClick}
                        data-tour={index === 0 ? "post-card" : undefined}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>

              {/* Infinite Scroll Trigger */}
              <InfiniteScrollTrigger
                onIntersect={setTriggerRef}
                loading={loading}
                hasMore={hasMore}
                error={error}
              />

              {/* Error Toast for infinite scroll errors */}
              {error && posts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-24 lg:bottom-6 left-1/2 transform -translate-x-1/2 bg-red-900 border border-red-700 rounded-lg p-4 text-white shadow-lg z-20"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Failed to load more posts</p>
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                    <Button
                      onClick={() => dispatch(clearError())}
                      variant="ghost"
                      size="sm"
                      className="text-red-200 hover:text-white"
                    >
                      ✕
                    </Button>
                  </div>
                </motion.div>
              )}

            </motion.main>
          </div>
        </div>
      </div>
      
      
      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          isOpen={showPostDetail}
          onClose={handleClosePostDetail}
          postId={selectedPost.id}
          initialPost={selectedPost}
        />
      )}
    </div>
  );
};

export default function FeedPageDefault() {
  return (
    <ProtectedRoute>
      <FeedPage />
    </ProtectedRoute>
  );
}