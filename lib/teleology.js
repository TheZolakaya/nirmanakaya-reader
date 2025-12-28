// === TELEOLOGICAL PROFILES ===
// Imported from nirmanakaya_teleological_profiles.json
// 22 Archetypes with full teleological data for "Words to the Whys"

import teleologyData from '../nirmanakaya_teleological_profiles.json';

export const TELEOLOGY = teleologyData;
export const TELEOLOGY_META = teleologyData.meta;
export const TELEOLOGY_CONSTANTS = teleologyData.constants;
export const TELEOLOGY_ARCHETYPES = teleologyData.archetypes;

// Convenience exports for constants
export const PHASES = teleologyData.constants.phases;
export const RINGS = teleologyData.constants.rings;
export const HOUSES_TELEOLOGY = teleologyData.constants.houses;
export const FUNCTIONS = teleologyData.constants.functions;
export const PILLARS = teleologyData.constants.pillars;
export const STATUS_FRAMES = teleologyData.constants.status_frames;
export const INSTANT_RETURN = teleologyData.constants.instant_return;

// Get archetype teleological data by position (0-21)
export function getArchetypeTeleology(position) {
  if (position === null || position === undefined) return null;
  const posStr = position.toString();
  const archetype = teleologyData.archetypes[posStr];
  if (!archetype) return null;

  return {
    name: archetype.name,
    traditional: archetype.traditional,
    ...archetype.teleological,
    // Add resolved house data
    houseData: teleologyData.constants.houses[archetype.teleological.house],
    // Add status frame data
    statusFrames: teleologyData.constants.status_frames,
    // Add instant return
    instantReturn: teleologyData.constants.instant_return
  };
}

// Get retrieval route for an archetype in a specific status
export function getRetrievalRoute(position, status) {
  if (status === 'balanced') return null;
  if (position === null || position === undefined) return null;

  const posStr = position.toString();
  const archetype = teleologyData.archetypes[posStr];
  if (!archetype) return null;

  const statusKey = status.replace(' ', '_').toLowerCase();
  return archetype.teleological.retrieval_routes[statusKey] || null;
}

// Get status-specific message for an archetype
export function getStatusSpecific(position, status) {
  if (position === null || position === undefined) return null;
  const posStr = position.toString();
  const archetype = teleologyData.archetypes[posStr];
  if (!archetype) return null;

  const statusKey = status.replace(' ', '_').toLowerCase();
  return archetype.teleological.status_specific[statusKey] || null;
}
