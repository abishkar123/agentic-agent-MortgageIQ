import { NextResponse } from 'next/server'
import { loanEnquiryWorkflow } from '@/src/workflows/loanEnquiry'
import { orchestratorAgent } from '@/src/agents/orchestrator'
import { reviewCompliance } from '@/src/lib/compliance'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Main agentic path: the OpenAI orchestrator routes to Groq sub-agents via tool
// calls, then the response passes the deterministic compliance gate.
async function runOrchestrator(
  history: ChatMessage[],
  query: string
): Promise<{ finalResponse: string; toolCalls: string[] }> {
  // Cast to any[] — Mastra 1.x's MessageListInput union is too broad for
  // TypeScript to narrow a plain { role, content }[] against it, but the
  // runtime MessageList constructor accepts this shape correctly.
  const messages: any[] = [...history, { role: 'user' as const, content: query }]

  const result = await orchestratorAgent.generateLegacy(messages, { maxSteps: 8 })

  // Collect every tool the orchestrator called across all steps (steps shape
  // changed in ai v6 — use any, same as the eval harness)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps = (result.steps as any[]) ?? []
  const toolCalls = Array.from(
    new Set(
      steps.flatMap((s: any) => (s.toolCalls ?? []).map((tc: any) => tc.toolName ?? tc.tool))
    )
  ).filter(Boolean) as string[]

  // Escalations return a static broker message — no compliance review needed
  if (toolCalls.includes('escalate_to_human')) {
    return { finalResponse: result.text, toolCalls }
  }

  const { finalResponse } = await reviewCompliance(result.text)
  return { finalResponse, toolCalls: [...toolCalls, 'compliance_review'] }
}

// Fallback path: deterministic workflow (regex intent classification) — used
// when OPENAI_API_KEY is not configured or the orchestrator fails.
async function runWorkflow(
  history: ChatMessage[],
  query: string
): Promise<{ finalResponse: string; toolCalls: string[] }> {
  const run = await loanEnquiryWorkflow.createRun()
  const result = await run.start({ inputData: { query, history } })

  // hitlGate never calls suspend() — escalation is handled synchronously by
  // runSpecialist returning approved:false. 'suspended' and 'tripwire' statuses
  // are not reachable in normal operation.
  if (result.status !== 'success') {
    throw new Error(`Workflow did not succeed: ${result.status}`)
  }

  const { finalResponse, agentUsed } = result.result as { finalResponse: string; agentUsed: string }

  // Map agentUsed back to tool call names for the UI badges
  const toolCallMap: Record<string, string> = {
    faqAgent: 'delegate_to_faq',
    calculatorAgent: 'delegate_to_calculator',
    eligibilityAgent: 'delegate_to_eligibility',
    'calculatorAgent + eligibilityAgent': 'delegate_to_calculator',
    escalated: 'escalate_to_human',
  }
  return { finalResponse, toolCalls: [toolCallMap[agentUsed] ?? agentUsed] }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] }
    const messages = body.messages ?? []
    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')

    if (!latestUserMessage?.content.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Conversation history: last 10 turns before the latest user message (guards context window limits)
    const allPrior = messages
      .slice(0, messages.lastIndexOf(latestUserMessage))
      .filter((m): m is ChatMessage => m.role === 'user' || m.role === 'assistant')
    const history = allPrior.slice(-10)
    const query = latestUserMessage.content

    let outcome: { finalResponse: string; toolCalls: string[] }
    if (process.env.OPENAI_API_KEY) {
      try {
        outcome = await runOrchestrator(history, query)
      } catch (error) {
        console.error('Orchestrator failed — falling back to workflow:', error)
        outcome = await runWorkflow(history, query)
      }
    } else {
      outcome = await runWorkflow(history, query)
    }

    return new Response(
      `${outcome.finalResponse}\n__META__${JSON.stringify({ toolCalls: outcome.toolCalls })}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to process message' }, { status: 500 })
  }
}
