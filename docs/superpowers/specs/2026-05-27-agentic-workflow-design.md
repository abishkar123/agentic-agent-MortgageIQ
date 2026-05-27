# Agentic Workflow Design

**Date:** 2026-05-27  
**Status:** Implemented

## Problem

The project had three blockers preventing it from answering user questions:

1. **Broken knowledge source** — `faqAgent` depended on a local HNSWLib vector store at `../mortgageiq-ts/hnswlib_db` that does not exist in this repository. Every FAQ question returned "knowledge base not available."
2. **No conversation history** — The chat API sent only the latest user message to the supervisor. Previous turns were lost, so context like "what was my last question?" could not be answered.
3. **Unused workflow** — A more capable `loanEnquiry` workflow existed in `src/workflows/loanEnquiry.ts` but was never called by the API route, which used the simpler `supervisorAgent.generate()` directly.

## Solution

### Static Knowledge Base (`src/data/knowledge.ts`)

A comprehensive in-code knowledge base with 30 entries across six categories: products, eligibility, process, FAQ, and glossary. Topics include variable/fixed/split/offset/construction/investment loans, LVR, LMI, deposit requirements, serviceability, credit scoring, self-employment, first home buyers, refinancing, and the application process.

No external APIs or ingestion pipeline required.

### Knowledge Search Tool (`src/tools/knowledge.ts`)

A `knowledgeSearchTool` that performs keyword-based scoring over the knowledge base. Extracts significant terms from the query, scores each entry by keyword matches (with weights for phrase matches, title hits, and content hits), and returns the top K results. Replaces the broken `ragSearchTool`.

### Updated FAQ Agent (`src/agents/specialists.ts`)

`faqAgent` now uses `knowledgeSearchTool` instead of `ragSearchTool`. Upgraded to `llama-3.3-70b-versatile` for better synthesis of knowledge entries into natural answers. Instructions updated to synthesise results naturally without referencing the underlying search mechanism.

### Activated Workflow with Conversation History (`src/workflows/loanEnquiry.ts`)

The `loanEnquiry` workflow is now the primary execution path. Key changes:

- **History schema** added to workflow input: `{ query: string, history: { role, content }[] }`
- **History threaded** through `classifyIntent` and `hitlGate` output schemas so `runSpecialist` can access it
- **`runSpecialist` builds a message array** from history + current query and passes it to `agent.generate(messages)`, giving agents full conversation context
- **HITL suspend removed** — `hitlGate` now returns `approved: false` for escalation cases instead of calling `suspend()`, making the workflow always complete synchronously

### Updated API Route (`app/api/chat/route.ts`)

- Uses `loanEnquiryWorkflow.createRun()` and `run.start()` instead of `supervisorAgent.generate()`
- Extracts conversation history from the `messages` array (everything before the latest user message) and passes it to the workflow
- Handles all three workflow result statuses: `success`, `failed`, `suspended`
- Maps `agentUsed` strings to UI badge tool call names

## Data Flow

```
POST /api/chat
  → extract latestUserMessage + history from messages[]
  → loanEnquiryWorkflow.start({ query, history })
    → classifyIntent: detect intent (faq/calculator/eligibility/multi/escalate)
    → hitlGate: approve or flag for escalation
    → runSpecialist: build message array, call appropriate agent with history
      (faqAgent → knowledge_search → synthesised answer)
      (calculatorAgent → repayment/lvr/borrowing tools → calculated answer)
      (eligibilityAgent → eligibility_check tool → eligibility assessment)
    → supervisorReview: compliance check via complianceAgent
  → return finalResponse + toolCalls for UI badges
```

## Trade-offs

- **Static knowledge vs RAG**: Static knowledge is instantly available with no setup, but requires editing a file to add new content. RAG would scale better for large content sets. The static approach is correct for the current scope.
- **Keyword search vs semantic search**: Keyword matching is fast and requires no ML infrastructure. It may miss synonyms or paraphrases. Semantic search (with embeddings) could be added later by replacing the scoring function in `knowledge.ts`.
- **Synchronous workflow**: Removing HITL suspend makes the API synchronous and simple. Real HITL (broker resume) can be re-added by storing `runId` and exposing a resume endpoint.
