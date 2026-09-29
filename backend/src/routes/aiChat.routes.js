const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChat.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

router.post('/sessions', authenticateToken, aiChatController.createSession);
router.get('/sessions', authenticateToken, aiChatController.getSessions);
router.get('/sessions/:id/messages', authenticateToken, aiChatController.getMessages);
router.delete('/sessions/:id', authenticateToken, aiChatController.deleteSession);
router.post('/message', authenticateToken, aiChatController.sendMessage);
router.get('/messages', authenticateToken, aiChatController.getAllMessages);

module.exports = router;