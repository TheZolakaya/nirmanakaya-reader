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
import TheMap from '../../components/map/TheMap.js';
import { generateSpread } from '../../lib/utils.js';

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
      el.style.willChange = ''; el.style.transition = '';
    });
  };

  // THE LANDING — the seek slows, the camera travels to the card that was chosen, and the card
  // comes up to the middle of the screen. The draw happens FIRST and the animation reveals it;
  // the wait it covers is the interpretation being written, which is real work on a real clock.
  const land = useCallback(async () => {
    if (landing) return;
    setScanning(false);
    setLanding(true);
    clearCards();

    const cards = Array.from(document.querySelectorAll('[data-position]'));
    if (!cards.length) { setLanding(false); return; }
    const target = cards[Math.floor(Math.random() * cards.length)];

    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const flash = (el, scale, ms) => {
      el.style.transition = `transform ${ms}ms cubic-bezier(.22,1,.36,1), filter ${ms}ms ease`;
      el.style.transformOrigin = 'center center';
      el.style.zIndex = '40';
      el.style.transform = `scale(${scale})`;
      el.style.filter = 'brightness(1.5)';
      window.setTimeout(() => { el.style.transform = 'scale(1)'; el.style.filter = 'brightness(1)'; }, ms * 0.45);
    };

    // 1. the flicker slows: the gaps stretch until it comes to rest
    const gaps = [70, 85, 105, 130, 165, 210, 270, 350, 450];
    for (const g of gaps) {
      flash(cards[Math.floor(Math.random() * cards.length)], 1.4, 380);
      await wait(g);
    }

    // 2. the camera travels, so you can see where it is going before it arrives
    cameraRef.current?.centreOn(target, 0.95, 1600);
    await wait(1750);

    // 3. and the card comes up to the middle of the screen
    target.style.transition = 'transform 650ms cubic-bezier(.16,1,.3,1), filter 650ms ease';
    target.style.transformOrigin = 'center center';
    target.style.zIndex = '60';
    target.style.transform = 'scale(2.6)';
    target.style.filter = 'brightness(1.15) drop-shadow(0 18px 40px rgba(0,0,0,0.75))';
    setLanding(false);
  }, [landing]);

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
