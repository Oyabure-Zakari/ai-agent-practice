import { tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import {
  MessagesValue,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import "dotenv/config";
import * as z from "zod";
import { retrieveDocuments } from "./documents/retrieve-documents.js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import userPrompt from "./prompts/userPrompt.js";
import { behavioralSystemPrompt, outputSystemPrompt } from "./prompts/systemPrompt.js";

// Set up the LLM
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY as string,
  maxTokens: 1000,
  temperature: 0,
});

// Define the state schema for messages i.e the conversations
const State = new StateSchema({
  messages: MessagesValue,
});

// Define the structure required for the final answer.
const responseSchema = z.object({
  response: z.string().describe("The final answer to the user's question."),
});

// Define tools
// Gives the AI a tool it can call to search AgroNexa's documents.
export const retrieveDocumentsTool = tool(
  async ({ query }) => {
    console.log("Calling retrieve document tool...");
    return await retrieveDocuments(query);
  },
  {
    name: "retrieve_documents_tool",
    description:
      "Search AgroNexa's official documents for information about its company, products, fertilizer formulations, policies, services, and operations. Use this tool whenever a question requires AgroNexa-specific information. Input a clear search query describing the information needed.",
    schema: z.object({
      query: z.string().describe("The question or topic to search for in AgroNexa's documents."),
    }),
  },
);

// Bind the LLM with tools
const llmWithTools = llm.bindTools([retrieveDocumentsTool]);

// Configure the LLM to return its final answer in the required schema.
const llmWithStructuredOutput = llm.withStructuredOutput(responseSchema);

// Nodes
// 1. This node calls the llm which decides whether to call a tool or not.
const llmCallNode: GraphNode<typeof State> = async (state) => {
  console.log("Calling LLm...");
  const response = await llmWithTools.invoke([
    new SystemMessage(behavioralSystemPrompt),
    ...state.messages,
  ]);
  return {
    messages: [response],
  };
};

// 2. This is used to call the tools and return the results.
const toolNode = new ToolNode([retrieveDocumentsTool]);

// 3. This node calls the llm which decides whether to call a tool or not.
const structuredOutputNode: GraphNode<typeof State> = async (state) => {
  console.log("Generating structured final answer...");
  const { response } = await llmWithStructuredOutput.invoke([
    new SystemMessage(outputSystemPrompt),
    ...state.messages,
  ]);
  return {
    messages: [
      new AIMessage({
        content: response,
      }),
    ],
  };
};

// Conditional edge function to route to the tool node or end
const shouldContinue: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode" | "structuredOutputNode";
}> = (state) => {
  const messages = state.messages;
  const lastMessage = messages.at(-1);
  // This check makes sure the last message exists and is an AIMessage before checking for tool calls.
  // If it's not included, the code could try to access tool_calls on a missing or non-AI message, which can cause errors.
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return "structuredOutputNode";
  }
  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }
  // Otherwise, we stop (reply to the user)
  return "structuredOutputNode";
};

// Build the graph
const graph = new StateGraph(State)
  .addNode("llmNode", llmCallNode)
  .addNode("toolNode", toolNode)
  .addNode("structuredOutputNode", structuredOutputNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "structuredOutputNode"])
  .addEdge("toolNode", "llmNode")
  .addEdge("structuredOutputNode", "__end__")
  .compile();

// Run the graph
try {
  const aiAgentResponse = await graph.invoke({
    messages: [new HumanMessage(userPrompt)],
  });
  // Log the user's message and the AI-Agent response
  console.log({
    user: userPrompt,
    response: aiAgentResponse.messages.at(-1)?.content,
  });
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
