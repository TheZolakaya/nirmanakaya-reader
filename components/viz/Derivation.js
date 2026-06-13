'use client';
// components/viz/Derivation.js
// THE DERIVATION — the RPA opening, animated.
// From consciousness between all-potential (Source) and all-that-is (Creation):
//   I AM → What am I? → the first node → the second node → four from one →
//   the four-stage cycle → the Tetractys (ten) → the five houses → into the living map.
//
// framer-motion 2D guided sequence. Source: RPA_Compiled_FINAL (Sections I.A–II.D).

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ELEMENT_COLORS, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette.js';

const SRC = ELEMENT_COLORS.Aether;   // all-potential
const CRE = ELEMENT_COLORS.Earth;    // all-that-is
const MIND = '#eaf2ff';              // consciousness / I AM
const NODE = ELEMENT_COLORS.Aether;

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const VB_W = 900, VB_H = 760, CX = 450, CY = 372;

// diamond points (the four-stage cycle)
const R = 116;
const SEED = [CX, CY - R], FEEDBACK = [CX, CY + R], MEDIUM = [CX - R, CY], FRUITION = [CX + R, CY];

// deterministic soft field (no Math.random)
function field(seed, n, cx, cy, rx, ry) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2.39996 + seed) % (Math.PI * 2);
    const r = ((i * 97 + seed * 13) % 100) / 100;
    p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return p;
}
const SRC_FIELD = field(1, 42, CX, 92, 330, 50);
const CRE_FIELD = field(7, 42, CX, 668, 330, 50);

// tetractys (1+2+3+4 = 10)
function tetractys(apexY, dy, dx) {
  const pts = []; let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) { pts.push([CX + (i - r / 2) * dx, apexY + r * dy, ++n]); }
  return pts;
}
const TET = tetractys(232, 66, 64);

// five houses (quincunx of small diamonds)
const HOUSES = [
  { c: [CX, CY - 150], col: SRC, label: 'Soul' },
  { c: [CX - 175, CY - 20], col: ELEMENT_COLORS.Air, label: 'Mind' },
  { c: [CX + 175, CY - 20], col: ELEMENT_COLORS.Water, label: 'Emotion' },
  { c: [CX - 120, CY + 165], col: ELEMENT_COLORS.Earth, label: 'Body' },
  { c: [CX + 120, CY + 165], col: ELEMENT_COLORS.Fire, label: 'Spirit' },
];

const BEATS = [
  { h: 'I AM.', p: 'Before form, there is awareness — aware only that it exists. The first collapse of infinity into presence.' },
  { h: 'What am I?', p: 'Awareness turns inward and asks. The first distinction — observer and observed. The first loop.' },
  { h: 'The first node.', p: 'One polarity: origin and return. Seed and Feedback. Continuity — but not yet change.' },
  { h: 'The second node — four from one.', p: 'A second polarity. Now four positions are structurally required: Seed · Medium · Fruition · Feedback.' },
  { h: 'The four-stage cycle.', p: 'Process is born. This four will hold through everything that follows — it is the fifth thread that weaves the rest.' },
  { h: 'One, two, three, four — ten.', p: 'The Tetractys. 1 + 2 + 3 + 4 = the ten fundamental nodes. Five processors, two polarities each.' },
  { h: 'Five houses.', p: 'Soul, Spirit, Mind, Emotion, Body — five recursive engines. And the map is born.' },
];

const inRange = (s, a, b) => (s >= a && s <= b ? 1 : 0);

export default function Derivation({ autoplay = true, interval = 5200 }) {
  const [i, setI] = useState(0);
  const [vis, setVis] = useState(true);
  const timer = useRef(null);

  const swap = useCallback((n) => {
    setVis(false);
    setTimeout(() => { setI(((n % BEATS.length) + BEATS.length) % BEATS.length); setVis(true); }, 360);
  }, []);
  const stop = useCallback(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, []);

  useEffect(() => {
    if (!autoplay) return;
    timer.current = setInterval(() => { setVis(false); setTimeout(() => setVis(true), 360); setI((p) => (p + 1) % BEATS.length); }, interval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [autoplay, interval]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'ArrowRight') { stop(); swap(i + 1); } if (e.key === 'ArrowLeft') { stop(); swap(i - 1); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [i, swap, stop]);

  const b = BEATS[i];
  const dot = (x, y, r, fill, op = 1) => (
    <motion.circle cx={x} cy={y} r={r} fill={fill} animate={{ opacity: op }} transition={{ duration: 0.7 }} />
  );

  // group opacities
  const gAware = inRange(i, 0, 1);     // I AM + What am I
  const gNode = inRange(i, 2, 4);      // node / diamond
  const gTet = inRange(i, 5, 5);       // tetractys
  const gHouse = inRange(i, 6, 6);     // five houses
  const showSecond = i >= 3 ? 1 : 0;   // second node / full diamond
  const labelFour = i >= 3 ? 1 : 0;

  return (
    <div onClick={(e) => { if (e.target.dataset?.dot || e.target.dataset?.link) return; stop(); swap(i + 1); }}
      style={{ minHeight: '100vh', width: '100%', cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
        background: 'radial-gradient(1100px 760px at 50% 42%, #11131c 0%, #06070b 72%)', color: VIZ_INK,
        fontFamily: MONO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', top: 22, color: '#566', fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>
        The Derivation · tap or → to advance
      </div>

      <div style={{ width: 'min(94vw,900px)' }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {/* Source field (all-potential) */}
          <g>
            {SRC_FIELD.map((p, k) => <circle key={`s${k}`} cx={p[0]} cy={p[1]} r={2.3} fill={SRC} opacity={0.5} />)}
            <circle cx={CX} cy={92} r={26} fill="none" stroke={SRC} strokeWidth={1.4} opacity={0.6} />
            <text x={CX} y={50} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={700} fill={SRC} opacity={0.85}>SOURCE</text>
            <text x={CX} y={66} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={VIZ_DIM}>all that could be</text>
          </g>
          {/* Creation field (all-that-is) */}
          <g>
            {CRE_FIELD.map((p, k) => <circle key={`c${k}`} cx={p[0]} cy={p[1]} r={2.3} fill={CRE} opacity={0.45} />)}
            <circle cx={CX} cy={668} r={26} fill="none" stroke={CRE} strokeWidth={1.4} opacity={0.6} />
            <text x={CX} y={712} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={700} fill={CRE} opacity={0.85}>CREATION</text>
            <text x={CX} y={728} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={VIZ_DIM}>all that is</text>
          </g>

          {/* GROUP: awareness — I AM, then the split (What am I?) */}
          <motion.g animate={{ opacity: gAware }} transition={{ duration: 0.5 }}>
            <line x1={CX} y1={i >= 1 ? CY - 70 : CY} x2={CX} y2={i >= 1 ? CY + 70 : CY} stroke={MIND} strokeWidth={1} opacity={i >= 1 ? 0.5 : 0} />
            {dot(CX, i >= 1 ? CY - 70 : CY, 11, MIND)}
            {dot(CX, CY + 70, 11, MIND, i >= 1 ? 1 : 0)}
            {i < 1 && <text x={CX + 28} y={CY - 16} fontFamily={MONO} fontSize={13} fill={MIND}>consciousness</text>}
          </motion.g>

          {/* GROUP: the node / diamond */}
          <motion.g animate={{ opacity: gNode }} transition={{ duration: 0.5 }}>
            {/* node A — vertical (Seed / Feedback) */}
            <line x1={SEED[0]} y1={SEED[1]} x2={FEEDBACK[0]} y2={FEEDBACK[1]} stroke={NODE} strokeWidth={1.3} opacity={0.55} />
            {/* node B — horizontal (Medium / Fruition) appears at beat 3 */}
            <motion.line x1={MEDIUM[0]} y1={MEDIUM[1]} x2={FRUITION[0]} y2={FRUITION[1]} stroke={NODE} strokeWidth={1.3} animate={{ opacity: showSecond ? 0.55 : 0 }} transition={{ duration: 0.6 }} />
            {/* diamond edges (beat 4) */}
            <motion.polygon points={`${SEED[0]},${SEED[1]} ${FRUITION[0]},${FRUITION[1]} ${FEEDBACK[0]},${FEEDBACK[1]} ${MEDIUM[0]},${MEDIUM[1]}`}
              fill="none" stroke={NODE} strokeWidth={1.2} animate={{ opacity: i >= 4 ? 0.4 : 0 }} transition={{ duration: 0.7 }} />
            {/* four points */}
            {dot(SEED[0], SEED[1], 10, MIND)}
            {dot(FEEDBACK[0], FEEDBACK[1], 10, MIND)}
            {dot(MEDIUM[0], MEDIUM[1], 10, MIND, showSecond)}
            {dot(FRUITION[0], FRUITION[1], 10, MIND, showSecond)}
            {/* stage labels (beat 3+) */}
            <motion.g animate={{ opacity: labelFour }} transition={{ duration: 0.6 }} fontFamily={MONO} fontSize={12} fill={VIZ_DIM}>
              <text x={SEED[0]} y={SEED[1] - 18} textAnchor="middle">Seed</text>
              <text x={FEEDBACK[0]} y={FEEDBACK[1] + 28} textAnchor="middle">Feedback</text>
              <text x={MEDIUM[0] - 16} y={MEDIUM[1] + 4} textAnchor="end">Medium</text>
              <text x={FRUITION[0] + 16} y={FRUITION[1] + 4} textAnchor="start">Fruition</text>
            </motion.g>
          </motion.g>

          {/* GROUP: tetractys */}
          <motion.g animate={{ opacity: gTet }} transition={{ duration: 0.5 }}>
            {TET.map(([x, y, n]) => (
              <g key={`t${n}`}>
                <circle cx={x} cy={y} r={14} fill="#0e1422" stroke={NODE} strokeWidth={1.4} />
                <text x={x} y={y + 5} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={700} fill={MIND}>{n}</text>
              </g>
            ))}
          </motion.g>

          {/* GROUP: five houses */}
          <motion.g animate={{ opacity: gHouse }} transition={{ duration: 0.5 }}>
            {HOUSES.map((h, k) => {
              const [hx, hy] = h.c, s = 46;
              return (
                <g key={`h${k}`}>
                  <polygon points={`${hx},${hy - s} ${hx + s},${hy} ${hx},${hy + s} ${hx - s},${hy}`} fill="none" stroke={h.col} strokeWidth={1.6} opacity={0.85} />
                  {[[0, -s * 0.5], [s * 0.5, 0], [0, s * 0.5], [-s * 0.5, 0]].map(([dx, dy], j) => (
                    <circle key={j} cx={hx + dx} cy={hy + dy} r={5.5} fill={h.col} />
                  ))}
                  <text x={hx} y={hy + 3} textAnchor="middle" fontFamily={MONO} fontSize={10} fontWeight={700} fill={h.col}>{h.label}</text>
                </g>
              );
            })}
          </motion.g>
        </svg>
      </div>

      {/* caption */}
      <div style={{ marginTop: 22, minHeight: 88, textAlign: 'center', maxWidth: 640, padding: '0 24px', opacity: vis ? 1 : 0, transition: 'opacity .6s ease' }}>
        <h2 style={{ fontSize: 'clamp(22px,3.4vw,32px)', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{b.h}</h2>
        <p style={{ marginTop: 10, color: VIZ_DIM, fontSize: 'clamp(13px,2vw,16px)' }}>{b.p}</p>
        {i === BEATS.length - 1 && (
          <a href="/seal" data-link="1" onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-block', marginTop: 16, fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '.06em',
              color: VIZ_INK, background: 'rgba(91,33,182,.5)', border: '1px solid #7c4dff', borderRadius: 8, padding: '10px 18px', textDecoration: 'none' }}>
            ENTER THE LIVING MAP →
          </a>
        )}
      </div>

      {/* dots */}
      <div style={{ position: 'fixed', bottom: 24, display: 'flex', gap: 14 }}>
        {BEATS.map((_, k) => (
          <div key={k} data-dot="1" onClick={(e) => { e.stopPropagation(); stop(); swap(k); }}
            style={{ width: 9, height: 9, borderRadius: '50%', background: k === i ? VIZ_INK : '#2a3040', transform: k === i ? 'scale(1.25)' : 'none', transition: '.3s' }} />
        ))}
      </div>
    </div>
  );
}
