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
import systemPrompt from "./prompts/systemPrompt.js";
import userPrompt from "./prompts/userPrompt.js";

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

// Define tools
// Gives the AI a tool it can call to search AgroNexa's documents.
export const retrieveDocumentsTool = tool(
  async ({ query }) => {
    console.log("Calling retrieve document tool.......");
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

// Nodes
// This node calls the llm which decides whether to call a tool or not.
const llmCall: GraphNode<typeof State> = async (state) => {
  console.log("Calling LLm.......");
  const response = await llmWithTools.invoke([new SystemMessage(systemPrompt), ...state.messages]);
  return {
    messages: [response],
  };
};
// This is used to call the tools and return the results.
const toolNode = new ToolNode([retrieveDocumentsTool]);

// Conditional edge function to route to the tool node or end
const shouldContinue: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const messages = state.messages;
  const lastMessage = messages.at(-1);
  // This check makes sure the last message exists and is an AIMessage before checking for tool calls.
  // If it's not included, the code could try to access tool_calls on a missing or non-AI message, which can cause errors.
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return "__end__";
  }
  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
};

// Build the graph
const graph = new StateGraph(State)
  .addNode("llmNode", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "__end__"])
  .addEdge("toolNode", "llmNode")
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
