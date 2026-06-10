import { NextResponse } from 'next/server'
import { breakers } from '@/src/agents/orchestrator'

export const dynamic = 'force-dynamic'

// Ops visibility: which path the app will take and whether any sub-agent
// circuit is open. Returns no secrets — only presence booleans.
export async function GET() {
  const breakerStates = Object.fromEntries(
    Object.values(breakers).map((b) => [b.name, b.state])
  )
  const anyOpen = Object.values(breakerStates).some((s) => s === 'open')

  return NextResponse.json({
    status: anyOpen ? 'degraded' : 'ok',
    activePath: process.env.OPENAI_API_KEY ? 'orchestrator' : 'workflow',
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
    },
    orchestratorModel: process.env.OPENAI_MODEL ?? 'gpt-4o',
    breakers: breakerStates,
  })
}
