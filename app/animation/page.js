'use client';

// /animation — the animation workbench.
//
// Step one only: prove the shared <TheMap /> renders EXACTLY like /22-reader, so that every
// animation after this is built on the real map instead of a redrawing of it. Nothing here
// touches EZ mode or the reading page.
//
// Controls are deliberately crude. This is a bench, not a product.

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import TheMap, { STATUS_GLOW } from '../../components/map/TheMap.js';
import { generateSpread } from '../../lib/utils.js';
import { getCardImagePath } from '../../lib/cardImages.js';

export default function AnimationBench() {
  const [drawMap, setDrawMap] = useState({});
  const [colorLayer, setColorLayer] = useState('status');
  const [zoom, setZoom] = useState(0.45);
  const [labels, setLabels] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [pace, setPace] = useState(70);      // ms between pulses
  const [lift, setLift] = useState(1.45);    // how big a pulse gets
  const timerRef = useRef(null);
  const cameraRef = useRef(null);
  const [landing, setLanding] = useState(false);

  const clearCards = () => {
    document.querySelectorAll('[data-position]').forEach((el) => {
      el.style.transform = ''; el.style.filter = ''; el.style.zIndex = '';
      el.style.willChange = ''; el.style.transition = ''; el.style.opacity = '';
    });
    document.querySelectorAll('[data-house-label]').forEach((el) => {
      el.style.transition = ''; el.style.opacity = '';
    });
  };

  // THE LANDING — the field keeps turning right up until the card is centred.
  //
  // The flicker is its own engine (a self-rescheduling timeout with a mutable gap) rather than a
  // sequence of blocking waits, so it can keep running THROUGH the camera flight instead of
  // stopping dead the moment the camera starts to move.
  const land = useCallback(async () => {
    if (landing) return;
    setScanning(false);
    setLanding(true);
    clearCards();

    const cards = Array.from(document.querySelectorAll('[data-position]'));
    if (!cards.length) { setLanding(false); return; }
    const target = cards[Math.floor(Math.random() * cards.length)];
    const targetId = Number(target.dataset.position);
    const others = cards.filter(el => el !== target);

    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const flash = (el, scale, ms) => {
      el.style.transition = `transform ${ms}ms cubic-bezier(.22,1,.36,1), filter ${ms}ms ease`;
      el.style.transformOrigin = 'center center';
      el.style.zIndex = '40';
      el.style.transform = `scale(${scale})`;
      el.style.filter = 'brightness(1.5)';
      window.setTimeout(() => { el.style.transform = 'scale(1)'; el.style.filter = 'brightness(1)'; }, ms * 0.45);
    };

    // --- the flicker engine: runs until told to stop, at whatever gap is current ---
    const state = { gap: pace, alive: true, pool: cards, scale: lift };
    const tick = () => {
      if (!state.alive) return;
      const pick = () => state.pool[Math.floor(Math.random() * state.pool.length)];
      flash(pick(), state.scale, 400);
      if (Math.random() < 0.35) flash(pick(), state.scale, 400);
      window.setTimeout(tick, state.gap);
    };
    tick();

    // 1. the field turns, at full pace. No slowing yet — the slowing belongs to the approach.
    await wait(5000);

    // The chosen card leaves the flicker so it sits steady while the camera comes for it, and
    // its FULL-RESOLUTION art starts loading now. Bounds and agents are drawn from 200px
    // thumbnails on the map, which is right at map size and visibly soft at hero size, so the
    // real 2134px image is swapped in the moment it has loaded — during the flight, well before
    // the card is large enough for anyone to catch the change.
    state.pool = others;
    const displayId = drawMap[targetId] ? drawMap[targetId].transient : targetId;
    const fullArt = getCardImagePath(displayId);
    const img = target.querySelector('img');
    if (img && fullArt && !img.src.endsWith(fullArt)) {
      const pre = new window.Image();
      pre.onload = () => { img.src = fullArt; };
      pre.src = fullArt;
    }

    // 2..5 — ONE MOVEMENT.
    //
    // These used to be four separate steps with waits between them, and the seams showed: the
    // camera stopped, then the card rose, then it rotated, then the camera pushed again. Now the
    // camera makes a single flight all the way to its final zoom, and the card's rise, its turn
    // upright and the field's fade are started PART WAY THROUGH that flight on overlapping
    // curves, so everything arrives together and nothing has to stop and restart.
    const Z_END = 2.0;
    const FLIGHT = 4200;

    // The final scale is solved up front. offsetWidth is the LAYOUT width and ignores transforms;
    // getBoundingClientRect would return the axis-aligned box, inflated by root two for a
    // 45-degree card, which throws the size out differently for every class.
    const layoutW = target.offsetWidth;
    const targetPx = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.62, 700);
    const heroScale = targetPx / (layoutW * Z_END);

    // The seat tilt is measured before anything moves. A card is tilted by its house (the
    // 45-degree diamonds) and, for bounds and agents, by its own seat — but a drawn STATUS also
    // rotates it and that rotation carries meaning, so it is measured out and kept.
    const inner = target.firstElementChild;
    const screenAngle = (el) => {
      let deg = 0, node = el;
      while (node && node !== document.body) {
        const tr = getComputedStyle(node).transform;
        if (tr && tr !== 'none') { const m = new DOMMatrix(tr); deg += Math.atan2(m.b, m.a) * 180 / Math.PI; }
        node = node.parentElement;
      }
      return deg;
    };
    const statusRot = drawMap[targetId] ? (STATUS_GLOW[drawMap[targetId].status]?.rotation || 0) : 0;
    const seatTilt = screenAngle(inner) - statusRot;

    // the camera departs — one flight, all the way in
    cameraRef.current?.centreOn(target, Z_END, FLIGHT);

    // the card begins to rise and turn once the camera is well on its way, and settles with it
    const RISE_AT = Math.round(FLIGHT * 0.42);
    window.setTimeout(() => {
      target.style.transition =
        `transform ${FLIGHT - RISE_AT}ms cubic-bezier(.33,.9,.2,1), filter ${FLIGHT - RISE_AT}ms ease`;
      target.style.transformOrigin = 'center center';
      target.style.zIndex = '60';
      target.style.transform = `scale(${heroScale}) rotate(${-seatTilt}deg)`;
      target.style.filter = 'brightness(1.12) drop-shadow(0 20px 48px rgba(0,0,0,0.8))';
    }, RISE_AT);

    // the field eases away underneath it, finishing a beat before the card settles
    const FADE_AT = Math.round(FLIGHT * 0.52);
    window.setTimeout(() => {
      [...others, ...document.querySelectorAll('[data-house-label]')].forEach(el => {
        el.style.transition = 'opacity 1500ms ease';
        el.style.opacity = '0';
      });
    }, FADE_AT);

    // the flicker keeps its life almost to the end, slowing the whole way
    const tStart = Date.now();
    const STOP_AT = Math.round(FLIGHT * 0.74);
    while (Date.now() - tStart < STOP_AT) {
      const k = (Date.now() - tStart) / STOP_AT;
      state.gap = Math.round(pace + (640 - pace) * (k * k));
      state.scale = lift - (lift - 1.15) * k;
      await wait(70);
    }
    state.alive = false;
    others.forEach(el => { el.style.transform = 'scale(1)'; el.style.zIndex = ''; });

    await wait(FLIGHT - STOP_AT + 250);

    setLanding(false);
  }, [landing, pace, lift, drawMap]);

  const resetView = useCallback(() => {
    clearCards();
    cameraRef.current?.reset(700);
  }, []);

  // THE SEEK — the field turning over its own cards while the reading is written.
  //
  // Driven by direct transform writes rather than React state: a pulse every ~70ms over twelve
  // seconds is ~170 ticks, and re-rendering 78 components that many times would be wasteful for
  // no gain. Transform and opacity are the only properties touched, so the browser composites
  // them on the GPU and never re-lays-out the page. The decay is a CSS transition, so each card
  // falls back on its own with no bookkeeping.
  useEffect(() => {
    if (!scanning) return;
    const cards = Array.from(document.querySelectorAll('[data-position]'));
    if (!cards.length) return;

    cards.forEach((el) => {
      el.style.transition = 'transform 420ms cubic-bezier(.22,1,.36,1), filter 420ms ease';
      el.style.transformOrigin = 'center center';
      el.style.willChange = 'transform';
    });

    const pulse = () => {
      // one or two at a time, so the sweep overlaps itself instead of marching
      const n = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const el = cards[Math.floor(Math.random() * cards.length)];
        el.style.zIndex = '40';
        el.style.transform = `scale(${lift})`;
        el.style.filter = 'brightness(1.5)';
        window.setTimeout(() => {
          el.style.transform = 'scale(1)';
          el.style.filter = 'brightness(1)';
          window.setTimeout(() => { el.style.zIndex = ''; }, 420);
        }, 140);
      }
    };

    pulse();
    timerRef.current = window.setInterval(pulse, pace);

    return () => {
      window.clearInterval(timerRef.current);
      cards.forEach((el) => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.zIndex = '';
        el.style.willChange = '';
        el.style.transition = '';
      });
    };
  }, [scanning, pace, lift]);

  // A full 22-position draw, the same call the reading uses.
  const deal = useCallback(() => {
    const draws = generateSpread(22);
    const map = {};
    draws.forEach(d => { map[d.position] = { transient: d.transient, status: d.status }; });
    setDrawMap(map);
  }, []);

  const clear = useCallback(() => setDrawMap({}), []);

  const layers = ['status', 'practice', 'activity', 'being', 'identity', 'stage'];

  return (
    <div className="h-screen bg-[#0a0a0f] text-zinc-200 flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-800/60 text-xs">
        <span className="uppercase tracking-[0.2em] text-amber-400/80 mr-2">Animation bench</span>

        <button onClick={deal} className="px-3 py-1.5 rounded border border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/40">
          Deal 22
        </button>
        <button onClick={clear} className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200">
          Clear
        </button>

        <span className="ml-3 text-zinc-600">layer</span>
        {layers.map(l => (
          <button key={l} onClick={() => setColorLayer(l)}
            className={`px-2 py-1 rounded border ${colorLayer === l ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
            {l}
          </button>
        ))}

        <span className="ml-3 text-zinc-600">zoom</span>
        <input type="range" min="0.2" max="1" step="0.05" value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-28" />
        <span className="text-zinc-500 w-10 font-mono">{zoom.toFixed(2)}</span>

        <button onClick={land} disabled={landing}
          className="px-3 py-1.5 rounded border border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40">
          {landing ? 'Landing…' : 'Land'}
        </button>
        <button onClick={resetView}
          className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200">
          Reset view
        </button>

        <button onClick={() => setScanning(v => !v)}
          className={`px-3 py-1.5 rounded border ${scanning ? 'border-amber-500 bg-amber-950/40 text-amber-300' : 'border-violet-700/60 text-violet-300 hover:bg-violet-950/40'}`}>
          {scanning ? 'Stop' : 'Seek'}
        </button>
        <span className="text-zinc-600">pace</span>
        <input type="range" min="30" max="200" step="10" value={pace}
          onChange={(e) => setPace(parseInt(e.target.value, 10))} className="w-20" />
        <span className="text-zinc-500 w-10 font-mono">{pace}</span>
        <span className="text-zinc-600">lift</span>
        <input type="range" min="1.1" max="2" step="0.05" value={lift}
          onChange={(e) => setLift(parseFloat(e.target.value))} className="w-20" />
        <span className="text-zinc-500 w-10 font-mono">{lift.toFixed(2)}</span>

        <button onClick={() => setLabels(v => !v)}
          className={`px-2 py-1 rounded border ${labels ? 'border-zinc-500 text-zinc-300' : 'border-zinc-700 text-zinc-600'}`}>
          labels
        </button>

        <Link href="/22-reader" className="ml-auto text-zinc-500 hover:text-zinc-300">compare to /22-reader →</Link>
      </div>

      {/* THE SIZING TRAP, recorded because it has cost this project real time:
          MapCanvas sizes itself with `w-full h-full`. A percentage height resolves to ZERO
          unless its parent has a DEFINITE height — and `flex-1` does not give it one. That is
          why rebuilt maps come out blank or off-screen: all 78 cards render correctly, the
          canvas simply has no height, and MapCanvas's centring transform then throws the
          content above the viewport. /22-reader works because it uses h-screen.
          So: the wrapper below takes an explicit height. Never flex-1 around this component. */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <TheMap
          key={zoom}
          drawMap={drawMap}
          colorLayer={colorLayer}
          initialZoom={zoom}
          showLabels={labels}
          cameraRef={cameraRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
