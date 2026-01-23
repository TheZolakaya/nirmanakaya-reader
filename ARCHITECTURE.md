# Nirmanakaya Reader - Complete Architecture Reference

**Version:** 0.74.8
**Last Updated:** 2026-01-23

This document provides a comprehensive technical overview of the Nirmanakaya Reader codebase, with special emphasis on how interpretations are generated and prompts are built.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [The 78-Card System](#the-78-card-system)
3. [Status & Correction System](#status--correction-system)
4. [Reading Modes](#reading-modes)
5. [User Levels & Progressive Disclosure](#user-levels--progressive-disclosure)
6. [Prompt Building System (DETAILED)](#prompt-building-system)
7. [Interpretation Flow (DETAILED)](#interpretation-flow)
8. [Voice/Stance System](#voicestance-system)
9. [API Routes](#api-routes)
10. [Key Files Reference](#key-files-reference)

---

## System Overview

Nirmanakaya Reader is a **consciousness navigation system** (not a fortune teller). It generates AI-interpreted readings using a proprietary 78-card system built on archetypal patterns, channels, houses, and mathematical correction relationships.

### Core Principle
> "You are a creator. You have meaning. You're eternal. Love solves everything."

The system treats users as **creators within the Creator** - navigation assistance, not prophecy.

---

## The 78-Card System

**Source:** `lib/archetypes.js`

### Three Card Types

| Type | Count | ID Range | Description |
|------|-------|----------|-------------|
| **Archetypes** | 22 | 0-21 | Major signatures (like Major Arcana) |
| **Bounds** | 40 | 22-61 | Minor cards by Channel (like Minor Arcana) |
| **Agents** | 16 | 62-77 | Role cards (like Court Cards) |

### Archetypes (Majors)

Each archetype belongs to a **House** and optionally a **Channel**:

```
HOUSES (6):
├── Gestalt (governed by Source) → Potential(0), Will(1), Actualization(19), Awareness(20)
├── Spirit (governed by Potential) → Wisdom(2), Nurturing(3), Inspiration(17), Imagination(18)
├── Mind (governed by Actualization) → Order(4), Culture(5), Abstraction(15), Breakthrough(16)
├── Emotion (governed by Awareness) → Compassion(6), Drive(7), Balance(14), Change(13)
├── Body (governed by Will) → Fortitude(8), Discipline(9), Equity(11), Sacrifice(12)
└── Portal → Source(10), Creation(21)

CHANNELS (4 - like Elements):
├── Intent (Fire/Wands) → Directed action
├── Cognition (Air/Swords) → Mental clarity
├── Resonance (Water/Cups) → Emotional connection
└── Structure (Earth/Pentacles) → Material form
```

### Bounds (Minors)

40 cards organized as 10 cards per Channel:

```
Intent Channel (Wands):     Activation(1) → Realization(10)
Cognition Channel (Swords): Perception(1) → Clarity(10)
Resonance Channel (Cups):   Receptivity(1) → Completion(10)
Structure Channel (Pents):  Initiation(1) → Achievement(10)
```

Each Bound **expresses** an Archetype based on its number:
- Numbers 1, 10 → Gestalt domain
- Numbers 2, 9 → Spirit domain
- Numbers 3, 8 → Mind domain
- Numbers 4, 7 → Emotion domain
- Numbers 5, 6 → Body domain

### Agents (Royals)

16 cards = 4 Roles × 4 Channels:

```
Roles (by House):
├── Initiate (Page) → Spirit House → Enters with openness, curiosity
├── Catalyst (Knight) → Mind House → Disrupts stagnation, sparks change
├── Steward (Queen) → Emotion House → Maintains, nurtures, holds space
└── Executor (King) → Body House → Transforms intention into action
```

**CRITICAL RULE:** Agents ALWAYS represent aspects of the **querent's own consciousness**, never external people.

---

## Status & Correction System

**Source:** `lib/constants.js`, `lib/corrections.js`

### The Four Statuses

| Status | ID | Temporal Frame | Meaning | Correction Type |
|--------|----|--------------------|---------|-----------------|
| **Balanced** | 1 | Now-aligned | Authentic expression | Growth opportunity |
| **Too Much** | 2 | Future-projected | Over-expressing, anxiety | Diagonal |
| **Too Little** | 3 | Past-anchored | Under-expressing, withdrawn | Vertical |
| **Unacknowledged** | 4 | Shadow | Operating without awareness | Reduction |

### Correction Logic

**Source:** `lib/corrections.js`

Corrections are **pre-calculated lookups**, not formulas:

```javascript
// DIAGONAL_PAIRS (Too Much → opposite pole)
0: 19,   // Potential → Actualization
1: 20,   // Will → Awareness
2: 17,   // Wisdom → Inspiration
// ... etc

// VERTICAL_PAIRS (Too Little → same archetype, different phase)
0: 20,   // Potential → Awareness
1: 19,   // Will → Actualization
2: 18,   // Wisdom → Imagination
// ... etc

// REDUCTION_PAIRS (Unacknowledged → generating source)
2: 11,   // Wisdom → Equity
3: 12,   // Nurturing → Sacrifice
// ... etc (Gestalt/Portal have no reduction pairs)
```

**For Bounds:** Follow archetype correction + polarity flip (inner↔outer)
**For Agents:** Follow archetype correction + channel crossing + role rules

---

## Reading Modes

**Source:** `lib/modes.js`

### Mode Governance System

```javascript
const MODE_CONSTRAINTS = {
  reflect: {
    label: 'Reflect',
    operation: 'consume',  // Read-only observation
    coreQuestion: 'What is already happening?',
    allowedVerbs: ['is', 'appears', 'shows up as', 'is operating', 'tends to'],
    bannedVerbs: ['should', 'need to', 'must', 'fix', 'change', 'build'],
    canSurfaceLevers: false,
    canAskQuestions: false
  },

  discover: {
    label: 'Discover',
    operation: 'consume_to_latent_create',  // Find authorship locations
    coreQuestion: 'Where is authorship already available?',
    allowedVerbs: ['is already doing', 'is available', 'could be claimed'],
    conditionalVerbs: ['step in', 'lean into', 'name', 'claim'],
    bannedVerbs: ['do this', 'replace', 'implement'],
    canSurfaceLevers: true,
    canAskQuestions: true,  // ONE present-tense question only
    requiresTransitionMarker: true
  },

  forge: {
    label: 'Forge',
    operation: 'create',  // Active intention-setting
    coreQuestion: 'What changes when intention is asserted?',
    allowedVerbs: ['I am choosing', 'I am asserting', 'I am building'],
    bannedVerbs: ['guarantee', 'ensure', 'will cause', 'force'],
    requiresOwnership: true,  // First-person required
    requiresAuthorshipReturn: true,
    canSurfaceLevers: true
  },

  explore: {
    label: 'Explore',
    operation: 'discover_tokens',  // DTP mode
    coreQuestion: 'What is active for you right now?',
    allowedVerbs: ['is expressing as', 'is structured by', 'points to'],
    bannedVerbs: ['will cause', 'destiny', 'should'],
    canAskQuestions: false  // Declarative only
  }
};
```

---

## User Levels & Progressive Disclosure

**Source:** `lib/promptBuilder.js`

```javascript
const USER_LEVELS = {
  FIRST_CONTACT: 0,  // New user - Claude Haiku, 300 tokens, minimal prompts
  EXPLORER: 1,       // Learning - full prompts with some terms
  PRACTITIONER: 2,   // Comfortable - full feature set
  ARCHITECT: 3,      // Advanced - derivation visible
  MASTER: 4          // Expert - everything unlocked
};
```

### Level 0 vs Level 1+ Differences

| Aspect | Level 0 | Level 1+ |
|--------|---------|----------|
| Model | Claude Haiku | Claude Sonnet |
| Max Tokens | 300 | 16,000 |
| System Prompt | CORE_PROMPT + FIRST_CONTACT_FORMAT (~600 tokens) | Full BASE_SYSTEM + FORMAT_INSTRUCTIONS + Stance + Persona |
| Cards | Single card only | Up to 5 cards |
| Output | Plain paragraph | Progressive depth sections |
| Terminology | Plain English only | Architecture terms allowed |

---

## Prompt Building System

**Source:** `lib/promptBuilder.js`, `lib/prompts.js`, `lib/modePrompts.js`

### System Prompt Assembly

```javascript
function buildSystemPrompt(userLevel, options) {
  // Level 0: Minimal prompt
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return `${CORE_PROMPT}\n\n${FIRST_CONTACT_FORMAT}`;  // ~600 tokens
  }

  // Level 1+: Full prompt assembly
  const modeHeader = buildModeHeader(spreadType);      // Mode-specific intro
  const stancePrompt = buildStancePrompt(stance);      // 6-dimensional voice config
  const personaPrompt = buildPersonaPrompt(...);       // Creator/humor/register/roast/direct

  // Order matters - persona prompt LAST for recency
  return `${modeHeader}
${BASE_SYSTEM}
${stancePrompt}
${FORMAT_INSTRUCTIONS}
${WHY_MOMENT_PROMPT}
Letter tone for this stance: ${tone}
${personaPrompt}`;
}
```

### BASE_SYSTEM Critical Rules (~400 lines in prompts.js)

The BASE_SYSTEM contains these **mandatory constraints**:

#### 1. No Pet Names Rule
```
NEVER use: honey, sweetheart, dear, sweetie, love, darling, my friend, sugar, babe
Show warmth through TONE and CARE, not pet names.
```

#### 2. Agent Interpretation Rule
```
Agents ALWAYS refer to the QUERENT'S OWN consciousness — never external people.
WRONG: "There's someone in your life who..."
RIGHT: "The part of you that..."
```

#### 3. Agency Grammar Rule (CRITICAL)
```
CARD = verb (the agency being exercised) — GRAMMATICAL SUBJECT
POSITION = noun (the domain where agency occurs) — CONTEXT
STATUS = adverb (how the agency is expressed) — MODIFIER

WRONG: "Creation is being forced" (position as subject)
RIGHT: "Flourishing is over-applied in Creation" (card as subject)

VALIDATION: If you remove the card and the sentence still makes sense,
you've made the position the subject. Rewrite it.
```

#### 4. Canonical Names Rule
```
Each draw provides the EXACT canonical name. You MUST use it.
NEVER invent alternatives like "Fulfillment", "Completion", "Achievement"
The 78 signatures have FIXED canonical names.
```

#### 5. Emergence Language Rule
```
This is consciousness architecture, not fortune-telling.
NEVER: "You drew Wisdom"
ALWAYS: "Wisdom emerges"
Use: emerges, surfaces, what emerges, the emergence
```

### FORMAT_INSTRUCTIONS (~450 lines)

Defines the **progressive depth output structure**:

```
DEPTH GENERATION MODEL (write DEEP first, condense down):

1. Write DEEP first — full transmission, no constraints
2. Condense DEEP → SWIM — same insight, tightened (6-10 sentences)
3. Condense SWIM → WADE — same insight, more essential (3-5 sentences)
4. Distill WADE → SURFACE — absolute essence (1-2 sentences MAX)

VALIDATION: Surface IS the seed that Deep fully expresses.
            If they feel like different interpretations, rewrite.
```

### Section Markers

The AI must use these exact markers:

```
[LETTER:SURFACE/WADE/SWIM/DEEP]        - Personal greeting
[SUMMARY:SURFACE/WADE/SWIM/DEEP]       - Core answer to question
[CARD:N:SURFACE/WADE/SWIM/DEEP]        - Card interpretation
[CARD:N:ARCHITECTURE]                   - Factual card data
[CARD:N:MIRROR]                         - 2-3 line poetic reflection
[CARD:N:WHY:SURFACE/WADE/SWIM/DEEP/ARCHITECTURE]  - Teleological data
[CARD:N:REBALANCER:SURFACE/WADE/SWIM/DEEP/ARCHITECTURE]  - Correction path
[CARD:N:GROWTH:...]                     - Growth opportunity (balanced only)
[PATH:SURFACE/WADE/SWIM/DEEP/ARCHITECTURE]  - Holistic synthesis
[FULL_ARCHITECTURE]                     - Complete structural derivation
```

### User Message Building

**Source:** `lib/promptBuilder.js:buildUserMessage()`

```javascript
function buildUserMessage(question, draws, userLevel, options) {
  // Level 0: Simple format
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return `Their question: "${question}"
THE SIGNATURE DRAWN: ${trans.name}
Status: ${statusPrefix} (${stat.name} — ${stat.desc})
IMPORTANT: Start your response with "${trans.name}".`;
  }

  // Level 1+: Full format
  const drawText = formatDrawForAI(draws, spreadType, spreadKey);
  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);

  return `QUESTION: "${question}"

THE DRAW (${spreadName}):

${drawText}

${teleologicalPrompt}

Respond using the PROGRESSIVE DEPTH section markers:
[LETTER:SURFACE], [LETTER:WADE], ... ${cardMarkers} ... [FULL_ARCHITECTURE]

CRITICAL: Generate sections in this EXACT order...`;
}
```

### formatDrawForAI Function

**Source:** `lib/utils.js:formatDrawForAI()`

This is where each card is prepared for the AI:

```javascript
function formatDrawForAI(draws, spreadType, spreadKey) {
  return draws.map((draw, i) => {
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const correction = getFullCorrection(draw.transient, draw.status);

    return `**Signature ${i + 1}**: ${statusPhrase}
⚠️ MANDATORY: Your interpretation MUST include the word "${positionName}" at least once.
Agency (THE SUBJECT): ${agencyInfo}
Domain (POSITION): ${positionName}
Status: ${stat.name} — ${stat.desc}
${correctionText ? `Correction: ${correctionText}
REBALANCER TARGET: ${rebalancerTargetName}. This is the ONLY card to discuss in rebalancer sections.` : 'No correction needed (Balanced)'}
Grammar rule: ${trans.name} is the subject. Say "${trans.name} in ${positionName}".`;
  }).join('\n\n');
}
```

---

## Interpretation Flow

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                    │
│    Question + Spread Size + Mode + Voice/Stance                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SPREAD GENERATION (lib/utils.js:generateSpread)              │
│    ├── Shuffle positions (0-21 archetypes)                       │
│    ├── Shuffle transients (0-77 cards)                           │
│    ├── Random status (1-4) per card                              │
│    └── Returns: [{ position, transient, status }, ...]           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SYSTEM PROMPT BUILD (lib/promptBuilder.js:buildSystemPrompt)  │
│    Level 0:                                                      │
│    └── CORE_PROMPT + FIRST_CONTACT_FORMAT (~600 tokens)          │
│                                                                  │
│    Level 1+:                                                     │
│    ├── buildModeHeader(spreadType)      // Mode-specific intro   │
│    ├── BASE_SYSTEM                      // ~400 lines of rules   │
│    ├── buildStancePrompt(stance)        // 6-dimension voice     │
│    ├── FORMAT_INSTRUCTIONS              // ~450 lines of format  │
│    ├── WHY_MOMENT_PROMPT                // Teleological grounding│
│    └── buildPersonaPrompt(...)          // Humor/register/creator│
│                                                                  │
│    Wrap in: cache_control: { type: "ephemeral" }                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. USER MESSAGE BUILD (lib/promptBuilder.js:buildUserMessage)    │
│    ├── sanitizeForAPI(question)                                  │
│    ├── formatDrawForAI(draws) - Convert cards to AI format       │
│    │   └── For each card:                                        │
│    │       ├── Card name + type + channel/house                  │
│    │       ├── Position name (the domain context)                │
│    │       ├── Status name + description                         │
│    │       ├── Correction target (if imbalanced)                 │
│    │       └── Grammar enforcement notes                         │
│    ├── buildReadingTeleologicalPrompt(draws) - Words to Whys     │
│    └── Section marker instructions                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. API CALL (app/api/reading/route.js)                          │
│    ├── Check user access (ban/throttle via Supabase)             │
│    ├── Send to Anthropic API:                                    │
│    │   ├── Model: Haiku (Level 0) or Sonnet (Level 1+)           │
│    │   ├── System prompt with cache_control                      │
│    │   ├── User message with question + formatted draws          │
│    │   └── max_tokens: 300 (Level 0) or 16000 (Level 1+)         │
│    ├── Record token usage                                        │
│    └── Return response + cache statistics                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE PARSING (lib/utils.js:parseReadingResponse)          │
│    ├── Detect format (progressive depth vs legacy)               │
│    └── Extract sections by markers:                              │
│        ├── [LETTER:*] → letter { surface, wade, swim, deep }     │
│        ├── [SUMMARY:*] → summary { surface, wade, swim, deep }   │
│        ├── [CARD:N:*] → cards[N] with all subsections            │
│        ├── [PATH:*] → path { surface, wade, swim, deep, arch }   │
│        └── [FULL_ARCHITECTURE] → fullArchitecture                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. CONTENT FILTERING (lib/contentFilter.js)                      │
│    ├── Strip prohibited terms                                    │
│    ├── Remove banned verbs for current mode                      │
│    └── Validate no terms of endearment                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. HOTLINK RENDERING (lib/hotlinks.js)                           │
│    ├── Convert [bracketed] card names to clickable links         │
│    ├── Add glossary tooltips                                     │
│    └── Process framework term references                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. UI RENDERING (app/page.js)                                    │
│    ├── Display letter with depth controls (Surface→Deep)         │
│    ├── Display summary with progressive reveal                   │
│    ├── Display cards with threaded UI                            │
│    ├── Display corrections/rebalancers if imbalanced             │
│    ├── Display path to balance (synthesis)                       │
│    └── Optional: full architecture view                          │
└─────────────────────────────────────────────────────────────────┘
```

### What the AI Actually Receives

For a Level 1+ reading with one card, the AI receives:

**System Prompt (~2500 tokens):**
```
[MODE HEADER - from modePrompts.js]
This reading is in DISCOVER mode...

[BASE_SYSTEM - ~400 lines]
CRITICAL: Never use pet names...
CRITICAL RULE: ROYAL/AGENT INTERPRETATION...
CRITICAL RULE: AGENCY GRAMMAR...
[Full derivation system, canonical names, all constraints]

[STANCE PROMPT]
COMPLEXITY: guide - Warm, clear, walking together
VOICE: warm - Grandmotherly, no judgment
... etc

[FORMAT_INSTRUCTIONS - ~450 lines]
RESPONSE FORMAT — PROGRESSIVE DEPTH LAYERS:
[All section markers and requirements]

[WHY_MOMENT_PROMPT]
[Teleological grounding instructions]

[PERSONA PROMPT]
Creator emphasis: 5/10
Humor: 3/10
... etc
```

**User Message (~300 tokens per card):**
```
QUESTION: "What do I need to see right now?"

THE DRAW (Discover Emergent):

**Signature 1**: Too Much Discipline
⚠️ MANDATORY: Your interpretation MUST include the word "Awareness" at least once.
Agency (THE SUBJECT): Discipline — Major Archetype
Domain (POSITION): Awareness
Status: Too Much — Future-projected expression; the function is over-applied
Correction: Sacrifice via DIAGONAL duality
REBALANCER TARGET: Sacrifice. This is the ONLY card to discuss in rebalancer sections.
Grammar rule: Discipline is the subject. Say "Discipline in Awareness".

[TELEOLOGICAL DATA]
Archetype: Discipline (9)
House: Body | Channel: Cognition
Function: Repetition with purpose, attunement through action
...

Respond using the PROGRESSIVE DEPTH section markers:
[LETTER:SURFACE], [LETTER:WADE], ... [FULL_ARCHITECTURE]
```

---

## Voice/Stance System

**Source:** `lib/voice.js`

Six independent dimensions, each with multiple settings:

```javascript
// COMPLEXITY (Language Register)
friend   → "Dude", short words, playful
guide    → Warm, clear, walking together
teacher  → Structured, educational
mentor   → Philosophical depth, wisdom
master   → Full transmission, framework depth

// VOICE (Emotional Tone)
wonder   → Delighted, fascinated, "Oh wow!"
warm     → Grandmotherly, fierce love
direct   → No bullshit, tough love
grounded → Calm, seasoned, dry humor

// FOCUS (Emphasis)
do       → Action-oriented, "do this"
feel     → Emotional truth, name feelings
see      → Understanding, "oh NOW I get it"
build    → Practical steps, tangible form

// DENSITY (Language Richness)
luminous → Full, layered, poetic, spacious
rich     → Warm, expansive, satisfying
clear    → Accessible, flowing, balanced
essential→ Minimal, bare, core truth only

// SCOPE (Framing Context)
resonant → Widest context, archetypal
patterned→ Recurring dynamics, cycles
connected→ Relational context, ripple effects
here     → Immediate situation, close

// SERIOUSNESS (Tone Weight)
playful  → Funny, jokes, "lol" energy
light    → Gentle humor, breezy
balanced → Read the room
earnest  → Sincere, heart-forward
grave    → Full weight, sacred
```

**Presets:** Clear, Kind, Playful, Wise, Oracle

---

## API Routes

### POST /api/reading

**Source:** `app/api/reading/route.js`

```javascript
// Request body
{
  messages: [...],           // Conversation history
  system: "prompt text",     // System prompt
  model: "sonnet|haiku",     // Model selection
  isFirstContact: boolean,   // Level 0 flag
  max_tokens: number,        // Output limit
  isDTP: boolean,           // Direct Token Protocol mode
  draws: [...],             // Pre-generated draws
  userId: "uuid"            // For token tracking
}

// Features:
// - Prompt caching (90% input token savings)
// - User access control (ban/throttle)
// - Daily token limit tracking
// - Usage recording to Supabase
```

### POST /api/external-reading

External API for third-party integrations.

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `app/page.js` | ~6,800 | Main React component, all UI state |
| `lib/prompts.js` | ~1,200 | BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT |
| `lib/promptBuilder.js` | ~170 | Level-based prompt assembly |
| `lib/archetypes.js` | ~300 | Card data: ARCHETYPES, BOUNDS, AGENTS |
| `lib/constants.js` | ~400 | STATUSES, CHANNELS, HOUSES, colors |
| `lib/corrections.js` | ~540 | Correction system with lookup tables |
| `lib/modes.js` | ~135 | Mode governance (Reflect/Discover/Forge/Explore) |
| `lib/voice.js` | ~400 | 6-dimensional voice/stance system |
| `lib/utils.js` | ~800 | Spread generation, encoding, parsing, formatDrawForAI |
| `lib/spreads.js` | ~300 | Spread definitions |
| `lib/teleology-utils.js` | ~200 | Words to the Whys grounding |
| `lib/hotlinks.js` | ~150 | Clickable framework term rendering |
| `lib/contentFilter.js` | ~100 | Post-processing content filtering |
| `app/api/reading/route.js` | ~250 | Main API endpoint |

---

## Quick Reference: Finding Things

**"How do I change what the AI receives?"**
→ `lib/prompts.js` (BASE_SYSTEM, FORMAT_INSTRUCTIONS)
→ `lib/promptBuilder.js` (assembly)

**"How do I change card formatting for AI?"**
→ `lib/utils.js:formatDrawForAI()`

**"How do corrections work?"**
→ `lib/corrections.js` (lookup tables + getFullCorrection)

**"How do modes enforce constraints?"**
→ `lib/modes.js` (MODE_CONSTRAINTS)

**"How do I change voice options?"**
→ `lib/voice.js` (COMPLEXITY, VOICE, FOCUS, DENSITY, SCOPE, SERIOUSNESS)

**"How is the response parsed?"**
→ `lib/utils.js:parseReadingResponse()`

**"Where is the main UI?"**
→ `app/page.js` (monolithic ~6800 lines)
