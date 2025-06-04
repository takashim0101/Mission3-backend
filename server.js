const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const GeminiAI = require('./config/GeminiAI');
const GeminiAIEX = require('./config/GeminiAIEX');
const { OpenAI: OpenAIClient } = require("openai");
const OpenAIController = require('./config/OpenAI'); // Path to your controller class
const GeminiAIPro = require('./config/GeminiAI_1.0'); // Gemini Pro controller

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const standardAI = new GeminiAI(process.env.GOOGLE_API_KEY);
const experimentalAI = new GeminiAIEX(process.env.GOOGLE_API_KEY);
const proAI = new GeminiAIPro(process.env.GOOGLE_API_KEY);
const openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });

const openaiController = new OpenAIController(openai); // instantiate your controller

app.post('/interview/standard', (req, res) => standardAI.handle(req, res));
app.post('/interview/experimental', (req, res) => experimentalAI.handle(req, res));
app.post('/interview/chatgpt', (req, res) => openaiController.handle(req, res)); // use the class here

app.post('/interview/gemini_1.0', (req, res) => proAI.handle(req, res));

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});