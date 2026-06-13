'use client';
// components/viz/SelflessLove.js
// "Two whole things touching, not two halves becoming one."
// First native viz-layer narrative piece. Ported from viz-prototypes/selfless-love.html v0.1.
// Palette-light: consciousnesses = Water (blue), love-bridge/arrows = Fire (red).
// Pure SVG + React state + CSS transitions. No external animation dep required.

import { useState, useEffect, useCallback, useRef } from 'react';
import { ELEMENT_COLORS, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette';

const SOUL = ELEMENT_COLORS.Water;   // the two consciousnesses
const LOVE = ELEMENT_COLORS.Fire;    // the bridge + arrows

// two wholes, clearly separate (r=115 → ~46px clear gap), vs codependent overlap
const R = 115;
const WHOLE = { lx: 272, rx: 548 };
const MERGE = { lx: 352, rx: 468 };

const STAGES = [
  {
    h: 'Two whole beings.',
    p: 'Before anything else — each one complete on its own.',
    pos: WHOLE, bridge: false, arrow: null,
  },
  {
    h: "This is the love we're taught.",
    p: 'Two halves overlapping, each completing the other — and losing themselves in the overlap.',
    pos: MERGE, bridge: false, arrow: null,
  },
  {
    h: 'But real love is different.',
    p: 'Two whole things touching — not two halves becoming one. Nothing is given up to connect.',
    pos: WHOLE, bridge: true, arrow: null,
  },
  {
    h: 'Sometimes it only flows one way.',
    p: "And that still counts. The reaching is real even when it isn't returned.",
    pos: WHOLE, bridge: false, arrow: 'right',
  },
  {
    h: 'And sometimes — both directions at once.',
    p: 'Two sovereign beings, each giving freely. This is where the fireworks live.',
    pos: WHOLE, bridge: false, arrow: 'both',
  },
  {
    h: 'Love is two whole things touching,',
    sig: 'not two halves becoming one.',
    payoff: true,
    pos: WHOLE, bridge: true, arrow: null,
  },
];

const ARROW_RIGHT = '382,212 418,212 418,201 442,220 418,239 418,228 382,228';
const ARROW_LEFT  = '438,212 402,212 402,201 378,220 402,239 402,228 438,228';

export default function SelflessLove({ autoplay = true, interval = 4200 }) {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const timer = useRef(null);

  const go = useCallback((n) => {
    setVisible(false);
    setTimeout(() => {
      setI(((n % STAGES.length) + STAGES.length) % STAGES.length);
      setVisible(true);
    }, 420);
  }, []);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  // autoplay
  useEffect(() => {
    if (!autoplay) return;
    timer.current = setInterval(() => setI((p) => {
      setVisible(false);
      setTimeout(() => setVisible(true), 420);
      return (p + 1) % STAGES.length;
    }), interval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [autoplay, interval]);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { stop(); go(i + 1); }
      if (e.key === 'ArrowLeft')  { stop(); go(i - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, stop]);

  const s = STAGES[i];
  const fade = { transition: 'opacity .8s ease, transform .9s cubic-bezier(.22,.61,.36,1)' };

  return (
    <div
      onClick={(e) => {
        if (e.target.dataset?.dot) return;
        stop(); go(i + 1);
      }}
      style={{
        minHeight: '100vh', width: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(1200px 800px at 50% 30%, #131722 0%, #0b0d12 70%)',
        color: VIZ_INK, cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif',
      }}
    >
      <div style={{
        position: 'fixed', top: 22, color: '#566', fontSize: 12,
        letterSpacing: '.18em', textTransform: 'uppercase',
      }}>The Selfless Love · tap or → to advance</div>

      <div style={{ position: 'relative', width: 'min(92vw,820px)', height: 'min(60vh,440px)' }}>
        <svg viewBox="0 0 820 440" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
          <circle cx={s.pos.lx} cy="220" r={R} fill={SOUL}
            style={{ ...fade, filter: 'drop-shadow(0 6px 24px rgba(63,111,209,.35))' }} />
          <circle cx={s.pos.rx} cy="220" r={R} fill={SOUL}
            style={{ ...fade, filter: 'drop-shadow(0 6px 24px rgba(63,111,209,.35))' }} />
          {s.bridge && (
            <rect x="386" y="205" width="48" height="30" rx="6" fill={LOVE}
              style={{ filter: 'drop-shadow(0 0 16px rgba(255,59,48,.6))', animation: 'nkyaPulse 2.4s ease-in-out infinite' }} />
          )}
          {s.arrow && (
            <g style={fade}>
              {(s.arrow === 'left' || s.arrow === 'both') && <polygon points={ARROW_LEFT} fill={LOVE} />}
              {(s.arrow === 'right' || s.arrow === 'both') && <polygon points={ARROW_RIGHT} fill={LOVE} />}
            </g>
          )}
        </svg>
      </div>

      <div style={{
        marginTop: 38, minHeight: 96, textAlign: 'center', maxWidth: 680, padding: '0 24px',
        opacity: visible ? 1 : 0, transition: 'opacity .7s ease',
      }}>
        {s.payoff ? (
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
            {s.h}<br /><span style={{ color: LOVE, fontWeight: 700 }}>{s.sig}</span>
          </h2>
        ) : (
          <>
            <h2 style={{ fontSize: 'clamp(20px,3.2vw,30px)', fontWeight: 600, lineHeight: 1.25, margin: 0 }}>{s.h}</h2>
            <p style={{ marginTop: 10, color: VIZ_DIM, fontSize: 'clamp(14px,2vw,17px)' }}>{s.p}</p>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 26, display: 'flex', gap: 18 }}>
        {STAGES.map((_, k) => (
          <div key={k} data-dot="1"
            onClick={(e) => { e.stopPropagation(); stop(); go(k); }}
            style={{
              width: 9, height: 9, borderRadius: '50%',
              background: k === i ? VIZ_INK : '#2a3040',
              transform: k === i ? 'scale(1.25)' : 'none', transition: '.3s',
            }} />
        ))}
      </div>

      <style>{`@keyframes nkyaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>
    </div>
  );
}
