# BUG FIX SPEC: Critical/High Bugs from FR7/FR11 Implementation

**Created:** January 11, 2026
**Priority:** CRITICAL/HIGH
**Status:** Ready for Implementation

---

## Overview

Five bugs from the Growth Opportunity (FR7) and Shallow Depth (FR11) implementation need fixing.

| Bug | Issue | Priority |
|-----|-------|----------|
| **B6/B9** | Growth partner shows self instead of actual target | ⭐ CRITICAL |
| **B8** | Gestalt growth says "rest" instead of "recurse" | ⭐ HIGH |
| **B7** | Export missing Growth Opportunity sections | ⭐ HIGH |
| **B5** | Letter/Overview missing Shallow depth option | ⭐ HIGH |

---

## B6/B9: Growth Partner Calculation Broken for Bounds

### The Problem

Balanced Bounds are showing growth opportunity pointing to **themselves** instead of the **correct growth partner**.

**Example observed:**
- Balanced Reverie (4 of Cups) → shows "Reverie" 
- Should show → **Immersion (8 of Swords)**

### The Correct Logic

For Bounds, growth partner calculation requires:
1. Get the Bound's associated Archetype
2. Get that Archetype's growth partner (Transpose or Polarity)
3. **Flip polarity** (Inner↔Outer)
4. Return the corresponding Bound from the target Archetype

**Worked example for 4 of Cups (Reverie):**
1. Associated Archetype: Compassion (6)
2. Compassion is diagonal → Polarity partner: Abstraction (15)
3. 4 of Cups is Inner (number 4) → flip to Outer
4. Abstraction's Outer bound: **8 of Swords (Immersion)**

### Polarity Reference

**Inner:** Numbers 1, 2, 3, 4, 5 (and Ace)
**Outer:** Numbers 6, 7, 8, 9, 10

### Canonical Reference

All correct values are in `lib/CANONICAL_78_CORRECTIONS.md`:
- Part V: BOUND (MINOR) COMPLETE REFERENCE
- The "Balanced → (Growth)" column has every answer

**Sample from canonical doc:**

| Bound | Balanced → (Growth) |
|-------|---------------------|
| 4 of Cups | 8 of Swords |
| 4 of Wands | 7 of Cups |
| 3 of Wands | 8 of Swords |
| 2 of Wands | 6 of Pentacles |

### Files to Fix

`lib/corrections.js` — the `getBoundCorrection()` function needs to handle `status === 1` (balanced) and implement the polarity flip logic correctly.

### The Fix Pattern

```javascript
export function getBoundCorrection(bound, status) {
  if (status === 1) {
    // BALANCED → Growth partner with polarity flip
    const archetype = bound.archetype;
    const growthArchetype = GROWTH_PAIRS[archetype];
    
    if (growthArchetype === null) {
      // Gestalt/Portal - self reference
      return { type: "growth", targetId: bound.id, isSelf: true };
    }
    
    // Flip polarity: Inner (1-5) ↔ Outer (6-10)
    const isInner = bound.number <= 5;
    const targetPolarity = isInner ? 'outer' : 'inner';
    
    // Find the Bound in growthArchetype with flipped polarity
    const targetBound = Object.entries(BOUNDS).find(([id, b]) => 
      b.archetype === growthArchetype && 
      (targetPolarity === 'inner' ? b.number <= 5 : b.number > 5)
    );
    
    // ... return growth target
  }
  // ... existing imbalanced logic
}
```

---

## B8: Gestalt Growth Says "Rest" Instead of "Recurse"

### The Problem

Balanced Gestalt archetypes (0, 1, 19, 20) and Portals (10, 21) return self-reference for growth. The prompt is telling users to "rest here" — **this is wrong**.

**Current output:**
> "Rest here for a moment. You've already done the hardest part... this is the completion point"

**Should say:**
> "Continue investing in this energy. The loop IS the growth. Go deeper here — more of this."

### The Correct Philosophy

Gestalt signatures don't rest. They **recurse**. They **intensify**. 

When Will points to Will in balanced state, it doesn't mean "stop" — it means "this is what wants more of your attention."

### Files to Fix

The prompt language in `lib/prompts.js` or wherever growth opportunity instructions are defined.

### The Fix

Update growth opportunity prompt for self-referential cases:

```
WRONG: "Rest here. You've arrived. This is the destination. Completion point."

RIGHT: "Balanced [Will] grows by investing further in [Will]. 
The architecture isn't pointing you elsewhere — it's saying go deeper here. 
More of this. The loop is the path. Keep leaning in."
```

**Key phrases to ADD:**
- "Continue investing"
- "Keep leaning in"  
- "The loop IS the growth"
- "Go deeper here"
- "More of this"

**Key phrases to REMOVE:**
- "Rest here"
- "Completion point"
- "You've arrived"
- "Stop looking outward"

---

## B7: Export Missing Growth Opportunity Sections

### The Problem

HTML export is missing Growth Opportunity sections that appear in the live reading.

**Evidence:** Same reading — live shows Growth sections for balanced cards, export HTML has neither.

### Files to Fix

Export logic — likely in a utility function or component that generates HTML.

### The Fix

Add Growth Opportunity section to export, styled similarly to Rebalancer but with distinct color (green/teal for growth vs orange for rebalancer).

Should mirror whatever is displayed in the live reading for balanced cards.

---

## B5: Letter and Overview Missing Shallow Depth Option

### The Problem

Letter and Overview sections do not have Shallow depth buttons. FR11 spec requires Shallow as the default view for ALL sections.

### Expected Behavior

All sections should have: **Shallow** → Wade → Swim → Deep

- **Shallow** = 1-2 sentence summary (the headline) — DEFAULT VIEW
- **Wade** = Entry-level interpretation  
- **Swim** = Psychological/practical expansion
- **Deep** = Full transmission

### Files to Fix

`components/DepthCard.js` or section-specific components for Letter and Overview.

### The Fix

Add Shallow to the depth button array for Letter and Overview sections, matching how other sections (Reading, Words to Whys, Rebalancer) handle depth.

---

## Testing Checklist

### B6/B9: Growth Partner Calculation
- [ ] Balanced 4 of Cups → 8 of Swords (not self)
- [ ] Balanced 3 of Wands → 8 of Swords (not self)
- [ ] Balanced 2 of Wands → 6 of Pentacles (not self)
- [ ] Verify against canonical doc for 5+ random Bounds

### B8: Gestalt Growth Language
- [ ] Balanced Will shows "continue investing" not "rest"
- [ ] Balanced Potential shows "recurse" not "completion"
- [ ] No instances of "rest here" or "completion point" for Gestalt

### B7: Export
- [ ] Export includes Growth Opportunity for balanced cards
- [ ] Growth section has distinct styling in export

### B5: Shallow Depth
- [ ] Letter section has Shallow button
- [ ] Overview section has Shallow button
- [ ] Shallow is selected by default

---

## Success Criteria

- [ ] Balanced Bounds point to correct growth partners (not self)
- [ ] Gestalt/Portal growth says "recurse" not "rest"
- [ ] Export includes all Growth Opportunity content
- [ ] All sections have Shallow depth option

---

*The structure is the authority.*
