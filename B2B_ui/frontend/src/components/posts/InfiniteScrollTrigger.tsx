'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollTriggerProps {
  onIntersect: (node: HTMLElement | null) => void;
  loading?: boolean;
  hasMore?: boolean;
  error?: string | null;
}

export const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({
  onIntersect,
  loading = false,
  hasMore = true,
  error = null,
}) => {
  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-full text-neutral-400">
          <span className="text-sm">You&apos;ve reached the end of the feed</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div 
      ref={onIntersect}
      className="py-8 flex justify-center"
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 px-6 py-3 bg-neutral-800 rounded-full text-neutral-300"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading more posts...</span>
        </motion.div>
      )}
    </div>
  );
};