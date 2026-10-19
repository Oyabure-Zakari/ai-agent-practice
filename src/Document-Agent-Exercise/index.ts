import { tool } from "@langchain/core/tools";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import {
  MessagesValue,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import "dotenv/config";
import * as z from "zod";
import { retrieveDocuments } from "./documents/retrieve-documents.js";
import userPrompt from "./prompts/userPrompt.js";
import { systemPrompt } from "./prompts/systemPrompt.js";
import { findCachedAnswer, saveQuestionAndAnswer } from "./cache/semantic-cache.js";

// Set up the LLM.
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY as string,
  maxTokens: 1000,
  temperature: 0,
});

// Define the graph state to hold the conversation messages.
const State = new StateSchema({
  messages: MessagesValue,
});

// Create a tool the LLM can use to search AgroNexa's documents.
const retrieveDocumentsTool = tool(
  async ({ query }) => {
    console.log("Calling retrieve documents tool...");
    return await retrieveDocuments(query);
  },
  {
    name: "retrieve_documents_tool",
    description:
      "Search AgroNexa's official documents for information about its company, products, fertilizer formulations, policies, services, and operations. Use this tool whenever a question requires AgroNexa-specific information. Provide a clear search query.",
    schema: z.object({
      query: z.string().describe("The question or topic to search for in AgroNexa's documents."),
    }),
  },
);

// Give the LLM access to the retrieval tool.
const llmWithTools = llm.bindTools([retrieveDocumentsTool]);

// Create Nodes
// Node 1: This node calls the llm which decides whether to call a tool or not.
const llmCall: GraphNode<typeof State> = async (state) => {
  console.log("Calling LLM...");
  const response = await llmWithTools.invoke([new SystemMessage(systemPrompt), ...state.messages]);
  return {
    messages: [response],
  };
};
// Node 2: This is used to call the tools and return the results.
const toolNode = new ToolNode([retrieveDocumentsTool]);

// Route to the tool node if the LLM requests a tool, otherwise, end the workfloe.
const shouldContinue: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode" | "__end__";
}> = (state) => {
  const lastMessage = state.messages.at(-1);
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) return "__end__";
  if (lastMessage.tool_calls?.length) return "toolNode";
  return "__end__";
};

// Build the graph.
const graph = new StateGraph(State)
  .addNode("llmNode", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "__end__"])
  .addEdge("toolNode", "llmNode")
  .compile();

// Checks if we already have an answer saved for a similar question If we do, return it. Otherwise, ask the AI to generate an answer and save it for future use.
async function runAgentWithCache(query: string) {
  // Use the incoming user query to search Pinecone for a similar question that was previously stored in the semantic cache and return its answer.
  try {
    const cachedAnswer = await findCachedAnswer(query);
    if (cachedAnswer !== null) {
      console.log("SEMANTIC CACHE HIT");
      console.log("Skipping the LangGraph workflow.");
      // Return the user query and the cached answer.
      return {
        userQuery: query,
        answer: cachedAnswer,
      };
    }
  } catch (error: unknown) {
    // If Pinecone/cache lookup fails, still try to answer the user.
    console.error(`Cache lookup failed: ${(error as Error).message}`);
    console.log("Continuing without cache.");
  }

  console.log("SEMANTIC CACHE MISS");
  console.log("Starting the LangGraph workflow...");
  // Run the LangGraph workflow because no cached answer was available.
  const result = await graph.invoke(
    {
      messages: [new HumanMessage(query)],
    },
    {
      recursionLimit: 5,
    },
  );

  // Extract the AI response.
  const generatedAnswer = result.messages.at(-1)?.content;

  if (typeof generatedAnswer !== "string") {
    throw new Error("The graph did not return a text response.");
  }

  // Save the incoming question and its newly generated answer in Pinecone. Later, a similar incoming question can find this stored question and reuse its answer without running the agent again.
  try {
    await saveQuestionAndAnswer(query, generatedAnswer);
  } catch (error: unknown) {
    // A cache write failure should not discard a valid answer.
    console.error(`Cache save failed: ${(error as Error).message}`);
  }
  // Return the user query and the un-cached answer.
  return {
    userQuery: query,
    answer: generatedAnswer,
  };
}

// Run the agent
try {
  const response = await runAgentWithCache(userPrompt);
  console.log({
    user: response.userQuery,
    response: response.answer,
  });
} catch (error: unknown) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
