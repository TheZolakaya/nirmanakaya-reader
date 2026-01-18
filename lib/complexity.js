// lib/complexity.js
// 20-Level Complexity System
// Maps levels 1-20 to modes, card counts, and elemental associations

export const ELEMENTS = ['earth', 'water', 'air', 'fire', 'gestalt'];
export const MODES = ['reflect', 'discover', 'explore', 'forge'];

// Element symbols (alchemical)
export const ELEMENT_SYMBOLS = {
  earth: '🜃',
  water: '🜄',
  air: '🜁',
  fire: '🜂',
  gestalt: '✧'
};

// Mode colors (matching existing UI)
export const MODE_COLORS = {
  reflect: { bg: 'bg-violet-900/40', text: 'text-violet-300', border: 'border-violet-500/30' },
  discover: { bg: 'bg-cyan-900/40', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  explore: { bg: 'bg-amber-900/40', text: 'text-amber-300', border: 'border-amber-500/30' },
  forge: { bg: 'bg-rose-900/40', text: 'text-rose-300', border: 'border-rose-500/30' }
};

// Mode descriptions
export const MODE_DESCRIPTIONS = {
  reflect: 'What is already happening?',
  discover: 'Where is authorship available?',
  explore: 'Threaded conversation with cards',
  forge: 'What changes when intention is asserted?'
};

/**
 * Get the mode for a given complexity level (1-20)
 * Levels 1-5: reflect, 6-10: discover, 11-15: explore, 16-20: forge
 */
export function getMode(level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  return MODES[Math.floor((clampedLevel - 1) / 5)];
}

/**
 * Get the card count for a given complexity level (1-20)
 * Each mode cycles through 1-5 cards
 */
export function getCardCount(level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  return ((clampedLevel - 1) % 5) + 1;
}

/**
 * Get the element for a given complexity level (1-20)
 * Each mode cycles through earth, water, air, fire, gestalt
 */
export function getElement(level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  return ELEMENTS[(clampedLevel - 1) % 5];
}

/**
 * Get complete level info for a given complexity level
 */
export function getLevelInfo(level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  const mode = getMode(clampedLevel);
  const cardCount = getCardCount(clampedLevel);
  const element = getElement(clampedLevel);

  return {
    level: clampedLevel,
    mode,
    cardCount,
    element,
    elementSymbol: ELEMENT_SYMBOLS[element],
    modeDescription: MODE_DESCRIPTIONS[mode],
    modeColors: MODE_COLORS[mode],
    modeLevelIndex: ((clampedLevel - 1) % 5) + 1  // 1-5 within mode
  };
}

/**
 * Convert legacy mode + cardCount to complexity level
 * Used when loading saved readings
 */
export function levelFromLegacy(mode, cardCount) {
  const modeIndex = MODES.indexOf(mode);
  if (modeIndex === -1) return 1; // Default to level 1 if unknown mode
  const elementIndex = Math.max(0, Math.min(4, cardCount - 1)); // Clamp to 0-4
  return (modeIndex * 5) + elementIndex + 1; // 1-20
}

/**
 * Convert complexity level to legacy format
 * Used when saving readings or calling API
 */
export function legacyFromLevel(level) {
  const info = getLevelInfo(level);
  return {
    mode: info.mode,
    spreadType: info.mode,
    cardCount: info.cardCount
  };
}

/**
 * Get all levels for a specific mode
 */
export function getLevelsForMode(mode) {
  const modeIndex = MODES.indexOf(mode);
  if (modeIndex === -1) return [];
  const startLevel = (modeIndex * 5) + 1;
  return [startLevel, startLevel + 1, startLevel + 2, startLevel + 3, startLevel + 4];
}

/**
 * Check if a level is accessible given max level
 */
export function isLevelAccessible(level, maxLevel) {
  return level <= maxLevel;
}

// Default complexity configuration
export const DEFAULT_COMPLEXITY_CONFIG = {
  maxUserLevel: 10,       // Users can access up to level 10 by default
  maxAdminLevel: 20,      // Admins can access all 20
  showElementLabels: true // Display elemental associations
};

/**
 * Check if a mode is enabled at a given complexity level
 * Reflect: 1-5, Discover: 6-10, Explore: 11-15, Forge: 16-20
 */
export function isModeEnabled(mode, level) {
  const modeIndex = MODES.indexOf(mode);
  if (modeIndex === -1) return false;
  const modeStartLevel = modeIndex * 5 + 1;
  return level >= modeStartLevel;
}

/**
 * Get the maximum card count enabled for a mode at a given level
 * Returns 0 if mode is not enabled
 */
export function getMaxCardsForMode(mode, level) {
  const modeIndex = MODES.indexOf(mode);
  if (modeIndex === -1) return 0;
  const modeStartLevel = modeIndex * 5 + 1;
  const modeEndLevel = (modeIndex + 1) * 5;

  if (level < modeStartLevel) return 0; // Mode not unlocked yet
  if (level >= modeEndLevel) return 5;  // All cards unlocked for this mode

  // Partial unlock: level within this mode's range
  return level - modeStartLevel + 1;
}

/**
 * Check if a specific card count is enabled for a mode at a given level
 */
export function isCardCountEnabled(mode, cardCount, level) {
  return cardCount <= getMaxCardsForMode(mode, level);
}
