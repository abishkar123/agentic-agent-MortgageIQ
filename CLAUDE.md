# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js dev server — http://localhost:3000
npm run build      # Production build (also runs typecheck via precommit hook)
npm run typecheck  # tsc --noEmit
npm run eval       # Agent eval harness — requires GROQ_API_KEY
npm run mastra     # Mastra Studio at http://localhost:4111
```

The precommit hook runs `typecheck && build` on every commit. There is no test suite beyond the eval harness.

To run the eval harness meaningfully, `GROQ_API_KEY` must be set in `.env`. The eval gates on an overall score ≥ 0.70 across routing accuracy, tool-call accuracy, and LLM-judged relevance.

## Architecture

This is a **multi-agent mortgage assistant** built with Mastra (TypeScript agent framework) on Next.js 15.

### Request path

```
POST /api/chat  (app/api/chat/route.ts)
  → extracts latest user message + full conversation history
  → loanEnquiryWorkflow.createRun().start({ query, history })
      1. classifyIntent  — regex-based intent detection (faq/calculator/eligibility/multi/escalate)
      2. hitlGate        — returns approved:false for sensitive keywords (bankruptcy, SMSF, etc.)
      3. runSpecialist   — calls the right agent(s) with full message history
      4. supervisorReview— complianceAgent reviews the response text
  → returns plain text + __META__{toolCalls:[...]} for UI badges
```

### Agents (`src/agents/`)

| Agent | Model | Tools | Role |
|---|---|---|---|
| `supervisorAgent` | llama-3.3-70b-versatile | delegate tools + complianceReviewTool | Routing + compliance gate (used directly only by evals) |
| `faqAgent` | llama-3.3-70b-versatile | `knowledgeSearchTool` | Answers product/policy/education questions |
| `calculatorAgent` | llama-3.1-8b-instant | repayment, LVR, borrowing capacity tools | Numerical mortgage calculations |
| `eligibilityAgent` | llama-3.1-8b-instant | `eligibilityCheckTool` | Preliminary eligibility assessment |
| `complianceAgent` | llama-3.1-8b-instant | none | NCCP/APRA/DDO review — called directly, not via supervisor |

The `supervisorAgent` is **not** in the live request path — the workflow calls specialists directly. The supervisor is used only by the eval harness and for historical reference.

### Knowledge source (`src/data/knowledge.ts` + `src/tools/knowledge.ts`)

FAQ answers come from a static in-code knowledge base (30 entries). `knowledgeSearchTool` scores entries using weighted keyword matching — no embeddings, no external DB. To add knowledge, add entries to `knowledgeBase` in `src/data/knowledge.ts`.

### Workflow vs supervisor

Two execution paths exist:
- **Workflow** (`src/workflows/loanEnquiry.ts`) — active production path. Deterministic intent classification → specialist → compliance.
- **Supervisor** (`src/agents/supervisor.ts`) — LLM-driven routing via tool delegation. Used only by `npm run eval`. Do not use for new features.

### Conversation history

Each API call receives the full `messages[]` array. The route extracts history (all messages before the latest user turn) and passes it through the workflow so agents call `agent.generate([...history, { role: 'user', content: query }])`.

### UI badges

The API response format is `<response text>\n__META__{"toolCalls":["delegate_to_faq"]}`. The UI (`app/page.tsx`) splits on `__META__` to render coloured agent badges.

## Key constraints

- **Do not call `supervisorAgent.generate()` for compliance** — it has 5 tools registered and Groq produces malformed function calls when given a plain-text compliance prompt. Always use `complianceAgent` directly.
- **HITL suspend is disabled** — `hitlGate` returns `approved:false` instead of calling `suspend()`, keeping the workflow synchronous. Escalation cases are handled by the `runSpecialist` step returning a static broker message.
- The `.npmrc` sets `legacy-peer-deps=true` — required due to peer dependency conflicts in the Mastra + LangChain combination.
- CI (`agent-eval` job) depends on a cached HNSWLib vector store from a sibling `mortgageiq-ts` repo. This cache will miss in fresh environments; evals will degrade gracefully to "knowledge base not available" answers.
