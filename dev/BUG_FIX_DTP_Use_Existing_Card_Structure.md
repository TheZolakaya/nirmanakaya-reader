# BUG FIX: DTP Output Must Use Existing Card Structure

**Created:** January 12, 2026
**Priority:** CRITICAL
**Status:** Implementation Deviation from Spec

---

## The Problem

DTP (Explore mode) was implemented with a **custom simplified output format** instead of reusing the existing card output structure.

### What Was Built (WRONG)

```
┌─────────────────────────────────────────────────────┐
│  REGARDING: DAD                                     │
│  Dad is expressing as Completion in Creation...     │
│                                                     │
│  [Single paragraph interpretation]                  │
│                                                     │
│  This is visible now. It is adjustable.            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SYNTHESIS                                          │
│  [Paragraph connecting all tokens]                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Signatures (5 cards)                               │
│  [Card tiles without depth/sections]                │
└─────────────────────────────────────────────────────┘
```

### What Was Specced (CORRECT)

Each token becomes a **full card** using the existing DepthCard component:

```
┌─────────────────────────────────────────────────────┐
│  REGARDING: DAD                                     │
│  ─────────────────────────────────────────────────  │
│  Completion in Creation — Too Much                  │
│                                                     │
│  LETTER                                             │
│  [Full letter with token context woven in]          │
│  [Shallow] [Wade ●] [Swim] [Deep]                   │
│                                                     │
│  OVERVIEW                                           │
│  [Overview with token context]                      │
│  [Shallow] [Wade ●] [Swim] [Deep]                   │
│                                                     │
│  WORDS TO THE WHYS                                  │
│  [Teleological framing with token context]          │
│  [Shallow] [Wade ●] [Swim] [Deep]                   │
│                                                     │
│  REBALANCER (or GROWTH OPPORTUNITY)                 │
│  [Correction path in context of "Dad"]              │
│  [Shallow] [Wade ●] [Swim] [Deep]                   │
│                                                     │
│  [Reflect] [Forge]                                  │
└─────────────────────────────────────────────────────┘

[Repeat for each token: MOM, CHALLENGING, etc.]
```

---

## Root Cause

The implementation created new rendering logic instead of:
1. Passing tokens to the existing `DepthCard` component
2. Injecting token context into the existing prompt builder
3. Reusing the existing section generation (Letter, Overview, etc.)

---

## The Fix

### 1. Remove Custom DTP Output Components

Delete or bypass whatever custom rendering was created for DTP. The output should use the same components as Reflect/Discover/Forge modes.

### 2. Pass Token to Existing Card State

Each card in the reading needs a `token` field:

```javascript
{
  cardIndex: 0,
  card: "Completion",
  position: "Creation",
  status: "Too Much",
  token: "Dad",  // <-- This is the only new field
  // ... rest of existing card state
}
```

### 3. Inject Token into Prompt Builder

Modify the prompt builder to accept and use the token:

```javascript
function buildCardPrompt({ card, position, status, token = null, section }) {
  let prompt = EXISTING_PROMPT_FOR_SECTION[section];
  
  if (token) {
    prompt += `\n\nCONTEXT: This reading is regarding "${token}".`;
    prompt += `\nWeave this context naturally throughout. Reference "${token}" where appropriate.`;
  }
  
  return prompt;
}
```

### 4. Display Token Label Above Card

Add a simple label above each DepthCard when token is present:

```jsx
{card.token && (
  <div className="token-label">
    REGARDING: {card.token.toUpperCase()}
  </div>
)}
<DepthCard card={card} ... />
```

### 5. Token Context in All Sections

The token must flow through to:
- Letter generation
- Overview generation
- Words to Whys generation
- Rebalancer/Growth generation
- Reflect thread responses
- Forge thread responses
- Expansion responses (Unpack/Clarify/Example)
- Depth changes (when user clicks Swim/Deep)

---

## What Stays the Same

- All existing DepthCard functionality
- All depth level mechanics (Shallow/Wade/Swim/Deep)
- All section types (Letter, Overview, Words to Whys, etc.)
- All voice/stance configuration
- All Reflect/Forge thread mechanics
- Export functionality

---

## What Changes

| Component | Change |
|-----------|--------|
| Card state | Add `token` field |
| Prompt builder | Accept `token`, inject context |
| DepthCard | Display token label when present |
| API response parsing | Extract token per card |

---

## Testing Checklist

- [ ] DTP reading shows full DepthCard structure per token
- [ ] Each card has Letter section with depth controls
- [ ] Each card has Overview section with depth controls
- [ ] Each card has Words to Whys section with depth controls
- [ ] Each card has Rebalancer OR Growth section with depth controls
- [ ] Token context appears in Letter content
- [ ] Token context appears in Overview content
- [ ] Token context appears in Words to Whys content
- [ ] Token context appears in Rebalancer/Growth content
- [ ] Reflect threads work with token context
- [ ] Forge threads work with token context
- [ ] Depth expansion (Swim/Deep) maintains token context
- [ ] Export includes token labels

---

## Summary

**The principle:** DTP is a different ENTRY POINT, not a different OUTPUT FORMAT.

The only new things are:
1. Text input field (instead of question field)
2. Token parsing (AI extracts tokens)
3. Token label displayed above each card
4. Token context injected into prompts

Everything else reuses the existing system.

---

*Reuse, not rebuild.*
