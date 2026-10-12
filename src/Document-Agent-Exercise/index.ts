import { ChatGroq } from "@langchain/groq";
import { MessagesValue, StateSchema } from "@langchain/langgraph";
import { resolve } from "dns";
import "dotenv/config";

// Define the state schema for messages i.e the conversations
const State = new StateSchema({
  messages: MessagesValue,
});

// Set up the LLM
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY as string,
  maxTokens: 1000,
  temperature: 0,
});

// Define tools