import { chunkDocuments } from "./chunk-documents.js";
import { embeddingModel } from "../models.js";

// Creates embeddings from all the document chunks.
export async function embedDocuments() {
  try {
    // Get the chunks so we can keep their text and metadata for the next step.
    const chunks = await chunkDocuments();

    // Keep only the text because the embedding model accepts an array of strings.
    const documentChunks = chunks.map((chunk) => chunk.pageContent);

    // Turn each piece of text into a vector of numbers.
    const vectors = await embeddingModel.embedDocuments(documentChunks);

    // Return both so each vector stays connected to its original chunk and metadata. 
    // e.g { chunk: { pageContent: "text", metadata: { source: "file.docx" } }, vector: [0.1, 0.2, 0.3] }
    return { chunks, vectors };
  } catch (error: unknown) {
    throw new Error(`Failed to embed documents: ${(error as Error).message}`);
  }
}
