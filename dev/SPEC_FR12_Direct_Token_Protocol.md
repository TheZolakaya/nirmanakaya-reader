# SPEC: FR12 — Direct Token Protocol (Life Domain Reading)

**Created:** January 11, 2026
**Priority:** HIGH
**Status:** Ready for Implementation
**Contributors:** Claude, Gemini, GPT, Chris

---

## Overview

The Direct Token Protocol (DTP) is a syntax-first reading architecture where user-named reality objects are read directly without narrative coercion or preset templates.

**The user describes what's active. The system parses tokens. The architecture reads each one.**

---

## Core Concept

### The Old Way (Rejected)
- User picks a template ("Relationship Mirror", "Choice Compass")
- User fills in variables
- System forces their reality into preset positions

### The New Way (DTP)
- User describes what's active in plain language
- System extracts up to 5 tokens (nouns/entities, verbs/dynamics)
- Each token gets its own card + position + status
- No "Obstacle" or "Outcome" labels — the token IS the context

---

## The Three-Layer Sentence

For each token:
```
[Token] is expressing as [Card] in [Position] — [Status]
```

Example:
```
"Fear" is expressing as "The Tower" in "Order" — Too Much
```

Meaning: Your fear is currently destabilizing how you hold authority. This is visible now. It is adjustable.

---

## User Flow

### Step 1: Input

Single open text field.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  What's active for you right now?                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ I want to leave my job to start a bakery but  │  │
│  │ I'm scared and my partner isn't sure about it │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│              [Read This]                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Design notes:**
- Large, inviting text area (not a single line)
- No "question" framing — this is declaration, not inquiry
- Placeholder text: "Describe what's alive for you..."

### Step 2: Reading Generation (Single API Call)

**No confirmation step.** One API call does everything:
1. AI parses tokens from input
2. AI maps tokens to pre-drawn cards
3. AI interprets each token
4. Response includes which tokens were used

The user sees the tokens in the reading output — if wrong, they regenerate.

**Future enhancement (not now):** Optional token selection UI where user picks their own tokens before the draw.

### Step 3: Reading Display

**DTP feeds into the existing output structure.**

Each token becomes one card in the reading, using the full existing display:
- Letter
- Overview  
- Words to Whys
- Rebalancer (imbalanced) / Growth Opportunity (balanced)
- Reflect/Forge threads
- All depth levels (Shallow/Wade/Swim/Deep)
- All voice/stance settings

**THE KEY ADDITION: Token as Contextual Lens**

The token is injected throughout the entire card interpretation:

| Without Token | With Token |
|---------------|------------|
| "Too Much Tower in your Emperor" | "Too Much Tower in your Emperor *regarding [Fear]*" |
| "There's destabilizing energy in how you hold authority" | "There's destabilizing energy in how you hold authority *as it relates to [Fear]*" |

This applies to:
- **Letter** — token context woven in
- **Overview** — token context woven in
- **Words to Whys** — token context woven in
- **Rebalancer/Growth** — token context woven in
- **Synthesis** — connects all tokens with their contexts
- **Reflect threads** — user's reflection is in context of token
- **Forge threads** — user's declaration is in context of token

```
┌─────────────────────────────────────────────────────┐
│  REGARDING: FEAR                                    │
│  ─────────────────────────────────────────────────  │
│  Too Much Tower in Emperor                          │
│                                                     │
│  [Letter, Overview, etc. — all contextualized       │
│   with "regarding Fear" / "as it relates to Fear"]  │
│                                                     │
│  Reflect: [input] → response in context of Fear    │
│  Forge: [input] → response in context of Fear      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**This is a systemic change:** Every prompt that generates card content needs the token injected as context.

---

## Technical Architecture

### Single API Call

One round-trip handles everything:

```
1. User submits input text
2. Frontend generates up to 5 random draws (no duplicate positions)
3. Single API call with:
   - User's input text
   - Available draws array
   - System prompt with two-phase instructions
4. AI extracts tokens (1-5), uses one draw per token
5. AI interprets each token with its corresponding draw
6. Response includes tokens used + readings
7. Frontend renders only the cards that were used
```

**The AI decides how many tokens.** Unused draws are simply ignored.

### System Prompt Structure

```javascript
const DTP_SYSTEM_PROMPT = `
DIRECT TOKEN PROTOCOL
=====================

PHASE 1: TOKEN EXTRACTION
-------------------------
The user said: "${userInput}"

Extract up to 5 Active Tokens — the nouns/entities and verbs/dynamics 
that are alive in this statement.

Rules:
- Filter connective tissue (I, to, but, and, the)
- Preserve the user's exact language where possible
- Ensure balance: don't let 5 emotions crowd out structure, 
  or 5 nouns crowd out agency
- If more than 5 candidates, select the most energetically present

List your extracted tokens clearly before proceeding.

PHASE 2: READING
----------------
You have been given random draws. Use one draw per token, in order.

For each token, interpret using this structure:

TOKEN: [User's word]
DRAW: [Card] in [Position] — [Status]

INTERPRETATION:
- Use the three-layer sentence: "[Token] is expressing as [Card] in [Position]"
- Follow the Rule of Transcendence: Expand the token to fit the archetype, 
  not vice versa
- Describe what IS, not what will be
- End with capacity: "This is visible now. It is adjustable." 
  (or "usable" for balanced states)

LANGUAGE RULES:
- Never use: "will cause", "means that", "will lead to"
- Use: "is expressing as", "is structured by", "is currently shaped through"
- The user's predictive framing is diagnostic — it shows where attention 
  is magnetized, not where the future is fixed
`;
```

### Response Format

```javascript
const DTP_RESPONSE_FORMAT = `
Return your response as JSON:

{
  "tokens": ["Fear", "Job", "Bakery", "Partner", "Me"],
  "readings": [
    {
      "token": "Fear",
      "card": "The Tower",
      "position": "Order", 
      "status": "Too Much",
      "threeLine": "Fear is expressing as The Tower in Order — Too Much",
      "interpretation": {
        "shallow": "Your fear is destabilizing your sense of authority.",
        "wade": "Your fear is currently destabilizing how you hold authority and structure. This isn't weakness — it's the architecture showing you where the pressure is concentrated. This is visible now. It is adjustable.",
        "swim": null,
        "deep": null
      }
    },
    // ... more readings
  ],
  "synthesis": "One-paragraph overview connecting the tokens"
}
`;
```

---

## Data Flow

```
User Input: "I want to leave my job to start a bakery but I'm scared"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────┐
│ FRONTEND: Generate up to 5 draws (no dup positions) │
│                                                     │
│ Draw 1: Card 47, Position 4, Status 3               │
│ Draw 2: Card 12, Position 18, Status 1              │
│ Draw 3: Card 3, Position 7, Status 2                │
│ Draw 4: Card 61, Position 11, Status 4              │
│ Draw 5: Card 28, Position 1, Status 1               │
└─────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────┐
│ API CALL: User input + draws array                  │
│                                                     │
│ - Phase 1: AI extracts tokens (finds 3: Job,        │
│            Bakery, Fear)                            │
│ - Phase 2: AI uses draws 1-3, interprets each       │
│ - Draws 4-5: unused, ignored                        │
└─────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────┐
│ RESPONSE: JSON with tokens + readings               │
│                                                     │
│ { tokens: ["Job", "Bakery", "Fear"],                │
│   readings: [3 card interpretations] }              │
└─────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────┐
│ FRONTEND: Render 3 cards (Job, Bakery, Fear)        │
│          Each with full output structure + token    │
└─────────────────────────────────────────────────────┘
```

---

## UI Components

### New Components

| Component | Purpose |
|-----------|---------|
| `components/DTPInput.js` | Large text area with "What's active?" prompt |
| `components/TokenConfirmation.js` | Chip display of parsed tokens with confirm/adjust |
| `components/TokenReading.js` | Individual token reading section with depth controls |

### Modified Components

| Component | Changes |
|-----------|---------|
| `app/page.js` | Add DTP mode, handle new flow |
| `lib/prompts.js` | Add DTP_SYSTEM_PROMPT |
| `lib/api.js` | Handle DTP response format |

---

## Systemic Change: Token Context Injection

**This is the key architectural change.**

Every prompt that generates card content needs to accept an optional `token` parameter and weave it throughout:

### Affected Prompts

| Prompt | Change |
|--------|--------|
| Letter | "...regarding [token]" woven in |
| Overview | "...as it relates to [token]" woven in |
| Words to Whys | Token context in teleological framing |
| Rebalancer | Correction path in context of token |
| Growth Opportunity | Growth direction in context of token |
| Reflect thread | User's reflection answered in token context |
| Forge thread | User's declaration answered in token context |
| Expansions (Unpack/Clarify/Example) | Token context maintained |
| Depth changes (Swim/Deep) | Token context maintained |

### Prompt Modification Pattern

```javascript
// In lib/prompts.js or lib/promptBuilder.js

function buildCardPrompt({ card, position, status, token = null }) {
  let prompt = `Interpret: ${card} in ${position}, ${status}`;
  
  if (token) {
    prompt += `\n\nCONTEXT: This reading is regarding "${token}".`;
    prompt += `\nWeave this context naturally throughout your interpretation.`;
    prompt += `\nExample: Instead of "There's pressure in how you hold authority"`;
    prompt += `\nSay: "There's pressure in how you hold authority as it relates to ${token}"`;
  }
  
  return prompt;
}
```

### State Management

The `token` must be stored per-card and passed to:
- Initial interpretation call
- All depth expansion calls (Wade → Swim → Deep)
- Reflect/Forge thread calls
- Expansion calls (Unpack/Clarify/Example)

```javascript
// Card state shape
{
  cardIndex: 0,
  card: "The Tower",
  position: "Order",
  status: "Too Much",
  token: "Fear",  // <-- NEW: stored per-card
  // ... rest of card state
}
```

---

DTP becomes a mode alongside existing modes:

```
[Reflect] [Discover] [Forge] [Explore]
                              ^^^^^^^^
                              DTP Mode
```

**"Explore"** — because the user is exploring what's active, not asking a question or making a declaration.

---

## Constraints

### Token Count: 1-5
- Minimum: 1 token (valid reading)
- Maximum: 5 tokens
- Mirrors the five houses
- Prevents cognitive flooding
- Preserves narrative coherence

### Typed Reduction (Parsing Balance)
When reducing to 5, ensure coverage:
- Don't let 5 emotions crowd out structure
- Don't let 5 nouns crowd out agency
- The AI handles this via prompt instructions

### No Implicit Role Badges
- We do NOT secretly categorize tokens as "Agent/Friction/etc."
- The draw reveals what the token IS
- The user's word is the only label

---

## Language Rules

### Forbidden
- "will cause"
- "means that"
- "will lead to"
- "you should"
- "the outcome"
- "destiny"

### Required
- "is expressing as"
- "is structured by"
- "is currently shaped through"
- "this points to"
- "if you keep moving this way"

### Closing Lines
- Imbalanced: "This is visible now. It is adjustable."
- Balanced: "This is visible now. It is usable."
- Unacknowledged: "This is visible now. It is available."

---

## Testing Checklist

### Input & Parsing
- [ ] Large text area accepts multi-sentence input
- [ ] Tokens extracted correctly (nouns/entities, verbs/dynamics)
- [ ] Connective tissue filtered out
- [ ] Max 5 tokens enforced
- [ ] Response includes which tokens were used

### Drawing
- [ ] Draws are blind to input content
- [ ] Correct number of draws generated (matches token count)
- [ ] Card/Position/Status properly randomized

### Reading Display (Token Context)
- [ ] Each token gets its own section
- [ ] Token name displayed as "REGARDING: [token]"
- [ ] Token context woven into Letter
- [ ] Token context woven into Overview
- [ ] Token context woven into Words to Whys
- [ ] Token context woven into Rebalancer/Growth
- [ ] Token context passed to Reflect threads
- [ ] Token context passed to Forge threads
- [ ] Synthesis connects all tokens
- [ ] Depth controls work per-section
- [ ] Voice/stance settings apply

### Language
- [ ] No prediction language in output
- [ ] Agency-preserving phrasing used
- [ ] Closing lines present and appropriate to status

---

## Success Criteria

- [ ] User can describe any situation in natural language
- [ ] System parses meaningful tokens without forcing templates
- [ ] Each token receives independent reading
- [ ] Readings describe NOW, not future
- [ ] User feels heard (their words are the labels)
- [ ] Single API call handles everything
- [ ] Existing depth/voice systems work unchanged
- [ ] Token context injected into all prompts (systemic change)

---

## Implementation Order

1. DTPInput component (text area)
2. Random draw generation (up to 5, no duplicate positions)
3. API call with DTP_SYSTEM_PROMPT
4. Response parsing (extract tokens + readings)
5. Render readings with token context
6. Mode selector integration

---

## Open Questions

1. **Synthesis:** Include a closing synthesis paragraph connecting all tokens, or keep them independent?

---

*The user names their reality. The architecture reveals its structure.*
