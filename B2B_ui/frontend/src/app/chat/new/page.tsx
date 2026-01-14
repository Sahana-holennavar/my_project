'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { startConversationHTTP, addConversation, setActiveConversation, fetchConversations } from '@/store/slices/chatSlice';
import { socketChatService } from '@/lib/api/socket-chat';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Loader2, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { businessProfileApi } from '@/lib/api';

interface SearchResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  headline?: string;
  avatar_url?: string | null;
}

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  // Auto-start conversation if userId is provided in query params
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      handleStartConversation(userId);
    }
  }, [searchParams]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (query.length < 2) return;

    setIsSearching(true);
    try {
      const response = await businessProfileApi.searchProfiles(query);
      if (response.success && response.data) {
        setSearchResults(response.data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle start conversation
  const handleStartConversation = async (recipientId: string) => {
    setIsStarting(recipientId);
    
    try {
      // Try socket first for real-time experience
      let conversationId: string;
      
      if (socketChatService.isConnected()) {
        console.log('[NewChat] Using socket to start conversation');
        const socketResult = await socketChatService.startConversation({ recipientId });
        conversationId = socketResult.conversation.id;
        
        // Add to Redux store
        dispatch(addConversation(socketResult.conversation));
        dispatch(setActiveConversation(conversationId));
      } else {
        // Fallback to HTTP
        console.log('[NewChat] Socket not connected, using HTTP fallback');
        const result = await dispatch(
          startConversationHTTP({ recipientId })
        ).unwrap();
        conversationId = result.conversation.id;
      }

      // Fetch full conversation details to get participant names and avatars
      console.log('[NewChat] Fetching full conversation details');
      await dispatch(fetchConversations()).unwrap();

      toast.success('Conversation started');
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      toast.error(errorMessage);
    } finally {
      setIsStarting(null);
    }
  };

  // Get user initials
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/chat')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                New Message
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Search for someone to start a conversation
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-neutral-800"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>
        </motion.div>

        {/* Search Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg"
        >
          {!searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Search for people
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                Start typing to find someone to message
              </p>
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                Try searching with a different name or email
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {searchResults.map((user) => (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                        {user.first_name} {user.last_name}
                      </h3>
                      {user.headline && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          {user.headline}
                        </p>
                      )}
                      {user.email && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartConversation(user.user_id)}
                    disabled={isStarting === user.user_id}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-shrink-0"
                  >
                    {isStarting === user.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    Message
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions from Connections */}
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              onClick={() => router.push('/connections')}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              View My Connections
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
