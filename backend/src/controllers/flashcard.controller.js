const Flashcard = require('../models/flashcard.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db'); // ← correct path from src/controllers/

exports.generateFlashcards = async (req, res) => {
  try {
    // TEMP: authentication disabled
    const userId = req.body.userId || req.query.userId || 1;

    const { documentId, moduleId, title, numberOfCards = 8 } = req.body;

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'documentId and moduleId are required',
      });
    }

    // 1. Fetch the document
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

    // 2. Get extracted text
    //    Adjust this if your table/column is different
    const [textRows] = await db.execute(
      `SELECT extracted_text FROM DOCUMENT_TEXT WHERE document_id = ?`,
      [documentId]
    );

    let studyText = textRows[0]?.extracted_text || '';

    if (!studyText || studyText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Not enough text content available for this document to generate flashcards',
      });
    }

    if (studyText.length > 12000) {
      studyText = studyText.substring(0, 12000) + '...';
    }

    // 3. Call AI
    let aiResult;
    try {
      aiResult = await aiService.generateFlashcards(studyText, numberOfCards);
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      return res.status(502).json({
        success: false,
        message: 'Failed to generate flashcards from AI service',
        error: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
      });
    }

    if (!aiResult?.flashcards || !Array.isArray(aiResult.flashcards) || aiResult.flashcards.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI returned invalid flashcard format',
      });
    }

    // 4. Save to database
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
    const userId = req.query.userId || 1;
    const { moduleId } = req.query;

    const sets = await Flashcard.getSetsByUser(userId, moduleId || null);

    return res.json({
      success: true,
      data: sets,
    });
  } catch (error) {
    console.error('getMyFlashcardSets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch flashcard sets' });
  }
};

exports.getFlashcardSet = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const setId = parseInt(req.params.id, 10);

    const set = await Flashcard.getSetById(setId, userId);

    if (!set) {
      return res.status(404).json({ success: false, message: 'Flashcard set not found' });
    }

    return res.json({
      success: true,
      data: set,
    });
  } catch (error) {
    console.error('getFlashcardSet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch flashcard set' });
  }
};

exports.deleteFlashcardSet = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId || 1;
    const setId = parseInt(req.params.id, 10);

    const deleted = await Flashcard.deleteSet(setId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Flashcard set not found' });
    }

    return res.json({
      success: true,
      message: 'Flashcard set deleted successfully',
    });
  } catch (error) {
    console.error('deleteFlashcardSet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete flashcard set' });
  }
};