// === PROMPT BUILDER ===
// V3: Clean one-pass assembly
// Three dials: Persona, Complexity, Humor
// Plus: Architecture toggle (orthogonal)
// Assembly order: Posture → Locus → BASE_SYSTEM → Architecture → FORMAT → WHY → Voice (last)

import { BASE_SYSTEM, FORMAT_INSTRUCTIONS, getFormatInstructions, CORE_PROMPT, FIRST_CONTACT_FORMAT } from './prompts.js';
import { STATUSES } from './constants.js';
import { getComponent } from './corrections.js';
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
 * Level 0 (First Contact): Simplified prompt with friendly defaults
 * Level 1+: Full BASE_SYSTEM + FORMAT_INSTRUCTIONS + WHY + Voice
 *
 * V3: Three dials — persona, complexity, humor. No stance system.
 */
export function buildSystemPrompt(userLevel, options = {}) {
  const {
    spreadType = 'discover',
    posture = null,
    // V3 Voice params — three clean dials
    persona = 'friend',
    humor = 5,
    complexity = 'clear',
    // Reading length
    readingLength = 'full',
    // Architecture visibility
    showArchitecture = false,
    // Locus control — subjects beyond "Just Me"
    locusSubjects = []
  } = options;

  // Level 0: First Contact Mode - full prompt chain with friendly defaults
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    const fcHeader = buildPostureHeader('discover');
    const fcPersona = buildPersonaPrompt('friend', 5, 'clear');
    return `${fcHeader}\n\n${BASE_SYSTEM}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\n${fcPersona}`;
  }

  // Level 1+: Full system prompt
  // Assembly order matters — voice goes LAST for recency advantage
  const effectivePosture = posture || spreadType || 'discover';
  const header = buildPostureHeader(effectivePosture);

  // V3: Build unified voice prompt (persona + complexity + humor)
  const personaPrompt = buildPersonaPrompt(persona, humor, complexity);

  // Locus injection — goes BEFORE BASE_SYSTEM so it frames the entire interpretation
  const locusInjection = buildLocusInjection(locusSubjects);
  const locusBlock = locusInjection ? `${locusInjection}\n\n` : '';

  // Architecture visibility toggle — controls prose output, not model knowledge
  const archBlock = showArchitecture
    ? '\nARCHITECTURE VISIBLE: Use structural terminology freely — house names, channel names, process stages (Seed/Medium/Fruition/Feedback), Inner/Outer horizon, Archetype/Bound/Agent types, rebalancer geometry (diagonal/vertical/reduction), channel resonance/crossing. The user wants to see the scaffolding.\n'
    : '\nARCHITECTURE INVISIBLE: Weave structural concepts into natural language. Do NOT use terms like "Seed stage", "Fruition", "diagonal partner", "Inner horizon", "rebalancer geometry", "channel resonance" in your prose. Translate everything into felt experience. The structural data is for YOUR reasoning — translate the insights, not the labels.\n';

  // Format instructions with length-appropriate word counts baked in
  const formatBlock = getFormatInstructions(readingLength);

  // Assembly: Posture → Locus → Kernel → Architecture → Format → Why → Voice (last)
  return `${header}\n\n${locusBlock}${BASE_SYSTEM}\n\n${archBlock}\n\n${formatBlock}\n\n${WHY_MOMENT_PROMPT}\n\n${personaPrompt}`;
}

/**
 * Build user message based on user level
 * Level 0: Minimal format with single card
 * Level 1+: Full format with all details
 *
 * V3: Single-depth markers (no progressive SURFACE/WADE/SWIM/DEEP)
 */
export function buildUserMessage(question, draws, userLevel, options = {}) {
  const {
    spreadType = 'discover',
    spreadKey = 'one',
    reflectSpreadKey = 'arc',
    posture = null,
    frameLabels = null,
    frameLenses = null,
    userContext = ''
  } = options;

  const safeQuestion = sanitizeForAPI(question);

  // Level 0: First Contact Mode - simplified format
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    const draw = draws[0];
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const statusPrefix = stat.prefix || 'Balanced';

    return `Their question: "${safeQuestion}"

THE SIGNATURE DRAWN: ${trans.name}
Status: ${statusPrefix} (${stat.name} — ${stat.desc})

IMPORTANT: Interpret "${trans.name}" — this is the signature they drew. Start your response with "${trans.name}".`;
  }

  // Level 1+: Full message format
  const isReflect = spreadType === 'reflect';
  const currentSpreadKey = isReflect ? reflectSpreadKey : spreadKey;
  // V3: depth param removed — always deep. Pass null for depth to formatDrawForAI.
  const drawText = formatDrawForAI(draws, spreadType, currentSpreadKey, false, null, frameLabels, frameLenses);

  const spreadName = isReflect
    ? REFLECT_SPREADS[reflectSpreadKey]?.name || 'Reflect'
    : `${RANDOM_SPREADS[spreadKey]?.name || 'Reading'} Emergent`;

  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);

  // V3: Single-depth section markers
  const cardMarkerList = draws.map((_, i) => {
    const n = i + 1;
    return `[CARD:${n}:SUMMARY], [CARD:${n}:READING], [CARD:${n}:ARCHITECTURE], [CARD:${n}:MIRROR], [CARD:${n}:WHY]` +
           (draws[i].status !== 1 ? `, [CARD:${n}:REBALANCER]` : `, [CARD:${n}:GROWTH]`);
  }).join(', ');

  // Portal/Archetype significance analysis
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

  const contextBlock = userContext ? `${userContext}\n\n` : '';

  return `${contextBlock}QUESTION: "${safeQuestion}"

THE DRAW (${spreadName}):

${drawText}
${significanceBlock}
${teleologicalPrompt}

Respond using these section markers:
[LETTER], [SUMMARY], ${cardMarkerList}, [PATH], [FULL_ARCHITECTURE] (optional, last).

CRITICAL: Generate sections in this EXACT order - Letter first, then Summary, then each Card (with Summary → Reading → Mirror → Why → Rebalancer/Growth for each), then Path to Balance (ALWAYS — this is the holistic synthesis), then Full Architecture last.

Each marker on its own line. Every card gets a 2-sentence SUMMARY first, then the full READING interpretation. No depth tiers — generate at full depth. The READING section has no sentence limits and should be the deepest, most thorough interpretation possible.`;
}

/**
 * Get API configuration based on user level
 */
export function getAPIConfig(userLevel, useHaiku = true) {
  if (userLevel === USER_LEVELS.FIRST_CONTACT) {
    return {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000
    };
  }

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
    firstContact: responseText.trim()
  };
}
