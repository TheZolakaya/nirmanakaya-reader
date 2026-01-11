# SPEC: FR7 + FR8 + FR11 — Growth Opportunity, Voice Panel, Shallow Depth

**Created:** January 11, 2026
**Priority:** HIGH
**Status:** Ready for Implementation

---

## Overview

Three features in one push:

1. **FR7: Growth Opportunity Section** — Balanced cards show growth partners (like imbalanced cards show rebalancers)
2. **FR8: Move Interpreter Voice** — Hide voice selector inside stance panel
3. **FR11: Shallow Depth Default** — Readings show 1-2 sentence summary first, expand to Wade/Swim/Deep

---

## FR7: Growth Opportunity Section for Balanced Cards

### The Problem

Balanced cards (status === 1) currently show no rebalancer section. But balance is a launchpad, not a destination — balanced signatures have **growth partners** they point toward.

### The Solution

When a card is balanced, display a "Growth Opportunity" section (styled differently from "Rebalancer") that shows the growth partner.

### Backend Requirement

`lib/corrections.js` must be updated first — see `dev/SPEC_Implement_All_Rebalancers.md`

The correction functions need to return growth partners for balanced states instead of `null`.

### Frontend Changes

**File:** `components/DepthCard.js` (or equivalent)

**Logic:**
```javascript
// Current: Only show rebalancer for imbalanced
if (status !== 1 && correction) {
  // show Rebalancer section
}

// New: Show Growth Opportunity for balanced
if (status === 1 && growthTarget) {
  // show Growth Opportunity section
}
```

**Section structure:**
- Header: "Growth Opportunity" (not "Rebalancer")
- Different accent color (suggest green/teal vs orange for rebalancer)
- Same depth levels: Wade → Swim → Deep
- Content focuses on developmental invitation, not correction

### Prompt Changes

Add to system prompt for balanced cards:

```
GROWTH OPPORTUNITY (Balanced cards only):
When status is BALANCED, the signature points to its growth partner — 
not as correction but as developmental invitation. Balance is a launchpad.

Frame growth opportunities as:
- "From here, the architecture invites..."
- "With [signature] in balance, growth moves toward..."
- "The next edge of development is..."

Do NOT frame as:
- Something wrong to fix
- A problem to solve
- An imbalance to correct
```

### Growth Partner Types

Per the canonical document:
- **12 Off-Diagonal Archetypes** → Transpose Partner (lateral growth)
- **4 Diagonal Archetypes** → Polarity Partner (vertical growth)
- **6 Gestalt/Portal Archetypes** → Self (completion points — different messaging)

**For self-referential growth (Gestalt/Portal):**
```
"[Signature] in balance is a completion point. There is no external 
growth target — you ARE the destination. Rest here."
```

---

## FR8: Move Interpreter Voice into Stance Panel

### The Problem

The Interpreter Voice selector (Clear, Kind, Playful, Wise, Oracle) is visible at top level, adding UI clutter.

### The Solution

Move it inside the stance/advanced settings panel, collapsed by default.

### Implementation

**Current location:** Main reading interface (visible)
**Target location:** Inside stance panel, below the Humor/Register/Agency sliders

**UI structure:**
```
[Stance Panel - Collapsed by default]
  ├── Humor slider (Unhinged ↔ Sacred)
  ├── Register slider (Chaos ↔ Oracle)  
  ├── Agency slider (Witness ↔ Creator)
  ├── [divider]
  └── Interpreter Voice: [Clear] [Kind] [Playful] [Wise] [Oracle]
      └── (Same button row, just relocated)
```

**Behavior:**
- Voice buttons work exactly as before
- Just nested inside the panel
- Panel title could become "Voice & Stance" or keep as "Stance"

---

## FR11: Shallow Depth as Default View

### The Problem

Readings currently show Wade-level content by default. For multi-card spreads, this can be overwhelming. Users want to scan before diving deep.

### The Solution

Add "Shallow" as the new default depth — a 1-2 sentence headline summary. Wade/Swim/Deep become expansions from there.

### Depth Progression (New)

| Depth | Content | Default? |
|-------|---------|----------|
| **Shallow** | 1-2 sentence summary (the "headline") | ✅ YES |
| **Wade** | Entry-level interpretation (current baseline) | No |
| **Swim** | Psychological/practical expansion | No |
| **Deep** | Full transmission, no limits | No |

### Implementation Options

**Option A: Generate Shallow from Wade (post-process)**
- Generate Wade as usual
- Extract/summarize first 1-2 sentences for Shallow
- Display Shallow by default, expand to full Wade on click
- Pro: No additional API call
- Con: Shallow might not be as tight as purpose-built

**Option B: Generate Shallow first, Wade expands**
- Initial API call generates Shallow-level content
- Clicking "Wade" triggers deepening call
- Pro: Shallow is purpose-built
- Con: More API calls, slower initial load

**Recommendation:** Option A — derive Shallow from Wade. Keep the current generation but change the **display** default.

### UI Changes

**Depth buttons:** `[Shallow*] [Wade] [Swim] [Deep]`
- Shallow is selected/highlighted by default
- Current "Wade" button behavior becomes "expand from Shallow"

**Content display:**
- Default view shows first 1-2 sentences only
- "Wade" click reveals full Wade content (no new API call)
- "Swim" and "Deep" work as before (API calls for deeper content)

### Prompt Changes (if Option B)

Add SHALLOW depth instructions:

```
SHALLOW depth: The headline. 1-2 sentences maximum.
- Name the core tension or recognition
- No resolution, no advice, no elaboration
- Think: what would make someone want to read more?

Example:
"There's too much structure trying to hold something that needs to flow."
```

### Applies To

Shallow depth should apply to:
- Main card interpretation (Letter section)
- Words to the Whys section
- Rebalancer / Growth Opportunity section

Each section gets its own Shallow → Wade → Swim → Deep progression.

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/corrections.js` | Add GROWTH_PAIRS, return growth targets for balanced (per existing spec) |
| `components/DepthCard.js` | Add Growth Opportunity section for balanced cards |
| `components/StancePanel.js` (or equivalent) | Move voice selector inside panel |
| `components/VoiceSelector.js` (or equivalent) | Relocate component |
| `lib/prompts.js` | Add growth opportunity prompt language |
| `lib/promptBuilder.js` | Handle Shallow depth if Option B |
| UI depth buttons | Add Shallow, make it default |

---

## Testing Checklist

### FR7: Growth Opportunity
- [ ] Balanced Archetype shows Growth Opportunity section
- [ ] Balanced Bound shows Growth Opportunity with polarity flip
- [ ] Balanced Agent shows Growth Opportunity with polarity flip
- [ ] Gestalt/Portal balanced shows "completion point" messaging
- [ ] Growth section has different styling than Rebalancer
- [ ] Depth levels (Wade/Swim/Deep) work on Growth section

### FR8: Voice Panel
- [ ] Voice buttons no longer visible at top level
- [ ] Voice buttons appear inside stance panel
- [ ] Voice selection still works correctly
- [ ] Panel can be collapsed/expanded

### FR11: Shallow Default
- [ ] New readings show Shallow (1-2 sentences) by default
- [ ] Clicking Wade reveals full Wade content
- [ ] Swim/Deep still trigger API calls
- [ ] Works for Letter, Words to Whys, Rebalancer/Growth sections
- [ ] Multi-card spreads are scannable at Shallow level

---

## Success Criteria

- [ ] Balanced cards feel complete, not empty
- [ ] UI is cleaner with voice selector tucked away
- [ ] Readings are scannable before diving deep
- [ ] No regressions in existing functionality

---

*The structure is the authority.*
