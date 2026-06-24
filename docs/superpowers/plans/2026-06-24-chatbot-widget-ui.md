# Chatbot Widget UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `app/page.tsx` to replace the full-page chat app with a floating bottom-right chatbot widget over a minimal branded background page.

**Architecture:** Single file rewrite — all chat logic (state, `sendMessage`, intake detection) is unchanged; only the JSX layout shell changes. A new `isOpen` boolean controls the panel. The launcher button and panel are CSS-transitioned (`opacity + translateY`), no animation libraries.

**Tech Stack:** Next.js 15, React, Tailwind CSS, TypeScript

## Global Constraints

- Only `app/page.tsx` is modified — no new files, no new dependencies
- All existing chat logic and state variables carry over unchanged
- CSS transitions only — no Framer Motion or animation library
- Tailwind classes only — no inline `style` objects
- `npm run typecheck` must pass after every task
- Brand colours: primary blue `#0055a6`, dark blue `#003d78`, orange `#f58220`, bg `#eef5fb`, border `#cbddeb`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/page.tsx` | Modify (full JSX rewrite) | Background page, launcher button, floating chat panel |

---

### Task 1: Add `isOpen` state + replace outer shell with background page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `isOpen: boolean` state + setter, minimal branded background JSX replacing the current `h-screen overflow-hidden` outer div and `<header>` nav bar

- [ ] **Step 1: Open `app/page.tsx` and locate the state block and outer JSX**

The state block starts at line 72. The outer return starts at line 165. Note that the current outer shell is:
```tsx
<div className="h-screen overflow-hidden bg-[#eef5fb] text-[#1b3448]">
  {/* toast */}
  <div className="flex h-full flex-col">
    <header>...</header>
    <main>...</main>
  </div>
</div>
```
We are replacing this entire structure.

- [ ] **Step 2: Add `isOpen` state variable after the existing state declarations**

In `app/page.tsx`, add `isOpen` as the first `useState` in the component (line ~72, after `export default function Home() {`):

```tsx
const [isOpen, setIsOpen] = useState(false)
```

The full state block becomes:
```tsx
const [isOpen, setIsOpen] = useState(false)
const [messages, setMessages] = useState<Message[]>([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
const [awaitingIntent, setAwaitingIntent] = useState(false)
const [toastMessage, setToastMessage] = useState('')
const bottomRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Replace the outer return JSX with a background page shell**

Replace the entire `return (...)` block with this (toast kept at top, branded background centered, no nav header, panel and launcher placeholders added as empty fragments for now):

```tsx
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
```

- [ ] **Step 4: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors. If `isOpen` is flagged as unused, that's fine — it will be used in Task 2.

- [ ] **Step 5: Visually verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: light blue full-screen background, centered `MH` logo, "Mortgage House AI" heading, tagline. No top nav bar. No chat panel yet.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace full-page layout with minimal branded background"
```

---

### Task 2: Add the launcher button

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `isOpen: boolean`, `setIsOpen` from Task 1
- Produces: fixed bottom-right circular button that toggles `isOpen`; shows chat SVG when closed, × SVG when open; green online dot

- [ ] **Step 1: Replace the `{/* Launcher button — wired in Task 2 */}` comment with the launcher JSX**

Find the comment `{/* Launcher button — wired in Task 2 */}` and replace it with:

```tsx
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Visually verify in browser**

Open `http://localhost:3000`. Expected:
- Blue circular button fixed to bottom-right with a chat bubble icon
- Green dot on top-right of button
- Clicking toggles between chat icon and × icon (panel doesn't open yet — that's Task 3)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add chatbot launcher button with open/close icon toggle"
```

---

### Task 3: Add chat panel shell + panel header

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `isOpen: boolean`, `setIsOpen` from Task 1
- Produces: floating panel `div` that transitions in/out above the launcher; panel header with AI avatar, title, subtitle, Online badge, close button

- [ ] **Step 1: Replace the `{/* Chat panel — wired in Task 3 */}` comment with the panel shell and header**

Find the comment `{/* Chat panel — wired in Task 3 */}` and replace it with:

```tsx
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

  {/* Message area — wired in Task 4 */}
  <div className="min-h-0 flex-1 bg-[#f8fbfe]" />

  {/* Input bar — wired in Task 5 */}
</div>
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Visually verify in browser**

Open `http://localhost:3000`. Expected:
- Clicking the launcher opens the panel above it (smooth slide-up + fade-in)
- Panel shows header: AI avatar with green dot, "MortgageIQ Assistant", subtitle, Online badge, × close button
- Clicking × or the launcher button closes the panel
- On mobile (<640px): panel fills full width from bottom with rounded top corners
- On desktop: panel is 380×580px anchored bottom-right

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add chat panel shell with header and open/close transitions"
```

---

### Task 4: Wire message area into panel

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `messages: Message[]`, `loading: boolean`, `bottomRef`, `sendMessage`, `QUICK_ACTIONS`, `STARTERS`, `AGENT_COLORS`, `AGENT_LABELS` — all existing, unchanged
- Produces: scrollable message area inside the panel with empty state (quick actions + starters), message bubbles, agent badge chips, loading dots

- [ ] **Step 1: Replace the `{/* Message area — wired in Task 4 */}` placeholder div**

Find `{/* Message area — wired in Task 4 */}` and replace the placeholder `<div className="min-h-0 flex-1 bg-[#f8fbfe]" />` with:

```tsx
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Visually verify in browser**

Open `http://localhost:3000` and open the chat panel. Expected:
- Empty state shows: MH logo, headline, tagline, 4 quick-action chips, 4 starter cards (2-column)
- Clicking a starter card or quick action sends a message — messages appear as bubbles inside the panel
- User messages: blue right-aligned; assistant messages: white left-aligned with AI avatar
- Loading dots appear while waiting for response
- Agent badge chips appear below assistant messages after response arrives
- Panel scrolls to bottom as messages accumulate

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire message area and empty state into chat panel"
```

---

### Task 5: Wire input bar + final typecheck and production build

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `input: string`, `setInput`, `loading: boolean`, `handleSubmit`, `sendMessage` — all existing, unchanged
- Produces: fully functional chat widget; input bar pinned to panel bottom; disclaimer text; production build passes

- [ ] **Step 1: Replace the `{/* Input bar — wired in Task 5 */}` comment with the input footer**

Find `{/* Input bar — wired in Task 5 */}` inside the panel div and replace it with:

```tsx
{/* Input bar */}
<footer className="shrink-0 border-t border-[#d9e4ef] bg-white px-3 py-2">
  <form
    onSubmit={handleSubmit}
    className="flex items-end gap-2 rounded-[20px] border border-[#cbddeb] bg-[#f8fbfe] p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#b9daf4]"
  >
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Ask Mortgage House about home loans..."
      disabled={loading}
      className="min-h-9 flex-1 bg-transparent px-2 text-xs text-[#1f384c] outline-none placeholder:text-[#7a91a5] disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={loading || !input.trim()}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#f58220] text-sm font-black text-white transition hover:bg-[#dd6f14] focus:outline-none focus:ring-2 focus:ring-[#f8c491] disabled:cursor-not-allowed disabled:opacity-35"
      aria-label="Send message"
    >
      ↑
    </button>
  </form>
  <p className="mt-1.5 text-center text-[10px] text-[#6a8195]">
    Demo only. Confirm lending recommendations with a Mortgage House broker.
  </p>
</footer>
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build completes with no errors. Route `/` should show a small bundle size (~similar to current).

- [ ] **Step 4: Full end-to-end visual verification**

Start the dev server (`npm run dev`) and verify the full golden path:

1. Page loads: branded background visible, no nav header, launcher button in bottom-right with green dot
2. Click launcher: panel slides up and fades in — header, empty state, input bar visible
3. Click a starter card (e.g. "Calculate repayments for $600k"): message appears as blue bubble, loading dots show, assistant responds with text and agent badge chips
4. Type a message manually and hit Enter or the ↑ button: same flow
5. Click × in panel header: panel closes
6. Click launcher again: panel reopens, conversation history retained
7. Resize browser to mobile width (<640px): panel fills full width from bottom
8. Error toast: disconnecting network and sending a message should show the red error toast

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire input bar into chat panel, complete chatbot widget UI"
```
