const Summary = require('../models/summary.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');

exports.generateSummary = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 1;
    const { documentId, title } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'documentId is required',
      });
    }

    const [docs] = await db.execute(
      `SELECT document_id, title FROM DOCUMENT
       WHERE document_id = ? AND user_id = ?`,
      [documentId, userId]
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
        `SELECT extracted_text FROM document_text WHERE document_id = ?`,
        [documentId]
      );
      studyText = textRows[0]?.extracted_text || '';
    } catch (e) {
      studyText = '';
    }

    if (!studyText || studyText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Not enough text content available for this document to generate a summary',
      });
    }

    if (studyText.length > 12000) {
      studyText = studyText.substring(0, 12000) + '...';
    }

    let aiResult;
    try {
      aiResult = await aiService.generateSummary(studyText);
    } catch (aiError) {
      console.error('AI summary failed:', aiError);
      return res.status(502).json({
        success: false,
        message: 'Failed to generate summary from AI service',
        error: process.env.NODE_ENV === 'development' ? aiError.message : undefined,
      });
    }

    if (!aiResult?.summary) {
      return res.status(500).json({
        success: false,
        message: 'AI returned invalid summary format',
      });
    }

    const summaryTitle = title || aiResult.title || `Summary – ${document.title}`;
    const summaryId = await Summary.create({
      sourceDocumentId: documentId,
      createdByUserId: userId,
      title: summaryTitle,
      summaryText: aiResult.summary,
    });

    const fullSummary = await Summary.getById(summaryId, userId);

    return res.status(201).json({
      success: true,
      message: 'Summary generated successfully',
      data: fullSummary,
    });
  } catch (error) {
    console.error('generateSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating summary',
    });
  }
};

exports.getSummaries = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const { documentId } = req.query;

    const summaries = await Summary.getByUser(userId, documentId || null);

    return res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('getSummaries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch summaries' });
  }
};

exports.getSummaryById = async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const summaryId = parseInt(req.params.id, 10);

    const summary = await Summary.getById(summaryId, userId);

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found' });
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('getSummaryById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};

exports.deleteSummary = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId || 1;
    const summaryId = parseInt(req.params.id, 10);

    const deleted = await Summary.delete(summaryId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Summary not found' });
    }

    return res.json({
      success: true,
      message: 'Summary deleted successfully',
    });
  } catch (error) {
    console.error('deleteSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete summary' });
  }
};