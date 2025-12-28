// === PROMPT BUILDER ===
// Level-based prompt assembly for progressive disclosure

import { BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT, FIRST_CONTACT_FORMAT } from './prompts.js';
import { STATUSES } from './constants.js';
import { getComponent } from './corrections.js';
import { buildStancePrompt, VOICE_LETTER_TONE } from './voice.js';
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
 * Level 1+: Full BASE_SYSTEM + FORMAT_INSTRUCTIONS
 */
export function buildSystemPrompt(userLevel, options = {}) {
  const {
    spreadType = 'discover',
    stance = {},
    letterTone = ''
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

  return `${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${tone}`;
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

    return `Question: "${safeQuestion}"

Pattern: ${statusPrefix} ${trans.name}
(${stat.name} = ${stat.desc})

Give a simple, helpful response.`;
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

  return `QUESTION: "${safeQuestion}"

THE DRAW (${spreadName}):

${drawText}

${teleologicalPrompt}

Respond using the exact section markers: [SUMMARY], [CARD:1], [CARD:2], etc., [CORRECTION:N] for each imbalanced card (where N matches the card number — use [CORRECTION:3] for Card 3, [CORRECTION:5] for Card 5, etc.), [PATH] (if 2+ imbalanced), [WORDS_TO_WHYS] (REQUIRED - teleological grounding), [LETTER]. Each marker on its own line.`;
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
  return {
    model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
    max_tokens: 4000
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
