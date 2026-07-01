# CODE MAP — Nirmanakaya Reader Visualization Layer (MASTER)

**Compiled:** 2026-06-12 by Code (Fable 5), synthesizing three background surveys. Durable reference so no future instance has to reverse-engineer prod again.
**Sub-reports (full detail):** `CODEMAP_A_Routes_Rendering.md` · `CODEMAP_B_Data_Engine.md` · `CODEMAP_C_Components_Reuse.md` (this folder).

## THE HEADLINE

> **UPDATE 2026-06-22:** This "no Three.js" headline is no longer fully true. Three.js + react-three-fiber were since added for ONE WebGL view — `/seal` (`components/viz/SealCanvas.js`). Everything below still holds for every other view (all SVG/DOM). The SVG-by-default guidance stands; `/seal` is the deliberate greenfield exception this doc anticipated.

**The site is SVG + framer-motion. There is NO Three.js / react-three-fiber / WebGL anywhere** *(except `/seal` — see update above)*. The /explore "tesseract" is hand-rolled inline SVG with manual 4D rotation/projection — elegant and light. Any new structural graphic should match this (SVG) to stay coherent; true lit/volumetric 3D would be a *deliberate greenfield addition* for one flagship, not the default.

## THE MAP

| Route | Render | 4D? | Components | Engine coupling |
|---|---|---|---|---|
| /explore | inline SVG + RAF | yes | in-file GridView, TesseractView | light |
| /22-reader | DOM/CSS (clip-path + transform) | no | components/map/* | heavy |
| /visualize | inline SVG + RAF | yes | in-file (progenitor of /explore) | light |
| /tesseract, /seeds | inline SVG | some | in-file (copies) | light |
| /diagnostic | DOM/CSS panels | no | ToolExplorerPanel, LiveReadingPanel | heaviest |
| /map | **REMOVED — 404** (memory was stale) | — | — | — |

**Two visual families:**
1. **Tesseract / Grid** — pure SVG, defined INLINE in route pages, shared by *copy-paste* across /explore, /visualize, /tesseract, /seeds. The 4D kernel: `rotate4D` (explore/page.js:420), `project4Dto2D` (:431), `projectVertex` (:439); `VERTICES` (:18), `EDGES` (Hamming-1, :129), magic-square `GRID` (:89). Glow via SVG `<filter id="pathGlow">` (:748). **Duplicated 4×, not extracted.**
2. **Diamond-house card mandala** — DOM/CSS, *properly componentized*: `components/map/MapCanvas.js` (pan/zoom viewport), `CardNode.js` (card, element-color, art), `HouseGroup.js` (rotated-square house), geometry from `lib/map/positions.js`. Status borders (Too Much/Little/Unack/Balanced) live in 22-reader `STATUS_GLOW` (:14), not yet a shared `StatusCard`.

## THE DATA CONTRACT (for new graphics)

- Structural data: `ARCHETYPES`(0-21)/`BOUNDS`(22-61)/`AGENTS`(62-77) from `@/lib/archetypes`. ID-range = type. Archetype fields: `house`(Practice), `channel`(Activity), `function`(Stage), `states{}`.
- Tables/groups: `@/lib/constants` — HOUSES, CHANNELS(→element), STATUSES, BEING_GROUPS (Mantle/Kindle/Vessel/Passage), IDENTITY_GROUPS (Composure/Conviction/Exploration/Intimacy), GOVERNANCE_MAP.
- Corrections: `@/lib/corrections` — GROWTH/DIAGONAL/VERTICAL/REDUCTION_PAIRS by status 1/2/3/4.
- **Live state:** `analyzeFullMap(draws)` from `@/lib/mapAnalysis` → `{health{score}, correctiveVector, traces, governance, wheelWorldFields, positions, ...}`. `triageReading` → L0–L5 hierarchy.
- **4D address** = join of (house, channel→element, BEING group, IDENTITY group, function=Stage). Only the 16 manifest archetypes (2-9,11-18) have all four; Gestalt {0,1,19,20} + Portals {10,21} don't. **The tesseract's 4-bit `VERTICES` ARE the true 4D address as a binary embedding** (verified: bits[2,3] encode channel; all dims recoverable — MOLS structure) — currently hand-assigned in-page; a small deriver could emit them from the constants group tables for a clean single source.

## OPEN DECISIONS (need Chris)

1. **SVG-vs-true-3D fork — RECOMMENDED RESOLUTION:** SVG+framer-motion for the hero fleet (cascade, selfless-love, 16-fold — they don't need WebGL and stay coherent); **one** deliberate true-3D flagship (react-three-fiber or a Spline scene) for an immersive "fly into the tesseract" wow piece; a prep-refactor underneath.
2. **PALETTE DIVERGENCE (new, important):** the deck/storyboard palette (Fire/Spirit=RED, Air/Mind=GREEN, Water/Emotion=BLUE, Earth/Body=GOLD, Aether/Gestalt=PURPLE — what the 15-yr PPT and the v0.1 prototypes use) **does NOT match the live site** (`HOUSE_COLORS` constants.js:345 → Spirit=violet, Mind=cyan, Emotion=blue, Body=green, Gestalt=amber). New graphics on the deck palette would clash with live /explore. Decision: unify on ONE canonical palette (recommend the element-true deck palette, bring site into line over time) vs match current site. Does NOT block palette-independent pieces (e.g. selfless-love).

## PREP REFACTORS (high-leverage, both agents flagged; low risk)

1. Extract the 4D kernel + `VERTICES`/`EDGES`/`GRID` into `lib/viz/tesseract.js` + `components/viz/TesseractView.js`; repoint explore/visualize/tesseract/seeds. Stops the 5th copy-paste.
2. One canonical **`lib/viz/palette.js`** (ends the 3-way color duplication; resolves decision #2).
3. Small **4D-address deriver** (`lib/viz/address.js`) emitting the 4-bit address from constants group tables → single-source tesseract placement.
4. Extract `STATUS_GLOW` → reusable `StatusCard` wrapper.

## BUILD-ON-THIS (where new heroes plug in)

- **Cascade / 16-fold / hypercube graphics:** SVG component reusing the 4D kernel (explore:420-441) + `pathGlow` filter (:748), data from `@/lib/archetypes`+`constants`, animated with framer-motion; wrap in `MapCanvas` for pan/zoom.
- **Selfless-love sequence:** standalone SVG/framer-motion component — palette-independent (blue consciousnesses + red love-bridge), the cleanest FIRST native build. (v0.1 standalone exists at `D:\NKYAWebApp\viz-prototypes\selfless-love.html`.)
- **Card-based graphics:** reuse `CardNode` + `getCardImagePath` (`lib/cardImages.js`); art in `public/map/{archetypes,bounds,agents}/`.
- **Mobile:** follow the 1024px `isMobile` split (explore:2776) + 720px DepthCard pattern; memoize; heavy animation OFF on mobile.

— Code, 2026-06-12. The site is SVG; the data is clean and single-sourced; the heroes fit what exists. Complement, extract, unify — don't fork.
