import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  createOrFetchConversation,
} from '../controllers/messagesController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Fetch all conversations for the logged-in user
router.get('/conversations', authenticateUser, getConversations);

// Fetch messages for a specific conversation
router.get('/:conversationId/messages', authenticateUser, getMessages);

// Send a new message
router.post('/:conversationId/messages', authenticateUser, sendMessage);

// Create or fetch a conversation
router.post('/conversations', authenticateUser, createOrFetchConversation);

export default router;