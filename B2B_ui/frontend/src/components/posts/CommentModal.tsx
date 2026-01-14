'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  closeCommentModal, 
  commentOnPost, 
  fetchPostComments,
  selectCommentModalOpen,
  selectCurrentPostId,
  selectCommentsForPost,
  selectInteractionLoading
} from '@/store/slices/interactionSlice';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/lib/utils/dateTime';
import type { Comment } from '@/store/slices/interactionSlice';

interface CommentModalProps {
  postId?: string;
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

// Comment Item Component
const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
  >
    <Avatar className="w-8 h-8 flex-shrink-0">
      <AvatarImage src={comment.user?.avatar} alt={comment.user?.name || 'User'} />
      <AvatarFallback className="bg-purple-600 text-white text-xs">
        {getUserInitials(comment.user?.name || `User ${comment.user_id.slice(0, 8)}`)}
      </AvatarFallback>
    </Avatar>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm text-foreground">
          {comment.user?.name || `User ${comment.user_id.slice(0, 8)}`}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(comment.created_at)}
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {comment.text}
      </p>
    </div>
  </motion.div>
);

export const CommentModal: React.FC<CommentModalProps> = ({ postId }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectCommentModalOpen);
  const currentPostId = useAppSelector(selectCurrentPostId);
  const comments = useAppSelector(selectCommentsForPost(postId || currentPostId || ''));
  const loading = useAppSelector(selectInteractionLoading);
  
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPostId = postId || currentPostId;

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && targetPostId && !comments.length) {
      dispatch(fetchPostComments({ postId: targetPostId }));
    }
  }, [isOpen, targetPostId, dispatch, comments.length]);

  const handleClose = () => {
    dispatch(closeCommentModal());
    setCommentText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || !targetPostId) return;
    
    setIsSubmitting(true);
    
    try {
      await dispatch(commentOnPost({ 
        postId: targetPostId, 
        commentText: commentText.trim() 
      })).unwrap();
      
      setCommentText('');
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error(error as string || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  if (!isOpen || !targetPostId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-foreground">Comments</h2>
              {comments.length > 0 && (
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  {comments.length}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading.comment && comments.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground">Be the first to comment!</p>
              </div>
            ) : (
              <AnimatePresence>
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Comment Form */}
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                className="min-h-[80px] resize-none"
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Press Cmd+Enter to post
                </p>
                <Button
                  type="submit"
                  disabled={!commentText.trim() || isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
