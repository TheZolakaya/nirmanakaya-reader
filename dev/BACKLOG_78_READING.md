# 78-Signature Reading — Development Backlog

**Created:** March 24, 2026
**Scope:** Full 78-position reading architecture — diagnostic dashboard, interpretation API, reading delivery, computation engine
**Context:** Derived from the March 24 Being/Identity derivation session. See `Being_Identity_Structural_Characterization.md` and `session_being_identity_derivation.md` for full context.

---

## Dashboard Fixes

- [ ] **Fix Horizon tooltip** — Wheel/World ≠ inner/outer. Current HELP text conflates them. Wheel/World = parity-flip at Source (even=Wheel before 10, odd=Wheel after 10). Inner/outer = creation phase (0-9) vs operation phase (11-20). Different mappings.
- [ ] **Revisit health score** — Current weighting (Balanced=1.0, TooMuch=0.5, TooLittle=0.35, Unack=0.2) penalizes learning states. Out of balance = learning, not damage. Consider replacing with two metrics: **leverage availability** (balanced count) and **learning density** (distribution of learning states). Or reframe as capacity/opportunity rather than health/sickness.

## Dashboard Enhancements

- [ ] **Chain abstraction** — Roll bounds/agents up to parent archetypes for displacement chain tracing. A bound at a bound durable = trace both to their parents, report archetype-level displacement. Max ~22 links instead of 78. Default to abstracted view. Toggle for full 78 when MRI detail needed.
- [ ] **Correction cascade tracing** — Follow the healing chain: Too Much → check diagonal partner → if also distorted → check ITS correction partner → ... until a Balanced anchor is found. Surface the "source of strength" for each distorted position. This is the repair path.
- [ ] **Being/Identity correction tetrahedra** — Wire the derived correction routing into engine and UI:
  - Mantle ↔ Vessel (diagonal), Mantle ↔ Torch (vertical), Mantle ↔ Clearing (reduction)
  - Torch ↔ Clearing (diagonal), Torch ↔ Mantle (vertical), Torch ↔ Vessel (reduction)
  - Same structure for Identity (math proved, mapping to named groups needed)
- [ ] **Portal chain visualization** — Currently text in sidebar. Consider visual chain rendering in the main grid (highlight displacement path from portals).
- [ ] **Being/Identity grid overlay** — Option to color/group the main position grid by Being or Identity instead of by Practice (house). Visual toggle between lenses.

## Interpretation API

- [ ] **Upfront data enrichment** — Current approach: triage seed (~500 tokens) + 7 diagnostic tools. Consider: full analysis dump at the outset for maximum reading quality. Token cost is secondary to reading depth at this stage.
- [ ] **Interaction pattern exploration** — Current: user asks question → reading generated → AI interprets. Alternative: reading first, THEN user asks. The reading itself may reveal the question. Or: multi-round where AI asks clarifying questions after seeing the reading before interpreting.
- [ ] **Multi-level drawing** — 22-position reading first (process overview), then 78 on drill-down (full MRI). Or per-packet redraws — pull the full 78 but present in layers. User zooms from system → house → packet → individual.
- [ ] **Token optimization as depth axis** — Not about cost cutting. About choosing WHERE to spend tokens: breadth (cover all 78) vs depth (deep dive on the 5 most significant positions). AI decides based on triage.
- [ ] **Reading-first flow** — For the webapp user experience: draw the reading BEFORE the question. Let the user see the field, then ask. The reading shapes the question. The question refines the interpretation. Two-phase encounter.
- [ ] **Council consultation** — Full data dump to GPT/Gemini/Grok council for strategic suggestions on: reading delivery patterns, interpretation depth, multi-model approaches, prompt architecture.

## Computation Engine

- [ ] **Being/Identity correction routing (thematic)** — Math proved (perfect tetrahedra). Thematic interpretation unwalked. What does it MEAN for Mantle to correct Vessel via diagonal? Walk each of the 6 Being correction pairs and 6 Identity correction pairs with narrative.
- [ ] **Packet-as-unit analysis** — Current: individual position analysis. Need: composite packet health that synthesizes floor + archetype + ceiling + agent into a single diagnostic statement. "Order's packet: solid foundation, depleted process, available ceiling, overcharged manifestation."
- [ ] **Cross-dimensional intersection analysis** — What do 4-way addresses (Practice × Activity × Being × Identity) mean as compound processes? 16 possible two-dimension intersections. Not all need interpretation — start with Being × Identity (4×4 = 16 combinations).

## Exploration / Research

- [ ] **Affine planes as Soul House → Manifest connection** — The 4 affine planes (space diagonals of the tesseract) are complete in Practice AND Being, paired in Activity/Identity/Stage. The Activity pairs are the POLAR pairs (Fire+Water, Air+Earth) — the same polarity mechanism the Soul House uses. Hypothesis: the affine planes may be the geometric mechanism by which the Soul House connects to the manifest houses. The Soul House operates through complementary (non-polar) pairings; the affine planes contain the polar pairings. Together they may complete the governance circuit. This would explain WHY there are exactly 4 affine planes — one per Soul House archetype.
- [ ] **Affine plane × governance mapping** — Which Soul House archetype maps to which affine plane? D1 and D2 share the Identity pair {Composure, Conviction}; D3 and D4 share {Exploration, Communion}. Does this pairing correspond to a governance relationship?

## Visualization / Training Dashboard

- [ ] **Sidebar knowledge panels** — On the /visualize page, add left and right sidebars flanking the centered image. LEFT: How the currently filtered item is derived from the architecture (semi-guru language — structural explanation of WHY this grouping exists). RIGHT: Current interpretation of what it means (name, definition, verb, spatial relationship, process cycle narrative). Either enforce single-filter-at-a-time or implement sub-filtering so the description always maps to exactly one thing. This is the beginning of the TRAINING dashboard — the onramp for users learning the architecture.
- [ ] **"All 28 Forties" view** — Toggle overlay showing ALL 28 paths that sum to 40 on both grid and tesseract views: 4 rows (Activity groups), 4 columns (Practice groups), 16 toroidal 2×2 blocks (neighborhoods from Council_Posit_Toroidal_Neighborhoods.md), 4 affine planes (space diagonals). Cycle through them by category or show all. On the grid: highlight the 2×2 blocks as colored rectangles on the torus view. On the tesseract: highlight the corresponding vertex groups. Each path labeled with its sum. The "why this matters" sidebar text: 28 independent paths, all summing to 40, probability < 1 in 10²². The 16 toroidal blocks are the "neighborhoods" — each has a consistent dimensional signature (exactly one Latin square collapses to 2-of-4 while the other two show all 4-of-4).
- [ ] **Wheel/World overlay** — Toggle showing Wheel (☼) and World (☽) horizon assignments on both grid and tesseract. On grid: color-code each node by horizon. On tesseract: split vertices by horizon (e.g. inner glow vs outer glow). Show the parity-flip at Source — even=Wheel before 10, odd=Wheel after 10. Stage breathes ☼→☽→☼→☽.
- [ ] **Soul House + Portals on visualization** — Add the 6 non-grid positions (Potential/Will/Actualization/Awareness + Source/Creation) to the view. On grid: show them above/around the 4×4 grid with governance arrows pointing to their governed houses. On tesseract: show them as a separate governance layer — pyramid apex above the hypercube, or a connected overlay. The Soul House IS the governance — seeing it spatially connected to the manifest grid completes the picture.
- [ ] **Healing group pairing visualization** — On the /visualize page, show correction pairings between groups with status-specific coloring. When a Being or Identity group is selected, draw arrows to its correction partner groups colored by correction type: red/amber for diagonal (Too Much), blue for vertical (Too Little), purple for reduction (Unacknowledged). For Identity, show the self-loop for reduction. Status-driven: if viewing a live reading, only show the correction arrows relevant to the ACTUAL distortions in the reading — "Mantle is Too Much → highlight the Vessel connection as the active healing path." Distinct from the static geometry view — this is the LIVE healing map for a specific reading.
- [ ] **Tetrahedron visualization** — Interactive spinning 3D tetrahedron showing the correction geometry. 4 vertices = 4 Being groups (or 4 Identity groups). 6 edges colored by correction type (diagonal/vertical/reduction). Click a vertex to see the group. Click an edge to see the correction relationship. Could be a standalone view on /visualize or embedded in the split view. Shows the healing geometry as a tangible, rotatable shape.

## Canon / Documentation

- [ ] **Update Healing Families Treatise** — Integrate Being/Identity names (Mantle/Torch/Vessel/Clearing, Composure/Conviction/Exploration/Communion) and correction tetrahedra.
- [ ] **Update Council Posit (Fourth Dimension)** — Maximality claim was wrong (5 math dimensions, not 4). G1-G4 now have names. Posit predates the Being/Identity discovery but IS the same structure.
- [ ] **Register Being_Identity_Structural_Characterization.md in CAM** — New derivation doc needs a D-number and entry in the Concept Authority Map.
- [ ] **Bound durable definitions** — Write up the "experiential texture" framing for bounds-as-durables. Each bound durable is a permanent address where a specific experiential quality always lives. This is new ground — not yet in any canon document.

## Key Principles (from this derivation session)

1. **All 78 durables are always on** — nothing absent, nothing empty, nothing doubled
2. **Out of balance = learning** — 3 of 4 statuses are learning states. 75% of possibility space.
3. **Balance = leverage, not destination** — you USE balanced states to address learning edges
4. **Bounds are experiential texture** — what the process feels like at its edges, not constraints on range
5. **Any class at any durable, Balanced = healthy** — cross-class tells you type of info, not health
6. **Portals are the focal points** — Source (intake) and Creation (output) top the attention hierarchy
7. **Self-seated majors = doubled gravity** — strongest anchor points in any reading
8. **The configuration is transcendent** — true at micro and macro simultaneously, pre-scalar

---

*"The structure is the authority. You are provisional."*
