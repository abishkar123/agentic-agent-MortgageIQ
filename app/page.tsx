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

      {/* Launcher button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#0055a6] shadow-xl shadow-blue-900/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#b9daf4]"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="relative grid h-14 w-14 place-items-center">
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0055a6] bg-[#4caf50]" />
          <svg
            className={`absolute transition-all duration-150 ${isOpen ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
              fill="white"
            />
          </svg>
          <svg
            className={`absolute transition-all duration-150 ${isOpen ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed z-40 flex flex-col overflow-hidden border border-[#cbddeb] bg-white shadow-2xl shadow-blue-950/15 transition-all duration-200
          bottom-0 right-0 h-[85vh] w-screen rounded-t-2xl
          sm:bottom-20 sm:right-6 sm:h-[580px] sm:w-[380px] sm:rounded-2xl
          ${isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      >
        {/* Panel header */}
        <div className="shrink-0 border-b border-[#d9e4ef] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#003d78] text-xs font-black text-white">
                AI
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#4caf50]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#003d78]">MortgageIQ Assistant</p>
                <p className="text-xs text-[#6a8195]">Ask about loans, repayments, LVR or eligibility</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eaf4fc] px-2.5 py-0.5 text-xs font-bold text-[#0055a6]">
                Online
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#b9daf4]"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Message area */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbfe] px-3 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#0055a6] text-sm font-black text-white shadow-lg shadow-blue-900/15">
                MH
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#f58220]">
                Virtual lending assistant
              </p>
              <h2 className="mt-1 text-xl font-black text-[#003d78]">How can I help today?</h2>
              <p className="mt-1.5 text-xs leading-5 text-[#45647d]">
                Ask about products, calculators, eligibility or compliance.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => sendMessage(item)}
                    className="rounded-full border border-[#cbddeb] bg-white px-3 py-1.5 text-xs font-bold text-[#24465f] transition hover:border-[#8db8dc] hover:bg-[#eef6fd]"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-1.5">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-xl border border-[#d9e4ef] bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-[#24465f] shadow-sm transition hover:border-[#8db8dc] hover:bg-[#eef6fd]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#003d78] text-[10px] font-black text-white">
                    AI
                  </div>
                )}
                <div className={`flex max-w-[80%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`whitespace-pre-wrap rounded-[18px] px-3 py-2 text-xs leading-5 shadow-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-[#0055a6] text-white'
                        : 'rounded-bl-sm border border-[#d9e4ef] bg-white text-[#1f384c]'
                    }`}
                  >
                    {msg.content || (
                      <span className="flex items-center gap-1 px-1 py-0.5 text-slate-400">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {msg.toolCalls.map((tool) => (
                        <span
                          key={tool}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${AGENT_COLORS[tool] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}
                        >
                          {AGENT_LABELS[tool] ?? tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar — wired in Task 5 */}
      </div>
    </div>
  )
}
