# STYLE GUIDE — "One Line"

_v0 draft, 2026-10-14. Proposals until the style test is approved. Items marked **[decide]** need Chris._

## 1. The look in one sentence

A single continuous line draws an exact structure that anyone can count. It starts as felt-pen
ink on notebook paper, becomes light in the dark, and at the highest moments turns to pearl.
The cosmos grows out of the structure and never covers it.

**Words to test every frame against:** intriguing · simple · beautiful · transcendent · meaningful ·
authentic · cosmic · grounded.

## 2. Three registers, one line

The line never breaks between registers. When the register changes, the line carries over.

| Register | Feels | Used for | Surface |
|---|---|---|---|
| **Steno** | grounded, human, true | memory, 1991, the hand at work | warm steno paper, faint ruling, the steno pad's center rule, felt-pen ink |
| **Night** | clear, exact, vast | the derivation, the counting, the structure | deep indigo-black, lines of light, faint cosmic dust at the edges only |
| **Pearl** | transcendent | the tunnel, the beam, the final reveal | iridescent mother-of-pearl, oil-on-water sheen, soft bloom |

- **Pearl budget:** no more than about 10% of any film. It has to stay rare to stay holy.
- **Handoff from Steno to Night:** the paper darkens and its fibers become stars, while the pen stroke keeps
  drawing as light.
- **Handoff from Night to Pearl:** the line's glow widens until it becomes the light itself.

## 3. Palette

**Neutrals (proposal)**

| Token | Hex | Role |
|---|---|---|
| Night | `#0a0a14` | background, Night register |
| Deep | `#14142a` | vignette, depth |
| Paper | `#f2ecdf` | Steno background |
| Rule | `#b7c4b0` | steno ruling, about 25% opacity |
| Ink | `#1d1b22` | felt-pen stroke |
| Light | `#f6e7c1` | lines of light, numbers in Night |
| Gold | `#c9a24a` | portals (the Wheel and the World), sums that resolve |
| Pearl | `#f4e9ff → #d9f2f0 → #fbe3d6 → #e3e9ff` | iridescent sweep, Pearl only |

**Color is information, never decoration.** The structure starts as colorless light. A House
color appears only when that meaning is being shown.

**House colors [decide].** Canon has two schemes:

| House | App today (`lib/constants.js`) | 1991-lineage color map |
|---|---|---|
| Spirit | violet | red |
| Mind | cyan | green |
| Emotion | blue | blue |
| Body | green | brown |
| Gestalt / Soul | amber | purple |
| Portals | rose | purple |

Pick one scheme for every film. Either way, the film versions get toned down from the app's
Tailwind 400s so they glow on Night without looking neon.

## 4. Cast (no mascots)

The structure is the main character. The cast:

- **The Line.** About 2.5 px at 1080p. In Steno it is ink with a slight bleed and a round cap. In Night it is a light
  core with a soft glow (core 2 px, glow about 12 px at 35%). It always has a leading point that
  feels alive.
- **The Card Glyph.** A tall rounded rectangle at a 7:12 ratio, drawn by the Line. A Roman numeral
  sits at the top. The name sits at the bottom, with the traditional Tarot name small and the Nirmanakaya name
  below it **[decide: order and when the modern name first appears]**. It has no picture by default.
- **Card art as windows.** When a card's art appears, it sits inside the glyph in one shared
  treatment (duotone toward Night and Light, or a soft vignette). The current deck mixes many art
  styles (art nouveau, painterly, photographic, fresco, gilded relief), so a uniform frame is what
  keeps the film consistent.
- **The Number.** Numbers are physical. They lift off cards, travel, and add up.
- **The Hand (optional).** Chris's own hand or handwriting, from real scans only
  **[decide: do 1991 notebook pages or drawings survive?]**. Never fake handwriting with a font.

## 5. Typography

- **Display and names:** Cormorant Garamond (proposal; to test).
- **Numerals and arithmetic:** a serif with tabular figures so sums line up (candidates: Spectral, EB Garamond).
- **Handwriting:** Chris's real hand only, or none.
- On-screen text is limited to names, numbers and at most one short line. Never the narration itself.
- Safe margin: 90 px at 16:9. For 9:16, keep text clear of the bottom 20% and the top 10%.

## 6. Motion language

**Things don't pop. They arrive, as if they were always there.** The opposite of snappy is
inevitable, not floaty.

- **Drawing:** strokes draw at a steady speed with soft ends (about 700 px/s at 1080p; to test).
- **Arrival:** ease-out (expo or sine) with at most 1–2% overshoot. No bounce, no squash.
- **Breath, not bob:** idle elements pulse in brightness slowly (a 4–6 s period, about ±6%). Stillness is allowed.
- **Camera:** a slow push-in from 1.00 to 1.04 per scene. No shakes. Parallax only in cosmic plates.
- **Determinism:** seeded randomness, finite timelines, seekable to any frame.

**Signature moves** (our equivalent of the straw man's "gags"):

| Move | What happens |
|---|---|
| **The Fold** | The 0–9 row reaches 10 and turns; 11–20 runs back above it. |
| **The Rhyme** | Two paired cards light the same feature at the same moment (the Magician's and the Sun's arms, the Fool's and Judgement's mountains). |
| **The Tally** | Numbers lift off four cards, flow to one point and resolve to **40**, with a gold flash. |
| **Twenty** | Vertical pairs bridge with a thin line, and **20** appears at the midpoint. |
| **The Deal** | Cards travel along the pentagram's single stroke to their places. |
| **The Embryo** | A smaller form is born at the center of a balanced one and turns the opposite way. |
| **The Wrap** | The square's edges meet, forming a torus, and the 2×2 sums still hold across the seam. |
| **The Reduction** | 17 → 1+7 → 8, which jumps across the diagonal to meet its partner. |

**Sync rule** (kept from the straw man): a reveal lands on its spoken word, or 0.05–0.1 s
before it. One sentence is one visual beat. Hold 0.3 s after a sum lands before moving on.

## 7. Transitions

- The default is a **handoff**: the line keeps drawing across the cut into the next scene.
- Chapter breaks fade through Night (about 0.8 s).
- Register changes use the handoffs in section 2.
- No sliding sheets, no whips, no white flashes.

## 8. Composition

- 16:9 at 1920×1080 and 9:16 at 1080×1920, 30 fps. Design both from the start.
- One idea per frame, generous negative space.
- **Symmetry is a signature.** The structure is symmetric, so use center-weighted frames and
  break the symmetry only on purpose.
- A subtle vignette toward Deep, always.

## 9. Writing

- **Tone:** warm, plain, full of wonder, honest. Humor is welcome when it's warm ("Who's the one with the question?"), never snarky.
- **Hook:** open with a real question.
- **Sentences:** short, with fragments. At most one number per sentence. Pause after a sum lands.
- **Rule of three that opens, not deflates:** two grounded beats, then a third that opens up.
  ("Nine. Ten. Eleven." · "Salt, pepper. Love, hate. And then — what comes after balance?")
- **Invite checking:** "Count it yourself." The structure is the authority, not the narrator.
- **Claim no more than the structure shows.** Experience is told as experience.
- Use Chris's own words when it's Chris's story.
- **Pace:** about 120 words per minute, with real silence after the big sums.

## 10. Sound

- **Voice:** Chris, recorded **[decide]**. A generated voice only with approval.
- **Structural score (proposal; to test):** the score is generated in code, and the pitches come from the structure. Each
  archetype maps to a pitch; pairs that sum to 20 lock into a consonance; groups of 40 resolve to a chord.
  The textures are drones, struck bells, glass and slow harmonics. No recorded samples needed.
- **Effects:** pen on paper, page turns, soft chimes on sums. Subtle.
- Music sits 15–20 dB under the voice.
- Master to −14 LUFS with peaks below −1.5 dBFS.

## 11. Generated imagery (Higgsfield)

Only for atmosphere code can't draw: cosmic plates, Pearl textures, the forest clearing,
cloud light. Only after storyboard approval, and only for listed shots. Prompt templates will be
written after the style test.

## 12. Open decisions

1. House color scheme (section 3).
2. Card names: traditional name first, then the modern name? When does the modern name appear?
3. 1991 designator language (Fire, Air, Water, Earth) vs today's Channels. Probably tell it in 1991 terms, then bridge to today's names.
4. Narrator: Chris's voice?
5. Do real 1991 artifacts survive (steno notebook, taped-paper map, handwriting)?
