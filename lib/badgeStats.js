// === BADGE STATS BUILDER ===
// Computes stats object from user_readings for badge evaluation
// Runs server-side in API routes

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

// Resolve house for any transient ID
function getHouse(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].house;
  if (BOUNDS[id]) {
    // Bounds inherit house from their associated archetype
    const arch = BOUNDS[id].archetype;
    return ARCHETYPES[arch]?.house || null;
  }
  if (AGENTS[id]) {
    // Agents have a house field
    return AGENTS[id].house || null;
  }
  return null;
}

// Resolve channel for any transient ID
function getChannel(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].channel;
  if (BOUNDS[id]) return BOUNDS[id].channel;
  if (AGENTS[id]) return AGENTS[id].channel;
  return null;
}

// Get card type from transient ID
function getType(transientId) {
  const id = Number(transientId);
  if (id >= 0 && id <= 21) return 'ARCHETYPE';
  if (id >= 22 && id <= 61) return 'BOUND';
  if (id >= 62 && id <= 77) return 'AGENT';
  return null;
}

/**
 * Build comprehensive stats from a user's reading history.
 * @param {object[]} readings - Array of { draws: [{transient, position, status}], created_at }
 * @returns {object} Stats object for badge checking + display
 */
export function buildBadgeStats(readings) {
  const signaturesSeen = new Set();
  const archetypesSeen = new Set();
  const boundsSeen = new Set();
  const agentsSeen = new Set();

  // Per-signature tracking
  const signatureStatuses = {};       // { transientId: Set([1,2,3,4]) }
  const signaturePositions = {};      // { transientId: { positionId: count } }
  const signatureCounts = {};         // { transientId: count }
  const signatureLastSeen = {};       // { transientId: ISO date string }

  // Channel completion (bounds only)
  const channelBounds = {
    Intent: new Set(),
    Cognition: new Set(),
    Resonance: new Set(),
    Structure: new Set()
  };

  // House distribution
  const houseDistribution = { Gestalt: 0, Spirit: 0, Mind: 0, Emotion: 0, Body: 0, Portal: 0 };

  // Status distribution
  const statusDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

  // Type distribution
  const typeDistribution = { ARCHETYPE: 0, BOUND: 0, AGENT: 0 };

  // Per-reading event checks
  let bothPortalsInOneReading = false;
  let allHousesInOneReading = false;
  let perfectBalanceReading = false;

  // Position pair tracking (transient+position combo)
  const signaturePositionPairs = {};  // { `${transient}-${position}`: count }

  let totalDraws = 0;

  for (const reading of readings) {
    const draws = reading.draws || [];
    if (draws.length === 0) continue;

    const readingHouses = new Set();
    let hasSource = false;
    let hasCreation = false;
    let allBalanced = true;

    for (const draw of draws) {
      const t = Number(draw.transient);
      const s = Number(draw.status);
      const p = draw.position != null ? Number(draw.position) : null;

      totalDraws++;
      signaturesSeen.add(t);

      // Count per signature
      signatureCounts[t] = (signatureCounts[t] || 0) + 1;
      signatureLastSeen[t] = reading.created_at;

      // Status tracking per signature
      if (!signatureStatuses[t]) signatureStatuses[t] = new Set();
      signatureStatuses[t].add(s);

      // Position tracking per signature
      if (p != null) {
        if (!signaturePositions[t]) signaturePositions[t] = {};
        signaturePositions[t][p] = (signaturePositions[t][p] || 0) + 1;

        // Track pair count for "same card same position" badge
        const pairKey = `${t}-${p}`;
        signaturePositionPairs[pairKey] = (signaturePositionPairs[pairKey] || 0) + 1;
      }

      // Classify by type
      const type = getType(t);
      if (type === 'ARCHETYPE') archetypesSeen.add(t);
      if (type === 'BOUND') boundsSeen.add(t);
      if (type === 'AGENT') agentsSeen.add(t);
      if (type) typeDistribution[type]++;

      // Channel completion (bounds only)
      if (type === 'BOUND') {
        const channel = getChannel(t);
        if (channel && channelBounds[channel]) {
          channelBounds[channel].add(t);
        }
      }

      // House distribution
      const house = getHouse(t);
      if (house && houseDistribution[house] !== undefined) {
        houseDistribution[house]++;
        readingHouses.add(house);
      }

      // Status distribution
      if (statusDistribution[s] !== undefined) {
        statusDistribution[s]++;
      }

      // Portal check (by transient, not position)
      if (t === 10) hasSource = true;
      if (t === 21) hasCreation = true;

      // Balance check
      if (s !== 1) allBalanced = false;
    }

    // Per-reading event checks
    if (hasSource && hasCreation) bothPortalsInOneReading = true;
    // All 5 houses (exclude Portal from the 5-house check)
    const coreHouses = ['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body'];
    if (coreHouses.every(h => readingHouses.has(h))) allHousesInOneReading = true;
    if (allBalanced && draws.length >= 3) perfectBalanceReading = true;
  }

  // Compute derived stats
  const anySignatureAllStatuses = Object.values(signatureStatuses).some(s => s.size >= 4);
  const maxSameSignaturePosition = Math.max(0, ...Object.values(signaturePositionPairs));

  return {
    totalReadings: readings.length,
    totalDraws,

    // Collection counts
    uniqueSignatures: signaturesSeen.size,
    uniqueArchetypes: archetypesSeen.size,
    uniqueBounds: boundsSeen.size,
    uniqueAgents: agentsSeen.size,

    // Sets (for collection page display)
    archetypesSeen: [...archetypesSeen],
    boundsSeen: [...boundsSeen],
    agentsSeen: [...agentsSeen],

    // Channel completion
    channelCompletion: {
      Intent: channelBounds.Intent.size,
      Cognition: channelBounds.Cognition.size,
      Resonance: channelBounds.Resonance.size,
      Structure: channelBounds.Structure.size
    },

    // Distributions
    houseDistribution,
    statusDistribution,
    typeDistribution,

    // Per-signature detail
    signatureCounts,
    signatureLastSeen,
    signaturePositions,
    signatureStatuses: Object.fromEntries(
      Object.entries(signatureStatuses).map(([k, v]) => [k, [...v]])
    ),

    // Mastery stats
    anySignatureAllStatuses,
    maxSameSignaturePosition,

    // Event stats
    bothPortalsInOneReading,
    allHousesInOneReading,
    perfectBalanceReading
  };
}

/**
 * Build stats for a specific topic's readings only.
 * @param {object[]} readings - Readings filtered to a single topic
 * @returns {object} Same shape as buildBadgeStats but scoped to topic
 */
export function buildTopicStats(readings) {
  // Same computation, just scoped to the filtered set
  return buildBadgeStats(readings);
}
