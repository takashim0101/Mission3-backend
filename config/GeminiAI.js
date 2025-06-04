const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_API_KEY is not set in .env");
  process.exit(1);
}

class GeminiAI {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatHistories = new Map();
  }

  // Setup and return chat session
  getAIChat(jobTitle, history = []) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: {
        parts: [
          { text: `You are an AI interviewer for a job titled "${jobTitle}".` },
          { text: `Your goal is to conduct a mock interview by asking relevant questions.` },
          { text: `Start by asking the user to "Tell me about yourself.".` },
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

    return model.startChat({
      history: history.length && history[0].role === "model"
  ? history.slice(1).map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }))
  : history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }))
    });
  }

  // Main handler for route
  async handle(req, res) {
    const { sessionId, jobTitle, userResponse } = req.body;
  console.log("🟢 Gemini Standard ROUTE HIT");
  console.log("BODY RECEIVED:", req.body);

    if (!sessionId || !jobTitle || userResponse === undefined) {
      return res.status(400).json({ error: "Missing sessionId, jobTitle, or userResponse" });
    }

    try {
      const history = this.chatHistories.get(sessionId) || [];
      const chat = this.getAIChat(jobTitle, history);

      const apiResponse = await chat.sendMessageStream(userResponse || "start interview");

      // === CRITICAL CHANGE 2: Robust text extraction from chunk ===
      const { extractTextFromStream } = require("../utils/streamHandler");
      const fullResponse = await extractTextFromStream(apiResponse);

      const { updateHistory } = require("../utils/historyManager");
      const updatedHistory = updateHistory(sessionId, this.chatHistories, userResponse, fullResponse);

      res.json({ response: fullResponse, history: updatedHistory });

    } catch (error) {
      console.error("Error calling Gemini API (Standard):", error);
      res.status(500).json({ error: "Failed to get response from AI interviewer." });
    }
  }
}

module.exports = GeminiAI;
