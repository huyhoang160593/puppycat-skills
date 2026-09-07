# Designing High-Quality General-Purpose AI Agents: A Research Synthesis

> **Compiled from primary sources**: Official documentation (Anthropic, OpenAI, LangChain, CrewAI, AutoGen, OpenHands), academic papers (ReAct, Reflexion, Voyager, SWE-agent), open-source framework source code (OpenAI Agents SDK, LangGraph, CrewAI), and authoritative engineering blog posts. Every claim is cited to its source.

---

## Table of Contents

1. [Architecture Patterns](#1-architecture-patterns)
2. [Core Components](#2-core-components)
3. [Prompt Engineering for Agents](#3-prompt-engineering-for-agents)
4. [Tool Design](#4-tool-design)
5. [Memory and State Management](#5-memory-and-state-management)
6. [Evaluation and Reliability](#6-evaluation-and-reliability)
7. [Real-World Examples](#7-real-world-examples)
8. [Key Design Principles](#8-key-design-principles)
9. [Sources](#sources)

---

## 1. Architecture Patterns

### 1.1 The Spectrum: Workflows vs. Agents

Anthropic draws a foundational architectural distinction between **workflows** (LLMs orchestrated through predefined code paths) and **agents** (LLMs dynamically directing their own processes and tool usage).

> **Source**: Anthropic, "Building Effective Agents" (Dec 2024) — *"Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."*  
> https://www.anthropic.com/engineering/building-effective-agents

**Key principle**: Start with the simplest solution possible and only increase complexity when needed. For many applications, optimizing single LLM calls with retrieval and in-context examples is usually enough.

### 1.2 ReAct (Reasoning + Acting)

The foundational agent loop. ReAct interleaves reasoning traces and actions in a single LLM.

> **Source**: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022), arXiv:2210.03629  
> https://arxiv.org/abs/2210.03629

The ReAct pattern:
```
Thought: [model reasons about what to do]
Action: [model calls a tool]
Observation: [environment returns result]
Thought: [model reasons about the result]
...repeat until done...
```

This is now the **default runtime loop** in nearly every production agent framework. OpenAI's Agents SDK implements it explicitly:

> **Source**: OpenAI Agents SDK docs, "Running agents" — *"The runner keeps looping until it reaches a real stopping point: 1. Call the current agent's model. 2. Inspect the model output. 3. If tool calls, execute and continue. 4. If handoff, switch agents and continue. 5. If final answer, return result."*  
> https://developers.openai.com/api/docs/guides/agents/running-agents

### 1.3 Workflow Patterns (from Anthropic's Taxonomy)

Anthropic identifies five composable workflow building blocks, ordered by increasing complexity:

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| **Prompt Chaining** | Sequential LLM calls, each processing the output of the previous | Tasks with clearly decomposable fixed subtasks |
| **Routing** | Classify input, direct to specialized handlers | Distinct input categories with different processing needs |
| **Parallelization** | Multiple LLMs work simultaneously; outputs aggregated | Sectioning (independent subtasks) or voting (multiple perspectives) |
| **Orchestrator-Workers** | Central LLM dynamically decomposes, delegates, synthesizes | Unpredictable subtask structure (e.g., multi-file code changes) |
| **Evaluator-Optimizer** | One LLM generates, another evaluates in a loop | Clear evaluation criteria; iterative refinement provides measurable value |

> **Source**: Anthropic, "Building Effective Agents" — workflow pattern descriptions  
> https://www.anthropic.com/engineering/building-effective-agents

### 1.4 Multi-Agent Orchestration

Two primary patterns for multi-agent coordination:

#### Handoffs (Delegated Ownership)
One specialist takes over the conversation entirely. The triage agent decides who should handle the request, then transfers control.

> **Source**: OpenAI Agents SDK, "Orchestration and handoffs" — *"Handoffs are the clearest fit when a specialist should own the next response rather than merely helping behind the scenes."*  
> https://developers.openai.com/api/docs/guides/agents/orchestration

```python
# From OpenAI Agents SDK
triage_agent = Agent(
    name="Triage agent",
    handoffs=[billing_agent, handoff(refund_agent)],
)
```

Handoffs are represented as **tools** to the LLM — a handoff to "Refund Agent" creates a tool named `transfer_to_refund_agent`.

> **Source**: OpenAI Agents SDK, "Handoffs" — *"Handoffs are represented as tools to the LLM."*  
> https://openai.github.io/openai-agents-python/handoffs/

#### Agents as Tools (Manager Pattern)
The manager agent stays in control and calls specialists as bounded capabilities.

> **Source**: OpenAI Agents SDK, "Orchestration and handoffs" — *"Use `agent.as_tool()` when the main agent should stay responsible for the final answer and call specialists as helpers."*  
> https://developers.openai.com/api/docs/guides/agents/orchestration

#### CrewAI's Multi-Agent Model
CrewAI uses a role-based metaphor: agents have **role**, **goal**, **backstory**, and collaborate through **tasks** assigned to **crews**.

> **Source**: CrewAI docs, "Agents" — *"An Agent is an autonomous unit that can perform specific tasks, make decisions based on its role and goal, use tools, communicate with other agents, maintain memory, and delegate tasks."*  
> https://docs.crewai.com/concepts/agents

#### AutoGen's AgentChat Model
AutoGen provides `AssistantAgent` with tools, and agents communicate through message types (`TextMessage`, `ToolCallRequestEvent`, `ToolCallExecutionEvent`, `ToolCallSummaryMessage`).

> **Source**: Microsoft AutoGen, "Agents" — *"AssistantAgent is a built-in agent that uses a language model and has the ability to use tools."*  
> https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/agents.html

### 1.5 Reflection Loops

The Evaluator-Optimizer pattern (Anthropic) and Reflexion framework both implement iterative self-improvement.

> **Source**: Shinn et al., "Reflexion: Language Agents with Verbal Reinforcement Learning" (2023), arXiv:2303.11366  
> https://arxiv.org/abs/2303.11366

Reflexion adds a **verbal reflection** step after failed attempts — the agent generates a natural language summary of what went wrong, which is stored and used as context in subsequent attempts. This is analogous to a human's "lessons learned."

Anthropic's Evaluator-Optimizer workflow:
> *"One LLM call generates a response while another provides evaluation and feedback in a loop. This is particularly effective when we have clear evaluation criteria, and when iterative refinement provides measurable value."*  
> — Anthropic, "Building Effective Agents"

### 1.6 Planner-Executor

The Planner-Executor pattern separates planning from execution. Claude Code implements this with a dedicated "plan mode":

> **Source**: Anthropic, "Best practices for Claude Code" — *"Explore first, then plan, then code. Letting Claude jump straight to coding can produce code that solves the wrong problem. The recommended workflow has four phases: Explore → Plan → Implement → Commit."*  
> https://www.anthropic.com/engineering/claude-code-best-practices

---

## 2. Core Components

### 2.1 The Augmented LLM (Foundational Building Block)

> **Source**: Anthropic, "Building Effective Agents" — *"The basic building block of agentic systems is an LLM enhanced with augmentations such as retrieval, tools, and memory."*  
> https://www.anthropic.com/engineering/building-effective-agents

Every production agent is built on this: an LLM + retrieval + tools + memory. The key is tailoring these capabilities to your use case and ensuring they provide an easy, well-documented interface.

### 2.2 Agent Definition Structure

A production agent typically consists of:

| Component | OpenAI Agents SDK | CrewAI | AutoGen |
|-----------|-------------------|--------|---------|
| **Identity** | `name`, `instructions` | `role`, `goal`, `backstory` | `name`, `description` |
| **Model** | `model` | `llm` | `model_client` |
| **Tools** | `tools` | `tools` | `tools` |
| **Guardrails** | `input_guardrails`, `output_guardrails` | `guardrail` | N/A (custom) |
| **Handoffs** | `handoffs` | `allow_delegation` | N/A (via Teams) |
| **Output format** | `output_type` (Pydantic model) | N/A (free-form) | N/A (free-form) |
| **Max iterations** | (via RunConfig) | `max_iter` (default 20) | N/A |

> **Sources**: OpenAI Agents SDK: https://developers.openai.com/api/docs/guides/agents/define-agents  
> CrewAI: https://docs.crewai.com/concepts/agents  
> AutoGen: https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/agents.html

### 2.3 Error Handling and Recovery

Production agents need multiple layers of error handling:

1. **Max iteration limits**: CrewAI defaults to `max_iter=20`. OpenAI Agents SDK uses `MaxTurnsExceeded` exception.
2. **Retry limits**: CrewAI's `max_retry_limit` (default 2). OpenAI Agents SDK has configurable retry policies.
3. **Timeout**: CrewAI's `max_execution_time` (seconds). OpenAI Agents SDK uses `max_turns`.
4. **Tool error handling**: Failed tool calls should return descriptive errors to the LLM so it can adapt.
5. **Graceful degradation**: CrewAI's `respect_context_window=True` summarizes when context fills up.

> **Source**: CrewAI docs — `max_iter`, `max_retry_limit`, `max_execution_time`, `respect_context_window` parameters  
> https://docs.crewai.com/concepts/agents

> **Source**: OpenAI Agents SDK — *"Two broad classes of non-happy-path outcomes matter: runtime or validation failures such as max-turn limits, guardrail exceptions, or tool errors; and expected pauses such as human approval requests."*  
> https://developers.openai.com/api/docs/guides/agents/running-agents

### 2.4 Guardrails

OpenAI Agents SDK provides a comprehensive guardrail system with three types:

1. **Input guardrails**: Run on user input before the agent starts. Can run in parallel (default) or blocking mode.
2. **Output guardrails**: Run on the final agent output. Always run after agent completion.
3. **Tool guardrails**: Wrap individual function tools, running before and after each tool invocation.

> **Source**: OpenAI Agents SDK, "Guardrails" — *"Guardrails enable you to do checks and validations of user input and agent output. Input guardrails run on the initial user input. Output guardrails run on the final agent output."*  
> https://openai.github.io/openai-agents-python/guardrails/

Key design decisions:
- **Parallel execution** (default): Guardrail runs concurrently with the agent. Best latency, but agent may have consumed tokens before guardrail fires.
- **Blocking execution**: Guardrail completes before agent starts. Prevents token consumption and tool side effects.

Guardrails can use a **separate, cheaper model** for validation:
> *"Run a guardrail with a fast/cheap model. If the guardrail detects malicious usage, it can immediately raise an error, saving time and money."*  
> — OpenAI Agents SDK Guardrails docs

---

## 3. Prompt Engineering for Agents

### 3.1 System Prompt Design

Anthropic's golden rule for agent system prompts:
> *"Think of Claude as a brilliant but new employee who lacks context on your norms and workflows. The more precisely you explain what you want, the better the result."*  
> *"Golden rule: Show your prompt to a colleague with minimal context on the task and ask them to follow it. If they'd be confused, Claude will be too."*  
> — Anthropic, "Prompting Best Practices"  
> https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought

**Key techniques:**

1. **Be clear and direct**: Specific output format, constraints, sequential steps.
2. **Add context/motivation**: Explain *why* instructions matter. *"Your response will be read aloud by a text-to-speech engine, so never use ellipses."*
3. **Use examples**: 3-5 few-shot examples wrapped in `<example>` tags. Diverse, relevant, structured.
4. **XML tags**: `<instructions>`, `<context>`, `<input>` for complex prompts with mixed content.
5. **Role assignment**: System prompt focuses behavior. *"You are a helpful coding assistant specializing in Python."*

### 3.2 Chain-of-Thought and Thinking

Anthropic models support extended thinking. The prompting guidance:
> *"When a technique names a specific model, treat it as measured on that model and re-check it against your own evals before applying it to another."*

OpenAI's structured output with `output_type` (Pydantic/Zod models) enforces schema compliance at the API level, removing the need for CoT extraction in many cases.

### 3.3 Agent-Specific Prompt Patterns

#### Verification Loops
> **Source**: Anthropic, Claude Code Best Practices — *"Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from."*

#### Instructions, Not Just Requests
> *"Turns with imperative instructions like 'Use my exact template' outperform suggestions like 'You can use my template if you'd like.'"*  
> — Anthropic, Prompting Best Practices

#### Handoff Prompt Injection
OpenAI Agents SDK provides a recommended prompt prefix for handoff scenarios:

```python
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
agent = Agent(
    name="Billing agent",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    <Fill in the rest of your prompt here>.""",
)
```

---

## 4. Tool Design

### 4.1 Agent-Computer Interface (ACI)

Anthropic's most important insight on tool design:
> *"One rule of thumb is to think about how much effort goes into human-computer interfaces (HCI), and plan to invest just as much effort in creating good agent-computer interfaces (ACI)."*  
> — Anthropic, "Building Effective Agents" Appendix 2  
> https://www.anthropic.com/engineering/building-effective-agents

**Tool design principles from Anthropic:**

1. **Put yourself in the model's shoes**: Is it obvious how to use this tool? Include example usage, edge cases, input format requirements, and clear boundaries from other tools.
2. **Improve parameter names/descriptions**: *"Think of this as writing a great docstring for a junior developer on your team."*
3. **Test how the model uses your tools**: Run many example inputs, see what mistakes the model makes, iterate.
4. **Poka-yoke your tools**: Change arguments so mistakes are harder. *"We found that the model would make mistakes with tools using relative filepaths... We changed the tool to always require absolute filepaths — and we found that the model used this method flawlessly."*
5. **Give enough tokens to think**: Don't force the model to write itself into a corner (e.g., diffs require knowing line counts before writing code).
6. **Keep format natural**: Match what appears in training data. JSON with code inside is harder than markdown code blocks.

### 4.2 Tool Schema Design

OpenAI function calling uses JSON Schema:

```python
# From OpenAI docs
tools = [{
    "type": "function",
    "name": "get_weather",
    "description": "Get current temperature for a given location.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "City and state, e.g. San Francisco, CA"
            }
        },
        "required": ["location"]
    },
}]
```

> **Source**: OpenAI, "Function calling" — https://developers.openai.com/api/docs/guides/function-calling

### 4.3 Tool Search and Namespacing

For agents with many tools, OpenAI provides **tool search** (gpt-5.4+) to defer rarely-used tools:

> *"Tool search lets OpenAI Responses models defer large tool surfaces until runtime, so the model loads only the subset it needs for the current turn."*  
> — OpenAI Agents SDK, "Tools"

```python
from agents import Agent, ToolSearchTool, tool_namespace

crm_tools = tool_namespace(
    name="crm",
    description="CRM tools for customer lookups.",
    tools=[get_customer_profile, list_open_orders],
)
agent = Agent(
    name="Operations assistant",
    tools=[*crm_tools, ToolSearchTool()],
)
```

### 4.4 Programmatic Tool Calling

A newer pattern where the model generates JavaScript to orchestrate multiple tool calls in a single step:

> *"Programmatic Tool Calling lets a supported model generate JavaScript that calls eligible tools, combines their outputs, and returns one result. It is useful for bounded workflows that benefit from loops, branching, parallel calls, or intermediate calculations without a model round trip after every tool call."*  
> — OpenAI Agents SDK, "Tools"

### 4.5 MCP (Model Context Protocol)

MCP is an open standard for connecting AI applications to external systems — described as "USB-C for AI."

> **Source**: Model Context Protocol — *"MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems."*  
> https://modelcontextprotocol.io/introduction

**Architecture:**
- **MCP Host**: The AI application (e.g., Claude Desktop, VS Code)
- **MCP Client**: Maintains connection to an MCP server
- **MCP Server**: Provides context (tools, resources, prompts) to clients

**Three core primitives servers expose:**

| Primitive | Purpose | Model Control |
|-----------|---------|---------------|
| **Tools** | Executable functions (API calls, file ops) | Model decides when to use |
| **Resources** | Read-only data sources (schemas, documents) | Application decides |
| **Prompts** | Reusable interaction templates | User decides |

> **Source**: MCP Server Concepts — *"Tools are schema-defined interfaces that LLMs can invoke. Each tool performs a single operation with clearly defined inputs and outputs."*  
> https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts

**Transport:**
- **STDIO**: For local servers, direct process communication
- **Streamable HTTP**: For remote servers, uses HTTP POST + Server-Sent Events

**Key design feature**: MCP is stateless — every request carries all needed information. Servers advertise capabilities via `server/discover`.

> **Source**: MCP Architecture — *"MCP is a stateless protocol. Every request carries the protocol version and capabilities relevant to that request."*  
> https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture

MCP is supported by Claude, ChatGPT, VS Code, Cursor, and many other clients.

### 4.6 Single-Tool Focus and Idempotency

Production tool design principles:
- **Single responsibility**: Each tool does one thing well
- **Idempotent where possible**: Same inputs should produce same outputs
- **Descriptive errors**: Return enough information for the model to adapt
- **Bounded execution time**: Avoid tools that can run indefinitely
- **Clear output format**: Structured data the model can reason about

---

## 5. Memory and State Management

### 5.1 Conversation History Strategies

OpenAI Agents SDK defines four strategies for carrying state between turns:

| Strategy | Where state lives | Best for |
|----------|-------------------|----------|
| `result.history` / `result.to_input_list()` | Your application | Small loops, maximum control |
| `session` | Your storage + SDK | Persistent chat, resumable runs |
| `conversationId` | OpenAI Conversations API | Shared server-managed state |
| `previousResponseId` | OpenAI Responses API | Lightest continuation option |

> **Source**: OpenAI Agents SDK, "Running agents"  
> https://developers.openai.com/api/docs/guides/agents/running-agents

```python
# Session-based memory
from agents import Agent, Runner, SQLiteSession
agent = Agent(name="Tour guide", instructions="Answer with compact travel facts.")
session = SQLiteSession("conversation_123")
first = await Runner.run(agent, "What city is the Golden Gate Bridge in?", session=session)
second = await Runner.run(agent, "What state is it in?", session=session)
```

### 5.2 CrewAI's Unified Memory System

CrewAI implements a sophisticated memory system with hierarchical scopes:

> **Source**: CrewAI Memory docs — *"Memory uses an LLM to analyze content when saving (inferring scope, categories, and importance) and supports adaptive-depth recall with composite scoring."*  
> https://docs.crewai.com/concepts/memory

**Composite scoring formula:**
```
composite = semantic_weight * similarity + recency_weight * decay + importance_weight * importance
```

**Hierarchical scopes** (like a filesystem):
```
/
  /project/alpha
  /project/beta
  /agent/researcher
  /agent/writer
```

Key features:
- **LLM-based scope inference**: The LLM analyzes content and places it in the right scope automatically
- **Memory consolidation**: Automatically merges/deduplicates similar memories (threshold: 0.85 cosine similarity)
- **Intra-batch dedup**: Within `remember_many()`, near-duplicates (≥0.98 similarity) are dropped without LLM calls
- **Memory slices**: Views across multiple scopes (e.g., agent private + shared company knowledge)
- **Non-blocking saves**: `remember_many()` returns immediately, saves in background

```python
memory = Memory(recency_weight=0.5, semantic_weight=0.3, importance_weight=0.2)
memory.remember("We chose PostgreSQL for the user database.")
matches = memory.recall("What database did we choose?")
```

### 5.3 RAG Integration

RAG (Retrieval-Augmented Generation) is the primary mechanism for giving agents access to external knowledge:

- **OpenAI FileSearchTool**: Searches vector stores with filters, ranking, and configurable result count
- **CrewAI Knowledge Sources**: Agents can have `knowledge_sources` attached
- **AutoGen Workbench**: Collections of tools sharing state and resources

> **Source**: OpenAI Agents SDK tools docs — `FileSearchTool(vector_store_ids=["..."], max_num_results=3)`  
> https://openai.github.io/openai-agents-python/tools/

### 5.4 Context Window as the Core Constraint

> **Source**: Anthropic, Claude Code Best Practices — *"Claude's context window holds your entire conversation, including every message, every file Claude reads, and every command output. However, this can fill up fast... LLM performance degrades as context fills."*  
> https://www.anthropic.com/engineering/claude-code-best-practices

**Memory management strategies:**
- Summarize old context when approaching limits (CrewAI: `respect_context_window=True`)
- Use targeted retrieval instead of stuffing all context
- Separate model context (what LLM sees) from application context (what code sees)
- Track context usage continuously with status indicators

---

## 6. Evaluation and Reliability

### 6.1 Evaluation Framework

LangSmith provides a structured approach to agent evaluation:

> **Source**: LangSmith Evaluation Concepts — *"Before building evaluations, identify what matters for your application. Break down your system into its critical components — LLM calls, retrieval steps, tool invocations, output formatting — and determine quality criteria for each."*  
> https://docs.langchain.com/langsmith/evaluation-concepts

**Two evaluation types:**

| Type | Purpose | Runs on |
|------|---------|---------|
| **Offline** | Pre-deployment testing, benchmarking, regression | Curated datasets with reference outputs |
| **Online** | Production monitoring, anomaly detection | Live traffic traces (no reference outputs) |

**Agent-specific evaluation criteria:**
- Correct tool selection
- Proper argument formatting
- **Trajectory** analysis (the path the agent took)

### 6.2 Observability

OpenAI Agents SDK provides built-in tracing with traces and spans:

> **Source**: OpenAI Agents SDK, "Tracing" — *"The SDK includes built-in tracing, collecting a comprehensive record of events: LLM generations, tool calls, handoffs, guardrails, and custom events."*  
> https://openai.github.io/openai-agents-python/tracing/

**Default trace hierarchy:**
```
trace (Agent workflow)
  └── task_span
      └── turn_span
          ├── agent_span
          │   └── generation_span (LLM call)
          ├── function_span (tool call)
          ├── guardrail_span
          └── handoff_span
```

**Key observability features:**
- Custom trace processors for alternative backends
- Sensitive data controls (`trace_include_sensitive_data`)
- Group IDs for linking traces across conversations
- Long-running worker support with `flush_traces()`

LangSmith provides equivalent functionality for LangChain-based agents.

> **Source**: LangSmith Observability — *"Full visibility into your LLM application: from individual traces to production-wide performance metrics."*  
> https://docs.smith.langchain.com/observability

### 6.3 Verification Patterns

Claude Code implements multiple verification strategies:

> **Source**: Anthropic, Claude Code Best Practices — *"Give Claude a check it can run... The difference between a session you watch and one you walk away from."*

| Verification Level | Setup | Guarantees |
|-------------------|-------|------------|
| **In-prompt** | Ask to run tests in same message | Works immediately |
| **Goal condition** | `/goal` re-checked after every turn | Unattended sessions |
| **Stop hook** | Script blocks turn until check passes | Deterministic gate (8-block limit) |
| **Verification subagent** | Separate model tries to refute findings | Independent quality check |

### 6.4 Failure Modes

Common agent failure modes documented across sources:

1. **Context window overflow**: Performance degrades, agent "forgets" earlier instructions
2. **Tool misuse**: Wrong tool selection, malformed arguments, hallucinated parameters
3. **Infinite loops**: Agent repeats same actions without progress (mitigated by `max_iter`/`max_turns`)
4. **Prompt injection**: Malicious user input manipulates agent behavior
5. **Compounding errors**: Each wrong step makes recovery harder
6. **Over-verification**: Agent spends excessive resources checking low-risk work

> **Source**: Anthropic, "Building Effective Agents" — *"The autonomous nature of agents means higher costs, and the potential for compounding errors. We recommend extensive testing in sandboxed environments, along with the appropriate guardrails."*

---

## 7. Real-World Examples

### 7.1 OpenAI Agents SDK

The most production-ready agent framework as of 2025-2026.

**Core concepts**: Agent → Runner → Result
**Key patterns**:
- Agent loop with tool calls and handoffs
- Sessions for durable state
- Guardrails (input, output, tool-level)
- Built-in tracing
- Sandbox agents for container-based execution
- MCP integration
- Voice and realtime agents

> **Source**: OpenAI Agents SDK README — *"A lightweight yet powerful framework for building multi-agent workflows."*  
> https://github.com/openai/openai-agents-python

### 7.2 Anthropic Claude Code

A production agentic coding environment.

**Key design decisions:**
- **Plan mode**: Separate exploration from execution
- **CLAUDE.md**: Persistent context file read every session
- **Verification-first**: Every task should have a check the agent can run
- **Context window discipline**: Most important resource to manage
- **Skills**: On-demand knowledge loading to avoid bloating every conversation
- **Sub-agents**: Separate agents for verification (fresh model refutes findings)
- **Hooks**: Deterministic gates that block turn completion until checks pass

> **Source**: Anthropic, "Best practices for Claude Code"  
> https://www.anthropic.com/engineering/claude-code-best-practices

### 7.3 OpenHands (formerly OpenDevin)

Now evolved into "Agent Canvas" — a self-hosted developer control center.

**Architecture**: Multi-repository system:
- `OpenHands/OpenHands`: Agent Canvas frontend and orchestration
- `OpenHands/software-agent-sdk`: Python SDK, Agent Server, agents, tools, conversations, workspaces, events
- `OpenHands/typescript-client`: Browser client
- `OpenHands/automation`: Scheduling, webhooks, run history

**Key feature**: Backend-agnostic — can run OpenHands, Claude Code, Codex, Gemini, or any ACP-compatible agent.

> **Source**: OpenHands README — *"Agent Canvas turns your coding agents into a self-hosted, always-on engineering team."*  
> https://github.com/OpenHands/OpenHands

### 7.4 SWE-agent / mini-SWE-agent

Academic coding agent from Princeton/Stanford.

**Key insight**: mini-SWE-agent achieves 65% on SWE-bench Verified in **100 lines of Python**, demonstrating that effective agents can be simple.

**Design philosophy**:
- *"Free-flowing & generalizable: Leaves maximal agency to the LM"*
- *"Configurable & fully documented: Governed by a single yaml file"*
- *"Made for research: Simple & hackable by design"*

The Agent-Computer Interface (ACI) is the key design focus — the tools the agent uses to interact with the codebase.

> **Source**: SWE-agent README — https://github.com/princeton-nlp/SWE-agent  
> **Paper**: Yang et al., "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering" (2024), arXiv:2405.15793

### 7.5 CrewAI

Multi-agent framework with role-based design.

**Distinctive features:**
- **Reasoning mode**: Agents can reflect and create plans before executing
- **Knowledge sources**: Attach external knowledge to agents
- **Flow-based workflows**: Sequential and hierarchical process execution
- **Memory system**: LLM-powered hierarchical scoping with composite scoring
- **Guardrails**: Task-level validation
- **Custom templates**: System, prompt, and response templates per agent

> **Source**: CrewAI docs — https://docs.crewai.com/concepts/agents

### 7.6 AutoGen (Microsoft)

Multi-agent conversation framework.

**Key design**: Agents communicate through typed messages. `AssistantAgent` is the core "kitchen sink" agent for prototyping. Teams orchestrate multiple agents.

**Distinctive features**:
- **Workbench**: Collections of tools sharing state and resources
- **MCP integration**: `McpWorkbench()` for MCP server tools
- **Streaming**: `run_stream()` yields messages incrementally
- **Stateful agents**: `run()` updates internal state; call without task to continue

> **Source**: AutoGen docs — *"AssistantAgent is a 'kitchen sink' agent for prototyping and educational purpose — it is very general. Make sure you read the documentation and implementation to understand the design choices."*  
> https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/agents.html

### 7.7 Comparison Matrix

| Framework | Multi-agent | Tool std | Memory | Guardrails | Tracing | Sandbox |
|-----------|-------------|----------|--------|------------|---------|---------|
| OpenAI Agents SDK | Handoffs + Tools | Function + MCP | Sessions + Conversations | Input/Output/Tool | Built-in | Container |
| Claude Code | Sub-agents | Bash + MCP | CLAUDE.md + Skills | Stop hooks + Goals | Via platform | Local |
| CrewAI | Delegation + Crews | BaseTool + MCP | Unified Memory | Task-level | Step callbacks | Docker |
| AutoGen | Teams + Messages | FunctionTool + MCP | Message history | N/A | N/A | N/A |
| OpenHands | ACP protocol | Agent SDK | Workspace events | N/A | Run history | Docker/VM |
| LangGraph | Graph-based | LangChain tools | Checkpointer | Custom | LangSmith | Custom |

---

## 8. Key Design Principles

### 8.1 What Makes an Agent "Good"

Drawing from all sources, the key qualities:

1. **Start simple, add complexity only when it demonstrably improves outcomes**
   > *"When building applications with LLMs, we recommend finding the simplest solution possible, and only increasing complexity when needed."* — Anthropic

2. **The agent-computer interface is as important as the human-computer interface**
   > *"Plan to invest just as much effort in creating good agent-computer interfaces (ACI)."* — Anthropic

3. **Give agents verification mechanisms**
   > *"Give Claude a check it can run... the difference between a session you watch and one you walk away from."* — Anthropic

4. **Design for context window efficiency**
   > *"Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills."* — Anthropic

5. **Separate model context from application context**
   > *"Conversation history is what the model sees. Run context is what your code sees. If the model needs a fact, put it in instructions, input, retrieval, or a tool."* — OpenAI Agents SDK

6. **Start with one focused agent, split only when the contract changes**
   > *"Start with one agent whenever you can. Add specialists only when they materially improve capability isolation, policy isolation, prompt clarity, or trace legibility."* — OpenAI Agents SDK

7. **Use guardrails with cheaper models**
   > *"Run a guardrail with a fast/cheap model. If it detects malicious usage, it can immediately raise an error, saving time and money."* — OpenAI Agents SDK

### 8.2 What Makes an Agent "Bad"

1. **No verification mechanism**: Agent stops when work "looks done" without checking
2. **Context window bloat**: Loading too much into every prompt (CLAUDE.md anti-pattern: *"Ask: 'Would removing this cause Claude to make mistakes?' If not, cut it."*)
3. **Premature multi-agent complexity**: Splitting into specialists before understanding the problem
4. **Poor tool design**: Vague descriptions, ambiguous parameters, no error messages
5. **No stopping conditions**: Infinite loops without max iterations or time limits
6. **Ignoring compounding errors**: No recovery strategy when tools return bad results
7. **Prompt injection vulnerability**: No guardrails on user input
8. **Opaque behavior**: No tracing, no logging, impossible to debug

### 8.3 Single-Responsibility vs. General-Purpose Tradeoffs

| Dimension | Single-Responsibility | General-Purpose |
|-----------|----------------------|-----------------|
| **Prompt clarity** | ✅ Focused instructions | ❌ Large, complex prompts |
| **Tool surface** | ✅ Fewer, clearer tools | ❌ Tool search/namespace needed |
| **Debugging** | ✅ Easy to trace failures | ❌ Hard to isolate issues |
| **Cost** | ✅ Can use cheaper models | ❌ Often needs top-tier models |
| **Flexibility** | ❌ Can't handle novel tasks | ✅ Adapts to new situations |
| **Composition** | ✅ Combine specialists as needed | ❌ Monolithic, hard to modify |
| **Verification** | ✅ Domain-specific checks | ❌ Generic validation only |

> *"Add specialists only when the contract changes."* — OpenAI Agents SDK

### 8.4 Three Core Principles (Anthropic)

> **Source**: Anthropic, "Building Effective Agents" summary
>
> 1. Maintain **simplicity** in your agent's design.
> 2. Prioritize **transparency** by explicitly showing the agent's thinking and actions.
> 3. Carefully craft your agent-computer interface (ACI) through thorough tool **documentation and testing**.

---

## Sources

### Official Documentation
- Anthropic. "Building Effective Agents." Dec 2024. https://www.anthropic.com/engineering/building-effective-agents
- Anthropic. "Best practices for Claude Code." 2025. https://www.anthropic.com/engineering/claude-code-best-practices
- Anthropic. "Prompting Best Practices." https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought
- Anthropic. "Tool Use Overview." https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview
- OpenAI. "Function Calling." https://developers.openai.com/api/docs/guides/function-calling
- OpenAI. "Using Tools." https://developers.openai.com/api/docs/guides/tools
- OpenAI. "Agents SDK." https://developers.openai.com/api/docs/guides/agents
- OpenAI. "Running Agents." https://developers.openai.com/api/docs/guides/agents/running-agents
- OpenAI. "Orchestration and Handoffs." https://developers.openai.com/api/docs/guides/agents/orchestration
- OpenAI. "Agent Definitions." https://developers.openai.com/api/docs/guides/agents/define-agents
- Model Context Protocol. "Introduction." https://modelcontextprotocol.io/introduction
- Model Context Protocol. "Architecture Overview." https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture
- Model Context Protocol. "Server Concepts." https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts
- LangSmith. "Evaluation Concepts." https://docs.langchain.com/langsmith/evaluation-concepts
- LangSmith. "Observability." https://docs.smith.langchain.com/observability

### Open-Source Frameworks
- OpenAI Agents SDK (Python). https://github.com/openai/openai-agents-python
- OpenAI Agents SDK docs: Tools, Guardrails, Handoffs, Tracing. https://openai.github.io/openai-agents-python/
- CrewAI. "Agents." https://docs.crewai.com/concepts/agents
- CrewAI. "Memory." https://docs.crewai.com/concepts/memory
- Microsoft AutoGen. "Agents." https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/agents.html
- OpenHands. https://github.com/OpenHands/OpenHands
- SWE-agent. https://github.com/princeton-nlp/SWE-agent
- LangGraph. https://github.com/langchain-ai/langgraph

### Academic Papers
- Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv:2210.03629, 2022. https://arxiv.org/abs/2210.03629
- Shinn et al. "Reflexion: Language Agents with Verbal Reinforcement Learning." arXiv:2303.11366, 2023. https://arxiv.org/abs/2303.11366
- Qian et al. "ChatDev: Communicative Agents for Software Development." arXiv:2307.07924, 2023. https://arxiv.org/abs/2307.07924
- Wang et al. "Voyager: An Open-Ended Embodied Agent with Large Language Models." arXiv:2305.16291, 2023. https://arxiv.org/abs/2305.16291
- Yang et al. "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering." arXiv:2405.15793, 2024. https://arxiv.org/abs/2405.15793

---

*Research compiled 2026-09-07. Sources verified against primary documentation as of that date.*
