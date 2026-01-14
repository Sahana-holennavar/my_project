'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacterCount, isCharacterLimitExceeded } from '@/lib/validations/posts';
import { extractHashtags, extractMentions } from '@/lib/utils/mediaHelpers';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
  onHashtagDetected?: (hashtags: string[]) => void;
  onMentionDetected?: (mentions: string[]) => void;
  error?: string;
  showChips?: boolean; // Add prop to control chip display
  'data-tour'?: string; // Add data-tour prop
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  maxLength = 5000,
  className = '',
  disabled = false,
  onHashtagDetected,
  onMentionDetected,
  error,
  showChips = false, // Default to false
  'data-tour': dataTour,
}) => {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const characterCount = getCharacterCount(value);
  const isOverLimit = isCharacterLimitExceeded(value, maxLength);
  const isNearLimit = characterCount > maxLength * 0.8; // 80% of limit

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Handle input change with hashtag and mention detection
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Extract hashtags and mentions
    const hashtags = extractHashtags(newValue);
    const mentions = extractMentions(newValue);

    // Notify parent components
    if (onHashtagDetected && hashtags.length > 0) {
      onHashtagDetected(hashtags);
    }
    
    if (onMentionDetected && mentions.length > 0) {
      onMentionDetected(mentions);
    }
  }, [onChange, onHashtagDetected, onMentionDetected]);

  // Handle focus and blur
  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  // Character counter color based on usage
  const getCounterColor = () => {
    if (isOverLimit) return 'text-red-500';
    if (isNearLimit) return 'text-yellow-500';
    return 'text-neutral-400';
  };

  // Border color based on state
  const getBorderColor = () => {
    if (error || isOverLimit) return 'border-red-500';
    if (focused) return 'border-purple-500';
    return 'border-border';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Textarea */}
      <motion.div
        initial={false}
        animate={{
          borderColor: focused ? '#8b5cf6' : (error || isOverLimit) ? '#ef4444' : 'hsl(var(--border))',
        }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-xl border-2 bg-background transition-all duration-200 ${getBorderColor()}`}
        data-tour={dataTour}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full bg-transparent text-foreground placeholder:text-muted-foreground 
            px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg focus:outline-none resize-none min-h-[100px] sm:min-h-[120px] max-h-[250px] sm:max-h-[300px]
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
          style={{ overflow: 'hidden' }}
        />
      </motion.div>

      {/* Character Counter and Error */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-xs sm:text-sm text-red-500 flex items-center gap-1 flex-1"
            >
              <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
              <span className="truncate">{error}</span>
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          initial={false}
          animate={{
            scale: focused ? 1.05 : 1,
            color: isOverLimit ? '#ef4444' : isNearLimit ? '#eab308' : '#737373',
          }}
          transition={{ duration: 0.2 }}
          className={`text-xs sm:text-sm font-medium ${getCounterColor()} flex-shrink-0`}
        >
          {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
        </motion.div>
      </div>

      {/* Hashtag and Mention Indicators */}
      <AnimatePresence>
        {(showChips && focused && value) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex flex-wrap gap-2"
          >
            {/* Hashtag indicators */}
            {extractHashtags(value).map((hashtag, index) => (
              <motion.span
                key={`hashtag-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
              >
                #{hashtag}
              </motion.span>
            ))}

            {/* Mention indicators */}
            {extractMentions(value).map((mention, index) => (
              <motion.span
                key={`mention-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full"
              >
                @{mention}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};