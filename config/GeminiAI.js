const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

function getAIChat(jobTitle, history = []) {
  const model = genAI.getGenerativeModel({
    // === CRITICAL CHANGE 1: Use a supported model that is likely free-tier ===
    model: "gemini-1.5-flash", // Changed from "gemini-pro"
    systemInstruction: {
      parts: [
        { text: `You are an AI interviewer for a job titled "${jobTitle}".` },
        {
          text: `Your goal is to conduct a mock interview by asking relevant questions.`,
        },
        { text: `Start by asking the user to "Tell me about yourself.".` },
        {
          text: `After that, ask up to 6 follow-up questions one at a time, based on the user's responses and the job title.`,
        },
        { text: `Ensure your questions are typical for a job interview.` },
        {
          text: `Once the 6 questions are asked, provide constructive feedback on the user's answers and interview performance.`,
        },
        { text: `Keep your responses concise and professional.` },
      ],
    },
    generationConfig: {
      responseMimeType: "text/plain",
    },
  });

  return model.startChat({
    history: history
  .filter((item, index) => !(index === 0 && item.role === "model"))
  .map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }))
,
  });
}

module.exports = { getAIChat };
