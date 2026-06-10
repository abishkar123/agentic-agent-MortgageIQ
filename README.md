# MortgageIQ Agent Swarm

Multi-agent AI system built with Mastra — the TypeScript-native agent framework.
Evolves MortgageIQ from a RAG chatbot into a routed, evaluated, compliance-gated agent swarm.

## Architecture

Centralized orchestration: an **OpenAI orchestrator** (main agent) routes via tool
calls to **Groq sub-agents**, each wrapped in a circuit breaker. Every response then
passes a deterministic compliance gate. See `docs/multi_agent_orchestration_design.md`
for the full design rationale.

```
User query (+ conversation history)
    ↓
Orchestrator Agent (OpenAI gpt-4o)
    ├── delegate_to_faq        → FAQ Agent (Groq)        → knowledge search tool
    ├── delegate_to_calculator → Calculator Agent (Groq) → Math tools (repayment, LVR, borrowing)
    ├── delegate_to_eligibility→ Eligibility Agent (Groq)→ Rules engine tool
    └── escalate_to_human      → static broker handoff
    ↓
Compliance gate (Groq complianceAgent — deterministic, not skippable)
    ↓
Response + toolCalls audit trail
```

If `OPENAI_API_KEY` is not set (or the orchestrator errors), the API falls back to
the deterministic workflow in `src/workflows/loanEnquiry.ts` (regex intent
classification → specialist → compliance).

## Patterns you learn

| Pattern | Where | What it teaches |
|---|---|---|
| Orchestrator | `agents/orchestrator.ts` | Central agent routes complex tasks to specialists |
| Agents as tools | `agents/orchestrator.ts` | Sub-agents wrapped in `createTool` |
| Mixed LLM providers | `agents/orchestrator.ts` + `agents/specialists.ts` | OpenAI for routing/synthesis, Groq for task execution |
| Circuit breaker | `lib/circuitBreaker.ts` | Per-agent failure isolation with half-open recovery |
| Deterministic fallback | `app/api/chat/route.ts` | Workflow path when the orchestrator is unavailable |
| Parallel agents | `workflows/loanEnquiry.ts` | `Promise.all` on two agents |
| Compliance gate | `lib/compliance.ts` | Every output reviewed before delivery — structurally, not by prompt |
| Eval harness | `evals/harness.ts` | Routing accuracy + tool call correctness |
| CI eval gate | `.github/workflows/ci.yml` | Blocks deploy on eval regression |

## Stack

| Layer | Tool |
|---|---|
| Agent framework | Mastra `@mastra/core` |
| LLM — orchestrator | OpenAI `gpt-4o` (override with `OPENAI_MODEL`) |
| LLM — sub-agents | Groq `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` |
| LLM providers | Vercel AI SDK `@ai-sdk/openai` + `@ai-sdk/groq` |
| Vector store | HNSWLib (from mortgageiq-ts) |
| UI | Next.js 15 + Tailwind |

## Setup

```bash
npm install
cp .env.example .env
# Add GROQ_API_KEY from console.groq.com (sub-agents)
# Add OPENAI_API_KEY from platform.openai.com (orchestrator;
# without it the app falls back to the deterministic workflow)

# Requires hnswlib_db from mortgageiq-ts to already exist
# If not: cd ../mortgageiq-ts && npm run ingest

npm run dev       # http://localhost:3000
npm run eval      # run agent eval harness
npm run mastra    # Mastra Studio UI (agent playground)
```

## Mastra Studio

```bash
npm run mastra
```

Opens the Mastra Studio at http://localhost:4111 — a visual agent playground where you can:
- Run agents interactively with step-by-step trace
- See tool calls in real time
- Replay past runs
- Edit agent instructions without restarting

## Progression from MortgageIQ RAG

```
mortgageiq-ts (RAG)          mortgageiq-agents (multi-agent)
─────────────────────────    ────────────────────────────────
Single RAG chain          →  Supervisor + 4 specialists
No routing                →  Intent classification + routing
Manual compliance check   →  Compliance agent on every response
No HITL                   →  .suspend()/.resume() workflow gate
RAGAS eval                →  Agent eval harness (routing + tool accuracy)
```
