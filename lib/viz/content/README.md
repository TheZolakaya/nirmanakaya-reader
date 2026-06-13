# Curtiss Content Index — `curtiss_index.json`

Per-signature CONTENT INDEX for the Nirmanakaya visualization toolkit. Feeds the
**Content Template** primitive (card art + canonical text + correlated/convergence
tiers). Currently covers the **22 archetypes** (ids 0–21).

## Source files

Parsed from the 22 Curtiss convergence files:

```
D:\Nirmanakaya_Book_Final_0\Nirmanakaya_Final\curtiss\archetype_00_potential.md
... through ...
D:\Nirmanakaya_Book_Final_0\Nirmanakaya_Final\curtiss\archetype_21_creation.md
```

Ignored: `archetype_00_potential_placeholder.md` and any
production-instruction / prompt / checklist files in that folder.

Each source file has four sections:
`I. NIRMANAKAYA ARCHITECTURE`, `II. CONVERGENCE EVIDENCE`,
`III. HOW IT WORKS`, `IV. ENCOUNTER`. Section II contains nine numbered
findings, each ending with an `[*Illuminates: <attribute key> — ...*]` anchor
tag, followed by a nine-row Cross-Tradition Summary table
(Tradition | Observation | Nirmanakaya Attribute Illuminated).

All 22 files yielded exactly 9 convergence findings each = **198 findings total**.

## Schema

`curtiss_index.json` is an object keyed by archetype id as a string (`"0"`–`"21"`),
each value:

```jsonc
{
  "id": 0,                       // numeric archetype id
  "name": "Potential",           // modern (verb-shift) archetype name
  "traditional": "The Fool",     // traditional tarot name
  "epigraph": "\"...\" — The Curtisses, Key to the Universe",  // opening quote + attribution
  "convergence": [               // one entry per numbered Section II finding (9)
    {
      "n": 1,                     // 1-based finding index (matches table row order)
      "title": "...",             // finding heading (or bold-lead for files 07/08)
      "traditions": ["Kabbalistic"],  // traditions named, from the table's Tradition column
      "illuminates": "house/Gestalt + function/Seed — ...",  // verbatim from the [*Illuminates:*] tag
      "summary": "..."            // 1–2 sentence distillation of the finding body
    }
  ],
  "crossTraditionTable": [        // the Section II summary table, row-for-row
    { "tradition": "Kabbalistic", "observation": "...", "illuminates": "House: Gestalt Seed..." }
  ],
  "howItWorks": "...",           // full plain-language text of Section III (verbatim)
  "encounter": "..."             // full text of Section IV, VERBATIM reading/transmission prose
}
```

### Field notes

- **`encounter`** is preserved **verbatim** — it doubles as reading/transmission
  prose and must not be paraphrased. `howItWorks` is also kept as full text.
- **`convergence[n]` pairs 1:1 with `crossTraditionTable[n-1]`.** The finding's
  `traditions` list is derived from the matching table row's Tradition cell
  (compound cells like `Hindu/Egyptian/Greek/Chinese` are split; trailing
  qualifier words such as "numerology"/"imagery" and parentheticals like
  "(Number)" are stripped to clean tokens).
- **`illuminates`** is the attribute key copied exactly from the in-line
  `[*Illuminates: ...*]` tag (e.g. `governance/Source (10)`,
  `house/Gestalt + function/Seed`).
- Two source files (07 Drive, 08 Fortitude) use a bold-lead finding style
  (`**Title**`) under a "What They Found" wrapper instead of `### N.` headings;
  the parser handles both and discards the wrapper heading.

## Future second source — `correspondences`

The Nirmanakaya Wiki `Mapping_*` nodes
(Tarot / I-Ching / Kabbalah / Pythagorean / Aztec / DSM) are a planned **second
source** to merge into this same index under a new `correspondences` key on each
archetype record — a structured table of cross-system correspondences distinct
from the Curtiss convergence evidence. When added, keep the Curtiss material
under `convergence` / `crossTraditionTable` and place the wiki mappings under
`correspondences` so the two tiers stay separable in the Content Template.

## Rebuilding

Regenerate from source with the build helper in this folder:

```
python _build_curtiss_index.py
```

It re-reads the 22 markdown files and rewrites `curtiss_index.json`. Per-file
parse failures degrade gracefully (empty string/array) rather than failing the
whole build.
