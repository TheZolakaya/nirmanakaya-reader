# CLAUDE.md — Nirmanakaya Animation Studio

Rules for making Nirmanakaya animations. Applies to everything under `animation/`.
The look and the voice live in `STYLE_GUIDE.md`. This file is how we work.

**Do not turn guesses into rules.** Only add a rule here after we've tested it.
Untested ideas go in `STYLE_GUIDE.md` as proposals or in `notes/`.

## Boundaries

- **The corpus is read-only.** Never edit anything outside `animation/`. That covers the app,
  `lib/`, `public/`, the specs, and every file in Chris's Google Drive. Read freely; write nothing.
- All animation work lives in `animation/`. It is not part of the Next.js build and must never
  import from or be imported by the app.
- Branch: the session's working branch, not `main`. Animation work never deploys.
- Renders go to `animation/out/`, which git ignores. Never commit MP4s, WAVs or frame dumps.
  Deliver them by sending the file.

## Privacy

- The founding story (`DRAFT_Keel_Founding_Story_*` in Drive) is **private and not canon**.
- Nothing from it goes to an outside service (Higgsfield, any upload, any public page) until Chris
  has approved the specific lines or shots. The math and structure beats are not private.
- Family, childhood and medical details are never used unless Chris names them for use.

## Accuracy (derive, don't interpret)

- Every number, name and structural claim in a script is traced to a source before it renders:
  `lib/archetypes.js`, `lib/constants.js`, `lib/corrections.js`, the Five Seals, or the founding story.
- Keep a `sources.md` beside each script: one line per claim → file and line.
- If canon and the founding story differ (names, House colors, elemental designators vs Channels),
  stop and ask. Don't pick silently.

## Approval gates

Stop after each stage and wait for Chris to approve. Never skip a stage.

1. **Style sheet.** The line, the card glyph, the palette and the type, shown in motion.
2. **Script.** Timed to length, with `sources.md` and the whole-pie read (below).
3. **Storyboard.** Frames rendered from the actual scene code, with timestamps and captions.
   Not generated images.
4. **Silent draft.** Full length at 960×540, 30 fps, no sound, plus one contact sheet of sampled frames.
5. **Final.** 1920×1080 (and 1080×1920 if ordered), 30 fps, with voice, score and effects.

Paid generation (Higgsfield credits) happens only after stage 3 is approved, and only for the
specific plates listed in the storyboard.

## The whole-pie read

Before showing a script, read it once as each of these people, and note anything that would
lose them: a scientist, a person of faith, a skeptic, a working person with no time, a magic
practitioner. Nobody is asked to convert. Fix it or flag it.

## How we build

- Scenes are code: HTML/SVG/Canvas driven by one seekable timeline.
- Deterministic only: seeded randomness, finite repeats, any frame renderable in isolation.
- Timing lives in one data file per film (`timing.json`). Picture and sound both read from it.
- Code draws the structure (lines, cards, numbers, geometry). Generated images are allowed only
  for atmosphere: cosmic plates, Pearl textures, nature.

## Efficiency

- Draft at 960×540. Render full resolution only for the final.
- Re-render only the scenes that changed.

## Tested commands

_None yet. Add each command here only after it has run successfully in this project._

## Delivery

- Final MP4: H.264, yuv420p, AAC, −14 LUFS integrated, peaks below −1.5 dBFS.
- Each film keeps its source in `animation/films/<slug>/` so it can be re-rendered later.
