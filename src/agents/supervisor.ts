import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { faqAgent, calculatorAgent, eligibilityAgent, complianceAgent } from './specialists'

// Each sub-agent is wrapped as a tool the supervisor can call
const delegateToFaq = createTool({
  id: 'delegate_to_faq',
  description:
    'Delegate to the FAQ specialist for questions about loan products, features, rates, offset accounts, fixed vs variable, construction loans, etc.',
  inputSchema: z.object({
    query: z.string().describe('The user question to pass to the FAQ agent'),
  }),
  execute: async (inputData) => {
    const result = await faqAgent.generateLegacy(inputData.query)
    return { response: result.text, agent: 'faqAgent' }
  },
})

const delegateToCalculator = createTool({
  id: 'delegate_to_calculator',
  description:
    'Delegate to the calculator specialist for repayment calculations, LVR, borrowing capacity, and any numerical mortgage questions.',
  inputSchema: z.object({
    query: z.string().describe('The calculation request with all required numbers'),
  }),
  execute: async (inputData) => {
    const result = await calculatorAgent.generateLegacy(inputData.query)
    return { response: result.text, agent: 'calculatorAgent' }
  },
})

const delegateToEligibility = createTool({
  id: 'delegate_to_eligibility',
  description:
    'Delegate to the eligibility specialist when the user wants to know if they qualify for a loan, what products suit their situation, or has questions about income, deposit, or credit requirements.',
  inputSchema: z.object({
    query: z.string().describe('The eligibility question with user details'),
  }),
  execute: async (inputData) => {
    const result = await eligibilityAgent.generateLegacy(inputData.query)
    return { response: result.text, agent: 'eligibilityAgent' }
  },
})

const complianceReviewTool = createTool({
  id: 'compliance_review',
  description:
    'Always run compliance review on the final response before sending to the user. Pass the full response text.',
  inputSchema: z.object({
    responseText: z.string().describe('The response text to review for compliance'),
  }),
  execute: async (inputData) => {
    const result = await complianceAgent.generateLegacy(
      `Review this response for NCCP, APRA, responsible lending, and DDO compliance:\n\n${inputData.responseText}`
    )
    return { reviewedResponse: result.text, agent: 'complianceAgent' }
  },
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

export const supervisorAgent = new Agent({
  id: 'supervisorAgent',
  name: 'supervisorAgent',
  instructions: `You are the MortgageIQ supervisor agent for Mortgage House Australia.

Your job is to:
1. Understand what the user is asking
2. Route to the most appropriate specialist using your delegation tools
3. Run compliance_review on EVERY final response before sending it
4. Escalate to a human broker for complex or sensitive cases

Routing guide:
- Product/policy questions → delegate_to_faq
- Numbers, calculations, repayments, LVR → delegate_to_calculator  
- Qualification, income, deposit, eligibility → delegate_to_eligibility
- Hardship, SMSF, non-resident, >$3M, credit defaults → escalate_to_human
- Always → compliance_review before final response

Never answer directly without delegating. You are a router and quality gate, not a responder.
If a question spans multiple agents, call them in sequence and synthesise the results.`,
  model: groq('llama-3.3-70b-versatile'),
  tools: {
    delegateToFaq,
    delegateToCalculator,
    delegateToEligibility,
    escalateToHuman,
    complianceReviewTool,
  },
})
