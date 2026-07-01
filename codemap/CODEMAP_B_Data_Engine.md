# CODEMAP B — Data Model + Computation Engine

Map of the Nirmanakaya Reader's single source of truth for the 78 signatures, their
4-dimensional addresses, colors, and the pure computation harness. Written so a new
graphic can read the same data the existing /explore, /diagnostic, and /22-reader pages use.

All paths absolute. file:line citations throughout.

---

## 1. THE STRUCTURAL DATA (where the 78 live)

### 1a. The 78 signatures — `D:\NKYAWebApp\nirmanakaya-reader\lib\archetypes.js`

Three exported objects, keyed by signature ID 0-77:

- `ARCHETYPES` (IDs 0-21) — archetypes.js:17. The 22 majors.
- `BOUNDS` (IDs 22-61) — archetypes.js:222. The 40 pips (number cards).
- `AGENTS` (IDs 62-77) — archetypes.js (Intent agents start ~62; full set 62-77, ends :529). The 16 court/royal cards.

ID-range convention is used everywhere in the engine (see resolvePosition, mapAnalysis.js:39):
`id < 22` = archetype, `22 ≤ id < 62` = bound, `id ≥ 62` = agent.

**Archetype shape** (archetypes.js:22 onward), e.g. ID 0:
```
{ name:"Potential", traditional:"The Fool", house:"Gestalt", channel:null,
  function:"Seed",   // <-- "function" IS the Stage dimension (Seed/Medium/Fruition/Feedback)
  description, extended,
  states: { balanced, tooMuch, tooLittle, unacknowledged } }  // per-status behavioral text
```
Note: Gestalt (0,1,19,20) and Portal (10,21) archetypes have `channel:null`. Portals use
`function:"Ingress"`/`"Egress"` instead of a Stage.

**Bound shape** (archetypes.js:225), e.g. ID 22:
```
{ name, traditional:"Ace of Wands", channel:"Intent", number:1, archetype:0,  // <-- parent archetype id
  house:"Gestalt", function:"Seed", horizon:"inner", wheelWorld:"Wheel", scale:"formative",
  numberKeyword:"Beginning/Perfection", numberHouse:"Gestalt", description, extended }
```

**Agent shape** (archetypes.js:450), e.g. ID 64:
```
{ name:"Steward of Intent", traditional:"Queen of Wands", channel:"Intent", role:"Steward",
  archetype:7, house:"Emotion", function:"Medium", horizon:"inner", wheelWorld:"World",
  domain:"Emotion", nickname:"The Inspirer", boundNumbers:[4,7], description, extended }
```

### 1b. The structural lookup tables — `D:\NKYAWebApp\nirmanakaya-reader\lib\constants.js`

- `GOVERNANCE_MAP` (constants.js:7) — governor archetype → house it governs. {10→Gestalt, 0→Spirit, 19→Mind, 20→Emotion, 1→Body}.
- `WHEEL_WORLD_ASSOCIATION` (constants.js:22) — position → 'Wheel'|'World' (diagonal-pair parity).
- `BOUND_NUMBER_PROPERTIES` (constants.js:42) — pip number 1-10 → {keyword, house, polarity, span}.
- `ROLE_PROPERTIES` (constants.js:58) — Initiate/Catalyst/Steward/Executor → {domain, traditional, span, boundNumbers, keywords}.
- `ROYAL_NICKNAMES` (constants.js:67) — "Role-Channel" → nickname.
- `INNER_OUTER_HORIZON` (constants.js:81) — position → 'inner'|'outer'|'threshold'.
- `STATUSES` (constants.js:91) + `STATUS_INFO` (constants.js:99) — the 4 states (1=Balanced, 2=Too Much, 3=Too Little, 4=Unacknowledged) with orientation + correction-geometry text.
- `CHANNELS` (constants.js:127) — Intent/Cognition/Resonance/Structure → {traditional, element, description}. **This is the channel→element map**: Intent=Fire, Cognition=Air, Resonance=Water, Structure=Earth.
- `HOUSES` (constants.js:159) — Gestalt/Spirit/Mind/Emotion/Body/Portal → {members:[ids], governor, description}.
- `ROLES`, `PROCESS_STAGES` (constants.js:376), `PORTAL_TYPES` (constants.js:420).

### 1c. The 4-dimension group tables (Being / Identity) — constants.js

These are the two "hidden" dimensions not stored on each archetype object — they live as
group→members lists:

- `BEING_GROUPS` (constants.js:237) — Mantle/Kindle/Vessel/Passage. Each: {question:"What?", verb, cycle, members:[4 ids], stages:{Seed,Medium,Fruition,Feedback}}.
  - Mantle [8,7,15,18], Kindle [2,5,13,12], Vessel [4,3,11,14], Passage [6,9,17,16].
- `IDENTITY_GROUPS` (constants.js:288) — Composure/Conviction/Exploration/Intimacy. Each: {question:"Who?", verb, cycle, center, members:[4 ids], stages}.
  - Composure [8,5,17,14], Conviction [2,7,11,16], Exploration [4,9,13,18], Intimacy [6,3,15,12].
- `DIMENSION_VERBS` (constants.js:337) — the verb per group across all four dimensions (Practice/Activity/Being/Identity).

**These Being/Identity members lists ONLY cover the 16 manifest archetypes** (2-9, 11-18).
Gestalt (0,1,19,20) and Portals (10,21) are NOT in any Being/Identity group — they have only
2 of the 4 dimensions (Practice via house, Stage via function). The full 4D address exists only
for the 16 "manifest" archetypes.

---

## 2. THE 4D ADDRESS — answer to KEY QUESTION 1

### Where each manifest archetype's Practice/Activity/Being/Identity coordinates are stored

For the 16 manifest archetypes, the four coordinates are assembled from FOUR sources:

| Dimension | Stored as | Source |
|-----------|-----------|--------|
| **Practice** | `house` field on the archetype object | archetypes.js (e.g. :40 `house:"Spirit"`) |
| **Activity** | `channel` field on the archetype object → element via CHANNELS | archetypes.js + constants.js:127 |
| **Being** | which `BEING_GROUPS[g].members` array contains the id | constants.js:237 |
| **Identity** | which `IDENTITY_GROUPS[g].members` array contains the id | constants.js:288 |
| (Stage, the 5th) | `function` field on the archetype object | archetypes.js |

So the 4D address is NOT stored as a tuple in one place — it's a reverse-lookup join across
the archetype object (Practice+Activity+Stage) and the two group tables (Being+Identity).
In /explore this join is precomputed into `BEING_LOOKUP` / `IDENTITY_LOOKUP` (explore/page.js:85-87).

### The tesseract vertex placement — `D:\NKYAWebApp\nirmanakaya-reader\app\explore\page.js`

The tesseract does NOT recompute placement from the four-source address above. Instead each of
the 16 manifest archetypes has a hard-coded 4-bit binary address:

- `VERTICES` (explore/page.js:18) — `{ 17:{bits:[0,0,0,0],name}, 7:{bits:[1,0,0,0]}, ... 8:{bits:[1,1,1,1]} }`.
- `projectVertex(bits, aXW, aYZ, aXY)` (explore/page.js:439) maps each bit 0→-1, 1→+1 to get a
  hypercube corner, then `rotate4D` (page.js:420) + `project4Dto2D` (page.js:431) render it.
- `EDGES` (page.js:129) are computed as Hamming-distance-1 pairs of these bits.

**Crucial finding for Q1 — the bits DO encode the true 4D address, but as a binary embedding, not a 1:1 bit=dimension map.** Verified empirically (node cross-check against the archetype/group data):

- `bits[2]` and `bits[3]` together encode the **Activity (channel)** exactly:
  `00=Intent, 01=Cognition, 10=Resonance, 11=Structure` — holds for all 16 vertices.
- No single bit equals a single dimension; each of Practice/Activity/Being/Identity is recoverable
  from bit *pairs*. This is the MOLS / Latin-square embedding the canon calls out
  (`Principle_Latin_Square`, `Invariant_MOLS_Theorem` in the wiki). The 16 manifest archetypes form
  a 4×4×4×4 mutually-orthogonal structure; the 4-bit address is its natural hypercube coordinate.

**Could a tesseract place each archetype at its TRUE 4D vertex from the data model?** Yes. The
VERTICES bits in /explore ARE the true 4D vertices (they reproduce the channel and all four
orthogonal partitions). A NEW graphic could either (a) reuse `VERTICES` verbatim, or
(b) regenerate the same 16 bit-addresses from `lib/constants.js` group memberships
(Practice/Activity/Being/Identity each contribute one orthogonal axis pair). Today the bits are
hand-assigned in the page, not derived at runtime from constants.js — so the one missing piece for
a clean single-source build is a small deriver that emits the 4-bit address from the four group
tables. The data to do so is fully present in constants.js.

(The Gestalt/Portal 6 archetypes have no tesseract vertex — only the 16 manifest ones are placed,
consistent with their having only a partial 4D address.)

### Tesseract color tables (per-dimension) — explore/page.js:101-105
`BEING_T`, `IDENTITY_T`, `PRACTICE_T`, `STAGE_T`, gathered in `COLOR_MODES`. `getVertexColor(id, mode)`
(page.js:443) returns the group color for whichever dimension `mode` is selected. `GROUP_COLORS`
(page.js:107) is the merged per-group color map used by the grid view.

---

## 3. THE MAGIC-SQUARE GRID — answer to KEY QUESTION 2

Defined as `GRID` at **explore/page.js:89-94**:
```
17 7 4 12       row 0
 2 14 15 9      row 1
18 6 5 11       row 2
 3 13 16 8      row 3
```
Accompanied by:
- `ROW_LABELS = ['Intent','Cognition','Resonance','Structure']` (page.js:95) — rows are channels (Activity).
- `COL_LABELS = ['Spirit','Emotion','Mind','Body']` (page.js:96) — columns are Practice houses.
- `FULL_STAGES` (page.js:144) and `VIZ_STAGES` (page.js:64) — per-cell Stage labels.
This same 4×4 also appears in `/visualize`, `/22-reader`, and `/diagnostic` (the grep hit list).
It is the manifest 4×4 (the 16 archetypes); the 6 Gestalt/Portal positions sit outside it.

The toroidal 2×2 neighborhoods over this grid are `NEIGHBORHOODS` (explore/page.js:162, 16 blocks
each summing to 40) and the canonical version `NEIGHBORHOOD_CANON` in
`D:\NKYAWebApp\nirmanakaya-reader\lib\neighborhoods_canon.js:6` (+ `NEIGHBORHOOD_CANON_ALIASES` :202).

---

## 4. THE COLOR SYSTEM — answer to KEY QUESTION 3

**There is no single canonical house→color map matching the prompt's stated palette
(Spirit=red, Mind=green, Emotion=blue, Body=gold, Gestalt=purple). The codebase uses TWO
different, internally-inconsistent color schemes:**

1. `HOUSE_COLORS` — **constants.js:345** (Tailwind class strings, used by reader/popup UI):
   - Gestalt=amber, Spirit=violet, Mind=cyan, Emotion=blue, Body=green, Portal=rose.
   This is the closest thing to a canonical house map, but it does NOT match the
   Spirit=red / Mind=green palette in the task prompt.

2. `CHANNEL_COLORS` — constants.js:368: Intent=orange, Cognition=cyan, Resonance=blue, Structure=green.

3. The /explore tesseract uses its OWN per-dimension hex tables (`PRACTICE_T` etc., page.js:101-105),
   where e.g. Practice Spirit=`#c084fc` (purple), Mind=`#22d3ee` (cyan), Emotion=`#fb7185` (rose),
   Body=`#4ade80` (green) — different again from HOUSE_COLORS.

4. Stage colors: `FULL_STAGE_COLORS` (page.js:151) / `STATUS_COLORS` (constants.js:355).

The element associations the prompt's palette implies DO exist canonically in
`CHANNELS` (constants.js:127): Intent=Fire, Cognition=Air, Resonance=Water, Structure=Earth — but
the actual RGB/Tailwind values assigned to them in code do not follow the red/green/blue/gold
convention. **Recommendation for a new graphic: introduce ONE canonical
{house|element}→color map (the prompt's palette) and have all graphics import it**, since today
each page hard-codes its own.

---

## 5. THE COMPUTATION ENGINE — answer to KEY QUESTION 4

### `D:\NKYAWebApp\nirmanakaya-reader\lib\mapAnalysis.js` (1947 lines, pure functions, no AI/API)

**Input contract** (mapAnalysis.js:3): an array of `draws`, each:
```
{ position: <int>, transient: <signatureId 0-77>, status: <1|2|3|4> }
```
22 draws (archetype map) or 78 draws (full state). Position count auto-detected (getPositionCount, :143).

**Top-level entry:** `analyzeFullMap(draws)` (mapAnalysis.js:1472) returns:
```
{
  portals,            // analyzePortals  — wheel(10)/world(21) detail + frame element/stage
  governance,         // analyzeGovernance — 5 governors, isBalanced, cascade
  positions,          // analyzePositions  — per-position resolved house/channel/stage/status
  traces,             // analyzeTraces     — governance/correction chains
  aggregates,         // status counts {Balanced, 'Too Much', 'Too Little', Unacknowledged}, house tallies
  crossRefs, compoundCrossRefs,
  wheelWorldFields,   // Wheel vs World field strength + differential
  correctionPairs,    // analyzeCorrectionPairVisibility — is each correction path open/blocked
  correctiveVector,   // computeCorrectiveVector (:900) — RLHF compass: {toward, away, ...}
  flags,              // self-home, sick-governor, etc.
  health,             // computeHealth (:987)
  meta: { drawCount, positionCount, isFullState, timestamp }
}
```

**`health` shape** (computeHealth, mapAnalysis.js:1018):
```
{ score: 0-100, integration: 0-100,
  profile: { balanced, tooMuch, tooLittle, unacknowledged },
  groundingBonus, consonanceBonus, ... }
```
Score formula: weighted integration (Balanced 1.0 / Too Much 0.5 / Too Little 0.35 / Unack 0.2) ×90
+ self-home bonus (≤5) + horizon-consonance bonus (≤5). (mapAnalysis.js:994-1016)

**`correctiveVector`** (computeCorrectiveVector, :900): a "toward health / away from health" RLHF
signal built from (1) open vs blocked correction paths, (2) governor chain integrity (×2 weight),
(3) self-home anchors (×0.5).

**Triage:** `triageReading(analysis, drawMap)` (mapAnalysis.js:1541) compresses analyzeFullMap output
into the L0-L5 diagnostic hierarchy (Horizon → Portal vitals → Process → Bound diagnosis → Manifest
readout → Correction path) — this is the payload the /diagnostic page and AI prompts consume.

Other exported analyzers (all take `drawMap`): `analyzeBeingGroups` (:1161), `analyzeIdentityGroups`
(:1172), `analyzeNeighborhoods` (:1207), `tracePortalChains` (:1270), `analyzeMajorSignals` (:1358),
`generateAndAnalyze` (:1941, draws + analyzes in one call).

### Corrections — `D:\NKYAWebApp\nirmanakaya-reader\lib\corrections.js`

Canonical lookup tables (NOT formulas — corrections.js:4), sourced from
`D:\NKYAWebApp\nirmanakaya-reader\lib\CANONICAL_78_CORRECTIONS.md`:
- `GROWTH_PAIRS` (:11) — Balanced→growth target (Transpose/Polarity). null = self (Gestalt/Portal).
- `DIAGONAL_PAIRS` (:210) — Too Much → diagonal partner.
- `VERTICAL_PAIRS` (:236) — Too Little → vertical partner.
- `REDUCTION_PAIRS` (:263) — Unacknowledged → reduction pair.
- `BOUND_GROWTH_TARGETS` (:55) — per-bound growth target (40 entries).
- Functions: `getArchetypeCorrection(pos,status)` (:290), `getBoundCorrection` (:340),
  `getAgentCorrection` (:440), `getFullCorrection(transientId,status)` (:492), `getComponent(id)` (:486).

The status→geometry mapping (the heart of rebalancing): 1 Balanced→Growth, 2 Too Much→Diagonal,
3 Too Little→Vertical, 4 Unacknowledged→Reduction (mapAnalysis.js:9-13, corrections.js:290-321).

### AI-context builders — `D:\NKYAWebApp\nirmanakaya-reader\lib\drawForAI.js`
`buildSingleReadingV9(draw)` (:330) is the consciousness-middleware reading builder;
`buildFullReadingContext` (:258), `buildFiveHouseContext` (:420), etc. These consume the engine
output and emit prompt text — relevant only if a graphic also needs the narrative layer.

### Other engine-adjacent files
- `lib/diagnosticTools.js` (1137 lines) — `handleToolCall` + tool definitions for the /diagnostic AI tools.
- `lib/houseConditions.js`, `lib/gestaltConditions.js` — manifest house/gestalt condition derivations.
- `lib/index.js` — barrel re-export of ARCHETYPES/BOUNDS/AGENTS + constants (lib/index.js:8,11).

---

## 6. DATA CONTRACT — what a NEW graphic imports

To render the 78 positions, their 4D addresses, colors, and live computed state, a new graphic
imports from these paths:

```js
// ---- STRUCTURAL DATA (static, the single source of truth) ----
import { ARCHETYPES, BOUNDS, AGENTS } from '@/lib/archetypes';
//   ARCHETYPES[0..21], BOUNDS[22..61], AGENTS[62..77]
//   each: { name, traditional, house, channel, function(=Stage), description, extended, ... }
//   bounds add: { number, archetype, horizon, wheelWorld, scale, numberKeyword, numberHouse }
//   agents add: { role, archetype, domain, nickname, boundNumbers }

import {
  HOUSES, CHANNELS, STATUSES, STATUS_INFO,
  BEING_GROUPS, IDENTITY_GROUPS, PROCESS_STAGES,
  GOVERNANCE_MAP, WHEEL_WORLD_ASSOCIATION, INNER_OUTER_HORIZON,
  BOUND_NUMBER_PROPERTIES, ROLE_PROPERTIES, DIMENSION_VERBS,
  HOUSE_COLORS, CHANNEL_COLORS, STATUS_COLORS,
} from '@/lib/constants';
//   CHANNELS[ch].element gives the Activity→element (Fire/Air/Water/Earth)
//   BEING_GROUPS[g].members / IDENTITY_GROUPS[g].members give the Being/Identity coordinate

import { getFullCorrection, getComponent,
         GROWTH_PAIRS, DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS }
  from '@/lib/corrections';

// ---- LIVE COMPUTED STATE (from a reading) ----
import { analyzeFullMap, triageReading } from '@/lib/mapAnalysis';
const analysis = analyzeFullMap(draws);   // draws: [{position, transient, status}]
const triage   = triageReading(analysis, drawMap);
//   analysis.health.score (0-100), analysis.correctiveVector, analysis.governance,
//   analysis.positions, analysis.aggregates.statuses, analysis.wheelWorldFields

// ---- 4D TESSERACT PLACEMENT ----
// Today: reuse the hand-coded bit addresses (16 manifest archetypes only).
//   from app/explore/page.js — VERTICES { id: { bits:[b0,b1,b2,b3] } }
//   bits[2..3] encode channel: 00=Intent 01=Cognition 10=Resonance 11=Structure
//   place at hypercube corner: bits.map(b => b? +1 : -1)
// Cleaner (recommended): write a deriver that produces the same 4-bit address from
//   constants.js group memberships (Practice/Activity/Being/Identity = 4 orthogonal axis-pairs),
//   so the tesseract reads from the single source of truth instead of a page-local literal.
```

### The 4D vertex placement, restated as a contract
For each of the 16 manifest archetypes (2-9, 11-18), the true 4D vertex is the tuple:
```
( Practice = ARCHETYPES[id].house,
  Activity = ARCHETYPES[id].channel,           // → element via CHANNELS[channel].element
  Being    = group g where BEING_GROUPS[g].members.includes(id),
  Identity = group g where IDENTITY_GROUPS[g].members.includes(id),
  Stage    = ARCHETYPES[id].function )          // 5th dimension, not a tesseract axis
```
These four (Practice/Activity/Being/Identity) are mutually orthogonal (MOLS); the existing
`VERTICES` bit-addresses are the verified binary encoding of exactly this tuple. A tesseract built
from either is geometrically identical.

### Gotchas for a new graphic
- Only 16 archetypes have a full 4D address / tesseract vertex. Gestalt {0,1,19,20} and Portal
  {10,21} have house+stage only (channel null) — render them outside the hypercube.
- Bounds/agents inherit their 4D position from `.archetype` (the parent id) — use
  resolvePosition logic (mapAnalysis.js:39) to fold 78→22 for placement, then differentiate by
  number/role for the bound/agent layer.
- The color scheme is NOT unified. Pick one canonical map (the element palette in CHANNELS) and
  apply it consistently; do not assume HOUSE_COLORS matches the Spirit=red/Mind=green palette — it
  does not (it is violet/cyan).
- The magic-square `GRID` (rows=channels, cols=houses) lives only in the page files, not in lib/ —
  if a new graphic needs it, lift it to a shared constant.
