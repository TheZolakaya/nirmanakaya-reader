// === UTILITY FUNCTIONS ===
// Drawing, encoding/decoding, formatting utilities

import { ARCHETYPES } from './archetypes.js';
import { STATUSES } from './constants.js';
import { REFLECT_SPREADS, RANDOM_SPREADS } from './spreads.js';
import { STANCE_PRESETS } from './voice.js';
import { getComponent, getFullCorrection, getCorrectionText } from './corrections.js';

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

export function generateSpread(count, isReflect = false) {
  const positionPool = isReflect ? [] : shuffleArray([...Array(22).keys()]);
  const transientPool = shuffleArray([...Array(78).keys()]);

  return Array.from({ length: count }, (_, i) => {
    const statusArr = new Uint32Array(1);
    crypto.getRandomValues(statusArr);
    return {
      position: isReflect ? null : positionPool[i],
      transient: transientPool[i],
      status: (statusArr[0] % 4) + 1
    };
  });
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
      const preset = STANCE_PRESETS[legacyMap[data.p] || 'kind'];
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

export function formatDrawForAI(draws, spreadType, spreadKey, showTraditional) {
  const isReflect = spreadType === 'reflect';
  const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];

  return draws.map((draw, i) => {
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;

    // Build domain context based on mode (position = domain where agency occurs)
    let domainContext, positionLens;
    if (isReflect && spreadConfig?.positions?.[i]) {
      domainContext = spreadConfig.positions[i].name;
      positionLens = spreadConfig.positions[i].lens;
    } else {
      domainContext = draw.position !== null ? `${ARCHETYPES[draw.position]?.name} (Position ${draw.position})` : 'Draw';
      positionLens = null;
    }

    // Build agency info (card = the agency being exercised)
    let agencyInfo = trans.name;
    // Traditional names removed from API calls - showTraditional only affects UI display
    if (trans.type === "Archetype") agencyInfo += ` — Major Archetype`;
    else if (trans.type === "Bound") agencyInfo += ` — ${trans.channel} Channel, expresses ${transArchetype?.name}`;
    else if (trans.type === "Agent") agencyInfo += ` — ${trans.role} of ${trans.channel}, embodies ${transArchetype?.name}`;

    const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;

    // Include position lens for Reflect mode
    const lensLine = positionLens ? `\nInterpretation Lens: ${positionLens}` : '';

    return `**Signature ${i + 1}**: ${statusPhrase}
Agency (THE SUBJECT — what is imbalanced): ${agencyInfo}
Domain (THE CONTEXT — where agency occurs): ${domainContext}
Status (HOW the agency is expressing): ${stat.name} — ${stat.desc}${lensLine}
${correctionText ? `Correction: ${correctionText}. IMPORTANT: Use this exact correction, do not calculate different numbers.` : 'No correction needed (Balanced)'}
REMINDER: The AGENCY (${trans.name}) is the grammatical subject. The DOMAIN is context only. Never say "${domainContext} is [doing X]" — say "${trans.name} is [doing X] in ${domainContext}".`;
  }).join('\n\n');
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
