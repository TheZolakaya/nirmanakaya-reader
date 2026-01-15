# NIRMANAKAYA MASTER BACKLOG (CONSOLIDATED)

**Created:** January 14, 2026
**Consolidated By:** Claude (Chief of Staff)
**Source Documents:** 16 files across 4 locations (see Appendix A)
**Purpose:** Single source of truth for all development work

---

## CLAUDE CODE HANDOFF

**Add this to your CLAUDE.md file:**

```markdown
## Current Development Priority

**MASTER BACKLOG:** `dev/MASTER_BACKLOG_CONSOLIDATED.md`

This is the single source of truth for all bugs, features, and specs. 
Read this file at session start to understand current priorities.

### Priority Order:
1. 🚨 CRITICAL BUGS (Section 1) — Fix before any features
2. ⭐ HIGH PRIORITY (Section 2) — This sprint
3. 📋 READY TO BUILD (Section 3) — Next sprint
4. 🔮 FUTURE (Section 4) — Parking lot

### Key Files in /dev/:
- `MASTER_BACKLOG_CONSOLIDATED.md` — This file (start here)
- `SPEC_*.md` — Feature specifications
- `BUG_FIX_*.md` — Bug fix specifications (detailed)
```

---

# SECTION 1: 🚨 CRITICAL BUGS

> **Fix these before any feature work. Reading accuracy is compromised.**

---

## BUG-001: Growth Partner Calculation Broken (B6/B9)

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`
**Priority:** 🚨 CRITICAL
**Status:** Ready for implementation

### Problem
Balanced Bounds show growth opportunity pointing to **themselves** instead of the correct growth partner.

**Example:**
- Balanced Reverie (4 of Cups) → shows "Reverie" ❌
- Should show → **Immersion (8 of Swords)** ✅

### The Fix
For Bounds, growth partner calculation requires:
1. Get the Bound's associated Archetype
2. Get that Archetype's growth partner (Transpose or Polarity)
3. **Flip polarity** (Inner↔Outer)
4. Return the corresponding Bound from the target Archetype

**Polarity Reference:**
- Inner: Numbers 1, 2, 3, 4, 5 (and Ace)
- Outer: Numbers 6, 7, 8, 9, 10

**Canonical Reference:** All correct values are in `lib/CANONICAL_78_CORRECTIONS.md`

**File to fix:** `lib/corrections.js` — `getBoundCorrection()` function

### Test Cases
- [ ] Balanced 4 of Cups → 8 of Swords (not self)
- [ ] Balanced 3 of Wands → 8 of Swords (not self)
- [ ] Balanced 2 of Wands → 6 of Pentacles (not self)

---

## BUG-002: Gestalt Growth Says "Rest" Instead of "Recurse" (B8)

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`
**Priority:** 🚨 CRITICAL
**Status:** Ready for implementation

### Problem
Balanced Gestalt archetypes (0, 1, 19, 20) and Portals (10, 21) return self-reference for growth. The prompt tells users to "rest here" — **this is wrong**.

**Current output:** "Rest here for a moment. You've already done the hardest part..."
**Should say:** "Continue investing in this energy. The loop IS the growth. Go deeper here."

### The Fix
Update growth opportunity prompt for self-referential cases:

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

**File to fix:** `lib/prompts.js` — growth opportunity instructions

---

## BUG-003: DTP Using Wrong Output Structure

**Source:** `dev/BUG_FIX_DTP_Use_Existing_Card_Structure.md`
**Priority:** 🚨 CRITICAL
**Status:** Implementation deviation from spec

### Problem
DTP (Explore mode) was implemented with a **custom simplified output** instead of reusing the existing DepthCard component structure.

**What was built (WRONG):** Single paragraph per token, no depth controls
**What was specced (CORRECT):** Full DepthCard per token with Letter/Overview/Words to Whys/Rebalancer sections

### The Fix
1. Remove custom DTP output components
2. Pass `token` field to existing card state
3. Inject token into prompt builder
4. Display token label above each DepthCard
5. Token context flows through ALL sections and depth levels

**Principle:** DTP is a different ENTRY POINT, not a different OUTPUT FORMAT.

### Test Cases
- [ ] DTP shows full DepthCard structure per token
- [ ] Each card has all sections with depth controls
- [ ] Token context appears in all content
- [ ] Reflect/Forge threads work with token context
- [ ] Depth expansion maintains token context

---

## BUG-004: AI Ignoring Pre-Calculated Corrections

**Source:** `dev/BUG_FIX_Correction_Enforcement_COMPLETE.md`
**Priority:** 🚨 CRITICAL
**Status:** Ready for implementation

### Problem
The AI consistently ignores pre-calculated corrections and invents its own.

**Example:**
- Formation (Unacknowledged) → Header says "Command" → AI discusses "Recognition" ❌
- Imagination (Too Much) → Should be Nurturing → AI suggests Reflection ❌

### The Systemic Fix (4 Parts)

**Part 1:** Inject correction target into every relevant prompt section
- Update `lib/utils.js` — `formatDrawForAI()`
- Update `app/api/card-depth/route.js` — `buildDeepenMessage()`

**Part 2:** Add prominent warning box to FORMAT_INSTRUCTIONS
```
╔════════════════════════════════════════════════════════════════╗
║  CRITICAL: CORRECTION TARGET IS PRE-CALCULATED                 ║
║  YOU MUST use ONLY the named correction target                 ║
║  NEVER substitute a different card                             ║
║  NEVER calculate your own correction                           ║
╚════════════════════════════════════════════════════════════════╝
```

**Part 3:** Add correction reference tables to BASE_SYSTEM

**Part 4:** Post-processing validation (future enhancement)

### Files to Modify
- `lib/utils.js` — Add `getCorrectionTargetName()`, update `formatDrawForAI()`
- `lib/prompts.js` — Add warning box to FORMAT_INSTRUCTIONS
- `app/api/card-depth/route.js` — Update `buildDeepenMessage()`

### Test Cases
- [ ] Imagination (18) Too Much → Nurturing (3)
- [ ] Wisdom (2) Too Little → Imagination (18)
- [ ] Equity (11) Unacknowledged → Wisdom (2)
- [ ] Formation (Structure 3) Unacknowledged → Command (Intent 8)

---

## BUG-005: Export Missing Growth Opportunity Sections (B7)

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation

### Problem
HTML export is missing Growth Opportunity sections that appear in live reading.

### The Fix
Add Growth Opportunity section to export, styled similarly to Rebalancer but with distinct color (green/teal for growth vs orange for rebalancer).

---

## BUG-006: Letter/Overview Missing Shallow Depth (B5)

**Source:** `dev/BUG_FIX_Critical_High_Jan11.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation

### Problem
Letter and Overview sections do not have Shallow depth buttons. FR11 spec requires Shallow as default for ALL sections.

### The Fix
Add Shallow to depth button array for Letter and Overview sections.

**Expected:** Shallow → Wade → Swim → Deep (all sections)

---

## BUG-007: Rebalancer DEEP Content Too Short

**Source:** `dev/BUG_FIX_Rebalancer_Depth.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation

### Problem
Clicking "Deep" on rebalancer returns only 2 sentences instead of full transmission.

### Root Cause
- `maxTokens` set to only 1500 for deepening
- DEEP instructions don't emphasize length for REBALANCER specifically
- Correction target not passed to deepening prompts

### The Fix
1. Increase token budget: DEEP gets 3000, SWIM gets 2000
2. Add explicit correction target to deepening prompts
3. Strengthen DEEP instructions: "3-4 paragraphs minimum"

**File:** `app/api/card-depth/route.js`

---

# SECTION 2: ⭐ HIGH PRIORITY FEATURES

> **This sprint. Build after critical bugs are fixed.**

---

## FR-001: Complete Rebalancer System for All 78 Signatures

**Source:** `dev/SPEC_Implement_All_Rebalancers.md`
**Priority:** ⭐ HIGH (Core framework feature)
**Status:** Ready for implementation

### Overview
The `corrections.js` file needs to return rebalancer targets for ALL 78 signatures in ALL 4 stance states. Currently returns `null` for balanced states and some unacknowledged states.

### The Rule
Every signature in every state points somewhere. If there's no external partner, it points to itself.

### Implementation Requirements

**1. Add GROWTH_PAIRS Lookup Table**
```javascript
export const GROWTH_PAIRS = {
  0: null,   // Potential → self (Gestalt)
  1: null,   // Will → self (Gestalt)
  2: 4,      // Wisdom → Order (Transpose)
  3: 12,     // Nurturing → Sacrifice (Transpose)
  // ... (full table in spec)
};
```

**2. Update getArchetypeCorrection()** — Return growth target for balanced

**3. Update REDUCTION_PAIRS** — Handle null as self-reference

**4. Update getBoundCorrection()** — Growth with polarity flip

**5. Update getAgentCorrection()** — Growth with polarity flip

**6. Update getCorrectionText()** — Handle growth type

### Test Cases
- [ ] Balanced Wisdom (2) → Order (4)
- [ ] Balanced Compassion (6) → Abstraction (15) — Polarity pair
- [ ] Balanced Potential (0) → Potential (0) — Self
- [ ] Balanced 3 of Wands → 9 of Swords
- [ ] Balanced Knight of Wands → Queen of Swords

---

## FR-002: Growth Opportunity Section for Balanced Cards (FR7)

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation (depends on FR-001)

### Overview
Balanced cards (status === 1) currently show no rebalancer section. But balance is a launchpad — balanced signatures have growth partners.

### Frontend Changes
```javascript
// Show Growth Opportunity for balanced
if (status === 1 && growthTarget) {
  // show Growth Opportunity section (green/teal styling)
}
```

### Prompt Changes
```
GROWTH OPPORTUNITY (Balanced cards only):
Frame as developmental invitation, not correction.
- "From here, the architecture invites..."
- "With [signature] in balance, growth moves toward..."
```

---

## FR-003: Move Interpreter Voice into Stance Panel (FR8)

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation

### Overview
Move voice selector (Clear, Kind, Playful, Wise, Oracle) inside the stance panel, collapsed by default. Reduces UI clutter.

### Implementation
Current location: Main reading interface (visible)
Target location: Inside stance panel, below sliders

---

## FR-004: Shallow Depth as Default View (FR11)

**Source:** `dev/SPEC_FR7_FR8_FR11_Combined.md`
**Priority:** ⭐ HIGH
**Status:** Ready for implementation

### Overview
Add "Shallow" as new default depth — 1-2 sentence headline summary.

### Depth Progression (New)
| Depth | Content | Default? |
|-------|---------|----------|
| **Shallow** | 1-2 sentence summary | ✅ YES |
| Wade | Entry-level interpretation | No |
| Swim | Psychological expansion | No |
| Deep | Full transmission | No |

### Recommendation
Option A: Derive Shallow from Wade (post-process). No additional API call.

---

## FR-005: Agency Attribution Fix (PRI 1 SEV 1)

**Source:** `session_013_backlog.md`
**Priority:** ⭐ HIGH
**Status:** Spec document exists: `Pri1_Agency_Attribution_Bug_Fix.md`

### Problem
Interpretation text incorrectly attributes status/imbalance to the DURABLE (position) instead of the TRANSIENT (card drawn).

### The Canon Rule
> In all readings, status and correction belong to the transient; the durable defines the domain of expression, never the subject of imbalance.

**Correct:** "Harvest is over-activated, expressing through Culture"
**Wrong:** "Culture is over-expressing"

### The Fix
Add explicit AGENCY RULE to FORMAT_INSTRUCTIONS in `lib/prompts.js`

---

# SECTION 3: 📋 READY TO BUILD

> **Next sprint. Specs are complete.**

---

## FR-006: Voice Translation Layer (Persona System)

**Source:** `dev/VOICE_TRANSLATION_LAYER_SPEC_v2.1.md`
**Priority:** 📋 Ready
**Status:** Full spec complete

### Overview
Post-processing translation layer. After reading is generated, user chooses: "Who reads this to you?"

**Personas:**
- None (system voice, no translation)
- Friend (casual, direct, like your best friend)
- Therapist (reflective, space-holding)
- Spiritualist (poetic, transcendent)
- Scientist (precise, evidence-based)
- Coach (action-oriented, motivating)

**Additional Controls (when persona selected):**
- Humor slider (1-10): Comic ↔ Serious
- Register slider (1-10): Street ↔ Sophisticated
- ☐ Roast Mode (loving but savage)
- ☐ Direct Mode (no softening)

### API Flow
- Persona = "None" → Display as-is (no API call)
- Persona selected → Stage 2 API translates (Haiku, ~$0.002)

### Files to Create
- `lib/translation.js` — Translation layer logic
- `lib/personas.js` — PERSONA_PROMPTS definitions
- `app/api/translate/route.js` — Stage 2 API endpoint
- `components/reader/PersonaSelector.js` — UI component

---

## FR-007: Direct Token Protocol (DTP / Explore Mode)

**Source:** `dev/SPEC_FR12_Direct_Token_Protocol.md`
**Priority:** 📋 Ready (after BUG-003 is fixed)
**Status:** Full spec complete, implementation needs correction

### Overview
Syntax-first reading architecture. User describes what's active in plain language, system extracts tokens, each token gets its own card.

**The Three-Layer Sentence:**
```
[Token] is expressing as [Card] in [Position] — [Status]
```

**Example:** "Fear" is expressing as "The Tower" in "Order" — Too Much

### User Flow
1. User enters text in open field
2. Single API call parses tokens AND generates readings
3. Each token displays as full DepthCard with token context

### Key Principle
Token context must be injected into ALL prompts:
- Letter, Overview, Words to Whys, Rebalancer
- Reflect/Forge threads
- Depth expansions
- Exports

---

## FR-008: Life Domain Spreads

**Source:** `dev/SPEC_FR12_Life_Domain_Spreads.md`
**Priority:** 📋 LARGE
**Status:** Design phase complete

### Overview
User provides a "life domain" (arena/context), architecture reads within that context.

**The Three-Layer Sentence:**
```
[Card] in [Position] in [Domain] — [Status]
```

**Example:** "Six of Cups in Will in [my relationship with Margaret] — Too Little"

### Key Rules
- **Rule of Transcendence:** Expand context to fit archetype, not vice versa
- **No Prediction Firewall:** Questions like "Will I get the job?" are mirrored as present-state readings
- Domain is NULL during draw phase (veil preserved)

### Phase 1: Custom Mode
- Domain input field + quick picks
- Three-layer sentence display
- Default fallback: "My Current Life Situation"

### Future Phases
- Preset templates (Relationship Mirror, Choice Compass, etc.)
- Cross-Section spreads (Spirit → Mind → Emotion → Body)

---

## FR-009: Archetype → Bounds Mapping Fix

**Source:** `session_013_backlog.md`
**Priority:** 📋 Ready
**Status:** Bug identified

### Problem
Compassion (Position 6) showing 4 Bounds instead of 2.
- Currently shows: Merge, Reverie, Allure, Fulfillment
- Should only show: Reverie (4 of Cups) + Allure (7 of Cups)

### Root Cause
Displaying ALL Associated Derivatives instead of just the two Bounds (inner + outer defined by pip number).

### The Fix
Audit ALL Archetypes to ensure only true Bounds (inner + outer) display.

---

## FR-010: Hotlinking System (Universal)

**Source:** `session_013_backlog.md`
**Priority:** 📋 Ready
**Status:** Needs implementation spec

### Overview
EVERYTHING framework-related is clickable. Two-layer depth:
1. Surface layer: Plain language explanation
2. Framework layer: Architecture details

### Terms to Hotlink
- Category labels: Status, Channel, House, Archetype, Derivative, Bound, Agent
- Channel names: Intent, Cognition, Resonance, Structure
- House names: Spirit, Mind, Emotion, Body, Gestalt
- Status values: Balanced, Too Much, Too Little, Unacknowledged
- All 22 Archetype names
- All 56 Derivative names
- Correction paths: Diagonal, Vertical, Reduction

### Locations
Must work everywhere: reading text, popups, signature cards, rebalancer sections, metadata

---

## FR-011: Popup Navigation Improvements

**Source:** `session_013_backlog.md`
**Priority:** 📋 Ready
**Status:** UX improvement

### Features Needed
- Back button in nested popups
- Close button always visible
- Consider breadcrumb trail for deep nesting

---

# SECTION 4: 🔮 FUTURE / PARKING LOT

> **Good ideas, not now. Reference for later.**

---

## FUT-001: Full 22-Position Reading

**Source:** `backlog_22_position_reading.md`
**Priority:** 🔮 Future Major Feature

### Overview
The "full monty" — complete diagnostic of consciousness. Chris's primary reading method for 30+ years.

### Architecture
- Wheel (10) at top — Source portal
- World (21) at bottom — Creation portal
- Gestalt (center) — Fool, Magician, Sun, Judgement
- Mind, Emotion, Body, Spirit Houses
- The Seal — 4×4 grid visible

### Core Features
- 22-position draw engine
- Governance overlay (which Gestalt governs which Houses)
- Chain tracing algorithm
- Loop detection
- Terminal detection
- Synthesis layer (whole pattern interpretation)

### Dependencies
- Stable Reader foundation
- Complete rebalancer system
- Enhanced synthesis prompts

---

## FUT-002: "Did You Know?" Feature

**Source:** `backlog_did_you_know_feature.md`
**Priority:** 🔮 Engagement/Education

### Overview
Surface knowledge bombs embedded in Nirmanakaya — logically derived truths delivered casually.

**Tone:** "Oh by the way, you're an eternal god within God. Here's the math. ;P"

### Sample Knowledge Bombs
- Identity & Eternality: "You're Ring 2 identity — a stable attractor that persists across substrates"
- Purpose: "Purpose isn't invented, it's built into the architecture"
- The Architecture: "22 isn't arbitrary — it's forced by the logic of consciousness"
- The Veil: "Uncertainty isn't a bug — it's the feature that makes authentic creation possible"
- Love: "Love is the operation that integrates what polarity separates"

### Implementation Options
- Random on landing page
- Post-reading integration
- Dedicated "Invariants" section
- Loading states

---

## FUT-003: Interactive Map Page

**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** 🔮 Phase 1 (waiting on visual strategy)

### Overview
Visual navigation of 78 signatures. Clickable Houses and archetypes. Mobile responsive.

**Dependency:** Visual strategy input from parallel Claude instance

---

## FUT-004: User Accounts & Membership

**Source:** `Nirmanakaya_Feature_Backlog.md`, `Tech_Stack_Implementation_Roadmap.md`
**Priority:** 🔮 Phase 2 (March-April 2026)

### Components
- Database: TBD (Supabase vs PlanetScale vs Firebase)
- Auth: TBD (NextAuth vs Clerk vs Supabase Auth)
- Stripe: $1/year membership
- Reading history
- Pattern tracking

---

## FUT-005: Community Features

**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** 🔮 Phase 3 (May-June 2026)

### Components
- Forums
- Voting system (cladding governance)
- Editor roles
- "Ask the Council" feature

---

## FUT-006: First Encounter Script

**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** ⭐ CRITICAL (but waiting on GPT draft)

### Overview
Canonical 2-minute path. Zero jargon. One reading (single card). One "oh... huh" moment.

**Owner:** GPT (to draft), Claude (to integrate)

---

## FUT-007: Terminology Updates (Tarot 2.0)

**Source:** `session_013_backlog.md`
**Priority:** 📋 Ongoing

### Key Changes
- "Correction" → "Rebalancer" / "Rebalanced by"
- "Major" → "Archetype"
- "Minor" → "Derivative"

### Philosophy
"Correction" implies you're wrong. YOU'RE NOT. The system provides the path back to balance IF YOU WANT IT.

---

## FUT-008: Token Optimization

**Source:** `session_013_backlog.md`
**Priority:** 📋 DevOps

### Issue
8,717 tokens IN is high. Investigate:
- Full teleological JSON for all 78 when only need 3?
- Voice System spec sent every time?
- Framework docs included that aren't needed?

---

## FUT-009: Gamification / Progressive Disclosure

**Source:** `session_013_backlog.md`
**Priority:** 🔮 Future

### Concept
Users can't access depth until they've earned it through engagement.

**Proposed Progression:**
- Level 1: Clear voice only, 1 card only
- Level 2: Unlock more cards, Kind/Playful voice
- Level 3: Unlock Wise/Oracle, more positions
- Level 4: Full access, Architecture view toggle

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

## Priority Legend
- 🚨 CRITICAL — Blocks other work, accuracy compromised
- ⭐ HIGH — This sprint
- 📋 READY — Next sprint, spec complete
- 🔮 FUTURE — Parking lot

## File Locations
- **Specs:** `dev/SPEC_*.md`
- **Bug fixes:** `dev/BUG_FIX_*.md`
- **This file:** `dev/MASTER_BACKLOG_CONSOLIDATED.md`
- **Canonical corrections:** `lib/CANONICAL_78_CORRECTIONS.md`

## Key Principles
- The structure is the authority
- Derive, don't interpret
- Majors correct to Majors, Minors to Minors, Agents to Agents
- Balance is a launchpad, not a destination
- The AI is provisional; the correction tables are canonical

---

*Last Updated: January 14, 2026*
*The work leads. We remain provisional.*
