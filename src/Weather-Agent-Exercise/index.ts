import { ChatGroq } from "@langchain/groq";
import "dotenv/config";
import {
  MessagesValue,
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
  type StateType,
} from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryCache } from "@langchain/langgraph-checkpoint";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Global variables
const userPrompt = "What is the weather in Abuja?";
const systemPrompt = `
  ROLE: 
  You are a weather assistant.

  TASKS:
  1) When answering weather questions, use only the information provided by the Weather Tool.
  2) Rewrite the information naturally, but you must preserve all of the following information:
  - Location
  - Condition
  - Temperature
  - Feels-like temperature
  - Chance of rain
  - Humidity
  - Wind speed and direction
  - Visibility
  - Last updated time

  RULES:
  1) Do not mention weather information that is not included in the tool response.
  2) Do not invent, calculate, infer, or add any weather information that is not provided by the Weather Tool.
  3) Your response must strictly follow the structure shown in the example. Do not include asterisks (*), bullet points, emojis, markdown, or any other unnecessary symbols. Only use the information provided and follow the exact formatting and structure of the example.

  EXAMPLE:
  The current weather in Abuja, Nigeria is a light rain shower. The temperature is 24.6°C, but it feels like 29°C. There's a 78% chance of rain, humidity is 93%, and the wind is blowing at 5.8 km/h from the east. Visibility is 10 km. The weather was last updated at 11:00 PM on September 19, 2026.
`;
const weatherUrl = (location: string) =>
  `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_API_KEY}&q=${location}&aqi=no`;

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

// Get the location's current weather data
const getCurrentWeatherData = async (location: string) => {
  if (!location) throw new Error("Please provide a location to check the weather.");
  try {
    const response = await fetch(weatherUrl(location));
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return `
      Weather in ${data.location.name}, ${data.location.country}:
      Condition: ${data.current.condition.text}
      Temperature: ${data.current.temp_c}°C (feels like ${data.current.feelslike_c}°C)
      Chance of rain: ${data.current.chance_of_rain}%
      Humidity: ${data.current.humidity}%
      Wind: ${data.current.wind_kph} km/h ${data.current.wind_dir}
      Visibility: ${data.current.vis_km} km
      Last updated: ${data.current.last_updated}
    `;
  } catch (error: unknown) {
    throw new Error(`Fetch failed: ${(error as Error).message}`);
  }
};

// Define a tool
const weatherTool = tool(
  async ({ location }) => {
    console.log("Calling tool.......");
    return await getCurrentWeatherData(location);
  },
  {
    name: "Weather_Tool",
    description: "Get the current weather information for a given location.",
    schema: z.object({
      location: z.string().describe("The location to get the current weather for."),
    }),
  },
);

// Bind the LLM with tools
const llmWithTools = llm.bindTools([weatherTool]);

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
const toolNode = new ToolNode([weatherTool]);

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

    // Create a custom cache key based on the node's input. e.g [{"type":"ai","content":"","tool_calls":[{"name":"Weather Tool","args":{"location":"Abuja"}}]}]
    keyFunc: (input) => {
      const messages = input[0].messages;
      const cacheKey = JSON.stringify(
        messages.map((message) => ({
          type: message.type,
          content: message.content,
          tool_calls: AIMessage.isInstance(message)
            ? message.tool_calls
            : undefined,
        }))
      );
      console.log(cacheKey)
      return cacheKey;
    },
  },
})
.addNode("toolNode", toolNode, {
  cachePolicy: {
    ttl: 300,
keyFunc: (input) => {
  const messages = input[0].messages;

  const lastMessage = messages.at(-1);

  const toolCall = lastMessage.tool_calls?.[0];

  return JSON.stringify({
    name: toolCall.name,
    location: toolCall.args.location,
  });
}
  },
})
  .addEdge("__start__", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue, ["toolNode", "__end__"])
  .addEdge("toolNode", "llmNode")
  .compile({ cache: new InMemoryCache() });

// Run the graph
// Test to see if the caching works by invoking the graph twice with the same user input
console.log("================= First Call =================");
console.time("First call");
try {
  const firstCall = await graph.invoke({
    messages: [new HumanMessage(userPrompt)],
  });
  console.log(firstCall.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("First call");

console.log("\n\n================= Second Call =================");
console.time("Second call");
try {
  const secondCall = await graph.invoke({
    messages: [new HumanMessage(userPrompt)],
  });
  console.log(secondCall.messages.at(-1)?.content);
} catch (error) {
  throw new Error(`Error running graph: ${(error as Error).message}`);
}
console.timeEnd("Second call");
