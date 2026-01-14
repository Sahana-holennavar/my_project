'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchConversations, setActiveConversation, deleteConversationHTTP } from '@/store/slices/chatSlice';
import { socketChatService } from '@/lib/api/socket-chat';
import { motion } from 'framer-motion';
import { MessageCircle, Plus, Search, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Conversation } from '@/lib/api/socket-chat';

export default function ChatPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { conversations, isLoadingConversations, activeConversationId } = useAppSelector(
    (state) => state.chat
  );
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Initialize socket connection and fetch conversations
  useEffect(() => {
    // Only initialize if authenticated
    if (!isAuthenticated) return;

    const initializeChat = async () => {
      setIsConnecting(true);
      try {
        console.log('[ChatPage] Starting to fetch conversations...');
        
        // Fetch conversations first (this works without socket)
        const result = await dispatch(fetchConversations()).unwrap();
        console.log('[ChatPage] Fetch conversations success:', result);
        
        // Then connect socket for real-time updates
        await socketChatService.connect();
        console.log('[ChatPage] Socket connected');
      } catch (error) {
        console.error('[ChatPage] Failed to initialize chat:', error);
        toast.error('Failed to load conversations');
      } finally {
        setIsConnecting(false);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      // Don't disconnect socket as it should persist
    };
  }, [dispatch, isAuthenticated]);

  // Debug log
  useEffect(() => {
    console.log('[ChatPage] Conversations state:', conversations);
    console.log('[ChatPage] Loading state:', isLoadingConversations);
  }, [conversations, isLoadingConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    
    const otherParticipant = conv.participants?.find((p) => p.user_id !== user?.id);
    const participantName = otherParticipant
      ? `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.toLowerCase()
      : '';
    
    return participantName.includes(searchQuery.toLowerCase()) || 
           conv.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    dispatch(setActiveConversation(conversationId));
    router.push(`/chat/${conversationId}`);
  };

  // Handle delete conversation
  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;

    try {
      await dispatch(deleteConversationHTTP(conversationToDelete)).unwrap();
      toast.success('Conversation deleted successfully');
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      toast.error('Failed to delete conversation');
      console.error('Delete conversation error:', error);
    }
  };

  // Get display name for conversation
  const getConversationDisplayName = (conversation: Conversation): string => {
    if (conversation.is_group && conversation.title) {
      return conversation.title;
    }
    
    const otherParticipant = conversation.participants?.find((p) => p.user_id !== user?.id);
    if (otherParticipant) {
      return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.email;
    }
    
    return 'Unknown User';
  };

  // Get avatar for conversation
  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.is_group) return undefined;
    
    const otherParticipant = conversation.participants?.find((p) => p.user_id !== user?.id);
    return otherParticipant?.avatar || undefined;
  };

  // Get initials for conversation
  const getConversationInitials = (conversation: Conversation): string => {
    const name = getConversationDisplayName(conversation);
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format message preview
  const formatMessagePreview = (content: unknown): string => {
    if (!content) return '';
    
    if (typeof content === 'string') return content;
    
    if (typeof content === 'object' && content !== null) {
      const contentObj = content as { type?: string; text?: string };
      if (contentObj.type === 'text' && contentObj.text) {
        return contentObj.text;
      }
      if (contentObj.type === 'image') return '📷 Image';
      if (contentObj.type === 'file') return '📎 File';
    }
    
    return 'Message';
  };

  // Format timestamp
  const formatTimestamp = (date: Date | string): string => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  Messages
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <Button
              onClick={() => router.push('/chat/new')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-neutral-800"
            />
          </div>
        </motion.div>

        {/* Conversation List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg"
        >
          {isLoadingConversations || isConnecting ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageCircle className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-6">
                {searchQuery
                  ? 'Try searching for a different name'
                  : 'Start a conversation to connect with others'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => router.push('/chat/new')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start a Conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                  className="flex items-center gap-4 p-4 cursor-pointer transition-colors relative"
                >
                  <div 
                    onClick={() => handleSelectConversation(conversation.id)}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={getConversationAvatar(conversation)} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getConversationInitials(conversation)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                          {getConversationDisplayName(conversation)}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 flex-shrink-0">
                            {formatTimestamp(conversation.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          {formatMessagePreview(conversation.lastMessage.content)}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(conversation.id, e)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
