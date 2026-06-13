'use client';
// components/viz/AxisOfBecoming.js
// Technical drawing — "The Axis of Becoming."
// Source (10) at the top, Creation (21) at the bottom. Between them, the ten fundamental
// nodes (1→10) form a straight vertical spine, each row-aligned with the twenty archetypes
// flanking it: the Creation arm (0–9) left, the Operation arm (11–20) right.
//
// Canon: book ch10 "The Quadraverse & The Nodes" (the ten nodes);
// lib/archetypes.js (the 22); lib/viz/palette.js (element-true house colors).

import { ARCHETYPES } from '../../lib/archetypes.js';
import { FUNDAMENTAL_NODES } from '../../lib/viz/fundamentalNodes.js';
import { houseColor, PORTAL_COLOR, ELEMENT_COLORS, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette.js';

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X',
  'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// ---- canvas geometry ----
const W = 1400, H = 1420;
const LX = 360, RX = 1040, CX = 700;        // left arch / right arch / center spine
const ROW_TOP = 235, ROWS = 10, ROW_H = 86;
const rowY = (k) => ROW_TOP + k * ROW_H;     // k = 0..9
const COL_BOTTOM = rowY(ROWS - 1);           // 1009
const NODE_R = 16;
const SRC_Y = 120, CRE_Y = 1130;             // Source top, Creation bottom

const HOUSE_LEGEND = [
  ['Gestalt', ELEMENT_COLORS.Aether],
  ['Spirit',  ELEMENT_COLORS.Fire],
  ['Mind',    ELEMENT_COLORS.Air],
  ['Emotion', ELEMENT_COLORS.Water],
  ['Body',    ELEMENT_COLORS.Earth],
  ['Portal',  PORTAL_COLOR],
];

function Archetype({ a, x, y, side }) {
  const c = houseColor(a.house);
  const outward = side === 'left' ? -1 : 1;            // labels face away from center
  const anchor = side === 'left' ? 'end' : 'start';
  const tx = x + outward * 26;
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill={c} stroke="#0b0d12" strokeWidth={1.5} />
      <text x={tx} y={y - 4} textAnchor={anchor} fontFamily={MONO} fontSize={20}
        fontWeight={600} fill={VIZ_INK}>
        <tspan fill={c} fontSize={13}>{ROMAN[a.number]} </tspan>{a.name}
      </text>
      <text x={tx} y={y + 14} textAnchor={anchor} fontFamily={MONO} fontSize={12} fill={VIZ_DIM}>
        {a.house} · {a.traditional}
      </text>
    </g>
  );
}

function Portal({ a, y, sub }) {
  return (
    <g>
      <circle cx={CX} cy={y} r={30} fill="none" stroke={PORTAL_COLOR} strokeWidth={2} />
      <circle cx={CX} cy={y} r={20} fill="none" stroke={PORTAL_COLOR} strokeWidth={1} opacity={0.6} />
      <circle cx={CX} cy={y} r={6} fill={PORTAL_COLOR} />
      <text x={CX} y={y - 44} textAnchor="middle" fontFamily={MONO} fontSize={22} fontWeight={700}
        fill={PORTAL_COLOR}>{ROMAN[a.number]} · {a.name.toUpperCase()}</text>
      <text x={CX} y={y + 52} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={VIZ_DIM}>
        {a.traditional} — {sub}</text>
    </g>
  );
}

export default function AxisOfBecoming() {
  const leftArm = [0,1,2,3,4,5,6,7,8,9].map((i) => ({ ...ARCHETYPES[i], number: i }));
  const rightArm = [11,12,13,14,15,16,17,18,19,20].map((i) => ({ ...ARCHETYPES[i], number: i }));
  const source = { ...ARCHETYPES[10], number: 10 };
  const creation = { ...ARCHETYPES[21], number: 21 };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: '#06070b', color: VIZ_INK,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 12px 60px', fontFamily: MONO, overflowX: 'auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 700, letterSpacing: '.04em', margin: 0 }}>
          THE AXIS OF BECOMING
        </h1>
        <p style={{ color: VIZ_DIM, fontSize: 13, marginTop: 6, maxWidth: 740 }}>
          Source above, Creation below. The ten fundamental nodes (1→10) form the spine between
          them, each aligned with the twenty archetypes flanking it — the Creation arm (0–9) on the
          left, the Operation arm (11–20) on the right.
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 1240, height: 'auto' }}>
        {/* frame + registration ticks */}
        <rect x={20} y={20} width={W - 40} height={H - 40} fill="none" stroke="#1b2230" strokeWidth={1} />
        {[[20,20],[W-20,20],[20,H-20],[W-20,H-20]].map(([x,y],i)=>(
          <g key={i} stroke="#2a3344" strokeWidth={1}>
            <line x1={x-12} y1={y} x2={x+12} y2={y} /><line x1={x} y1={y-12} x2={x} y2={y+12} />
          </g>
        ))}

        {/* column headers */}
        <text x={LX} y={ROW_TOP - 46} textAnchor="middle" fontFamily={MONO} fontSize={14}
          fontWeight={700} fill={VIZ_INK}>CREATION ARM</text>
        <text x={LX} y={ROW_TOP - 28} textAnchor="middle" fontFamily={MONO} fontSize={11}
          fill={VIZ_DIM}>0–9 · descent · Gestalt→Body</text>
        <text x={RX} y={ROW_TOP - 46} textAnchor="middle" fontFamily={MONO} fontSize={14}
          fontWeight={700} fill={VIZ_INK}>OPERATION ARM</text>
        <text x={RX} y={ROW_TOP - 28} textAnchor="middle" fontFamily={MONO} fontSize={11}
          fill={VIZ_DIM}>11–20 · ascent · Body→Gestalt</text>

        {/* the spine: Source → ten nodes → Creation */}
        <line x1={CX} y1={SRC_Y + 34} x2={CX} y2={CRE_Y - 34} stroke="#27425e" strokeWidth={1.5} />

        {/* portals */}
        <Portal a={source} y={SRC_Y} sub="the wellspring — pure potential turns" />
        <Portal a={creation} y={CRE_Y} sub="the World — the cycle made manifest" />

        {/* ten fundamental nodes, row-aligned with the arms */}
        {FUNDAMENTAL_NODES.map((n, k) => (
          <g key={n.count}>
            <circle cx={CX} cy={rowY(k)} r={NODE_R} fill="#0e1422" stroke={ELEMENT_COLORS.Aether}
              strokeWidth={1.8} />
            <text x={CX} y={rowY(k) + 5} textAnchor="middle" fontFamily={MONO} fontSize={16}
              fontWeight={700} fill={VIZ_INK}>{n.count}</text>
          </g>
        ))}
        <text x={CX} y={ROW_TOP - 38} textAnchor="middle" fontFamily={MONO} fontSize={12}
          fill={ELEMENT_COLORS.Aether} fontWeight={700}>TEN NODES</text>
        <text x={CX} y={ROW_TOP - 22} textAnchor="middle" fontFamily={MONO} fontSize={10}
          fill={VIZ_DIM}>1+2+3+4=10</text>

        {/* archetype arms — aligned row-for-row with the nodes */}
        {leftArm.map((a, k) => <Archetype key={a.number} a={a} x={LX} y={rowY(k)} side="left" />)}
        {rightArm.map((a, k) => <Archetype key={a.number} a={a} x={RX} y={rowY(k)} side="right" />)}

        {/* ---- title block ---- */}
        <g transform={`translate(40 ${H - 150})`}>
          <rect x={0} y={0} width={W - 80} height={110} fill="none" stroke="#1b2230" strokeWidth={1} />
          <line x1={360} y1={0} x2={360} y2={110} stroke="#1b2230" />
          <line x1={980} y1={0} x2={980} y2={110} stroke="#1b2230" />
          {/* house legend */}
          <text x={16} y={24} fontFamily={MONO} fontSize={12} fontWeight={700} fill={VIZ_INK}>HOUSE / ELEMENT</text>
          {HOUSE_LEGEND.map(([name, col], i) => {
            const cx = 22 + (i % 3) * 116, cy = 48 + Math.floor(i / 3) * 28;
            return (
              <g key={name}>
                <circle cx={cx} cy={cy - 4} r={6} fill={col} />
                <text x={cx + 14} y={cy} fontFamily={MONO} fontSize={12} fill={VIZ_DIM}>{name}</text>
              </g>
            );
          })}
          {/* node key */}
          <text x={376} y={24} fontFamily={MONO} fontSize={12} fontWeight={700} fill={VIZ_INK}>THE TEN NODES</text>
          {FUNDAMENTAL_NODES.map((n, i) => {
            const col = i < 5 ? 0 : 1, row = i % 5;
            const px = 382 + col * 300, py = 44 + row * 14;
            return (
              <text key={n.count} x={px} y={py} fontFamily={MONO} fontSize={11} fill={VIZ_DIM}>
                <tspan fill={ELEMENT_COLORS.Aether}>{n.count}</tspan> {n.name}
              </text>
            );
          })}
          {/* drawing meta */}
          <text x={996} y={24} fontFamily={MONO} fontSize={12} fontWeight={700} fill={VIZ_INK}>NIRMANAKAYA</text>
          <text x={996} y={46} fontFamily={MONO} fontSize={11} fill={VIZ_DIM}>The Axis of Becoming</text>
          <text x={996} y={66} fontFamily={MONO} fontSize={11} fill={VIZ_DIM}>graphics-as-code · v0.2</text>
          <text x={996} y={86} fontFamily={MONO} fontSize={11} fill={VIZ_DIM}>22 archetypes · 10 nodes</text>
        </g>
      </svg>
    </div>
  );
}
