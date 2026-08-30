# Exercise: Joke Improver Agent

## Objective

Build an AI agent that evaluates a joke and continuously improves it until the joke reaches an acceptable quality score.

The agent should use a **loop** where the joke is:

1. Evaluated
2. Checked against a quality threshold
3. Improved if necessary
4. Evaluated again

---

## Agent Workflow

```text
                    ┌──────────────┐
                    │     Joke     │
                    └──────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Evaluate Joke  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Is score ≥ 7? │
                  └───────┬─────┬───┘
                          │     │
                     YES  │     │  NO
                          │     │
                          ▼     ▼
                       ┌────┐  ┌───────────────┐
                       │END │  │  Improve Joke │
                       └────┘  └───────┬───────┘
                                       │
                                       ▼
                                ┌─────────────────┐
                                │  Evaluate Joke  │
                                │     Again       │
                                └───────┬─────────┘
                                        │
                                        └──────► LOOP
```

---

## Evaluation System

The evaluator should score the joke on a **1–10 scale**.

### Scoring Criteria

#### 1. Humor — 1–10

How funny is the joke?

* **1–3:** Not funny
* **4–6:** Somewhat funny
* **7–10:** Very funny

#### 2. Originality — 1–10

How creative or original is the joke?

* **1–3:** Very predictable or cliché
* **4–6:** Somewhat original
* **7–10:** Highly creative or unexpected

#### 3. Delivery — 1–10

How naturally does the setup lead to the punchline?

* **1–3:** Poor setup/punchline connection
* **4–6:** Decent delivery
* **7–10:** Strong setup and punchline

#### 4. Clarity — 1–10

How easy is the joke to understand?

* **1–3:** Confusing
* **4–6:** Understandable but could be clearer
* **7–10:** Clear and easy to understand

---

## Overall Score

Calculate an overall score from the four evaluation criteria.

Example:

```text
Humor:       6
Originality: 8
Delivery:    5
Clarity:     9
----------------
Overall:     7
```

The agent should use the **overall score** to determine whether the joke needs improvement.

### Quality Threshold

```text
IF overall score >= 7
    → END

IF overall score < 7
    → IMPROVE JOKE
    → EVALUATE AGAIN
```

---

## Requirements

Your agent should contain at least the following components:

### 1. Joke Input

Provide an initial joke to the agent.

```text
Input:
"Why did the developer go broke?
Because he used up all his cache."
```

### 2. Evaluator Node

The evaluator should:

* Analyze the joke
* Score each criterion from 1–10
* Calculate an overall score
* Provide feedback explaining weaknesses

Example output:

```json
{
  "humor": 6,
  "originality": 8,
  "delivery": 5,
  "clarity": 9,
  "overallScore": 7,
  "feedback": "The joke is clear and has a decent technical pun, but the punchline could be more unexpected."
}
```

### 3. Conditional Decision

After evaluation, determine whether the joke is good enough.

```text
overallScore >= 7
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
  END     Improve
             │
             ▼
          Evaluate
```

### 4. Improver Node

If the joke scores below 7, the improver should:

* Read the original joke
* Read the evaluator's feedback
* Rewrite the joke
* Produce an improved version

### 5. Loop

The improved joke should be sent back to the evaluator.

The process continues until:

```text
overallScore >= 7
```

---

## LangGraph Structure

Your graph should conceptually look like:

```text
START
  │
  ▼
Evaluate Joke
  │
  ▼
Check Score
  │
  ├─────────────── Score >= 7 ──────────────► END
  │
  │ Score < 7
  ▼
Improve Joke
  │
  └──────────────────────► Evaluate Joke
```

---

## Challenge

Implement this workflow using **LangGraph.js**.

Try to determine:

* What should your graph state contain?
* What should the evaluator return?
* What should the improver receive?
* How will you calculate the overall score?
* How will you create the conditional edge?
* How will you prevent the agent from looping indefinitely?

### Bonus Challenge

Add a maximum number of improvement attempts.

For example:

```text
Maximum attempts = 5

IF score >= 7
    → END

IF attempts >= 5
    → END

OTHERWISE
    → Improve → Evaluate again
```

This prevents the agent from getting stuck in an infinite loop.
