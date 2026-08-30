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
    - Since its a loop prevent the agent from looping indefinitely. The question is at what part of the flow will I add this and how?
 */