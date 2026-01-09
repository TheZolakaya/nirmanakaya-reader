# Nirmanakaya Terminology Update — Claude Code Handoff

**Date:** January 8, 2026  
**Priority:** HIGH — Production data accuracy  
**Scope:** Update `lib/archetypes.js` and `nirmanakaya_glossary.json` to match canonical definitions

---

## OVERVIEW

The codebase has terminology drift from the canonical Nirmanakaya architecture. This document provides the exact corrections needed.

**Key Problems:**
1. Some Bound names are wrong (old names that were replaced)
2. Many Bound descriptions use traditional tarot meanings instead of derived Nirmanakaya meanings
3. Several Archetype associations are incorrect
4. Glossary JSON has mismatches

**What NOT to change:**
- The `traditional` field in each entry — KEEP THIS (it powers the UI toggle)
- The structure of the data objects
- The correction logic in `lib/corrections.js`

---

## FILE 1: `lib/archetypes.js`

### ARCHETYPES (0-21) — Minor Updates

The Archetype names and houses are correct. Only update these **descriptions** to be more canonical:

```javascript
// No changes needed to Archetype names — they are correct
// Descriptions are acceptable as-is
```

### BOUNDS (22-61) — CRITICAL UPDATES

**FULL REPLACEMENT TABLE — Use these exact values:**

```javascript
export const BOUNDS = {
  // === INTENT CHANNEL (Wands) ===
  22: { 
    name: "Activation", 
    traditional: "Ace of Wands", 
    channel: "Intent", 
    number: 1, 
    archetype: 0,  // CHANGED: was 19, should be Potential (0)
    description: "Beginning of pure potential through Intent. The spark before direction." 
  },
  23: { 
    name: "Orientation", 
    traditional: "2 of Wands", 
    channel: "Intent", 
    number: 2, 
    archetype: 17,  // CHANGED: was 18, should be Inspiration (17)
    description: "Decisive direction through aspiration. Choosing which star to steer by." 
  },
  24: { 
    name: "Assertion", 
    traditional: "3 of Wands", 
    channel: "Intent", 
    number: 3, 
    archetype: 4,  // Correct: Order (4)
    description: "Primal claim of structure through Intent. Expansive declaration outward." 
  },
  25: { 
    name: "Alignment", 
    traditional: "4 of Wands", 
    channel: "Intent", 
    number: 4, 
    archetype: 7,  // Correct: Drive (7)
    description: "Peaceful momentum, stable drive. Intent finding its natural rhythm." 
  },
  26: { 
    name: "Dedication", 
    traditional: "5 of Wands", 
    channel: "Intent", 
    number: 5, 
    archetype: 12,  // Correct: Sacrifice (12)
    description: "Internal practical release through Intent. Testing commitment through engagement." 
  },
  27: { 
    name: "Recognition", 
    traditional: "6 of Wands", 
    channel: "Intent", 
    number: 6, 
    archetype: 12,  // Correct: Sacrifice (12)
    description: "External acknowledgment of sacrifice. Intent visible and honored." 
  },
  28: { 
    name: "Resolve", 
    traditional: "7 of Wands", 
    channel: "Intent", 
    number: 7, 
    archetype: 7,  // Correct: Drive (7)
    description: "Gathered determination, harvested momentum. Defending chosen direction." 
  },
  29: { 
    name: "Command", 
    traditional: "8 of Wands", 
    channel: "Intent", 
    number: 8, 
    archetype: 4,  // Correct: Order (4)
    description: "Deep authority, threshold structure. Intent moving with unstoppable clarity." 
  },
  30: { 
    name: "Resilience", 
    traditional: "9 of Wands", 
    channel: "Intent", 
    number: 9, 
    archetype: 17,  // CHANGED: was 18, should be Inspiration (17)
    description: "Abundant persistence through aspiration. Strength from continued hoping." 
  },
  31: { 
    name: "Realization", 
    traditional: "10 of Wands", 
    channel: "Intent", 
    number: 10, 
    archetype: 0,  // CHANGED: was 19, should be Potential (0)
    description: "Completion of potential through Intent. Carrying what pure possibility became." 
  },

  // === COGNITION CHANNEL (Swords) ===
  32: { 
    name: "Perception", 
    traditional: "Ace of Swords", 
    channel: "Cognition", 
    number: 1, 
    archetype: 19,  // Correct: Actualization (19)
    description: "Beginning of clear seeing. The first cut of clarity arising." 
  },
  33: { 
    name: "Reflection", 
    traditional: "2 of Swords", 
    channel: "Cognition", 
    number: 2, 
    archetype: 2,  // Correct: Wisdom (2)
    description: "Decisive inner knowing. Mind holding truth before declaring it." 
  },
  34: { 
    name: "Calculation", 
    traditional: "3 of Swords", 
    channel: "Cognition", 
    number: 3, 
    archetype: 15,  // Correct: Abstraction (15)
    description: "Primal analysis, expansive thought. Pattern recognition at work." 
  },
  35: { 
    name: "Repose", 
    traditional: "4 of Swords", 
    channel: "Cognition", 
    number: 4, 
    archetype: 14,  // Correct: Balance (14)
    description: "Peaceful stability through cognition. Mind at rest, calibrating." 
  },
  36: { 
    name: "Discernment", 
    traditional: "5 of Swords", 
    channel: "Cognition", 
    number: 5, 
    archetype: 9,  // Correct: Discipline (9)
    description: "Internal practical cognition. Refining perception through careful distinction." 
  },
  37: { 
    name: "Guidance", 
    traditional: "6 of Swords", 
    channel: "Cognition", 
    number: 6, 
    archetype: 9,  // Correct: Discipline (9)
    description: "External direction through discipline. Mind finding passage, showing the way." 
  },
  38: { 
    name: "Reconciliation", 
    traditional: "7 of Swords", 
    channel: "Cognition", 
    number: 7, 
    archetype: 14,  // Correct: Balance (14)
    description: "Gathering thoughts into alignment. Strategic mental integration." 
  },
  39: { 
    name: "Immersion", 
    traditional: "8 of Swords", 
    channel: "Cognition", 
    number: 8, 
    archetype: 15,  // Correct: Abstraction (15)
    description: "Deep threshold of abstraction. Mind exploring its own depths." 
  },
  40: { 
    name: "Plurality", 
    traditional: "9 of Swords", 
    channel: "Cognition", 
    number: 9, 
    archetype: 2,  // Correct: Wisdom (2)
    description: "Abundant knowing, many truths held. The fullness of perception." 
  },
  41: { 
    name: "Clarity", 
    traditional: "10 of Swords", 
    channel: "Cognition", 
    number: 10, 
    archetype: 19,  // Correct: Actualization (19)
    description: "Completion of cognition. Full seeing, nothing hidden." 
  },

  // === RESONANCE CHANNEL (Cups) ===
  42: { 
    name: "Receptivity", 
    traditional: "Ace of Cups", 
    channel: "Resonance", 
    number: 1, 
    archetype: 20,  // Correct: Awareness (20)
    description: "Beginning of felt awareness. Heart open, ready to receive." 
  },
  43: { 
    name: "Merge", 
    traditional: "2 of Cups", 
    channel: "Resonance", 
    number: 2, 
    archetype: 18,  // CHANGED: was 6, should be Imagination (18)
    description: "Decisive connection through vision. Two becoming one flow." 
  },
  44: { 
    name: "Celebration", 
    traditional: "3 of Cups", 
    channel: "Resonance", 
    number: 3, 
    archetype: 5,  // Correct: Culture (5)
    description: "Primal joy through shared meaning. Community in celebration." 
  },
  45: { 
    name: "Reverie", 
    traditional: "4 of Cups", 
    channel: "Resonance", 
    number: 4, 
    archetype: 6,  // Correct: Compassion (6)
    description: "Peaceful connection, stable feeling. Sitting with what the heart knows." 
  },
  46: { 
    name: "Reckoning", 
    traditional: "5 of Cups", 
    channel: "Resonance", 
    number: 5, 
    archetype: 11,  // Correct: Equity (11)
    description: "Internal accounting of fairness. The private felt-sense of what's owed." 
  },
  47: { 
    name: "Reciprocity", 
    traditional: "6 of Cups", 
    channel: "Resonance", 
    number: 6, 
    archetype: 11,  // Correct: Equity (11)
    description: "External fair exchange. Giving and receiving in balance." 
  },
  48: { 
    name: "Allure", 
    traditional: "7 of Cups", 
    channel: "Resonance", 
    number: 7, 
    archetype: 6,  // Correct: Compassion (6)
    description: "Gathering emotional possibilities. The pull of what might be felt." 
  },
  49: { 
    name: "Passage", 
    traditional: "8 of Cups", 
    channel: "Resonance", 
    number: 8, 
    archetype: 5,  // Correct: Culture (5)
    description: "Deep threshold of shared meaning. Walking toward what connects." 
  },
  50: { 
    name: "Fulfillment", 
    traditional: "9 of Cups", 
    channel: "Resonance", 
    number: 9, 
    archetype: 18,  // CHANGED: was 6, should be Imagination (18)
    description: "Abundant vision realized. Deep satisfaction in what was imagined." 
  },
  51: { 
    name: "Completion", 
    traditional: "10 of Cups", 
    channel: "Resonance", 
    number: 10, 
    archetype: 20,  // Correct: Awareness (20)
    description: "Emotional wholeness achieved. Full awareness of felt connection." 
  },

  // === STRUCTURE CHANNEL (Pentacles) ===
  52: { 
    name: "Initiation", 
    traditional: "Ace of Pentacles", 
    channel: "Structure", 
    number: 1, 
    archetype: 1,  // Correct: Will (1)
    description: "Beginning of directed form. The seed of what will be built." 
  },
  53: { 
    name: "Flow", 
    traditional: "2 of Pentacles", 
    channel: "Structure", 
    number: 2, 
    archetype: 3,  // Correct: Nurturing (3)
    description: "Decisive cultivation through form. Balancing what grows with grace." 
  },
  54: { 
    name: "Formation", 
    traditional: "3 of Pentacles", 
    channel: "Structure", 
    number: 3, 
    archetype: 16,  // Correct: Breakthrough (16)
    description: "Primal structure emerging. Skilled work building something new." 
  },
  55: { 
    name: "Preservation", 
    traditional: "4 of Pentacles", 
    channel: "Structure", 
    number: 4, 
    archetype: 13,  // Correct: Change (13)
    description: "Peaceful stability through form. Holding what transformation produced." 
  },
  56: { 
    name: "Steadfastness", 
    traditional: "5 of Pentacles", 
    channel: "Structure", 
    number: 5, 
    archetype: 8,  // Correct: Fortitude (8)
    description: "Internal practical strength. Persisting through material pressure." 
  },
  57: { 
    name: "Support", 
    traditional: "6 of Pentacles", 
    channel: "Structure", 
    number: 6, 
    archetype: 8,  // Correct: Fortitude (8)
    description: "External strength shared. Resources flowing where needed." 
  },
  58: { 
    name: "Harvest", 
    traditional: "7 of Pentacles", 
    channel: "Structure", 
    number: 7, 
    archetype: 13,  // Correct: Change (13)
    description: "Gathering what transformation grew. Patient waiting rewarded." 
  },
  59: { 
    name: "Commitment", 
    traditional: "8 of Pentacles", 
    channel: "Structure", 
    number: 8, 
    archetype: 16,  // Correct: Breakthrough (16)
    description: "Deep threshold of new structure. Dedicated craft, persistent building." 
  },
  60: { 
    name: "Flourishing", 
    traditional: "9 of Pentacles", 
    channel: "Structure", 
    number: 9, 
    archetype: 3,  // Correct: Nurturing (3)
    description: "Abundant growth achieved. Enjoying what careful tending produced." 
  },
  61: { 
    name: "Achievement", 
    traditional: "10 of Pentacles", 
    channel: "Structure", 
    number: 10, 
    archetype: 1,  // Correct: Will (1)
    description: "Completion of directed form. Legacy established through sustained will." 
  }
};
```

### AGENTS (62-77) — No Changes Needed

The Agent names, roles, and archetype associations are **correct**. Keep as-is.

---

## FILE 2: `nirmanakaya_glossary.json`

Update the Bounds entries in the glossary to match the new descriptions. The glossary uses slugified keys.

**Key entries to update (examples):**

```json
"calculation": {
  "name": "Calculation",
  "traditional": "3 of Swords",
  "type": "bound",
  "channel": "Cognition",
  "number": 3,
  "archetype": "Abstraction",
  "short": "Primal analysis, expansive thought. Pattern recognition at work — seeing how things connect."
},
"discernment": {
  "name": "Discernment",
  "traditional": "5 of Swords",
  "type": "bound",
  "channel": "Cognition",
  "number": 5,
  "archetype": "Discipline",
  "short": "Internal practical cognition. Refining perception through careful distinction."
},
"plurality": {
  "name": "Plurality",
  "traditional": "9 of Swords",
  "type": "bound",
  "channel": "Cognition",
  "number": 9,
  "archetype": "Wisdom",
  "short": "Abundant knowing, many truths held. The fullness of perception."
},
"immersion": {
  "name": "Immersion",
  "traditional": "8 of Swords",
  "type": "bound",
  "channel": "Cognition",
  "number": 8,
  "archetype": "Abstraction",
  "short": "Deep threshold of abstraction. Mind exploring its own depths."
}
```

**Sync all 40 Bound entries** to match the descriptions in the `lib/archetypes.js` BOUNDS object above.

---

## WHAT NOT TO CHANGE

1. **`traditional` field** — Keep all traditional names (e.g., "3 of Swords", "The Fool") — these power the UI toggle
2. **`lib/corrections.js`** — The correction pairs are correct
3. **`lib/constants.js`** — Houses, Channels, Roles are correct
4. **`lib/prompts.js`** — The system prompt is already correct (we updated it previously)
5. **Agent entries** — All 16 Agents are correct

---

## VALIDATION CHECKLIST

After making changes, verify:

- [ ] All 40 Bounds have correct `archetype` values (see table above)
- [ ] All descriptions derive from Associated Archetype, NOT traditional tarot
- [ ] No traditional tarot "heartbreak/sorrow/conflict" language in descriptions
- [ ] `traditional` field preserved on all entries
- [ ] Build succeeds: `npm run build`
- [ ] Traditional names toggle still works in UI
- [ ] Glossary popups show updated descriptions

---

## ARCHETYPE ASSOCIATION REFERENCE

Use this lookup table to verify Associated Archetype is correct:

| Number | Domain | Intent | Cognition | Resonance | Structure |
|--------|--------|--------|-----------|-----------|-----------|
| A/1 | Gestalt | Potential (0) | Actualization (19) | Awareness (20) | Will (1) |
| 2 | Spirit | Inspiration (17) | Wisdom (2) | Imagination (18) | Nurturing (3) |
| 3 | Mind | Order (4) | Abstraction (15) | Culture (5) | Breakthrough (16) |
| 4 | Emotion | Drive (7) | Balance (14) | Compassion (6) | Change (13) |
| 5 | Body | Sacrifice (12) | Discipline (9) | Equity (11) | Fortitude (8) |
| 6 | Body | Sacrifice (12) | Discipline (9) | Equity (11) | Fortitude (8) |
| 7 | Emotion | Drive (7) | Balance (14) | Compassion (6) | Change (13) |
| 8 | Mind | Order (4) | Abstraction (15) | Culture (5) | Breakthrough (16) |
| 9 | Spirit | Inspiration (17) | Wisdom (2) | Imagination (18) | Nurturing (3) |
| 10 | Gestalt | Potential (0) | Actualization (19) | Awareness (20) | Will (1) |

---

## SUMMARY OF CRITICAL FIXES

| ID | Name | Field | Old Value | New Value |
|----|------|-------|-----------|-----------|
| 22 | Activation | archetype | 19 | **0** |
| 23 | Orientation | archetype | 18 | **17** |
| 30 | Resilience | archetype | 18 | **17** |
| 31 | Realization | archetype | 19 | **0** |
| 43 | Merge | archetype | 6 | **18** |
| 50 | Fulfillment | archetype | 6 | **18** |

Plus ALL description updates to remove traditional tarot language.

---

## VERSION

After successful update, increment version in `app/page.js`:
```javascript
export const VERSION = "v0.52.0 alpha • Canonical Terminology Sync";
```

---

*Document prepared by Claude for Claude Code implementation*
*Source authority: Canonical_40_Bounds_Reference.md (December 29, 2025)*
