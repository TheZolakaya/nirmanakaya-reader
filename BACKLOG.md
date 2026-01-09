# Nirmanakaya Reader - Backlog

Last updated: 2026-01-08 (v0.51.5)

## Rollback Safety
- **Tag `v0.50.0-stable`** exists for rollback if needed (before progressive depth changes)

---

## BUGS

(All bugs from v0.51.4 have been addressed)

---

## FEATURE REQUESTS

- FR1: Section headers (Reading, The Why, etc.) clickable with definition popups
- FR2: Core framework terms in popups (archetype, status) should be clickable with definitions

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
