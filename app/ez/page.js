'use client';

// /ez — EZ MODE (the discourse layer, shell v1 — 2026-09-13)
// The Reader opens BRIEF: the whole card in a few sentences, the verdict first if there is one,
// then ONE question back. Everything else unfolds in conversation. Three moves under every turn
// (Build / Push back / Clarify) plus a stair when the reading makes one obvious. One surface.
// Gated: signed-in admins, or the ez_enabled feature flag. Production reading page untouched.
// Requirements: REQUIREMENTS_The_Discourse_Layer_EZ_Mode_2026-09-13.md (Hybrid + shelf).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { STATUSES } from '../../lib/constants';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent } from '../../lib/corrections';
import { generateSpread, formatDrawForAI, sanitizeForAPI, ensureParagraphBreaks } from '../../lib/utils';
import { BASE_SYSTEM } from '../../lib/prompts';
import { buildPersonaPrompt } from '../../lib/personas';
import { MODEL_IDS } from '../../lib/modelConfig';
import { getUser, isAdmin, saveReading, updateReadingContent } from '../../lib/supabase';
import CardImage from '../../components/reader/CardImage';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

const EZ_VERSION = 'ez-shell-1';

// The EZ rules ride AFTER the base system (covenant + laws) so the Reader keeps every law it has.
const EZ_RULES = `EZ MODE — THE DISCOURSE LAYER. You are opening a conversation, not delivering a document.

THE OPENING TURN (first reply only):
- For each card drawn: two or three sentences in your own voice that carry the WHOLE card — what it does, in this seat, in this status, for this question. All of it folded together; never a dimension withheld, never four readings stacked.
- One sentence tying the cards to the question.
- If the reading amounts to a verdict on the question (yes / no / not yet / not as it stands), that verdict is the FIRST sentence, plainly. Brief never means softened.
- Hard cap: 150 words for one or two cards, 220 for three or more.
- Then exactly ONE question back to the person, aimed at them, drawn from the reading. Not a menu.

EVERY LATER TURN:
- Respond to what they just said, briefly (under 120 words). Build on their thread; catch a deflection when you see one; return the choice to them.
- The cards, statuses, and any verdict never change. You may change the interpretation and the conversation; you may not bend the field.
- End with exactly ONE question.

THE THREE MOVES: under every turn, write three chips FROM THIS TURN (never stock text), each a sentence the person could say next, in their voice:
- build: "Yes, and…" — carries their own thread forward.
- pushback: "No, it's more like…" — the sentence that starts the disagreement. Offer it plainly; a person who would never argue with a machine is being handed the opening.
- clarify: "What do you mean by…" — the term or claim most likely to need it.
Optionally a fourth chip, kind "stair": the next question a wise companion would ask (for example "why am I not inside it?", "what prevents me?", "what is one moment?"). Only when the reading makes one obvious.

ABSOLUTE FORMAT: respond with ONLY a JSON object, no prose outside it:
{"reader": "<your turn, paragraphs separated by blank lines, ending with your one question>", "question": "<that one question, alone>", "chips": [{"kind": "build", "text": "..."}, {"kind": "pushback", "text": "..."}, {"kind": "clarify", "text": "..."}, {"kind": "stair", "text": "..."}]}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up card for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the card>", "question": "<the open thread as a question>", "chips": []}`;

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function drawLabel(d) {
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

const CHIP_STYLE = {
  build: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30',
  pushback: 'border-orange-500/40 text-orange-200 hover:bg-orange-900/30',
  clarify: 'border-sky-500/40 text-sky-200 hover:bg-sky-900/30',
  stair: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/30',
};
const CHIP_LABEL = { build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair' };

export default function EZPage() {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(null); // null = checking
  const [question, setQuestion] = useState('');
  const [cardCount, setCardCount] = useState(1);
  const [draws, setDraws] = useState(null);
  const [turns, setTurns] = useState([]); // {id, role: 'reader'|'you'|'catchup', text, question, chips, ts}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0 });
  const endRef = useRef(null);
  const saveTimer = useRef(null);

  // Gate: signed in AND (admin OR ez_enabled flag)
  useEffect(() => {
    (async () => {
      try {
        const { user: u } = await getUser();
        setUser(u || null);
        let flag = false;
        try { const r = await fetch('/api/feature-flags'); const j = await r.json(); flag = !!j?.flags?.ez_enabled; } catch {}
        setAllowed(!!u && (isAdmin(u) || flag));
      } catch { setAllowed(false); }
    })();
  }, []);

  // Persist the discourse with the reading (debounced), same table as every other reading.
  useEffect(() => {
    if (!savedId || turns.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns } }, usage })
        .catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [turns, savedId, usage]);

  const systemPrompt = `${BASE_SYSTEM}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${EZ_RULES}`;

  const discourseText = useCallback((list) => list.map(t =>
    t.role === 'you' ? `ASKER: "${t.text}"` : t.role === 'catchup' ? `[catch-up card shown]` : `READER: ${t.text}`
  ).join('\n\n'), []);

  const callReader = async (userMessage, system = systemPrompt, maxTokens = 900) => {
    const res = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system, model: MODEL_IDS.sonnet, max_tokens: maxTokens, userId: user?.id })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.usage) setUsage(u => ({ input_tokens: (u.input_tokens || 0) + (data.usage.input_tokens || 0), output_tokens: (u.output_tokens || 0) + (data.usage.output_tokens || 0) }));
    const obj = parseJson(data.reading);
    if (!obj || !obj.reader) throw new Error('The Reader did not answer in the expected shape. Try again.');
    return { obj, usage: data.usage };
  };

  const scrollToEnd = () => requestAnimationFrame(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80));

  // Opening turn
  const begin = async () => {
    const q = sanitizeForAPI(question.trim());
    if (!q) { setError('Ask something first.'); return; }
    setError(''); setLoading(true); setTurns([]); setSavedId(null);
    const newDraws = generateSpread(cardCount);
    setDraws(newDraws);
    try {
      const spreadKey = cardCount === 1 ? 'one' : cardCount === 2 ? 'two' : cardCount === 3 ? 'three' : cardCount === 4 ? 'four' : 'five';
      const drawText = formatDrawForAI(newDraws, 'discover', spreadKey, false, null, null, null);
      const msg = `QUESTION: "${q}"\n\nTHE DRAW:\n${drawText}\n\nThis is THE OPENING TURN. Follow EZ MODE exactly. JSON only.`;
      const { obj, usage: u } = await callReader(msg);
      const first = { id: `t${Date.now()}`, role: 'reader', text: obj.reader, question: obj.question || '', chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 4) : [], ts: Date.now() };
      setTurns([first]);
      // Save as a reading in the same table; shows in the reading room with mode 'ez'
      try {
        const { data } = await saveReading({ question: q, cards: newDraws, letter: null, synthesis: { _ez: { version: EZ_VERSION, turns: [first] } }, mode: 'ez', spreadType: `ez-${spreadKey}`, model: 'sonnet', tokenUsage: u, voice: 'friend' });
        if (data?.id) setSavedId(data.id);
      } catch {}
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Every later turn
  const send = async (textIn) => {
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    setError(''); setLoading(true); setInput('');
    const you = { id: `t${Date.now()}`, role: 'you', text, ts: Date.now() };
    const withYou = [...turns, you];
    setTurns(withYou);
    scrollToEnd();
    try {
      const spreadKey = draws.length === 1 ? 'one' : draws.length === 2 ? 'two' : 'three';
      const drawText = formatDrawForAI(draws, 'discover', spreadKey, false, null, null, null);
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseText(withYou)}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      const { obj } = await callReader(msg);
      setTurns(list => [...list, { id: `t${Date.now()}b`, role: 'reader', text: obj.reader, question: obj.question || '', chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 4) : [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Where am I
  const catchUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError('');
    try {
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' · ')}\n\nTHE DISCOURSE SO FAR:\n${discourseText(turns)}\n\n${CATCHUP_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CATCHUP_RULES}`, 400);
      setTurns(list => [...list, { id: `t${Date.now()}c`, role: 'catchup', text: obj.reader, question: obj.question || '', chips: [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const reset = () => { setDraws(null); setTurns([]); setSavedId(null); setUsage({ input_tokens: 0, output_tokens: 0 }); setError(''); };

  const lastReader = [...turns].reverse().find(t => t.role === 'reader');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between mt-4 mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">EZ mode · shell</span>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">full reader →</Link>
        </div>

        {allowed === null && <p className="text-zinc-500 text-sm">Checking the door…</p>}
        {allowed === false && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
            <p className="mb-2">EZ mode is invite-only while it is being built.</p>
            <p className="text-zinc-500">{user ? 'Your account is not on the list yet.' : 'Sign in on the main page first.'}</p>
          </div>
        )}

        {allowed && !draws && (
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">Your question</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
              placeholder="Ask it the way you would say it out loud."
              className="w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">cards</span>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setCardCount(n)}
                  className={`w-8 h-8 rounded-full text-sm border ${cardCount === n ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{n}</button>
              ))}
              <button onClick={begin} disabled={loading}
                className="ml-auto px-6 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm font-medium">
                {loading ? 'Drawing…' : 'Ask'}
              </button>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">The Reader opens brief and asks you one question. The reading unfolds from there. One card is the default; the cards never change once drawn.</p>
          </div>
        )}

        {allowed && draws && (
          <>
            {/* The cards: the reference, not the reading */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {draws.map((d, i) => {
                const t = getComponent(d.transient);
                return (
                  <div key={i} className="flex flex-col items-center">
                    <CardImage transient={d.transient} status={d.status} cardName={t?.name} size="compact" showFrame={true} />
                    <span className="text-xs text-amber-300/90 mt-1">{drawLabel(d)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 italic mb-6 text-center">“{question}”</p>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map(t => (
                <div key={t.id} data-ez-turn={t.id}
                  className={t.role === 'you'
                    ? 'ml-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm text-amber-100/90 italic'
                    : t.role === 'catchup'
                      ? 'rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 text-sm text-violet-100'
                      : 'rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 text-[15px] leading-relaxed text-zinc-200'}>
                  {t.role === 'catchup' && <div className="text-[10px] uppercase tracking-wider text-violet-300/70 mb-2">Where you are</div>}
                  {ensureParagraphBreaks(t.text).split(/\n\n+/).filter(p => p.trim()).map((p, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">{p.trim()}</p>
                  ))}
                </div>
              ))}
              {loading && <div className="text-xs text-zinc-500 animate-pulse pl-2">the Reader is listening…</div>}
              {error && <div className="text-xs text-red-400 pl-2">{error}</div>}
              <div ref={endRef} />
            </div>

            {/* The three moves + stair, from the last Reader turn */}
            {lastReader?.chips?.length > 0 && !loading && (
              <div className="mt-4 flex flex-col gap-2">
                {lastReader.chips.filter(c => c?.text).map((c, i) => (
                  <button key={i} onClick={() => send(c.text)}
                    className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    <span className="text-[10px] uppercase tracking-wider opacity-70 mr-2">{CHIP_LABEL[c.kind] || c.kind}</span>{c.text}
                  </button>
                ))}
              </div>
            )}

            {/* Free text always present */}
            <div className="mt-4 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={lastReader?.question ? 'Answer in your own words…' : 'Say what you see…'}
                className="flex-1 rounded-lg bg-zinc-900/70 border border-zinc-700/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm">Say</button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={catchUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300">Where am I?</button>
              <button onClick={reset} className="underline decoration-dotted hover:text-zinc-300">New question</button>
              <span className="ml-auto font-mono text-zinc-600">{(usage.input_tokens || 0).toLocaleString()} in / {(usage.output_tokens || 0).toLocaleString()} out{savedId ? ' · saved' : ''}</span>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
