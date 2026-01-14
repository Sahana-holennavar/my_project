'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  fetchConversations,
  fetchMessages,
  setActiveConversation,
  addMessage,
  clearUnreadCount,
  updateMessage,
  deleteMessage,
} from '@/store/slices/chatSlice';
import { socketChatService } from '@/lib/api/socket-chat';
import { chatApi } from '@/lib/api';
import { MessageItem } from '@/components/chat/MessageItem';
import {
  ArrowLeft,
  Send,
  Loader2,
  MoreVertical,
  Paperclip,
  Smile,
  Image as ImageIcon,
  File as FileIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/api/socket-chat';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const conversationId = params.conversationId as string;

  const { conversations, messages, isLoadingMessages, typingUsers } = useAppSelector(
    (state) => state.chat
  );
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current conversation
  const conversation = conversations.find((c) => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];
  const currentTypingUsers = typingUsers[conversationId] || [];

  // Get other participant info
  const otherParticipant = conversation?.participants?.find((p) => p.user_id !== user?.id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch conversations if not loaded (needed for page refresh)
  useEffect(() => {
    if (isAuthenticated && conversations.length === 0) {
      dispatch(fetchConversations());
    }
  }, [isAuthenticated, conversations.length, dispatch]);

  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;

    // Set active conversation
    dispatch(setActiveConversation(conversationId));

    // Fetch messages only once per conversation (prevents strict mode duplicates)
    if (!conversationMessages.length && !hasFetchedRef.current[conversationId]) {
      hasFetchedRef.current[conversationId] = true;
      dispatch(fetchMessages({ conversationId }));
    }

    // Clear unread count
    dispatch(clearUnreadCount(conversationId));

    // Join conversation room via socket
    const joinRoom = async () => {
      try {
        if (!socketChatService.isConnected()) {
          await socketChatService.connect();
        }
        await socketChatService.joinConversation({ conversationId });
      } catch (error) {
        console.error('Failed to join conversation:', error);
      }
    };

    joinRoom();

    // Cleanup
    return () => {
      // Only leave conversation if socket is connected
      if (socketChatService.isConnected()) {
        socketChatService.leaveConversation(conversationId);
      }
      dispatch(setActiveConversation(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isAuthenticated]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Handle typing indicator
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketChatService.sendTyping({ conversationId, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketChatService.sendTyping({ conversationId, isTyping: false });
    }, 2000);
  };

  // Handle edit message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await chatApi.updateMessage(messageId, {
        type: 'text',
        text: newContent,
      });

      if (response.success && response.data?.message) {
        // Update message in Redux store
        dispatch(
          updateMessage({
            conversationId,
            messageId,
            updates: {
              content: response.data.message.content,
              edited_at: response.data.message.edited_at,
            },
          })
        );
        toast.success('Message updated');
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to update message');
      throw error;
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('[ConversationPage] Deleting message:', messageId);
      const response = await chatApi.deleteMessage(messageId);
      console.log('[ConversationPage] Delete response:', response);

      if (response.success) {
        // Remove message from Redux store
        dispatch(
          deleteMessage({
            conversationId,
            messageId,
          })
        );
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const textContent = messageInput.trim();
    if (!textContent && !selectedFile) return;
    if (isSending) return;

    setIsSending(true);
    const tempTextContent = textContent;
    const tempFile = selectedFile;
    setMessageInput('');
    setSelectedFile(null);
    setFilePreview(null);

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socketChatService.sendTyping({ conversationId, isTyping: false });
    }

    try {
      let messageContent: unknown;

      // If there's a file, upload it first
      if (tempFile) {
        setIsUploadingFile(true);
        try {
          const uploadResponse = await chatApi.uploadChatFile(tempFile, conversationId);
          
          if (!uploadResponse.success || !uploadResponse.data) {
            throw new Error(uploadResponse.message || 'Failed to upload file');
          }

          // Create file content based on file type
          const fileType = tempFile.type;
          let contentType: 'image' | 'video' | 'file' = 'file';
          
          if (fileType.startsWith('image/')) {
            contentType = 'image';
          } else if (fileType.startsWith('video/')) {
            contentType = 'video';
          }

          messageContent = {
            type: contentType,
            fileUrl: uploadResponse.data.fileUrl,
            fileName: uploadResponse.data.fileName,
            fileType: uploadResponse.data.fileType,
            text: textContent || undefined, // Optional caption
          };
        } catch (uploadError) {
          setIsUploadingFile(false);
          throw uploadError; // Re-throw to be caught by outer catch
        }
        setIsUploadingFile(false);
      } else {
        // Text-only message
        messageContent = { type: 'text', text: textContent };
      }

      // Send via socket for real-time delivery
      const response = await socketChatService.sendMessage({
        conversationId,
        content: messageContent,
      });

      // Add message to Redux immediately (optimistic update)
      if (response.success && response.message) {
        dispatch(addMessage({
          conversationId,
          message: response.message,
        }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      setMessageInput(tempTextContent); // Restore message
      setSelectedFile(tempFile); // Restore file
      if (tempFile && tempFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(tempFile);
      }
    } finally {
      setIsSending(false);
      setIsUploadingFile(false);
    }
  };

  // Format message time
  const formatMessageTime = (date: Date | string): string => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if message is from current user
  const isOwnMessage = (message: ChatMessage): boolean => {
    return message.sender_id === user?.id;
  };

  // Render message content
  const renderMessageContent = (content: unknown): string => {
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content !== null) {
      const contentObj = content as { type?: string; text?: string };
      if (contentObj.type === 'text' && contentObj.text) return contentObj.text;
      if (contentObj.type === 'image') return '📷 Image';
      if (contentObj.type === 'file') return '📎 File';
    }
    return 'Message';
  };

  // Get display name
  const getDisplayName = (): string => {
    if (conversation?.is_group && conversation.title) {
      return conversation.title;
    }
    if (otherParticipant) {
      return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.email;
    }
    return 'Unknown User';
  };

  // Get initials
  const getInitials = (): string => {
    const name = getDisplayName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Show loading while checking authentication or loading conversations
  if (!isAuthenticated || (!conversation && conversations.length === 0)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // If conversations loaded but conversation not found, redirect to chat
  if (!conversation && conversations.length > 0) {
    router.push('/chat');
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/chat')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3 flex-1 justify-center">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipant?.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  {getDisplayName()}
                </h2>
                {currentTypingUsers.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">typing...</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isLoadingMessages && conversationMessages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : conversationMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Start the conversation
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                Send your first message to {getDisplayName()}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversationMessages.map((message, index) => {
                const isOwn = isOwnMessage(message);
                const showAvatar =
                  index === conversationMessages.length - 1 ||
                  conversationMessages[index + 1]?.sender_id !== message.sender_id;

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    avatarSrc={otherParticipant?.avatar || undefined}
                    avatarFallback={getInitials()}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    formatTime={formatMessageTime}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 sticky bottom-0 pb-20 sm:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
              <div className="flex items-center gap-3">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                ) : (
                  <div className="h-16 w-16 bg-neutral-200 dark:bg-neutral-600 rounded flex items-center justify-center">
                    {getFileIcon(selectedFile.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 hidden sm:flex"
              disabled={isUploadingFile}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTypingStart();
                }}
                placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                disabled={isSending}
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hidden sm:flex"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </div>

            <Button
              type="submit"
              disabled={(!messageInput.trim() && !selectedFile) || isSending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
