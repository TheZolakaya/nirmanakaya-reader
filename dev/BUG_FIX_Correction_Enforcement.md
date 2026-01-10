# BUG FIX: Correction Enforcement

**Created:** January 10, 2026
**Priority:** HIGH - Affects reading accuracy
**Status:** Ready for Implementation

---

## The Bug

The AI is ignoring pre-calculated corrections and inventing its own. 

**Example observed:**
- Card: Imagination (Archetype 18) 
- Status: Too Much
- Correct correction: **Nurturing (Archetype 3)** via DIAGONAL duality
- AI returned: **Reflection (2 of Swords/Cognition)** - a Minor, which is structurally wrong

**Why this matters:**
- Majors correct to Majors (diagonal/vertical/reduction pairs are all Archetype→Archetype)
- Minors correct to Minors (within the Bound system)
- Agents correct to Agents (through their associated Archetype)
- Mixing these violates the architecture

---

## Root Cause

The correction IS being calculated correctly in `lib/corrections.js` and passed to the AI in the user message via `formatDrawForAI()`. However:

1. The correction instruction appears mid-prompt and gets lost
2. The AI has enough framework knowledge to attempt its own calculation
3. The AI's calculation is WRONG (doesn't follow the actual correction tables)
4. The REBALANCER sections don't explicitly name the correction target

---

## The Fix (Three Parts)

### Part 1: Explicit Correction in REBALANCER Markers

**Current behavior:** REBALANCER sections are generic - AI must remember the correction from earlier in the prompt.

**New behavior:** Include the correction target name in the REBALANCER context.

**File:** `lib/utils.js` - `formatDrawForAI()` function

Add to the draw formatting a clear REBALANCER instruction:

```javascript
// After the existing correction line, add:
const rebalancerInstruction = correction && correctionText 
  ? `REBALANCER TARGET: ${getCorrectionTargetName(correction, trans)}. When writing [CARD:N:REBALANCER:*] sections, you MUST discuss this specific signature and no other.`
  : '';
```

Create helper function:
```javascript
function getCorrectionTargetName(correction, trans) {
  if (trans.type === "Bound" && correction.targetBound) {
    return correction.targetBound.name;
  }
  if (trans.type === "Agent" && correction.targetAgent) {
    return correction.targetAgent.name;
  }
  if (correction.target !== undefined) {
    const targetArchetype = ARCHETYPES[correction.target];
    return targetArchetype ? targetArchetype.name : null;
  }
  return null;
}
```

### Part 2: Strengthen Prompt Instructions

**File:** `lib/prompts.js` - `FORMAT_INSTRUCTIONS`

In the REBALANCER section instructions, add explicit enforcement:

```markdown
== REBALANCER SECTIONS (only for imbalanced cards) ==

**CRITICAL: USE ONLY THE PROVIDED CORRECTION**
The correction for each card is PRE-CALCULATED and provided in the draw data.
- DO NOT calculate your own correction
- DO NOT substitute a different card
- The correction provided is the ONLY valid rebalancing signature
- Majors correct to Majors, Minors to Minors, Agents to Agents

Look for "REBALANCER TARGET: [Name]" in the draw data. That name is the ONLY signature you discuss in REBALANCER sections.

[CARD:N:REBALANCER:SURFACE]
1-2 sentences. Plain language.
Name what [THE PROVIDED CORRECTION TARGET] offers - use its exact name.
```

### Part 3: Post-Processing Validation (Backlog)

**File:** `lib/utils.js` or new `lib/validation.js`

Add validation in `parseReadingResponse()` to check if REBALANCER sections mention the correct target:

```javascript
function validateRebalancerContent(parsedReading, draws) {
  const warnings = [];
  
  draws.forEach((draw, i) => {
    if (draw.status === 1) return; // Balanced, no rebalancer
    
    const correction = getFullCorrection(draw.transient, draw.status);
    const targetName = getCorrectionTargetName(correction, getComponent(draw.transient));
    
    if (!targetName) return;
    
    const rebalancerContent = parsedReading.cards[i]?.rebalancer;
    if (rebalancerContent) {
      // Check all depth levels
      const allContent = [
        rebalancerContent.surface,
        rebalancerContent.wade,
        rebalancerContent.swim,
        rebalancerContent.deep
      ].filter(Boolean).join(' ');
      
      if (!allContent.toLowerCase().includes(targetName.toLowerCase())) {
        warnings.push({
          card: i + 1,
          expected: targetName,
          issue: 'Rebalancer section may not mention correct correction target'
        });
      }
    }
  });
  
  return warnings;
}
```

For now, just log warnings. Future: could trigger re-generation or show user warning.

---

## Implementation Order

1. **Part 1 (Do First):** Add explicit REBALANCER TARGET to draw formatting
2. **Part 2 (Do Second):** Strengthen REBALANCER instructions in FORMAT_INSTRUCTIONS
3. **Part 3 (Backlog):** Add validation - defer until we see if Parts 1+2 solve it

---

## Files to Modify

| File | Change |
|------|--------|
| `lib/utils.js` | Add `getCorrectionTargetName()`, update `formatDrawForAI()` |
| `lib/prompts.js` | Update REBALANCER section in FORMAT_INSTRUCTIONS |
| `lib/validation.js` | NEW FILE (Part 3 only) - validation utilities |

---

## Testing

After implementation, test with these cases:

1. **Major Too Much:** Imagination (18) → should correct to Nurturing (3)
2. **Major Too Little:** Wisdom (2) → should correct to Imagination (18)  
3. **Major Unacknowledged:** Compassion (6) → should correct to Abstraction (15)
4. **Minor Too Much:** Any Bound → should correct to another Bound (via channel crossing + number mirror)
5. **Agent Too Much:** Any Agent → should correct to another Agent (via archetype diagonal)

Verify REBALANCER sections mention the CORRECT target by name.

---

## Success Criteria

- [ ] REBALANCER sections always name the correct correction target
- [ ] Majors never suggest Minor corrections
- [ ] Minors never suggest Major corrections
- [ ] AI stops inventing its own correction logic

---

## Related Backlog Items

After this fix, consider:

1. **FR: Correction validation UI** - Show user when AI may have deviated
2. **FR: Regenerate button for sections** - Let user regenerate specific section if wrong
3. **Enhancement: Correction lookup in glossary** - Explain WHY this is the correction

---

*The structure is the authority. The correction tables are canonical. The AI is provisional.*
