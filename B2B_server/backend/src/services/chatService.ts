/**
 * Chat Service - Handles chat-related business logic
 */

import { Conversation, IConversation } from '../models/Conversation';
import { ConversationParticipant, IParticipantWithUserInfo } from '../models/ConversationParticipant';
import { Message, IMessage, IMessageWithSenderInfo } from '../models/Message';

export interface IStartConversationData {
  recipientId: string;
  initialMessage?: any;
}

export interface IConversationDetails extends IConversation {
  participants: IParticipantWithUserInfo[];
  lastMessage?: IMessageWithSenderInfo | null;
  messageCount: number;
}

export class ChatService {
  /**
   * Start a new conversation or get existing one between two users
   */
  static async startConversation(
    currentUserId: string,
    recipientId: string,
    initialMessage?: any
  ): Promise<{ conversation: IConversation; message?: IMessage; isNew: boolean }> {
    // Check if conversation already exists
    const existingConversation = await Conversation.findDirectConversation(
      currentUserId,
      recipientId
    );

    if (existingConversation) {
      // If initial message is provided, create it
      if (initialMessage) {
        const message = await Message.create(
          existingConversation.id,
          currentUserId,
          initialMessage
        );
        return {
          conversation: existingConversation,
          message,
          isNew: false,
        };
      }

      return {
        conversation: existingConversation,
        isNew: false,
      };
    }

    // Create new conversation
    const newConversation = await Conversation.create(currentUserId, false, null);

    // Add both users as participants
    await ConversationParticipant.addMultiple(newConversation.id, [
      currentUserId,
      recipientId,
    ]);

    // Create initial message if provided
    if (initialMessage) {
      const message = await Message.create(
        newConversation.id,
        currentUserId,
        initialMessage
      );
      return {
        conversation: newConversation,
        message,
        isNew: true,
      };
    }

    return {
      conversation: newConversation,
      isNew: true,
    };
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: any,
    isForwarded: boolean = false
  ): Promise<IMessage> {
    // Verify sender is a participant
    const isParticipant = await ConversationParticipant.isParticipant(
      conversationId,
      senderId
    );

    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Create message
    const message = await Message.create(conversationId, senderId, content, isForwarded);

    return message;
  }

  /**
   * Get conversation details with participants and last message
   */
  static async getConversationDetails(
    conversationId: string,
    userId: string
  ): Promise<IConversationDetails | null> {
    // Verify user is a participant
    const isParticipant = await ConversationParticipant.isParticipant(
      conversationId,
      userId
    );

    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return null;
    }

    const participants = await ConversationParticipant.findByConversationId(
      conversationId
    );

    const lastMessage = await Message.getLatestMessage(conversationId);
    const messageCount = await Message.getMessageCount(conversationId);

    return {
      ...conversation,
      participants,
      lastMessage,
      messageCount,
    };
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(
    userId: string
  ): Promise<IConversationDetails[]> {
    const conversations = await Conversation.findByUserId(userId);

    const conversationDetails = await Promise.all(
      conversations.map(async (conversation) => {
        const participants = await ConversationParticipant.findByConversationId(
          conversation.id
        );
        const lastMessage = await Message.getLatestMessage(conversation.id);
        const messageCount = await Message.getMessageCount(conversation.id);

        return {
          ...conversation,
          participants,
          lastMessage,
          messageCount,
        };
      })
    );

    return conversationDetails;
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessageWithSenderInfo[]> {
    // Verify user is a participant
    const isParticipant = await ConversationParticipant.isParticipant(
      conversationId,
      userId
    );

    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const messages = await Message.findByConversationId(
      conversationId,
      limit,
      offset
    );

    return messages;
  }

  /**
   * Update a message
   */
  static async updateMessage(
    messageId: string,
    senderId: string,
    newContent: any
  ): Promise<IMessage> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== senderId) {
      throw new Error('You can only edit your own messages');
    }

    const updatedMessage = await Message.update(messageId, newContent);

    if (!updatedMessage) {
      throw new Error('Failed to update message');
    }

    return updatedMessage;
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string, userId: string): Promise<{ deleted: boolean; conversationId?: string }> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new Error('You can only delete your own messages');
    }

    const conversationId = message.conversation_id;
    const deleted = await Message.delete(messageId);

    return { deleted, conversationId };
  }

  /**
   * Delete a conversation (only if user is a participant)
   */
  static async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    // Verify user is a participant
    const isParticipant = await ConversationParticipant.isParticipant(
      conversationId,
      userId
    );

    if (!isParticipant) {
      throw new Error('You are not a participant of this conversation');
    }

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Delete the conversation (cascade will delete participants and messages)
    return await Conversation.delete(conversationId);
  }

  /**
   * Get other participant in a direct conversation
   */
  static async getOtherParticipant(
    conversationId: string,
    currentUserId: string
  ): Promise<IParticipantWithUserInfo | null> {
    const participants = await ConversationParticipant.findByConversationId(
      conversationId
    );

    const otherParticipant = participants.find(
      (p) => p.user_id !== currentUserId
    );

    return otherParticipant || null;
  }
}
