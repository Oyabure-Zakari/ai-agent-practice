import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import "dotenv/config";

// Shared variables
const model = "gemini-embedding-001";
const apiKey = process.env.GOOGLE_API_KEY as string;

// Embedding Model
export const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model,
  apiKey,
  taskType: TaskType.RETRIEVAL_DOCUMENT, // Tells the model this information will be stored and searched later (document retrieval). This affects how the model generates the embeddings.
});
