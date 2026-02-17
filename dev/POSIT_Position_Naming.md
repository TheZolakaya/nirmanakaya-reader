# POSIT: Position Naming — The Two-Layer Problem
## For Council Deliberation

### Problem Statement

Position names serve two masters. The R7 user needs immediate legibility: "What You're Feeling" works. The R5 user, who has internalized the architecture, may find the same label reductive — they know what the Empath bridge is, and "What You're Feeling" flattens the precision they've earned.

The current system resolves this by making the human-facing name the ONLY visible name, while burying the structural identity in lens text and metadata. This works at launch. It won't scale as the user base deepens.

This is not a UX polish question. It's a structural question: **does the architecture express its own names, or do we translate on its behalf?**

### The Current State

Every position carries two layers of identity right now:

| Layer | What the User Sees | Example |
|---|---|---|
| **Name** | Human language | "What You're Expressing" |
| **Lens** (AI-facing) | Structural derivation + bridge content | "...The Radiant bridge: when balanced, authentic expression aimed beyond the self..." |

The bridge name appears inside the lens text for 4-card Feedback spreads, but never in the position name itself. At counts 1-3, the bridge is referenced in the spread metadata (`bridge: 'The Listener'`) but never surfaced to the user at all.

**What this means:** A user doing 20 readings will never learn that they've been engaging with "The Radiant" — the architectural name for how Spirit expresses through Intent/Fire. They'll know "What You're Expressing" and might eventually notice "The Radiant" buried in the interpretation text, but it's never named as the position's identity.

---

### The Derivation

Position names should derive from the same source as everything else: the architecture.

**Each non-Gestalt position at count 4 maps to exactly one bridge:**

| House | Fire (Intent) | Air (Cognition) | Water (Resonance) | Earth (Structure) |
|---|---|---|---|---|
| Spirit | The Radiant | The Listener | The Dreamer | The Gardener |
| Mind | The Commander | The Analyst | The Tribalist | The Disruptor |
| Emotion | The Pursuer | The Calibrator | The Empath | The Transformer |
| Body | The Devoted | The Disciplined | The Just | The Enduring |

These names ARE the structural identity of each position. "What You're Expressing" is a translation of "The Radiant." The translation is helpful — but the original should be available.

At counts 1-3, the position isn't channel-specific (one card can't isolate one channel), but the spread's presiding archetype and bridge still inform the position's territory. A 1-card Spirit reading presided over by "The Listener" is not random — the Listener is the Seed-stage bridge for Spirit, the entry point for the house's inquiry.

---

### The Proposal: Named Positions with Human Subtitles

Each position gains a structural name alongside its human description. Display is context-dependent:

**Format:**
```
[Bridge/Structural Name]
[Human description as subtitle]
```

**Example at count 4 (Spirit — Witness):**
```
Position 1: The Radiant
            What You're Expressing

Position 2: The Listener
            What You're Noticing

Position 3: The Dreamer
            What You're Sensing

Position 4: The Gardener
            What You're Growing
```

**Example at count 1 (Spirit — Spark):**
```
Position 1: The Listener
            What's Alive
```

**Example at count 2 (Mind — Clarity):**
```
Position 1: The Tribalist
            Where You're Free

Position 2: The Tribalist
            Where You're Structured
```

Wait — count 2 is a polarity within one bridge's domain. Both positions are presided over by the same bridge. This actually clarifies the design: the bridge name is the SPREAD's structural identity, and the positions are the poles within it.

---

### Display Modes

The two-layer naming enables three display modes, selectable by user preference or progressive disclosure:

| Mode | What Shows | Who It's For |
|---|---|---|
| **Human** (default) | "What You're Expressing" | R7 users, first readings, anyone who wants simplicity |
| **Named** | "The Radiant — What You're Expressing" | Users who've encountered the bridges and want the connection |
| **Structural** | "The Radiant (Spirit/Intent/Fire)" | Power users, architecture students, readers who think in the system |

The default is Human. Named mode could activate automatically after a threshold (e.g., 10 readings, or after encountering bridge terms in the glossary/book), or manually via a toggle.

---

### Data Structure Change

Current position object:
```js
{
  id: 1,
  name: "What You're Expressing",
  lens: "This signature is how you're answering the need for meaning through action and creation..."
}
```

Proposed:
```js
{
  id: 1,
  name: "What You're Expressing",      // Human name (always shown)
  structuralName: "The Radiant",        // Bridge/archetype name (shown when earned)
  channel: 'intent',                    // Fire — position's channel address
  lens: "This signature is how you're answering the need for meaning through action and creation..."
}
```

For counts 1-3 where positions aren't channel-specific:
```js
{
  id: 1,
  name: "What's Alive",
  structuralName: "The Listener",       // Presiding bridge for this spread
  channel: null,                        // No channel isolation at this count
  lens: "..."
}
```

The `structuralName` field gives the FrameContextBox component something to render when the user has earned (or chosen) structural display.

---

### Gestalt Positions

Gestalt is the exception. Its 4-card spread doesn't map to four bridges — it maps to the four HOUSES as seen from above. Position names are already structural: "Meaning" (Spirit), "Clarity" (Mind), "Connection" (Emotion), "Reality" (Body).

For Gestalt, the `structuralName` would be the house name:
```js
{ name: "Meaning", structuralName: "Spirit House", channel: null }
{ name: "Clarity", structuralName: "Mind House", channel: null }
```

This is already nearly what the user sees. The two-layer system adds nothing here — which is correct. Gestalt IS the integration layer. It doesn't need translation because its language is already architectural.

---

### Impact on AI Prompt Injection

The structural name can be injected into the AI prompt alongside the human name, giving the model both layers:

Current card-depth prompt line:
```
FRAME: "What You're Expressing"
```

Proposed:
```
FRAME: "What You're Expressing" [The Radiant — Spirit/Intent/Fire]
```

This gives the AI model the full structural address of the position without requiring the user to see it. The model can then reference bridge patterns with precision: "The Radiant in you is currently..." — which some users will find illuminating and others will find opaque.

The persona/voice system already modulates register. A high-register persona could use bridge names naturally; a low-register persona would translate them into everyday language. The data supports both.

---

### Progressive Disclosure Path

The naming system enables a natural progression that mirrors R7→R5 movement:

1. **First readings:** Human names only. "What You're Feeling" is the full label.
2. **After encountering bridges** (via book, glossary popup, or repeated readings): Named mode activates. "The Empath — What You're Feeling" appears.
3. **After engagement threshold** (power user, architecture student): Structural mode available. "The Empath (Emotion/Resonance/Water)" is an option.

This is NOT gamification. It's not unlocking badges. It's the same progressive disclosure the book uses: you don't need to know the architecture to benefit from it, but the architecture is always there when you're ready.

---

### Questions for Council Deliberation

1. **Is the bridge name the right structural identity for positions?** The bridge name is a human-readable label for the channel-house intersection. But should the position's structural name be the bridge, the archetype, or the channel? "The Radiant" vs "Inspiration" vs "Intent/Fire"?

2. **Should structural names appear automatically or by choice?** Auto-activation based on reading count risks surprising users who aren't ready. Manual toggle puts it in their hands but reduces discovery. A third option: show it once as a tooltip, then let them decide.

3. **At counts 1-3, is the presiding bridge the right structural name?** A 1-card Spirit reading presided over by "The Listener" — but the drawn card might express through any of Spirit's four bridges. Does naming the position "The Listener" over-specify? Or is it correct because the Listener is the ENTRY bridge for Spirit (Seed stage)?

4. **Does this change the position's semantic weight?** "What You're Expressing" is a question. "The Radiant" is an identity. Changing from question to identity changes how users relate to the position — from "I'm being asked something" to "I'm being shown a facet of myself." Is that the right shift?

5. **Lens text bridge content — keep, remove, or make conditional?** Currently the 4-card lens text includes full bridge descriptions (balanced/over/depleted). If the bridge name is now visible as the position's structural name, does the lens text become redundant? Or does it remain valuable as the AI's detailed instruction set?

6. **Should Gestalt positions gain structural names at all?** Current Gestalt-4 positions ("Meaning", "Clarity", "Connection", "Reality") are already semi-structural. Adding "Spirit House", "Mind House" etc. is pedantic. Leave Gestalt as-is?

---

### The Structural Claim

Position naming is not cosmetic. The names are the architecture's own vocabulary for its maintenance function. When a user sees "The Radiant" instead of "What You're Expressing," they're seeing the architecture name itself — not our interpretation of what it might mean for them.

The current system interprets on the architecture's behalf. This POSIT proposes that the architecture be allowed to introduce itself, on its own terms, when the user is ready.

> "The easiest magic is to undo what is not real."

The interpretation layer between the architecture and the user is something we added. It serves R7. It should not be permanent.

---

*Posit submitted for council deliberation.*
*Derive, don't interpret. Structure is authority.*
