# Exercise: Weather Agent

## Objective

Build an AI agent that can answer weather-related questions by using a **weather tool**.

For example, the user should be able to ask:

```text
"What's the weather in Abuja?"
```

The LLM should determine whether it needs weather information. If weather data is required, it should call the weather tool, receive the result, and then use that information to provide a final answer.

---

## Agent Workflow

```text
                     ┌──────────────┐
                     │     User     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │     LLM      │
                     └──────┬───────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ Need weather data? │
                  └─────────┬──────────┘
                            │
                       YES  │
                            ▼
                    ┌───────────────┐
                    │ Weather Tool  │
                    └───────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │     LLM      │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Answer    │
                     └──────────────┘
```

---

## What You Will Learn

By completing this exercise, you should understand:

* Tools
* Tool definitions
* Tool calling
* Tool arguments
* `ToolNode`
* `toolsCondition`
* Conditional edges
* Tool → LLM loops
* Environment variables
* API requests
* Working with external APIs
* Passing tool results back to the LLM
* Basic agent architecture

---

## Example Interaction

### User

```text
What's the weather in Abuja?
```

### Agent

The LLM determines that it needs current weather information.

```text
LLM
 ↓
Weather Tool
```

The weather tool receives:

```json
{
  "city": "Abuja"
}
```

The tool calls a weather API and returns information such as:

```json
{
  "city": "Abuja",
  "temperature": 27,
  "condition": "Partly cloudy",
  "humidity": 65
}
```

The result is then passed back to the LLM.

The LLM produces the final response:

```text
The current weather in Abuja is 27°C and partly cloudy,
with humidity around 65%.
```

---

# Requirements

Your agent should contain at least the following components.

## 1. User Input

The agent should accept a natural-language question.

Example:

```text
"What's the weather in Abuja?"
```

It should also be able to handle different cities.

For example:

```text
"What's the weather in Lagos?"
```

or:

```text
"How hot is Kano today?"
```

The city should **not** be hardcoded into the agent.

---

## 2. Weather Tool

Create a tool that retrieves weather information from a weather API.

The tool should accept a city as an argument.

Conceptually:

```text
weather(city)
```

Example:

```json
{
  "city": "Abuja"
}
```

The tool should then make an API request and return the weather information.

---

## 3. Weather API

Use an external weather API to retrieve current weather data.

Your API key should be stored in an environment variable.

Example:

```env
WEATHER_API_KEY=your_api_key
```

Do **not** hardcode your API key inside your TypeScript files.

For example, avoid:

```typescript
const API_KEY = "abc123secret";
```

Instead, load it from the environment:

```typescript
process.env.WEATHER_API_KEY
```

---

## 4. LLM

The LLM should be given access to the weather tool.

The LLM's job is to determine:

```text
Does this request require weather information?
```

For example:

### Weather question

```text
"What's the weather in Abuja?"
```

The LLM should call:

```text
Weather Tool
```

### Non-weather question

```text
"What is the capital of Nigeria?"
```

The LLM should be able to answer without calling the weather tool.

---

## 5. Tool Calling

The LLM should decide when to call the weather tool.

Conceptually:

```text
User
 ↓
LLM
 ↓
Does the LLM want to call a tool?
       │
    ┌──┴───┐
    │      │
   YES     NO
    │       │
    ▼       ▼
ToolNode   END
    │
    ▼
Tool Result
    │
    ▼
LLM
    │
    ▼
  Answer
```

---

# LangGraph Structure

Your graph should conceptually look like this:

```text
START
  │
  ▼
  LLM
  │
  ▼
toolsCondition
  │
  ├──────── No tool call ──────────► END
  │
  │ Tool call required
  ▼
ToolNode
  │
  ▼
  LLM
  │
  ▼
toolsCondition
  │
  ├──────── No tool call ──────────► END
  │
  └──────── Tool call ─────────────► ToolNode
```

The important idea is that the **LLM and tools form a loop**.

```text
LLM
 ↓
Tool
 ↓
LLM
 ↓
Answer
```

The second LLM call is important because the LLM needs to see the tool's result before generating the final response.

---

# Tool → LLM Loop

Understand this workflow carefully.

Suppose the user asks:

```text
What's the weather in Abuja?
```

### Step 1 — User message

```text
User
 ↓
"What's the weather in Abuja?"
```

### Step 2 — LLM decides

The LLM recognizes that it needs current weather information.

It generates a tool call:

```text
weather({
  city: "Abuja"
})
```

### Step 3 — Tool executes

The `ToolNode` executes the weather tool.

```text
Weather API
 ↓
27°C
Partly cloudy
65% humidity
```

### Step 4 — Result goes back to LLM

```text
Weather Tool
 ↓
Tool Result
 ↓
LLM
```

### Step 5 — LLM answers

The LLM uses the weather information to construct a natural-language response.

```text
The weather in Abuja is currently 27°C and partly cloudy,
with humidity around 65%.
```

---

# Required LangGraph Components

Your implementation should use the appropriate LangGraph components for this workflow.

You should investigate and use:

### State

Your state needs to keep track of the conversation messages.

Think about:

```text
What information does the graph need to pass
between the LLM and the tool?
```

Hint:

The agent needs to preserve messages such as:

```text
HumanMessage
AIMessage
ToolMessage
```

---

### LLM Node

Create a node responsible for calling the LLM.

Conceptually:

```text
async function callModel(state) {
    // Call the LLM
}
```

The LLM should have access to the weather tool.

---

### Weather Tool

Create a tool that:

1. Receives the city.
2. Gets the API key from the environment.
3. Calls the weather API.
4. Processes the response.
5. Returns the weather information.

---

### ToolNode

Use LangGraph's `ToolNode` to execute tool calls generated by the LLM.

Conceptually:

```text
LLM
 ↓
Tool call
 ↓
ToolNode
 ↓
Weather Tool
```

---

### toolsCondition

Use `toolsCondition` to determine what should happen after the LLM runs.

Conceptually:

```text
LLM
 │
 ▼
toolsCondition
 │
 ├── Tool call exists → ToolNode
 │
 └── No tool call → END
```

---


# Environment Variables

Create a `.env` file:

```env
WEATHER_API_KEY=your_api_key
```

Make sure `.env` is included in `.gitignore`.

Example:

```gitignore
node_modules/
.env
dist/
```

Your API key should never be committed to Git.

---

# Error Handling

Your weather tool should handle basic errors.

For example:

### Invalid city

```text
User:
What's the weather in XYZABC?
```

The tool should not crash the entire application.

It should return a useful error that the LLM can understand and communicate to the user.

---

### API failure

If the weather API is unavailable:

```text
Weather API request failed
```

The agent should handle the failure gracefully.

---

### Missing API key

If:

```text
WEATHER_API_KEY
```

is not available, the application should provide a clear error rather than making an invalid API request.

---

# Example Conversations

Your agent should be able to handle conversations like:

### Example 1

```text
User:
What's the weather in Abuja?

Agent:
The current weather in Abuja is 27°C and partly cloudy.
```

### Example 2

```text
User:
What's the weather in Lagos?

Agent:
The current weather in Lagos is 29°C with partly cloudy skies.
```

### Example 3

```text
User:
What's the capital of Nigeria?

Agent:
The capital of Nigeria is Abuja.
```

Notice that the third request does **not** require the weather tool.

---

# Challenge

Implement the agent using **LangGraph.js + TypeScript**.

Try to figure out the implementation yourself before looking for a solution.

Think about these questions:

### 1. What should your graph state contain?

Hint:

```text
What needs to travel between the user,
LLM, and weather tool?
```

---

### 2. How should the LLM know about the weather tool?

Think about:

```text
How do we bind tools to an LLM?
```

---

### 3. How does the graph know whether the LLM wants to call a tool?

Research:

```text
toolsCondition
```

---

### 4. Who executes the tool?

Research:

```text
ToolNode
```

---

### 5. Why does the tool need to send its result back to the LLM?

Think about this:

```text
User
 ↓
LLM
 ↓
Weather Tool
 ↓
???
```

What should happen after the tool returns its result?

---

### 6. How does the graph know when to stop?

Think about:

```text
LLM
 ↓
toolsCondition
 ↓
No tool call
 ↓
END
```

---

# Bonus Challenges

Once the basic agent works, add the following.

## Bonus 1 — Add More Weather Information

Return additional information such as:

```text
Temperature
Feels like
Humidity
Wind speed
Weather condition
```

---

## Bonus 2 — Support Forecasts

Extend the tool so the user can ask:

```text
"What's the weather forecast for Abuja tomorrow?"
```

Now your agent needs to determine whether the user wants:

```text
Current weather
        OR
Weather forecast
```

You may need separate tools:

```text
getCurrentWeather()
getWeatherForecast()
```

---

## Bonus 3 — Multiple Tools

Give the agent additional tools:

```text
getCurrentWeather()
getWeatherForecast()
getWeatherAlerts()
```

The LLM should decide which tool to use.

For example:

```text
"What's the weather in Abuja?"
        ↓
getCurrentWeather()

"Will it rain tomorrow in Abuja?"
        ↓
getWeatherForecast()

"Are there any weather warnings?"
        ↓
getWeatherAlerts()
```

---

## Bonus 4 — Handle Tool Errors

Modify the workflow so that if the weather API fails, the LLM can explain the problem to the user instead of crashing.

---

## Bonus 5 — Multi-Turn Conversation

Allow the user to say:

```text
User:
What's the weather in Abuja?

Agent:
It's 27°C and partly cloudy.

User:
What about Lagos?

Agent:
Lagos is currently 29°C...
```

The agent should understand that:

```text
"What about Lagos?"
```

is referring to the weather.

---

# Success Criteria

You have completed the exercise when your agent can:

* [ ] Accept a natural-language user request
* [ ] Determine whether weather information is required
* [ ] Call the weather tool when necessary
* [ ] Extract the city from the user's request
* [ ] Call a real weather API
* [ ] Return the tool result to the LLM
* [ ] Generate a natural-language answer
* [ ] Use `ToolNode`
* [ ] Use `toolsCondition`
* [ ] Implement the LLM → Tool → LLM loop
* [ ] Load the API key from `.env`
* [ ] Handle basic API/tool errors
* [ ] Stop when no further tool call is required

---

# Final Goal

The important thing is **not simply getting the weather response**.

The goal is to understand this fundamental AI-agent pattern:

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │     LLM      │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │              │
              No tool call     Tool call
                    │              │
                    ▼              ▼
                   END         ToolNode
                                   │
                                   ▼
                              Weather Tool
                                   │
                                   ▼
                              Tool Result
                                   │
                                   ▼
                                  LLM
                                   │
                                   ▼
                                Answer
```

Once you understand this pattern, you can reuse the same architecture for agents that interact with **databases, search engines, APIs, files, calculators, RAG systems, and other external tools**.
