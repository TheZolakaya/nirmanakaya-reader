# Nirmanakaya Reader - Backlog

Last updated: 2026-01-08 (v0.51.2)

## Rollback Safety
- **Tag `v0.50.0-stable`** exists for rollback if needed (before progressive depth changes)

---

## BUGS

### B1: WADE and SWIM depths not formatted (wall of text)
- **Status:** Open
- **Severity:** High
- **Affects:** Letter, Overview, Path to Balance, Cards
- **Note:** DEEP is formatted correctly - issue is with WADE/SWIM only

### B2: Path to Balance defaults to SWIM instead of WADE
- **Status:** Open
- **Severity:** Medium

### B3: Loading animation inconsistency and needs improvement
- **Status:** Open
- **Severity:** Medium
- **Details:**
  - Path to Balance: loading message covers depth buttons (good behavior)
  - Cards: don't have this behavior (should match Path)
  - Need: Progressive dots animation (. .. ... ....) or progress bar
  - Current flashing text builds anxiety without progress indication

### B4: Architecture sections have bolding but no carriage returns
- **Status:** Open
- **Severity:** Medium
- **Details:** Hard to read without line breaks

### B5: Rebalancer ("How to Rebalance") section issues
- **Status:** Open
- **Severity:** High
- **Details:**
  - Deep button doesn't change content from Swim (not loading/generating)
  - Needs formatting treatment across all depths (same wall of text issue)

### B6: Expansion buttons have no formatting applied (wall of text)
- **Status:** Open
- **Severity:** Medium
- **Affects:** Unpack, Clarify, Example

### B7: Reflect and Forge operations show processing then disappear with no results
- **Status:** Open
- **Severity:** Critical

---

## FEATURE REQUESTS

### FR1: Card context reminder in sub-sections
- **Status:** Open
- **Priority:** Medium
- **Details:** Repeat transient status, card name, and position beneath each sub-section title when expanded. Provides context as users drill into nested content.

---

## COMPLETED (Recent)

- v0.51.2: Depth buttons now trigger API calls for deeper content
- v0.51.2: Removed SURFACE from all depth button arrays
- v0.51.2: Fixed WHY section default to WADE
- v0.51.2: Updated loading message to "One moment while I look deeper into the field..."
- v0.51.1: Added content validation for cards and synthesis
- v0.51.0: Progressive depth generation architecture (WADE baseline, build on previous)
