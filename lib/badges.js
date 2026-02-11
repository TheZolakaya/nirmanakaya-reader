// === BADGE / ACHIEVEMENT DEFINITIONS ===
// Pure data + checker functions for signature collection milestones
// Badge keys are stable identifiers — never rename once deployed

export const BADGE_CATEGORIES = {
  collection: { label: 'Collection', description: 'Encounter all signatures in a category' },
  mastery: { label: 'Mastery', description: 'Deep engagement with signatures' },
  event: { label: 'Event', description: 'Rare moments in a single reading' },
  milestone: { label: 'Milestone', description: 'Journey markers' }
};

export const BADGE_DEFINITIONS = {
  // ── Collection Badges ──────────────────────────────────────────────
  all_archetypes: {
    key: 'all_archetypes',
    name: 'The Cartographer',
    description: 'Encountered all 22 Archetypes',
    category: 'collection',
    target: 22,
    progressKey: 'uniqueArchetypes',
    check: (stats) => stats.uniqueArchetypes >= 22
  },
  all_bounds: {
    key: 'all_bounds',
    name: 'The Surveyor',
    description: 'Encountered all 40 Bounds',
    category: 'collection',
    target: 40,
    progressKey: 'uniqueBounds',
    check: (stats) => stats.uniqueBounds >= 40
  },
  all_agents: {
    key: 'all_agents',
    name: 'The Summoner',
    description: 'Encountered all 16 Agents',
    category: 'collection',
    target: 16,
    progressKey: 'uniqueAgents',
    check: (stats) => stats.uniqueAgents >= 16
  },
  all_78: {
    key: 'all_78',
    name: 'The Architect',
    description: 'Encountered all 78 signatures — the complete field',
    category: 'collection',
    target: 78,
    progressKey: 'uniqueSignatures',
    check: (stats) => stats.uniqueSignatures >= 78
  },
  channel_intent: {
    key: 'channel_intent',
    name: 'The Flame Walker',
    description: 'All 10 Intent Bounds encountered',
    category: 'collection',
    target: 10,
    progressKey: 'channelIntent',
    check: (stats) => (stats.channelCompletion?.Intent || 0) >= 10
  },
  channel_cognition: {
    key: 'channel_cognition',
    name: 'The Clear Eye',
    description: 'All 10 Cognition Bounds encountered',
    category: 'collection',
    target: 10,
    progressKey: 'channelCognition',
    check: (stats) => (stats.channelCompletion?.Cognition || 0) >= 10
  },
  channel_resonance: {
    key: 'channel_resonance',
    name: 'The Deep Listener',
    description: 'All 10 Resonance Bounds encountered',
    category: 'collection',
    target: 10,
    progressKey: 'channelResonance',
    check: (stats) => (stats.channelCompletion?.Resonance || 0) >= 10
  },
  channel_structure: {
    key: 'channel_structure',
    name: 'The Foundation',
    description: 'All 10 Structure Bounds encountered',
    category: 'collection',
    target: 10,
    progressKey: 'channelStructure',
    check: (stats) => (stats.channelCompletion?.Structure || 0) >= 10
  },

  // ── Mastery Badges ─────────────────────────────────────────────────
  all_four_statuses: {
    key: 'all_four_statuses',
    name: 'The Witness',
    description: 'Seen one signature in all 4 statuses',
    category: 'mastery',
    check: (stats) => stats.anySignatureAllStatuses
  },
  position_repeat_3: {
    key: 'position_repeat_3',
    name: 'The Echo',
    description: 'Same signature in the same position 3 times',
    category: 'mastery',
    check: (stats) => stats.maxSameSignaturePosition >= 3
  },
  position_repeat_5: {
    key: 'position_repeat_5',
    name: 'The Resonance Loop',
    description: 'Same signature in the same position 5 times',
    category: 'mastery',
    check: (stats) => stats.maxSameSignaturePosition >= 5
  },

  // ── Event Badges ───────────────────────────────────────────────────
  both_portals: {
    key: 'both_portals',
    name: 'The Threshold Keeper',
    description: 'Source and Creation appeared in the same reading',
    category: 'event',
    check: (stats) => stats.bothPortalsInOneReading
  },
  all_five_houses: {
    key: 'all_five_houses',
    name: 'The Parliament',
    description: 'All 5 Houses represented in a single reading',
    category: 'event',
    check: (stats) => stats.allHousesInOneReading
  },
  perfect_balance: {
    key: 'perfect_balance',
    name: 'The Still Point',
    description: 'All signatures Balanced in a 3+ card reading',
    category: 'event',
    check: (stats) => stats.perfectBalanceReading
  },

  // ── Milestone Badges ───────────────────────────────────────────────
  readings_10: {
    key: 'readings_10',
    name: 'The Initiate',
    description: '10 readings completed',
    category: 'milestone',
    target: 10,
    progressKey: 'totalReadings',
    check: (stats) => stats.totalReadings >= 10
  },
  readings_50: {
    key: 'readings_50',
    name: 'The Practitioner',
    description: '50 readings completed',
    category: 'milestone',
    target: 50,
    progressKey: 'totalReadings',
    check: (stats) => stats.totalReadings >= 50
  },
  readings_100: {
    key: 'readings_100',
    name: 'The Devoted',
    description: '100 readings completed',
    category: 'milestone',
    target: 100,
    progressKey: 'totalReadings',
    check: (stats) => stats.totalReadings >= 100
  },
  readings_500: {
    key: 'readings_500',
    name: 'The Sage',
    description: '500 readings completed',
    category: 'milestone',
    target: 500,
    progressKey: 'totalReadings',
    check: (stats) => stats.totalReadings >= 500
  }
};

/**
 * Check which badges are newly earned given stats and existing badge keys.
 * @param {object} stats - Output from buildBadgeStats()
 * @param {string[]} existingBadgeKeys - Already earned badge keys
 * @returns {object[]} Array of newly earned badge definitions
 */
export function checkForNewBadges(stats, existingBadgeKeys) {
  const newBadges = [];
  for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
    if (!existingBadgeKeys.includes(key) && badge.check(stats)) {
      newBadges.push(badge);
    }
  }
  return newBadges;
}

/**
 * Get progress for a specific badge.
 * @param {string} badgeKey
 * @param {object} stats
 * @returns {{ current: number, target: number, percent: number } | null}
 */
export function getBadgeProgress(badgeKey, stats) {
  const badge = BADGE_DEFINITIONS[badgeKey];
  if (!badge || !badge.target || !badge.progressKey) return null;

  let current = 0;
  if (badge.progressKey === 'channelIntent') current = stats.channelCompletion?.Intent || 0;
  else if (badge.progressKey === 'channelCognition') current = stats.channelCompletion?.Cognition || 0;
  else if (badge.progressKey === 'channelResonance') current = stats.channelCompletion?.Resonance || 0;
  else if (badge.progressKey === 'channelStructure') current = stats.channelCompletion?.Structure || 0;
  else current = stats[badge.progressKey] || 0;

  return {
    current: Math.min(current, badge.target),
    target: badge.target,
    percent: Math.round(Math.min(current / badge.target, 1) * 100)
  };
}

// All badge keys for iteration
export const ALL_BADGE_KEYS = Object.keys(BADGE_DEFINITIONS);
