'use client';
// components/reader/FeedbackDoor.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02). "did this land?" — landed / partly / not for me,
// and an optional free field. One tap saves (POST /api/reading-feedback); a later tap, or the field, updates the same row. The words on
// screen are DIRECTION_08's, verbatim, and nothing else: no thanks, no prompt, no "you are". The hook holds the state so the two places
// the door shows (after a reading closes, and the small persistent control) are one door.
import { useState, useEffect, useRef, useCallback } from 'react';
import { readingAuth } from '../../lib/supabase';

export const FEEDBACK_CHOICES = [['landed', 'landed'], ['partly', 'partly'], ['not_for_me', 'not for me']];
const QUESTION = 'did this land?';
const PLACEHOLDER = 'anything you want us to know (optional)';
const TEXT_SAVE_MS = 1200;

/** One reading's feedback: { verdict, text, pending, failed, choose(v), setText(t), flush() }. readingId null = nothing to say it about. */
export function useReadingFeedback(readingId) {
  const [verdict, setVerdict] = useState(null);
  const [text, setTextState] = useState('');
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);
  const live = useRef({ id: readingId, verdict: null, text: '', saved: null, touched: false, timer: null });

  useEffect(() => {
    const s = live.current; clearTimeout(s.timer);
    live.current = { id: readingId, verdict: null, text: '', saved: null, touched: false, timer: null };
    setVerdict(null); setTextState(''); setPending(null); setFailed(false);
    if (!readingId) return undefined;
    let on = true;
    (async () => { // what this person already said about this reading, so a second visit shows it and a tap updates it
      try {
        const r = await fetch(`/api/reading-feedback?readingId=${encodeURIComponent(readingId)}`, { headers: { ...(await readingAuth()) } });
        const j = await r.json().catch(() => ({}));
        const f = j?.feedback; const c = live.current;
        if (!on || !f || c.id !== readingId || c.touched) return;
        c.verdict = f.verdict; c.text = f.text || ''; c.saved = c.text;
        setVerdict(f.verdict); setTextState(c.text);
      } catch { /* the door still works; it just starts empty */ }
    })();
    return () => { on = false; clearTimeout(live.current.timer); };
  }, [readingId]);

  const save = useCallback(async (v, t) => {
    const c = live.current; const id = c.id;
    if (!id || !v) return false;
    try {
      let r = await fetch('/api/reading-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await readingAuth()) }, body: JSON.stringify({ readingId: id, verdict: v, text: t }) });
      if (r.status === 401) r = await fetch('/api/reading-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await readingAuth({ force: true })) }, body: JSON.stringify({ readingId: id, verdict: v, text: t }) });
      if (!r.ok) throw new Error(String(r.status));
      if (live.current.id === id) live.current.saved = t;
      return true;
    } catch { return false; }
  }, []);

  const choose = useCallback(async (v) => {
    const c = live.current; if (!c.id) return;
    c.touched = true; clearTimeout(c.timer);
    const before = c.verdict; c.verdict = v;
    setPending(v); setFailed(false); setVerdict(v);
    const ok = await save(v, c.text);
    if (live.current !== c) return;
    setPending(null);
    if (!ok) { c.verdict = before; setVerdict(before); setFailed(true); }
  }, [save]);

  const flush = useCallback(async () => {
    const c = live.current; clearTimeout(c.timer);
    if (!c.verdict || c.text === c.saved) return;
    const ok = await save(c.verdict, c.text);
    if (live.current === c) setFailed(!ok);
  }, [save]);

  const setText = useCallback((t) => {
    const c = live.current; c.touched = true; c.text = t; setTextState(t);
    clearTimeout(c.timer);
    if (c.verdict) c.timer = setTimeout(() => { flush(); }, TEXT_SAVE_MS); // before a choice the words wait, and ride with the tap
  }, [flush]);

  return { readingId, verdict, text, pending, failed, choose, setText, flush };
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
  return (
    <textarea value={fb.text} onChange={(e) => fb.setText(e.target.value)} onBlur={() => fb.flush()} rows={2} maxLength={4000}
      placeholder={PLACEHOLDER} aria-label={PLACEHOLDER}
      className="mt-2 w-full resize-y rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2 text-[0.8125rem] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none" />
  );
}

/** variant 'inline': after a reading closes, in the flow. variant 'persistent': a small fixed control on the reading screen
 *  (lifted = raise it above the voice bar while that shows). */
export default function FeedbackDoor({ fb, variant = 'inline', lifted = false }) {
  const [open, setOpen] = useState(false);
  if (!fb?.readingId) return null;
  if (variant === 'persistent') {
    return (
      <div className="fixed left-3 z-40 max-w-[calc(100vw-1.5rem)] transition-[bottom] duration-300"
        style={{ bottom: `calc(${lifted ? '4rem' : '0.75rem'} + env(safe-area-inset-bottom, 0px))` }}>
        {open ? (
          <div className="w-[19rem] max-w-full rounded-xl border border-zinc-700/70 bg-zinc-900/95 backdrop-blur-sm p-3 shadow-2xl">
            <button type="button" onClick={() => { fb.flush(); setOpen(false); }} aria-expanded="true"
              className="block w-full text-center text-[0.75rem] tracking-[0.06em] text-emerald-300/80 hover:text-emerald-200 mb-2">{QUESTION}</button>
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
  return (
    <div className="mt-4 mx-auto max-w-sm text-center">
      <div className="text-[0.75rem] tracking-[0.06em] text-emerald-300/70 mb-2">{QUESTION}</div>
      <Choices fb={fb} />
      <Field fb={fb} />
    </div>
  );
}
