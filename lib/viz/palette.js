// lib/viz/palette.js
// CANONICAL color palette for the Nirmanakaya visualization layer.
// Single source of truth — resolves the historical 3-way divergence
// (HOUSE_COLORS, CHANNEL_COLORS, tesseract in-file tables).
//
// Principle: color follows ELEMENT (element-true), as in the 35-year deck.
//   Aether=purple · Fire=red · Air=green · Water=blue · Earth=gold
// House↔element and Channel↔element are canonical (see lib/constants.js CHANNELS).
//
// New graphics import from here. Existing views migrate over time.

// ---- the five elements (hex for SVG/canvas/three) ----
export const ELEMENT_COLORS = {
  Aether: '#7c4dff', // Gestalt / Soul
  Fire:   '#ff3b30', // Spirit / Intent
  Air:    '#4f9e4f', // Mind / Cognition
  Water:  '#3f6fd1', // Emotion / Resonance
  Earth:  '#c69a3a', // Body / Structure
};

// portals (Source 10 / Creation 21) — transcendent, not an element
export const PORTAL_COLOR = '#ef5f8a';

// ---- house → element (canonical) ----
export const HOUSE_ELEMENT = {
  Gestalt: 'Aether',
  Spirit:  'Fire',
  Mind:    'Air',
  Emotion: 'Water',
  Body:    'Earth',
  Portal:  null, // uses PORTAL_COLOR
};

// ---- channel → element (canonical; channels ARE elements) ----
export const CHANNEL_ELEMENT = {
  Intent:    'Fire',
  Cognition: 'Air',
  Resonance: 'Water',
  Structure: 'Earth',
};

// ---- the four transient states (functional encoding, not elemental) ----
export const STATE_COLORS = {
  balanced:       '#34d399', // emerald — flowing
  tooMuch:        '#f59e0b', // amber — running hot / future-displaced
  tooLittle:      '#38bdf8', // sky — running cold / past-displaced
  unacknowledged: '#a78bfa', // violet — shadow / unseen
};
// numeric aliases (engine uses status 1-4)
export const STATE_BY_STATUS = {
  1: STATE_COLORS.balanced,
  2: STATE_COLORS.tooMuch,
  3: STATE_COLORS.tooLittle,
  4: STATE_COLORS.unacknowledged,
};

// ---- helpers ----
export function houseColor(house) {
  const el = HOUSE_ELEMENT[house];
  return el ? ELEMENT_COLORS[el] : PORTAL_COLOR;
}
export function channelColor(channel) {
  const el = CHANNEL_ELEMENT[channel];
  return el ? ELEMENT_COLORS[el] : PORTAL_COLOR;
}
export function elementColor(element) {
  return ELEMENT_COLORS[element] || PORTAL_COLOR;
}
export function stateColor(stateOrStatus) {
  if (typeof stateOrStatus === 'number') return STATE_BY_STATUS[stateOrStatus] || '#888';
  return STATE_COLORS[stateOrStatus] || '#888';
}

// background ground used across the viz layer (cosmic dark)
export const VIZ_BG = '#06070b';
export const VIZ_INK = '#eef1f6';
export const VIZ_DIM = '#8b93a4';
