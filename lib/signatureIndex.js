// === SIGNATURE INDEX: Pre-computed flat data for all 78 signatures ===
// Built once on import. Every derivable field pre-resolved.
// The computation harness (mapAnalysis.js) indexes into this — no runtime chain-chasing.
//
// For each signature: identity, structural position, parent archetype (with inherited states),
// all 4 correction targets resolved to concrete IDs/names, and trace resolution target.

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import {
  GOVERNANCE_MAP, INNER_OUTER_HORIZON, WHEEL_WORLD_ASSOCIATION,
  BOUND_NUMBER_PROPERTIES, ROLE_PROPERTIES, HOUSES
} from './constants.js';
import {
  GROWTH_PAIRS, DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS,
  getFullCorrection, getComponent, getCorrectionTargetId
} from './corrections.js';

// === CHANNEL → ELEMENT MAPPING ===
const CHANNEL_ELEMENT = {
  Intent: 'Fire',
  Cognition: 'Air',
  Resonance: 'Water',
  Structure: 'Earth'
};

// === BUILD POSITION INDEX (22 entries) ===
// Everything knowable about an archetype position on the map
function buildPositionIndex() {
  const index = {};
  for (let pos = 0; pos <= 21; pos++) {
    const arch = ARCHETYPES[pos];
    if (!arch) continue;

    // Find which house this position governs (if any)
    let governs = null;
    for (const [govId, gov] of Object.entries(GOVERNANCE_MAP)) {
      if (parseInt(govId) === pos) {
        governs = gov.house;
        break;
      }
    }

    // Find this position's governor
    let governorId = null;
    let governorName = null;
    const posHouse = arch.house;
    for (const [govId, gov] of Object.entries(GOVERNANCE_MAP)) {
      if (gov.house === posHouse) {
        governorId = parseInt(govId);
        governorName = ARCHETYPES[governorId]?.name || null;
        break;
      }
    }

    index[pos] = {
      id: pos,
      name: arch.name,
      traditional: arch.traditional,
      house: arch.house,
      channel: arch.channel,
      element: arch.channel ? CHANNEL_ELEMENT[arch.channel] : null,
      function: arch.function,
      horizon: INNER_OUTER_HORIZON[pos],
      wheelWorld: WHEEL_WORLD_ASSOCIATION[pos],
      governorId,
      governorName,
      governs,  // which house this position governs (if any)
      diagonalPartnerId: DIAGONAL_PAIRS[pos],
      verticalPartnerId: VERTICAL_PAIRS[pos],
      reductionPartnerId: REDUCTION_PAIRS[pos],
      growthPartnerId: GROWTH_PAIRS[pos],
      states: arch.states || null,
      description: arch.description,
      extended: arch.extended
    };
  }
  return index;
}

// === BUILD SIGNATURE INDEX (78 entries) ===
// Every signature fully flattened with parent resolution and all corrections pre-computed
function buildSignatureIndex() {
  const index = {};

  // --- Archetypes (0-21) ---
  for (let id = 0; id <= 21; id++) {
    const arch = ARCHETYPES[id];
    if (!arch) continue;

    const corrections = resolveCorrections(id);

    index[id] = {
      // Identity
      id,
      type: 'Archetype',
      name: arch.name,
      traditional: arch.traditional,

      // Channel / Element
      channel: arch.channel,
      element: arch.channel ? CHANNEL_ELEMENT[arch.channel] : null,

      // Structural position
      house: arch.house,
      function: arch.function,
      horizon: INNER_OUTER_HORIZON[id],
      wheelWorld: WHEEL_WORLD_ASSOCIATION[id],

      // Parent (self for archetypes)
      parentArchetypeId: id,
      parentArchetypeName: arch.name,
      parentTraditional: arch.traditional,
      parentHouse: arch.house,
      parentChannel: arch.channel,
      parentFunction: arch.function,
      resolvedPosition: id,  // trace target = self

      // States (own states for archetypes)
      states: arch.states || null,

      // Bound-specific (null for archetypes)
      number: null,
      numberKeyword: null,
      numberHouse: null,
      numberSpan: null,
      scale: null,

      // Agent-specific (null for archetypes)
      role: null,
      domain: null,
      nickname: null,
      boundNumbers: null,

      // Corrections (all 4 pre-resolved)
      corrections,

      // Description
      description: arch.description,
      extended: arch.extended
    };
  }

  // --- Bounds (22-61) ---
  for (const [idStr, bound] of Object.entries(BOUNDS)) {
    const id = parseInt(idStr);
    const parentArch = ARCHETYPES[bound.archetype];
    const numberProps = BOUND_NUMBER_PROPERTIES[bound.number];
    const corrections = resolveCorrections(id);

    index[id] = {
      // Identity
      id,
      type: 'Bound',
      name: bound.name,
      traditional: bound.traditional,

      // Channel / Element
      channel: bound.channel,
      element: bound.channel ? CHANNEL_ELEMENT[bound.channel] : null,

      // Structural position
      house: bound.house,
      function: bound.function,
      horizon: bound.horizon,
      wheelWorld: bound.wheelWorld,
      scale: bound.scale,

      // Parent archetype
      parentArchetypeId: bound.archetype,
      parentArchetypeName: parentArch?.name || null,
      parentTraditional: parentArch?.traditional || null,
      parentHouse: parentArch?.house || null,
      parentChannel: parentArch?.channel || null,
      parentFunction: parentArch?.function || null,
      resolvedPosition: bound.archetype,  // trace target = parent archetype

      // States (inherited from parent archetype)
      states: parentArch?.states || null,

      // Bound-specific
      number: bound.number,
      numberKeyword: bound.numberKeyword,
      numberHouse: bound.numberHouse,
      numberSpan: numberProps?.span ?? null,
      // scale already set above

      // Agent-specific (null for bounds)
      role: null,
      domain: null,
      nickname: null,
      boundNumbers: null,

      // Corrections (all 4 pre-resolved)
      corrections,

      // Description
      description: bound.description,
      extended: bound.extended
    };
  }

  // --- Agents (62-77) ---
  for (const [idStr, agent] of Object.entries(AGENTS)) {
    const id = parseInt(idStr);
    const parentArch = ARCHETYPES[agent.archetype];
    const corrections = resolveCorrections(id);

    index[id] = {
      // Identity
      id,
      type: 'Agent',
      name: agent.name,
      traditional: agent.traditional,

      // Channel / Element
      channel: agent.channel,
      element: agent.channel ? CHANNEL_ELEMENT[agent.channel] : null,

      // Structural position
      house: agent.house,
      function: agent.function,
      horizon: agent.horizon,
      wheelWorld: agent.wheelWorld,

      // Parent archetype
      parentArchetypeId: agent.archetype,
      parentArchetypeName: parentArch?.name || null,
      parentTraditional: parentArch?.traditional || null,
      parentHouse: parentArch?.house || null,
      parentChannel: parentArch?.channel || null,
      parentFunction: parentArch?.function || null,
      resolvedPosition: agent.archetype,  // trace target = parent archetype

      // States (inherited from parent archetype)
      states: parentArch?.states || null,

      // Bound-specific (null for agents)
      number: null,
      numberKeyword: null,
      numberHouse: null,
      numberSpan: null,
      scale: null,

      // Agent-specific
      role: agent.role,
      domain: agent.domain,
      nickname: agent.nickname,
      boundNumbers: agent.boundNumbers,

      // Corrections (all 4 pre-resolved)
      corrections,

      // Description
      description: agent.description,
      extended: agent.extended
    };
  }

  return index;
}

// === RESOLVE ALL 4 CORRECTIONS FOR A SIGNATURE ===
function resolveCorrections(signatureId) {
  const result = {};
  const statusNames = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
  const correctionTypes = { 1: 'growth', 2: 'diagonal', 3: 'vertical', 4: 'reduction' };

  for (let status = 1; status <= 4; status++) {
    const comp = getComponent(signatureId);
    const correction = getFullCorrection(signatureId, status);
    const targetId = correction ? getCorrectionTargetId(correction, comp) : null;

    let targetName = null;
    let targetType = null;
    let targetTraditional = null;
    if (targetId !== null && targetId !== undefined) {
      const targetComp = getComponent(targetId);
      targetName = targetComp?.name || null;
      targetType = targetComp?.type || null;
      targetTraditional = targetComp?.traditional || null;
    }

    result[statusNames[status]] = {
      correctionType: correction?.type || correctionTypes[status],
      targetId: targetId ?? signatureId,
      targetName: targetName || getComponent(signatureId)?.name || null,
      targetType: targetType || getComponent(signatureId)?.type || null,
      targetTraditional: targetTraditional || null,
      isSelf: correction?.isSelf ?? false
    };
  }

  return result;
}

// === BUILD THE INDEXES ===
export const POSITION_INDEX = buildPositionIndex();
export const SIGNATURE_INDEX = buildSignatureIndex();

// === CONVENIENCE LOOKUPS ===

// Get flattened signature data by ID
export function getSignature(id) {
  return SIGNATURE_INDEX[id] || null;
}

// Get flattened position data by position (0-21)
export function getPosition(pos) {
  return POSITION_INDEX[pos] || null;
}

// Get the trace resolution target for a signature
// (self for archetypes, parent archetype for minors)
export function getTraceTarget(signatureId) {
  const sig = SIGNATURE_INDEX[signatureId];
  return sig ? sig.resolvedPosition : null;
}

// Get the state portrait for a signature at a given status
export function getStatePortrait(signatureId, status) {
  const sig = SIGNATURE_INDEX[signatureId];
  if (!sig?.states) return null;
  const statusKey = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' }[status];
  return sig.states[statusKey] || null;
}

// Get pre-resolved correction for a signature at a given status
export function getPreResolvedCorrection(signatureId, status) {
  const sig = SIGNATURE_INDEX[signatureId];
  if (!sig?.corrections) return null;
  const statusKey = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' }[status];
  return sig.corrections[statusKey] || null;
}

// Compute significance flags for a position×transient pair
export function getSignificanceFlags(positionId, transientId) {
  const pos = POSITION_INDEX[positionId];
  const sig = SIGNATURE_INDEX[transientId];
  if (!pos || !sig) return null;

  return {
    isSelfHome: transientId === positionId,
    isParentHome: sig.resolvedPosition === positionId,
    isPortalAsTransient: transientId === 10 || transientId === 21,
    isMajorAsTransient: transientId < 22,
    isBoundAsTransient: transientId >= 22 && transientId <= 61,
    isAgentAsTransient: transientId >= 62 && transientId <= 77,
    sameHouse: sig.house === pos.house,
    sameChannel: sig.channel !== null && sig.channel === pos.channel,
    isGovernorPosition: pos.governs !== null
  };
}
