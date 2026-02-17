// === UTILITY FUNCTIONS ===
// Drawing, encoding/decoding, formatting utilities

import { ARCHETYPES } from './archetypes.js';
import { STATUSES, PROCESS_STAGES } from './constants.js';
import { REFLECT_SPREADS, RANDOM_SPREADS } from './spreads.js';
// Legacy stance presets — inlined for backwards compatibility with saved readings
// (voice.js deleted in V3 voice refactor)
const LEGACY_STANCE_PRESETS = {
  clear: { seriousness: "playful", voice: "warm", focus: "feel", density: "essential", scope: "here" },
  kind: { seriousness: "earnest", voice: "warm", focus: "feel", density: "clear", scope: "connected" },
  playful: { seriousness: "playful", voice: "wonder", focus: "see", density: "clear", scope: "patterned" },
  wise: { seriousness: "earnest", voice: "warm", focus: "see", density: "rich", scope: "resonant" },
  oracle: { seriousness: "grave", voice: "direct", focus: "build", density: "luminous", scope: "resonant" },
  direct: { seriousness: "balanced", voice: "direct", focus: "do", density: "essential", scope: "here" }
};
import { getComponent, getFullCorrection, getCorrectionText, DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS } from './corrections.js';

// Post-process text to ensure paragraph breaks exist
// Splits long text blocks into ~3 sentence paragraphs
export function ensureParagraphBreaks(text) {
  if (!text || typeof text !== 'string') return typeof text === 'string' ? text : '';

  // Helper to break a single block into smaller paragraphs
  const breakIntoParas = (block) => {
    if (!block || block.length < 200) return block; // Short enough

    // Split on sentence endings followed by space and capital letter
    const sentences = block.split(/(?<=[.!?])\s+(?=[A-Z])/);

    if (sentences.length <= 3) return block; // Few sentences, leave as-is

    // Group into paragraphs of 2-3 sentences
    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const chunk = sentences.slice(i, i + 3).join(' ');
      paragraphs.push(chunk);
    }
    return paragraphs.join('\n\n');
  };

  // If already has paragraph breaks, check each chunk individually
  if (text.includes('\n\n')) {
    const chunks = text.split(/\n\n+/);
    return chunks.map(chunk => breakIntoParas(chunk.trim())).filter(c => c).join('\n\n');
  }

  // No breaks at all - apply to whole text
  return breakIntoParas(text);
}

export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateSpread(count) {
  // Cap count at 22 positions (number of archetypes) to prevent undefined positions
  const effectiveCount = Math.min(count, 22);
  // Every card ALWAYS gets an archetype position — universal backbone
  const positionPool = shuffleArray([...Array(22).keys()]);
  const transientPool = shuffleArray([...Array(78).keys()]);

  return Array.from({ length: effectiveCount }, (_, i) => {
    const statusArr = new Uint32Array(1);
    crypto.getRandomValues(statusArr);
    return {
      position: positionPool[i],
      transient: transientPool[i],
      status: (statusArr[0] % 4) + 1
    };
  });
}

// Convenience: generate draws for dynamic frame (theme extraction determines count)
export function generateDynamicDraws(count) {
  return generateSpread(count);
}

// === ARIADNE THREAD UTILITIES ===

/**
 * Get the archetype root (0-21) for any transient ID (0-77).
 * Archetypes (0-21) are their own root.
 * Bounds (22-61) and Agents (62-77) map to their parent archetype.
 */
export function getArchetypeRoot(transientId) {
  const comp = getComponent(transientId);
  if (comp.type === 'Archetype') return transientId;
  return comp.archetype; // Bounds and Agents have .archetype field
}

/**
 * Generate a single draw for a SPECIFIC archetype position.
 * Used by Ariadne Thread to draw a transient at a determined position.
 */
export function generateTraceDraw(position) {
  const transientPool = shuffleArray([...Array(78).keys()]);
  const statusArr = new Uint32Array(1);
  crypto.getRandomValues(statusArr);
  return {
    position,
    transient: transientPool[0],
    status: (statusArr[0] % 4) + 1
  };
}

export function encodeDraws(draws, spreadType, spreadKey, stance, question) {
  // Use encodeURIComponent to handle Unicode characters before btoa
  const jsonStr = JSON.stringify({ d: draws, t: spreadType, k: spreadKey, s: stance, q: question });
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

export function decodeDraws(encoded) {
  try {
    // Use decodeURIComponent to handle Unicode characters after atob
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    // Handle legacy persona format
    if (data.p && !data.s) {
      // Convert old persona to closest new preset
      const legacyMap = {
        seeker: 'kind',
        practitioner: 'direct',
        philosopher: 'wise',
        direct: 'direct',
        // Also map old preset names to new ones
        quickTake: 'direct',
        gentleGuide: 'kind',
        clearView: 'direct',
        deepDive: 'wise',
        fullTransmission: 'oracle'
      };
      const preset = LEGACY_STANCE_PRESETS[legacyMap[data.p] || 'kind'];
      return {
        draws: data.d,
        spreadType: data.t,
        spreadKey: data.k,
        stance: { seriousness: preset.seriousness, voice: preset.voice, focus: preset.focus, density: preset.density, scope: preset.scope },
        question: data.q
      };
    }
    // Ensure seriousness has a default if loading old stance without it
    const stance = data.s || {};
    if (!stance.seriousness) stance.seriousness = 'balanced';
    return { draws: data.d, spreadType: data.t, spreadKey: data.k, stance, question: data.q };
  } catch { return null; }
}

// Sanitize text for API calls - handles special characters that can cause issues
export function sanitizeForAPI(text) {
  if (!text) return text;
  return text
    .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes to straight
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes to straight
    .replace(/\u2014/g, '--')         // Em dash to double hyphen
    .replace(/\u2013/g, '-')          // En dash to single hyphen
    .replace(/\u2026/g, '...')        // Ellipsis to three dots
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
}

// Helper to get the name of a correction target for REBALANCER enforcement
export function getCorrectionTargetName(correction, trans) {
  if (!correction) return null;

  if (trans.type === "Bound" && correction.targetBound) {
    return correction.targetBound.name;
  }
  if (trans.type === "Agent" && correction.targetAgent) {
    return correction.targetAgent.name;
  }
  if (correction.target !== undefined) {
    const targetArchetype = ARCHETYPES[correction.target];
    return targetArchetype ? targetArchetype.name : null;
  }
  return null;
}

// V1: formatDrawForAI with universal positions and structural enrichment
// depth: 'wade' | 'swim' | 'deep' (default: 'wade')
// frameLabels: optional array of frame-specific position labels (from preset spreads)
// frameLenses: optional array of interpretation lenses (from preset spreads)
export function formatDrawForAI(draws, spreadType, spreadKey, showTraditional, depth = 'wade', frameLabels = null, frameLenses = null) {
  // Legacy compatibility: resolve frame labels from old spread configs
  if (!frameLabels && spreadType === 'reflect') {
    const spreadConfig = REFLECT_SPREADS[spreadKey];
    if (spreadConfig?.positions) {
      frameLabels = spreadConfig.positions.map(p => p.name);
      frameLenses = spreadConfig.positions.map(p => p.lens);
    }
  }

  return draws.map((draw, i) => {
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;

    // Position archetype (ALWAYS present in V1)
    const posArch = ARCHETYPES[draw.position];
    const positionName = posArch?.name || 'Unknown';

    // Frame label (from preset spread) — adds meaning ON TOP of archetype position
    const frameLabel = frameLabels?.[i] || null;
    const frameLens = frameLenses?.[i] || null;

    // Build agency info (card = the agency being exercised)
    let agencyInfo = trans.name;
    if (trans.type === "Archetype") agencyInfo += ` — Major Archetype`;
    else if (trans.type === "Bound") agencyInfo += ` — ${trans.channel} Channel, expresses ${transArchetype?.name}`;
    else if (trans.type === "Agent") agencyInfo += ` — ${trans.role} of ${trans.channel}, embodies ${transArchetype?.name}`;

    const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;
    const rebalancerTargetName = getCorrectionTargetName(correction, trans);

    // === STRUCTURAL DATA (computed for conditional injection) ===
    const posProcessStage = posArch?.function || 'Unknown';
    const posHouse = posArch?.house || 'Unknown';
    const posChannel = posArch?.channel || null;
    const posHorizon = draw.position <= 9 ? 'Inner' : (draw.position <= 21 ? 'Outer' : 'Unknown');
    const transProcessStage = transArchetype?.function || (trans.type === 'Archetype' ? ARCHETYPES[draw.transient]?.function : null);

    // === SHALLOW TIER (always included — no architecture) ===
    let result = `**Signature ${i + 1}**: ${statusPhrase}
⚠️ MANDATORY: Your interpretation MUST include the word "${positionName}" at least once. This card landed in the ${positionName} position. Explain what ${trans.name} means specifically in the context of ${positionName}. The position shapes everything.
Agency (THE SUBJECT): ${agencyInfo}
Domain (POSITION — where this card landed): ${positionName}
Status: ${stat.name} — ${stat.desc}`;

    // Frame label (if preset spread provides additional context)
    if (frameLabel) {
      result += `\nFrame Position: "${frameLabel}" — interpret through this lens in addition to the archetype position`;
    }
    if (frameLens) {
      result += `\nInterpretation Lens: ${frameLens}`;
    }

    // Rebalancer (always included)
    if (correctionText) {
      result += `\nRebalancer: ${correctionText}`;
      result += `\nREBALANCER TARGET: ${rebalancerTargetName}. This is the ONLY card to discuss in rebalancer sections.`;
      result += `\nREBALANCER CONTEXT: This rebalancing is happening in the ${positionName} position (${posHouse} House, ${posProcessStage} stage). The rebalancing must address how ${rebalancerTargetName} restores balance specifically within the domain of ${positionName}. Position shapes the rebalancing — the same imbalance means something different in ${positionName} than it would elsewhere.`;
    } else {
      result += `\nNo rebalancing needed (Balanced)`;
    }

    // === WADE TIER (adds Gestalt/Portal significance) ===
    if (depth === 'wade' || depth === 'swim' || depth === 'deep') {
      const gestaltPositions = [0, 1, 19, 20];
      const portalPositions = [10, 21];

      if (gestaltPositions.includes(draw.position)) {
        result += `\nGESTALT SIGNIFICANCE: ${positionName} is a Gestalt archetype — it operates above the four houses, at the level of consciousness itself. Interpretations landing here carry meta-level weight.`;
      }
      if (portalPositions.includes(draw.position)) {
        const portalType = draw.position === 10 ? 'Ingress (entry)' : 'Egress (completion)';
        result += `\nPORTAL THRESHOLD: ${positionName} is a Portal — the ${portalType} point between Inner and Outer horizons. This is a threshold position where something is crossing between worlds.`;
      }
    }

    // === SWIM TIER (adds horizon, process stage, structural interaction) ===
    if (depth === 'swim' || depth === 'deep') {
      result += `\nProcess Stage: ${positionName} operates at the ${posProcessStage} stage — ${PROCESS_STAGES[posProcessStage]?.description || 'unknown function'}`;
      result += `\nStructural Location: ${posHouse} House, ${posHorizon} horizon`;

      // Structural interaction: transient process stage vs position process stage
      if (transProcessStage && posProcessStage && transProcessStage !== posProcessStage) {
        result += `\nSTRUCTURAL INTERACTION: The transient (${trans.name}) carries ${transProcessStage} energy landing in a ${posProcessStage} position. ${transProcessStage} meeting ${posProcessStage} creates ${getProcessInteraction(transProcessStage, posProcessStage)}.`;
      }

      // Inner/outer crossing analysis
      const transHorizon = draw.transient <= 9 ? 'Inner' : (draw.transient <= 21 ? 'Outer' : (trans.archetype !== undefined ? (trans.archetype <= 9 ? 'Inner-derived' : 'Outer-derived') : 'Channel'));
      if (posHorizon === 'Inner' && transHorizon.startsWith('Outer')) {
        result += `\nHORIZON CROSSING: An Outer-horizon signature landing in an Inner position — what has been realized or completed is now influencing what is still forming.`;
      } else if (posHorizon === 'Outer' && transHorizon === 'Inner') {
        result += `\nHORIZON CROSSING: An Inner-horizon signature landing in an Outer position — what is nascent or seeding is expressing through a mature, manifested domain.`;
      }
    }

    // === DEEP TIER (full correction geometry) ===
    if (depth === 'deep') {
      // Full correction geometry explanation
      const transId = trans.type === 'Archetype' ? draw.transient : (trans.archetype !== undefined ? trans.archetype : null);
      if (transId !== null && transId <= 21) {
        const diagonal = DIAGONAL_PAIRS[transId];
        const vertical = VERTICAL_PAIRS[transId];
        const reduction = REDUCTION_PAIRS[transId];
        result += `\nCORRECTION GEOMETRY for ${trans.name}:`;
        result += `\n  Diagonal (counter-force for Too Much): ${ARCHETYPES[diagonal]?.name} — applies opposing tension within the same domain`;
        result += `\n  Vertical (restoration for Too Little): ${ARCHETYPES[vertical]?.name} — same capacity recovered from complementary expression`;
        if (reduction !== null) {
          result += `\n  Reduction (illumination for Unacknowledged): ${ARCHETYPES[reduction]?.name} — maximally different vantage point that exposes shadow`;
        }
      }

      // Channel resonance between transient and position
      const transChannel = trans.channel || (transArchetype?.channel) || null;
      if (transChannel && posChannel) {
        if (transChannel === posChannel) {
          result += `\nCHANNEL RESONANCE: Both transient and position operate through the ${transChannel} channel — amplified, concentrated expression.`;
        } else {
          result += `\nCHANNEL CROSSING: Transient operates through ${transChannel}, position through ${posChannel}. ${transChannel} energy flowing through a ${posChannel} domain creates cross-pollination.`;
        }
      }

      // House interaction
      const transHouse = trans.house || (transArchetype?.house) || null;
      if (transHouse && posHouse && transHouse !== posHouse) {
        result += `\nHOUSE INTERACTION: ${trans.name} (${transHouse} House) operating in ${positionName} (${posHouse} House) — ${transHouse} agency expressed through ${posHouse} processes.`;
      }
    }

    result += `\nGrammar rule: ${trans.name} is the subject. Say "${trans.name} in ${positionName}" or "${trans.name} in your ${positionName}".`;

    return result;
  }).join('\n\n');
}

// Helper: describe process stage interactions
function getProcessInteraction(transStage, posStage) {
  const interactions = {
    'Seed_Fruition': 'initiating energy meeting completed form — the new arriving at the harvest',
    'Fruition_Seed': 'completed energy meeting raw potential — the harvest seeding the next cycle',
    'Seed_Feedback': 'initiating energy meeting integration — the spark encountering the return signal',
    'Feedback_Seed': 'integrative energy meeting new beginning — the lesson becoming the spark',
    'Medium_Fruition': 'developmental energy meeting completion — what is still growing encountering what is already ripe',
    'Fruition_Medium': 'completed energy meeting ongoing process — the harvest feeding back into development',
    'Medium_Feedback': 'developmental energy meeting return — the growth process encountering its own reflection',
    'Feedback_Medium': 'return energy meeting ongoing growth — the lesson entering the carrying stage',
    'Seed_Medium': 'initiating energy meeting development — the spark entering the sustained work',
    'Medium_Seed': 'developmental energy meeting fresh beginning — process encountering raw potential',
    'Fruition_Feedback': 'completion meeting integration — the harvest becoming the lesson',
    'Feedback_Fruition': 'integration meeting completion — the return signal arriving at the harvest'
  };
  const key = `${transStage}_${posStage}`;
  return interactions[key] || `${transStage} energy meeting ${posStage} domain`;
}

// === RESPONSE PARSING ===

// Helper to extract a section by marker
function extractSection(text, startMarker, endMarkers = []) {
  const startRegex = new RegExp(`\\[${startMarker}\\]\\s*`, 'i');
  const startMatch = text.match(startRegex);
  if (!startMatch) return null;

  const startIndex = startMatch.index + startMatch[0].length;
  let endIndex = text.length;

  // Find the earliest end marker
  for (const endMarker of endMarkers) {
    const endRegex = new RegExp(`\\[${endMarker}\\]`, 'i');
    const endMatch = text.slice(startIndex).match(endRegex);
    if (endMatch && startIndex + endMatch.index < endIndex) {
      endIndex = startIndex + endMatch.index;
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

// Detect which format the response is in
function isProgressiveDepthFormat(responseText) {
  return responseText.includes('[CARD:1:SURFACE]') || responseText.includes('[CARD:1:WADE]');
}

// Smart parser that detects format and uses appropriate parser
export function parseReadingResponse(responseText, draws) {
  // Detect format and route to appropriate parser
  if (!isProgressiveDepthFormat(responseText)) {
    // Old format - use legacy parser but adapt output structure
    const legacy = parseReadingResponseLegacy(responseText, draws);

    // Adapt legacy structure to new structure for backwards compatibility
    return {
      letter: legacy.letter ? { surface: legacy.letter, wade: legacy.letter, swim: legacy.letter, deep: legacy.letter } : null,
      summary: legacy.summary ? { surface: legacy.summary, wade: legacy.summary, swim: legacy.summary, deep: legacy.summary } : { surface: null, wade: null, swim: null, deep: null },
      cards: legacy.cards.map((card, i) => {
        const correction = legacy.corrections.find(c => c.cardIndex === i);
        // Legacy wordsToWhys was global, adapt per-card using whyMoment if available
        const whyContent = card.whyMoment
          ? `${card.whyMoment.recognition || ''}\n${card.whyMoment.question || ''}`.trim()
          : null;
        return {
          index: card.index,
          // Put old content in wade level, surface gets a truncated version
          surface: card.content ? card.content.split('\n')[0].slice(0, 200) : null,
          wade: card.content,
          swim: card.content,
          architecture: null,
          mirror: whyContent,
          rebalancer: correction ? {
            surface: correction.content ? correction.content.split('\n')[0].slice(0, 200) : null,
            wade: correction.content,
            swim: correction.content,
            architecture: null
          } : null,
          why: {
            surface: whyContent ? whyContent.split('\n')[0] : null,
            wade: whyContent,
            swim: whyContent,
            deep: whyContent,
            architecture: null
          }
        };
      }),
      path: {
        surface: legacy.rebalancerSummary ? legacy.rebalancerSummary.split('\n')[0] : null,
        wade: legacy.rebalancerSummary,
        swim: legacy.rebalancerSummary,
        architecture: null
      },
      fullArchitecture: null,
      _isLegacyFormat: true
    };
  }

  // New progressive depth format
  return parseProgressiveDepthResponse(responseText, draws);
}

// Parser for new progressive depth format
function parseProgressiveDepthResponse(responseText, draws) {
  const sections = {
    letter: { surface: null, wade: null, swim: null, deep: null },
    summary: { surface: null, wade: null, swim: null, deep: null },
    cards: [],
    path: { surface: null, wade: null, swim: null, deep: null, architecture: null },
    fullArchitecture: null
  };

  // All possible markers for boundary detection (including DEEP levels)
  const allMarkers = [
    'LETTER:SURFACE', 'LETTER:WADE', 'LETTER:SWIM', 'LETTER:DEEP',
    'SUMMARY:SURFACE', 'SUMMARY:WADE', 'SUMMARY:SWIM', 'SUMMARY:DEEP',
    'PATH:SURFACE', 'PATH:WADE', 'PATH:SWIM', 'PATH:DEEP', 'PATH:ARCHITECTURE',
    'FULL_ARCHITECTURE',
    ...draws.flatMap((_, i) => {
      const n = i + 1;
      return [
        `CARD:${n}:SURFACE`, `CARD:${n}:WADE`, `CARD:${n}:SWIM`, `CARD:${n}:DEEP`,
        `CARD:${n}:ARCHITECTURE`, `CARD:${n}:MIRROR`,
        `CARD:${n}:WHY:SURFACE`, `CARD:${n}:WHY:WADE`, `CARD:${n}:WHY:SWIM`,
        `CARD:${n}:WHY:DEEP`, `CARD:${n}:WHY:ARCHITECTURE`,
        `CARD:${n}:REBALANCER:SURFACE`, `CARD:${n}:REBALANCER:WADE`,
        `CARD:${n}:REBALANCER:SWIM`, `CARD:${n}:REBALANCER:DEEP`, `CARD:${n}:REBALANCER:ARCHITECTURE`
      ];
    })
  ];

  // Extract letter at all depths (including DEEP)
  const letterEndMarkers = allMarkers.filter(m => !m.startsWith('LETTER:'));
  sections.letter.surface = extractSection(responseText, 'LETTER:SURFACE', [...letterEndMarkers, 'LETTER:WADE', 'LETTER:SWIM', 'LETTER:DEEP']);
  sections.letter.wade = extractSection(responseText, 'LETTER:WADE', [...letterEndMarkers, 'LETTER:SWIM', 'LETTER:DEEP']);
  sections.letter.swim = extractSection(responseText, 'LETTER:SWIM', [...letterEndMarkers, 'LETTER:DEEP']);
  sections.letter.deep = extractSection(responseText, 'LETTER:DEEP', letterEndMarkers);

  // Extract summary at all depths
  const summaryEndMarkers = allMarkers.filter(m => !m.startsWith('SUMMARY:'));
  sections.summary.surface = extractSection(responseText, 'SUMMARY:SURFACE', [...summaryEndMarkers, 'SUMMARY:WADE', 'SUMMARY:SWIM', 'SUMMARY:DEEP']);
  sections.summary.wade = extractSection(responseText, 'SUMMARY:WADE', [...summaryEndMarkers, 'SUMMARY:SWIM', 'SUMMARY:DEEP']);
  sections.summary.swim = extractSection(responseText, 'SUMMARY:SWIM', [...summaryEndMarkers, 'SUMMARY:DEEP']);
  sections.summary.deep = extractSection(responseText, 'SUMMARY:DEEP', summaryEndMarkers);

  // Extract card sections at all depths
  draws.forEach((draw, i) => {
    const cardNum = i + 1;
    const otherMarkers = allMarkers.filter(m => !m.startsWith(`CARD:${cardNum}:`));
    const cardMarkers = allMarkers.filter(m => m.startsWith(`CARD:${cardNum}:`));
    const endMarkers = [...otherMarkers, ...cardMarkers];

    const card = {
      index: i,
      surface: extractSection(responseText, `CARD:${cardNum}:SURFACE`, endMarkers),
      wade: extractSection(responseText, `CARD:${cardNum}:WADE`, endMarkers),
      swim: extractSection(responseText, `CARD:${cardNum}:SWIM`, endMarkers),
      deep: extractSection(responseText, `CARD:${cardNum}:DEEP`, endMarkers),
      architecture: extractSection(responseText, `CARD:${cardNum}:ARCHITECTURE`, endMarkers),
      mirror: extractSection(responseText, `CARD:${cardNum}:MIRROR`, endMarkers),
      rebalancer: null,
      why: {
        surface: extractSection(responseText, `CARD:${cardNum}:WHY:SURFACE`, endMarkers),
        wade: extractSection(responseText, `CARD:${cardNum}:WHY:WADE`, endMarkers),
        swim: extractSection(responseText, `CARD:${cardNum}:WHY:SWIM`, endMarkers),
        deep: extractSection(responseText, `CARD:${cardNum}:WHY:DEEP`, endMarkers),
        architecture: extractSection(responseText, `CARD:${cardNum}:WHY:ARCHITECTURE`, endMarkers)
      }
    };

    // Extract rebalancer sections (only for imbalanced cards)
    if (draw.status !== 1) {
      card.rebalancer = {
        surface: extractSection(responseText, `CARD:${cardNum}:REBALANCER:SURFACE`, endMarkers),
        wade: extractSection(responseText, `CARD:${cardNum}:REBALANCER:WADE`, endMarkers),
        swim: extractSection(responseText, `CARD:${cardNum}:REBALANCER:SWIM`, endMarkers),
        deep: extractSection(responseText, `CARD:${cardNum}:REBALANCER:DEEP`, endMarkers),
        architecture: extractSection(responseText, `CARD:${cardNum}:REBALANCER:ARCHITECTURE`, endMarkers)
      };
    }

    sections.cards.push(card);
  });

  // Extract path sections at all depths (including DEEP)
  const pathEndMarkers = allMarkers.filter(m => !m.startsWith('PATH:') && m !== 'FULL_ARCHITECTURE');
  sections.path.surface = extractSection(responseText, 'PATH:SURFACE', [...pathEndMarkers, 'PATH:WADE', 'PATH:SWIM', 'PATH:DEEP', 'PATH:ARCHITECTURE', 'FULL_ARCHITECTURE']);
  sections.path.wade = extractSection(responseText, 'PATH:WADE', [...pathEndMarkers, 'PATH:SWIM', 'PATH:DEEP', 'PATH:ARCHITECTURE', 'FULL_ARCHITECTURE']);
  sections.path.swim = extractSection(responseText, 'PATH:SWIM', [...pathEndMarkers, 'PATH:DEEP', 'PATH:ARCHITECTURE', 'FULL_ARCHITECTURE']);
  sections.path.deep = extractSection(responseText, 'PATH:DEEP', [...pathEndMarkers, 'PATH:ARCHITECTURE', 'FULL_ARCHITECTURE']);
  sections.path.architecture = extractSection(responseText, 'PATH:ARCHITECTURE', [...pathEndMarkers, 'FULL_ARCHITECTURE']);

  // Extract FULL_ARCHITECTURE section (global reading architecture)
  sections.fullArchitecture = extractSection(responseText, 'FULL_ARCHITECTURE', allMarkers.filter(m => m !== 'FULL_ARCHITECTURE'));

  return sections;
}

// Legacy parser for backwards compatibility (old format)
export function parseReadingResponseLegacy(responseText, draws) {
  const sections = {
    summary: null,
    cards: [],
    corrections: [],
    rebalancerSummary: null,
    wordsToWhys: null,
    letter: null
  };

  // Extract summary
  const summaryMatch = responseText.match(/\[SUMMARY\]\s*([\s\S]*?)(?=\[CARD:|$)/);
  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim();
  }

  // Extract card sections and parse out Why moments
  draws.forEach((draw, i) => {
    const cardNum = i + 1;
    const cardRegex = new RegExp(`\\[CARD:${cardNum}\\]\\s*([\\s\\S]*?)(?=\\[CARD:|\\[CORRECTION:|\\[PATH\\]|\\[WORDS_TO_WHYS\\]|\\[LETTER\\]|$)`);
    const cardMatch = responseText.match(cardRegex);
    if (cardMatch) {
      let content = cardMatch[1].trim();
      let whyMoment = null;

      // Parse out Why moment if present (--- Why --- or ─── Why ───)
      const whyMatch = content.match(/[-─]{2,}\s*Why\s*[-─]{2,}\s*([\s\S]*?)$/i);
      if (whyMatch) {
        // Remove Why section from main content
        content = content.replace(/[-─]{2,}\s*Why\s*[-─]{2,}\s*[\s\S]*$/i, '').trim();
        const whyContent = whyMatch[1].trim();
        // Split into recognition line and question
        const whyLines = whyContent.split(/\n+/).filter(l => l.trim());
        whyMoment = {
          recognition: whyLines[0] || null,
          question: whyLines[1] || null,
          isBalanced: draw.status === 1
        };
      }

      sections.cards.push({
        index: i,
        content: content,
        whyMoment: whyMoment
      });
    }
  });

  // Extract correction sections
  draws.forEach((draw, i) => {
    if (draw.status !== 1) { // Only for imbalanced cards
      const corrNum = i + 1;
      const corrRegex = new RegExp(`\\[CORRECTION:${corrNum}\\]\\s*([\\s\\S]*?)(?=\\[CORRECTION:|\\[PATH\\]|\\[WORDS_TO_WHYS\\]|\\[LETTER\\]|$)`);
      const corrMatch = responseText.match(corrRegex);
      if (corrMatch) {
        sections.corrections.push({
          cardIndex: i,
          content: corrMatch[1].trim()
        });
      }
    }
  });

  // Extract path to balance section (only when 2+ imbalanced)
  const rebalancerMatch = responseText.match(/\[PATH\]\s*([\s\S]*?)(?=\[WORDS_TO_WHYS\]|\[LETTER\]|$)/);
  if (rebalancerMatch) {
    sections.rebalancerSummary = rebalancerMatch[1].trim();
  }

  // Extract words to the whys section (teleological grounding)
  const wordsToWhysMatch = responseText.match(/\[WORDS_TO_WHYS\]\s*([\s\S]*?)(?=\[LETTER\]|$)/);
  if (wordsToWhysMatch) {
    sections.wordsToWhys = wordsToWhysMatch[1].trim();
  }

  // Extract letter section
  const letterMatch = responseText.match(/\[LETTER\]\s*([\s\S]*?)$/);
  if (letterMatch) {
    sections.letter = letterMatch[1].trim();
  }

  return sections;
}
