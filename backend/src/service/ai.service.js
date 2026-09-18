require('dotenv').config();

const PROVIDER = 'gemini';

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function chat(question, context = '') {
  const prompt = context
    ? `Context from study materials:\n${context}\n\nQuestion: ${question}`
    : question;

  if (PROVIDER === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful academic assistant for university students.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });
    return completion.choices[0].message.content;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    'You are a helpful academic assistant for university students.',
    prompt,
  ]);
  return result.response.text();
}

async function generateQuiz(text, numberOfQuestions = 5) {
  const prompt = `
Create a multiple-choice quiz with ${numberOfQuestions} questions based on the following study material.
Return ONLY valid JSON in this exact format:
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

  if (PROVIDER === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    return JSON.parse(completion.choices[0].message.content);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function generateFlashcards(text, numberOfCards = 8) {
  const prompt = `
Create ${numberOfCards} flashcards based on the following study material.
Return ONLY valid JSON in this exact format:
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

  if (PROVIDER === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    return JSON.parse(completion.choices[0].message.content);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

module.exports = {
  chat,
  generateQuiz,
  generateFlashcards,
};