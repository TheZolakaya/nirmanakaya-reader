'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateSpread } from '../../lib/utils.js';
import { analyzeFullMap, triageReading } from '../../lib/mapAnalysis.js';
import { handleToolCall, buildTriageSeed, DIAGNOSTIC_TOOL_DEFINITIONS } from '../../lib/diagnosticTools.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import { STATUSES, HOUSES, INNER_OUTER_HORIZON } from '../../lib/constants.js';
import { getArchetypeCorrection } from '../../lib/corrections.js';
import { getCardImagePath } from '../../lib/cardImages.js';
import { getGestaltCondition } from '../../lib/gestaltConditions.js';

// ─── COLOR SYSTEM ───
const STATUS_COLORS = {
  Balanced: '#22c55e',
  'Too Much': '#ef4444',
  'Too Little': '#3b82f6',
  Unacknowledged: '#a855f7'
};

const CHANNEL_COLORS = {
  Intent: '#f97316',
  Cognition: '#06b6d4',
  Resonance: '#8b5cf6',
  Structure: '#84cc16',
  null: '#6b7280'
};

const HOUSE_COLORS = {
  Gestalt: '#fbbf24',
  Spirit: '#c084fc',
  Mind: '#22d3ee',
  Emotion: '#fb7185',
  Body: '#4ade80',
  Portal: '#94a3b8'
};

// ─── DATA HELPERS ───
function getSignatureName(id, traditional = false) {
  if (traditional) {
    if (id < 22) return ARCHETYPES[id]?.traditional || ARCHETYPES[id]?.name || `Arch ${id}`;
    if (id < 62) return BOUNDS[id]?.traditional || BOUNDS[id]?.name || `Bound ${id}`;
    return AGENTS[id]?.traditional || AGENTS[id]?.name || `Agent ${id}`;
  }
  if (id < 22) return ARCHETYPES[id]?.name || `Arch ${id}`;
  if (id < 62) return BOUNDS[id]?.name || `Bound ${id}`;
  return AGENTS[id]?.name || `Agent ${id}`;
}

function getSignatureClass(id) {
  if (id < 22) return 'archetype';
  if (id < 62) return 'bound';
  return 'agent';
}

function resolveArchetypePosition(sigId) {
  if (sigId < 22) return sigId;
  if (sigId < 62) return BOUNDS[sigId]?.archetype;
  return AGENTS[sigId]?.archetype;
}

function getHouseForArchetype(pos) {
  for (const [name, house] of Object.entries(HOUSES)) {
    if (house.members.includes(pos)) return name;
  }
  if (pos === 10 || pos === 21) return 'Portal';
  return null;
}

function getBoundsForArchetype(archId) {
  const results = [];
  for (const [id, bound] of Object.entries(BOUNDS)) {
    if (bound.archetype === archId) results.push({ id: Number(id), ...bound });
  }
  return results.sort((a, b) => a.id - b.id);
}

function getAgentsForArchetype(archId) {
  const results = [];
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (agent.archetype === archId) results.push({ id: Number(id), ...agent });
  }
  return results.sort((a, b) => a.id - b.id);
}

// ─── TOOLTIP HELP TEXT ───
const HELP = {
  healthScore: 'Integration (0-100). Weighted: Balanced processes contribute fully, Too Much partially (energy present), Too Little less (space open), Unacknowledged least (hidden potential). Higher = more of the system in natural flow.',
  severity: 'integrated (0-2 out of balance), emerging (3-5), developing (6-9), active (10-14), transforming (15+)',
  horizon: 'Wheel = inner horizon (personal/psychological). World = outer horizon (relational/manifest). Imbalance between them shows where growth is stuck.',
  portals: 'Source (pos 10) = where energy enters. Creation (pos 21) = where it manifests. Both imbalanced = major growth opportunity.',
  houses: 'Each dot = one archetype. Color shows status. All green = this domain is fully integrated.',
  redFlags: 'DIAGONAL (red) = Too Much → cross to complement. VERTICAL (blue) = Too Little → draw from partner. REDUCTION (purple) = Unacknowledged → integrate hidden. [TARGET IMBALANCED] = the rebalancing target also seeks balance. Click to highlight.',
  greenFlags: 'Healthy patterns: self-seated archetypes, fully balanced houses. Click to highlight.',
  seed: 'The raw text payload sent to the AI for interpretation. This is what the model sees.',
  archetypes: '22 archetypal processes. Each is a verb — an active principle of consciousness. Click any to inspect its full derivation chain.',
  bounds: '40 boundary conditions (floor + ceiling per archetype). Nouns — they constrain the archetype\'s range. Click to inspect parent archetype.',
  agents: '16 collapse points in manifest houses (Spirit/Mind/Emotion/Body). Where archetype energy becomes observable. Click to inspect parent.',
  chains: 'Displacement chains show how visitors flow through the map. Every position is part of a chain. Self-seated = chain of 1. Swap = 2 positions exchanged. Loop = 3+ positions in closed circulation. Derivatives feed into archetype-level chains.',
  chainSelfSeated: 'HOME: This archetype\'s own signature sits here. No displacement — the simplest chain. Strongest possible alignment.',
  chainSwap: 'SWAP: Two archetypes exchanged visitors. A sits in B, B sits in A. Energy oscillates between them.',
  chainLoop: 'CIRCULATION: 3+ archetypes form a closed loop. Each visitor sits in the next position. Energy circulates but may not resolve naturally.',
  chainTail: 'TAIL: This position feeds INTO a loop but isn\'t part of the cycle itself. Its visitor\'s energy enters the circulation at the junction point.',
  chainFeeder: 'FEEDERS: Derivative positions (bounds/agents) whose visitor chains lead into this archetype-level cycle. More feeders = more energy flowing through this pattern.',
  balanced: 'BALANCED: This process is functioning naturally. Growth direction = explore the complementary process.',
  tooMuch: 'TOO MUCH: Excess energy here. Diagonal correction needed — cross to the complement.',
  tooLittle: 'TOO LITTLE: Insufficient energy. Vertical correction — draw from the partner above/below.',
  unacknowledged: 'UNACKNOWLEDGED: This process is hidden/denied. Reduction correction — integrate what\'s been suppressed.',
  selfSeated: 'SELF-SEATED: The archetype\'s own signature sits in its own position. Natural alignment — strongest possible state.',
  floor: 'FLOOR (inner bound): The minimum threshold. If imbalanced, the process is seeking its base.',
  ceiling: 'CEILING (outer bound): The maximum reach. If imbalanced, the process is seeking full expression.',
  rangeCompromised: 'RANGE-COMPROMISED: Both floor AND ceiling imbalanced. The process is seeking its entire operating range.',
  visitor: 'The signature currently sitting in this position. If different from the position\'s own archetype, it colors the process.',
  rebalancing: 'The invitation — which process to engage to restore balance. Depends on the imbalance type.',
  boundChain: 'Whether the correction path\'s bounds are clear. Open = correction can flow. Blocked = deeper work needed.',
  // Sidebar-specific help
  healthScoreGauge: 'The health bar shows what percentage of archetypes are balanced. Higher = healthier map.',
  distortionCount: 'How many of the 22 archetypal processes are out of balance (Too Much, Too Little, or Unacknowledged).',
  horizonWheel: 'WHEEL (inner horizon): Personal, psychological, introspective archetypes. Health% = balanced count / total in this horizon.',
  horizonWorld: 'WORLD (outer horizon): Relational, manifest, expressive archetypes. Health% = balanced count / total in this horizon.',
  consonance: 'Horizon consonance: how aligned are Wheel and World health? High = harmonious. Low = one horizon dominates.',
  portalSource: 'SOURCE (pos 10): Where energy enters the map. Distortion here = intake blocked. Visitor shows what energy is filtering through.',
  portalCreation: 'CREATION (pos 21): Where energy manifests. Distortion here = output blocked. Visitor shows what\'s trying to express.',
  bothPortals: 'BOTH PORTALS IMBALANCED: Input AND output seeking balance. The entire flow is inviting attention — a profound opportunity for transformation.',
  houseHealth: 'Each dot represents one archetype in this house. Color shows status. All green = this domain is fully integrated.',
  flagDiagonal: 'DIAGONAL correction: Too Much energy → cross to the complementary archetype. The diagonal partner absorbs excess.',
  flagVertical: 'VERTICAL correction: Too Little energy → draw from the partner above/below. The vertical partner provides what\'s missing.',
  flagReduction: 'REDUCTION correction: Unacknowledged energy → integrate the hidden pair. What\'s denied must be faced.',
  flagKnot: 'TARGET IMBALANCED: The rebalancing target is also out of balance — both positions are inviting attention. A deeper opportunity.',
  flagLocked: 'LOCKED: Both mutual correction partners are imbalanced AND the bound chain between them is constrained. The deepest invitation for growth.',
  flagMutual: 'MUTUAL: Both correction partners are imbalanced. They need each other but both are seeking balance. Bound chain status shows if energy can still flow.',
  flagRangeCompromised: 'RANGE-COMPROMISED: Both floor (minimum) AND ceiling (maximum) bounds are imbalanced. The archetype is seeking its entire operating range.',
  greenSelfSeated: 'Self-seated archetypes: the signature IS home. No displacement, no coloring by foreign energy. Natural strength.',
  greenHouseHealthy: 'Fully healthy house: every archetype in this domain is balanced. The house\'s function is integrated.',
  aiSeedPayload: 'The complete text payload assembled from triage data and sent to the AI model. This is the AI\'s entire window into the reading — what it sees, it interprets.',
  regenerateBtn: 'Generate a completely new random 78-position reading. All analysis is recomputed client-side.',
};

// ─── PORTAL CONDITION MATRIX ───
// 16 combinations of Source × Creation status → named conditions with severity and analysis approach
const PORTAL_CONDITIONS = {
  'Balanced|Balanced':       { name: 'Clear Channel',    severity: 'clear',       pattern: 'Full flow — energy enters and manifests freely', analysis: 'Both portals open. Look deeper at houses and bounds for subtler patterns.' },
  'Balanced|Too Much':       { name: 'Overflow',         severity: 'mild',        pattern: 'Clean intake, manifestation overcharged', analysis: 'Creation visitor is over-expressing in the world. Check Creation\'s correction target.' },
  'Balanced|Too Little':     { name: 'Bottleneck',       severity: 'mild',        pattern: 'Clean intake, output constricted', analysis: 'Energy enters but can\'t manifest. Check Creation\'s correction target and bound chain.' },
  'Balanced|Unacknowledged': { name: 'Blind Forge',      severity: 'moderate',    pattern: 'Clean intake, output unconscious', analysis: 'Manifestation is unconscious. Creation\'s visitor reveals what\'s being expressed without awareness.' },
  'Too Much|Balanced':       { name: 'Flood',            severity: 'mild',        pattern: 'Overwhelmed intake, clean manifestation', analysis: 'Hypersensitivity to input. Source\'s visitor shows what\'s flooding in. Check diagonal correction.' },
  'Too Much|Too Much':       { name: 'Cascade',          severity: 'critical',    pattern: 'Both thresholds amplifying — system running hot', analysis: 'Amplification pattern. Check if Source and Creation visitors are in the same chain. High urgency.' },
  'Too Much|Too Little':     { name: 'Pressure Cooker',  severity: 'significant', pattern: 'Flooded in, constricted out — energy piles up', analysis: 'Pressure buildup. Look for range-compromised archetypes. System absorbs more than it can express.' },
  'Too Much|Unacknowledged': { name: 'Blind Storm',      severity: 'significant', pattern: 'Overwhelmed AND output invisible to self', analysis: 'Most dangerous for blind spots. Person is overwhelmed AND their response is invisible to them.' },
  'Too Little|Balanced':     { name: 'Drought',          severity: 'mild',        pattern: 'Insufficient intake, clean output — running on reserves', analysis: 'Source\'s correction path — what needs to feed the intake? Output works but fuel is low.' },
  'Too Little|Too Much':     { name: 'Burnout',          severity: 'significant', pattern: 'Spending more than receiving — deficit amplification', analysis: 'Depleting reserves. Check governance chain — is Gestalt governor of Source also imbalanced?' },
  'Too Little|Too Little':   { name: 'Shutdown',         severity: 'critical',    pattern: 'Both starved — system withdrawn', analysis: 'Near-total withdrawal. Look for self-seated archetypes as anchors — what IS still working?' },
  'Too Little|Unacknowledged': { name: 'Fading Signal',  severity: 'critical',    pattern: 'Starved AND output hidden — deep disconnection', analysis: 'Deep disconnection. Person may feel "nothing is happening." Check Gestalt for entry points.' },
  'Unacknowledged|Balanced': { name: 'Hidden Spring',    severity: 'moderate',    pattern: 'Unconscious fuel, clean manifestation — "muse" energy', analysis: 'Creates well but doesn\'t understand the source. Source\'s visitor reveals the hidden fuel.' },
  'Unacknowledged|Too Much': { name: 'Possessed Output', severity: 'significant', pattern: 'Unknown source driving overexpression', analysis: 'Producing intensely without knowing what drives it. Check if Source\'s visitor is in Creation\'s chain.' },
  'Unacknowledged|Too Little': { name: 'Ghost Channel',  severity: 'critical',    pattern: 'Hidden intake, weak output — barely a signal', analysis: 'Both intake and expression compromised with unconscious dimension. Check Gestalt for handles.' },
  'Unacknowledged|Unacknowledged': { name: 'Sleepwalk',  severity: 'critical',    pattern: 'Both portals unconscious — pure autopilot', analysis: 'Entire portal system unconscious. Hardest to work with. Look for any balanced Gestalt archetype as entry point.' }
};

const PORTAL_SEVERITY_COLORS = {
  clear: '#22c55e',
  mild: '#84cc16',
  moderate: '#eab308',
  significant: '#f97316',
  critical: '#ef4444'
};

function getPortalCondition(drawMap) {
  const sourceStatus = STATUSES[drawMap[10]?.status]?.name || 'Balanced';
  const creationStatus = STATUSES[drawMap[21]?.status]?.name || 'Balanced';
  const key = `${sourceStatus}|${creationStatus}`;
  return PORTAL_CONDITIONS[key] || PORTAL_CONDITIONS['Balanced|Balanced'];
}

// ─── UNIVERSAL CHAIN BUILDER ───
// Traces the full displacement chain for ANY position (0-77).
// Follows: position → where visitor natively belongs → where THAT position's visitor belongs → ...
// Returns chain type, path, tail/loop decomposition.
function buildChainForPosition(positionId, drawMap) {
  const draw = drawMap[positionId];
  if (!draw) return null;

  const path = [];
  const visited = new Map(); // position → index in path
  let current = positionId;

  while (current != null && !visited.has(current) && drawMap[current]) {
    visited.set(current, path.length);
    const d = drawMap[current];
    const visitorHome = resolveArchetypePosition(d.transient);
    path.push({
      position: current,
      name: getSignatureName(current),
      sigClass: getSignatureClass(current),
      visitor: d.transient,
      visitorName: getSignatureName(d.transient),
      visitorHome,
      status: STATUSES[d.status]?.name,
      statusCode: d.status,
      isSelfSeated: visitorHome === current
    });
    current = visitorHome;
  }

  // Determine structure
  let chainType, tail, loop;

  if (current != null && visited.has(current)) {
    const loopStart = visited.get(current);
    tail = path.slice(0, loopStart);
    loop = path.slice(loopStart);

    if (tail.length === 0 && loop.length === 1) chainType = 'self-seated';
    else if (tail.length === 0 && loop.length === 2) chainType = 'swap';
    else if (tail.length === 0) chainType = 'closed-loop';
    else chainType = 'tail-into-loop';
  } else {
    tail = path;
    loop = [];
    chainType = 'open';
  }

  return {
    type: chainType,
    startPosition: positionId,
    path,
    tail,
    loop,
    totalLength: path.length,
    loopSize: loop.length,
    tailSize: tail.length,
    isSelfSeated: chainType === 'self-seated',
    isInLoop: tail.length === 0 && loop.length > 0,
    feedsIntoLoop: tail.length > 0 && loop.length > 0,
    label: chainType === 'self-seated' ? 'Home'
         : chainType === 'swap' ? 'Swap'
         : chainType === 'closed-loop' ? `Loop (${loop.length})`
         : chainType === 'tail-into-loop' ? `Tail\u2192Loop (${tail.length}+${loop.length})`
         : 'Open'
  };
}

// Build all unique archetype-level chains (22 archetypes partition into disjoint cycles)
function buildAllArchetypeChains(drawMap) {
  const chains = [];
  const assigned = new Set();

  for (let archId = 0; archId < 22; archId++) {
    if (assigned.has(archId) || !drawMap[archId]) continue;
    const chain = buildChainForPosition(archId, drawMap);
    if (!chain) continue;
    // Mark ALL positions in the chain (both tail and loop) so we don't create duplicate entries
    for (const node of chain.path) assigned.add(node.position);
    chains.push(chain);
  }

  // Count derivative feeders per chain
  for (const chain of chains) {
    const loopPositions = new Set(chain.loop.map(n => n.position));
    let feeders = 0;
    for (let pos = 22; pos < 78; pos++) {
      if (!drawMap[pos]) continue;
      // Where does this derivative's visitor resolve to?
      const visitorHome = resolveArchetypePosition(drawMap[pos].transient);
      // Follow from visitorHome to find which loop it feeds into
      let cur = visitorHome;
      const seen = new Set();
      while (cur != null && !seen.has(cur) && drawMap[cur]) {
        if (loopPositions.has(cur)) { feeders++; break; }
        seen.add(cur);
        cur = resolveArchetypePosition(drawMap[cur].transient);
      }
    }
    chain.feederCount = feeders;
  }

  chains.sort((a, b) => {
    if (a.type === 'self-seated' && b.type !== 'self-seated') return 1;
    if (b.type === 'self-seated' && a.type !== 'self-seated') return -1;
    return b.loopSize - a.loopSize;
  });

  return chains;
}

// House layout order for the grid
const HOUSE_ORDER = ['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body'];
const PORTAL_IDS = [10, 21];

// ─── MAIN PAGE ───
export default function DiagnosticPage() {
  const [readingData, setReadingData] = useState(null);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [highlightedPositions, setHighlightedPositions] = useState(new Set());
  const [showSeed, setShowSeed] = useState(false);
  const [inspectorResults, setInspectorResults] = useState(null);
  const [expandedTools, setExpandedTools] = useState({});
  const [useTraditional, setUseTraditional] = useState(false);
  const [toolExplorerResult, setToolExplorerResult] = useState(null);
  const [liveReading, setLiveReading] = useState(null);
  const [liveReadingLoading, setLiveReadingLoading] = useState(false);
  const [liveQuestion, setLiveQuestion] = useState('');

  const generateReading = useCallback(() => {
    const draws = generateSpread(78);
    const analysis = analyzeFullMap(draws);
    const drawMap = {};
    for (const d of draws) drawMap[d.position] = d;
    const triage = triageReading(analysis, drawMap);
    const seed = buildTriageSeed(triage);
    setReadingData({ draws, analysis, drawMap, triage, seed });
    setSelectedArchetype(null);
    setHighlightedPositions(new Set());
    setInspectorResults(null);
    setExpandedTools({});
  }, []);

  useEffect(() => { generateReading(); }, [generateReading]);

  // Run a live reading via the investigate API
  const runLiveReading = useCallback(async () => {
    if (!readingData) return;
    setLiveReadingLoading(true);
    setLiveReading(null);
    try {
      const body = {
        draws: readingData.draws,
        showArchitecture: true,
        persona: 'guru',
        complexity: 'fluent',
        humor: 3
      };
      if (liveQuestion.trim()) body.question = liveQuestion.trim();
      const res = await fetch('/api/reading/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setLiveReading(data);
    } catch (err) {
      setLiveReading({ error: err.message });
    } finally {
      setLiveReadingLoading(false);
    }
  }, [readingData, liveQuestion]);

  // Run a single tool from the explorer
  const runToolExplorer = useCallback((toolName, toolInput) => {
    if (!readingData) return;
    const ctx = { analysis: readingData.analysis, triage: readingData.triage, drawMap: readingData.drawMap };
    const result = handleToolCall(toolName, toolInput, ctx);
    setToolExplorerResult({ tool: toolName, input: toolInput, result });
  }, [readingData]);

  // Run derivation chain when archetype is selected
  useEffect(() => {
    if (selectedArchetype === null || !readingData) return;
    const ctx = { analysis: readingData.analysis, triage: readingData.triage, drawMap: readingData.drawMap };
    const archId = selectedArchetype;

    const results = {};
    results.processDetail = handleToolCall('getProcessDetail', { archetypeId: archId }, ctx);
    results.boundDiagnosis = handleToolCall('getBoundDiagnosis', { archetypeId: archId }, ctx);
    results.correctionPath = handleToolCall('getCorrectionPath', { archetypeId: archId }, ctx);

    // Check if manifest house
    const house = getHouseForArchetype(archId);
    if (['Spirit', 'Mind', 'Emotion', 'Body'].includes(house)) {
      results.manifestReadout = handleToolCall('getManifestReadout', { archetypeId: archId }, ctx);
    }

    setInspectorResults(results);
    setExpandedTools({ processDetail: true, boundDiagnosis: true, correctionPath: true });

    // Build highlight set: this archetype + its bounds + agents + correction partner + chain members
    const highlights = new Set([archId]);
    getBoundsForArchetype(archId).forEach(b => highlights.add(b.id));
    getAgentsForArchetype(archId).forEach(a => highlights.add(a.id));
    if (results.correctionPath?.partnerId != null) highlights.add(results.correctionPath.partnerId);
    // Add all chain members (both tail and loop)
    const chain = buildChainForPosition(archId, readingData.drawMap);
    if (chain) {
      for (const node of chain.path) {
        highlights.add(node.position);
        // Also highlight bounds/agents for each archetype in the chain
        if (node.position < 22) {
          getBoundsForArchetype(node.position).forEach(b => highlights.add(b.id));
          getAgentsForArchetype(node.position).forEach(a => highlights.add(a.id));
        }
      }
    }
    setHighlightedPositions(highlights);
  }, [selectedArchetype, readingData]);

  if (!readingData) return null;

  const { drawMap, triage, seed, analysis } = readingData;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#030712',
      color: '#e5e7eb',
      fontFamily: "'IBM Plex Mono', 'Fira Code', 'SF Mono', monospace",
      fontSize: '12px',
      overflow: 'hidden'
    }}>
      {/* ─── LEFT SIDEBAR: Triage Summary ─── */}
      <TriageSidebar
        triage={triage}
        seed={seed}
        showSeed={showSeed}
        setShowSeed={setShowSeed}
        onRegenerate={generateReading}
        drawMap={drawMap}
        useTraditional={useTraditional}
        setUseTraditional={setUseTraditional}
        onRunReading={runLiveReading}
        liveReadingLoading={liveReadingLoading}
        liveQuestion={liveQuestion}
        setLiveQuestion={setLiveQuestion}
        onRunTool={runToolExplorer}
        selectedArchetype={selectedArchetype}
        onFlagClick={(positions) => {
          setHighlightedPositions(new Set(positions));
          setSelectedArchetype(null);
          setInspectorResults(null);
        }}
        onSelectArchetype={(archId) => {
          setSelectedArchetype(archId);
          setHighlightedPositions(new Set([archId]));
          setInspectorResults(null);
        }}
      />

      {/* ─── MAIN: Position Grid ─── */}
      <PositionGrid
        drawMap={drawMap}
        triage={triage}
        analysis={analysis}
        selectedArchetype={selectedArchetype}
        highlightedPositions={highlightedPositions}
        onSelectArchetype={setSelectedArchetype}
        useTraditional={useTraditional}
      />

      {/* ─── RIGHT PANEL: Derivation Chain Inspector ─── */}
      {selectedArchetype !== null && inspectorResults && (
        <ChainInspector
          archetypeId={selectedArchetype}
          results={inspectorResults}
          drawMap={drawMap}
          analysis={analysis}
          expandedTools={expandedTools}
          setExpandedTools={setExpandedTools}
          onSelectArchetype={setSelectedArchetype}
          useTraditional={useTraditional}
          onClose={() => {
            setSelectedArchetype(null);
            setHighlightedPositions(new Set());
            setInspectorResults(null);
          }}
        />
      )}

      {/* ─── RIGHT PANEL: Tool Explorer Result ─── */}
      {toolExplorerResult && !inspectorResults && (
        <ToolExplorerPanel
          result={toolExplorerResult}
          onClose={() => setToolExplorerResult(null)}
        />
      )}

      {/* ─── RIGHT PANEL: Live Reading Result ─── */}
      {liveReading && (
        <LiveReadingPanel
          data={liveReading}
          useTraditional={useTraditional}
          onClose={() => setLiveReading(null)}
          onSelectArchetype={(archId) => {
            setSelectedArchetype(archId);
            setHighlightedPositions(new Set([archId]));
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TRIAGE SIDEBAR
// ═══════════════════════════════════════
function TriageSidebar({ triage, seed, showSeed, setShowSeed, onRegenerate, drawMap, useTraditional, setUseTraditional, onRunReading, liveReadingLoading, liveQuestion, setLiveQuestion, onRunTool, selectedArchetype, onFlagClick, onSelectArchetype }) {
  const { severity, healthScore, distortionCount, l0_horizon, l1_portals, l2_processes } = triage;

  const severityColors = {
    integrated: '#22c55e',
    emerging: '#84cc16',
    developing: '#eab308',
    active: '#f97316',
    transforming: '#ef4444'
  };

  // Build red flags (same logic as triage seed)
  const redFlags = useMemo(() => {
    const flags = [];
    if (l1_portals.source?.isDistorted && l1_portals.creation?.isDistorted) {
      flags.push({ text: 'BOTH PORTALS IMBALANCED', positions: [10, 21] });
    }
    const rangeCompromised = triage.l3_bounds?.filter(b => b.pattern === 'range-compromised') || [];
    for (const rc of rangeCompromised) {
      flags.push({ text: `RANGE-COMPROMISED: ${rc.name}`, positions: [rc.archetypeId] });
    }
    // Distortion-type correction flags: diagonal (Too Much), vertical (Too Little), reduction (Unacknowledged)
    const distorted = l2_processes.processes.filter(p => p.isDistorted);
    for (const proc of distorted) {
      const statusCode = proc.status === 'Too Much' ? 2 : proc.status === 'Too Little' ? 3 : proc.status === 'Unacknowledged' ? 4 : 0;
      if (statusCode === 0) continue;
      const correction = getArchetypeCorrection(proc.archetypeId, statusCode);
      if (!correction) continue;
      const targetName = useTraditional ? (ARCHETYPES[correction.target]?.traditional || ARCHETYPES[correction.target]?.name || `#${correction.target}`) : (ARCHETYPES[correction.target]?.name || `#${correction.target}`);
      const targetDraw = drawMap[correction.target];
      const targetStatus = targetDraw ? STATUSES[targetDraw.status]?.name : null;
      const targetDistorted = targetStatus && targetStatus !== 'Balanced';
      const label = correction.type === 'diagonal' ? 'DIAGONAL'
        : correction.type === 'vertical' ? 'VERTICAL'
        : correction.type === 'reduction' ? 'REDUCTION'
        : correction.type?.toUpperCase();
      const knot = targetDistorted ? ' [TARGET IMBALANCED]' : '';
      flags.push({
        text: `${label}: ${useTraditional ? getSignatureName(proc.archetypeId, true) : proc.name} \u2192 ${targetName}${knot}`,
        positions: [proc.archetypeId, correction.target],
        severity: targetDistorted ? 'knot' : 'path'
      });
    }

    // Mutual/locked vertical pairs (both partners distorted)
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
      flags.push({
        text: chainStatus === 'blocked'
          ? `LOCKED: ${useTraditional ? getSignatureName(bm.archetypeId, true) : bm.name} \u2194 ${useTraditional ? getSignatureName(bm.partnerId, true) : bm.partnerName}`
          : `MUTUAL: ${useTraditional ? getSignatureName(bm.archetypeId, true) : bm.name} \u2194 ${useTraditional ? getSignatureName(bm.partnerId, true) : bm.partnerName}`,
        positions: [bm.archetypeId, bm.partnerId]
      });
    }
    return flags;
  }, [triage, l1_portals, useTraditional]);

  // Green flags
  const greenFlags = useMemo(() => {
    const flags = [];
    const healthy = l2_processes.processes.filter(p => !p.isDistorted);
    const selfSeated = healthy.filter(p => p.isSelfSeated);
    if (selfSeated.length > 0) {
      flags.push({ text: `SELF-SEATED: ${selfSeated.map(p => useTraditional ? getSignatureName(p.archetypeId, true) : p.name).join(', ')}`, positions: selfSeated.map(p => p.archetypeId) });
    }
    for (const [house, data] of Object.entries(l2_processes.byHouse)) {
      if (data.distorted === 0 && data.healthy > 0) {
        flags.push({ text: `${house} FULLY HEALTHY`, positions: HOUSES[house]?.members || [] });
      }
    }
    return flags;
  }, [l2_processes]);

  return (
    <div style={{
      width: 280,
      minWidth: 280,
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1e293b',
        background: '#020617'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Diagnostic Terminal
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setUseTraditional(!useTraditional)}
              title="Toggle between modern verb names and traditional tarot names"
              style={{
                background: useTraditional ? '#1e3a5f' : '#1e293b',
                border: `1px solid ${useTraditional ? '#3b82f6' : '#334155'}`,
                color: useTraditional ? '#93c5fd' : '#94a3b8',
                padding: '4px 10px',
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.2s ease'
              }}
            >
              {useTraditional ? 'TRAD' : 'VERB'}
            </button>
            <button
              onClick={onRegenerate}
              title={HELP.regenerateBtn}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                padding: '4px 10px',
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.05em'
              }}
            >
              REGENERATE
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {/* Integration Gauge */}
        <div style={{ marginBottom: 16 }} title="Integration: how much of the system is in natural flow. Higher = more processes balanced or near-balanced.">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: severityColors[severity] || '#94a3b8', fontFamily: "'IBM Plex Mono', monospace" }}
              title="Integration score (0-100). Weighted: Balanced=full, Too Much=partial (energy present), Too Little=receptive (space open), Unacknowledged=emerging (hidden potential).">
              {healthScore}
            </span>
            <span title={HELP.severity} style={{
              fontSize: 10,
              padding: '2px 8px',
              background: severityColors[severity] + '22',
              color: severityColors[severity],
              border: `1px solid ${severityColors[severity]}44`,
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              {severity}
            </span>
          </div>
          <div style={{ fontSize: 8, color: '#64748b', letterSpacing: '0.1em', marginBottom: 4 }}>INTEGRATION</div>
          <div style={{ height: 3, background: '#1e293b', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: `${healthScore}%`,
              background: severityColors[severity],
              borderRadius: 2,
              transition: 'width 0.6s ease'
            }} />
          </div>
          {/* Opportunity Profile */}
          {(() => {
            const procs = l2_processes.processes;
            const bal = procs.filter(p => !p.isDistorted).length;
            const tm = procs.filter(p => p.status === 'Too Much').length;
            const tl = procs.filter(p => p.status === 'Too Little').length;
            const ua = procs.filter(p => p.status === 'Unacknowledged').length;
            return (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 6, height: 6, background: STATUS_COLORS.Balanced, borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#94a3b8', flex: 1 }}>Flowing</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS.Balanced, fontWeight: 600 }}>{bal}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                  title="Active opportunity — energy present, needs direction">
                  <span style={{ width: 6, height: 6, background: STATUS_COLORS['Too Much'], borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#94a3b8', flex: 1 }}>Abundant</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS['Too Much'], fontWeight: 600 }}>{tm}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                  title="Receptive opportunity — space open, ready to receive">
                  <span style={{ width: 6, height: 6, background: STATUS_COLORS['Too Little'], borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#94a3b8', flex: 1 }}>Receptive</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS['Too Little'], fontWeight: 600 }}>{tl}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                  title="Transformative opportunity — hidden potential waiting to surface">
                  <span style={{ width: 6, height: 6, background: STATUS_COLORS.Unacknowledged, borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#94a3b8', flex: 1 }}>Emerging</span>
                  <span style={{ fontSize: 10, color: STATUS_COLORS.Unacknowledged, fontWeight: 600 }}>{ua}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Horizon Balance */}
        <SidebarSection title="HORIZON" help={HELP.horizon}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <HorizonBar label="Wheel" data={l0_horizon.wheel} help={HELP.horizonWheel} />
            <HorizonBar label="World" data={l0_horizon.world} help={HELP.horizonWorld} />
          </div>
          {l0_horizon.consonance && (
            <div style={{ fontSize: 10, color: '#64748b' }} title={HELP.consonance}>
              {l0_horizon.consonance.meaning} ({Math.round(l0_horizon.consonance.ratio * 100)}%)
            </div>
          )}
        </SidebarSection>

        {/* Portal Condition + Vitals */}
        <SidebarSection title="PORTALS" help={HELP.portals}>
          {(() => {
            const condition = getPortalCondition(drawMap);
            const sevColor = PORTAL_SEVERITY_COLORS[condition.severity] || '#94a3b8';
            return (
              <div style={{
                marginBottom: 8, padding: '6px 8px',
                background: sevColor + '11',
                border: `1px solid ${sevColor}33`,
                borderLeft: `3px solid ${sevColor}`
              }}
                title={`${condition.pattern}\n\nAnalysis: ${condition.analysis}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sevColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {condition.name}
                  </span>
                  <span style={{
                    fontSize: 8, padding: '1px 6px',
                    background: sevColor + '22',
                    color: sevColor,
                    border: `1px solid ${sevColor}44`,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}>
                    {condition.severity}
                  </span>
                </div>
                <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.4 }}>
                  {condition.pattern}
                </div>
              </div>
            );
          })()}
          {[
            { label: 'Source', posId: 10, data: l1_portals.source, help: HELP.portalSource, role: 'Where energy enters' },
            { label: 'Creation', posId: 21, data: l1_portals.creation, help: HELP.portalCreation, role: 'Where energy manifests' }
          ].map(portal => {
            if (!portal.data) return null;
            const draw = drawMap[portal.posId];
            const visitorId = draw?.transient;
            const visitorName = visitorId != null ? getSignatureName(visitorId, useTraditional) : '?';
            const visitorClass = visitorId != null ? getSignatureClass(visitorId) : '?';
            const visitorHome = visitorId != null ? resolveArchetypePosition(visitorId) : null;
            const visitorHouse = visitorHome != null ? getHouseForArchetype(visitorHome) : null;
            const isSelfSeated = visitorHome === portal.posId;
            const statusColor = STATUS_COLORS[portal.data.status] || '#6b7280';
            return (
              <div key={portal.posId} style={{ marginBottom: 6 }} title={portal.help}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>{portal.label}</span>
                  <span style={{
                    fontSize: 9, padding: '1px 5px',
                    background: statusColor + '22',
                    color: statusColor,
                    border: `1px solid ${statusColor}44`
                  }}>
                    {portal.data.status}
                  </span>
                </div>
                {/* Who's visiting this portal */}
                <div style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4, lineHeight: 1.5 }}
                  title={`Receiving: ${visitorName} [${visitorClass}]${visitorHouse ? ' from ' + visitorHouse + ' house' : ''}${isSelfSeated ? '\nSelf-seated — portal energy is native' : '\nThe energy of ' + visitorName + ' is coloring this portal'}`}
                >
                  <span style={{ color: '#64748b' }}>{'\u2190'} </span>
                  <span
                    style={{ color: HOUSE_COLORS[visitorHouse] || '#e2e8f0', cursor: visitorHome != null ? 'pointer' : 'default', textDecoration: visitorHome != null ? 'underline' : 'none', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                    onClick={visitorHome != null ? () => onSelectArchetype(visitorHome) : undefined}
                    onMouseEnter={visitorHome != null ? (e) => { e.target.style.color = '#fff'; e.target.style.textDecorationStyle = 'solid'; } : undefined}
                    onMouseLeave={visitorHome != null ? (e) => { e.target.style.color = HOUSE_COLORS[visitorHouse] || '#e2e8f0'; e.target.style.textDecorationStyle = 'dotted'; } : undefined}
                  >{visitorName}</span>
                  <span style={{ color: '#475569' }}> [{visitorClass}]</span>
                  {visitorHouse && <span style={{ color: '#475569' }}> · {visitorHouse}</span>}
                  {isSelfSeated && <span style={{ color: '#fbbf24', marginLeft: 4, fontSize: 8 }} title="Self-seated — native energy">HOME</span>}
                </div>
                {/* Where did this portal's signature land? */}
                {(() => {
                  // Find which position has this portal's signature as its transient
                  const landedAt = Object.entries(drawMap).find(([pos, d]) => d.transient === portal.posId && Number(pos) !== portal.posId);
                  if (!landedAt && isSelfSeated) return null; // self-seated, already shown
                  if (!landedAt) return null;
                  const landedPos = Number(landedAt[0]);
                  const landedName = getSignatureName(landedPos, useTraditional);
                  const landedHouse = getHouseForArchetype(resolveArchetypePosition(landedPos));
                  const landedStatus = STATUSES[landedAt[1].status]?.name;
                  const landedStatusColor = STATUS_COLORS[landedStatus] || '#6b7280';
                  const landedArchId = resolveArchetypePosition(landedPos);
                  return (
                    <div style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4, lineHeight: 1.5 }}
                      title={`${portal.label}'s signature landed in position ${landedPos} (${landedName}). This means ${portal.label.toLowerCase()} energy is expressing through ${landedName} in ${landedHouse || 'the map'}. Status there: ${landedStatus}.`}
                    >
                      <span style={{ color: '#64748b' }}>{'\u2192'} </span>
                      <span style={{ color: '#e2e8f0' }}>landed in </span>
                      <span
                        style={{ color: HOUSE_COLORS[landedHouse] || '#e2e8f0', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                        onClick={() => onSelectArchetype(landedArchId)}
                        onMouseEnter={(e) => { e.target.style.color = '#fff'; e.target.style.textDecorationStyle = 'solid'; }}
                        onMouseLeave={(e) => { e.target.style.color = HOUSE_COLORS[landedHouse] || '#e2e8f0'; e.target.style.textDecorationStyle = 'dotted'; }}
                      >{landedName}</span>
                      <span style={{ color: '#475569' }}> · {landedHouse}</span>
                      <span style={{ color: landedStatusColor, marginLeft: 4, fontSize: 8 }}>{landedStatus}</span>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </SidebarSection>

        {/* House Rollup */}
        <SidebarSection title="HOUSES" help={HELP.houses}>
          {Object.entries(l2_processes.byHouse).map(([house, data]) => {
            // Get actual per-archetype statuses for this house
            const houseMembers = (HOUSES[house]?.members || []).map(archId => {
              const proc = l2_processes.processes.find(p => p.archetypeId === archId);
              return proc ? { id: archId, name: proc.name, status: proc.status || 'Balanced' } : null;
            }).filter(Boolean);
            return (
              <div key={house} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}
                title={`${house}: ${data.healthy} balanced, ${data.distorted} seeking balance of ${data.healthy + data.distorted} archetypes.\n${HELP.houseHealth}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: HOUSE_COLORS[house] || '#94a3b8', fontSize: 11 }}>{house}</span>
                  {l2_processes.houseStrength?.[house]?.flag === 'full' && <span style={{ color: '#22c55e', fontSize: 7 }}>{'\u2605'}</span>}
                  {l2_processes.houseStrength?.[house]?.flag === 'strong' && <span style={{ color: '#84cc16', fontSize: 7 }}>{'\u25C6'}</span>}
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {houseMembers.map((m) => (
                    <div key={m.id} style={{
                      width: 6, height: 6, borderRadius: 1,
                      background: STATUS_COLORS[m.status] || '#6b7280'
                    }}
                      title={`${useTraditional ? getSignatureName(m.id, true) : m.name}: ${m.status}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </SidebarSection>

        {/* Channel Health */}
        {l2_processes.byChannel && (
          <SidebarSection title="CHANNELS" titleColor="#f97316"
            help="Elemental designator health. Each channel has 4 archetypes spanning all manifest houses. Channel patterns reveal cross-house themes: a sick channel means one element is struggling everywhere."
          >
            {Object.entries(l2_processes.byChannel).map(([channel, data]) => {
              const strength = l2_processes.channelStrength?.[channel];
              const channelColor = CHANNEL_COLORS[channel] || '#94a3b8';
              return (
                <div key={channel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}
                  title={`${channel}: ${data.healthy} balanced, ${data.distorted} seeking balance.\nMembers: ${data.processes.map(p => p.name + ' (' + p.house + ')').join(', ')}\n${strength?.flag === 'full' ? 'All 4 archetypes balanced — elemental coherence.' : strength?.flag === 'strong' ? '3/4 balanced — strong elemental flow.' : strength?.flag === 'seeking' ? 'No balanced archetypes — this element needs attention everywhere.' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: channelColor, fontSize: 11 }}>{channel}</span>
                    {strength?.flag === 'full' && <span style={{ color: '#22c55e', fontSize: 7 }}>{'\u2605'}</span>}
                    {strength?.flag === 'strong' && <span style={{ color: '#84cc16', fontSize: 7 }}>{'\u25C6'}</span>}
                    {strength?.flag === 'seeking' && <span style={{ color: '#ef4444', fontSize: 7 }}>{'\u25BC'}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {data.processes.map((p) => (
                      <div key={p.archetypeId} style={{
                        width: 6, height: 6, borderRadius: 1,
                        background: STATUS_COLORS[p.status] || '#6b7280'
                      }}
                        title={`${useTraditional ? getSignatureName(p.archetypeId, true) : p.name} (${p.house}): ${p.status}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </SidebarSection>
        )}

        {/* Gestalt Condition */}
        {(() => {
          const gc = getGestaltCondition(drawMap);
          const intColor = gc.integration >= 80 ? '#22c55e' : gc.integration >= 50 ? '#84cc16' : gc.integration >= 30 ? '#eab308' : '#f97316';
          return (
            <SidebarSection title="GESTALT CONDITION" titleColor={HOUSE_COLORS.Gestalt}
              help="The Gestalt house condition reflects the state of the four governor archetypes. Engine (Potential × Will) = inner drive. Lens (Actualization × Awareness) = outer expression. Together they name the full governance state."
            >
              <div style={{
                padding: '6px 8px',
                background: HOUSE_COLORS.Gestalt + '11',
                border: `1px solid ${HOUSE_COLORS.Gestalt}33`,
                borderLeft: `3px solid ${HOUSE_COLORS.Gestalt}`,
                marginBottom: 6
              }}
                title={`${gc.engineDescription}\n\n${gc.lensDescription}\n\nStrategy: ${gc.strategy}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: HOUSE_COLORS.Gestalt, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {gc.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 8, color: '#94a3b8', marginBottom: 3 }}>
                  <span title={gc.engineDescription}>Engine: <span style={{ color: '#e2e8f0' }}>{gc.engineName}</span></span>
                  <span title={gc.lensDescription}>Lens: <span style={{ color: '#e2e8f0' }}>{gc.lensName}</span></span>
                </div>
                <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.4 }}>
                  {gc.capacity} · {gc.character} · {gc.integration}% integrated
                </div>
              </div>
              {/* Governance cascade */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {gc.governance.map(g => (
                  <div key={g.archId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9 }}
                    title={`${useTraditional ? getSignatureName(g.archId, true) : g.name} (${g.status}) governs ${g.house} house. ${g.balanced ? 'Flowing — governance is clear.' : 'Seeking balance — ' + g.house + ' house governance is in motion.'}`}
                  >
                    <span style={{ color: g.balanced ? '#94a3b8' : STATUS_COLORS[g.status] || '#94a3b8' }}>
                      {useTraditional ? getSignatureName(g.archId, true) : g.name} → {g.house}
                    </span>
                    <span style={{
                      fontSize: 8, padding: '0 4px',
                      color: STATUS_COLORS[g.status] || '#6b7280',
                      background: (STATUS_COLORS[g.status] || '#6b7280') + '15'
                    }}>
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
              {gc.seekingHouses.length > 0 && (
                <div style={{ fontSize: 8, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}
                  title={gc.strategy}>
                  {gc.strategy}
                </div>
              )}
            </SidebarSection>
          );
        })()}

        {/* Anchors (formerly Green Flags) */}
        {greenFlags.length > 0 && (
          <SidebarSection title="ANCHORS" titleColor="#22c55e"
            help="Strengths in the reading: self-seated archetypes (signature is home) and fully balanced houses. These are stable ground to build from."
          >
            {greenFlags.slice(0, 5).map((flag, i) => (
              <div
                key={i}
                onClick={() => onFlagClick(flag.positions)}
                title={flag.text.startsWith('SELF-SEATED') ? HELP.greenSelfSeated : HELP.greenHouseHealthy}
                style={{
                  fontSize: 10, color: '#86efac', marginBottom: 4, cursor: 'pointer',
                  padding: '3px 6px', background: '#14532d22', border: '1px solid #14532d44',
                  lineHeight: 1.4
                }}
              >
                {flag.text}
              </div>
            ))}
          </SidebarSection>
        )}

        {/* Growth Vectors (formerly Red Flags) */}
        {redFlags.length > 0 && (() => {
          // Separate structural patterns (individual items) from correction paths (grouped)
          const portalFlags = redFlags.filter(f => f.text.startsWith('BOTH PORTALS'));
          const rangeFlags = redFlags.filter(f => f.text.startsWith('RANGE'));
          const mutualFlags = redFlags.filter(f => f.text.startsWith('LOCKED') || f.text.startsWith('MUTUAL'));
          const diagFlags = redFlags.filter(f => f.text.startsWith('DIAGONAL'));
          const vertFlags = redFlags.filter(f => f.text.startsWith('VERTICAL'));
          const reductFlags = redFlags.filter(f => f.text.startsWith('REDUCTION'));
          const knotDiag = diagFlags.filter(f => f.severity === 'knot');
          const knotVert = vertFlags.filter(f => f.severity === 'knot');
          const knotReduct = reductFlags.filter(f => f.severity === 'knot');

          return (
            <SidebarSection title="GROWTH VECTORS" titleColor="#f97316"
              help="Where the architecture is inviting attention. Structural patterns (portal, mutual, range) shown individually. Correction paths grouped by type. Click any to highlight."
            >
              {/* Structural patterns — shown individually */}
              {portalFlags.map((flag, i) => (
                <div key={`p${i}`} onClick={() => onFlagClick(flag.positions)}
                  title={HELP.bothPortals}
                  style={{ fontSize: 10, color: '#fca5a5', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#7f1d1d22', border: '1px solid #7f1d1d44', lineHeight: 1.4 }}>
                  {flag.text}
                </div>
              ))}

              {mutualFlags.map((flag, i) => (
                <div key={`m${i}`} onClick={() => onFlagClick(flag.positions)}
                  title={flag.text.startsWith('LOCKED') ? HELP.flagLocked : HELP.flagMutual}
                  style={{ fontSize: 10, color: '#fbbf24', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#78350f22', border: '1px solid #78350f44', borderLeft: '3px solid #fbbf2466', lineHeight: 1.4 }}>
                  {flag.text}
                </div>
              ))}

              {/* Range-compromised — collapsed to summary */}
              {rangeFlags.length > 0 && (
                <div
                  onClick={() => onFlagClick(rangeFlags.flatMap(f => f.positions))}
                  title={`${HELP.flagRangeCompromised}\n\n${rangeFlags.map(f => f.text.replace('RANGE-COMPROMISED: ', '')).join(', ')}`}
                  style={{ fontSize: 10, color: '#f97316', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#7c2d1222', border: '1px solid #7c2d1244', lineHeight: 1.4 }}>
                  RANGE: {rangeFlags.length} archetypes seeking full range
                </div>
              )}

              {/* Correction paths — grouped by type with knot count */}
              {diagFlags.length > 0 && (
                <div
                  onClick={() => onFlagClick(diagFlags.flatMap(f => f.positions))}
                  title={`${HELP.flagDiagonal}\n\n${diagFlags.map(f => f.text.replace('DIAGONAL: ', '')).join('\n')}`}
                  style={{ fontSize: 10, color: '#ef4444', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#7f1d1d22', border: '1px solid #7f1d1d44', lineHeight: 1.4 }}>
                  DIAGONAL: {diagFlags.length} redirections{knotDiag.length > 0 ? ` (${knotDiag.length} mutual)` : ''}
                </div>
              )}

              {vertFlags.length > 0 && (
                <div
                  onClick={() => onFlagClick(vertFlags.flatMap(f => f.positions))}
                  title={`${HELP.flagVertical}\n\n${vertFlags.map(f => f.text.replace('VERTICAL: ', '')).join('\n')}`}
                  style={{ fontSize: 10, color: '#3b82f6', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#1e3a5f22', border: '1px solid #1e3a5f44', lineHeight: 1.4 }}>
                  VERTICAL: {vertFlags.length} invitations{knotVert.length > 0 ? ` (${knotVert.length} mutual)` : ''}
                </div>
              )}

              {reductFlags.length > 0 && (
                <div
                  onClick={() => onFlagClick(reductFlags.flatMap(f => f.positions))}
                  title={`${HELP.flagReduction}\n\n${reductFlags.map(f => f.text.replace('REDUCTION: ', '')).join('\n')}`}
                  style={{ fontSize: 10, color: '#a855f7', marginBottom: 3, cursor: 'pointer', padding: '3px 6px', background: '#4c1d9522', border: '1px solid #4c1d9544', lineHeight: 1.4 }}>
                  REDUCTION: {reductFlags.length} emergences{knotReduct.length > 0 ? ` (${knotReduct.length} mutual)` : ''}
                </div>
              )}
            </SidebarSection>
          );
        })()}

        {/* Tool Explorer */}
        <SidebarSection title="TOOLBOX" titleColor="#f97316"
          help="Click any diagnostic tool to see its raw output for this reading. Archetype tools use the currently selected archetype (click one in the grid first)."
        >
          {DIAGNOSTIC_TOOL_DEFINITIONS.map(tool => {
            const needsArch = tool.input_schema?.properties?.archetypeId;
            const needsHouse = tool.input_schema?.properties?.houseName;
            const disabled = needsArch && selectedArchetype === null;
            return (
              <div key={tool.name} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => {
                    if (needsArch) {
                      onRunTool(tool.name, { archetypeId: selectedArchetype });
                    } else if (needsHouse) {
                      // Show all 5 houses as sub-buttons
                    } else {
                      onRunTool(tool.name, {});
                    }
                  }}
                  disabled={disabled}
                  title={disabled ? 'Select an archetype in the grid first' : tool.description.slice(0, 120) + '...'}
                  style={{
                    background: disabled ? '#0f172a' : '#1e293b',
                    border: '1px solid #334155',
                    color: disabled ? '#475569' : '#e2e8f0',
                    padding: '3px 8px',
                    fontSize: 9,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ color: '#f97316', marginRight: 4 }}>{'\u25B8'}</span>
                  {tool.name}
                  {needsArch && selectedArchetype !== null && (
                    <span style={{ color: '#64748b', marginLeft: 4 }}>({selectedArchetype})</span>
                  )}
                  {needsArch && selectedArchetype === null && (
                    <span style={{ color: '#475569', marginLeft: 4, fontSize: 8 }}>select arch</span>
                  )}
                </button>
                {needsHouse && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 2, marginLeft: 12 }}>
                    {['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body'].map(h => (
                      <button key={h}
                        onClick={() => onRunTool(tool.name, { houseName: h })}
                        style={{
                          background: 'none', border: `1px solid ${HOUSE_COLORS[h]}44`,
                          color: HOUSE_COLORS[h], padding: '1px 4px', fontSize: 7,
                          cursor: 'pointer', letterSpacing: '0.05em'
                        }}
                      >{h.slice(0, 3).toUpperCase()}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </SidebarSection>

        {/* Live Reading */}
        <SidebarSection title="LIVE READING" titleColor="#8b5cf6"
          help="Send this reading to the AI investigate endpoint. Optionally give it a question/topic to focus on. See the full interpretation + every tool call the AI makes."
        >
          <textarea
            value={liveQuestion}
            onChange={(e) => setLiveQuestion(e.target.value)}
            placeholder="Optional: what's the question?"
            style={{
              width: '100%',
              minHeight: 36,
              maxHeight: 80,
              padding: '5px 8px',
              background: '#020617',
              border: '1px solid #334155',
              color: '#e2e8f0',
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              resize: 'vertical',
              marginBottom: 6,
              outline: 'none'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
            onBlur={(e) => { e.target.style.borderColor = '#334155'; }}
          />
          <button
            onClick={onRunReading}
            disabled={liveReadingLoading}
            title="Send the current 78-position reading to the investigate API. The AI will trace derivation chains using the diagnostic tools and produce an interpretation."
            style={{
              background: liveReadingLoading ? '#1e1b4b' : '#1e293b',
              border: `1px solid ${liveReadingLoading ? '#8b5cf6' : '#334155'}`,
              color: liveReadingLoading ? '#a78bfa' : '#e2e8f0',
              padding: '6px 12px',
              fontSize: 10,
              cursor: liveReadingLoading ? 'wait' : 'pointer',
              width: '100%',
              textAlign: 'center',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
          >
            {liveReadingLoading ? 'AI INVESTIGATING...' : (liveQuestion.trim() ? 'RUN WITH QUESTION' : 'RUN READING')}
          </button>
        </SidebarSection>

        {/* Triage Seed */}
        <SidebarSection title="AI SEED" help={HELP.seed}>
          <button
            onClick={() => setShowSeed(!showSeed)}
            title={HELP.aiSeedPayload}
            style={{
              background: 'none', border: '1px solid #334155', color: '#94a3b8',
              padding: '4px 8px', fontSize: 10, cursor: 'pointer', width: '100%',
              textAlign: 'left'
            }}
          >
            {showSeed ? 'Hide' : 'Show'} triage seed ({seed.length} chars)
          </button>
          {showSeed && (
            <pre style={{
              marginTop: 8, padding: 8, background: '#020617', border: '1px solid #1e293b',
              fontSize: 9, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 300, overflow: 'auto', color: '#94a3b8'
            }}>
              {seed}
            </pre>
          )}
        </SidebarSection>
      </div>
    </div>
  );
}

function SidebarSection({ title, titleColor = '#64748b', help, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, color: titleColor, letterSpacing: '0.15em',
        marginBottom: 6, borderBottom: `1px solid ${titleColor}33`, paddingBottom: 3,
        display: 'flex', alignItems: 'center', gap: 4
      }}
        title={help}
      >
        {title}
        {help && <span style={{ fontSize: 7, color: '#334155', cursor: 'help' }} title={help}>?</span>}
      </div>
      {children}
    </div>
  );
}

function HorizonBar({ label, data, help }) {
  const pct = Math.round(data.health * 100);
  return (
    <div style={{ flex: 1 }} title={help}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444' }}>{pct}%</span>
      </div>
      <div style={{ height: 2, background: '#1e293b' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 1,
          background: pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444'
        }} />
      </div>
    </div>
  );
}

function PortalVital({ label, data, help }) {
  if (!data) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }} title={help}>
      <span style={{ fontSize: 11, color: '#cbd5e1' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{data.visitor}</span>
        <span style={{
          fontSize: 9, padding: '1px 5px',
          background: (STATUS_COLORS[data.status] || '#6b7280') + '22',
          color: STATUS_COLORS[data.status] || '#6b7280',
          border: `1px solid ${(STATUS_COLORS[data.status] || '#6b7280')}44`
        }}>
          {data.status}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// POSITION GRID
// ═══════════════════════════════════════
function PositionGrid({ drawMap, triage, analysis, selectedArchetype, highlightedPositions, onSelectArchetype, useTraditional }) {
  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }}>
      {/* Section: Portals + Gestalt — governance root */}
      <GridSection title="PORTALS + GESTALT" subtitle="Governance root — Source governs Gestalt, Gestalt governs the manifest houses" help={HELP.portals}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Row 1: Portals */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {PORTAL_IDS.map(id => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.05em' }}
                  title={id === 10 ? HELP.portalSource : HELP.portalCreation}
                >
                  {id === 10 ? 'SOURCE (10)' : 'CREATION (21)'}
                </div>
                <PositionCard
                  positionId={id}
                  draw={drawMap[id]}
                  isArchetype={true}
                  isSelected={selectedArchetype === id}
                  isHighlighted={highlightedPositions.has(id)}
                  hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(id)}
                  onSelect={onSelectArchetype}
                  drawMap={drawMap}
                  useTraditional={useTraditional}
                />
              </div>
            ))}
          </div>
          {/* Row 2: Gestalt label + cards + governance map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 8, color: '#334155' }} title="Source governs Gestalt">{'\u2193'}</div>
              <div style={{ fontSize: 8, color: HOUSE_COLORS.Gestalt, letterSpacing: '0.05em' }}
                title="Observer house — Potential, Will, Actualization, Awareness. Governs the four manifest houses."
              >
                GESTALT
              </div>
            </div>
            {/* Two rows of 2 Gestalt archetypes each */}
            {[[...HOUSES.Gestalt.members.slice(2)].reverse(), HOUSES.Gestalt.members.slice(0, 2)].map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {row.map(id => {
                  const bounds = getBoundsForArchetype(id);
                  const floor = bounds.find(b => b.horizon === 'inner');
                  const ceiling = bounds.find(b => b.horizon === 'outer');
                  const govTarget = id === 0 ? 'Spirit' : id === 19 ? 'Mind' : id === 20 ? 'Emotion' : id === 1 ? 'Body' : null;
                  return (
                    <div key={id} style={{
                      display: 'flex', gap: 3, alignItems: 'center',
                      padding: '6px 8px',
                      background: '#ffffff06',
                      border: '1px solid #ffffff0a',
                      borderRadius: 3
                    }}>
                      {floor && (
                        <PositionCard
                          positionId={floor.id}
                          draw={drawMap[floor.id]}
                          isArchetype={false}
                          parentArchetypeId={id}
                          isSelected={selectedArchetype === id}
                          isHighlighted={highlightedPositions.has(floor.id)}
                          hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(floor.id)}
                          label="FLR"
                          onSelect={onSelectArchetype}
                          drawMap={drawMap}
                          useTraditional={useTraditional}
                          compact
                        />
                      )}
                      <PositionCard
                        positionId={id}
                        draw={drawMap[id]}
                        isArchetype={true}
                        isSelected={selectedArchetype === id}
                        isHighlighted={highlightedPositions.has(id)}
                        hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(id)}
                        onSelect={onSelectArchetype}
                        drawMap={drawMap}
                        useTraditional={useTraditional}
                      />
                      {ceiling && (
                        <PositionCard
                          positionId={ceiling.id}
                          draw={drawMap[ceiling.id]}
                          isArchetype={false}
                          parentArchetypeId={id}
                          isSelected={selectedArchetype === id}
                          isHighlighted={highlightedPositions.has(ceiling.id)}
                          hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(ceiling.id)}
                          label="CLG"
                          onSelect={onSelectArchetype}
                          drawMap={drawMap}
                          useTraditional={useTraditional}
                          compact
                        />
                      )}
                      {govTarget && (
                        <div style={{ fontSize: 7, color: '#334155', marginLeft: 2, whiteSpace: 'nowrap' }}
                          title={`${useTraditional ? (ARCHETYPES[id]?.traditional || ARCHETYPES[id]?.name) : ARCHETYPES[id]?.name} governs ${govTarget}`}
                        >
                          {'\u2192'}<span style={{ color: HOUSE_COLORS[govTarget] }}>{govTarget}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </GridSection>

      {/* Section: Manifest Houses — archetypes + bounds + agents integrated */}
      <GridSection title="MANIFEST HOUSES" subtitle="Archetypes + bounds + agents by house" help={HELP.archetypes}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {HOUSE_ORDER.filter(h => h !== 'Gestalt').map(house => {
            const members = HOUSES[house].members;
            const hasAgents = members.some(id => getAgentsForArchetype(id).length > 0);
            return (
              <div key={house} style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                padding: '10px 12px',
                background: (HOUSE_COLORS[house] || '#6b7280') + '08',
                border: `1px solid ${(HOUSE_COLORS[house] || '#6b7280')}22`,
                borderTop: `2px solid ${(HOUSE_COLORS[house] || '#6b7280')}44`,
                borderRadius: 4
              }}>
                {/* House label */}
                <div style={{ fontSize: 9, color: HOUSE_COLORS[house], letterSpacing: '0.1em' }}
                  title={house === 'Spirit' ? 'Fire house — Intent channel. Inner creative force.'
                    : house === 'Mind' ? 'Air house — Cognition channel. Pattern recognition.'
                    : house === 'Emotion' ? 'Water house — Resonance channel. Feeling and connection.'
                    : 'Earth house — Structure channel. Manifest form.'}
                >
                  {house.toUpperCase()}
                </div>
                {/* Each archetype: agent above, then floor | major | ceiling */}
                {members.map(archId => {
                  const bounds = getBoundsForArchetype(archId);
                  const floor = bounds.find(b => b.horizon === 'inner');
                  const ceiling = bounds.find(b => b.horizon === 'outer');
                  const agents = getAgentsForArchetype(archId);
                  return (
                    <div key={archId} style={{
                      display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4,
                      padding: '6px 8px',
                      background: '#ffffff06',
                      border: '1px solid #ffffff0a',
                      borderRadius: 3
                    }}>
                      {/* Agent(s) above */}
                      {agents.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                          {agents.map(agent => (
                            <PositionCard
                              key={agent.id}
                              positionId={agent.id}
                              draw={drawMap[agent.id]}
                              isArchetype={false}
                              parentArchetypeId={archId}
                              isSelected={selectedArchetype === archId}
                              isHighlighted={highlightedPositions.has(agent.id)}
                              hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(agent.id)}
                              label={agent.role?.slice(0, 3)?.toUpperCase()}
                              onSelect={onSelectArchetype}
                              drawMap={drawMap}
                              useTraditional={useTraditional}
                              compact
                            />
                          ))}
                        </div>
                      )}
                      {/* Floor | Major | Ceiling */}
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {floor && (
                          <PositionCard
                            positionId={floor.id}
                            draw={drawMap[floor.id]}
                            isArchetype={false}
                            parentArchetypeId={archId}
                            isSelected={selectedArchetype === archId}
                            isHighlighted={highlightedPositions.has(floor.id)}
                            hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(floor.id)}
                            label="FLR"
                            onSelect={onSelectArchetype}
                            drawMap={drawMap}
                            useTraditional={useTraditional}
                            compact
                          />
                        )}
                        <PositionCard
                          positionId={archId}
                          draw={drawMap[archId]}
                          isArchetype={true}
                          isSelected={selectedArchetype === archId}
                          isHighlighted={highlightedPositions.has(archId)}
                          hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(archId)}
                          onSelect={onSelectArchetype}
                          drawMap={drawMap}
                          useTraditional={useTraditional}
                        />
                        {ceiling && (
                          <PositionCard
                            positionId={ceiling.id}
                            draw={drawMap[ceiling.id]}
                            isArchetype={false}
                            parentArchetypeId={archId}
                            isSelected={selectedArchetype === archId}
                            isHighlighted={highlightedPositions.has(ceiling.id)}
                            hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(ceiling.id)}
                            label="CLG"
                            onSelect={onSelectArchetype}
                            drawMap={drawMap}
                            useTraditional={useTraditional}
                            compact
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </GridSection>

      {/* Displacement Chains */}
      {(() => {
        const allChains = buildAllArchetypeChains(drawMap);
        const loops = allChains.filter(c => c.type === 'closed-loop');
        const swaps = allChains.filter(c => c.type === 'swap');
        const homes = allChains.filter(c => c.type === 'self-seated');
        const chainTypeColors = { 'self-seated': '#fbbf24', 'swap': '#f97316', 'closed-loop': '#60a5fa', 'tail-into-loop': '#a78bfa' };
        const chainTypeIcons = { 'self-seated': '\u2302', 'swap': '\u21C4', 'closed-loop': '\u26A1', 'tail-into-loop': '\u2192' };
        const chainHelp = { 'self-seated': HELP.chainSelfSeated, 'swap': HELP.chainSwap, 'closed-loop': HELP.chainLoop };
        return (
          <GridSection
            title="DISPLACEMENT CHAINS"
            subtitle={`${loops.length} loops \u00B7 ${swaps.length} swaps \u00B7 ${homes.length} home`}
            help={HELP.chains}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allChains.map((chain, i) => {
                const color = chainTypeColors[chain.type] || '#94a3b8';
                const icon = chainTypeIcons[chain.type] || '';
                const members = chain.loop.map(n => useTraditional ? getSignatureName(n.position, true) : n.name);
                return (
                  <div key={i}
                    onClick={() => {
                      const firstPos = chain.loop[0]?.position ?? chain.path[0]?.position;
                      if (firstPos != null) onSelectArchetype(firstPos);
                    }}
                    style={{
                      padding: '6px 10px', background: '#1e293b', border: `1px solid ${color}33`,
                      fontSize: 10, color: '#94a3b8', cursor: 'pointer',
                      transition: 'border-color 0.2s', borderLeft: `3px solid ${color}55`
                    }}
                    title={`${chainHelp[chain.type] || HELP.chainTail}\n\nClick to inspect: ${members[0] || (useTraditional ? getSignatureName(chain.path[0]?.position, true) : chain.path[0]?.name)}.\nMembers: ${members.join(' \u2192 ')}${chain.feederCount ? `\n${chain.feederCount} derivative feeders` : ''}`}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = color + '33'; }}
                  >
                    <span style={{ color, marginRight: 4 }}>{icon}</span>
                    <span style={{ color: '#e2e8f0' }}>{chain.label}</span>
                    <span style={{ color: '#64748b' }}> </span>
                    {members.join(' \u2192 ')}
                    {chain.type !== 'self-seated' && (
                      <span style={{ color: color + '88', marginLeft: 2 }}>{'\u21BA'}</span>
                    )}
                    {chain.feederCount > 0 && (
                      <span style={{ color: '#475569', marginLeft: 6 }} title={HELP.chainFeeder}>
                        +{chain.feederCount} feeders
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </GridSection>
        );
      })()}
    </div>
  );
}

function GridSection({ title, subtitle, help, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }} title={help}>
        <span style={{ fontSize: 10, color: '#e2e8f0', letterSpacing: '0.15em' }}>{title}</span>
        <span style={{ fontSize: 9, color: '#475569' }}>{subtitle}</span>
        {help && <span style={{ fontSize: 8, color: '#334155', cursor: 'help' }} title={help}>?</span>}
      </div>
      {children}
    </div>
  );
}

function HouseColumn({ house, drawMap, selectedArchetype, highlightedPositions, onSelect }) {
  const members = HOUSES[house].members;
  const houseHelp = {
    Gestalt: 'Observer house — Potential, Will, Actualization, Awareness. No agents (observer can\'t be collapsed).',
    Spirit: 'Fire house — Intent channel. Inner creative force.',
    Mind: 'Air house — Cognition channel. Pattern recognition.',
    Emotion: 'Water house — Resonance channel. Feeling and connection.',
    Body: 'Earth house — Structure channel. Manifest form.'
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontSize: 9, color: HOUSE_COLORS[house], letterSpacing: '0.1em',
        marginBottom: 4, textAlign: 'center'
      }}
        title={houseHelp[house]}
      >
        {house.toUpperCase()}
      </div>
      {members.map(id => (
        <PositionCard
          key={id}
          positionId={id}
          draw={drawMap[id]}
          isArchetype={true}
          isSelected={selectedArchetype === id}
          isHighlighted={highlightedPositions.has(id)}
          hasDim={highlightedPositions.size > 0 && !highlightedPositions.has(id)}
          onSelect={onSelect}
          drawMap={drawMap}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// POSITION CARD
// ═══════════════════════════════════════
function PositionCard({ positionId, draw, isArchetype, parentArchetypeId, isSelected, isHighlighted, hasDim, onSelect, label, compact, drawMap, useTraditional }) {
  if (!draw) return null;

  const statusName = STATUSES[draw.status]?.name || 'Unknown';
  const statusColor = STATUS_COLORS[statusName] || '#6b7280';
  const visitorName = getSignatureName(draw.transient, useTraditional);
  const visitorClass = getSignatureClass(draw.transient);
  const isSelfSeated = resolveArchetypePosition(draw.transient) === positionId;
  const isDistorted = statusName !== 'Balanced';
  const visitorImagePath = getCardImagePath(draw.transient);

  // Chain type for this position
  const chain = drawMap ? buildChainForPosition(positionId, drawMap) : null;
  const chainType = chain?.type;
  const chainIcon = chainType === 'swap' ? '\u21C4'
    : chainType === 'closed-loop' ? '\u26A1'
    : chainType === 'tail-into-loop' ? '\u2192'
    : null;
  const chainColor = chainType === 'swap' ? '#f97316'
    : chainType === 'closed-loop' ? '#60a5fa'
    : chainType === 'tail-into-loop' ? '#a78bfa'
    : null;

  // Click target: archetypes select themselves, bounds/agents select parent archetype
  const clickTarget = isArchetype ? positionId : parentArchetypeId;
  const isClickable = onSelect && clickTarget != null;

  let posName;
  if (positionId < 22) posName = useTraditional ? (ARCHETYPES[positionId]?.traditional || ARCHETYPES[positionId]?.name) : ARCHETYPES[positionId]?.name;
  else if (positionId < 62) posName = useTraditional ? (BOUNDS[positionId]?.traditional || BOUNDS[positionId]?.name) : BOUNDS[positionId]?.name;
  else posName = useTraditional ? (AGENTS[positionId]?.traditional || AGENTS[positionId]?.name) : AGENTS[positionId]?.name;

  // Build tooltip
  const sigClass = getSignatureClass(positionId);
  const statusHelp = HELP[statusName === 'Too Much' ? 'tooMuch' : statusName === 'Too Little' ? 'tooLittle' : statusName === 'Unacknowledged' ? 'unacknowledged' : 'balanced'];
  const labelHelp = label === 'FLR' ? HELP.floor : label === 'CLG' ? HELP.ceiling : '';
  const chainHelp = chainType === 'self-seated' ? ''
    : chainType === 'swap' ? `\n\u21C4 Swap chain: ${chain.loop.map(n => n.name).join(' \u2194 ')}`
    : chainType === 'closed-loop' ? `\n\u26A1 In ${chain.loopSize}-member loop: ${chain.loop.map(n => n.name).join(' \u2192 ')}`
    : chainType === 'tail-into-loop' ? `\n\u2192 Feeds into ${chain.loopSize}-member loop via ${chain.tail.map(n => n.name).join(' \u2192 ')}`
    : '';
  const tooltip = `[${positionId}] ${posName} (${sigClass})\nStatus: ${statusName}\nVisitor: ${visitorName} [${visitorClass}]${isSelfSeated ? '\n\u2B50 Self-seated' : ''}${labelHelp ? '\n' + labelHelp : ''}\n${statusHelp}${chainHelp}\n\nClick to inspect ${isArchetype ? 'this archetype' : 'parent: ' + getSignatureName(clickTarget, useTraditional)}`;

  const w = compact ? 90 : 130;
  const h = compact ? 'auto' : 56;
  const borderColor = isSelected ? '#3b82f6' :
    isSelfSeated && !isDistorted ? '#fbbf2466' :
    isHighlighted ? statusColor + '88' :
    '#1e293b';

  return (
    <div
      onClick={() => isClickable && onSelect(clickTarget)}
      title={tooltip}
      style={{
        width: w,
        minHeight: h,
        padding: compact ? '3px 5px' : '6px 8px',
        background: isSelected ? '#1e3a5f' : '#111827',
        borderTop: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${statusColor}`,
        cursor: isClickable ? 'pointer' : 'default',
        opacity: hasDim ? 0.3 : 1,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        gap: compact ? 3 : 5,
        alignItems: 'flex-start'
      }}
    >
      {/* Glow for distorted */}
      {isDistorted && isHighlighted && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `${statusColor}08`,
          pointerEvents: 'none'
        }} />
      )}

      {/* Self-seated indicator */}
      {isSelfSeated && !isDistorted && (
        <div title={HELP.selfSeated} style={{
          position: 'absolute', top: 2, right: 2,
          width: 5, height: 5, borderRadius: '50%',
          background: '#fbbf24'
        }} />
      )}

      {/* Chain type indicator */}
      {chainIcon && (
        <div title={
          chainType === 'swap' ? HELP.chainSwap
          : chainType === 'closed-loop' ? HELP.chainLoop
          : HELP.chainTail
        } style={{
          position: 'absolute', top: 2, left: compact ? 'auto' : 32,
          right: compact ? 2 : 'auto',
          fontSize: 7, color: chainColor, lineHeight: 1
        }}>
          {chainIcon}
        </div>
      )}

      {/* Card thumbnail */}
      {visitorImagePath && !compact && (
        <img
          src={visitorImagePath}
          alt=""
          style={{
            width: 28,
            height: 'auto',
            borderRadius: 2,
            flexShrink: 0,
            border: `1px solid ${statusColor}44`,
            marginTop: 1
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      {visitorImagePath && compact && (
        <img
          src={visitorImagePath}
          alt=""
          style={{
            width: 18,
            height: 'auto',
            borderRadius: 1,
            flexShrink: 0,
            border: `1px solid ${statusColor}33`
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        {compact && label && (
          <div style={{ fontSize: 7, color: '#64748b', lineHeight: 1, marginBottom: 1 }}
            title={label === 'FLR' ? HELP.floor : label === 'CLG' ? HELP.ceiling : ''}
          >{label}</div>
        )}
        <div style={{
          fontSize: compact ? 8 : 10,
          color: '#e2e8f0',
          fontWeight: 600,
          lineHeight: 1.3,
          whiteSpace: compact ? 'nowrap' : undefined,
          overflow: compact ? 'hidden' : undefined,
          textOverflow: compact ? 'ellipsis' : undefined
        }}>
          {!compact && label && <span style={{ color: '#64748b', marginRight: 3 }}
            title={label === 'FLR' ? HELP.floor : label === 'CLG' ? HELP.ceiling : ''}
          >{label}</span>}
          {posName}
        </div>

        <div style={{
          fontSize: compact ? 7 : 9,
          color: '#64748b',
          marginTop: 1,
          whiteSpace: compact ? 'nowrap' : undefined,
          overflow: compact ? 'hidden' : undefined,
          textOverflow: compact ? 'ellipsis' : undefined
        }}>
          {compact
            ? visitorName
            : `\u2190 ${visitorName} [${visitorClass}]`
          }
        </div>

        {!compact && (
          <div style={{
            fontSize: 8,
            color: statusColor,
            marginTop: 2,
            opacity: 0.8
          }}>
            {statusName}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CHAIN INSPECTOR
// ═══════════════════════════════════════
function ChainInspector({ archetypeId, results, drawMap, analysis, expandedTools, setExpandedTools, onSelectArchetype, useTraditional, onClose }) {
  const arch = ARCHETYPES[archetypeId];
  const draw = drawMap[archetypeId];
  const statusName = STATUSES[draw?.status]?.name;
  const statusColor = STATUS_COLORS[statusName] || '#6b7280';
  const positionImagePath = getCardImagePath(archetypeId);
  const visitorImagePath = draw ? getCardImagePath(draw.transient) : null;
  const chain = buildChainForPosition(archetypeId, drawMap);

  const toggleTool = (name) => {
    setExpandedTools(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{
      width: 420,
      minWidth: 420,
      background: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1e293b',
        background: '#020617',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
          {/* Position + Visitor card images */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {positionImagePath && (
              <div style={{ position: 'relative' }}>
                <img
                  src={positionImagePath}
                  alt={arch?.name}
                  style={{
                    width: 40, height: 'auto', borderRadius: 3,
                    border: '1px solid #334155'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div style={{
                  position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 7, color: '#94a3b8', background: '#020617', padding: '0 3px',
                  whiteSpace: 'nowrap'
                }} title={`Position image: the archetype that lives here natively (${arch?.name})`}>POS</div>
              </div>
            )}
            {visitorImagePath && draw.transient !== archetypeId && (
              <div style={{ position: 'relative' }}>
                <img
                  src={visitorImagePath}
                  alt={getSignatureName(draw.transient, useTraditional)}
                  title={`Visitor: ${getSignatureName(draw.transient, useTraditional)} — the signature currently sitting in this position`}
                  style={{
                    width: 40, height: 'auto', borderRadius: 3,
                    border: `1px solid ${statusColor}66`
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div style={{
                  position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 7, color: statusColor, background: '#020617', padding: '0 3px',
                  whiteSpace: 'nowrap'
                }} title={HELP.visitor}>VIS</div>
              </div>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              {useTraditional ? (arch?.traditional || arch?.name) : arch?.name}
              <span style={{
                fontSize: 10, marginLeft: 8,
                color: statusColor, fontWeight: 400
              }}
                title={HELP[statusName === 'Too Much' ? 'tooMuch' : statusName === 'Too Little' ? 'tooLittle' : statusName === 'Unacknowledged' ? 'unacknowledged' : 'balanced']}
              >
                {statusName}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}
              title={`House: ${getHouseForArchetype(archetypeId)} \u2014 the domain this archetype operates in.\nChannel: ${arch?.channel || 'none'} \u2014 the elemental energy it carries.\nHorizon: ${INNER_OUTER_HORIZON[archetypeId]} \u2014 inner (Wheel/personal) or outer (World/relational).`}
            >
              {getHouseForArchetype(archetypeId)} \u00B7 {arch?.channel || 'null'} \u00B7 {INNER_OUTER_HORIZON[archetypeId]}
            </div>
            {draw && draw.transient !== archetypeId && (
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                Visitor: {getSignatureName(draw.transient, useTraditional)} [{getSignatureClass(draw.transient)}]
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #334155', color: '#64748b',
            padding: '4px 8px', cursor: 'pointer', fontSize: 11, flexShrink: 0
          }}
        >
          \u2715
        </button>
      </div>

      {/* Chain Steps */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {/* Chain Flow Visual */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, padding: '8px 16px', marginBottom: 8
        }}>
          {[
            { name: 'Process', tip: 'Who sits here, what status, what does it mean?' },
            { name: 'Bounds', tip: 'Floor/ceiling constraints — is the operating range intact?' },
            { name: 'Medicine', tip: 'The rebalancing path — where to direct energy for correction' }
          ].map((step, i) => (
            <div key={step.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div title={step.tip} style={{
                padding: '3px 10px', fontSize: 9,
                background: '#1e293b', border: '1px solid #334155',
                color: '#e2e8f0', letterSpacing: '0.05em'
              }}>
                {step.name}
              </div>
              {i < 2 && <span style={{ color: '#334155', fontSize: 12 }}>\u2192</span>}
            </div>
          ))}
        </div>

        {/* Process Detail */}
        <ToolResult
          name="getProcessDetail"
          label="CHAIN STEP 1: Process"
          data={results.processDetail}
          expanded={expandedTools.processDetail}
          onToggle={() => toggleTool('processDetail')}
          summary={results.processDetail && (
            <div style={{ fontSize: 10, lineHeight: 1.6 }}>
              <KeyVal label="Visitor" value={`${results.processDetail.visitor?.name} [${results.processDetail.visitor?.class}]`} />
              <KeyVal label="Self-seated" value={results.processDetail.isSelfSeated ? 'Yes' : 'No'} color={results.processDetail.isSelfSeated ? '#22c55e' : '#94a3b8'} />
              {results.processDetail.rebalancing && (
                <KeyVal
                  label="Rebalancing"
                  value={`${results.processDetail.rebalancing.type} \u2192 ${results.processDetail.rebalancing.targetName} (${results.processDetail.rebalancing.targetHouse})`}
                  color={STATUS_COLORS[results.processDetail.rebalancing.statusTrigger] || '#94a3b8'}
                />
              )}
              {chain && (
                <KeyVal label="Chain" value={chain.label} color={
                  chain.type === 'self-seated' ? '#fbbf24'
                  : chain.type === 'swap' ? '#f97316'
                  : chain.type === 'closed-loop' ? '#60a5fa'
                  : '#a78bfa'
                } />
              )}
            </div>
          )}
        />

        {/* Bound Diagnosis */}
        <ToolResult
          name="getBoundDiagnosis"
          label="CHAIN STEP 2: Bounds"
          data={results.boundDiagnosis}
          expanded={expandedTools.boundDiagnosis}
          onToggle={() => toggleTool('boundDiagnosis')}
          summary={results.boundDiagnosis && (
            <div style={{ fontSize: 10, lineHeight: 1.6 }}>
              <KeyVal
                label="Pattern"
                value={results.boundDiagnosis.pattern}
                color={
                  results.boundDiagnosis.pattern === 'range-compromised' ? '#ef4444' :
                  results.boundDiagnosis.pattern === 'range-healthy' ? '#22c55e' :
                  '#eab308'
                }
              />
              {results.boundDiagnosis.floor && (
                <KeyVal
                  label="Floor"
                  value={`${results.boundDiagnosis.floor.name} \u2014 ${results.boundDiagnosis.floor.status || 'OK'}${results.boundDiagnosis.floor.rebalancing ? ` \u2192 ${results.boundDiagnosis.floor.rebalancing.targetName}` : ''}`}
                  color={results.boundDiagnosis.floor.isDistorted ? '#ef4444' : '#22c55e'}
                />
              )}
              {results.boundDiagnosis.ceiling && (
                <KeyVal
                  label="Ceiling"
                  value={`${results.boundDiagnosis.ceiling.name} \u2014 ${results.boundDiagnosis.ceiling.status || 'OK'}${results.boundDiagnosis.ceiling.rebalancing ? ` \u2192 ${results.boundDiagnosis.ceiling.rebalancing.targetName}` : ''}`}
                  color={results.boundDiagnosis.ceiling.isDistorted ? '#ef4444' : '#22c55e'}
                />
              )}
            </div>
          )}
        />

        {/* Correction Path */}
        <ToolResult
          name="getCorrectionPath"
          label="CHAIN STEP 3: Medicine"
          data={results.correctionPath}
          expanded={expandedTools.correctionPath}
          onToggle={() => toggleTool('correctionPath')}
          summary={results.correctionPath && (
            <div style={{ fontSize: 10, lineHeight: 1.6 }}>
              {results.correctionPath.rebalancing && (
                <>
                  <KeyVal
                    label="Rx Type"
                    value={results.correctionPath.rebalancing.type}
                    color={STATUS_COLORS[results.correctionPath.rebalancing.statusTrigger] || '#c084fc'}
                  />
                  <KeyVal
                    label="Rx Target"
                    value={
                      <span
                        onClick={(e) => { e.stopPropagation(); onSelectArchetype(results.correctionPath.rebalancing.targetId); }}
                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                      >
                        {results.correctionPath.rebalancing.targetName} ({results.correctionPath.rebalancing.targetHouse})
                      </span>
                    }
                  />
                </>
              )}
              {results.correctionPath.rebalancingTargetState && (
                <KeyVal
                  label="Target state"
                  value={`${results.correctionPath.rebalancingTargetState.status}${results.correctionPath.rebalancingTargetState.isDistorted ? ' \u26A0' : ''}`}
                  color={results.correctionPath.rebalancingTargetState.isDistorted ? '#ef4444' : '#22c55e'}
                />
              )}
              <KeyVal
                label="V. Partner"
                value={
                  <span
                    onClick={(e) => { e.stopPropagation(); onSelectArchetype(results.correctionPath.partnerId); }}
                    style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                  >
                    {results.correctionPath.partnerName}
                  </span>
                }
                color={results.correctionPath.correctionAvailable ? '#22c55e' : '#ef4444'}
              />
              {results.correctionPath.boundChain && (
                <KeyVal
                  label="Bound chain"
                  value={`${results.correctionPath.boundChain.pathStatus} (${results.correctionPath.boundChain.channelCrossing})`}
                  color={
                    results.correctionPath.boundChain.pathStatus === 'open' ? '#22c55e' :
                    results.correctionPath.boundChain.pathStatus === 'blocked' ? '#ef4444' :
                    '#eab308'
                  }
                />
              )}
            </div>
          )}
        />

        {/* Manifest Readout (if available) */}
        {results.manifestReadout && (
          <ToolResult
            name="getManifestReadout"
            label="EXTENSION: Manifest"
            data={results.manifestReadout}
            expanded={expandedTools.manifestReadout}
            onToggle={() => toggleTool('manifestReadout')}
            summary={results.manifestReadout?.available !== false && (
              <div style={{ fontSize: 10, lineHeight: 1.6 }}>
                <KeyVal label="Agent" value={results.manifestReadout.agentName} />
                <KeyVal label="Visitor" value={`${results.manifestReadout.visitor} [${results.manifestReadout.visitorClass}]`} />
                <KeyVal
                  label="Status"
                  value={results.manifestReadout.status}
                  color={results.manifestReadout.isDistorted ? '#ef4444' : '#22c55e'}
                />
              </div>
            )}
          />
        )}

        {/* Displacement Chain */}
        {chain && (
          <div style={{ margin: '0 16px 8px', border: `1px solid ${
            chain.type === 'self-seated' ? '#fbbf2444' : chain.type === 'swap' ? '#f9731644' : chain.type === 'closed-loop' ? '#1e3a5f' : '#7c3aed44'
          }`, background: '#0c1425' }}>
            <div style={{
              padding: '6px 10px', background: '#111827',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 9, color:
                chain.type === 'self-seated' ? '#fbbf24' : chain.type === 'swap' ? '#f97316' : chain.type === 'closed-loop' ? '#60a5fa' : '#a78bfa',
                letterSpacing: '0.1em'
              }}>
                {chain.type === 'self-seated' ? '\u2302' : chain.type === 'swap' ? '\u21C4' : chain.type === 'closed-loop' ? '\u26A1' : '\u2192'} DISPLACEMENT CHAIN
              </span>
              <span style={{ fontSize: 8, color: '#475569' }} title={
                chain.type === 'self-seated' ? HELP.chainSelfSeated
                : chain.type === 'swap' ? HELP.chainSwap
                : chain.type === 'closed-loop' ? HELP.chainLoop
                : HELP.chainTail
              }>
                {chain.label}
              </span>
            </div>
            <div style={{ padding: '8px 10px' }}>
              {/* Tail portion (if tail-into-loop) */}
              {chain.tail.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 8, color: '#a78bfa', marginBottom: 4, letterSpacing: '0.05em' }}
                    title={HELP.chainTail}>
                    TAIL ({chain.tailSize})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {chain.tail.map((node, i) => {
                      const nodeColor = STATUS_COLORS[node.status] || '#6b7280';
                      const isThis = node.position === archetypeId;
                      return (
                        <div key={node.position} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            onClick={() => !isThis && node.position < 22 && onSelectArchetype(node.position)}
                            style={{
                              padding: '3px 8px', fontSize: 9,
                              background: isThis ? '#1e3a5f' : '#111827',
                              border: `1px solid ${isThis ? '#a78bfa' : '#334155'}`,
                              color: isThis ? '#c4b5fd' : '#e2e8f0',
                              cursor: !isThis && node.position < 22 ? 'pointer' : 'default',
                              display: 'flex', alignItems: 'center', gap: 4,
                              opacity: node.sigClass !== 'archetype' ? 0.7 : 1
                            }}
                            title={`[${node.position}] ${useTraditional ? getSignatureName(node.position, true) : node.name} (${node.sigClass})\nStatus: ${node.status}\nVisitor: ${useTraditional ? getSignatureName(node.visitorId || node.position, true) : node.visitorName}\n${node.isSelfSeated ? '\u2B50 Self-seated' : `Visitor belongs at: ${getSignatureName(node.visitorHome, useTraditional)}`}\n${isThis ? 'Current selection' : node.position < 22 ? 'Click to inspect' : `Parent: ${getSignatureName(resolveArchetypePosition(node.position), useTraditional)}`}`}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: nodeColor, flexShrink: 0 }} />
                            <span>{useTraditional ? getSignatureName(node.position, true) : node.name}</span>
                            {node.sigClass !== 'archetype' && (
                              <span style={{ fontSize: 7, color: '#64748b' }}>{node.sigClass.slice(0, 3)}</span>
                            )}
                          </div>
                          <span style={{ color: '#a78bfa44', fontSize: 10 }}>{'\u2192'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loop portion */}
              {chain.loop.length > 0 && (
                <div>
                  {chain.tail.length > 0 && (
                    <div style={{ fontSize: 8, color: '#60a5fa', marginBottom: 4, letterSpacing: '0.05em' }}
                      title={chain.type === 'self-seated' ? HELP.chainSelfSeated : chain.type === 'swap' ? HELP.chainSwap : HELP.chainLoop}>
                      {chain.type === 'self-seated' ? 'HOME' : chain.type === 'swap' ? 'SWAP' : `LOOP (${chain.loopSize})`}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {chain.loop.map((node, i) => {
                      const nodeColor = STATUS_COLORS[node.status] || '#6b7280';
                      const isThis = node.position === archetypeId;
                      const chainColor = chain.type === 'self-seated' ? '#fbbf24' : chain.type === 'swap' ? '#f97316' : '#60a5fa';
                      return (
                        <div key={node.position} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            onClick={() => !isThis && onSelectArchetype(node.position)}
                            style={{
                              padding: '3px 8px', fontSize: 9,
                              background: isThis ? '#1e3a5f' : '#111827',
                              border: `1px solid ${isThis ? chainColor : '#334155'}`,
                              color: isThis ? '#93c5fd' : '#e2e8f0',
                              cursor: isThis ? 'default' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                            title={`[${node.position}] ${useTraditional ? getSignatureName(node.position, true) : node.name}\nStatus: ${node.status}\nVisitor: ${node.visitorName}${node.isSelfSeated ? ' (home)' : ''}\n${isThis ? 'Current selection' : 'Click to inspect'}`}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: nodeColor, flexShrink: 0 }} />
                            {useTraditional ? getSignatureName(node.position, true) : node.name}
                          </div>
                          {chain.loop.length > 1 && i < chain.loop.length - 1 && (
                            <span style={{ color: '#334155', fontSize: 10 }}
                              title={`${node.visitorName} sits here, belongs at ${getSignatureName(node.visitorHome, useTraditional)}`}
                            >{'\u2192'}</span>
                          )}
                        </div>
                      );
                    })}
                    {chain.loop.length > 1 && (
                      <span style={{ color: '#334155', fontSize: 10 }}
                        title="Chain closes — energy circulates back to the start"
                      >{'\u21BA'}</span>
                    )}
                    {chain.type === 'self-seated' && (
                      <span style={{ color: '#fbbf2488', fontSize: 10 }}
                        title={HELP.chainSelfSeated}
                      >{'\u21A9'}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Chain narrative */}
              <div style={{ fontSize: 8, color: '#475569', marginTop: 6, lineHeight: 1.4 }}
                title="What the chain pattern means for this archetype's energy flow"
              >
                {chain.type === 'self-seated' && (
                  <>{useTraditional ? (arch?.traditional || arch?.name) : arch?.name}&apos;s own signature is home. No displacement — energy flows naturally.
                  {statusName !== 'Balanced' && ` Despite being home, the process is ${statusName.toLowerCase()}.`}</>
                )}
                {chain.type === 'swap' && (
                  <>Two archetypes exchanged visitors: {useTraditional ? getSignatureName(chain.loop[0]?.position, true) : chain.loop[0]?.name} and {useTraditional ? getSignatureName(chain.loop[1]?.position, true) : chain.loop[1]?.name} sit in each other&apos;s position.
                  {chain.loop.every(n => n.status !== 'Balanced') ? ' Both seeking balance — mutual displacement invites attention.' : ''}</>
                )}
                {chain.type === 'closed-loop' && (
                  <>Energy circulates through {chain.loopSize} positions. Each member&apos;s visitor sits in the next.
                  {chain.loop.every(n => n.status !== 'Balanced') ? ' All seeking balance — the entire circulation invites attention.' : ''}</>
                )}
                {chain.type === 'tail-into-loop' && (
                  <>{getSignatureName(chain.startPosition, useTraditional)} feeds energy into the {chain.loopSize}-member loop at {useTraditional ? getSignatureName(chain.loop[0]?.position, true) : chain.loop[0]?.name}.
                  The tail doesn&apos;t circulate — it only feeds in.</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meaning block */}
        {results.correctionPath?.rebalancing?.meaning && (
          <div style={{
            margin: '8px 16px', padding: '10px 12px',
            background: '#0c1425', border: '1px solid #1e3a5f',
            fontSize: 10, color: '#93c5fd', lineHeight: 1.5,
            fontStyle: 'italic'
          }}
            title={HELP.rebalancing}
          >
            {results.correctionPath.rebalancing.meaning}
          </div>
        )}

        {/* Archetype states */}
        {results.processDetail?.states && (
          <div style={{ margin: '8px 16px' }}>
            <div style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.1em', marginBottom: 6 }}
              title="What each state means for this specific archetype. The highlighted row shows the current state."
            >
              STATE DESCRIPTIONS
            </div>
            {Object.entries(results.processDetail.states).map(([key, desc]) => {
              const isActive = (
                (key === 'balanced' && statusName === 'Balanced') ||
                (key === 'tooMuch' && statusName === 'Too Much') ||
                (key === 'tooLittle' && statusName === 'Too Little') ||
                (key === 'unacknowledged' && statusName === 'Unacknowledged')
              );
              return (
                <div key={key} style={{
                  fontSize: 9, marginBottom: 4, padding: '4px 6px',
                  background: isActive ? '#1e293b' : 'transparent',
                  border: isActive ? '1px solid #334155' : '1px solid transparent',
                  color: isActive ? '#e2e8f0' : '#475569',
                  lineHeight: 1.4
                }}>
                  <span style={{
                    fontWeight: 600,
                    color: isActive ? (STATUS_COLORS[statusName] || '#e2e8f0') : '#64748b'
                  }}>
                    {key}:
                  </span>{' '}
                  {desc}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolResult({ name, label, data, expanded, onToggle, summary }) {
  return (
    <div style={{ margin: '0 16px 8px', border: '1px solid #1e293b' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 10px', background: '#111827', cursor: 'pointer'
        }}
      >
        <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: 10, color: '#475569' }}>{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '8px 10px', background: '#0a0f1a' }}>
          {summary}
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 9, color: '#475569', cursor: 'pointer' }}>Raw JSON</summary>
            <pre style={{
              marginTop: 4, padding: 6, background: '#020617',
              fontSize: 8, lineHeight: 1.4, color: '#64748b',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 200, overflow: 'auto'
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function KeyVal({ label, value, color = '#cbd5e1' }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#64748b', minWidth: 80 }}>{label}</span>
      <span style={{ color }}>{typeof value === 'string' ? value : value}</span>
    </div>
  );
}

// ═══════════════════════════════════════
// TOOL EXPLORER PANEL
// ═══════════════════════════════════════
function ToolExplorerPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div style={{
      width: 420, minWidth: 420,
      background: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e293b',
        background: '#020617', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.1em' }}>TOOL EXPLORER</span>
          <div style={{ fontSize: 10, color: '#e2e8f0', marginTop: 2 }}>{result.tool}</div>
          {Object.keys(result.input).length > 0 && (
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
              Input: {JSON.stringify(result.input)}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid #334155', color: '#64748b',
          padding: '4px 8px', cursor: 'pointer', fontSize: 11
        }}>{'\u2715'}</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <pre style={{
          fontSize: 9, lineHeight: 1.5, color: '#94a3b8',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word'
        }}>
          {JSON.stringify(result.result, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// LIVE READING PANEL
// ═══════════════════════════════════════
function LiveReadingPanel({ data, useTraditional, onClose, onSelectArchetype }) {
  const [expandedTraces, setExpandedTraces] = useState({});

  if (!data) return null;

  const toggleTrace = (i) => {
    setExpandedTraces(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div style={{
      width: 480, minWidth: 480,
      background: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e293b',
        background: '#020617', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: 11, color: '#8b5cf6', letterSpacing: '0.1em' }}>LIVE READING</span>
          {data.meta && (
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
              {data.meta.toolCallCount} tool calls · {data.meta.rounds} rounds · {data.meta.model}
              {data.usage && <span> · {data.usage.input_tokens + data.usage.output_tokens} tokens</span>}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid #334155', color: '#64748b',
          padding: '4px 8px', cursor: 'pointer', fontSize: 11
        }}>{'\u2715'}</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {data.error && (
          <div style={{ padding: 16, color: '#ef4444', fontSize: 11 }}>
            Error: {data.error}
          </div>
        )}

        {/* Tool Trace */}
        {data.toolTrace && data.toolTrace.length > 0 && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontSize: 9, color: '#f97316', letterSpacing: '0.15em', marginBottom: 8 }}>
              AI TOOL CALLS ({data.toolTrace.length})
            </div>
            {data.toolTrace.map((trace, i) => {
              const archId = trace.input?.archetypeId;
              const archName = archId != null ? getSignatureName(archId, useTraditional) : null;
              return (
                <div key={i} style={{
                  marginBottom: 6, border: '1px solid #1e293b',
                  background: '#111827'
                }}>
                  <div
                    onClick={() => toggleTrace(i)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', cursor: 'pointer',
                      borderBottom: expandedTraces[i] ? '1px solid #1e293b' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#f97316', fontSize: 9 }}>R{trace.round}</span>
                      <span style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 600 }}>{trace.tool}</span>
                      {archName && (
                        <span
                          style={{ color: '#93c5fd', fontSize: 9, cursor: 'pointer', textDecoration: 'underline dotted' }}
                          onClick={(e) => { e.stopPropagation(); onSelectArchetype(archId); }}
                          title={`Click to inspect ${archName}`}
                        >
                          {archName}
                        </span>
                      )}
                      {trace.input?.houseName && (
                        <span style={{ color: HOUSE_COLORS[trace.input.houseName] || '#94a3b8', fontSize: 9 }}>
                          {trace.input.houseName}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#475569', fontSize: 9 }}>{expandedTraces[i] ? '\u25BC' : '\u25B6'}</span>
                  </div>
                  {trace.reasoning && (
                    <div style={{
                      padding: '4px 10px', fontSize: 8, color: '#64748b',
                      fontStyle: 'italic', borderBottom: '1px solid #1e293b11',
                      lineHeight: 1.4
                    }}>
                      {trace.reasoning.slice(0, 200)}{trace.reasoning.length > 200 ? '...' : ''}
                    </div>
                  )}
                  {expandedTraces[i] && (
                    <pre style={{
                      padding: '8px 10px', fontSize: 8, lineHeight: 1.4,
                      color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 250, overflow: 'auto', margin: 0
                    }}>
                      {JSON.stringify(trace.result, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Interpretation */}
        {data.interpretation && (
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: 9, color: '#8b5cf6', letterSpacing: '0.15em', marginBottom: 10 }}>
              INTERPRETATION
            </div>
            <div style={{
              fontSize: 12, color: '#e2e8f0', lineHeight: 1.7,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              whiteSpace: 'pre-wrap'
            }}>
              {data.interpretation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
