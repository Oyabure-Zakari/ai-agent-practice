import { ChatGroq } from '@langchain/groq';
import { StateGraph, StateSchema, type ConditionalEdgeRouter, type GraphNode } from '@langchain/langgraph';
import 'dotenv/config';
import { z } from 'zod/v4';

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
  // Add the nodes to the graph
  .addNode("evaluateJoke", evaluateJoke)
  .addNode("improveJoke", improveJoke)
  // Add the edges to the graph
  .addEdge("__start__", "evaluateJoke")
  // Add the conditional edge to the graph
  .addConditionalEdges("evaluateJoke", checkIfJokeIsGood)
  // Add the edge to the graph
  .addEdge("improveJoke", "evaluateJoke")
  // Compile the graph
  .compile();

  const aiMessage = await graph.invoke({ joke: "Why did the frog walk across the road? because it didn't hop over the fence" });
  console.log(aiMessage);