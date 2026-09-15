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
import Minimap, { MINIMAP_W, MINIMAP_H, minimapPoint, minimapSeatRotation } from '../../components/reader/Minimap';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { STATUSES } from '../../lib/constants.js';

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
    document.querySelectorAll('[data-position]').forEach((el) => {
      el.style.transform = ''; el.style.filter = ''; el.style.zIndex = '';
      el.style.willChange = ''; el.style.transition = ''; el.style.opacity = '';
      delete el.dataset.turn;
      const im = el.querySelector('img');
      if (im && im.dataset.prevSrc) { im.src = im.dataset.prevSrc; delete im.dataset.prevSrc; }
    });
    document.querySelectorAll('[data-flight-clone], [data-plate], [data-flash], [data-ghost]').forEach((el) => el.remove());
    document.querySelector('[data-map-surface]')?.classList.remove('nkya-animating');
    document.querySelectorAll('.element-bg').forEach((el) => { el.style.opacity = ''; el.style.transition = ''; });
    document.querySelectorAll('[data-map-wordmark]').forEach((el) => { el.style.opacity = ''; el.style.transition = ''; });
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
    if (mapEl) mapEl.classList.add('nkya-animating');

    const cards = Array.from(document.querySelectorAll('[data-position]'));
    if (!cards.length) { setLanding(false); if (mapEl) mapEl.classList.remove('nkya-animating'); return; }
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
    // SELF-HOMED: an archetype drawn into its own seat. There is no second card to tell the story
    // with, so the seat becomes a GHOST of itself — a faded, desaturated copy of the card's own
    // face, in the seat, wearing the seat's name — and the card comes home onto it exactly.
    const selfHomed = homeEl === seatEl;
    const seatFaceArt = getCardImagePath(targetId);
    let ghost = null;
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

    const makeGhost = () => {
      if (ghost) return ghost;
      const face = seatEl.querySelector('.card') || seatEl;
      const w = face.offsetWidth, hgt = face.offsetHeight || w;
      ghost = document.createElement('div');
      ghost.setAttribute('data-ghost', '');
      Object.assign(ghost.style, { position: 'absolute', left: `${pSeat.x - w / 2}px`, top: `${pSeat.y - hgt / 2}px`, width: `${w}px`, height: `${hgt}px`,
        transform: `rotate(${seatAngle0}deg)`, transformOrigin: 'center center', zIndex: '30', opacity: '0.35', pointerEvents: 'none',
        transition: 'opacity 900ms ease' });
      ghost.innerHTML = `<img src="${seatFaceArt}" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:6px;filter:grayscale(1) brightness(0.9)">`;
      canvas.appendChild(ghost);
      return ghost;
    };
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

    // NAMES ON THE CARDS. The founder: "attach the names to the cards so when we reveal the name
    // of the card and its transient status, it stays on the card instead of just being at the
    // bottom of the screen ... as well as the destination card." The plate lives INSIDE the card
    // element, so it scales, turns and travels with it — on an inverted card it hangs off the
    // top, upside down, exactly as the card is. Sizes are fractions of the card's own width.
    // side: 'below' for the name, 'above' for the status — the founder: "put the transient status
    // name on the top, above the card instead of below the card."
    const plateFor = (el, lines, side = 'below') => {
      const host = el.querySelector('.card') || el;
      let pl = host.querySelector(`:scope > [data-plate="${side}"]`);
      if (!pl) { pl = document.createElement('div'); pl.setAttribute('data-plate', side); host.appendChild(pl); }
      const w = host.offsetWidth || el.offsetWidth || 100;
      const edge = side === 'above' ? { bottom: '100%', marginBottom: `${(w * 0.06).toFixed(1)}px` } : { top: '100%', marginTop: `${(w * 0.06).toFixed(1)}px` };
      Object.assign(pl.style, { position: 'absolute', left: '50%', transform: 'translateX(-50%)', ...edge,
        width: 'max-content', maxWidth: `${(w * 2.2).toFixed(0)}px`, textAlign: 'center',
        pointerEvents: 'none', lineHeight: '1.15', textShadow: '0 2px 8px rgba(0,0,0,0.95)', opacity: '0', transition: 'opacity 600ms ease' });
      pl.innerHTML = lines.map(l =>
        `<div style="font-size:${(w * l.size).toFixed(1)}px;font-family:${l.font};font-weight:${l.weight};letter-spacing:${l.ls};color:${l.color};text-transform:${l.upper ? 'uppercase' : 'none'};white-space:nowrap">${l.text}</div>`
      ).join('');
      void pl.offsetHeight;
      pl.style.opacity = '1';
      return pl;
    };
    // Two families, one weight each: Cormorant at 400 (the site loads 300/400/600; a 500 was
    // being faked) for every name, at ONE size; the site's own sans at 600 with the tagline's
    // tracking for the status, so it rhymes with the lockup instead of shouting against it.
    const SERIF = "'Cormorant Garamond', serif", SANS = 'system-ui, -apple-system, sans-serif';
    const NAME = (t) => ({ text: t, size: 0.11, font: SERIF, weight: 400, ls: '0.06em', color: '#fde9b0', upper: false });
    const STATUS = (t, c) => ({ text: t, size: 0.07, font: SANS, weight: 600, ls: '0.2em', color: c, upper: true });
    const SEATNAME = (t) => ({ text: t, size: 0.11, font: SERIF, weight: 400, ls: '0.06em', color: '#b4b4bc', upper: false });
    const SEATLINE = (t) => ({ text: t, size: 0.085, font: SERIF, weight: 400, ls: '0.04em', color: '#b4b4bc', upper: false });

    // THE FLASH. "a bright flash type of thing, emanating" — when the card is finally chosen, and
    // again when the spin stops on its status. A fixed disc at the card's own centre, so it is
    // untouched by the map's transform, that swells and fades in three quarters of a second.
    // Four moments, four shapes, so each one says what just happened:
    //   'disc'    the choosing — a bloom that swells out of the card
    //   'ring'    the status — a hard ring thrown off the card as the spin stops
    //   'implode' the seating — the reverse: light gathers INTO the durable as the card lands
    //   (the header has its own, below: a sweep of light across the whole header)
    const burst = (el, color, kind = 'disc') => {
      const r = el.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 1.1;
      const f = document.createElement('div');
      f.setAttribute('data-flash', kind);
      const base = { position: 'fixed', left: `${r.left + r.width / 2 - d / 2}px`, top: `${r.top + r.height / 2 - d / 2}px`,
        width: `${d}px`, height: `${d}px`, borderRadius: '50%', pointerEvents: 'none', zIndex: '250', mixBlendMode: 'screen' };
      let frames, timing;
      if (kind === 'ring') {
        Object.assign(f.style, base, { border: `${Math.max(3, d * 0.035)}px solid ${color}`, boxShadow: `0 0 ${d * 0.12}px ${color}`, background: 'transparent' });
        frames = [{ transform: 'scale(0.5)', opacity: 1 }, { transform: 'scale(2.6)', opacity: 0 }];
        timing = { duration: 800, easing: 'cubic-bezier(.1,.8,.2,1)' };
      } else if (kind === 'implode') {
        Object.assign(f.style, base, { background: `radial-gradient(circle, ${color} 0%, ${color}77 40%, transparent 70%)` });
        frames = [{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 0.9, offset: 0.7 }, { transform: 'scale(0.3)', opacity: 0 }];
        timing = { duration: 900, easing: 'cubic-bezier(.4,0,.6,1)' };
      } else {
        Object.assign(f.style, base, { background: `radial-gradient(circle, ${color} 0%, ${color}66 35%, transparent 70%)` });
        frames = [{ transform: 'scale(0.35)', opacity: 0.95 }, { transform: 'scale(2.4)', opacity: 0 }];
        timing = { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)' };
      }
      document.body.appendChild(f);
      f.animate(frames, timing).onfinish = () => f.remove();
    };
    // The card's face on screen, through its whole transform chain: centre, size and angle.
    const faceBox = (el) => {
      const img = el.querySelector('img') || el;
      let m = new DOMMatrix(), n = img;
      while (n && n !== document.body) { const t = getComputedStyle(n).transform; if (t && t !== 'none') m = new DOMMatrix(t).multiply(m); n = n.parentElement; }
      const sc = Math.hypot(m.a, m.b), ang = Math.atan2(m.b, m.a) * 180 / Math.PI;
      const r = img.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: img.offsetWidth * sc, h: img.offsetHeight * sc, ang };
    };
    // "some sort of bam or some sort of flash of a border": a brightness punch on the card itself
    // and a flash that hugs its outline and blooms outward, ahead of the disc.
    const punch = (el) => {
      el.style.transition = 'filter 160ms ease-out';
      el.style.filter = 'brightness(2.1)';
      window.setTimeout(() => { el.style.transition = 'filter 340ms ease'; el.style.filter = 'brightness(1)'; }, 170);
    };
    const edgeFlash = (el, color) => {
      const b = faceBox(el);
      const f = document.createElement('div');
      f.setAttribute('data-flash', 'edge');
      Object.assign(f.style, { position: 'fixed', left: `${b.cx - b.w / 2}px`, top: `${b.cy - b.h / 2}px`, width: `${b.w}px`, height: `${b.h}px`,
        borderRadius: '8px', border: `${Math.max(3, b.w * 0.03)}px solid ${color}`, boxShadow: `0 0 ${b.w * 0.15}px ${color}, inset 0 0 ${b.w * 0.1}px ${color}`,
        transform: `rotate(${b.ang}deg) scale(1)`, transformOrigin: 'center center', pointerEvents: 'none', zIndex: '251', mixBlendMode: 'screen' });
      document.body.appendChild(f);
      f.animate([{ transform: `rotate(${b.ang}deg) scale(0.96)`, opacity: 1 }, { transform: `rotate(${b.ang}deg) scale(1.45)`, opacity: 0 }],
        { duration: 520, easing: 'cubic-bezier(.1,.8,.2,1)' }).onfinish = () => f.remove();
    };
    const sweep = (top, height) => {
      // the header's arrival: a band of light crossing the whole header, and a bloom behind it
      const band = document.createElement('div');
      band.setAttribute('data-flash', 'sweep');
      Object.assign(band.style, { position: 'fixed', left: '0', top: `${top}px`, width: '100vw', height: `${height}px`, pointerEvents: 'none',
        zIndex: '320', mixBlendMode: 'screen', overflow: 'hidden' });
      band.innerHTML = `<div style="position:absolute;top:-20%;left:-40%;width:40%;height:140%;transform:skewX(-18deg);background:linear-gradient(90deg,transparent 0%,rgba(255,240,200,0.0) 20%,rgba(255,240,200,0.55) 50%,rgba(255,240,200,0.0) 80%,transparent 100%)"></div>`;
      document.body.appendChild(band);
      band.firstElementChild.animate([{ left: '-40%' }, { left: '110%' }], { duration: 1100, easing: 'cubic-bezier(.3,.1,.2,1)' }).onfinish = () => band.remove();
      const bloom = document.createElement('div');
      bloom.setAttribute('data-flash', 'bloom');
      Object.assign(bloom.style, { position: 'fixed', left: '0', top: `${top}px`, width: '100vw', height: `${height}px`, pointerEvents: 'none', zIndex: '240',
        background: 'radial-gradient(ellipse at 50% 45%, rgba(253,230,138,0.35) 0%, rgba(253,230,138,0.12) 35%, transparent 70%)', mixBlendMode: 'screen' });
      document.body.appendChild(bloom);
      bloom.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => bloom.remove();
    };
    const flash = (el, scale, ms) => {
      el.style.transition = `transform ${Math.max(ms, POP_MS)}ms cubic-bezier(.22,1,.36,1), filter ${ms}ms ease`;
      el.style.transformOrigin = 'center center';
      el.style.zIndex = '40';
      el.dataset.turn = aQuarter();
      el.style.transform = `scale(${scale}) rotate(${turnOf(el)}deg)`;
      el.style.filter = 'brightness(1.5)';
      window.setTimeout(() => { el.style.transform = `scale(1) rotate(${turnOf(el)}deg)`; el.style.filter = 'brightness(1)'; }, ms * 0.45);
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
    // The turn STAYS. A card that pops, turns, and comes back square has said nothing; a card
    // that pops and settles at one of the four stops has been dealt an angle, and by the end of
    // the seek the field is a spread of angles rather than a grid — which is what a field of
    // statuses looks like before a word is put to any of them. The angle is remembered on the
    // element so the release and the end of the seek both honour it. Cleared by clearCards.
    const QUARTERS = [90, 180, 270, 360];
    const turnOf = (el) => el.dataset.turn || 0;
    const POP_MS = 900;   // was 520 — they were turning a little too fast
    const aQuarter = () => QUARTERS[Math.floor(Math.random() * QUARTERS.length)];

    const state = { gap: pace, alive: true, pool: cards, scale: lift, last: null };
    const release = (el) => {
      if (!el) return;
      el.style.transform = `scale(1) rotate(${turnOf(el)}deg)`;
      el.style.filter = 'brightness(1)';
      window.setTimeout(() => { if (el.style.zIndex === '40') el.style.zIndex = ''; }, 500);
    };
    const tick = () => {
      if (!state.alive) return;
      let el = state.pool[Math.floor(Math.random() * state.pool.length)];
      if (el === state.last && state.pool.length > 1) el = state.pool[Math.floor(Math.random() * state.pool.length)];
      release(state.last);
      state.last = el;
      el.style.transition = `transform ${POP_MS}ms cubic-bezier(.22,1,.36,1), filter 520ms ease`;
      el.style.transformOrigin = 'center center';
      el.style.zIndex = '40';
      el.dataset.turn = aQuarter();
      el.style.transform = `scale(${state.scale}) rotate(${turnOf(el)}deg)`;
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

    // Halved 2026-09-14 at the founder's word: "the time that the camera's hunting around ...
    // the first beat, let's cut that time in half." Everything downstream hangs off these three.
    const DRIFT_UNTIL = 3800;     // leaning across the field, going nowhere in particular
    const GRAVITY_UNTIL = 5700;   // the card starts to pull, the lean is still in charge
    const ARRIVE_AT = 8600;       // settled
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
    const REVERSE_AT = 1700 + Math.random() * 800;    // the one change of mind
    let reversed = false;
    let turn = spin * 0.017, turnAim = turn;
    let nextTurn = 1300;
    // These three are one choice, not three. A circle's radius is speed divided by turn rate, so
    // if the radius comes out LARGER than the leash the leash fights the circle every frame and
    // you get exactly the two faults being fixed here: a map carried off to one side, and a
    // heading that keeps being argued with. Radius stays inside the leash at both ends:
    //   start  1.0 / 0.017 =  59px circle around the map's centre
    //   end    2.4 / 0.017 = 141px circle around the map's centre
    const speedAt = (pr) => 1.0 + 1.4 * pr;   // px per frame: a slow circle, opening to a lean

    let wantZ = 0.50, aimZ = 0.50, nextZoom = 1300;
    let seek = 0;              // 0 = pure lean, 1 = pure approach

    const camStart = Date.now();
    let raf = 0;
    const step = () => {
      const now = Date.now() - camStart;

      // --- the lean: one direction of spin, one change of mind, tightness only ---
      if (!reversed && now > REVERSE_AT) { spin = -spin; reversed = true; }
      if (now > nextTurn) {
        turnAim = spin * (0.014 + Math.random() * 0.006);
        nextTurn = now + 1300 + Math.random() * 800;
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
        if (now > nextZoom) { aimZ = 0.46 + Math.random() * 0.09; nextZoom = now + 1300; }
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
    // The rise no longer happens during the flight. The founder: "it should be right when we
    // center on the card before we pull it off of the map ... As soon as we zoom into that
    // particular card, splash bam, that's the card that we selected. Maybe that's when we put
    // the name on it. And then we pull it up." So: arrive, splash, name, and only then the rise.
    const RISE_MS = 1500;
    const rise = () => {
      target.style.transition = `transform ${RISE_MS}ms cubic-bezier(.4,0,.2,1), filter ${RISE_MS}ms ease`;
      target.style.transformOrigin = 'center center';
      target.style.zIndex = '60';
      // zIndex 60 only wins INSIDE its own house container, and the containers all sit at 2 —
      // so without raising the parent too, cards from later containers paint over the hero as
      // it grows. Bounds and agents have no container and are already above them at 60.
      target.closest('.archetype-group')?.style.setProperty('z-index', '100');
      target.style.transform = `scale(${heroScale}) rotate(${-seatTilt}deg)`;
      target.style.filter = 'brightness(1.12) drop-shadow(0 20px 48px rgba(0,0,0,0.8))';
      // "the borders around it when you zoom up get really thick, and it's unattractive" — the
      // coloured frame is the element background behind the image; it goes as the card rises.
      const bg = target.querySelector('.element-bg');
      if (bg) { bg.style.transition = 'opacity 900ms ease'; bg.style.opacity = '0'; }
    };

    // the field eases away underneath it, finishing a beat before the card settles
    const FADE_AT = GRAVITY_UNTIL + Math.round(FLIGHT * 0.42);
    window.setTimeout(() => {
      // "the background isn't fully faded out. It's only partially faded out" — the field stays
      // at a quarter behind the hero, so that when the durable lights up it lights up OUT OF the
      // field, and the minimap has something to rise through.
      [...others, ...document.querySelectorAll('[data-house-label]')].forEach(el => {
        el.style.transition = 'opacity 1500ms ease';
        el.style.opacity = '0.25';
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
    others.forEach(el => { el.style.transform = `scale(1) rotate(${el.dataset.turn || 0}deg)`; el.style.zIndex = ''; });

    await wait(ARRIVE_AT - STOP_AT + 400);

    const sig = signatureFor(displayId);
    const st = draws[targetId] ? STATUSES[draws[targetId].status] : null;
    const cardName = sig?.name || `Signature ${displayId}`;
    const seatName = ARCHETYPES[targetId]?.name || null;
    // Names live on the chosen cards and nowhere else — the founder: "we've basically got it in
    // three places ... I think we just want them on the card and specifically on the ones that
    // are selected only." So no screen label; the plate is the name.
    // the camera has settled on the card: this is the selection
    target.style.zIndex = '60';
    target.closest('.archetype-group')?.style.setProperty('z-index', '100');
    punch(target);
    edgeFlash(target, '#fde68a');
    window.setTimeout(() => burst(target, '#fde68a', 'disc'), 90);
    plateFor(target, [NAME(cardName)]);
    await wait(700);
    if (selfHomed) makeGhost();   // under the card as it rises, as every other durable's face is
    rise();
    await wait(RISE_MS + 100);

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
    // THE SPIN. The founder: "before we say too much, too little, unacknowledged or balanced,
    // the card's going to spin in place fast and then slow down fairly quickly at one side
    // facing up ... ninety degrees to the right if it's too much, ninety degrees to the left if
    // it's too little and inverted if it's unacknowledged." So the status is shown before it is
    // said: three full turns that brake hard onto the status angle, and only then does the word
    // join the name. A Balanced card spins too, and comes to rest upright.
    //
    // The turns are kept in spinBase, because every later transform on this card is an absolute
    // rotate — without adding them back, the journey would unwind three turns on the way.
    const SPINS = 3;
    const spinBase = SPINS * 360;
    const spinStatusRot = draws[targetId] ? (STATUS_GLOW[draws[targetId].status]?.rotation || 0) : 0;
    await wait(600);
    target.style.transition = 'transform 2300ms cubic-bezier(.08,.72,.16,1)';
    target.style.transform = `scale(${heroScale}) rotate(${-seatTilt + spinBase + spinStatusRot}deg)`;
    await wait(2300 + 150);
    const statusColor = draws[targetId] ? (STATUS_GLOW[draws[targetId].status]?.color || '#e4e4e7') : '#e4e4e7';
    burst(target, statusColor, 'ring');
    plateFor(target, [STATUS(st ? (st.prefix || 'Balanced') : '', statusColor)], 'above');
    await wait(1100);

    // ============================ THE LAST ACT, as the founder laid it out ============================
    //
    //   1. the map comes back, reset, and the seat shows its own face
    //   2. the transient crosses the REAL map and sets down on the durable, which stays peeking out
    //   3. as the camera opens out the field dissolves and the minimap comes up underneath
    //   4. the stack, the minimap and the wordmark shrink into the header
    //
    // His reason, and it is the design law again: "people have never seen the minimap before, so
    // they're not going to know what the heck has happened." Land on the map they were just
    // looking at; only then let it become the diagram.

    // --- 1. the field returns, square, and the durable shows its face ---
    const seatImg = seatEl.querySelector('img');
    const seatOwnArt = getCardImagePath(targetId);
    if (seatImg && seatOwnArt && !seatImg.src.endsWith(seatOwnArt)) {
      seatImg.dataset.prevSrc = seatImg.getAttribute('src');
      seatImg.src = seatOwnArt;
    }
    // The field stays at its quarter; every popped card goes square; and the durable alone comes
    // up to full — "that's the one card that's lit up" — wearing its own name.
    others.forEach(el => {
      el.style.transition = 'opacity 900ms ease, transform 900ms ease';
      el.style.transform = 'scale(1) rotate(0deg)';
      delete el.dataset.turn;
      el.style.opacity = el === seatEl ? '1' : '0.25';
    });
    const seatFace = selfHomed ? makeGhost() : seatEl;   // the thing the card will land on
    if (selfHomed) ghost.style.opacity = '0.6';
    if (seatName) plateFor(seatFace, [SEATNAME(seatName)]);
    // The minimap rises on a layer above the field, and the two cards that matter must sit
    // above THAT. The hero's house is already raised; the seat's must be raised too, or the
    // durable ends up under the diagram it is supposed to be seen through.
    // 30: above the minimap (5), below a hero at canvas level (60) and below a hero's raised
    // house (100). Raising it to 100 tied it with the hero's house, and a tie is settled by
    // document order, which put the durable OVER the transient.
    if (!selfHomed) {   // self-homed: the seat IS the hero, which already sits at 60 in a house at 100
      seatEl.style.zIndex = '59';
      seatEl.closest('.archetype-group')?.style.setProperty('z-index', '30');
    }
    document.querySelectorAll('[data-house-label]').forEach(el => { el.style.transition = 'opacity 900ms ease'; el.style.opacity = '0.25'; });
    await wait(1000);

    // --- 2. the transient sets down ON the durable, which peeks out from beneath ---
    // ASSUMPTION (founder to confirm by eye): the transient sits down and to the right of the
    // seat by a little over half a card, so the durable shows to the upper-left, about 60% of it.
    // "when it lands on it, it should be like ninety percent overlap" — and the header then
    // unfolds the pair so both faces read. Two offsets, one per moment.
    // "transient in your durable ... left to right": the transient sits up and to the LEFT of
    // the seat so the durable shows to the right of it, and the header unfolds the pair the same
    // way — transient left and in front, durable to its right and behind.
    const PEEK = { x: -0.10, y: -0.06 };
    const PEEK_HEADER = { x: 0.55, y: 0.14 };
    const statusRot = draws[targetId] ? (STATUS_GLOW[draws[targetId].status]?.rotation || 0) : 0;
    // seatAngle0 was measured at rest; if the founder had dealt the table, that seat already
    // carried this status turn, and it must not be applied twice.
    const seatTiltOnly = seatAngle0 - (drawMap[targetId] ? statusRot : 0);
    const peek = selfHomed ? { x: 0, y: 0 } : PEEK;   // home is home: no peek when it is its own seat
    const destMap = { x: pSeat.x + peek.x * wSeat, y: pSeat.y + peek.y * wSeat };
    const landScale = wSeat / (wHome * par.scale);          // the seat's own size
    const th = -par.deg * Math.PI / 180;
    const wx = (destMap.x - pHome.x) / par.scale, wy = (destMap.y - pHome.y) / par.scale;
    let dx = wx * Math.cos(th) - wy * Math.sin(th);
    let dy = wx * Math.sin(th) + wy * Math.cos(th);
    const TRAVEL = 2900;

    // THE REVEAL RIDES THE JOURNEY. The founder: "while we're moving the transient to the durable
    // location, can we fade slowly everything but the durable location ... to like ten percent,
    // and can we have that revealing the underlying minimap underneath?" So the minimap is built
    // now, under the map, and rises through the field as the field dims to a tenth — only the
    // durable and the card in flight stay at full. By the time the card sets down the diagram is
    // already showing through, and the open-out afterwards only has to finish the fade.
    const fromArch = getHomeArchetype(displayId);
    const fromType = getCardType(displayId);
    const trans = signatureFor(displayId);
    const frameSvg = renderToStaticMarkup(
      <Minimap fromId={fromArch} toId={targetId} fromCardType={fromType}
               boundIsInner={fromType === 'bound' && (trans?.number ?? 99) <= 5} size="xl" />
    );
    const fit = Math.min(fieldW / MINIMAP_W, fieldH / MINIMAP_H) * 0.96;
    const fw = MINIMAP_W * fit, fh = MINIMAP_H * fit;
    const fx = fieldC.x - fw / 2, fy = fieldC.y - fh / 2;
    const holder = document.createElement('div');
    holder.setAttribute('data-map-frame', '');
    Object.assign(holder.style, { position: 'absolute', left: `${fx}px`, top: `${fy}px`,
      width: `${fw}px`, height: `${fh}px`, pointerEvents: 'none', zIndex: '5',
      opacity: '0', transition: `opacity ${TRAVEL}ms ease` });
    holder.innerHTML = frameSvg;
    const frameEl = holder.querySelector('svg');
    if (frameEl) { frameEl.setAttribute('width', fw); frameEl.setAttribute('height', fh); }
    canvas.appendChild(holder);
    const dimmed = [...others.filter(el => el !== seatEl), ...document.querySelectorAll('[data-house-label]'), ...document.querySelectorAll('[data-map-wordmark]')];
    dimmed.forEach(el => { el.style.transition = `opacity ${TRAVEL}ms ease`; el.style.opacity = '0.1'; });
    void holder.offsetHeight;   // a forced style pass, so the opacity change below TRANSITIONS rather than snapping
    holder.style.opacity = '1';

    // a slower start, so card and camera lean into the journey together (the camera's glide
    // eases in; the card used to leave at speed, and the mismatch read as a jerk)
    target.style.transition = `transform ${TRAVEL}ms cubic-bezier(.7,0,.2,1), filter ${TRAVEL}ms ease`;
    target.style.transform =
      `translate(${dx}px, ${dy}px) scale(${landScale}) rotate(${spinBase + seatTiltOnly + statusRot - homeAngle0}deg)`;
    target.style.filter = 'brightness(1) drop-shadow(0 10px 24px rgba(0,0,0,0.75))';

    const centreOnCard = (gain) => {
      const hr = target.getBoundingClientRect();
      cam.x += (window.innerWidth / 2 - (hr.left + hr.width / 2)) * gain;
      cam.y += (window.innerHeight / 2 - (hr.top + hr.height / 2)) * gain;
    };
    const centreOnMap = (cx, cy) => (gain) => {
      const cr = canvas.getBoundingClientRect();
      cam.x += (window.innerWidth / 2 - (cr.left + cx * cam.z)) * gain;
      cam.y += (window.innerHeight / 2 - (cr.top + cy * cam.z)) * gain;
    };
    const glide = (toZ, ms, centre = centreOnCard) => new Promise(done => {
      const fromZ = cam.z, t = Date.now();
      const stepZ = () => {
        const k = Math.min(1, (Date.now() - t) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cam.z = fromZ + (toZ - fromZ) * e;
        centre(0.12);
        cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);
        if (k < 1) requestAnimationFrame(stepZ);
        else { cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z); done(); }
      };
      requestAnimationFrame(stepZ);
    });

    // "the camera's still zoomed way up on it, so you can see what's going on"
    const tightZ = Math.max(0.9, cam.z * 0.70);
    await glide(tightZ, TRAVEL);

    // MEASURED SETTLE. The solved translate lands the card near the seat but not on it — the
    // residual differs with the home card's house, and at a ninety-percent overlap even twenty
    // map units reads as "off to the side". So the landing is finished the way every other
    // placement in this sequence is: measure where the card actually is against where the seat
    // actually is, and take out the difference in a short settle.
    {
      const sr = seatEl.getBoundingClientRect(), hr = target.getBoundingClientRect();
      const z = cam.z;
      const want = { x: sr.left + sr.width / 2 + peek.x * wSeat * z, y: sr.top + sr.height / 2 + peek.y * wSeat * z };
      const ex = want.x - (hr.left + hr.width / 2), ey = want.y - (hr.top + hr.height / 2);
      window.__landResidualPx = [Math.round(ex), Math.round(ey)];
      if (Math.hypot(ex, ey) > 1.5) {
        const k = z * par.scale, a = -par.deg * Math.PI / 180;
        const lx = (ex * Math.cos(a) - ey * Math.sin(a)) / k, ly = (ex * Math.sin(a) + ey * Math.cos(a)) / k;
        dx += lx; dy += ly;
        target.style.transition = 'transform 280ms ease-out';
        target.style.transform =
          `translate(${dx}px, ${dy}px) scale(${landScale}) rotate(${spinBase + seatTiltOnly + statusRot - homeAngle0}deg)`;
        await wait(300);
      }
    }
    // "a reverse splash ... on the durable itself", now in two colours — the durable's own element
    // colour and gold — gathering in; and the durable's frame fades WITH it, so nothing is left
    // to vanish when the flight begins.
    const seatBg = seatEl.querySelector('.element-bg');
    const elemColor = seatBg ? getComputedStyle(seatBg).backgroundColor : '#fde68a';
    burst(seatFace, selfHomed ? '#fde68a' : elemColor, 'implode');
    window.setTimeout(() => burst(seatFace, '#fde68a', 'implode'), 150);
    if (!selfHomed && seatBg) { seatBg.style.transition = 'opacity 900ms ease'; seatBg.style.opacity = '0'; }
    // Two plates in one place read as a collision. The durable's plate fades and the transient's
    // takes a second, quieter line, so the card now says the whole thing: "Stewardship" over
    // "in Fortitude".
    const seatPlate = seatFace.querySelector('[data-plate="below"]');
    if (seatPlate) seatPlate.style.opacity = '0';
    plateFor(target, [NAME(cardName), SEATLINE(selfHomed ? 'in its own seat' : `in ${seatName || ''}`)]);
    await wait(250);
    await wait(1200);

    // --- 3. the field dissolves into the minimap as the camera opens out ---

    // STAY ON THE CARDS. The founder: "the camera is resetting to zero instead of staying tight
    // on the cards all the way up. I want them to stay tight on the cards all the way up and only
    // expand enough out to include the transient, the durable, and the minimap." So the open-out
    // keeps the stack centred and zooms out only as far as this seat's distance to the frame's
    // far edge requires — the whole minimap comes into view around the cards, not instead of them.
    const ex = Math.max(destMap.x - fx, fx + fw - destMap.x);
    const ey = Math.max(destMap.y - fy, fy + fh - destMap.y);
    const fitZ = Math.max(0.18, Math.min(1.2,
      Math.min(window.innerWidth * 0.46 / ex, window.innerHeight * 0.36 / ey)));
    // the field, already at a tenth, goes the rest of the way as the camera opens
    dimmed.forEach(el => { el.style.transition = 'opacity 1500ms ease'; el.style.opacity = el.hasAttribute('data-map-wordmark') ? '0.1' : '0'; });
    await glide(fitZ, 2600, centreOnCard);
    await wait(400);

    // --- 4. the stack, the minimap and the wordmark shrink into the header ---
    // The originals live inside the camera's transform, and the header does not, so each is
    // replaced by a fixed clone at its exact screen box, and the clones make the flight.
    const slotOf = (name) => document.querySelector(`[data-header-mock] [data-slot="${name}"]`)?.getBoundingClientRect();
    const trueBox = (el, img) => {
      let m = new DOMMatrix(), n = img;
      while (n && n !== document.body) { const t = getComputedStyle(n).transform; if (t && t !== 'none') m = new DOMMatrix(t).multiply(m); n = n.parentElement; }
      const sc = Math.hypot(m.a, m.b), ang = Math.atan2(m.b, m.a) * 180 / Math.PI;
      const r = img.getBoundingClientRect();
      const w = img.offsetWidth * sc, h = img.offsetHeight * sc;
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w, h, ang };
    };
    const FLY = 1700;
    // A card clone is a box holding the art AND its plate, so the name flies with the card and
    // is still there in the header — "I can't tell which card is which if I'm not someone who's
    // familiar with everything." The plate is set in header-sized type from the start.
    const clone = (src, box, radius, plateHtml, topHtml, ghostly = false) => {
      const c = document.createElement('div');
      c.setAttribute('data-flight-clone', '');
      Object.assign(c.style, { position: 'fixed', left: `${box.cx - box.w / 2}px`, top: `${box.cy - box.h / 2}px`,
        width: `${box.w}px`, height: `${box.h}px`, transform: `rotate(${box.ang}deg)`, transformOrigin: 'center center',
        zIndex: '300', pointerEvents: 'none',
        transition: `left ${FLY}ms cubic-bezier(.4,0,.2,1), top ${FLY}ms cubic-bezier(.4,0,.2,1), width ${FLY}ms cubic-bezier(.4,0,.2,1), height ${FLY}ms cubic-bezier(.4,0,.2,1), transform ${FLY}ms cubic-bezier(.4,0,.2,1)` });
      const im = document.createElement('img');
      im.src = src;
      Object.assign(im.style, { display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius,
        boxShadow: '0 12px 32px rgba(0,0,0,0.7)', ...(ghostly ? { filter: 'grayscale(1) brightness(0.9)', opacity: '0.6' } : {}) });
      c.appendChild(im);
      if (plateHtml) {
        const pl = document.createElement('div');
        Object.assign(pl.style, { position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px',
          width: 'max-content', textAlign: 'center', lineHeight: '1.15', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.95)' });
        pl.innerHTML = plateHtml;
        c.appendChild(pl);
      }
      if (topHtml) {
        const pt = document.createElement('div');
        Object.assign(pt.style, { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
          width: 'max-content', textAlign: 'center', lineHeight: '1.15', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.95)' });
        pt.innerHTML = topHtml;
        c.appendChild(pt);
      }
      document.body.appendChild(c);
      return c;
    };
    const flyTo = (c, x, y, w, h, rot) => requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(c.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, transform: `rotate(${rot}deg)` });
    }));

    const stackSlot = slotOf('stack'), mapSlot = slotOf('minimap'), wordSlot = slotOf('wordmark');
    if (stackSlot && mapSlot) {
      const tBox = trueBox(target, target.querySelector('img'));
      const dBox = trueBox(seatFace, seatFace.querySelector('img'));
      const statusWord = st ? (st.prefix || 'Balanced') : '';
      const dClone = clone(seatOwnArt, dBox, '10px',
        `<div style="font-size:19px;font-family:${SERIF};font-weight:400;color:#b4b4bc;letter-spacing:0.06em">${selfHomed ? 'in its own seat' : ('in ' + (seatName || ''))}</div>`,
        null, selfHomed);
      const tClone = clone(fullArt, tBox, '10px',
        `<div style="font-size:19px;font-family:${SERIF};font-weight:400;color:#fde9b0;letter-spacing:0.06em">${cardName}</div>`,
        `<div style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${statusColor};font-family:${SANS}">${statusWord}</div>`);
      dClone.style.zIndex = '299';
      target.style.opacity = '0'; seatEl.style.opacity = '0'; if (ghost) ghost.style.opacity = '0';

      // the minimap, whole
      const hb = holder.getBoundingClientRect();
      const mClone = document.createElement('div');
      mClone.setAttribute('data-flight-clone', '');
      mClone.innerHTML = frameSvg;
      const mSvg = mClone.querySelector('svg');
      if (mSvg) { mSvg.setAttribute('width', '100%'); mSvg.setAttribute('height', '100%'); }
      Object.assign(mClone.style, { position: 'fixed', left: `${hb.left}px`, top: `${hb.top}px`, width: `${hb.width}px`, height: `${hb.height}px`,
        zIndex: '298', pointerEvents: 'none',
        transition: `left ${FLY}ms cubic-bezier(.4,0,.2,1), top ${FLY}ms cubic-bezier(.4,0,.2,1), width ${FLY}ms cubic-bezier(.4,0,.2,1), height ${FLY}ms cubic-bezier(.4,0,.2,1)` });
      document.body.appendChild(mClone);
      holder.style.transition = 'none'; holder.style.opacity = '0';

      // the wordmark, from the middle of the map to the top of the page
      const word = document.querySelector('[data-map-wordmark]');
      let wClone = null;
      if (word && wordSlot) {
        const wb = word.getBoundingClientRect();
        wClone = document.createElement('div');
        wClone.setAttribute('data-flight-clone', '');
        wClone.innerHTML = word.innerHTML;
        // The wordmark's letters carry map-unit font sizes; on screen they are scaled by the
        // camera. The clone starts at that same scale, from the same top-left, so it matches
        // exactly, and the flight is a scale to the slot rather than a jump to full size.
        Object.assign(wClone.style, { position: 'fixed', left: `${wb.left}px`, top: `${wb.top}px`,
          width: `${word.offsetWidth}px`, height: `${word.offsetHeight}px`, whiteSpace: 'nowrap',
          transform: `scale(${cam.z})`, transformOrigin: 'top left', opacity: '0.1',
          zIndex: '301', pointerEvents: 'none',
          transition: `left ${FLY}ms cubic-bezier(.4,0,.2,1), top ${FLY}ms cubic-bezier(.4,0,.2,1), transform ${FLY}ms cubic-bezier(.4,0,.2,1), opacity ${FLY}ms ease` });
        document.body.appendChild(wClone);
        word.style.transition = 'none'; word.style.opacity = '0';
      }

      // the stack in the header: durable upper-left, transient down and to the right, both upright
      const S = Math.min(stackSlot.width * 0.66, stackSlot.height * 0.9);
      // transient LEFT and in front; durable to its right and behind
      flyTo(tClone, stackSlot.left, stackSlot.top, S, S, 0);
      flyTo(dClone, stackSlot.left + S * PEEK_HEADER.x, stackSlot.top + S * PEEK_HEADER.y, S, S, 0);
      const mw = Math.min(mapSlot.width, mapSlot.height * (MINIMAP_W / MINIMAP_H));
      flyTo(mClone, mapSlot.left + (mapSlot.width - mw) / 2, mapSlot.top, mw, mw * (MINIMAP_H / MINIMAP_W), 0);
      if (wClone && wordSlot) {
        const k = Math.min(wordSlot.width / word.offsetWidth, wordSlot.height / word.offsetHeight);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          Object.assign(wClone.style, { left: `${wordSlot.left + (wordSlot.width - word.offsetWidth * k) / 2}px`, top: `${wordSlot.top}px`, transform: `scale(${k})`, opacity: '1' });
        }));
      }
      window.setTimeout(() => sweep(Math.max(0, wordSlot ? wordSlot.top - 30 : 0), (stackSlot.bottom + 60) - (wordSlot ? wordSlot.top - 30 : 0)), FLY - 250);

      await wait(FLY + 1200);
    }
    setLandedLabel(null);
    if (mapEl) mapEl.classList.remove('nkya-animating');

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
