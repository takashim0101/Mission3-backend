// C:\Level 5\Mission3_team\Mission3-backend\utils\historyManager.js
/**
 * Updates the conversation history for a given session.
 * Adds the user's latest message and the AI's response to the history map.
 * @param {string} sessionId - The unique ID of the chat session.
 * @param {Map<string, Array<Object>>} chatHistories - A Map storing all chat histories.
 * @param {string} userResponse - The user's latest message.
 * @param {string} aiResponse - The AI's response to the user.
 * @returns {Array<Object>} The updated conversation history for the session.
 */
function updateHistory(sessionId, chatHistories, userResponse, aiResponse) {
  // Get existing history or initialize an empty array if not found
  const history = chatHistories.get(sessionId) || [];

  // Always add the user message if it's provided.
  // The model can handle "start interview" as a valid user turn.
  if (userResponse !== undefined && userResponse !== null) { // Check for explicit undefined/null
    history.push({ role: "user", text: userResponse });
  }

  // Always add the model's response to the history
  history.push({ role: "model", text: aiResponse });

  // Save the updated history back to the session map
  chatHistories.set(sessionId, history);

  return history;
}

module.exports = { updateHistory };
