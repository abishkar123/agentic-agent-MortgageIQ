import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { faqAgent, calculatorAgent, eligibilityAgent, complianceAgent } from '../agents/specialists'

const HITL_TRIGGERS = [
  'hardship', 'bankruptcy', 'default', 'smsf', 'non-resident',
  'foreign', 'guarantor', 'divorce', 'deceased', 'estate',
]

const historyItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

// Step 1: Classify intent and detect HITL triggers
const classifyIntent = createStep({
  id: 'classify_intent',
  inputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema).optional().default([]),
  }),
  outputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    needsHitl: z.boolean(),
    hitlReason: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const q = inputData.query.toLowerCase()
    const needsHitl = HITL_TRIGGERS.some((t) => q.includes(t))

    let intent: 'faq' | 'calculator' | 'eligibility' | 'multi' | 'escalate' = 'faq'
    const hasCalc = /\$|repayment|monthly|lvr|borrow|deposit|interest rate/i.test(q)
    const hasElig = /qualify|eligible|can i get|can i borrow|income|credit|self.employ/i.test(q)

    if (needsHitl) intent = 'escalate'
    else if (hasCalc && hasElig) intent = 'multi'
    else if (hasCalc) intent = 'calculator'
    else if (hasElig) intent = 'eligibility'
    else intent = 'faq'

    return {
      query: inputData.query,
      history: inputData.history ?? [],
      intent,
      needsHitl,
      hitlReason: needsHitl ? 'Query contains a sensitive topic requiring broker review.' : undefined,
    }
  },
})

// Step 2: Handle escalation — no longer suspends; returns approved:false for broker cases
const hitlGate = createStep({
  id: 'hitl_gate',
  inputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    needsHitl: z.boolean(),
    hitlReason: z.string().optional(),
  }),
  outputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    approved: z.boolean(),
    brokerNotes: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    return {
      query: inputData.query,
      history: inputData.history,
      intent: inputData.intent,
      // Queries needing HITL are not approved — runSpecialist returns the escalation message
      approved: !inputData.needsHitl,
      brokerNotes: inputData.hitlReason,
    }
  },
})

// Step 3: Route to specialist agents, passing full conversation history
const runSpecialist = createStep({
  id: 'run_specialist',
  inputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema),
    intent: z.enum(['faq', 'calculator', 'eligibility', 'multi', 'escalate']),
    approved: z.boolean(),
    brokerNotes: z.string().optional(),
  }),
  outputSchema: z.object({
    response: z.string(),
    agentUsed: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.approved) {
      return {
        response:
          'This query requires personalised advice from a Mortgage House broker. Please call 133 144 or request a callback at mortgagehouse.com.au.',
        agentUsed: 'escalated',
      }
    }

    // Build the message array: history + current user query.
    // Cast to any[] — Mastra 1.x's MessageListInput union is too broad for
    // TypeScript to narrow a plain { role, content }[] against it, but the
    // runtime MessageList constructor accepts this shape correctly.
    const messages: any[] = [
      ...inputData.history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: inputData.query },
    ]

    if (inputData.intent === 'multi') {
      const [calcResult, eligResult] = await Promise.all([
        calculatorAgent.generate(messages),
        eligibilityAgent.generate(messages),
      ])
      return {
        response: `**Calculator:**\n${calcResult.text}\n\n**Eligibility:**\n${eligResult.text}`,
        agentUsed: 'calculatorAgent + eligibilityAgent',
      }
    }

    if (inputData.intent === 'calculator') {
      const result = await calculatorAgent.generate(messages)
      return { response: result.text, agentUsed: 'calculatorAgent' }
    }

    if (inputData.intent === 'eligibility') {
      const result = await eligibilityAgent.generate(messages)
      return { response: result.text, agentUsed: 'eligibilityAgent' }
    }

    // Default: FAQ
    const result = await faqAgent.generate(messages)
    return { response: result.text, agentUsed: 'faqAgent' }
  },
})

// Step 4: Compliance review
const supervisorReview = createStep({
  id: 'supervisor_review',
  inputSchema: z.object({
    response: z.string(),
    agentUsed: z.string(),
  }),
  outputSchema: z.object({
    finalResponse: z.string(),
    agentUsed: z.string(),
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

    const review = await complianceAgent.generate(
      `Review this response for NCCP, APRA, responsible lending, and DDO compliance:\n\n${inputData.response}`
    )

    // First line must be exactly "COMPLIANT" — "NON-COMPLIANT".includes("COMPLIANT") is true,
    // so substring search is not safe here.
    const lines = review.text.split('\n')
    const firstLine = lines[0].trim()
    const compliancePass = /^COMPLIANT$/i.test(firstLine)

    // Extract only the response body — skip the COMPLIANT/NON-COMPLIANT marker line and
    // drop any trailing "Note:" explanation the model may have appended.
    const bodyLines = lines.slice(1)
    const noteStart = bodyLines.findIndex((l) => /^note:/i.test(l.trim()))
    const cleanLines = noteStart >= 0 ? bodyLines.slice(0, noteStart) : bodyLines
    const cleanedResponse = cleanLines.join('\n').trim()

    if (!compliancePass) {
      console.warn('[compliance] Agent did not return COMPLIANT — falling back to original response')
    }

    return {
      finalResponse: cleanedResponse || inputData.response,
      agentUsed: inputData.agentUsed,
      compliancePass,
    }
  },
})

export const loanEnquiryWorkflow = createWorkflow({
  id: 'loan-enquiry',
  inputSchema: z.object({
    query: z.string(),
    history: z.array(historyItemSchema).optional().default([]),
  }),
  outputSchema: z.object({
    finalResponse: z.string(),
    agentUsed: z.string(),
    compliancePass: z.boolean(),
  }),
})
  .then(classifyIntent)
  .then(hitlGate)
  .then(runSpecialist)
  .then(supervisorReview)
  .commit()
