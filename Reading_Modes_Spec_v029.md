# Reading Modes Spec v0.29

## Executive Summary

The Reader is being restructured around three modes and two operations that embody the Nirmanakaya framework itself.

**Three Modes** = Entry points (how you begin)
- **Discover** — Open mirror, receive what shows up
- **Reflect** — Structured mirror, examine specific areas  
- **Forge** — Active creation, iterate through intention

**Two Operations** = In-flow choices (how you continue)
- **Reflect** — Recursion (integrate, receive, sit with)
- **Forge** — Polarity (differentiate, act, create)

The user literally enacts the consciousness architecture by using the tool. The UX IS the teaching.

---

## The Architecture

| Mode | Posture | Principle | Best For |
|------|---------|-----------|----------|
| **Discover** | "Show me what's present" | Mirror (open) | "What needs attention?" |
| **Reflect** | "Show me these specific areas" | Mirror (structured) | "How's my whole system?" |
| **Forge** | "I'm building something" | Forge (active) | "What if I do X?" |

| Operation | Action | Principle |
|-----------|--------|-----------|
| **Reflect** | Integrate, receive, sit with | Recursion |
| **Forge** | Act, create, differentiate | Polarity |

---

## Implementation Phases

### PHASE 1: RENAME & RESTRUCTURE

**Scope:** Rename UI elements, add Forge tab placeholder

#### 1.1 Rename Mode Tabs
- "Dynamic Lens" → "Discover"
- "Fixed Layout" → "Reflect"
- Add third tab: "Forge" (disabled with "Coming soon" tooltip)

#### 1.2 Mode Selector Styling
```
[   Discover   ] [   Reflect   ] [   Forge   ]
                                  (coming soon)
      ← Receive                   Create →
```
Add subtle spectrum label underneath.

#### 1.3 Discover Mode (formerly Dynamic Lens)
Keep current functionality:
- Card count selector [One] [Two] [Three] [Four] [Five]
- Stance presets
- Question input
- Main button says "Discover"

#### 1.4 Reflect Mode (formerly Fixed Layout)
Keep current functionality:
- Main button says "Reflect"
- Future: will add spread selector (Five Houses, Four Channels, etc.)

#### 1.5 Forge Mode Placeholder
When clicked, show:
```
┌────────────────────────────────────────────┐
│  Forge Mode — Coming Soon                  │
│                                            │
│  Declare an intention. Pull a card.        │
│  See how your action lands. Iterate.       │
│                                            │
│  The active side of the mirror.            │
└────────────────────────────────────────────┘
```

#### 1.6 Update Header Bar
Currently: "DYNAMIC LENS • THREE • A TEACHER • DEEP DIVE"
Change to: "DISCOVER • THREE • GENTLE GUIDE" (using new mode/preset names)

---

### PHASE 2: REFLECT/FORGE OPERATIONS

**Scope:** Add Reflect/Forge buttons after every card, enable threading

#### 2.1 Add Operation Buttons to Each Card

```
[Card: Too Little Drive in your Discipline]
[interpretation...]

[Unpack] [Clarify] [Architecture] [Example]

────────────────────────────────────────────

[Reflect]  [Forge]

(optional) Add context...
[________________________________]

[Continue]
```

- Thin separator line between existing buttons and operation section
- Reflect and Forge buttons side by side, centered
- Small text input below (optional context)
- Continue button (disabled until Reflect or Forge selected)

#### 2.2 Button Behavior

**Reflect button:**
- When clicked, highlight/select
- Enable Continue button
- User can optionally add context

**Forge button:**
- When clicked, highlight/select
- Enable Continue button
- User can optionally add context

Only one can be selected at a time (radio behavior).

#### 2.3 Continue Button

When clicked:
- Draw ONE new card (random position, transient, status)
- Send API request with parent card, operation, context, stance
- Display new card NESTED below parent

#### 2.4 Nested Card Display

```
[Card 1: Too Little Drive in your Discipline]
  [interpretation...]
  [Unpack] [Clarify] [Architecture] [Example]
  
  ↳ Reflecting: "This reminds me of my father"
  
    [Card 2: Balanced Potential in your Will]
    [interpretation in context...]
    [Unpack] [Clarify] [Architecture] [Example]
    
    [Reflect]  [Forge]
    (optional) Add context...
    [Continue]
```

- Show operation chosen + context as label
- Indent/nest new card visually
- New card has its own Reflect/Forge buttons

#### 2.5 API Payload

```javascript
{
  parentCard: {
    position: 7,
    transient: 42,
    status: 3,
    interpretation: "Too Little Drive in your Discipline means..."
  },
  operation: "reflect" | "forge",
  context: "This reminds me of my father" | null,
  newDraw: {
    position: 0,
    transient: 15,
    status: 1
  },
  stance: {
    complexity: "guide",
    voice: "warm",
    focus: "feel",
    density: "clear",
    scope: "connected"
  },
  threadDepth: 1
}
```

#### 2.6 Prompt Modifications

**For Reflect:**
```
OPERATION: REFLECT
The user is integrating this card — sitting with it, receiving it, folding it in.
Context they shared: "[user's context or 'none provided']"

Interpret this new card as what deepens or clarifies through integration.
Frame your response as: "As you sit with this, here's what emerges..."
Connect it to the parent card's message and any context provided.
```

**For Forge:**
```
OPERATION: FORGE
The user is acting on this card — creating from it, moving forward, differentiating.
Context they shared: "[user's context or 'none provided']"

Interpret this new card as what emerges from their action or intention.
Frame your response as: "As you move forward, here's what emerges..."
Connect it to the parent card's message and any context provided.
```

#### 2.7 Thread Data Structure

```javascript
thread: [
  {
    draw: { position: 7, transient: 42, status: 3 },
    interpretation: "Too Little Drive...",
    operation: "reflect",
    context: "This reminds me of my father"
  },
  {
    draw: { position: 0, transient: 15, status: 1 },
    interpretation: "Balanced Potential...",
    operation: "forge",
    context: "I'm going to call him this week"
  },
  {
    draw: { position: 12, transient: 8, status: 2 },
    interpretation: "Too Much Sacrifice...",
    operation: null  // current card, no operation yet
  }
]
```

#### 2.8 Visual Styling

- Reflect button: subtle, receptive feel (cooler tone)
- Forge button: active, creative feel (warmer tone)
- Nested cards: indented with visual connector (↳ or vertical line)
- Context text shown in italics above nested card

#### 2.9 Edge Cases

- Max thread depth: 5-7 recommended
- Preserve state if user navigates away mid-thread
- Export includes full thread with operations and context

---

### PHASE 3: FORGE MODE ENTRY

**Scope:** Enable Forge as standalone mode with intention-first flow

#### 3.1 Enable Forge Tab
Remove "Coming soon" — Forge is now active.

#### 3.2 Forge Mode UI

```
[Discover] [Reflect] [Forge]
                      ^^^^^

What are you forging?
[I'm committing to a new creative project___________]

Choose your stance:
[Quick Take] [Gentle Guide] [Clear View] [Deep Dive] [Full Transmission]
← Lighter                                            Deeper →

▶ Fine-tune

[Forge]
```

- Question label: "What are you forging?"
- Main button: "Forge"
- No card count selector — always pulls ONE card

#### 3.3 Initial Forge Draw

User types intention → clicks Forge → draws ONE card

**Prompt frame:**
```
FORGE MODE - INITIAL DRAW
The user has declared an intention: "[their intention]"
They've drawn their first card.

Interpret this card as how their intention lands in the architecture.
Frame: "Here's what emerges as you begin to forge this..."
```

#### 3.4 After First Card

Same as Phase 2 — Reflect/Forge buttons appear:

```
[Card: Balanced Inspiration in your Will]
[interpretation in context of forging intention...]

[Unpack] [Clarify] [Architecture] [Example]

[Reflect]  [Forge]
(optional) Add context...
[Continue]
```

#### 3.5 Forge Mode Header

```
FORGE • GENTLE GUIDE
```

No card count displayed.

#### 3.6 Forge Mode Data

```javascript
{
  mode: "forge",
  forgingIntention: "I'm committing to a new creative project",
  stance: {...},
  thread: [...]
}
```

#### 3.7 Prompt Context for Forge Mode

All subsequent cards include:
```
MODE: FORGE
Original intention: "[user's forging intention]"
Thread: [previous cards + operations + contexts]

This is an iterative creative process. Each card builds on the last.
The user is actively forging, not just receiving.
```

---

## Summary

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 | Rename & restructure | Small |
| Phase 2 | Reflect/Forge operations | Medium |
| Phase 3 | Forge mode entry | Medium |

---

## The Deeper Truth

The user doesn't need to know they're doing Recursion and Polarity.

They just feel the choice:

**Am I receiving or creating right now?**

And the architecture responds accordingly.

**The UX IS the teaching.** 🔥
