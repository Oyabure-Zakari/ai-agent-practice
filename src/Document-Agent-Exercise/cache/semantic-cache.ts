import { PineconeStore } from "@langchain/pinecone";
import { embeddingModel } from "../models.js";
import { pineconeIndex } from "../lib/pinecone.js";
import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// Namespace is a concept from Pinecone that allows us to store data in different groups.
// In this case, we are storing the cached answers in a different group from the AgroNexa documents.
const CACHE_NAMESPACE = "agronexa-semantic-cache";

// This is the minimum similarity score we will accept.
// The higher the score, the more likely it is that the cached answer is relevant to the user's question.
const SIMILARITY_THRESHOLD = 0.85;

// Configure the embedding LLM to use semantic similarity as the task type.
const embeddingLLM = new GoogleGenerativeAIEmbeddings({
  ...embeddingModel,
  taskType: TaskType.SEMANTIC_SIMILARITY,
});

// Connects to the cache store.
async function getCacheStore() {
  return PineconeStore.fromExistingIndex(embeddingLLM, {
    pineconeIndex,
    namespace: CACHE_NAMESPACE,
  });
}

// Saves the user's question and the AI answer in Pinecone.
export async function saveQuestionAndAnswer(query: string, answer: string) {
  try {
    // Connects to the cache store.
    const store = await getCacheStore();

    // Create a document with the user's question and the AI answer.
    const cachedDocument = {
      pageContent: query, // The user's question
      // Extra information stored alongside the question.
      metadata: {
        answer, // The AI answer
        cachedAt: new Date().toISOString(), // The date and time the answer was saved
      },
    };

    // Save the question and its metadata in Pinecone.
    await store.addDocuments([cachedDocument]);
  } catch (error: unknown) {
    throw new Error(`Error saving cached document: ${(error as Error).message}`);
  }
}

// Finds a cached answer that is similar enough to the user's question.
export async function findCachedAnswer(query: string) {
  try {
    // Connects to the cache store.
    const store = await getCacheStore();

    // Find the single most similar saved question and its similarity score.
    const matchingQuestions = await store.similaritySearchWithScore(query, 1);

    // If no saved question was found, then it is a cache miss.
    if (matchingQuestions.length === 0) return null;

    // Extract the matching saved question and its similarity score.
    const [matchedQuestion, similarityScore] = matchingQuestions[0]!;

    // If the match is not similar enough, don't reuse its answer.
    if (similarityScore < SIMILARITY_THRESHOLD) return null;

    // Retrieve the AI answer saved alongside the matching question.
    const cachedAnswer = matchedQuestion.metadata.answer;

    if (typeof cachedAnswer !== "string") throw new Error("Cached answer is not a string.");

    return cachedAnswer;
  } catch (error: unknown) {
    throw new Error(`Error finding cached answer: ${(error as Error).message}`);
  }
}
