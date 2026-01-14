# SPEC: FR12 — Life Domain Spreads (Custom Mode First)

**Created:** January 11, 2026
**Priority:** LARGE
**Status:** Design Phase
**Contributors:** Claude, Gemini, Chris

---

## Overview

Life Domain Spreads add a contextual layer to readings without compromising the veil. The user provides a "life domain" (arena/context), the architecture fills it with veiled truth.

**The Three-Layer Sentence:**
```
[Card] in [Position] in [Domain] — [Status]
```

Example: "Six of Cups in Will in [my relationship with Margaret] — Too Little"

---

## Phase 1: Custom Mode Implementation

### 1.1 UI Flow

**Entry Point:** New toggle or tab alongside existing mode selector

```
[Reflect] [Discover] [Forge] [Domain ▾]
```

When Domain is selected, show:

```
┌─────────────────────────────────────────────────────┐
│  What's the arena?                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │ my relationship with Margaret                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Quick picks:                                       │
│  [Work] [Love] [Family] [Health] [Money]           │
│  [Creativity] [Home] [Purpose] [Learning]          │
│                                                     │
│  Recent: [Margaret] [The startup] [Dad]            │
│                                                     │
│  Cards: [1] [2] [3] [4] [5]                        │
│                                                     │
│  Your question or intention:                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ What's present in this arena right now?       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│              [Generate Reading]                     │
└─────────────────────────────────────────────────────┘
```

### 1.1a Default Domain Fallback (Grok Addition)

If user leaves domain blank, use:
- **"My Current Life Situation"** or
- **"What I Most Need to See Right Now"**

Keeps flow smooth for beginners who don't know what to ask about.

### 1.2 Question Handling (No Prediction Firewall)

**The architecture doesn't block predictive questions — it mirrors them.**

When a user asks "Will I get the job?", they're not asking for fortune-telling. They're revealing what's alive in them right now. The question IS the mirror.

**How it works:**

| User Asks | Architecture Answers |
|-----------|---------------------|
| "Will I get the job?" | "Here's what your relationship to [the job] looks like right now" |
| "Will Margaret and I stay together?" | "Here's what's present in [your relationship with Margaret] right now" |
| "Should I move to Seattle?" | "Here's the current resonance of [the Seattle move]" |

**The prompt handles this naturally:**

```
The user's question reveals what's alive for them. 
Answer what IS, not what will be.
Their predictive framing is itself diagnostic — 
it shows where their attention is magnetized.
```

**No input sanitization. No reframing dialogs. No friction.**

The architecture meets them where they are and shows them the present.

### 1.3 Data Flow

```
User Input
    ↓
lifeDomain = "my relationship with Margaret"
question = "What's present here?"
cardCount = 3
    ↓
generateSpread({ lifeDomain, question, cardCount })
    ↓
[Draw is BLIND to context — randomness unchanged]
    ↓
buildSystemPrompt({ lifeDomain, draws, question })
    ↓
API Call with lifeDomain injected into prompt
    ↓
Response with domain-aware interpretation
```

**Key:** `lifeDomain` is NULL during draw phase. Only injected at interpretation phase.

### 1.4 Prompt Integration

**Add to system prompt (after BASE_SYSTEM):**

```javascript
const LIFE_DOMAIN_PROMPT = `
LIFE DOMAIN CONTEXT
===================
The user has identified a specific life arena: "${lifeDomain}"

THE RULE OF TRANSCENDENCE:
Do NOT shrink the Archetype to fit the Context. 
EXPAND the Context to fit the Archetype.

Example: If the Context is "My dispute with Margaret" and the card 
is "The Tower in Spirit", do not look for a trivial argument. 
Interpret how the dispute with Margaret is actually a symptom of 
a massive spiritual restructuring in the user's identity. Show 
how the small noun (Margaret) is being used by the large noun 
(Spirit) to enact the change.

VISUAL HIERARCHY (follow this order):
1. The Anchor (Position): "In your Will..."
2. The Context (Domain): "...regarding ${lifeDomain}..."
3. The Energy (Card/Status): "...there is too little nostalgic flow."

The architecture remains the subject. The life situation is the object.

DOMAIN-AWARE EXAMPLES:
- Examples MAY reference the domain
- Interpretation may NOT depend on domain-specific assumptions

✓ OK: "In '${lifeDomain}', this could look like..."
✗ NOT OK: "Because this is about ${lifeDomain}, it means..."
`;
```

### 1.5 Display Changes

**Reading Header:**
```
┌─────────────────────────────────────────────────────┐
│  DISCOVER • THREE CARDS • DOMAIN: Margaret          │
└─────────────────────────────────────────────────────┘
```

**Three-Layer Sentence (prominent, top of each card):**
```
┌─────────────────────────────────────────────────────┐
│  Reverie in Order in [Margaret] — Balanced          │
│  ─────────────────────────────────────────────────  │
│  [Card]   [Position]   [Domain]      [Status]       │
└─────────────────────────────────────────────────────┘
```

### 1.6 Status Legend (Always Visible)

Per Gemini's recommendation — use vectors:

```
┌─────────────────────────────────────────────────────┐
│  → Too Much    (future-pulled, overdriving)         │
│  ← Too Little  (past-anchored, withholding)         │
│  ◐ Unacknowledged (operating in shadow)             │
│  • Balanced    (aligned, usable now)                │
└─────────────────────────────────────────────────────┘
```

Small, collapsible, always accessible.

---

## Phase 2: Presets (QoL)

### 2.1 What's Already Built

**Depth:** Shallow/Wade/Swim/Deep with on-demand generation — already implemented.

**Voice/Tone:** Existing stance system (Humor, Register, Agency sliders) + Interpreter Voice (Clear, Kind, Playful, Wise, Oracle) — already implemented.

### 2.2 New Presets for Life Domain Mode

None required — Life Domain Mode uses all existing systems. The domain input is the only new UI element.

---

## Phase 3: Preset Templates

### 3.1 Template Definitions

**User-facing names (Gemini's recommendation):**

| Internal | User-Facing | Icon |
|----------|-------------|------|
| Connection | Relationship Mirror | 👥 |
| Crossroads | Choice Compass | ⚖️ |
| Manifestation | Build Plan | 🔨 |
| Cross-Section | Four-Aspects Scan | ◈ |

### 3.2 Crossroads with Invariant Anchor (Gemini #14)

**Updated structure (5 cards):**

| Position | Label | Definition |
|----------|-------|------------|
| 0 | **The Pivot** | What is true about YOU regardless of choice |
| 1 | The Resonance of [Choice A] | Current energy of this path |
| 2 | The Resonance of [Choice B] | Current energy of this path |
| 3 | The Blind Spot | What you're not seeing |
| 4 | The Alignment | What integrity looks like |

**Plus finishing moves:**
- "What stays true regardless of choice?" (1-2 lines)
- "Smallest reversible step?" (1 line)

### 3.3 Cross-Section Output Order

Always: **Spirit → Mind → Emotion → Body**

Plus synthesis: "If you change one thing first, change ___."

---

### 3.5 Mirror Spread — Self-Relationship (Grok Addition)

**User-facing name:** "Self Mirror"

**Focus:** How you relate to yourself vs. how you relate to the world.

**The Spread Structure (2 cards):**

| Position | Label | Definition |
|----------|-------|------------|
| 1 | Inner Stance | How I am relating to myself |
| 2 | Outer Stance | How I am relating to the world |

**Use cases:** Self-worth, loneliness, "why do I keep doing this?"

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `lib/domain.js` | NEW — Domain utilities |
| `lib/spreads.js` | Add template spreads with variable injection |
| `lib/prompts.js` | Add LIFE_DOMAIN_PROMPT section |
| `lib/promptBuilder.js` | Handle lifeDomain parameter |
| `components/DomainInput.js` | NEW — Domain selection UI |
| `components/QuickPicks.js` | NEW — Chip selector for common domains |
| `components/StatusLegend.js` | NEW — Always-visible status reference |
| `app/page.js` | Integrate domain mode |

---

## Implementation Order

**Today (if possible):**
1. ✅ Domain input field + quick picks
2. ✅ Prompt integration (LIFE_DOMAIN_PROMPT)
3. ✅ Three-layer sentence display
4. ✅ Default domain fallback

**Next session:**
5. Presets (depth/tone/format)
6. Status legend with vectors

**Later:**
7. Template spreads (Connection, Crossroads, etc.)

---

## Testing Checklist

### Custom Mode
- [ ] Domain input accepts free text
- [ ] Quick picks populate domain field
- [ ] Default fallback works when domain left blank
- [ ] Domain passed to prompt correctly
- [ ] Three-layer sentence displays at top of each card
- [ ] Domain does NOT affect randomness (blind draw)

### Prompt Behavior
- [ ] AI expands context to fit archetype (not vice versa)
- [ ] AI follows visual hierarchy (Position → Domain → Card)
- [ ] AI uses domain in examples but not assumptions
- [ ] Predictive questions answered as present-state mirrors
- [ ] No fortune-telling language in output

---

## Success Criteria

- [ ] User can enter any life domain and get a contextualized reading
- [ ] Veil remains intact (randomness blind to context)
- [ ] Predictive questions mirrored as present-state readings
- [ ] Reading feels grounded in user's actual life
- [ ] Architecture remains the subject, life situation the object

---

*The structure is the authority. The domain is the lens.*
