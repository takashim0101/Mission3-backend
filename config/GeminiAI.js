// C:\Level 5\Mission3_team\Mission3-backend\config\GeminiAI.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("CRITICAL ERROR: GOOGLE_API_KEY is not set in .env. AI features will not work.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Initializes and returns a chat session with the Gemini 1.5 Flash AI model.
 * The model is configured as an AI interviewer for a specific job title.
 * @param {string} jobTitle - The title of the job for the interview.
 * @param {Array<Object>} history - Previous conversation history (role and text parts).
 * @returns {import('@google/generative-ai').ChatSession} A chat session object.
 */
function getAIChat(jobTitle, history = []) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: {
      role: "system",
      parts: [
        { text: `You are an AI interviewer for a job titled "${jobTitle}".` },
        { text: `Your goal is to conduct a mock interview by asking relevant questions.` },
        { text: `Your first question should always be: "Tell me about yourself."` }, // Explicitly state the first question here
        { text: `After that, ask up to 6 follow-up questions one at a time, based on the user's responses and the job title.` },
        { text: `Ensure your questions are typical for a job interview.` },
        { text: `Once the 6 questions are asked, provide constructive feedback on the user's answers and interview performance.` },
        { text: `Keep your responses concise and professional.` },
      ],
    },
    generationConfig: {
      responseMimeType: "text/plain",
    },
  });

  // Map history to the correct format { role: 'user/model', parts: [{ text: '...' }] }
  const formattedHistory = history.map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));

  // Ensure the history passed to startChat correctly alternates roles if it's not empty.
  // The first turn from the user (e.g., "start interview") will be handled by sendMessageStream.
  return model.startChat({
    history: formattedHistory,
  });
}

module.exports = { getAIChat };