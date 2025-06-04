// config/GeminiAI.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_API_KEY is not set in .env");
  process.exit(1);
}

class GeminiAI {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });

    // Define interview stage configurations
    this.interviewStages = {
      initial: {
        instruction: (jobTitle) =>
          `You are an interviewer for a job titled "${jobTitle}". Your goal is to conduct a mock interview. Begin by asking the user to "Tell me about yourself." Keep your response concise and professional.`,
        nextStage: "awaiting_first_core_question",
        logUserAction: true, // Indicates if a "user started session" log is needed
      },
      awaiting_first_core_question: {
        instruction: (jobTitle) =>
          `You are an interviewer for a job titled "${jobTitle}". Based on the previous conversation and the user's last response, Start by saying “Nice to meet you users name”, then ask one relevant follow-up question. Ensure your question is typical for a job interview. Keep your response concise.`,
        generationConfig: { maxOutputTokens: 200 },
        nextStage: "asking_follow_ups",
      },
      asking_follow_ups: {
        instruction: (jobTitle) =>
          `You are an interviewer for a job titled "${jobTitle}". The candidate has just responded to your last question. Your task is to ask one relevant follow-up question. Analyze the candidate's previous response to formulate a question that probes deeper into their answer or explores a related area. Ensure your question is typical for a job interview. Keep your response concise.`,
        generationConfig: { maxOutputTokens: 200 },
        maxFollowUps: 2, // Maximum number of follow-ups allowed
        nextStage: "pre_feedback", // Default next stage after follow-ups
      },
      pre_feedback: {
        instruction: () =>
          `You are a professional job interviewer. The candidate has now completed answering all interview questions. Don't ask anymore follow up questions. Your task is to acknowledge the end of the users question phase and set the expectation for feedback. Briefly thank the user, inform them you will now provide feedback after they type yes and click the submit button. Keep your response concise.`,
        generationConfig: { maxOutputTokens: 100 },
        nextStage: "generating_feedback",
      },
      generating_feedback: {
        instruction: (jobTitle, userAnswers) =>
          `You are a professional job interviewer and performance evaluator for a ${jobTitle}. The mock interview is complete. Review the user's answers to the questions. Here are the user's collected answers: ${userAnswers
            .map((ans, idx) => `Question ${idx + 1} Answer: ${ans}`)
            .join(
              "\n- "
            )} Provide constructive feedback on their answers and overall interview performance. Keep your feedback concise and professional, keep it under 2 paragraphs.`,
        generationConfig: { maxOutputTokens: 500 },
        nextStage: "interview_complete",
      },
      interview_complete: {
        instruction: () =>
          `You are a professional job interviewer. The mock interview is now officially complete, and feedback has been provided. Your task is to offer a polite closing statement. Deliver a brief and friendly conclusion to the interview session. Keep your closing concise and professional and under 2 paragraphs.`,
        generationConfig: { maxOutputTokens: 50 },
        // No next stage as the interview is complete
      },
    };
  }

  // HELPER to send messages to the generative model
  async #sendModelMessage(instruction, history, generationConfig = {}) {
    const chat = this.model.startChat({
      history: history.map(({ role, text }) => ({
        role,
        parts: [{ text }],
      })),
      generationConfig,
    });
    // Use sendMessageStream if you want to handle streaming, otherwise sendMessage is fine
    const apiResponse = await chat.sendMessage(instruction);
    return apiResponse.response.text();
  }

  async processInterviewTurn({
    jobTitle,
    history,
    followUpCount,
    interviewStage,
    userAnswers,
  }) {
    let modelResponseText = "";
    let newInterviewStage = interviewStage;
    let newFollowUpCount = followUpCount;

    const currentStageConfig = this.interviewStages[interviewStage];

    if (!currentStageConfig) {
      console.warn(`Unknown interview stage: ${interviewStage}`);
      return {
        modelResponseText: "An error occurred.",
        newInterviewStage,
        newFollowUpCount,
      };
    }

    const instructionToAI = currentStageConfig.instruction(
      jobTitle,
      userAnswers
    );

    // Initial stage needs to send the instruction and not include userResponse as history
    if (interviewStage === "initial") {
      modelResponseText = await this.#sendModelMessage(instructionToAI, []); // No history for initial prompt
    } else if (
      interviewStage === "asking_follow_ups" &&
      newFollowUpCount >= currentStageConfig.maxFollowUps
    ) {
      // If maximum follow-ups reached, transition to next stage without sending a new message
      newInterviewStage = currentStageConfig.nextStage;
      // No model response here, as we're transitioning
      return { modelResponseText: "", newInterviewStage, newFollowUpCount };
    } else {
      modelResponseText = await this.#sendModelMessage(
        instructionToAI,
        history,
        currentStageConfig.generationConfig
      );
    }

    // Update state based on the current stage
    if (interviewStage === "initial") {
      newInterviewStage = currentStageConfig.nextStage;
      newFollowUpCount = 0;
    } else if (interviewStage === "awaiting_first_core_question") {
      newInterviewStage = currentStageConfig.nextStage;
      newFollowUpCount = 0; // Reset or ensure 0 for the start of follow-ups
    } else if (interviewStage === "asking_follow_ups") {
      newFollowUpCount++;
      if (newFollowUpCount >= currentStageConfig.maxFollowUps) {
        newInterviewStage = currentStageConfig.nextStage;
      }
    } else if (currentStageConfig.nextStage) {
      newInterviewStage = currentStageConfig.nextStage;
    }

    return { modelResponseText, newInterviewStage, newFollowUpCount };
  }
}

module.exports = GeminiAI;