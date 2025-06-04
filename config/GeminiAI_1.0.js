const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAI_1_0 {
  constructor(apiKey) {
    if (!apiKey) {
      console.error('GOOGLE_API_KEY is not set.');
      throw new Error('Missing Google API Key.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatHistories = new Map();
  }

  getAIChat(history) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

      return model.startChat({
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
        generationConfig: {
          maxOutputTokens: 500,
        },
      });
    } catch (error) {
      console.error("Error initializing Gemini 1.5:", error);
      throw new Error("Failed to initialize Gemini 1.5 model.");
    }
  }

  updateHistory(sessionId, userInput, modelReply) {
    const history = this.chatHistories.get(sessionId) || [];

    if (userInput && userInput !== "start interview") {
      history.push({ role: "user", text: userInput });
    }

    history.push({ role: "model", text: modelReply });
    this.chatHistories.set(sessionId, history);
    return history;
  }

  async handle(req, res) {
    const { sessionId, jobTitle, userResponse } = req.body;

    if (!sessionId || !jobTitle || userResponse === undefined || userResponse === null) {
      return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse.' });
    }

    try {
      const history = this.chatHistories.get(sessionId) || [];
      const chat = this.getAIChat(history);

      const result = await chat.sendMessage(userResponse || "start interview");
      const fullResponse = result.response.text();

      const updatedHistory = this.updateHistory(sessionId, userResponse, fullResponse);

      res.json({ response: fullResponse, history: updatedHistory });
    } catch (error) {
      console.error("Gemini 1.5 handle error:", error);
      res.status(500).json({ error: 'Failed to get response from Gemini 1.5.' });
    }
  }
}

module.exports = GeminiAI_1_0;
