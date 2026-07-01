'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// === SHARED CONSTANTS ===
const VERTICES = {
  17: { bits: [0,0,0,0], name: 'Inspiration' },
   7: { bits: [1,0,0,0], name: 'Drive' },
   4: { bits: [0,1,0,0], name: 'Order' },
  12: { bits: [1,1,0,0], name: 'Sacrifice' },
   2: { bits: [0,0,0,1], name: 'Wisdom' },
  14: { bits: [1,0,0,1], name: 'Balance' },
  15: { bits: [0,1,0,1], name: 'Abstraction' },
   9: { bits: [1,1,0,1], name: 'Discipline' },
  18: { bits: [0,0,1,0], name: 'Imagination' },
   6: { bits: [1,0,1,0], name: 'Compassion' },
   5: { bits: [0,1,1,0], name: 'Culture' },
  11: { bits: [1,1,1,0], name: 'Equity' },
   3: { bits: [0,0,1,1], name: 'Nurturing' },
  13: { bits: [1,0,1,1], name: 'Change' },
  16: { bits: [0,1,1,1], name: 'Breakthrough' },
   8: { bits: [1,1,1,1], name: 'Fortitude' },
};

const SEEDS = {
  8: { name: 'Fortitude', traditional: 'Strength', paths: {
    Practice: { group: 'Body', verb: 'Embody', color: '#4ade80', seq: [8, 9, 11, 12] },
    Activity: { group: 'Structure', verb: 'Build', color: '#ef4444', seq: [8, 3, 13, 16] },
    Being: { group: 'Mantle', verb: 'Create', color: '#fbbf24', seq: [8, 7, 15, 18] },
    Identity: { group: 'Composure', verb: 'Center', color: '#a855f7', seq: [8, 5, 17, 14] },
  }},
  2: { name: 'Wisdom', traditional: 'High Priestess', paths: {
    Practice: { group: 'Spirit', verb: 'Witness', color: '#4ade80', seq: [2, 3, 17, 18] },
    Activity: { group: 'Cognition', verb: 'Distinguish', color: '#ef4444', seq: [2, 14, 15, 9] },
    Being: { group: 'Kindle', verb: 'Understand', color: '#fbbf24', seq: [2, 5, 13, 12] },
    Identity: { group: 'Conviction', verb: 'Act', color: '#a855f7', seq: [2, 7, 11, 16] },
  }},
  4: { name: 'Order', traditional: 'Emperor', paths: {
    Practice: { group: 'Mind', verb: 'Channel', color: '#4ade80', seq: [4, 5, 15, 16] },
    Activity: { group: 'Intent', verb: 'Point', color: '#ef4444', seq: [4, 7, 17, 12] },
    Being: { group: 'Vessel', verb: 'Hold', color: '#fbbf24', seq: [4, 3, 11, 14] },
    Identity: { group: 'Exploration', verb: 'Venture', color: '#a855f7', seq: [4, 9, 13, 18] },
  }},
  6: { name: 'Compassion', traditional: 'Lovers', paths: {
    Practice: { group: 'Emotion', verb: 'Will', color: '#4ade80', seq: [6, 7, 13, 14] },
    Activity: { group: 'Resonance', verb: 'Connect', color: '#ef4444', seq: [6, 5, 11, 18] },
    Being: { group: 'Passage', verb: 'Release', color: '#fbbf24', seq: [6, 9, 17, 16] },
    Identity: { group: 'Intimacy', verb: 'Merge', color: '#a855f7', seq: [6, 3, 15, 12] },
  }},
};

const STAGES = {
  17: 'Fr', 7: 'Me', 4: 'Se', 12: 'Fb',
   2: 'Se', 14: 'Fb', 15: 'Fr', 9: 'Me',
  18: 'Fb', 6: 'Se', 5: 'Me', 11: 'Fr',
   3: 'Me', 13: 'Fr', 16: 'Fb', 8: 'Se',
};
const STAGE_COLORS = { Se: '#22c55e', Me: '#3b82f6', Fr: '#22c55e', Fb: '#3b82f6' };

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

const BEING_LOOKUP = {}, IDENTITY_LOOKUP = {};
Object.entries(BEING_DEFS).forEach(([n, d]) => d.members.forEach(p => { BEING_LOOKUP[p] = { group: n, verb: d.verb }; }));
Object.entries(IDENTITY_DEFS).forEach(([n, d]) => d.members.forEach(p => { IDENTITY_LOOKUP[p] = { group: n, verb: d.verb }; }));

const GRID = {
  17: { row: 0, col: 0 },  7: { row: 0, col: 1 },   4: { row: 0, col: 2 },  12: { row: 0, col: 3 },
   2: { row: 1, col: 0 }, 14: { row: 1, col: 1 },  15: { row: 1, col: 2 },   9: { row: 1, col: 3 },
  18: { row: 2, col: 0 },  6: { row: 2, col: 1 },   5: { row: 2, col: 2 },  11: { row: 2, col: 3 },
   3: { row: 3, col: 0 }, 13: { row: 3, col: 1 },  16: { row: 3, col: 2 },   8: { row: 3, col: 3 },
};
const ROW_LABELS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
const COL_LABELS = ['Spirit', 'Emotion', 'Mind', 'Body'];
const DIMENSION_ORDER = ['Practice', 'Activity', 'Being', 'Identity'];
const OFFSETS = [-6, -2, 2, 6];

// Tesseract constants
const BEING_T = { Mantle: { ids: [8,7,15,18], color: '#fbbf24' }, Kindle: { ids: [2,5,13,12], color: '#22d3ee' }, Vessel: { ids: [4,3,11,14], color: '#4ade80' }, Passage: { ids: [6,9,17,16], color: '#fb7185' } };
const IDENTITY_T = { Composure: { ids: [8,5,17,14], color: '#22d3ee' }, Conviction: { ids: [2,7,11,16], color: '#fbbf24' }, Exploration: { ids: [4,9,13,18], color: '#4ade80' }, Intimacy: { ids: [6,3,15,12], color: '#fb7185' } };
const PRACTICE_T = { Spirit: { ids: [17,2,18,3], color: '#c084fc' }, Emotion: { ids: [7,14,6,13], color: '#fb7185' }, Mind: { ids: [4,15,5,16], color: '#22d3ee' }, Body: { ids: [12,9,11,8], color: '#4ade80' } };
const STAGE_T = { Seed: { ids: [4,2,6,8], color: '#22c55e' }, Medium: { ids: [7,9,5,3], color: '#3b82f6' }, Fruition: { ids: [17,15,11,13], color: '#22c55e' }, Feedback: { ids: [12,14,18,16], color: '#3b82f6' } };
const COLOR_MODES = { Being: BEING_T, Identity: IDENTITY_T, Practice: PRACTICE_T, Stage: STAGE_T };
const EDGE_COLORS = ['#4ade80', '#22d3ee', '#ef4444', '#f59e0b'];

const AFFINE_PLANES = [
  { ids: [17, 7, 5, 11], color: '#f59e0b', label: 'D1' },
  { ids: [2, 14, 16, 8], color: '#ef4444', label: 'D2' },
  { ids: [9, 15, 13, 3], color: '#8b5cf6', label: 'D3' },
  { ids: [12, 4, 6, 18], color: '#22d3ee', label: 'D4' },
];

// Build edges: Hamming distance 1
const EDGES = (() => {
  const ids = Object.keys(VERTICES).map(Number);
  const edges = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = VERTICES[ids[i]].bits, b = VERTICES[ids[j]].bits;
      let diff = -1, count = 0;
      for (let k = 0; k < 4; k++) { if (a[k] !== b[k]) { diff = k; count++; } }
      if (count === 1) edges.push({ from: ids[i], to: ids[j], bit: diff });
    }
  }
  return edges;
})();

// === HELPERS ===
const GX = 180, GY = 80, CS = 160, RS = 120, NW = 64, NH = 48;

function getNodeCenter(pos) {
  const g = GRID[pos];
  return g ? { x: GX + g.col * CS + NW / 2, y: GY + g.row * RS + NH / 2 } : { x: 0, y: 0 };
}

function perpOffset(x1, y1, x2, y2, offset) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { ox: (-dy / len) * offset, oy: (dx / len) * offset };
}

function abbrev(name) { return name.length <= 5 ? name : name.slice(0, 4); }

function rotate4D(point, aXW, aYZ, aXY = 0) {
  let [x, y, z, w] = point;
  // XW plane rotation
  const cA = Math.cos(aXW), sA = Math.sin(aXW);
  let nx = x * cA - w * sA, nw = x * sA + w * cA; x = nx; w = nw;
  // YZ plane rotation
  const cB = Math.cos(aYZ), sB = Math.sin(aYZ);
  let ny = y * cB - z * sB, nz = y * sB + z * cB; y = ny; z = nz;
  // XY plane rotation (3rd degree of freedom)
  const cC = Math.cos(aXY), sC = Math.sin(aXY);
  let nx2 = x * cC - y * sC, ny2 = x * sC + y * cC; x = nx2; y = ny2;
  return [x, y, z, w];
}

function project4Dto2D(p, pd4 = 4.0, pd3 = 6.0) {
  const [x, y, z, w] = p;
  const s4 = pd4 / (pd4 - w);
  const x3 = x * s4, y3 = y * s4, z3 = z * s4;
  const s3 = pd3 / (pd3 - z3);
  return { x: x3 * s3, y: y3 * s3, scale: s4 * s3 };
}

function projectVertex(bits, aXW, aYZ, aXY = 0) {
  return project4Dto2D(rotate4D(bits.map(b => b === 0 ? -1 : 1), aXW, aYZ, aXY));
}

function getVertexColor(id, mode) {
  for (const g of Object.values(COLOR_MODES[mode])) { if (g.ids.includes(id)) return g.color; }
  return '#e2e8f0';
}

// button style helper
const btn = (active, color = '#38bdf8') => ({
  padding: '5px 14px', borderRadius: 6, border: active ? `2px solid ${color}` : '1px solid #334155',
  background: active ? `${color}22` : '#0f172a', color: active ? color : '#64748b',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
});

// =============================================
// GRID VIEW COMPONENT
// =============================================
function GridView({ selectedSeed, showAll, dimVisible, selectedBeingGroups, selectedIdentityGroups, showLabels, showTorus, compact }) {
  const groupFilterActive = selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0;

  const activePositions = useMemo(() => {
    const set = new Set();
    if (groupFilterActive) {
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) BEING_DEFS[n].members.forEach(p => set.add(p)); });
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) IDENTITY_DEFS[n].members.forEach(p => set.add(p)); });
    } else if (showAll) {
      Object.values(SEEDS).forEach(s => DIMENSION_ORDER.forEach(d => { if (dimVisible[d]) s.paths[d].seq.forEach(p => set.add(p)); }));
    } else {
      const s = SEEDS[selectedSeed];
      if (s) DIMENSION_ORDER.forEach(d => { if (dimVisible[d]) s.paths[d].seq.forEach(p => set.add(p)); });
    }
    return set;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const seedPositions = useMemo(() => {
    if (groupFilterActive) {
      const set = new Set();
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) { const m = BEING_DEFS[n].members.find(p => STAGES[p] === 'Se'); if (m !== undefined) set.add(m); } });
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) { const m = IDENTITY_DEFS[n].members.find(p => STAGES[p] === 'Se'); if (m !== undefined) set.add(m); } });
      return set;
    }
    return showAll ? new Set([2, 4, 6, 8]) : new Set([selectedSeed]);
  }, [selectedSeed, showAll, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const pathLines = useMemo(() => {
    const lines = [];
    if (groupFilterActive) {
      const so = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
      const draw = (members, color, label, off) => {
        const sorted = [...members].sort((a, b) => (so[STAGES[a]] || 0) - (so[STAGES[b]] || 0));
        for (let i = 0; i < sorted.length; i++) {
          const from = getNodeCenter(sorted[i]), to = getNodeCenter(sorted[(i + 1) % sorted.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
          lines.push({ key: `${label}-${i}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color, opacity: 0.8, markerId: `arrow-${label}`, isReturn: i === sorted.length - 1 });
        }
      };
      let bi = 0;
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) { draw(BEING_DEFS[n].members, '#fbbf24', `Being-${n}`, (bi - (selectedBeingGroups.size - 1) / 2) * 4); bi++; } });
      let ii = 0;
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) { draw(IDENTITY_DEFS[n].members, '#a855f7', `Identity-${n}`, (ii - (selectedIdentityGroups.size - 1) / 2) * 4); ii++; } });
      return lines;
    }
    const seeds = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
    const op = showAll ? 0.5 : 0.8;
    seeds.forEach(sk => {
      const s = SEEDS[sk]; if (!s) return;
      DIMENSION_ORDER.forEach((dim, di) => {
        if (!dimVisible[dim]) return;
        const p = s.paths[dim];
        for (let i = 0; i < p.seq.length; i++) {
          const from = getNodeCenter(p.seq[i]), to = getNodeCenter(p.seq[(i + 1) % p.seq.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, OFFSETS[di]);
          lines.push({ key: `${sk}-${dim}-${i}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color: p.color, opacity: i === p.seq.length - 1 ? op * 0.6 : op, markerId: `arrow-${dim}`, isReturn: i === p.seq.length - 1 });
        }
      });
    });
    return lines;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const TW = 4 * CS, TH = 4 * RS;
  function getTorusNodeCenter(pos, tc, tr) {
    const g = GRID[pos];
    return g ? { x: GX + tc * TW + g.col * CS + NW / 2, y: GY + tr * TH + g.row * RS + NH / 2 } : { x: 0, y: 0 };
  }

  const torusPathLines = useMemo(() => {
    if (!showTorus) return [];
    const lines = [];
    function nearest(fromPos, ftc, ftr, toPos) {
      const from = getTorusNodeCenter(fromPos, ftc, ftr);
      let best = Infinity, bestTo = from;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const c = getTorusNodeCenter(toPos, ftc + dc, ftr + dr);
        const d = (c.x - from.x) ** 2 + (c.y - from.y) ** 2;
        if (d < best) { best = d; bestTo = c; }
      }
      return { from, to: bestTo };
    }
    for (let tr = 0; tr < 3; tr++) for (let tc = 0; tc < 3; tc++) {
      const isC = tc === 1 && tr === 1;
      const tOp = isC ? 1.0 : 0.35;
      const add = (fp, tp, col, lbl, idx, off, bop) => {
        const { from, to } = nearest(fp, tc, tr, tp);
        const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
        lines.push({ key: `t${tc}${tr}-${lbl}-${idx}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color: col, opacity: tOp * bop, markerId: `arrow-${lbl}`, isReturn: false });
      };
      if (groupFilterActive) {
        const so = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
        let bi = 0;
        selectedBeingGroups.forEach(n => { if (!BEING_DEFS[n]) return; const sorted = [...BEING_DEFS[n].members].sort((a, b) => (so[STAGES[a]] || 0) - (so[STAGES[b]] || 0)); const off = (bi - (selectedBeingGroups.size - 1) / 2) * 4; for (let i = 0; i < sorted.length; i++) add(sorted[i], sorted[(i + 1) % sorted.length], '#fbbf24', `Being-${n}`, i, off, 0.8); bi++; });
        let ii = 0;
        selectedIdentityGroups.forEach(n => { if (!IDENTITY_DEFS[n]) return; const sorted = [...IDENTITY_DEFS[n].members].sort((a, b) => (so[STAGES[a]] || 0) - (so[STAGES[b]] || 0)); const off = (ii - (selectedIdentityGroups.size - 1) / 2) * 4; for (let i = 0; i < sorted.length; i++) add(sorted[i], sorted[(i + 1) % sorted.length], '#a855f7', `Identity-${n}`, i, off, 0.8); ii++; });
      } else {
        const seeds = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
        const sOp = showAll ? 0.5 : 0.8;
        seeds.forEach(sk => { const s = SEEDS[sk]; if (!s) return; DIMENSION_ORDER.forEach((dim, di) => { if (!dimVisible[dim]) return; const p = s.paths[dim]; for (let i = 0; i < p.seq.length; i++) add(p.seq[i], p.seq[(i + 1) % p.seq.length], p.color, `${sk}-${dim}`, i, OFFSETS[di], sOp); }); });
      }
    }
    return lines;
  }, [showTorus, selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const svgW = showTorus ? TW * 3 + GX * 2 : 800;
  const svgH = showTorus ? TH * 3 + GY * 2 : (showLabels ? 620 : 580);

  return (
    <div style={{ overflow: 'auto', width: '100%' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width={compact ? '100%' : svgW} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}>
        <defs>
          {DIMENSION_ORDER.map(dim => {
            const c = SEEDS[8].paths[dim].color;
            return <marker key={dim} id={`arrow-${dim}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d={`M0,0 L8,3 L0,6 Z`} fill={c} /></marker>;
          })}
          {Object.keys(BEING_DEFS).map(n => <marker key={`Being-${n}`} id={`arrow-Being-${n}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#fbbf24" /></marker>)}
          {Object.keys(IDENTITY_DEFS).map(n => <marker key={`Identity-${n}`} id={`arrow-Identity-${n}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#a855f7" /></marker>)}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } } .seed-glow { animation: pulse 2s ease-in-out infinite; }`}</style>
        </defs>

        {showTorus && [0,1,2].map(tr => [0,1,2].map(tc => (
          <rect key={`tile-${tc}-${tr}`} x={GX - NW/2 - 10 + tc * TW} y={GY - NH/2 - 10 + tr * TH} width={TW - CS + NW + 20} height={TH - RS + NH + 20} rx={8} fill="none" stroke={tc === 1 && tr === 1 ? '#334155' : '#1e293b'} strokeWidth={tc === 1 && tr === 1 ? 1.5 : 0.5} strokeDasharray={tc === 1 && tr === 1 ? 'none' : '4,4'} />
        )))}

        {ROW_LABELS.map((l, i) => <text key={`r${i}`} x={(showTorus ? GX + TW : GX) - 14} y={(showTorus ? GY + TH : GY) + i * RS + NH / 2 + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="system-ui">{l}</text>)}
        {COL_LABELS.map((l, i) => <text key={`c${i}`} x={(showTorus ? GX + TW : GX) + i * CS + NW / 2} y={(showTorus ? GY + TH : GY) - 14} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="system-ui">{l}</text>)}

        {(showTorus ? torusPathLines : pathLines).map(l => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={2.5} opacity={l.opacity} markerEnd={`url(#${l.markerId})`} strokeLinecap="round" />
        ))}

        {(showTorus ? [0,1,2].flatMap(tr => [0,1,2].map(tc => ({ tc, tr }))) : [{ tc: 0, tr: 0 }]).map(({ tc, tr }) => {
          const isC = showTorus ? (tc === 1 && tr === 1) : true;
          const tOp = isC ? 1 : 0.3;
          const oX = showTorus ? tc * TW : 0, oY = showTorus ? tr * TH : 0;
          return (
            <g key={`tile-${tc}-${tr}`} opacity={tOp}>
              {Object.entries(GRID).map(([ps, g]) => {
                const pos = Number(ps);
                const x = GX + oX + g.col * CS, y = GY + oY + g.row * RS;
                const isAct = activePositions.has(pos), isSeed = seedPositions.has(pos);
                const nOp = isAct ? 1 : (isC ? 0.25 : 0.15);
                let bc = '#334155';
                if (isSeed && isC) bc = '#38bdf8'; else if (isAct) bc = '#64748b';
                return (
                  <g key={`${tc}${tr}-${pos}`} opacity={nOp}>
                    {isSeed && isC && <rect className="seed-glow" x={x-4} y={y-4} width={NW+8} height={NH+8} rx={8} fill="none" stroke="#38bdf8" strokeWidth={2} filter="url(#glow)" />}
                    <rect x={x} y={y} width={NW} height={NH} rx={6} fill="#0f172a" stroke={bc} strokeWidth={isSeed && isC ? 2 : 1} />
                    <text x={x+NW/2} y={y+15} textAnchor="middle" fill={isAct ? '#f8fafc' : '#475569'} fontSize="12" fontWeight="700" fontFamily="system-ui">{pos}</text>
                    <text x={x+NW/2} y={y+28} textAnchor="middle" fill={isAct ? '#94a3b8' : '#334155'} fontSize="9" fontFamily="system-ui">{abbrev(VERTICES[pos]?.name || '')}</text>
                    <text x={x+NW/2} y={y+39} textAnchor="middle" fill={isAct ? (STAGE_COLORS[STAGES[pos]] || '#475569') : '#1e293b'} fontSize="7" fontFamily="system-ui" fontWeight="600" letterSpacing="0.5">{STAGES[pos] === 'Se' ? 'SEED' : STAGES[pos] === 'Me' ? 'MED' : STAGES[pos] === 'Fr' ? 'FRU' : 'FEED'}</text>
                    {showLabels && isAct && isC && <>
                      <text x={x+NW/2} y={y+NH+11} textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="system-ui">{BEING_LOOKUP[pos]?.group || ''}</text>
                      <text x={x+NW/2} y={y+NH+20} textAnchor="middle" fill="#a855f7" fontSize="7" fontFamily="system-ui">{IDENTITY_LOOKUP[pos]?.group || ''}</text>
                    </>}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =============================================
// TESSERACT VIEW COMPONENT
// =============================================
function TesseractView({ colorMode, autoRotate, showAffinePlanes, affineShadeFill, highlightSet, activePaths, compact }) {
  const [angleXW, setAngleXW] = useState(0.4);
  const [angleYZ, setAngleYZ] = useState(0.3);
  const [angleXY, setAngleXY] = useState(0);
  const [hovered, setHovered] = useState(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const anglesRef = useRef({ xw: 0.4, yz: 0.3, xy: 0 });
  const autoRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => { anglesRef.current = { xw: angleXW, yz: angleYZ, xy: angleXY }; }, [angleXW, angleYZ, angleXY]);
  useEffect(() => { autoRef.current = autoRotate; }, [autoRotate]);

  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      if (autoRef.current && !dragging.current) {
        const a = anglesRef.current;
        anglesRef.current = { xw: a.xw + 0.003, yz: a.yz + 0.002, xy: a.xy + 0.001 };
        setAngleXW(anglesRef.current.xw);
        setAngleYZ(anglesRef.current.yz);
        setAngleXY(anglesRef.current.xy);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const [rotateMode, setRotateMode] = useState(false);
  const [rotateAxis, setRotateAxis] = useState('XW+YZ'); // 'XW+YZ' or 'XY+ZW'
  const rotateModeRef = useRef(false);
  useEffect(() => { rotateModeRef.current = rotateMode; }, [rotateMode]);
  const toggleRotate = useCallback((cx, cy) => {
    lastPos.current = { x: cx, y: cy };
    setRotateMode(p => !p);
  }, []);

  // Global mousemove AND click listener for rotate mode — works everywhere
  useEffect(() => {
    if (!rotateMode) return;
    const onMove = (e) => {
      const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      if (rotateAxis === 'XW+YZ') {
        setAngleXW(p => p + dx * 0.005);
        setAngleYZ(p => p + dy * 0.005);
      } else {
        setAngleXY(p => p + dx * 0.005);
        setAngleYZ(p => p + dy * 0.005);
      }
    };
    const onClick = (e) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
      setRotateMode(false);
    };
    window.addEventListener('mousemove', onMove);
    // Delay adding click listener so the activating click doesn't immediately deactivate
    const timer = setTimeout(() => window.addEventListener('click', onClick), 100);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      clearTimeout(timer);
    };
  }, [rotateMode, rotateAxis]);

  const SZ = 700, CX = 350, CY = 350, SC = 160;
  const ids = Object.keys(VERTICES).map(Number);
  const projected = {};
  for (const id of ids) projected[id] = projectVertex(VERTICES[id].bits, angleXW, angleYZ, angleXY);
  const sortedIds = [...ids].sort((a, b) => projected[a].scale - projected[b].scale);
  const hasHighlight = highlightSet && highlightSet.size > 0;

  return (
    <div style={{ width: '100%' }}>
      {rotateMode && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#f59e0b', marginBottom: 4, fontWeight: 600 }}>
          ROTATE MODE ({rotateAxis}) — move mouse to rotate, click to lock
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
        <button onClick={() => setRotateAxis(p => p === 'XW+YZ' ? 'XY+ZW' : 'XW+YZ')} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'system-ui',
        }}>Axis: {rotateAxis}</button>
        <button onClick={() => { setAngleXW(0.4); setAngleYZ(0.3); setAngleXY(0); }} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9,
        }}>Default</button>
        <button onClick={() => { setAngleXW(0); setAngleYZ(0); setAngleXY(0); }} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9,
        }}>Flat</button>
        <button onClick={() => { setAngleXW(0.78); setAngleYZ(0.55); setAngleXY(0.35); }} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9,
        }}>Classic</button>
        <button onClick={() => { setAngleXW(1.2); setAngleYZ(0.8); setAngleXY(0.6); }} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9,
        }}>Deep</button>
        <button onClick={() => { setAngleXW(Math.PI/4); setAngleYZ(Math.PI/4); setAngleXY(Math.PI/4); }} style={{
          padding: '2px 8px', borderRadius: 3, border: '1px solid #334155', background: '#0f172a',
          color: '#94a3b8', cursor: 'pointer', fontSize: 9,
        }}>45°</button>
      </div>
      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        style={{ width: '100%', maxWidth: compact ? '100%' : 700, height: 'auto', cursor: rotateMode ? 'crosshair' : 'pointer', touchAction: 'none', display: 'block', margin: '0 auto' }}
        onClick={e => toggleRotate(e.clientX, e.clientY)}
        onWheel={e => { e.preventDefault(); setAngleXY(p => p + e.deltaY * 0.002); }}
        onTouchStart={e => { const t = e.touches[0]; toggleRotate(t.clientX, t.clientY); }}
      >
        <rect x="0" y="0" width={SZ} height={SZ} fill="#0a0f1a" rx="12" />

        {EDGES.map((edge, i) => {
          const a = projected[edge.from], b = projected[edge.to];
          const avg = (a.scale + b.scale) / 2;
          let op = 0.15 + Math.min(avg, 2) * 0.3;
          if (hasHighlight && !highlightSet.has(edge.from) && !highlightSet.has(edge.to)) op *= 0.2;
          return <line key={i} x1={CX + a.x * SC} y1={CY + a.y * SC} x2={CX + b.x * SC} y2={CY + b.y * SC} stroke={EDGE_COLORS[edge.bit]} strokeWidth={1.2} opacity={op} />;
        })}

        {showAffinePlanes !== null && (() => {
          const planesToShow = showAffinePlanes === 4 ? AFFINE_PLANES : [AFFINE_PLANES[showAffinePlanes]];
          return planesToShow.filter(Boolean).map((plane, pi) => {
            const pts = plane.ids.map(id => ({
              x: CX + projected[id].x * SC,
              y: CY + projected[id].y * SC,
              id,
            }));
            // Draw all 6 connecting lines between the 4 vertices (complete graph K4)
            const lines = [];
            for (let i = 0; i < 4; i++) {
              for (let j = i + 1; j < 4; j++) {
                lines.push(
                  <line key={`af-${pi}-${i}${j}`}
                    x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y}
                    stroke={plane.color} strokeWidth={2.5} opacity={0.7}
                  />
                );
              }
            }
            // Glow the 4 vertices
            const glows = pts.map((p, i) => (
              <circle key={`afg-${pi}-${i}`} cx={p.x} cy={p.y} r={12} fill={plane.color} opacity={0.2} />
            ));
            // Label
            const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
            const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
            // Shaded fill — convex hull sorted by angle from centroid
            const pcx = pts.reduce((s, p) => s + p.x, 0) / 4;
            const pcy = pts.reduce((s, p) => s + p.y, 0) / 4;
            const hullSorted = [...pts].sort((a, b) => Math.atan2(a.y - pcy, a.x - pcx) - Math.atan2(b.y - pcy, b.x - pcx));
            const hullPoints = hullSorted.map(p => `${p.x},${p.y}`).join(' ');

            return (
              <g key={`afp-${pi}`}>
                {affineShadeFill && (
                  <polygon points={hullPoints} fill={plane.color} fillOpacity={0.12} stroke={plane.color} strokeWidth={0.5} strokeOpacity={0.3} />
                )}
                {glows}
                {lines}
                <text x={cx} y={cy - 10} textAnchor="middle" fill={plane.color} fontSize="11" fontWeight="700" opacity={0.9} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>
                  {plane.label} = 40
                </text>
                <text x={cx} y={cy + 4} textAnchor="middle" fill={plane.color} fontSize="8" opacity={0.6} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>
                  {plane.ids.join(' + ')}
                </text>
              </g>
            );
          });
        })()}

        {/* Active process paths — matching the grid view */}
        {activePaths && activePaths.map((path, pi) => {
          const pts = path.seq.map(id => ({
            x: CX + projected[id].x * SC,
            y: CY + projected[id].y * SC,
          }));
          // Shade: convex hull polygon
          const pcx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const pcy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const hullSorted = [...pts].sort((a, b) => Math.atan2(a.y - pcy, a.x - pcx) - Math.atan2(b.y - pcy, b.x - pcx));
          // Path lines
          const segs = [];
          for (let i = 0; i < path.seq.length; i++) {
            const fromId = path.seq[i], toId = path.seq[(i + 1) % path.seq.length];
            const a = projected[fromId], b = projected[toId];
            if (!a || !b) continue;
            segs.push(
              <line key={`pp-${pi}-${i}`}
                x1={CX + a.x * SC} y1={CY + a.y * SC}
                x2={CX + b.x * SC} y2={CY + b.y * SC}
                stroke={path.color} strokeWidth={2.5} opacity={0.7}
                markerEnd={`url(#arrow-pp-${pi})`}
                strokeLinecap="round"
              />
            );
          }
          return (
            <g key={`path-${pi}`}>
              <defs>
                <marker id={`arrow-pp-${pi}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L8,3 L0,6 Z" fill={path.color} />
                </marker>
              </defs>
              {affineShadeFill && pts.length >= 3 && (
                <polygon
                  points={hullSorted.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={path.color} fillOpacity={0.1}
                  stroke={path.color} strokeWidth={0.5} strokeOpacity={0.2}
                />
              )}
              {segs}
            </g>
          );
        })}

        {sortedIds.map(id => {
          const p = projected[id];
          const sx = CX + p.x * SC, sy = CY + p.y * SC;
          const r = 4 + p.scale * 4;
          const color = getVertexColor(id, colorMode);
          const isHov = hovered === id;
          const dimmed = hasHighlight && !highlightSet.has(id);
          const baseOp = 0.3 + Math.min(p.scale, 2) * 0.3;
          return (
            <g key={id} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {hasHighlight && highlightSet.has(id) && <circle cx={sx} cy={sy} r={r + 6} fill={color} opacity={0.15} />}
              <circle cx={sx} cy={sy} r={isHov ? r + 3 : r} fill={color} opacity={dimmed ? baseOp * 0.2 : baseOp} stroke={isHov ? '#fff' : color} strokeWidth={isHov ? 2 : 1} />
              <text x={sx + r + 4} y={sy - 2} fill="#e2e8f0" fontSize={isHov ? 12 : 10} fontWeight={isHov ? 700 : 500} opacity={dimmed ? 0.15 : 0.4 + Math.min(p.scale, 2) * 0.25} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>{id}</text>
              <text x={sx + r + 4} y={sy + 11} fill={color} fontSize={isHov ? 10 : 8.5} fontWeight={500} opacity={dimmed ? 0.1 : 0.35 + Math.min(p.scale, 2) * 0.25} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>{VERTICES[id].name}</text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div style={{ marginTop: 6, padding: '8px 14px', background: '#0f172a', borderRadius: 8, textAlign: 'center', fontSize: '0.8rem' }}>
          <span style={{ color: getVertexColor(hovered, colorMode), fontWeight: 700 }}>{hovered} — {VERTICES[hovered].name}</span>
          <span style={{ color: '#64748b', marginLeft: 10 }}>bits: [{VERTICES[hovered].bits.join(',')}]</span>
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN PAGE
// =============================================
export default function VisualizePage() {
  const [viewMode, setViewMode] = useState('Grid');
  const [selectedSeed, setSelectedSeed] = useState(8);
  const [showAll, setShowAll] = useState(false);
  const [dimVisible, setDimVisible] = useState({ Practice: true, Activity: true, Being: true, Identity: true });
  const [selectedBeingGroups, setSelectedBeingGroups] = useState(new Set());
  const [selectedIdentityGroups, setSelectedIdentityGroups] = useState(new Set());
  const [showLabels, setShowLabels] = useState(false);
  const [showTorus, setShowTorus] = useState(false);
  const [colorMode, setColorMode] = useState('Being');
  const [autoRotate, setAutoRotate] = useState(false);
  const [affinePlaneIdx, setAffinePlaneIdx] = useState(null); // null=off, 0-3=individual, 4=all
  const [affineShadeFill, setAffineShadeFill] = useState(false);
  const [gridZoom, setGridZoom] = useState(1);
  const [tessZoom, setTessZoom] = useState(1);

  const groupFilterActive = selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0;
  const showGrid = viewMode === 'Grid' || viewMode === 'Split';
  const showTess = viewMode === 'Tesseract' || viewMode === 'Split';

  const selectSeed = (k) => { setShowAll(false); setSelectedBeingGroups(new Set()); setSelectedIdentityGroups(new Set()); setSelectedSeed(k); };
  const toggleBeing = (n) => { setSelectedBeingGroups(p => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; }); setShowAll(false); };
  const toggleIdentity = (n) => { setSelectedIdentityGroups(p => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; }); setShowAll(false); };
  const toggleDim = (d) => setDimVisible(p => ({ ...p, [d]: !p[d] }));

  // Compute highlight set for tesseract based on shared filter state
  // Compute highlighted positions AND the active process paths for the tesseract
  const { highlightSet, activePaths } = useMemo(() => {
    const set = new Set();
    const paths = []; // { seq: [ids], color: string }
    const stageOrder = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
    if (groupFilterActive) {
      selectedBeingGroups.forEach(n => {
        if (BEING_DEFS[n]) {
          BEING_DEFS[n].members.forEach(p => set.add(p));
          const sorted = [...BEING_DEFS[n].members].sort((a, b) => (stageOrder[STAGES[a]] || 0) - (stageOrder[STAGES[b]] || 0));
          paths.push({ seq: sorted, color: '#fbbf24' });
        }
      });
      selectedIdentityGroups.forEach(n => {
        if (IDENTITY_DEFS[n]) {
          IDENTITY_DEFS[n].members.forEach(p => set.add(p));
          const sorted = [...IDENTITY_DEFS[n].members].sort((a, b) => (stageOrder[STAGES[a]] || 0) - (stageOrder[STAGES[b]] || 0));
          paths.push({ seq: sorted, color: '#a855f7' });
        }
      });
    } else if (showAll) {
      // All 16 — no highlight needed
    } else {
      const s = SEEDS[selectedSeed];
      if (s) DIMENSION_ORDER.forEach(d => {
        if (dimVisible[d]) {
          s.paths[d].seq.forEach(p => set.add(p));
          paths.push({ seq: s.paths[d].seq, color: s.paths[d].color });
        }
      });
    }
    return { highlightSet: set, activePaths: paths };
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const isSplit = viewMode === 'Split';

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '20px 16px' }}>
      {/* TITLE */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>NIRMANAKAYA STRUCTURAL VISUALIZATION</h1>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>Four Seeds x Four Dimensions — Grid, Tesseract, and Combined Views</p>
      </div>

      {/* VIEW TABS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {['Grid', 'Tesseract', 'Split'].map(m => (
          <button key={m} onClick={() => setViewMode(m)} style={{
            padding: '7px 22px', borderRadius: 6, border: viewMode === m ? '2px solid #38bdf8' : '1px solid #334155',
            background: viewMode === m ? '#1e3a5f' : '#0f172a', color: viewMode === m ? '#f0f9ff' : '#94a3b8',
            fontSize: 14, fontWeight: viewMode === m ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{m}</button>
        ))}
      </div>

      {/* SEED SELECTOR */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.entries(SEEDS).map(([key, seed]) => {
          const k = Number(key);
          const active = !showAll && !groupFilterActive && selectedSeed === k;
          return <button key={k} onClick={() => selectSeed(k)} style={btn(active)}>{seed.name} ({k})</button>;
        })}
        <button onClick={() => { setShowAll(true); setSelectedBeingGroups(new Set()); setSelectedIdentityGroups(new Set()); }} style={btn(showAll && !groupFilterActive)}>Show All</button>
      </div>

      {/* DIMENSION TOGGLES — grid-relevant ones only if grid visible */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        {DIMENSION_ORDER.map(dim => {
          const c = SEEDS[8].paths[dim].color;
          return <button key={dim} onClick={() => toggleDim(dim)} style={{ ...btn(dimVisible[dim], c), opacity: dimVisible[dim] ? 1 : 0.5 }}>{dim}</button>;
        })}
        {showGrid && <>
          <button onClick={() => setShowLabels(p => !p)} style={{ ...btn(showLabels, '#e2e8f0'), marginLeft: 6 }}>Labels</button>
          <button onClick={() => setShowTorus(p => !p)} style={{ ...btn(showTorus, '#f59e0b') }}>Torus</button>
        </>}
      </div>

      {/* BEING GROUP FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#fbbf24', alignSelf: 'center', fontWeight: 600 }}>BEING</span>
        {Object.entries(BEING_DEFS).map(([n, d]) => (
          <button key={n} onClick={() => toggleBeing(n)} style={{ ...btn(selectedBeingGroups.has(n), '#fbbf24'), opacity: selectedBeingGroups.has(n) ? 1 : 0.6 }}>
            {n} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{d.verb}</span>
          </button>
        ))}
      </div>

      {/* IDENTITY GROUP FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#a855f7', alignSelf: 'center', fontWeight: 600 }}>IDENTITY</span>
        {Object.entries(IDENTITY_DEFS).map(([n, d]) => (
          <button key={n} onClick={() => toggleIdentity(n)} style={{ ...btn(selectedIdentityGroups.has(n), '#a855f7'), opacity: selectedIdentityGroups.has(n) ? 1 : 0.6 }}>
            {n} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{d.verb}</span>
          </button>
        ))}
      </div>

      {/* TESSERACT-SPECIFIC CONTROLS */}
      {showTess && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>TESSERACT</span>
          {Object.keys(COLOR_MODES).map(m => (
            <button key={m} onClick={() => setColorMode(m)} style={btn(colorMode === m, '#e2e8f0')}>{m}</button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} /> Rotate
          </label>
          <button onClick={() => setAffinePlaneIdx(p => p === null ? 0 : p >= 4 ? null : p + 1)} style={btn(affinePlaneIdx !== null, '#f59e0b')}>
            {affinePlaneIdx === null ? 'Diagonals' : affinePlaneIdx === 4 ? 'All 4' : `D${affinePlaneIdx + 1}: ${AFFINE_PLANES[affinePlaneIdx].ids.join('+')}`}
          </button>
          <button onClick={() => setAffineShadeFill(p => !p)} style={btn(affineShadeFill, '#f59e0b')}>Shade</button>
        </div>
      )}

      {/* LEGEND */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {DIMENSION_ORDER.map(dim => (
          <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 3, background: SEEDS[8].paths[dim].color, borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{dim}</span>
          </div>
        ))}
        {showTess && <>
          <span style={{ color: '#334155' }}>|</span>
          {Object.entries(COLOR_MODES[colorMode]).map(([n, { color }]) => (
            <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} /> {n}
            </span>
          ))}
        </>}
      </div>

      {/* VIEWS */}
      <div style={{
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        flexWrap: isSplit ? 'nowrap' : 'wrap',
        alignItems: isSplit ? 'flex-start' : 'center',
        maxWidth: isSplit ? '100%' : 900,
        margin: '0 auto',
      }}>
        <div style={{
          flex: isSplit ? '1 1 50%' : 'none',
          maxWidth: isSplit ? '60%' : 900,
          minWidth: 200,
          border: '1px solid #1e293b', borderRadius: 12, background: '#0f172a',
          flexDirection: 'column',
          resize: 'both', overflow: 'hidden',
          display: showGrid ? 'flex' : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>GRID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setGridZoom(z => Math.max(0.3, z - 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>−</button>
                <span style={{ fontSize: 10, color: '#64748b', minWidth: 32, textAlign: 'center' }}>{Math.round(gridZoom * 100)}%</span>
                <button onClick={() => setGridZoom(z => Math.min(3, z + 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>+</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: 12, flex: 1 }}>
              <div style={{ transform: `scale(${gridZoom})`, transformOrigin: 'top center', transition: 'transform 0.15s' }}>
                <GridView
                  selectedSeed={selectedSeed} showAll={showAll} dimVisible={dimVisible}
                  selectedBeingGroups={selectedBeingGroups} selectedIdentityGroups={selectedIdentityGroups}
                  showLabels={showLabels} showTorus={showTorus} compact={isSplit}
                />
              </div>
            </div>
          </div>
        <div style={{
          flex: isSplit ? '1 1 50%' : 'none',
          maxWidth: isSplit ? '60%' : 750,
          minWidth: 200,
          border: '1px solid #1e293b', borderRadius: 12, background: '#0f172a',
          flexDirection: 'column',
          resize: 'both', overflow: 'hidden',
          display: showTess ? 'flex' : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>TESSERACT</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setTessZoom(z => Math.max(0.3, z - 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>−</button>
                <span style={{ fontSize: 10, color: '#64748b', minWidth: 32, textAlign: 'center' }}>{Math.round(tessZoom * 100)}%</span>
                <button onClick={() => setTessZoom(z => Math.min(3, z + 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>+</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: 12, flex: 1 }}>
              <div style={{ transform: `scale(${tessZoom})`, transformOrigin: 'top center', transition: 'transform 0.15s' }}>
                <TesseractView
                  colorMode={colorMode} autoRotate={autoRotate}
                  showAffinePlanes={affinePlaneIdx}
                  affineShadeFill={affineShadeFill}
                  highlightSet={highlightSet}
                  activePaths={activePaths}
                  compact={isSplit}
                />
              </div>
            </div>
          </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#475569' }}>
        Seed &rarr; Medium &rarr; Fruition &rarr; Feedback &nbsp;&middot;&nbsp; 16 archetypes at vertices of a 4D hypercube
      </div>
    </div>
  );
}
