import { ChatGroq } from "@langchain/groq";
import "dotenv/config";
import { MessagesValue, StateGraph, StateSchema, type GraphNode } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryCache } from "@langchain/langgraph-checkpoint";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Global variables
const userPrompt = "How is the weather in Abuja?";
const systemPrompt = `
  You are a weather agent that can answer weather-related questions.
  For example, the user should be able to ask: 
  What's the weather in Abuja?

  Your response, should be something like this:
  The weather in Abuja is currently sunny.
`;
const weatherUrl = (location: string) =>
  `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_API_KEY}&q=${location}&aqi=no`;

// Define the state schema for messages i.e the conversations
const State = new StateSchema({
  messages: MessagesValue, // An array of messages btw the user and the agent
  /* e.g [
    {role: "user", content: "How are you doing, today?"}, 
    {role: "assistant", content: "I am doing fine."},
    {role: "user", content: "How is the weather in Abuja?"}, 
    {role: "assistant", content: "The weather in Abuja is currently sunny."}
  ]
  */
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
  const response = await llmWithTools.invoke([new SystemMessage(systemPrompt), ...state.messages]);
  return {
    messages: [response],
  };
};
// The tool node is used to call the tools and return the results.
const toolNode = new ToolNode([weatherTool]);

// Build the graph
const graph = new StateGraph(State)
  .addNode("llmNode", llmCall, { cachePolicy: { ttl: 300 } })
  .addNode("toolNode", toolNode, { cachePolicy: { ttl: 300 } })
  .addEdge("__start__", "llmNode")
  .addEdge("llmNode", "toolNode")
  .compile({ cache: new InMemoryCache() });

// Run the graph
const response = await graph.invoke({
  messages: [new HumanMessage(userPrompt)],
});

console.log(response.messages[2]?.content);
