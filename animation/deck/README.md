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
