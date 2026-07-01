# CODEMAP A — Visualization Routes & Rendering

Survey of the visualization routes in the Nirmanakaya Reader (Next.js App Router). Goal: let a future engineer add new graphics without duplicating the existing scaffolds.

App root: `D:\NKYAWebApp\nirmanakaya-reader\app\`

**Headline finding:** There is NO Three.js / react-three-fiber / WebGL anywhere in the app (`package.json` has no `three`; no `getContext`/`<canvas>` in any viz route). Every visualization is either **inline SVG** (with hand-rolled 4D math + `requestAnimationFrame`) or **plain DOM/CSS** (clip-path diamonds, CSS `transform` pan/zoom). This is the single most important fact for integration: the reusable scaffold is an SVG one, not a 3D engine.

---

## /explore — Architecture Explorer (the flagship)

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\explore\page.js` (~2785 lines, single file).

2. **What it displays:** The most feature-rich viz. A 4×4 grid view of the 16 manifest archetypes (the "Forty-Fold Seal" grid), a rotating **TESSERACT** (4D hypercube of the 16 manifest positions), an inspector side panel, and analytical overlays: color-by Being/Identity/Practice/Stage, Diagonals (Affine planes), Shade, Stages, Group-Colors, Neighborhoods (16 toroidal 2×2 blocks), and Combinatorics (all 80 quadruples summing to 40, classified into Row/Column/Toroidal/Affine/Tetrahedron/Mixed with B4-orbit sub-classification). Axis controls toggle rotation between `XW+YZ` and `XY+YZ` planes.

3. **HOW it renders — SVG, no canvas/WebGL.**
   - **GridView** (`page.js:465`) — an `<svg>` (`page.js:594`) with `<rect>`/`<text>`/`<line>` nodes laid out from a `GRID` row/col table; arrowheads via SVG `<marker>` defs; glow via `<filter feGaussianBlur>`; seed pulse via a `<style>` CSS keyframe. Supports a 3×3 torus tiling mode.
   - **TesseractView** (`page.js:655`) — an `<svg>` (`page.js:740`) drawn each render from projected vertex coordinates. **This is the 4D→3D→2D pipeline, all hand-written:**
     - `rotate4D(point, aXW, aYZ, aXY)` — **`page.js:420`**. Three 2-plane rotations: XW plane, YZ plane, XY plane (cos/sin matrices applied in sequence).
     - `project4Dto2D(p, pd4=4.0, pd3=6.0)` — **`page.js:431`**. Perspective-divides 4D→3D (`s4 = pd4/(pd4 - w)`) then 3D→2D (`s3 = pd3/(pd3 - z3)`), returns `{x, y, scale}`. `scale` is reused for depth-sorting and edge opacity.
     - `projectVertex(bits, ...)` — **`page.js:439`** maps each archetype's 4-bit code (`bits.map(b => b===0 ? -1 : 1)`) through rotate+project.
     - Edges (`EDGES`, `page.js:129`) are computed as Hamming-distance-1 vertex pairs and drawn as `<line>` colored by which bit flips (`EDGE_COLORS`).
     - **Rotation/animation loop:** `requestAnimationFrame` tick at **`page.js:668-684`** increments `anglesRef` (xw += 0.003·k, yz += 0.002·k, xy += 0.001·k) and pushes to React state via `setAngleXW/YZ/XY`. Auto-rotate pauses during drag and during "rotate mode". Manual rotate (`page.js:694-729`) is a click-to-engage drag mode: pointer delta maps to angle deltas; mouse-wheel maps `deltaY` to the XY angle (zoom-into-4D feel).
   - Affine planes, active paths, and highlight sets are drawn as additional `<line>`/`<polygon>`/`<circle>` overlays inside the same SVG.

4. **Key child components / data tables (all in-file, not separate component files):**
   - `GridView` and `TesseractView` are defined locally (also duplicated verbatim in `/visualize` — see below).
   - Large in-file constant tables: `VERTICES`, `EDGES`, `SEEDS`, `BEING_T/IDENTITY_T/PRACTICE_T/STAGE_T` (color modes), `NEIGHBORHOODS` (16 toroidal blocks with prose), `MIXED_ORBITS` + `QUADRUPLES_40` (combinatorics engine), `AFFINE_PLANES`, `STAGE_GROUPS`, `DERIVATION_CONTENT`.
   - Inspector helpers: `getGroupsForArchetype`, `getBoundsForArchetype`, `getAgentsForArchetype`.

5. **State & mobile:** Pure React `useState` (no context, no zustand). ~30 `useState` hooks in `ExploreDesktop` (`page.js:1034+`) covering selected seed, dim visibility, color mode, tesseract angles/zoom/axis, combinatorics selection, etc. **Mobile split is explicit:** the default export (`page.js:2783`) is `isMobile ? <ExploreMobile /> : <ExploreDesktop />`, where `isMobile` = `window.innerWidth < 1024` set via a resize listener (`page.js:2776-2783`). `ExploreMobile` (~`page.js:2167+`) is a separate component with its own state subset.

6. **lib/ consumed:** `lib/archetypes.js` (ARCHETYPES, BOUNDS, AGENTS), `lib/constants.js` (BEING_GROUPS, IDENTITY_GROUPS, HOUSES, DIMENSION_VERBS), `lib/neighborhoods_canon.js`. Note most of the geometric data is hard-coded in-file rather than pulled from lib.

---

## /22-reader — Consciousness Map / 78-Position Computation Substrate

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\22-reader\page.js`.

2. **What it displays:** A full-reading diagnostic surface. Generates a 78-position (or smaller) spread, runs the analysis engine, and lays out the four manifest "diamond-houses" (Mind/Emotion/Body/Spirit) plus Gestalt of cards, each card bordered/rotated by status (Balanced/Too Much/Too Little/Unacknowledged). Tabs switch the viewMode: Status / Traces / Corrections / Governance. A color-layer selector recolors cards by status/practice/activity/being/identity/stage/neighborhood. Shows health score, vector, and Being/Identity/Neighborhood field analyses.

3. **HOW it renders — plain DOM/CSS, no SVG/canvas.**
   - Cards are `<CardNode>` DOM elements positioned absolutely. Card shape is a CSS **clip-path diamond**, and status is encoded as a CSS `transform: rotate(...)` (`CardNode.js:98,217`) — 0°/90°/-90°/180° per `STATUS_GLOW` (`22-reader/page.js:14`).
   - Pan/zoom is `<MapCanvas>` — a `<div>` with `transform: translate(...) scale(zoom)` (`MapCanvas.js:124`), driven by mouse drag + wheel + touch. No drawing context; purely CSS transforms on a fixed 1800×1650 layout surface.

4. **Key child components:**
   - `components/map/MapCanvas.js` — pan/zoom container (DOM transform).
   - `components/map/CardNode.js` — single diamond card (clip-path + rotate).
   - Position math from `lib/map/positions.js` (`getPortalPosition`, `getBoundPosition`, `getAgentPosition`, `getHouseCenter`, etc.).

5. **State & mobile:** React `useState` only (`draws`, `analysis`, `viewMode`, `colorLayer`, `spreadSize`, health objects). No context/zustand. No explicit mobile branch in the page — relies on `MapCanvas` pan/zoom + touch handlers for small screens.

6. **lib/ consumed:** `lib/utils.js` (`generateSpread`), `lib/mapAnalysis.js` (`analyzeFullMap`, `analyzeBeingGroups`, `analyzeIdentityGroups`, `analyzeNeighborhoods`), `lib/archetypes.js`, `lib/constants.js`, `lib/map/positions.js`. This is the route most tightly coupled to the analysis engine.

---

## /map — DOES NOT EXIST (confirmed)

There is no `app/map/page.js` (Read returns "file does not exist") and `next.config.js` has **no** rewrite/redirect for `/map` (its only rewrites are the two `/wiki` ones). Memory's note that "/map redirects to /22-reader" is **stale** — the route was simply removed/renamed; navigating to `/map` now 404s rather than redirecting. The cloud-background diamond-house card layout that used to live at `/map` now effectively lives at **/22-reader** (same MapCanvas + CardNode DOM-diamond stack).

---

## /visualize — original Grid + Tesseract sandbox

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\visualize\page.js`.
2. **What it displays:** The progenitor of /explore — the same 4×4 grid + rotating tesseract with seed-path overlays, but a simpler single-view sandbox (no combinatorics/neighborhood inspector). /explore's `GridView` and `TesseractView` are noted in-code as "verbatim from /visualize".
3. **HOW:** Identical SVG approach — same `VERTICES`, `SEEDS`, `rotate4D`/`project4Dto2D` pattern, `requestAnimationFrame` rotation (`page.js:154-156`), `<svg>` at `page.js:240`. No canvas/WebGL.
4. **State:** `useState`/`useRef`/`useEffect`, self-contained.
5. **lib/:** mostly self-contained constants + `lib/archetypes` (ARCHETYPES).

## /seeds — seed-path grid

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\seeds\page.js`.
2. **What it displays:** Focused view of the four "seed" archetypes (8/2/4/6) and their four aspect paths (Practice/Activity/Being/Identity) traced across the 4×4 grid with stage assignments.
3. **HOW:** SVG grid (same family as GridView). DOM controls. No canvas.
4. **State:** `useState`/`useMemo`. `lib/archetypes` (ARCHETYPES).

## /tesseract — standalone tesseract

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\tesseract\page.js`.
2. **What it displays:** A standalone version of the rotating 4D hypercube with Being/Identity/Practice group coloring — the tesseract extracted on its own.
3. **HOW:** Same SVG + `requestAnimationFrame` (`page.js:154,156`) + `<svg>` (`page.js:240`) approach. The 4-bit `VERTICES` table and group color maps are duplicated here too. No canvas/WebGL.
4. **State:** `useState`/`useRef`/`useEffect`.

## /diagnostic — "Bloomberg terminal for consciousness"

1. **File:** `D:\NKYAWebApp\nirmanakaya-reader\app\diagnostic\page.js` (~2780 lines).
2. **What it displays:** A 3-panel diagnostic terminal over a 78-position reading: VERB/TRAD toggle, a Tool Explorer (`ToolExplorerPanel`, `page.js:2726`), Live Reading panel (`LiveReadingPanel`, `page.js:2769`), channel strength, manifest house conditions, Gestalt condition, portal-chain traces, major signals.
3. **HOW:** **Pure DOM/CSS panels — no SVG, no canvas.** Bars/meters/borders are styled `<div>`s. Has a React error boundary (`Component` import, `page.js:20`).
4. **Key child components:** `ToolExplorerPanel`, `LiveReadingPanel` (both in-file).
5. **State:** `useState`/`useMemo`. No mobile-specific branch detected.
6. **lib/ consumed (richest engine coupling of any route):** `lib/mapAnalysis.js` (`analyzeFullMap`, `triageReading`, `tracePortalChains`, `analyzeMajorSignals`, `analyzeBeing/Identity/Neighborhoods`), `lib/diagnosticTools.js` (`handleToolCall`, `buildTriageSeed`, `DIAGNOSTIC_TOOL_DEFINITIONS`), `lib/corrections.js` (`getArchetypeCorrection`), `lib/cardImages.js`, `lib/gestaltConditions.js`, `lib/houseConditions.js`, plus archetypes/constants/utils.

---

## (a) Route → render-tech → key-components

| Route | Render tech | 4D/rotation? | Key components | Engine coupling |
|---|---|---|---|---|
| **/explore** | Inline **SVG** + RAF | Yes — `rotate4D`+`project4Dto2D` (explore/page.js:420/431) | in-file `GridView`, `TesseractView`; combinatorics tables | light (archetypes, constants, neighborhoods_canon) |
| **/22-reader** | **DOM/CSS** (clip-path diamonds, CSS transform pan/zoom) | No | `components/map/MapCanvas.js`, `components/map/CardNode.js` | heavy (mapAnalysis, map/positions) |
| **/map** | — REMOVED (404, no redirect) | — | — | — |
| **/visualize** | Inline **SVG** + RAF | Yes (same math) | in-file Grid+Tesseract (origin of explore's) | light |
| **/seeds** | Inline **SVG** | No (static grid) | in-file grid | light (archetypes) |
| **/tesseract** | Inline **SVG** + RAF | Yes (same math) | in-file tesseract | light |
| **/diagnostic** | **DOM/CSS** panels | No | `ToolExplorerPanel`, `LiveReadingPanel` | heaviest (mapAnalysis + diagnosticTools + 4 condition libs) |

---

## (b) INTEGRATION POINTS — where a new graphic plugs in

**Reusable scaffolds that already exist (build on these, don't reinvent):**

- **SVG tesseract scaffold** — `TesseractView` in `app/explore/page.js:655` (and its standalone twin `app/tesseract/page.js`). The pure functions `rotate4D` (`explore/page.js:420`), `project4Dto2D` (`:431`), `projectVertex` (`:439`) are the reusable 4D math kernel. Any new graphic that lives "on the hypercube" (e.g. a **16-fold-recursion** animation, a path-tracing cascade between vertices) should reuse these projection functions and the existing `requestAnimationFrame` angle loop rather than introducing a 3D engine.
  - *Recommendation:* lift `rotate4D`/`project4Dto2D`/`projectVertex`/`VERTICES`/`EDGES` into a shared `lib/tesseract.js` (they are currently copy-pasted across `/explore`, `/visualize`, `/tesseract`) so a new graphic imports one source of truth. This de-duplication is the highest-leverage prep step before adding any new tesseract-based viz.

- **SVG grid scaffold** — `GridView` (`explore/page.js:465`). For a graphic that animates *across the 4×4 Forty-Fold grid* (e.g. an **animated derivation-cascade** sweeping seed→medium→fruition→feedback, or a **selfless-love sequence** tracing a path through positions), the `getNodeCenter`/`perpOffset` helpers + the existing `pathLines` arrow-drawing machinery already produce animated directional arrows between positions. A new cascade is mostly a new `seq`/path generator feeding the same `<line marker>` renderer.

- **DOM diamond-house scaffold** — `MapCanvas` + `CardNode` (`components/map/`). For a graphic anchored to the houses/cards (status-aware), this pan/zoom DOM surface is reusable. A new overlay layer is straightforward to add as absolutely-positioned children inside `MapCanvas`.

**Most natural plug-in targets per requested graphic:**
- *Animated derivation-cascade:* extend `GridView`'s path system (stage-ordered `seq`) — or, for a 4D feel, animate edge-opacity sweeps in `TesseractView` keyed to a time cursor. Add as a new toggle in `/explore` controls.
- *Selfless-love / path sequence:* a new entry in the `SEEDS`/`paths` data + the existing arrow renderer; drop into `/visualize` (the cleanest sandbox) first.
- *16-fold-recursion:* belongs on the tesseract — reuse the projection kernel; render recursion levels as nested/decaying edge sets driven by the RAF loop.

**Caveat for the future engineer:** the lack of a 3D engine means anything requiring true volumetric/lit 3D (real depth occlusion, shaded solids, large particle counts) would be the *first* place to introduce react-three-fiber. But everything the current app does (4D wireframe projection, diamond cards, animated paths) is comfortably within the existing SVG/DOM approach and re-rendering at RAF is already proven performant for 16 vertices. Prefer extending the SVG scaffold unless the new graphic genuinely needs lit 3D.
