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
import { getCardImagePath, getHomeArchetype, getCardType } from '../../lib/cardImages.js';
import { renderToStaticMarkup } from 'react-dom/server';
import Minimap, { MINIMAP_W, MINIMAP_H, minimapPoint } from '../../components/reader/Minimap';
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
    document.querySelectorAll('[data-map-frame]').forEach((el) => el.remove());
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
    // THE PAIR. In the founder's words: "one is a random durable, and one is a random
    // transient. The transient goes to the durable's location." So Land ALWAYS has a real pair.
    // With a deal on the table the seat is taken from it. With nothing dealt, Land draws its own
    // — the same call the reading uses — and puts it on the map before anything is measured.
    //
    // Before this, an undealt Land picked from all 78 cards, and a bound or an agent is not a
    // seat: its minimap point came back empty and the card quietly landed on the map's centre,
    // on the Gestalt axis just below the house's divider, with no status and no seat named.
    let draws = drawMap;
    if (!Object.keys(draws).length) {
      const d = generateSpread(1)[0];
      draws = { [d.position]: { transient: d.transient, status: d.status } };
      setDrawMap(draws);
      // let React paint the drawn card into its seat before the field is measured
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    const dealt = cards.filter(el => draws[Number(el.dataset.position)]);
    const seatEl = dealt[Math.floor(Math.random() * dealt.length)];
    const targetId = Number(seatEl.dataset.position);

    // DURABLE AND TRANSIENT, which is the whole point of the sequence.
    //
    // The seat is durable: it never moves. The transient is the card that gets picked up and put
    // into it. Every drawn signature therefore has TWO addresses — the seat it landed in, and
    // its own home among the 78 — and until now this animation only ever showed the seat, which
    // meant the card ended where it had already been. So the subject is the card AT ITS HOME,
    // and the last act carries it to the seat.
    const displayId = draws[targetId] ? draws[targetId].transient : targetId;
    const homeEl = document.querySelector(`[data-position="${displayId}"]`) || seatEl;
    const target = homeEl;
    const others = cards.filter(el => el !== target);

    // EVERYTHING GEOMETRIC IS MEASURED NOW, while the field is still at rest. Once the flicker
    // starts writing transforms nothing can be trusted to be where it says it is.
    const chain = (el, stop) => {
      let deg = 0, scale = 1, node = el;
      while (node && node !== stop && node !== document.body) {
        const tr = getComputedStyle(node).transform;
        if (tr && tr !== 'none') {
          const m = new DOMMatrix(tr);
          deg += Math.atan2(m.b, m.a) * 180 / Math.PI;
          scale *= Math.hypot(m.a, m.b);
        }
        node = node.parentElement;
      }
      return { deg, scale };
    };
    const screenAngle = (el) => chain(el, null).deg;

    // Map coordinates, read LIVE. This helper is used both at rest and again at the very end to
    // trace the frame, and by then the camera has moved — so the canvas box and the zoom have to
    // be re-read on every call. Caching them put the whole frame off the side of the screen.
    const canvas = document.querySelector('[data-map-surface]').firstElementChild;
    const mapPoint = (el) => {
      const z = new DOMMatrix(getComputedStyle(canvas).transform).a;
      const c = canvas.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - c.left) / z, y: (r.top + r.height / 2 - c.top) / z };
    };
    const z0 = new DOMMatrix(getComputedStyle(canvas).transform).a;
    const cBox = canvas.getBoundingClientRect();

    // The field's own extent in MAP units, measured once at rest — used to frame it at the end.
    let fl = Infinity, ft = Infinity, fr = -Infinity, fb = -Infinity;
    cards.forEach(el => {
      const r = el.getBoundingClientRect();
      fl = Math.min(fl, (r.left - cBox.left) / z0);   ft = Math.min(ft, (r.top - cBox.top) / z0);
      fr = Math.max(fr, (r.right - cBox.left) / z0);  fb = Math.max(fb, (r.bottom - cBox.top) / z0);
    });
    const fieldC = { x: (fl + fr) / 2, y: (ft + fb) / 2 };
    const fieldW = fr - fl, fieldH = fb - ft;

    const homeAngle0 = screenAngle(homeEl.firstElementChild);
    const seatAngle0 = screenAngle(seatEl.firstElementChild);   // already carries the status turn
    const pHome = mapPoint(homeEl), pSeat = mapPoint(seatEl);
    const wHome = homeEl.offsetWidth, wSeat = seatEl.offsetWidth;
    const par = chain(homeEl.parentElement, canvas);            // the house the home sits in

    // THE HERO'S REAL ART, restored — this was lost in the camera rewrite and is the softness.
    // Bounds and agents are drawn on the map from 200px thumbnails, which is right at map size
    // and a ten-times upscale at hero size. The full 2134px image is preloaded now, at the very
    // start, and swapped in the moment it has decoded — long before the card is large enough
    // for the change to be visible.
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
      el.style.transform = `scale(${scale}) rotate(${aQuarter()}deg)`;
      el.style.filter = 'brightness(1.5)';
      window.setTimeout(() => { el.style.transform = 'scale(1) rotate(0deg)'; el.style.filter = 'brightness(1)'; }, ms * 0.45);
    };

    // --- the flicker engine: runs until told to stop, at whatever gap is current ---
    // ONE card at a time. Two firing together read as frantic rather than searching, and a fixed
    // gap ticks like a metronome — so each gap is jittered around the pace instead.
    // Exactly ONE card up at a time. Firing on a timer alone is not enough: the hold is longer
    // than the gap, so a second card lifts before the first has come down and you see pairs.
    // Instead the outgoing card is released at the moment the next is lifted — it eases down
    // while the new one eases up, which reads as a handoff rather than two pops. The gap is
    // jittered so it breathes rather than ticking.
    // THE POP CARRIES A QUARTER TURN.
    //
    // Status in this architecture IS rotation — 0, 90, -90 and 180 are Balanced, Too Much, Too
    // Little and Unacknowledged. So a card that lifts and turns to one of the four stops before
    // settling back is showing a stranger the grammar of the field before a single word names
    // it. No status is asserted here: the card returns to where it was, so nothing is claimed.
    const QUARTERS = [90, 180, 270, 360];
    const aQuarter = () => QUARTERS[Math.floor(Math.random() * QUARTERS.length)];

    const state = { gap: pace, alive: true, pool: cards, scale: lift, last: null };
    const release = (el) => {
      if (!el) return;
      el.style.transform = 'scale(1) rotate(0deg)';
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
      el.style.transform = `scale(${state.scale}) rotate(${aQuarter()}deg)`;
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
    // AND IT CIRCLES. Two corrections from watching it:
    //
    //   - "we're still going way off the map". The leash was measured from pan zero, which is
    //     NOT where the map sits centred in the frame — so the camera was circling an off-centre
    //     point and carrying the map into a corner. HOME is now solved from the actual bounding
    //     box of all 78 cards, so the drift circles the map itself.
    //   - "we're changing directions too much". A random turn rate re-rolled every two seconds
    //     is a wander, not a circle. A circle is a CONSTANT turn rate. So one direction of spin
    //     is chosen for the whole drift and only its tightness varies, with a single reversal
    //     part way through — "maybe it's this way, maybe it's that way", once, not six times.
    //
    // The circle's own radius is speed divided by turn rate, so those two are chosen together:
    // 1.1 and 0.012 give a circle about 90px across at the start, opening as both grow.
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    document.querySelectorAll('[data-position]').forEach(el => {
      const c = el.getBoundingClientRect();
      l = Math.min(l, c.left); t = Math.min(t, c.top);
      r = Math.max(r, c.right); b = Math.max(b, c.bottom);
    });
    const vb = surface.getBoundingClientRect();
    const home = { x: cam.x + (vb.left + vb.width / 2 - (l + r) / 2),
                   y: cam.y + (vb.top + vb.height / 2 - (t + b) / 2) };

    let heading = Math.random() * Math.PI * 2;
    let spin = Math.random() < 0.5 ? -1 : 1;
    const REVERSE_AT = 3400 + Math.random() * 1600;   // the one change of mind
    let reversed = false;
    let turn = spin * 0.017, turnAim = turn;
    let nextTurn = 2600;
    // These three are one choice, not three. A circle's radius is speed divided by turn rate, so
    // if the radius comes out LARGER than the leash the leash fights the circle every frame and
    // you get exactly the two faults being fixed here: a map carried off to one side, and a
    // heading that keeps being argued with. Radius stays inside the leash at both ends:
    //   start  1.0 / 0.017 =  59px circle around the map's centre
    //   end    2.4 / 0.017 = 141px circle around the map's centre
    const speedAt = (pr) => 1.0 + 1.4 * pr;   // px per frame: a slow circle, opening to a lean

    let wantZ = 0.50, aimZ = 0.50, nextZoom = 2600;
    let seek = 0;              // 0 = pure lean, 1 = pure approach

    const camStart = Date.now();
    let raf = 0;
    const step = () => {
      const now = Date.now() - camStart;

      // --- the lean: one direction of spin, one change of mind, tightness only ---
      if (!reversed && now > REVERSE_AT) { spin = -spin; reversed = true; }
      if (now > nextTurn) {
        turnAim = spin * (0.014 + Math.random() * 0.006);
        nextTurn = now + 2600 + Math.random() * 1600;
      } else {
        turnAim = spin * Math.abs(turnAim);
      }
      turn += (turnAim - turn) * 0.012;

      // HOME IS A PULL, NOT A LEASH. Bending the heading back toward the centre was what
      // produced the extra changes of mind: every correction flips the direction of curvature,
      // so the camera argues with itself. A gentle pull ADDED to the motion instead never
      // touches the heading at all — the circle simply drifts home, an inward spiral, and the
      // direction of turn stays exactly the one that was chosen.
      const pr = Math.min(1, now / DRIFT_UNTIL);
      heading += turn;
      const sp = speedAt(pr);
      let hx = (home.x - cam.x) * 0.010, hy = (home.y - cam.y) * 0.010;
      const hm = Math.hypot(hx, hy), HOME_MAX = 1.6;
      if (hm > HOME_MAX) { hx *= HOME_MAX / hm; hy *= HOME_MAX / hm; }
      const leanX = Math.cos(heading) * sp + hx, leanY = Math.sin(heading) * sp + hy;

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
    // At its HOME the card carries no status — it has not been placed yet — so the hero shot
    // turns it fully upright. The status turn arrives later, when it sets down in the seat.
    const seatTilt = homeAngle0;

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
    others.forEach(el => { el.style.transform = 'scale(1) rotate(0deg)'; el.style.zIndex = ''; });

    await wait(ARRIVE_AT - STOP_AT + 400);

    const sig = signatureFor(displayId);
    const st = draws[targetId] ? STATUSES[draws[targetId].status] : null;
    const cardName = sig?.name || `Signature ${displayId}`;
    const seatName = ARCHETYPES[targetId]?.name || null;
    setLandedLabel({ name: cardName, prefix: null, seat: null });

    // ================= THE LAST ACT: THE CARD TAKES ITS SEAT =================
    //
    // The hero holds, the field is black, and then the FRAME comes back on its own — the map
    // reduced to its skeleton, with nothing in it but the shape. The card then crosses that
    // empty frame and sets down in its durable seat, taking the status turn as it lands.
    //
    // The frame is TRACED FROM THE LIVE MAP rather than drawn from stored coordinates. The
    // minimap is a separate SVG with its own geometry and its own compression constants; it is
    // derived from the same canon but it is a second implementation, and a frame that has to
    // agree with the map is a frame that will one day disagree with it. Measured, it cannot.
    await wait(1500);

    // THE FRAME IS THE MINIMAP ITSELF, not a second drawing of it.
    //
    // The first attempt traced house outlines from the live map. It was correctly placed and it
    // looked nothing like the minimap, because the minimap is not outlines — it is a shape per
    // signature, house dividers, channel badges and portal glyphs, and it already draws the
    // marching arrow from a card's HOME to the seat it was drawn into. That is this whole
    // sequence stated as a diagram. So the real component is rendered here, at size, and the
    // card lands on the very point the minimap itself marks as the destination.
    const fromArch = getHomeArchetype(displayId);
    const fromType = getCardType(displayId);
    const trans = signatureFor(displayId);
    const frameSvg = renderToStaticMarkup(
      <Minimap fromId={fromArch} toId={targetId} fromCardType={fromType}
               boundIsInner={fromType === 'bound' && (trans?.number ?? 99) <= 5} size="xl" />
    );

    // fitted into the field the big map occupied, so the camera framing still holds
    const fit = Math.min(fieldW / MINIMAP_W, fieldH / MINIMAP_H) * 0.96;
    const fw = MINIMAP_W * fit, fh = MINIMAP_H * fit;
    const fx = fieldC.x - fw / 2, fy = fieldC.y - fh / 2;

    const holder = document.createElement('div');
    holder.setAttribute('data-map-frame', '');
    Object.assign(holder.style, { position: 'absolute', left: `${fx}px`, top: `${fy}px`,
      width: `${fw}px`, height: `${fh}px`, pointerEvents: 'none', zIndex: '5',
      opacity: '0', transition: 'opacity 1100ms ease' });
    holder.innerHTML = frameSvg;
    const inner2 = holder.querySelector('svg');
    if (inner2) { inner2.setAttribute('width', fw); inner2.setAttribute('height', fh); }
    canvas.appendChild(holder);
    requestAnimationFrame(() => { holder.style.opacity = '1'; });

    // the camera opens back out to hold the whole frame, on the same drive/commit as the flight
    // The pull-back CENTRES ITSELF each frame instead of flying to a stored pan. A pan that
    // centres the map at one zoom does not centre it at another — the two are bound together —
    // and that is why the first attempt left the frame hanging off the bottom of the screen.
    // Measuring where the field actually IS and correcting toward the middle cannot get this
    // wrong, whatever the zoom or the window size happen to be.
    const fitZ = Math.max(0.18, Math.min(1.2,
      Math.min(window.innerWidth * 0.80 / fieldW, window.innerHeight * 0.68 / fieldH)));
    // THE CARD IS HELD WHILE THE FRAME IS DRAWN AROUND IT.
    //
    // Without this it drifts back to its own seat on the map as the camera opens out, and only
    // then hops across to the durable — so the eye reads the big move as the card being put
    // BACK where it came from, and the move that actually matters as an afterthought. The card
    // is instead pinned to the middle of the screen for the whole pull-back, and makes exactly
    // ONE journey: out of the hand and into the seat.
    //
    // Pinning is a direct solve, not an easing: each frame the card's own box is measured and
    // the residual to the centre is converted back through the house's rotation and the camera's
    // zoom into the card's own parent space, where its translate lives.
    const toLocal = (sx, sy, zoom) => {
      const a = -par.deg * Math.PI / 180, k = zoom * par.scale;
      return { x: (sx * Math.cos(a) - sy * Math.sin(a)) / k,
               y: (sx * Math.sin(a) + sy * Math.cos(a)) / k };
    };
    let pinX = 0, pinY = 0;
    target.style.transition = 'none';
    await new Promise(done => {
      const fromZ = cam.z, MS = 2400, t = Date.now();
      const pull = () => {
        const k = Math.min(1, (Date.now() - t) / MS);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cam.z = fromZ + (fitZ - fromZ) * e;
        const cr = canvas.getBoundingClientRect();
        cam.x += (window.innerWidth / 2 - (cr.left + fieldC.x * cam.z)) * 0.10;
        cam.y += (window.innerHeight / 2 - (cr.top + fieldC.y * cam.z)) * 0.10;
        cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);

        const hr = target.getBoundingClientRect();
        const d = toLocal(window.innerWidth / 2 - (hr.left + hr.width / 2),
                          window.innerHeight / 2 - (hr.top + hr.height / 2), cam.z);
        pinX += d.x; pinY += d.y;
        target.style.transform =
          `translate(${pinX}px, ${pinY}px) scale(${heroScale}) rotate(${-seatTilt}deg)`;

        if (k < 1) requestAnimationFrame(pull);
        else { cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z); done(); }
      };
      requestAnimationFrame(pull);
    });

    // and the card crosses to its seat. The translate is in the card's OWN parent space, so a
    // world delta has to be turned back through whatever rotation its house carries — the
    // houses are diamonds, and a 45-degree parent would send it off at 45 degrees otherwise.
    const mp0 = minimapPoint(targetId);
    if (!mp0) console.warn(`animation: seat ${targetId} has no minimap point; landing at centre`);
    const mp = mp0 || { x: MINIMAP_W / 2, y: MINIMAP_H / 2 };
    const dest = { x: fx + mp.x * fit, y: fy + mp.y * fit };

    // On the minimap nothing is tilted by its house, so the card lands UPRIGHT and keeps only
    // the turn that means something: its status.
    const statusRot = draws[targetId] ? (STATUS_GLOW[draws[targetId].status]?.rotation || 0) : 0;
    const landScale = (fieldW * 0.085) / wHome;

    const th = -par.deg * Math.PI / 180;
    const wx = (dest.x - pHome.x) / par.scale, wy = (dest.y - pHome.y) / par.scale;
    const dx = wx * Math.cos(th) - wy * Math.sin(th);
    const dy = wx * Math.sin(th) + wy * Math.cos(th);
    const TRAVEL = 2600;
    target.style.transition = `transform ${TRAVEL}ms cubic-bezier(.45,0,.2,1), filter ${TRAVEL}ms ease`;
    target.style.transform =
      `translate(${dx}px, ${dy}px) scale(${landScale}) rotate(${statusRot - homeAngle0}deg)`;
    target.style.filter = 'brightness(1) drop-shadow(0 6px 18px rgba(0,0,0,0.6))';

    await wait(TRAVEL + 250);
    setLandedLabel({ name: cardName, prefix: st ? (st.prefix || 'Balanced') : null, seat: seatName });
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
        el.style.transform = `scale(${lift}) rotate(${[90, 180, 270, 360][Math.floor(Math.random() * 4)]}deg)`;
        el.style.filter = 'brightness(1.5)';
        window.setTimeout(() => {
          el.style.transform = 'scale(1) rotate(0deg)';
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
