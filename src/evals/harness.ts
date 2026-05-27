import 'dotenv/config'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { supervisorAgent } from '../agents/supervisor'

interface EvalCase {
  query: string
  expectedAgent: 'faqAgent' | 'calculatorAgent' | 'eligibilityAgent' | 'escalated'
  expectedToolCall?: string
  groundTruth?: string
}

const EVAL_CASES: EvalCase[] = [
  {
    query: 'What is the difference between a fixed and variable rate home loan?',
    expectedAgent: 'faqAgent',
    expectedToolCall: 'delegate_to_faq',
  },
  {
    query: 'What is an offset account?',
    expectedAgent: 'faqAgent',
    expectedToolCall: 'delegate_to_faq',
  },
  {
    query: 'If I borrow $600,000 at 6.5% over 30 years, what are my monthly repayments?',
    expectedAgent: 'calculatorAgent',
    expectedToolCall: 'delegate_to_calculator',
    groundTruth: '$3,792/month',
  },
  {
    query: 'My property is worth $800,000 and I have a $120,000 deposit. What is my LVR?',
    expectedAgent: 'calculatorAgent',
    expectedToolCall: 'delegate_to_calculator',
    groundTruth: 'LVR 85%',
  },
  {
    query: 'I earn $90,000 a year and have $60,000 saved. Can I get a home loan for $550,000?',
    expectedAgent: 'eligibilityAgent',
    expectedToolCall: 'delegate_to_eligibility',
  },
  {
    query: 'I am self-employed and want to apply for a home loan',
    expectedAgent: 'eligibilityAgent',
    expectedToolCall: 'delegate_to_eligibility',
  },
  {
    query: 'I declared bankruptcy 2 years ago. Can I still get a mortgage?',
    expectedAgent: 'escalated',
    expectedToolCall: 'escalate_to_human',
  },
  {
    query: 'I want to buy a property through my SMSF. What are my options?',
    expectedAgent: 'escalated',
    expectedToolCall: 'escalate_to_human',
  },
]

async function scoreRelevance(query: string, response: string): Promise<number> {
  // groq returns LanguageModelV1; ai@6 generateText expects V2/V3. The runtime
  // is structurally compatible — cast to satisfy the type checker only.
  const { text } = await generateText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: groq('llama-3.1-8b-instant') as any,
    prompt: `Score how relevant this response is to the question. Reply with ONLY a number 0.0–1.0.
Question: ${query}
Response: ${response.slice(0, 500)}
Score:`,
  })
  return Math.min(1, Math.max(0, parseFloat(text.trim()) || 0))
}

async function runHarness(): Promise<void> {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║   MortgageIQ Agent Eval Harness      ║')
  console.log('╚══════════════════════════════════════╝\n')

  let routingCorrect = 0
  let toolCallCorrect = 0
  let totalRelevance = 0
  const results: {
    query: string
    routingPass: boolean
    toolPass: boolean
    relevance: number
  }[] = []

  for (const c of EVAL_CASES) {
    process.stdout.write(`Q: ${c.query.slice(0, 55)}...\n`)

    const result = await supervisorAgent.generate(c.query)
    const text = result.text

    // Check which tool was called (toolResults shape changed in ai v6 — use any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = (result.toolResults as any[])?.map((t: any) => t.toolName ?? t.tool) ?? []
    const toolPass = c.expectedToolCall ? toolCalls.includes(c.expectedToolCall) : true

    // Check routing (inferred from tool call)
    const routingPass = toolPass

    // Relevance score
    const relevance = await scoreRelevance(c.query, text)

    if (routingPass) routingCorrect++
    if (toolPass) toolCallCorrect++
    totalRelevance += relevance

    const status = routingPass && toolPass && relevance >= 0.7 ? '✅' : '⚠️'
    console.log(
      `  ${status} routing=${routingPass ? '✓' : '✗'} tool=${toolPass ? '✓' : '✗'} relevance=${relevance.toFixed(2)}`
    )
    console.log(`  Tool calls: ${toolCalls.join(', ') || 'none'}\n`)

    results.push({ query: c.query, routingPass, toolPass, relevance })
  }

  const n = EVAL_CASES.length
  const routingAcc = routingCorrect / n
  const toolAcc = toolCallCorrect / n
  const avgRelevance = totalRelevance / n
  const overall = (routingAcc + toolAcc + avgRelevance) / 3

  console.log('─'.repeat(44))
  console.log(`Routing accuracy:   ${(routingAcc * 100).toFixed(0)}% (${routingCorrect}/${n})`)
  console.log(`Tool call accuracy: ${(toolAcc * 100).toFixed(0)}% (${toolCallCorrect}/${n})`)
  console.log(`Avg relevance:      ${avgRelevance.toFixed(3)}`)
  console.log(`Overall score:      ${overall.toFixed(3)}`)

  const THRESHOLD = 0.70
  if (overall < THRESHOLD) {
    console.error(`\n❌ EVAL GATE FAILED — ${overall.toFixed(3)} < ${THRESHOLD}`)
    process.exit(1)
  }
  console.log(`\n✅ EVAL GATE PASSED — ${overall.toFixed(3)} >= ${THRESHOLD}`)
}

runHarness().catch(console.error)
