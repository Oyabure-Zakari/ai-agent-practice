import { PineconeStore } from "@langchain/pinecone";
import { embeddingModel } from "../models.js";
import { pineconeIndex } from "../lib/pinecone.js";

// Finds document chunks that are relevant to a user's question.
async function retrieveDocuments(query: string) {
  try {
    // Connect to the existing vectors without uploading documents again.
    const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, { pineconeIndex });

    // This does three things:
    // 1. Converts the user's question into a vector using the embedding model.
    // 2. Searches the Pinecone vector database for the most similar vectors to the user's question.
    // 3. Returns the document chunks that are associated with those similar vectors.
    const relevantChunks = await vectorStore.similaritySearch(query, 3);

    return relevantChunks;
  } catch (error: unknown) {
    throw new Error(`Failed to retrieve documents: ${(error as Error).message}`);
  }
}

// Test the retrieval process with a sample question.
async function userQuery() {
  try {
    const query = "Is AgroNexa liable for crop, profit, income or indirect loss.?";

    const relevantChunks = await retrieveDocuments(query);
    console.log("Relevant Chunks:", relevantChunks[0]);
  } catch (error: unknown) {
    throw new Error(`Failed to process user query: ${(error as Error).message}`);
  }
}

userQuery();
