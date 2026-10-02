# 📚 Document Q&A Agent

**Difficulty:** ⭐⭐⭐⭐ Intermediate → Advanced

## 🎯 Project Objective

Build a **Document Q&A AI Agent** using **TypeScript, LangChain, and LangGraph**.

The agent will answer questions using information contained in a collection of company documents.

For example, a user might ask:

> "What is the company's fertilizer return policy?"

Instead of relying only on the LLM's existing knowledge, the agent should retrieve relevant information from the company's internal documents and use that information to generate its answer.

The project should eventually evolve from a basic **RAG pipeline** into an **agentic RAG system** that can determine when it needs to search the documents, evaluate the retrieved information, and search again when the available information is insufficient.

---

# 🧠 What You Will Learn

By completing this project, you should gain practical experience with:

- Retrieval-Augmented Generation (RAG)
- Document loading
- Document splitting / chunking
- Embeddings
- Vector databases
- Similarity search
- Retriever design
- Retrieval tools
- LangGraph state
- Conditional routing
- Agentic RAG
- Evaluation of retrieved information
- Iterative retrieval
- Hallucination control
- Grounded AI responses

---

# 🏢 Project Scenario

Assume you are building an internal/customer-facing AI assistant for a fictional company.

The company provides you with a collection of official business documents containing information such as:

- Company policies
- Products
- Pricing
- Delivery information
- Refund/return policies
- Customer support procedures
- Frequently asked questions
- Terms and conditions

The AI agent should use these documents as its **source of truth**.

The agent should not simply answer questions using the LLM's general knowledge when the answer should come from the company's documentation.

---

# 🗂️ Example Documents

Create a small knowledge base containing several documents.

For example:

```text
knowledge-base/
├── company-profile.md
├── products.md
├── pricing.md
├── delivery-policy.md
├── refund-policy.md
└── customer-support.md
```

The documents should contain realistic company information.

Example:

```text
Company: AgroNexa Fertilizer Industries Ltd.

Product:
NexaGrow NPK 15-15-15

Available Sizes:
- 25kg
- 50kg

Delivery:
Orders above 100 bags qualify for scheduled bulk delivery.

Returns:
Unused products may be returned within 7 days of delivery,
subject to the company's return conditions.
```

The documents should contain enough information for the agent to answer different types of questions.

---

# 🟢 Phase 1 — Basic RAG

Start by building a simple RAG pipeline.

The initial system should follow this flow:

```text
User Question
      ↓
Retrieve Relevant Documents
      ↓
Provide Documents to LLM
      ↓
Generate Answer
      ↓
Return Answer
```

For example:

```text
User:
"What is the company's return policy?"

        ↓

Retriever

        ↓

Relevant chunks from refund-policy.md

        ↓

LLM

        ↓

Answer
```

## Requirements

Your system should:

1. Load the company documents.
2. Split the documents into smaller chunks.
3. Generate embeddings for the chunks.
4. Store the embeddings in a vector database.
5. Create a retriever.
6. Accept a user's question.
7. Retrieve relevant document chunks.
8. Provide the retrieved context to the LLM.
9. Generate an answer based on the retrieved information.

---

# 🧩 Phase 2 — Document Chunking

Experiment with document chunking.

Investigate:

- Chunk size
- Chunk overlap
- How chunking affects retrieval
- What happens when chunks are too large
- What happens when chunks are too small

Start with a reasonable configuration and test it.

For example:

```text
Chunk Size: 500
Chunk Overlap: 50
```

These values are only starting points.

You should experiment with them and observe the effect on retrieval quality.

---

# 🔎 Phase 3 — Embeddings

Generate embeddings for your document chunks.

Understand what an embedding represents.

Conceptually:

```text
Document Chunk
      ↓
Embedding Model
      ↓
Vector
```

For example:

```text
"Unused fertilizer can be returned within 7 days."

                ↓

[0.021, -0.184, 0.392, ...]
```

The exact vector values are not important.

What matters is understanding that semantically similar text should have similar vector representations.

---

# 🗄️ Phase 4 — Vector Database

Store the document embeddings in a vector database.

Your system should be able to perform:

```text
User Question
      ↓
Question Embedding
      ↓
Vector Similarity Search
      ↓
Relevant Document Chunks
```

You may use a vector store supported by LangChain.

The important objective is understanding:

- Why embeddings are needed
- Why a vector database is needed
- How similarity search works
- How retrieved chunks are selected

---

# 🤖 Phase 5 — Convert Retrieval into a Tool

Instead of automatically retrieving documents for every question, expose the retriever as a tool that the LLM can use.

Conceptually:

```text
search_company_documents(query)
```

The tool should:

1. Receive a search query.
2. Search the vector database.
3. Retrieve relevant document chunks.
4. Return the results to the agent.

The LLM should be able to decide whether it needs to use the tool.

---

# 🔄 Phase 6 — Build the LangGraph Agent

Now convert the basic RAG pipeline into a LangGraph workflow.

The initial graph should look something like:

```text
START
  ↓
Agent
  ↓
Does the agent need documents?
  ↓
 ┌───────────────┐
 │               │
 NO              YES
 │               │
 ↓               ↓
Answer       Retriever
                 ↓
               Agent
                 ↓
               Answer
```

The agent should be capable of deciding whether document retrieval is necessary.

---

# 🧠 Phase 7 — Agentic RAG

Now make the system more intelligent.

The agent should evaluate whether the retrieved information is sufficient to answer the question.

The target workflow is:

```text
                  START
                    ↓
                  Agent
                    ↓
          Does it need documents?
              ↙            ↘
            No              Yes
             ↓               ↓
           Answer        Retriever
                             ↓
                     Evaluate Results
                             ↓
                   Is information enough?
                       ↙           ↘
                     No             Yes
                     ↓               ↓
              Search Again        Answer
                     ↓
                 Retriever
```

The important difference is that retrieval is no longer a single step.

The agent can **iterate** when the first retrieval attempt does not provide enough information.

---

# 🔁 Phase 8 — Retrieval Loop

Implement a controlled retrieval loop.

Example:

```text
Question
   ↓
Search
   ↓
Evaluate
   ↓
Enough information?
   ├── YES → Answer
   │
   └── NO
         ↓
      Improve search query
         ↓
      Search again
         ↓
      Evaluate again
```

You must prevent the agent from looping indefinitely.

For example, introduce a maximum number of retrieval attempts:

```text
MAX_RETRIEVAL_ATTEMPTS = 3
```

If the agent reaches the limit without finding sufficient information, it should stop searching.

---

# 🛡️ Phase 9 — Hallucination Control

The agent should prioritize information found in the company documents.

Create a system prompt that instructs the LLM to:

- Use retrieved documents as the primary source.
- Avoid inventing company policies.
- Avoid making up prices, products, procedures, or policies.
- Clearly state when the documents do not contain enough information.
- Distinguish retrieved information from general knowledge.
- Avoid presenting unsupported information as company policy.

Example behavior:

### Question

> "Does the company provide free fertilizer delivery to every customer?"

### If the documents don't contain this information

The agent should **not invent an answer**.

Instead, it should explain that the available company documentation does not provide enough information to answer the question.

---

# 🧪 Phase 10 — Test the Agent

Create a collection of test questions.

## Questions that should be answerable

Examples:

```text
What products does the company sell?

What fertilizer sizes are available?

What is the company's return policy?

How long does delivery take?

What conditions apply to bulk orders?
```

## Questions requiring multiple pieces of information

Examples:

```text
Which fertilizer products are available in 50kg bags,
and what are their delivery conditions?
```

## Questions that should trigger additional retrieval

Create questions where the information is distributed across different documents.

For example:

```text
What fertilizer products are available and
what are the return conditions for those products?
```

The agent may need to retrieve information from both:

```text
products.md
refund-policy.md
```

## Questions outside the knowledge base

Examples:

```text
Who is the president of Nigeria?

What is the weather in Abuja?

Who won the 2026 World Cup?
```

The agent should not pretend that these answers came from company documentation.

---

# 📊 Phase 11 — Evaluate Retrieval Quality

Do not only evaluate whether the final answer sounds good.

Also investigate whether the **retriever found the correct information**.

For each test question, examine:

```text
Question
   ↓
Retrieved Chunks
   ↓
Were they relevant?
   ↓
Was the answer supported?
```

Ask yourself:

- Did the retriever find the correct document?
- Did it retrieve enough context?
- Did it retrieve irrelevant chunks?
- Was the chunk too large?
- Was the chunk too small?
- Was the search query good enough?
- Did the LLM correctly use the retrieved information?

---

# 🧱 Suggested Project Architecture

Organize the project into separate responsibilities.

```text
src/
├── agent/
│   ├── graph.ts
│   ├── nodes.ts
│   └── state.ts
│
├── documents/
│   ├── loader.ts
│   ├── splitter.ts
│   └── indexer.ts
│
├── retrieval/
│   ├── retriever.ts
│   └── search.ts
│
├── tools/
│   └── documentSearch.ts
│
├── llm/
│   └── model.ts
│
├── prompts/
│   └── agentPrompt.ts
│
└── index.ts

knowledge-base/
├── company-profile.md
├── products.md
├── pricing.md
├── delivery-policy.md
├── refund-policy.md
└── customer-support.md
```

You don't have to follow this structure exactly.

The purpose is to keep:

```text
Document Processing
        ↓
Retrieval
        ↓
Tools
        ↓
Agent
        ↓
Application
```

separate from one another.

---

# 🧠 LangGraph Concepts You Should Practice

By the end of the project, you should be comfortable explaining:

### State

What information needs to move between nodes?

For example:

```text
question
messages
retrievedDocuments
retrievalAttempts
searchQuery
```

### Nodes

What does each node actually do?

Potential nodes:

```text
agent
retrieve
evaluateRetrieval
generateAnswer
```

### Edges

How does information move between nodes?

```text
START → agent
agent → retrieve
retrieve → evaluate
evaluate → agent
evaluate → answer
```

### Conditional Edges

What determines the next step?

For example:

```text
if needsDocuments:
    retrieve
else:
    answer
```

And:

```text
if informationIsSufficient:
    answer
else:
    retrieveAgain
```

### Loops

Why does the graph need to return to a previous node?

```text
Retrieve
   ↓
Evaluate
   ↓
Insufficient
   ↓
Retrieve Again
```

---

# 🏁 Minimum Completion Criteria

The project is considered complete when the agent can:

- [ ] Load company documents.
- [ ] Split documents into chunks.
- [ ] Generate embeddings.
- [ ] Store embeddings in a vector database.
- [ ] Retrieve relevant document chunks.
- [ ] Answer questions using retrieved information.
- [ ] Use the retriever as an agent tool.
- [ ] Decide when document retrieval is necessary.
- [ ] Evaluate retrieved information.
- [ ] Search again when necessary.
- [ ] Stop after a maximum number of retrieval attempts.
- [ ] Avoid inventing unsupported company information.
- [ ] Handle questions outside the knowledge base.
- [ ] Explain where its answer came from.

---

# 🚀 Stretch Goals

After completing the core project, add:

### 1. Source Citations

Return the document name and relevant section with the answer.

Example:

```text
According to the company's Refund Policy,
unused products may be returned within 7 days.

Source:
refund-policy.md
```

### 2. Query Rewriting

Allow the agent to improve a poor search query.

```text
Original:
"returns?"

Improved:
"What are the conditions and time limit for returning
unused fertilizer products?"
```

### 3. Relevance Grading

Create a dedicated node that evaluates retrieved documents:

```text
Retriever
    ↓
Document Grader
    ↓
Relevant?
 ↙       ↘
No        Yes
↓          ↓
Rewrite    Generate
Query      Answer
```

### 4. Conversation Memory

Allow users to ask follow-up questions.

```text
User:
What is the return policy?

Agent:
Unused products can be returned within 7 days...

User:
What about opened products?

Agent:
...
```

### 5. Streaming

Stream the agent's response instead of waiting for the entire answer.

### 6. Persistence

Use LangGraph checkpointing so conversations can continue across sessions.

---

# 🎓 Final Goal

The final system should resemble this:

```text
                         USER
                           │
                           ▼
                        AGENT
                           │
                ┌──────────┴──────────┐
                │                     │
        Needs documents?          Doesn't need
                │                     │
               YES                    │
                │                     │
                ▼                     │
           RETRIEVER                 │
                │                     │
                ▼                     │
       RETRIEVED DOCUMENTS            │
                │                     │
                ▼                     │
       RELEVANCE EVALUATOR            │
                │                     │
          ┌─────┴─────┐              │
          │           │              │
       Relevant    Not Relevant      │
          │           │              │
          │           ▼              │
          │      Rewrite Query       │
          │           │              │
          │           ▼              │
          │       RETRIEVER ─────────┘
          │
          ▼
       GENERATE ANSWER
          │
          ▼
         USER
```

The main objective is **not simply to make a chatbot that can answer questions**.

The objective is to understand how to design a LangGraph system that can:

> **reason about whether it needs external knowledge, retrieve that knowledge, evaluate the retrieved information, retry when necessary, and produce an answer grounded in the available documents.**
