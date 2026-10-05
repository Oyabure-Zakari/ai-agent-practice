import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { loadDocuments } from "./load-documents.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // The maximum number of characters in each chunk. e.g 100 means each chunk will have at most 100 characters.
  chunkOverlap: 500, // The number of characters to overlap between chunks.  e.g 20 means 20 characters of the previous chunk will be repeated in the next chunk..
});

// Loads the documents first, then breaks their text into smaller chunks
// that can be used later for embeddings and retrieval.
export async function chunkDocuments() {
  try {
    // Get the LangChain Documents created from our Word files.
    const documents = await loadDocuments();

    // Break the documents into smaller pieces using our chunk size and overlap rules.
    const chunks = await splitter.splitDocuments(documents);

    // Return all the chunks so the next stage of the RAG pipeline can use them.
    console.log(`Chunks: ${chunks.length}`);
    console.log(`Sample chunk source: ${chunks[5]?.metadata.source}`);
    console.log(`Sample chunk content: ${chunks[5]?.pageContent}`);
    return chunks;
  } catch (error: unknown) {
    throw new Error(`Failed to chunk documents: ${(error as Error).message}`);
  }
}

chunkDocuments();
