# AI Agent Practice 🤖

A hands-on learning project for building AI agents using **LangGraph** and **LangChain**. This repository contains exercises to practice implementing agentic workflows with large language models.

## 📚 About This Project

This project is designed to help you learn and practice building **AI Agents** with LangGraph. Through practical exercises, you'll understand:

- How to structure agentic workflows
- Building decision trees and loops in agent logic
- Integrating language models into agent chains
- Evaluating and iterating on AI-generated content
- Best practices for prompt engineering and agent design

## 🎯 Current Exercise: Joke Improver Agent

Build an AI agent that evaluates a joke and continuously improves it until it reaches an acceptable quality score. The agent uses a feedback loop to:

1. Evaluate the joke on multiple dimensions
2. Check if it meets a quality threshold
3. Improve it if needed
4. Re-evaluate until satisfied

See [Joke-Improver-Agent-Exercise](src/Joke-Improver-Agent-Exercise/) for detailed instructions.

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- An API key from a supported LLM provider (e.g., Groq)

### Clone the Repository

```bash
git clone https://github.com/yourusername/ai-agent-practice.git
cd ai-agent-practice
```

### Install Dependencies

```bash
npm install
```

### Setup Environment Variables

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_api_key_here
```

Or use your preferred LLM provider by updating the configuration in the exercise files.

### Run the Project

To run the Joke Improver Agent exercise:

```bash
npm run dev src/Joke-Improver-Agent-Exercise/index.ts
```

Build the project:

```bash
npm run build
```

## 📁 Project Structure

```
ai-agent-practice/
├── src/
│   └── Joke-Improver-Agent-Exercise/
│       ├── index.ts              # Main agent implementation
│       └── instruction.md        # Detailed exercise instructions
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                      # This file
```

## 🛠️ Tech Stack

- **LangGraph**: Framework for building stateful AI agents
- **LangChain**: Tools and utilities for working with LLMs
- **Groq API**: Fast language model API (can be replaced with other providers)
- **TypeScript**: Type-safe development
- **tsx**: TypeScript executor for running files directly
- **dotenv**: Environment variable management

### Key Dependencies

```json
{
  "@langchain/core": "^1.2.9",
  "@langchain/groq": "^1.3.1",
  "@langchain/langgraph": "^1.4.12",
  "dotenv": "^17.4.2"
}
```

## 📖 How to Use This Project

1. **Start with the Exercise**: Read the [instruction.md](src/Joke-Improver-Agent-Exercise/instruction.md) file in the Joke-Improver-Agent-Exercise folder
2. **Implement the Agent**: Build the agent in [index.ts](src/Joke-Improver-Agent-Exercise/index.ts) following the specifications
3. **Run and Test**: Use `npm run dev` to test your implementation
4. **Iterate**: Refine your agent based on the results and exercise requirements

## 🎓 Learning Objectives

By working through these exercises, you'll learn:

- ✅ Core concepts of agentic AI systems
- ✅ How to use LangGraph for workflow orchestration
- ✅ Building feedback loops and decision trees
- ✅ Prompt engineering for agents
- ✅ Handling LLM outputs and tool integration
- ✅ Testing and debugging AI agents

## 🔗 Useful Resources

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph/)
- [LangChain Documentation](https://js.langchain.com/)
- [Groq API Docs](https://console.groq.com/docs)

## 📝 Notes

- Make sure your API key is added to `.env` before running
- The project uses TypeScript for type safety
- Each exercise builds on concepts from previous exercises
- Feel free to experiment and modify the agents to explore different approaches

## 🤝 Contributing

Feel free to fork, modify, and extend this project for your own learning purposes.

## 📄 License

ISC
