import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import "dotenv/config";
import { chunkDocuments } from "./chunk-documents.js";

const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY as string,
  taskType: TaskType.RETRIEVAL_DOCUMENT, // Tells the model this information will be stored and searched later (document retrieval). This affects how the model generates the embeddings.
});

// Creates embeddings from all the document chunks.
export async function embedDocuments() {
  try {
    // Get the chunks and keep only the text we want to turn into embeddings, because chunkDocuments()
    // returns LangChain Document objects, but embedDocuments() only accepts an array of strings.
    const documentChunks = (await chunkDocuments()).map((chunk) => chunk.pageContent);

    // Turns each piece of text into a vector of numbers.
    const vectors = await embeddingModel.embedDocuments(documentChunks);

    // Return the vectors for the next step in the RAG pipeline.
    return vectors;
  } catch (error: unknown) {
    throw new Error(`Failed to embed documents: ${(error as Error).message}`);
  }
}
