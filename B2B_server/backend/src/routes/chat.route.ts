/**
 * Chat Routes
 */

import express from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';
import { chatMediaUpload } from '../middleware/chatMediaConfig';


const router = express.Router();

// All chat routes require authentication
// router.use(authenticateToken);

// Get all conversations for the current user
router.get('/conversations', authenticateToken,ChatController.getUserConversations);

// Start a new conversation (HTTP endpoint)
router.post('/conversations', authenticateToken, ChatController.startConversation);

// Get details of a specific conversation
router.get('/conversations/:conversationId', authenticateToken, ChatController.getConversationDetails);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);

// Upload media file for chat
router.post('/upload', authenticateToken, chatMediaUpload.single('file'), ChatController.uploadMedia);

// Send a message in a conversation (HTTP endpoint)
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);

// Update a message
router.put('/messages/:messageId', authenticateToken, ChatController.updateMessage);

// Delete a message
router.delete('/messages/:messageId', authenticateToken, ChatController.deleteMessage);

// Delete a conversation
router.delete('/conversations/:conversationId', authenticateToken, ChatController.deleteConversation);

export default router;
