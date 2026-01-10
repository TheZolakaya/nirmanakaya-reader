# BUG FIX: Rebalancer Depth Generation Issues

**Created:** January 10, 2026
**Priority:** HIGH - Affects reading depth quality
**Status:** Ready for Implementation

---

## Issues Identified

### Issue 1: Rebalancer DEEP Content Too Short

**Observed:** When clicking "Deep" on a rebalancer section, only 2 sentences returned instead of full transmission.

**Root Cause:** In `app/api/card-depth/route.js`, the `buildDeepenMessage()` function:
1. `maxTokens` is set to only 1500 for deepening (line ~50)
2. The DEEP instructions say "Full transmission with no limits" but don't emphasize length expectations for REBALANCER specifically
3. No minimum length guidance for rebalancer DEEP sections

### Issue 2: Correction Target Not Explicitly Named in Deepening Prompts

**Observed:** When generating SWIM/DEEP for rebalancer, the correction target name is not passed to the AI.

**Root Cause:** In `buildDeepenMessage()`:
- The draw object is available but the correction target is not calculated or passed
- AI must rely on context from previousContent which may not include the target name
- Related to the earlier bug (AI calculating its own corrections)

### Issue 3: Rebalancer WADE Truncated in Export

**Observed:** In HTML export, rebalancer content cuts off mid-sentence:
> "...as a permission you"

**Root Cause:** This is likely a separate export/parsing issue OR the original generation was truncated. Need to verify if this is:
- A generation issue (API response truncated)
- A parsing issue (extractSection regex not capturing full content)
- An export issue (HTML generation truncating)

---

## The Fix

### Part 1: Increase Token Budget for Deepening

**File:** `app/api/card-depth/route.js`

Change line ~50:
```javascript
// OLD
const maxTokens = isDeepening ? 1500 : 3500;

// NEW - DEEP needs more room than SWIM
const maxTokens = isDeepening 
  ? (depth === 'deep' ? 3000 : 2000)  // DEEP gets 3000, SWIM gets 2000
  : 3500;  // Baseline (WADE) stays at 3500
```

### Part 2: Add Correction Target to Deepening Prompts

**File:** `app/api/card-depth/route.js`

In `buildDeepenMessage()`, calculate and include the correction target:

```javascript
function buildDeepenMessage(n, draw, question, spreadType, letterContent, targetDepth, previousContent) {
  // ... existing code ...
  
  // Calculate correction target for imbalanced cards
  let correctionTarget = null;
  let correctionType = null;
  if (draw.status !== 1 && draw.transient < 22) {
    // Archetype correction
    if (draw.status === 2) {
      correctionTarget = ARCHETYPES[DIAGONAL_PAIRS[draw.transient]]?.name;
      correctionType = 'DIAGONAL';
    } else if (draw.status === 3) {
      correctionTarget = ARCHETYPES[VERTICAL_PAIRS[draw.transient]]?.name;
      correctionType = 'VERTICAL';
    } else if (draw.status === 4) {
      const reductionId = REDUCTION_PAIRS[draw.transient];
      correctionTarget = reductionId !== null ? ARCHETYPES[reductionId]?.name : null;
      correctionType = 'REDUCTION';
    }
  }
  // TODO: Add Bound and Agent correction lookups if needed
  
  // ... in the return string, add before the REBALANCER marker ...
  ${isImbalanced ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} correction. You MUST discuss ${correctionTarget} specifically.` : ''}

[CARD:${n}:REBALANCER:${depthMarker}]
(Deepen the correction through ${correctionTarget || 'the correction target'} - new practical dimensions. For DEEP: Full transmission, no sentence limits. Explore philosophy, psychology, practical application. At least 3-4 paragraphs.)` : ''}
```

### Part 3: Strengthen DEEP Instructions for Rebalancer

**File:** `app/api/card-depth/route.js`

Update `depthInstructions` in `buildDeepenMessage()`:

```javascript
const depthInstructions = targetDepth === 'deep'
  ? `DEEP depth: Full transmission with NO limits. 
     - Main reading: 4-6 paragraphs exploring philosophy, psychology, practical implications
     - Why section: 3-4 paragraphs on deeper teleological meaning
     - Rebalancer (if imbalanced): 3-4 paragraphs on HOW the correction works, WHY it helps, practical ways to apply it
     
     DEEP is the fullest expression. If a section feels short, you haven't gone deep enough. Add examples, nuances, emotional resonance.`
  : `SWIM depth: One rich paragraph per section. Add psychological depth, practical implications, and emotional resonance that WADE introduced but didn't fully develop.`;
```

### Part 4: Fix Potential Parsing/Truncation Issue

**File:** `app/api/card-depth/route.js`

Check the `extractSection` regex in both parse functions. The current regex:
```javascript
const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[CARD:\\d+:|\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
```

This uses a non-greedy match (`*?`) which should be fine, but let's ensure it's not stopping early. Add logging for debugging:

```javascript
const extractSection = (marker) => {
  const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[CARD:\\d+:|\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
  const match = text.match(regex);
  if (!match) {
    console.log(`[card-depth] No match for marker: ${marker}`);
    return '';
  }
  let content = match[1].trim();
  // ... rest of cleaning ...
  console.log(`[card-depth] Extracted ${marker}: ${content.length} chars`);
  return content.trim();
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `app/api/card-depth/route.js` | Increase maxTokens for DEEP, add correction target to deepening prompts, strengthen DEEP instructions |

---

## Testing

After implementation, test these scenarios:

1. **Single imbalanced card → Click DEEP on Rebalancer**
   - Should return 3-4 paragraphs minimum
   - Should explicitly mention the correction target by name
   - Should not truncate mid-sentence

2. **Verify correction target consistency**
   - Unacknowledged Equity (11) → should mention Wisdom
   - Too Much Imagination (18) → should mention Nurturing
   - Too Little Will (1) → should mention Actualization

3. **Check token usage**
   - DEEP calls should use ~2000-2500 tokens output (not hitting limit)
   - If hitting 3000 limit, content may still be truncated

---

## Success Criteria

- [ ] Rebalancer DEEP returns at least 3-4 substantial paragraphs
- [ ] Correction target name appears explicitly in rebalancer content
- [ ] No truncation mid-sentence
- [ ] DEEP feels meaningfully deeper than SWIM

---

## Related Issues

- This connects to BUG_FIX_Correction_Enforcement.md (correction target naming)
- Both fixes ensure the AI knows and uses the correct correction target

---

*The depth should match the name. DEEP means DEEP.*
