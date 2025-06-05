const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_API_KEY is not set in .env");
  process.exit(1);
}

class GeminiAIEX {
  // Static constant for stages where user answers shouldn't be logged to userAnswers array
  static STAGES_TO_EXCLUDE_USER_ANSWERS = [
    "initial",
    "pre_feedback",
    "generating_feedback",
    "interview_complete",
  ];

  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });
    this.chatHistories = new Map();
    this.interviewStages = {
      initial: {
        instruction: (jobTitle) =>
          `You are an interviewer for a job titled "${jobTitle}". Your goal is to conduct a mock interview. Begin by asking the user to "Tell me about yourself and why should we hire you." Keep your response concise and professional.`,
        nextStage: "awaiting_first_core_question",
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
      },
    };
  }

  async #sendModelMessage(instruction, history, generationConfig = {}) {
    const safeHistory = history.filter(
      (msg, idx) => !(idx === 0 && msg.role === "model")
    );
    const chat = this.model.startChat({
      history: safeHistory.map(({ role, text }) => ({
        role,
        parts: [{ text }],
      })),
      generationConfig,
    });
    const result = await chat.sendMessage(instruction);
    return result.response.text();
  }

  async processInterviewTurn({
    jobTitle,
    history,
    followUpCount,
    interviewStage,
    userAnswers,
  }) {
    const currentStageConfig = this.interviewStages[interviewStage];
    if (!currentStageConfig) {
      console.warn(`Unknown interview stage: ${interviewStage}`);
      return {
        modelResponseText: "An error occurred (unknown stage).",
        newInterviewStage: interviewStage,
        newFollowUpCount: followUpCount,
      };
    }

    const instructionToAI = currentStageConfig.instruction(
      jobTitle,
      userAnswers
    );
    let modelResponseText = "";

    if (
      interviewStage === "asking_follow_ups" &&
      followUpCount >= currentStageConfig.maxFollowUps
    ) {
      return {
        modelResponseText: "",
        newInterviewStage: currentStageConfig.nextStage,
        newFollowUpCount: followUpCount,
      };
    }

    modelResponseText = await this.#sendModelMessage(
      instructionToAI,
      interviewStage === "initial" ? [] : history,
      currentStageConfig.generationConfig || {}
    );

    let newInterviewStage = currentStageConfig.nextStage || interviewStage;
    let newFollowUpCount = followUpCount;

    if (
      interviewStage === "initial" ||
      interviewStage === "awaiting_first_core_question"
    ) {
      newFollowUpCount = 0;
    } else if (interviewStage === "asking_follow_ups") {
      newFollowUpCount = followUpCount + 1;
      if (newFollowUpCount >= currentStageConfig.maxFollowUps) {
        newInterviewStage = currentStageConfig.nextStage;
      } else {
        newInterviewStage = interviewStage;
      }
    }
    return { modelResponseText, newInterviewStage, newFollowUpCount };
  }

  async handle(req, res) {
    // For debugging
    // console.log("🟣 GeminiAIEX Route Hit | Session:", req.body.sessionId, "| Stage:", this.chatHistories.get(req.body.sessionId)?.interviewStage, "| User Response:", req.body.userResponse);

    const { sessionId, jobTitle, userResponse } = req.body;

    if (!sessionId || !jobTitle || userResponse === undefined) {
      return res
        .status(400)
        .json({ error: "Missing sessionId, jobTitle, or userResponse." });
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
          !GeminiAIEX.STAGES_TO_EXCLUDE_USER_ANSWERS.includes(
            session.interviewStage
          )
        ) {
          session.userAnswers.push(userResponse);
        }
      }

      // Prepare arguments for processInterviewTurn
      const turnArgs = {
        jobTitle,
        history: session.history,
        followUpCount: session.followUpCount,
        interviewStage: session.interviewStage,
        userAnswers: session.userAnswers,
      };
      const { modelResponseText, newInterviewStage, newFollowUpCount } =
        await this.processInterviewTurn(turnArgs);

      if (modelResponseText) {
        session.history.push({ role: "model", text: modelResponseText });
      }

      // Update session state directly
      session.interviewStage = newInterviewStage;
      session.followUpCount = newFollowUpCount;

      res.json({
        response: modelResponseText,
        history: session.history,
        interviewStage: newInterviewStage,
        followUpCount: newFollowUpCount,
      });
    } catch (err) {
      console.error("GeminiAIEX handle error:", err.message, err.stack); // More detailed error logging
      res.status(500).json({ error: "Failed to process interview." });
    }
  }
}

module.exports = GeminiAIEX;
