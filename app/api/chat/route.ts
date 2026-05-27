import { NextResponse } from 'next/server'
import { loanEnquiryWorkflow } from '@/src/workflows/loanEnquiry'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

    const run = loanEnquiryWorkflow.createRun()
    const result = await run.start({
      inputData: {
        query: latestUserMessage.content,
        history,
      },
    })

    // hitlGate never calls suspend() — escalation is handled synchronously by
    // runSpecialist returning approved:false. 'suspended' status is not reachable.
    if (result.status === 'failed' || result.status === 'suspended') {
      console.error('Workflow did not succeed:', result.status === 'failed' ? result.error : 'suspended')
      return NextResponse.json({ error: 'Unable to process message' }, { status: 500 })
    }

    const { finalResponse, agentUsed } = result.result

    // Map agentUsed back to tool call names for the UI badges
    const toolCallMap: Record<string, string> = {
      faqAgent: 'delegate_to_faq',
      calculatorAgent: 'delegate_to_calculator',
      eligibilityAgent: 'delegate_to_eligibility',
      'calculatorAgent + eligibilityAgent': 'delegate_to_calculator',
      escalated: 'escalate_to_human',
    }
    const toolCalls = [toolCallMap[agentUsed] ?? agentUsed]

    return new Response(`${finalResponse}\n__META__${JSON.stringify({ toolCalls })}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to process message' }, { status: 500 })
  }
}
