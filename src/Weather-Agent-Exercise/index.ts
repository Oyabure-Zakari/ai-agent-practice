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

// Global variables
const userPrompt = "What is the weather in Abuja?";
const systemPrompt = `
  ROLE:
  You are a weather assistant.

  TASKS:
  1) Answer weather questions using only the information provided by either the todayWeatherTool or tomorrowWeatherTool.
  2) Rewrite the weather information naturally while preserving all relevant information provided by the tools.

  TODAY'S WEATHER RESPONSE:
  When the tool provides today's weather, it may contain:
  - Location
  - Condition
  - Temperature
  - Feels-like temperature
  - Chance of rain
  - Humidity
  - Wind speed and direction
  - Visibility
  - Last updated time

  TOMORROW'S FORECAST RESPONSE:
  When the tool provides tomorrow's forecast, it may contain:
  - Location
  - Date
  - Condition
  - Maximum temperature
  - Minimum temperature
  - Chance of rain
  - Humidity
  - Maximum wind speed

  RULES:
  1) Do not mention weather information that is not included in the tool response.
  2) Do not invent, calculate, infer, or add any weather information.
  3) If a field is not provided by the tool, do not mention it.
  4) Use the appropriate wording based on whether the information is for the today's weather or tomorrow's forecast.
  5) Do not include asterisks (*), bullet points, emojis, markdown, or unnecessary symbols.
  6) Answer naturally and clearly using only the information provided by the Weather Tool.

  EXAMPLES:
  TODAY'S WEATHER:
  The current weather in Abuja, Nigeria is a light rain shower. The temperature is 24.6°C, but it feels like 29°C. There's a 78% chance of rain, humidity is 93%, and the wind is blowing at 5.8 km/h from the east. Visibility is 10 km. The weather was last updated at 11:00 PM on September 19, 2026.

  TOMORROW'S FORECAST:
  Tomorrow's weather forecast for Abuja, Nigeria is foggy. The temperature will range from 20.4°C to 24.9°C, with an 89% chance of rain. Humidity will be around 93%, and the maximum wind speed will be 6.8 km/h.
`;
const todayWeatherUrl = (location: string) =>
  `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_API_KEY}&q=${location}&aqi=no`;
const tomorrowWeatherUrl = (location: string) =>
  `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHERAPI_API_KEY}&q=${encodeURIComponent(location)}&days=2&aqi=no&alerts=yes`;

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
const todayWeatherForecast = async (location: string) => {
  if (!location) throw new Error("Please provide a location to check the weather.");
  try {
    const response = await fetch(todayWeatherUrl(location));
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
    throw new Error(`Failed to fetch current weather: ${(error as Error).message}`);
  }
};

// Get tomorrow's weather forecast for a location
const tomorrowWeatherForecast = async (location: string) => {
  if (!location) throw new Error("Please provide a location to check the weather.");
  try {
    const response = await fetch(tomorrowWeatherUrl(location));
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const tomorrow = data.forecast.forecastday[1];
    return `
      Weather forecast for ${data.location.name}, ${data.location.country}:
      Date: ${tomorrow.date}
      Condition: ${tomorrow.day.condition.text}
      Maximum temperature: ${tomorrow.day.maxtemp_c}°C
      Minimum temperature: ${tomorrow.day.mintemp_c}°C
      Chance of rain: ${tomorrow.day.daily_chance_of_rain}%
      Humidity: ${tomorrow.day.avghumidity}%
      Maximum wind: ${tomorrow.day.maxwind_kph} km/h
    `;
  } catch (error: unknown) {
    throw new Error(`Failed to fetch weather forecast: ${(error as Error).message}`);
  }
};

// Define tools
const todayWeatherTool = tool(
  async ({ location }) => {
    console.log("Calling tool.......");
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
