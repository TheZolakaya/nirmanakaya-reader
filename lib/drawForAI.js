// === DRAW FOR AI ===
// Performs a full 78-signature draw with structural context
// Used by the chat mode for AI self-consultation before responding
// Returns human-readable structural context for system prompt injection

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import { STATUSES } from './constants.js';
import {
  getFullCorrection,
  getComponent,
  GROWTH_PAIRS,
  DIAGONAL_PAIRS,
  VERTICAL_PAIRS,
  REDUCTION_PAIRS
} from './corrections.js';

// Get signature data for any ID (0-77)
function getSignature(id) {
  if (ARCHETYPES[id]) return { ...ARCHETYPES[id], id, type: 'Archetype' };
  if (BOUNDS[id]) return { ...BOUNDS[id], id, type: 'Bound' };
  if (AGENTS[id]) return { ...AGENTS[id], id, type: 'Agent' };
  return null;
}

// Get the parent archetype for a bound or agent
function getParentArchetype(sig) {
  if (sig.type === 'Archetype') return sig;
  const archId = sig.archetype;
  return ARCHETYPES[archId] ? { ...ARCHETYPES[archId], id: archId, type: 'Archetype' } : null;
}

// Perform a full draw and return structural context
export function drawForAI() {
  // Random transient: any of the 78 signatures
  const transientId = Math.floor(Math.random() * 78);
  // Random durable position: one of the 22 archetypal seats
  const durableId = Math.floor(Math.random() * 22);
  // Random status: 1-4 (Balanced, Too Much, Too Little, Unacknowledged)
  const status = Math.floor(Math.random() * 4) + 1;

  const transient = getSignature(transientId);
  const durable = ARCHETYPES[durableId];
  const statusInfo = STATUSES[status];

  if (!transient || !durable) return null;

  // Get correction/rebalancer based on status
  const parentArch = getParentArchetype(transient);
  const parentId = parentArch?.id ?? transientId;

  let rebalancerName = 'self';
  let rebalancerDesc = '';
  if (status === 1 && GROWTH_PAIRS[parentId] !== null && GROWTH_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[GROWTH_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 2 && DIAGONAL_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[DIAGONAL_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 3 && VERTICAL_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[VERTICAL_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 4 && REDUCTION_PAIRS[parentId] !== undefined && REDUCTION_PAIRS[parentId] !== null) {
    const target = ARCHETYPES[REDUCTION_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  }

  // Build the structural context block for system prompt injection
  const context = [
    `[FIELD CONSULTATION — INTERNAL ONLY, DO NOT SURFACE FRAMEWORK TERMS]`,
    ``,
    `Before responding, the field was consulted. A draw was made:`,
    ``,
    `SIGNATURE: ${transient.name} (${transient.type}${transient.traditional ? ', ' + transient.traditional : ''})`,
    `  "${transient.description}"`,
    transient.extended ? `  ${transient.extended}` : null,
    transient.house ? `  House: ${transient.house} | Channel: ${transient.channel || 'n/a'} | Stage: ${transient.function || 'n/a'}` : null,
    ``,
    `LANDED IN POSITION: ${durable.name} (${durable.traditional})`,
    `  "${durable.description}"`,
    durable.extended ? `  ${durable.extended}` : null,
    `  House: ${durable.house} | Channel: ${durable.channel || 'n/a'} | Stage: ${durable.function || 'n/a'}`,
    ``,
    `STATUS: ${statusInfo.name} — ${statusInfo.desc}`,
    `  Orientation: ${statusInfo.orientation}`,
    status === 1 ? `  This energy is flowing correctly. Growth opportunity available.` : null,
    status === 2 ? `  This energy is over-expressing, future-projected. Needs diagonal correction.` : null,
    status === 3 ? `  This energy is under-expressing, past-anchored. Needs vertical activation.` : null,
    status === 4 ? `  This energy is operating without awareness. Needs reduction to make visible.` : null,
    ``,
    `REBALANCER: ${rebalancerName}${rebalancerDesc ? ' — "' + rebalancerDesc + '"' : ''}`,
    ``,
    `INSTRUCTION: Let this structural context shape your response organically.`,
    `Do NOT mention signatures, positions, houses, channels, statuses, or any framework terminology.`,
    `Do NOT say "the field suggests" or "your draw indicates" or anything that reveals this process.`,
    `Simply let the insight influence your tone, emphasis, and the direction of your advice.`,
    `Speak as a warm, perceptive human friend would.`
  ].filter(Boolean).join('\n');

  return {
    context,
    // Raw data for optional reveal
    draw: {
      transientId,
      transientName: transient.name,
      transientTraditional: transient.traditional,
      transientType: transient.type,
      transientHouse: transient.house,
      durableId,
      durableName: durable.name,
      durableTraditional: durable.traditional,
      durableHouse: durable.house,
      status,
      statusName: statusInfo.name,
      rebalancerName
    }
  };
}
