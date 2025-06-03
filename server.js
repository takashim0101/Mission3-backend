// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getAIChat } = require('./config/GeminiAI');
const { extractTextFromStream } = require('./utils/streamHandler');
const { updateHistory } = require('./utils/historyManager');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Map to store conversation history (simple example, use a database in production)
const chatHistories = new Map();

app.post('/interview', async (req, res) => {
    const { sessionId, jobTitle, userResponse } = req.body;

    if (!sessionId || !jobTitle || userResponse === undefined) {
        return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse' });
    }

    try {
        const history = chatHistories.get(sessionId) || [];
        const chat = getAIChat(jobTitle, history);

        const apiResponse = await chat.sendMessageStream(userResponse || "start interview");

        // === CRITICAL CHANGE 2: Robust text extraction from chunk ===
        const fullResponse = await extractTextFromStream(apiResponse);

        const updatedHistory = updateHistory(sessionId, chatHistories, userResponse, fullResponse);

        res.json({ response: fullResponse, history: updatedHistory });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to get response from AI interviewer.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
