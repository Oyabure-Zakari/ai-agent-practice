import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { Document } from "@langchain/core/documents";

// Full path to the folder that contains all the policy documents
const agronexaPoliciesFolderPath = path.resolve("src/Document-Agent-Exercise/agronexa-policies");

// Loads .docx files, extracts their text, and converts them into LangChain Documents for the RAG pipeline.
export async function loadDocuments(): Promise<Document[]> {
  try {
    // Gets the name of every file inside the folder
    // e.g ["01_AgroNexa_Company_Profile.docx", "02_AgroNexa_Product_Catalogue.docx, ..."]
    const files = await fs.readdir(agronexaPoliciesFolderPath);

    // Keep only the files that end with ".docx", because mammoth can only extract text from docx files.
    const docxFiles = files.filter((file) => file.endsWith(".docx"));

    // Creates an empty list that will hold the finished Document objects
    const documents: Document[] = [];

    // Go through each Word file one by one
    for (const file of docxFiles) {
      // Builds the full path to the current file by joining the folder path + file name
      // e.g: "src/Document-Agent-Exercise/agronexa-policies" + "01_AgroNexa_Company_Profile.docx"
      // Result → "src/Document-Agent-Exercise/agronexa-policies/01_AgroNexa_Company_Profile.docx"
      const filePath = path.join(agronexaPoliciesFolderPath, file);

      // Gets the actual Word document from its file path so mammoth can extract the text from it.
      const buffer = await fs.readFile(filePath);

      // Pulls out the plain text from the Word document
      const result = await mammoth.extractRawText({ buffer });

      // Wrap the text and the file name into a Document object
      const document = new Document({
        pageContent: result.value,
        metadata: {
          source: file,
        },
      });

      documents.push(document);
    }

    // Return the full list of documents
    return documents;
  } catch (error: unknown) {
    throw new Error(`Failed to load documents: ${(error as Error).message}`);
  }
}
