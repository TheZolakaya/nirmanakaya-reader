// lib/map/seals.js
// The Three Seals - Eternal invariants of the Nirmanakaya system
//
// These 4×4 matrices encode the relationship between Houses and Channels
// Rows: Fire/Intent, Air/Cognition, Water/Resonance, Earth/Structure
// Cols: Spirit, Emotion, Mind, Body

/**
 * THE 40-FOLD SEAL
 * Archetype IDs arranged by Channel × House
 * Each row and column sums to 40
 */
export const SEAL_40 = {
  name: 'Forty-Fold Seal',
  description: 'The 16 peripheral archetypes by Channel and House',
  sumTarget: 40,

  // [row][col] = archetype ID
  // Rows: Intent, Cognition, Resonance, Structure
  // Cols: Spirit, Emotion, Mind, Body
  matrix: [
    [17,  7,  4, 12],  // Fire/Intent:     Inspiration, Drive, Order, Sacrifice
    [ 2, 14, 15,  9],  // Air/Cognition:   Wisdom, Balance, Abstraction, Discipline
    [18,  6,  5, 11],  // Water/Resonance: Imagination, Compassion, Culture, Equity
    [ 3, 13, 16,  8],  // Earth/Structure: Nurturing, Change, Breakthrough, Fortitude
  ],

  rows: ['Intent', 'Cognition', 'Resonance', 'Structure'],
  cols: ['Spirit', 'Emotion', 'Mind', 'Body'],

  // Element correspondences for rows
  elements: ['Fire', 'Air', 'Water', 'Earth'],
};

/**
 * THE 22-FOLD SEAL
 * Mod(9) reduction of the 40-Fold Seal
 * Each row and column sums to 22
 *
 * Reduction: n → ((n - 1) % 9) + 1, or for values > 9: sum digits
 * 17→8, 7→7, 4→4, 12→3
 * 2→2, 14→5, 15→6, 9→9
 * 18→9, 6→6, 5→5, 11→2
 * 3→3, 13→4, 16→7, 8→8
 */
export const SEAL_22 = {
  name: 'Twenty-Two-Fold Seal',
  description: 'Mod(9) reduction of the Forty-Fold Seal',
  sumTarget: 22,

  matrix: [
    [8, 7, 4, 3],  // Fire/Intent
    [2, 5, 6, 9],  // Air/Cognition
    [9, 6, 5, 2],  // Water/Resonance
    [3, 4, 7, 8],  // Earth/Structure
  ],

  rows: ['Intent', 'Cognition', 'Resonance', 'Structure'],
  cols: ['Spirit', 'Emotion', 'Mind', 'Body'],
  elements: ['Fire', 'Air', 'Water', 'Earth'],
};

/**
 * THE 10-FOLD SEAL
 * A true magic square - rows, columns, AND diagonals sum to 10
 * Values 1-4 representing processing stages
 *
 * 1 = Seed (beginning, potential)
 * 2 = Medium (process, transformation)
 * 3 = Fruition (completion, harvest)
 * 4 = Feedback (integration, return)
 */
export const SEAL_10 = {
  name: 'Ten-Fold Seal',
  description: 'Magic square of processing stages',
  sumTarget: 10,

  matrix: [
    [3, 2, 1, 4],  // Fire/Intent
    [1, 4, 3, 2],  // Air/Cognition
    [4, 1, 2, 3],  // Water/Resonance
    [2, 3, 4, 1],  // Earth/Structure
  ],

  rows: ['Intent', 'Cognition', 'Resonance', 'Structure'],
  cols: ['Spirit', 'Emotion', 'Mind', 'Body'],
  elements: ['Fire', 'Air', 'Water', 'Earth'],

  // Processing stage meanings
  stages: {
    1: { name: 'Seed', description: 'Beginning, potential, initiation' },
    2: { name: 'Medium', description: 'Process, transformation, cultivation' },
    3: { name: 'Fruition', description: 'Completion, harvest, manifestation' },
    4: { name: 'Feedback', description: 'Integration, return, wisdom gained' },
  },

  // Verify magic square properties
  diagonals: {
    main: [3, 4, 2, 1],      // top-left to bottom-right = 10
    anti: [4, 3, 1, 2],      // top-right to bottom-left = 10
  },
};

/**
 * Get the archetype ID for a position in the 40-fold seal
 * @param {number} row - 0-3 (Intent, Cognition, Resonance, Structure)
 * @param {number} col - 0-3 (Spirit, Emotion, Mind, Body)
 */
export function getSeal40Archetype(row, col) {
  return SEAL_40.matrix[row][col];
}

/**
 * Get the agent ID that corresponds to an archetype in the seal
 * Agents are linked to archetypes - this finds the agent for a given seal position
 * @param {number} row - 0-3 (channel index)
 * @param {number} col - 0-3 (house index)
 */
export function getSeal40Agent(row, col) {
  // Agents 62-77 are organized by channel then role
  // Channel: Intent (62-65), Cognition (66-69), Resonance (70-73), Structure (74-77)
  // Role within channel: Initiate, Catalyst, Steward, Executor

  // The seal columns are: Spirit, Emotion, Mind, Body
  // House roles: Spirit=Initiate, Mind=Catalyst, Emotion=Steward, Body=Executor
  const channelOffset = row * 4;  // 0, 4, 8, 12

  // Map house column to role index
  // Spirit(0)=Initiate(0), Emotion(1)=Steward(2), Mind(2)=Catalyst(1), Body(3)=Executor(3)
  const houseToRole = [0, 2, 1, 3];  // Spirit, Emotion, Mind, Body → role index
  const roleIndex = houseToRole[col];

  return 62 + channelOffset + roleIndex;
}

/**
 * Get the processing stage for a position in the 10-fold seal
 * @param {number} row - 0-3
 * @param {number} col - 0-3
 * @returns {{ value: number, name: string, description: string }}
 */
export function getSeal10Stage(row, col) {
  const value = SEAL_10.matrix[row][col];
  return {
    value,
    ...SEAL_10.stages[value]
  };
}

/**
 * All three seals for iteration
 */
export const SEALS = {
  40: SEAL_40,
  22: SEAL_22,
  10: SEAL_10,
};

/**
 * Display modes for seal layouts
 */
export const SEAL_DISPLAY_MODES = {
  NUMBERS: 'numbers',           // Show the numeric values (large)
  ARCHETYPES: 'archetypes',     // Show archetype cards (40-fold positions)
  AGENTS: 'agents',             // Show agent cards (corresponding to archetypes)
  STAGES: 'stages',             // Show processing stage names (10-fold)
};

/**
 * SEAL AGENT MATRIX
 * Derived from Channel × House intersection
 * Each position shows the agent of that channel with that house's role
 *
 * Houses own roles:
 *   Spirit → Initiate (Page)
 *   Mind → Catalyst (Knight)
 *   Emotion → Steward (Queen)
 *   Body → Executor (King)
 */
export const SEAL_AGENTS = {
  name: 'Seal of Agents',
  description: 'The 16 agents by Channel and House-owned Role',

  // [row][col] = agent ID
  // Rows: Intent, Cognition, Resonance, Structure
  // Cols: Spirit (Initiate), Emotion (Steward), Mind (Catalyst), Body (Executor)
  matrix: [
    [62, 64, 63, 65],  // Intent:     Initiate, Steward, Catalyst, Executor of Intent
    [66, 68, 67, 69],  // Cognition:  Initiate, Steward, Catalyst, Executor of Cognition
    [70, 72, 71, 73],  // Resonance:  Initiate, Steward, Catalyst, Executor of Resonance
    [74, 76, 75, 77],  // Structure:  Initiate, Steward, Catalyst, Executor of Structure
  ],

  rows: ['Intent', 'Cognition', 'Resonance', 'Structure'],
  cols: ['Spirit', 'Emotion', 'Mind', 'Body'],
  colRoles: ['Initiate', 'Steward', 'Catalyst', 'Executor'],
};

/**
 * ELEMENTAL DESIGNATORS
 * Channel → Element → Color mapping for seal display
 */
export const SEAL_ELEMENTS = {
  Intent: {
    element: 'Fire',
    color: '#C44444',
    suit: 'Wands',
  },
  Cognition: {
    element: 'Air',
    color: '#4A8B4A',
    suit: 'Swords',
  },
  Resonance: {
    element: 'Water',
    color: '#3D6A99',
    suit: 'Cups',
  },
  Structure: {
    element: 'Earth',
    color: '#8B6B3D',
    suit: 'Pentacles',
  },
};

/**
 * HOUSE COLORS
 * For column headers in seal display
 */
export const SEAL_HOUSE_COLORS = {
  Spirit: '#C44444',    // Red (Fire-adjacent, lower right)
  Emotion: '#3D6A99',   // Blue (Water, upper right)
  Mind: '#4A8B4A',      // Green (Air, upper left)
  Body: '#8B6B3D',      // Brown (Earth, lower left)
};

/**
 * Get agent ID for a seal position (derived, not stored)
 * @param {number} row - 0-3 (channel: Intent, Cognition, Resonance, Structure)
 * @param {number} col - 0-3 (house: Spirit, Emotion, Mind, Body)
 */
export function getSealAgent(row, col) {
  return SEAL_AGENTS.matrix[row][col];
}

/**
 * Get both archetype and agent for a seal position
 * @param {number} row - 0-3
 * @param {number} col - 0-3
 */
export function getSealCards(row, col) {
  return {
    archetype: SEAL_40.matrix[row][col],
    agent: SEAL_AGENTS.matrix[row][col],
    channel: SEAL_40.rows[row],
    house: SEAL_40.cols[col],
    element: SEAL_ELEMENTS[SEAL_40.rows[row]],
    stage: getSeal10Stage(row, col),
    mod9: SEAL_22.matrix[row][col],
  };
}
