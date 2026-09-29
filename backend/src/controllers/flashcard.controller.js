const Flashcard = require('../models/flashcard.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

function getUserId(req) {
  return req.user?.user_id || req.user?.id || Number(req.body.userId) || Number(req.query.userId) || null;
}

exports.generateFlashcards = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { documentId, moduleId, title } = req.body;
    const numberOfCards = Math.min(Math.max(Number(req.body.numberOfCards) || 8, 1), 30);

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'documentId and moduleId are required',
      });
    }

    const [docs] = await db.execute(
      `SELECT document_id, title, file_path, openai_file_id
       FROM DOCUMENT
       WHERE document_id = ? AND user_id = ? AND module_id = ?`,
      [documentId, userId, moduleId]
    );

    if (docs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied',
      });
    }

    const document = docs[0];

    let studyText = '';
    try {
      const [textRows] = await db.execute(
        `SELECT extracted_text FROM DOCUMENT_TEXT WHERE document_id = ?`,
        [documentId]
      );
      studyText = textRows[0]?.extracted_text || '';
    } catch (e) {
      console.error('Could not load document text:', e.message);
      studyText = '';
    }

    if (!studyText || studyText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Not enough text content available for this document to generate flashcards',
      });
    }

    if (studyText.length > 12000) {
      studyText = studyText.substring(0, 12000) + '...';
    }

    let aiResult;
    try {
      aiResult = await aiService.generateFlashcards(studyText, numberOfCards);
    } catch (aiError) {
      console.error('AI generation failed:', aiError.message);
      return res.status(502).json({
        success: false,
        message: 'Failed to generate flashcards from AI service',
        error: aiError.message,
      });
    }

    if (!aiResult?.flashcards || !Array.isArray(aiResult.flashcards) || aiResult.flashcards.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI returned invalid flashcard format',
      });
    }

    const setTitle = title || `Flashcards – ${document.title}`;
    const flashcardSetId = await Flashcard.createSetWithCards({
      userId,
      moduleId,
      documentId,
      title: setTitle,
      cards: aiResult.flashcards,
    });

    const fullSet = await Flashcard.getSetById(flashcardSetId, userId);

    return res.status(201).json({
      success: true,
      message: 'Flashcards generated successfully',
      data: fullSet,
    });
  } catch (error) {
    console.error('generateFlashcards error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating flashcards',
    });
  }
};

exports.getMyFlashcardSets = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sets = await Flashcard.getSetsByUser(userId, req.query.moduleId || null);
    return res.json({ success: true, data: sets });
  } catch (error) {
    console.error('getMyFlashcardSets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch flashcard sets' });
  }
};

exports.getFlashcardSet = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const set = await Flashcard.getSetById(parseInt(req.params.id, 10), userId);
    if (!set) {
      return res.status(404).json({ success: false, message: 'Flashcard set not found' });
    }

    return res.json({ success: true, data: set });
  } catch (error) {
    console.error('getFlashcardSet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch flashcard set' });
  }
};

exports.deleteFlashcardSet = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const deleted = await Flashcard.deleteSet(parseInt(req.params.id, 10), userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Flashcard set not found' });
    }

    return res.json({ success: true, message: 'Flashcard set deleted successfully' });
  } catch (error) {
    console.error('deleteFlashcardSet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete flashcard set' });
  }
};