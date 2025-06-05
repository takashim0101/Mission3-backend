# AI Chatbot interviewer

## Brief Description 
Designed by Takashi, This interview chatbot is designed to simulate a job interview experience. It guides users through various stages of a mock interview, starting with initial questions, proceeding to follow-up questions, and culminating in constructive feedback on their performance. The chatbot uses Google's Gemini AI by Sonny, Wisony and Takashi and OpenAI by Kerehama to generate natural and relevant interview questions and responses, making the experience dynamic and interactive. It keeps track of the conversation history and the current interview stage to ensure a coherent and structured interview process.

# Getting started

Prerequisites
Before installing dependencies, ensure you have:
- Node.js (latest LTS recommended) installed on your system.
- npm (Node Package Manager) or yarn for dependency management.
Installation
- Initialize a new project (if you haven’t already):
mkdir my-ai-project && cd my-ai-project
npm init -y
- Install dependencies:
npm install @google/generative-ai cors dotenv express openai
- Install development dependencies:
npm install --save-dev @types/express @types/node


Configuration
- Create a .env file in your project root to store environment variables (such as API keys):
touch .env
- Inside the .env file, add:
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
- Set up a basic Express server (index.js):
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, AI-powered world!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
Running Your Project- Start your server:
node index.js
- Open your browser and visit: http://localhost:3000/
You should see: "Hello, AI-powered world!"


## Install packages

Dependencies: These are the core packages required for the application to run:
- @google/generative-ai: Provides access to Google's generative AI capabilities.
- cors: Enables Cross-Origin Resource Sharing, allowing different domains to communicate.
- dotenv: Loads environment variables from a .env file to keep sensitive configuration details secure.
- express: A popular web framework for building APIs and web applications.
- openai: Facilitates interaction with OpenAI's models, such as GPT.
DevDependencies: These are used for development purposes and are not needed in production:
- @types/express: Provides TypeScript type definitions for Express.
- @types/node: Offers TypeScript type definitions for Node.js


## Git Installation
1. Git init.
2. create repo on gitHub
3. git add remote origin git@ithub.........
4. git branch -M main
5. git push -u origin main
6. git checkout -b sonny
7. git pull origin main

## Git work Flow
1. git checkout {branch}
2. git add .
3. git commit -m 'message'
4. git push
5. open pull request.
6. merge code to main
7. git checkout main
8. git pull
9. git checkout {my branch}
10. git merge main
