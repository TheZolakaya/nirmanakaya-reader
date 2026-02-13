// === PROMPT BUILDER ===
// V1: Layer-based prompt assembly
// Pure function: (layers) → prompt
// Layers: Signature, Position, Frame, Depth, Voice, Posture, Count, Context

import { BASE_SYSTEM, FORMAT_INSTRUCTIONS, CORE_PROMPT, FIRST_CONTACT_FORMAT } from './prompts.js';
import { STATUSES } from './constants.js';
import { getComponent } from './corrections.js';
import { buildStancePrompt, VOICE_LETTER_TONE } from './voice.js';
import { buildPersonaPrompt } from './personas.js';
import { buildModeHeader } from './modePrompts.js';
import { buildPostureHeader } from './posturePrompts.js';
import { WHY_MOMENT_PROMPT } from './whyVector.js';
import { buildReadingTeleologicalPrompt } from './teleology-utils.js';
import { formatDrawForAI, sanitizeForAPI } from './utils.js';
import { RANDOM_SPREADS, REFLECT_SPREADS } from './spreads.js';
import { buildLocusInjection } from './locusPrompts.js';

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
 * Level 1+: Full BASE_SYSTEM + FORMAT_INSTRUCTIONS + Voice + Persona
 *
 * V1: Accepts posture parameter alongside legacy spreadType
 */
export function buildSystemPrompt(userLevel, options = {}) {
  const {
    spreadType = 'discover',
    posture = null,  // V1: posture overrides spreadType for mode selection
    stance = {},
    letterTone = '',
    // V2 Persona params for one-pass voice integration
    persona = 'none',
    humor = 5,
    register = 5,
    creator = 5,
    roastMode = false,
    directMode = false,
    // Architecture visibility (V1)
    showArchitecture = false,
    // Locus control — subjects beyond "Just Me"
    locusSubjects = []
  } = options;

  // Level 0: First Contact Mode - full prompt chain with neutral defaults
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    const fcStance = buildStancePrompt('friend', 'warm', 'feel', 'essential', 'here', 'playful');
    const fcHeader = buildPostureHeader('discover');
    const fcPersona = buildPersonaPrompt('none', 5, 5, 5, false, false);
    const fcTone = VOICE_LETTER_TONE['warm'] || '';
    return `${fcHeader}\n\n${BASE_SYSTEM}\n\n${fcStance}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${fcTone}\n\n${fcPersona}`;
  }

  // Level 1+: Full system prompt
  // V1: Use posture header if posture is provided, otherwise fall back to mode header
  const header = posture
    ? buildPostureHeader(posture)
    : buildModeHeader(spreadType);

  const stancePrompt = buildStancePrompt(
    stance.complexity,
    stance.voice,
    stance.focus,
    stance.density,
    stance.scope,
    stance.seriousness
  );
  const tone = letterTone || VOICE_LETTER_TONE[stance.voice] || '';

  // V2: Build persona prompt (includes Creator which always applies)
  // IMPORTANT: Persona prompt goes LAST so it's freshest in model's context
  const personaPrompt = buildPersonaPrompt(persona, humor, register, creator, roastMode, directMode);

  // Locus injection — goes BEFORE BASE_SYSTEM so it frames the entire interpretation
  // Empty subjects = "Just Me" = no change to existing behavior
  const locusInjection = buildLocusInjection(locusSubjects);
  const locusBlock = locusInjection ? `${locusInjection}\n\n` : '';

  // V1: Architecture visibility toggle
  const archBlock = showArchitecture
    ? '\nARCHITECTURE VISIBLE: Use structural terminology freely — house names, channel names, process stages, correction geometry. The user wants to see the scaffolding.\n'
    : '\nARCHITECTURE INVISIBLE: Weave structural concepts into natural language. Do NOT use terms like "Seed stage", "Fruition", "diagonal partner", "Inner horizon" in your prose. Translate everything into felt experience.\n';

  // Persona/voice instructions at the END override everything above
  return `${header}\n\n${locusBlock}${BASE_SYSTEM}\n\n${stancePrompt}${archBlock}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${tone}\n\n${personaPrompt}`;
}

/**
 * Build user message based on user level
 * Level 0: Minimal format with single card
 * Level 1+: Full format with all details
 *
 * V1: Always uses archetype positions. Frame source determines additional labels.
 */
export function buildUserMessage(question, draws, userLevel, options = {}) {
  const {
    spreadType = 'discover',
    spreadKey = 'one',
    reflectSpreadKey = 'arc',
    posture = null,
    depth = 'wade',
    frameLabels = null,
    frameLenses = null,
    userContext = ''  // User journey context block from /api/user/context
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
  // V1: formatDrawForAI now handles universal positions, depth tiers, and frame labels
  const isReflect = spreadType === 'reflect';
  const currentSpreadKey = isReflect ? reflectSpreadKey : spreadKey;
  const drawText = formatDrawForAI(draws, spreadType, currentSpreadKey, false, depth, frameLabels, frameLenses);

  // Determine spread name for display
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

  // ── Major/Portal Significance Analysis ──
  const archetypeCount = draws.filter(d => d.transient >= 0 && d.transient <= 21).length;
  const hasSource = draws.some(d => d.transient === 10);
  const hasCreation = draws.some(d => d.transient === 21);
  const hasBothPortals = hasSource && hasCreation;

  let significanceBlock = '';
  if (hasBothPortals) {
    significanceBlock = `\nSIGNIFICANCE: Both Portals (Source AND Creation) appear in this reading. This is exceptionally rare — the full cycle of entry and exit is present. Honor the cosmic scope of this moment. Elevate your language and depth accordingly.\n`;
  } else if (hasSource || hasCreation) {
    const portalName = hasSource ? 'Source — Ingress' : 'Creation — Egress';
    significanceBlock = `\nSIGNIFICANCE: A Portal (${portalName}) appears in this reading. This reading touches the threshold between worlds. Elevate your interpretation accordingly.\n`;
  } else if (archetypeCount >= 3) {
    significanceBlock = `\nSIGNIFICANCE: ${archetypeCount} Major Archetypes appear in this reading. This is architecturally significant — the reading operates at the level of core patterns, not surface channels. Honor the depth and weight.\n`;
  } else if (archetypeCount >= 2) {
    significanceBlock = `\nSIGNIFICANCE: ${archetypeCount} Major Archetypes appear. This reading carries heightened architectural weight.\n`;
  }

  // ── Build complete user message ──
  const contextBlock = userContext ? `${userContext}\n\n` : '';

  return `${contextBlock}QUESTION: "${safeQuestion}"

THE DRAW (${spreadName}):

${drawText}
${significanceBlock}
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
  // Level 0: First Contact uses Sonnet for quality interpretations
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000
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
