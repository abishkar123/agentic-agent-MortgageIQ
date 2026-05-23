import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { supervisorAgent } from '../agents/supervisor'
import { faqAgent, calculatorAgent, eligibilityAgent } from '../agents/specialists'

const HITL_TRIGGERS = [
  'hardship', 'bankruptcy', 'default', 'smsf', 'non-resident',
  'foreign', 'guarantor', 'divorce', 'deceased', 'estate',
]

// Step 1: Classify intent and detect HITL triggers
const classifyIntent = createStep({
  id: 'classify_intent',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    query: z.string(),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    needsHitl: z.boolean(),
    hitlReason: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const q = inputData.query.toLowerCase()
    const needsHitl = HITL_TRIGGERS.some((t) => q.includes(t))

    let intent: 'faq' | 'calculator' | 'eligibility' | 'multi' | 'escalate' = 'faq'
    const hasCalc = /\$|repayment|monthly|lvr|borrow|deposit|interest rate/i.test(q)
    const hasElig = /qualify|eligible|can i get|income|credit|self.employ/i.test(q)

    if (needsHitl) intent = 'escalate'
    else if (hasCalc && hasElig) intent = 'multi'
    else if (hasCalc) intent = 'calculator'
    else if (hasElig) intent = 'eligibility'
    else intent = 'faq'

    return {
      query: inputData.query,
      intent,
      needsHitl,
      hitlReason: needsHitl
        ? `Query contains sensitive topic. Detected keywords.`
        : undefined,
    }
  },
})

// Step 2: Conditional HITL gate — suspends if broker review needed
const hitlGate = createStep({
  id: 'hitl_gate',
  inputSchema: z.object({
    query: z.string(),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    needsHitl: z.boolean(),
    hitlReason: z.string().optional(),
  }),
  outputSchema: z.object({
    query: z.string(),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    approved: z.boolean(),
    brokerNotes: z.string().optional(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    brokerNotes: z.string().optional(),
  }),
  execute: async ({ inputData, suspend, resumeData }) => {
    if (resumeData) {
      return {
        query: inputData.query,
        intent: inputData.intent,
        approved: resumeData.approved,
        brokerNotes: resumeData.brokerNotes,
      }
    }

    if (inputData.needsHitl) {
      await suspend({
        message: 'Broker review required before responding.',
        query: inputData.query,
        reason: inputData.hitlReason,
      })
    }

    return {
      query: inputData.query,
      intent: inputData.intent,
      approved: true,
    }
  },
})

// Step 3: Route to specialist agents
const runSpecialist = createStep({
  id: 'run_specialist',
  inputSchema: z.object({
    query: z.string(),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    approved: z.boolean(),
    brokerNotes: z.string().optional(),
  }),
  outputSchema: z.object({
    response: z.string(),
    agentUsed: z.string(),
    sources: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.approved) {
      return {
        response:
          'Your query has been reviewed and a Mortgage House broker will contact you shortly. Call 133 144 for immediate assistance.',
        agentUsed: 'escalated',
      }
    }

    const contextNote = inputData.brokerNotes
      ? `\n\nBroker note: ${inputData.brokerNotes}`
      : ''

    const query = inputData.query + contextNote

    if (inputData.intent === 'multi') {
      const [calcResult, eligResult] = await Promise.all([
        calculatorAgent.generate(query),
        eligibilityAgent.generate(query),
      ])
      return {
        response: `**Calculator:**\n${calcResult.text}\n\n**Eligibility:**\n${eligResult.text}`,
        agentUsed: 'calculatorAgent + eligibilityAgent',
      }
    }

    if (inputData.intent === 'calculator') {
      const result = await calculatorAgent.generate(query)
      return { response: result.text, agentUsed: 'calculatorAgent' }
    }

    if (inputData.intent === 'eligibility') {
      const result = await eligibilityAgent.generate(query)
      return { response: result.text, agentUsed: 'eligibilityAgent' }
    }

    // Default: FAQ
    const result = await faqAgent.generate(query)
    return { response: result.text, agentUsed: 'faqAgent' }
  },
})

// Step 4: Supervisor quality gate — compliance review
const supervisorReview = createStep({
  id: 'supervisor_review',
  inputSchema: z.object({
    response: z.string(),
    agentUsed: z.string(),
    sources: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    finalResponse: z.string(),
    agentUsed: z.string(),
    sources: z.array(z.string()).optional(),
    compliancePass: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.agentUsed === 'escalated') {
      return {
        finalResponse: inputData.response,
        agentUsed: inputData.agentUsed,
        compliancePass: true,
      }
    }

    const review = await supervisorAgent.generate(
      `compliance_review only: "${inputData.response}"`
    )

    const compliancePass = review.text.toUpperCase().includes('COMPLIANT')

    return {
      finalResponse: review.text,
      agentUsed: inputData.agentUsed,
      sources: inputData.sources,
      compliancePass,
    }
  },
})

// Assemble the workflow
export const loanEnquiryWorkflow = createWorkflow({
  id: 'loan-enquiry',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    finalResponse: z.string(),
    agentUsed: z.string(),
    sources: z.array(z.string()).optional(),
    compliancePass: z.boolean(),
  }),
})
  .then(classifyIntent)
  .then(hitlGate)
  .then(runSpecialist)
  .then(supervisorReview)
  .commit()
