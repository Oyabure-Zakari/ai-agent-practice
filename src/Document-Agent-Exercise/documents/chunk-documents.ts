import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const document = "This is a sample document that will be split into smaller chunks for processing. The RecursiveCharacterTextSplitter will help in breaking down the text into manageable pieces based on the specified chunk size and overlap. This is a sample document that will be split into smaller chunks for processing. The RecursiveCharacterTextSplitter will help in breaking down the text into manageable pieces based on the specified chunk size and overlap. This is a sample document that will be split into smaller chunks for processing. The RecursiveCharacterTextSplitter will help in breaking down the text into manageable pieces based on the specified chunk size and overlap. This is a sample document that will be split into smaller chunks for processing. The RecursiveCharacterTextSplitter will help in breaking down the text into manageable pieces based on the specified chunk size and overlap.";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,
});
const texts = splitter.splitText(document);
texts.then((chunks) => {
  console.log("Chunks:", chunks);
}).catch((error: unknown) => {
  console.error(`Error splitting text: ${(error as Error).message}`);
});