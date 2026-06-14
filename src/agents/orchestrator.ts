import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { faqAgent, calculatorAgent, eligibilityAgent, generalAgent, websiteAgent } from './specialists'
import { CircuitBreaker } from '../lib/circuitBreaker'

// Per-agent failure isolation — a degraded sub-agent fails fast instead of
// holding every request hostage, and the orchestrator can still answer.
// Exported read-only for the /api/health endpoint.
export const breakers = {
  faqAgent: new CircuitBreaker('faqAgent'),
  calculatorAgent: new CircuitBreaker('calculatorAgent'),
  eligibilityAgent: new CircuitBreaker('eligibilityAgent'),
  generalAgent: new CircuitBreaker('generalAgent'),
  websiteAgent: new CircuitBreaker('websiteAgent'),
}

// On delegation failure the tool returns a degraded result rather than throwing,
// so the orchestrator can apologise and hand off to a broker instead of the
// whole request 500ing.
type Specialist = { generate: (messages: any[]) => Promise<{ text: string }> }

// Breakers count failures, not latency — without a deadline a hung Groq call
// holds the request open indefinitely and never trips the breaker.
const DELEGATION_TIMEOUT_MS = 45_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

async function delegate(agent: Specialist, agentName: keyof typeof breakers, query: string) {
  try {
    const result = await breakers[agentName].run(() =>
      withTimeout(agent.generate([{ role: 'user' as const, content: query }]), DELEGATION_TIMEOUT_MS, agentName)
    )
    return { response: result.text, agent: agentName }
  } catch (error) {
    console.error(`[orchestrator] delegation to ${agentName} failed:`, error)
    return {
      response:
        'SPECIALIST UNAVAILABLE: apologise to the user and direct them to call Mortgage House on 133 144 for this part of their question.',
      agent: agentName,
      degraded: true,
    }
  }
}

// Each Groq-powered sub-agent is wrapped as a tool the OpenAI orchestrator can call
const delegateToFaq = createTool({
  id: 'delegate_to_faq',
  description:
    'Delegate to the FAQ specialist for questions about loan products, features, rates, offset accounts, fixed vs variable, construction loans, etc.',
  inputSchema: z.object({
    query: z.string().describe('The user question to pass to the FAQ agent'),
  }),
  execute: async (inputData) => delegate(faqAgent, 'faqAgent', inputData.query),
})

const delegateToCalculator = createTool({
  id: 'delegate_to_calculator',
  description:
    'Delegate to the calculator specialist for repayment calculations, LVR, borrowing capacity, and any numerical mortgage questions.',
  inputSchema: z.object({
    query: z.string().describe('The calculation request with all required numbers'),
  }),
  execute: async (inputData) => delegate(calculatorAgent, 'calculatorAgent', inputData.query),
})

const delegateToEligibility = createTool({
  id: 'delegate_to_eligibility',
  description:
    'Delegate to the eligibility specialist when the user wants to know if they qualify for a loan, what products suit their situation, or has questions about income, deposit, or credit requirements.',
  inputSchema: z.object({
    query: z.string().describe('The eligibility question with user details'),
  }),
  execute: async (inputData) => delegate(eligibilityAgent, 'eligibilityAgent', inputData.query),
})

const delegateToWebsite = createTool({
  id: 'delegate_to_website',
  description:
    'Delegate to the website specialist when the answer needs LIVE content from the Mortgage House website: current advertised interest rates, latest offers/promotions, contact details, branch info, or "what does the website say about X". Use delegate_to_faq instead for general product/policy education.',
  inputSchema: z.object({
    query: z.string().describe('The question to answer from live website content'),
  }),
  execute: async (inputData) => delegate(websiteAgent, 'websiteAgent', inputData.query),
})

const delegateToGeneral = createTool({
  id: 'delegate_to_general',
  description:
    'Delegate to the general assistant for questions outside the mortgage domain: general knowledge, definitions, general finance/property concepts, or casual conversation. Never use this for Mortgage House products, calculations, or eligibility.',
  inputSchema: z.object({
    query: z.string().describe('The general question to pass to the general assistant'),
  }),
  execute: async (inputData) => delegate(generalAgent, 'generalAgent', inputData.query),
})

const escalateToHuman = createTool({
  id: 'escalate_to_human',
  description:
    'Escalate to a human broker when: the query involves hardship, complex credit issues, SMSF lending, non-resident applications, or amounts over $3M.',
  inputSchema: z.object({
    reason: z.string().describe('Why this needs human review'),
    summary: z.string().describe('Summary of the user situation for the broker'),
  }),
  execute: async (inputData) => {
    return {
      escalated: true,
      reason: inputData.reason,
      brokerMessage: `A customer needs broker assistance: ${inputData.summary}. Reason: ${inputData.reason}`,
      userMessage:
        'This query needs personalised advice from a Mortgage House broker. Please call 133 144 or request a callback at mortgagehouse.com.au.',
    }
  },
})

// Main orchestrator — OpenAI LLM. Sub-agents (FAQ, calculator, eligibility, compliance)
// all run on Groq. Compliance review runs deterministically after the orchestrator
// answers (see src/lib/compliance.ts) rather than as a tool, so the orchestrator
// cannot skip it.
export const orchestratorAgent = new Agent({
  id: 'orchestratorAgent',
  name: 'orchestratorAgent',
  instructions: `You are the MortgageIQ orchestrator agent for Mortgage House Australia.

Your job is to:
1. Understand what the user is asking, using the full conversation history
2. Route to the most appropriate specialist using your delegation tools
3. Synthesise the specialist responses into one clear final answer
4. Escalate to a human broker for complex or sensitive cases

Routing guide:
- Product/policy questions → delegate_to_faq
- Numbers, calculations, repayments, LVR → delegate_to_calculator
- Qualification, income, deposit, eligibility → delegate_to_eligibility
- Current advertised rates, latest offers, contact/branch details, live website content → delegate_to_website
- Off-topic, general knowledge, casual conversation → delegate_to_general
- Hardship, bankruptcy, SMSF, non-resident, guarantor, deceased estate, >$3M, credit defaults → escalate_to_human

Rules:
- Never answer questions directly without delegating. You are a router and synthesiser, not a responder.
- When delegating, include all relevant context from the conversation history in the query you pass — sub-agents do not see the history.
- If a question spans multiple specialists, call them in sequence and synthesise the results.
- If you call escalate_to_human, your final response must be exactly the userMessage the tool returns — nothing else.
- Present specialist answers faithfully; do not invent rates, fees, or eligibility rules they did not provide.`,
  model: openai(process.env.OPENAI_MODEL ?? 'gpt-4o'),
  tools: {
    delegateToFaq,
    delegateToCalculator,
    delegateToEligibility,
    delegateToWebsite,
    delegateToGeneral,
    escalateToHuman,
  },
})
