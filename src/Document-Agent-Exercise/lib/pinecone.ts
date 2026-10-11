import "dotenv/config";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

// Set up Pinecone
export const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});
export const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
