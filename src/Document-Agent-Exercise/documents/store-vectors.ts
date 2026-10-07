import "dotenv/config";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { embeddingModel } from "../models.js";
import type { Document } from "@langchain/core/documents";

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
  pineconeIndex,
  // Maximum number of batch requests to allow at once, each batch is 1000 vectors. Instead of sending 5,000 vectors in one request, it will send 5 requests of 1000 vectors each. This is to avoid overloading the Pinecone API and getting rate limited.
  maxConcurrency: 5,
});

const document1: Document = {
  pageContent: "The powerhouse of the cell is the mitochondria",
  metadata: { source: "https://example.com" }
};

const document2: Document = {
  pageContent: "Buildings are made out of brick",
  metadata: { source: "https://example.com" }
};

const document3: Document = {
  pageContent: "Mitochondria are made out of lipids",
  metadata: { source: "https://example.com" }
};

const document4: Document = {
  pageContent: "The 2024 Olympics are in Paris",
  metadata: { source: "https://example.com" }
}

const documents = [document1, document2, document3, document4];

const storeVectors = async (documents: Document[]) => {
  try {
    // Gives each document a unique, fixed ID so running the code again doesn't create duplicate documents in Pinecone Vector DB.
    const result = await vectorStore.addDocuments(documents, { ids: ["1", "2", "3", "4"] }); 
    console.log(`Successfully stored ${result.length} vectors in Pinecone.`);
  } catch (error: unknown) {
    throw new Error(`Failed to store vectors: ${(error as Error).message}`);
  }
};

storeVectors(documents);
