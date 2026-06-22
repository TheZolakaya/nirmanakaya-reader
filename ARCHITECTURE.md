# Nirmanakaya Reader — Complete Architecture Reference

**Version:** 0.99.139
**Last Updated:** 2026-06-22 (full refresh from v0.74.12 / 2026-01-23 — see Changelog at bottom)

> **Note:** Keep this document updated when making architectural changes. Claude Code references this for debugging. This is the canonical code-structural overview for the Reader app. The visualization layer has its own detailed companion set under `codemap/` (see Documentation Map below).

This document is a comprehensive technical overview of the Nirmanakaya Reader codebase, with emphasis on how readings are generated and prompts are built.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Documentation Map](#documentation-map)
3. [Tech Stack](#tech-stack)
4. [The 78-Signature System](#the-78-signature-system)
5. [Status & Correction System](#status--correction-system)
6. [Postures (Reading Stances)](#postures-reading-stances)
7. [User Levels & Progressive Disclosure](#user-levels--progressive-disclosure)
8. [Prompt Building System](#prompt-building-system)
9. [Voice System (personas.js)](#voice-system)
10. [The Computation Engine](#the-computation-engine)
11. [API Routes](#api-routes)
12. [Data Layer (Supabase)](#data-layer-supabase)
13. [Visualization Layer](#visualization-layer)
14. [Components](#components)
15. [Key Files Reference](#key-files-reference)
16. [Changelog](#changelog)

---

## System Overview

Nirmanakaya Reader is a **consciousness navigation system** (not a fortune teller). It generates AI-interpreted readings using a 78-signature system built on archetypal patterns, channels, houses, and mathematical correction relationships.

### Core Principle
> "You are a creator. You have meaning. You're eternal. Love solves everything."

The system treats users as **creators within the Creator** — navigation assistance, not prophecy.

Two layers do the work:
- A **deterministic structural engine** (`lib/mapAnalysis.js` and friends) — no AI, no API calls. Given draws, it computes status, rebalancers, horizon balance, portal states, trace loops, house/gestalt conditions.
- An **AI interpretation layer** (`lib/prompts.js` + `lib/promptBuilder.js` + `lib/drawForAI.js`) that turns that structure into prose, with strict grammar and terminology rules.

---

## Documentation Map

Where the code-structural docs live and which are current. **When you change architecture, update the matching doc here.**

### Current (authoritative)
- **ARCHITECTURE.md** (this file) — the reading engine, data model, routes, stack. The front door.
- **codemap/CODE_MAP_Visualization_MASTER.md** — visualization layer master (2026-06-12). *See correction note in that file re: Three.js.*
- **codemap/CODEMAP_A_Routes_Rendering.md** — viz routes & SVG/4D rendering detail.
- **codemap/CODEMAP_B_Data_Engine.md** — how the 78 data + computation engine feed the views.
- **codemap/CODEMAP_C_Components_Reuse.md** — viz component reuse seams.
- **codemap/VISUALIZATION_TOOLKIT_SPEC.md** — design spec for the composable node/layout viz layer.
- **CLAUDE.md / BOOTSTRAP.md / README.md** — setup & project orientation.
- **COVENANT.md / LICENSE.md** — licensing (AGPL-3.0 code, CC BY-NC-SA 4.0 data).

### Deprecated (kept for history; do not build from these)
- **CLAUDE_CODE_PROMPT_v0.30.7.md** — early prompt spec, ~70 versions stale.
- **Reading_Modes_Spec_v029.md** — superseded by the posture system (`lib/postures.js`) and `Mode_Governance_Guardrails_v1.md`.

### Implementation specs / handoffs (historical once shipped — not architecture)
Files like `CC_Build_Spec_*`, `CC_Spec_16_Royal_Voice_Presets.md`, `*_HANDOFF.md`, `Words_to_the_Whys_v2_Spec.md`, `Mode_Governance_Guardrails_v1.md`, `Forge_Language_Spec_v1.md`, `Glistener_Implementation_Code.md`, `IMAGE_GENERATION_SPEC.md`, `EXTERNAL_READING_API_DEPLOYMENT.md`. These describe features that are now built; the code is the source of truth. They are working history, not deprecated docs — leave in place unless Chris says otherwise. (`EXTERNAL_READING_API_DEPLOYMENT.md` documents the live `/api/external-reading` route and is still relevant.)

---

## Tech Stack

**Source:** `package.json`

- **Next.js 14.2** (App Router) + **React 18.2**
- **@anthropic-ai/sdk 0.71** — Claude API
- **@supabase/supabase-js 2.90** + **@supabase/ssr 0.8** — Postgres, auth, RLS
- **framer-motion 11** — animation (the workhorse for most motion)
- **three 0.161** + **@react-three/fiber / drei / postprocessing** — WebGL, used in exactly one place today: `components/viz/SealCanvas.js` (the `/seal` morph). Everything else is SVG/DOM.
- **tailwindcss 3.4**, **react-markdown 10** + **remark-gfm**, **resend 6** (email), **jimp** (image processing)

**Notable script:** `npm run build:wiki` (`scripts/build-wiki.js`) — rebuilds the Quartz wiki from `D:\Nirmanakaya_Wiki\quartz\content\` into `public/wiki/`.

---

## The 78-Signature System

**Source:** `lib/archetypes.js` (529 lines) + `lib/constants.js` (437 lines)

### Three signature types

| Type | Count | ID Range | Role | P/R class |
|------|-------|----------|------|-----------|
| **Archetypes** | 22 | 0–21 | Major signatures (verbs) | Recursion |
| **Bounds** | 40 | 22–61 | Channel pips (nouns) | Polarity |
| **Agents** | 16 | 62–77 | Royals (gerunds) | Collapse |

> Terminology: these are **signatures**, never "cards." Use "emerges/surfaces," never "you drew." Never mention tarot unless the user does.

### Archetypes — Houses & Channels

```
HOUSES (6):
├── Gestalt  → Potential(0), Will(1), Actualization(19), Awareness(20)
├── Spirit   → Wisdom(2), Nurturing(3), Inspiration(17), Imagination(18)
├── Mind     → Order(4), Culture(5), Abstraction(15), Breakthrough(16)
├── Emotion  → Compassion(6), Drive(7), Change(13), Balance(14)
├── Body     → Fortitude(8), Discipline(9), Equity(11), Sacrifice(12)
└── Portal   → Source(10) = Ingress, Creation(21) = Egress

CHANNELS (4):
├── Intent    (Fire / Wands)     → directed will, action
├── Cognition (Air / Swords)     → mental clarity
├── Resonance (Water / Cups)     → emotional attunement
└── Structure (Earth / Pentacles)→ material form
```

Each archetype carries `name` (canonical), `traditional` (tarot ref — never used in prose), `house`, `channel`, `function` (Seed/Medium/Fruition/Feedback/Ingress/Egress), `description`, `extended`, and a `states` object with four transient portraits (balanced / tooMuch / tooLittle / unacknowledged).

### Bounds — 10 pips × 4 channels (IDs 22–61)
Each bound has `number` (1–10), `channel`, parent `archetype`, `horizon` (inner/outer), `wheelWorld`, `scale` (formative/operative/completive), `numberHouse`, `numberKeyword`. **Bounds are nouns** (boundary conditions) — the Verb Shift does not apply to them.

### Agents — 4 roles × 4 channels (IDs 62–77)
Roles: **Initiate** (Page), **Catalyst** (Knight), **Steward** (Queen), **Executor** (King). Each has channel, parent archetype, traditional name, horizon, and a nickname (e.g. "The Judge" = King of Swords). **Agents always represent the querent's own consciousness, never external people.**

### Group structures (`lib/constants.js`)
- **Being groups:** Mantle, Kindle, Vessel, Passage
- **Identity groups:** Composure, Conviction, Exploration, Intimacy

> Current nomenclature is locked: **Kindle / Passage / Intimacy / Underlie** (formerly Torch / Clearing / Communion / Mantle-Create).

---

## Status & Correction System

**Source:** `lib/constants.js`, `lib/corrections.js` (569 lines)

### The four statuses

| Status | ID | Temporal frame | Meaning | Correction geometry |
|--------|----|----|---------|---------------------|
| Balanced | 1 | Now-aligned | Authentic expression | Growth (transpose) |
| Too Much | 2 | Future-projected | Over-expressing | Diagonal |
| Too Little | 3 | Past-anchored | Under-expressing | Vertical |
| Unacknowledged | 4 | Shadow | Operating without awareness | Reduction |

### Correction logic
`getFullCorrection(transientId, status)` routes by signature class to `getArchetypeCorrection` / `getBoundCorrection` / `getAgentCorrection`. Corrections are **pre-derived lookup tables**, not formulas:

- **GROWTH_PAIRS** — balanced → growth direction (null for Gestalt/Portal)
- **DIAGONAL_PAIRS** — too much → polarity flip (e.g. Potential 0 → Actualization 19)
- **VERTICAL_PAIRS** — too little → same archetype, other scale
- **REDUCTION_PAIRS** — unacknowledged → generating source (null for Gestalt/Portal)
- **BOUND_GROWTH_TARGETS** / **AGENT_{GROWTH,DIAGONAL,VERTICAL}_TARGETS** — bound/agent variants (agents = archetype correction + role flip)

Canonical correction tables also mirrored in `lib/CANONICAL_78_CORRECTIONS.md`, `lib/CANONICAL_BOUND_CORRECTIONS.md`, `lib/BOUND_CORRECTIONS_LOOKUP.md`.

---

## Postures (Reading Stances)

**Source:** `lib/postures.js` (212), `lib/posturePrompts.js` (105). *Legacy: `lib/modes.js` (134) + `lib/modePrompts.js` (81) retained for back-compat.*

The four postures map to the 4-stage process cycle:

| Posture | Stage | Core question | Constraints |
|---------|-------|---------------|-------------|
| **Reflect** | Seed | "What is already happening?" | Witness only; no levers, no questions |
| **Discover** | Medium | "Where is authorship available?" | Name capacities, surface levers, ONE question |
| **Forge** | Fruition | "What changes when intention is asserted?" | First-person ownership, return authorship |
| **Integrate** | Feedback | "What came back? How does it connect?" | Pattern recognition, loop closure |

`buildPostureHeader(posture)` injects the preamble; `TONE_GOVERNANCE` enforces hard rules (never dramatize status, never imply severity, state plainly).

---

## User Levels & Progressive Disclosure

**Source:** `lib/promptBuilder.js`, `lib/userContext.js`

```
FIRST_CONTACT (0) → minimal prompt, Haiku, single signature
EXPLORER      (1) → full prompts, some terms
PRACTITIONER  (2) → full feature set
ARCHITECT     (3) → derivation visible
MASTER        (4) → everything unlocked
```

Level 0 uses a stripped prompt and Haiku; Level 1+ uses the full assembly and Sonnet.

---

## Prompt Building System

**Source:** `lib/promptBuilder.js` (202), `lib/prompts.js` (1152), `lib/drawForAI.js` (502)

### Assembly
`buildSystemPrompt(userLevel, options)` orders blocks: **Posture → Locus → BASE_SYSTEM → Architecture toggle → FORMAT → WHY → Voice (last, for recency)**. `buildUserMessage(question, draws, userLevel, options)` assembles the draw text (`formatDrawForAI` in `lib/utils.js`) plus teleological context (`lib/teleology-utils.js`).

### Core blocks in `prompts.js`
- **BASE_SYSTEM** — kernel metaphysics, ontology, ethos, and the mandatory rules:
  1. **No pet names** (honey, dear, love, my friend… banned)
  2. **Agents = querent's own consciousness**, never external people
  3. **Agency grammar** — signature is the grammatical subject (verb), position is context (noun), status is the adverb. Validation: if removing the signature leaves a sensible sentence, the position became the subject — rewrite.
  4. **Canonical names only** — the 78 have fixed names; never invent substitutes
  5. **Emergence language** — "Wisdom emerges," never "you drew Wisdom"
- **FORMAT_INSTRUCTIONS** / `getFormatInstructions(readingLength)` — section structure and length-adaptive word targets
- **WHY_MOMENT_PROMPT** — meaning attribution (paired with `lib/whyVector.js`)

### The reading/self-correction engine — `drawForAI.js`
- **`buildSingleReadingV9(draw)`** — **current live** single-draw self-reading ("find where you hedged honesty"). 
- `fiveHouseReading()` — five parallel draws (Mind/Emotion/Spirit/Body/Gestalt)
- `SYNTHESIS_SYSTEM` + `buildRevisionContext()` — Haiku synthesizes; Sonnet rewrites
- Legacy builders retained: `buildSingleReadingV8`, `buildFullReadingContext` (V7), `buildPrescriptionContext` (V6), `buildFiveHouseContext` (V3)

---

## Voice System

**Source:** `lib/personas.js` (312). **⚠️ The old `lib/voice.js` 6-dimension system is GONE.**

Current = **3 orthogonal dials**, emitted by `buildPersonaPrompt(persona, humor, complexity)` (placed last in the system prompt):

- **Persona** (5): friend, therapist, spiritualist, scientist, coach — each must engage the specific question, not sermonize
- **Complexity / register** (4): simple, clear, fluent, eloquent — changes *how* you speak, not *how much*
- **Humor** (1–10): Unhinged → … → Sacred (1–4 must be light; 8–10 must stay grave)

**Length** is separate (`LENGTH_CONFIGS`): brief (300–500w), standard (800–1200w), full (1500–2500w). Orthogonal to persona/complexity.

16 **Royal voice presets** are stored in Supabase (`voice_presets` table) and surfaced via the Glistener UI.

---

## The Computation Engine

Pure, deterministic, AI-free structural analysis.

- **`lib/mapAnalysis.js` (1947)** — the harness. Input: 22 or 78 draws → output: full structural analysis. Key fns: `getArchetypeStatus`, `getBoundAnalysis`, `getHorizonBalance`, `getPortalState`, `traceCirculation`, `getProcessMetadata`. Consumers: Reader cartography, RLHF signal, map viz.
- **`lib/diagnosticTools.js` (1137)** — tool-use API: diagnostic instruments the model can call for deeper investigation (horizon balance, portal state, process detail, bound diagnosis, manifest readout, correction path, signature state).
- **`lib/houseConditions.js`**, **`lib/gestaltConditions.js`** — state pattern recognition per house and system-wide.
- **`lib/neighborhoods_canon.js` (204)** — the 16 consciousness states (4×4 neighborhood grid).
- **`lib/whyVector.js` (190)** — the Why-moment algorithm (house vocabulary × status tone × portal gating).

---

## API Routes

App Router, under `app/api/`. ~40 routes total; 20 call Claude. **Only two model IDs are hardcoded today:** `claude-sonnet-4-6` (19 call sites) and `claude-haiku-4-5-20251001` (11). No Opus in routes.

> ⚠️ **Dated model snapshots retire ~yearly and 404 readings when they do.** When refreshing, sweep all `app/api/**/route.js` for `claude-*` strings. See the team's webapp-model-ID note for the fast-fix recipe.

### Reading / synthesis (Claude)
| Route | Method | Purpose | Model |
|-------|--------|---------|-------|
| `/api/reading` | POST | Core generation; First Contact + DTP | sonnet-4-6 (DTP), haiku default |
| `/api/reading/expand` | POST | Deepen an existing reading | sonnet-4-6 |
| `/api/reading/investigate` | POST | Interrogate a reading | sonnet-4-6 |
| `/api/reading/shared` | GET | Fetch shared reading by token | — |
| `/api/synthesis` | POST | Summary / Why / Path, progressive | haiku-4-5 |
| `/api/card-depth` | POST | Deep per-signature interpretation | sonnet-4-6 |
| `/api/letter` | POST | Personalized letter | haiku-4-5 |
| `/api/spread-recommend` | POST | Recommend a spread from the question | sonnet-4-6 |

### Chat & Glisten (Claude)
| Route | Method | Purpose | Model |
|-------|--------|---------|-------|
| `/api/chat` | POST | "Dear Reader" — two-pass (vanilla → drawing-guided revision) | sonnet-4-6 |
| `/api/glisten` | POST | Bones → Symbolism → Transmission → Integration → Crystal | sonnet-4-6 |
| `/api/glisten/plain` | POST | Plain-language Glisten | sonnet-4-6 |
| `/api/glisten/simplify` | POST | Simplify reading language | sonnet-4-6 |

### Collective Pulse (Claude)
`/api/collective-pulse` (GET/POST), `/api/collective-pulse/settings` (GET/PATCH), `/api/collective-pulse/voice` (GET).

### User context (Claude)
`/api/user/context` (GET, **`force-dynamic`** — the one route that opts out of edge caching), `/api/user/reading-summary` (POST), `/api/user/topic-analysis` (POST).

### Non-Claude: user data, admin, email, utility
- **User:** `/api/user/{readings,profile-context,badges,email-preferences,stats,topics}`
- **Admin:** `/api/admin/{config,stats,broadcast,delete-user,backfill-context,backfill-narratives,resend-confirmations}`
- **Email:** `/api/email-readings`, `/api/email-settings`, `/api/email/{welcome,reading,reply-notify,unsubscribe}`
- **Utility:** `/api/book-search`, `/api/external-reading` (GET/POST), `/api/feature-flags`

> ⚠️ **Vercel edge caching:** any GET route returning user-specific data needs `export const dynamic = 'force-dynamic'` and a per-request Supabase client. Currently only `/api/user/context` sets it — audit new user-specific GETs against this.

---

## Data Layer (Supabase)

**Clients:** `lib/supabase.js` (1743, browser/auth + queries), `lib/supabase-server.js` (server read-only). Schema is versioned as individual `supabase-*.sql` files at repo root (no `migrations/` folder). RLS on all tables; auth via Google OAuth + email/password.

Key tables:
- **profiles** (extends `auth.users`) — level, preferences, admin flag, token limits, email prefs, personalization toggle
- **user_readings** (unified) — draws, interpretation JSONB (letter/synthesis/cards/thread), mode, spread, token counts + cost + model, share_token
- **discussions / discussion_replies / reactions** — community hub
- **chat_rooms / chat_messages / room_members** — realtime chat
- **voice_presets** — 16 Royal voice configs
- **collective_readings / pulse_settings** — Collective Pulse
- **profile_context** — personalization facts injected into prompts

---

## Visualization Layer

Full detail in `codemap/`. Summary:

- Most views are **inline SVG + framer-motion + hand-rolled 4D math** (`/explore`, `/visualize`, `/tesseract`, `/seeds`). `/22-reader` and `/diagnostic` are DOM/CSS.
- **One WebGL view:** `/seal` via `components/viz/SealCanvas.js` (three + react-three-fiber). This is the exception to the codemap's original "no Three.js" headline.
- `/map` was removed (404).

---

## Components

**Source:** `components/` (~60 files)

- **reader/** — core reading UI (ReadingSection, DepthCard, WhyMoment, MirrorSection, Glistener, CardDetailModal, Minimap, ArchitectureBox…)
- **map/** — `MapCanvas`, `HouseGroup`, `CardNode`, `LayoutSwitcher`
- **viz/** — `SealCanvas` (WebGL), `AxisOfBecoming`, `SelflessLove`, `Derivation`
- **book/** — reader, search, annotations, ReadAloud, TextSizer
- **reading/** — Save / Share / Email buttons
- **layout/** — Header, BrandHeader, Footer, CommunityNav
- **shared/** — MarkdownRenderer, glossary tooltips, badges, theming, modals
- **auth/** — AuthModal, AuthButton

---

## Key Files Reference

Verified line counts (2026-06-22).

| File | Lines | Purpose |
|------|------:|---------|
| `lib/mapAnalysis.js` | 1947 | Deterministic structural analysis harness |
| `lib/supabase.js` | 1743 | Browser Supabase client + all queries |
| `lib/prompts.js` | 1152 | BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT |
| `lib/diagnosticTools.js` | 1137 | Tool-use diagnostic instruments |
| `lib/corrections.js` | 569 | Correction geometry + lookup tables |
| `lib/archetypes.js` | 529 | The 78 signatures (archetypes/bounds/agents) |
| `lib/constants.js` | 437 | Houses, channels, statuses, groups, governance map |
| `lib/personas.js` | 312 | Voice: 3 dials + length configs |
| `lib/teleology-utils.js` | 308 | Words-to-the-Whys grounding |
| `lib/postures.js` | 212 | Reflect/Discover/Forge/Integrate definitions |
| `lib/promptBuilder.js` | 202 | System + user prompt assembly |
| `lib/whyVector.js` | 190 | Why-moment algorithm |
| `lib/neighborhoods_canon.js` | 204 | 16 consciousness states |
| `lib/drawForAI.js` | 502 | AI self-reading (buildSingleReadingV9 + legacy) |
| `app/page.js` | ~monolith | Main Reader UI + state |

**Finding things:**
- AI prompt content → `lib/prompts.js` (+ assembly in `lib/promptBuilder.js`)
- Signature formatting for AI → `lib/utils.js:formatDrawForAI()`
- Corrections → `lib/corrections.js`
- Postures → `lib/postures.js` (legacy: `lib/modes.js`)
- Voice → `lib/personas.js`
- Structural math → `lib/mapAnalysis.js`
- Visualization → start at `codemap/CODE_MAP_Visualization_MASTER.md`

---

## Changelog

**2026-06-22 (v0.99.139) — full refresh.** Rebuilt from the v0.74.12 (2026-01-23) draft against current code. Corrections vs. the old version:
- **Voice system rewritten:** `lib/voice.js` (6 dimensions) no longer exists; replaced by `lib/personas.js` 3-dial system (persona / complexity / humor) + separate length configs.
- **Modes → Postures:** the live system is `lib/postures.js` (Reflect/Discover/Forge/Integrate mapped to the process cycle); `lib/modes.js` is legacy.
- **Added:** computation engine (mapAnalysis, diagnosticTools), neighborhoods, whyVector, teleology, Collective Pulse, community hub/chat, voice presets, email system, data layer, full route table with verified model IDs, visualization summary + `codemap/` cross-links, documentation map.
- **Verified line counts** (several were inflated in the old draft and in interim surveys).
- **Three.js:** now present (one view, `SealCanvas.js`); the `codemap/` "no Three.js" headline predates it.
- Terminology aligned to current canon (Kindle/Passage/Intimacy/Underlie; signatures not cards).
