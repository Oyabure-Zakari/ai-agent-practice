import { ChatGroq } from '@langchain/groq';
import 'dotenv/config';


console.log(process.env.GROQ_API_KEY);

// Initialize the LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY || "",
  model: "compound-beta",
  temperature: 0.7,
  maxTokens: 1000,
});

// Run the LLM
const result = await llm.invoke('What is the capital of France?');
console.log(result.content);