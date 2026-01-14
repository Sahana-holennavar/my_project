'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { FeedPostCard } from './FeedPostCard';
import type { PreviewData } from '@/types/posts';
import type { FeedPost } from '@/store/slices/feedSlice';
import { extractHashtags, extractMentions } from '@/lib/utils/mediaHelpers';

interface PostPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: PreviewData | null;
  onEdit: () => void;
  onPost: () => void;
  isLoading?: boolean;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  isOpen,
  onClose,
  previewData,
  onEdit,
  onPost,
  isLoading = false,
}) => {
  // Transform PreviewData to FeedPost format for consistent rendering
  const transformedPost = useMemo((): FeedPost | null => {
    if (!previewData) return null;
    
    return {
      id: 'preview-post',
      user_id: 'preview-user',
      type: previewData.media.length > 0 ? 
             (previewData.media[0].type === 'video' ? 'video' : 'image') : 'text',
      content: {
        text: previewData.content,
        hashtags: extractHashtags(previewData.content),
        mentions: extractMentions(previewData.content),
      },
      media: previewData.media.map(mediaFile => ({
        url: mediaFile.url, // blob URL for preview
        size: mediaFile.size,
        type: mediaFile.type as 'image' | 'video',
        filename: mediaFile.name,
        uploadedAt: new Date().toISOString(),
      })),
      audience: previewData.audience,
      tags: extractHashtags(previewData.content),
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reposts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        name: previewData.user.name,
        avatar: previewData.user.avatar,
        user_type: 'preview',
      },
    };
  }, [previewData]);

  if (!previewData || !transformedPost) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogOverlay />
            <DialogContent>
              <DialogTitle className="sr-only">Post Preview</DialogTitle>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ 
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className="w-full max-w-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl p-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Post Preview</h2>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="p-1 h-auto"
                    disabled={isLoading}
                  >
                    <X className="w-5 h-5 text-neutral-400 hover:text-white" />
                  </Button>
                </div>

                {/* Post Card Preview */}
                <div className="bg-neutral-950 border-x border-neutral-800 p-6 max-h-[50vh] overflow-y-auto">
                  <FeedPostCard 
                    post={transformedPost} 
                    className="border-0 bg-transparent"
                    isPreview={true}
                  />
                  
                  {/* Preview Footer */}
                  <div className="mt-4 pt-4 border-t border-neutral-800 text-center">
                    <p className="text-sm text-neutral-400">
                      This is how your post will appear in the feed
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-b-3xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      onClick={onEdit}
                      variant="outline"
                      className="flex items-center gap-2 flex-1"
                      disabled={isLoading}
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Post
                    </Button>

                    <Button
                      onClick={onPost}
                      className="flex items-center gap-2 flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publish Post
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Additional Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mt-4 p-3 bg-neutral-800 rounded-lg"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-400">Audience</p>
                        <p className="text-white font-medium capitalize">
                          {previewData.audience}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-400">Content Length</p>
                        <p className="text-white font-medium">
                          {previewData.content.length} characters
                        </p>
                      </div>
                      {previewData.media.length > 0 && (
                        <>
                          <div>
                            <p className="text-neutral-400">Media Files</p>
                            <p className="text-white font-medium">
                              {previewData.media.length} file{previewData.media.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-neutral-400">Total Size</p>
                            <p className="text-white font-medium">
                              {(previewData.media.reduce((total, mediaFile) => total + (mediaFile.file?.size || mediaFile.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* Warning for large uploads */}
                  {previewData.media.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/40 rounded-lg"
                    >
                      <p className="text-sm text-yellow-300">
                        ⚡ Uploading {previewData.media.length} files may take a moment. Please don&apos;t close this page.
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};