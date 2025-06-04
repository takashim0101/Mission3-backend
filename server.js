const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getAIChat } = require('./config/GeminiAI'); // Google Gemini 1.5 Flash
const { getAIChat: getAIChatPro } = require('./config/GeminiAI_1.0'); // Google Gemini Pro (1.0)
const { extractTextFromStream } = require('./utils/streamHandler');
const { updateHistory } = require('./utils/historyManager');

dotenv.config();

// --- Global Unhandled Exception/Rejection Handlers ---
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Server is crashing:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION! Server is crashing:', reason);
    process.exit(1);
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const chatHistories = new Map();

app.post('/interview', async (req, res) => {
    const { sessionId, jobTitle, userResponse } = req.body;

    // Validate request body
    if (!sessionId || !jobTitle || userResponse === undefined || userResponse === null) {
        return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse in request body.' });
    }

    try {
        const history = chatHistories.get(sessionId) || [];
        let chat;

        try {
            chat = getAIChat(jobTitle, history);
        } catch (initError) {
            console.error('Error initializing Gemini 1.5 Flash chat:', initError);
            return res.status(500).json({ error: 'Failed to initialize Gemini 1.5 Flash chat. Please check backend logs for details.' });
        }
        
        const apiResponse = await chat.sendMessageStream(userResponse || "start interview");
        const fullResponse = await extractTextFromStream(apiResponse);
        const updatedHistory = updateHistory(sessionId, chatHistories, userResponse, fullResponse);

        res.json({ response: fullResponse, history: updatedHistory });

    } catch (error) {
        console.error('Error in /interview endpoint:', error);
        res.status(500).json({ error: 'Failed to get response from Gemini 1.5 Flash AI interviewer. Please check backend logs for details.' });
    }
});

app.post('/interview-gemini-pro', async (req, res) => {
    const { sessionId, jobTitle, userResponse } = req.body;

    // Validate request body
    if (!sessionId || !jobTitle || userResponse === undefined || userResponse === null) {
        return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse in request body.' });
    }

    try {
        const history = chatHistories.get(sessionId) || [];
        let chat;

        try {
            chat = getAIChatPro(jobTitle, history);
        } catch (initError) {
            console.error('Error initializing Gemini Pro chat:', initError);
            return res.status(500).json({ error: 'Failed to initialize Gemini Pro chat. Please check backend logs for details.' });
        }

        const apiResponse = await chat.sendMessageStream(userResponse || "start interview");
        const fullResponse = await extractTextFromStream(apiResponse);
        const updatedHistory = updateHistory(sessionId, chatHistories, userResponse, fullResponse);

        res.json({ response: fullResponse, history: updatedHistory });

    } catch (error) {
        console.error('Error in /interview-gemini-pro endpoint:', error);
        res.status(500).json({ error: 'Failed to get response from Gemini Pro AI interviewer. Please check backend logs for details.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
    console.log(`Google API Key status: ${process.env.GOOGLE_API_KEY ? 'Set' : 'NOT SET'}`);
});

