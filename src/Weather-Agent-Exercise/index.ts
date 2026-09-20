import { ChatGroq } from "@langchain/groq";
import "dotenv/config";
import { MessagesValue, StateSchema } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

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
    console.log(data);
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

// Invoke the LLM with input that triggers the tool call
const msg = await llmWithTools.invoke("What is the weather in Toronto?");

// Get the tool call
console.log(msg.tool_calls);
