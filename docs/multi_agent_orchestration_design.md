# Multi-Agent Orchestration Design

How MortgageIQ applies the "From Chaos to Choreography" orchestration patterns,
and which ones were deliberately left out at this scale.

## Pattern choice: centralized orchestration

MortgageIQ uses **orchestration, not choreography**. A single OpenAI-powered
orchestrator (`src/agents/orchestrator.ts`) directs the workflow explicitly;
the Groq-powered sub-agents are intentionally "dumb" executors that answer
exactly the query they are handed and see nothing else.

Per the decision matrix, this domain lands squarely on the orchestration side:

| Factor | MortgageIQ | Verdict |
|---|---|---|
| Workflow coupling | FAQ/calc/eligibility answers feed one synthesised reply | Tight → orchestration |
| Agent autonomy needed | Sub-agents are single-purpose tools | Low → orchestration |
| Agents added frequently | Stable set of 6 specialists | Stable → orchestration |
| Debugging priority | Consumer credit product | High → orchestration |
| Compliance / audit | NCCP / APRA / DDO regulated | Audit trail required → orchestration |

The audit trail falls out of the architecture: every delegation is a tool call
recorded in the orchestrator run, surfaced to the UI as `__META__{toolCalls}`
badges, and loggable per request.

## LLM split

| Layer | Provider | Why |
|---|---|---|
| Orchestrator (main agent) | OpenAI (`gpt-4o`, override with `OPENAI_MODEL`) | Strongest tool-calling reliability for routing + synthesis |
| FAQ / calculator / eligibility / website / general / compliance sub-agents | Groq (`llama-3.3-70b`, `llama-3.1-8b`) | Fast, cheap, single-purpose task execution |

## Failure & recovery patterns implemented

**Circuit breaker per sub-agent** (`src/lib/circuitBreaker.ts`). Each delegation
tool wraps its Groq call in a breaker: 3 consecutive failures open the circuit,
calls fail fast for 30s, then a half-open probe decides whether to close it.
A delegation failure returns a degraded tool result instead of throwing, so the
orchestrator apologises for that part of the answer and hands off to a broker —
one degraded specialist never 500s the whole request.

**Deterministic fallback path.** If `OPENAI_API_KEY` is missing or the
orchestrator itself fails, `app/api/chat/route.ts` falls back to the original
deterministic workflow (`src/workflows/loanEnquiry.ts`): regex intent
classification → specialist → compliance. Same contract, lower ceiling, no
single point of failure on OpenAI.

**Compliance as a structural gate, not an instruction.** The reference warns
against trusting agents to police themselves. Compliance review runs
deterministically *after* the orchestrator answers (`src/lib/compliance.ts`),
in code the LLM cannot skip — it is not a tool the orchestrator may or may not
call.

## State management

State flows one direction and is never shared mutable:

```
messages[] (request) → orchestrator → tool call (query string) → sub-agent
                     ← tool result  ←
         final text  → compliance gate → response + toolCalls audit trail
```

Each handoff is a validated boundary (zod `inputSchema` on every tool — the
data-contract check the reference calls for). Agents hold no cross-request
state and there is no cache layer, so the stale-read race condition class
(the credit-score war story) cannot occur by construction.

## Deliberately not implemented (and why)

- **Message bus / choreography** — 6 stable agents with tight coupling; an
  event bus would buy autonomy nobody needs and cost the debuggability we do.
- **Saga / compensation registry** — all operations are read-only Q&A; there
  is nothing to compensate. Becomes relevant the day agents write (e.g. lodge
  an application).
- **Versioned state store / Delta Lake** — request-scoped immutable state is
  sufficient while no state outlives a request.

These are scale-out points, not omissions: each has a clear trigger condition
above.
