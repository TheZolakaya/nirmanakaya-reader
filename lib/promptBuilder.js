// === PROMPT BUILDER ===
// Level-based prompt assembly for progressive disclosure

import { BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT, FIRST_CONTACT_FORMAT } from './prompts.js';
import { STATUSES } from './constants.js';
import { getComponent } from './corrections.js';
import { buildStancePrompt, VOICE_LETTER_TONE } from './voice.js';
import { buildPersonaPrompt } from './personas.js';
import { buildModeHeader } from './modePrompts.js';
import { WHY_MOMENT_PROMPT } from './whyVector.js';
import { buildReadingTeleologicalPrompt } from './teleology-utils.js';
import { formatDrawForAI, sanitizeForAPI } from './utils.js';
import { RANDOM_SPREADS, REFLECT_SPREADS } from './spreads.js';

// User levels for progressive disclosure
export const USER_LEVELS = {
  FIRST_CONTACT: 0,  // New user - minimal UI, plain English
  EXPLORER: 1,       // Learning - some architecture terms
  PRACTITIONER: 2,   // Comfortable - full features
  ARCHITECT: 3,      // Advanced - derivation visible
  MASTER: 4          // Expert - everything unlocked
};

/**
 * Build system prompt based on user level
 * Level 0 (First Contact): CORE_PROMPT + FIRST_CONTACT_FORMAT (~600 tokens)
 * Level 1+: Full BASE_SYSTEM + FORMAT_INSTRUCTIONS + Stance + Persona
 */
export function buildSystemPrompt(userLevel, options = {}) {
  const {
    spreadType = 'discover',
    stance = {},
    letterTone = '',
    // V2 Persona params for one-pass voice integration
    persona = 'none',
    humor = 5,
    register = 5,
    creator = 5,
    roastMode = false,
    directMode = false
  } = options;

  // Level 0: First Contact Mode - minimal, plain English
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return `${CORE_PROMPT}\n\n${FIRST_CONTACT_FORMAT}`;
  }

  // Level 1+: Full system prompt
  const stancePrompt = buildStancePrompt(
    stance.complexity,
    stance.voice,
    stance.focus,
    stance.density,
    stance.scope,
    stance.seriousness
  );
  const modeHeader = buildModeHeader(spreadType);
  const tone = letterTone || VOICE_LETTER_TONE[stance.voice] || '';

  // V2: Build persona prompt (includes Creator which always applies)
  // IMPORTANT: Persona prompt goes LAST so it's freshest in model's context
  const personaPrompt = buildPersonaPrompt(persona, humor, register, creator, roastMode, directMode);

  // Persona/voice instructions at the END override everything above
  return `${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${tone}\n\n${personaPrompt}`;
}

/**
 * Build user message based on user level
 * Level 0: Minimal format with single card
 * Level 1+: Full format with all details
 */
export function buildUserMessage(question, draws, userLevel, options = {}) {
  const {
    spreadType = 'discover',
    spreadKey = 'one',
    reflectSpreadKey = 'arc'
  } = options;

  const safeQuestion = sanitizeForAPI(question);

  // Level 0: First Contact Mode - simplified format
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    const draw = draws[0]; // First Contact always uses single card
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const statusPrefix = stat.prefix || 'Balanced';

    // Build clear message emphasizing the SIGNATURE NAME
    return `Their question: "${safeQuestion}"

THE SIGNATURE DRAWN: ${trans.name}
Status: ${statusPrefix} (${stat.name} — ${stat.desc})

IMPORTANT: Interpret "${trans.name}" — this is the signature they drew. Start your response with "${trans.name}".`;
  }

  // Level 1+: Full message format
  const isReflect = spreadType === 'reflect';
  const currentSpreadKey = isReflect ? reflectSpreadKey : spreadKey;
  const drawText = formatDrawForAI(draws, spreadType, currentSpreadKey, false);
  const spreadName = isReflect
    ? REFLECT_SPREADS[reflectSpreadKey]?.name || 'Reflect'
    : `${RANDOM_SPREADS[spreadKey]?.name || 'Reading'} Emergent`;

  // Build teleological data for Words to the Whys
  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);

  // Build the section marker instructions based on the number of cards (including DEEP levels)
  const cardMarkerList = draws.map((_, i) => {
    const n = i + 1;
    return `[CARD:${n}:SURFACE], [CARD:${n}:WADE], [CARD:${n}:SWIM], [CARD:${n}:DEEP], [CARD:${n}:ARCHITECTURE], [CARD:${n}:MIRROR], [CARD:${n}:WHY:SURFACE], [CARD:${n}:WHY:WADE], [CARD:${n}:WHY:SWIM], [CARD:${n}:WHY:DEEP], [CARD:${n}:WHY:ARCHITECTURE]` +
           (draws[i].status !== 1 ? `, [CARD:${n}:REBALANCER:SURFACE], [CARD:${n}:REBALANCER:WADE], [CARD:${n}:REBALANCER:SWIM], [CARD:${n}:REBALANCER:DEEP], [CARD:${n}:REBALANCER:ARCHITECTURE]` : '');
  }).join(', ');

  return `QUESTION: "${safeQuestion}"

THE DRAW (${spreadName}):

${drawText}

${teleologicalPrompt}

Respond using the PROGRESSIVE DEPTH section markers:
[LETTER:SURFACE], [LETTER:WADE], [LETTER:SWIM], [LETTER:DEEP], [SUMMARY:SURFACE], [SUMMARY:WADE], [SUMMARY:SWIM], [SUMMARY:DEEP], ${cardMarkerList}, [PATH:SURFACE], [PATH:WADE], [PATH:SWIM], [PATH:DEEP], [PATH:ARCHITECTURE], [FULL_ARCHITECTURE] (optional, last).

CRITICAL: Generate sections in this EXACT order - Letter first, then Summary (all 4 depths), then each Card with its Rebalancer, then Path to Balance (ALWAYS — this is the holistic synthesis), then Full Architecture last.

Each marker on its own line. Generate ALL depth levels for Letter, Summary, Path, and each card (including WHY with Surface/Wade/Swim/Deep). Generate Rebalancer if imbalanced. The DEEP level has no sentence limits and can use framework terminology if interpreted inline.`;
}

/**
 * Get API configuration based on user level
 */
export function getAPIConfig(userLevel, useHaiku = true) {
  // Level 0: Always use Haiku with minimal tokens
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300
    };
  }

  // Level 1+: User's model choice with full tokens
  // Increased significantly for full progressive depth format:
  // Letter (4) + Summary (4) + Cards×(Reading 4 + Architecture + Rebalancer 5 + Mirror + Why 5) + Path (5) + Full Architecture
  // For 3-card spread: ~50+ sections requiring substantial token budget
  return {
    model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
    max_tokens: 16000
  };
}

/**
 * Parse First Contact response (no section markers)
 */
export function parseFirstContactResponse(responseText) {
  return {
    summary: null,
    cards: [],
    corrections: [],
    rebalancerSummary: null,
    wordsToWhys: null,
    letter: null,
    // First Contact uses a single unified response
    firstContact: responseText.trim()
  };
}
