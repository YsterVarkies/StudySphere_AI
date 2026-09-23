const AiChat = require('../models/aiChat.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

/**
 * POST /api/chat/sessions
 */
exports.createSession = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 1;
    const { moduleId, documentId, title } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'moduleId is required',
      });
    }

    const sessionId = await AiChat.createSession({
      userId,
      moduleId,
      documentId: documentId || null,
      title: title || 'New Chat',
    });

    const session = await AiChat.getSessionById(sessionId, userId);

    return res.status(201).json({
      success: true,
      message: 'Chat session created',
      data: session,
    });
  } catch (error) {
    console.error('createSession error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create chat session' });
  }
};

/**
 * POST /api/chat/message
 * Body: { sessionId, message, userId? }
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 1;
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and message are required',
      });
    }

    const session = await AiChat.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    await AiChat.saveMessage({
      sessionId,
      sender: 'user',
      messageText: message,
    });

    let context = '';
    if (session.document_id) {
      try {
        const [textRows] = await db.execute(
          `SELECT extracted_text FROM document_text WHERE document_id = ?`,
          [session.document_id]
        );
        context = textRows[0]?.extracted_text || '';
        if (context.length > 10000) {
          context = context.substring(0, 10000) + '...';
        }
      } catch (e) {
        context = '';
      }
    }

    let aiReply;
    try {
      aiReply = await aiService.chat(message, context);
    } catch (aiError) {
      console.error('AI chat failed:', aiError);
      return res.status(502).json({
        success: false,
        message: 'AI service failed to respond',
        error: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
      });
    }

    await AiChat.saveMessage({
      sessionId,
      sender: 'ai',
      messageText: aiReply,
    });

    return res.status(200).json({
      success: true,
      data: {
        userMessage: message,
        aiReply,
      },
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process message' });
  }
};

/**
 * GET /api/chat/sessions?userId=1&moduleId=1
 */
exports.getSessions = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const { moduleId } = req.query;

    const sessions = await AiChat.getSessionsByUser(userId, moduleId || null);

    return res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('getSessions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

/**
 * GET /api/chat/sessions/:id/messages?userId=1
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const sessionId = parseInt(req.params.id, 10);

    const session = await AiChat.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const messages = await AiChat.getMessages(sessionId);

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * GET /api/chat/messages?userId=1
 */
exports.getAllMessages = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const messages = await AiChat.getAllMessagesByUser(userId);

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('getAllMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * DELETE /api/chat/sessions/:id?userId=1
 */
exports.deleteSession = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId || 1;
    const sessionId = parseInt(req.params.id, 10);

    const deleted = await AiChat.deleteSession(sessionId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    return res.json({
      success: true,
      message: 'Chat session deleted',
    });
  } catch (error) {
    console.error('deleteSession error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
};