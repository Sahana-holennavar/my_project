'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  closeShareModal, 
  sharePost,
  selectShareModalOpen,
  selectCurrentPostId,
  selectInteractionLoading
} from '@/store/slices/interactionSlice';
import { toast } from 'sonner';

interface ShareModalProps {
  postId?: string;
  postUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ postId, postUrl }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectShareModalOpen);
  const currentPostId = useAppSelector(selectCurrentPostId);
  const loading = useAppSelector(selectInteractionLoading);
  
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const targetPostId = postId || currentPostId;

  // Generate share URL
  useEffect(() => {
    if (postUrl) {
      setShareUrl(postUrl);
    } else if (targetPostId) {
      // Generate post URL based on current domain
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(`${baseUrl}/posts/${targetPostId}`);
    }
  }, [postUrl, targetPostId]);

  const handleClose = () => {
    dispatch(closeShareModal());
    setCopied(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async (platform: string) => {
    if (!targetPostId) return;

    try {
      await dispatch(sharePost({ postId: targetPostId })).unwrap();
      
      let shareUrl = '';
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent('Check out this post!');

      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
          break;
        case 'mail':
          shareUrl = `mailto:?subject=Check out this post&body=${encodedText}%0A%0A${shareUrl}`;
          break;
        default:
          return;
      }

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        toast.success(`Shared on ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`);
      }
    } catch {
      toast.error(`Failed to share on ${platform}`);
    }
  };

  const shareOptions = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: copied ? Check : Copy,
      action: handleCopyLink,
      className: 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      action: () => handleShare('twitter'),
      className: 'text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      action: () => handleShare('facebook'),
      className: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: Linkedin,
      action: () => handleShare('linkedin'),
      className: 'text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950'
    },
    {
      id: 'mail',
      label: 'Email',
      icon: Mail,
      action: () => handleShare('mail'),
      className: 'text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950'
    }
  ];

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
          className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-foreground">Share Post</h2>
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

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Post Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Share to</label>
              <div className="grid grid-cols-2 gap-2">
                {shareOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.id}
                      variant="ghost"
                      onClick={option.action}
                      disabled={loading.share}
                      className={`justify-start h-auto p-3 ${option.className}`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      <span className="text-sm">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span>This will share the post and increase its visibility</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button 
              onClick={() => window.open(shareUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Post
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};