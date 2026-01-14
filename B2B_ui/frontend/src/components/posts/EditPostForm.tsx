'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextArea } from './TextArea';
import { MediaUpload } from './MediaUpload';
import { HashtagSuggestions } from './HashtagSuggestions';
import { MentionSuggestions } from './MentionSuggestions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePost } from '@/store/slices/feedSlice';
import type { FeedPost } from '@/store/slices/feedSlice';
import type { MediaFile } from '@/types/posts';

interface EditPostFormProps {
  isOpen: boolean;
  onClose: () => void;
  post: FeedPost;
  onSuccess?: () => void;
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

// Validation functions
const validateContent = (content: string): { isValid: boolean; error?: string } => {
  if (!content.trim()) {
    return { isValid: false, error: 'Post content cannot be empty' };
  }
  
  if (content.length > 5000) {
    return { isValid: false, error: 'Content exceeds maximum length of 5000 characters' };
  }
  
  return { isValid: true };
};

export const EditPostForm: React.FC<EditPostFormProps> = ({
  isOpen,
  onClose,
  post,
  onSuccess
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => ({
    loading: state.feed.loading,
    error: state.feed.error
  }));

  // Form state
  const [content, setContent] = useState(post.content?.text || '');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize form with post data
  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content?.text || '');
      
      // Load existing media files from the post
      const existingMedia: MediaFile[] = [];
      if (post.media && Array.isArray(post.media)) {
        console.log('Loading existing media:', post.media);
        post.media.forEach((mediaItem: { url: string; type: string }, index: number) => {
          if (mediaItem.url && mediaItem.type) {
            // Create a MediaFile object for existing media
            const fileName = mediaItem.url.split('/').pop() || `media_${index}`;
            const fileType = mediaItem.type === 'image' ? 'image/jpeg' : 'video/mp4';
            
            existingMedia.push({
              file: new File([], fileName, { type: fileType }),
              type: mediaItem.type as 'image' | 'video',
              url: mediaItem.url,
              name: fileName,
              size: 0 // We don't have the original size
            });
          }
        });
      }
      console.log('Existing media loaded:', existingMedia);
      setMediaFiles(existingMedia);
      
      setValidationError(null);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, post]);

  // Track changes
  useEffect(() => {
    const originalContent = post.content?.text || '';
    setHasUnsavedChanges(content !== originalContent);
  }, [content, post.content?.text]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setValidationError(null);
  }, []);

  // Handle media upload
  const handleMediaUpload = useCallback((files: MediaFile[]) => {
    setMediaFiles(files);
  }, []);

  // Handle hashtag detection
  const handleHashtagDetected = useCallback((hashtags: string[]) => {
    // Could be used for hashtag suggestions or validation
    console.log('Hashtags detected:', hashtags);
  }, []);

  // Handle mention detection
  const handleMentionDetected = useCallback((mentions: string[]) => {
    // Could be used for mention suggestions or validation
    console.log('Mentions detected:', mentions);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setValidationError('');
    
    const validation = validateContent(content);
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid content');
      return;
    }

    try {
      await dispatch(updatePost({ 
        postId: post.id, 
        content: content.trim(),
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined
      })).unwrap();
      
      // Success - close form and call onSuccess
      onSuccess?.();
      onClose();
    } catch (error) {
      // Check if it's an S3 configuration error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Update error:', errorMessage);
      
      if (errorMessage.includes('S3') || errorMessage.includes('bucket') || errorMessage.includes('AWS') || 
          errorMessage.includes('Unexpected field') || errorMessage.includes('media')) {
        // S3 configuration error - try updating without media files
        try {
          console.log('Retrying without media files due to server configuration error...');
          await dispatch(updatePost({ 
            postId: post.id, 
            content: content.trim(),
            mediaFiles: undefined
          })).unwrap();
          
          // Success without media - show warning but close form
          setValidationError('⚠️ Media upload failed due to server configuration. Text content was updated successfully.');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 3000);
          return;
        } catch (retryError) {
          // If retry also fails, show the original error
          setValidationError('Failed to update post. Please try again.');
          console.error('Failed to update post even without media:', retryError);
        }
      } else {
        // Other errors - show error and keep form open
        setValidationError(errorMessage);
        console.error('Failed to update post:', error);
      }
    }
  }, [dispatch, post.id, content, mediaFiles, onSuccess, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) return;
    }
    
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleCancel]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent 
        className="max-w-4xl h-[90vh] p-0 bg-background border-border overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 [&>button]:hidden flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          <motion.div
            key="edit-form"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Save className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Edit Post</h2>
                  <p className="text-sm text-muted-foreground">Update your post content</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Text Content */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Post Content
                  </label>
                  <div className="relative">
                    <TextArea
                      value={content}
                      onChange={handleContentChange}
                      placeholder="What's on your mind?"
                      maxLength={5000}
                      onHashtagDetected={handleHashtagDetected}
                      onMentionDetected={handleMentionDetected}
                      error={validationError || undefined}
                      showChips={true}
                      className="min-h-[120px]"
                    />
                    
                    {/* Hashtag and Mention Suggestions */}
                    <HashtagSuggestions
                      value={content}
                      onChange={handleContentChange}
                    />
                    <MentionSuggestions
                      value={content}
                      onChange={handleContentChange}
                    />
                  </div>
                </div>

                {/* Media Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Media Files
                  </label>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border border-border rounded-lg p-4 bg-muted/20"
                  >
                    <div className="space-y-4">
                      <MediaUpload
                        mediaFiles={mediaFiles}
                        onUpload={handleMediaUpload}
                        maxFiles={5}
                        disabled={loading}
                      />
                      
                      {/* Add some spacing to make scrollbar more visible */}
                      {mediaFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {mediaFiles.length} file(s) selected
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50 flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {hasUnsavedChanges && (
                  <span className="text-amber-600 font-medium">• Unsaved changes</span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={loading || !content.trim()}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
