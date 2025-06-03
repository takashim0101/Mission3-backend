// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini API Configuration
const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error('GOOGLE_API_KEY is not set in .env file');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Map to store conversation history (simple example, use a database in production)
const chatHistories = new Map();

app.post('/interview', async (req, res) => {
    const { sessionId, jobTitle, userResponse } = req.body;

    if (!sessionId || !jobTitle || userResponse === undefined) {
        return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse' });
    }

    let history = chatHistories.get(sessionId) || [];

    try {
        const model = genAI.getGenerativeModel({
            
            model: "gemini-1.5-flash", 
            systemInstruction: {
                parts: [
                    { text: `You are an AI interviewer for a job titled "${jobTitle}".` },
                    { text: `Your goal is to conduct a mock interview by asking relevant questions.` },
                    { text: `Start by asking the user to "Tell me about yourself.".` },
                    { text: `After that, ask up to 6 follow-up questions one at a time, based on the user's responses and the job title.` },
                    { text: `Ensure your questions are typical for a job interview.` },
                    { text: `Once the 6 questions are asked, provide constructive feedback on the user's answers and interview performance.` },
                    { text: `Keep your responses concise and professional.` }
                ]
            },
            generationConfig: {
                responseMimeType: "text/plain",
            },
        });

        const chat = model.startChat({
            history: history.map(item => ({
                role: item.role,
                parts: [{ text: item.text }]
            }))
        });

        let apiResponse;
        if (history.length === 0) {
            apiResponse = await chat.sendMessageStream(userResponse || "start interview");
        } else {
            apiResponse = await chat.sendMessageStream(userResponse);
        }

        let fullResponse = '';
        for await (const chunk of apiResponse.stream) {
            // === CRITICAL CHANGE 2: Robust text extraction from chunk ===
            // Handle cases where chunk.text might be returned as a function
            if (typeof chunk.text === 'function') {
                fullResponse += chunk.text(); // If .text is a function, call it
            } else if (typeof chunk.text === 'string') {
                fullResponse += chunk.text; // If .text is already a string
            } else {
                // Fallback for unexpected types (log for debugging)
                console.warn('Unexpected type for chunk.text:', typeof chunk.text, chunk.text);
                // Attempt to get text directly from candidates and parts if chunk.text is problematic
                if (chunk.candidates && chunk.candidates.length > 0 &&
                    chunk.candidates[0].content && chunk.candidates[0].content.parts &&
                    chunk.candidates[0].content.parts.length > 0) {
                    fullResponse += chunk.candidates[0].content.parts[0].text;
                }
            }
        }

        // Update history
        if (userResponse !== undefined && userResponse !== "start interview") {
            history.push({ role: 'user', text: userResponse });
        }
        history.push({ role: 'model', text: fullResponse });
        chatHistories.set(sessionId, history);

        res.json({ response: fullResponse, history: history });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to get response from AI interviewer.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});