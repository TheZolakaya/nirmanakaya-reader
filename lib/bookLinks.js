// === BOOK LINKS ===
// Maps keyword popup terms to their relevant book chapter sections
// Used by InfoModal to show "Read in Book" links

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

// Archetype ID → chapter slug + heading hash
// Chapters 29-31 have per-archetype headings
const ARCHETYPE_CHAPTER_MAP = {
  // Gestalt House → Ch 29
  0:  { slug: 'ch29-the-soul-and-the-source', hash: 'potential-the-fool-0' },
  1:  { slug: 'ch29-the-soul-and-the-source', hash: 'will-the-magician-1' },
  19: { slug: 'ch29-the-soul-and-the-source', hash: 'actualization-the-sun-19' },
  20: { slug: 'ch29-the-soul-and-the-source', hash: 'awareness-judgement-20' },
  // Portal → Ch 29
  10: { slug: 'ch29-the-soul-and-the-source', hash: 'source-the-wheel-of-fortune-10' },
  21: { slug: 'ch29-the-soul-and-the-source', hash: 'creation-the-world-21' },
  // Spirit House → Ch 30
  2:  { slug: 'ch30-the-spirit-and-the-body', hash: 'wisdom-the-high-priestess-2' },
  3:  { slug: 'ch30-the-spirit-and-the-body', hash: 'nurturing-the-empress-3' },
  17: { slug: 'ch30-the-spirit-and-the-body', hash: 'inspiration-the-star-17' },
  18: { slug: 'ch30-the-spirit-and-the-body', hash: 'imagination-the-moon-18' },
  // Body House → Ch 30
  8:  { slug: 'ch30-the-spirit-and-the-body', hash: 'fortitude-strength-8' },
  9:  { slug: 'ch30-the-spirit-and-the-body', hash: 'discipline-the-hermit-9' },
  11: { slug: 'ch30-the-spirit-and-the-body', hash: 'equity-justice-11' },
  12: { slug: 'ch30-the-spirit-and-the-body', hash: 'sacrifice-the-hanged-man-12' },
  // Mind House → Ch 31
  4:  { slug: 'ch31-the-mind-and-the-emotion', hash: 'order-the-emperor-4' },
  5:  { slug: 'ch31-the-mind-and-the-emotion', hash: 'culture-the-hierophant-5' },
  15: { slug: 'ch31-the-mind-and-the-emotion', hash: 'abstraction-the-devil-15' },
  16: { slug: 'ch31-the-mind-and-the-emotion', hash: 'breakthrough-the-tower-16' },
  // Emotion House → Ch 31
  6:  { slug: 'ch31-the-mind-and-the-emotion', hash: 'compassion-the-lovers-6' },
  7:  { slug: 'ch31-the-mind-and-the-emotion', hash: 'drive-the-chariot-7' },
  13: { slug: 'ch31-the-mind-and-the-emotion', hash: 'change-death-13' },
  14: { slug: 'ch31-the-mind-and-the-emotion', hash: 'balance-temperance-14' },
};

// House name → book link
const HOUSE_LINKS = {
  Gestalt: { slug: 'ch29-the-soul-and-the-source', hash: 'the-gestalt-house' },
  Spirit:  { slug: 'ch30-the-spirit-and-the-body', hash: 'the-spirit-house' },
  Mind:    { slug: 'ch31-the-mind-and-the-emotion', hash: 'the-mind-house' },
  Emotion: { slug: 'ch31-the-mind-and-the-emotion', hash: 'the-emotion-house' },
  Body:    { slug: 'ch30-the-spirit-and-the-body', hash: 'the-body-house' },
  Portal:  { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
};

// Channel name → book link
const CHANNEL_LINKS = {
  Intent:    { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  Cognition: { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  Resonance: { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  Structure: { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
};

// Status ID → book link
const STATUS_LINKS = {
  1: { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  2: { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  3: { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  4: { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
};

// Glossary slug → book link (for the most important concepts)
const GLOSSARY_LINKS = {
  // Rings
  'ring-0': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-1': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-2': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-3': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-4': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-5': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-6': { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'ring-7': { slug: 'ch27-ring7-and-the-shadow-architecture', hash: null },
  // Houses (glossary versions)
  'gestalt-house': { slug: 'ch29-the-soul-and-the-source', hash: 'the-gestalt-house' },
  'spirit-house':  { slug: 'ch30-the-spirit-and-the-body', hash: 'the-spirit-house' },
  'mind-house':    { slug: 'ch31-the-mind-and-the-emotion', hash: 'the-mind-house' },
  'emotion-house': { slug: 'ch31-the-mind-and-the-emotion', hash: 'the-emotion-house' },
  'body-house':    { slug: 'ch30-the-spirit-and-the-body', hash: 'the-body-house' },
  // Concepts
  'now':              { slug: 'ch33-nowism', hash: null },
  'un-now':           { slug: 'ch27-ring7-and-the-shadow-architecture', hash: null },
  'the-un-now':       { slug: 'ch27-ring7-and-the-shadow-architecture', hash: null },
  'nowism':           { slug: 'ch33-nowism', hash: null },
  'nowism-pyramid':   { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-nowism-principle' },
  'collapse-point':   { slug: 'ch33-nowism', hash: null },
  'instant-return':   { slug: 'ch33-nowism', hash: null },
  'retrieval':        { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-correction-in-practice' },
  'correction':       { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-correction-in-practice' },
  'imbalance':        { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  'rebalancer':       { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-rebalancing-sequence' },
  'veil':             { slug: 'ch25-why-were-here', hash: null },
  'veil-of-individuation': { slug: 'ch25-why-were-here', hash: null },
  'signature':        { slug: 'ch21-the-22-signatures', hash: 'the-twenty-two' },
  'position':         { slug: 'ch24-reading-the-map', hash: null },
  // Operations
  'polarity':         { slug: 'ch13-the-complete-derivation', hash: null },
  'recursion':        { slug: 'ch13-the-complete-derivation', hash: null },
  'yang':             { slug: 'ch13-the-complete-derivation', hash: null },
  'yin':              { slug: 'ch13-the-complete-derivation', hash: null },
  // Relationships
  'vertical-partner':   { slug: 'ch21-the-22-signatures', hash: 'vertical-pairs-same-identity-two-horizons' },
  'diagonal-partner':   { slug: 'ch21-the-22-signatures', hash: 'diagonal-pairs-different-identity-creative-tension' },
  'reduction-partner':  { slug: 'ch21-the-22-signatures', hash: 'reduction-pairs-the-shadow-architecture' },
  'duality':            { slug: 'ch21-the-22-signatures', hash: 'vertical-pairs-same-identity-two-horizons' },
  // Rebalancers
  'vertical-duality':   { slug: 'ch23-the-four-states-and-rebalancing', hash: 'why-three-corrections-not-one' },
  'diagonal-duality':   { slug: 'ch23-the-four-states-and-rebalancing', hash: 'why-three-corrections-not-one' },
  'reduction-pair':     { slug: 'ch23-the-four-states-and-rebalancing', hash: 'why-three-corrections-not-one' },
  'growth-opportunity': { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-rebalancing-sequence' },
  'transpose-pair':     { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-rebalancing-sequence' },
  'polarity-anchor':    { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-rebalancing-sequence' },
  'self-expression':    { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-rebalancing-sequence' },
  // Process stages
  'seed':     { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  'medium':   { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  'fruition': { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  'feedback': { slug: 'ch10-the-quadraverse-and-the-nodes', hash: 'the-four-stages' },
  // Phases
  'creation-phase':  { slug: 'ch14-the-22-steps-of-creation', hash: null },
  'the-turn':        { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  'operation-phase': { slug: 'ch14-the-22-steps-of-creation', hash: null },
  // Portal types
  'ingress': { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  'egress':  { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  // Pillars
  'pillar-1': { slug: 'ch25-why-were-here', hash: null },
  'pillar-2': { slug: 'ch25-why-were-here', hash: null },
  'pillar-3': { slug: 'ch25-why-were-here', hash: null },
  'pillar-4': { slug: 'ch25-why-were-here', hash: null },
  'pillar-5': { slug: 'ch25-why-were-here', hash: null },
  'pillar-6': { slug: 'ch25-why-were-here', hash: null },
  'pillar-7': { slug: 'ch25-why-were-here', hash: null },
  'seven-pillars': { slug: 'ch25-why-were-here', hash: null },
  // Structures
  'forty-fold-seal':  { slug: 'ch16-the-seals-and-proofs', hash: null },
  'the-three-seals':  { slug: 'ch16-the-seals-and-proofs', hash: null },
  'tesseract':        { slug: 'ch16-the-seals-and-proofs', hash: null },
  'house':            { slug: 'ch11-the-five-aspects', hash: 'the-five-houses' },
  'channel':          { slug: 'ch10-the-quadraverse-and-the-nodes', hash: null },
  'status':           { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  'ring':             { slug: 'ch09-the-portals-and-the-self', hash: 'the-seven-rings' },
  'portal':           { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  // Card types
  'archetype':       { slug: 'ch21-the-22-signatures', hash: 'the-twenty-two' },
  'inner-archetype': { slug: 'ch21-the-22-signatures', hash: 'the-twenty-two' },
  'outer-archetype': { slug: 'ch21-the-22-signatures', hash: 'the-twenty-two' },
  'ingress-portal':  { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  'egress-portal':   { slug: 'ch09-the-portals-and-the-self', hash: 'between-two-thresholds' },
  'inner-bound':     { slug: 'ch22-the-living-detail', hash: 'the-bounds-range-of-capacity' },
  'outer-bound':     { slug: 'ch22-the-living-detail', hash: 'the-bounds-range-of-capacity' },
  'bound':           { slug: 'ch22-the-living-detail', hash: 'the-bounds-range-of-capacity' },
  'agent':           { slug: 'ch22-the-living-detail', hash: 'the-agents-behavior-made-visible' },
  'transient':       { slug: 'ch24-reading-the-map', hash: null },
  // Framework
  'nirmanakaya':                 { slug: 'ch02-what-is-nirmanakaya', hash: null },
  'the-78-signatures':           { slug: 'ch21-the-22-signatures', hash: null },
  'the-law':                     { slug: 'ch13-the-complete-derivation', hash: null },
  'law-of-conscious-self-creation': { slug: 'ch13-the-complete-derivation', hash: null },
  // Mathematics
  'phi':          { slug: 'ch16-the-seals-and-proofs', hash: null },
  'fibonacci':    { slug: 'ch16-the-seals-and-proofs', hash: null },
  'digital-root': { slug: 'ch16-the-seals-and-proofs', hash: null },
  // Alignments
  'forge':  { slug: 'ch12-the-legend', hash: null },
  'mirror': { slug: 'ch12-the-legend', hash: null },
  // Reading modes
  'forge-mode':   { slug: 'ch24-reading-the-map', hash: null },
  'inquiry-mode': { slug: 'ch24-reading-the-map', hash: null },
  'reflect-mode': { slug: 'ch24-reading-the-map', hash: null },
  'discover-mode':{ slug: 'ch24-reading-the-map', hash: null },
  // Practice
  'realitycraft':  { slug: 'ch35-the-forge-ritual', hash: null },
  'return-to-now': { slug: 'ch33-nowism', hash: null },
  'reading':       { slug: 'ch24-reading-the-map', hash: null },
  // Interpretation
  'the-one-thing-happening': { slug: 'ch24-reading-the-map', hash: null },
  'meet-then-elevate':       { slug: 'ch24-reading-the-map', hash: null },
  // Connector
  'in-your': { slug: 'ch24-reading-the-map', hash: null },
  // Statuses (glossary versions)
  'balanced':       { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  'too-much':       { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  'too-little':     { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
  'unacknowledged': { slug: 'ch23-the-four-states-and-rebalancing', hash: 'the-four-states' },
};

/**
 * Get book link(s) for a keyword popup term.
 * Returns { label, href } or null if no mapping exists.
 *
 * @param {string} type - 'card' | 'house' | 'channel' | 'status' | 'role' | 'glossary'
 * @param {string|number} id - The term identifier
 * @param {object} data - The term data (card component, house object, etc.)
 * @returns {{ label: string, href: string } | null}
 */
export function getBookLink(type, id, data) {
  let link = null;

  if (type === 'card') {
    const numId = Number(id);
    // Archetypes (0-21)
    if (numId >= 0 && numId <= 21) {
      link = ARCHETYPE_CHAPTER_MAP[numId];
    }
    // Bounds (22-61) → Ch 22
    else if (numId >= 22 && numId <= 61) {
      link = { slug: 'ch22-the-living-detail', hash: 'the-forty-bounds-by-channel' };
    }
    // Agents (62-77) → Ch 22
    else if (numId >= 62 && numId <= 77) {
      link = { slug: 'ch22-the-living-detail', hash: 'the-sixteen-agents' };
    }
  }

  else if (type === 'house') {
    link = HOUSE_LINKS[id];
  }

  else if (type === 'channel') {
    link = CHANNEL_LINKS[id];
  }

  else if (type === 'status') {
    link = STATUS_LINKS[id];
  }

  else if (type === 'role') {
    link = { slug: 'ch22-the-living-detail', hash: 'the-four-roles' };
  }

  else if (type === 'glossary') {
    link = GLOSSARY_LINKS[id];
  }

  if (!link) return null;

  const href = link.hash
    ? `/book/${link.slug}#${link.hash}`
    : `/book/${link.slug}`;

  // Generate a short chapter label
  const chNum = link.slug.match(/ch(\d+)/)?.[1];
  const label = chNum ? `Chapter ${parseInt(chNum)}` : 'Book';

  return { label, href };
}
