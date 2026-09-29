const Flashcard = require('../models/flashcard.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');
const storage = require('../../config/storage');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getUserId(req) {
  return req.user?.user_id ||
    req.user?.id ||
    Number(req.body.userId) ||
    Number(req.query.userId) ||
    null;
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function getDocumentFile(
  documentId,
  userId,
  moduleId
) {
  const [rows] = await db.execute(
    `SELECT document_id, title, file_path, file_type, file_size
     FROM DOCUMENT
     WHERE document_id = ?
     AND user_id = ?
     AND module_id = ?`,
    [documentId, userId, moduleId]
  );

  if (rows.length === 0) {
    return null;
  }

  const document = rows[0];

  if (!document.file_path) {
    throw new Error(
      'Document does not have a stored file'
    );
  }

  if (document.file_size > MAX_FILE_SIZE) {
    throw new Error(
      'Document exceeds the 25 MB limit'
    );
  }

  const result = await storage.send(
    new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: document.file_path
    })
  );

  if (!result.Body) {
    throw new Error(
      'Could not retrieve document from storage'
    );
  }

  const fileBuffer =
    await streamToBuffer(result.Body);

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(
      'Document exceeds the 25 MB limit'
    );
  }

  return {
    document,
    fileBuffer
  };
}

exports.generateFlashcards = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const {
      documentId,
      moduleId,
      title
    } = req.body;

    const numberOfCards = Math.min(
      Math.max(
        Number(req.body.numberOfCards) || 8,
        1
      ),
      30
    );

    const difficulty = String(
      req.body.difficulty || 'medium'
    )
      .trim()
      .toLowerCase();

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message:
          'difficulty must be easy, medium, or hard'
      });
    }

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message:
          'documentId and moduleId are required'
      });
    }

    let documentData;

    try {
      documentData =
        await getDocumentFile(
          documentId,
          userId,
          moduleId
        );
    } catch (documentError) {
      console.error(
        'Document retrieval failed:',
        documentError.message
      );

      return res.status(502).json({
        success: false,
        message:
          'Failed to retrieve selected document',
        error: documentError.message
      });
    }

    if (!documentData) {
      return res.status(404).json({
        success: false,
        message:
          'Document not found or access denied'
      });
    }

    const {
      document,
      fileBuffer
    } = documentData;

    let documentContent;

    try {
      documentContent =
        await aiService.extractDocumentContent(
          fileBuffer,
          document.file_type,
          document.title
        );
    } catch (error) {
      console.error(
        'Document processing failed:',
        error.message
      );

      return res.status(400).json({
        success: false,
        message:
          'Failed to process document',
        error: error.message
      });
    }

    let aiResult;

    try {
      aiResult =
        await aiService.generateFlashcards(
          documentContent,
          document.title,
          numberOfCards,
          difficulty
        );
    } catch (aiError) {
      console.error(
        'AI generation failed:',
        aiError.message
      );

      return res.status(502).json({
        success: false,
        message:
          'Failed to generate flashcards from AI service',
        error: aiError.message
      });
    }

    if (
      !aiResult?.flashcards ||
      !Array.isArray(aiResult.flashcards) ||
      aiResult.flashcards.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message:
          'AI returned invalid flashcard format'
      });
    }

    const setTitle =
      title ||
      `Flashcards – ${document.title}`;

    const flashcardSetId =
      await Flashcard.createSetWithCards({
        userId,
        moduleId,
        documentId,
        title: setTitle,
        cards: aiResult.flashcards
      });

    const fullSet =
      await Flashcard.getSetById(
        flashcardSetId,
        userId
      );

    return res.status(201).json({
      success: true,
      message:
        'Flashcards generated successfully',
      data: fullSet
    });
  } catch (error) {
    console.error(
      'generateFlashcards error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error while generating flashcards'
    });
  }
};

exports.getMyFlashcardSets = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const sets =
      await Flashcard.getSetsByUser(
        userId,
        req.query.moduleId || null
      );

    return res.json({
      success: true,
      data: sets
    });
  } catch (error) {
    console.error(
      'getMyFlashcardSets error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch flashcard sets'
    });
  }
};

exports.getFlashcardSet = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const set =
      await Flashcard.getSetById(
        parseInt(req.params.id, 10),
        userId
      );

    if (!set) {
      return res.status(404).json({
        success: false,
        message:
          'Flashcard set not found'
      });
    }

    return res.json({
      success: true,
      data: set
    });
  } catch (error) {
    console.error(
      'getFlashcardSet error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch flashcard set'
    });
  }
};

exports.deleteFlashcardSet = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const deleted =
      await Flashcard.deleteSet(
        parseInt(req.params.id, 10),
        userId
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          'Flashcard set not found'
      });
    }

    return res.json({
      success: true,
      message:
        'Flashcard set deleted successfully'
    });
  } catch (error) {
    console.error(
      'deleteFlashcardSet error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete flashcard set'
    });
  }
};