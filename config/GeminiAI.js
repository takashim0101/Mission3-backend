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
        { text: `You are a professional AI interviewer for a job titled "${jobTitle}".` },
        {
          text: `Your goal is to conduct a mock interview by asking relevant questions.`,
        },
        { text: `Start by asking the user to "Tell me about yourself.` },
        {
          text: `After that, ask up to 6 follow-up questions one at a time, based on the user's responses and reelevant to the job title.`,
        },
        { text: `Make sure each question reflects real-world interview expectations for the job, testing both technical and behavioral skills.` },
        { text: `Ensure your questions are typical for a job interview.` },
        {
          text: `Once the 6 questions are asked, provide constructive feedback on the user's answers and interview performance and also give a rating out of 10.`,
        },
        { text: `Keep your responses concise and professional. Use a friendly, supportive tone similar to an experienced interviewer who wants the candidate to succeed.` },
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
