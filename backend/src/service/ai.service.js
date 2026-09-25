require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = 'gemini-3.8-flash';

async function chat(question, context = '') {
  const prompt = context
    ? `Context from study materials:\n${context}\n\nQuestion: ${question}`
    : question;

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    'You are a helpful academic assistant for university students. Answer clearly and helpfully.',
    prompt,
  ]);

  return result.response.text();
}

async function generateQuiz(text, numberOfQuestions = 5) {
  const prompt = `
Create a multiple-choice quiz with ${numberOfQuestions} questions based on the following study material.
Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Short explanation"
    }
  ]
}

Study material:
${text}
`;

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function generateFlashcards(text, numberOfCards = 8) {
  const prompt = `
Create ${numberOfCards} flashcards based on the following study material.
Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}

Study material:
${text}
`;

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function generateSummary(text) {
  const prompt = `
Summarize the following study material clearly and concisely for a university student.
Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "title": "Short summary title",
  "summary": "The full summary text here"
}

Study material:
${text}
`;

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

module.exports = {
  chat,
  generateQuiz,
  generateFlashcards,
  generateSummary,
};