# SYSTEMIC FIX: Correction Enforcement (Complete)

**Created:** January 11, 2026
**Priority:** CRITICAL - Core reading accuracy
**Status:** Ready for Implementation

---

## The Problem

The AI consistently ignores pre-calculated corrections and invents its own, despite:
1. Correct correction being calculated by the code
2. Correct correction appearing in the rebalancer header
3. Explicit instructions to use the provided correction

**Evidence:**
- Formation (Unacknowledged) → Header says "Command" → AI discusses "Recognition"
- Imagination (Too Much) → Should be Nurturing → AI suggests Reflection

The AI has partial framework knowledge and attempts to calculate corrections itself, getting them wrong.

---

## Root Cause Analysis

1. **The correction name appears only in the header** - The AI generates content without seeing the target name prominently
2. **Prompt instructions are too weak** - "Use the provided correction" is ignored
3. **No validation exists** - Wrong corrections go undetected
4. **Deepening calls don't include correction target** - On-demand depth generation doesn't pass the correction

---

## The Systemic Fix (4 Parts)

### Part 1: Inject Correction Target Into Every Relevant Prompt Section

**Principle:** The correction target name must appear immediately before EVERY section that discusses it.

**Files to modify:**

#### A. `lib/utils.js` - `formatDrawForAI()`

Add after the existing correction line:
```javascript
// Get the correction target name for explicit injection
const correctionTargetName = correction ? getCorrectionTargetName(correction, trans) : null;

// ... later in the template string ...
${correctionText ? `Correction: ${correctionText}. IMPORTANT: Use this exact correction, do not calculate different numbers.
REBALANCER TARGET: ${correctionTargetName}. This is the ONLY card to discuss in rebalancer sections. Do NOT substitute any other card.` : 'No correction needed (Balanced)'}
```

Add the helper function:
```javascript
export function getCorrectionTargetName(correction, trans) {
  if (!correction) return null;
  if (trans.type === "Bound" && correction.targetBound) {
    return correction.targetBound.name;
  }
  if (trans.type === "Agent" && correction.targetAgent) {
    return correction.targetAgent.name;
  }
  if (correction.target !== undefined) {
    return ARCHETYPES[correction.target]?.name || null;
  }
  return null;
}
```

#### B. `app/api/card-depth/route.js` - `buildDeepenMessage()`

Calculate and inject correction target:
```javascript
// At the start of function, calculate correction
let correctionTargetName = null;
if (draw.status !== 1) {
  const correction = getBoundOrArchetypeCorrection(draw);
  correctionTargetName = getCorrectionTargetNameFromDraw(draw, correction);
}

// In the prompt, before REBALANCER marker:
${isImbalanced && correctionTargetName ? `
CRITICAL - REBALANCER TARGET: ${correctionTargetName}
You MUST discuss ${correctionTargetName} and ONLY ${correctionTargetName} in the rebalancer section.
Do NOT mention any other card as the correction.

[CARD:${n}:REBALANCER:${depthMarker}]
(Discuss how ${correctionTargetName} specifically helps rebalance this card)` : ''}
```

#### C. `lib/prompts.js` - `FORMAT_INSTRUCTIONS`

Add prominent warning in REBALANCER section:
```markdown
== REBALANCER SECTIONS (only for imbalanced cards) ==

╔════════════════════════════════════════════════════════════════╗
║  CRITICAL: CORRECTION TARGET IS PRE-CALCULATED                 ║
║                                                                 ║
║  Each card's correction is computed and provided as:           ║
║  "REBALANCER TARGET: [Name]"                                   ║
║                                                                 ║
║  YOU MUST:                                                      ║
║  • Use ONLY the named correction target                        ║
║  • Never substitute a different card                           ║
║  • Never calculate your own correction                         ║
║                                                                 ║
║  The correction logic is:                                       ║
║  • Majors → Majors (diagonal/vertical/reduction tables)        ║
║  • Bounds → Bounds (channel crossing + number mirror)          ║
║  • Agents → Agents (via archetype correction)                  ║
║                                                                 ║
║  If you discuss any card OTHER than the named target,          ║
║  the reading is WRONG.                                         ║
╚════════════════════════════════════════════════════════════════╝
```

### Part 2: Add Correction Lookup Tables to System Prompt

**File:** `lib/prompts.js` - `BASE_SYSTEM`

Add the complete correction reference (abbreviated version for tokens):
```markdown
## CORRECTION QUICK REFERENCE

### Archetype Corrections (Majors)
**Too Much → Diagonal:** 0↔19, 1↔20, 2↔17, 3↔18, 4↔15, 5↔16, 6↔13, 7↔14, 8↔11, 9↔12
**Too Little → Vertical:** 0↔20, 1↔19, 2↔18, 3↔17, 4↔16, 5↔15, 6↔14, 7↔13, 8↔12, 9↔11
**Unacknowledged → Reduction:** 2↔11, 3↔12, 4↔13, 5↔14, 6↔15, 7↔16, 8↔17, 9↔18

### Bound Corrections (Minors)
Channel crosses + number mirrors (11 - N):
**Too Much:** Intent↔Cognition, Resonance↔Structure
**Too Little:** Intent↔Resonance, Cognition↔Structure  
**Unacknowledged:** Intent↔Structure, Cognition↔Resonance

Example: Formation (Structure #3, Unacknowledged)
→ Structure crosses to Intent, 3 mirrors to 8
→ Target: Intent #8 = Command

**NEVER calculate - use the provided REBALANCER TARGET**
```

### Part 3: Server-Side Correction Name in Architecture Section

**File:** `app/api/card-depth/route.js` - `generateArchitectureText()`

Already includes the correction - ensure it's prominent:
```javascript
if (status !== 1) {
  // ... existing correction calculation ...
  lines.push(`**Path back:** → ${targetName} via ${corrType} correction`);
  lines.push(`**REBALANCER TARGET:** ${targetName} — use this name in all rebalancer content`);
}
```

### Part 4: Post-Processing Validation (Future Enhancement)

**New file:** `lib/validation.js`

```javascript
export function validateRebalancerContent(parsedReading, draws) {
  const issues = [];
  
  draws.forEach((draw, i) => {
    if (draw.status === 1) return; // Balanced
    
    const correction = getFullCorrection(draw.transient, draw.status);
    const trans = getComponent(draw.transient);
    const targetName = getCorrectionTargetName(correction, trans);
    
    if (!targetName) return;
    
    const rebalancer = parsedReading.cards[i]?.rebalancer;
    if (rebalancer) {
      const allContent = Object.values(rebalancer).filter(Boolean).join(' ').toLowerCase();
      
      if (!allContent.includes(targetName.toLowerCase())) {
        issues.push({
          card: i + 1,
          expected: targetName,
          severity: 'error',
          message: `Rebalancer should discuss ${targetName} but doesn't mention it`
        });
      }
    }
  });
  
  return issues;
}
```

For now, log warnings. Future: show user alert or trigger regeneration.

---

## Implementation Order

1. **Part 1A:** Update `formatDrawForAI()` with explicit REBALANCER TARGET line
2. **Part 1B:** Update `buildDeepenMessage()` to include correction target
3. **Part 1C:** Add prominent warning box to FORMAT_INSTRUCTIONS
4. **Part 2:** Add correction reference tables to BASE_SYSTEM (optional, may increase tokens)
5. **Part 3:** Enhance generateArchitectureText() output
6. **Part 4:** Add validation (defer to post-fix verification)

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/utils.js` | Add `getCorrectionTargetName()`, update `formatDrawForAI()` |
| `lib/corrections.js` | Export `getCorrectionTargetName()` if needed elsewhere |
| `lib/prompts.js` | Add warning box to FORMAT_INSTRUCTIONS, optionally add reference tables |
| `app/api/card-depth/route.js` | Update `buildDeepenMessage()` and `generateArchitectureText()` |
| `lib/validation.js` | NEW FILE for post-processing validation |

---

## Test Cases

After implementation, verify ALL of these:

### Archetype Tests
| Card | Status | Expected Correction |
|------|--------|---------------------|
| Imagination (18) | Too Much | Nurturing (3) |
| Wisdom (2) | Too Little | Imagination (18) |
| Equity (11) | Unacknowledged | Wisdom (2) |
| Drive (7) | Too Much | Balance (14) |
| Breakthrough (16) | Too Little | Order (4) |

### Bound Tests  
| Card | Status | Expected Correction |
|------|--------|---------------------|
| Formation (Structure 3) | Unacknowledged | Command (Intent 8) |
| Reflection (Cognition 2) | Too Much | Resilience (Intent 9) |
| Celebration (Resonance 3) | Too Little | Command (Intent 8) |
| Command (Intent 8) | Unacknowledged | Formation (Structure 3) |

### Agent Tests
| Card | Status | Expected Correction |
|------|--------|---------------------|
| Steward of Intent (embodies Drive 7) | Too Much | Steward of Cognition (Balance 14) |
| Executor of Cognition (embodies Discipline 9) | Unacknowledged | Initiate of Resonance (Imagination 18) |

---

## Success Criteria

- [ ] Every rebalancer section mentions the correct target by name
- [ ] No readings show wrong correction targets
- [ ] Deepening calls maintain correct correction target
- [ ] Architecture section shows correct path back
- [ ] Validation catches any deviations (when implemented)

---

## Reference Documents

- `lib/BOUND_CORRECTIONS_LOOKUP.md` - Complete Bound correction table
- `lib/corrections.js` - Archetype correction tables (DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS)
- `Canonical_40_Bounds_Reference.md` - Authoritative Bound definitions

---

*The structure is the authority. The correction tables are canonical. The AI is provisional.*
