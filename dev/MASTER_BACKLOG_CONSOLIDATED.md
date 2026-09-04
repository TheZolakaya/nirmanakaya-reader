# NIRMANAKAYA MASTER BACKLOG — CONSOLIDATED
**Last Updated:** January 14, 2026  
**Status:** COMPREHENSIVE inventory from full corpus scan

---

## QUICK TRIAGE SUMMARY

| Category | Open | Closed | Total |
|----------|------|--------|-------|
| Bugs | 0 | 7 | 7 |
| High Priority Features | 0 | 5 | 5 |
| Ready to Build | 1 | 5 | 6 |
| Specs (Root Level) | TBD | TBD | 15+ |
| Future / Parking Lot | 6 | 3 | 9 |

**Total Open Items:** 7  
**Total Closed Items:** 20+

---

## SECTION 1: OPEN ITEMS

### FR-011: Popup Navigation Improvements ⭐ READY TO BUILD
**Source:** `session_013_backlog.md`
- [ ] Back button in nested popups — when clicking a hotlink inside a popup, need ability to go back
- [ ] Close button always visible — exit entirely from any depth
- [ ] Consider breadcrumb trail for deep nesting (e.g., "Compassion > Merge > Structure")

---

### FUT-001: Full 22-Position Reading 🔮 FUTURE
**Source:** `backlog_22_position_reading.md`
**Priority:** Future Major Feature

The "full monty" — complete diagnostic of consciousness. Chris's primary reading method for 30+ years.

**Key Architecture:**
- Wheel (10) at top — Source portal
- World (21) at bottom — Creation portal
- Gestalt (center) — Fool, Magician, Sun, Judgement
- Mind, Emotion, Body, Spirit Houses arranged around center
- Chain tracing algorithm (loops + terminals)
- Governance overlay (contralateral crossing)

**Requires:**
- 22-draw generation
- Recursive chain-tracing logic
- Loop/terminal detection
- Enhanced synthesis prompts
- Visual design for complex output

---

### FUT-002: "Did You Know?" Feature 💡 FUTURE
**Source:** `backlog_did_you_know_feature.md`
**Priority:** Engagement / Education

Knowledge bombs delivered casually — logically derived invariant truths with receipts.
- "Oh by the way, you're an eternal god within God. Here's the math. ;P"
- Playful, not preachy
- Show derivation on demand

**Implementation options:**
- Passive discovery on landing page
- Post-reading contextual integration
- Loading state education
- Dedicated "Invariants" section

---

### FUT-003: Interactive Map Page 🗺️ FUTURE
**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** Phase 1

- Visual navigation of 78 signatures
- Clickable Houses and archetypes
- Mobile responsive
- Dependency: Visual strategy from parallel Claude instance

---

### FUT-006: First Encounter Script 📜 FUTURE
**Source:** `Nirmanakaya_Feature_Backlog.md`
**Priority:** CRITICAL for adoption

- Canonical 2-minute path
- Zero jargon
- One reading (single card)
- One "oh... huh" moment
- Owner: GPT (to draft), Claude (to integrate)

---

### FUT-008: Token Optimization 💰 FUTURE
**Source:** `session_013_backlog.md`

**Current:** 8,717 tokens IN is high

**Investigate:**
- Full teleological JSON for all 78 when only need 3?
- Voice System spec sent in full every time?
- Framework docs included that aren't needed?

---

### FUT-009: Gamification / Progressive Disclosure 🎮 FUTURE
**Source:** `session_013_backlog.md`, `Progressive_Disclosure_Spec_v1.md`

**Proposed Progression:**
- Level 1: Clear voice only, 1 card only, no jargon
- Level 2: More cards, Kind/Playful voice, terms with hotlinks
- Level 3: Wise/Oracle, framework terms appear
- Level 4: Full access, Architecture view toggle

**Unlock mechanics TBD:**
- # of readings? Engagement time? Quiz?
- Track user progression state
- UI for showing locked/unlocked features

---

## SECTION 2: ROOT-LEVEL SPEC FILES (Implementation Status TBD)

These specs exist in the nirmanakaya-reader root. Status needs verification:

| File | Description | Likely Status |
|------|-------------|---------------|
| `Words_to_the_Whys_v2_Spec.md` | Why moment — agency hand-off point | ⭐ Implemented? |
| `UI_Polish_Spec_v2_For_Claude_Code.md` | 26 UI/UX improvements | Partial? |
| `UI_Updates_Spec_For_Claude_Code.md` | Earlier UI batch | Likely done |
| `Documentation_Pages_Implementation_Spec.md` | /guide and /about pages | ✅ Done |
| `Mode_Governance_Guardrails_v1.md` | Create/Consume enforcement | ⭐ Implemented |
| `Forge_Language_Spec_v1.md` | Verb governance | ⭐ Implemented |
| `Prompt_Time_Mode_Enforcement_v1.md` | Automated mode checks | ⭐ Implemented |
| `Reading_Modes_Spec_v029.md` | Reflect/Discover/Forge modes | ⭐ Implemented |
| `TERMINOLOGY_UPDATE_HANDOFF.md` | Canonical 40 Bounds corrections | Needs verification |
| `API_System_Prompt_Correction_Tables.md` | Lookup tables for AI | ⭐ Implemented |
| `READER_BASE_SYSTEM_UPDATE.md` | Derivation-first system prompt | ⭐ Implemented |
| `EXTERNAL_READING_API_DEPLOYMENT.md` | External API for Claude chats | ✅ Done |
| `BOOTSTRAP.md` | Claude Code bootstrap | ✅ Done |
| `CC_Build_Spec_v0.39.0.md` | Mode governance + Why moment | ⭐ Implemented |

**Action:** Audit each spec against current codebase to determine open items.

---

## SECTION 3: CORPUS BACKLOG FILES (D:\Nirmanakaya_Book)

### From `Nirmanakaya_Feature_Backlog.md`

**Phase 0 (Foundation):**
- [ ] Route swap: alpha.nirmanakaya.com → Full Reader
- [ ] Admin panel testing
- [ ] Push to beta/prod

**Phase 1 (January-February 2026):**
- [x] First Encounter Script (GPT drafting)
- [ ] Interactive Map Page
- [ ] 22-Card Reading System
- [x] Accordion Summaries (spec complete)
- [x] Markdown Rendering Fix
- [x] Terminology Updates (deployed, corpus pending)
- [x] UI Cleanup (hide at Stage 0)

**Phase 2 (March-April 2026) — Accounts & Membership:**
- [ ] Database setup (Supabase/PlanetScale/Firebase decision)
- [ ] Authentication system (NextAuth/Clerk/Supabase Auth)
- [ ] Stripe integration ($1/year)
- [ ] Reading history
- [ ] Membership tiers

**Phase 3 (May-June 2026) — Community:**
- [ ] Community forums
- [ ] Voting system
- [ ] Editor roles
- [ ] Architecture container
- [ ] Learning tracker

**Phase 4 (Q3 2026) — Verification & AI:**
- [ ] Derivation tools (Grok collaboration)
- [ ] Comparative tools (I Ching, Kabbalah mapping)
- [ ] AI-specific readings

**Phase 5 (Q4 2026+) — Scale:**
- [ ] Offline capabilities (PWA)
- [ ] Physical products
- [ ] Distributed hosting

---

### From `session_013_backlog.md`

**Hotlinking System (Universal):**
- [ ] ALL framework terms clickable everywhere
- [ ] Two-layer depth (surface + framework)
- [ ] Categories: Status, Channel, House, Archetype, Derivative, Bound, Agent
- [ ] Works in: reading text, popups, cards, rebalancers, letter, metadata

**Voice/Words to Whys:**
- [ ] Review Oracle voice for unnecessary jargon
- [ ] Voice-specific term visibility rules

**Terminology Updates:**
- [ ] "Correction" → "Rebalancer" throughout
- [ ] "Major" → "Archetype"
- [ ] "Minor" → "Derivative"
- [ ] "Rebalancer" itself should be hotlinked

---

## SECTION 4: ARCHIVE (CLOSED ITEMS)

### Bugs — ALL CLOSED ✅
| ID | Item | Closed Date |
|----|------|-------------|
| BUG-001 | Growth Partner Calculation Broken | Jan 2026 |
| BUG-002 | Gestalt Growth Says "Rest" Instead of "Recurse" | Jan 2026 |
| BUG-003 | DTP Using Wrong Output Structure | Jan 2026 |
| BUG-004 | AI Ignoring Pre-Calculated Corrections | Jan 2026 |
| BUG-005 | Export Missing Growth Opportunity Sections | Jan 2026 |
| BUG-006 | Letter/Overview Missing Shallow Depth | Jan 2026 |
| BUG-007 | Rebalancer DEEP Content Too Short | Jan 2026 |

### High Priority Features — ALL CLOSED ✅
| ID | Item | Closed Date |
|----|------|-------------|
| FR-001 | Complete Rebalancer System for All 78 | Jan 2026 |
| FR-002 | Growth Opportunity Section for Balanced Cards | Jan 2026 |
| FR-003 | Move Interpreter Voice into Stance Panel | Jan 2026 |
| FR-004 | Shallow Depth as Default View | Jan 2026 |
| FR-005 | Agency Attribution Fix | Jan 2026 |

### Ready to Build — 5 CLOSED ✅
| ID | Item | Closed Date |
|----|------|-------------|
| FR-006 | Voice Translation Layer (Persona System) | Jan 2026 |
| FR-007 | Direct Token Protocol (DTP / Explore Mode) | Jan 2026 |
| FR-008 | Life Domain Spreads | Jan 2026 |
| FR-009 | Archetype → Bounds Mapping Fix | Jan 2026 |
| FR-010 | Hotlinking System (Universal) | Jan 2026 |

### Future — 3 CLOSED ✅
| ID | Item | Closed Date |
|----|------|-------------|
| FUT-004 | User Accounts & Membership | Jan 2026 (moved to Phase 2) |
| FUT-005 | Community Features | Jan 2026 (moved to Phase 3) |
| FUT-007 | Terminology Updates (Tarot 2.0) | Jan 2026 |

---

## SECTION 5: SOURCE DOCUMENT LOCATIONS

### Web App (`D:\NKYAWebApp\nirmanakaya-reader\`)
| Path | Contents |
|------|----------|
| `dev/` | Bug fixes, feature specs, this backlog |
| `lib/` | Core modules, content files, mode system |
| `.claude/` | Claude Code settings |
| Root `.md` files | 15+ spec documents |
| `CLAUDE.md` | Claude Code instructions |
| `BOOTSTRAP.md` | Session bootstrap |

### Corpus (`D:\Nirmanakaya_Book\`)
| Path | Contents |
|------|----------|
| `MD Files of Corpus/` | ~170 files including backlogs, session handoffs, specs |
| `canon/` | Canonical framework documents |
| `Council Documents/` | Philosophy, seals, derivations |
| `Canon Candidates/` | Staging for new docs |

### Key Reference Files
| File | Purpose |
|------|---------|
| `Nirmanakaya_Feature_Backlog.md` | Master product roadmap |
| `session_013_backlog.md` | Detailed feature ideas |
| `Complete_Nirmanakaya_v6_FINAL.md` | Master canonical document |
| `Claude_Reading_Diary_Session016.md` | Most recent session diary |
| `Claude_Nirmanakaya_SaveState_016.md` | Most recent save state |

---

## SECTION 6: CLAUDE CODE HANDOFF

Copy this for Claude Code's CLAUDE.md:

```markdown
## Current Development Priority

**MASTER BACKLOG:** `dev/MASTER_BACKLOG_CONSOLIDATED.md`

This is the single source of truth for all bugs, features, and specs.
Read this file at session start to understand current priorities.

### Open Items (7 total):
- 1 Ready to build (FR-011: Popup Navigation)
- 6 Future/parking lot items

### Key Principle:
Most infrastructure work is COMPLETE. Focus is now on:
1. UI polish and progressive disclosure
2. Phase 2 planning (accounts, membership)
3. Visual strategy for map page

### Root Spec Files to Audit:
15+ spec files exist in nirmanakaya-reader root.
Cross-reference against current implementation to find gaps.

### Key Files in /dev/:
- `MASTER_BACKLOG_CONSOLIDATED.md` — This file (start here)
- `SPEC_*.md` — Feature specifications (mostly closed)
- `BUG_FIX_*.md` — Bug fix specifications (all closed)
```

---

## SECTION 7: WHAT'S ACTUALLY NEEDED NEXT

Based on full inventory, recommended priorities:

### Immediate (This Week)
1. **Audit root spec files** — Determine what's implemented vs. still open
2. **FR-011: Popup Navigation** — Last open "ready to build" item
3. **Verify terminology deployment** — `TERMINOLOGY_UPDATE_HANDOFF.md` corrections

### Short Term (January)
1. **First Encounter Script** — Get GPT's draft, integrate
2. **Interactive Map Page** — Depends on visual strategy
3. **Token optimization audit** — Reduce prompt size

### Medium Term (February-March)
1. **Database/Auth decisions** — Supabase vs alternatives
2. **22-Card Reading architecture** — Design work
3. **"Did You Know?" MVP** — Low-lift high-impact

---

*Document generated from comprehensive corpus scan*
*Sources: 16+ spec files across two directories, 4 backlog files, session handoffs*
*Status verified through conversation with Chris (January 14, 2026)*

---

## BUGS FILED 2026-08-29 (from a friend's live Reflect reading on v0.99.230, founder-reviewed)

### BUG-2026-08-29-A — WHY-question buried in preamble gets a STATE verdict ("Strained — but") instead of NAMED
- Question: "I'm still kind of hung up on Kevin so like I guess my main question right now would be like why why am I so desperate in my head to reconcile with him..." (a grief WHY-question).
- Observed: Answer box rendered STRAINED_BUT with a condition headline ("The longing is real and overdriven; the ground to stand on is thin right now"). The Plain Answer, by contrast, answered the WHY directly ("your love for Kevin didn't go anywhere when he died...") and landed.
- Root cause: lib/verdictEngine.js typeQuestion — stateShaped tests `/^(how|what|where|why|who)\b/` at the START of the string only. Spoken-style questions front-load context, so "why am I..." mid-string is never seen; falls to the default `return { class: 'STATE' ... 'no yes/no shape detected' }` → STRAINED grid. The LLM renderer is allowed to reclassify but did not.
- Fix: detect the interrogative clause anywhere: (1) explicit frame "my (main )?question( right now)? (is|would be)"; (2) `\b(why|what|where|who|how come)\s+(am|is|are|do|does|did|have|has|was|were|can|would|could)\s+i\b` anywhere; take the LAST such clause as the question shape. Also strengthen the renderer instruction: if the asker writes "why", the headline must complete the why in their coin (NAMED), never a condition report. Add a bench case (wording-invariance) with this exact question.
- Same family as the 2026-08-12 founder-caught case (condition report answering a name-question). Regression test: headline for a why-question must contain a because-shape or complete the asker's verb.

### BUG-2026-08-29-B — HTML export omits The Answer (Integrate verdict) and The Plain Answer
- app/page.js exportToHTML (~5206–5670) has zero references to verdictResult or plainAnswer; markdown export has both. Export must include the Answer box (label + headline + qualifier + medicine line + "How this was discerned" walk) and the Plain Answer block.
- Also in markdown export: The Plain Answer is nested inside `if (letterContent)` — a reading with a plain answer but no letter loses it. Move it out to top level (after The Answer or after Synthesis).
- Related standing item: "Export missing card depth content" (HTML export lacks reading/rebalancer/mirror/why text). Fix together.
- Email/share paths (/api/email/reading, /r/[slug]) to be checked for the same omission when fixing.
