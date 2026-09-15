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
import TheMap, { STATUS_GLOW, signatureFor } from '../../components/map/TheMap.js';
import { generateSpread } from '../../lib/utils.js';
import { getCardImagePath } from '../../lib/cardImages.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { STATUSES } from '../../lib/constants.js';

export default function AnimationBench() {
  const [drawMap, setDrawMap] = useState({});
  const [colorLayer, setColorLayer] = useState('status');
  const [zoom, setZoom] = useState(0.45);
  const [labels, setLabels] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [pace, setPace] = useState(160);     // ms between pulses — 70 read as nervous
  const [lift, setLift] = useState(1.45);    // how big a pulse gets
  const timerRef = useRef(null);
  const cameraRef = useRef(null);
  const [landing, setLanding] = useState(false);
  const [landedLabel, setLandedLabel] = useState(null);

  const clearCards = () => {
    document.querySelectorAll('[data-position]').forEach((el) => {
      el.style.transform = ''; el.style.filter = ''; el.style.zIndex = '';
      el.style.willChange = ''; el.style.transition = ''; el.style.opacity = '';
    });
    document.querySelectorAll('[data-house-label]').forEach((el) => {
      el.style.transition = ''; el.style.opacity = '';
    });
    document.querySelectorAll('.archetype-group').forEach((el) => { el.style.zIndex = ''; });
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

    // Hover scales the card too, and fights every transform we write. Off for the duration.
    const mapEl = document.querySelector('[data-map-surface]');
    if (mapEl) mapEl.style.pointerEvents = 'none';

    const cards = Array.from(document.querySelectorAll('[data-position]'));
    if (!cards.length) { setLanding(false); if (mapEl) mapEl.style.pointerEvents = ''; return; }
    // Land on a card that was actually DEALT when there is a deal on the table. The real
    // sequence always travels to a drawn card, and a drawn card is the only one that carries a
    // status — landing on an empty seat loses the status line and the seat line with it.
    const dealt = cards.filter(el => drawMap[Number(el.dataset.position)]);
    const pool = dealt.length ? dealt : cards;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const targetId = Number(target.dataset.position);
    const others = cards.filter(el => el !== target);

    // THE HERO'S REAL ART, restored — this was lost in the camera rewrite and is the softness.
    // Bounds and agents are drawn on the map from 200px thumbnails, which is right at map size
    // and a ten-times upscale at hero size. The full 2134px image is preloaded now, at the very
    // start, and swapped in the moment it has decoded — long before the card is large enough
    // for the change to be visible.
    const displayId = drawMap[targetId] ? drawMap[targetId].transient : targetId;
    const fullArt = getCardImagePath(displayId);
    const heroImg = target.querySelector('img');
    if (heroImg && fullArt && !heroImg.src.endsWith(fullArt)) {
      const pre = new window.Image();
      pre.onload = () => { heroImg.src = fullArt; };
      pre.src = fullArt;
    }

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
    // ONE card at a time. Two firing together read as frantic rather than searching, and a fixed
    // gap ticks like a metronome — so each gap is jittered around the pace instead.
    // Exactly ONE card up at a time. Firing on a timer alone is not enough: the hold is longer
    // than the gap, so a second card lifts before the first has come down and you see pairs.
    // Instead the outgoing card is released at the moment the next is lifted — it eases down
    // while the new one eases up, which reads as a handoff rather than two pops. The gap is
    // jittered so it breathes rather than ticking.
    const state = { gap: pace, alive: true, pool: cards, scale: lift, last: null };
    const release = (el) => {
      if (!el) return;
      el.style.transform = 'scale(1)';
      el.style.filter = 'brightness(1)';
      window.setTimeout(() => { if (el.style.zIndex === '40') el.style.zIndex = ''; }, 500);
    };
    const tick = () => {
      if (!state.alive) return;
      let el = state.pool[Math.floor(Math.random() * state.pool.length)];
      if (el === state.last && state.pool.length > 1) el = state.pool[Math.floor(Math.random() * state.pool.length)];
      release(state.last);
      state.last = el;
      el.style.transition = 'transform 520ms cubic-bezier(.22,1,.36,1), filter 520ms ease';
      el.style.transformOrigin = 'center center';
      el.style.zIndex = '40';
      el.style.transform = `scale(${state.scale})`;
      el.style.filter = 'brightness(1.45)';
      window.setTimeout(tick, Math.round(state.gap * (0.75 + Math.random() * 0.5)));
    };
    tick();

    // 1..3 — ONE CONTINUOUS CAMERA, integrated frame by frame.
    //
    // CSS transitions cannot do this. A transition always starts at rest, so redirecting one
    // mid-flight makes the camera stop and set off again — which is the right-angle jerk. Here
    // the camera is a critically-damped spring chasing a waypoint: velocity carries across every
    // change of target, so a new heading is entered as an ARC rather than a corner. The same
    // loop does the wandering, the gathering of gravity, and the final approach, so there is not
    // a single seam in the whole camera move.
    const surface = document.querySelector('[data-map-surface]');
    const cam = { x: 0, y: 0, vx: 0, vy: 0, z: 0.45, vz: 0 };
    const panToCentre = (el) => {
      const v = surface.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      return { x: cam.x + (v.left + v.width / 2 - (c.left + c.width / 2)),
               y: cam.y + (v.top + v.height / 2 - (c.top + c.height / 2)) };
    };

    const DRIFT_UNTIL = 7600;     // leaning across the field, going nowhere in particular
    const GRAVITY_UNTIL = 11400;  // the card starts to pull, the lean is still in charge
    const ARRIVE_AT = 17200;      // settled
    const Z_END = 2.0;

    // THE DRIFT IS A LEAN, NOT A SEARCH.
    //
    // Chasing waypoints was the wrong idea for the feel. The camera reached a waypoint, slowed,
    // stopped, and set off again, which reads as "is it over here? or is it over here?" — and
    // every one of those arrivals is a corner. A drift should read as "I am heading this way —
    // no, THIS way": the speed stays put and only the HEADING changes, along an arc.
    //
    // So during the drift nothing is aimed at at all. A heading turns at a rate which itself
    // eases toward a new random rate every couple of seconds, which makes long leans that
    // gradually reverse. Only near the end does the card's pull take over.
    // The lean also OPENS OUT. It begins as a small circling near the middle of the map — maybe
    // this way, maybe that way — and both the speed and the leash grow across the drift, so the
    // wandering widens into something with a direction to it before the card ever takes over.
    let heading = Math.random() * Math.PI * 2;
    let turn = 0, turnAim = (Math.random() - 0.5) * 0.024;
    let nextTurn = 2000;
    const speedAt = (pr) => 1.1 + 1.6 * pr;   // px per frame: a slow circle, opening to a lean
    const leashAt = (pr) => 110 + 190 * pr;   // how far from the map's centre it may carry

    let wantZ = 0.50, aimZ = 0.50, nextZoom = 2600;
    let seek = 0;              // 0 = pure lean, 1 = pure approach

    const camStart = Date.now();
    let raf = 0;
    const step = () => {
      const now = Date.now() - camStart;

      // --- the lean ---
      if (now > nextTurn) {
        turnAim = (Math.random() - 0.5) * 0.024;
        nextTurn = now + 2000 + Math.random() * 1400;
      }
      turn += (turnAim - turn) * 0.02;

      // The leash steers, it does not snap. Past the radius the heading is bent back toward the
      // centre a little more with each frame, so coming home is just another lean.
      const pr = Math.min(1, now / DRIFT_UNTIL);
      const leash = leashAt(pr);
      const dist = Math.hypot(cam.x, cam.y);
      if (dist > leash) {
        const home = Math.atan2(-cam.y, -cam.x);
        const diff = ((home - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        turn += Math.sign(diff) * Math.min(0.035, (dist - leash) / 1200);
      }
      heading += turn;
      const sp = speedAt(pr);
      const leanX = Math.cos(heading) * sp, leanY = Math.sin(heading) * sp;

      // --- the approach: a velocity toward the card, capped so it never whips ---
      const to = panToCentre(target);
      let sx = (to.x - cam.x) * 0.030, sy = (to.y - cam.y) * 0.030;
      const svm = Math.hypot(sx, sy), APPROACH = 7.5;
      if (svm > APPROACH) { sx *= APPROACH / svm; sy *= APPROACH / svm; }

      // --- and the crossfade between them IS the phase change. Nothing else switches. ---
      // The chosen card leaves the flicker the moment the pull begins, so it sits steady while
      // the camera comes for it rather than being lifted by the shimmer on the way in.
      if (now >= DRIFT_UNTIL && state.pool !== others) state.pool = others;

      const seekAim = now < DRIFT_UNTIL ? 0 : now < GRAVITY_UNTIL ? 0.45 : 1;
      seek += (seekAim - seek) * 0.012;

      if (now < DRIFT_UNTIL) {
        if (now > nextZoom) { aimZ = 0.46 + Math.random() * 0.09; nextZoom = now + 2600; }
      } else if (now < GRAVITY_UNTIL) aimZ = 0.62;
      else aimZ = Z_END;
      wantZ += (aimZ - wantZ) * 0.020;

      const wantX = leanX * (1 - seek) + sx * seek;
      const wantY = leanY * (1 - seek) + sy * seek;

      // Velocity is EASED toward what is wanted, never set to it. Bounded acceleration is the
      // whole trick: with it, the picture cannot corner even when the wanted heading jumps.
      cam.vx += (wantX - cam.vx) * 0.05;
      cam.vy += (wantY - cam.vy) * 0.05;
      cam.vz += ((wantZ - cam.z) * 0.05 - cam.vz) * 0.05;

      cam.x += cam.vx; cam.y += cam.vy; cam.z += cam.vz;
      cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);

      if (now < ARRIVE_AT) raf = requestAnimationFrame(step);
      else cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z);
    };
    raf = requestAnimationFrame(step);

    // The flight's own clock, for everything that hangs off it.
    const FLIGHT = ARRIVE_AT - GRAVITY_UNTIL;

    // The hero's final scale, solved up front. offsetWidth is the LAYOUT width and ignores
    // transforms; getBoundingClientRect would return the axis-aligned box, inflated by root two
    // for a 45-degree card, which throws the size out differently for every class.
    const layoutW = target.offsetWidth;
    const targetPx = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.55, 640);
    const heroScale = targetPx / (layoutW * Z_END);

    // The seat tilt, measured before anything moves. A card is tilted by its house (the
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

    // the card begins to rise and turn once the camera is well on its way, and settles with it
    const RISE_AT = GRAVITY_UNTIL + Math.round(FLIGHT * 0.30);
    window.setTimeout(() => {
      target.style.transition =
        `transform ${ARRIVE_AT - RISE_AT}ms cubic-bezier(.4,0,.2,1), filter ${ARRIVE_AT - RISE_AT}ms ease`;
      target.style.transformOrigin = 'center center';
      target.style.zIndex = '60';
      // zIndex 60 only wins INSIDE its own house container, and the containers all sit at 2 —
      // so without raising the parent too, cards from later containers paint over the hero as
      // it grows. Bounds and agents have no container and are already above them at 60.
      target.closest('.archetype-group')?.style.setProperty('z-index', '100');
      target.style.transform = `scale(${heroScale}) rotate(${-seatTilt}deg)`;
      target.style.filter = 'brightness(1.12) drop-shadow(0 20px 48px rgba(0,0,0,0.8))';
    }, RISE_AT);

    // the field eases away underneath it, finishing a beat before the card settles
    const FADE_AT = GRAVITY_UNTIL + Math.round(FLIGHT * 0.42);
    window.setTimeout(() => {
      [...others, ...document.querySelectorAll('[data-house-label]')].forEach(el => {
        el.style.transition = 'opacity 1500ms ease';
        el.style.opacity = '0';
      });
    }, FADE_AT);

    // the flicker keeps its life almost to the end, slowing the whole way
    const tStart = Date.now();
    const STOP_AT = Math.round(ARRIVE_AT * 0.78);
    while (Date.now() - tStart < STOP_AT) {
      const k = (Date.now() - tStart) / STOP_AT;
      state.gap = Math.round(pace + (640 - pace) * (k * k));
      state.scale = lift - (lift - 1.15) * k;
      await wait(70);
    }
    state.alive = false;
    release(state.last);
    others.forEach(el => { el.style.transform = 'scale(1)'; el.style.zIndex = ''; });

    await wait(ARRIVE_AT - STOP_AT + 400);

    const sig = signatureFor(displayId);
    const st = drawMap[targetId] ? STATUSES[drawMap[targetId].status] : null;
    setLandedLabel({
      name: sig?.name || `Signature ${displayId}`,
      prefix: st ? (st.prefix || 'Balanced') : null,
      seat: ARCHETYPES[targetId]?.name || null
    });
    if (mapEl) mapEl.style.pointerEvents = '';

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
    if (surface) surface.style.pointerEvents = 'none';

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
      if (surface) surface.style.pointerEvents = '';
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
        {/* The name, once the card has landed at full resolution. */}
        {landedLabel && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-1 px-4 pt-16 pb-8 text-center animate-fadeIn"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              background: 'linear-gradient(to top, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.75) 45%, rgba(10,10,15,0) 100%)'
            }}>
            {landedLabel.prefix && (
              <span className="text-[11px] uppercase tracking-[0.35em] text-zinc-400/80">{landedLabel.prefix}</span>
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
          cameraRef={cameraRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
