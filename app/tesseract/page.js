'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// 16 manifest archetypes → 4-bit tesseract vertices
// Bits: [Practice0, Practice1, Activity0, Activity1]
// Grid: cols=Practice(Spirit=00, Mind=01, Emotion=10, Body=11)
//        rows=Activity(Intent=00, Cognit=01, Reson=10, Struct=11)
// Verified against Council_Posit_Fourth_Dimension_Healing_Matrix.md:
//   G3 (Passage) = {0000, 0111, 1010, 1101} = {17, 16, 6, 9} — subgroup of Z₂⁴
const VERTICES = {
  17: { bits: [0,0,0,0], name: 'Inspiration' },   // Spirit, Intent
   7: { bits: [1,0,0,0], name: 'Drive' },          // Emotion, Intent
   4: { bits: [0,1,0,0], name: 'Order' },          // Mind, Intent
  12: { bits: [1,1,0,0], name: 'Sacrifice' },      // Body, Intent
   2: { bits: [0,0,0,1], name: 'Wisdom' },         // Spirit, Cognition
  14: { bits: [1,0,0,1], name: 'Balance' },        // Emotion, Cognition
  15: { bits: [0,1,0,1], name: 'Abstraction' },    // Mind, Cognition
   9: { bits: [1,1,0,1], name: 'Discipline' },     // Body, Cognition
  18: { bits: [0,0,1,0], name: 'Imagination' },    // Spirit, Resonance
   6: { bits: [1,0,1,0], name: 'Compassion' },     // Emotion, Resonance
   5: { bits: [0,1,1,0], name: 'Culture' },        // Mind, Resonance
  11: { bits: [1,1,1,0], name: 'Equity' },         // Body, Resonance
   3: { bits: [0,0,1,1], name: 'Nurturing' },      // Spirit, Structure
  13: { bits: [1,0,1,1], name: 'Change' },         // Emotion, Structure
  16: { bits: [0,1,1,1], name: 'Breakthrough' },   // Mind, Structure
   8: { bits: [1,1,1,1], name: 'Fortitude' },      // Body, Structure
};

// Being groups
const BEING = {
  Mantle:  { ids: [8,7,15,18],  color: '#fbbf24' },
  Kindle:  { ids: [2,5,13,12],  color: '#22d3ee' },
  Vessel:  { ids: [4,3,11,14],  color: '#4ade80' },
  Passage: { ids: [6,9,17,16],  color: '#fb7185' },
};

// Identity groups
const IDENTITY = {
  Composure:  { ids: [8,5,17,14],  color: '#22d3ee' },
  Conviction: { ids: [2,7,11,16],  color: '#fbbf24' },
  Exploration:{ ids: [4,9,13,18],  color: '#4ade80' },
  Intimacy:   { ids: [6,3,15,12],  color: '#fb7185' },
};

// Practice groups
const PRACTICE = {
  Spirit:  { ids: [17,2,18,3],  color: '#c084fc' },
  Emotion: { ids: [7,14,6,13],  color: '#fb7185' },
  Mind:    { ids: [4,15,5,16],  color: '#22d3ee' },
  Body:    { ids: [12,9,11,8],  color: '#4ade80' },
};

// Stage groups
const STAGE = {
  Seed:     { ids: [4,2,6,8],    color: '#22c55e' },
  Medium:   { ids: [7,9,5,3],    color: '#3b82f6' },
  Fruition: { ids: [17,15,11,13],color: '#22c55e' },
  Feedback: { ids: [12,14,18,16],color: '#3b82f6' },
};

const COLOR_MODES = { Being: BEING, Identity: IDENTITY, Practice: PRACTICE, Stage: STAGE };

const EDGE_COLORS = ['#4ade80', '#22d3ee', '#ef4444', '#f59e0b'];

function getVertexColor(id, mode) {
  const groups = COLOR_MODES[mode];
  for (const g of Object.values(groups)) {
    if (g.ids.includes(id)) return g.color;
  }
  return '#e2e8f0';
}

// Build edges: Hamming distance 1
function buildEdges() {
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
}
const EDGES = buildEdges();

// The 4 affine 2-planes (space diagonals) of the tesseract — each sums to 40
// Complete in Practice AND Being, paired in Activity/Identity/Stage
const AFFINE_PLANES = [
  { ids: [17, 7, 5, 11],  color: '#f59e0b', label: 'D1', actPair: 'Intent+Resonance', idPair: 'Composure+Conviction' },
  { ids: [2, 14, 16, 8],  color: '#ef4444', label: 'D2', actPair: 'Cognition+Structure', idPair: 'Composure+Conviction' },
  { ids: [9, 15, 13, 3],  color: '#8b5cf6', label: 'D3', actPair: 'Cognition+Structure', idPair: 'Exploration+Intimacy' },
  { ids: [12, 4, 6, 18],  color: '#22d3ee', label: 'D4', actPair: 'Intent+Resonance', idPair: 'Exploration+Intimacy' },
];

function rotate4D(point, angleXW, angleYZ) {
  let [x, y, z, w] = point;
  let cA = Math.cos(angleXW), sA = Math.sin(angleXW);
  let nx = x * cA - w * sA, nw = x * sA + w * cA;
  x = nx; w = nw;
  let cB = Math.cos(angleYZ), sB = Math.sin(angleYZ);
  let ny = y * cB - z * sB, nz = y * sB + z * cB;
  y = ny; z = nz;
  return [x, y, z, w];
}

function project4Dto2D(p, pd4 = 4.0, pd3 = 6.0) {
  const [x, y, z, w] = p;
  const s4 = pd4 / (pd4 - w);
  const x3 = x * s4, y3 = y * s4, z3 = z * s4;
  const s3 = pd3 / (pd3 - z3);
  return { x: x3 * s3, y: y3 * s3, scale: s4 * s3 };
}

function projectVertex(bits, angleXW, angleYZ) {
  const p = bits.map(b => b === 0 ? -1 : 1);
  const r = rotate4D(p, angleXW, angleYZ);
  return project4Dto2D(r);
}

const SIZE = 700, CX = 350, CY = 350, SCALE = 160;

export default function TesseractPage() {
  const [angleXW, setAngleXW] = useState(0.4);
  const [angleYZ, setAngleYZ] = useState(0.3);
  const [colorMode, setColorMode] = useState('Being');
  const [autoRotate, setAutoRotate] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [showAffinePlanes, setShowAffinePlanes] = useState(false);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const anglesRef = useRef({ xw: 0.4, yz: 0.3 });
  const autoRef = useRef(false);
  const rafRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { anglesRef.current = { xw: angleXW, yz: angleYZ }; }, [angleXW, angleYZ]);
  useEffect(() => { autoRef.current = autoRotate; }, [autoRotate]);

  // Auto-rotation loop
  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      if (autoRef.current && !dragging.current) {
        const a = anglesRef.current;
        const nxw = a.xw + 0.003, nyz = a.yz + 0.002;
        anglesRef.current = { xw: nxw, yz: nyz };
        setAngleXW(nxw);
        setAngleYZ(nyz);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const startDrag = useCallback((cx, cy) => {
    dragging.current = true;
    lastPos.current = { x: cx, y: cy };
  }, []);

  const moveDrag = useCallback((cx, cy) => {
    if (!dragging.current) return;
    const dx = cx - lastPos.current.x, dy = cy - lastPos.current.y;
    lastPos.current = { x: cx, y: cy };
    setAngleXW(prev => prev + dx * 0.005);
    setAngleYZ(prev => prev + dy * 0.005);
  }, []);

  const endDrag = useCallback(() => { dragging.current = false; }, []);

  // Project all vertices
  const projected = {};
  const ids = Object.keys(VERTICES).map(Number);
  for (const id of ids) {
    projected[id] = projectVertex(VERTICES[id].bits, angleXW, angleYZ);
  }

  // Sort vertices by depth (scale) for rendering back-to-front
  const sortedIds = [...ids].sort((a, b) => projected[a].scale - projected[b].scale);

  // Legend
  const legend = COLOR_MODES[colorMode];

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.08em', margin: 0, textAlign: 'center' }}>
        TESSERACT — The Forty-Fold Seal in Four Dimensions
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '6px 0 16px', textAlign: 'center' }}>
        16 archetypes at 16 vertices of a 4D hypercube. Drag to rotate.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px', justifyContent: 'center' }}>
        {Object.keys(COLOR_MODES).map(mode => (
          <button key={mode} onClick={() => setColorMode(mode)} style={{
            padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            background: colorMode === mode ? '#334155' : '#1e293b', color: colorMode === mode ? '#e2e8f0' : '#64748b',
          }}>{mode}</button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} />
          Auto-rotate
        </label>
        <button onClick={() => { setAngleXW(0.4); setAngleYZ(0.3); }} style={{
          padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          background: '#1e293b', color: '#64748b',
        }}>Reset</button>
        <button onClick={() => setShowAffinePlanes(p => !p)} style={{
          padding: '5px 14px', borderRadius: '6px', border: showAffinePlanes ? '1px solid #f59e0b' : 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          background: showAffinePlanes ? '#f59e0b22' : '#1e293b', color: showAffinePlanes ? '#f59e0b' : '#64748b',
        }}>Affine Planes</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(legend).map(([name, { color }]) => (
          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {name}
          </span>
        ))}
      </div>

      {/* Edge legend */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Bit 0 (Practice)', 'Bit 1 (Practice)', 'Bit 2 (Activity)', 'Bit 3 (Activity)'].map((label, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748b' }}>
            <span style={{ width: 16, height: 3, background: EDGE_COLORS[i], display: 'inline-block', borderRadius: 2 }} />
            {label}
          </span>
        ))}
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ width: '100%', maxWidth: 700, height: 'auto', cursor: dragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={e => startDrag(e.clientX, e.clientY)}
        onMouseMove={e => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
        onTouchMove={e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
        onTouchEnd={endDrag}
      >
        <rect x="0" y="0" width={SIZE} height={SIZE} fill="#0a0f1a" rx="12" />

        {/* Edges */}
        {EDGES.map((edge, i) => {
          const a = projected[edge.from], b = projected[edge.to];
          const avgScale = (a.scale + b.scale) / 2;
          const opacity = 0.15 + Math.min(avgScale, 2) * 0.3;
          return (
            <line key={i}
              x1={CX + a.x * SCALE} y1={CY + a.y * SCALE}
              x2={CX + b.x * SCALE} y2={CY + b.y * SCALE}
              stroke={EDGE_COLORS[edge.bit]} strokeWidth={1.2} opacity={opacity}
            />
          );
        })}

        {/* Affine planes — semi-transparent quadrilaterals */}
        {showAffinePlanes && AFFINE_PLANES.map((plane, pi) => {
          // Project the 4 vertices and sort to form a convex hull (by angle from centroid)
          const pts = plane.ids.map(id => ({
            x: CX + projected[id].x * SCALE,
            y: CY + projected[id].y * SCALE,
          }));
          const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
          const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
          const sorted = [...pts].sort((a, b) =>
            Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
          );
          const points = sorted.map(p => `${p.x},${p.y}`).join(' ');
          // Draw edges of the plane
          const edges = [];
          for (let i = 0; i < sorted.length; i++) {
            const a = sorted[i], b = sorted[(i + 1) % sorted.length];
            edges.push(
              <line key={`ap-${pi}-e${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={plane.color} strokeWidth={1.5} opacity={0.6}
                strokeDasharray="4,3"
              />
            );
          }
          // Draw diagonals of the plane
          edges.push(
            <line key={`ap-${pi}-d1`}
              x1={sorted[0].x} y1={sorted[0].y} x2={sorted[2].x} y2={sorted[2].y}
              stroke={plane.color} strokeWidth={0.8} opacity={0.3}
              strokeDasharray="2,3"
            />
          );
          edges.push(
            <line key={`ap-${pi}-d2`}
              x1={sorted[1].x} y1={sorted[1].y} x2={sorted[3].x} y2={sorted[3].y}
              stroke={plane.color} strokeWidth={0.8} opacity={0.3}
              strokeDasharray="2,3"
            />
          );
          return (
            <g key={`affine-${pi}`}>
              <polygon
                points={points}
                fill={plane.color}
                fillOpacity={0.08}
                stroke="none"
              />
              {edges}
              <text
                x={cx} y={cy - 6}
                textAnchor="middle" fill={plane.color}
                fontSize="9" fontWeight="600" opacity={0.7}
                style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
              >
                {plane.label} = 40
              </text>
              <text
                x={cx} y={cy + 6}
                textAnchor="middle" fill={plane.color}
                fontSize="7" opacity={0.5}
                style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
              >
                {plane.actPair}
              </text>
            </g>
          );
        })}

        {/* Vertices (sorted back to front) */}
        {sortedIds.map(id => {
          const p = projected[id];
          const sx = CX + p.x * SCALE, sy = CY + p.y * SCALE;
          const r = 4 + p.scale * 4;
          const color = getVertexColor(id, colorMode);
          const isHov = hovered === id;
          return (
            <g key={id}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={sx} cy={sy} r={isHov ? r + 3 : r}
                fill={color} opacity={0.3 + Math.min(p.scale, 2) * 0.3}
                stroke={isHov ? '#fff' : color} strokeWidth={isHov ? 2 : 1}
              />
              <text x={sx + r + 4} y={sy - 2}
                fill="#e2e8f0" fontSize={isHov ? 12 : 10} fontWeight={isHov ? 700 : 500}
                opacity={0.4 + Math.min(p.scale, 2) * 0.25}
                style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
              >
                {id}
              </text>
              <text x={sx + r + 4} y={sy + 11}
                fill={color} fontSize={isHov ? 10 : 8.5} fontWeight={500}
                opacity={0.35 + Math.min(p.scale, 2) * 0.25}
                style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
              >
                {VERTICES[id].name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover info */}
      {hovered && (
        <div style={{ marginTop: 10, padding: '10px 18px', background: '#0f172a', borderRadius: 8, textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: getVertexColor(hovered, colorMode), fontWeight: 700 }}>
            {hovered} — {VERTICES[hovered].name}
          </span>
          <span style={{ color: '#64748b', marginLeft: 12 }}>
            bits: [{VERTICES[hovered].bits.join(',')}]
          </span>
          {Object.entries(COLOR_MODES).map(([mode, groups]) => {
            for (const [gname, g] of Object.entries(groups)) {
              if (g.ids.includes(hovered)) return (
                <span key={mode} style={{ color: '#64748b', marginLeft: 12 }}>{mode}: {gname}</span>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
