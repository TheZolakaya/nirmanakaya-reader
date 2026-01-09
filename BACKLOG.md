# Nirmanakaya Reader - Backlog

Last updated: 2026-01-08 (v0.51.3)

## Rollback Safety
- **Tag `v0.50.0-stable`** exists for rollback if needed (before progressive depth changes)

---

## BUGS

(All bugs from v0.51.2 have been addressed in v0.51.3)

---

## FEATURE REQUESTS

(None pending)

---

## COMPLETED (v0.51.3)

- B1: WADE and SWIM depths now properly formatted (paragraph splitting)
  - Added formatting instructions to all APIs (card-depth, synthesis, letter)
  - Added EXPANSION_PROMPTS formatting instructions
  - Fixed Path expansion content paragraph rendering

- B2: Path to Balance now defaults to WADE correctly
  - Fixed empty string fallback logic in getSummaryContent, getLetterContent
  - Fixed getPathContent to use proper null checks

- B3: Loading animations improved with progressive dots
  - Added LoadingDots component with animated "..."
  - Updated all loading messages across page.js and DepthCard.js
  - Changed spinner icon to animated circle

- B4: Architecture sections now have proper line breaks
  - Updated DepthCard.js architecture rendering to split on newlines
  - Updated Path architecture rendering in page.js
  - Updated ArchitectureBox.js component

- B5: Rebalancer Deep button now triggers on-demand loading
  - Added onLoadDeeper call to Rebalancer depth buttons
  - Fixed getRebalancerContent fallback logic with proper null checks

- B6: Expansion buttons formatting fixed
  - Path expansion content now splits paragraphs correctly

- B7: Reflect/Forge error handling improved
  - Added error messages for missing content cases
  - Fixed path content null/empty string check

- FR1: Card context reminder added to sub-sections
  - Added "Structure of [Card Name]" to Architecture section

---

## COMPLETED (Previous Versions)

- v0.51.2: Depth buttons now trigger API calls for deeper content
- v0.51.2: Removed SURFACE from all depth button arrays
- v0.51.2: Fixed WHY section default to WADE
- v0.51.2: Updated loading message to "One moment while I look deeper into the field..."
- v0.51.1: Added content validation for cards and synthesis
- v0.51.0: Progressive depth generation architecture (WADE baseline, build on previous)
