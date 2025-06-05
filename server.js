const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const GeminiAI = require('./config/GeminiAI');
const GeminiAIEX = require('./config/GeminiAIEX');
const { OpenAI: OpenAIClient } = require("openai");
const OpenAIController = require('./config/OpenAI');
const GeminiAIPro = require('./config/GeminiAI_1.0');

// Load environment variables
dotenv.config();

// Create the Express app
const app = express();

// Set the server port
const port = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Initialize Gemini AI (Standard)
const standardAI = new GeminiAI(process.env.GOOGLE_API_KEY);

// Initialize Gemini AI (Experimental)
const experimentalAI = new GeminiAIEX(process.env.GOOGLE_API_KEY);

// Initialize Gemini AI Pro (1.0)
const proAI = new GeminiAIPro(process.env.GOOGLE_API_KEY);

// Initialize OpenAI client
const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });

// Wrap OpenAI client with controller
const openaiController = new OpenAIController(openai);

// Route for standard Gemini AI
app.post('/interview/standard', (req, res) => standardAI.handle(req, res));

// Route for experimental Gemini AI
app.post('/interview/experimental', (req, res) => experimentalAI.handle(req, res));

// Route for OpenAI (ChatGPT)
app.post('/interview/chatgpt', (req, res) => openaiController.handle(req, res));

// Route for Gemini AI Pro (1.5)
app.post('/interview/gemini_1.0', (req, res) => proAI.handle(req, res));

// Start the server
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
