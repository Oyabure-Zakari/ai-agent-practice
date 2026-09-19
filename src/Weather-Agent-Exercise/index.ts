/*
- Track the user's input e.g. "What is the weather in Abuja?"
- If the input has nothing to do with weather, allow the llm to respond normally.
- Else take the user's input and extracts the location (e.g. "Abuja") from it.
- Use the extracted location to fetch the weather data from a weather API.
- Return the weather data to the user in a readable format.
*/

import { ChatGroq } from "@langchain/groq";
import "dotenv/config";

// Set up the LLM
const weatherLLm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY || "",
  maxTokens: 1000,
  temperature: 0, // 0 means the model will be deterministic and less creative.
});

const systemPrompt = `You are a weather agent. Your task is to extract the location from the user's input and fetch the weather data for that location. If the input has nothing to do with weather, respond normally.`;

const userPrompt = "What is the weather in Abuja?";

const response = await weatherLLm.invoke([
  {
    role: "system",
    content: systemPrompt,
  },
  {
    role: "user",
    content: userPrompt,
  },
]);

console.log("Weather Agent Response: ", response.content);
