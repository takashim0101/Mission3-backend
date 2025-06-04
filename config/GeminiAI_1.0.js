const { GoogleGenerativeAI } = require('@google/generative-ai');

// Access your API key as an environment variable (preferable)
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error('GOOGLE_API_KEY is not set in your .env file.');
    // It's good practice to throw an error or exit if a critical environment variable is missing
    throw new Error('Google API Key is missing. Please set GOOGLE_API_KEY in your .env file.');
}

const genAI_1_0 = new GoogleGenerativeAI(API_KEY);

function getAIChat(jobTitle, history) {
    try {
        // --- FIX IS HERE ---
        // Changed 'gemini-1.0-pro' to 'gemini-pro' as per the API error message.
        const model = genAI_1_0.getGenerativeModel({ model: "gemini-pro" });
        // --- END FIX ---

        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 500, // Limit output length
            },
        });
        return chat;
    } catch (error) {
        console.error("Error initializing or using Gemini Pro model:", error); // More general message
        throw new Error("Failed to initialize or get response from Gemini Pro AI model.");
    }
}

module.exports = { getAIChat };