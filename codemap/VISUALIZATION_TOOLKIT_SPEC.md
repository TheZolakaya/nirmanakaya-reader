# VISUALIZATION TOOLKIT SPEC — "The Map Instrument"

**Authored:** 2026-06-12, Chris + Code. Design doc for the composable visualization layer of the Nirmanakaya Reader. Build from this; refine as use cases surface.
**Reads with:** `CODE_MAP_Visualization_MASTER.md` (what exists in prod) in this folder.

## Core idea

**One set of typed NODES. Many LAYOUTS. Composable into every teaching view, signature drill-down, live-reading tool, and narrative story.**

A view is never bespoke. It's a choice of *which nodes*, *which layout*, *which connectors*, *what's focused*, and *static-or-live data*. Build each primitive once; everything composes.

## The atom: a typed Node (NOT just "signature")

The "exceptions" Chris named (fundamental nodes, the love story) revealed that the atom can't be "signature." It's a **Node with a `kind`.** Signatures are the most-used kind, but they're one rung of the framework's own derivation ladder — and narrative objects are a separate kind entirely.

```
Node = {
  id,
  kind,                 // see taxonomy
  data,                 // name, number, fields…
  address4D?,           // signatures only: {practice, activity, being, identity, stage}
  state?,               // live: balanced | tooMuch | tooLittle | unacknowledged
  coords: layout => {x,y,scale}   // placement is per-layout (see Layouts)
}
```

### Node kinds (the derivation ladder + the narrative layer)

**Structural (the framework's own hierarchy — render every rung to teach the climb):**
- `fundamental` — the dot / bit; the ten-node **tetractys** (1+2+3+4=10); the "is" ideogram. The bottom rungs of the logical derivation.
- `aggregate` — the 5 houses; the elements (Earth/Water/Air/Fire/Aether); Being & Identity groups; Source(10)/Creation(21) portals; Creator/Creation poles. The grouping rungs.
- `signature` — the 78 (archetype 0-21 / bound 22-61 / agent 62-77). The dominant rung; the only kind with a full **4D address** + states.

**Narrative (story objects, not map positions — same primitives, different kind):**
- `concept` — a consciousness (circle), Creator, Creation; abstract entities in a told story.
- `narrative` — bridges, directional arrows (love / growth), the wave of potentials, the dual-slit, the pyramid, the Vitruvian frame. Story-telling elements.

**Dispatch rule:** rendering, layout, and connection all dispatch on `kind`. The 4D-address + duality/reduction/governance machinery applies only to `signature`; `fundamental` gets tetractys placement; `concept`/`narrative` get free placement and bespoke render.

## The 7 primitives

1. **Nodes (typed)** — as above.
2. **Layouts** — pure functions `node → {x,y,scale}`: `grid` (4×4 magic square) · `tesseract` (4D wireframe, true addresses) · `pentagram` (5 houses on the star) · `diamond-houses` (the card mandala) · `linear-walk` (the 0→21 sequence / Möbius) · `tetractys` (the ten dots) · `free` (narrative). The SAME nodes animate *between* layouts.
3. **Node renderer** — `dot` / `numbered-glyph` / `labeled-vertex` / `art-card` / `circle`, chosen by kind + context.
4. **Connectors** — a styled edge `(from, to, type)`: `diagonal-duality` (sum 19/21) · `vertical-duality` (sum 20) · `reduction` (mod-9) · `governance` · `flow` (stage mesh) · `star-path` (pentagram) · `narrative` (love/growth arrows). One primitive, many styles.
5. **Focus controller** — select a node → compute its related set → emphasize it + highlight, dim the rest. **The teaching interaction AND the live-reading drill-down are the same mechanism.**
6. **Inspector** — textual anatomy that travels with the focused node (reuse /explore's inspector pattern).
7. **Data adapter** — binds everything to either *static structure* (teaching) or a *live reading's* computed state from `analyzeFullMap` (health, corrective vector, traces, governance).

## Breadth check — every use case composes from the 7

| Use case | = primitives |
|---|---|
| **Story of the whole map** | all signatures · animate layout grid→tesseract→pentagram · structural connectors |
| **Single-signature anatomy** | focus(one) · its duality + reduction + governance connectors · inspector |
| **Duality / reduction pairs** | connectors filtered to that type, highlighted, in any layout |
| **On the pentagram** | pentagram layout · star-path connector |
| **Live-reading drill-down** | data-adapter(live) · diamond-house layout · focus(drawn card) · corrective-vector connector · inspector |
| **Derivation story (dot → seal)** | `fundamental`+`aggregate`+`signature` nodes · tetractys→grid→tesseract layouts · animated rung-by-rung build |
| **Love story** | `concept` nodes (consciousness circles) · `narrative` connectors (bridge, arrows) · free layout · framer-motion |

If a future use case does NOT compose from these → that's the signal we've found a genuinely new primitive worth adding. (Built broad by construction; validated against specifics.)

## The content dimension (orthogonal to geometry)

Geometry = nodes/layouts/connectors/focus. **Content = payloads/templates.** A signature isn't just a placed node — it carries a rich, multi-source content payload. Grounded in the actual structure of the Curtiss convergence files (`D:\Nirmanakaya_Book_Final_0\Nirmanakaya_Final\curtiss\archetype_NN_*.md`), each signature's payload has four tiers:

- **Architecture** (canonical) — position, house, function, governedBy, rules, channel, ring, pillar, sun/world, duality {vertical, diagonal, reduction}, states{}. Source: `lib/archetypes.js` + `constants.js`.
- **Convergence** (correlated, **attribute-anchored**) — a list of `{tradition, observation, illuminates: attributeKey}`. The Curtiss files tag every finding `[Illuminates: governance/Source]` etc. → correspondences are EDGES from a canonical attribute to a cross-tradition observation, not free text. Sources: the 22 curtiss files + the wiki `Mapping_*` nodes (Tarot, I-Ching, Kabbalah, Pythagorean, Aztec Sunstone, DSM, astrology).
- **How It Works** (pedagogy, plain language).
- **Encounter** (transmission register — already written in the Doors/Lifelines voice; doubles as reading prose).

**Two new primitives:**
8. **Content Template** — the Inspector, upgraded: renders a node's payload (card art + canonical block + the convergence tier). Because convergences are attribute-anchored, the **focus controller** spans canonical↔correlated: focus an attribute → its cross-tradition evidence lights up.
9. **Correspondence layouts + connector** — map the 22 onto a tradition's own structure: `aztec-sunstone` (glyphs around the sun), `astrology-wheel` (zodiac), `quadraverse` (the fourfold: states of matter / forces / DNA / spacetime), `tarot`. A `correspondence` connector links a signature to its cross-tradition glyph/passage. These double as **Buried-Consensus outreach assets** ("different lenses, same map").

**Data-prep (a build-time aggregation job):** parse `lib/archetypes.js` + the 22 `curtiss/archetype_NN_*.md` files + the wiki `Mapping_*` nodes into one **per-signature content index** (JSON, 78 entries) the Content Template reads. The Curtiss files' `[Illuminates: …]` tags make the convergence tier machine-parseable. Likely an agent pass.

## Two tracks

- **The Map Instrument** — structural nodes (`fundamental`/`aggregate`/`signature`) under the toolkit. The big, durable build; powers teaching + live-reading drill-downs.
- **Narrative pieces** — `concept`/`narrative` nodes. Can ship standalone fast (selfless-love v0.1 at `D:\NKYAWebApp\viz-prototypes\selfless-love.html`) OR be composed inside the instrument later. Same primitives either way.

## Implementation seam (from the code map)

- New shared modules in `lib/viz/`: the typed-node model; `palette.js` (resolve the deck-vs-site palette divergence — recommend element-true: Fire=red, Air=green, Water=blue, Earth=gold, Aether=purple); a 4D-address deriver (emit the 4-bit address from the constants group tables — all data present); the extracted 4D kernel (`rotate4D`/`project4Dto2D`/`projectVertex` from explore/page.js:420-441).
- Layouts as pure functions; reuse `components/map/MapCanvas` (pan/zoom), `CardNode` (art-card render), framer-motion (animation), the SVG `pathGlow` filter.
- **This IS the de-dup refactor the code map flagged — elevated from "stop the 5th copy-paste" to "build the composable instrument."** Same work, now with purpose.
- Mobile: 1024px `isMobile` split; memoize; heavy animation off on mobile.

## Build order (proposed)

1. `lib/viz/` foundation: typed-node model + palette + 4D-address deriver + extracted kernel. (Unblocks everything; IS the refactor.)
2. First layout + node renderer + one connector type → reproduce the existing tesseract from the toolkit (proof the abstraction works by rebuilding what exists).
3. Add layouts (grid, pentagram, diamond-houses) + focus controller → the single-signature anatomy view (first genuinely new teaching tool).
4. Data adapter → live-reading drill-down.
5. Narrative kind → fold selfless-love + derivation-story into the same toolkit.

— Chris + Code, 2026-06-12. Typed nodes, swappable layouts, one focus mechanism. The exceptions were never exceptions — they're the other rungs of the ladder.
