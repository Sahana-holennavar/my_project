'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  MoreHorizontal, 
  PlayCircle,
  ThumbsUp,
  Share2,
  ArrowLeft,
  ArrowRight,
  Eye,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePostEngagement } from '@/store/slices/feedSlice';
import { 
  likePost, 
  unlikePost, 
  // savePost, 
  // unsavePost, 
  sharePost,
  openCommentModal,
  openShareModal,
  openReportModal,
  selectIsPostLiked,
  // selectIsPostSaved,
  selectInteractionLoading,
  toggleLikeOptimistic
} from '@/store/slices/interactionSlice';
import { CommentModal } from './CommentModal';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { toast } from 'sonner';
import { formatTimeAgo, isRecentDate } from '@/lib/utils/dateTime';

// Normalize various thrown errors to a safe string for toasts
const getErrorMessage = (error: unknown) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
import type { FeedPost } from '@/store/slices/feedSlice';
import type { MediaContent } from '@/types/posts';

interface FeedPostCardProps {
  post: FeedPost;
  className?: string;
  onClick?: (post: FeedPost) => void;
  isPreview?: boolean;
}

// Helper function to get user initials
const getUserInitials = (name: string) => {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Image Carousel Component
const ImageCarousel: React.FC<{ media: MediaContent[] }> = ({ media }) => {
  const [[page, direction], setPage] = useState([0, 0]);

  const imageIndex = page % media.length;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };
  
  const currentImage = media[imageIndex >= 0 ? imageIndex : media.length + imageIndex];

  return (
    <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
      <motion.img
        key={page}
        src={currentImage.url}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
        className="w-full h-full object-cover"
        alt="Post content"
      />
      
      {media.length > 1 && (
        <>
          <button onClick={() => paginate(-1)} className="absolute top-1/2 left-2 -translate-y-1/2 z-10 p-2 bg-background/40 rounded-full text-foreground hover:bg-background/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => paginate(1)} className="absolute top-1/2 right-2 -translate-y-1/2 z-10 p-2 bg-background/40 rounded-full text-foreground hover:bg-background/60 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {media.map((_, i) => (
               <div key={i} className={`h-2 w-2 rounded-full transition-colors ${
                (i === imageIndex || (imageIndex < 0 && i === media.length + imageIndex)) ? 'bg-white' : 'bg-white/50'
               }`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Video Carousel Component
const VideoCarousel: React.FC<{ media: MediaContent[] }> = ({ media }) => {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isPlaying, setIsPlaying] = useState<{ [key: number]: boolean }>({});

  const videoIndex = page % media.length;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
    setIsPlaying({});
  };

  const togglePlay = (index: number, videoElement: HTMLVideoElement) => {
    if (isPlaying[index]) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };
  
  const currentVideo = media[videoIndex >= 0 ? videoIndex : media.length + videoIndex];

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
      <motion.div
        key={page}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
        className="absolute w-full h-full"
      >
        <video
          ref={(el) => {
            if (el) {
              el.onplay = () => setIsPlaying(prev => ({ ...prev, [videoIndex]: true }));
              el.onpause = () => setIsPlaying(prev => ({ ...prev, [videoIndex]: false }));
              el.onended = () => setIsPlaying(prev => ({ ...prev, [videoIndex]: false }));
            }
          }}
          src={currentVideo.url}
          className="w-full h-full object-cover"
          controls={false}
          preload="metadata"
          muted
          playsInline
        />
        
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background/20 hover:bg-background/30 transition-colors cursor-pointer"
          onClick={(e) => {
            const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
            if (video) togglePlay(videoIndex, video);
          }}
        >
          {!isPlaying[videoIndex] && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="p-4 bg-background/60 rounded-full backdrop-blur-sm"
            >
              <PlayCircle className="w-12 h-12 text-foreground" />
            </motion.div>
          )}
        </div>

        <div className="absolute top-2 right-2">
          <div className="px-2 py-1 bg-background/60 backdrop-blur-sm rounded text-xs text-foreground">
            Video
          </div>
        </div>
      </motion.div>

      {media.length > 1 && (
        <>
          <button 
            onClick={() => paginate(-1)} 
            className="absolute top-1/2 left-2 -translate-y-1/2 z-10 p-2 bg-background/40 rounded-full text-foreground hover:bg-background/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => paginate(1)} 
            className="absolute top-1/2 right-2 -translate-y-1/2 z-10 p-2 bg-background/40 rounded-full text-foreground hover:bg-background/60 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {media.map((_, i) => (
               <div key={i} className={`h-2 w-2 rounded-full transition-colors ${
                (i === videoIndex || (videoIndex < 0 && i === media.length + videoIndex)) ? 'bg-white' : 'bg-white/50'
               }`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  className = '',
  onClick,
  isPreview = false,
}) => {
  const dispatch = useAppDispatch();
  const isLikedFromRedux = useAppSelector(selectIsPostLiked(post.id));
  // Check both Redux state and post.isLiked property (if exists in API response)
  const isLikedFromState = isLikedFromRedux || ('isLiked' in post && post.isLiked === true);
  // const isSaved = useAppSelector(selectIsPostSaved(post.id));
  const globalLoading = useAppSelector(selectInteractionLoading);
  
  // Local optimistic state that updates immediately for instant UI feedback
  const [optimisticLiked, setOptimisticLiked] = React.useState<boolean | null>(null);
  
  // Use optimistic state if set, otherwise fall back to Redux state
  const isLiked = optimisticLiked !== null ? optimisticLiked : isLikedFromState;
  
  // Local loading state for this specific post to prevent all buttons from showing loading
  const [isLikeLoading, setIsLikeLoading] = React.useState(false);
  const [isShareLoading, setIsShareLoading] = React.useState(false);
  
  // Track when API call completes to know when to sync optimistic state
  const apiCallCompleted = React.useRef(false);
  
  // Reset optimistic state only after API call completes and Redux state matches
  React.useEffect(() => {
    if (optimisticLiked !== null && apiCallCompleted.current) {
      // Check if Redux state matches our optimistic state
      if (isLikedFromState === optimisticLiked) {
        // Redux state has caught up, clear optimistic state
        // Use a small delay to ensure UI has rendered
        const timeoutId = setTimeout(() => {
          setOptimisticLiked(null);
          apiCallCompleted.current = false;
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isLikedFromState, optimisticLiked]);

  // Extract content and media from the post structure
  const content = useMemo(() => {
    // Handle the actual API structure where content is an object with text property
    return post.content?.text || '';
  }, [post.content]);

  const media = useMemo(() => {
    // Media is now a direct array property on the post
    return post.media || [];
  }, [post.media]);

  const images = useMemo(() => media.filter((file: MediaContent) => file.type === 'image'), [media]);
  const videos = useMemo(() => media.filter((file: MediaContent) => file.type === 'video'), [media]);

  // Format content with hashtags and mentions
  const formatContent = (text: string) => {
    if (!text) return '';
    
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <span key={index} className="text-blue-400 hover:text-blue-300 cursor-pointer">
            {word}
          </span>
        );
      }
      if (word.startsWith('@')) {
        return (
          <span key={index} className="text-purple-400 hover:text-purple-300 cursor-pointer">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  const handleLike = async () => {
    // Prevent multiple clicks
    if (isLikeLoading) return;
    
    // Calculate new state based on current state
    const currentLikedState = optimisticLiked !== null ? optimisticLiked : isLikedFromState;
    const newLikedState = !currentLikedState;
    
    // Set loading state for this specific post
    setIsLikeLoading(true);
    
    // IMMEDIATELY update local optimistic state for instant UI feedback
    // This ensures the button turns purple on the first click
    setOptimisticLiked(newLikedState);
    apiCallCompleted.current = false; // Reset flag
    
    // Also toggle the like state in Redux (for consistency)
    dispatch(toggleLikeOptimistic(post.id));
    
    // Update local engagement count optimistically
    dispatch(updatePostEngagement({
      postId: post.id,
      field: 'likes',
      increment: newLikedState
    }));
    
    try {
      // Use newLikedState instead of isLiked since we've already toggled optimistically
      if (newLikedState) {
        await dispatch(likePost({ postId: post.id })).unwrap();
        toast.success('Post liked!');
      } else {
        await dispatch(unlikePost({ postId: post.id })).unwrap();
        toast.success('Like removed');
      }
      // Mark API call as completed so we can sync optimistic state with Redux
      apiCallCompleted.current = true;
      // The actual API call will update the state correctly via the fulfilled action
    } catch (error) {
      const msg = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

      // Revert optimistic state on error
      setOptimisticLiked(!newLikedState);
      apiCallCompleted.current = false;
      
      // Revert optimistic update in Redux
      dispatch(toggleLikeOptimistic(post.id));
      
      // Revert engagement count
      dispatch(updatePostEngagement({
        postId: post.id,
        field: 'likes',
        increment: !newLikedState
      }));

      // If server reports the user has already liked the post when trying to like,
      // sync state to reflect that it's already liked
      if (newLikedState && /already liked|409|conflict/i.test(msg)) {
        // Post is already liked on server, ensure state reflects this
        setOptimisticLiked(true);
        apiCallCompleted.current = true; // Mark as completed so state syncs
        if (!isLikedFromRedux) {
          dispatch(toggleLikeOptimistic(post.id));
        }
        toast.info('Post is already liked');
        return;
      }

      toast.error(msg || 'Failed to update like');
    } finally {
      // Clear loading state for this specific post
      setIsLikeLoading(false);
    }
  };

  // const handleSave = async () => {
  //   try {
  //     if (isSaved) {
  //       await dispatch(unsavePost({ postId: post.id })).unwrap();
  //       toast.success('Post removed from saved');
  //     } else {
  //       await dispatch(savePost({ postId: post.id })).unwrap();
  //       toast.success('Post saved!');
  //     }
  //   } catch (error) {
  //   toast.error(getErrorMessage(error) || 'Failed to save post');

  //     const msg = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

  //     // If server reports the post is already saved when trying to save,
  //     // attempt to unsave so a single click toggles correctly.
  //     if (!isSaved && /already saved|has already saved/i.test(msg)) {
  //       try {
  //         await dispatch(unsavePost({ postId: post.id })).unwrap();
  //         toast.success('Post removed from saved');
  //         return;
  //       } catch (e) {
  //         toast.error((e as string) || 'Failed to remove saved post');
  //         return;
  //       }
  //     }

  //     toast.error(msg || 'Failed to save post');
  //   }
  // };

  const handleComment = async () => {
    try {
      dispatch(openCommentModal(post.id));
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to open comment modal');
    }
  };

  const handleShare = async () => {
    // Prevent multiple clicks
    if (isShareLoading) return;
    
    setIsShareLoading(true);
    try {
      await dispatch(sharePost({ postId: post.id })).unwrap();
      dispatch(openShareModal(post.id));
      toast.success('Post shared!');
      
      // Update local engagement count
      dispatch(updatePostEngagement({
        postId: post.id,
        field: 'shares',
        increment: true
      }));
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to share post');
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleReport = () => {
    dispatch(openReportModal(post.id));
  };

  const handleCardClick = () => {
    if (onClick && !isPreview) {
      onClick(post);
    }
  };

  // Action Button Component
  const ActionButton: React.FC<{ 
    icon: React.ComponentType<{ className?: string; size?: number | string }>; 
    label: string; 
    count?: number;
    onClick: () => void; 
    isActive?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
  }> = ({ icon: Icon, label, count, onClick, isActive = false, isLoading = false, disabled = false }) => {
    // Build className with proper conditional styling
    let buttonClassName = 'flex items-center gap-2 p-2 rounded-md transition-colors w-full justify-center';
    
    if (disabled || isLoading) {
      buttonClassName += ' opacity-50 cursor-not-allowed';
    }
    
    if (isActive) {
      // Purple styling for all active buttons (including Like)
      buttonClassName += ' text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/30';
    } else {
      buttonClassName += ' text-muted-foreground hover:bg-muted';
    }
    
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && !isLoading) {
            onClick();
          }
        }} 
        disabled={disabled || isLoading}
        className={buttonClassName}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon 
            className={`w-5 h-5 ${isActive && (label === 'Like' || label === 'Saved') ? 'fill-current' : ''}`}
          />
        )}
        <span className="text-sm font-medium hidden sm:inline">{label}</span>
        {count !== undefined && (
          <span className="text-sm font-medium">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-card border border-border rounded-lg p-4 sm:p-6 
        ${!isPreview ? 'hover:border-border cursor-pointer' : 'cursor-default'} 
        transition-all duration-300
        ${className}
      `}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={post.user?.avatar} alt={post.user?.name || 'User'} />
            <AvatarFallback className="bg-purple-600 text-white font-semibold text-lg">
              {getUserInitials(post.user?.name || `User ${post.user_id.slice(0, 8)}`)}
            </AvatarFallback>
          </Avatar>
          
            <div>
            <p className="font-bold text-base sm:text-lg text-foreground">
              <Link
                href={`/user/${post.user_id}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`View profile of ${post.user?.name || post.user_id}`}
                className="hover:underline"
              >
                {post.user?.name || `User ${post.user_id.slice(0, 8)}`}
              </Link>
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className={`${isRecentDate(post.created_at) ? 'text-green-400 font-medium' : ''}`}>
                {formatTimeAgo(post.created_at)}
              </span>
              {isRecentDate(post.created_at) && (
                <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full">
                  New
                </span>
              )}
              <span>•</span>
              <span className="capitalize">{post.audience}</span>
              {post.user?.user_type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{post.user.user_type}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {!isPreview && (
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground p-1 sm:p-2"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle dropdown or show report option
                handleReport();
              }}
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {content && (
        <div className="mb-3 sm:mb-4">
          <p className="text-foreground text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {formatContent(content)}
          </p>
        </div>
      )}

      {/* Tags */}
      {(post.tags.length > 0 || post.content?.hashtags?.length > 0) && (
        <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
          {/* Display tags from post.tags */}
          {post.tags.map((tag, index) => (
            <span 
              key={`tag-${index}`}
              className="px-2 py-1 bg-muted text-blue-500 text-xs rounded-full hover:bg-muted/80 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              #{tag}
            </span>
          ))}
          {/* Display hashtags from content.hashtags if different from tags */}
          {post.content?.hashtags?.filter(hashtag => !post.tags.includes(hashtag)).map((hashtag, index) => (
            <span 
              key={`hashtag-${index}`}
              className="px-2 py-1 bg-muted text-blue-500 text-xs rounded-full hover:bg-muted/80 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              #{hashtag}
            </span>
          ))}
        </div>
      )}

      {/* Media */}
      <div className="space-y-4">
        {images.length > 0 && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border">
            <ImageCarousel media={images} />
          </div>
        )}
        {videos.length > 0 && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border">
            <VideoCarousel media={videos} />
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
        {post.views !== undefined && (
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span className="font-semibold text-foreground">{post.views}</span> Views
          </span>
        )}
        <span>
          <span className="font-semibold text-foreground">{post.likes}</span> Likes
        </span>
        <span>
          <span className="font-semibold text-foreground">{post.comments}</span> Comments
        </span>
        <span>
          <span className="font-semibold text-foreground">{post.shares}</span> Shares
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-border">
        <div data-tour="like-button">
          <ActionButton 
            icon={ThumbsUp} 
            label="Like" 
            count={post.likes}
            onClick={handleLike} 
            isActive={isLiked}
            isLoading={isLikeLoading}
          />
        </div>
        <div data-tour="comment-button">
          <ActionButton 
            icon={MessageCircle} 
            label="Comment" 
            count={post.comments}
            onClick={handleComment}
          />
        </div>
        <div data-tour="share-button">
          <ActionButton 
            icon={Share2} 
            label="Share" 
            count={post.shares}
            onClick={handleShare}
            isLoading={isShareLoading}
          />
        </div>
        {/* <ActionButton 
          icon={Bookmark} 
          label={isSaved ? "Saved" : "Save"} 
          onClick={handleSave} 
          isActive={isSaved}
          isLoading={loading.save}
        /> */}
      </div>

      {/* Modals */}
      <CommentModal postId={post.id} />
      <ShareModal postId={post.id} />
      <ReportModal postId={post.id} />
    </motion.div>
  );
};