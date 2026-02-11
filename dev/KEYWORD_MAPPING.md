# Keyword Mapping & Image Audit
## Complete Inventory of All Clickable Popup Terms in the Nirmanakaya Reader

*Generated: Feb 10, 2026*

---

## SUMMARY

| Category | Count | Popup Type | Color | Has Images? | Book Chapter(s) |
|----------|-------|------------|-------|-------------|-----------------|
| Archetypes | 22 | InfoModal (full card) | Amber | YES (22 PNGs) | Ch 14, 21, 29-31 |
| Bounds | 40 | InfoModal (full card) | Amber | YES (40 PNGs) | Ch 22 |
| Agents | 16 | InfoModal (full card) | Amber | YES (16 PNGs) | Ch 22 |
| Houses | 6 | InfoModal | Cyan | No | Ch 11 |
| Channels | 4 | InfoModal | Cyan | No | Ch 10 |
| Statuses | 4 | InfoModal | Emerald | No | Ch 23 |
| Roles | 4 | InfoModal | Cyan | No | Ch 22 |
| Glossary (unique) | ~95 | InfoModal / GlossaryTooltip | Violet | No | Various |
| **TOTAL** | **~191** | | | **78 card images** | |

### Image Status: All 78 card images exist
- `getCardImagePath()` in `lib/cardImages.js` generates paths under `/map/`
- **`public/map/archetypes/`** — 22 PNGs (one per archetype)
- **`public/map/bounds/`** — 40 PNGs across 4 subdirs (intent/, cognition/, resonance/, structure/)
- **`public/map/agents/`** — 16 PNGs (one per agent)
- **`public/map/thumbs/`** — thumbnail versions
- InfoModal renders these via `{cardImagePath && <img>}` — all working in production
- Houses, channels, statuses, roles, and glossary terms do NOT have images

---

## 1. ARCHETYPES (22 terms, IDs 0-21)

Cards popup via InfoModal with: name, traditional name, image, minimap position, type badge, house, process stage, channel, extended description, associated bounds/agents.

Image path format: `/map/archetypes/XX_name.png` (all 22 exist)

| ID | Name (Hotlink Text) | Traditional | House | Channel | Function | Expected Image | Book Section |
|----|---------------------|-------------|-------|---------|----------|---------------|-------------|
| 0 | Potential | The Fool | Gestalt | — | Seed | `/map/archetypes/00_potential.png` | Ch 14 (Step 0), Ch 29 |
| 1 | Will | The Magician | Gestalt | — | Medium | `/map/archetypes/01_will.png` | Ch 14 (Step 1), Ch 29 |
| 2 | Wisdom | The High Priestess | Spirit | Cognition | Seed | `/map/archetypes/02_wisdom.png` | Ch 14 (Step 2), Ch 30 |
| 3 | Nurturing | The Empress | Spirit | Structure | Medium | `/map/archetypes/03_nurturing.png` | Ch 14 (Step 3), Ch 30 |
| 4 | Order | The Emperor | Mind | Intent | Seed | `/map/archetypes/04_order.png` | Ch 14 (Step 4), Ch 31 |
| 5 | Culture | The Hierophant | Mind | Resonance | Medium | `/map/archetypes/05_culture.png` | Ch 14 (Step 5), Ch 31 |
| 6 | Compassion | The Lovers | Emotion | Resonance | Seed | `/map/archetypes/06_compassion.png` | Ch 14 (Step 6), Ch 31 |
| 7 | Drive | The Chariot | Emotion | Intent | Medium | `/map/archetypes/07_drive.png` | Ch 14 (Step 7), Ch 31 |
| 8 | Fortitude | Strength | Body | Structure | Seed | `/map/archetypes/08_fortitude.png` | Ch 14 (Step 8), Ch 30 |
| 9 | Discipline | The Hermit | Body | Cognition | Medium | `/map/archetypes/09_discipline.png` | Ch 14 (Step 9), Ch 30 |
| 10 | Source | Wheel of Fortune | Portal | — | Ingress | `/map/archetypes/10_source.png` | Ch 9, Ch 14 (Step 10), Ch 29 |
| 11 | Equity | Justice | Body | Resonance | Fruition | `/map/archetypes/11_equity.png` | Ch 14 (Step 11), Ch 30 |
| 12 | Sacrifice | The Hanged Man | Body | Intent | Feedback | `/map/archetypes/12_sacrifice.png` | Ch 14 (Step 12), Ch 30 |
| 13 | Change | Death | Emotion | Structure | Fruition | `/map/archetypes/13_change.png` | Ch 14 (Step 13), Ch 31 |
| 14 | Balance | Temperance | Emotion | Cognition | Feedback | `/map/archetypes/14_balance.png` | Ch 14 (Step 14), Ch 31 |
| 15 | Abstraction | The Devil | Mind | Cognition | Fruition | `/map/archetypes/15_abstraction.png` | Ch 14 (Step 15), Ch 31 |
| 16 | Breakthrough | The Tower | Mind | Structure | Feedback | `/map/archetypes/16_breakthrough.png` | Ch 14 (Step 16), Ch 31 |
| 17 | Inspiration | The Star | Spirit | Intent | Fruition | `/map/archetypes/17_inspiration.png` | Ch 14 (Step 17), Ch 30 |
| 18 | Imagination | The Moon | Spirit | Resonance | Feedback | `/map/archetypes/18_imagination.png` | Ch 14 (Step 18), Ch 30 |
| 19 | Actualization | The Sun | Gestalt | — | Fruition | `/map/archetypes/19_actualization.png` | Ch 14 (Step 19), Ch 29 |
| 20 | Awareness | Judgement | Gestalt | — | Feedback | `/map/archetypes/20_awareness.png` | Ch 14 (Step 20), Ch 29 |
| 21 | Creation | The World | Portal | — | Egress | `/map/archetypes/21_creation.png` | Ch 9, Ch 14 (Step 21), Ch 29 |

---

## 2. BOUNDS (40 terms, IDs 22-61)

Cards popup via InfoModal with: name, traditional name, image, minimap, channel, archetype reference, description.
Image paths: `/map/bounds/{channel}/XX_name.png` (all 40 exist)

Expected image path format: `/map/bounds/{suit}/{suit}_XX.png`

### Intent Channel (Wands) — IDs 22-31

| ID | Name | Traditional | # | Archetype | Expected Image |
|----|------|-------------|---|-----------|---------------|
| 22 | Activation | Ace of Wands | 1 | Potential | `/map/bounds/wands/wands_01.png` |
| 23 | Orientation | 2 of Wands | 2 | Inspiration | `/map/bounds/wands/wands_02.png` |
| 24 | Assertion | 3 of Wands | 3 | Order | `/map/bounds/wands/wands_03.png` |
| 25 | Alignment | 4 of Wands | 4 | Drive | `/map/bounds/wands/wands_04.png` |
| 26 | Dedication | 5 of Wands | 5 | Sacrifice | `/map/bounds/wands/wands_05.png` |
| 27 | Recognition | 6 of Wands | 6 | Sacrifice | `/map/bounds/wands/wands_06.png` |
| 28 | Resolve | 7 of Wands | 7 | Drive | `/map/bounds/wands/wands_07.png` |
| 29 | Command | 8 of Wands | 8 | Order | `/map/bounds/wands/wands_08.png` |
| 30 | Resilience | 9 of Wands | 9 | Inspiration | `/map/bounds/wands/wands_09.png` |
| 31 | Realization | 10 of Wands | 10 | Potential | `/map/bounds/wands/wands_10.png` |

### Cognition Channel (Swords) — IDs 32-41

| ID | Name | Traditional | # | Archetype | Expected Image |
|----|------|-------------|---|-----------|---------------|
| 32 | Perception | Ace of Swords | 1 | Actualization | `/map/bounds/swords/swords_01.png` |
| 33 | Reflection | 2 of Swords | 2 | Wisdom | `/map/bounds/swords/swords_02.png` |
| 34 | Calculation | 3 of Swords | 3 | Abstraction | `/map/bounds/swords/swords_03.png` |
| 35 | Repose | 4 of Swords | 4 | Balance | `/map/bounds/swords/swords_04.png` |
| 36 | Discernment | 5 of Swords | 5 | Discipline | `/map/bounds/swords/swords_05.png` |
| 37 | Guidance | 6 of Swords | 6 | Discipline | `/map/bounds/swords/swords_06.png` |
| 38 | Reconciliation | 7 of Swords | 7 | Balance | `/map/bounds/swords/swords_07.png` |
| 39 | Immersion | 8 of Swords | 8 | Abstraction | `/map/bounds/swords/swords_08.png` |
| 40 | Plurality | 9 of Swords | 9 | Wisdom | `/map/bounds/swords/swords_09.png` |
| 41 | Clarity | 10 of Swords | 10 | Actualization | `/map/bounds/swords/swords_10.png` |

### Resonance Channel (Cups) — IDs 42-51

| ID | Name | Traditional | # | Archetype | Expected Image |
|----|------|-------------|---|-----------|---------------|
| 42 | Receptivity | Ace of Cups | 1 | Awareness | `/map/bounds/cups/cups_01.png` |
| 43 | Merge | 2 of Cups | 2 | Imagination | `/map/bounds/cups/cups_02.png` |
| 44 | Celebration | 3 of Cups | 3 | Culture | `/map/bounds/cups/cups_03.png` |
| 45 | Reverie | 4 of Cups | 4 | Compassion | `/map/bounds/cups/cups_04.png` |
| 46 | Reckoning | 5 of Cups | 5 | Equity | `/map/bounds/cups/cups_05.png` |
| 47 | Reciprocity | 6 of Cups | 6 | Equity | `/map/bounds/cups/cups_06.png` |
| 48 | Allure | 7 of Cups | 7 | Compassion | `/map/bounds/cups/cups_07.png` |
| 49 | Passage | 8 of Cups | 8 | Culture | `/map/bounds/cups/cups_08.png` |
| 50 | Fulfillment | 9 of Cups | 9 | Imagination | `/map/bounds/cups/cups_09.png` |
| 51 | Completion | 10 of Cups | 10 | Awareness | `/map/bounds/cups/cups_10.png` |

### Structure Channel (Pentacles) — IDs 52-61

| ID | Name | Traditional | # | Archetype | Expected Image |
|----|------|-------------|---|-----------|---------------|
| 52 | Initiation | Ace of Pentacles | 1 | Will | `/map/bounds/pentacles/pentacles_01.png` |
| 53 | Flow | 2 of Pentacles | 2 | Nurturing | `/map/bounds/pentacles/pentacles_02.png` |
| 54 | Formation | 3 of Pentacles | 3 | Breakthrough | `/map/bounds/pentacles/pentacles_03.png` |
| 55 | Preservation | 4 of Pentacles | 4 | Change | `/map/bounds/pentacles/pentacles_04.png` |
| 56 | Steadfastness | 5 of Pentacles | 5 | Fortitude | `/map/bounds/pentacles/pentacles_05.png` |
| 57 | Support | 6 of Pentacles | 6 | Fortitude | `/map/bounds/pentacles/pentacles_06.png` |
| 58 | Harvest | 7 of Pentacles | 7 | Change | `/map/bounds/pentacles/pentacles_07.png` |
| 59 | Commitment | 8 of Pentacles | 8 | Breakthrough | `/map/bounds/pentacles/pentacles_08.png` |
| 60 | Flourishing | 9 of Pentacles | 9 | Nurturing | `/map/bounds/pentacles/pentacles_09.png` |
| 61 | Achievement | 10 of Pentacles | 10 | Will | `/map/bounds/pentacles/pentacles_10.png` |

---

## 3. AGENTS (16 terms, IDs 62-77)

Cards popup via InfoModal with: name, traditional name, image, minimap, role, channel, archetype reference, description.
Image paths: `/map/agents/XX_name.png` (all 16 exist)

Expected image path format: `/map/agents/{suit}_{rank}.png`

| ID | Name | Traditional | Channel | Role | Archetype | Expected Image |
|----|------|-------------|---------|------|-----------|---------------|
| 62 | Initiate of Intent | Page of Wands | Intent | Initiate | Inspiration | `/map/agents/wands_page.png` |
| 63 | Catalyst of Intent | Knight of Wands | Intent | Catalyst | Order | `/map/agents/wands_knight.png` |
| 64 | Steward of Intent | Queen of Wands | Intent | Steward | Drive | `/map/agents/wands_queen.png` |
| 65 | Executor of Intent | King of Wands | Intent | Executor | Sacrifice | `/map/agents/wands_king.png` |
| 66 | Initiate of Cognition | Page of Swords | Cognition | Initiate | Wisdom | `/map/agents/swords_page.png` |
| 67 | Catalyst of Cognition | Knight of Swords | Cognition | Catalyst | Abstraction | `/map/agents/swords_knight.png` |
| 68 | Steward of Cognition | Queen of Swords | Cognition | Steward | Balance | `/map/agents/swords_queen.png` |
| 69 | Executor of Cognition | King of Swords | Cognition | Executor | Discipline | `/map/agents/swords_king.png` |
| 70 | Initiate of Resonance | Page of Cups | Resonance | Initiate | Imagination | `/map/agents/cups_page.png` |
| 71 | Catalyst of Resonance | Knight of Cups | Resonance | Catalyst | Culture | `/map/agents/cups_knight.png` |
| 72 | Steward of Resonance | Queen of Cups | Resonance | Steward | Compassion | `/map/agents/cups_queen.png` |
| 73 | Executor of Resonance | King of Cups | Resonance | Executor | Equity | `/map/agents/cups_king.png` |
| 74 | Initiate of Structure | Page of Pentacles | Structure | Initiate | Nurturing | `/map/agents/pentacles_page.png` |
| 75 | Catalyst of Structure | Knight of Pentacles | Structure | Catalyst | Breakthrough | `/map/agents/pentacles_knight.png` |
| 76 | Steward of Structure | Queen of Pentacles | Structure | Steward | Change | `/map/agents/pentacles_queen.png` |
| 77 | Executor of Structure | King of Pentacles | Structure | Executor | Fortitude | `/map/agents/pentacles_king.png` |

---

## 4. HOUSES (6 terms)

| Name | Members | Governor | Book Chapter |
|------|---------|----------|-------------|
| Gestalt | Potential, Will, Actualization, Awareness | Source (10) | Ch 11, Ch 29 |
| Spirit | Wisdom, Nurturing, Inspiration, Imagination | Potential (0) | Ch 11, Ch 30 |
| Mind | Order, Culture, Abstraction, Breakthrough | Actualization (19) | Ch 11, Ch 31 |
| Emotion | Compassion, Drive, Change, Balance | Awareness (20) | Ch 11, Ch 31 |
| Body | Fortitude, Discipline, Equity, Sacrifice | Will (1) | Ch 11, Ch 30 |
| Portal | Source, Creation | None | Ch 9, Ch 11 |

---

## 5. CHANNELS (4 terms)

| Name | Traditional | Element | Book Chapter |
|------|-------------|---------|-------------|
| Intent | Wands | Fire | Ch 10 |
| Cognition | Swords | Air | Ch 10 |
| Resonance | Cups | Water | Ch 10 |
| Structure | Pentacles | Earth | Ch 10 |

---

## 6. STATUSES (4 terms)

| Name | Orientation | Book Chapter |
|------|-------------|-------------|
| Balanced | Now-aligned | Ch 23 |
| Too Much | Future-projected | Ch 23 |
| Too Little | Past-anchored | Ch 23 |
| Unacknowledged | Shadow | Ch 23 |

---

## 7. ROLES (4 terms)

| Name | Traditional | Book Chapter |
|------|-------------|-------------|
| Initiate | Page | Ch 22 |
| Catalyst | Knight | Ch 22 |
| Steward | Queen | Ch 22 |
| Executor | King | Ch 22 |

---

## 8. GLOSSARY TERMS (unique concepts beyond cards/houses/channels/statuses/roles)

These are terms that appear ONLY in the glossary (not already covered by the card/house/channel/status/role systems). They use violet-colored hotlinks.

### Houses (glossary duplicates with richer data)
| Slug | Name | Book Chapter |
|------|------|-------------|
| gestalt-house | Gestalt House | Ch 11, Ch 29 |
| spirit-house | Spirit House | Ch 11, Ch 30 |
| mind-house | Mind House | Ch 11, Ch 31 |
| emotion-house | Emotion House | Ch 11, Ch 31 |
| body-house | Body House | Ch 11, Ch 30 |

### Rings (8 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| ring-0 | Ring 0 | Ch 5, Ch 34 |
| ring-1 | Ring 1 | Ch 9, Ch 34 |
| ring-2 | Ring 2 | Ch 29, Ch 34 |
| ring-3 | Ring 3 | Ch 30, Ch 34 |
| ring-4 | Ring 4 | Ch 31, Ch 34 |
| ring-5 | Ring 5 | Ch 25, Ch 34 |
| ring-6 | Ring 6 | Ch 30, Ch 34 |
| ring-7 | Ring 7 | Ch 27, Ch 34 |

### Concepts (12 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| now | Now | Ch 33 |
| un-now | Un-Now | Ch 27, Ch 33 |
| the-un-now | The Un-Now | Ch 27, Ch 33 |
| instant-return | Instant Return | Ch 33 |
| retrieval | Retrieval | Ch 23, Ch 33 |
| veil | The Veil | Ch 25 |
| veil-of-individuation | Veil of Individuation | Ch 25 |
| nowism | Nowism | Ch 33 |
| nowism-pyramid | Nowism Pyramid | Ch 33 |
| collapse-point | Collapse Point | Ch 33 |
| correction | Correction | Ch 23 |
| imbalance | Imbalance | Ch 23 |
| rebalancer | Rebalancer | Ch 23 |
| position | Position | Ch 24 |
| signature | Signature | Ch 15, Ch 21 |

### Operations (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| polarity | Polarity | Ch 13 |
| recursion | Recursion | Ch 13 |
| yang | Yang | Ch 13 |
| yin | Yin | Ch 13 |

### Relationships / Dualities (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| vertical-partner | Vertical Partner | Ch 23 |
| diagonal-partner | Diagonal Partner | Ch 23 |
| reduction-partner | Reduction Partner | Ch 23 |
| duality | Duality | Ch 23 |

### Rebalancers (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| vertical-duality | Vertical Duality | Ch 23 |
| diagonal-duality | Diagonal Duality | Ch 23 |
| reduction-pair | Reduction Pair | Ch 23 |
| growth-opportunity | Growth Opportunity | Ch 23 |

### Growth (3 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| transpose-pair | Transpose Pair | Ch 23 |
| polarity-anchor | Polarity Anchor | Ch 23 |
| self-expression | Self-Expression | Ch 23 |

### Process Stages / Functions (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| seed | Seed | Ch 12 |
| medium | Medium | Ch 12 |
| fruition | Fruition | Ch 12 |
| feedback | Feedback | Ch 12 |

### Phases (3 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| creation-phase | Creation Phase | Ch 14 |
| the-turn | The Turn | Ch 9, Ch 14 |
| operation-phase | Operation Phase | Ch 14 |

### Portal Types (2 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| ingress | Ingress | Ch 9 |
| egress | Egress | Ch 9 |

### Pillars (7 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| pillar-1 | Pillar 1: You Are Creating | Ch 25 |
| pillar-2 | Pillar 2: You Are the Creator | Ch 25 |
| pillar-3 | Pillar 3: Seven Pillars of Purpose | Ch 25 |
| pillar-4 | Pillar 4: Authentic Creation | Ch 25 |
| pillar-5 | Pillar 5: Genuine Participation | Ch 25 |
| pillar-6 | Pillar 6: Unified Purpose | Ch 25 |
| pillar-7 | Pillar 7: Present Moment Awareness | Ch 25 |

### Structures (6 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| forty-fold-seal | Forty-Fold Seal | Ch 16 |
| the-three-seals | The Three Seals | Ch 16 |
| seven-pillars | Seven Pillars | Ch 25 |
| tesseract | Tesseract | Ch 16, Ch 19 |
| house | House | Ch 11 |
| channel | Channel | Ch 10 |
| status | Status | Ch 23 |
| ring | Ring | Ch 34 |
| portal | Portal | Ch 9 |

### Card Types (9 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| archetype | Archetype | Ch 21 |
| inner-archetype | Inner Archetype | Ch 21 |
| outer-archetype | Outer Archetype | Ch 21 |
| ingress-portal | Ingress Portal | Ch 9 |
| egress-portal | Egress Portal | Ch 9 |
| inner-bound | Inner Bound | Ch 22 |
| outer-bound | Outer Bound | Ch 22 |
| bound | Bound | Ch 22 |
| agent | Agent | Ch 22 |
| transient | Transient | Ch 24 |

### Framework (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| nirmanakaya | Nirmanakaya | Ch 2 |
| the-78-signatures | The 78 Signatures | Ch 21 |
| the-law | The Law | Ch 13 |
| law-of-conscious-self-creation | Law of Conscious Self-Creation | Ch 13 |

### Mathematics (3 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| phi | Phi | Ch 16, Ch 19 |
| fibonacci | Fibonacci | Ch 16, Ch 19 |
| digital-root | Digital Root | Ch 16, Ch 23 |

### Alignments (2 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| forge | Forge | Ch 12 |
| mirror | Mirror | Ch 12 |

### Reading Modes (4 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| forge-mode | Forge Mode | Ch 24, Ch 35 |
| inquiry-mode | Inquiry Mode | Ch 24 |
| reflect-mode | Reflect Mode | Ch 24 |
| discover-mode | Discover Mode | Ch 24 |

### Practice (2 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| realitycraft | Realitycraft | Ch 35 |
| return-to-now | Return to Now | Ch 33 |
| reading | Reading | Ch 24 |

### Interpretation (2 terms)
| Slug | Name | Book Chapter |
|------|------|-------------|
| the-one-thing-happening | The One Thing Happening | Ch 24 |
| meet-then-elevate | Meet Then Elevate | Ch 24 |

### Connector (1 term)
| Slug | Name | Book Chapter |
|------|------|-------------|
| in-your | In Your | Ch 24 |

---

## IMAGE REQUIREMENTS

### Priority 1: The 22 Archetypes (HIGHEST IMPACT)
These are the most frequently referenced terms. Each needs a unique image.

**Required files (22 images):**
```
public/map/archetypes/00_potential.png
public/map/archetypes/01_will.png
public/map/archetypes/02_wisdom.png
public/map/archetypes/03_nurturing.png
public/map/archetypes/04_order.png
public/map/archetypes/05_culture.png
public/map/archetypes/06_compassion.png
public/map/archetypes/07_drive.png
public/map/archetypes/08_fortitude.png
public/map/archetypes/09_discipline.png
public/map/archetypes/10_source.png
public/map/archetypes/11_equity.png
public/map/archetypes/12_sacrifice.png
public/map/archetypes/13_change.png
public/map/archetypes/14_balance.png
public/map/archetypes/15_abstraction.png
public/map/archetypes/16_breakthrough.png
public/map/archetypes/17_inspiration.png
public/map/archetypes/18_imagination.png
public/map/archetypes/19_actualization.png
public/map/archetypes/20_awareness.png
public/map/archetypes/21_creation.png
```

### Priority 2: The 40 Bounds
Each suit needs 10 images (Ace through 10).

**Required files (40 images):**
```
public/map/bounds/wands/wands_01.png through wands_10.png
public/map/bounds/swords/swords_01.png through swords_10.png
public/map/bounds/cups/cups_01.png through cups_10.png
public/map/bounds/pentacles/pentacles_01.png through pentacles_10.png
```

### Priority 3: The 16 Agents
Each suit needs 4 images (Page, Knight, Queen, King).

**Required files (16 images):**
```
public/map/agents/wands_page.png
public/map/agents/wands_knight.png
public/map/agents/wands_queen.png
public/map/agents/wands_king.png
public/map/agents/swords_page.png
public/map/agents/swords_knight.png
public/map/agents/swords_queen.png
public/map/agents/swords_king.png
public/map/agents/cups_page.png
public/map/agents/cups_knight.png
public/map/agents/cups_queen.png
public/map/agents/cups_king.png
public/map/agents/pentacles_page.png
public/map/agents/pentacles_knight.png
public/map/agents/pentacles_queen.png
public/map/agents/pentacles_king.png
```

### Total Image Count Needed: 78 images (22 + 40 + 16)

**Thumbnail versions** also expected (same structure under `/map/thumbs/`):
- 78 more files = **156 total image files** if thumbnails are also created

---

## TECHNICAL ARCHITECTURE

### How Hotlinks Work
1. **Source**: `lib/hotlinks.js` → `buildHotlinkTerms()` builds a unified dictionary
2. **Matching**: Case-sensitive regex OR `[bracket]` markers in AI-generated text
3. **Rendering**: `renderWithHotlinks(text, setSelectedInfo)` creates clickable `<span>` elements
4. **Colors**: Amber (cards), Cyan (structure), Emerald (status), Violet (glossary)
5. **Popup**: `InfoModal` component shows full details; `GlossaryTooltip` shows lightweight popup

### How Card Images Work
1. `lib/cardImages.js` → `getCardImagePath(id)` generates the path
2. `InfoModal` renders `<img src={cardImagePath}>` if the path is non-null
3. All 78 card images (22 archetypes + 40 bounds + 16 agents) exist in `public/map/`

### Book Page Structure (For Linking)
1. Book lives at `/book` (TOC) and `/book/[slug]` (chapter pages)
2. Chapters defined in `lib/book-data.js` with slugs like `ch09-the-portals-and-the-self`
3. `MarkdownRenderer` generates heading IDs from h1/h2/h3 text
4. h2/h3 have `scroll-mt-20` class for proper scroll positioning
5. **URL pattern**: `/book/{slug}#{heading-id}` will scroll to that section
6. Example: `/book/ch23-the-four-states-and-rebalancing#too-much`

### Key Files
- `lib/hotlinks.js` — Hotlink term dictionary, regex matching, rendering
- `lib/archetypes.js` — ARCHETYPES, BOUNDS, AGENTS data
- `lib/constants.js` — CHANNELS, HOUSES, ROLES, STATUS_INFO
- `lib/glossary.js` — Glossary loader from JSON
- `nirmanakaya_glossary.json` — 191 terms with popup definitions
- `lib/cardImages.js` — Image path generation (78 images in `public/map/`)
- `lib/corrections.js` — Correction logic, growth pairs, associations
- `components/shared/InfoModal.js` — Full popup modal
- `components/shared/GlossaryTooltip.js` — Lightweight tooltip popup
- `components/shared/ClickableTermContext.js` — Shared clickable term wrapper
- `components/shared/MarkdownRenderer.js` — Book chapter renderer (generates heading IDs)
- `lib/book-data.js` — Chapter index with slugs
