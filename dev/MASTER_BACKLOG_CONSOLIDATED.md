# NIRMANAKAYA MASTER BACKLOG (CONSOLIDATED)

**Created:** January 14, 2026
**Last Updated:** January 14, 2026
**Consolidated By:** Claude (Chief of Staff)
**Purpose:** Single source of truth for all development work

---

## CLAUDE CODE HANDOFF

**Add this to your CLAUDE.md file:**

```markdown
## Current Development Priority

**MASTER BACKLOG:** `dev/MASTER_BACKLOG_CONSOLIDATED.md`

This is the single source of truth for all bugs, features, and specs.
Read this file at session start to understand current priorities.

### Open Items (7 total):
- 1 Ready to build (FR-011: Popup Navigation)
- 6 Future/parking lot items

### Key Files in /dev/:
- `MASTER_BACKLOG_CONSOLIDATED.md` — This file (start here)
- `SPEC_*.md` — Feature specifications (most now closed)
- `BUG_FIX_*.md` — Bug fix specifications (all closed)
```

---

# OPEN ITEMS

## 📋 READY TO BUILD (1 item)

### FR-011: Popup Navigation Improvements

**Source:** `session_013_backlog.md`
**Priority:** 📋 Ready
**Status:** OPEN

#### Features Needed
- Back button in nested popups — when clicking a hotlink inside a popup, need ability to go back
- Close button always visible — exit entirely from any depth
- Consider breadcrumb trail for deep nesting (e.g., "Compassion > Merge > Structure")

---

## 🔮 FUTURE / PARKING LOT (6 items)

### FUT-001: Full 22-Position Reading

**Source:** `backlog_22_position_reading.md`
**Priority:** 🔮 Future Major Feature
**Status:** OPEN

#### Overview
The "full monty" — complete diagnostic of consciousness. Chris's primary reading method for 30+ years.

#### Architecture
- Wheel (10) at top — Source portal
- World (21) at bottom — Creation portal
- Gestalt (center) — Fool, Magician, Sun, Judgement
- Mind, Emotion, Body, Spirit Houses
- The Seal — 4×4 grid visible

#### Core Features
- 22-position draw engine
- Governance overlay (which Gestalt governs which Houses)
- Chain tracing algorithm
- Loop detection
- Terminal detection
- Synthesis layer (whole pattern interpretation)

#### Dependencies
- Stable Reader foundation ✅
- Complete rebalancer system ✅
- Enhanced synthesis prompts

---

### FUT-002: "Did You Know?" Feature

**Source:** `backlog_did_you_know_feature.md`
**Priority:** 🔮 Engagement/Education
**Status:** OPEN

#### Overview
Surface knowledge bombs embedded in Nirmanakaya — logically derived truths delivered casually.

**Tone:** "Oh by the way, you're an eternal god within God. Here's the math. ;P"

#### Sample Knowledge Bombs
- Identity & Eternality: "You're Ring 2 identity — a stable attractor that persists across substrates"
- Purpose: "Purpose isn't invented, it's built into the architecture"
- The Architecture: "22 isn't arbitrary — it's forced by the logic of consciousness"
- The Veil: "Uncertainty isn't a bug — it's the feature that makes authentic creation possible"
- Love: "Love is the operation that integrates what polarity separates"

#### Implementation Options
- Random on landing page
- Post-reading integration
- Dedicated "Invariants" section
- Loading states

---

### FUT-003: Interactive Map Page

**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** 🔮 Phase 1 (waiting on visual strategy)
**Status:** OPEN

#### Overview
Visual navigation of 78 signatures. Clickable Houses and archetypes. Mobile responsive.

**Dependency:** Visual strategy input

---

### FUT-006: First Encounter Script

**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** 🔮 Future (waiting on GPT draft)
**Status:** OPEN

#### Overview
Canonical 2-minute path. Zero jargon. One reading (single card). One "oh... huh" moment.

**Owner:** GPT (to draft), Claude (to integrate)

---

### FUT-008: Token Optimization

**Source:** `session_013_backlog.md`
**Priority:** 🔮 DevOps
**Status:** OPEN

#### Issue
8,717 tokens IN is high. Investigate:
- Full teleological JSON for all 78 when only need 3?
- Voice System spec sent every time?
- Framework docs included that aren't needed?

---

### FUT-009: Gamification / Progressive Disclosure

**Source:** `session_013_backlog.md`
**Priority:** 🔮 Future
**Status:** OPEN

#### Concept
Users can't access depth until they've earned it through engagement.

#### Proposed Progression
- Level 1: Clear voice only, 1 card only
- Level 2: Unlock more cards, Kind/Playful voice
- Level 3: Unlock Wise/Oracle, more positions
- Level 4: Full access, Architecture view toggle

---

---

# ARCHIVE: CLOSED ITEMS

> **All items below have been completed. Kept for reference.**

---

## ✅ CLOSED BUGS (7 items)

### BUG-001: Growth Partner Calculation Broken (B6/B9) — ✅ CLOSED

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`

Balanced Bounds were showing growth opportunity pointing to themselves instead of the correct growth partner. Fixed by implementing polarity flip logic in `getBoundCorrection()`.

---

### BUG-002: Gestalt Growth Says "Rest" Instead of "Recurse" (B8) — ✅ CLOSED

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`

Balanced Gestalt archetypes were telling users to "rest here" instead of "continue investing." Fixed prompt language.

---

### BUG-003: DTP Using Wrong Output Structure — ✅ CLOSED

**Source:** `dev/BUG_FIX_DTP_Use_Existing_Card_Structure.md`

DTP (Explore mode) was using custom simplified output instead of reusing DepthCard component. Fixed to use existing card structure with token context.

---

### BUG-004: AI Ignoring Pre-Calculated Corrections — ✅ CLOSED

**Source:** `dev/BUG_FIX_Correction_Enforcement_COMPLETE.md`

AI was inventing its own corrections instead of using pre-calculated ones. Fixed with explicit injection of correction targets into prompts.

---

### BUG-005: Export Missing Growth Opportunity Sections (B7) — ✅ CLOSED

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`

HTML export was missing Growth Opportunity sections. Fixed.

---

### BUG-006: Letter/Overview Missing Shallow Depth (B5) — ✅ CLOSED

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`

Letter and Overview sections didn't have Shallow depth buttons. Fixed.

---

### BUG-007: Rebalancer DEEP Content Too Short — ✅ CLOSED

**Source:** `dev/BUG_FIX_Rebalancer_Depth.md`

DEEP on rebalancer was returning only 2 sentences. Fixed token budget and prompt instructions.

---

## ✅ CLOSED HIGH PRIORITY FEATURES (5 items)

### FR-001: Complete Rebalancer System for All 78 Signatures — ✅ CLOSED

**Source:** `dev/SPEC_Implement_All_Rebalancers.md`

All 78 signatures now return rebalancer targets in all 4 stance states.

---

### FR-002: Growth Opportunity Section for Balanced Cards (FR7) — ✅ CLOSED

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`

Balanced cards now show Growth Opportunity section with growth partners.

---

### FR-003: Move Interpreter Voice into Stance Panel (FR8) — ✅ CLOSED

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`

Voice selector moved inside stance panel, collapsed by default.

---

### FR-004: Shallow Depth as Default View (FR11) — ✅ CLOSED

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`

Shallow (1-2 sentence summary) is now the default depth.

---

### FR-005: Agency Attribution Fix — ✅ CLOSED

**Source:** `session_013_backlog.md`

Status/imbalance now correctly attributed to transient, not durable.

---

## ✅ CLOSED READY TO BUILD (5 items)

### FR-006: Voice Translation Layer (Persona System) — ✅ CLOSED

**Source:** `dev/VOICE_TRANSLATION_LAYER_SPEC_v2.1.md`

Persona system implemented: Friend, Therapist, Spiritualist, Scientist, Coach + Humor/Register sliders + Roast/Direct modes.

---

### FR-007: Direct Token Protocol (DTP / Explore Mode) — ✅ CLOSED

**Source:** `dev/SPEC_FR12_Direct_Token_Protocol.md`

Token-based readings implemented. User describes situation, system extracts tokens, each gets its own card.

---

### FR-008: Life Domain Spreads — ✅ CLOSED

**Source:** `dev/SPEC_FR12_Life_Domain_Spreads.md`

Life domain context implemented. Users can specify arena for readings.

---

### FR-009: Archetype → Bounds Mapping Fix — ✅ CLOSED

**Source:** `session_013_backlog.md`

Archetypes now correctly show only their two Bounds (inner + outer).

---

### FR-010: Hotlinking System (Universal) — ✅ CLOSED

**Source:** `session_013_backlog.md`

Framework terms are now clickable with two-layer depth explanations.

---

## ✅ CLOSED FUTURE ITEMS (3 items)

### FUT-004: User Accounts & Membership — ✅ CLOSED

**Source:** `Nirmanakaya_Feature_Backlog.md`, `Tech_Stack_Implementation_Roadmap.md`

User accounts, authentication, and membership implemented.

---

### FUT-005: Community Features — ✅ CLOSED

**Source:** `Nirmanakaya_Feature_Backlog.md`

Community features implemented.

---

### FUT-007: Terminology Updates (Tarot 2.0) — ✅ CLOSED

**Source:** `session_013_backlog.md`

Terminology updated: "Correction" → "Rebalancer", "Major" → "Archetype", "Minor" → "Derivative".

---

# APPENDIX A: SOURCE DOCUMENTS

| Location | File | Status |
|----------|------|--------|
| `D:\Nirmanakaya_Book\MD Files of Corpus\` | `Nirmanakaya_Feature_Backlog.md` | Integrated |
| `D:\Nirmanakaya_Book\MD Files of Corpus\` | `session_013_backlog.md` | Integrated |
| `D:\Nirmanakaya_Book\MD Files of Corpus\` | `backlog_22_position_reading.md` | Integrated |
| `D:\Nirmanakaya_Book\MD Files of Corpus\` | `backlog_did_you_know_feature.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `SPEC_FR7_FR8_FR11_Combined.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `SPEC_FR12_Direct_Token_Protocol.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `SPEC_FR12_Life_Domain_Spreads.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `SPEC_Implement_All_Rebalancers.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `BUG_FIX_Critical_High_Jan11.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `BUG_FIX_Correction_Enforcement.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `BUG_FIX_Correction_Enforcement_COMPLETE.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `BUG_FIX_DTP_Use_Existing_Card_Structure.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `BUG_FIX_Rebalancer_Depth.md` | Integrated |
| `D:\NKYAWebApp\nirmanakaya-reader\dev\` | `VOICE_TRANSLATION_LAYER_SPEC_v2.1.md` | Integrated |
| `D:\Nirmanakaya_Book\Canon Candidates\` | `Tech_Stack_Implementation_Roadmap.md` | Integrated |
| `D:\Nirmanakaya_Book\Council Documents\` | `Nirmanakaya_Build_Out_Mission_v1_3_FINAL.md` | Referenced |

---

# APPENDIX B: QUICK REFERENCE

## Current Status
- **Total Items:** 27
- **Closed:** 20
- **Open:** 7 (1 ready, 6 future)

## Key Principles
- The structure is the authority
- Derive, don't interpret
- Majors correct to Majors, Minors to Minors, Agents to Agents
- Balance is a launchpad, not a destination
- The AI is provisional; the correction tables are canonical

---

*Last Updated: January 14, 2026*
*The work leads. We remain provisional.*
