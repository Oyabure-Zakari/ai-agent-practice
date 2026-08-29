import { InMemoryCache } from '@langchain/langgraph-checkpoint';
import { ChatGroq } from '@langchain/groq';
import { StateGraph, StateSchema, type ConditionalEdgeRouter, type GraphNode } from '@langchain/langgraph';
import 'dotenv/config';
import { z } from 'zod/v4';

// Create ONE cache instance, shared across the whole process/graph
const cache = new InMemoryCache();

// Initialize the LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY || "",
  model: "openai/gpt-oss-120b",
  temperature: 1,
  maxTokens: 500,
});

// Initialize the state schema for the graph
const State = new StateSchema({
  joke: z.string().describe("The current joke"),

  // Optional fields because they are not present at the start of the graph, but will be added later
  jokeScore: z
    .number()
    .optional()
    .describe("The joke score from 1 to 10"),

  improvedJoke: z
    .string()
    .optional()
    .describe("The improved version of the joke"),
});

// Define the structure we want from the AI
const evaluationSchema = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("The score of the joke from 1 to 10"),
});

const improvedJokeSchema = z.object({
  improvedJoke: z
    .string()
    .describe("The improved version of the joke. Return only the joke itself."),
});

// Initialize the evaluator
const structuredLlm = llm.withStructuredOutput(evaluationSchema);

// Initialize the improver
const improver = llm.withStructuredOutput(improvedJokeSchema);

// Evaluate joke
const evaluateJoke: GraphNode<typeof State> = async (state) => {
  console.log("Evaluating joke........");
  const msg = await structuredLlm.invoke(`Evaluate this joke from 1 to 10: ${state.joke}`);

  return {
    jokeScore: msg.score,
  };
};

// Check if the joke is good
const checkIfJokeIsGood: ConditionalEdgeRouter<{ InputSchema: typeof State; Nodes: "improveJoke" }> = (state) => {
  if (state.jokeScore === undefined) throw new Error("jokeScore is undefined");

  if (state.jokeScore < 5) {
    return "improveJoke";
  }
  return "__end__";
};

// Improve the joke
const improveJoke: GraphNode<typeof State> = async (state) => {
  console.log("Improving joke........");
  const msg = await improver.invoke(`
You are an expert comedy writer.

Your task is to improve the following joke while keeping its original premise recognizable.

Original joke:
"${state.joke}"

The original joke received a score of ${state.jokeScore}/10.

Improve it using these principles:

1. Keep the core idea or premise of the original joke.
2. Create a clear setup that naturally leads to the punchline.
3. Make the punchline unexpected but logical.
4. Use clever wordplay, misdirection, exaggeration, or a surprising twist where appropriate.
5. Remove unnecessary words and make the joke concise.
6. Make the punchline stronger than the original.
7. Do not explain the joke or explain what you changed.
8. Do not add headings, bullet points, tables, or Markdown.
9. Return ONLY the improved joke.
10.The result should sound like something a real comedian would actually say.

Before writing the final joke, internally identify what makes the original joke weak and use that insight to improve it. Do not reveal your reasoning.

Return only the final improved joke.
`);

  return {
    improvedJoke: msg.improvedJoke,
  };
};

// Define the graph
const graph = new StateGraph(State)
  .addNode("evaluateJoke", evaluateJoke, {
    // Set a cache policy for this node. The result of this node will be cached for 60 seconds.
    cachePolicy: { ttl: 60 },
  })
  .addNode("improveJoke", improveJoke, {
    cachePolicy: { ttl: 60 },
  })
  .addEdge("__start__", "evaluateJoke")
  .addConditionalEdges("evaluateJoke", checkIfJokeIsGood)
  .addEdge("improveJoke", "evaluateJoke")
  .compile({
    cache, // Pass the cache instance to the graph
  });

// First call → should execute the nodes and call the API
console.time("First request");
const aiMessage1 = await graph.invoke({
  joke: "Why did the frog walk across the road? because it didn't hop over the fence",
});
console.timeEnd("First request");
console.log("First:", aiMessage1);

// Second call → should use the cached node results
console.time("Second request");
const aiMessage2 = await graph.invoke({
  joke: "Why did the frog walk across the road? because it didn't hop over the fence",
});
console.timeEnd("Second request");
console.log("Second (cached):", aiMessage2);