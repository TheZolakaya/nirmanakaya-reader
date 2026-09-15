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
import { runLanding, clearLanding } from '../../components/map/landing.js';
import { generateSpread } from '../../lib/utils.js';

export default function AnimationBench() {
  const [drawMap, setDrawMap] = useState({});
  const [colorLayer, setColorLayer] = useState('status');
  const [zoom, setZoom] = useState(0.45);
  const [labels, setLabels] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pace, setPace] = useState(160);     // ms between pulses — 70 read as nervous
  const [lift, setLift] = useState(1.45);    // how big a pulse gets
  const timerRef = useRef(null);
  const cameraRef = useRef(null);
  const [landing, setLanding] = useState(false);
  const [landedLabel, setLandedLabel] = useState(null);

  // THE WORDMARK, at the centre of the map. The founder: "directly beneath the Gestalt house,
  // and between the four manifest houses ... right in the middle of those four." It is the same
  // rainbow letters and shimmering tagline as the top of the EZ page, placed inside the camera's
  // transform so it pans and zooms with the map as text, crisp at any zoom. Its position is
  // measured from the four manifest houses themselves, not stored.
  useEffect(() => {
    let tries = 0;
    const place = () => {
      const canvas = document.querySelector('[data-map-surface]')?.firstElementChild;
      const groups = [...document.querySelectorAll('.archetype-group')];
      if (!canvas || groups.length < 5) { if (tries++ < 40) window.setTimeout(place, 150); return; }
      const z = new DOMMatrix(getComputedStyle(canvas).transform).a || 1;
      const cb = canvas.getBoundingClientRect();
      const centre = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - cb.left) / z, y: (r.top + r.height / 2 - cb.top) / z, w: r.width / z }; };
      const cs = groups.map(centre);
      // the Gestalt is the one nearest the top; the other four are the manifest houses
      const manifest = [...cs].sort((a, b) => a.y - b.y).slice(1);
      const mx = manifest.reduce((a, c) => a + c.x, 0) / 4, my = manifest.reduce((a, c) => a + c.y, 0) / 4;
      const span = Math.max(...manifest.map(c => c.x)) - Math.min(...manifest.map(c => c.x));
      const fs = Math.max(18, span * 0.054);   // sized to the gap between the inner agents, with air
      let el = canvas.querySelector('[data-map-wordmark]');
      if (!el) { el = document.createElement('div'); el.setAttribute('data-map-wordmark', ''); canvas.appendChild(el); }
      el.innerHTML =
        `<div style="text-align:center;white-space:nowrap;line-height:1.1">` +
        `<div class="font-extralight" style="font-size:${fs}px;letter-spacing:0.32em;padding-left:0.32em">` +
        'NIRMANAKAYA'.split('').map((c, i) => `<span class="rainbow-letter rainbow-letter-${i}">${c}</span>`).join('') +
        `</div><div class="font-mono uppercase" style="font-size:${(fs * 0.42).toFixed(1)}px;letter-spacing:0.22em;padding-left:0.22em;color:rgba(161,161,170,0.62);margin-top:${(fs * 0.25).toFixed(1)}px">` +
        'The Soul Search Engine'.split('').map((c, i) => `<span class="shimmer-letter" style="animation-delay:${-(i * 0.1 + 0.1)}s">${c === ' ' ? '&nbsp;' : c}</span>`).join('') +
        `</div></div>`;
      Object.assign(el.style, { position: 'absolute', left: `${mx}px`, top: `${my}px`, transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: '1' });
    };
    place();
  }, []);

  const clearCards = () => {
    clearLanding(document);
    setLandedLabel(null);
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
    const surface = document.querySelector('[data-map-surface]');
    // THE PAIR. In the founder's words: "one is a random durable, and one is a random
    // transient. The transient goes to the durable's location." So Land ALWAYS has a real pair.
    // With a deal on the table the seat is taken from it. With nothing dealt, Land draws its own
    // — the same call the reading uses — and puts it on the map before anything is measured.
    //
    // Before this, an undealt Land picked from all 78 cards, and a bound or an agent is not a
    // seat: its minimap point came back empty and the card quietly landed on the map's centre,
    // on the Gestalt axis just below the house's divider, with no status and no seat named.
    // A fresh pair EVERY time unless the founder dealt the full 22 himself. Land's own single
    // draw is put on the map so the transient shows in its seat, which meant the next Land found
    // that same pair sitting there and reused it — "it just does the same one over and over
    // again". Anything short of a full deal is treated as Land's own and redrawn.
    let draws = drawMap;
    if (Object.keys(draws).length < 22) {
      const d = generateSpread(1)[0];
      // bench switch: ?self=1 forces the self-homed draw (an archetype into its own seat), a
      // one-in-78 event that would otherwise take an evening of pressing Land to see
      const forceSelf = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('self') === '1';
      draws = { [d.position]: { transient: forceSelf ? d.position : d.transient, status: d.status } };
      // The pair is NOT put on the map. An undealt seat shows its own face, which is what the
      // durable IS before anything is placed on it, and the home seat of the transient already
      // shows the transient. Both are exactly what the landing needs to find.
    }
    // The sequence itself is shared with EZ mode: components/map/landing.js.
    await runLanding({ surface, cameraRef, draws, table: drawMap, pace, lift });
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
    // Hover scales a card too and fights every transform written here — off while seeking.
    const surface = document.querySelector('[data-map-surface]');
    if (surface) surface.classList.add('nkya-animating');

    cards.forEach((el) => {
      el.style.transition = 'transform 900ms cubic-bezier(.22,1,.36,1), filter 420ms ease';
      el.style.transformOrigin = 'center center';
      el.style.willChange = 'transform';
    });

    const pulse = () => {
      // one or two at a time, so the sweep overlaps itself instead of marching
      const n = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const el = cards[Math.floor(Math.random() * cards.length)];
        el.style.zIndex = '40';
        el.dataset.turn = [90, 180, 270, 360][Math.floor(Math.random() * 4)];
        el.style.transform = `scale(${lift}) rotate(${el.dataset.turn}deg)`;
        el.style.filter = 'brightness(1.5)';
        window.setTimeout(() => {
          el.style.transform = `scale(1) rotate(${el.dataset.turn || 0}deg)`;
          el.style.filter = 'brightness(1)';
          window.setTimeout(() => { el.style.zIndex = ''; }, 420);
        }, 140);
      }
    };

    pulse();
    timerRef.current = window.setInterval(pulse, pace);

    return () => {
      window.clearInterval(timerRef.current);
      if (surface) surface.classList.remove('nkya-animating');
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
        {/* A silent mock of the EZ header, laid out but invisible, so the last act has real
            boxes to fly into. When this moves into EZ these become the page's own elements. */}
        <div data-header-mock="" className="pointer-events-none absolute inset-x-0 top-0 z-[150]" style={{ visibility: 'hidden' }}>
          <div className="flex flex-col items-center pt-3">
            <div data-slot="wordmark" style={{ width: 420, height: 64 }} />
            <div className="flex items-start gap-8 mt-5">
              <div data-slot="stack" style={{ width: 300, height: 220 }} />
              <div data-slot="minimap" style={{ width: 220, height: 220 }} />
            </div>
          </div>
        </div>
        {/* The name, once the card has landed at full resolution. */}
        {landedLabel && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-1 px-4 pt-16 pb-8 text-center animate-fadeIn"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              background: 'linear-gradient(to top, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.75) 45%, rgba(10,10,15,0) 100%)'
            }}>
            {landedLabel.prefix && (
              // LOUD. The founder: "it's very thin and hard to read ... that moment after the
              // spinning stops [should] say too much ... really obvious." So it is set in the
              // status's own colour, heavy, and large enough to be the first thing read.
              <span className="text-lg sm:text-[27px] font-bold uppercase tracking-[0.28em]"
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: landedLabel.color || '#e4e4e7',
                         textShadow: `0 0 18px ${landedLabel.color || '#fff'}88, 0 2px 10px rgba(0,0,0,0.9)` }}>
                {landedLabel.prefix}
              </span>
            )}
            <span className="text-3xl sm:text-4xl tracking-[0.12em] text-amber-200/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {landedLabel.name}
            </span>
            {landedLabel.seat && landedLabel.seat !== landedLabel.name && (
              <span className="text-sm tracking-[0.2em] text-zinc-400/80">in {landedLabel.seat}</span>
            )}
          </div>
        )}
        <TheMap
          key={zoom}
          drawMap={drawMap}
          colorLayer={colorLayer}
          initialZoom={zoom}
          showLabels={labels}
          showHouseLabels={labels}
          cameraRef={cameraRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
