# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js dev server — http://localhost:3000
npm run build      # Production build (also runs typecheck via precommit hook)
npm run typecheck  # tsc --noEmit
npm run eval       # Agent eval harness — requires GROQ_API_KEY + OPENAI_API_KEY
npm run mastra     # Mastra Studio at http://localhost:4111
```

The precommit hook runs `typecheck && build` on every commit. There is no test suite beyond the eval harness.

To run the eval harness meaningfully, `GROQ_API_KEY` and `OPENAI_API_KEY` must be set in `.env`. The eval gates on an overall score ≥ 0.70 across routing accuracy, tool-call accuracy, and LLM-judged relevance.

## Architecture

This is a **multi-agent mortgage assistant** built with Mastra (TypeScript agent framework) on Next.js 15. The main orchestrator agent runs on **OpenAI**; all sub-agents run on **Groq**. Design rationale: `docs/multi_agent_orchestration_design.md`.

### Request path

```
POST /api/chat  (app/api/chat/route.ts)
  → extracts latest user message + conversation history (last 10 turns)
  → if OPENAI_API_KEY set: orchestrator path (primary)
      orchestratorAgent.generateLegacy([...history, userMsg], { maxSteps: 8 })
        — OpenAI agent delegates via tools: delegate_to_faq / delegate_to_calculator /
          delegate_to_eligibility / escalate_to_human (each wrapped in a circuit breaker)
      reviewCompliance(text)  — deterministic compliance gate (skipped for escalations)
  → else (or on orchestrator error): workflow fallback
      loanEnquiryWorkflow: classifyIntent → hitlGate → runSpecialist → supervisorReview
  → returns plain text + __META__{toolCalls:[...]} for UI badges
```

### Agents (`src/agents/`)

| Agent | Model | Tools | Role |
|---|---|---|---|
| `orchestratorAgent` | OpenAI gpt-4o (env `OPENAI_MODEL`) | delegate tools + escalate | Main agent — routing + synthesis (live path + evals) |
| `faqAgent` | Groq llama-3.3-70b-versatile | `knowledgeSearchTool` | Answers product/policy/education questions |
| `calculatorAgent` | Groq llama-3.1-8b-instant | repayment, LVR, borrowing capacity tools | Numerical mortgage calculations |
| `eligibilityAgent` | Groq llama-3.1-8b-instant | `eligibilityCheckTool` | Preliminary eligibility assessment |
| `complianceAgent` | Groq llama-3.1-8b-instant | none | NCCP/APRA/DDO review — called via `src/lib/compliance.ts`, never as an orchestrator tool |

### Knowledge source (`src/data/knowledge.ts` + `src/tools/knowledge.ts`)

FAQ answers come from a static in-code knowledge base (30 entries). `knowledgeSearchTool` scores entries using weighted keyword matching — no embeddings, no external DB. To add knowledge, add entries to `knowledgeBase` in `src/data/knowledge.ts`.

### Orchestrator vs workflow

Two execution paths exist:
- **Orchestrator** (`src/agents/orchestrator.ts`) — primary production path. OpenAI LLM-driven routing via tool delegation to Groq sub-agents. Also used by `npm run eval`.
- **Workflow** (`src/workflows/loanEnquiry.ts`) — deterministic fallback (regex intent classification → specialist → compliance). Used when `OPENAI_API_KEY` is missing or the orchestrator throws.

### Conversation history

Each API call receives the full `messages[]` array. The route extracts history (all messages before the latest user turn) and passes it through the workflow so agents call `agent.generate([...history, { role: 'user', content: query }])`.

### UI badges

The API response format is `<response text>\n__META__{"toolCalls":["delegate_to_faq"]}`. The UI (`app/page.tsx`) splits on `__META__` to render coloured agent badges.

## Key constraints

- **Compliance is a structural gate, not a tool** — never give the orchestrator a compliance tool or call `orchestratorAgent.generateLegacy()` with a plain-text compliance prompt. Always go through `reviewCompliance()` in `src/lib/compliance.ts`, which calls `complianceAgent` directly after the orchestrator answers.
- **Circuit breakers** (`src/lib/circuitBreaker.ts`) wrap each delegation: 3 consecutive sub-agent failures open the circuit for 30s; a delegation failure returns a degraded tool result (`SPECIALIST UNAVAILABLE: …`) instead of throwing.
- **HITL suspend is disabled** — `hitlGate` returns `approved:false` instead of calling `suspend()`, keeping the workflow synchronous. Escalation cases are handled by `runSpecialist` (workflow) or the `escalate_to_human` tool (orchestrator) returning a static broker message.
- The `.npmrc` sets `legacy-peer-deps=true` — required due to peer dependency conflicts in the Mastra + LangChain combination.
- CI (`agent-eval` job) depends on a cached HNSWLib vector store from a sibling `mortgageiq-ts` repo. This cache will miss in fresh environments; evals will degrade gracefully to "knowledge base not available" answers.
