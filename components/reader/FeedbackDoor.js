'use client';
// components/reader/FeedbackDoor.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02). "did this land?" — landed / partly / not for me,
// and an optional free field. One tap saves (POST /api/reading-feedback); a later tap, or the field, updates the same row. The words on
// screen are DIRECTION_08's, verbatim, and nothing else: no thanks, no prompt, no "you are". The hook holds the state so the two places
// the door shows (after a reading closes, and the small persistent control) are one door — and only one of them shows at a time.
// Fix round (COLDREAD_08_Item1, True 11-02 §2): the field opens only once a choice is made, so no typed word can be left unsaved
// (the SQL keeps verdict not null); a pending text save is flushed, not dropped, when the reading changes; the opened pill closes on
// a tap outside, on Escape, or on its ×; the pill hides while the inline door is on screen (one question at a time).
// Fix round 2: the field waits for a tap that SAVED; the reading's mark follows only a saved tap; waiting words go out on pagehide and
// on a hidden tab; the field is 16px (no iOS zoom); an open panel never vanishes while the inline door scrolls into view.
// Fix round 4: the session header the closing page sends is kept fresh (the load, every token refresh, the tab coming back, typing);
// the field is hidden, not greyed, until a tap has saved; the × has a 44px hit area; the panel closes on a TAP outside, never a scroll;
// the field carries data-feedback-field and is never found by the reader's own focus logic (which now uses a ref to its answer box).
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, readingAuth } from '../../lib/supabase';

export const FEEDBACK_CHOICES = [['landed', 'landed'], ['partly', 'partly'], ['not_for_me', 'not for me']];
const QUESTION = 'did this land?';
const PLACEHOLDER = 'anything you want us to know (optional)';
const TEXT_SAVE_MS = 1200;

let lastAuth = {}; // the freshest session header, kept so a page that is closing can send without awaiting the session
let lastAuthAt = 0;
const keepAuth = (h) => { if (h?.Authorization) { lastAuth = h; lastAuthAt = Date.now(); } return h || {}; };
/** Re-read the session (readingAuth refreshes a token that is about to expire). Cheap; throttled to once per 30 s unless forced. */
const refreshAuth = async (force = false) => { if (!force && Date.now() - lastAuthAt < 30000) return lastAuth; try { return keepAuth(await readingAuth()); } catch { return lastAuth; } };
async function post(readingId, verdict, text) {
  const send = async (force) => { const h = keepAuth(await readingAuth({ force })); return fetch('/api/reading-feedback', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ readingId, verdict, text }) }); };
  try {
    let r = await send(false);
    if (r.status === 401) r = await send(true);
    return r.ok;
  } catch { return false; }
}

/** One reading's feedback: { readingId, verdict, confirmed, text, pending, failed, choose(v), setText(t), flush(), inlineVisible, setInlineVisible }.
 *  readingId null = nothing to say it about. `verdict` is what the buttons show (a tap in flight included); `confirmed` is the verdict the
 *  server has (a tap that saved, or a row read back). onChoose(v) fires only after a tap SAVES (the page maps it into the reading's own
 *  landing mark); onLoad(v) fires when a verdict this person gave earlier is read back (state only, no write). Fix round 2 (COLDREAD_08):
 *  the field opens only on a confirmed verdict; words waiting on the timer go out on pagehide / a hidden tab (keepalive). */
export function useReadingFeedback(readingId, { onChoose, onLoad } = {}) {
  const [verdict, setVerdict] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [text, setTextState] = useState('');
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  // c.verdict = the confirmed verdict (never a tap in flight); c.pending = the tap in flight
  const live = useRef({ id: readingId, verdict: null, pending: null, text: '', saved: null, touched: false, timer: null });
  const hooks = useRef({ onChoose, onLoad });
  hooks.current = { onChoose, onLoad };

  useEffect(() => {
    const s = { id: readingId, verdict: null, pending: null, text: '', saved: null, touched: false, timer: null };
    live.current = s;
    setVerdict(null); setConfirmed(null); setTextState(''); setPending(null); setFailed(false);
    let on = true;
    if (readingId) (async () => { // what this person already said about this reading, so a second visit shows it and a tap updates it
      try {
        const r = await fetch(`/api/reading-feedback?readingId=${encodeURIComponent(readingId)}`, { headers: { ...(await refreshAuth(true)) } }); // the load also fills the closing page's header
        const j = await r.json().catch(() => ({}));
        const f = j?.feedback;
        if (!on || !f || s.touched) return;
        s.verdict = f.verdict; s.text = f.text || ''; s.saved = s.text;
        setVerdict(f.verdict); setConfirmed(f.verdict); setTextState(s.text);
        hooks.current.onLoad?.(f.verdict);
      } catch { /* the door still works; it just starts empty */ }
    })();
    return () => { // leaving this reading (a new one, or the page): words still waiting on the timer are sent, never dropped
      on = false; clearTimeout(s.timer);
      if (s.id && s.verdict && s.text !== s.saved) post(s.id, s.verdict, s.text);
    };
  }, [readingId]);

  useEffect(() => { // the page closing, or the tab going to the background (a phone's usual "close"): send the waiting words now
    const sendNow = () => {
      const c = live.current; clearTimeout(c.timer);
      if (!c.id || !c.verdict || c.pending || c.text === c.saved) return;
      const t = c.text;
      try {
        fetch('/api/reading-feedback', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...lastAuth }, body: JSON.stringify({ readingId: c.id, verdict: c.verdict, text: t }) })
          .then((r) => { if (r.ok && live.current === c) c.saved = t; }).catch(() => {});
      } catch { /* nothing more can be done as the page goes */ }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') sendNow(); else refreshAuth(true); }; // back in view: the header is re-read
    window.addEventListener('pagehide', sendNow);
    document.addEventListener('visibilitychange', onVis);
    let sub = null; // every token refresh (and sign-in) replaces the header the closing page would send; a sign-out clears it
    try { sub = supabase?.auth?.onAuthStateChange((_e, session) => { if (session?.access_token) keepAuth({ Authorization: `Bearer ${session.access_token}` }); else { lastAuth = {}; lastAuthAt = 0; } })?.data?.subscription || null; } catch { sub = null; }
    return () => { window.removeEventListener('pagehide', sendNow); document.removeEventListener('visibilitychange', onVis); try { sub?.unsubscribe(); } catch {} };
  }, []);

  const choose = useCallback(async (v) => {
    const c = live.current; if (!c.id || c.pending) return; // one tap in flight at a time
    c.touched = true; clearTimeout(c.timer);
    c.pending = v;
    setPending(v); setFailed(false); setVerdict(v);
    const t = c.text;
    const ok = await post(c.id, v, t);
    if (live.current !== c) return;
    c.pending = null; setPending(null);
    if (ok) {
      c.verdict = v; c.saved = t; setConfirmed(v);
      hooks.current.onChoose?.(v); // the reading's own mark follows only a saved tap
    } else { setVerdict(c.verdict); setFailed(true); } // the buttons fall back to what the server has; the field stays as it was
  }, []);

  const flush = useCallback(async () => {
    const c = live.current; clearTimeout(c.timer);
    if (!c.id || !c.verdict || c.pending || c.text === c.saved) return;
    const t = c.text;
    const ok = await post(c.id, c.verdict, t);
    if (live.current !== c) return;
    if (ok) c.saved = t;
    setFailed(!ok);
  }, []);

  const setText = useCallback((t) => {
    const c = live.current; if (!c.verdict || c.pending) return; // the field is closed until a tap has SAVED (it is disabled on screen too)
    c.touched = true; c.text = t; setTextState(t);
    refreshAuth(); // typing keeps the closing page's header fresh (throttled to once per 30 s)
    clearTimeout(c.timer);
    c.timer = setTimeout(() => { flush(); }, TEXT_SAVE_MS);
  }, [flush]);

  return { readingId, verdict, confirmed, text, pending, failed, choose, setText, flush, inlineVisible, setInlineVisible };
}

function Choices({ fb }) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${fb.failed ? 'rounded-lg ring-1 ring-rose-500/50' : ''}`}>
      {FEEDBACK_CHOICES.map(([k, label]) => (
        <button key={k} type="button" onClick={() => fb.choose(k)} aria-pressed={fb.verdict === k}
          className={`px-3 py-1.5 rounded-lg border text-[0.8125rem] transition-colors ${fb.pending === k ? 'animate-pulse ' : ''}${fb.verdict === k ? 'border-emerald-400/70 bg-emerald-950/40 text-emerald-100' : 'border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Field({ fb }) {
  if (!fb.confirmed) return null; // hidden until a tap has SAVED: no dead box, and nothing can be typed that has no row to go to
  const open = !fb.pending; // a later tap in flight holds the field still for a moment
  return ( // 16px: below that, iOS Safari zooms the page when the field takes focus
    <textarea data-feedback-field="" value={fb.text} onChange={(e) => fb.setText(e.target.value)} onBlur={() => fb.flush()} rows={2} maxLength={4000}
      disabled={!open} placeholder={PLACEHOLDER} aria-label={PLACEHOLDER}
      className={`mt-2 w-full resize-y rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2 text-[16px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-opacity ${open ? '' : 'opacity-60'}`} />
  );
}

function Persistent({ fb, lifted }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { flush } = fb;
  const close = useCallback(() => { flush(); setOpen(false); }, [flush]);
  useEffect(() => {
    if (!open) return undefined;
    // a TAP outside closes it: down and up outside, with no movement between (a scroll or a drag never closes it)
    let start = null;
    const down = (e) => { start = box.current && !box.current.contains(e.target) ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null; };
    const up = (e) => { const s = start; start = null; if (!s || s.id !== e.pointerId || !box.current || box.current.contains(e.target)) return; if (Math.hypot(e.clientX - s.x, e.clientY - s.y) <= 10) close(); };
    const cancel = () => { start = null; }; // the browser took the gesture for a scroll
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('scroll', cancel, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); document.removeEventListener('scroll', cancel, true); document.removeEventListener('keydown', esc); };
  }, [open, close]);
  if (fb.inlineVisible && !open) return null; // the door after the reading is on screen: one question at a time — but an OPEN panel stays until it is closed (never vanishes mid-typing)
  return (
    <div ref={box} className="fixed left-3 z-40 max-w-[calc(100vw-1.5rem)] transition-[bottom] duration-300"
      style={{ bottom: `calc(${lifted ? '4rem' : '0.75rem'} + env(safe-area-inset-bottom, 0px))` }}>
      {open ? (
        <div className="relative w-[19rem] max-w-full rounded-xl border border-zinc-700/70 bg-zinc-900/95 backdrop-blur-sm p-3 shadow-2xl">
          {/* a 44px hit area; the × itself is the same size and in the same place as before */}
          <button type="button" onClick={close} aria-label="close"
            className="absolute -right-1.5 -top-2.5 flex h-11 w-11 items-start justify-end pr-[18px] pt-3.5 text-[1rem] leading-none text-zinc-500 hover:text-zinc-200">×</button>
          <div className="text-center text-[0.75rem] tracking-[0.06em] text-emerald-300/80 mb-2 px-5">{QUESTION}</div>
          <Choices fb={fb} />
          <Field fb={fb} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-expanded="false"
          className={`rounded-full border bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 text-[0.75rem] shadow-lg transition-colors ${fb.confirmed ? 'border-emerald-500/50 text-emerald-200/90' : 'border-zinc-700/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}>
          {QUESTION}
        </button>
      )}
    </div>
  );
}

function Inline({ fb }) {
  const box = useRef(null);
  const { setInlineVisible } = fb;
  useEffect(() => { // while this door is on screen the pill steps aside
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInlineVisible(true); return () => setInlineVisible(false); }
    const io = new IntersectionObserver(([e]) => setInlineVisible(!!e?.isIntersecting));
    io.observe(el);
    return () => { io.disconnect(); setInlineVisible(false); };
  }, [setInlineVisible]);
  return (
    <div ref={box} className="mt-4 mx-auto max-w-sm text-center">
      <div className="text-[0.75rem] tracking-[0.06em] text-emerald-300/70 mb-2">{QUESTION}</div>
      <Choices fb={fb} />
      <Field fb={fb} />
    </div>
  );
}

/** variant 'inline': after a reading closes, in the flow. variant 'persistent': a small fixed control on the reading screen
 *  (lifted = raise it above the voice bar while that shows); it steps aside while the inline door is on screen. */
export default function FeedbackDoor({ fb, variant = 'inline', lifted = false }) {
  if (!fb?.readingId) return null;
  return variant === 'persistent' ? <Persistent fb={fb} lifted={lifted} /> : <Inline fb={fb} />;
}
