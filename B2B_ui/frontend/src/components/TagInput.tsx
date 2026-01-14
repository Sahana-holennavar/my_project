'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  onEnter?: (tags: string[]) => void; // Optional callback when Enter is pressed, receives current tags
}

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Add tags...",
  disabled = false,
  maxTags = 10,
  onEnter,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value and exclude already selected tags
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.includes(suggestion)
  ).slice(0, 5); // Limit to 5 suggestions

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().replace(/^#/, ''); // Remove hashtag if present
    
    if (!trimmedTag) return;
    if (value.includes(trimmedTag)) return;
    if (value.length >= maxTags) return;

    onChange([...value, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
    setFocusedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      
      if (focusedSuggestionIndex >= 0 && filteredSuggestions[focusedSuggestionIndex]) {
        addTag(filteredSuggestions[focusedSuggestionIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // First, try to add a tag if there's input or focused suggestion
      let newTagAdded = false;
      let newTag = '';
      if (focusedSuggestionIndex >= 0 && filteredSuggestions[focusedSuggestionIndex]) {
        newTag = filteredSuggestions[focusedSuggestionIndex];
        addTag(newTag);
        newTagAdded = true;
      } else if (inputValue.trim()) {
        newTag = inputValue.trim().replace(/^#/, '');
        addTag(newTag);
        newTagAdded = true;
      }
      
      // If there are tags (either existing or just added) and onEnter callback is provided, call it
      // Calculate what the tags will be after adding the new tag
      const updatedTags = newTagAdded && newTag 
        ? [...value, newTag] 
        : value;
      
      if (onEnter && updatedTags.length > 0) {
        // Use a small delay to ensure state updates have propagated, but pass the computed tags
        setTimeout(() => {
          onEnter(updatedTags);
        }, 10);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions) {
        setFocusedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions) {
        setFocusedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    } else if (e.key === 'Tab' && showSuggestions) {
      e.preventDefault();
      if (focusedSuggestionIndex >= 0 && filteredSuggestions[focusedSuggestionIndex]) {
        addTag(filteredSuggestions[focusedSuggestionIndex]);
      }
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative w-full">
      <Card className="bg-card border-border rounded-lg p-2.5 sm:p-3">
        <div className="flex flex-wrap gap-2 min-h-[2.5rem] items-center">
          {/* Render existing tags */}
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-full text-sm font-medium"
            >
              <span>#{tag}</span>
              {!disabled && (
                <Button
                  onClick={() => removeTag(tag)}
                  variant="ghost"
                  size="sm"
                  className="p-0 h-4 w-4 rounded-full hover:bg-purple-500/30 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Input field */}
          {value.length < maxTags && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm px-1 py-1"
            />
          )}
        </div>

        {/* Max tags indicator */}
        {value.length >= maxTags && (
          <div className="mt-2 text-xs text-muted-foreground">
            Maximum {maxTags} tags reached
          </div>
        )}
      </Card>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">
              Suggested tags
            </div>
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  index === focusedSuggestionIndex
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-muted-foreground">#</span>
                <span className="font-medium">{suggestion}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
};

export default TagInput;