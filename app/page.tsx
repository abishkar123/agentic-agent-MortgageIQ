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
    <div className="h-screen overflow-hidden bg-[#eef5fb] text-[#1b3448]">
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
              x
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-[#d9e4ef] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0055a6] text-sm font-black text-white shadow-md shadow-blue-900/10">
                MH
              </div>
              <div className="min-w-0">
                <p className="text-base font-black tracking-normal text-[#003d78] sm:text-lg">Mortgage House AI</p>
                <p className="hidden text-xs font-semibold text-[#6a8195] sm:block">Lending specialist since 1986</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:133144"
                className="hidden rounded-full border border-[#cbddeb] bg-white px-3 py-2 text-xs font-bold text-[#003d78] transition hover:border-[#8db8dc] sm:inline-flex"
              >
                133 144
              </a>
              <a
                href="https://applyonline.mortgagehouse.com.au"
                className="rounded-full bg-[#f58220] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#dd6f14]"
              >
                Apply Online
              </a>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">
          <section className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[#cbddeb] bg-white shadow-2xl shadow-blue-950/10">
            <div className="shrink-0 border-b border-[#d9e4ef] bg-white px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#003d78] text-sm font-black text-white">
                    AI
                    <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#4caf50]" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-[#003d78]">MortgageIQ Assistant</h1>
                    <p className="text-xs text-[#6a8195]">Ask about loans, repayments, LVR or eligibility</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#eaf4fc] px-3 py-1 text-xs font-bold text-[#0055a6]">
                  Online
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbfe] px-4 py-5 sm:px-6">
              {messages.length === 0 && (
                <div className="mx-auto flex max-w-2xl flex-col items-center py-6 text-center sm:py-10">
                  <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#0055a6] text-lg font-black text-white shadow-xl shadow-blue-900/15">
                    MH
                  </div>
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#f58220]">Virtual lending assistant</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight tracking-normal text-[#003d78] sm:text-4xl">
                    How can I help today?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#45647d]">
                    I can help route your question to product, calculator, eligibility or compliance support.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((item) => (
                      <button
                        key={item}
                        onClick={() => sendMessage(item)}
                        className="rounded-full border border-[#cbddeb] bg-white px-4 py-2 text-sm font-bold text-[#24465f] transition hover:border-[#8db8dc] hover:bg-[#eef6fd]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-2xl border border-[#d9e4ef] bg-white px-4 py-3 text-left text-sm font-semibold leading-6 text-[#24465f] shadow-sm transition hover:border-[#8db8dc] hover:bg-[#eef6fd] focus:outline-none focus:ring-2 focus:ring-[#b9daf4]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#003d78] text-xs font-black text-white">
                        AI
                      </div>
                    )}

                    <div className={`flex max-w-[86%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`whitespace-pre-wrap rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                          msg.role === 'user'
                            ? 'rounded-br-md bg-[#0055a6] text-white'
                            : 'rounded-bl-md border border-[#d9e4ef] bg-white text-[#1f384c]'
                        }`}
                      >
                        {msg.content || (
                          <span className="flex items-center gap-1.5 px-1 py-1 text-slate-400">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>

                      {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                          {msg.toolCalls.map((tool) => (
                            <span
                              key={tool}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${AGENT_COLORS[tool] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}
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

            <footer className="shrink-0 border-t border-[#d9e4ef] bg-white px-3 py-3 sm:px-5 sm:py-4">
              <form
                onSubmit={handleSubmit}
                className="mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] border border-[#cbddeb] bg-[#f8fbfe] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#b9daf4]"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Mortgage House about home loans..."
                  disabled={loading}
                  className="min-h-11 flex-1 bg-transparent px-3 text-sm text-[#1f384c] outline-none placeholder:text-[#7a91a5] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#f58220] text-sm font-black text-white transition hover:bg-[#dd6f14] focus:outline-none focus:ring-2 focus:ring-[#f8c491] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Send message"
                >
                  ↑
                </button>
              </form>
              <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-[#6a8195]">
                Demo only. Confirm lending recommendations with a Mortgage House broker.
              </p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  )
}
