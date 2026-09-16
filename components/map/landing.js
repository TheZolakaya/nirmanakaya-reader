// THE LANDING SEQUENCE.
//
// Lifted intact from the animation bench (app/animation/page.js) on 2026-09-14 so that EZ mode
// and the bench run the SAME sequence. Nothing here draws a card: the caller hands in the pair
// it wants landed (`draws`, keyed by seat: { [seat]: { transient, status } }) and the surface it
// lives on, and the sequence plays the seek, the choosing, the spin, the journey into the seat,
// the dissolve into the minimap and the flight into whatever header carries the slots.
//
// Inputs
//   surface        the [data-map-surface] element the map renders into
//   cameraRef      MapCanvas's camera handle (drive / commit)
//   draws          the pair(s) to land; one entry for a reading, up to 22 on the bench
//   table          what is actually DEALT on the map right now (the bench's Deal 22); empty
//                  when the map is undealt, which is how a reading runs it
//   pace, lift     the seek's rhythm and reach
//   slotsSelector  the element whose [data-slot="wordmark|stack|minimap"] boxes the flight aims at
//
// The whole history of why each beat is the way it is lives in the comments below, in the
// founder's own words wherever a beat came from him. Keep them.

import { STATUS_GLOW, signatureFor } from './TheMap.js';
import { getCardImagePath, getHomeArchetype, getCardType } from '../../lib/cardImages.js';
import { renderToStaticMarkup } from 'react-dom/server';
import Minimap, { MINIMAP_W, MINIMAP_H, minimapPoint, minimapSeatRotation } from '../reader/Minimap';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { STATUSES } from '../../lib/constants.js';

// Puts the map back the way the sequence found it: every card square and lit, every plate,
// flash, ghost, clone and frame gone, hover restored.
export function clearLanding(root = document) {
    root.querySelectorAll('[data-position]').forEach((el) => {
      el.style.transform = ''; el.style.filter = ''; el.style.zIndex = '';
      el.style.willChange = ''; el.style.transition = ''; el.style.opacity = '';
      delete el.dataset.turn;
      const im = el.querySelector('img');
      if (im && im.dataset.prevSrc) { im.src = im.dataset.prevSrc; delete im.dataset.prevSrc; }
      if (el.dataset.sharp) {
        el.style.height = ''; const hst = el.querySelector('.card'); if (hst) hst.style.height = '';
        if (im) ['position', 'left', 'top', 'width', 'height', 'maxWidth', 'maxHeight', 'objectFit', 'transform', 'transformOrigin', 'willChange'].forEach(k => { im.style[k] = ''; });
        const lb = el.querySelector('.card-label'); if (lb) lb.style.display = '';
        delete el.dataset.sharp;
      }
    });
    root.querySelectorAll('[data-flight-clone], [data-plate], [data-flash], [data-ghost]').forEach((el) => el.remove());
    (root.querySelector ? root.querySelector('[data-map-surface]') : null)?.classList.remove('nkya-animating');
    document.querySelectorAll('[data-flight-clone], [data-flash]').forEach((el) => el.remove());
    root.querySelectorAll('.element-bg').forEach((el) => { el.style.opacity = ''; el.style.transition = ''; });
    root.querySelectorAll('[data-map-wordmark]').forEach((el) => { el.style.opacity = ''; el.style.transition = ''; });
    root.querySelectorAll('[data-house-label]').forEach((el) => {
      el.style.transition = ''; el.style.opacity = '';
    });
    root.querySelectorAll('.archetype-group').forEach((el) => { el.style.zIndex = ''; });
    root.querySelectorAll('[data-map-frame]').forEach((el) => el.remove());
}

// THE WORDMARK, at the centre of the map. The founder: "directly beneath the Gestalt house,
// and between the four manifest houses ... right in the middle of those four." The same rainbow
// letters and shimmering tagline as the top of the EZ page, placed inside the camera's transform
// so it pans and zooms with the map as text, crisp at any zoom. Its position is measured from
// the four manifest houses themselves, not stored. Retries until the map has rendered.
export function placeWordmark(surface, tries = 40) {
  const canvas = surface?.firstElementChild;
  const groups = canvas ? [...surface.querySelectorAll('.archetype-group')] : [];
  if (!canvas || groups.length < 5) { if (tries > 0) window.setTimeout(() => placeWordmark(surface, tries - 1), 150); return null; }
  const z = new DOMMatrix(getComputedStyle(canvas).transform).a || 1;
  const cb = canvas.getBoundingClientRect();
  const centre = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - cb.left) / z, y: (r.top + r.height / 2 - cb.top) / z }; };
  const cs = groups.map(centre);
  const manifest = [...cs].sort((a, b) => a.y - b.y).slice(1);   // the Gestalt is the one nearest the top
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
  Object.assign(el.style, { position: 'absolute', left: `${mx}px`, top: `${my}px`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: '1' });
  return el;
}

export async function runLanding({ surface, cameraRef, draws, table = {}, pace = 160, lift = 1.45, slotsSelector = '[data-header-mock]', signal = { skip: false }, flyWordmark = true }) {
    // Hover scales the card too, and fights every transform we write. Off for the duration.
    const mapEl = surface;
    if (mapEl) mapEl.classList.add('nkya-animating');

    const cards = Array.from(surface.querySelectorAll('[data-position]'));
    if (!cards.length) { if (mapEl) mapEl.classList.remove('nkya-animating'); return false; }
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
    const canvas = surface.firstElementChild;
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
    // AN LOD, as the founder put it. Swapping in the big file was not enough: a phone rasterises
    // a card at its LAYOUT size (seventy-odd pixels) and lets the graphics chip stretch that
    // raster six times for the hero shot — "noticeably pixelated". So the hero's image is
    // laid out LARGE, at about the size it will fill on screen, and scaled DOWN inside its card
    // by the same factor. Nothing moves — the card's box is unchanged — but the raster is now
    // taken at hero size and the transform only ever shrinks it.
    const targetPx = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.55, 640);
    const sharpen = (card, K) => {
      // The first cut of this shipped as a STRIP on the founder's iPhone (v0.99.305): the site's
      // base stylesheet gives every image max-width:100%, so the enlarged image kept the card's
      // width while its height went to full size. Lifted here, and the image is sized from its
      // OWN box (the card has padding), placed where it already sits.
      // The map node is a WRAPPER; the box the image sizes is the .card inside it, and that is
      // the box the frame and the plates hang off. v0.99.307 pinned the wrapper and let the
      // .card collapse to nothing (frame a thin outline, names drawn on the face). Pin the .card.
      const img = card.querySelector('img'); if (!img || card.dataset.sharp) return;
      const host = card.querySelector('.card') || card;
      const W = img.offsetWidth, H = img.offsetHeight, L = img.offsetLeft, T = img.offsetTop;
      if (!W || !H || K <= 1) return;
      host.style.height = `${host.offsetHeight}px`;
      Object.assign(img.style, { position: 'absolute', left: `${L}px`, top: `${T}px`, width: `${W * K}px`, height: `${H * K}px`,
        maxWidth: 'none', maxHeight: 'none', objectFit: 'cover', transform: `scale(${1 / K})`, transformOrigin: '0 0', willChange: 'transform' });
      const lb = card.querySelector('.card-label'); if (lb) lb.style.display = 'none';
      card.dataset.sharp = String(K);
    };
    if (heroImg && fullArt && !heroImg.src.endsWith(fullArt)) {
      const pre = new window.Image();
      pre.onload = () => { heroImg.src = fullArt; sharpen(target, targetPx * 1.25 / target.offsetWidth); };
      pre.src = fullArt;
    } else if (heroImg) sharpen(target, targetPx * 1.25 / target.offsetWidth);

    // TAP TO SKIP. Every pause checks the signal; a skip rejects out of the sequence and the
    // caller clears the map and shows the finished header. The camera loops check it too.
    const wait = (ms) => new Promise((r, rej) => setTimeout(() => (signal.skip ? rej(new Error('skipped')) : r()), ms));
    // A phone cannot re-draw a 2134px image scaled six times with a soft shadow on it, three
    // turns a second: the spin flickered and blanked. On narrow screens the hero carries no
    // filter at all and is promoted to its own layer before it moves.
    const mobile = window.innerWidth < 700;

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
      // TEXT AT ITS OWN RESOLUTION. The plate lives inside the card, so it is magnified with it,
      // and iOS rasterises it at map size first — "the name and the transient state are very
      // blurry." Like the art (sharpen), the plate is set K times larger and scaled down by K,
      // anchored at the edge it hangs from, so the raster is taken at hero size.
      const K = parseFloat((el.closest ? el.closest('[data-position]') : null)?.dataset.sharp) || 1;
      const edge = side === 'above'
        ? { bottom: '100%', marginBottom: `${(w * 0.06).toFixed(1)}px`, transformOrigin: 'bottom center' }
        : { top: '100%', marginTop: `${(w * 0.06).toFixed(1)}px`, transformOrigin: 'top center' };
      Object.assign(pl.style, { position: 'absolute', left: '50%', transform: `translateX(-50%) scale(${1 / K})`, ...edge,
        width: 'max-content', maxWidth: `${(w * 2.2 * K).toFixed(0)}px`, textAlign: 'center', willChange: 'transform',
        pointerEvents: 'none', lineHeight: '1.15', textShadow: '0 2px 8px rgba(0,0,0,0.95)', opacity: '0', transition: 'opacity 600ms ease' });
      pl.innerHTML = lines.map(l =>
        `<div style="font-size:${(w * l.size * K).toFixed(1)}px;font-family:${l.font};font-weight:${l.weight};letter-spacing:${l.ls};color:${l.color};text-transform:${l.upper ? 'uppercase' : 'none'};white-space:nowrap">${l.text}</div>`
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
      window.setTimeout(() => { el.style.transition = 'filter 340ms ease'; el.style.filter = 'none'; }, 170);
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
      window.setTimeout(() => { el.style.transform = `scale(1) rotate(${turnOf(el)}deg)`; el.style.filter = 'none'; }, ms * 0.45);
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
      el.style.filter = 'none';
      window.setTimeout(() => { if (el.style.zIndex === '40') el.style.zIndex = ''; }, 500);
    };
    const tick = () => {
      if (!state.alive || signal.skip) return;
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
    const cam = { x: 0, y: 0, vx: 0, vy: 0, z: 0.45, vz: 0 };
    // THE MIDDLE OF THE PICTURE. In EZ the map is a band below the brand block, so the middle
    // of the WINDOW is not the middle of the map — and one loop centring on the window while
    // the other centred on the surface was the "sudden jerk at the end, then it centres it"
    // the founder saw every time. There is one centre now, and everything measures against it.
    const mid = () => { const v = surface.getBoundingClientRect(); return { x: v.left + v.width / 2, y: v.top + v.height / 2 }; };
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

    // THE SPIRAL (the founder's sister, 2026-09-16: "started slowly circling and then broader and
    // broader and then came to what it finds"). The camera follows a point that circles the
    // field's centre, small at first and opening outward, with one change of direction on the
    // way. Because the point is tied to the centre, the field is always in frame when the pull
    // begins — the old lean could wander off the map and then whip across to the card.
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const SPIRAL_R0 = 0.04 * vmin, SPIRAL_R1 = 0.26 * vmin;   // screen px: tight, then wide
    const SPIRAL_TURNS = 2.0;                                   // over the whole drift
    let theta = Math.random() * Math.PI * 2;
    let spin = Math.random() < 0.5 ? -1 : 1;
    const REVERSE_AT = 1700 + Math.random() * 800;    // the one change of mind
    let reversed = false;
    let lastT = Date.now();

    // The hunt's zooms were tuned on a wide screen. On a phone the same numbers show a crop of
    // the field, so they scale with the screen's width; the hero and the landing already size
    // themselves from the viewport and need nothing here.
    const zScale = Math.min(1, Math.max(0.45, window.innerWidth / 760));
    let wantZ = 0.58 * zScale, aimZ = 0.58 * zScale;
    let seek = 0;              // 0 = pure lean, 1 = pure approach

    const camStart = Date.now();
    let raf = 0;
    let arrivedResolve; const arrived = new Promise(r => { arrivedResolve = r; });
    const step = () => {
      const now = Date.now() - camStart;
      // ARRIVAL IS A CONDITION, NOT A TIME. The loop used to stop dead when the clock said so,
      // with the camera still moving and still short of the card, and a separate move then
      // closed the gap — that stop was the jerk. Now, once the clock has run, the approach
      // stiffens smoothly and the loop runs on until the card is centred and the camera still.
      // The stiffening is gentle now (the founder: the stop was "pretty sudden"): a little over
      // double over a second, and the zoom settles alongside the pan instead of after it.
      const over = Math.min(1, Math.max(0, (now - ARRIVE_AT) / 1000));
      const g = 1 + 3.0 * over * over * (3 - 2 * over);

      // --- the spiral: a point circling the field's centre, opening outward; the camera follows ---
      const tNow = Date.now(); const dt = Math.min(50, tNow - lastT); lastT = tNow;
      const df = Math.min(2, Math.max(0.4, dt / 33.3));   // frames of 33ms elapsed since the last step
      if (!reversed && now > REVERSE_AT) { spin = -spin; reversed = true; }
      const pr = Math.min(1, now / DRIFT_UNTIL);
      const grow = pr * pr * (3 - 2 * pr);
      const rad = SPIRAL_R0 + (SPIRAL_R1 - SPIRAL_R0) * grow;
      // the point stops circling when the pull begins — otherwise it keeps dragging the camera
      // round while the approach tries to leave, and the two fight all the way to the card
      if (now < DRIFT_UNTIL) theta += spin * (SPIRAL_TURNS * 2 * Math.PI / DRIFT_UNTIL) * dt;
      const P = { x: home.x + Math.cos(theta) * rad, y: home.y + Math.sin(theta) * rad };
      let leanX = (P.x - cam.x) * 0.10, leanY = (P.y - cam.y) * 0.10;
      const lm = Math.hypot(leanX, leanY), LEAN_MAX = 6.0;
      if (lm > LEAN_MAX) { leanX *= LEAN_MAX / lm; leanY *= LEAN_MAX / lm; }
      if (now < DRIFT_UNTIL + 400 && (Math.floor(now / 100) !== Math.floor((now - dt) / 100))) {
        (window.__huntTrace = window.__huntTrace || []).push([Math.round(now), Math.round(cam.x - home.x), Math.round(cam.y - home.y), +cam.z.toFixed(3)]);
      }

      // --- the approach: a velocity toward the card, capped so it never whips ---
      const to = panToCentre(target);
      // gain and ease are a pair: ease = 4 × gain is critical damping — the camera settles
      // straight onto the card with no overshoot (the founder saw a 'warble' at the end)
      const GAIN = 0.03;
      let sx = (to.x - cam.x) * GAIN * g, sy = (to.y - cam.y) * GAIN * g;
      // the cap grows with the zoom so the MAP moves at one speed whatever the magnification
      const svm = Math.hypot(sx, sy), APPROACH = 5.5 * Math.min(3, Math.max(1, cam.z / (0.62 * zScale)));
      if (svm > APPROACH) { sx *= APPROACH / svm; sy *= APPROACH / svm; }

      // --- and the crossfade between them IS the phase change. Nothing else switches. ---
      // The chosen card leaves the flicker the moment the pull begins, so it sits steady while
      // the camera comes for it rather than being lifted by the shimmer on the way in.
      if (now >= DRIFT_UNTIL && state.pool !== others) state.pool = others;

      const seekAim = now < DRIFT_UNTIL ? 0 : now < GRAVITY_UNTIL ? 0.7 : 1;
      seek += (seekAim - seek) * 0.02 * df;

      if (now < DRIFT_UNTIL) aimZ = (0.58 - 0.12 * grow) * zScale;   // tight at first, opening with the spiral
      else if (now < GRAVITY_UNTIL) aimZ = 0.62 * zScale;
      else aimZ = Z_END;
      wantZ += (aimZ - wantZ) * 0.02 * g * df;   // the pan leads, the zoom follows: zoom multiplies the distance left to pan

      const wantX = leanX * (1 - seek) + sx * seek;
      const wantY = leanY * (1 - seek) + sy * seek;

      // Velocity is EASED toward what is wanted, never set to it. Bounded acceleration is the
      // whole trick: with it, the picture cannot corner even when the wanted heading jumps.
      const ve = Math.min(0.6, 4 * GAIN * g * df);
      cam.vx += (wantX - cam.vx) * ve;
      cam.vy += (wantY - cam.vy) * ve;
      cam.vz += ((wantZ - cam.z) * 0.05 * g - cam.vz) * Math.min(0.6, 0.05 * g * df);

      cam.x += cam.vx * df; cam.y += cam.vy * df; cam.z += cam.vz * df;
      cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);

      if (signal.skip) { cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z); arrivedResolve(); return; }
      const err = Math.hypot(to.x - cam.x, to.y - cam.y), spd = Math.hypot(cam.vx, cam.vy);
      const settled = now >= ARRIVE_AT && err < 1.5 && spd < 0.6 && Math.abs(cam.z - Z_END) < 0.02;
      if (!settled && now < ARRIVE_AT + 3500) raf = requestAnimationFrame(step);
      else { window.__arriveMs = now; cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z); arrivedResolve(); }
    };
    raf = requestAnimationFrame(step);

    // The flight's own clock, for everything that hangs off it.
    const FLIGHT = ARRIVE_AT - GRAVITY_UNTIL;

    // The hero's final scale, solved up front. offsetWidth is the LAYOUT width and ignores
    // transforms; getBoundingClientRect would return the axis-aligned box, inflated by root two
    // for a 45-degree card, which throws the size out differently for every class.
    const layoutW = target.offsetWidth;
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
      target.style.willChange = 'transform';
      target.style.backfaceVisibility = 'hidden';
      target.style.transform = `scale(${heroScale}) rotate(${-seatTilt}deg)`;
      target.style.filter = 'none';   // never a filter on a magnified card (see the note above rise)
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

    await arrived;
    await wait(150);

    // ARRIVAL, MEASURED. The loop above ends on the card being centred; this is the check, and
    // the (rare) recovery if the loop hit its time cap on a very slow device — a driven ease,
    // in the same loop style as everything else, never a separate camera move.
    {
      const hr = target.getBoundingClientRect(), m = mid();
      const ex = m.x - (hr.left + hr.width / 2), ey = m.y - (hr.top + hr.height / 2);
      window.__arriveResidualPx = [Math.round(ex), Math.round(ey)];
      if (Math.hypot(ex, ey) > 1) {
        const x0 = cam.x, y0 = cam.y, t0 = Date.now(), MS = 500;
        await new Promise(done => { const tick = () => {
          const k = Math.min(1, (Date.now() - t0) / MS), e = 1 - Math.pow(1 - k, 3);
          cam.x = x0 + ex * e; cam.y = y0 + ey * e;
          cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);
          if (k < 1 && !signal.skip) requestAnimationFrame(tick); else done();
        }; requestAnimationFrame(tick); });
        cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z);
      }
    }

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
    if (!selfHomed) sharpen(seatEl, 3);
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
    const seatTiltOnly = seatAngle0 - (table[targetId] ? statusRot : 0);
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
    // UNDER THE DURABLE. The diagram used to be centred on the field, which put its glyph for
    // this seat a card's width from the seat itself, and the pair sat visibly off the mark
    // until a drift carried them across during the open-out — "the card is off of the
    // minimap's location by a significant amount." Now the diagram is placed so that its glyph
    // for the seat lies exactly under the durable: the landing IS the mark, and nothing drifts.
    const mp0 = minimapPoint(targetId);
    const fx = mp0 ? pSeat.x - mp0.x * fit : fieldC.x - fw / 2;
    const fy = mp0 ? pSeat.y - mp0.y * fit : fieldC.y - fh / 2;
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

    // THE CARD AND THE CAMERA MOVE IN THE SAME FRAME. The journey used to be a CSS transition,
    // which the phone's graphics layer runs smoothly on its own clock, while the camera following
    // it is this loop, which only moves when the phone gives it a frame. On a busy phone the card
    // outran the camera and left the screen — the founder: "the animation seems to outrun the
    // camera movement." Now the card's position for each frame is set here, and the camera is
    // centred on it in the same frame, so the two cannot separate however slow the device is.
    const startRot = -seatTilt + spinBase + spinStatusRot;
    const endRot = spinBase + seatTiltOnly + statusRot - homeAngle0;
    target.style.transition = 'filter 1200ms ease';
    target.style.filter = 'none';
    const journeyFrame = (e) => {
      target.style.transform =
        `translate(${dx * e}px, ${dy * e}px) scale(${heroScale + (landScale - heroScale) * e}) rotate(${startRot + (endRot - startRot) * e}deg)`;
    };

    const centreOnCard = (gain) => {
      const hr = target.getBoundingClientRect(), m = mid();
      cam.x += (m.x - (hr.left + hr.width / 2)) * gain;
      cam.y += (m.y - (hr.top + hr.height / 2)) * gain;
    };
    const centreOnMap = (cx, cy) => (gain) => {
      const cr = canvas.getBoundingClientRect(), m = mid();
      cam.x += (m.x - (cr.left + cx * cam.z)) * gain;
      cam.y += (m.y - (cr.top + cy * cam.z)) * gain;
    };
    // glide: zoom toward toZ over ms; onFrame(e) places whatever the camera is following; the
    // follow gain is TIME-based (a 140ms lag whatever the frame rate), never per-frame.
    const glide = (toZ, ms, centre = centreOnCard, onFrame = null) => new Promise(done => {
      const fromZ = cam.z, t = Date.now(); let last = t;
      const stepZ = () => {
        const nowT = Date.now(); const dt = Math.min(100, nowT - last); last = nowT;
        const k = Math.min(1, (nowT - t) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cam.z = fromZ + (toZ - fromZ) * e;
        if (onFrame) onFrame(e);
        centre(1 - Math.exp(-dt / 100));
        cameraRef.current?.drive({ x: cam.x, y: cam.y }, cam.z);
        if (signal.skip) { done(); return; }
        if (k < 1) requestAnimationFrame(stepZ);
        else { cameraRef.current?.commit({ x: cam.x, y: cam.y }, cam.z); done(); }
      };
      requestAnimationFrame(stepZ);
    });

    // "the camera's still zoomed way up on it, so you can see what's going on"
    const tightZ = Math.max(0.9, cam.z * 0.70);
    await glide(tightZ, TRAVEL, centreOnCard, journeyFrame);

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
    // the check: the durable's centre against the diagram's glyph for its seat, on screen
    {
      const c = canvas.getBoundingClientRect(), z = new DOMMatrix(getComputedStyle(canvas).transform).a;
      const sr = seatFace.getBoundingClientRect();
      window.__glyphResidualPx = mp0 ? [Math.round(sr.left + sr.width / 2 - (c.left + (fx + mp0.x * fit) * z)), Math.round(sr.top + sr.height / 2 - (c.top + (fy + mp0.y * fit) * z))] : null;
    }
    await wait(400);

    // --- 4. the stack, the minimap and the wordmark shrink into the header ---
    // The originals live inside the camera's transform, and the header does not, so each is
    // replaced by a fixed clone at its exact screen box, and the clones make the flight.
    const slotOf = (name) => document.querySelector(`${slotsSelector} [data-slot="${name}"]`)?.getBoundingClientRect();
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
      // In EZ the brand stays on screen the whole time, so the map's wordmark dims with the
      // field instead of flying up to where a wordmark already is.
      const word = flyWordmark ? document.querySelector('[data-map-wordmark]') : null;
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

      // THE REAL TARGETS. The header renders the transient image, the durable image and the
      // minimap in known places; when they exist (EZ), the clones fly to THOSE boxes, so size
      // and position match by construction. The bench's mock header has only the slots, so
      // the computed layout below stays as the fallback.
      const realBox = (sel) => document.querySelector(`${slotsSelector} ${sel}`)?.getBoundingClientRect() || null;
      const aim = () => {
        const t = realBox('[data-slot="stack"] > div img'), d = realBox('[data-slot="stack"] > img');
        const m = realBox('[data-slot="minimap"] svg') || realBox('[data-slot="minimap"]');
        return (t && d && m && t.width > 10 && d.width > 10) ? { t, d, m } : null;
      };
      const S = Math.min(stackSlot.width * 0.66, stackSlot.height * 0.9);
      const mw = Math.min(mapSlot.width, mapSlot.height * (MINIMAP_W / MINIMAP_H));
      const goals = aim();
      if (goals) {
        flyTo(tClone, goals.t.left, goals.t.top, goals.t.width, goals.t.height, 0);
        flyTo(dClone, goals.d.left, goals.d.top, goals.d.width, goals.d.height, 0);
        flyTo(mClone, goals.m.left, goals.m.top, goals.m.width, goals.m.height, 0);
      } else {
        // transient LEFT and in front; durable to its right and behind
        flyTo(tClone, stackSlot.left, stackSlot.top, S, S, 0);
        flyTo(dClone, stackSlot.left + S * PEEK_HEADER.x, stackSlot.top + S * PEEK_HEADER.y, S, S, 0);
        flyTo(mClone, mapSlot.left + (mapSlot.width - mw) / 2, mapSlot.top, mw, mw * (MINIMAP_H / MINIMAP_W), 0);
      }
      if (wClone && wordSlot) {
        const k = Math.min(wordSlot.width / word.offsetWidth, wordSlot.height / word.offsetHeight);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          Object.assign(wClone.style, { left: `${wordSlot.left + (wordSlot.width - word.offsetWidth * k) / 2}px`, top: `${wordSlot.top}px`, transform: `scale(${k})`, opacity: '1' });
        }));
      }
      window.setTimeout(() => sweep(Math.max(0, wordSlot ? wordSlot.top - 30 : 0), (stackSlot.bottom + 60) - (wordSlot ? wordSlot.top - 30 : 0)), FLY - 250);

      await wait(FLY + 900);

      // SETTLE ONTO THE PAGE. The page can move under a fixed clone between the moment the
      // header was measured and the handoff (a toolbar on a phone, a line arriving above the
      // header) — the founder saw a ten-pixel stutter at the end. So the header is measured
      // AGAIN now, and each clone eases onto the box it will actually be replaced by.
      const fresh = aim();
      if (fresh) {
        const settle = (c, b) => {
          const r = c.getBoundingClientRect();
          const dx = b.left - r.left, dy = b.top - r.top;
          c.style.transition = 'left 260ms ease, top 260ms ease, width 260ms ease, height 260ms ease';
          Object.assign(c.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
          return Math.hypot(dx, dy);
        };
        window.__handoffPx = [settle(tClone, fresh.t), settle(dClone, fresh.d), settle(mClone, fresh.m)].map((v) => +v.toFixed(1));
        await wait(300);
      }
    }
    if (mapEl) mapEl.classList.remove('nkya-animating');
    return true;
}
