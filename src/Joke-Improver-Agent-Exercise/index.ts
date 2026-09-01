import { InMemoryCache } from "@langchain/langgraph-checkpoint";
import { ChatGroq } from "@langchain/groq";
import {
  StateGraph,
  StateSchema,
  type ConditionalEdgeRouter,
  type GraphNode,
} from "@langchain/langgraph";
import "dotenv/config";
import * as z from "zod";

// Shared variables
const model = "openai/gpt-oss-120b";
const maxTokens = 1000;
const apiKey = process.env.GROQ_API_KEY || "";
const joke = "Why is the sky blue? because it is sad.";

// Set up the LLM
const jokeEvaluatorLLm = new ChatGroq({
  model,
  apiKey,
  maxTokens,
  temperature: 0, // 0 means the model will be deterministic and less creative.
});

const jokeImproverLLm = new ChatGroq({
  model,
  apiKey,
  temperature: 1, // 1 means the model will be more creative.
  maxTokens,
});

// Initialize the state schema for the graph
const State = new StateSchema({
  joke: z.string().describe("The current joke"),
  attempts: z.number().default(0).describe("The number of attempts made to improve the joke"),
  jokeOverallScore: z.number().default(0).describe("The overall score of the joke"),
  jokeFeedback: z.string().describe("The evaluator's feedback"),
});

// Structure the LLM's output
const jokeEvaluationSchema = z.object({
  humor: z.number().min(1).max(5),
  originality: z.number().min(1).max(5),
  delivery: z.number().min(1).max(5),
  clarity: z.number().min(1).max(5),
  feedback: z.string(),
});

// Add the output structure to the LLM
const structuredJokeEvaluatorLLm = jokeEvaluatorLLm.withStructuredOutput(jokeEvaluationSchema);

// Define node functions
// LLM call to evaluate the joke
const evaluateJoke: GraphNode<typeof State> = async (state) => {
  console.log("Evaluating joke........");
  const metaDate = {
    joke: state.joke,
    attempts: state.attempts,
    overallScore: state.jokeOverallScore,
  };

  console.log(metaDate);
  try {
    const response = await structuredJokeEvaluatorLLm.invoke(
      `
    You are a joke evaluator, evaluate this joke:${state.joke} based on the following four criteria:
    1. Humor — How funny is the joke?
    2. Originality — How creative, fresh, or unexpected is the joke?
    3. Delivery — How well does the setup lead into the punchline?
    4. Clarity — How easy is the joke to understand?

    ### Instructions
    1. Score each criterion from 1 to 5.
    2. Provide concise feedback explaining the joke's weaknesses and what could be improved.
    3. If the joke is already strong, explain briefly why it works.
    4. Be objective and consistent when scoring.

    ### Scoring Guidelines
    1 to 3: Poor
    4 to 6: Average
    7 to 8: Good
    9 to 10: Excellent
    `,
    );
    const { humor, originality, delivery, clarity, feedback } = response;
    const overallScore = (humor + originality + delivery + clarity) / 4;
    // console.log("Response:",response, "", "Overall score:",overallScore);
    return {
      jokeFeedback: feedback,
      jokeOverallScore: overallScore,
    };
  } catch (error: any) {
    throw new Error(`Error evaluating joke: ${error.message}`);
  }
};

// LLM call to evaluate the joke
const improveJoke: GraphNode<typeof State> = async (state) => {
  console.log("Improving joke........");
  try {
    const response = await jokeImproverLLm.invoke(
      `
      You are a joke improver, your task is to improve this joke: ${state.joke}.

      ### Follow these steps:
      1. Read and understand the original joke.
      2. Read and understand the ${state.jokeFeedback} and ${state.jokeOverallScore}.
      3. Produce a new, improved version of the joke.
      4. Preserve the original joke's core idea where possible, but improve its humor, originality, clarity, and delivery.

      Return **only the improved joke**. It should be plain text no fancy format and do not include explanations, analysis, feedback, or the  original joke.
      `,
    );
    // console.log("Joke Improver:",response.content);
    const improvedJoke = String(response.content);
    return {
      joke: improvedJoke,
      attempts: state.attempts + 1,
    };
  } catch (error: any) {
    throw new Error(`Error improving joke: ${error.message}`);
  }
};

// Gate function to check if the joke is good enough to stop the loop or if it needs to be improved
const checkJokeQuality: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "Pass" | "Fail";
}> = (state) => {
  // Condition 1: Joke is good enough
  if (state.jokeOverallScore >= 3.5) return "Pass";
  // Condition 2: Maximum improvements reached
  if (state.attempts >= 2) return "Pass";
  // Otherwise, improve the joke
  return "Fail";
};

// Build the graph workflow
const graph = new StateGraph(State)
  // Add nodes to the graph
  // Cache the evaluation result for 5 minutes to avoid redundant evaluations
  .addNode("Evaluate Joke", evaluateJoke, { cachePolicy: { ttl: 300 } })
  .addNode("Improve Joke", improveJoke, { cachePolicy: { ttl: 300 } })
  // Start the graph with the Evaluate Joke node
  .addEdge("__start__", "Evaluate Joke")
  // Add conditional edges based on the joke's quality
  .addConditionalEdges("Evaluate Joke", checkJokeQuality, {
    Pass: "__end__",
    Fail: "Improve Joke",
  })
  // Add edge from Improve Joke back to Evaluate Joke to create a loop for re-evaluation
  .addEdge("Improve Joke", "Evaluate Joke")
  // Compile the graph to finalize its structure and prepare it for execution
  .compile({ cache: new InMemoryCache() }); // Use an in-memory cache to store intermediate results and avoid redundant computations

// Execute the graph with an initial joke
// Test to see if the caching works by invoking the graph twice with the same joke input
console.log("================= First Call =================");
console.time("First call");
const result1 = await graph.invoke({ joke });
console.log("Result 1:", result1);
console.timeEnd("First call");

console.log("\n\n================= Second Call =================");
console.time("Second call");
const result2 = await graph.invoke({ joke });
console.log("Result 2 (Cached):", result2);
console.timeEnd("Second call");
