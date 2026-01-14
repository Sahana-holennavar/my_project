import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatApi } from '@/lib/api';
import type { Conversation, ChatMessage } from '@/lib/api/socket-chat';

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>; // conversationId -> messages
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>; // conversationId -> userIds[]
  unreadCounts: Record<string, number>; // conversationId -> count
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,
  typingUsers: {},
  unreadCounts: {},
};

// ============ Async Thunks ============

/**
 * Fetch all conversations
 */
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[chatSlice] Fetching conversations...');
      const response = await chatApi.getConversations();
      console.log('[chatSlice] Raw API response:', response);
      if (response.success) {
        console.log('[chatSlice] Conversations:', response.data?.conversations);
        console.log('[chatSlice] Conversations count:', response.data?.conversations?.length);
        return response.data?.conversations;
      }
      throw new Error('Failed to fetch conversations');
    } catch (error) {
      console.error('[chatSlice] Fetch conversations error:', error);
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch conversations'
      );
    }
  }
);

/**
 * Fetch messages for a conversation
 */
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (
    { conversationId, limit, offset }: { conversationId: string; limit?: number; offset?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await chatApi.getMessages(conversationId, limit, offset);
      if (response.success && response.data) {
        return {
          conversationId,
          messages: response.data.messages,
          pagination: response.data.pagination,
        };
      }
      throw new Error(response.message || 'Failed to fetch messages');
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch messages'
      );
    }
  }
);

/**
 * Send a message (HTTP fallback)
 */
export const sendMessageHTTP = createAsyncThunk(
  'chat/sendMessage',
  async (
    { conversationId, content, isForwarded }: { conversationId: string; content: unknown; isForwarded?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await chatApi.sendMessage(conversationId, content, isForwarded);
      if (response.success && response.data) {
        return {
          conversationId,
          message: response.data.message,
        };
      }
      throw new Error(response.message || 'Failed to send message');
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to send message'
      );
    }
  }
);

/**
 * Start a new conversation (HTTP fallback)
 */
export const startConversationHTTP = createAsyncThunk(
  'chat/startConversation',
  async (
    { recipientId, initialMessage }: { recipientId: string; initialMessage?: unknown },
    { rejectWithValue }
  ) => {
    try {
      const response = await chatApi.startConversation(recipientId, initialMessage);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to start conversation');
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to start conversation'
      );
    }
  }
);

/**
 * Delete a conversation
 */
export const deleteConversationHTTP = createAsyncThunk(
  'chat/deleteConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await chatApi.deleteConversation(conversationId);
      if (response.success) {
        return conversationId;
      }
      throw new Error(response.message || 'Failed to delete conversation');
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete conversation'
      );
    }
  }
);

// ============ Slice ============

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * Set active conversation
     */
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },

    /**
     * Add a new conversation (real-time)
     */
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    /**
     * Update conversation (e.g., last message)
     */
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { id: string }>) => {
      const index = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...action.payload,
        };
        // Move to top
        const [conversation] = state.conversations.splice(index, 1);
        state.conversations.unshift(conversation);
      }
    },

    /**
     * Add a message to a conversation (real-time)
     */
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: ChatMessage }>) => {
      const { conversationId, message } = action.payload;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      // Check if message already exists
      const exists = state.messages[conversationId].find((m) => m.id === message.id);
      if (!exists) {
        state.messages[conversationId].push(message);
      }

      // Update conversation's last message
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        // Move conversation to top
        const index = state.conversations.findIndex((c) => c.id === conversationId);
        if (index > 0) {
          const [conv] = state.conversations.splice(index, 1);
          state.conversations.unshift(conv);
        }
      }
    },

    /**
     * Update a message (e.g., after edit)
     */
    updateMessage: (
      state,
      action: PayloadAction<{ conversationId: string; messageId: string; updates: Partial<ChatMessage> }>
    ) => {
      const { conversationId, messageId, updates } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], ...updates };
        }
      }
    },

    /**
     * Delete a message
     */
    deleteMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const { conversationId, messageId } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        state.messages[conversationId] = messages.filter((m) => m.id !== messageId);
      }
    },

    /**
     * Set typing users for a conversation
     */
    setTypingUsers: (state, action: PayloadAction<{ conversationId: string; userIds: string[] }>) => {
      const { conversationId, userIds } = action.payload;
      state.typingUsers[conversationId] = userIds;
    },

    /**
     * Add typing user
     */
    addTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },

    /**
     * Remove typing user
     */
    removeTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (id) => id !== userId
        );
      }
    },

    /**
     * Set unread count for a conversation
     */
    setUnreadCount: (state, action: PayloadAction<{ conversationId: string; count: number }>) => {
      const { conversationId, count } = action.payload;
      state.unreadCounts[conversationId] = count;
    },

    /**
     * Increment unread count
     */
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      if (!state.unreadCounts[conversationId]) {
        state.unreadCounts[conversationId] = 0;
      }
      state.unreadCounts[conversationId]++;
    },

    /**
     * Clear unread count
     */
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      state.unreadCounts[conversationId] = 0;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Reset chat state
     */
    resetChatState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        console.log('[chatSlice/reducer] fetchConversations.pending');
        state.isLoadingConversations = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        console.log('[chatSlice/reducer] fetchConversations.fulfilled, payload:', action.payload);
        state.isLoadingConversations = false;
        state.conversations = action.payload || [];
        console.log('[chatSlice/reducer] State conversations updated:', state.conversations.length);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        console.log('[chatSlice/reducer] fetchConversations.rejected, error:', action.payload);
        state.isLoadingConversations = false;
        state.error = action.payload as string;
      });

    // Fetch messages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        const { conversationId, messages } = action.payload;
        
        // Prepend old messages (for pagination)
        if (state.messages[conversationId]) {
          state.messages[conversationId] = [...messages, ...state.messages[conversationId]];
        } else {
          state.messages[conversationId] = messages;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.payload as string;
      });

    // Send message (HTTP fallback)
    builder
      .addCase(sendMessageHTTP.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessageHTTP.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        const { conversationId, message } = action.payload;
        
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        state.messages[conversationId].push(message);

        // Update conversation's last message
        const conversation = state.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.lastMessage = message;
        }
      })
      .addCase(sendMessageHTTP.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload as string;
      });

    // Start conversation (HTTP fallback)
    builder
      .addCase(startConversationHTTP.pending, (state) => {
        state.isLoadingConversations = true;
        state.error = null;
      })
      .addCase(startConversationHTTP.fulfilled, (state, action) => {
        state.isLoadingConversations = false;
        const { conversation, message, isNew } = action.payload;
        
        if (isNew) {
          state.conversations.unshift(conversation);
        }
        
        if (message) {
          state.messages[conversation.id] = [message];
        }
        
        state.activeConversationId = conversation.id;
      })
      .addCase(startConversationHTTP.rejected, (state, action) => {
        state.isLoadingConversations = false;
        state.error = action.payload as string;
      });

    // Delete conversation
    builder
      .addCase(deleteConversationHTTP.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteConversationHTTP.fulfilled, (state, action) => {
        const conversationId = action.payload;
        // Remove conversation from list
        state.conversations = state.conversations.filter((c) => c.id !== conversationId);
        // Remove messages
        delete state.messages[conversationId];
        // Clear active conversation if it was the deleted one
        if (state.activeConversationId === conversationId) {
          state.activeConversationId = null;
        }
      })
      .addCase(deleteConversationHTTP.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setActiveConversation,
  addConversation,
  updateConversation,
  addMessage,
  updateMessage,
  deleteMessage,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setUnreadCount,
  incrementUnreadCount,
  clearUnreadCount,
  clearError,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
