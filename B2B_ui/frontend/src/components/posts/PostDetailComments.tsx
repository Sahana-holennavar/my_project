'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Loader2,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  selectCommentsForPost, 
  commentOnPost, 
  fetchPostComments,
  selectInteractionLoading,
  type Comment
} from '@/store/slices/interactionSlice';
import { formatTimeAgo } from '@/lib/utils/dateTime';
import { toast } from 'sonner';

interface PostDetailCommentsProps {
  postId: string;
  postComments?: number;
}


// Animation variants
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.3, 
      ease: "easeOut" as const
    } 
  },
};

const commentItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.3, 
      ease: "easeOut" as const
    } 
  },
};

// Comment item component
const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0); // Comments don't have likes in our current API

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <motion.div 
      variants={commentItemVariants}
      className="flex gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50"
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.user?.avatar || ''} alt={comment.user?.name || 'User'} />
        <AvatarFallback className="bg-purple-600 text-white text-xs">
          {comment.user?.name ? comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground">
            {comment.user?.name || `User ${comment.user_id.slice(0, 8)}`}
          </span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{comment.text}</p>
        <div className="flex items-center gap-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-1 px-2 py-1 h-auto text-xs ${
              isLiked 
                ? 'text-red-400 hover:text-red-300' 
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount} likes</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export const PostDetailComments: React.FC<PostDetailCommentsProps> = ({ postId }: PostDetailCommentsProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const comments = useAppSelector(selectCommentsForPost(postId));
  const loading = useAppSelector(selectInteractionLoading);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments when component mounts
  React.useEffect(() => {
    if (postId && comments.length === 0) {
      dispatch(fetchPostComments({ postId }));
    }
  }, [postId, dispatch, comments.length]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await dispatch(commentOnPost({ 
        postId, 
        commentText: newComment.trim() 
      })).unwrap();
      
      setNewComment('');
      toast.success('Comment posted successfully!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col"
    >
      {/* Comments Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-neutral-400" />
          <span className="text-sm font-medium text-muted-foreground">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading.comment && comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs">Be the first to comment!</p>
          </div>
        )}
      </div>

      {/* Add Comment */}
      {user && (
        <div className="p-4 border-t border-neutral-800">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-purple-600 text-white text-xs">
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[40px]"
                rows={1}
                maxLength={500}
              />
              <span className="absolute bottom-2 right-12 text-xs text-neutral-500">
                {newComment.length}/500
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                className="absolute right-2 bottom-1 text-purple-400 hover:text-purple-300"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
