// === CORRECTION LOGIC ===
// CANONICAL CORRECTION LOOKUP TABLES
// Source: lib/CANONICAL_78_CORRECTIONS.md
// DO NOT USE FORMULAS - these are authoritative lookup values

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

// GROWTH_PAIRS (Balanced state - growth opportunity)
// Transpose pairs for off-diagonal, Polarity pairs for diagonal
// null means self-reference (Gestalt/Portal archetypes)
export const GROWTH_PAIRS = {
  0: null,   // Potential → self (Gestalt)
  1: null,   // Will → self (Gestalt)
  2: 4,      // Wisdom → Order (Transpose)
  3: 12,     // Nurturing → Sacrifice (Transpose)
  4: 2,      // Order → Wisdom (Transpose)
  5: 14,     // Culture → Balance (Transpose)
  6: 15,     // Compassion → Abstraction (Polarity)
  7: 18,     // Drive → Imagination (Transpose)
  8: 17,     // Fortitude → Inspiration (Polarity)
  9: 16,     // Discipline → Breakthrough (Transpose)
  10: null,  // Source → self (Portal)
  11: 13,    // Equity → Change (Transpose)
  12: 3,     // Sacrifice → Nurturing (Transpose)
  13: 11,    // Change → Equity (Transpose)
  14: 5,     // Balance → Culture (Transpose)
  15: 6,     // Abstraction → Compassion (Polarity)
  16: 9,     // Breakthrough → Discipline (Transpose)
  17: 8,     // Inspiration → Fortitude (Polarity)
  18: 7,     // Imagination → Drive (Transpose)
  19: null,  // Actualization → self (Gestalt)
  20: null,  // Awareness → self (Gestalt)
  21: null   // Creation → self (Portal)
};

// Build ARCHETYPE_BOUNDS dynamically from BOUNDS data
// Maps archetype ID to { inner: boundId, outer: boundId }
function buildArchetypeBoundsMap() {
  const mapping = {};
  for (const [id, bound] of Object.entries(BOUNDS)) {
    const arch = bound.archetype;
    if (!mapping[arch]) mapping[arch] = {};
    // Inner: Ace-5 (numbers 1-5), Outer: 6-10
    const polarity = bound.number <= 5 ? 'inner' : 'outer';
    mapping[arch][polarity] = parseInt(id);
  }
  return mapping;
}
const ARCHETYPE_BOUNDS = buildArchetypeBoundsMap();

// CANONICAL BOUND GROWTH - Direct lookup from B20 BUG FIX spec
// Maps balanced Bound ID to growth target Bound ID
// Self-references (null) for Gestalt/Portal bounds (Aces and 10s)
// B20 FIX: Corrected 5 values (24, 25, 28, 29, 38) per canonical derivation
const BOUND_GROWTH_TARGETS = {
  // WANDS
  22: null,  // Ace of Wands → self (Potential/Gestalt)
  23: 57,    // 2 of Wands → 6 of Pentacles (Support)
  24: 40,    // 3 of Wands → 9 of Swords (Plurality) — B20 FIX: was 39
  25: 50,    // 4 of Wands → 9 of Cups (Fulfillment) — B20 FIX: was 48
  26: 60,    // 5 of Wands → 9 of Pentacles (Flourishing)
  27: 53,    // 6 of Wands → 2 of Pentacles (Flow)
  28: 44,    // 7 of Wands (Resolve) → 3 of Cups (Celebration) — B20 FIX: was 45
  29: 33,    // 8 of Wands → 2 of Swords (Reflection) — B20 FIX: was 34
  30: 56,    // 9 of Wands → 5 of Pentacles (Steadfastness)
  31: null,  // 10 of Wands → self (Potential/Gestalt)
  // SWORDS
  32: null,  // Ace of Swords → self (Actualization/Gestalt)
  33: 29,    // 2 of Swords → 8 of Wands (Command)
  34: 48,    // 3 of Swords → 7 of Cups (Allure)
  35: 49,    // 4 of Swords → 8 of Cups (Passage)
  36: 59,    // 5 of Swords → 8 of Pentacles (Commitment)
  37: 54,    // 6 of Swords → 3 of Pentacles (Formation)
  38: 46,    // 7 of Swords → 5 of Cups (Reckoning) — B20 FIX: was 44
  39: 45,    // 8 of Swords → 4 of Cups (Reverie)
  40: 24,    // 9 of Swords → 3 of Wands (Assertion)
  41: null,  // 10 of Swords → self (Actualization/Gestalt)
  // CUPS
  42: null,  // Ace of Cups → self (Awareness/Gestalt)
  43: 28,    // 2 of Cups → 7 of Wands (Resolve)
  44: 38,    // 3 of Cups → 7 of Swords (Reconciliation)
  45: 39,    // 4 of Cups → 8 of Swords (Immersion)
  46: 58,    // 5 of Cups → 7 of Pentacles (Harvest)
  47: 55,    // 6 of Cups → 4 of Pentacles (Preservation)
  48: 34,    // 7 of Cups → 3 of Swords (Calculation)
  49: 35,    // 8 of Cups → 4 of Swords (Repose)
  50: 25,    // 9 of Cups → 4 of Wands (Alignment)
  51: null,  // 10 of Cups → self (Awareness/Gestalt)
  // PENTACLES
  52: null,  // Ace of Pentacles → self (Will/Gestalt)
  53: 27,    // 2 of Pentacles → 6 of Wands (Recognition)
  54: 37,    // 3 of Pentacles → 6 of Swords (Guidance)
  55: 47,    // 4 of Pentacles → 6 of Cups (Reciprocity)
  56: 30,    // 5 of Pentacles → 9 of Wands (Resilience)
  57: 23,    // 6 of Pentacles → 2 of Wands (Orientation)
  58: 46,    // 7 of Pentacles → 5 of Cups (Reckoning)
  59: 36,    // 8 of Pentacles → 5 of Swords (Discernment)
  60: 26,    // 9 of Pentacles → 5 of Wands (Dedication)
  61: null   // 10 of Pentacles → self (Will/Gestalt)
};

// CANONICAL AGENT GROWTH - Direct lookup from B20 BUG FIX spec
// Maps balanced Agent ID to growth target Agent ID
// Agents follow archetype's growth partner (no polarity flip for agents)
const AGENT_GROWTH_TARGETS = {
  62: 77,    // Page of Wands (Inspiration) → King of Pentacles (Fortitude)
  63: 66,    // Knight of Wands (Order) → Page of Swords (Wisdom)
  64: 70,    // Queen of Wands (Drive) → Page of Cups (Imagination)
  65: 74,    // King of Wands (Sacrifice) → Page of Pentacles (Nurturing)
  66: 63,    // Page of Swords (Wisdom) → Knight of Wands (Order)
  67: 72,    // Knight of Swords (Abstraction) → Queen of Cups (Compassion)
  68: 71,    // Queen of Swords (Balance) → Knight of Cups (Culture)
  69: 75,    // King of Swords (Discipline) → Knight of Pentacles (Breakthrough)
  70: 64,    // Page of Cups (Imagination) → Queen of Wands (Drive)
  71: 68,    // Knight of Cups (Culture) → Queen of Swords (Balance)
  72: 67,    // Queen of Cups (Compassion) → Knight of Swords (Abstraction)
  73: 76,    // King of Cups (Equity) → Queen of Pentacles (Change)
  74: 65,    // Page of Pentacles (Nurturing) → King of Wands (Sacrifice)
  75: 69,    // Knight of Pentacles (Breakthrough) → King of Swords (Discipline)
  76: 73,    // Queen of Pentacles (Change) → King of Cups (Equity)
  77: 62     // King of Pentacles (Fortitude) → Page of Wands (Inspiration)
};

// Build ARCHETYPE_AGENTS dynamically from AGENTS data
// Maps archetype ID to { inner: agentId|undefined, outer: agentId|undefined }
function buildArchetypeAgentsMap() {
  const mapping = {};
  for (const [id, agent] of Object.entries(AGENTS)) {
    const arch = agent.archetype;
    if (!mapping[arch]) mapping[arch] = {};
    // Inner: Initiate (Page), Catalyst (Knight)
    // Outer: Steward (Queen), Executor (King)
    const polarity = ['Initiate', 'Catalyst'].includes(agent.role) ? 'inner' : 'outer';
    mapping[arch][polarity] = parseInt(id);
  }
  return mapping;
}
const ARCHETYPE_AGENTS = buildArchetypeAgentsMap();

// DIAGONAL_PAIRS (Too Much correction)
export const DIAGONAL_PAIRS = {
  0: 19,   // Potential → Actualization
  1: 20,   // Will → Awareness
  2: 17,   // Wisdom → Inspiration
  3: 18,   // Nurturing → Imagination
  4: 15,   // Order → Abstraction
  5: 16,   // Culture → Breakthrough
  6: 13,   // Compassion → Change
  7: 14,   // Drive → Balance
  8: 11,   // Fortitude → Equity
  9: 12,   // Discipline → Sacrifice
  10: 1,   // Source (Portal) → Will
  11: 8,   // Equity → Fortitude
  12: 9,   // Sacrifice → Discipline
  13: 6,   // Change → Compassion
  14: 7,   // Balance → Drive
  15: 4,   // Abstraction → Order
  16: 5,   // Breakthrough → Culture
  17: 2,   // Inspiration → Wisdom
  18: 3,   // Imagination → Nurturing
  19: 0,   // Actualization → Potential
  20: 1,   // Awareness → Will
  21: 0    // Creation (Portal) → Potential
};

// VERTICAL_PAIRS (Too Little correction)
export const VERTICAL_PAIRS = {
  0: 20,   // Potential → Awareness
  1: 19,   // Will → Actualization
  2: 18,   // Wisdom → Imagination
  3: 17,   // Nurturing → Inspiration
  4: 16,   // Order → Breakthrough
  5: 15,   // Culture → Abstraction
  6: 14,   // Compassion → Balance
  7: 13,   // Drive → Change
  8: 12,   // Fortitude → Sacrifice
  9: 11,   // Discipline → Equity
  10: 19,  // Source (Portal) → Actualization
  11: 9,   // Equity → Discipline
  12: 8,   // Sacrifice → Fortitude
  13: 7,   // Change → Drive
  14: 6,   // Balance → Compassion
  15: 5,   // Abstraction → Culture
  16: 4,   // Breakthrough → Order
  17: 3,   // Inspiration → Nurturing
  18: 2,   // Imagination → Wisdom
  19: 1,   // Actualization → Will
  20: 0,   // Awareness → Potential
  21: 20   // Creation (Portal) → Awareness
};

// REDUCTION_PAIRS (Unacknowledged correction)
// null means no reduction pair exists for that position
export const REDUCTION_PAIRS = {
  0: null,  // Potential - no reduction
  1: null,  // Will - no reduction
  2: 11,    // Wisdom → Equity
  3: 12,    // Nurturing → Sacrifice
  4: 13,    // Order → Change
  5: 14,    // Culture → Balance
  6: 15,    // Compassion → Abstraction
  7: 16,    // Drive → Breakthrough
  8: 17,    // Fortitude → Inspiration
  9: 18,    // Discipline → Imagination
  10: null, // Source (Portal) - no reduction
  11: 2,    // Equity → Wisdom
  12: 3,    // Sacrifice → Nurturing
  13: 4,    // Change → Order
  14: 5,    // Balance → Culture
  15: 6,    // Abstraction → Compassion
  16: 7,    // Breakthrough → Drive
  17: 8,    // Inspiration → Fortitude
  18: 9,    // Imagination → Discipline
  19: null, // Actualization - no reduction
  20: null, // Awareness - no reduction
  21: null  // Creation (Portal) - no reduction
};

// Simple lookup-based correction - NO FORMULAS
// Every signature in every state points somewhere (no nulls)
export function getArchetypeCorrection(transientPosition, status) {
  if (status === 1) {
    // Balanced → Growth partner (or self if null)
    const growthTarget = GROWTH_PAIRS[transientPosition];
    if (growthTarget === null) {
      // Self-reference for Gestalt/Portal archetypes
      return { type: "growth", target: transientPosition, isSelf: true };
    }
    return { type: "growth", target: growthTarget, isSelf: false };
  }

  if (status === 2) {
    // Too Much → Diagonal partner
    const target = DIAGONAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "diagonal", target, isSelf: false } : null;
  }

  if (status === 3) {
    // Too Little → Vertical partner
    const target = VERTICAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "vertical", target, isSelf: false } : null;
  }

  if (status === 4) {
    // Unacknowledged → Reduction pair (or self if null)
    const target = REDUCTION_PAIRS[transientPosition];
    if (target === null) {
      // Self-reference for archetypes without reduction pairs
      return { type: "reduction", target: transientPosition, isSelf: true };
    }
    return { type: "reduction", target, isSelf: false };
  }

  return null;
}

// Get all Bounds and Agents that express/embody a given Archetype
export function getAssociatedCards(archetypeId) {
  const bounds = Object.entries(BOUNDS)
    .filter(([_, b]) => b.archetype === archetypeId)
    .map(([id, b]) => ({ id: parseInt(id), ...b, type: 'Bound' }));
  const agents = Object.entries(AGENTS)
    .filter(([_, a]) => a.archetype === archetypeId)
    .map(([id, a]) => ({ id: parseInt(id), ...a, type: 'Agent' }));
  return { bounds, agents };
}

// Bound correction follows archetype path with polarity flip
// Example: Too Little 6 of Wands (Sacrifice) → 5 of Pentacles (Fortitude)
// For BALANCED bounds: Use canonical lookup table (BOUND_GROWTH_TARGETS)
export function getBoundCorrection(bound, status) {
  // For BALANCED status, use canonical lookup table directly
  // This ensures correct growth targets without relying on dynamic calculation
  if (status === 1) {
    const growthTargetId = BOUND_GROWTH_TARGETS[bound.id];

    if (growthTargetId === null) {
      // Self-reference for Gestalt/Portal bounds (Aces and 10s)
      return {
        type: "growth",
        targetId: bound.id,
        targetBound: bound,
        isSelf: true
      };
    }

    if (growthTargetId !== undefined) {
      const targetBound = BOUNDS[growthTargetId];
      return {
        type: "growth",
        targetId: growthTargetId,
        targetBound: targetBound,
        isSelf: false
      };
    }
    // Fallback to dynamic calculation if not in canonical table
  }

  // For imbalanced states (status !== 1), use dynamic calculation
  // 1. Get the Bound's associated Archetype
  const archetypeId = bound.archetype;

  // 2. Get the Archetype's correction partner
  const archetypeCorrection = getArchetypeCorrection(archetypeId, status);
  if (!archetypeCorrection) return null;

  const targetArchetypeId = archetypeCorrection.target;

  // 3. Determine current polarity and flip it
  // Inner: numbers 1-5 (Ace through 5), Outer: numbers 6-10
  const isInner = bound.number <= 5;
  const targetPolarity = isInner ? 'outer' : 'inner';

  // 4. Get the corresponding Bound from target Archetype
  const targetBoundMapping = ARCHETYPE_BOUNDS[targetArchetypeId];
  if (!targetBoundMapping) {
    // Self-reference if no mapping exists
    return {
      type: archetypeCorrection.type,
      targetId: bound.id,
      targetBound: bound,
      isSelf: true
    };
  }

  const targetBoundId = targetBoundMapping[targetPolarity];
  if (!targetBoundId) {
    // Self-reference if no target exists at that polarity
    return {
      type: archetypeCorrection.type,
      targetId: bound.id,
      targetBound: bound,
      isSelf: true
    };
  }

  const targetBound = BOUNDS[targetBoundId];
  return {
    type: archetypeCorrection.type,
    targetId: targetBoundId,
    targetBound: targetBound,
    isSelf: false
  };
}

// Build CHANNEL_AGENTS mapping: { channel: { role: agentId } }
// Maps channel + role to specific agent ID
function buildChannelAgentsMap() {
  const mapping = {};
  for (const [id, agent] of Object.entries(AGENTS)) {
    const channel = agent.channel;
    if (!mapping[channel]) mapping[channel] = {};
    mapping[channel][agent.role] = parseInt(id);
  }
  return mapping;
}
const CHANNEL_AGENTS = buildChannelAgentsMap();

// Role flip mapping:
// Initiate (Page) ↔ Executor (King)
// Catalyst (Knight) ↔ Steward (Queen)
const ROLE_FLIP = {
  'Initiate': 'Executor',   // Page → King
  'Catalyst': 'Steward',    // Knight → Queen
  'Steward': 'Catalyst',    // Queen → Knight
  'Executor': 'Initiate'    // King → Page
};

// Agent correction follows archetype path
// For BALANCED: Use canonical lookup table (AGENT_GROWTH_TARGETS)
// For IMBALANCED: Use dynamic calculation with channel crossing + role flip
// B20 FIX: Added canonical lookup for balanced agents
export function getAgentCorrection(agent, status) {
  // For BALANCED status, use canonical lookup table directly
  // This ensures correct growth targets per B20 spec
  if (status === 1) {
    const growthTargetId = AGENT_GROWTH_TARGETS[agent.id];

    if (growthTargetId !== undefined) {
      const targetAgent = AGENTS[growthTargetId];
      return {
        type: "growth",
        targetAgentId: growthTargetId,
        targetAgent: targetAgent,
        isSelf: false
      };
    }
    // Fallback to self-reference if not in table (shouldn't happen)
    return {
      type: "growth",
      targetAgentId: agent.id,
      targetAgent: agent,
      isSelf: true
    };
  }

  // For imbalanced states (status !== 1), use dynamic calculation
  // 1. Get the Agent's associated Archetype
  const archetypeId = agent.archetype;

  // 2. Get the Archetype's correction partner
  const archetypeCorrection = getArchetypeCorrection(archetypeId, status);
  if (!archetypeCorrection) return null;

  const targetArchetypeId = archetypeCorrection.target;

  // 3. Get the target archetype's channel
  const targetArchetype = ARCHETYPES[targetArchetypeId];
  const targetChannel = targetArchetype?.channel;

  // 4. Agents NEVER flip role - just find same role in target archetype's channel
  // (Only Bounds flip polarity: inner↔outer)
  const targetRole = agent.role;

  // 5. Handle archetypes without channels (Gestalt/Portal) - self-reference
  if (!targetChannel) {
    return {
      ...archetypeCorrection,
      targetAgentId: agent.id,
      targetAgent: agent,
      isSelf: true
    };
  }

  // 6. Find the Agent in the target channel with same role
  const targetChannelAgents = CHANNEL_AGENTS[targetChannel];
  if (!targetChannelAgents) {
    return {
      ...archetypeCorrection,
      targetAgentId: agent.id,
      targetAgent: agent,
      isSelf: true
    };
  }

  const targetAgentId = targetChannelAgents[targetRole];
  if (!targetAgentId) {
    return {
      ...archetypeCorrection,
      targetAgentId: agent.id,
      targetAgent: agent,
      isSelf: true
    };
  }

  const targetAgent = AGENTS[targetAgentId];
  return {
    ...archetypeCorrection,
    targetAgentId: targetAgentId,
    targetAgent: targetAgent,
    isSelf: archetypeCorrection.isSelf || false
  };
}

export function getComponent(id) {
  if (id < 22) return { ...ARCHETYPES[id], type: "Archetype", id };
  if (id < 62) return { ...BOUNDS[id], type: "Bound", id };
  return { ...AGENTS[id], type: "Agent", id };
}

export function getFullCorrection(transientId, status) {
  const trans = getComponent(transientId);
  if (trans.type === "Archetype") return getArchetypeCorrection(transientId, status);
  if (trans.type === "Bound") return getBoundCorrection(trans, status);
  if (trans.type === "Agent") return getAgentCorrection(trans, status);
  return null;
}

export function getCorrectionText(correction, trans, status) {
  if (!correction) return null;

  // Determine correction type based on correction.type or status
  let correctionType;
  if (correction.type === 'growth') {
    correctionType = 'GROWTH';
  } else if (correction.type === 'diagonal' || status === 2) {
    correctionType = 'DIAGONAL';
  } else if (correction.type === 'vertical' || status === 3) {
    correctionType = 'VERTICAL';
  } else if (correction.type === 'reduction' || status === 4) {
    correctionType = 'REDUCTION';
  }

  // Handle self-references (recursion points - Gestalt/Portal in balance)
  if (correction.isSelf) {
    if (trans.type === "Bound" && correction.targetBound) {
      return `${correction.targetBound.name} (self - recursion point)`;
    }
    if (trans.type === "Agent" && correction.targetAgent) {
      return `${correction.targetAgent.name} (self - recursion point)`;
    }
    const arch = ARCHETYPES[correction.target];
    if (arch) {
      return `${arch.name} (self - recursion point)`;
    }
    return `${trans.name} (self - recursion point)`;
  }

  // For Bounds, show the target Bound
  if (trans.type === "Bound" && correction.targetBound) {
    const targetBound = correction.targetBound;
    const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
    return `${targetBound.name} via ${correctionType} ${label}`;
  }

  // For Agents, show the target Agent
  if (trans.type === "Agent" && correction.targetAgent) {
    const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
    return `${correction.targetAgent.name} via ${correctionType} ${label}`;
  }

  // For Archetypes, show the target Archetype
  if (correction.target !== undefined) {
    const targetArchetype = ARCHETYPES[correction.target];
    if (targetArchetype) {
      const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
      return `${targetArchetype.name} via ${correctionType} ${label}`;
    }
  }

  if (correction.targets) {
    return correction.targets.map(t => {
      const arch = ARCHETYPES[t];
      return arch ? `${arch.name}` : null;
    }).filter(Boolean).join(", ");
  }
  return null;
}

export function getCorrectionTargetId(correction, trans) {
  if (!correction) return null;
  if (trans.type === "Bound" && correction.targetId !== undefined) return correction.targetId;
  // For Agents, return the target Agent ID (not just the Archetype)
  if (trans.type === "Agent" && correction.targetAgentId !== undefined) return correction.targetAgentId;
  if (correction.target !== undefined) return correction.target;
  if (correction.targets && correction.targets.length > 0) return correction.targets[0];
  return null;
}
