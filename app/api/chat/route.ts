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

    // Conversation history: everything before the latest user message
    const history = messages
      .slice(0, messages.lastIndexOf(latestUserMessage))
      .filter((m): m is ChatMessage => m.role === 'user' || m.role === 'assistant')

    const run = loanEnquiryWorkflow.createRun()
    const result = await run.start({
      inputData: {
        query: latestUserMessage.content,
        history,
      },
    })

    if (result.status === 'failed') {
      console.error('Workflow failed:', result.error)
      return NextResponse.json({ error: 'Unable to process message' }, { status: 500 })
    }

    if (result.status === 'suspended') {
      // HITL suspension reached — return the escalation message directly
      return new Response(
        `This query requires personalised advice from a Mortgage House broker. Please call 133 144 or visit mortgagehouse.com.au.\n__META__${JSON.stringify({ toolCalls: ['escalate_to_human'] })}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
      )
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
