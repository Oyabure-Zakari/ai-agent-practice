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
import { behavioralSystemPrompt, outputSystemPrompt } from "./prompts/systemPrompt.js";

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

// Define the structure required for the final answer.
const responseSchema = z.object({
  response: z.string().describe("The final answer to the user's question."),
});

// Create a tool the LLM can use to search AgroNexa's documents.
const retrieveDocumentsTool = tool(
  async ({ query }) => {
    console.log("Calling retrieve documents tool...");

    const result = await retrieveDocuments(query);

    // Return the retrieved chunks in a format the LLM can read.
    return result.relevantChunks
      .map(
        (chunk, index) =>
          `Document ${index + 1}:\n` +
          `Source: ${chunk.metadata.source}\n` +
          `Content: ${chunk.pageContent}`,
      )
      .join("\n\n");
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

// Configure the LLM to return its final answer in the required schema.
const llmWithStructuredOutput = llm.withStructuredOutput(responseSchema);

// Node 1: Let the LLM answer directly or request a tool.
const llmCall: GraphNode<typeof State> = async (state) => {
  console.log("Calling LLM...");

  const response = await llmWithTools.invoke([
    new SystemMessage(behavioralSystemPrompt),
    ...state.messages,
  ]);

  return {
    messages: [response],
  };
};

// Node 2: Execute tool calls requested by the LLM.
const toolNode = new ToolNode([retrieveDocumentsTool]);

// Route to the tool node if the LLM requests a tool.
// Otherwise, move to the structured output node.
const shouldContinue: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode" | "structuredOutputNode";
}> = (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return "structuredOutputNode";
  }

  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  return "structuredOutputNode";
};

// Node 3: Generate the final answer using structured output.
const structuredOutputNode: GraphNode<typeof State> = async (state) => {
  console.log("Generating structured final answer...");

  const result = await llmWithStructuredOutput.invoke([
    new SystemMessage(outputSystemPrompt),
    ...state.messages,
  ]);

  return {
    messages: [
      new AIMessage({
        content: result.response,
      }),
    ],
  };
};

// Build the graph.
const graph = new StateGraph(State)
  .addNode("llmNode", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("structuredOutputNode", structuredOutputNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "structuredOutputNode"])
  .addEdge("toolNode", "llmNode")
  .compile();

// Run the graph.
try {
  const aiAgentResponse = await graph.invoke(
    {
      messages: [new HumanMessage(userPrompt)], // 0 - 9 questions
    },
    { recursionLimit: 8 },
  );

  console.log({
    user: aiAgentResponse.messages[0]?.content, // User's question
    response: aiAgentResponse.messages.at(-1)?.content, // AI response
  });
} catch (error: unknown) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
