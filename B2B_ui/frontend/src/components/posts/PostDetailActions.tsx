'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Repeat2,
  Heart,
  MoreHorizontal,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePostEngagement } from '@/store/slices/feedSlice';
import { 
  likePost, 
  unlikePost, 
  savePost, 
  unsavePost,
  selectIsPostLiked,
  selectIsPostSaved,
  selectInteractionLoading
} from '@/store/slices/interactionSlice';
import { toast } from 'sonner';
import { ShareModal } from './ShareModal';
import { EditPostForm } from './EditPostForm';
import type { FeedPost } from '@/store/slices/feedSlice';

interface PostDetailActionsProps {
  post: FeedPost;
}

// Animation variants
const actionsVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, delay: 0.2 }
  }
};

// Action button component
const ActionButton: React.FC<{
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  label: string;
  count: number;
  onClick: () => void;
  isActive?: boolean;
  isLoading?: boolean;
  className?: string;
}> = ({ 
  icon: Icon, 
  label, 
  count, 
  onClick, 
  isActive = false, 
  isLoading = false,
  className = ""
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex-shrink-0"
  >
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-xs ${
        isActive 
          ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      } ${className}`}
    >
      <Icon className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
      {count > 0 && (
        <span className="text-xs text-neutral-500">
          {count > 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </Button>
  </motion.div>
);

export const PostDetailActions: React.FC<PostDetailActionsProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => ({
    user: state.auth.user
  }));
  
  const isLiked = useAppSelector(selectIsPostLiked(post.id));
  const isSaved = useAppSelector(selectIsPostSaved(post.id));
  const loading = useAppSelector(selectInteractionLoading);
  
  const [isReposted, setIsReposted] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user is the post owner
  const isPostOwner = user?.id === post.user_id;

  const handleLike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        await dispatch(unlikePost({ postId: post.id })).unwrap();
        toast.success('Like removed');
      } else {
        await dispatch(likePost({ postId: post.id })).unwrap();
        toast.success('Post liked!');
      }
      
      // Update local engagement count optimistically
      dispatch(updatePostEngagement({
        postId: post.id,
        field: 'likes',
        increment: !isLiked
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isSaved) {
        await dispatch(unsavePost({ postId: post.id })).unwrap();
        toast.success('Post removed from saved');
      } else {
        await dispatch(savePost({ postId: post.id })).unwrap();
        toast.success('Post saved!');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepost = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      setIsReposted(!isReposted);
      dispatch(updatePostEngagement({
        postId: post.id,
        field: 'reposts',
        increment: !isReposted
      }));
      // TODO: Implement repost API call
    } catch (error) {
      console.error('Error reposting:', error);
      setIsReposted(!isReposted); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleComment = () => {
    // TODO: Implement comment functionality
    console.log('Comment clicked');
  };

  const handleShare = () => {
    // Share functionality is now handled by the ShareModal component
    console.log('Share clicked');
  };

  const handleMore = () => {
    // TODO: Implement more options menu
    console.log('More options clicked');
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    // Post will be updated automatically via Redux state
  };

  const handleEditClose = () => {
    setShowEditForm(false);
  };

  return (
    <>
      <motion.div
        variants={actionsVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Action Buttons Row - 6 items */}
        <div className="flex flex-wrap gap-1">
            <ActionButton
              icon={isLiked ? Heart : ThumbsUp}
              label={isLiked ? "Liked" : "Like"}
              count={post.likes}
              onClick={handleLike}
              isActive={isLiked}
              isLoading={loading.like || isLoading}
            />
          
          <ActionButton
            icon={MessageCircle}
            label="Comment"
            count={post.comments}
            onClick={handleComment}
            isLoading={isLoading}
          />
          
          <ActionButton
            icon={isReposted ? Repeat2 : Repeat2}
            label={isReposted ? "Reposted" : "Repost"}
            count={post.reposts}
            onClick={handleRepost}
            isActive={isReposted}
            isLoading={isLoading}
          />
          
          <ActionButton
            icon={Share2}
            label="Share"
            count={post.shares}
            onClick={handleShare}
            isLoading={isLoading}
          />

          {/* Edit Button - Only show for post owner */}
          {isPostOwner && (
            <ActionButton
              icon={Edit3}
              label="Edit"
              count={0}
              onClick={handleEdit}
              isLoading={isLoading}
              className="text-blue-400 hover:text-blue-300"
            />
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
          <ActionButton
            icon={isSaved ? Bookmark : Bookmark}
            label={isSaved ? "Saved" : "Save"}
            count={0}
            onClick={handleSave}
            isActive={isSaved}
            isLoading={loading.save || isLoading}
            className="flex-1"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMore}
            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Engagement Stats */}
        <div className="flex items-center gap-4 text-sm text-neutral-500 pt-2">
          {post.views !== undefined && (
            <span className="flex items-center gap-1">
              <span className="font-semibold text-neutral-300">{post.views}</span>
              <span>views</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="font-semibold text-neutral-300">{post.likes}</span>
            <span>likes</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-neutral-300">{post.comments}</span>
            <span>comments</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-neutral-300">{post.shares}</span>
            <span>shares</span>
          </span>
        </div>
      </motion.div>

      {/* Share Modal */}
      <ShareModal
        postId={post.id}
      />

      {/* Edit Post Form */}
      <EditPostForm
        isOpen={showEditForm}
        onClose={handleEditClose}
        post={post}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};
