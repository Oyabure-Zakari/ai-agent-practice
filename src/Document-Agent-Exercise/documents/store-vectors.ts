import "dotenv/config";
import { PineconeStore } from "@langchain/pinecone";
import { embeddingModel } from "../models.js";
import { chunkDocuments } from "./chunk-documents.js";
import { pineconeIndex } from "../lib/pinecone.js";

// This function gets the chunks, converts them to vectors using the embedding model, and stores them in the Pinecone vector database.
async function storeChunks() {
  try {
    // Get chunks
    const chunks = await chunkDocuments();

    // Gives each chunk a unique, fixed stable ID so running the code again doesn't create duplicat documents in Pinecone Vector DB. e.g 01_AgroNexa_Company_Profile.docx-1
    const ids = chunks.map((chunk, i) => `${chunk.metadata.source}-${i}`);

    // Set up Pinecone vectore database
    const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
      pineconeIndex,
      // Maximum number of batch requests to allow at once, each batch is 1000 vectors. Instead of sending 5,000 vectors in one request, it will send 5 requests of 1000 vectors each. This is to avoid overloading the Pinecone API and getting rate limited.
      maxConcurrency: 5,
    });

    // This turns each chunk into an embedding and uploads it to Pinecone
    await vectorStore.addDocuments(chunks, { ids });
  } catch (error: unknown) {
    throw new Error(`Failed to store vectors: ${(error as Error).message}`);
  }
}
