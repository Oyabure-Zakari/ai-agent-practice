# AI Agent Practice 🤖

A hands-on TypeScript project for learning how to build AI agents with LangChain, LangGraph, and Groq. Each exercise is a runnable example of an agentic workflow.

## Exercises

### Joke Improver Agent

`src/Joke-Improver-Agent-Exercise/` contains an agent that evaluates a joke, improves it when necessary, and evaluates the revised version again. It uses a LangGraph feedback loop, structured LLM output, and an in-memory cache.

### Weather Agent

`src/Weather-Agent-Exercise/` contains a weather assistant that lets the LLM choose between tools for current conditions and tomorrow's forecast. It uses [WeatherAPI](https://www.weatherapi.com/) for weather data, LangGraph's `ToolNode` for tool execution, and in-memory caching for LLM and tool calls.

## Prerequisites

* Node.js 18 or later
* npm
* A Groq API key
* A WeatherAPI key for the Weather Agent exercise

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
WEATHERAPI_API_KEY=your_weatherapi_key
```

`GROQ_API_KEY` is required by both exercises. `WEATHERAPI_API_KEY` is required only by the Weather Agent.

## Run an Exercise

Run the Joke Improver Agent:

```bash
npm run dev -- src/Joke-Improver-Agent-Exercise/index.ts
```

Run the Weather Agent:

```bash
npm run dev -- src/Weather-Agent-Exercise/index.ts
```

Type-check the project:

```bash
npm run build
```

## Project Structure

```text
ai-agent-practice/
├── src/
│   ├── Joke-Improver-Agent-Exercise/
│   │   ├── index.ts                 # Joke evaluation and improvement graph
│   │   └── instruction.md           # Exercise requirements and guidance
│   └── Weather-Agent-Exercise/
│       ├── getWeatherInfo.ts        # WeatherAPI request helpers
│       ├── index.ts                 # Tool-calling weather-agent graph
│       ├── instruction.md           # Exercise requirements and guidance
│       ├── prompts.ts               # System and sample user prompts
│       └── urls.ts                  # WeatherAPI URL builders
├── .env                             
├── .gitignore                       
├── package.json                     
├── package-lock.json                
├── tsconfig.json                    
└── README.md                        
```

Generated or local-only directories such as `node_modules/` and `dist/` are intentionally excluded from version control.

## Tech Stack

* [LangGraph](https://langchain-ai.github.io/langgraphjs/) for stateful agent workflows
* [LangChain](https://js.langchain.com/) for LLM integrations and tools
* [Groq](https://console.groq.com/docs) for language-model inference
* [WeatherAPI](https://www.weatherapi.com/) for weather data
* TypeScript and `tsx` for development and execution

## Notes

* The examples use Groq's `openai/gpt-oss-120b` model.
* Both exercises run sample requests defined directly in their `index.ts` files.
* Read each exercise's `instruction.md` before modifying its implementation.

## License

ISC
