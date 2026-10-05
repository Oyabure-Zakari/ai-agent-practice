import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import "dotenv/config";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY as string,
  model: "gemini-embedding-001", // 768 dimensions
  title: "AgroNexa Policies", // The title of the document being embedded
  taskType: TaskType.RETRIEVAL_DOCUMENT, // Tells the model this information will be stored and searched later (document retrieval). This affects how the model generates the embeddings.
});

embeddings.embedQuery("What is AgroNexa's refund policy?").then((embedding) => {
  console.log("Embedding vector:", embedding);
}).catch((error: unknown) => {
  console.error(`Failed to generate embedding: ${(error as Error).message}`);
});