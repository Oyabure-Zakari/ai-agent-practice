import "dotenv/config";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { embeddingModel } from "../models.js";

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
  pineconeIndex,
  // Maximum number of batch requests to allow at once, each batch is 1000 vectors. Instead of sending 5,000 vectors in one request, it will send 5 requests of 1000 vectors each. This is to avoid overloading the Pinecone API and getting rate limited.
  maxConcurrency: 5,
});
