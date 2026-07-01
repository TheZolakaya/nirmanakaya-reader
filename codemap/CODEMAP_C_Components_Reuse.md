# CODEMAP C — Visualization Components & Reuse Seams

Map of the visual views in the Nirmanakaya Reader webapp so a future engineer can REUSE existing
scaffolds and know where to plug in new graphics without duplicating. All paths absolute.

---

## TL;DR

- There is **NO Three.js / react-three-fiber**. The only animation dep is `framer-motion@^11`
  (`D:\NKYAWebApp\nirmanakaya-reader\package.json`). All "3D" is hand-rolled SVG with manual 4D
  rotation/projection math.
- Two completely different visual families:
  1. **Tesseract / Grid** family — pure SVG, lives INLINE inside route pages
     (`app/explore/page.js`, `app/visualize/page.js`, `app/tesseract/page.js`, `app/seeds/page.js`).
     These share *constants and math by copy-paste*, not by import. This is the big duplication.
  2. **Diamond-house card mandala** family — DOM/CSS (`<img>` + absolute positioning + CSS rotate),
     properly componentized under `components/map/` and reused by `/22-reader` and `/map`.
- The card art is static PNGs under `public/map/{archetypes,bounds,agents}/` + `thumbs/`, addressed
  through `lib/cardImages.js` (`getCardImagePath`).

---

## 1. The Tesseract / Hypercube (used by /explore)

**File:** `D:\NKYAWebApp\nirmanakaya-reader\app\explore\page.js` (2784 lines). The tesseract is the
inline component `TesseractView` defined at **explore/page.js:655**.

- **Tech:** raw inline **SVG** (`<svg viewBox=...>` at explore/page.js:740). No canvas, no WebGL, no
  library. Lines are `<line>`, vertices are `<circle>`/`<g>`, glow via an SVG `<filter id="pathGlow">`
  (explore/page.js:748). Animation is a manual `requestAnimationFrame` loop (explore/page.js:668-684).
- **Vertices:** the 16 manifest signatures, hardcoded as 4-bit coordinates in `VERTICES`
  (explore/page.js:18-35), e.g. `8: { bits:[1,1,1,1] }`.
- **Edges:** computed once at module load by Hamming-distance-1 between vertices — IIFE `EDGES`
  (explore/page.js:129-141). Edge color keyed by which bit flips, `EDGE_COLORS` (explore/page.js:119).
- **4D rotation + projection** (the reusable math core):
  - `rotate4D(point, aXW, aYZ, aXY)` — explore/page.js:420. Three plane rotations (XW, YZ, XY).
  - `project4Dto2D(p, pd4=4, pd3=6)` — explore/page.js:431. Double perspective divide: 4D→3D then
    3D→2D, returns `{x, y, scale}`. `scale` is reused for depth-fade opacity & z-sorting
    (explore/page.js:735, 757-758).
  - `projectVertex(bits, ...)` — explore/page.js:439. Maps 0/1 bits to -1/+1 and pipes through both.
- **Toggles** (all driven by props into `TesseractView`, explore/page.js:655):
  - color-by **Being/Identity/Practice/Stage** → `COLOR_MODES` lookup (explore/page.js:105) →
    `getVertexColor(id, mode)` (explore/page.js:443). Per-aspect group→color tables `BEING_T`,
    `IDENTITY_T`, `PRACTICE_T`, `STAGE_T` at explore/page.js:101-104.
  - **Diagonals / Axis XW+YZ ↔ XY+ZW** → `rotateAxis` state, drag handler at explore/page.js:699-705;
    toggle button explore/page.js:2087.
  - **Shade (affine planes fill)** → `showAffinePlanes` + `affineShadeFill`, `AFFINE_PLANES`
    (explore/page.js:121-126), rendered explore/page.js:763+.
  - **Stages** → `showStages`, `FULL_STAGES`/`FULL_STAGE_COLORS` (explore/page.js:144-151).
  - **Group Colors** → `GROUP_COLORS` master table (explore/page.js:107-118).
  - Preset orientation buttons (Default/Flat/Classic/Deep/45°) set the three angles
    (explore/page.js:2088-2092).
- **Interaction:** click toggles "rotate mode", then window mousemove/touchmove drives angles
  (explore/page.js:689-729); wheel adjusts XY angle (explore/page.js:744). Auto-rotate pauses during
  drag (`dragging.current`/`rotateModeRef`).

**The companion `GridView`** (explore/page.js:465) renders the same 16 signatures as a 4×4 SVG grid
with channel/path arrows — also pure SVG, also inline. `GRID` layout at explore/page.js:89-94.

### Duplication alert
`app/visualize/page.js` defines its OWN `GridView` (visualize/page.js:174) and `TesseractView`
(visualize/page.js:344) — near-identical earlier copies. `app/explore/page.js` even comments the Grid
as *"verbatim from /visualize"* (explore/page.js:463). `app/tesseract/page.js` (393 lines) and
`app/seeds/page.js` (883 lines) are further standalone variants. **None of the tesseract/grid code is
extracted into `components/` — it is copy-pasted across 4 route files.** This is the single biggest
reuse seam to fix.

---

## 2. The Diamond-House Card Mandala (used by /map and /22-reader)

This family IS properly componentized under `D:\NKYAWebApp\nirmanakaya-reader\components\map\`.

- **`MapCanvas.js`** (159 lines) — generic pan/zoom/keyboard container. CSS `transform: translate scale`
  on a fixed 1800×1650 stage (MapCanvas.js:117-127). Mouse drag, wheel zoom, arrow-key pan, +/-/0
  shortcuts. **Fully reusable as a viewport wrapper for any large fixed-size canvas.**
- **`CardNode.js`** (226 lines, `memo`) — one card. Absolute `left/top/width` positioning; height comes
  from image natural aspect ratio (CardNode.js:96-97). Element-color background inset
  (`ELEMENT_COLORS` by channel, CardNode.js:18-24), hover scale, highlight pulse keyframes
  (CardNode.js:200-219). Pulls art via `getCardImagePath` (CardNode.js:4). **Reusable.**
- **`HouseGroup.js`** (70 lines, `memo`) — a rotated-square "house": a container div is CSS-rotated
  (e.g. mind house `groupRotation: -45`) and the four archetype cards inside use *local* coords so they
  appear upright-in-diamond (HouseGroup.js:24-36). Geometry from `lib/map/positions.js`.
- **Geometry source of truth:** `D:\NKYAWebApp\nirmanakaya-reader\lib\map\positions.js`. `CONFIG`
  (positions.js:11), `HOUSES` definitions with per-house `groupRotation` + `cardOffsets`
  (positions.js:40+), and accessors `getHouseContainer` (positions.js:286), `getArchetypeLocalPosition`
  (positions.js:250), `getPortalPosition` (positions.js:272), `getBoundPosition`/`getAgentPosition`.
  All "verbatim from `public/map/index.html`" — the original static prototype is still in
  `public/map/index.html`.

### Status border styling (Too Much / Too Little / Unacknowledged / Balanced)
Lives in **`app/22-reader/page.js`**, not in a shared component. `STATUS_GLOW` map at 22-reader:14-19:
each status → `{ color, label, rotation }`. The card is wrapped in a div that applies a colored
`border` + `boxShadow` glow and a CSS `rotate(status.rotation)` (upright/right/left/inverted) —
22-reader:359-367. A non-rotating status badge sits on top (22-reader:385-405). `/22-reader` also has
alternate color layers (practice/activity/being/identity/stage/neighborhood) via `colorLayer` state
(22-reader:60, 145-170).

---

## 3. Shared Visualization Utilities & Data

- **Color systems:** the canonical group→color tables are **duplicated**: inline `C`/`COLOR_MODES`/
  `GROUP_COLORS` in explore (explore/page.js:10-118) AND `ELEMENT_COLORS` in CardNode
  (CardNode.js:18-24) AND `STATUS_GLOW` in 22-reader (22-reader:14). No single shared palette module.
- **Canonical signature data (shared by import):** `lib/archetypes.js` (`ARCHETYPES/BOUNDS/AGENTS`),
  `lib/constants.js` (`BEING_GROUPS, IDENTITY_GROUPS, HOUSES, DIMENSION_VERBS, STATUSES`),
  `lib/neighborhoods_canon.js` (`NEIGHBORHOOD_CANON`). These ARE imported cleanly everywhere — the data
  layer is the healthy reuse seam; the *render* layer is what's duplicated.
- **Geometry helpers:** `lib/map/positions.js` (mandala) is shared. Tesseract math (`rotate4D`,
  `project4Dto2D`) is NOT extracted — it lives only inside explore/visualize/tesseract page files.
- **Pentagram/star & torus:** there is no dedicated star/torus component. The "torus/neighborhoods"
  toggle is a `showTorus` prop threaded into the inline `GridView` (explore/page.js:465 signature;
  visualize/page.js:174) — it is grid decoration, not a separate renderer.
- **Animation utilities:** none centralized. framer-motion is used ad hoc; the tesseract uses a raw
  rAF loop.

### Card art assets
- Location: `D:\NKYAWebApp\nirmanakaya-reader\public\map\{archetypes,bounds,agents}\` plus mirrored
  `public\map\thumbs\...` (lighter PNGs used for bounds/agents — CardNode.js:7-9, 67-70).
- Naming (from `lib/cardImages.js:56-87`):
  - Archetypes: `/map/archetypes/NN_name.png` (zero-padded id + lowercased underscored name).
  - Bounds: `/map/bounds/{suit}/{suit}_NN.png` (suit from channel: Intent→wands, Cognition→swords,
    Resonance→cups, Structure→pentacles).
  - Agents: `/map/agents/{suit}_{rank}.png` (rank from role: Initiate→page, Catalyst→knight,
    Steward→queen, Executor→king).
- Original static prototype: `public/map/index.html` (the source all positions.js geometry mirrors).

---

## 4. Performance / mobile patterns to follow

- **Mobile split pattern:** `/explore` renders entirely different trees by width. `app/explore/page.js`
  default export (explore/page.js:2776-2783): `useState(false)` + resize listener at **1024px** →
  `isMobile ? <ExploreMobile/> : <ExploreDesktop/>`. Mirror this for any new heavy graphic.
- **DepthCard pattern (per memory):** per-component window-width listener at **720px** threshold in
  `components/reader/DepthCard.js`.
- Memory notes: on mobile `/explore`, Rotate/Shade/Stages/Stage-Anim default OFF for perf; auto-rotate
  pauses during manual drag (already implemented, explore/page.js:672).
- `CardNode` and `HouseGroup` are `React.memo` — keep new card-grid renderers memoized.
- Thumbnails (`/map/thumbs/`) are used for the small bound/agent cards to cut payload — reuse for any
  dense card view.

---

## KEY QUESTIONS — answered

1. **Reusable Three.js/r3f scaffold?** No. There is no WebGL/Three at all. The closest reusable "3D
   scaffold" is the SVG 4D math in `app/explore/page.js` (`rotate4D`/`project4Dto2D`/`projectVertex`,
   lines 420-441) — but it is *not yet extracted* into a shared module. Each tesseract view is bespoke
   and copy-pasted.
2. **Shared vs duplicated.** Mandala family is genuinely shared (`components/map/*` + `lib/map/positions.js`),
   reused by `/map` and `/22-reader`. Tesseract/Grid family is duplicated 4× across
   `app/{explore,visualize,tesseract,seeds}/page.js`. Data layer (`lib/archetypes`, `lib/constants`,
   `lib/neighborhoods_canon`) is cleanly imported everywhere — that's the healthy seam.
3. **Cleanest place to add a NEW animated graphic** (derivation cascade 1→4→16→seal; selfless-love
   two-circles; 16-fold recursion): build it as a new SVG component that imports the existing data
   (`lib/archetypes`, `lib/constants`) and — for anything 4D/projected — reuses the math from
   `app/explore/page.js:420-441`. The cascade/recursion graphics map naturally onto the existing
   `VERTICES`/`EDGES`/`SEEDS` structures (explore/page.js:18-62), so derive geometry from those rather
   than re-typing coordinates. Wrap pan/zoom needs in the already-generic `components/map/MapCanvas.js`.
4. **Perf patterns:** follow the 1024px `isMobile` split (explore/page.js:2776) and the 720px
   DepthCard listener; memoize card nodes; default heavy animation OFF on mobile.

---

## (a) Inventory

| Component / item | File | Purpose | Tech | Reusable? |
|---|---|---|---|---|
| `TesseractView` | app/explore/page.js:655 | 4D hypercube of 16 signatures, color/shade/stage toggles | inline SVG + rAF + manual 4D math | N (inline, not extracted) |
| `GridView` | app/explore/page.js:465 | 4×4 grid w/ path arrows, torus toggle | inline SVG | N (inline, dup of /visualize) |
| `rotate4D` / `project4Dto2D` / `projectVertex` | app/explore/page.js:420-441 | 4D rotation + double perspective projection | plain JS math | **Y in spirit** (but needs extraction to lib) |
| `VERTICES` / `EDGES` / `SEEDS` / `AFFINE_PLANES` | app/explore/page.js:18-141 | hypercube geometry + path data | const tables | Y (copy as data) |
| `TesseractView` / `GridView` (older) | app/visualize/page.js:344 / :174 | earlier duplicate of above | inline SVG | N (duplicate to consolidate) |
| tesseract standalone | app/tesseract/page.js | another standalone variant | inline SVG | N (duplicate) |
| seeds view | app/seeds/page.js | seed-path variant | inline SVG | N (duplicate) |
| `MapCanvas` | components/map/MapCanvas.js | pan/zoom/keyboard viewport for fixed stage | DOM + CSS transform | **Y** |
| `CardNode` | components/map/CardNode.js | single card img + element bg + hover/highlight | DOM/CSS/`<img>`, memo | **Y** |
| `HouseGroup` | components/map/HouseGroup.js | rotated-diamond house of 4 archetype cards | DOM/CSS rotate, memo | **Y** |
| `positions.js` | lib/map/positions.js | mandala geometry (houses, offsets, portals, rotations) | data + accessors | **Y** |
| `STATUS_GLOW` + status wrapper | app/22-reader/page.js:14, 359-405 | Too Much/Little/Unack/Balanced border+glow+rotate | inline CSS | partial (extract to component) |
| `getCardImagePath` / thumbs | lib/cardImages.js:56 | PNG path resolution by id (archetype/bound/agent) | path builder | **Y** |
| Card art PNGs | public/map/{archetypes,bounds,agents}/ + thumbs/ | signature artwork | static assets | **Y** |
| color tables | explore/page.js:10-118; CardNode.js:18; 22-reader:14 | palettes (duplicated 3×) | const objects | partial (should unify) |
| `LayoutSwitcher` / `Minimap` | components/map/LayoutSwitcher.js; reader/Minimap.js | layout toggle, minimap | DOM | Y |
| canonical data | lib/archetypes.js, lib/constants.js, lib/neighborhoods_canon.js | signatures, groups, neighborhoods | data | **Y (already the shared seam)** |

---

## (b) BUILD-ON-THIS recommendation

**Extend, don't fork.** For a new animated graphic:

1. **Viewport / pan-zoom:** wrap it in `components/map/MapCanvas.js` (already generic, MapCanvas.js:14).
2. **If it's 4D/projected** (16-fold recursion, cascade-to-seal): reuse the projection math at
   `app/explore/page.js:420-441` and the `VERTICES`/`EDGES` geometry at explore/page.js:18-141. Render
   as inline SVG `<line>`/`<circle>` with the existing `pathGlow` filter pattern (explore/page.js:748)
   for animated reveals. framer-motion (already installed) is the right tool to animate stroke-dasharray
   /opacity for a 1→4→16→seal cascade or the two-circles selfless-love figure.
3. **If it's card-based:** reuse `CardNode` (components/map/CardNode.js) + `getCardImagePath`
   (lib/cardImages.js) so it inherits the real art and element colors for free.
4. **Data:** import from `lib/archetypes.js` / `lib/constants.js` — never re-type signature lists.
5. **Palette:** pull from `GROUP_COLORS` (explore/page.js:107) so new graphics match.
6. **Mobile:** copy the `isMobile` 1024px split (explore/page.js:2776) and default animation OFF.

**What is genuinely MISSING and must be built fresh:**

- **A shared 4D/SVG render module.** The single highest-leverage refactor: extract `rotate4D`,
  `project4Dto2D`, `projectVertex`, `VERTICES`, `EDGES`, color tables into e.g.
  `lib/viz/tesseract.js` + a `components/viz/TesseractView.js`, then point explore / visualize /
  tesseract / seeds at it. New graphics should import that module rather than copy-pasting a 5th time.
- **A unified palette module** (`lib/viz/palette.js`) to end the 3-way color duplication.
- **No general 3D scene/camera/controls scaffold exists** — if a graphic needs true perspective 3D
  (not 4D-to-SVG), that is greenfield (would mean adding Three.js/r3f, currently absent). For the named
  graphics (cascade, two-circles, 16-fold recursion) the existing SVG approach is sufficient and
  cheaper — recommend staying SVG + framer-motion, not introducing WebGL.
- **A reusable status-border wrapper** — the `STATUS_GLOW` rotate/glow logic (22-reader:14, 359-405)
  is inline; extracting it to `components/map/StatusCard.js` would let new diagnostic graphics show
  Too Much/Little/Unack/Balanced consistently.
