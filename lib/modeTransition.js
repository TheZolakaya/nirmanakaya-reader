// === MODE TRANSITION ===
// Transition markers and announcements for Discover → Forge boundary

import { TRANSITION_MARKERS, AUTHORSHIP_CLOSURES } from './modes.js';

// Canonical transition marker for Discover → Forge boundary
export const DISCOVER_TRANSITION_MARKER = "These are authorship locations — not instructions.";

// Forge mode acknowledgement (prepended when user explicitly selects Forge)
export const FORGE_ACKNOWLEDGEMENT = "You are now asserting intention. This will shape the Field.";

// Action indicators that suggest we're approaching Forge territory
const ACTION_INDICATORS = [
  /step in/i,
  /lean into/i,
  /step back/i,
  /claim/i,
  /you could/i,
  /available to you/i,
  /capacity to/i,
  /positioned to/i,
  /engage/i,
  /withdraw/i
];

// Patterns that indicate transition marker is already present
const MARKER_PATTERNS = [
  /authorship locations/i,
  /not instructions/i,
  /visibility, not direction/i,
  /no action is required/i,
  /points of available authorship/i,
  /where choice already exists/i
];

// Check if text contains action-approaching language
export function shouldInjectTransitionMarker(text, mode) {
  if (mode !== 'discover') return false;

  return ACTION_INDICATORS.some(pattern => pattern.test(text));
}

// Check if transition marker is already present
export function hasTransitionMarker(text) {
  return MARKER_PATTERNS.some(pattern => pattern.test(text));
}

// Get a random transition marker
export function getRandomTransitionMarker() {
  const index = Math.floor(Math.random() * TRANSITION_MARKERS.length);
  return TRANSITION_MARKERS[index];
}

// Get a random authorship closure
export function getRandomAuthorshipClosure() {
  const index = Math.floor(Math.random() * AUTHORSHIP_CLOSURES.length);
  return AUTHORSHIP_CLOSURES[index];
}

// Inject marker if needed
export function ensureTransitionMarker(text, mode) {
  if (mode === 'discover' && shouldInjectTransitionMarker(text, mode) && !hasTransitionMarker(text)) {
    // Find the last paragraph before any question
    const parts = text.split(/\n\n/);
    const questionIndex = parts.findIndex(p => p.trim().endsWith('?'));

    if (questionIndex > 0) {
      // Insert marker before the question
      parts.splice(questionIndex, 0, `*${DISCOVER_TRANSITION_MARKER}*`);
    } else {
      // Append marker at end
      parts.push(`*${DISCOVER_TRANSITION_MARKER}*`);
    }

    return parts.join('\n\n');
  }

  return text;
}

// Prepend Forge acknowledgement when mode is explicitly Forge
export function prependForgeAcknowledgement(text, mode, userExplicitlySelectedForge) {
  if (mode === 'forge' && userExplicitlySelectedForge) {
    return `*${FORGE_ACKNOWLEDGEMENT}*\n\n${text}`;
  }
  return text;
}

// Ensure Forge output closes with authorship return
export function ensureAuthorshipReturn(text, mode) {
  if (mode !== 'forge') return text;

  // Check if authorship return already present
  const hasReturn = /authorship remains|observe what changes/i.test(text);

  if (!hasReturn) {
    const closure = getRandomAuthorshipClosure();
    return `${text.trim()}\n\n*${closure}*`;
  }

  return text;
}

// Full post-processing pipeline for mode transitions
export function postProcessModeTransitions(text, mode, userSelectedForge = false) {
  let processed = text;

  // Ensure transition marker in Discover mode
  processed = ensureTransitionMarker(processed, mode);

  // Prepend Forge acknowledgement if user explicitly chose Forge
  processed = prependForgeAcknowledgement(processed, mode, userSelectedForge);

  // Ensure authorship return in Forge mode
  processed = ensureAuthorshipReturn(processed, mode);

  return processed;
}
