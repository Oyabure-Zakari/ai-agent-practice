// List of messages that a user might ask about AgroNexa's products, services, policies, and procedures. These questions are used to test the document retrieval and response generation capabilities of the system.
const messages = [
  "What products does the company sell?",
  "What fertilizer sizes are available?",
  "What is the company's return policy?",
  "How long does delivery take?",
  "What conditions apply to bulk orders?",
  "Which fertilizer products are available in 50kg bags, and what are their delivery conditions?",
  "What fertilizer products are available and what are the return conditions for those products?",
  "Who is the president of Nigeria?",
  "What is the weather in Abuja?",
  "Who won the 2026 World Cup?",
];

// Randomly select a question from the list to simulate a user asking a question.
const messageIndex = Math.floor(Math.random() * messages.length);

// Use the selected question
const userMessage = messages[messageIndex];

// Export the user's question
export default userMessage;
