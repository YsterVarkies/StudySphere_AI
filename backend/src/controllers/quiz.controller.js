const Quiz = require('../models/quiz.model');
const aiService = require('../service/ai.service');
const db = require('../../config/db');
const storage = require('../../config/storage');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getUserId(req) {
  return (
    req.user?.user_id ||
    req.user?.id ||
    Number(req.body.userId) ||
    Number(req.query.userId) ||
    null
  );
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function getDocumentFile(documentId, userId, moduleId) {
  const [rows] = await db.execute(
    `SELECT
       document_id,
       title,
       file_path,
       file_type,
       file_size
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
    throw new Error('Document does not have a stored file');
  }

  if (document.file_size && document.file_size > MAX_FILE_SIZE) {
    throw new Error('Document exceeds the 25 MB limit');
  }

  const result = await storage.send(
    new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: document.file_path
    })
  );

  if (!result.Body) {
    throw new Error('Could not retrieve document from storage');
  }

  const fileBuffer = await streamToBuffer(result.Body);

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error('Document exceeds the 25 MB limit');
  }

  return {
    document,
    fileBuffer
  };
}

exports.generateQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const documentId = Number(req.body.documentId);
    const moduleId = Number(req.body.moduleId);

    const numberOfQuestions = Math.min(
      Math.max(
        Number(req.body.numberOfQuestions) || 5,
        1
      ),
      20
    );

    const title = req.body.title;

    const difficulty = String(
      req.body.difficulty || 'medium'
    )
      .trim()
      .toLowerCase();

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'difficulty must be easy, medium, or hard'
      });
    }

    if (!documentId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: 'documentId and moduleId are required'
      });
    }

    let documentData;

    try {
      documentData = await getDocumentFile(
        documentId,
        userId,
        moduleId
      );
    } catch (error) {
      console.error(
        'Document retrieval failed:',
        error.message
      );

      return res.status(502).json({
        success: false,
        message: 'Failed to retrieve selected document',
        error: error.message
      });
    }

    if (!documentData) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied'
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
        message: 'Failed to process document',
        error: error.message
      });
    }

    let aiResult;

    try {
      aiResult = await aiService.generateQuiz(
        documentContent,
        document.title,
        numberOfQuestions,
        difficulty
      );
    } catch (error) {
      console.error(
        'AI quiz generation failed:',
        error.message
      );

      return res.status(502).json({
        success: false,
        message: 'Failed to generate quiz from AI service',
        error: error.message
      });
    }

    if (
      !aiResult ||
      !Array.isArray(aiResult.questions) ||
      aiResult.questions.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message: 'AI returned an invalid quiz format'
      });
    }

    const normalizedQuestions = aiResult.questions.map(
      (question, index) => {
        const questionText =
          question.question ||
          question.text ||
          question.prompt ||
          '';

        const options =
          Array.isArray(question.options)
            ? question.options
            : Array.isArray(question.choices)
              ? question.choices
              : [];

        const correctAnswer =
          question.correct_answer ||
          question.correctAnswer ||
          question.correct_option ||
          question.correctOption ||
          '';

        return {
          question: questionText,
          options,
          correct_answer: correctAnswer,
          explanation: question.explanation || null,
          question_order: index + 1
        };
      }
    );

    for (
      let i = 0;
      i < normalizedQuestions.length;
      i++
    ) {
      if (!normalizedQuestions[i].question.trim()) {
        return res.status(500).json({
          success: false,
          message:
            `AI returned an empty question at position ${i + 1}`
        });
      }

      if (
        normalizedQuestions[i].options.length === 0
      ) {
        return res.status(500).json({
          success: false,
          message:
            `AI returned no options for question ${i + 1}`
        });
      }
    }

    const quizTitle =
      title ||
      `Quiz - ${document.title}`;

    const quizId =
      await Quiz.createWithQuestions({
        userId,
        moduleId,
        documentId,
        title: quizTitle,
        questions: normalizedQuestions
      });

    const fullQuiz =
      await Quiz.getById(
        quizId,
        userId
      );

    return res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      data: fullQuiz
    });
  } catch (error) {
    console.error(
      'generateQuiz error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating quiz'
    });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quizzes =
      await Quiz.getByUser(
        userId,
        req.query.moduleId || null
      );

    return res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error(
      'getQuizzes error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes'
    });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quizId =
      parseInt(req.params.id, 10);

    const quiz =
      await Quiz.getById(
        quizId,
        userId
      );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    return res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error(
      'getQuizById error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz'
    });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quizId =
      parseInt(req.params.id, 10);

    const deleted =
      await Quiz.delete(
        quizId,
        userId
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    return res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error(
      'deleteQuiz error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to delete quiz'
    });
  }
};

exports.submitAttempt = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quizId =
      parseInt(req.params.id, 10);

    const answers =
      req.body.answers || {};

    const quiz =
      await Quiz.getById(
        quizId,
        userId
      );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    let correct = 0;

    const total =
      quiz.questions.length;

    quiz.questions.forEach((question) => {
      const userAnswer =
        answers[String(question.question_id)] ||
        answers[question.question_order];

      if (
        userAnswer &&
        String(userAnswer).trim().toUpperCase() ===
          String(question.correct_answer)
            .trim()
            .toUpperCase()
      ) {
        correct++;
      }
    });

    const score =
      total > 0
        ? Number(
            ((correct / total) * 100).toFixed(2)
          )
        : 0;

    const attemptId =
      await Quiz.saveAttempt({
        quizId,
        userId,
        answers,
        score
      });

    return res.status(201).json({
      success: true,
      message: 'Attempt submitted',
      data: {
        attemptId,
        score,
        correct,
        total
      }
    });
  } catch (error) {
    console.error(
      'submitAttempt error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to submit attempt'
    });
  }
};

exports.getAttempts = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quizId =
      parseInt(req.params.id, 10);

    const attempts =
      await Quiz.getAttempts(
        quizId,
        userId
      );

    return res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error(
      'getAttempts error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts'
    });
  }
};