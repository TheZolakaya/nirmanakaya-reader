# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nirmanakaya Reader is a consciousness architecture reading system built with Next.js. It generates AI-interpreted readings based on a proprietary system of archetypes, bounds, and agents - analogous to a tarot deck but with its own unique metaphysical framework.

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

No test framework is configured.

## Architecture

### Core Domain Concepts

The system operates on three card types:
- **Archetypes** (0-20): Major signatures representing core patterns (e.g., Potential, Will, Awareness)
- **Bounds** (1-40): Numeric cards organized by Channel (Intent/Cognition/Resonance/Structure)
- **Agents** (41-56): Role cards (Presence/Practice/Catalyst/Source) within Channels

Each card drawn has a **Status**:
1. Balanced (now-aligned)
2. Too Much (future-projected, requires diagonal correction)
3. Too Little (past-anchored, requires vertical correction)
4. Unacknowledged (shadow, requires reduction correction)

### Reading Modes (Mode Governance System)

Three interpretation modes with strict verb constraints:
- **Reflect**: Read-only observation ("What is already happening?")
- **Discover**: Reveals authorship locations ("Where is authorship available?")
- **Forge**: Active intention-setting ("What changes when intention is asserted?")

Mode constraints are enforced in `lib/modes.js` and `lib/modeTransition.js`.

### Data Flow

1. User submits question → `app/page.js` (main client component)
2. Spread generated → `lib/utils.js` (`generateSpread`)
3. System prompt built → `lib/promptBuilder.js` (level-based assembly)
4. API call → `app/api/reading/route.js` → Anthropic API
5. Response parsed → `lib/utils.js` (`parseReadingResponse`)
6. Content filtered → `lib/contentFilter.js`
7. Rendered with hotlinks → `lib/hotlinks.js`

### Key Files

- `app/page.js`: Main React component (~4000 lines, contains all UI state)
- `lib/index.js`: Central re-export of all lib modules
- `lib/archetypes.js`: ARCHETYPES, BOUNDS, AGENTS data
- `lib/constants.js`: STATUSES, CHANNELS, HOUSES, color mappings
- `lib/corrections.js`: Diagonal/Vertical/Reduction correction logic
- `lib/prompts.js`: BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT
- `lib/promptBuilder.js`: Level-based prompt assembly (USER_LEVELS 0-4)
- `lib/teleology-utils.js`: "Words to the Whys" teleological grounding
- `lib/voice.js`: Stance system (complexity, voice, focus, density, scope)

### User Levels (Progressive Disclosure)

```javascript
USER_LEVELS = {
  FIRST_CONTACT: 0,  // Minimal UI, plain English, Haiku model
  EXPLORER: 1,       // Some architecture terms
  PRACTITIONER: 2,   // Full features
  ARCHITECT: 3,      // Derivation visible
  MASTER: 4          // Everything unlocked
}
```

Level 0 uses minimal prompts and Claude Haiku. Level 1+ uses full system prompts and Claude Sonnet.

### API Routes

- `POST /api/reading`: Main reading endpoint (supports `isFirstContact` flag)
- `POST /api/external-reading`: External API for third-party integrations

### Correction System

Imbalanced cards receive corrections based on status:
- Too Much → Diagonal pair (opposite pole)
- Too Little → Vertical pair (same archetype, different scale)
- Unacknowledged → Reduction pair (generating source)

See `lib/corrections.js` for DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS.

## Domain Language

When working with this codebase, understand these terms:
- **Transient**: The archetype/bound/agent identity of a drawn card
- **Status**: The expression state (Balanced/TooMuch/TooLittle/Unacknowledged)
- **House**: Grouping of archetypes (Gestalt/Spirit/Mind/Emotion/Body/Portal)
- **Channel**: Element-like quality (Intent/Cognition/Resonance/Structure)
- **Signature**: A card's complete identity including transient + status

## Deployment

Per README: Replace `app/page.js` in GitHub. Deploys automatically (~60 seconds to live).

## Environment Variables

Required: `ANTHROPIC_API_KEY` for Claude API access.
