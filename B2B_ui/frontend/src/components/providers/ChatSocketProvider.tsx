'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addConversation,
  addMessage,
  updateConversation,
  addTypingUser,
  removeTypingUser,
  incrementUnreadCount,
  fetchConversations,
  updateMessage,
  deleteMessage,
} from '@/store/slices/chatSlice';
import { socketChatService } from '@/lib/api/socket-chat';
import type { ChatMessage, Conversation } from '@/lib/api/socket-chat';

/**
 * ChatSocketProvider - Manages real-time chat socket events globally
 * Should be placed high in the component tree (e.g., in layout)
 */
export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const activeConversationIdRef = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // Update ref when active conversation changes
  const { activeConversationId } = useAppSelector((state) => state.chat);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isAuthenticated || isInitialized.current) return;

    // Initialize socket connection
    const initializeSocket = async () => {
      try {
        await socketChatService.connect();
        console.log('[ChatSocketProvider] Socket connected');
        isInitialized.current = true;
      } catch (error) {
        console.error('[ChatSocketProvider] Failed to connect socket:', error);
      }
    };

    initializeSocket();

    // Setup event listeners
    const unsubscribeNewConversation = socketChatService.onNewConversation(async (data) => {
      console.log('[ChatSocketProvider] New conversation received:', data);
      
      // Fetch full conversations to get complete participant details
      await dispatch(fetchConversations());
      
      if (data.message) {
        dispatch(
          addMessage({
            conversationId: data.conversation.id,
            message: data.message,
          })
        );
      }
    });

    const unsubscribeNewMessage = socketChatService.onNewMessage((data) => {
      console.log('[ChatSocketProvider] New message received:', data);
      
      dispatch(
        addMessage({
          conversationId: data.conversationId,
          message: data.message,
        })
      );

      // Update conversation with last message
      dispatch(
        updateConversation({
          id: data.conversationId,
          lastMessage: data.message,
        })
      );

      // Increment unread count if not in active conversation
      if (activeConversationIdRef.current !== data.conversationId) {
        dispatch(incrementUnreadCount(data.conversationId));
      }
    });

    const unsubscribeUserTyping = socketChatService.onUserTyping((data) => {
      console.log('[ChatSocketProvider] User typing:', data);
      
      if (data.isTyping) {
        dispatch(
          addTypingUser({
            conversationId: data.conversationId,
            userId: data.userId,
          })
        );
      } else {
        dispatch(
          removeTypingUser({
            conversationId: data.conversationId,
            userId: data.userId,
          })
        );
      }
    });

    const unsubscribeMessageUpdated = socketChatService.onMessageUpdated((data) => {
      console.log('[ChatSocketProvider] Message updated:', data);
      
      dispatch(
        updateMessage({
          conversationId: data.conversationId,
          messageId: data.message.id,
          updates: {
            content: data.message.content,
            edited_at: data.message.edited_at,
          },
        })
      );
    });

    const unsubscribeMessageDeleted = socketChatService.onMessageDeleted((data) => {
      console.log('[ChatSocketProvider] Message deleted:', data);
      
      dispatch(
        deleteMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        })
      );
    });

    // Cleanup
    return () => {
      unsubscribeNewConversation();
      unsubscribeNewMessage();
      unsubscribeUserTyping();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      // Don't disconnect socket here as it should persist
    };
  }, [isAuthenticated, dispatch]);

  return <>{children}</>;
}
