// === CRITICAL CHANGE 2: Robust text extraction from chunk ===
// Handle cases where chunk.text might be returned as a function
async function extractTextFromStream(apiResponse) {
  let fullResponse = "";

  for await (const chunk of apiResponse.stream) {
    if (typeof chunk.text === "function") {
      fullResponse += chunk.text(); // If .text is a function, call it
    } else if (typeof chunk.text === "string") {
      fullResponse += chunk.text; // If .text is already a string
    } else {
      // Fallback for unexpected types (log for debugging)
      console.warn(
        "Unexpected type for chunk.text:",
        typeof chunk.text,
        chunk.text
      );
      // Attempt to get text directly from candidates and parts if chunk.text is problematic
      if (
        chunk.candidates &&
        chunk.candidates.length > 0 &&
        chunk.candidates[0].content &&
        chunk.candidates[0].content.parts &&
        chunk.candidates[0].content.parts.length > 0
      ) {
        fullResponse += chunk.candidates[0].content.parts[0].text;
      }
    }
  }

  return fullResponse;
}

module.exports = { extractTextFromStream };
