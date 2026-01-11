# SPEC: Implement Complete Rebalancer System

**Created:** January 11, 2026  
**Priority:** HIGH - Core framework feature  
**Status:** Ready for Implementation  
**Canonical Source:** `lib/CANONICAL_78_CORRECTIONS.md`

---

## Overview

The `corrections.js` file needs to be updated to provide rebalancer targets for ALL 78 signatures in ALL 4 stance states. Currently it returns `null` for:
1. Balanced states (status === 1) — needs growth partners
2. Some Unacknowledged states where reduction pair is undefined

**The Rule:** Every signature in every state points somewhere. If there's no external partner, it points to itself.

---

## The Complete Logic

### For Imbalanced States (Already Implemented)
- **Too Much (status 2) → Diagonal partner**
- **Too Little (status 3) → Vertical partner**  
- **Unacknowledged (status 4) → Reduction partner OR self**

### For Balanced State (NEW - Must Implement)
Balance is a launchpad, not a destination. When balanced:
- **12 Off-Diagonal Archetypes → Transpose Partner** (lateral growth)
- **4 Diagonal Archetypes → Polarity Anchor** (vertical growth)
- **6 Gestalt/Portal Archetypes → Self** (completion points)

### Self-Reference Rule
When no external partner exists, the signature points to itself:
- Gestalt archetypes (0, 1, 19, 20) → self in all states where no pair exists
- Portal archetypes (10, 21) → self in all states
- Their Bounds (Aces and 10s) → self when no external target

---

## Implementation Requirements

### 1. Add GROWTH_PAIRS Lookup Table

```javascript
// GROWTH_PAIRS (Balanced state - growth opportunity)
// Transpose pairs for off-diagonal, Polarity pairs for diagonal
// null means self-reference (Gestalt/Portal archetypes)
export const GROWTH_PAIRS = {
  0: null,   // Potential → self (Gestalt)
  1: null,   // Will → self (Gestalt)
  2: 4,      // Wisdom → Order (Transpose)
  3: 12,     // Nurturing → Sacrifice (Transpose)
  4: 2,      // Order → Wisdom (Transpose)
  5: 14,     // Culture → Balance (Transpose)
  6: 15,     // Compassion → Abstraction (Polarity)
  7: 18,     // Drive → Imagination (Transpose)
  8: 17,     // Fortitude → Inspiration (Polarity)
  9: 16,     // Discipline → Breakthrough (Transpose)
  10: null,  // Source → self (Portal)
  11: 13,    // Equity → Change (Transpose)
  12: 3,     // Sacrifice → Nurturing (Transpose)
  13: 11,    // Change → Equity (Transpose)
  14: 5,     // Balance → Culture (Transpose)
  15: 6,     // Abstraction → Compassion (Polarity)
  16: 9,     // Breakthrough → Discipline (Transpose)
  17: 8,     // Inspiration → Fortitude (Polarity)
  18: 7,     // Imagination → Drive (Transpose)
  19: null,  // Actualization → self (Gestalt)
  20: null,  // Awareness → self (Gestalt)
  21: null   // Creation → self (Portal)
};
```

### 2. Update getArchetypeCorrection Function

Current code returns `null` for balanced. Update to return growth target:

```javascript
export function getArchetypeCorrection(transientPosition, status) {
  if (status === 1) {
    // Balanced → Growth partner (or self if null)
    const growthTarget = GROWTH_PAIRS[transientPosition];
    if (growthTarget === null) {
      // Self-reference for Gestalt/Portal archetypes
      return { type: "growth", target: transientPosition, isSelf: true };
    }
    return { type: "growth", target: growthTarget, isSelf: false };
  }

  if (status === 2) {
    // Too Much → Diagonal partner
    const target = DIAGONAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "diagonal", target } : null;
  }

  if (status === 3) {
    // Too Little → Vertical partner
    const target = VERTICAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "vertical", target } : null;
  }

  if (status === 4) {
    // Unacknowledged → Reduction pair (or self if null)
    const target = REDUCTION_PAIRS[transientPosition];
    if (target === null) {
      // Self-reference for archetypes without reduction pairs
      return { type: "reduction", target: transientPosition, isSelf: true };
    }
    return { type: "reduction", target } ;
  }

  return null;
}
```

### 3. Update REDUCTION_PAIRS for Self-Reference

Change `null` values to explicit self-references in the lookup:

```javascript
// Current - returns null for these:
0: null,  // Potential - no reduction
1: null,  // Will - no reduction
10: null, // Source - no reduction
19: null, // Actualization - no reduction
20: null, // Awareness - no reduction
21: null  // Creation - no reduction

// The function handles null by returning self-reference
// So the lookup stays the same, but the function interprets null as "self"
```

### 4. Update getBoundCorrection Function

Add growth partner logic for Bounds. When balanced:
1. Get the Bound's associated Archetype
2. Get that Archetype's growth partner
3. Flip polarity (Inner↔Outer)
4. Return the corresponding Bound from the target Archetype

For Aces and 10s (Gestalt Bounds) → return self

### 5. Update getAgentCorrection Function

Same logic as Bounds:
1. Get the Agent's associated Archetype
2. Get that Archetype's growth partner
3. Flip polarity (Inner↔Outer)
4. Return the corresponding Agent from the target Archetype

For Agents without matching target → return self

### 6. Update getCorrectionText Function

Add handling for growth type:

```javascript
if (correctionType === null && correction.type === 'growth') {
  correctionType = 'GROWTH';
}

// For self-references:
if (correction.isSelf) {
  return `${trans.name} (self - completion point)`;
}
```

---

## Polarity Reference (For Bounds/Agents)

When flipping polarity for Bounds:
- **Inner:** Numbers 1-5 (Ace, 2, 3, 4, 5)
- **Outer:** Numbers 6-10 (6, 7, 8, 9, 10)

When flipping polarity for Agents:
- **Inner:** Page, Knight
- **Outer:** Queen, King

---

## Testing Checklist

After implementation, verify these cases:

### Archetypes
- [ ] Balanced Wisdom (2) → Order (4)
- [ ] Balanced Compassion (6) → Abstraction (15) — Polarity pair
- [ ] Balanced Potential (0) → Potential (0) — Self
- [ ] Balanced Source (10) → Source (10) — Self
- [ ] Unacknowledged Potential (0) → Potential (0) — Self

### Bounds
- [ ] Balanced 3 of Wands → 9 of Swords (Order→Wisdom, flip Inner→Outer)
- [ ] Balanced 4 of Cups → 8 of Swords (Compassion→Abstraction, flip Inner→Outer)
- [ ] Balanced Ace of Wands → Ace of Wands — Self (Gestalt)
- [ ] Balanced 10 of Cups → 10 of Cups — Self (Gestalt)

### Agents
- [ ] Balanced Knight of Wands → Queen of Swords (Order→Wisdom, flip Inner→Outer)
- [ ] Balanced Queen of Cups → Knight of Swords (Compassion→Abstraction, flip Outer→Inner)
- [ ] Balanced Page of Wands → King of Pentacles (Inspiration→Fortitude, flip Inner→Outer)

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/corrections.js` | Add GROWTH_PAIRS, update all correction functions to handle balanced state and self-references |

---

## Success Criteria

- [ ] Every signature in every state returns a valid correction target
- [ ] No `null` returns from correction functions
- [ ] Self-references clearly marked with `isSelf: true`
- [ ] Growth partners correctly implement Transpose/Polarity logic
- [ ] Bounds and Agents correctly flip polarity when targeting growth partners

---

## Canonical Reference

All values must match `lib/CANONICAL_78_CORRECTIONS.md` — that document is the authoritative source. The tables in PART III (Archetypes), PART V (Bounds), and PART VI (Agents) show the complete mapping for all 78 signatures across all 4 states.

---

*The structure is the authority. Every signature points somewhere.*
