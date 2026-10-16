# Deck — a new Nirmanakaya deck, made by Chris + AI

The art is generated with Higgsfield (GPT Image 2.5, 2:3, high quality, 2k; about 2.75 credits per image).
The meaning comes from canon (`nirmanakaya_78_definitions.json`), and the lineage comes from the 1995 hand-drawn map.
No text is ever generated inside the art. Names, numbers and glyphs are set by code in the card frame.

## Pilot 01 (2026-10-14): the three founding cards, three directions

Cards: IX Discipline (the Hermit), X Source (the Wheel), XI Equity (Justice), the three that came first in 1991.

| Row | Direction | Read |
|---|---|---|
| A | **Ink & Light**: fine black felt-tip line on warm paper, one gold accent | Closest to the 1995 hand. Prints cleanly. Clear and calm. |
| B | **Night**: indigo painting, gold line-work, one inner light | Most cinematic. Matches the app's dark UI. A crowded genre. |
| C | **Pearl**: frontal icon, mother-of-pearl, gold leading | Most transcendent. Risks being too sweet across 78 cards. |

`three_directions.jpg` shows the grid. `ink_to_night.jpg` is the key test: the same Ink drawings converted
in code to light-on-night. One drawing serves the printed deck (paper), the app and film
(light on night), and the animation (lines that can draw themselves). That only works in one direction:
a painting can't become a line drawing.

**Recommendation:** A is the master. Night is a derived treatment, not a separate deck. Pearl is reserved for rare moments.

Higgsfield job IDs (A0–A2, B0–B2, C0–C2):
f6ea4bfc, a34558e2, 12d7692f · ffd1a0a8, 679bdb63, 54d63e57 · f3a77e67, 89547974, 1b77515b

## The Rhyme Rule (from Chris's Magic Mirror slides 39–49)

Vertical pairs (n and 20−n, via `verticalPartnerId` in canon) and the two portals **must visually rhyme**.
They share a compositional skeleton, gesture or motif, and differ in one polarity. This is how the
Rider–Waite pairs showed the structure in 1991 (four creatures, mirrored poses, stars, pillars, wings, raised hands).
In the new deck the rhyme is designed in on purpose, so all ten pairs carry it, including the ones
Rider–Waite left weak (7/13, 8/12, 9/11).

Method: generate the first card of a pair, then generate its partner with the first card attached as an image reference
and a prompt that names what stays the same and what flips.

## Pilot 02 (2026-10-15): rhyming pairs

`rhyming_pairs.jpg`:
- **X Source ↔ XXI Creation.** The same four creatures in the same corners, emblems on one card and living creatures on the other.
  Light pours *in* at the top (Ingress) and *out* at the bottom (Egress). The polarity comes straight from canon.
- **IX Discipline ↔ XI Equity.** The same hooded figure, tree and horizon. Walking versus standing still. The lantern's
  height becomes the scales' balance point, and the winding path becomes a level line.

Higgsfield job IDs: Creation af104fe2 (ref a34558e2) · Equity v2 dfa0b243 (ref f6ea4bfc).

This also gives the film its **Rhyme** move for free: the camera dissolves from one partner to the other
and the shared lines stay put.

## Card grammar: three visual layers, all derived from canon (2026-10-16)

Every archetype sits where a **House** (column of the 4×4 square) crosses a **Channel** (row).
Each House holds exactly one card per Channel and exactly two vertical pairs. So every image carries three layers,
each one readable at a glance and each one checkable against `lib/archetypes.js`:

| Layer | Read from | Shared by | Visual cue |
|---|---|---|---|
| **House: the world** | `house` | the 4 cards of a House | Same setting, ground and sky, same light temperature. House glyph and color in the frame. |
| **Channel: the gold** | `channel` | the 4 cards of a row (one per House) | The single gold accent takes the Channel's form |
| **Pair: the rhyme** | `verticalPartnerId` + `WHEEL_WORLD_ASSOCIATION` | 2 cards (n, 20−n), always in the same House | Shared composition; light arriving (Wheel) vs light released (World) |

**House worlds (proposal):**
- **Soul / Aether ⊛ (purple):** open high air, horizon and sun. Nothing built, nothing grown. *0 Potential · 1 Will · 19 Actualization · 20 Recognition*
- **Spirit / Fire ▲ (red):** night sky, stars, moon, pillars of light. *2 Wisdom · 3 Nurturing · 17 Inspiration · 18 Imagination*
- **Mind / Air ● (green):** built things such as stone, towers, thrones, columns and steps. *4 Authority · 5 Culture · 15 Abstraction · 16 Breakthrough*
- **Emotion / Water ☾ (blue):** water, rivers and wings, with figures in motion. *6 Compassion · 7 Drive · 13 Transformation · 14 Tune*
- **Body / Earth ■ (brown):** ground, trees, animals and paths. *8 Fortitude · 9 Discipline · 11 Equity · 12 Faith* (pilot 02 already has this world)
- **Portals 10 Source · 21 Creation:** outside the Houses. The four creatures and the circle.

These mostly confirm what Rider–Waite already carries (the Moon, Star and Priestess are celestial; the Emperor, Hierophant, Tower and Devil are built and enthroned),
so the deck is making existing lineage intentional rather than inventing it.

**Channel gold (proposal):** the form follows the 1995 glyphs.
- **Intent** (17 · 4 · 7 · 12): a point or flame, rising (▲).
- **Cognition** (2 · 15 · 14 · 9): a fine straight ray or edge, a clear line (●, air).
- **Resonance** (18 · 5 · 6 · 11): a curve, ripple or flow (☾).
- **Structure** (3 · 16 · 13 · 8): a solid gold shape such as a block, crown or square (■).
- **Soul** cards take the Channel of the House they **govern** (`GOVERNANCE_MAP` in `lib/constants.js`):
  0 Potential → Spirit (Intent) · 19 Actualization → Mind (Cognition) · 20 Recognition → Emotion (Resonance) · 1 Will → Body (Structure).

**The payoff:** lay out the 16 House cards as the 4×4 square and the structure becomes visible without a single number.
Columns share a world, rows share a gold, and pairs mirror. The square that sums to 40 both ways can be *seen* as well as counted.

**Settled (Chris, 2026-10-16):** the Soul cards carry the Houses they govern.

**The Rhyme's polarity is canon, not taste.** `WHEEL_WORLD_ASSOCIATION` in `lib/constants.js` gives every archetype a
Wheel or World lean. Every vertical pair splits one Wheel card and one World card
(0W/20Wo · 1Wo/19W · 2W/18Wo · 3Wo/17W · 4W/16Wo · 5Wo/15W · 6W/14Wo · 7Wo/13W · 8W/12Wo · 9Wo/11W). So the one
thing that flips inside each pair is the same thing that flips between the portals: **Wheel cards show light
arriving (from above, inward), and World cards show light released (downward, outward).** The whole deck carries
the Source/Creation polarity.

**Frame:** each card shows its House glyph and its designator glyph, the same as Chris's magic-square slide.
That slide's colored lines joining same-designator cards across Houses are the film's Tally move for the rows.
