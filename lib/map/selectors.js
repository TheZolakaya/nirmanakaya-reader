// lib/map/selectors.js
// Card selection and relationship queries for training system
//
// TERMINOLOGY:
// - Opportunities: Balanced state growth paths
// - Rebalancers: Imbalanced state restoration paths
// (Internal code uses "corrections" but we don't expose that language)

import { ARCHETYPES, BOUNDS, AGENTS } from '../archetypes.js';
import {
  GROWTH_PAIRS,
  DIAGONAL_PAIRS,
  VERTICAL_PAIRS,
  REDUCTION_PAIRS
} from '../corrections.js';

// ============================================
// ARCHETYPE RELATIONSHIP PAIRS
// Consolidated from corrections.js for training
// ============================================

/**
 * TRANSPOSE PAIRS (Balanced opportunity - off-diagonal)
 * Growth through complementary energy
 */
export const TRANSPOSE_PAIRS = {
  2: 4,    // Wisdom ↔ Order
  3: 12,   // Nurturing ↔ Sacrifice
  4: 2,    // Order ↔ Wisdom
  5: 14,   // Culture ↔ Balance
  7: 18,   // Drive ↔ Imagination
  9: 16,   // Discipline ↔ Breakthrough
  11: 13,  // Equity ↔ Change
  12: 3,   // Sacrifice ↔ Nurturing
  13: 11,  // Change ↔ Equity
  14: 5,   // Balance ↔ Culture
  16: 9,   // Breakthrough ↔ Discipline
  18: 7,   // Imagination ↔ Drive
};

/**
 * POLARITY PAIRS (Balanced opportunity - diagonal)
 * Growth through polar integration
 * Only 4 archetypes have polarity pairs (2 reciprocal pairs)
 */
export const POLARITY_PAIRS = {
  6: 15,   // Compassion ↔ Abstraction
  8: 17,   // Fortitude ↔ Inspiration
  15: 6,   // Abstraction ↔ Compassion
  17: 8,   // Inspiration ↔ Fortitude
};

/**
 * All pair types for training reference
 */
export const PAIR_TYPES = {
  // Opportunities (Balanced)
  TRANSPOSE: {
    name: 'Transpose',
    description: 'Off-diagonal growth through complementary energy',
    status: 1,
    pairs: TRANSPOSE_PAIRS,
  },
  POLARITY: {
    name: 'Polarity',
    description: 'Diagonal growth through polar integration',
    status: 1,
    pairs: POLARITY_PAIRS,
  },
  // Rebalancers (Imbalanced)
  DIAGONAL: {
    name: 'Diagonal',
    description: 'Too Much rebalancer - opposite pole',
    status: 2,
    pairs: DIAGONAL_PAIRS,
  },
  VERTICAL: {
    name: 'Vertical',
    description: 'Too Little rebalancer - same slot, different scale',
    status: 3,
    pairs: VERTICAL_PAIRS,
  },
  REDUCTION: {
    name: 'Reduction',
    description: 'Unacknowledged rebalancer - generating source',
    status: 4,
    pairs: REDUCTION_PAIRS,
  },
};

// ============================================
// ARCHETYPE QUERIES
// ============================================

/**
 * Get all archetypes by function (Seed, Medium, Fruition, Feedback)
 * @param {string} func - 'Seed' | 'Medium' | 'Fruition' | 'Feedback' | 'Ingress' | 'Egress'
 * @returns {number[]} Array of archetype IDs
 */
export function getArchetypesByFunction(func) {
  return Object.entries(ARCHETYPES)
    .filter(([_, arch]) => arch.function === func)
    .map(([id]) => parseInt(id));
}

/**
 * Get all archetypes by house
 * @param {string} house - 'Gestalt' | 'Spirit' | 'Mind' | 'Emotion' | 'Body' | 'Portal'
 * @returns {number[]} Array of archetype IDs
 */
export function getArchetypesByHouse(house) {
  return Object.entries(ARCHETYPES)
    .filter(([_, arch]) => arch.house === house)
    .map(([id]) => parseInt(id));
}

/**
 * Get all archetypes by channel
 * @param {string} channel - 'Intent' | 'Cognition' | 'Resonance' | 'Structure' | null
 * @returns {number[]} Array of archetype IDs
 */
export function getArchetypesByChannel(channel) {
  return Object.entries(ARCHETYPES)
    .filter(([_, arch]) => arch.channel === channel)
    .map(([id]) => parseInt(id));
}

/**
 * Get archetype by house and function
 * @param {string} house
 * @param {string} func
 * @returns {number|null} Archetype ID or null
 */
export function getArchetypeByHouseAndFunction(house, func) {
  const entry = Object.entries(ARCHETYPES)
    .find(([_, arch]) => arch.house === house && arch.function === func);
  return entry ? parseInt(entry[0]) : null;
}

/**
 * Get the pair for an archetype given pair type
 * @param {number} archetypeId
 * @param {string} pairType - 'TRANSPOSE' | 'POLARITY' | 'DIAGONAL' | 'VERTICAL' | 'REDUCTION'
 * @returns {number|null} Partner archetype ID or null
 */
export function getArchetypePair(archetypeId, pairType) {
  const pairs = PAIR_TYPES[pairType]?.pairs;
  if (!pairs) return null;
  return pairs[archetypeId] ?? null;
}

/**
 * Get all pair relationships for an archetype
 * @param {number} archetypeId
 * @returns {Object} All pairs this archetype participates in
 */
export function getArchetypeAllPairs(archetypeId) {
  return {
    transpose: TRANSPOSE_PAIRS[archetypeId] ?? null,
    polarity: POLARITY_PAIRS[archetypeId] ?? null,
    diagonal: DIAGONAL_PAIRS[archetypeId] ?? null,
    vertical: VERTICAL_PAIRS[archetypeId] ?? null,
    reduction: REDUCTION_PAIRS[archetypeId] ?? null,
    growth: GROWTH_PAIRS[archetypeId] ?? null,
  };
}

// ============================================
// BOUND QUERIES
// ============================================

/**
 * Get all bounds by channel
 * @param {string} channel - 'Intent' | 'Cognition' | 'Resonance' | 'Structure'
 * @returns {number[]} Array of bound IDs
 */
export function getBoundsByChannel(channel) {
  return Object.entries(BOUNDS)
    .filter(([_, bound]) => bound.channel === channel)
    .map(([id]) => parseInt(id));
}

/**
 * Get all bounds by number (1-10)
 * @param {number} number - 1-10
 * @returns {number[]} Array of bound IDs (one per channel)
 */
export function getBoundsByNumber(number) {
  return Object.entries(BOUNDS)
    .filter(([_, bound]) => bound.number === number)
    .map(([id]) => parseInt(id));
}

/**
 * Get all bounds by polarity (inner/outer)
 * @param {string} polarity - 'inner' (1-5) | 'outer' (6-10)
 * @returns {number[]} Array of bound IDs
 */
export function getBoundsByPolarity(polarity) {
  const isInner = polarity === 'inner';
  return Object.entries(BOUNDS)
    .filter(([_, bound]) => isInner ? bound.number <= 5 : bound.number > 5)
    .map(([id]) => parseInt(id));
}

/**
 * Get all bounds associated with an archetype
 * @param {number} archetypeId
 * @returns {number[]} Array of bound IDs
 */
export function getBoundsByArchetype(archetypeId) {
  return Object.entries(BOUNDS)
    .filter(([_, bound]) => bound.archetype === archetypeId)
    .map(([id]) => parseInt(id));
}

// ============================================
// AGENT QUERIES
// ============================================

/**
 * Get all agents by channel
 * @param {string} channel - 'Intent' | 'Cognition' | 'Resonance' | 'Structure'
 * @returns {number[]} Array of agent IDs
 */
export function getAgentsByChannel(channel) {
  return Object.entries(AGENTS)
    .filter(([_, agent]) => agent.channel === channel)
    .map(([id]) => parseInt(id));
}

/**
 * Get all agents by role
 * @param {string} role - 'Initiate' | 'Catalyst' | 'Steward' | 'Executor'
 * @returns {number[]} Array of agent IDs
 */
export function getAgentsByRole(role) {
  return Object.entries(AGENTS)
    .filter(([_, agent]) => agent.role === role)
    .map(([id]) => parseInt(id));
}

/**
 * Get agent by channel and role
 * @param {string} channel
 * @param {string} role
 * @returns {number|null} Agent ID or null
 */
export function getAgentByChannelAndRole(channel, role) {
  const entry = Object.entries(AGENTS)
    .find(([_, agent]) => agent.channel === channel && agent.role === role);
  return entry ? parseInt(entry[0]) : null;
}

/**
 * Get agent associated with an archetype
 * @param {number} archetypeId
 * @returns {number|null} Agent ID or null
 */
export function getAgentByArchetype(archetypeId) {
  const entry = Object.entries(AGENTS)
    .find(([_, agent]) => agent.archetype === archetypeId);
  return entry ? parseInt(entry[0]) : null;
}

// ============================================
// COMBINED QUERIES
// ============================================

/**
 * Get all cards (archetype + bounds + agent) for an archetype
 * @param {number} archetypeId
 * @returns {{ archetype: number, bounds: number[], agent: number|null }}
 */
export function getArchetypeFamily(archetypeId) {
  return {
    archetype: archetypeId,
    bounds: getBoundsByArchetype(archetypeId),
    agent: getAgentByArchetype(archetypeId),
  };
}

/**
 * Get all cards by channel (bounds + agents)
 * @param {string} channel
 * @returns {{ bounds: number[], agents: number[] }}
 */
export function getChannelCards(channel) {
  return {
    bounds: getBoundsByChannel(channel),
    agents: getAgentsByChannel(channel),
  };
}

/**
 * Get archetype with its vertical pair
 * @param {number} archetypeId
 * @returns {number[]} [archetypeId, verticalPairId]
 */
export function getVerticalDuality(archetypeId) {
  const pair = VERTICAL_PAIRS[archetypeId];
  return pair !== null && pair !== undefined
    ? [archetypeId, pair]
    : [archetypeId];
}

/**
 * Get archetype with its diagonal pair
 * @param {number} archetypeId
 * @returns {number[]} [archetypeId, diagonalPairId]
 */
export function getDiagonalDuality(archetypeId) {
  const pair = DIAGONAL_PAIRS[archetypeId];
  return pair !== null && pair !== undefined
    ? [archetypeId, pair]
    : [archetypeId];
}

// ============================================
// CONSTANTS FOR DISPLAY
// ============================================

export const FUNCTIONS = ['Seed', 'Medium', 'Fruition', 'Feedback', 'Ingress', 'Egress'];
export const HOUSES = ['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body', 'Portal'];
export const CHANNELS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
export const ROLES = ['Initiate', 'Catalyst', 'Steward', 'Executor'];
export const POLARITIES = ['inner', 'outer'];
