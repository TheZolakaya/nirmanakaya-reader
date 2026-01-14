# Nirmanakaya Reader - Backlog

Last updated: 2026-01-14 (v0.67.0)

---

## SOCIAL & COMMUNITY (New - Jan 2026)

### FR18: Profile Pages ⭐ HIGH (Foundation for other social features)
**Status:** IN PROGRESS (v0.67.0)

User profile pages at `/profile/[userId]`

**Features:**
- Display name (editable)
- Custom avatar (upload OR pick from presets)
- Default to Google avatar if OAuth
- Bio/about section (optional)
- Public readings list
- Discussion post history
- Achievement badges display

**Dependencies:** None - this is the foundation

---

### FR19: Custom Avatars ⭐ MEDIUM
**Status:** Design ready

**Options:**
- Upload custom image (Supabase Storage)
- Pick from preset icons (themed to system - archetypes, channels)
- Default to Google profile pic if OAuth

**Dependencies:** FR18 (Profile Pages)

---

### FR20: Achievement/Badge System ⭐ LARGE
**Status:** Concept - needs design

Gamification with meaningful achievements tied to the architecture.

**Achievement Categories:**

*Card Collection:*
- "Mind Reader" - Drew all 5 Mind House archetypes
- "Channel Surfer" - Drew cards from all 4 channels in one reading
- "Major Completionist" - Drew all 21 Archetypes (over time)
- "Bound Master" - Drew all 40 Bounds
- "Agent Academy" - Drew all 16 Agents

*Status Achievements:*
- "Perfectly Balanced" - Got all Balanced cards in a reading
- "Shadow Work" - Got an Unacknowledged card and explored it to Deep
- "Course Corrector" - Followed a rebalancer path

*Mode/Spread Achievements:*
- "Full Spectrum" - Used all 4 modes
- "Deep Diver" - Went to Deep depth on every section
- "Thread Weaver" - Did Reflect AND Forge threads on same reading
- "Question Master" - Asked 10 follow-up questions

*Learning Achievements:*
- "Scholar" / "Student of the Deck" - Viewed learning popup on all 77 cards
- "Architecture Nerd" - Viewed Architecture panel on 20+ cards
- "Mirror Gazer" - Read The Mirror on 10 readings
- "Why Seeker" - Explored Words to the Whys to Deep 5 times
- "Example Collector" - Hit Example expansion on 25 cards

*Social Achievements:*
- "First Words" - Posted first discussion
- "Community Builder" - Got 5 replies on a post
- "Generous Reader" - Shared 5 readings publicly

**Implementation:**
- Database table for user achievements
- Achievement checking logic on reading complete
- Badge display on profiles
- Mini-badges next to names in Hub

**Dependencies:** FR18 (Profile Pages)

---

### FR21: Embed Readings/Cards in Discussions ⭐ MEDIUM
**Status:** Concept

Allow users to embed a reading or specific card into a Hub discussion post.

**Features:**
- "Attach Reading" button when creating discussion
- Select from your saved readings
- Renders as expandable card in the post
- Also allow embedding single card for discussion

**Use case:** "Hey everyone, got this wild draw, what do you think?"

**Dependencies:** Hub (exists), Saved readings (exists)

---

### FR22: Simple Inbox Messaging ⭐ MEDIUM
**Status:** Concept

Async messaging between users (NOT real-time IM).

**Features:**
- Inbox page at `/inbox`
- "Send message" button on profile pages
- Notification indicator in avatar menu
- Read/unread status
- Simple threaded replies

**Why not real-time:**
- No WebSocket complexity
- Works like old-school forum PMs
- Simpler to build and maintain

**Dependencies:** FR18 (Profile Pages)

---

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

### FR13: The Ariadne Thread (Recursive Diagnostic) ⭐ LARGE 🔥 MAJOR
**Status:** Design evolved - Jan 2026

Recursive diagnostic that traces imbalance chains through the architecture. Name confirmed: ARIADNE THREAD (keeper!)

**The Core Insight:**
In a full 22-card reading, you can trace WHY a card is imbalanced by following positions:
- Too Much Chariot in Fool position → look at Chariot position
- Find Unacknowledged Lovers there → look at Lovers position
- Find Too Little Fool there → LOOP BACK TO START

The chain either LOOPS (circular systemic pattern) or TERMINATES (transient in home position = root).

**Integration Approach (NEW):**
NOT a separate mode - integrates INTO existing readings alongside Reflect/Forge:

1. User sees imbalanced card in their reading
2. Clicks **Ariadne** button (new thread type)
3. System checks: Is that transient's home position already pulled?
   - YES → Show connection immediately
   - NO → Pull new card for that position
4. Continue tracing until LOOP or TERMINUS
5. Visual sub-window shows chain building in real-time
6. ROOT CAUSE section appears when pattern completes

**Visual Display:**
```
┌─────────────────────────────────────┐
│         ARIADNE THREAD              │
│  ┌─────┐    ┌─────┐    ┌─────┐     │
│  │Fool │ ←─ │Char.│ ←─ │Lover│     │
│  │TooLi│    │TooMu│    │Unack│     │
│  └──┬──┘    └─────┘    └─────┘     │
│     └─────── LOOP ─────────┘       │
├─────────────────────────────────────┤
│ ROOT CAUSE: [AI-generated insight] │
└─────────────────────────────────────┘
```

**Why This Matters:**
- Transforms readings from descriptive to DIAGNOSTIC
- Automates what only "maestros" could do manually
- Shows interconnected patterns, not isolated cards
- Finds the MINOTAUR (root cause) in the labyrinth

**Spec:** `Canon Candidates/Life_Domain_Spreads_Proposal_v2.md` (Part V)

---

### FR23: Mini Pentagram Position Indicator ⭐ MEDIUM 🔥 VISUAL
**Status:** Concept - Jan 2026

**Tagline:** "What if consciousness had a shape?"

Each card in a reading displays a mini pentagram showing its HOME POSITION in the architecture.

**Features:**
- Small pentagram icon on each card
- Home position lights up (which house/location)
- Wheel (top) and World (bottom) positions marked
- Soul/Gestalt center indicated

**Ariadne Integration:**
When doing stack traces, the mini map DRAWS LINES between connected positions:
- Visual learners SEE the shape of their issue
- Connections animate as the thread traces
- The geometry teaches the system while you use it

**Weight Hierarchy (for interpretation emphasis):**
- Soul House Majors > Other Majors > Minors
- Wheel/World positions carry special significance
- Cards in houses ruled by Soul positions show "fold-in" dynamics

**Why This Matters:**
- Makes the architecture VISIBLE, not just conceptual
- Teaches users the system through interaction
- Transforms abstract readings into spatial understanding
- "You're not just reading cards - you're mapping the geometry of your psyche"

**Reference:** Full 22-card pentagram map (see image in conversation Jan 2026)

---

### FR24: Interpretation Weight Hierarchy ⭐ MEDIUM 🧠 THEORY→PRACTICE
**Status:** Concept - needs integration design

Even in small readings (1-7 cards), the FULL architecture's significance rules should inform interpretation weight.

**Hierarchy (most to least significant):**
1. **Wheel (10) / World (21)** positions - apex observer & foundation
2. **Soul House Majors** (Fool, Magician, etc.) - governors/rulers of the whole system
3. **Other Majors** - archetypal weight
4. **Minors** (Bounds/Agents) - supporting signatures

**Ruler Dynamics:**
- When a card lands in a position, check: what RULES that position?
- Cards in houses ruled by Soul House positions show what's "folding into" that governor
- Example: If something lands in a Mind House position, and that position is ruled by a Soul House archetype, the interpretation should note the cascade

**Home Position Resonance:**
- When a transient lands in/near its home position = amplified significance
- When a transient is far from home = displacement/projection dynamics

**Integration Challenge:**
How do we bake this into current smaller readings without overwhelming users?
- AI prompt adjustments to weight interpretations?
- Visual indicators of significance level?
- Separate "Architecture Weight" section?

**Goal:** Even a 1-card reading should whisper the full architecture's wisdom.

---

### FR25: Reading Analytics & Charts ⭐ MEDIUM 📊 DATA
**Status:** Concept - Jan 2026

Personal analytics dashboard showing patterns across your reading history.

**Data Points to Track:**
- Card frequency (how often you draw each card)
- Status distribution (% Balanced vs imbalanced over time)
- Mode usage (Reflect vs Discover vs Forge vs Explore)
- Spread type preferences
- Time patterns (when you read most)

**Visualization Ideas:**
- "Your Most Drawn Cards" - ranked list with frequency
- "Status Trends" - line chart over time
- "Card Heatmap" - visual of all 77 cards showing draw frequency
- "Channel Balance" - pie chart of Intent/Cognition/Resonance/Structure
- "House Activity" - which houses dominate your readings

**Achievement Integration:**
- Charts feed into achievement system
- "You've drawn Emperor 15 times - most of any card"
- "Your readings lean 60% Reflect - try Forge!"

**Profile Integration:**
- Optional public display on profile
- "See their reading patterns"
- Discussion starter: "Anyone else drawing Tower constantly?"

**Why This Matters:**
- Systemic patterns become visible
- Users can identify recurring themes
- Gamification hook - users want to "complete" their chart
- Discussion fodder - "Why am I always in Too Little?"

**Dependencies:** FR18 (Profile Pages), existing readings table

---

### FR26: Nirmanapedia (Community-Managed Corpus) ⭐ LARGE 📚 COMMUNITY
**Status:** Concept - Jan 2026

Community-driven documentation and knowledge base for the system.

**Core Features:**
- User-submitted definitions and clarifications
- Card renaming suggestions (with voting?)
- Documentation rewrites and improvements
- Examples and use cases from real readings
- Moderation/approval workflow

**Content Types:**
- **Card Annotations** - Add notes/examples to any card
- **Definition Proposals** - Suggest clearer definitions for terms
- **Usage Examples** - "Here's how Emperor manifested in my reading"
- **Corrections/Clarifications** - Point out inconsistencies or errors
- **New Connections** - "Did you know Lovers and Tower share..."

**Workflow Ideas:**
- Submit → Review → Approve/Reject/Edit
- Community voting on changes?
- Version history (track definition evolution)
- Attribution (contributor credit)

**Integration Points:**
- Hotlinks could pull from community definitions
- Learning popups show community examples
- Profile badges for contributors
- "This definition contributed by @user"

**Why This Matters:**
- Distributes corpus maintenance workload
- Creates ownership and investment
- Collective intelligence improves the system
- Users become teachers
- Living documentation that evolves

**Moderation Concerns:**
- Who approves changes?
- How to handle conflicting definitions?
- Quality control without bottlenecking?
- Canon vs community interpretation distinction?

**Dependencies:** FR18 (Profile Pages), FR20 (Achievements for contributors)

---

### FR27: Admin Dashboard & Usage Controls ⭐ HIGH 🔧 OPERATIONS
**Status:** Concept - Jan 2026

Admin site for monitoring usage, costs, and user management.

**Usage Monitoring:**
- Total token usage (daily/weekly/monthly)
- Per-user token consumption
- Cost tracking (estimated API spend)
- Top users by usage
- Usage trends over time

**User Controls:**
- View all users and their stats
- Set per-user token caps (daily/monthly)
- Throttle specific users (rate limiting)
- Disable/enable accounts
- Usage alerts (notify when user hits threshold)

**Tier System (Future):**
- Free tier: X tokens/month
- Premium tier: Higher limits
- Admin override for special cases

**Dashboard Views:**
- Overview: Total users, total tokens, estimated cost
- User list: Sortable by usage, join date, last active
- Individual user: Full usage history, readings count
- Alerts: Users approaching limits

**Security:**
- Admin-only access (check user role in profiles table)
- Audit log of admin actions
- Protected routes

**Existing Data:**
- `readings` table already has: input_tokens, output_tokens, estimated_cost
- Just need aggregation queries and UI

**Route:** `/admin/dashboard` (expand existing `/admin`)

**Dependencies:** None - can build on existing data

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
