// List of questions
const questions = [
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

// Randomly get the index/position of a question
const questionIndex = Math.floor(Math.random() * questions.length);

// Grabs the question based on it's index
const userPrompt = questions[questionIndex];
export default userPrompt;