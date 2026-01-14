'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchPostById } from '@/store/slices/feedSlice';
import { PostDetailContent } from './PostDetailContent';
import { PostDetailMedia } from './PostDetailMedia';
import { PostDetailComments } from './PostDetailComments';
import { PostDetailActions } from './PostDetailActions';
import { MediaFullscreen } from './MediaFullscreen';
import type { FeedPost } from '@/store/slices/feedSlice';

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  initialPost?: FeedPost;
}

// Animation variants
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
    y: 20
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};


// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="flex h-full">
    {/* Left side skeleton */}
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-neutral-800 rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-neutral-800 rounded w-32 animate-pulse" />
          <div className="h-3 bg-neutral-800 rounded w-24 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-neutral-800 rounded w-full animate-pulse" />
        <div className="h-4 bg-neutral-800 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-neutral-800 rounded-full w-16 animate-pulse" />
        ))}
      </div>
    </div>
    
    {/* Right side skeleton */}
    <div className="flex-1 border-l border-neutral-800">
      <div className="h-full bg-neutral-900 animate-pulse flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
      </div>
    </div>
  </div>
);

// Error state component
const ErrorState = ({ error, onRetry, onClose }: { 
  error: string; 
  onRetry: () => void; 
  onClose: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
      <X className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">Failed to load post</h3>
    <p className="text-neutral-400 mb-6 max-w-md">
      {error || 'Something went wrong while loading this post.'}
    </p>
    <div className="flex gap-3">
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
      <Button onClick={onClose} variant="ghost">
        Close
      </Button>
    </div>
  </div>
);

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  isOpen,
  onClose,
  postId,
  initialPost
}) => {
  const dispatch = useAppDispatch();
  const { post, loading, error } = useAppSelector((state) => ({
    post: state.feed.currentPost,
    loading: state.feed.loading,
    error: state.feed.error
  }));

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Fetch post data when modal opens
  useEffect(() => {
    if (isOpen && postId && !initialPost) {
      dispatch(fetchPostById(postId));
    }
  }, [isOpen, postId, dispatch, initialPost]);

  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  const handleMediaFullscreen = (mediaIndex: number) => {
    setCurrentMediaIndex(mediaIndex);
    setIsFullscreen(true);
  };

  const handleRetry = () => {
    if (postId) {
      dispatch(fetchPostById(postId));
    }
  };

  // Use initial post if available, otherwise use fetched post
  const displayPost = initialPost || post;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-6xl h-[90vh] p-0 bg-background border-border overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Post Detail</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {isFullscreen && displayPost ? (
            <MediaFullscreen
              key="fullscreen"
              post={displayPost}
              initialIndex={currentMediaIndex}
              onClose={() => setIsFullscreen(false)}
            />
          ) : displayPost ? (
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col md:flex-row h-full w-full"
            >

              {/* Content */}
              {loading && !displayPost ? (
                <LoadingSkeleton />
              ) : error && !displayPost ? (
                <ErrorState 
                  error={error} 
                  onRetry={handleRetry}
                  onClose={handleClose}
                />
              ) : displayPost ? (
                  <>
                    {/* Left side - Content + Media */}
                    <div 
                      className="w-full md:w-1/2 p-4 md:p-6 overflow-y-auto border-r border-border custom-scrollbar h-full"
                    >
                      <PostDetailContent 
                        post={displayPost}
                        onMediaClick={handleMediaFullscreen}
                      />
                      <div className="mt-6">
                        <PostDetailMedia 
                          post={displayPost}
                          onMediaClick={handleMediaFullscreen}
                        />
                      </div>
                      
                      {/* Action Buttons below media */}
                      <div className="mt-6">
                        <PostDetailActions post={displayPost} />
                      </div>
                    </div>

                    {/* Right side - Comments */}
                    <div 
                      className="w-full md:w-1/2 min-h-0 bg-muted/50"
                    >
                      <PostDetailComments 
                        postId={displayPost.id}
                        postComments={displayPost.comments}
                      />
                    </div>
                  </>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
