'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Mock user data for mentions
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    username: 'johndoe',
    avatar: 'https://placehold.co/32x32/8b5cf6/ffffff?text=JD&font=raleway',
    fallback: 'JD',
    title: 'Frontend Developer',
  },
  {
    id: '2',
    name: 'Jane Smith',
    username: 'janesmith',
    avatar: 'https://placehold.co/32x32/ec4899/ffffff?text=JS&font=raleway',
    fallback: 'JS',
    title: 'Product Manager',
  },
  {
    id: '3',
    name: 'Alex Johnson',
    username: 'alexj',
    avatar: 'https://placehold.co/32x32/06b6d4/ffffff?text=AJ&font=raleway',
    fallback: 'AJ',
    title: 'UX Designer',
  },
  {
    id: '4',
    name: 'Mike Chen',
    username: 'mikechen',
    avatar: 'https://placehold.co/32x32/84cc16/ffffff?text=MC&font=raleway',
    fallback: 'MC',
    title: 'Backend Engineer',
  },
  {
    id: '5',
    name: 'Sarah Wilson',
    username: 'sarahw',
    avatar: 'https://placehold.co/32x32/f59e0b/ffffff?text=SW&font=raleway',
    fallback: 'SW',
    title: 'Data Scientist',
  },
];

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState<typeof mockUsers>([]);

  useEffect(() => {
    // Find if cursor is in a mention
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const mention = mentionMatch[1];
      
      // Filter users based on current input
      const filtered = mockUsers.filter(user => 
        user.name.toLowerCase().includes(mention.toLowerCase()) ||
        user.username.toLowerCase().includes(mention.toLowerCase())
      ).slice(0, 5);
      
      setFilteredUsers(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition]);

  const handleMentionSelect = (selectedUser: typeof mockUsers[0]) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Replace the current mention with the selected username
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const startIndex = mentionMatch.index!;
      const newText = 
        value.substring(0, startIndex) + 
        `@${selectedUser.username} ` + 
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
            className="absolute bottom-full left-0 mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 min-w-64 z-50"
          >
            <div className="text-xs text-neutral-600 font-medium mb-2 px-2">
              Mention someone
            </div>
            
            <div className="space-y-1">
              {filteredUsers.map((user, index) => (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => handleMentionSelect(user)}
                  className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-neutral-100 rounded-md transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                      {user.fallback}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      @{user.username} • {user.title}
                    </p>
                  </div>
                  
                  <AtSign className="w-3 h-3 text-purple-500 flex-shrink-0" />
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