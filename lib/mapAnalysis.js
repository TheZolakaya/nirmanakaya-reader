// === MAP ANALYSIS: THE COMPUTATION HARNESS ===
// Pure functions, no AI, no API calls. Consumer-agnostic.
// Input: 22 or 78 draws (position, transient, status)
// Output: Complete structural analysis of the full consciousness map
//
// Consumers: Reader Cartography mode, RLHF reward signal,
//            Map Visualization, 3D Visualization, future applications
//
// The four rebalancing geometries (from Rebalancing_Mechanics treatise):
//   Balanced  → Growth (Transpose pairs)
//   Too Much  → Diagonal partner
//   Too Little → Vertical partner
//   Unacknowledged → Reduction pair

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import {
  GOVERNANCE_MAP,
  WHEEL_WORLD_ASSOCIATION,
  INNER_OUTER_HORIZON,
  STATUSES,
  HOUSES,
  BEING_GROUPS,
  IDENTITY_GROUPS
} from './constants.js';
import {
  GROWTH_PAIRS,
  DIAGONAL_PAIRS,
  VERTICAL_PAIRS,
  REDUCTION_PAIRS,
  getFullCorrection,
  getComponent
} from './corrections.js';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Resolve any signature ID (0-77) to its archetype position (0-21)
function resolvePosition(signatureId) {
  if (signatureId < 22) return signatureId;
  if (signatureId < 62) return BOUNDS[signatureId]?.archetype;
  return AGENTS[signatureId]?.archetype;
}

// Get signature class: 'archetype', 'bound', or 'agent'
function signatureClass(id) {
  if (id < 22) return 'archetype';
  if (id < 62) return 'bound';
  return 'agent';
}

// Get the full signature data for any ID
function getSignature(id) {
  if (id < 22) return { ...ARCHETYPES[id], id, class: 'archetype' };
  if (id < 62) return { ...BOUNDS[id], id, class: 'bound' };
  return { ...AGENTS[id], id, class: 'agent' };
}

// Get the house for any archetype position
function getHouse(position) {
  for (const [houseName, house] of Object.entries(HOUSES)) {
    if (house.members.includes(position)) return houseName;
  }
  return null;
}

// Get the channel/element for a transient
function getChannel(signatureId) {
  if (signatureId < 22) return ARCHETYPES[signatureId]?.channel || null;
  if (signatureId < 62) return BOUNDS[signatureId]?.channel || null;
  return AGENTS[signatureId]?.channel || null;
}

// Get process stage for a transient
function getStage(signatureId) {
  if (signatureId < 22) return ARCHETYPES[signatureId]?.function || null;
  if (signatureId < 62) return BOUNDS[signatureId]?.function || null;
  return AGENTS[signatureId]?.function || null;
}

// Map channel names to element names
const CHANNEL_TO_ELEMENT = {
  'Intent': 'Fire',
  'Cognition': 'Air',
  'Resonance': 'Water',
  'Structure': 'Earth'
};

// Get structural metadata for ANY position (0-77)
// Derivatives inherit house, governance, corrections from parent archetype
// Bounds have their own horizon (inner=floor/lower bound, outer=ceiling/upper bound)
function getPositionMeta(posId) {
  if (posId < 22) {
    const arch = ARCHETYPES[posId];
    return {
      id: posId,
      name: arch?.name,
      layer: 'archetype',
      parentArchetype: posId,
      house: getHouse(posId),
      function: arch?.function,
      channel: arch?.channel,
      horizon: INNER_OUTER_HORIZON[posId],
      wheelWorld: WHEEL_WORLD_ASSOCIATION[posId]
    };
  }
  if (posId < 62) {
    const bound = BOUNDS[posId];
    const parentPos = bound?.archetype;
    // Each bound has its OWN horizon: inner = floor (lower bound), outer = ceiling (upper bound)
    // This is the bound's role in defining its archetype's operating range
    const boundHorizon = bound?.horizon;
    return {
      id: posId,
      name: bound?.name,
      layer: 'bound',
      boundRole: boundHorizon === 'inner' ? 'lower' : 'upper',
      parentArchetype: parentPos,
      house: getHouse(parentPos),
      function: bound?.function,
      channel: bound?.channel,
      horizon: boundHorizon,
      parentHorizon: INNER_OUTER_HORIZON[parentPos],
      wheelWorld: bound?.wheelWorld || WHEEL_WORLD_ASSOCIATION[parentPos]
    };
  }
  const agent = AGENTS[posId];
  const parentPos = agent?.archetype;
  return {
    id: posId,
    name: agent?.name,
    layer: 'agent',
    parentArchetype: parentPos,
    house: getHouse(parentPos),
    function: agent?.function || ARCHETYPES[parentPos]?.function,
    channel: agent?.channel || ARCHETYPES[parentPos]?.channel,
    horizon: INNER_OUTER_HORIZON[parentPos],
    wheelWorld: WHEEL_WORLD_ASSOCIATION[parentPos]
  };
}

// Determine the total position count from the drawMap
function getPositionCount(drawMap) {
  const keys = Object.keys(drawMap).map(Number);
  if (keys.length === 0) return 0;
  return Math.max(...keys) < 22 ? 22 : 78;
}

// ─────────────────────────────────────────────
// PORTAL ANALYSIS
// ─────────────────────────────────────────────

function analyzePortals(drawMap) {
  const wheel = drawMap[10];
  const world = drawMap[21];

  function portalDetail(draw) {
    if (!draw) return null;
    const sig = getSignature(draw.transient);
    return {
      position: draw.position,
      transient: draw.transient,
      transientName: sig.name,
      transientClass: sig.class,
      status: draw.status,
      statusName: STATUSES[draw.status]?.name,
      resolvedPosition: resolvePosition(draw.transient),
      channel: getChannel(draw.transient),
      element: CHANNEL_TO_ELEMENT[getChannel(draw.transient)] || null,
      stage: getStage(draw.transient),
      house: getHouse(resolvePosition(draw.transient))
    };
  }

  return {
    wheel: portalDetail(wheel),
    world: portalDetail(world),
    frame: {
      wheelElement: CHANNEL_TO_ELEMENT[getChannel(wheel?.transient)] || null,
      wheelStage: getStage(wheel?.transient),
      worldElement: CHANNEL_TO_ELEMENT[getChannel(world?.transient)] || null,
      worldStage: getStage(world?.transient)
    }
  };
}

// ─────────────────────────────────────────────
// GOVERNANCE CHAIN
// ─────────────────────────────────────────────

function analyzeGovernance(drawMap) {
  // Root: Source (position 10) governs Gestalt
  // Gestalt positions govern the four manifest houses:
  //   Potential (0) → Spirit
  //   Actualization (19) → Mind
  //   Recognition (20) → Emotion
  //   Will (1) → Body

  const governors = [];

  for (const [govPos, govInfo] of Object.entries(GOVERNANCE_MAP)) {
    const pos = parseInt(govPos);
    const draw = drawMap[pos];
    if (!draw) continue;

    const sig = getSignature(draw.transient);
    const isBalanced = draw.status === 1;

    governors.push({
      position: pos,
      positionName: ARCHETYPES[pos]?.name,
      house: govInfo.house,
      transient: draw.transient,
      transientName: sig.name,
      transientClass: sig.class,
      status: draw.status,
      statusName: STATUSES[draw.status]?.name,
      isBalanced,
      flagged: !isBalanced
    });
  }

  // House health: for each house, count balanced vs imbalanced positions
  // In 78-position readings, derivatives (bounds/agents) contribute to their parent's house health
  const posKeys = Object.keys(drawMap).map(Number);
  const houseHealth = {};
  for (const [houseName, house] of Object.entries(HOUSES)) {
    if (houseName === 'Portal') continue;
    // Archetype-level positions for this house
    const archetypeDraws = house.members.map(pos => drawMap[pos]).filter(Boolean);
    // Derivative positions (bounds/agents) whose parent archetype belongs to this house
    const derivativeDraws = posKeys
      .filter(pos => pos >= 22)
      .map(pos => ({ draw: drawMap[pos], meta: getPositionMeta(pos) }))
      .filter(({ meta }) => meta.house === houseName)
      .map(({ draw }) => draw);
    const allDraws = [...archetypeDraws, ...derivativeDraws];
    const balanced = allDraws.filter(d => d.status === 1).length;
    const total = allDraws.length;
    const governor = governors.find(g => g.house === houseName);

    houseHealth[houseName] = {
      balanced,
      total,
      archetypeCount: archetypeDraws.length,
      derivativeCount: derivativeDraws.length,
      ratio: total > 0 ? balanced / total : 0,
      governorStatus: governor?.statusName || null,
      governorFlagged: governor?.flagged || false
    };
  }

  return {
    root: governors.find(g => g.position === 10) || null,
    governors,
    houseHealth
  };
}

// ─────────────────────────────────────────────
// PER-POSITION DETAIL
// ─────────────────────────────────────────────

function analyzePositions(drawMap) {
  const positions = [];
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;

    const posMeta = getPositionMeta(pos);
    const transientSig = getSignature(draw.transient);
    const resolvedPos = resolvePosition(draw.transient);
    const isSelfHome = resolvedPos === pos;

    // Rebalancer: where does this position's correction point?
    // Corrections operate on the parent archetype level
    const correctionPos = posMeta.parentArchetype;
    const correction = getFullCorrection(draw.transient, draw.status);
    let rebalancer = null;
    if (correction && !correction.isSelf) {
      const targetPos = correction.target !== undefined
        ? correction.target
        : (correction.targetId !== undefined ? resolvePosition(correction.targetId) : null);
      const targetDraw = targetPos !== null ? drawMap[targetPos] : null;
      const targetMeta = targetPos !== null ? getPositionMeta(targetPos) : null;

      rebalancer = {
        targetPosition: targetPos,
        targetPositionName: targetMeta?.name || null,
        targetStatus: targetDraw?.status || null,
        targetStatusName: targetDraw ? STATUSES[targetDraw.status]?.name : null,
        geometry: correction.type,
        isSick: targetDraw ? targetDraw.status !== 1 : false
      };
    }

    positions.push({
      position: pos,
      positionName: posMeta.name,
      positionLayer: posMeta.layer,
      positionBoundRole: posMeta.boundRole || null,
      positionParentArchetype: posMeta.parentArchetype,
      positionHouse: posMeta.house,
      positionFunction: posMeta.function,
      positionHorizon: posMeta.horizon,
      positionWheelWorld: posMeta.wheelWorld,
      transient: draw.transient,
      transientName: transientSig.name,
      transientClass: transientSig.class,
      transientChannel: getChannel(draw.transient),
      transientElement: CHANNEL_TO_ELEMENT[getChannel(draw.transient)] || null,
      transientStage: getStage(draw.transient),
      transientHouse: getHouse(resolvedPos),
      status: draw.status,
      statusName: STATUSES[draw.status]?.name,
      resolvedPosition: resolvedPos,
      isSelfHome,
      isPortalTransient: draw.transient === 10 || draw.transient === 21,
      isMajorTransient: draw.transient < 22,
      rebalancer
    });
  }

  return positions;
}

// ─────────────────────────────────────────────
// TRACE ANALYSIS
// ─────────────────────────────────────────────

function analyzeTraces(drawMap) {
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  // Build the permutation: position → resolved position of its transient
  // For 78-position readings, traces span all layers (cross-layer traces)
  const perm = {};
  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;
    perm[pos] = resolvePosition(draw.transient);
  }

  // Find all cycles in the permutation
  const visited = new Set();
  const loops = [];

  for (const pos of posKeys) {
    if (visited.has(pos) || perm[pos] === undefined) continue;

    const path = [];
    let current = pos;

    // Follow the chain until we revisit a node
    while (!visited.has(current) && perm[current] !== undefined) {
      visited.add(current);
      path.push(current);
      current = perm[current];
    }

    // Determine loop shape
    if (path.length === 0) continue;

    // Find where the cycle begins
    const cycleStart = path.indexOf(current);

    if (cycleStart === -1) {
      // current was already visited in a previous loop — this is a tail into that loop
      continue;
    }

    const tail = path.slice(0, cycleStart);
    const loop = path.slice(cycleStart);

    let shape;
    if (tail.length > 0) {
      shape = 'tail-into-loop';
    } else if (loop.length === 1) {
      shape = 'self-home';
    } else if (loop.length === 2) {
      shape = 'swap';
    } else {
      shape = 'pure';
    }

    // Collect houses spanned by this loop (using position metadata for derivatives)
    const housesInLoop = new Set(loop.map(p => getPositionMeta(p).house).filter(Boolean));

    // Collect layers spanned by this loop (archetype/bound/agent cross-layer traces)
    const layersInLoop = new Set(loop.map(p => getPositionMeta(p).layer));

    // Status summary for loop members
    const statusCounts = { balanced: 0, tooMuch: 0, tooLittle: 0, unacknowledged: 0 };
    for (const p of loop) {
      const draw = drawMap[p];
      if (!draw) continue;
      if (draw.status === 1) statusCounts.balanced++;
      else if (draw.status === 2) statusCounts.tooMuch++;
      else if (draw.status === 3) statusCounts.tooLittle++;
      else if (draw.status === 4) statusCounts.unacknowledged++;
    }

    loops.push({
      positions: loop,
      positionNames: loop.map(p => getPositionMeta(p).name),
      positionLayers: loop.map(p => getPositionMeta(p).layer),
      shape,
      size: loop.length,
      tail: tail.length > 0 ? tail : null,
      tailNames: tail.length > 0 ? tail.map(p => getPositionMeta(p).name) : null,
      housesSpanned: [...housesInLoop],
      layersSpanned: [...layersInLoop],
      isCrossLayer: layersInLoop.size > 1,
      statusSummary: statusCounts
    });
  }

  // Sort: largest loops first, then self-homes last
  loops.sort((a, b) => {
    if (a.shape === 'self-home' && b.shape !== 'self-home') return 1;
    if (b.shape === 'self-home' && a.shape !== 'self-home') return -1;
    return b.size - a.size;
  });

  return {
    loops,
    partition: {
      loopCount: loops.length,
      sizes: loops.map(l => l.size),
      largestLoop: loops.length > 0 ? loops[0].size : 0,
      selfHomeCount: loops.filter(l => l.shape === 'self-home').length,
      swapCount: loops.filter(l => l.shape === 'swap').length,
      crossLayerCount: loops.filter(l => l.isCrossLayer).length
    }
  };
}

// ─────────────────────────────────────────────
// AGGREGATES
// ─────────────────────────────────────────────

function analyzeAggregates(drawMap, portalAnalysis) {
  const elements = { Fire: 0, Air: 0, Water: 0, Earth: 0 };
  const stages = { Seed: 0, Medium: 0, Fruition: 0, Feedback: 0, Ingress: 0 };
  const horizon = { inner: 0, outer: 0, threshold: 0 };
  const scope = { archetype: 0, bound: 0, agent: 0 };
  const houses = { Gestalt: 0, Spirit: 0, Mind: 0, Emotion: 0, Body: 0, Portal: 0 };
  const statuses = { Balanced: 0, 'Too Much': 0, 'Too Little': 0, Unacknowledged: 0 };
  const layers = { archetype: 0, bound: 0, agent: 0 };
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;

    const channel = getChannel(draw.transient);
    const element = CHANNEL_TO_ELEMENT[channel];
    if (element) elements[element]++;

    const stage = getStage(draw.transient);
    if (stage) stages[stage]++;

    const transientResolvedPos = resolvePosition(draw.transient);
    const transientHorizon = INNER_OUTER_HORIZON[transientResolvedPos];
    if (transientHorizon) horizon[transientHorizon]++;

    const cls = signatureClass(draw.transient);
    scope[cls]++;

    const transientHouse = getHouse(transientResolvedPos);
    if (transientHouse) houses[transientHouse]++;

    const statusName = STATUSES[draw.status]?.name;
    if (statusName) statuses[statusName]++;

    // Track position layer distribution (which layers are occupied)
    const posMeta = getPositionMeta(pos);
    layers[posMeta.layer]++;
  }

  return {
    elements,
    stages,
    horizon,
    scope,
    houses,
    statuses,
    layers,
    portalFrame: portalAnalysis.frame
  };
}

// ─────────────────────────────────────────────
// CROSS-REFERENCES
// ─────────────────────────────────────────────

function analyzeCrossRefs(drawMap) {
  const byElement = {};
  const byStage = {};
  const byHorizon = { inner: [], outer: [], threshold: [] };
  const byHouse = {};
  const byStatus = {};
  const byLayer = {};
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;

    const posMeta = getPositionMeta(pos);
    const entry = {
      position: pos,
      positionName: posMeta.name,
      positionLayer: posMeta.layer,
      transient: draw.transient,
      transientName: getSignature(draw.transient).name,
      status: draw.status,
      statusName: STATUSES[draw.status]?.name
    };

    // By element
    const channel = getChannel(draw.transient);
    const element = CHANNEL_TO_ELEMENT[channel];
    if (element) {
      if (!byElement[element]) byElement[element] = [];
      byElement[element].push(entry);
    }

    // By stage
    const stage = getStage(draw.transient);
    if (stage) {
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(entry);
    }

    // By horizon
    const resolvedPos = resolvePosition(draw.transient);
    const h = INNER_OUTER_HORIZON[resolvedPos];
    if (h) byHorizon[h].push(entry);

    // By house (transient's home house)
    const house = getHouse(resolvedPos);
    if (house) {
      if (!byHouse[house]) byHouse[house] = [];
      byHouse[house].push(entry);
    }

    // By status
    const statusName = STATUSES[draw.status]?.name;
    if (statusName) {
      if (!byStatus[statusName]) byStatus[statusName] = [];
      byStatus[statusName].push(entry);
    }

    // By position layer (archetype/bound/agent)
    const layer = posMeta.layer;
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(entry);
  }

  return { byElement, byStage, byHorizon, byHouse, byStatus, byLayer };
}

// ─────────────────────────────────────────────
// SIGNIFICANCE FLAGS
// ─────────────────────────────────────────────

function analyzeFlags(drawMap, positions, governance) {
  const flags = [];

  for (const pos of positions) {
    // Portal as transient: a portal signature landing somewhere other than its home
    if (pos.isPortalTransient && !pos.isSelfHome) {
      flags.push({
        type: 'portal-as-transient',
        position: pos.position,
        positionName: pos.positionName,
        transient: pos.transient,
        transientName: pos.transientName,
        detail: `${pos.transientName} (Portal) appearing at ${pos.positionName} — the threshold is displaced`
      });
    }

    // Major archetype as transient at non-home position
    if (pos.isMajorTransient && !pos.isSelfHome && !pos.isPortalTransient) {
      flags.push({
        type: 'major-as-transient',
        position: pos.position,
        positionName: pos.positionName,
        transient: pos.transient,
        transientName: pos.transientName,
        detail: `${pos.transientName} (Major) appearing at ${pos.positionName} — archetype visiting another position`
      });
    }

    // Self-home: transient's home = position it occupies
    if (pos.isSelfHome) {
      flags.push({
        type: 'self-home',
        position: pos.position,
        positionName: pos.positionName,
        transient: pos.transient,
        transientName: pos.transientName,
        detail: `${pos.transientName} is home at ${pos.positionName} — grounded, no displacement`
      });
    }

    // Sick rebalancer: the position this draw points to for rebalancing is itself imbalanced
    if (pos.rebalancer?.isSick) {
      flags.push({
        type: 'sick-rebalancer',
        position: pos.position,
        positionName: pos.positionName,
        rebalancerPosition: pos.rebalancer.targetPosition,
        rebalancerName: pos.rebalancer.targetPositionName,
        rebalancerStatus: pos.rebalancer.targetStatusName,
        geometry: pos.rebalancer.geometry,
        detail: `${pos.positionName}'s rebalancer (${pos.rebalancer.targetPositionName}) is ${pos.rebalancer.targetStatusName} — the medicine is also affected`
      });
    }
  }

  // Governance flags: governors in imbalanced states
  for (const gov of governance.governors) {
    if (gov.flagged) {
      flags.push({
        type: 'governance-flagged',
        position: gov.position,
        positionName: gov.positionName,
        house: gov.house,
        status: gov.status,
        statusName: gov.statusName,
        detail: `${gov.positionName} governs ${gov.house} but is ${gov.statusName} — house governance compromised`
      });
    }
  }

  return flags;
}

// ─────────────────────────────────────────────
// #6: WHEEL/WORLD FIELD HEALTH
// ─────────────────────────────────────────────

function analyzeWheelWorldFields(drawMap) {
  // Split positions into Wheel-associated vs World-associated
  // Based on diagonal pair sums: sum=19 → Wheel, sum=21 → World
  // Derivatives inherit their parent archetype's wheel/world association
  const wheelPositions = [];
  const worldPositions = [];
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  for (const pos of posKeys) {
    const posMeta = getPositionMeta(pos);
    const assoc = posMeta.wheelWorld;
    if (assoc === 'Wheel') wheelPositions.push(pos);
    else if (assoc === 'World') worldPositions.push(pos);
  }

  function fieldStats(positions) {
    let balanced = 0, total = 0;
    const statusCounts = { Balanced: 0, 'Too Much': 0, 'Too Little': 0, Unacknowledged: 0 };
    const byHouse = {};

    for (const pos of positions) {
      const draw = drawMap[pos];
      if (!draw) continue;
      total++;
      const statusName = STATUSES[draw.status]?.name;
      if (statusName) statusCounts[statusName]++;
      if (draw.status === 1) balanced++;

      const house = getPositionMeta(pos).house;
      if (house) {
        if (!byHouse[house]) byHouse[house] = { balanced: 0, total: 0 };
        byHouse[house].total++;
        if (draw.status === 1) byHouse[house].balanced++;
      }
    }

    return {
      positions,
      total,
      balanced,
      ratio: total > 0 ? Math.round((balanced / total) * 100) / 100 : 0,
      statuses: statusCounts,
      byHouse
    };
  }

  const wheel = fieldStats(wheelPositions);
  const world = fieldStats(worldPositions);

  // Field differential: positive = Wheel healthier, negative = World healthier
  const differential = Math.round((wheel.ratio - world.ratio) * 100) / 100;

  return {
    wheel,
    world,
    differential,
    dominantField: differential > 0.1 ? 'Wheel' : differential < -0.1 ? 'World' : 'balanced'
  };
}

// ─────────────────────────────────────────────
// #7: MULTI-DIMENSIONAL CROSS-REFERENCES
// ─────────────────────────────────────────────

function analyzeCompoundCrossRefs(drawMap, positions) {
  // Element × Status: which elements are healthy vs sick?
  const elementByStatus = {};
  // Stage × Status: which process stages are healthy vs sick?
  const stageByStatus = {};
  // Horizon × House: where are inner/outer transients landing?
  const horizonByHouse = {};
  // Rebalancer clustering: which house is doing the most correction work?
  const rebalancerByHouse = { Gestalt: 0, Spirit: 0, Mind: 0, Emotion: 0, Body: 0, Portal: 0 };

  for (const pos of positions) {
    const element = pos.transientElement;
    const stage = pos.transientStage;
    const statusName = pos.statusName;
    const posHouse = pos.positionHouse;
    const horizon = pos.positionHorizon;

    // Element × Status
    if (element && statusName) {
      if (!elementByStatus[element]) {
        elementByStatus[element] = { Balanced: 0, 'Too Much': 0, 'Too Little': 0, Unacknowledged: 0 };
      }
      elementByStatus[element][statusName]++;
    }

    // Stage × Status
    if (stage && statusName) {
      if (!stageByStatus[stage]) {
        stageByStatus[stage] = { Balanced: 0, 'Too Much': 0, 'Too Little': 0, Unacknowledged: 0 };
      }
      stageByStatus[stage][statusName]++;
    }

    // Horizon × House (position's horizon crossed with position's house)
    if (horizon && posHouse) {
      const key = `${horizon}:${posHouse}`;
      if (!horizonByHouse[key]) horizonByHouse[key] = { balanced: 0, total: 0 };
      horizonByHouse[key].total++;
      if (pos.status === 1) horizonByHouse[key].balanced++;
    }

    // Rebalancer clustering: if this position has a rebalancer, tally the TARGET's house
    if (pos.rebalancer && pos.rebalancer.targetPosition !== null) {
      const targetHouse = getHouse(pos.rebalancer.targetPosition);
      if (targetHouse) rebalancerByHouse[targetHouse]++;
    }
  }

  // Find the house bearing the most correction load
  const maxRebalancerLoad = Math.max(...Object.values(rebalancerByHouse));
  const heaviestCorrectionHouse = Object.entries(rebalancerByHouse)
    .filter(([_, count]) => count === maxRebalancerLoad && count > 0)
    .map(([house]) => house);

  return {
    elementByStatus,
    stageByStatus,
    horizonByHouse,
    rebalancerClustering: {
      byHouse: rebalancerByHouse,
      heaviestLoad: heaviestCorrectionHouse,
      maxLoad: maxRebalancerLoad
    }
  };
}

// ─────────────────────────────────────────────
// #9: CORRECTION PAIR VISIBILITY
// ─────────────────────────────────────────────

function analyzeCorrectionPairVisibility(drawMap) {
  // For every position, show BOTH sides of all its correction relationships
  // and whether each path is open (target balanced) or blocked (target imbalanced)
  // Derivatives inherit correction geometry from their parent archetype
  const pairVisibility = [];
  const posKeys = Object.keys(drawMap).map(Number).sort((a, b) => a - b);

  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;

    const posMeta = getPositionMeta(pos);
    const resolvedPos = resolvePosition(draw.transient);
    // Corrections operate on the parent archetype level
    const correctionAnchor = posMeta.parentArchetype;
    const pairs = {};

    // Growth (Transpose) pair
    const growthTarget = GROWTH_PAIRS[correctionAnchor];
    if (growthTarget !== null && growthTarget !== undefined) {
      const targetDraw = drawMap[growthTarget];
      const targetMeta = getPositionMeta(growthTarget);
      pairs.growth = {
        target: growthTarget,
        targetName: targetMeta?.name,
        targetStatus: targetDraw?.status || null,
        targetStatusName: targetDraw ? STATUSES[targetDraw.status]?.name : null,
        open: targetDraw ? targetDraw.status === 1 : false
      };
    }

    // Diagonal pair (Too Much correction)
    const diagTarget = DIAGONAL_PAIRS[correctionAnchor];
    if (diagTarget !== undefined) {
      const targetDraw = drawMap[diagTarget];
      const targetMeta = getPositionMeta(diagTarget);
      pairs.diagonal = {
        target: diagTarget,
        targetName: targetMeta?.name,
        targetStatus: targetDraw?.status || null,
        targetStatusName: targetDraw ? STATUSES[targetDraw.status]?.name : null,
        open: targetDraw ? targetDraw.status === 1 : false
      };
    }

    // Vertical pair (Too Little correction)
    const vertTarget = VERTICAL_PAIRS[correctionAnchor];
    if (vertTarget !== undefined) {
      const targetDraw = drawMap[vertTarget];
      const targetMeta = getPositionMeta(vertTarget);
      pairs.vertical = {
        target: vertTarget,
        targetName: targetMeta?.name,
        targetStatus: targetDraw?.status || null,
        targetStatusName: targetDraw ? STATUSES[targetDraw.status]?.name : null,
        open: targetDraw ? targetDraw.status === 1 : false
      };
    }

    // Reduction pair (Unacknowledged correction)
    const redTarget = REDUCTION_PAIRS[correctionAnchor];
    if (redTarget !== null && redTarget !== undefined) {
      const targetDraw = drawMap[redTarget];
      const targetMeta = getPositionMeta(redTarget);
      pairs.reduction = {
        target: redTarget,
        targetName: targetMeta?.name,
        targetStatus: targetDraw?.status || null,
        targetStatusName: targetDraw ? STATUSES[targetDraw.status]?.name : null,
        open: targetDraw ? targetDraw.status === 1 : false
      };
    }

    // Which geometry is ACTIVE for this position's current status?
    let activeGeometry = null;
    if (draw.status === 1) activeGeometry = 'growth';
    else if (draw.status === 2) activeGeometry = 'diagonal';
    else if (draw.status === 3) activeGeometry = 'vertical';
    else if (draw.status === 4) activeGeometry = 'reduction';

    const activePair = activeGeometry ? pairs[activeGeometry] : null;

    pairVisibility.push({
      position: pos,
      positionName: posMeta.name,
      positionLayer: posMeta.layer,
      transientResolved: resolvedPos,
      status: draw.status,
      statusName: STATUSES[draw.status]?.name,
      activeGeometry,
      activePath: activePair ? {
        ...activePair,
        blocked: activePair ? !activePair.open : true
      } : null,
      allPairs: pairs
    });
  }

  // Summary: how many active paths are open vs blocked?
  const openPaths = pairVisibility.filter(p => p.activePath && !p.activePath.blocked).length;
  const blockedPaths = pairVisibility.filter(p => p.activePath && p.activePath.blocked).length;
  const selfReferencing = pairVisibility.filter(p => !p.activePath).length;

  return {
    positions: pairVisibility,
    summary: {
      openPaths,
      blockedPaths,
      selfReferencing,
      pathOpenRatio: (openPaths + blockedPaths) > 0
        ? Math.round((openPaths / (openPaths + blockedPaths)) * 100) / 100
        : 1
    }
  };
}

// ─────────────────────────────────────────────
// #10: CORRECTIVE VECTOR
// ─────────────────────────────────────────────

function computeCorrectiveVector(drawMap, pairVisibility, governance) {
  // Does the current configuration MOVE TOWARD or AWAY FROM health?
  // This is the RLHF compass signal.
  //
  // Factors:
  //   + Open correction paths (medicine is available)
  //   + Balanced governors (governance chain intact)
  //   + Self-home positions (stability anchors)
  //   - Blocked paths (medicine is also sick)
  //   - Sick governors (cascade failure risk)
  //   - Unacknowledged positions (shadow = no self-correction possible)

  let towardSignal = 0;
  let awaySignal = 0;

  // Factor 1: Correction path openness
  // Open path = toward health (the correction CAN reach its target)
  // Blocked path = away from health (the medicine is sick too)
  for (const pv of pairVisibility.positions) {
    if (!pv.activePath) continue; // self-referencing, neutral
    if (!pv.activePath.blocked) {
      towardSignal += 1;
    } else {
      awaySignal += 1;
    }
  }

  // Factor 2: Governance chain integrity (weighted 2x — governors affect entire houses)
  for (const gov of governance.governors) {
    if (gov.isBalanced) {
      towardSignal += 2;
    } else {
      awaySignal += 2;
    }
  }

  // Factor 3: Self-home positions (stability anchors, weighted 0.5)
  const posKeys = Object.keys(drawMap).map(Number);
  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;
    if (resolvePosition(draw.transient) === pos) {
      towardSignal += 0.5;
    }
  }

  // Factor 4: Unacknowledged penalty (shadow can't self-correct, weighted 1.5)
  for (const pos of posKeys) {
    const draw = drawMap[pos];
    if (!draw) continue;
    if (draw.status === 4) {
      awaySignal += 1.5;
    }
  }

  const total = towardSignal + awaySignal;
  const rawVector = total > 0 ? (towardSignal - awaySignal) / total : 0;
  // Normalize to -1 (fully away) to +1 (fully toward)
  const vector = Math.round(rawVector * 100) / 100;

  let direction;
  if (vector > 0.2) direction = 'toward';
  else if (vector < -0.2) direction = 'away';
  else direction = 'stalled';

  return {
    vector,
    direction,
    towardSignal: Math.round(towardSignal * 100) / 100,
    awaySignal: Math.round(awaySignal * 100) / 100,
    components: {
      openPaths: pairVisibility.summary.openPaths,
      blockedPaths: pairVisibility.summary.blockedPaths,
      balancedGovernors: governance.governors.filter(g => g.isBalanced).length,
      sickGovernors: governance.governors.filter(g => g.flagged).length,
      selfHomeCount: posKeys
        .filter(pos => drawMap[pos] && resolvePosition(drawMap[pos].transient) === pos).length,
      unacknowledgedCount: posKeys
        .filter(pos => drawMap[pos]?.status === 4).length
    }
  };
}

// ─────────────────────────────────────────────
// HEALTH SCORING (with governance weighting)
// ─────────────────────────────────────────────

function computeHealth(aggregates, governance, flags, wheelWorldFields, correctiveVector) {
  const total = Object.values(aggregates.statuses).reduce((sum, v) => sum + v, 0) || 22;
  const balanced = aggregates.statuses.Balanced || 0;
  const tooMuch = aggregates.statuses['Too Much'] || 0;
  const tooLittle = aggregates.statuses['Too Little'] || 0;
  const unacknowledged = aggregates.statuses.Unacknowledged || 0;

  // Integration score: weighted contribution of each status
  // Balanced = fully integrated (1.0)
  // Too Much = energy present, needs direction (0.5) — active opportunity
  // Too Little = space open, ready to receive (0.35) — receptive opportunity
  // Unacknowledged = hidden potential, deepest growth (0.2) — transformative opportunity
  const weightedIntegration = (
    (balanced * 1.0) +
    (tooMuch * 0.5) +
    (tooLittle * 0.35) +
    (unacknowledged * 0.2)
  ) / total;

  // Self-home bonus: grounded positions add stability (up to +5)
  const selfHomeCount = flags.filter(f => f.type === 'self-home').length;
  const groundingBonus = Math.min(5, selfHomeCount * 1.5);

  // Horizon consonance: balanced wheel/world adds coherence (up to +5)
  const consonanceBonus = wheelWorldFields
    ? Math.max(0, 5 - Math.abs(wheelWorldFields.differential) * 1)
    : 0;

  const raw = (weightedIntegration * 90) + groundingBonus + consonanceBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    integration: Math.round(weightedIntegration * 100),
    profile: {
      balanced,
      tooMuch,
      tooLittle,
      unacknowledged
    },
    groundingBonus: Math.round(groundingBonus * 10) / 10,
    consonanceBonus: Math.round(consonanceBonus * 10) / 10
  };
}

// ─────────────────────────────────────────────
// BEING & IDENTITY GROUP ANALYSIS
// ─────────────────────────────────────────────
// Being groups (What?): Mantle, Kindle, Vessel, Passage
// Identity groups (Who?): Composure, Conviction, Exploration, Intimacy
// Each group has 4 archetype members — one per house (excluding Gestalt)
// Packet = archetype + its 2 bounds + its agent(s)

// Build a health summary for a single archetype "packet" at a given durable position.
// Packet includes: the archetype durable, its floor/ceiling bounds, and its agents.
function buildPacketHealth(archetypeId, drawMap) {
  const archDraw = drawMap[archetypeId];
  const archStatus = archDraw?.status || null;
  const archStatusName = archStatus ? STATUSES[archStatus]?.name : null;

  // Find the 2 bounds belonging to this archetype (floor = inner, ceiling = outer)
  const boundIds = Object.keys(BOUNDS).map(Number)
    .filter(id => BOUNDS[id]?.archetype === archetypeId);
  const floorBound = boundIds.find(id => BOUNDS[id]?.horizon === 'inner') || null;
  const ceilingBound = boundIds.find(id => BOUNDS[id]?.horizon === 'outer') || null;

  // Find agents belonging to this archetype
  const agentIds = Object.keys(AGENTS).map(Number)
    .filter(id => AGENTS[id]?.archetype === archetypeId);

  // Gather statuses across the full packet
  const packetStatuses = [];
  if (archDraw) packetStatuses.push(archDraw.status);
  for (const bId of [floorBound, ceilingBound]) {
    if (bId !== null && drawMap[bId]) packetStatuses.push(drawMap[bId].status);
  }
  for (const aId of agentIds) {
    if (drawMap[aId]) packetStatuses.push(drawMap[aId].status);
  }

  const packetBalanced = packetStatuses.filter(s => s === 1).length;
  const packetTotal = packetStatuses.length;

  return {
    archetypeId,
    archetypeName: ARCHETYPES[archetypeId]?.name,
    durableStatus: archStatus,
    durableStatusName: archStatusName,
    floorBound: floorBound !== null ? {
      id: floorBound,
      name: BOUNDS[floorBound]?.name,
      status: drawMap[floorBound]?.status || null,
      statusName: drawMap[floorBound] ? STATUSES[drawMap[floorBound].status]?.name : null
    } : null,
    ceilingBound: ceilingBound !== null ? {
      id: ceilingBound,
      name: BOUNDS[ceilingBound]?.name,
      status: drawMap[ceilingBound]?.status || null,
      statusName: drawMap[ceilingBound] ? STATUSES[drawMap[ceilingBound].status]?.name : null
    } : null,
    agents: agentIds.map(aId => ({
      id: aId,
      name: AGENTS[aId]?.name,
      role: AGENTS[aId]?.role,
      status: drawMap[aId]?.status || null,
      statusName: drawMap[aId] ? STATUSES[drawMap[aId].status]?.name : null
    })),
    packetHealth: {
      balanced: packetBalanced,
      total: packetTotal,
      ratio: packetTotal > 0 ? Math.round((packetBalanced / packetTotal) * 100) : 0
    }
  };
}

// Analyze a set of dimensional groups (Being or Identity) against the drawMap
function analyzeDimensionalGroups(groups, drawMap) {
  const result = {};

  for (const [groupName, group] of Object.entries(groups)) {
    const members = group.members.map(id => buildPacketHealth(id, drawMap));

    // Aggregate status distribution across archetype durables
    const statusDist = { balanced: 0, tooMuch: 0, tooLittle: 0, unacknowledged: 0 };
    for (const m of members) {
      if (m.durableStatus === 1) statusDist.balanced++;
      else if (m.durableStatus === 2) statusDist.tooMuch++;
      else if (m.durableStatus === 3) statusDist.tooLittle++;
      else if (m.durableStatus === 4) statusDist.unacknowledged++;
    }

    // Aggregate packet health across all members
    const totalPacketBalanced = members.reduce((sum, m) => sum + m.packetHealth.balanced, 0);
    const totalPacketSize = members.reduce((sum, m) => sum + m.packetHealth.total, 0);

    // Identify which members are "learning" (distorted = status !== 1)
    const learning = members
      .filter(m => m.durableStatus !== null && m.durableStatus !== 1)
      .map(m => ({
        archetypeId: m.archetypeId,
        name: m.archetypeName,
        status: m.durableStatusName,
        stage: group.stages
          ? Object.entries(group.stages).find(([, id]) => id === m.archetypeId)?.[0] || null
          : null
      }));

    result[groupName] = {
      name: group.name,
      verb: group.verb,
      cycle: group.cycle,
      description: group.description,
      members,
      balancedCount: statusDist.balanced,
      statusDist,
      learning,
      packetHealth: {
        balanced: totalPacketBalanced,
        total: totalPacketSize,
        ratio: totalPacketSize > 0 ? Math.round((totalPacketBalanced / totalPacketSize) * 100) : 0
      }
    };
  }

  return result;
}

/**
 * Analyze Being groups (What? — Mantle, Kindle, Vessel, Passage).
 * Each group's 4 archetype members are assessed with full packet health.
 *
 * @param {Object} drawMap - Position-indexed lookup { [durableId]: { transient, status } }
 * @returns {Object} Keyed by group name with health summary
 */
export function analyzeBeingGroups(drawMap) {
  return analyzeDimensionalGroups(BEING_GROUPS, drawMap);
}

/**
 * Analyze Identity groups (Who? — Composure, Conviction, Exploration, Intimacy).
 * Each group's 4 archetype members are assessed with full packet health.
 *
 * @param {Object} drawMap - Position-indexed lookup { [durableId]: { transient, status } }
 * @returns {Object} Keyed by group name with health summary
 */
export function analyzeIdentityGroups(drawMap) {
  return analyzeDimensionalGroups(IDENTITY_GROUPS, drawMap);
}

// ─────────────────────────────────────────────
// TOROIDAL NEIGHBORHOOD ANALYSIS
// ─────────────────────────────────────────────
// 16 toroidal 2×2 blocks on the Forty-Fold Seal. Each sums to 40.

const NEIGHBORHOOD_DEFS = {
  'Luminous Direction':   { members: [17, 7, 2, 14],  practice: 'Spirit+Emotion',  activity: 'Intent+Cognition',    arc: 'Creation',   mode: 'Directed Perception',  collapses: 'Identity' },
  'Commanded Power':      { members: [7, 4, 14, 15],  practice: 'Emotion+Mind',    activity: 'Intent+Cognition',    arc: 'Intensity',  mode: 'Directed Perception',  collapses: 'Identity' },
  'Price of Knowing':     { members: [4, 12, 15, 9],  practice: 'Mind+Body',       activity: 'Intent+Cognition',    arc: 'Structure',  mode: 'Directed Perception',  collapses: 'Identity' },
  'Sacred Witness':       { members: [12, 17, 9, 2],  practice: 'Body+Spirit',     activity: 'Intent+Cognition',    arc: 'Wisdom',     mode: 'Directed Perception',  collapses: 'Identity' },
  'Open Reception':       { members: [2, 14, 18, 6],  practice: 'Spirit+Emotion',  activity: 'Cognition+Resonance', arc: 'Creation',   mode: 'Relational Knowing',   collapses: 'Stage' },
  'Anatomy of Relation':  { members: [14, 15, 6, 5],  practice: 'Emotion+Mind',    activity: 'Cognition+Resonance', arc: 'Intensity',  mode: 'Relational Knowing',   collapses: 'Identity' },
  'Tested Truth':         { members: [15, 9, 5, 11],  practice: 'Mind+Body',       activity: 'Cognition+Resonance', arc: 'Structure',  mode: 'Relational Knowing',   collapses: 'Identity' },
  'Silent Knowing':       { members: [9, 2, 11, 18],  practice: 'Body+Spirit',     activity: 'Cognition+Resonance', arc: 'Wisdom',     mode: 'Relational Knowing',   collapses: 'Stage' },
  'Fertile Transform':    { members: [18, 6, 3, 13],  practice: 'Spirit+Emotion',  activity: 'Resonance+Structure', arc: 'Creation',   mode: 'Grounded Holding',     collapses: 'Being' },
  'Relational Crisis':    { members: [6, 5, 13, 16],  practice: 'Emotion+Mind',    activity: 'Resonance+Structure', arc: 'Intensity',  mode: 'Grounded Holding',     collapses: 'Identity' },
  'Load-Bearing Truth':   { members: [5, 11, 16, 8],  practice: 'Mind+Body',       activity: 'Resonance+Structure', arc: 'Structure',  mode: 'Grounded Holding',     collapses: 'Identity' },
  'Gentle Stewardship':   { members: [11, 18, 8, 3],  practice: 'Body+Spirit',     activity: 'Resonance+Structure', arc: 'Wisdom',     mode: 'Grounded Holding',     collapses: 'Being' },
  'Generative Force':     { members: [3, 13, 17, 7],  practice: 'Spirit+Emotion',  activity: 'Structure+Intent',    arc: 'Creation',   mode: 'Creative Building',    collapses: 'Stage' },
  'Revolution':           { members: [13, 16, 7, 4],  practice: 'Emotion+Mind',    activity: 'Structure+Intent',    arc: 'Intensity',  mode: 'Creative Building',    collapses: 'Identity' },
  'Foundation':           { members: [16, 8, 4, 12],  practice: 'Mind+Body',       activity: 'Structure+Intent',    arc: 'Structure',  mode: 'Creative Building',    collapses: 'Stage' },
  'Grace':                { members: [8, 3, 12, 17],  practice: 'Body+Spirit',     activity: 'Structure+Intent',    arc: 'Wisdom',     mode: 'Creative Building',    collapses: 'Identity' },
};

/**
 * Analyze all 16 toroidal neighborhoods for a 78-position reading.
 * Each neighborhood's 4 archetypes are assessed for aggregate health.
 *
 * @param {Object} drawMap - Position-indexed lookup { [durableId]: { transient, status } }
 * @returns {Object} Keyed by neighborhood name with health summary, arc, mode, collapse info
 */
export function analyzeNeighborhoods(drawMap) {
  const result = {};

  for (const [name, def] of Object.entries(NEIGHBORHOOD_DEFS)) {
    const members = def.members.map(id => buildPacketHealth(id, drawMap));

    const statusDist = { balanced: 0, tooMuch: 0, tooLittle: 0, unacknowledged: 0 };
    for (const m of members) {
      if (m.durableStatus === 1) statusDist.balanced++;
      else if (m.durableStatus === 2) statusDist.tooMuch++;
      else if (m.durableStatus === 3) statusDist.tooLittle++;
      else if (m.durableStatus === 4) statusDist.unacknowledged++;
    }

    // Neighborhood coherence: 4 balanced = fully coherent, 0 = fragmented
    const coherence = Math.round((statusDist.balanced / 4) * 100);

    // Does the theme match the state? E.g. "Relational Crisis" with imbalance = theme manifesting
    const isThemeActive = statusDist.balanced < 4;

    result[name] = {
      ...def,
      members,
      balancedCount: statusDist.balanced,
      statusDist,
      coherence,
      isThemeActive,
    };
  }

  return result;
}

// ─────────────────────────────────────────────
// PORTAL CHAIN TRACING
// ─────────────────────────────────────────────
// Follow displacement chains through portal durables.
// For each portal (Source=10, Creation=21):
//   - What transient is visiting the portal? What status?
//   - That transient has a home durable — what's visiting THAT home? (chain)
//   - Where did the portal go as a transient? What status does it have there?

// Find which durable position a given transient landed at
function findTransientDestination(transientId, drawMap) {
  for (const [posStr, draw] of Object.entries(drawMap)) {
    if (draw.transient === transientId) {
      return { position: Number(posStr), status: draw.status };
    }
  }
  return null;
}

/**
 * Trace the displacement chain through portal durables (Source=10, Creation=21).
 *
 * For each portal:
 *   - visitor: what transient is at the portal durable, and its status
 *   - chain: follow the visitor's home → who's visiting there → follow THAT home...
 *   - portalAsTransient: where did the portal signature land, and what status
 *
 * @param {Object} drawMap - Position-indexed lookup
 * @returns {Object} { source: {...}, creation: {...} }
 */
export function tracePortalChains(drawMap) {
  function traceOnePortal(portalId) {
    const portalDraw = drawMap[portalId];
    if (!portalDraw) return null;

    const visitorId = portalDraw.transient;
    const visitorSig = getSignature(visitorId);

    // Build chain: visitor's home → who's visiting there → that visitor's home → ...
    // Cap at 22 to avoid infinite loops (max possible unique positions in archetype layer)
    const chain = [];
    const visited = new Set([portalId]);
    let currentHome = visitorId; // The visitor's own durable = its home position

    while (currentHome !== undefined && !visited.has(currentHome) && chain.length < 22) {
      visited.add(currentHome);
      const homeDraw = drawMap[currentHome];
      if (!homeDraw) break;

      const nextVisitorId = homeDraw.transient;
      const nextSig = getSignature(nextVisitorId);

      chain.push({
        durableId: currentHome,
        durableName: getPositionMeta(currentHome).name,
        visitorId: nextVisitorId,
        visitorName: nextSig.name,
        visitorClass: nextSig.class,
        status: homeDraw.status,
        statusName: STATUSES[homeDraw.status]?.name
      });

      // If the visitor is at its own home, the chain ends (self-seated)
      if (nextVisitorId === currentHome) break;

      // Follow to the next visitor's home
      currentHome = nextVisitorId;
    }

    // Where did the portal itself land as a transient?
    const portalDestination = findTransientDestination(portalId, drawMap);

    return {
      visitor: {
        id: visitorId,
        name: visitorSig.name,
        class: visitorSig.class,
        status: portalDraw.status,
        statusName: STATUSES[portalDraw.status]?.name
      },
      chain,
      portalAsTransient: portalDestination ? {
        landedAtDurable: portalDestination.position,
        landedAtName: getPositionMeta(portalDestination.position).name,
        status: portalDestination.status,
        statusName: STATUSES[portalDestination.status]?.name
      } : null
    };
  }

  return {
    source: traceOnePortal(10),
    creation: traceOnePortal(21)
  };
}

// ─────────────────────────────────────────────
// MAJOR SIGNAL ANALYSIS
// ─────────────────────────────────────────────
// Balanced major counts, self-seated detection, major-on-major density.
// These are high-level diagnostic signals for reading interpretation.

const PORTAL_IDS = [10, 21];
const SOUL_HOUSE_IDS = [0, 1, 19, 20]; // Gestalt: Potential, Will, Actualization, Awareness

/**
 * Analyze major (archetype) signals across the full map.
 *
 * Returns:
 *   - balancedDurables: how many archetype durable positions have balanced status
 *   - balancedTransients: for each archetype as a transient, is it balanced where it landed?
 *   - selfSeated: positions where transient === durable (at home), split by signature class
 *   - majorOnMajor: positions where both durable AND visitor are archetypes (0-21),
 *     with special flags for portals and soul house positions
 *
 * @param {Object} drawMap - Position-indexed lookup
 * @returns {Object} Major signal summary
 */
export function analyzeMajorSignals(drawMap) {
  // --- Balanced Durables: archetype durables (0-21) where the visiting status is balanced ---
  const balancedDurableList = [];
  for (let id = 0; id < 22; id++) {
    const draw = drawMap[id];
    if (draw && draw.status === 1) {
      balancedDurableList.push({
        durableId: id,
        name: ARCHETYPES[id]?.name,
        visitorId: draw.transient,
        visitorName: getSignature(draw.transient).name
      });
    }
  }

  // --- Balanced Transients: for each archetype 0-21, find where it landed and check status ---
  const balancedTransientList = [];
  for (let archId = 0; archId < 22; archId++) {
    const dest = findTransientDestination(archId, drawMap);
    if (dest && dest.status === 1) {
      balancedTransientList.push({
        archetypeId: archId,
        name: ARCHETYPES[archId]?.name,
        landedAt: dest.position,
        landedAtName: getPositionMeta(dest.position).name
      });
    }
  }

  // --- Self-Seated: transient === durable (signature at its own home) ---
  const selfSeatedMajors = [];
  const selfSeatedBounds = [];
  const selfSeatedAgents = [];

  for (const [posStr, draw] of Object.entries(drawMap)) {
    const pos = Number(posStr);
    if (draw.transient === pos) {
      const entry = {
        id: pos,
        name: getPositionMeta(pos).name,
        status: draw.status,
        statusName: STATUSES[draw.status]?.name
      };
      const cls = signatureClass(pos);
      if (cls === 'archetype') selfSeatedMajors.push(entry);
      else if (cls === 'bound') selfSeatedBounds.push(entry);
      else selfSeatedAgents.push(entry);
    }
  }

  // --- Major-on-Major: both durable (0-21) and visitor (0-21) are archetypes ---
  const majorOnMajorList = [];
  const atPortals = [];
  const atSoulHouse = [];

  for (let pos = 0; pos < 22; pos++) {
    const draw = drawMap[pos];
    if (!draw) continue;
    if (draw.transient < 22) {
      // Both durable and transient are archetypes
      const entry = {
        durableId: pos,
        durableName: ARCHETYPES[pos]?.name,
        visitorId: draw.transient,
        visitorName: ARCHETYPES[draw.transient]?.name,
        status: draw.status,
        statusName: STATUSES[draw.status]?.name,
        isSelfSeated: draw.transient === pos
      };
      majorOnMajorList.push(entry);

      if (PORTAL_IDS.includes(pos)) atPortals.push(entry);
      if (SOUL_HOUSE_IDS.includes(pos)) atSoulHouse.push(entry);
    }
  }

  return {
    balancedDurables: {
      total: balancedDurableList.length,
      outOf: 22,
      list: balancedDurableList
    },
    balancedTransients: {
      total: balancedTransientList.length,
      outOf: 22,
      list: balancedTransientList
    },
    selfSeated: {
      count: selfSeatedMajors.length + selfSeatedBounds.length + selfSeatedAgents.length,
      majors: selfSeatedMajors,
      bounds: selfSeatedBounds,
      agents: selfSeatedAgents
    },
    majorOnMajor: {
      count: majorOnMajorList.length,
      list: majorOnMajorList,
      atPortals,
      atSoulHouse
    }
  };
}

// ─────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────

/**
 * Analyze a consciousness map (22-position or 78-position).
 *
 * @param {Array<{position: number, transient: number, status: number}>} draws
 *   22 or 78 draws. Each draw has: position (0-21 or 0-77), transient (0-77), status (1-4).
 *
 * @returns {Object} Complete analysis — all functions adapt to draw count.
 */
export function analyzeFullMap(draws) {
  // Build position-indexed lookup
  const drawMap = {};
  for (const draw of draws) {
    drawMap[draw.position] = draw;
  }

  const positionCount = getPositionCount(drawMap);

  // Run all analyses
  const portals = analyzePortals(drawMap);
  const governance = analyzeGovernance(drawMap);
  const positions = analyzePositions(drawMap);
  const traces = analyzeTraces(drawMap);
  const aggregates = analyzeAggregates(drawMap, portals);
  const crossRefs = analyzeCrossRefs(drawMap);
  const flags = analyzeFlags(drawMap, positions, governance);
  const wheelWorldFields = analyzeWheelWorldFields(drawMap);
  const compoundCrossRefs = analyzeCompoundCrossRefs(drawMap, positions);
  const correctionPairs = analyzeCorrectionPairVisibility(drawMap);
  const correctiveVector = computeCorrectiveVector(drawMap, correctionPairs, governance);
  const health = computeHealth(aggregates, governance, flags, wheelWorldFields, correctiveVector);

  return {
    portals,
    governance,
    positions,
    traces,
    aggregates,
    crossRefs,
    compoundCrossRefs,
    wheelWorldFields,
    correctionPairs,
    correctiveVector,
    flags,
    health,
    meta: {
      drawCount: draws.length,
      positionCount,
      isFullState: positionCount === 78,
      timestamp: new Date().toISOString()
    }
  };
}

// ─────────────────────────────────────────────
// TRIAGE: L0-L5 RESOLUTION HIERARCHY
// ─────────────────────────────────────────────
// The engine is the body scan. The triage is the doctor.
// Compute everything → surface what matters → let the AI talk to the patient.
//
// L0: Horizon balance (Wheel vs World health, consonance)
// L1: Portal vitals (Source + Creation)
// L2: Process check (22 archetypes — compact overview)
// L3: Bound diagnosis (Floor/Ceiling for distorted processes — the WHY)
// L4: Manifest readout (agent positions — what's actually showing up)
// L5: Correction path (vertical partner + bound chain — where energy is going)
//
// Council ruling: This is a smart default, not structural law.
// The AI may reorder when pattern warrants. (Grok, March 20 2026)

/**
 * Triage a full analysis into the L0-L5 resolution hierarchy.
 * Deterministic first pass — no AI involved. This is the diagnostic payload.
 *
 * @param {Object} analysis - Output from analyzeFullMap()
 * @param {Object} drawMap - Position-indexed lookup of draws
 * @returns {Object} Layered diagnostic payload for the AI
 */
export function triageReading(analysis, drawMap) {
  const { portals, positions, aggregates, wheelWorldFields, correctionPairs, health, meta } = analysis;

  // ── L0: HORIZON BALANCE ──
  // Wheel (inner) vs World (outer) health across entire reading
  const l0 = computeHorizonBalance(drawMap, positions);

  // ── L1: PORTAL VITALS ──
  // Source(10) and Creation(21) — system-wide vital signs
  const l1 = {
    source: portals.wheel ? {
      visitor: portals.wheel.transientName,
      visitorClass: portals.wheel.transientClass,
      status: portals.wheel.statusName,
      channel: portals.wheel.channel,
      house: portals.wheel.house,
      isDistorted: portals.wheel.statusName !== 'Balanced'
    } : null,
    creation: portals.world ? {
      visitor: portals.world.transientName,
      visitorClass: portals.world.transientClass,
      status: portals.world.statusName,
      channel: portals.world.channel,
      house: portals.world.house,
      isDistorted: portals.world.statusName !== 'Balanced'
    } : null,
    frame: portals.frame
  };

  // ── L2: PROCESS CHECK ──
  // Compact overview of all 22 archetypes: name, status, visitor, distorted flag
  const l2 = buildProcessOverview(drawMap, positions);

  // ── L3: BOUND DIAGNOSIS ──
  // For each distorted process, examine its Floor and Ceiling
  // This is the WHY layer — Floor distortion = can't start right, Ceiling = can't complete
  const distortedProcesses = l2.processes.filter(p => p.isDistorted);
  const l3 = distortedProcesses.map(proc => buildBoundDiagnosis(proc.archetypeId, drawMap));

  // ── L4: MANIFEST READOUT ──
  // For each distorted process in manifest houses, what's actually collapsing into reality
  const manifestHouses = ['Spirit', 'Mind', 'Emotion', 'Body'];
  const l4 = distortedProcesses
    .filter(proc => manifestHouses.includes(proc.house))
    .map(proc => buildManifestReadout(proc.archetypeId, drawMap))
    .filter(m => m !== null);

  // ── L5: CORRECTION PATH ──
  // Auto-triggered for ALL distortions (Grok guardrail: always check correction)
  const l5 = distortedProcesses.map(proc => buildCorrectionPath(proc.archetypeId, drawMap));

  // ── TRIAGE SUMMARY ──
  const distortionCount = distortedProcesses.length;
  const severity = distortionCount === 0 ? 'integrated'
    : distortionCount <= 3 ? 'emerging'
    : distortionCount <= 7 ? 'developing'
    : distortionCount <= 14 ? 'active'
    : 'transforming';

  return {
    severity,
    healthScore: health.score,
    positionCount: meta.positionCount,
    isFullState: meta.isFullState,
    l0_horizon: l0,
    l1_portals: l1,
    l2_processes: l2,
    l3_bounds: l3,
    l4_manifests: l4,
    l5_corrections: l5,
    distortionCount,
    distortedArchetypes: distortedProcesses.map(p => p.name)
  };
}

// ── L0 HELPER: Horizon Balance ──
function computeHorizonBalance(drawMap, positions) {
  let wheelDistorted = 0, wheelTotal = 0;
  let worldDistorted = 0, worldTotal = 0;
  let consonant = 0, crossed = 0;

  for (const pos of positions) {
    const posMeta = getPositionMeta(pos.position);
    const posHorizon = posMeta.horizon || posMeta.parentHorizon;
    if (!posHorizon) continue;

    // Count distortions by horizon of the POSITION (durable)
    if (posHorizon === 'inner') {
      wheelTotal++;
      if (pos.statusName !== 'Balanced') wheelDistorted++;
    } else {
      worldTotal++;
      if (pos.statusName !== 'Balanced') worldDistorted++;
    }

    // Horizon consonance: does the visitor's horizon match the position's horizon?
    const visitorArchetype = resolvePosition(pos.transient);
    const visitorHorizon = INNER_OUTER_HORIZON[visitorArchetype];
    if (visitorHorizon && posHorizon) {
      if (visitorHorizon === posHorizon) consonant++;
      else crossed++;
    }
  }

  const totalPositions = wheelTotal + worldTotal;
  const wheelHealthRatio = wheelTotal > 0 ? 1 - (wheelDistorted / wheelTotal) : 1;
  const worldHealthRatio = worldTotal > 0 ? 1 - (worldDistorted / worldTotal) : 1;
  const consonanceRatio = (consonant + crossed) > 0 ? consonant / (consonant + crossed) : 0.5;

  // Determine orientation
  let orientation;
  const diff = Math.abs(wheelHealthRatio - worldHealthRatio);
  if (diff < 0.15) orientation = 'balanced';
  else if (wheelHealthRatio > worldHealthRatio) orientation = 'inner-healthy';
  else orientation = 'outer-healthy';

  // Only surface consonance when significantly skewed (council ruling)
  const consonanceSignificant = Math.abs(consonanceRatio - 0.5) > 0.15;

  return {
    wheel: { health: Math.round(wheelHealthRatio * 100) / 100, distorted: wheelDistorted, total: wheelTotal },
    world: { health: Math.round(worldHealthRatio * 100) / 100, distorted: worldDistorted, total: worldTotal },
    orientation,
    consonance: consonanceSignificant ? {
      ratio: Math.round(consonanceRatio * 100) / 100,
      consonant,
      crossed,
      meaning: consonanceRatio > 0.65 ? 'aligned' : 'cross-wired'
    } : null
  };
}

// ── L2 HELPER: Process Overview ──
function buildProcessOverview(drawMap, positions) {
  const processes = [];
  for (let archId = 0; archId < 22; archId++) {
    const draw = drawMap[archId];
    if (!draw) continue;

    const arch = ARCHETYPES[archId];
    const visitorSig = getSignature(draw.transient);
    const statusName = STATUSES[draw.status]?.name;
    const isSelfSeated = resolvePosition(draw.transient) === archId;

    processes.push({
      archetypeId: archId,
      name: arch.name,
      house: getHouse(archId),
      channel: arch.channel,
      horizon: INNER_OUTER_HORIZON[archId],
      visitor: visitorSig.name,
      visitorClass: visitorSig.class,
      visitorHorizon: INNER_OUTER_HORIZON[resolvePosition(draw.transient)],
      status: statusName,
      isDistorted: statusName !== 'Balanced',
      isSelfSeated,
      stage: arch.function,
      states: arch.states
    });
  }

  const byHouse = {};
  for (const proc of processes) {
    if (!byHouse[proc.house]) byHouse[proc.house] = { healthy: 0, distorted: 0, total: 0, processes: [] };
    byHouse[proc.house].processes.push(proc.name);
    byHouse[proc.house].total++;
    if (proc.isDistorted) byHouse[proc.house].distorted++;
    else byHouse[proc.house].healthy++;
  }

  // Channel aggregation — 4 channels × 4 archetypes each (Gestalt/Portal have null channel)
  const byChannel = {};
  for (const proc of processes) {
    if (!proc.channel) continue; // Skip Gestalt (0,1,19,20) and Portal (10,21)
    if (!byChannel[proc.channel]) byChannel[proc.channel] = { healthy: 0, distorted: 0, total: 0, processes: [], statuses: {} };
    byChannel[proc.channel].processes.push({ name: proc.name, house: proc.house, status: proc.status, archetypeId: proc.archetypeId });
    byChannel[proc.channel].total++;
    byChannel[proc.channel].statuses[proc.status] = (byChannel[proc.channel].statuses[proc.status] || 0) + 1;
    if (proc.isDistorted) byChannel[proc.channel].distorted++;
    else byChannel[proc.channel].healthy++;
  }

  // House strength flags — 3+ balanced in a 4-member house is significant
  const houseStrength = {};
  for (const [house, data] of Object.entries(byHouse)) {
    if (house === 'Portal') continue; // Portal only has 2 members
    const ratio = data.total > 0 ? data.healthy / data.total : 0;
    houseStrength[house] = {
      healthy: data.healthy,
      total: data.total,
      ratio,
      flag: data.healthy === data.total ? 'full'
        : data.healthy >= 3 ? 'strong'
        : data.healthy >= 2 ? 'partial'
        : data.healthy >= 1 ? 'anchored'
        : 'seeking'
    };
  }

  // Channel strength flags — same logic for channels
  const channelStrength = {};
  for (const [channel, data] of Object.entries(byChannel)) {
    const ratio = data.total > 0 ? data.healthy / data.total : 0;
    channelStrength[channel] = {
      healthy: data.healthy,
      total: data.total,
      ratio,
      flag: data.healthy === data.total ? 'full'
        : data.healthy >= 3 ? 'strong'
        : data.healthy >= 2 ? 'partial'
        : data.healthy >= 1 ? 'anchored'
        : 'seeking',
      dominantStatus: data.total > 0
        ? Object.entries(data.statuses).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null
    };
  }

  // Stage aggregation — 4 stages × 5 archetypes each (one per house, Portal excluded)
  const byStage = {};
  for (const proc of processes) {
    if (!proc.stage) continue; // Portal (10,21) have no stage
    if (!byStage[proc.stage]) byStage[proc.stage] = { healthy: 0, distorted: 0, total: 0, processes: [], statuses: {} };
    byStage[proc.stage].processes.push({ name: proc.name, house: proc.house, status: proc.status, archetypeId: proc.archetypeId });
    byStage[proc.stage].total++;
    byStage[proc.stage].statuses[proc.status] = (byStage[proc.stage].statuses[proc.status] || 0) + 1;
    if (proc.isDistorted) byStage[proc.stage].distorted++;
    else byStage[proc.stage].healthy++;
  }

  // Stage strength flags — 5 members per stage (one per house including Gestalt)
  const stageStrength = {};
  for (const [stage, data] of Object.entries(byStage)) {
    const ratio = data.total > 0 ? data.healthy / data.total : 0;
    stageStrength[stage] = {
      healthy: data.healthy,
      total: data.total,
      ratio,
      flag: data.healthy === data.total ? 'full'
        : data.healthy >= 4 ? 'strong'
        : data.healthy >= 3 ? 'partial'
        : data.healthy >= 1 ? 'anchored'
        : 'seeking',
      dominantStatus: data.total > 0
        ? Object.entries(data.statuses).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null
    };
  }

  return { processes, byHouse, byChannel, byStage, houseStrength, channelStrength, stageStrength };
}

// ── L3 HELPER: Bound Diagnosis ──
function buildBoundDiagnosis(archetypeId, drawMap) {
  const arch = ARCHETYPES[archetypeId];

  // Find this archetype's floor (inner bound) and ceiling (outer bound)
  let floor = null, ceiling = null;
  for (const [id, bound] of Object.entries(BOUNDS)) {
    if (bound.archetype === archetypeId) {
      const posId = Number(id);
      const draw = drawMap[posId];
      const detail = {
        positionId: posId,
        name: bound.name,
        channel: bound.channel,
        role: bound.horizon === 'inner' ? 'floor' : 'ceiling'
      };
      if (draw) {
        const visitorSig = getSignature(draw.transient);
        detail.visitor = visitorSig.name;
        detail.visitorClass = visitorSig.class;
        detail.visitorChannel = getChannel(draw.transient);
        detail.status = STATUSES[draw.status]?.name;
        detail.isDistorted = detail.status !== 'Balanced';
        // Channel tension: visitor channel vs position channel
        detail.channelTension = visitorSig.class !== 'archetype' ? null
          : (getChannel(draw.transient) !== bound.channel ? 'crossed' : 'aligned');
      }
      if (bound.horizon === 'inner') floor = detail;
      else ceiling = detail;
    }
  }

  // Determine the diagnostic pattern
  const floorDistorted = floor?.isDistorted || false;
  const ceilingDistorted = ceiling?.isDistorted || false;
  let pattern;
  if (floorDistorted && ceilingDistorted) pattern = 'range-compromised';
  else if (floorDistorted) pattern = 'foundation-off';
  else if (ceilingDistorted) pattern = 'completion-stuck';
  else pattern = 'range-healthy';

  return {
    archetypeId,
    name: arch.name,
    house: getHouse(archetypeId),
    pattern,
    floor,
    ceiling
  };
}

// ── L4 HELPER: Manifest Readout ──
function buildManifestReadout(archetypeId, drawMap) {
  // Find this archetype's agent
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (agent.archetype === archetypeId) {
      const posId = Number(id);
      const draw = drawMap[posId];
      if (!draw) return null;

      const visitorSig = getSignature(draw.transient);
      return {
        archetypeId,
        archetypeName: ARCHETYPES[archetypeId].name,
        agentId: posId,
        agentName: agent.name,
        channel: agent.channel,
        visitor: visitorSig.name,
        visitorClass: visitorSig.class,
        status: STATUSES[draw.status]?.name,
        isDistorted: STATUSES[draw.status]?.name !== 'Balanced',
        house: getHouse(archetypeId)
      };
    }
  }
  return null;
}

// ── L5 HELPER: Correction Path ──
function buildCorrectionPath(archetypeId, drawMap) {
  const arch = ARCHETYPES[archetypeId];
  const partnerId = VERTICAL_PAIRS[archetypeId];
  const partner = ARCHETYPES[partnerId];
  if (!partner) return { archetypeId, name: arch.name, partner: null };

  const partnerDraw = drawMap[partnerId];

  // Partner's process-level state
  const partnerState = partnerDraw ? {
    visitor: getSignature(partnerDraw.transient).name,
    visitorClass: getSignature(partnerDraw.transient).class,
    status: STATUSES[partnerDraw.status]?.name,
    isDistorted: STATUSES[partnerDraw.status]?.name !== 'Balanced',
    isSelfSeated: resolvePosition(partnerDraw.transient) === partnerId
  } : null;

  // Bound chain: this archetype's ceiling → partner's floor
  let ceilingToFloor = null;
  let thisCeiling = null, partnerFloor = null;

  for (const [id, bound] of Object.entries(BOUNDS)) {
    if (bound.archetype === archetypeId && bound.horizon === 'outer') {
      thisCeiling = { posId: Number(id), name: bound.name, channel: bound.channel };
      const draw = drawMap[Number(id)];
      if (draw) {
        thisCeiling.status = STATUSES[draw.status]?.name;
        thisCeiling.isDistorted = thisCeiling.status !== 'Balanced';
      }
    }
    if (bound.archetype === partnerId && bound.horizon === 'inner') {
      partnerFloor = { posId: Number(id), name: bound.name, channel: bound.channel };
      const draw = drawMap[Number(id)];
      if (draw) {
        partnerFloor.status = STATUSES[draw.status]?.name;
        partnerFloor.isDistorted = partnerFloor.status !== 'Balanced';
      }
    }
  }

  if (thisCeiling && partnerFloor) {
    const channelCrossing = thisCeiling.channel + ' → ' + partnerFloor.channel;
    const pathBlocked = (thisCeiling.isDistorted && partnerFloor.isDistorted);
    ceilingToFloor = {
      from: thisCeiling,
      to: partnerFloor,
      channelCrossing,
      pathBlocked,
      pathStatus: pathBlocked ? 'blocked' : (thisCeiling.isDistorted || partnerFloor.isDistorted) ? 'partial' : 'open'
    };
  }

  return {
    archetypeId,
    name: arch.name,
    partnerId,
    partnerName: partner.name,
    partnerHorizon: INNER_OUTER_HORIZON[partnerId],
    partnerState,
    boundChain: ceilingToFloor,
    correctionAvailable: partnerState ? !partnerState.isDistorted : null
  };
}

/**
 * Generate a draw and analyze it.
 * @param {Function} generateSpreadFn - spread generator (from utils.js)
 * @param {number} [count=22] - 22 for archetype-only, 78 for full state
 */
export function generateAndAnalyze(generateSpreadFn, count = 22) {
  const draws = generateSpreadFn(count);
  return {
    draws,
    analysis: analyzeFullMap(draws)
  };
}
