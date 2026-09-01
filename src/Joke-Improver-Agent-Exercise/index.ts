/*
  * States
    - Original joke (user input)
    - Overall score of the joke
    - Evaluator's feedback
    - Improved Joke

  * Actions
    - Evaluate the joke:
      1) Evaluate the joke based on these criters: humor, originality, delivery and clarity.
      2) Score each criterion from 1–10.
      3) Calculate an overall score.
      4) Provide feedback explaining weaknesses.
      5) Example output:
        {
          "humor": 6,
          "originality": 8,
          "delivery": 5,
          "clarity": 9,
          "feedback": "The joke is clear and has a decent technical pun, but the punchline could be more unexpected."
        }
      6) Update overall score and feedback states

    - Conditional Decision
        1) If overall score >= 7
            → END i.e if the joke is good enough stop
        2) If overall score < 7
            → Improve → Evaluate again i.e if the joke is not good enough improve it and evaluate again

    - Improve the joke:
      1) Read the original joke
      2) Read the evaluator's feedback
      3) Rewrite the joke and produce an improved version
      4) Update the improved joke state

  * NOTE:
    - Since its a loop prevent the agent from looping indefinitely.
    - Example
        text
        Maximum attempts = 5
        IF score >= 7
          → END
        IF attempts >= 5
          → END
        OTHERWISE
          → Improve → Evaluate again
 */

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
const joke = "Knock knock. Who's there? The mail man.";
const model = "openai/gpt-oss-120b";
const maxTokens = 1000;
const apiKey = process.env.GROQ_API_KEY || "";

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
  // Optional fields because they are not present at the start of the graph, but will be added later
  jokeOverallScore: z
    .number()
    .optional()
    .describe("The overall score of the joke"),
  jokeFeedback: z.string().optional().describe("The evaluator's feedback"),
  improvedJoke: z.string().optional().describe("The improved joke"),
});

// Structure the LLM's output
const jokeEvaluationSchema = z.object({
  humor: z.number().min(1).max(10),
  originality: z.number().min(1).max(10),
  delivery: z.number().min(1).max(10),
  clarity: z.number().min(1).max(10),
  feedback: z.string(),
});

// Add the output structure to the LLM
const structuredJokeEvaluatorLLm =
  jokeEvaluatorLLm.withStructuredOutput(jokeEvaluationSchema);

// Define node functions
// LLM call to evaluate the joke
const evaluateJoke: GraphNode<typeof State> = async (state) => {
  console.log("Evaluating joke........");
  try {
    const response = await structuredJokeEvaluatorLLm.invoke(
      `
    You are a joke evaluator, evaluate this joke:${state.joke} based on the following four criteria:
    1. Humor — How funny is the joke?
    2. Originality — How creative, fresh, or unexpected is the joke?
    3. Delivery — How well does the setup lead into the punchline?
    4. Clarity — How easy is the joke to understand?

    ### Instructions
    1. Score each criterion from 1 to 10.
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
    return {
      improvedJoke: String(response.content),
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
  if (state.jokeOverallScore === undefined)
    throw new Error(
      "jokeOverallScore is undefined. Ensure that the joke has been evaluated before checking its quality.",
    );
  if (state.jokeOverallScore >= 7) return "Pass";
  return "Fail";
};

// Build the graph workflow
const graph = new StateGraph(State)
  // Add nodes to the graph
  .addNode("Evaluate Joke", evaluateJoke, { cachePolicy: { ttl: 300 } }) // Cache the evaluation result for 5 minutes to avoid redundant evaluations
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
