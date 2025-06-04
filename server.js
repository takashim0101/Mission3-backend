// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const GeminiAI = require('./config/GeminiAI'); 
const { extractTextFromStream } = require('./utils/streamHandler'); 
const { updateHistory } = require('./utils/historyManager'); 

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize GeminiAI outside the route handler to reuse the instance
const geminiAI = new GeminiAI(process.env.GOOGLE_API_KEY);

// Map to store conversation history and interview state
// In a production environment, this should be a database.
const chatHistories = new Map();

app.post('/interview', async (req, res) => {
    const { sessionId, jobTitle, userResponse } = req.body;

    if (!sessionId || !jobTitle || userResponse === undefined) {
        return res.status(400).json({ error: 'Missing sessionId, jobTitle, or userResponse' });
    }

    try {
        // Retrieve or initialize the session data
        let sessionData = chatHistories.get(sessionId);
        if (!sessionData) {
            sessionData = {
                history: [],
                interviewStage: 'initial', // Start with the initial stage
                followUpCount: 0,
                userAnswers: [], // To store user answers for feedback
            };
            chatHistories.set(sessionId, sessionData);
        }

        // Add the user's response to the history if it's not the initial 'start interview'
        if (userResponse && userResponse !== "start interview") {
            sessionData.history.push({ role: "user", text: userResponse });
            // Collect user answers for feedback stage
            if (sessionData.interviewStage !== 'initial' && sessionData.interviewStage !== 'pre_feedback' && sessionData.interviewStage !== 'interview_complete') {
                 sessionData.userAnswers.push(userResponse);
            }
        }

        // Process the interview turn using the GeminiAI class
        const { modelResponseText, newInterviewStage, newFollowUpCount } = await geminiAI.processInterviewTurn({
            jobTitle,
            history: sessionData.history,
            followUpCount: sessionData.followUpCount,
            interviewStage: sessionData.interviewStage,
            userAnswers: sessionData.userAnswers // Pass collected user answers
        });

        // Update session data with the new state
        sessionData.history.push({ role: "model", text: modelResponseText });
        sessionData.interviewStage = newInterviewStage;
        sessionData.followUpCount = newFollowUpCount;

        // You might want to update the history manager if it handles more than just simple pushes.
        // For this example, we're directly manipulating sessionData.history.
        // const updatedHistory = updateHistory(sessionId, chatHistories, userResponse, modelResponseText);

        res.json({
            response: modelResponseText,
            history: sessionData.history, // Send back the updated history
            interviewStage: newInterviewStage, // Send back the current stage
            followUpCount: newFollowUpCount // Send back the current follow-up count
        });

    } catch (error) {
        console.error('Error in interview process:', error);
        res.status(500).json({ error: 'Failed to get response from AI interviewer.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});