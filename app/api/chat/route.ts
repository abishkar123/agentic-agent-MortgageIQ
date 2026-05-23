import { NextResponse } from 'next/server'
import { supervisorAgent } from '@/src/agents/supervisor'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] }
    const messages = body.messages ?? []
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')

    if (!latestUserMessage?.content.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await supervisorAgent.generate(latestUserMessage.content)
    const toolCalls =
      result.toolResults?.map((toolResult: { toolName?: string; toolCallId?: string }) =>
        toolResult.toolName ?? toolResult.toolCallId ?? 'unknown_tool'
      ) ?? []

    return new Response(`${result.text}\n__META__${JSON.stringify({ toolCalls })}`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to process message' }, { status: 500 })
  }
}
