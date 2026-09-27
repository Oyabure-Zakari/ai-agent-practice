import { ChatGroq } from "@langchain/groq";
import "dotenv/config";
import {
  MessagesValue,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryCache } from "@langchain/langgraph-checkpoint";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { systemPrompt, user1Prompt, user2Prompt } from "./prompts.js";
import { todayWeatherForecast, tomorrowWeatherForecast } from "./getWeatherInfo.js";

// Define the state schema for messages i.e the conversations
const State = new StateSchema({
  messages: MessagesValue,
});

// Set up the LLM
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY as string,
  maxTokens: 1000,
  temperature: 0,
});

// Define tools
const todayWeatherTool = tool(
  async ({ location }) => {
    console.log("Calling today weather tool.......");
    return await todayWeatherForecast(location);
  },
  {
    name: "Today_Weather_Tool",
    description: "Get the current weather information for a given location.",
    schema: z.object({
      location: z.string().describe("The location to get the current weather for."),
    }),
  },
);
const tomorrowWeatherTool = tool(
  async ({ location }) => {
    console.log("Calling tomorrow weather tool.......");
    return await tomorrowWeatherForecast(location);
  },
  {
    name: "Tomorrow_Weather_Tool",
    description: "Get tomorrow's weather forecast for a given location.",
    schema: z.object({
      location: z.string().describe("The location to get tomorrow's weather forecast for."),
    }),
  },
);

// Bind the LLM with tools
const llmWithTools = llm.bindTools([todayWeatherTool, tomorrowWeatherTool]);

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
const toolNode = new ToolNode([todayWeatherTool, tomorrowWeatherTool]);

// Conditional edge function to route to the tool node or end
const shouldContinue: ConditionalEdgeRouter<{ InputSchema: typeof State; Nodes: "toolNode" }> = (
  state,
) => {
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
  .addNode("llmNode", llmCall, {
    cachePolicy: {
      ttl: 300,
      // Create a custom cache key e.g [{"type":"ai","content":"","tool_calls":[{"name":"Weather Tool","args":{"location":"Abuja"}}]}]
      keyFunc: (input) => {
        try {
          const messages = (input[0] as { messages: BaseMessage[] }).messages;
          return JSON.stringify(
            messages.map((message) => ({
              type: message.type,
              content: message.content,
              tool_calls: AIMessage.isInstance(message) ? message.tool_calls : undefined,
            })),
          );
        } catch (error: unknown) {
          throw new Error(`Error creating llm cache key: ${(error as Error).message}`);
        }
      },
    },
  })
  .addNode("toolNode", toolNode, {
    cachePolicy: {
      ttl: 300,
      // Create a custom cache key e.g {"name":"Weather Tool","location":{"location":"Abuja"}
      keyFunc: (input) => {
        try {
          const messages = (input[0] as { messages: BaseMessage[] }).messages;
          const lastMessage = messages.at(-1);
          if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
            throw new Error("There's no last message or it's not an AI message");
          }
          const toolCall = lastMessage.tool_calls?.[0];
          if (!toolCall) {
            throw new Error("There's no tool call");
          }
          return JSON.stringify({
            name: toolCall.name,
            location: toolCall.args.location,
          });
        } catch (error: unknown) {
          throw new Error(`Error creating tool cache key: ${(error as Error).message}`);
        }
      },
    },
  })
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "__end__"])
  .addEdge("toolNode", "llmNode")
  .compile({ cache: new InMemoryCache() });

// Run the graph
// Test to see if the caching works by invoking the graph twice with the same user input
console.log("================= User 1 =================");
console.time("User 1");
try {
  const aiAgentResponse = await graph.invoke({
    messages: [new HumanMessage(user1Prompt)],
  });
  console.log(aiAgentResponse.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("User 1");

console.log("================= User 1 (Cached) =================");
console.time("User 1 (Cached)");
try {
  const aiAgentResponse = await graph.invoke({
    messages: [new HumanMessage(user1Prompt)],
  });
  console.log(aiAgentResponse.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("User 1 (Cached)");

console.log("\n\n================= User 2 =================");
console.time("User 2");
try {
  const aiAgentResponse = await graph.invoke({
    messages: [new HumanMessage(user2Prompt)],
  });
  console.log(aiAgentResponse.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("User 2");

console.log("================= User 2 (Cached) =================");
console.time("User 2 (Cached)");
try {
  const aiAgentResponse = await graph.invoke({
    messages: [new HumanMessage(user2Prompt)],
  });
  console.log(aiAgentResponse.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("User 2 (Cached)");
