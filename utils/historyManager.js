// Adds the user's and AI's latest messages to the conversation history
function updateHistory(sessionId, chatHistories, userResponse, aiResponse) {
  const history = chatHistories.get(sessionId) || [];

  // Only add user message if it isn't the initial trigger
  if (userResponse && userResponse !== "start interview") {
    history.push({ role: "user", text: userResponse });
  }

  // Always add the model's response
  history.push({ role: "model", text: aiResponse });

  // Save updated history back to the session
  chatHistories.set(sessionId, history);

  return history;
}

module.exports = { updateHistory };
