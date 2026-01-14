# Nirmanakaya Reader - Backlog

Last updated: 2026-01-11 (v0.57.0)

## Rollback Safety
- **Tag `v0.50.0-stable`** exists for rollback if needed (before progressive depth changes)

---

## BUGS

### B11: Prevent Duplicate Positions in Multi-Card Readings ⭐ HIGH
**Status:** New

In multi-card readings (including DTP Explore mode), the same position can currently be drawn multiple times. This breaks the architecture.

**Example of the problem:**
- Card 1: Tower in Emperor, Too Much
- Card 2: Lovers in Emperor, Too Much ← INVALID (Emperor position used twice)

**Required behavior:**
- Each position (0-21) can only appear once per reading
- Draw without replacement for positions
- Cards (0-77) and Status (1-4) can repeat

**Why this matters:**
- Architecturally, you can only have one signature in each position at a time
- Sets up for next-level reading model (full 22-position diagnostic)
- Prevents nonsensical readings ("two things in your Will simultaneously")

**Implementation:**
- Track used positions during draw generation
- Skip/redraw if position already used
- Max cards in a reading = 22 (one per position)

**Files:** Draw generation logic (frontend randomization)

---
### B10: Verify Agency Slider Actually Affects Output ⭐ MEDIUM
**Status:** Needs investigation

Confirm whether the Agency slider (Witness ↔ Creator) actually changes the AI output, or if it's cosmetic only.

**Questions:**
- Is Agency value passed to the prompt?
- Does the prompt change based on Agency setting?
- Can we see measurable difference in output between Witness (1) and Creator (10)?

**Related:** FR15 (True Forge Mode) — if Agency slider is supposed to affect assertion vs observation, it needs to actually work.

**Test:** Run same reading at Agency=1 (Witness) and Agency=10 (Creator), compare outputs.

**Files:** `lib/voice.js`, `lib/promptBuilder.js`, stance panel

---

### B4: Overview Section Disappears When Deepening Letter ⭐ HIGH
**Status:** Deferred — Cannot replicate

---

### B1: AI Ignoring Pre-Calculated Corrections ✅ RESOLVED
### B2: Rebalancer DEEP Too Short ✅ RESOLVED
### B3: Stance Slider Highlighting → Converted to FR16
### B5: Letter/Overview Missing Shallow ✅ RESOLVED
### B6: Growth Partner Shows Self Instead of Target ✅ RESOLVED
### B7: Export Missing Growth Sections ✅ RESOLVED
### B8: Gestalt Growth Says "Rest" ✅ RESOLVED
### B9: Duplicate of B6 ✅ RESOLVED

---

## FEATURE REQUESTS

### FR7: Growth Opportunity Section for Balanced Cards ✅ IMPLEMENTED
**Status:** Complete (bugs fixed in v0.57.0)

---

### FR8: Move Interpreter Voice into Stance Panel ⭐ MEDIUM
**Status:** Ready for implementation

Move the INTERPRETER VOICE selector (Clear, Kind, Playful, Wise, Oracle) to be hidden inside the stance selection panel, not visible at top level. Reduces UI clutter.

**Current location:** Visible in main UI
**Target location:** Inside stance/advanced settings panel

---

### FR11: Add "Shallow" Depth Level ✅ IMPLEMENTED
**Status:** Complete (bugs fixed in v0.57.0)

Shallow IS the default view. Wade/Swim/Deep are expansions from there.

---

### FR15: True Forge Mode (Assertion of Will) ⭐ HIGH
**Status:** Needs design

Forge mode should be a fundamentally different operation than Reflect — an assertion of will, not a question.

**Current state:** Forge may be functioning too similarly to Reflect (asking rather than declaring).

**Forge should be:**
- Declaration mode: "I am..." / "I choose..." / "I commit to..."
- Assertion of intention into the architecture
- The user shapes reality, not asks about it
- Response should acknowledge the declaration and show what shifts

**Reflect is:**
- Question mode: "What is..." / "Why..." / "How..."
- Consuming/receiving from the architecture
- Mirror operation

**The distinction:**
- Reflect = Consume (read-only)
- Forge = Create (write operation on consciousness)

**Design questions:**
- How does Forge UI differ? (Different input prompt? Different styling?)
- What does the architecture "return" for a declaration vs a question?
- How do Forge threads display differently than Reflect threads?

---

### FR16: Stance Slider Labels Only Highlight When Changing ⭐ LOW
**Status:** Ready for implementation

Slider labels (Humor, Register, Agency) and their value labels (Witty, Polished, Engaged) should only highlight gold when actively being adjusted.

**Current behavior:** Labels stay highlighted (Agency currently stuck gold)

**Expected behavior:**
- Labels are default color (gray/white) when idle
- Label highlights gold ONLY while that slider is being dragged
- Unhighlights immediately when drag ends or user moves to different slider
- Only one label pair highlighted at a time (or none when idle)

**Applies to both sides:**
- Left side: Humor, Register, Agency
- Right side: Witty/Playful/etc, Polished/Clear/etc, Engaged/Witness/etc

**Files:** Stance panel component, slider onChange/onDrag handlers

---

### FR14: Local Save/Load of Readings ⭐ MEDIUM
**Status:** Concept

Allow users to save readings locally and reload them later for continued exploration.

**Features:**
- Save reading state (draws, interpretations, depth levels, threads)
- Load saved readings back into the Reader
- Continue plumbing depths (Shallow → Wade → Swim → Deep) on reload
- Add new Reflect/Forge threads to saved readings
- Export format: JSON or encrypted local storage

**Use cases:**
- Return to a reading days later with fresh eyes
- Continue deepening without regenerating
- Build a personal reading journal over time

---

### FR12: Life Domain Spreads ⭐ LARGE
**Status:** Spec complete → `Canon Candidates/Life_Domain_Spreads_Proposal_v2.md`

Add contextual reading frames that ground the architecture in specific life situations without compromising the veil.

**Two paths:**
1. **Custom Mode** — User enters their own context variables
2. **Preset Templates** — Connection, Crossroads, Manifestation, Cross-Section

**Critical policy:** NOW-only readings. State vectors, not event predictions.

---

### FR13: The Ariadne Thread (Recursive Diagnostic) ⭐ LARGE
**Status:** Spec complete → `Canon Candidates/Life_Domain_Spreads_Proposal_v2.md` (Part V)

Recursive diagnostic mode that traces imbalance chains. Follow the correction path until loop closes or user stops.

**Rename consideration:** Chris may want to rename "Ariadne Thread" — awaiting decision.

---

### FR10: Nowism Section (Philosophical Lens) ⭐ LARGE/EXPLORE
**Status:** Concept - needs design

Add a "Nowism" section distinct from "Words to the Whys" that frames the reading through present-moment philosophy. No trajectory, no purpose-seeking — just what IS.

---

### FR9: Back/Forward Navigation in Hotlink Popups ⭐ LOW
**Status:** Ready for implementation

Add back/forward navigation buttons to hotlink definition popups for traversing chains.

---

### Previous Feature Requests (Parking Lot)

- FR1: Section headers clickable with definition popups
- FR2: Core framework terms in popups should be clickable with definitions
- FR3: Post-processing validation for correction accuracy
- FR4: Regenerate button for individual sections if AI deviates
- FR5: Superseded by FR8
- FR6: Persona presets should cascade to set stance config

---

## VOICE SYSTEM UPDATES (Parking Lot)

- Voice Translation Layer Spec v2.1 exists in `dev/VOICE_TRANSLATION_LAYER_SPEC_v2.1.md`
- Current implementation has both Persona layer AND Stance layer
- Agency slider (Witness→Creator) added to persona layer (not in original spec)
- Need to clarify: Should persona selection auto-set stance? (FR6)
- INTERPRETER VOICE presets overlap with persona - consolidation needed

---

## COMPLETED (v0.57.0) — January 11, 2026

- FR7: Growth Opportunity section for balanced cards
- FR11: Shallow depth as default view
- B5: Letter/Overview now have Shallow depth
- B6/B9: Growth partner calculation fixed for Bounds (polarity flip working)
- B7: Export now includes Growth Opportunity sections
- B8: Gestalt growth says "recurse/invest" not "rest"

---

## COMPLETED (v0.55.9)

- Voice system refactor with one-pass generation (personas baked in, not translated)
- Agency/Creator slider (1-10) added to persona layer
- Preview sentence generation for voice settings
- Persona prompts with 10-level humor/register descriptions
- B1: AI correction enforcement fixed
- B2: Rebalancer DEEP token budget increased

---

## COMPLETED (v0.51.5)

- Wall of text fix: ensureParagraphBreaks utility
- Loading animations: All depth sections consistent

---

## COMPLETED (v0.51.4)

- Words to the Whys depth buttons trigger on-demand loading
- Expansion content formatting improved
- Reflect/Forge displays responses
- Enter key submits Reflect/Forge input
- Follow-up question responses formatted
- Loading animation improved (15 dots, rotating messages)
- Hotlinks case-sensitive + bracket notation

---

## COMPLETED (Previous)

- v0.51.3: WADE/SWIM formatting, Path to Balance defaults, Architecture line breaks
- v0.51.2: Depth buttons trigger API calls, SURFACE removed
- v0.51.1: Content validation
- v0.51.0: Progressive depth generation architecture
