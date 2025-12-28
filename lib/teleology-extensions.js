// === TELEOLOGICAL EXTENSIONS ===
// Imported from nirmanakaya_bounds_agents_extension.json
// 40 Bounds + 16 Agents teleological data

import extensionsData from '../nirmanakaya_bounds_agents_extension.json';

export const TELEOLOGY_EXTENSIONS = extensionsData;
export const EXTENSIONS_META = extensionsData.meta;

// Core exports
export const NUMBER_MODES = extensionsData.number_modes;
export const CHANNELS_TELEOLOGY = extensionsData.channels;
export const POLARITY_MEANINGS = extensionsData.polarity_meanings;
export const BOUNDS_TELEOLOGY = extensionsData.bounds;
export const ROLES_TELEOLOGY = extensionsData.roles;
export const AGENTS_TELEOLOGY = extensionsData.agents;
export const BOUND_CORRECTION_RULES = extensionsData.bound_correction_rules;
export const AGENT_STATUS_MEANINGS = extensionsData.agent_status_meanings;

// === BOUND UTILITIES ===

// Get channel from position (22-61)
export function getChannelFromPosition(position) {
  if (position >= 22 && position <= 31) return 'intent';
  if (position >= 32 && position <= 41) return 'cognition';
  if (position >= 42 && position <= 51) return 'resonance';
  if (position >= 52 && position <= 61) return 'structure';
  return null;
}

// Get number from position (22-61) -> 1-10
export function getNumberFromPosition(position) {
  const offset = position >= 52 ? 52 : position >= 42 ? 42 : position >= 32 ? 32 : 22;
  return (position - offset) + 1;
}

// Get bound teleological data by position (22-61)
export function getBoundTeleology(position) {
  if (position === null || position === undefined) return null;
  const channel = getChannelFromPosition(position);
  const number = getNumberFromPosition(position);
  if (!channel || number === null || number === undefined) return null;

  const bound = extensionsData.bounds[channel]?.[number.toString()];
  if (!bound) return null;

  const numberMode = extensionsData.number_modes[number.toString()];
  const polarity = extensionsData.polarity_meanings[bound.polarity];

  return {
    ...bound,
    channel,
    numberMode,
    polarityData: polarity,
    channelData: extensionsData.channels[channel]
  };
}

// Calculate bound correction
export function calculateBoundCorrection(number, channel, status) {
  if (status === 'balanced') return null;
  if (number === null || number === undefined) return null;
  if (!extensionsData.bound_correction_rules) return null;

  // Number mirrors: n → 11-n
  const mirrorNumber = 11 - number;

  // Channel crosses based on status
  const statusKey = status.replace(' ', '_').toLowerCase();
  const crossingRules = extensionsData.bound_correction_rules.channel_crossing?.[statusKey];
  if (!crossingRules) return null;

  const correctionChannel = crossingRules[channel];
  if (!correctionChannel) return null;

  // Look up the correction bound
  const correctionBound = extensionsData.bounds[correctionChannel]?.[mirrorNumber.toString()];

  return {
    number: mirrorNumber,
    channel: correctionChannel,
    bound: correctionBound
  };
}

// === AGENT UTILITIES ===

// Get agent channel from position (62-77)
export function getAgentChannelFromPosition(position) {
  if (position >= 62 && position <= 65) return 'intent';
  if (position >= 66 && position <= 69) return 'cognition';
  if (position >= 70 && position <= 73) return 'resonance';
  if (position >= 74 && position <= 77) return 'structure';
  return null;
}

// Get agent role from position (62-77)
export function getAgentRoleFromPosition(position) {
  const roles = ['initiate', 'catalyst', 'steward', 'executor'];
  const offset = position >= 74 ? 74 : position >= 70 ? 70 : position >= 66 ? 66 : 62;
  return roles[position - offset];
}

// Get agent teleological data by position (62-77)
export function getAgentTeleology(position) {
  const channel = getAgentChannelFromPosition(position);
  const role = getAgentRoleFromPosition(position);
  if (!channel || !role) return null;

  const agent = extensionsData.agents[channel]?.[role];
  if (!agent) return null;

  const roleData = extensionsData.roles[role];

  return {
    ...agent,
    channel,
    role,
    roleData,
    channelData: extensionsData.channels[channel],
    statusMeanings: extensionsData.agent_status_meanings
  };
}
