'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTimeAgo, isRecentDate } from '@/lib/utils/dateTime';
import type { FeedPost } from '@/store/slices/feedSlice';

interface PostDetailContentProps {
  post: FeedPost;
  onMediaClick?: (mediaIndex: number) => void;
}

// Animation variants
const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, delay: 0.1 }
  }
};

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Helper function to get user initials
const getUserInitials = (name: string) => {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

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

export const PostDetailContent: React.FC<PostDetailContentProps> = ({
  post
}) => {
  // Extract content from post structure
  const content = post.content?.text || '';
  const [showFullText, setShowFullText] = useState(false);
  
  // Check if text is long (more than 200 characters)
  const isLongText = content.length > 200;
  const displayText = showFullText || !isLongText ? content : content.substring(0, 200) + '...';

  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 w-full max-w-none"
    >
      {/* Author Information */}
      <motion.div 
        variants={contentVariants}
        className="flex items-center gap-3"
      >
        <Avatar className="w-12 h-12">
          <AvatarImage src={post.user?.avatar} alt={post.user?.name || 'User'} />
          <AvatarFallback className="bg-purple-600 text-white font-semibold text-lg">
            {getUserInitials(post.user?.name || `User ${post.user_id.slice(0, 8)}`)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg text-black dark:text-white">
            {post.user?.name || `User ${post.user_id.slice(0, 8)}`}
          </h3>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
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
      </motion.div>

      {/* Post Content */}
      {content && (
        <motion.div 
          variants={contentVariants}
          className="space-y-4"
        >
          <div className="prose prose-invert max-w-none">
            <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
              {formatContent(displayText)}
            </p>
            {isLongText && (
              <Button
                variant="ghost"
                onClick={() => setShowFullText(!showFullText)}
                className="text-primary hover:text-primary/80 p-0 h-auto font-medium mt-2"
              >
                {showFullText ? 'See less' : 'See more'}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Tags and Hashtags */}
      {(post.tags.length > 0 || post.content?.hashtags?.length > 0) && (
        <motion.div 
          variants={contentVariants}
          className="flex flex-wrap gap-2"
        >
          {/* Display tags from post.tags */}
          {post.tags.map((tag, index) => (
            <span 
              key={`tag-${index}`}
              className="px-3 py-1 bg-neutral-800 text-blue-400 text-sm rounded-full hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              #{tag}
            </span>
          ))}
          {/* Display hashtags from content.hashtags if different from tags */}
          {post.content?.hashtags?.filter(hashtag => !post.tags.includes(hashtag)).map((hashtag, index) => (
            <span 
              key={`hashtag-${index}`}
              className="px-3 py-1 bg-neutral-800 text-blue-400 text-sm rounded-full hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              #{hashtag}
            </span>
          ))}
        </motion.div>
      )}



    </motion.div>
  );
};
