'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash } from 'lucide-react';

interface HashtagSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Mock trending hashtags
const trendingHashtags = [
  'react',
  'typescript',
  'webdev',
  'javascript',
  'programming',
  'tech',
  'ai',
  'machinelearning',
  'startup',
  'business',
];

export const HashtagSuggestions: React.FC<HashtagSuggestionsProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition] = useState(0);
  const [filteredHashtags, setFilteredHashtags] = useState<string[]>([]);

  useEffect(() => {
    // Find if cursor is in a hashtag
    const textBeforeCursor = value.substring(0, cursorPosition);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const hashtag = hashtagMatch[1];
      
      // Filter trending hashtags based on current input
      const filtered = trendingHashtags.filter(tag => 
        tag.toLowerCase().includes(hashtag.toLowerCase())
      ).slice(0, 5);
      
      setFilteredHashtags(filtered);
      setShowSuggestions(filtered.length > 0 && hashtag !== '');
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition]);

  const handleHashtagSelect = (selectedHashtag: string) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Replace the current hashtag with the selected one
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    if (hashtagMatch) {
      const startIndex = hashtagMatch.index!;
      const newText = 
        value.substring(0, startIndex) + 
        `#${selectedHashtag} ` + 
        textAfterCursor;
      
      onChange(newText);
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 min-w-48 z-50"
          >
            <div className="text-xs text-neutral-600 font-medium mb-2 px-2">
              Trending hashtags
            </div>
            
            <div className="space-y-1">
              {filteredHashtags.map((hashtag, index) => (
                <motion.button
                  key={hashtag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => handleHashtagSelect(hashtag)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-neutral-100 rounded-md transition-colors"
                >
                  <Hash className="w-3 h-3 text-blue-500" />
                  <span className="text-sm font-medium text-neutral-800">
                    {hashtag}
                  </span>
                </motion.button>
              ))}
            </div>
            
            <div className="text-xs text-neutral-500 mt-2 px-2">
              Press space to complete
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};