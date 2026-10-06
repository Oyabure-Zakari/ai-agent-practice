import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import "dotenv/config";
import { chunkDocuments } from "./chunk-documents.js";

const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY as string,
  taskType: TaskType.RETRIEVAL_DOCUMENT, // Tells the model this information will be stored and searched later (document retrieval). This affects how the model generates the embeddings.
});

export async function embedDocuments() {
  try {
    const vectors = await embeddingModel.embedDocuments(["Hello world", "Bye bye"]);
    console.log(vectors);
    // return vectors;
  } catch (error: unknown) {
    throw new Error(`Failed to embed documents: ${(error as Error).message}`);
  }
}

embedDocuments();
