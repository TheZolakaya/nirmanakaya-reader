# Nirmanakaya Reader - Backlog

Last updated: 2026-01-10 (v0.55.9)

## Rollback Safety
- **Tag `v0.50.0-stable`** exists for rollback if needed (before progressive depth changes)

---

## BUGS

### B1: AI Ignoring Pre-Calculated Corrections ⭐ CRITICAL
**Status:** Spec ready → `dev/BUG_FIX_Correction_Enforcement_COMPLETE.md`

**Root cause:** AI has partial framework knowledge and attempts to calculate corrections itself, getting them wrong. The correction name only appears in the header, not prominently in the prompt where the AI generates content.

**Evidence:**
- Formation (Unacknowledged) → Header says "Command" → AI discusses "Recognition"
- Imagination (Too Much) → Should be Nurturing → AI suggests Reflection

**Fix (4 parts):**
1. Inject REBALANCER TARGET prominently into formatDrawForAI() and buildDeepenMessage()
2. Add warning box to FORMAT_INSTRUCTIONS
3. Add correction reference tables to BASE_SYSTEM
4. Post-processing validation (future)

**Reference:** `lib/BOUND_CORRECTIONS_LOOKUP.md` contains complete Bound correction table

### B2: Rebalancer DEEP Too Short ⭐ HIGH
**Status:** Merged into B1 - same root cause

**Issues:**
1. Clicking "Deep" on rebalancer returns only 2 sentences instead of full transmission
2. Correction target not passed to deepening prompts
3. maxTokens too low for DEEP (1500 → should be 3000)

**Files:** `app/api/card-depth/route.js`

**Issue:** AI calculates its own corrections instead of using provided ones. Results in wrong correction targets (e.g., Minor correcting a Major).

**Example:** Too Much Imagination (Major 18) → AI suggested Reflection (Minor/Bound) instead of Nurturing (Major 3)

**Fix (3 parts):**
1. Add explicit REBALANCER TARGET to draw formatting in `formatDrawForAI()`
2. Strengthen REBALANCER instructions in FORMAT_INSTRUCTIONS
3. (Backlog) Add post-processing validation

**Files:** `lib/utils.js`, `lib/prompts.js`

---

## FEATURE REQUESTS

- FR1: Section headers (Reading, The Why, etc.) clickable with definition popups
- FR2: Core framework terms in popups (archetype, status) should be clickable with definitions
- FR3: Post-processing validation for correction accuracy (deferred from B1 fix)
- FR4: Regenerate button for individual sections if AI deviates
- FR5: Move INTERPRETER VOICE presets into Advanced section (UI cleanup)
- FR6: Persona presets should cascade to set stance config underneath

---

## VOICE SYSTEM UPDATES (Parking Lot)

Items discovered during Jan 10 voice review session:

- Voice Translation Layer Spec v2.1 exists in `dev/VOICE_TRANSLATION_LAYER_SPEC_v2.1.md`
- Current implementation has both Persona layer AND Stance layer
- Agency slider (Witness→Creator) added to persona layer (not in original spec)
- Need to clarify: Should persona selection auto-set stance? (FR6)
- INTERPRETER VOICE presets overlap with persona - consolidation needed

---

## COMPLETED (v0.55.9)

- Voice system refactor with one-pass generation (personas baked in, not translated)
- Agency/Creator slider (1-10) added to persona layer
- Preview sentence generation for voice settings
- Persona prompts with 10-level humor/register descriptions

---

## COMPLETED (v0.51.5)

- Wall of text fix: ensureParagraphBreaks utility in lib/utils.js
  - Applied to all content: cards, expansions, rebalancer, WHY, threads, follow-up
  - Processes each chunk individually even if some have breaks
  - Breaks long blocks into ~3 sentence paragraphs

- Loading animations: All depth sections now show consistent animation
  - Buttons replaced with LoadingDots when loading deeper
  - Applied to main card, Words to Whys, and Rebalancer sections
  - Content area shows loading indicator during fetch

---

## COMPLETED (v0.51.4)

- B1: Words to the Whys depth buttons now trigger on-demand loading
  - Added async onClick with onLoadDeeper call for Swim/Deep buttons
  - Added loading state and visual feedback

- B2: Expansion content (Unpack/Clarify/Example) formatting improved
  - Strengthened FORMAT REQUIREMENT in EXPANSION_PROMPTS
  - Added REMINDER at end of expansion requests
  - AI now explicitly instructed to use short paragraphs

- B3: Reflect/Forge now displays responses
  - Added thread results rendering section to DepthCard.js
  - Results show with proper styling (sky for Reflect, orange for Forge)
  - Includes context quote and new card interpretation

- B4: Enter key now submits Reflect/Forge input
  - Added onKeyDown handler to all Reflect/Forge textareas
  - Works in DepthCard, Path section, and Unified section

- B5: Follow-up question responses now properly formatted
  - Strengthened CRITICAL FORMATTING RULES in system prompt
  - Added REMINDER about short paragraphs in context message

- FR3: Loading animation improved
  - Dots now build up to 15 then reset (vs 3)
  - Messages rotate: "Consulting the field", "Weaving patterns", etc.
  - Better visual signal that work is ongoing

- Hotlinks now case-sensitive + bracket notation
  - Changed from case-insensitive to case-sensitive matching
  - Added support for [Term] bracket markers
  - AI instructed to use [Balanced], [Too Much], etc. for framework terms
  - Reduces false positives ("potential" vs "[Potential]")

---

## COMPLETED (v0.51.3)

- B1: WADE and SWIM depths now properly formatted (paragraph splitting)
- B2: Path to Balance now defaults to WADE correctly
- B3: Loading animations improved with progressive dots
- B4: Architecture sections now have proper line breaks
- B5: Rebalancer Deep button now triggers on-demand loading
- B6: Expansion buttons formatting fixed
- B7: Reflect/Forge error handling improved
- FR1: Card context reminder added to sub-sections

---

## COMPLETED (Previous Versions)

- v0.51.2: Depth buttons now trigger API calls for deeper content
- v0.51.2: Removed SURFACE from all depth button arrays
- v0.51.2: Fixed WHY section default to WADE
- v0.51.2: Updated loading message to "One moment while I look deeper into the field..."
- v0.51.1: Added content validation for cards and synthesis
- v0.51.0: Progressive depth generation architecture (WADE baseline, build on previous)
