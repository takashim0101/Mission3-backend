const { GoogleGenerativeAI } = require('@google/generative-ai');
 
class GeminiAI_1_0 {
  constructor(apiKey) {
    // Check if the API key is provided
    if (!apiKey) {
      console.error('GOOGLE_API_KEY is not set.');
      throw new Error('Missing Google API Key.');
    }
 
    // Initialize the Google Generative AI instance
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatHistories = new Map(); // Store chat histories for different sessions
  }
 
  /**
   * Initializes and returns a chat session with the Gemini model, including system instructions.
   *
   * @param {string} jobTitle - The job title for the AI interviewer.
   * @param {Array<Object>} history - The current chat history for the session.
   * @returns {ChatSession} The initialized chat session object.
   */
  getAIChat(jobTitle, history) { // Added jobTitle parameter
    try {
      // Get the generative model for the chat with system instructions
      const model = this.genAI.getGenerativeModel({
        model: 'models/gemini-1.5-flash',
        // --- PROMPT LOCATION START ---
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
        // --- PROMPT LOCATION END ---
      });
 
      // Ensure the first message is a valid user message
      // Note: With system instruction, the initial "start interview" might become less critical
      // if the model correctly initiates based on its instruction.
      if (history.length === 0 || history[0].role !== 'user') {
        history.unshift({ role: 'user', text: 'start interview' });
      }
 
      // Map the history to the format required by the model
      const chatHistory = history.map((msg, i) => {
        if (!msg.role || !msg.text) {
          console.error("Invalid history entry at index", i, msg);
          throw new Error(`Malformed message at index ${i}`);
        }
        return {
          role: msg.role,
          parts: [{ text: msg.text }],
        };
      });
 
      // Start the chat with the model
      return model.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 500, // Set the maximum tokens for the output
        },
      });
    } catch (error) {
      console.error("Error initializing Gemini 1.5:", error);
      throw new Error("Failed to initialize Gemini 1.5 model.");
    }
  }
 
  updateHistory(sessionId, userInput, modelReply) {
    // Get the current chat history for the session
    const history = this.chatHistories.get(sessionId) || [];
 
    // Add user input to the history if it's valid
    if (userInput && userInput !== "start interview") {
      history.push({ role: "user", text: userInput });
    }
 
    // Add model reply to the history
    if (modelReply) {
      history.push({ role: "model", text: modelReply });
    }
 
    // Update the chat history map with the new history
    this.chatHistories.set(sessionId, history);
    return history; // Return the updated history
  }
 
  async handle(req, res) {
    const { sessionId, jobTitle, userResponse } = req.body;
 
    // Check for missing parameters and return a 400 error if any are missing
    if (!sessionId || !jobTitle || userResponse === undefined || userResponse === null) {
      return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse.' });
    }
 
    try {
      // Get the current history for the session
      let history = this.chatHistories.get(sessionId) || [];
 
      // Ensure the first message in the session is a user message
      if (history.length === 0) {
        history.push({ role: "user", text: userResponse || "start interview" });
      }
 
      console.log("SESSION:", sessionId);
      console.log("HISTORY:", JSON.stringify(history, null, 2));
 
      // Get the AI chat instance, passing the jobTitle for the system instruction
      const chat = this.getAIChat(jobTitle, history); // Passed jobTitle here
      const result = await chat.sendMessage(userResponse); // Send user response to the AI
      const fullResponse = result.response.text(); // Get the AI's response
 
      // Update the chat history with the new messages
      const updatedHistory = this.updateHistory(sessionId, userResponse, fullResponse);
      res.json({ response: fullResponse, history: updatedHistory }); // Send response and history back to client
 
    } catch (error) {
      console.error("Gemini 1.5 handle error:", error);
      res.status(500).json({ error: 'Failed to get response from Gemini 1.5.' }); // Handle errors
    }
  }
}
 
module.exports = GeminiAI_1_0; // Export the class for use in other modules