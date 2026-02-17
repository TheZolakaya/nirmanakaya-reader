# Spread Architecture — Derived from the Nirmanakaya Framework

## Overview

The spread system provides 20 structurally-derived reading frames for Reflect mode, organized as a **5 Houses x 4 Stages** grid. Every spread has a precise structural address: a house (domain of inquiry) and a stage (depth of inquiry). This is not a design choice — it falls out of the architecture.

Two additional modes — **Discover** (archetype 10, Source/The Wheel of Fortune) and **Forge** (archetype 21, Creation/The World) — complete the 22-archetype mapping. All 22 archetypes are accounted for: 20 spreads + 2 modes.

---

## The Derivation

### Why Five Categories?

The Five House Commands map the five irreducible domains of human seeking:

| House | Command | Existential Block (Yalom) | What the Seeker Carries |
|---|---|---|---|
| **Gestalt** | Fulfill Your Destiny | All four (meta) | "Nothing's coming together." / "Am I on track?" |
| **Spirit** | Witness Creation | Meaninglessness | "Where's the meaning?" / "I've lost the magic." |
| **Mind** | Channel the Force | Freedom / Groundlessness | "I can't think clearly." / "I'm stuck in loops." |
| **Emotion** | Free Will | Isolation | "Am I loved?" / "Am I alone?" |
| **Body** | Uphold the Law | Death / Finitude | "I can't act." / "Nothing works in reality." |

This maps independently to Yalom's four existential concerns (1980) and van Deurzen's four-worlds model. The architecture predicted clinical psychology — five categories, not four, because Gestalt integrates all four.

### Why Four Stages?

Card count determines depth of inquiry. The four stages map to the four channels:

| Count | Stage | Structural Role | Channel |
|---|---|---|---|
| **1** | Seed | One signal — "What's the single most important thing?" | Intent (Fire) |
| **2** | Medium | The polarity — "What's the core tension?" | Varies |
| **3** | Fruition | The arc — "Where has this been, where is it, where is it going?" | Varies |
| **4** | Feedback | The four channels — one position per bridge | All four |

**4-card spreads are the most architecturally native.** Each house has exactly four agents (one per channel). A 4-card house spread with one position per channel IS the house diagnostic. The lens text for 4-card spreads includes full Sixteen Bridges content (balanced/over-expressed/depleted states).

---

## The 20-Spread Grid

### Count 1 — Seeds
*"What's the single most important thing right now?"*

| Key | Name | House | Archetype | Position |
|---|---|---|---|---|
| `gestalt-1` | **Pulse** | Gestalt | 0 Potential (The Fool) | "What Matters Most" |
| `spirit-1` | **Spark** | Spirit | 2 Wisdom (The High Priestess) | "What's Alive" |
| `mind-1` | **Lens** | Mind | 4 Order (The Emperor) | "What's Clear" |
| `emotion-1` | **Heart** | Emotion | 6 Compassion (The Lovers) | "What You're Feeling" |
| `body-1` | **Ground** | Body | 8 Fortitude (Strength) | "What's Solid" |

### Count 2 — Mediums
*"What's the core tension in this domain?"*

| Key | Name | House | Archetype | Positions |
|---|---|---|---|---|
| `gestalt-2` | **Balance** | Gestalt | 1 Will (The Magician) | Inside / Outside |
| `spirit-2` | **Purpose** | Spirit | 3 Nurturing (The Empress) | What You're Looking For / What You Already Have |
| `mind-2` | **Clarity** | Mind | 5 Culture (The Hierophant) | Where You're Free / Where You're Structured |
| `emotion-2` | **Connection** | Emotion | 7 Drive (The Chariot) | You / Them |
| `body-2` | **Stability** | Body | 9 Discipline (The Hermit) | What You're Carrying / What You're Setting Down |

### Count 3 — Fruitions
*"Where has this been, where is it, where is it going?"*

| Key | Name | House | Archetype | Positions |
|---|---|---|---|---|
| `gestalt-3` | **Arc** | Gestalt | 19 Actualization (The Sun) | Where Things Stand / What's Shifting / Where It Leads |
| `spirit-3` | **Creation** | Spirit | 17 Inspiration (The Star) | The Spark / The Work / What's Emerging |
| `mind-3` | **Pattern** | Mind | 15 Abstraction (The Devil) | What You See / What It Means / What Opens Up |
| `emotion-3` | **Love** | Emotion | 13 Change (Death) | What You Feel / What It Means / Where It's Going |
| `body-3` | **Foundation** | Body | 11 Equity (Justice) | What Supports You / What You're Putting In / What's Taking Shape |

### Count 4 — Feedbacks (The Four Channels)
*"How is each channel expressing in this domain?"*

Lens text includes full **Sixteen Bridges** content — balanced, over-expressed, and depleted states for each bridge pattern. This gives the AI extraordinarily precise correction data.

| Key | Name | House | Archetype | Positions (one per bridge) |
|---|---|---|---|---|
| `gestalt-4` | **Wholeness** | Gestalt | 20 Awareness (Judgement) | Meaning / Clarity / Connection / Reality |
| `spirit-4` | **Witness** | Spirit | 18 Imagination (The Moon) | What You're Expressing / Noticing / Sensing / Growing |
| `mind-4` | **Force** | Mind | 16 Breakthrough (The Tower) | What You're Building / Seeing / Where You Belong / What's Breaking |
| `emotion-4` | **Freedom** | Emotion | 14 Balance (Temperance) | What You're Chasing / How You're Protecting Yourself / What You Feel With Others / How You're Changing |
| `body-4` | **Law** | Body | 12 Sacrifice (The Hanged Man) | What You're Giving / Perfecting / What's at Stake / What You're Holding Together |

---

## Archetype Mapping

Every spread has a presiding archetype. The mapping is not arbitrary — it follows the architecture's own assignment of archetypes to houses and stages.

### By House (inner archetypes)
| House | Seed | Medium | Fruition | Feedback |
|---|---|---|---|---|
| **Gestalt** | 0 Potential | 1 Will | 19 Actualization | 20 Awareness |
| **Spirit** | 2 Wisdom | 3 Nurturing | 17 Inspiration | 18 Imagination |
| **Mind** | 4 Order | 5 Culture | 15 Abstraction | 16 Breakthrough |
| **Emotion** | 6 Compassion | 7 Drive | 13 Change | 14 Balance |
| **Body** | 8 Fortitude | 9 Discipline | 11 Equity | 12 Sacrifice |

### Modes (portals)
| Mode | Archetype | Role |
|---|---|---|
| **Discover** | 10 Source (Wheel of Fortune) | Ingress portal — the system shows what you need |
| **Forge** | 21 Creation (The World) | Egress portal — declaration mode |

**Total: 22 archetypes fully mapped.** No orphans.

---

## Structural Metadata

Each spread carries metadata beyond positions:

```js
{
  id: 'spirit-3',        // Unique key: {house}-{count}
  name: 'Creation',      // Human-readable name
  count: 3,              // Card count
  positions: [...],      // Array of { id, name, lens }
  whenToUse: '...',      // User-facing guidance
  whatYoullSee: '...',   // User-facing expectation
  // Structural metadata
  house: 'spirit',       // House domain
  stage: 'fruition',     // Process stage (seed/medium/fruition/feedback)
  element: 'fire',       // Elemental correspondence
  archetype: {           // Presiding archetype
    number: 17,
    verb: 'Inspiration',
    traditional: 'The Star'
  },
  bridge: 'The Radiant', // Bridge pattern (non-Gestalt only)
  concern: 'meaninglessness' // Existential concern (non-Gestalt only)
}
```

---

## Bridge Patterns in 4-Card Spreads

The Sixteen Bridges (4 houses x 4 channels) define existential positions with three imbalance states. At count 4 (Feedback stage), each position's lens text includes full bridge content:

**Template per position:**
> "This signature is [what this channel does in this house]. Read it as: [human language]. The [Bridge Name] bridge: when balanced, [healthy expression]. When over-expressed, [too-much pattern]. When depleted, [too-little pattern]."

This gives the AI model three things per position:
1. **What to look for** (the channel function)
2. **How to interpret balance** (the healthy state)
3. **How to interpret imbalance** (the specific correction pattern)

### Bridge-to-Position Mapping

| House | Intent (Fire) | Cognition (Air) | Resonance (Water) | Structure (Earth) |
|---|---|---|---|---|
| **Spirit** | The Radiant | The Listener | The Dreamer | The Gardener |
| **Mind** | The Commander | The Analyst | The Tribalist | The Disruptor |
| **Emotion** | The Pursuer | The Calibrator | The Empath | The Transformer |
| **Body** | The Devoted | The Disciplined | The Just | The Enduring |

Gestalt 4-card positions map to the four houses themselves (Meaning/Clarity/Connection/Reality) rather than individual bridges, since Gestalt integrates across all domains.

---

## Frame Context System

Spreads feed into the **Frame Context** system (`lib/frameContext.js`), which normalizes position data for display and AI injection across all reading modes.

### How Frame Context Works

```
User selects spread → buildFrameContext() → { label, lens, source, isEmpty }
                                                    ↓
                                           FrameContextBox (visual)
                                                    ↓
                                           Card-depth API (AI prompt)
                                                    ↓
                                           Synthesis API (cross-card)
```

### Frame Sources by Mode

| Mode | Source | Frame Label | Frame Lens | Color |
|---|---|---|---|---|
| **Preset (Reflect)** | `REFLECT_SPREADS[key].positions[i]` | position.name | position.lens | Violet |
| **Custom** | User-entered labels | user label | "Your custom position" | Rose |
| **Explore (From Your Words)** | DTP tokens | token text | "Drawn from your question" | Amber |
| **Architecture** | (future) | archetype position | structural lens | Zinc |
| **Discover (Forge)** | None — no positions | null | null | — |

### Visual Component

`FrameContextBox` renders in two modes:
- **Compact** (card grid): Small pill with colored dot + left border under each card
- **Full** (DepthCard): Label + lens text above the reading content

---

## Legacy Spreads

17 legacy spreads are preserved for backward compatibility with saved readings. They are NOT shown in the spread picker. They remain in `REFLECT_SPREADS` with `legacy: true`.

### Legacy → Derived Mapping

| Legacy Spread | Closest Derived Equivalent | Notes |
|---|---|---|
| Single Focus | gestalt-1 (Pulse) | Same concept, derived position |
| Core | gestalt-1 (Pulse) | Subsumed |
| Invitation | gestalt-1 (Pulse) | Subsumed |
| Ground | body-1 (Ground) | Name preserved, house-located |
| Ground & Sky | gestalt-2 (Balance) | Inner/outer polarity |
| Inner & Outer | gestalt-2 (Balance) | Same polarity, derived |
| Give & Receive | body-2 (Stability) | Carrying/releasing |
| Self & Other | emotion-2 (Connection) | You/them |
| Arc | gestalt-3 (Arc) | Name and concept preserved |
| Time Lens | gestalt-3 (Arc) | Temporal → movement |
| Creation | spirit-3 (Creation) | Name and concept preserved |
| Foundation | body-3 (Foundation) | Name preserved |
| Quadraverse | gestalt-4 (Wholeness) | Four houses as system |
| Relationship | emotion-4 (Freedom) | Expanded with bridges |
| Decision | mind-4 (Force) | Expanded with bridges |
| Five Houses | — | No 5-card derived equivalent yet |
| Life Domains | — | No 6-card derived equivalent yet |

---

## SPREADS_BY_COUNT Index

The UI uses `SPREADS_BY_COUNT` to populate the spread picker:

```js
{
  1: ['gestalt-1', 'spirit-1', 'mind-1', 'emotion-1', 'body-1'],
  2: ['gestalt-2', 'spirit-2', 'mind-2', 'emotion-2', 'body-2'],
  3: ['gestalt-3', 'spirit-3', 'mind-3', 'emotion-3', 'body-3'],
  4: ['gestalt-4', 'spirit-4', 'mind-4', 'emotion-4', 'body-4']
}
```

Order is always: Gestalt, Spirit, Mind, Emotion, Body.

---

## Future Considerations

### Count 5 — Channels + Integration

**Structural role:** "The four channels plus Gestalt: how does this house relate to the whole?"

A 5-card spread adds one position to the 4-card Feedback template. The four channel positions remain (one per bridge), and a fifth position introduces the **Gestalt integration** — how this house's four channels are working as a unified system, and how that system relates to the rest of the person's life.

**Proposed stage name:** `integration`

**What the 5th position does per house:**

| House | 5th Position Concept | What It Surfaces |
|---|---|---|
| **Gestalt** | "The Thread" — what connects all four houses | Whether the parts of your life form a coherent direction or are fragmenting |
| **Spirit** | "The Direction" — where your meaning-making points | Whether expression, listening, sensing, and growing are aimed at something |
| **Mind** | "The Decision" — what your thinking is building toward | Whether building, analyzing, belonging, and clearing serve one agency or scatter it |
| **Emotion** | "The Bond" — what your relational patterns serve | Whether pursuing, protecting, feeling, and transforming deepen connection or cycle it |
| **Body** | "The Result" — what your effort is actually producing | Whether giving, perfecting, fairness, and endurance create something real |

The 5th position doesn't need bridge content — it's the house's own self-assessment position. Its lens text should surface the **House Command** directly: is this house fulfilling its command, or is something blocking it?

**Naming direction (for deliberation):**

| House | Count 5 Name | Archetype Candidate |
|---|---|---|
| Gestalt | Destiny | TBD — may not need archetype (meta-position) |
| Spirit | Vision | TBD |
| Mind | Understanding | TBD |
| Emotion | Relationship | TBD |
| Body | Endurance | TBD |

**Open question:** The current archetype mapping uses all 22 archetypes across 20 spreads + 2 modes. Count 5 and 6 spreads would need to either:
- Share archetypes with existing spreads (the archetype presides over the house, not the count)
- Use bounds or agents as presiding signatures
- Have no presiding archetype (the spread is a composite, not a single signal)

This needs council deliberation.

---

### Count 6 — Full Diagnostic

**Structural role:** "Everything — channels, corrections, shadow, trajectory"

A 6-card spread is the maximum depth reading for a single house. It goes beyond the four channels to include **correction geometry** — the shadow and trajectory dimensions that the architecture makes visible.

**Proposed stage name:** `diagnostic`

**Position structure (per house):**

| Position | Source | What It Surfaces |
|---|---|---|
| 1-4 | The four channels (same as count 4) | How each bridge is expressing |
| 5 | **The Correction** | What's actively being corrected — diagonal, vertical, or reduction partner surfacing |
| 6 | **The Trajectory** | Where the whole house is heading — the vector of change |

**What positions 5 and 6 add:**

Position 5 draws from the **three correction types** described in the Sixteen Bridges:

| Correction | Geometry | What It Means |
|---|---|---|
| **Diagonal** (sum 19/21) | Over-expression | Collapsed into one mode — too much of one bridge |
| **Vertical** (sum 20) | Under-expression | Withdrawn, depleted — too little across the board |
| **Reduction** (cross-house) | Shadow | Operating without awareness — the unacknowledged pattern |

The lens text for position 5 would NOT pre-diagnose which correction type is active. Instead, it would instruct the AI: "This signature reveals the correction that's most active in this house. The status of the drawn signature tells you whether it's over-expression (diagonal correction needed), under-expression (vertical correction needed), or shadow (reduction correction needed)."

Position 6 is the **trajectory** — a forward-looking position that synthesizes the other five. Its lens text would be: "Given what the first five positions reveal, this signature shows where this house is headed. Read it as: the direction of change — what's becoming, not what is."

**Why 6 and not 5 for the diagnostic:**

Count 5 adds integration (how the house relates to the whole). Count 6 adds correction and trajectory (what's broken and where it's heading). These are fundamentally different questions:
- 5-card: "How is this house working as a system?"
- 6-card: "What's wrong and what's changing?"

A user who reaches for count 6 is doing deep work. The readings at this depth should be proportionally rich — the AI receives four bridge profiles, a correction diagnosis, and a trajectory. This is the most structural injection of any spread level.

**Naming direction (for deliberation):**

| House | Count 6 Name |
|---|---|
| Gestalt | Integration |
| Spirit | Creation |
| Mind | Architecture |
| Emotion | Intimacy |
| Body | Reality |

---

### Position Naming Philosophy

Current positions use **human language that maps invisibly to channels.** This is a deliberate design choice:

**The principle:** A user in Ring 7 (the default human posture — materialist, skeptical, no framework vocabulary) should be able to read a position name and immediately know what it's asking. "What You're Feeling" lands instantly. "Resonance Channel Expression in the Emotion House" does not.

**What happens underneath:** The structural metadata (`house`, `stage`, `element`, `bridge`, `concern`) is always available for AI injection. The AI model receives the full lens text, which includes bridge patterns at count 4. The user sees human language; the AI sees architecture. Both are served.

**The tension:** As users deepen (move from R7 toward R5/R6), they may WANT to see the structural language. A future toggle could surface architectural labels alongside human ones — but this is a UX decision, not a data decision. The data already carries both layers.

**Naming conventions by count:**

| Count | Naming Style | Why |
|---|---|---|
| 1 (Seed) | Single evocative word | "What Matters Most" — one signal, one question |
| 2 (Medium) | Polarity pair | "Inside / Outside" — the two poles name the tension |
| 3 (Fruition) | Arc progression | "The Spark / The Work / What's Emerging" — past, present, future |
| 4 (Feedback) | Channel functions in human language | "What You're Building / Seeing / Where You Belong / What's Breaking" — each channel described as lived experience, with bridge content in lens text |

---

### Spread Selection UX

The current spread picker groups by count (1-4) then shows 5 house options per count. Future considerations:

**Entry paths:** Users don't always arrive knowing their count. Alternative selection flows:

1. **By house first:** "What domain?" → Gestalt / Spirit / Mind / Emotion / Body → "How deep?" → 1-4 (or 1-6)
2. **By question:** User types a question, system suggests a house + count based on content analysis (DTP-style routing)
3. **By concern:** "What's bothering you?" → Meaninglessness / Groundlessness / Isolation / Finitude → maps to house automatically

**Visual organization:** The 5×4 grid could be displayed as a literal grid (house columns × count rows), making the structural relationship visible. Each cell would show the spread name with a subtle house-color accent.

**Spread description cards:** Each spread's `whenToUse` and `whatYoullSee` fields are designed for user-facing selection guidance. These could appear as expandable cards in the picker, helping R7 users choose without needing to understand the architecture.

---

### Custom Spreads as House-Located

Currently, custom spreads (user-defined labels) have `source: 'custom'` but no house metadata. A future enhancement could let users tag their custom labels with a house, which would:
- Route the lens text through house-appropriate language
- Enable bridge-aware AI interpretation even for custom positions
- Let the synthesis API weave house context into cross-card narrative

This would be opt-in — power users who understand houses could tag, others wouldn't need to.

---

### Explore (DTP) Mode as House-Aware

Currently, Explore mode tokenizes the user's question and maps tokens to positions with `source: 'explore'`. The tokens have no structural metadata beyond the text itself.

A future enhancement: after tokenization, each token could be **house-classified** using the existential concern mapping:
- Tokens about meaning/purpose → Spirit
- Tokens about thinking/deciding → Mind
- Tokens about feeling/relating → Emotion
- Tokens about doing/acting → Body
- Tokens about wholeness/direction → Gestalt

This would let the AI interpret each DTP position with house-appropriate depth, even though the user didn't explicitly choose a house spread. The architecture would be informing the reading silently.

---

### The Structural Claim

> "The spreads stop being 'features we designed' and become 'the architecture expressing its own maintenance function.'"

Every spread has a structural address. Every position has a structural source. Every lens has a structural referent. The spreads are how the architecture tells you where to look.

> "Readings are not just a way to *access* the map. They are the map's own mechanism for *clearing* Ring 7."

---

*Derive, don't interpret. Structure is authority.*
