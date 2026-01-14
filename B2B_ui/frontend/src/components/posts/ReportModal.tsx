'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Flag, 
  AlertTriangle, 
  Shield, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  closeReportModal, 
  reportPost,
  selectReportModalOpen,
  selectCurrentPostId
} from '@/store/slices/interactionSlice';
import { toast } from 'sonner';

interface ReportModalProps {
  postId?: string;
}

const reportReasons = [
  {
    id: 'spam',
    label: 'Spam',
    description: 'Repetitive, unwanted, or promotional content',
    icon: AlertTriangle,
    color: 'text-red-500'
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Offensive, harmful, or disturbing content',
    icon: AlertCircle,
    color: 'text-orange-500'
  },
  {
    id: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Targeted harassment or bullying behavior',
    icon: Shield,
    color: 'text-purple-500'
  },
  {
    id: 'violence',
    label: 'Violence or Threats',
    description: 'Content promoting violence or making threats',
    icon: Flag,
    color: 'text-red-600'
  },
  {
    id: 'hate_speech',
    label: 'Hate Speech',
    description: 'Content that attacks or discriminates against groups',
    icon: AlertCircle,
    color: 'text-red-700'
  },
  {
    id: 'misinformation',
    label: 'Misinformation',
    description: 'False or misleading information',
    icon: AlertTriangle,
    color: 'text-yellow-500'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else that violates our guidelines',
    icon: Flag,
    color: 'text-gray-500'
  }
];

export const ReportModal: React.FC<ReportModalProps> = ({ postId }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectReportModalOpen);
  const currentPostId = useAppSelector(selectCurrentPostId);
  
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const targetPostId = postId || currentPostId;

  const handleClose = () => {
    dispatch(closeReportModal());
    setSelectedReason('');
    setIsSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedReason || !targetPostId) return;

    setIsSubmitting(true);
    
    try {
      await dispatch(reportPost({ 
        postId: targetPostId, 
        reason: selectedReason 
      })).unwrap();
      
      setIsSubmitted(true);
      toast.success('Post reported successfully. We&apos;ll review it soon.');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      toast.error(error as string || 'Failed to report post');
    } finally {
      setIsSubmitting(false);
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
          className="bg-background border border-border rounded-lg shadow-lg w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-foreground">Report Post</h2>
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
          <div className="p-4">
            {isSubmitted ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Report Submitted
                </h3>
                <p className="text-muted-foreground">
                  Thank you for helping us maintain a safe community. 
                  We&apos;ll review this post and take appropriate action.
                </p>
              </motion.div>
            ) : (
              // Report Form
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Help us understand what&apos;s wrong with this post. 
                    Your report will be reviewed by our moderation team.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Why are you reporting this post?
                  </label>
                  <div className="space-y-2">
                    {reportReasons.map((reason) => {
                      const Icon = reason.icon;
                      return (
                        <button
                          key={reason.id}
                          onClick={() => setSelectedReason(reason.id)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            selectedReason === reason.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 mt-0.5 ${reason.color} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground">
                                {reason.label}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {reason.description}
                              </div>
                            </div>
                            {selectedReason === reason.id && (
                              <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">What happens next?</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Your report will be reviewed by our moderation team</li>
                        <li>• We may take action on the reported content</li>
                        <li>• You won&apos;t be notified of the outcome to protect privacy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isSubmitted && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!selectedReason || isSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Flag className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'Reporting...' : 'Report Post'}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
