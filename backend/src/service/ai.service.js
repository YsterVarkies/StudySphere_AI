require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const mammoth = require('mammoth');

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const MODEL_NAME = 'gemini-3.8-flash';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function normalizeDifficulty(difficulty) {
  const value = String(difficulty || 'medium')
    .trim()
    .toLowerCase();

  if (!['easy', 'medium', 'hard'].includes(value)) {
    return 'medium';
  }

  return value;
}

function getDifficultyInstructions(difficulty) {
  if (difficulty === 'easy') {
    return `
DIFFICULTY: EASY
COGNITIVE LEVEL: RECALL

Create questions or flashcards that test direct recall of information.

Focus on:
- Definitions
- Facts
- Terminology
- Identifying concepts
- Remembering key information

Do not require complex reasoning, application, comparison, or analysis.
`;
  }

  if (difficulty === 'hard') {
    return `
DIFFICULTY: HARD
COGNITIVE LEVEL: ANALYSE

Create questions or flashcards that require the student to analyse information.

Focus on:
- Comparing concepts
- Distinguishing between related concepts
- Analysing relationships
- Interpreting information
- Multi-step reasoning
- Determining causes and effects
- Analysing scenarios using multiple pieces of information

Do not make the content difficult simply by using complicated wording.
The difficulty must come from the level of analysis required.
`;
  }

  return `
DIFFICULTY: MEDIUM
COGNITIVE LEVEL: APPLY

Create questions or flashcards that require the student to apply information from the study material.

Focus on:
- Applying concepts to situations
- Using rules or principles
- Solving problems using the study material
- Applying knowledge to examples
- Interpreting information using concepts from the study material

Do not rely only on direct recall.
`;
}

async function extractDocumentContent(
  fileBuffer,
  mimeType,
  fileName
) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Document is empty');
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error('Document exceeds the 25 MB limit');
  }

  const safeFileName =
    String(fileName || '').toLowerCase();

  const safeMimeType =
    String(mimeType || '').toLowerCase();

  if (
    safeMimeType === 'text/plain' ||
    safeFileName.endsWith('.txt')
  ) {
    const text =
      fileBuffer.toString('utf8');

    if (!text.trim()) {
      throw new Error('TXT document is empty');
    }

    return {
      type: 'text',
      content: text,
      mimeType: 'text/plain',
      fileName
    };
  }

  if (
    safeMimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    safeFileName.endsWith('.docx')
  ) {
    const result =
      await mammoth.extractRawText({
        buffer: fileBuffer
      });

    if (!result.value.trim()) {
      throw new Error(
        'DOCX document contains no readable text'
      );
    }

    return {
      type: 'text',
      content: result.value,
      mimeType: 'text/plain',
      fileName
    };
  }

  if (
    safeMimeType === 'application/pdf' ||
    safeFileName.endsWith('.pdf')
  ) {
    return {
      type: 'pdf',
      content: fileBuffer,
      mimeType: 'application/pdf',
      fileName
    };
  }

  throw new Error(
    'Unsupported document type. Only PDF, DOCX and TXT are supported.'
  );
}

async function generateContent(
  prompt,
  documentContent
) {
  const model =
    genAI.getGenerativeModel({
      model: MODEL_NAME
    });

  const content = [
    {
      text: prompt
    }
  ];

  if (
    documentContent &&
    documentContent.type === 'pdf'
  ) {
    content.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: documentContent.content.toString(
          'base64'
        )
      }
    });
  } else if (documentContent) {
    content.push({
      text:
        `\n\nSTUDY MATERIAL:\n` +
        documentContent.content
    });
  }

  const result =
    await model.generateContent(content);

  return result.response.text();
}

async function chat(
  question,
  documentContent = null,
  fileName = ''
) {
  let prompt;

  if (documentContent) {
    prompt = `
You are a helpful academic assistant for university students.

The user has selected the document "${fileName}".

Answer the user's question using the attached study material as the primary source.

Only use information supported by the study material.

Do not invent information that is not supported by the study material.

If the answer cannot be determined from the study material, clearly say that the document does not provide enough information.

Question:
${question}
`;
  } else {
    prompt = `
You are a helpful academic assistant for university students.

Answer the following question clearly and helpfully:

${question}
`;
  }

  return generateContent(
    prompt,
    documentContent
  );
}

async function generateQuiz(
  documentContent,
  fileName,
  numberOfQuestions = 5,
  difficulty = 'medium'
) {
  const requestedNumber = Math.min(
    Math.max(
      Number(numberOfQuestions) || 5,
      1
    ),
    20
  );

  const normalizedDifficulty =
    normalizeDifficulty(difficulty);

  const difficultyInstructions =
    getDifficultyInstructions(
      normalizedDifficulty
    );

  const prompt = `
You are creating a multiple-choice quiz for a university student.

Read the study material carefully.

${difficultyInstructions}

Create EXACTLY ${requestedNumber} questions.

Every question MUST be based ONLY on the supplied study material.

Do not invent information.

Each question MUST contain:
- question: the complete question text
- options: exactly four answer options
- correct_answer: the letter of the correct option, using only A, B, C, or D
- explanation: a short explanation

Return ONLY valid JSON.

Use EXACTLY this structure:

{
  "questions": [
    {
      "question": "What is ...?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}

IMPORTANT:
- Do not return markdown.
- Do not use code fences.
- Do not add text before or after the JSON.
- Do not use empty question text.
- Do not use empty options.
- Return exactly ${requestedNumber} questions.
- Easy means RECALL.
- Medium means APPLY.
- Hard means ANALYSE.
- The difficulty must come from the cognitive level, not complicated wording.

Document:
${fileName}
`;

  const model =
    genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

  const content = [
    {
      text: prompt
    }
  ];

  if (
    documentContent &&
    documentContent.type === 'pdf'
  ) {
    content.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: documentContent.content.toString(
          'base64'
        )
      }
    });
  } else {
    content.push({
      text:
        `\n\nSTUDY MATERIAL:\n` +
        documentContent.content
    });
  }

  const result =
    await model.generateContent(content);

  const raw =
    result.response.text();

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      'Gemini returned invalid quiz JSON'
    );
  }

  if (
    !parsed ||
    !Array.isArray(parsed.questions)
  ) {
    throw new Error(
      'Gemini did not return a questions array'
    );
  }

  if (
    parsed.questions.length !==
    requestedNumber
  ) {
    throw new Error(
      `Gemini returned ${parsed.questions.length} questions instead of ${requestedNumber}`
    );
  }

  const questions =
    parsed.questions.map(
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

        const explanation =
          question.explanation ||
          null;

        if (
          typeof questionText !== 'string' ||
          !questionText.trim()
        ) {
          throw new Error(
            `Question ${index + 1} has no question text`
          );
        }

        if (
          !Array.isArray(options) ||
          options.length !== 4
        ) {
          throw new Error(
            `Question ${index + 1} must have exactly 4 options`
          );
        }

        if (
          !['A', 'B', 'C', 'D'].includes(
            String(correctAnswer)
              .trim()
              .toUpperCase()
          )
        ) {
          throw new Error(
            `Question ${index + 1} has an invalid correct answer`
          );
        }

        return {
          question: questionText.trim(),
          options: options.map((option) =>
            String(option)
          ),
          correct_answer:
            String(correctAnswer)
              .trim()
              .toUpperCase(),
          explanation
        };
      }
    );

  return {
    questions
  };
}

async function generateFlashcards(
  documentContent,
  fileName,
  numberOfCards = 5,
  difficulty = 'medium'
) {
  const requestedNumber = Math.min(
    Math.max(
      Number(numberOfCards) || 5,
      1
    ),
    20
  );

  const normalizedDifficulty =
    normalizeDifficulty(difficulty);

  const difficultyInstructions =
    getDifficultyInstructions(
      normalizedDifficulty
    );

  const prompt = `
You are creating study flashcards for a university student.

Read the study material carefully.

${difficultyInstructions}

Create EXACTLY ${requestedNumber} flashcards based ONLY on the study material.

The front of each flashcard should test the student according to the selected cognitive level.

The back of each flashcard should provide the correct answer or explanation based only on the study material.

Return ONLY valid JSON using this exact structure:

{
  "flashcards": [
    {
      "front": "Question or concept",
      "back": "Answer or explanation"
    }
  ]
}

IMPORTANT:
- Do not invent information.
- Do not return markdown.
- Do not use code fences.
- Do not add text before or after the JSON.
- Return exactly ${requestedNumber} flashcards.
- Easy means RECALL.
- Medium means APPLY.
- Hard means ANALYSE.
- The difficulty must come from the cognitive level, not complicated wording.

Document:
${fileName}
`;

  const model =
    genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

  const content = [
    {
      text: prompt
    }
  ];

  if (
    documentContent &&
    documentContent.type === 'pdf'
  ) {
    content.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: documentContent.content.toString(
          'base64'
        )
      }
    });
  } else {
    content.push({
      text:
        `\n\nSTUDY MATERIAL:\n` +
        documentContent.content
    });
  }

  const result =
    await model.generateContent(content);

  const raw =
    result.response.text();

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      'Gemini returned invalid flashcard JSON'
    );
  }

  if (
    !parsed ||
    !Array.isArray(parsed.flashcards)
  ) {
    throw new Error(
      'Gemini did not return a flashcards array'
    );
  }

  if (
    parsed.flashcards.length !==
    requestedNumber
  ) {
    throw new Error(
      `Gemini returned ${parsed.flashcards.length} flashcards instead of ${requestedNumber}`
    );
  }

  return {
    flashcards:
      parsed.flashcards.map(
        (card, index) => {
          const front =
            card.front ||
            card.question ||
            '';

          const back =
            card.back ||
            card.answer ||
            '';

          if (!String(front).trim()) {
            throw new Error(
              `Flashcard ${index + 1} has no front content`
            );
          }

          if (!String(back).trim()) {
            throw new Error(
              `Flashcard ${index + 1} has no back content`
            );
          }

          return {
            front: String(front).trim(),
            back: String(back).trim()
          };
        }
      )
  };
}

async function generateSummary(
  documentContent,
  fileName
) {
  const prompt = `
You are creating a study summary for a university student.

Summarize the supplied study material.

Focus on:
- Important concepts
- Definitions
- Key facts
- Processes
- Relationships
- Important examples

Do not invent information.

Document:
${fileName}
`;

  return generateContent(
    prompt,
    documentContent
  );
}

module.exports = {
  extractDocumentContent,
  chat,
  generateQuiz,
  generateFlashcards,
  generateSummary
};