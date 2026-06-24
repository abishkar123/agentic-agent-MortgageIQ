'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: string[]
}

const AGENT_COLORS: Record<string, string> = {
  delegate_to_faq: 'border-violet-200 bg-violet-50 text-violet-700',
  delegate_to_calculator: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  delegate_to_eligibility: 'border-amber-200 bg-amber-50 text-amber-700',
  delegate_to_website: 'border-teal-200 bg-teal-50 text-teal-700',
  delegate_to_general: 'border-slate-200 bg-slate-50 text-slate-700',
  escalate_to_human: 'border-rose-200 bg-rose-50 text-rose-700',
  compliance_review: 'border-sky-200 bg-sky-50 text-sky-700',
}

const AGENT_LABELS: Record<string, string> = {
  delegate_to_faq: 'FAQ',
  delegate_to_calculator: 'Calculator',
  delegate_to_eligibility: 'Eligibility',
  delegate_to_website: 'Website',
  delegate_to_general: 'General',
  escalate_to_human: 'Escalated',
  compliance_review: 'Compliance',
}

const STARTERS = [
  'Compare home loan options',
  'Calculate repayments for $600k',
  'Check my LVR',
  'Can I get a home loan?',
]

const QUICK_ACTIONS = ['First home buyer', 'Refinance', 'Investment loan', 'Offset account']

const INTAKE_PROMPT =
  'Hi, what would you like help with today? You can ask about repayments, eligibility, loan products, LVR, or broker support.'

const GREETING_OR_UNCLEAR_INPUTS = new Set([
  'hi',
  'hello',
  'hey',
  'hiya',
  'help',
  'thanks',
  'thank you',
  'can you help',
  'can you help me',
])

function normalizeInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[!?.,]+$/g, '')
    .replace(/\s+/g, ' ')
}

function needsIntake(question: string) {
  const normalized = normalizeInput(question)
  if (GREETING_OR_UNCLEAR_INPUTS.has(normalized)) return true

  const words = normalized.split(' ').filter(Boolean)
  return words.length <= 2 && !/[\d$%]/.test(normalized)
}

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingIntent, setAwaitingIntent] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toastMessage) return

    const timeout = window.setTimeout(() => {
      setToastMessage('')
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')

    if (!awaitingIntent && needsIntake(question)) {
      setMessages([...allMessages, { role: 'assistant', content: INTAKE_PROMPT }])
      setAwaitingIntent(true)
      return
    }

    if (awaitingIntent) {
      setAwaitingIntent(false)
    }

    setLoading(true)

    const assistantIdx = allMessages.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '', toolCalls: [] }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        if (buffer.includes('__META__')) {
          const [text, metaStr] = buffer.split('__META__')
          const meta = JSON.parse(metaStr) as { toolCalls: string[] }
          setMessages((prev) => {
            const updated = [...prev]
            updated[assistantIdx] = { role: 'assistant', content: text.trim(), toolCalls: meta.toolCalls }
            return updated
          })
        } else {
          setMessages((prev) => {
            const updated = [...prev]
            updated[assistantIdx] = { ...updated[assistantIdx], content: buffer }
            return updated
          })
        }
      }
    } catch {
      setToastMessage('Unable to reach the assistant. Please try again.')
      setMessages((prev) => {
        const updated = [...prev]
        updated[assistantIdx] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="relative h-screen bg-[#eef5fb]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6" role="status">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-slate-800 shadow-xl shadow-rose-100/70">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-sm font-semibold text-rose-600">
              !
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-950">Message failed</p>
              <p className="mt-0.5 leading-5 text-slate-600">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage('')}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Background branding */}
      <div className="flex h-full flex-col items-center justify-center gap-3 select-none">
        <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#0055a6] text-xl font-black text-white shadow-xl shadow-blue-900/15">
          MH
        </div>
        <h1 className="text-3xl font-black text-[#003d78]">Mortgage House AI</h1>
        <p className="text-sm text-[#6a8195]">Your virtual lending specialist</p>
      </div>

      {/* Launcher button — wired in Task 2 */}
      {/* Chat panel — wired in Task 3 */}
    </div>
  )
}
