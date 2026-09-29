const AiChat = require('../models/aiChat.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || Number(req.body.userId) || Number(req.query.userId) || null;
}

exports.createSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { moduleId, documentId, title } = req.body;

    if (!moduleId) {
      return res.status(400).json({ success: false, message: 'moduleId is required' });
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

exports.sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ success: false, message: 'sessionId and message are required' });
    }

    const session = await AiChat.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Chat session not found' });
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
          `SELECT extracted_text FROM DOCUMENT_TEXT WHERE document_id = ?`,
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
      console.error('AI chat failed:', aiError.message);
      return res.status(502).json({
        success: false,
        message: 'AI service failed to respond',
        error: aiError.message,
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

exports.getSessions = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { moduleId } = req.query;
    const sessions = await AiChat.getSessionsByUser(userId, moduleId || null);

    return res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('getSessions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sessionId = parseInt(req.params.id, 10);
    const session = await AiChat.getSessionById(sessionId, userId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const messages = await AiChat.getMessages(sessionId);
    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const messages = await AiChat.getAllMessagesByUser(userId);
    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('getAllMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sessionId = parseInt(req.params.id, 10);
    const deleted = await AiChat.deleteSession(sessionId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    return res.json({ success: true, message: 'Chat session deleted' });
  } catch (error) {
    console.error('deleteSession error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
};