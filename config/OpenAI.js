class OpenAI {
  constructor(openai) {
    this.openai = openai;
  }

  async handle(req, res) {
    
  console.log("🔵 OpenAI ROUTE HIT");
  console.log("BODY RECEIVED:", req.body);

  const { jobTitle, userResponse } = req.body;

  if (!jobTitle || !userResponse) {
    console.error("Error: 'jobTitle' or 'userResponse' is missing in the request body.");
    return res.status(400).json({ error: "Job title and user response are required." });
  }

  const prompt = `Your first question will ask about favourite colour. Ask a question based on the user's previous input: "${userResponse}".`;

  try {
    const chatResponse = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const reply = chatResponse.choices[0].message.content;
    res.json({ response: reply });
  } catch (error) {
    console.error("ChatGPT error:", error);
    res.status(500).json({ error: "Failed to get ChatGPT response." });
  }
}

}

module.exports = OpenAI;