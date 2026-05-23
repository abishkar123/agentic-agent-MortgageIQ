# MortgageIQ Agent Swarm

Multi-agent AI system built with Mastra — the TypeScript-native agent framework.
Evolves MortgageIQ from a RAG chatbot into a routed, evaluated, compliance-gated agent swarm.

## Architecture

```
User query
    ↓
Supervisor Agent (llama-3.1-70b)
    ├── delegate_to_faq        → FAQ Agent       → RAG search tool
    ├── delegate_to_calculator → Calculator Agent → Math tools (repayment, LVR, borrowing)
    ├── delegate_to_eligibility→ Eligibility Agent→ Rules engine tool
    ├── compliance_review      → Compliance Agent → NCCP/APRA checker
    └── escalate_to_human      → HITL workflow gate
```

## Patterns you learn

| Pattern | Where | What it teaches |
|---|---|---|
| Supervisor | `agents/supervisor.ts` | Route complex tasks to specialists |
| Agents as tools | `agents/supervisor.ts` | Sub-agents wrapped in `createTool` |
| Parallel agents | `workflows/loanEnquiry.ts` | `Promise.all` on two agents |
| Human-in-the-loop | `workflows/loanEnquiry.ts` | `.suspend()` / `.resume()` |
| Compliance gate | `agents/specialists.ts` | Every output reviewed before delivery |
| Eval harness | `evals/harness.ts` | Routing accuracy + tool call correctness |
| CI eval gate | `.github/workflows/ci.yml` | Blocks deploy on eval regression |

## Stack (all free)

| Layer | Tool |
|---|---|
| Agent framework | Mastra `@mastra/core` |
| LLM — supervisor | Groq `llama-3.3-70b-versatile` |
| LLM — specialists | Groq `llama-3.1-8b-instant` |
| LLM provider | Vercel AI SDK `@ai-sdk/groq` |
| Vector store | HNSWLib (from mortgageiq-ts) |
| UI | Next.js 15 + Tailwind |

## Setup

```bash
npm install
cp .env.example .env
# Add GROQ_API_KEY from console.groq.com

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
