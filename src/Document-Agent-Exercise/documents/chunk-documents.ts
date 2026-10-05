import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const document = "This is a sample document that will be split into smaller chunks for processing. The purpose of splitting the document is to make it easier to handle and analyze, especially when dealing with large texts. Each chunk will contain a maximum of 100 characters, and there will be no overlap between chunks. This approach allows for efficient text processing and retrieval in various applications, such as natural language processing and information retrieval systems.";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100, // The maximum number of characters in each chunk. e.g 100 means each chunk will have at most 100 characters.
  chunkOverlap: 10, // Determines how much of the previous chunk that will be repeated in the next chunk. e.g 20 means 20 characters of the previous chunk will be repeated in the next chunk.
});
const texts = splitter.splitText(document);
texts.then((chunks) => {
  console.log("Chunks:", chunks);
}).catch((error: unknown) => {
  console.error(`Error splitting text: ${(error as Error).message}`);
});