'use client';

import { useState, useMemo } from 'react';
import { ARCHETYPES } from '../../lib/archetypes';

// === SEED DATA ===
const SEEDS = {
  8: {
    name: 'Fortitude', traditional: 'Strength',
    paths: {
      Practice:  { group: 'Body',       verb: 'Embody',      color: '#4ade80', seq: [8, 9, 11, 12] },
      Activity:  { group: 'Structure',  verb: 'Build',       color: '#ef4444', seq: [8, 3, 13, 16] },
      Being:     { group: 'Mantle',     verb: 'Create',      color: '#fbbf24', seq: [8, 7, 15, 18] },
      Identity:  { group: 'Composure',  verb: 'Center',      color: '#a855f7', seq: [8, 5, 17, 14] },
    }
  },
  2: {
    name: 'Wisdom', traditional: 'High Priestess',
    paths: {
      Practice:  { group: 'Spirit',     verb: 'Witness',     color: '#4ade80', seq: [2, 3, 17, 18] },
      Activity:  { group: 'Cognition',  verb: 'Distinguish', color: '#ef4444', seq: [2, 14, 15, 9] },
      Being:     { group: 'Kindle',     verb: 'Understand',  color: '#fbbf24', seq: [2, 5, 13, 12] },
      Identity:  { group: 'Conviction', verb: 'Act',         color: '#a855f7', seq: [2, 7, 11, 16] },
    }
  },
  4: {
    name: 'Order', traditional: 'Emperor',
    paths: {
      Practice:  { group: 'Mind',        verb: 'Channel',    color: '#4ade80', seq: [4, 5, 15, 16] },
      Activity:  { group: 'Intent',      verb: 'Point',      color: '#ef4444', seq: [4, 7, 17, 12] },
      Being:     { group: 'Vessel',      verb: 'Hold',       color: '#fbbf24', seq: [4, 3, 11, 14] },
      Identity:  { group: 'Exploration', verb: 'Venture',    color: '#a855f7', seq: [4, 9, 13, 18] },
    }
  },
  6: {
    name: 'Compassion', traditional: 'Lovers',
    paths: {
      Practice:  { group: 'Emotion',    verb: 'Will',        color: '#4ade80', seq: [6, 7, 13, 14] },
      Activity:  { group: 'Resonance',  verb: 'Connect',     color: '#ef4444', seq: [6, 5, 11, 18] },
      Being:     { group: 'Passage',    verb: 'Release',     color: '#fbbf24', seq: [6, 9, 17, 16] },
      Identity:  { group: 'Intimacy',   verb: 'Merge',       color: '#a855f7', seq: [6, 3, 15, 12] },
    }
  }
};

// === STAGE ASSIGNMENTS ===
// Each manifest archetype's absolute Stage (from the Stage Latin square)
const STAGES = {
  17: 'Fr', 7: 'Me', 4: 'Se', 12: 'Fb',
   2: 'Se', 14: 'Fb', 15: 'Fr', 9: 'Me',
  18: 'Fb', 6: 'Se', 5: 'Me', 11: 'Fr',
   3: 'Me', 13: 'Fr', 16: 'Fb', 8: 'Se',
};

const STAGE_COLORS = {
  Se: '#22c55e', // Seed — green (Wheel)
  Me: '#3b82f6', // Medium — blue (World)
  Fr: '#22c55e', // Fruition — green (Wheel)
  Fb: '#3b82f6', // Feedback — blue (World)
};

// === BEING & IDENTITY LOOKUPS ===
// Reverse lookup: position → { being group name, being verb, identity group name, identity verb }
const BEING_LOOKUP = {};
const IDENTITY_LOOKUP = {};
const BEING_DEFS = {
  Mantle:  { verb: 'Underlie',   members: [8, 7, 15, 18] },
  Kindle:  { verb: 'Understand', members: [2, 5, 13, 12] },
  Vessel:  { verb: 'Hold',       members: [4, 3, 11, 14] },
  Passage: { verb: 'Release',    members: [6, 9, 17, 16] },
};
const IDENTITY_DEFS = {
  Composure:   { verb: 'Center',  members: [8, 5, 17, 14] },
  Conviction:  { verb: 'Act',     members: [2, 7, 11, 16] },
  Exploration: { verb: 'Venture', members: [4, 9, 13, 18] },
  Intimacy:    { verb: 'Merge',   members: [6, 3, 15, 12] },
};
Object.entries(BEING_DEFS).forEach(([name, def]) => {
  def.members.forEach(pos => { BEING_LOOKUP[pos] = { group: name, verb: def.verb }; });
});
Object.entries(IDENTITY_DEFS).forEach(([name, def]) => {
  def.members.forEach(pos => { IDENTITY_LOOKUP[pos] = { group: name, verb: def.verb }; });
});

// === GRID LAYOUT ===
// Rows: Intent(0), Cognition(1), Resonance(2), Structure(3)
// Cols: Spirit(0), Emotion(1), Mind(2), Body(3)
const GRID = {
  17: { row: 0, col: 0 },  7: { row: 0, col: 1 },   4: { row: 0, col: 2 },  12: { row: 0, col: 3 },
   2: { row: 1, col: 0 }, 14: { row: 1, col: 1 },  15: { row: 1, col: 2 },   9: { row: 1, col: 3 },
  18: { row: 2, col: 0 },  6: { row: 2, col: 1 },   5: { row: 2, col: 2 },  11: { row: 2, col: 3 },
   3: { row: 3, col: 0 }, 13: { row: 3, col: 1 },  16: { row: 3, col: 2 },   8: { row: 3, col: 3 },
};

const ROW_LABELS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
const COL_LABELS = ['Spirit', 'Emotion', 'Mind', 'Body'];

const GRID_ORIGIN_X = 180;
const GRID_ORIGIN_Y = 80;
const COL_SPACING = 160;
const ROW_SPACING = 120;
const NODE_W = 64;
const NODE_H = 48;

function getNodeCenter(pos) {
  const g = GRID[pos];
  if (!g) return { x: 0, y: 0 };
  return {
    x: GRID_ORIGIN_X + g.col * COL_SPACING + NODE_W / 2,
    y: GRID_ORIGIN_Y + g.row * ROW_SPACING + NODE_H / 2,
  };
}

const DIMENSION_ORDER = ['Practice', 'Activity', 'Being', 'Identity'];
const OFFSETS = [-6, -2, 2, 6];

function perpOffset(x1, y1, x2, y2, offset) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return { ox: nx * offset, oy: ny * offset };
}

function abbrev(name) {
  return name.length <= 5 ? name : name.slice(0, 4);
}

// === COMPONENT ===
export default function SeedsPage() {
  const [selectedSeed, setSelectedSeed] = useState(8);
  const [showAll, setShowAll] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showTorus, setShowTorus] = useState(false);
  const [selectedBeingGroups, setSelectedBeingGroups] = useState(new Set());
  const [selectedIdentityGroups, setSelectedIdentityGroups] = useState(new Set());
  const [dimVisible, setDimVisible] = useState({
    Practice: true, Activity: true, Being: true, Identity: true,
  });

  // Whether we're in group-filter mode
  const groupFilterActive = selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0;

  // Collect all active positions
  const activePositions = useMemo(() => {
    const set = new Set();
    if (groupFilterActive) {
      selectedBeingGroups.forEach(name => {
        if (BEING_DEFS[name]) BEING_DEFS[name].members.forEach(pos => set.add(pos));
      });
      selectedIdentityGroups.forEach(name => {
        if (IDENTITY_DEFS[name]) IDENTITY_DEFS[name].members.forEach(pos => set.add(pos));
      });
    } else if (showAll) {
      Object.values(SEEDS).forEach(seed => {
        DIMENSION_ORDER.forEach(dim => {
          if (dimVisible[dim]) seed.paths[dim].seq.forEach(pos => set.add(pos));
        });
      });
    } else {
      const seed = SEEDS[selectedSeed];
      if (seed) {
        DIMENSION_ORDER.forEach(dim => {
          if (dimVisible[dim]) seed.paths[dim].seq.forEach(pos => set.add(pos));
        });
      }
    }
    return set;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  // Collect seed positions for glow effect
  const seedPositions = useMemo(() => {
    if (groupFilterActive) {
      const set = new Set();
      selectedBeingGroups.forEach(name => {
        if (BEING_DEFS[name]) {
          const seedMember = BEING_DEFS[name].members.find(pos => STAGES[pos] === 'Se');
          if (seedMember !== undefined) set.add(seedMember);
        }
      });
      selectedIdentityGroups.forEach(name => {
        if (IDENTITY_DEFS[name]) {
          const seedMember = IDENTITY_DEFS[name].members.find(pos => STAGES[pos] === 'Se');
          if (seedMember !== undefined) set.add(seedMember);
        }
      });
      return set;
    }
    if (showAll) return new Set([2, 4, 6, 8]);
    return new Set([selectedSeed]);
  }, [selectedSeed, showAll, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  // Build path lines
  const pathLines = useMemo(() => {
    const lines = [];

    if (groupFilterActive) {
      const stageOrder = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
      const drawGroupPath = (members, color, label, offsetVal) => {
        const sorted = [...members].sort((a, b) => (stageOrder[STAGES[a]] || 0) - (stageOrder[STAGES[b]] || 0));
        for (let i = 0; i < sorted.length; i++) {
          const from = getNodeCenter(sorted[i]);
          const to = getNodeCenter(sorted[(i + 1) % sorted.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, offsetVal);
          lines.push({
            key: `${label}-${i}`,
            x1: from.x + ox, y1: from.y + oy,
            x2: to.x + ox, y2: to.y + oy,
            color,
            opacity: 0.8,
            markerId: `arrow-${label}`,
            isReturn: i === sorted.length - 1,
          });
        }
      };
      let beingIdx = 0;
      selectedBeingGroups.forEach(name => {
        if (BEING_DEFS[name]) {
          const off = (beingIdx - (selectedBeingGroups.size - 1) / 2) * 4;
          drawGroupPath(BEING_DEFS[name].members, '#fbbf24', `Being-${name}`, off);
          beingIdx++;
        }
      });
      let idIdx = 0;
      selectedIdentityGroups.forEach(name => {
        if (IDENTITY_DEFS[name]) {
          const off = (idIdx - (selectedIdentityGroups.size - 1) / 2) * 4;
          drawGroupPath(IDENTITY_DEFS[name].members, '#a855f7', `Identity-${name}`, off);
          idIdx++;
        }
      });
      return lines;
    }

    const seedsToShow = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
    const opacity = showAll ? 0.5 : 0.8;

    seedsToShow.forEach(seedKey => {
      const seed = SEEDS[seedKey];
      if (!seed) return;
      DIMENSION_ORDER.forEach((dim, dimIdx) => {
        if (!dimVisible[dim]) return;
        const path = seed.paths[dim];
        const off = OFFSETS[dimIdx];
        for (let i = 0; i < path.seq.length; i++) {
          const from = getNodeCenter(path.seq[i]);
          const to = getNodeCenter(path.seq[(i + 1) % path.seq.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
          lines.push({
            key: `${seedKey}-${dim}-${i}`,
            x1: from.x + ox, y1: from.y + oy,
            x2: to.x + ox, y2: to.y + oy,
            color: path.color,
            opacity: i === path.seq.length - 1 ? opacity * 0.6 : opacity,
            markerId: `arrow-${dim}`,
            isReturn: i === path.seq.length - 1,
          });
        }
      });
    });
    return lines;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  // Build table data
  const tableData = useMemo(() => {
    const seed = SEEDS[selectedSeed];
    if (!seed) return [];
    return DIMENSION_ORDER.map(dim => {
      const p = seed.paths[dim];
      return {
        dimension: dim,
        group: p.group,
        verb: p.verb,
        color: p.color,
        positions: p.seq,
        names: p.seq.map(pos => ARCHETYPES[pos]?.name || `#${pos}`),
      };
    });
  }, [selectedSeed]);

  // Grid tile dimensions for torus tiling
  const TILE_W = 4 * COL_SPACING; // 640
  const TILE_H = 4 * ROW_SPACING; // 480

  const svgWidth = showTorus ? TILE_W * 3 + GRID_ORIGIN_X * 2 : 800;
  const svgHeight = showTorus ? TILE_H * 3 + GRID_ORIGIN_Y * 2 : (showLabels ? 620 : 580);

  // For torus mode: compute node center with tile offset
  function getTorusNodeCenter(pos, tileCol, tileRow) {
    const g = GRID[pos];
    if (!g) return { x: 0, y: 0 };
    return {
      x: GRID_ORIGIN_X + (tileCol * TILE_W) + g.col * COL_SPACING + NODE_W / 2,
      y: GRID_ORIGIN_Y + (tileRow * TILE_H) + g.row * ROW_SPACING + NODE_H / 2,
    };
  }

  // Build torus path lines — draw from center tile to nearest neighbor copy
  // For each segment, "from" is on center tile (1,1), "to" is whichever of 9 copies is closest
  const torusPathLines = useMemo(() => {
    if (!showTorus) return [];
    const lines = [];

    // For each tile, draw segments to the nearest neighbor of the target
    function nearestNeighbor(fromPos, fromTC, fromTR, toPos) {
      const from = getTorusNodeCenter(fromPos, fromTC, fromTR);
      let bestDist = Infinity;
      let bestTo = from;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const candidate = getTorusNodeCenter(toPos, fromTC + dc, fromTR + dr);
          const dx = candidate.x - from.x;
          const dy = candidate.y - from.y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestTo = candidate;
          }
        }
      }
      return { from, to: bestTo };
    }

    // Draw paths from every tile
    for (let tr = 0; tr < 3; tr++) {
      for (let tc = 0; tc < 3; tc++) {
        const isCenter = tc === 1 && tr === 1;
        const tileOpacity = isCenter ? 1.0 : 0.35;

        const addSeg = (fromPos, toPos, color, label, idx, offsetVal, baseOp) => {
          const { from, to } = nearestNeighbor(fromPos, tc, tr, toPos);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, offsetVal);
          lines.push({
            key: `t${tc}${tr}-${label}-${idx}`,
            x1: from.x + ox, y1: from.y + oy,
            x2: to.x + ox, y2: to.y + oy,
            color, opacity: tileOpacity * baseOp,
            markerId: `arrow-${label}`, isReturn: false,
          });
        };

        if (groupFilterActive) {
          const stageOrder = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
          let bi = 0;
          selectedBeingGroups.forEach(name => {
            if (!BEING_DEFS[name]) return;
            const sorted = [...BEING_DEFS[name].members].sort((a, b) => (stageOrder[STAGES[a]] || 0) - (stageOrder[STAGES[b]] || 0));
            const off = (bi - (selectedBeingGroups.size - 1) / 2) * 4;
            for (let i = 0; i < sorted.length; i++) {
              addSeg(sorted[i], sorted[(i + 1) % sorted.length], '#fbbf24', `Being-${name}`, i, off, 0.8);
            }
            bi++;
          });
          let ii = 0;
          selectedIdentityGroups.forEach(name => {
            if (!IDENTITY_DEFS[name]) return;
            const sorted = [...IDENTITY_DEFS[name].members].sort((a, b) => (stageOrder[STAGES[a]] || 0) - (stageOrder[STAGES[b]] || 0));
            const off = (ii - (selectedIdentityGroups.size - 1) / 2) * 4;
            for (let i = 0; i < sorted.length; i++) {
              addSeg(sorted[i], sorted[(i + 1) % sorted.length], '#a855f7', `Identity-${name}`, i, off, 0.8);
            }
            ii++;
          });
        } else {
          const seedsToShow = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
          const seedOpacity = showAll ? 0.5 : 0.8;
          seedsToShow.forEach(seedKey => {
            const seed = SEEDS[seedKey];
            if (!seed) return;
            DIMENSION_ORDER.forEach((dim, dimIdx) => {
              if (!dimVisible[dim]) return;
              const path = seed.paths[dim];
              const off = OFFSETS[dimIdx];
              for (let i = 0; i < path.seq.length; i++) {
                addSeg(path.seq[i], path.seq[(i + 1) % path.seq.length], path.color, `${seedKey}-${dim}`, i, off, seedOpacity);
              }
            });
          });
        }
      }
    }

    return lines;
  }, [showTorus, selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const toggleDim = (dim) => {
    setDimVisible(prev => ({ ...prev, [dim]: !prev[dim] }));
  };

  const selectSeed = (key) => {
    setShowAll(false);
    setSelectedBeingGroups(new Set());
    setSelectedIdentityGroups(new Set());
    setSelectedSeed(key);
  };

  const selectBeingGroup = (name) => {
    setSelectedBeingGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setShowAll(false);
  };

  const selectIdentityGroup = (name) => {
    setSelectedIdentityGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setShowAll(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '0.08em',
          margin: 0, color: '#f8fafc',
        }}>
          SEED PROCESS VISUALIZATION
        </h1>
        <p style={{
          fontSize: 14, color: '#94a3b8', marginTop: 6, marginBottom: 0,
        }}>
          Four Seeds x Four Dimensions — the process engine in motion
        </p>
      </div>

      {/* SEED SELECTOR */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(SEEDS).map(([key, seed]) => {
          const k = Number(key);
          const active = !showAll && !groupFilterActive && selectedSeed === k;
          return (
            <button key={k} onClick={() => selectSeed(k)} style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: active ? '2px solid #38bdf8' : '1px solid #334155',
              backgroundColor: active ? '#1e3a5f' : '#0f172a',
              color: active ? '#f0f9ff' : '#94a3b8',
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              {seed.name} ({k})
            </button>
          );
        })}
        <button onClick={() => { setShowAll(true); setSelectedBeingGroups(new Set()); setSelectedIdentityGroups(new Set()); }} style={{
          padding: '8px 18px',
          borderRadius: 6,
          border: showAll && !groupFilterActive ? '2px solid #38bdf8' : '1px solid #334155',
          backgroundColor: showAll && !groupFilterActive ? '#1e3a5f' : '#0f172a',
          color: showAll && !groupFilterActive ? '#f0f9ff' : '#94a3b8',
          fontSize: 14,
          fontWeight: showAll && !groupFilterActive ? 700 : 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          Show All
        </button>
      </div>

      {/* DIMENSION TOGGLES */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {DIMENSION_ORDER.map(dim => {
          const color = SEEDS[8].paths[dim].color;
          const on = dimVisible[dim];
          return (
            <button key={dim} onClick={() => toggleDim(dim)} style={{
              padding: '5px 14px',
              borderRadius: 4,
              border: `1px solid ${on ? color : '#334155'}`,
              backgroundColor: on ? color + '22' : '#0f172a',
              color: on ? color : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: on ? 1 : 0.5,
              transition: 'all 0.15s',
            }}>
              {dim}
            </button>
          );
        })}
        <button onClick={() => setShowLabels(prev => !prev)} style={{
          padding: '5px 14px',
          borderRadius: 4,
          border: `1px solid ${showLabels ? '#e2e8f0' : '#334155'}`,
          backgroundColor: showLabels ? '#e2e8f022' : '#0f172a',
          color: showLabels ? '#e2e8f0' : '#475569',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          opacity: showLabels ? 1 : 0.5,
          transition: 'all 0.15s',
          marginLeft: 8,
        }}>
          Labels
        </button>
        <button onClick={() => setShowTorus(prev => !prev)} style={{
          padding: '5px 14px',
          borderRadius: 4,
          border: `1px solid ${showTorus ? '#f59e0b' : '#334155'}`,
          backgroundColor: showTorus ? '#f59e0b22' : '#0f172a',
          color: showTorus ? '#f59e0b' : '#475569',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          opacity: showTorus ? 1 : 0.5,
          transition: 'all 0.15s',
          marginLeft: 4,
        }}>
          Torus
        </button>
      </div>

      {/* BEING GROUP FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#fbbf24', alignSelf: 'center', fontWeight: 600 }}>BEING</span>
        {Object.entries(BEING_DEFS).map(([name, def]) => {
          const on = selectedBeingGroups.has(name);
          return (
            <button key={name} onClick={() => selectBeingGroup(name)} style={{
              padding: '5px 14px',
              borderRadius: 4,
              border: `1px solid ${on ? '#fbbf24' : '#334155'}`,
              backgroundColor: on ? '#fbbf2422' : '#0f172a',
              color: on ? '#fbbf24' : '#475569',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: on ? 1 : 0.6,
              transition: 'all 0.15s',
            }}>
              {name} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{def.verb}</span>
            </button>
          );
        })}
      </div>

      {/* IDENTITY GROUP FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#a855f7', alignSelf: 'center', fontWeight: 600 }}>IDENTITY</span>
        {Object.entries(IDENTITY_DEFS).map(([name, def]) => {
          const on = selectedIdentityGroups.has(name);
          return (
            <button key={name} onClick={() => selectIdentityGroup(name)} style={{
              padding: '5px 14px',
              borderRadius: 4,
              border: `1px solid ${on ? '#a855f7' : '#334155'}`,
              backgroundColor: on ? '#a855f722' : '#0f172a',
              color: on ? '#a855f7' : '#475569',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: on ? 1 : 0.6,
              transition: 'all 0.15s',
            }}>
              {name} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{def.verb}</span>
            </button>
          );
        })}
      </div>

      {/* SVG VISUALIZATION */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width={svgWidth}
          height={svgHeight}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <defs>
            {/* Arrowhead markers */}
            {DIMENSION_ORDER.map(dim => {
              const color = SEEDS[8].paths[dim].color;
              return (
                <marker
                  key={dim}
                  id={`arrow-${dim}`}
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L8,3 L0,6 Z" fill={color} />
                </marker>
              );
            })}
            {/* Glow filter for seed nodes */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Pulse animation */}
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
              .seed-glow { animation: pulse 2s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* Tile boundaries in torus mode */}
          {showTorus && [0,1,2].map(tr => [0,1,2].map(tc => (
            <rect
              key={`tile-${tc}-${tr}`}
              x={GRID_ORIGIN_X - NODE_W/2 - 10 + tc * TILE_W}
              y={GRID_ORIGIN_Y - NODE_H/2 - 10 + tr * TILE_H}
              width={TILE_W - COL_SPACING + NODE_W + 20}
              height={TILE_H - ROW_SPACING + NODE_H + 20}
              rx={8}
              fill="none"
              stroke={tc === 1 && tr === 1 ? '#334155' : '#1e293b'}
              strokeWidth={tc === 1 && tr === 1 ? 1.5 : 0.5}
              strokeDasharray={tc === 1 && tr === 1 ? 'none' : '4,4'}
            />
          )))}

          {/* Row labels (center tile only in torus, or normal) */}
          {ROW_LABELS.map((label, i) => (
            <text
              key={`row-${i}`}
              x={(showTorus ? GRID_ORIGIN_X + TILE_W : GRID_ORIGIN_X) - 14}
              y={(showTorus ? GRID_ORIGIN_Y + TILE_H : GRID_ORIGIN_Y) + i * ROW_SPACING + NODE_H / 2 + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontFamily="system-ui"
            >
              {label}
            </text>
          ))}

          {/* Column labels (center tile only in torus, or normal) */}
          {COL_LABELS.map((label, i) => (
            <text
              key={`col-${i}`}
              x={(showTorus ? GRID_ORIGIN_X + TILE_W : GRID_ORIGIN_X) + i * COL_SPACING + NODE_W / 2}
              y={(showTorus ? GRID_ORIGIN_Y + TILE_H : GRID_ORIGIN_Y) - 14}
              textAnchor="middle"
              fill="#64748b"
              fontSize="11"
              fontFamily="system-ui"
            >
              {label}
            </text>
          ))}

          {/* Path lines */}
          {(showTorus ? torusPathLines : pathLines).map(line => (
            <line
              key={line.key}
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke={line.color}
              strokeWidth={2.5}
              opacity={line.opacity}
              markerEnd={`url(#${line.markerId})`}
              strokeLinecap="round"
            />
          ))}

          {/* Archetype nodes — render once normally, or 9× for torus */}
          {(showTorus ? [0,1,2].flatMap(tr => [0,1,2].map(tc => ({ tc, tr }))) : [{ tc: 0, tr: 0 }]).map(({ tc, tr }) => {
            const tileKey = `tile-${tc}-${tr}`;
            const isCenter = showTorus ? (tc === 1 && tr === 1) : true;
            const tileOpacity = isCenter ? 1 : 0.3;
            const offsetX = showTorus ? tc * TILE_W : 0;
            const offsetY = showTorus ? tr * TILE_H : 0;

            return (
              <g key={tileKey} opacity={tileOpacity}>
                {Object.entries(GRID).map(([posStr, g]) => {
                  const pos = Number(posStr);
                  const arch = ARCHETYPES[pos];
                  if (!arch) return null;
                  const x = GRID_ORIGIN_X + offsetX + g.col * COL_SPACING;
                  const y = GRID_ORIGIN_Y + offsetY + g.row * ROW_SPACING;
                  const isActive = activePositions.has(pos);
                  const isSeed = seedPositions.has(pos);
                  const nodeOpacity = isActive ? 1 : (isCenter ? 0.25 : 0.15);

                  let borderColor = '#334155';
                  if (isSeed && isCenter) borderColor = '#38bdf8';
                  else if (isActive) borderColor = '#64748b';

                  return (
                    <g key={`${tileKey}-${pos}`} opacity={nodeOpacity}>
                      {isSeed && isCenter && (
                        <rect
                          className="seed-glow"
                          x={x - 4} y={y - 4}
                          width={NODE_W + 8} height={NODE_H + 8}
                          rx={8}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          filter="url(#glow)"
                        />
                      )}
                      <rect
                        x={x} y={y}
                        width={NODE_W} height={NODE_H}
                        rx={6}
                        fill="#0f172a"
                        stroke={borderColor}
                        strokeWidth={isSeed && isCenter ? 2 : 1}
                      />
                      <text
                        x={x + NODE_W / 2} y={y + 15}
                        textAnchor="middle"
                        fill={isActive ? '#f8fafc' : '#475569'}
                        fontSize="12" fontWeight="700" fontFamily="system-ui"
                      >
                        {pos}
                      </text>
                      <text
                        x={x + NODE_W / 2} y={y + 28}
                        textAnchor="middle"
                        fill={isActive ? '#94a3b8' : '#334155'}
                        fontSize="9" fontFamily="system-ui"
                      >
                        {abbrev(arch.name)}
                      </text>
                      <text
                        x={x + NODE_W / 2} y={y + 39}
                        textAnchor="middle"
                        fill={isActive ? (STAGE_COLORS[STAGES[pos]] || '#475569') : '#1e293b'}
                        fontSize="7" fontFamily="system-ui" fontWeight="600" letterSpacing="0.5"
                      >
                        {STAGES[pos] === 'Se' ? 'SEED' : STAGES[pos] === 'Me' ? 'MED' : STAGES[pos] === 'Fr' ? 'FRU' : 'FEED'}
                      </text>
                      {showLabels && isActive && isCenter && (
                        <>
                          <text x={x + NODE_W / 2} y={y + NODE_H + 11} textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="system-ui">
                            {BEING_LOOKUP[pos]?.group || ''}
                          </text>
                          <text x={x + NODE_W / 2} y={y + NODE_H + 20} textAnchor="middle" fill="#a855f7" fontSize="7" fontFamily="system-ui">
                            {IDENTITY_LOOKUP[pos]?.group || ''}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* DATA TABLE */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h3 style={{
          fontSize: 16, fontWeight: 600, color: '#cbd5e1', marginBottom: 10,
          textAlign: 'center',
        }}>
          {SEEDS[selectedSeed]?.name} ({SEEDS[selectedSeed]?.traditional}) — Process Paths
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            fontFamily: 'system-ui',
          }}>
            <thead>
              <tr>
                {['Dimension', 'Group', 'Verb', 'Seed', 'Medium', 'Fruition', 'Feedback'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    borderBottom: '1px solid #1e293b',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map(row => (
                <tr key={row.dimension}>
                  <td style={{
                    padding: '7px 10px',
                    borderBottom: '1px solid #1e293b',
                    color: row.color,
                    fontWeight: 600,
                  }}>
                    {row.dimension}
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    {row.group}
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #1e293b', color: '#e2e8f0', fontStyle: 'italic' }}>
                    {row.verb}
                  </td>
                  {row.names.map((name, i) => {
                    const pos = row.positions[i];
                    const being = BEING_LOOKUP[pos];
                    const identity = IDENTITY_LOOKUP[pos];
                    const stageLabel = STAGES[pos] === 'Se' ? 'Seed' : STAGES[pos] === 'Me' ? 'Medium' : STAGES[pos] === 'Fr' ? 'Fruition' : 'Feedback';
                    return (
                      <td key={i} style={{
                        padding: '7px 10px',
                        borderBottom: '1px solid #1e293b',
                        color: i === 0 ? '#f8fafc' : '#cbd5e1',
                        fontWeight: i === 0 ? 600 : 400,
                        verticalAlign: 'top',
                      }}>
                        <div>{name} <span style={{ color: '#475569', fontSize: 11 }}>({pos})</span></div>
                        <div style={{ fontSize: 10, marginTop: 2, lineHeight: '14px' }}>
                          <span style={{ color: STAGE_COLORS[STAGES[pos]] || '#475569' }}>{stageLabel}</span>
                          {being && <span style={{ color: '#fbbf24', marginLeft: 6 }}>{being.group}<span style={{ color: '#92400e' }}>/{being.verb}</span></span>}
                          {identity && <span style={{ color: '#a855f7', marginLeft: 6 }}>{identity.group}<span style={{ color: '#581c87' }}>/{identity.verb}</span></span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LEGEND */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20,
          marginTop: 20, flexWrap: 'wrap',
        }}>
          {DIMENSION_ORDER.map(dim => (
            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 3,
                backgroundColor: SEEDS[8].paths[dim].color,
                borderRadius: 2,
              }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{dim}</span>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 16,
          fontSize: 11, color: '#475569',
        }}>
          Seed → Medium → Fruition → Feedback
        </div>
      </div>
    </div>
  );
}
