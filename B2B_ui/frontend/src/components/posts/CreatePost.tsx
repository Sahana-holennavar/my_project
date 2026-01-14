'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Globe, 
  Users, 
  Lock, 
  Eye, 
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Hash,
  AtSign,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TextArea } from '@/components/posts/TextArea';
import { MediaUpload } from '@/components/posts/MediaUpload';
import { PostPreview } from '@/components/posts/PostPreview';
import { createPostAsync } from '@/store/slices/createPostSlice';
import { refreshFeed } from '@/store/slices/feedSlice';
import type { RootState, AppDispatch } from '@/store';
import type { MediaFile } from '@/types/posts';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTutorialState } from '@/hooks/useTutorialState';

export const CreatePost: React.FC = () => {
  // Redux state
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.createPost);
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile, isComplete } = useSelector((state: RootState) => state.profile);
  
  // Tutorial state
  const { isTutorialInProgress } = useTutorialState();

  // Local state matching the new UI pattern
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'public' | 'private' | 'connections'>('public');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Generate user initials for avatar fallback
  const getUserInitials = () => {
    // Try to get initials from profile first
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      return `${profile.personal_information.first_name[0]}${profile.personal_information.last_name[0]}`.toUpperCase();
    }
    
    // Fallback to user name
    if (!user?.name || typeof user.name !== 'string') return "U";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  // Get display name - prefer profile name over user name
  const getDisplayName = () => {
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      return `${profile.personal_information.first_name} ${profile.personal_information.last_name}`;
    }
    return user?.name || 'User';
  };

  // User data for the component
  const userData = {
    name: getDisplayName(),
    avatar: profile?.avatar?.fileUrl || '', // Get avatar from profile
    fallback: getUserInitials()
  };

  // Extract mentions and hashtags from content
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? [...new Set(matches)] : [];
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? [...new Set(matches)] : [];
  };

  const mentions = useMemo(() => extractMentions(content), [content]);
  const hashtags = useMemo(() => extractHashtags(content), [content]);

  // Remove mention or hashtag from content
  const removeMentionOrHashtag = (item: string) => {
    const newContent = content.replace(new RegExp(`\\${item}\\b`, 'g'), '').replace(/\s+/g, ' ').trim();
    setContent(newContent);
  };

  // Media file management functions
  const handleMediaUpload = useCallback((newMediaFiles: MediaFile[]) => {
    setMediaFiles(newMediaFiles); // Use the files directly, don't merge
  }, []);

  // Effect to handle media errors and validation
  useEffect(() => {
    // Clear content-related validation errors when content changes
    if (content) {
      setValidationErrors(errors => errors.filter(err => !err.toLowerCase().includes('content')));
    }
  }, [content]);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (value) {
      setValidationErrors(errors => errors.filter(err => !err.toLowerCase().includes('content')));
    }
  };
  
  const handleAudienceChange = (newAudience: 'public' | 'private' | 'connections') => {
    setAudience(newAudience);
  };

  const validate = () => {
    const errors = [];
    if (!content.trim() && mediaFiles.length === 0) {
      errors.push("Content or media cannot be empty.");
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const resetForm = useCallback(() => {
    setContent('');
    setMediaFiles(prev => {
      // Clean up blob URLs
      prev.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
      return [];
    });
    setAudience('public');
    setValidationErrors([]);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Check if profile is complete (skip check during tutorial)
    if (!isTutorialInProgress() && (!isComplete || !profile)) {
      setShowProfileModal(true);
      return;
    }
    
    if (!validate()) return;

    try {
      const postData = {
        content,
        type: mediaFiles.length > 0 ? 'image' as const : 'text' as const,
        audience,
        media: mediaFiles.length > 0 ? mediaFiles : undefined,
      };

      const result = await dispatch(createPostAsync(postData)).unwrap();
      
      setShowSuccessMessage(true);
      resetForm();
      setShowPreview(false);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Refresh feed to show the new post
      dispatch(refreshFeed());
    } catch (error) {
      console.error('Failed to create post:', error);
      
      // Parse error message
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      // Parse and improve error messages for better UX
      let displayMessage = errorMessage;
      
      // Map common server errors to user-friendly messages
      if (errorMessage.toLowerCase().includes('validation')) {
        // Check what specific validation failed
        if (errorMessage.toLowerCase().includes('content')) {
          displayMessage = 'Please add text content to your post';
        } else if (errorMessage.toLowerCase().includes('media')) {
          displayMessage = 'Please add media files to your post';
        } else {
          displayMessage = 'Please add text content or media to create a post';
        }
      } else if (errorMessage.toLowerCase().includes('required')) {
        displayMessage = 'Please add content or media to your post';
      }
      
      // Check if it's a validation-related error
      if (displayMessage !== errorMessage || 
          errorMessage.toLowerCase().includes('validation') || 
          errorMessage.toLowerCase().includes('required') ||
          errorMessage.toLowerCase().includes('content') ||
          errorMessage.toLowerCase().includes('media')) {
        // Add to validation errors for inline display only (no toast)
        setValidationErrors([displayMessage]);
      } else {
        // For other errors, just show toast
        toast.error('Failed to create post', {
          description: displayMessage
        });
      }
    }
  };

  const handleDiscard = () => {
    resetForm();
  };

  const handlePreview = () => {
    if (validate()) {
      setShowPreview(true);
    }
  };
  
  const audienceOptions = {
    public: { icon: Globe, text: 'Public', color: 'text-green-400' },
    connections: { icon: Users, text: 'Connections', color: 'text-blue-400' },
    private: { icon: Lock, text: 'Private', color: 'text-red-400' }
  };
  const SelectedAudienceIcon = audienceOptions[audience].icon;
  const currentAudienceInfo = audienceOptions[audience];
  
  const hasContent = useMemo(() => content.trim().length > 0 || mediaFiles.length > 0, [content, mediaFiles]);
  
  const previewData = {
    content,
    media: mediaFiles,
    audience: audience,
    user: userData,
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-0">
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400">Your post has been successfully published!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="bg-card border border-border rounded-2xl p-6 mt-4"
      >
        <div className="flex items-start gap-4 mb-5">
          <Avatar className="w-12 h-12">
            <AvatarImage src={userData.avatar} alt={userData.name} />
            <AvatarFallback className="bg-purple-600 text-white font-semibold text-lg">
              {userData.fallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{userData.name}</p>
            <p className="text-sm text-muted-foreground">Share your thoughts with the world</p>
          </div>
          {hasContent && (
            <Button onClick={handlePreview} variant="outline" disabled={loading} className="flex items-center gap-2 !p-2">
              <Eye className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <TextArea
            data-tour="create-post-input"
            value={content}
            onChange={handleContentChange}
            placeholder="What's happening?"
            maxLength={5000}
            disabled={loading}
            showChips={false}
            error={validationErrors.find(err => err.toLowerCase().includes('content'))}
          />

          {/* Mentions and Hashtags Chips */}
          <AnimatePresence>
            {(mentions.length > 0 || hashtags.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {mentions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AtSign className="w-4 h-4" />
                      <span>Mentions ({mentions.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mentions.map((mention, index) => (
                        <motion.div
                          key={mention}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.05 }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 border border-blue-700/50 rounded-full text-sm text-blue-300 hover:bg-blue-900/50 transition-colors group"
                        >
                          <AtSign className="w-3 h-3" />
                          <span>{mention.slice(1)}</span>
                          <button
                            onClick={() => removeMentionOrHashtag(mention)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-800/50 rounded-full p-0.5 ml-1"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {hashtags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-4 h-4" />
                      <span>Hashtags ({hashtags.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((hashtag, index) => (
                        <motion.div
                          key={hashtag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.05 }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/30 border border-green-700/50 rounded-full text-sm text-green-300 hover:bg-green-900/50 transition-colors group"
                        >
                          <Hash className="w-3 h-3" />
                          <span>{hashtag.slice(1)}</span>
                          <button
                            onClick={() => removeMentionOrHashtag(hashtag)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-800/50 rounded-full p-0.5 ml-1"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>



          <MediaUpload mediaFiles={mediaFiles} onUpload={handleMediaUpload} maxFiles={5} disabled={loading} />

          {/* Only show bottom error if it's not a content error (content errors shown in TextArea) */}
          <AnimatePresence>
            {validationErrors.length > 0 && !validationErrors.some(err => err.toLowerCase().includes('content')) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-900/20 border border-red-800 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <ul className="list-disc list-inside text-red-400">
                    {validationErrors.map((error, index) => <li key={index}>{error}</li>)}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-5 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading} className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <SelectedAudienceIcon className={`w-4 h-4 ${currentAudienceInfo.color}`} />
                <span className="text-sm font-medium">{currentAudienceInfo.text}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(audienceOptions).map(([key, { icon: Icon, text, color }]) => (
                <DropdownMenuItem key={key} onClick={() => handleAudienceChange(key as 'public' | 'private' | 'connections')}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-foreground">{text}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            {hasContent && (
              <Button onClick={handleDiscard} variant="ghost" disabled={loading}>Discard</Button>
            )}
            <Button onClick={handleSubmit} disabled={!hasContent || validationErrors.length > 0 || loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Posting...
                </div>
              ) : 'Post'}
            </Button>
          </div>
        </div>
      </motion.div>

      <PostPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        previewData={previewData}
        onEdit={() => setShowPreview(false)}
        onPost={handleSubmit}
        isLoading={loading}
      />

      {/* Profile Completion Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground mb-4">
              Please complete your profile before creating your first post.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </Button>
              <Link href="/profile">
                <Button className="bg-purple-600 hover:bg-purple-500">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatePost;