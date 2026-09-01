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
                  ┌──────────────────┐
                  │ Is score ≥ 3.5? │
                  └───────┬─────┬────┘
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
                                │      Again      │
                                └───────┬─────────┘
                                        │
                                        └──────► LOOP
```

---

## Evaluation System

The evaluator should score the joke on a **1–5 scale**.

### Scoring Criteria

#### 1. Humor — 1–5

How funny is the joke?

* **1:** Not funny
* **2:** Slightly funny
* **3:** Somewhat funny
* **4:** Very funny
* **5:** Extremely funny

#### 2. Originality — 1–5

How creative, fresh, or unexpected is the joke?

* **1:** Very predictable or cliché
* **2:** Mostly predictable
* **3:** Somewhat original
* **4:** Creative and fairly unexpected
* **5:** Highly creative and unexpected

#### 3. Delivery — 1–5

How naturally does the setup lead to the punchline?

* **1:** Poor setup/punchline connection
* **2:** Weak delivery
* **3:** Decent delivery
* **4:** Strong setup and punchline
* **5:** Excellent setup and punchline

#### 4. Clarity — 1–5

How easy is the joke to understand?

* **1:** Very confusing
* **2:** Difficult to understand
* **3:** Understandable
* **4:** Clear and easy to understand
* **5:** Extremely clear

---

## Overall Score

Calculate the overall score by taking the average of the four evaluation criteria.

Example:

```text
Humor:        3
Originality:  4
Delivery:     3
Clarity:      4
----------------
Overall:      3.5
```

---

## Quality Threshold

The agent should use the **overall score** to determine whether the joke needs improvement.

```text
IF overall score >= 3.5
    → END

IF overall score < 3.5
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
* Score each criterion from **1–5**
* Calculate an overall score
* Provide feedback explaining weaknesses

Example output:

```json
{
  "humor": 3,
  "originality": 4,
  "delivery": 3,
  "clarity": 5,
  "feedback": "The joke is clear and uses a relevant technical pun, but the punchline is fairly predictable. It could be made more unexpected."
}
```

### 3. Conditional Decision

After evaluation, determine whether the joke is good enough.

```text
overallScore >= 3.5
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
  END      Improve
             │
             ▼
          Evaluate
```

### 4. Improver Node

If the joke scores below **3.5**, the improver should:

* Read the current joke
* Read the evaluator's feedback
* Rewrite the joke
* Produce an improved version

### 5. Loop

The improved joke should be sent back to the evaluator.

The process continues until:

```text
overallScore >= 3.5
```

**OR the maximum number of improvement attempts is reached.**

---

## Maximum Improvement Attempts

To prevent the agent from looping indefinitely, the agent should have a maximum of **2 improvement attempts**.

```text
Maximum attempts = 2

IF overall score >= 3.5
    → END

IF attempts >= 2
    → END

OTHERWISE
    → Improve
    → Evaluate again
```

This means the agent gets **two opportunities to improve the joke**.

For example:

```text
                 START
                   │
                   ▼
              Evaluate
                   │
             Score < 3.5?
              /         \
            NO           YES
            │             │
            ▼             ▼
           END        Improve #1
                          │
                          ▼
                      Evaluate
                          │
                    Score < 3.5?
                     /         \
                   NO           YES
                   │             │
                   ▼             ▼
                  END        Improve #2
                                │
                                ▼
                            Evaluate
                                │
                         ┌──────┴──────┐
                         │             │
                    Score ≥ 3.5    Score < 3.5
                         │             │
                         ▼             ▼
                        END           END
```

If the joke still scores below **3.5 after the second improvement**, the agent stops rather than continuing indefinitely.

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
Check Score & Attempts
  │
  ├──────── Score >= 3.5 ──────────────► END
  │
  ├──────── Attempts >= 2 ────────────► END
  │
  │ Score < 3.5 AND Attempts < 2
  ▼
Improve Joke
  │
  └──────────────────────► Evaluate Joke
```

---

## Challenge

Implement this workflow using **LangGraph.js**.

Try to determine:

- What should your graph state contain?
- What should the evaluator return?
- What should the improver receive?
- How will you calculate the overall score?
- How will you create the conditional edge?
- How will you prevent the agent from looping indefinitely?

### Bonus Challenge
Add a maximum number of improvement attempts.

For example:

```text
Maximum improvement attempts = 2

IF score >= 3.5
    → END

IF attempts >= 2
    → END

OTHERWISE
    → Improve → Evaluate again
```

This prevents the agent from getting stuck in an infinite loop.
