'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SearchBarProps {
  onSearch: (tags: string[]) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  placeholder = "Search posts by tags (e.g., technology, business, innovation)",
  disabled = false,
  initialValue = "",
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  // Parse comma-separated tags
  const parseTags = useCallback((input: string): string[] => {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.replace(/^#/, '')); // Remove hashtag symbol if present
  }, []);

  // Validate tags
  const validateTags = useCallback((tags: string[]): boolean => {
    if (tags.length === 0) {
      setValidationMessage('Please enter at least one tag');
      setIsValid(false);
      return false;
    }

    // Check for invalid characters
    const invalidTag = tags.find(tag => 
      /[<>\"'&]/.test(tag) || tag.includes('script')
    );

    if (invalidTag) {
      setValidationMessage('Tags contain invalid characters');
      setIsValid(false);
      return false;
    }

    // Check tag length
    const longTag = tags.find(tag => tag.length > 50);
    if (longTag) {
      setValidationMessage('Tags must be less than 50 characters');
      setIsValid(false);
      return false;
    }

    setValidationMessage('');
    setIsValid(true);
    return true;
  }, []);

  // Debounce search input
  useEffect(() => {
    if (!inputValue.trim()) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      const tags = parseTags(inputValue);
      if (validateTags(tags)) {
        onSearch(tags);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [inputValue, onSearch, parseTags, validateTags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Reset validation when user starts typing
    if (!isValid) {
      setIsValid(true);
      setValidationMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSearch = () => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) {
      setValidationMessage('Please enter at least one tag');
      setIsValid(false);
      return;
    }

    // Check for only spaces
    if (trimmedValue.replace(/\s+/g, '') === '') {
      setInputValue('');
      setValidationMessage('Please enter at least one tag');
      setIsValid(false);
      return;
    }

    const tags = parseTags(trimmedValue);
    if (validateTags(tags)) {
      onSearch(tags);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setIsValid(true);
    setValidationMessage('');
    onClear();
  };

  const showClearButton = inputValue.length > 0;

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8">
      <Card className="bg-card border-border rounded-xl p-4 w-full max-w-2xl">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className={`pl-10 pr-12 py-3 text-base rounded-lg border-2 transition-colors w-full ${
                !isValid 
                  ? 'border-red-500 focus-visible:ring-red-500' 
                  : 'border-border focus-visible:ring-purple-500'
              }`}
            />
          {showClearButton && (
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Validation Message */}
        {!isValid && validationMessage && (
          <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <span>⚠️</span>
            <span>{validationMessage}</span>
          </div>
        )}

        {/* Search Help Text */}
        {inputValue.length === 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
              Use commas to separate multiple tags (e.g., &quot;technology, business, startup&quot;)
            </div>
        )}

        {/* Tag Preview */}
        {inputValue.length > 0 && isValid && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">Searching for:</div>
            <div className="flex flex-wrap gap-1">
              {parseTags(inputValue).slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30"
                >
                  #{tag}
                </span>
              ))}
              {parseTags(inputValue).length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{parseTags(inputValue).length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      </Card>
    </div>
  );
};

export default SearchBar;