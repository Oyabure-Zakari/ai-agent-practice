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

// Run the graph.
try {
  const aiAgentResponse = await graph.invoke(
    {
      messages: [new HumanMessage(userPrompt)], // 0 - 9 questions
    },
    { recursionLimit: 5 },
  );
  // Log both the user's question and AI reponse
  console.log({
    user: aiAgentResponse.messages[0]?.content, // User's question
    response: aiAgentResponse.messages.at(-1)?.content, // AI response
  });
} catch (error: unknown) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
