// === DIAGNOSTIC TOOLS: AI-INITIATED INVESTIGATION ===
// Phase 3b: Tool definitions + handlers for Anthropic tool_use API
//
// Architecture: The AI receives a triage seed (L0-L2, ~400-500 tokens)
// and 7 diagnostic instruments. It builds its own case by calling tools
// as needed. Each tool description encodes WHEN and WHY to use it —
// the descriptions ARE the AI's diagnostic education.
//
// Council ruling (March 20, 2026):
//   - Deterministic L0-L5 first pass, then tool-use for deeper investigation
//   - Grok guardrail: always auto-check correction path for distortions
//   - Gemini concern: machine does physics, AI does empathy — tools return
//     structural data, AI does the interpretation
//   - GPT framing: "MRI, not conversation" — complete state render
//
// These tools read from cached analysis. No new computation per call.

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import {
  HOUSES,
  STATUSES,
  INNER_OUTER_HORIZON
} from './constants.js';
import {
  VERTICAL_PAIRS,
  getArchetypeCorrection,
  getBoundCorrection,
  getAgentCorrection
} from './corrections.js';
import { getGestaltCondition } from './gestaltConditions.js';
import { getAllHouseConditions } from './houseConditions.js';

// ─────────────────────────────────────────────
// TOOL DEFINITIONS (Anthropic tool_use format)
// ─────────────────────────────────────────────
// Each description teaches the AI WHEN and WHY to use the tool.
// The tool descriptions are the AI's medical education.

export const DIAGNOSTIC_TOOL_DEFINITIONS = [
  {
    name: 'getHorizonBalance',
    description: `Retrieve the Wheel (inner) vs World (outer) health balance across the entire reading. Use this only if the triage seed's horizon data warrants deeper investigation — significant skew between inner and outer health, or to check consonance patterns. A healthy inner with distorted outer = "knows who they are but can't act on it." The reverse = "taking action without knowing why." Also reports horizon consonance — whether visitors land in matching or crossing horizons. This is an orientation tool, not an investigation tool — use it to frame your findings, not to generate them.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getPortalState',
    description: `Deep dive into Source (The Wheel) and Creation (The World) — the two system-wide vital signs. Use this when either portal shows distortion in the triage seed. Source = where everything comes from (identity, return to center). Creation = where everything goes (purpose, manifestation). Both distorted = the system is running without anchors. This is a vital sign check — use it early to understand whether the system's foundation is sound before tracing individual chains.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getProcessDetail',
    description: `CHAIN STEP 1: Examine a single archetype (process) in detail. This is your FIRST tool call for any distortion you want to investigate. It tells you WHO is visiting this position — what signature class the visitor belongs to (archetype/bound/agent), what status they carry, whether they're self-seated, and the archetype's balanced and distorted state descriptions. The visitor's CLASS matters enormously: an archetype visiting means a whole process is displaced here; a bound visiting means a constraint has landed in the wrong place; an agent visiting means a collapse point is expressing through a foreign domain. Also returns the REBALANCING TARGET — the status-aware correction partner and what type of correction is indicated (growth/diagonal/vertical/reduction). This gives you the medicine up front. Also returns trace loop membership — is this process part of a larger circulation pattern? After this, your next call should be getBoundDiagnosis on the SAME archetype to understand WHY it's distorted.`,
    input_schema: {
      type: 'object',
      properties: {
        archetypeId: {
          type: 'integer',
          description: 'The archetype position ID (0-21). Use the ID from the L2 process overview.',
          minimum: 0,
          maximum: 21
        }
      },
      required: ['archetypeId']
    }
  },
  {
    name: 'getBoundDiagnosis',
    description: `CHAIN STEP 2: Examine the Floor (lower bound) and Ceiling (upper bound) of a specific archetype — this is the WHY layer. Call this AFTER getProcessDetail on the same archetype. The Floor is the seed condition — where the process begins. The Ceiling is the completion threshold — where it peaks. Four diagnostic patterns: "foundation-off" (Floor distorted = process can't start right), "completion-stuck" (Ceiling distorted = can't complete or release), "range-compromised" (both distorted = entire operating range broken), "range-healthy" (bounds fine, so it's a volume problem not plumbing). Pay attention to WHO is visiting each bound — a bound visited by an agent means manifestation energy is stuck at a constraint; a bound visited by another bound means two constraints are tangled. Channel tension (visitor channel vs bound channel) reveals elemental friction at the boundary. Distorted bounds include their own REBALANCING target — the bound-level correction partner with polarity flip, telling you exactly where the boundary energy wants to go. After this, call getCorrectionPath on the SAME archetype.`,
    input_schema: {
      type: 'object',
      properties: {
        archetypeId: {
          type: 'integer',
          description: 'The archetype position ID (0-21) to diagnose bounds for.',
          minimum: 0,
          maximum: 21
        }
      },
      required: ['archetypeId']
    }
  },
  {
    name: 'getManifestReadout',
    description: `CHAIN EXTENSION: Check what's actually collapsing into observable reality at a specific archetype's agent position. Use this AFTER tracing the main chain (process → bounds → correction) when you want to see what's SHOWING UP in lived experience. Only available for manifest houses (Spirit, Mind, Emotion, Body) — Gestalt can't collapse itself, Portals aren't measurement positions. The agent is where the wave collapses into something observable. If the agent is distorted, the manifestation is visibly skewed. Pay attention to the visitor class at the agent position — it tells you what KIND of energy is showing up in reality.`,
    input_schema: {
      type: 'object',
      properties: {
        archetypeId: {
          type: 'integer',
          description: 'The archetype position ID (0-21). Must be in Spirit, Mind, Emotion, or Body house.',
          minimum: 0,
          maximum: 21
        }
      },
      required: ['archetypeId']
    }
  },
  {
    name: 'getCorrectionPath',
    description: `CHAIN STEP 3 — THE MEDICINE: Get the status-aware rebalancing prescription AND the vertical correction geometry. Call this AFTER getBoundDiagnosis on the same archetype — this completes the derivation chain. Returns TWO things: (1) THE REBALANCING PRESCRIPTION — based on the distortion type: Too Much → diagonal partner (the antidote is the opposite quality), Too Little → vertical partner (draw from what you lack), Unacknowledged → reduction pair (integrate what's hidden), Balanced → growth partner (explore the complement). The rebalancing target may differ from the vertical partner — diagonal and reduction corrections cross differently. (2) THE BOUND CHAIN — ceiling→floor channel crossing between this archetype and its vertical partner. Path "open"/"blocked"/"partial" tells you if correction energy can flow. Also reports whether the rebalancing target itself is healthy or distorted — if the medicine is also sick, that's the deeper knot. This is the most important tool call in the chain — it tells the person WHERE TO GO from here.`,
    input_schema: {
      type: 'object',
      properties: {
        archetypeId: {
          type: 'integer',
          description: 'The archetype position ID (0-21) to trace correction path for.',
          minimum: 0,
          maximum: 21
        }
      },
      required: ['archetypeId']
    }
  },
  {
    name: 'getHouseHealth',
    description: `SUMMARY TOOL (use AFTER tracing individual chains, not before). Get a complete health overview of an entire house — all archetypes, bounds, agents, and the house's two fundamental nodes. Use this only AFTER you've traced at least one derivation chain and want to confirm whether a pattern is house-wide or isolated. Do NOT use this as your first investigation tool — it gives breadth at the cost of the depth that makes 78-position readings valuable. Returns per-archetype status, node health, and the house command: Gestalt="Fulfill Your Destiny", Spirit="Witness Creation", Mind="Channel The Force", Emotion="Free Will", Body="Uphold The Law".`,
    input_schema: {
      type: 'object',
      properties: {
        houseName: {
          type: 'string',
          description: 'The house name: "Gestalt", "Spirit", "Mind", "Emotion", or "Body".',
          enum: ['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body']
        }
      },
      required: ['houseName']
    }
  }
];

// ─────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────
// Each handler reads from the cached analysis + drawMap.
// No new computation — everything was pre-computed by
// analyzeFullMap() + triageReading().

/**
 * Dispatch a tool call to its handler.
 * @param {string} toolName - One of the 7 diagnostic tool names
 * @param {Object} toolInput - The input parameters from the AI's tool call
 * @param {Object} context - { analysis, triage, drawMap } — cached data
 * @returns {Object} The tool result
 */
export function handleToolCall(toolName, toolInput, context) {
  const { analysis, triage, drawMap } = context;

  switch (toolName) {
    case 'getHorizonBalance':
      return handleGetHorizonBalance(triage);

    case 'getPortalState':
      return handleGetPortalState(triage, analysis);

    case 'getProcessDetail':
      return handleGetProcessDetail(toolInput.archetypeId, drawMap, analysis);

    case 'getBoundDiagnosis':
      return handleGetBoundDiagnosis(toolInput.archetypeId, triage, drawMap);

    case 'getManifestReadout':
      return handleGetManifestReadout(toolInput.archetypeId, triage, drawMap);

    case 'getCorrectionPath':
      return handleGetCorrectionPath(toolInput.archetypeId, triage, drawMap);

    case 'getHouseHealth':
      return handleGetHouseHealth(toolInput.houseName, drawMap, analysis, triage);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Handler: getHorizonBalance ──
function handleGetHorizonBalance(triage) {
  return triage.l0_horizon;
}

// ── Handler: getPortalState ──
function handleGetPortalState(triage, analysis) {
  const portals = triage.l1_portals;
  // Enrich with trace loop info if either portal is in a loop
  const portalLoops = [];
  if (analysis.traces?.loops) {
    for (const loop of analysis.traces.loops) {
      if (loop.positions.includes(10) || loop.positions.includes(21)) {
        portalLoops.push({
          positions: loop.positionNames,
          shape: loop.shape,
          size: loop.size,
          involvesSource: loop.positions.includes(10),
          involvesCreation: loop.positions.includes(21)
        });
      }
    }
  }

  return {
    ...portals,
    portalLoops: portalLoops.length > 0 ? portalLoops : null
  };
}

// ── Handler: getProcessDetail ──
function handleGetProcessDetail(archetypeId, drawMap, analysis) {
  const arch = ARCHETYPES[archetypeId];
  if (!arch) return { error: `Invalid archetype ID: ${archetypeId}` };

  const draw = drawMap[archetypeId];
  if (!draw) return { error: `No draw data for archetype ${archetypeId}` };

  const visitorId = draw.transient;
  const visitorSig = getSignatureInfo(visitorId);
  const statusName = STATUSES[draw.status]?.name;

  // Find which trace loop this archetype belongs to
  let traceLoop = null;
  if (analysis.traces?.loops) {
    for (const loop of analysis.traces.loops) {
      if (loop.positions.includes(archetypeId)) {
        traceLoop = {
          positions: loop.positionNames,
          shape: loop.shape,
          size: loop.size,
          isCrossLayer: loop.isCrossLayer,
          statusSummary: loop.statusSummary
        };
        break;
      }
    }
  }

  // Governance relationships
  const gov = analysis.governance?.details?.[archetypeId] || null;

  // Rebalancing target — the medicine for this position
  const rebalancing = buildArchetypeRebalancing(archetypeId, draw.status);

  return {
    archetypeId,
    name: arch.name,
    house: getHouseForArchetype(archetypeId),
    channel: arch.channel,
    horizon: INNER_OUTER_HORIZON[archetypeId],
    function: arch.function,
    states: arch.states,
    visitor: {
      id: visitorId,
      name: visitorSig.name,
      class: visitorSig.class,
      channel: visitorSig.channel,
      horizon: visitorSig.horizon
    },
    status: statusName,
    isDistorted: statusName !== 'Balanced',
    isSelfSeated: resolveArchetypePosition(visitorId) === archetypeId,
    rebalancing,
    traceLoop,
    governance: gov ? {
      governor: gov.governorName,
      governorStatus: gov.governorStatusName,
      isGovernorDistorted: gov.isGovernorDistorted,
      governorInHouse: gov.governorInHouse
    } : null
  };
}

// ── Handler: getBoundDiagnosis ──
function handleGetBoundDiagnosis(archetypeId, triage, drawMap) {
  // Check if we have a pre-computed diagnosis in L3
  const existing = triage.l3_bounds?.find(b => b.archetypeId === archetypeId);
  if (existing) {
    // Enrich pre-computed data with bound-level rebalancing
    const enriched = { ...existing };
    if (enriched.floor && enriched.floor.isDistorted && enriched.floor.positionId != null) {
      const floorDraw = drawMap[enriched.floor.positionId];
      if (floorDraw) {
        enriched.floor = { ...enriched.floor, rebalancing: buildBoundRebalancing(enriched.floor.positionId, floorDraw.status) };
      }
    }
    if (enriched.ceiling && enriched.ceiling.isDistorted && enriched.ceiling.positionId != null) {
      const ceilingDraw = drawMap[enriched.ceiling.positionId];
      if (ceilingDraw) {
        enriched.ceiling = { ...enriched.ceiling, rebalancing: buildBoundRebalancing(enriched.ceiling.positionId, ceilingDraw.status) };
      }
    }
    return enriched;
  }

  // Compute on-demand (for archetypes the AI investigates beyond the auto-triaged set)
  return computeBoundDiagnosis(archetypeId, drawMap);
}

// ── Handler: getManifestReadout ──
function handleGetManifestReadout(archetypeId, triage, drawMap) {
  const house = getHouseForArchetype(archetypeId);
  const manifestHouses = ['Spirit', 'Mind', 'Emotion', 'Body'];

  if (!manifestHouses.includes(house)) {
    return {
      archetypeId,
      name: ARCHETYPES[archetypeId]?.name,
      house,
      available: false,
      reason: house === 'Gestalt'
        ? 'Gestalt is the observer — it cannot collapse itself into manifestation.'
        : 'Portal positions are thresholds, not measurement positions. They have no agent.'
    };
  }

  // Check if we have a pre-computed readout in L4
  const existing = triage.l4_manifests?.find(m => m.archetypeId === archetypeId);
  if (existing) return { ...existing, available: true };

  // Compute on-demand
  return computeManifestReadout(archetypeId, drawMap);
}

// ── Handler: getCorrectionPath ──
function handleGetCorrectionPath(archetypeId, triage, drawMap) {
  // Check if we have a pre-computed correction in L5
  const existing = triage.l5_corrections?.find(c => c.archetypeId === archetypeId);
  if (existing) {
    // Enrich pre-computed data with status-aware rebalancing (L5 only has vertical pair)
    const draw = drawMap[archetypeId];
    if (draw) {
      const statusName = STATUSES[draw.status]?.name;
      const rebalancing = buildArchetypeRebalancing(archetypeId, draw.status);

      // Check rebalancing target state if it differs from vertical partner
      let rebalancingTargetState = null;
      if (rebalancing && !rebalancing.isSelf && rebalancing.targetId !== existing.partnerId) {
        const targetDraw = drawMap[rebalancing.targetId];
        if (targetDraw) {
          rebalancingTargetState = {
            visitor: getSignatureInfo(targetDraw.transient).name,
            visitorClass: getSignatureInfo(targetDraw.transient).class,
            status: STATUSES[targetDraw.status]?.name,
            isDistorted: STATUSES[targetDraw.status]?.name !== 'Balanced',
            isSelfSeated: resolveArchetypePosition(targetDraw.transient) === rebalancing.targetId
          };
        }
      }

      return { ...existing, status: statusName, rebalancing, rebalancingTargetState };
    }
    return existing;
  }

  // Compute on-demand
  return computeCorrectionPath(archetypeId, drawMap);
}

// ── Handler: getHouseHealth ──
function handleGetHouseHealth(houseName, drawMap, analysis, triage) {
  const house = HOUSES[houseName];
  if (!house) return { error: `Unknown house: ${houseName}` };

  const commands = {
    Gestalt: 'Fulfill Your Destiny',
    Spirit: 'Witness Creation',
    Mind: 'Channel The Force',
    Emotion: 'Free Will',
    Body: 'Uphold The Law'
  };

  const tools = {
    Gestalt: 'THE WRITER',
    Spirit: 'THE READER',
    Mind: 'THE PRESENCE',
    Emotion: 'THE VERBING',
    Body: 'THE MAP'
  };

  // Collect all archetypes in this house
  const members = house.members;
  const archetypeStates = members.map(archId => {
    const arch = ARCHETYPES[archId];
    const draw = drawMap[archId];
    if (!draw) return { archetypeId: archId, name: arch?.name, noData: true };

    const visitorSig = getSignatureInfo(draw.transient);
    const statusName = STATUSES[draw.status]?.name;

    return {
      archetypeId: archId,
      name: arch.name,
      channel: arch.channel,
      horizon: INNER_OUTER_HORIZON[archId],
      function: arch.function,
      visitor: visitorSig.name,
      visitorClass: visitorSig.class,
      status: statusName,
      isDistorted: statusName !== 'Balanced',
      isSelfSeated: resolveArchetypePosition(draw.transient) === archId
    };
  });

  // Build node health (each house has 2 nodes = 2 vertical pairs)
  const nodes = [];
  const seen = new Set();
  for (const archId of members) {
    if (seen.has(archId)) continue;
    const partnerId = VERTICAL_PAIRS[archId];
    if (partnerId !== undefined && members.includes(partnerId)) {
      // This is a vertical pair within the house — but only if partner is also in the house
      // Portal positions (10, 21) pair across houses
    }
    // Check if the vertical partner is in the same house
    if (partnerId !== undefined && !seen.has(partnerId)) {
      const partnerInHouse = members.includes(partnerId);
      if (partnerInHouse) {
        seen.add(archId);
        seen.add(partnerId);

        const innerArch = INNER_OUTER_HORIZON[archId] === 'inner' ? archId : partnerId;
        const outerArch = INNER_OUTER_HORIZON[archId] === 'outer' ? archId : partnerId;

        const innerState = archetypeStates.find(a => a.archetypeId === innerArch);
        const outerState = archetypeStates.find(a => a.archetypeId === outerArch);

        // Diagonal encoding: inner + outer archetype IDs
        const diagA = innerArch + outerArch; // Should approach 19 or 21

        nodes.push({
          innerArchetype: innerState,
          outerArchetype: outerState,
          diagonalSum: innerArch + (members.length > 2 ? outerArch : 0),
          nodeHealth: (!innerState?.isDistorted && !outerState?.isDistorted) ? 'healthy'
            : (innerState?.isDistorted && outerState?.isDistorted) ? 'both-distorted'
            : 'partial'
        });
      }
    }
  }

  // Bound health summary for the house
  const boundStatus = { floorsDistorted: 0, ceilingsDistorted: 0, total: 0 };
  for (const archId of members) {
    for (const [id, bound] of Object.entries(BOUNDS)) {
      if (bound.archetype === archId) {
        boundStatus.total++;
        const draw = drawMap[Number(id)];
        if (draw && STATUSES[draw.status]?.name !== 'Balanced') {
          if (bound.horizon === 'inner') boundStatus.floorsDistorted++;
          else boundStatus.ceilingsDistorted++;
        }
      }
    }
  }

  // Agent health summary (manifest houses only)
  const manifestHouses = ['Spirit', 'Mind', 'Emotion', 'Body'];
  let agentStatus = null;
  if (manifestHouses.includes(houseName)) {
    agentStatus = { distorted: 0, total: 0 };
    for (const archId of members) {
      for (const [id, agent] of Object.entries(AGENTS)) {
        if (agent.archetype === archId) {
          agentStatus.total++;
          const draw = drawMap[Number(id)];
          if (draw && STATUSES[draw.status]?.name !== 'Balanced') {
            agentStatus.distorted++;
          }
        }
      }
    }
  }

  const distortedCount = archetypeStates.filter(a => a.isDistorted).length;

  return {
    houseName,
    command: commands[houseName],
    tool: tools[houseName],
    memberCount: members.length,
    archetypes: archetypeStates,
    nodes,
    bounds: boundStatus,
    agents: agentStatus,
    overallHealth: distortedCount === 0 ? 'healthy'
      : distortedCount === members.length ? 'fully-distorted'
      : 'partial',
    distortedCount,
    healthyCount: members.length - distortedCount
  };
}

// ─────────────────────────────────────────────
// TRIAGE SEED BUILDER
// ─────────────────────────────────────────────
// Builds the compact L0-L2 seed that primes the AI before it uses tools.
// Target: ~400-500 tokens. Enough to orient, not enough to overwhelm.

export function buildTriageSeed(triage, drawMap) {
  const { severity, healthScore, positionCount, l0_horizon, l1_portals, l2_processes } = triage;

  const lines = [];

  lines.push('=== 78-POSITION DIAGNOSTIC SEED ===');
  lines.push(`Overall: ${severity} (health: ${healthScore}/100, ${triage.distortionCount} of 22 processes distorted)`);
  lines.push('');

  // L0: Horizon
  lines.push(`HORIZON BALANCE: ${l0_horizon.orientation}`);
  lines.push(`  Wheel (inner): ${Math.round(l0_horizon.wheel.health * 100)}% healthy (${l0_horizon.wheel.distorted}/${l0_horizon.wheel.total} distorted)`);
  lines.push(`  World (outer): ${Math.round(l0_horizon.world.health * 100)}% healthy (${l0_horizon.world.distorted}/${l0_horizon.world.total} distorted)`);
  if (l0_horizon.consonance) {
    lines.push(`  Consonance: ${l0_horizon.consonance.meaning} (${Math.round(l0_horizon.consonance.ratio * 100)}% — visitors ${l0_horizon.consonance.meaning === 'aligned' ? 'landing in matching horizons' : 'crossing between horizons'})`);
  }
  lines.push('');

  // L1: Portals
  lines.push('PORTAL VITALS:');
  if (l1_portals.source) {
    const s = l1_portals.source;
    lines.push(`  Source (Wheel): ${s.visitor} [${s.visitorClass}] — ${s.status}${s.isDistorted ? ' ⚠' : ''}`);
  }
  if (l1_portals.creation) {
    const c = l1_portals.creation;
    lines.push(`  Creation (World): ${c.visitor} [${c.visitorClass}] — ${c.status}${c.isDistorted ? ' ⚠' : ''}`);
  }
  lines.push('');

  // L2: Process overview — compact
  lines.push('PROCESS OVERVIEW (22 archetypes):');
  const distorted = l2_processes.processes.filter(p => p.isDistorted);
  const healthy = l2_processes.processes.filter(p => !p.isDistorted);

  if (distorted.length > 0) {
    lines.push('  Distorted:');
    for (const p of distorted) {
      lines.push(`    ${p.name} (${p.house}/${p.channel}) ← ${p.visitor} [${p.visitorClass}] — ${p.status}`);
    }
  }
  lines.push(`  Healthy: ${healthy.map(p => p.name).join(', ')}`);
  lines.push('');

  // House rollup
  lines.push('  By house:');
  for (const [house, data] of Object.entries(l2_processes.byHouse)) {
    const strength = l2_processes.houseStrength?.[house];
    const flag = strength?.flag === 'full' ? ' ★ FULL'
      : strength?.flag === 'strong' ? ' ◆ STRONG'
      : '';
    lines.push(`    ${house}: ${data.healthy} healthy, ${data.distorted} distorted${flag}`);
  }
  lines.push('');

  // Channel rollup — elemental designator health
  if (l2_processes.byChannel && Object.keys(l2_processes.byChannel).length > 0) {
    lines.push('  By channel (4 elements × 4 archetypes, cross-house):');
    for (const [channel, data] of Object.entries(l2_processes.byChannel)) {
      const strength = l2_processes.channelStrength?.[channel];
      const flag = strength?.flag === 'full' ? ' ★ FULL'
        : strength?.flag === 'strong' ? ' ◆ STRONG'
        : strength?.flag === 'seeking' ? ' ▼ SEEKING'
        : '';
      lines.push(`    ${channel}: ${data.healthy}/${data.total} healthy${flag}${data.distorted > 0 ? ` (${Object.entries(data.statuses).filter(([k]) => k !== 'Balanced').map(([k, v]) => `${v} ${k}`).join(', ')})` : ''}`);
    }
    lines.push('');
  }

  // Stage rollup — 4 stages × 5 archetypes (one per house including Gestalt)
  if (l2_processes.byStage && Object.keys(l2_processes.byStage).length > 0) {
    lines.push('  By stage (4 stages × 5 archetypes, cross-house):');
    for (const stage of ['Seed', 'Medium', 'Fruition', 'Feedback']) {
      const data = l2_processes.byStage[stage];
      if (!data) continue;
      const strength = l2_processes.stageStrength?.[stage];
      const flag = strength?.flag === 'full' ? ' ★ FULL'
        : strength?.flag === 'strong' ? ' ◆ STRONG'
        : strength?.flag === 'seeking' ? ' ▼ SEEKING'
        : '';
      lines.push(`    ${stage}: ${data.healthy}/${data.total} healthy${flag}${data.distorted > 0 ? ` (${Object.entries(data.statuses).filter(([k]) => k !== 'Balanced').map(([k, v]) => `${v} ${k}`).join(', ')})` : ''}`);
    }
    lines.push('');
  }

  // ── HOUSE CONDITIONS (named states) ──
  // Five diagnostic words — one compound name per house — capturing the full character
  if (drawMap) {
    const gc = getGestaltCondition(drawMap);
    const hc = getAllHouseConditions(drawMap);
    lines.push('HOUSE CONDITIONS (named diagnostic states):');
    lines.push(`  Gestalt: ${gc.name} (${gc.capacity}, ${gc.character})`);
    for (const [house, cond] of Object.entries(hc)) {
      if (cond) {
        lines.push(`  ${house}: ${cond.name} (${cond.capacity}, ${cond.character})`);
      }
    }
    lines.push('');
  }

  // ── PRE-COMPUTED RED FLAGS ──
  // Surface critical findings from L3-L5 so the AI starts with the blood test results.
  // Prioritized and capped — the AI needs the top findings, not an exhaustive list.
  const redFlags = [];

  // Priority 1: Both portals distorted (system-wide anchor missing)
  if (l1_portals.source?.isDistorted && l1_portals.creation?.isDistorted) {
    redFlags.push('BOTH PORTALS DISTORTED: Source AND Creation compromised. System running without anchors.');
  }

  // Priority 2: Range-compromised bounds (both floor AND ceiling = whole pipe bent)
  const rangeCompromised = triage.l3_bounds?.filter(b => b.pattern === 'range-compromised') || [];
  for (const rc of rangeCompromised) {
    redFlags.push(`RANGE-COMPROMISED: ${rc.name} (${rc.house}) — both floor and ceiling distorted.`);
  }

  // Priority 3: Blocked correction paths with mutual distortion (the worst knots)
  // Deduplicate pairs — only show A↔B once, not A↔B and B↔A
  const seenPairs = new Set();
  const blockedMutual = (triage.l5_corrections || []).filter(c => {
    if (!c.partnerState?.isDistorted) return false;
    const pairKey = [Math.min(c.archetypeId, c.partnerId), Math.max(c.archetypeId, c.partnerId)].join('-');
    if (seenPairs.has(pairKey)) return false;
    seenPairs.add(pairKey);
    return true;
  });

  for (const bm of blockedMutual) {
    const chainStatus = bm.boundChain?.pathStatus;
    if (chainStatus === 'blocked') {
      redFlags.push(`LOCKED KNOT: ${bm.name} ↔ ${bm.partnerName} — mutual distortion + blocked bound chain. No self-correction available.`);
    } else {
      redFlags.push(`MUTUAL DISTORTION: ${bm.name} ↔ ${bm.partnerName} — both partners distorted. Correction path: ${chainStatus || 'unknown'}.`);
    }
  }

  // Cap at 8 flags — beyond that the AI has enough to work with
  const cappedFlags = redFlags.slice(0, 8);
  const overflow = redFlags.length - cappedFlags.length;

  if (cappedFlags.length > 0) {
    lines.push('RED FLAGS (from L3-L5 — most critical findings):');
    for (const flag of cappedFlags) {
      lines.push(`  ⚠ ${flag}`);
    }
    if (overflow > 0) {
      lines.push(`  ... and ${overflow} more. Use tools to investigate further.`);
    }
    lines.push('');
  }

  // ── PRE-COMPUTED GREEN FLAGS ──
  // Genuine health is not the absence of distortion — it's specific strength
  const greenFlags = [];

  // Self-seated balanced processes (the strongest signal of health)
  const selfSeatedBalanced = healthy.filter(p => p.isSelfSeated);
  if (selfSeatedBalanced.length > 0) {
    greenFlags.push(`SELF-SEATED & BALANCED: ${selfSeatedBalanced.map(p => p.name).join(', ')} — these processes are home and healthy. Genuine strength.`);
  }

  // Healthy bounds on healthy processes (range-healthy = solid operating range)
  const rangeHealthy = triage.l3_bounds?.filter(b => b.pattern === 'range-healthy') || [];
  // These are bounds on DISTORTED processes that are healthy — interesting but different.
  // For green flags, we want healthy processes whose bounds are ALSO healthy (if we computed them).
  // Since L3 only computes for distorted processes, we check if healthy processes have any
  // range-compromised neighbors via the corrections data
  const healthyWithOpenCorrection = (triage.l5_corrections || []).filter(c =>
    c.correctionAvailable && c.boundChain?.pathStatus === 'open'
  );
  if (healthyWithOpenCorrection.length > 0 && healthyWithOpenCorrection.length <= 4) {
    greenFlags.push(`OPEN CORRECTION CHANNELS: ${healthyWithOpenCorrection.map(c => c.name + ' → ' + c.partnerName).join(', ')} — correction energy flowing freely.`);
  } else if (healthyWithOpenCorrection.length > 4) {
    greenFlags.push(`OPEN CORRECTION CHANNELS: ${healthyWithOpenCorrection.length} paths flowing freely — strong self-correction capacity.`);
  }

  // House strength flags (3+ or all balanced)
  if (l2_processes.houseStrength) {
    for (const [house, strength] of Object.entries(l2_processes.houseStrength)) {
      if (strength.flag === 'full') {
        greenFlags.push(`HOUSE FULLY HEALTHY: ${house} — all ${strength.healthy} processes balanced. This domain is integrated.`);
      } else if (strength.flag === 'strong') {
        greenFlags.push(`HOUSE STRONG: ${house} — ${strength.healthy}/${strength.total} balanced. Substantial foundation in this domain.`);
      }
    }
  }

  // Channel strength flags (3+ or all balanced — elemental coherence)
  if (l2_processes.channelStrength) {
    for (const [channel, strength] of Object.entries(l2_processes.channelStrength)) {
      if (strength.flag === 'full') {
        greenFlags.push(`CHANNEL FULLY HEALTHY: ${channel} — all 4 processes balanced across all houses. Elemental coherence.`);
      } else if (strength.flag === 'strong') {
        greenFlags.push(`CHANNEL STRONG: ${channel} — ${strength.healthy}/4 balanced across houses. This element flows well.`);
      }
    }
  }

  // Stage strength flags (4+ or all balanced — developmental coherence)
  if (l2_processes.stageStrength) {
    for (const [stage, strength] of Object.entries(l2_processes.stageStrength)) {
      if (strength.flag === 'full') {
        greenFlags.push(`STAGE FULLY HEALTHY: ${stage} — all 5 processes balanced across all houses. Developmental coherence at this phase.`);
      } else if (strength.flag === 'strong') {
        greenFlags.push(`STAGE STRONG: ${stage} — ${strength.healthy}/5 balanced across houses. This developmental phase flows well.`);
      }
    }
  }

  const cappedGreen = greenFlags.slice(0, 5);
  if (cappedGreen.length > 0) {
    lines.push('GREEN FLAGS (genuine strengths):');
    for (const flag of cappedGreen) {
      lines.push(`  ✓ ${flag}`);
    }
    lines.push('');
  }

  // Investigation nudge
  lines.push('INVESTIGATION GUIDE:');
  lines.push('  Trace the full chain for distortions relevant to the question:');
  lines.push('  getProcessDetail → getBoundDiagnosis → getCorrectionPath (on the SAME archetype)');
  if (redFlags.length > 0) {
    lines.push('  Start with the red flags above — these are the most structurally significant findings.');
  }
  lines.push('  Depth over breadth. 1-3 fully-traced chains > 5 surface scans.');

  return lines.join('\n');
}

// ─────────────────────────────────────────────
// INTERNAL HELPERS (duplicated from mapAnalysis
// to keep this module self-contained — these
// are lightweight lookups, not computation)
// ─────────────────────────────────────────────

function resolveArchetypePosition(signatureId) {
  if (signatureId < 22) return signatureId;
  if (signatureId < 62) return BOUNDS[signatureId]?.archetype;
  return AGENTS[signatureId]?.archetype;
}

function getSignatureInfo(id) {
  if (id < 22) {
    const a = ARCHETYPES[id];
    return { name: a?.name, class: 'archetype', channel: a?.channel, horizon: INNER_OUTER_HORIZON[id] };
  }
  if (id < 62) {
    const b = BOUNDS[id];
    return { name: b?.name, class: 'bound', channel: b?.channel, horizon: b?.horizon };
  }
  const ag = AGENTS[id];
  return { name: ag?.name, class: 'agent', channel: ag?.channel, horizon: INNER_OUTER_HORIZON[ag?.archetype] };
}

function getHouseForArchetype(position) {
  for (const [houseName, house] of Object.entries(HOUSES)) {
    if (house.members.includes(position)) return houseName;
  }
  return null;
}

// Rebalancing meaning — what does each correction type MEAN for the person?
function getRebalancingMeaning(type) {
  switch (type) {
    case 'growth':
      return 'Balanced — grow by exploring the complementary process.';
    case 'diagonal':
      return 'Too Much — excess energy needs to cross to its diagonal complement. The antidote is the opposite quality.';
    case 'vertical':
      return 'Too Little — draw energy upward/downward from the vertical partner. What you lack, your partner holds.';
    case 'reduction':
      return 'Unacknowledged — integrate by recognizing what has been hidden. The reduction pair reveals what you are not seeing.';
    default:
      return null;
  }
}

// Build rebalancing data for an archetype based on its status
function buildArchetypeRebalancing(archetypeId, statusCode) {
  const statusName = STATUSES[statusCode]?.name;
  const correction = getArchetypeCorrection(archetypeId, statusCode);
  if (!correction) return null;

  const targetArch = ARCHETYPES[correction.target];
  return {
    type: correction.type,
    statusTrigger: statusName,
    targetId: correction.target,
    targetName: targetArch?.name,
    targetHouse: getHouseForArchetype(correction.target),
    targetChannel: targetArch?.channel,
    isSelf: correction.isSelf || false,
    meaning: getRebalancingMeaning(correction.type)
  };
}

// Build rebalancing data for a bound based on its status
function buildBoundRebalancing(boundId, statusCode) {
  const bound = BOUNDS[boundId];
  if (!bound) return null;

  const correction = getBoundCorrection({ ...bound, id: boundId }, statusCode);
  if (!correction) return null;

  return {
    type: correction.type,
    targetId: correction.targetId,
    targetName: correction.targetBound?.name,
    targetChannel: correction.targetBound?.channel,
    isSelf: correction.isSelf || false,
    meaning: getRebalancingMeaning(correction.type)
  };
}

// On-demand computation for tools requesting data outside the auto-triaged set
function computeBoundDiagnosis(archetypeId, drawMap) {
  const arch = ARCHETYPES[archetypeId];
  if (!arch) return { error: `Invalid archetype ID: ${archetypeId}` };

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
        const visitorSig = getSignatureInfo(draw.transient);
        detail.visitor = visitorSig.name;
        detail.visitorClass = visitorSig.class;
        detail.visitorChannel = visitorSig.channel;
        detail.status = STATUSES[draw.status]?.name;
        detail.isDistorted = detail.status !== 'Balanced';
        detail.channelTension = visitorSig.class !== 'archetype' ? null
          : (visitorSig.channel !== bound.channel ? 'crossed' : 'aligned');
      }
      if (bound.horizon === 'inner') floor = detail;
      else ceiling = detail;
    }
  }

  const floorDistorted = floor?.isDistorted || false;
  const ceilingDistorted = ceiling?.isDistorted || false;
  let pattern;
  if (floorDistorted && ceilingDistorted) pattern = 'range-compromised';
  else if (floorDistorted) pattern = 'foundation-off';
  else if (ceilingDistorted) pattern = 'completion-stuck';
  else pattern = 'range-healthy';

  // Add rebalancing for distorted bounds — the medicine at the boundary level
  if (floor && floor.isDistorted) {
    const floorDraw = drawMap[floor.positionId];
    if (floorDraw) {
      floor.rebalancing = buildBoundRebalancing(floor.positionId, floorDraw.status);
    }
  }
  if (ceiling && ceiling.isDistorted) {
    const ceilingDraw = drawMap[ceiling.positionId];
    if (ceilingDraw) {
      ceiling.rebalancing = buildBoundRebalancing(ceiling.positionId, ceilingDraw.status);
    }
  }

  return {
    archetypeId,
    name: arch.name,
    house: getHouseForArchetype(archetypeId),
    pattern,
    floor,
    ceiling
  };
}

function computeManifestReadout(archetypeId, drawMap) {
  const arch = ARCHETYPES[archetypeId];
  if (!arch) return null;

  for (const [id, agent] of Object.entries(AGENTS)) {
    if (agent.archetype === archetypeId) {
      const posId = Number(id);
      const draw = drawMap[posId];
      if (!draw) return null;

      const visitorSig = getSignatureInfo(draw.transient);
      return {
        archetypeId,
        archetypeName: arch.name,
        agentId: posId,
        agentName: agent.name,
        channel: agent.channel,
        visitor: visitorSig.name,
        visitorClass: visitorSig.class,
        status: STATUSES[draw.status]?.name,
        isDistorted: STATUSES[draw.status]?.name !== 'Balanced',
        house: getHouseForArchetype(archetypeId),
        available: true
      };
    }
  }
  return null;
}

function computeCorrectionPath(archetypeId, drawMap) {
  const arch = ARCHETYPES[archetypeId];
  if (!arch) return { error: `Invalid archetype ID: ${archetypeId}` };

  const draw = drawMap[archetypeId];
  const statusCode = draw?.status;
  const statusName = STATUSES[statusCode]?.name;

  // === STATUS-AWARE REBALANCING OPERATION ===
  // This is THE prescription — where the energy needs to go based on WHAT's wrong
  const rebalancing = buildArchetypeRebalancing(archetypeId, statusCode);

  // === VERTICAL PAIR ANALYSIS ===
  // The vertical partner is always relevant (correction geometry), but the
  // rebalancing target may differ based on status (diagonal, reduction, etc.)
  const partnerId = VERTICAL_PAIRS[archetypeId];
  const partner = ARCHETYPES[partnerId];
  if (!partner) return { archetypeId, name: arch.name, partner: null, rebalancing };

  const partnerDraw = drawMap[partnerId];
  const partnerState = partnerDraw ? {
    visitor: getSignatureInfo(partnerDraw.transient).name,
    visitorClass: getSignatureInfo(partnerDraw.transient).class,
    status: STATUSES[partnerDraw.status]?.name,
    isDistorted: STATUSES[partnerDraw.status]?.name !== 'Balanced',
    isSelfSeated: resolveArchetypePosition(partnerDraw.transient) === partnerId
  } : null;

  // === BOUND CHAIN (ceiling → partner's floor) ===
  let ceilingToFloor = null;
  let thisCeiling = null, partnerFloor = null;

  for (const [id, bound] of Object.entries(BOUNDS)) {
    if (bound.archetype === archetypeId && bound.horizon === 'outer') {
      thisCeiling = { posId: Number(id), name: bound.name, channel: bound.channel };
      const bDraw = drawMap[Number(id)];
      if (bDraw) {
        thisCeiling.status = STATUSES[bDraw.status]?.name;
        thisCeiling.isDistorted = thisCeiling.status !== 'Balanced';
      }
    }
    if (bound.archetype === partnerId && bound.horizon === 'inner') {
      partnerFloor = { posId: Number(id), name: bound.name, channel: bound.channel };
      const bDraw = drawMap[Number(id)];
      if (bDraw) {
        partnerFloor.status = STATUSES[bDraw.status]?.name;
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

  // === REBALANCING TARGET STATE ===
  // If rebalancing points somewhere other than the vertical partner,
  // check the rebalancing target's state too (is the medicine available?)
  let rebalancingTargetState = null;
  if (rebalancing && !rebalancing.isSelf && rebalancing.targetId !== partnerId) {
    const targetDraw = drawMap[rebalancing.targetId];
    if (targetDraw) {
      rebalancingTargetState = {
        visitor: getSignatureInfo(targetDraw.transient).name,
        visitorClass: getSignatureInfo(targetDraw.transient).class,
        status: STATUSES[targetDraw.status]?.name,
        isDistorted: STATUSES[targetDraw.status]?.name !== 'Balanced',
        isSelfSeated: resolveArchetypePosition(targetDraw.transient) === rebalancing.targetId
      };
    }
  }

  return {
    archetypeId,
    name: arch.name,
    status: statusName,
    // The prescription
    rebalancing,
    rebalancingTargetState,
    // Vertical partner (always relevant for correction geometry)
    partnerId,
    partnerName: partner.name,
    partnerHorizon: INNER_OUTER_HORIZON[partnerId],
    partnerState,
    // Bound chain health
    boundChain: ceilingToFloor,
    correctionAvailable: partnerState ? !partnerState.isDistorted : null
  };
}
