'use client';
// components/reader/FeedbackDoor.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02). "did this land?" — landed / partly / not for me,
// and an optional free field. One tap saves (POST /api/reading-feedback); a later tap, or the field, updates the same row. The words on
// screen are DIRECTION_08's, verbatim, and nothing else: no thanks, no prompt, no "you are". The hook holds the state so the two places
// the door shows (after a reading closes, and the small persistent control) are one door — and only one of them shows at a time.
// Fix round (COLDREAD_08_Item1, True 11-02 §2): the field opens only once a choice is made, so no typed word can be left unsaved
// (the SQL keeps verdict not null); a pending text save is flushed, not dropped, when the reading changes; the opened pill closes on
// a tap outside, on Escape, or on its ×; the pill hides while the inline door is on screen (one question at a time).
import { useState, useEffect, useRef, useCallback } from 'react';
import { readingAuth } from '../../lib/supabase';

export const FEEDBACK_CHOICES = [['landed', 'landed'], ['partly', 'partly'], ['not_for_me', 'not for me']];
const QUESTION = 'did this land?';
const PLACEHOLDER = 'anything you want us to know (optional)';
const TEXT_SAVE_MS = 1200;

async function post(readingId, verdict, text) {
  const send = async (force) => fetch('/api/reading-feedback', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...(await readingAuth({ force })) }, body: JSON.stringify({ readingId, verdict, text }) });
  try {
    let r = await send(false);
    if (r.status === 401) r = await send(true);
    return r.ok;
  } catch { return false; }
}

/** One reading's feedback: { readingId, verdict, text, pending, failed, choose(v), setText(t), flush(), inlineVisible, setInlineVisible }.
 *  readingId null = nothing to say it about. onChoose(v) fires on every tap (the page maps it into the reading's own landing mark);
 *  onLoad(v) fires when a verdict this person gave earlier is read back (state only, no write). */
export function useReadingFeedback(readingId, { onChoose, onLoad } = {}) {
  const [verdict, setVerdict] = useState(null);
  const [text, setTextState] = useState('');
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  const live = useRef({ id: readingId, verdict: null, text: '', saved: null, touched: false, timer: null });
  const hooks = useRef({ onChoose, onLoad });
  hooks.current = { onChoose, onLoad };

  useEffect(() => {
    const s = { id: readingId, verdict: null, text: '', saved: null, touched: false, timer: null };
    live.current = s;
    setVerdict(null); setTextState(''); setPending(null); setFailed(false);
    let on = true;
    if (readingId) (async () => { // what this person already said about this reading, so a second visit shows it and a tap updates it
      try {
        const r = await fetch(`/api/reading-feedback?readingId=${encodeURIComponent(readingId)}`, { headers: { ...(await readingAuth()) } });
        const j = await r.json().catch(() => ({}));
        const f = j?.feedback;
        if (!on || !f || s.touched) return;
        s.verdict = f.verdict; s.text = f.text || ''; s.saved = s.text;
        setVerdict(f.verdict); setTextState(s.text);
        hooks.current.onLoad?.(f.verdict);
      } catch { /* the door still works; it just starts empty */ }
    })();
    return () => { // leaving this reading (a new one, or the page): words still waiting on the timer are sent, never dropped
      on = false; clearTimeout(s.timer);
      if (s.id && s.verdict && s.text !== s.saved) post(s.id, s.verdict, s.text);
    };
  }, [readingId]);

  const choose = useCallback(async (v) => {
    const c = live.current; if (!c.id) return;
    c.touched = true; clearTimeout(c.timer);
    const before = c.verdict; c.verdict = v;
    setPending(v); setFailed(false); setVerdict(v);
    hooks.current.onChoose?.(v);
    const t = c.text;
    const ok = await post(c.id, v, t);
    if (live.current !== c) return;
    setPending(null);
    if (ok) c.saved = t;
    else { c.verdict = before; setVerdict(before); setFailed(true); }
  }, []);

  const flush = useCallback(async () => {
    const c = live.current; clearTimeout(c.timer);
    if (!c.id || !c.verdict || c.text === c.saved) return;
    const t = c.text;
    const ok = await post(c.id, c.verdict, t);
    if (live.current !== c) return;
    if (ok) c.saved = t;
    setFailed(!ok);
  }, []);

  const setText = useCallback((t) => {
    const c = live.current; if (!c.verdict) return; // the field is closed until a choice is made (it is disabled on screen too)
    c.touched = true; c.text = t; setTextState(t);
    clearTimeout(c.timer);
    c.timer = setTimeout(() => { flush(); }, TEXT_SAVE_MS);
  }, [flush]);

  return { readingId, verdict, text, pending, failed, choose, setText, flush, inlineVisible, setInlineVisible };
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
  const open = !!fb.verdict; // nothing can be typed before a choice, so nothing typed can be lost
  return (
    <textarea value={fb.text} onChange={(e) => fb.setText(e.target.value)} onBlur={() => fb.flush()} rows={2} maxLength={4000}
      disabled={!open} placeholder={PLACEHOLDER} aria-label={PLACEHOLDER}
      className={`mt-2 w-full resize-y rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2 text-[0.8125rem] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-opacity ${open ? '' : 'opacity-40 cursor-not-allowed'}`} />
  );
}

function Persistent({ fb, lifted }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { flush } = fb;
  const close = useCallback(() => { flush(); setOpen(false); }, [flush]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (box.current && !box.current.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, [open, close]);
  if (fb.inlineVisible) return null; // the door after the reading is on screen: one question at a time
  return (
    <div ref={box} className="fixed left-3 z-40 max-w-[calc(100vw-1.5rem)] transition-[bottom] duration-300"
      style={{ bottom: `calc(${lifted ? '4rem' : '0.75rem'} + env(safe-area-inset-bottom, 0px))` }}>
      {open ? (
        <div className="relative w-[19rem] max-w-full rounded-xl border border-zinc-700/70 bg-zinc-900/95 backdrop-blur-sm p-3 shadow-2xl">
          <button type="button" onClick={close} aria-label="close"
            className="absolute right-1.5 top-1 px-1.5 text-[1rem] leading-none text-zinc-500 hover:text-zinc-200">×</button>
          <div className="text-center text-[0.75rem] tracking-[0.06em] text-emerald-300/80 mb-2 px-5">{QUESTION}</div>
          <Choices fb={fb} />
          <Field fb={fb} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-expanded="false"
          className={`rounded-full border bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 text-[0.75rem] shadow-lg transition-colors ${fb.verdict ? 'border-emerald-500/50 text-emerald-200/90' : 'border-zinc-700/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}>
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
