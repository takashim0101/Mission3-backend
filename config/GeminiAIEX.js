const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_API_KEY is not set in .env");
  process.exit(1);
}

class GeminiAIEX {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });

    // Store chat sessions in memory
    this.chatHistories = new Map();

    // Interview stages config
    this.interviewStages = {
      initial: {
        instruction: (jobTitle) =>
          `You are an interviewer for a job titled "${jobTitle}". Your goal is to conduct a mock interview. Begin by asking the user to "Tell me about yourself and why should we hire you." Keep your response concise and professional.`,
        nextStage: "awaiting_first_core_question",
        logUserAction: true,
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
        maxFollowUps: 2,
        nextStage: "pre_feedback",
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
            .join("\n- ")} Provide constructive feedback on their answers and overall interview performance. Keep your feedback concise and professional, keep it under 2 paragraphs.`,
        generationConfig: { maxOutputTokens: 500 },
        nextStage: "interview_complete",
      },
      interview_complete: {
        instruction: () =>
          `You are a professional job interviewer. The mock interview is now officially complete, and feedback has been provided. Your task is to offer a polite closing statement. Deliver a brief and friendly conclusion to the interview session. Keep your closing concise and professional and under 2 paragraphs.`,
        generationConfig: { maxOutputTokens: 50 },
      },
    };
  }

  async #sendModelMessage(instruction, history, generationConfig = {}) {
    const safeHistory = history.filter((msg, idx) => !(idx === 0 && msg.role === "model"));

const chat = this.model.startChat({
  history: safeHistory.map(({ role, text }) => ({
    role,
    parts: [{ text }],
  })),
  generationConfig,
});


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

    if (interviewStage === "initial") {
      modelResponseText = await this.#sendModelMessage(instructionToAI, []);
    } else if (
      interviewStage === "asking_follow_ups" &&
      newFollowUpCount >= currentStageConfig.maxFollowUps
    ) {
      newInterviewStage = currentStageConfig.nextStage;
      return { modelResponseText: "", newInterviewStage, newFollowUpCount };
    } else {
      modelResponseText = await this.#sendModelMessage(
        instructionToAI,
        history,
        currentStageConfig.generationConfig
      );
    }

    // Stage state management
    if (interviewStage === "initial") {
      newInterviewStage = currentStageConfig.nextStage;
      newFollowUpCount = 0;
    } else if (interviewStage === "awaiting_first_core_question") {
      newInterviewStage = currentStageConfig.nextStage;
      newFollowUpCount = 0;
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

  // 🔥 MAIN HANDLER FOR SERVER.JS 🔥
  async handle(req, res) {
  console.log("🟣 Gemini Experimental ROUTE HIT");
  console.log("BODY RECEIVED:", req.body);

  const { sessionId, jobTitle, userResponse } = req.body;

  if (!sessionId || !jobTitle || userResponse === undefined) {
    return res.status(400).json({ error: "Missing sessionId, jobTitle, or userResponse" });
  }

    try {
      let session = this.chatHistories.get(sessionId);
      if (!session) {
        session = {
          history: [],
          interviewStage: "initial",
          followUpCount: 0,
          userAnswers: [],
        };
        this.chatHistories.set(sessionId, session);
      }

      if (userResponse !== "start interview") {
        session.history.push({ role: "user", text: userResponse });

        if (
          session.interviewStage !== "initial" &&
          session.interviewStage !== "pre_feedback" &&
          session.interviewStage !== "interview_complete"
        ) {
          session.userAnswers.push(userResponse);
        }
      }

      const result = await this.processInterviewTurn({
        jobTitle,
        history: session.history,
        followUpCount: session.followUpCount,
        interviewStage: session.interviewStage,
        userAnswers: session.userAnswers,
      });

      if (result.modelResponseText) {
        session.history.push({ role: "model", text: result.modelResponseText });
      }

      session.interviewStage = result.newInterviewStage;
      session.followUpCount = result.newFollowUpCount;

      res.json({
        response: result.modelResponseText,
        history: session.history,
        interviewStage: result.newInterviewStage,
        followUpCount: result.newFollowUpCount,
      });
    } catch (err) {
      console.error("GeminiAIEX error:", err);
      res.status(500).json({ error: "Failed to process interview." });
    }
  }
}

module.exports = GeminiAIEX;
