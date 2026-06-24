# Chatbot Widget UI Redesign

**Date:** 2026-06-24  
**Status:** Approved

## Goal

Redesign `app/page.tsx` from a full-page chat application into a floating chatbot widget experience — matching the conventional bottom-right widget pattern used by Intercom, Crisp, and Tidio.

## Background

The current UI fills the entire viewport with a chat panel card and an outer navigation header. The user wants a "chatbot" feel: a small launcher button in the corner that expands into a compact floating panel, sitting over a minimal branded page.

---

## Design

### 1. Page Background

- Full-screen page (`h-screen`) with background colour `#eef5fb` (unchanged)
- Outer navigation header **removed**
- Centered branding block:
  - `MH` logo mark — same 40×40px dark blue (`#0055a6`) rounded square
  - Heading: "Mortgage House AI"
  - Tagline: "Your virtual lending specialist"
- No other page content

### 2. Launcher Button

- Fixed position: `bottom-6 right-6`, `z-50`
- Circular, 56×56px, background `#0055a6`
- **Collapsed state**: chat bubble SVG icon
- **Open state**: × (close) icon
- Small green online dot (`#4caf50`) at top-right of button
- `shadow-xl` drop shadow
- `hover:scale-105` scale transition on hover
- Icon swaps with CSS opacity/scale transition (~150ms)

### 3. Chat Panel

- Anchored above the launcher button (`bottom-20 right-6`)
- **Desktop**: `w-[380px] h-[580px]`
- **Mobile** (`< sm`): `w-screen h-[85vh]`, pinned `bottom-0 right-0`, full-width
- `rounded-2xl`, `shadow-2xl`, border `#cbddeb`, `bg-white`
- Opens/closes with CSS transition: `transform translateY + opacity` (~200ms ease-out)

#### Panel Header
- `AI` avatar (dark blue `#003d78` rounded square, 44×44px) with green online dot
- Title: "MortgageIQ Assistant"
- Subtitle: "Ask about loans, repayments, LVR or eligibility"
- "Online" badge (top-right)
- Close `×` button (top-right, same as launcher toggle)
- Bottom border `#d9e4ef`

#### Message Area
- Scrollable, `bg-[#f8fbfe]`, `flex-1 overflow-y-auto`
- Same bubble styles as current:
  - User: blue (`#0055a6`) right-aligned pill
  - Assistant: white left-aligned pill with border, preceded by `AI` avatar
  - Agent badge chips below assistant messages (unchanged)
- Empty state (no messages): quick-action chips + starter cards, scaled to fit 380px width (2-column grid still works)
- Loading dots animation: unchanged

#### Input Bar
- Rounded pill form pinned to panel bottom, `bg-[#f8fbfe]`
- Text input + orange send button (`#f58220`) — unchanged
- Disclaimer text below: "Demo only. Confirm lending recommendations with a Mortgage House broker."
- `border-t border-[#d9e4ef]`

---

## State

| State variable | Type | Purpose |
|---|---|---|
| `isOpen` | `boolean` | Controls panel open/closed |
| `messages` | `Message[]` | Chat history (unchanged) |
| `input` | `string` | Input field value (unchanged) |
| `loading` | `boolean` | Awaiting API response (unchanged) |
| `awaitingIntent` | `boolean` | Intake flow gate (unchanged) |
| `toastMessage` | `string` | Error toast (unchanged) |

All chat logic (`sendMessage`, `handleSubmit`, intake detection) is unchanged — only the layout shell changes.

---

## Files Changed

| File | Change |
|---|---|
| `app/page.tsx` | Full rewrite of JSX layout; all logic/state unchanged |

No new files, no new dependencies.

---

## Out of Scope

- No landing page content (approved: blank/minimal background only)
- No changes to API, agents, or chat logic
- No animation library — CSS transitions only
- No persistence of open/closed state across page loads
