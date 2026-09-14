'use client';

// /ez — EZ MODE (the discourse layer — v2, 2026-09-14)
// The Reader opens BRIEF: the whole card in a few sentences, the verdict first if there is one,
// then ONE question back. Everything else unfolds in conversation.
//
// Three tiers of affordance, three visual weights (the founder's clutter ruling, 2026-09-14):
//   1. TALKING — pills written from each turn: Build / Push back / Clarify / Stair. No draw, cheap.
//      Unpack and Clarify from the full site are absorbed here: in a conversation they are
//      sentences, not buttons.
//   2. THE FIELD — two switches, Reflect and Forge. Flipping one RE-RENDERS the pills: four
//      questions to put to the field, or four declarations to forge from. Tapping one draws a card.
//   3. SIMPLER — a small link on a turn; re-says that turn plainly. A re-render, not a new turn.
//
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
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

const EZ_VERSION = 'ez-2';

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

WHEN A NEW CARD IS DRAWN (a reflect or a forge): interpret that new card as the field's response — to their inquiry if they reflected, to their declaration if they forged — always in relation to the reading already on the table. The new card is a lens on what they brought, never a replacement for the original reading. Same brevity, same one question at the end.

THE THREE MOVES: under every turn, write three chips FROM THIS TURN (never stock text), each a sentence the person could say next, in their voice:
- build: "Yes, and…" — carries their own thread forward.
- pushback: "No, it's more like…" — the sentence that starts the disagreement. Offer it plainly; a person who would never argue with a machine is being handed the opening.
- clarify: "What do you mean by…" — the term or claim most likely to need it.
Optionally a fourth chip, kind "stair": the next question a wise companion would ask (for example "why am I not inside it?", "what prevents me?", "what is one moment?"). Only when the reading makes one obvious.

TWO MORE SETS, every turn — for when the person wants the FIELD to speak again rather than you:
- "reflect": FOUR QUESTIONS the person could put to the field right now, each drawn from this exact moment in the conversation, in their own voice, under 15 words. A reflect is an inquiry — something they genuinely do not know and want answered.
- "forge": FOUR DECLARATIONS the person could make — what they will do, choose, commit to, or stop — each drawn from this moment, in their voice, under 15 words. A forge is an assertion the field then responds to.
These are never answers to your question. They are what the person would hand to the field. Make them specific to what has actually been said.

ABSOLUTE FORMAT: respond with ONLY a JSON object, no prose outside it:
{"reader": "<your turn, paragraphs separated by blank lines, ending with your one question>", "question": "<that one question, alone>", "chips": [{"kind": "build", "text": "..."}, {"kind": "pushback", "text": "..."}, {"kind": "clarify", "text": "..."}, {"kind": "stair", "text": "..."}], "reflect": ["...", "...", "...", "..."], "forge": ["...", "...", "...", "..."]}`;

const SIMPLER_RULES = `SAY IT SIMPLER — rewrite the turn below in plainer words, for someone who wants it easier to hold. Same meaning, same verdict. Nothing softened, nothing added, nothing dropped. Shorter sentences, kitchen words, no architecture vocabulary except a card's name where it is needed. Keep the one question at the end, rephrased just as plainly. Respond with ONLY a JSON object: {"reader": "<the simpler version>", "question": "<the question, plainly>", "chips": [], "reflect": [], "forge": []}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up card for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the card>", "question": "<the open thread as a question>", "chips": [], "reflect": [], "forge": []}`;

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function drawLabel(d) {
  if (!d) return '';
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
  reflect: 'border-sky-500/50 text-sky-200 hover:bg-sky-900/30',
  forge: 'border-orange-500/50 text-orange-200 hover:bg-orange-900/30',
};
const CHIP_LABEL = { build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair' };

export default function EZPage() {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(null); // null = checking
  const [question, setQuestion] = useState('');
  const [cardCount, setCardCount] = useState(1);
  const [draws, setDraws] = useState(null);
  const [turns, setTurns] = useState([]); // {id, role:'reader'|'you'|'catchup', text, question, chips, reflect, forge, draw, mode, ts}
  const [input, setInput] = useState('');
  const [fieldMode, setFieldMode] = useState(null); // null | 'reflect' | 'forge'
  const [userContext, setUserContext] = useState(''); // history: the journey block the full reader uses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  const endRef = useRef(null);
  const saveTimer = useRef(null);

  // Gate: signed in AND (admin OR ez_enabled flag). Then load the history block.
  useEffect(() => {
    (async () => {
      try {
        const { user: u } = await getUser();
        setUser(u || null);
        let flag = false;
        try { const r = await fetch('/api/feature-flags'); const j = await r.json(); flag = !!j?.flags?.ez_enabled; } catch {}
        setAllowed(!!u && (isAdmin(u) || flag));
        if (u) {
          try {
            const c = await fetch(`/api/user/context?userId=${u.id}`);
            const cj = await c.json();
            if (cj?.contextBlock) setUserContext(cj.contextBlock);
          } catch {}
        }
      } catch { setAllowed(false); }
    })();
  }, []);

  // Persist the discourse with the reading (debounced), same table as every other reading.
  useEffect(() => {
    if (!savedId || turns.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns } }, usage }).catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [turns, savedId, usage]);

  const systemPrompt = `${BASE_SYSTEM}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${EZ_RULES}`;

  const discourseText = useCallback((list) => list.map((t) => {
    if (t.role === 'you') {
      const verb = t.mode === 'reflect' ? 'ASKER REFLECTS (puts a question to the field)'
        : t.mode === 'forge' ? 'ASKER FORGES (declares)' : 'ASKER';
      return `${verb}: "${t.text}"`;
    }
    if (t.role === 'catchup') return '[catch-up card shown]';
    return `READER${t.draw ? ` (on the newly drawn ${drawLabel(t.draw)})` : ''}: ${t.text}`;
  }).join('\n\n'), []);

  const callReader = async (userMessage, system = systemPrompt, maxTokens = 1100) => {
    const res = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system, model: MODEL_IDS.sonnet, max_tokens: maxTokens, userId: user?.id })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.usage) setUsage((u) => ({
      input_tokens: (u.input_tokens || 0) + (data.usage.input_tokens || 0),
      output_tokens: (u.output_tokens || 0) + (data.usage.output_tokens || 0),
      cache_read_input_tokens: (u.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0),
      cache_creation_input_tokens: (u.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0)
    }));
    const obj = parseJson(data.reading);
    if (!obj || !obj.reader) throw new Error('The Reader did not answer in the expected shape. Try again.');
    return { obj, usage: data.usage };
  };

  const readerTurn = (obj, extra = {}) => ({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    role: 'reader',
    text: obj.reader,
    question: obj.question || '',
    chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 4) : [],
    reflect: Array.isArray(obj.reflect) ? obj.reflect.slice(0, 4) : [],
    forge: Array.isArray(obj.forge) ? obj.forge.slice(0, 4) : [],
    ts: Date.now(),
    ...extra
  });

  const scrollToEnd = () => requestAnimationFrame(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80));

  const spreadKeyFor = (n) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : 'five');

  // ---- the opening turn ----
  const begin = async () => {
    const q = sanitizeForAPI(question.trim());
    if (!q) { setError('Ask something first.'); return; }
    setError(''); setLoading(true); setTurns([]); setSavedId(null); setFieldMode(null);
    const newDraws = generateSpread(cardCount);
    setDraws(newDraws);
    try {
      const sk = spreadKeyFor(cardCount);
      const drawText = formatDrawForAI(newDraws, 'discover', sk, false, null, null, null);
      const ctx = userContext ? `${userContext}\n\n` : '';
      const msg = `${ctx}QUESTION: "${q}"\n\nTHE DRAW:\n${drawText}\n\nThis is THE OPENING TURN. Follow EZ MODE exactly. JSON only.`;
      const { obj, usage: u } = await callReader(msg);
      const first = readerTurn(obj);
      setTurns([first]);
      try {
        const { data } = await saveReading({
          question: q, cards: newDraws, letter: null,
          synthesis: { _ez: { version: EZ_VERSION, turns: [first] } },
          mode: 'ez', spreadType: `ez-${sk}`, model: 'sonnet', tokenUsage: u, voice: 'friend'
        });
        if (data?.id) setSavedId(data.id);
      } catch {}
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ---- every later turn; mode null = talk, 'reflect'/'forge' = a card is drawn ----
  const send = async (textIn, modeIn) => {
    const mode = modeIn !== undefined ? modeIn : fieldMode;
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    setError(''); setLoading(true); setInput('');
    const newDraw = mode ? generateSpread(1)[0] : null;
    const you = { id: `y${Date.now()}`, role: 'you', text, mode: mode || null, ts: Date.now() };
    const withYou = [...turns, you];
    setTurns(withYou);
    setFieldMode(null);
    scrollToEnd();
    try {
      const drawText = formatDrawForAI(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const ctx = userContext ? `${userContext}\n\n` : '';
      const newCardBlock = newDraw
        ? `\n\nA NEW CARD WAS DRAWN IN RESPONSE: ${drawLabel(newDraw)}\nInterpret it as the field's answer to what they just ${mode === 'reflect' ? 'asked' : 'declared'}, in relation to the reading already on the table.`
        : '';
      const msg = `${ctx}QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseText(withYou)}${newCardBlock}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      const { obj } = await callReader(msg);
      setTurns((list) => [...list, readerTurn(obj, newDraw ? { draw: newDraw, mode } : {})]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ---- say that again, simpler ----
  const simplify = async (turnId) => {
    if (loading) return;
    const src = turns.find((t) => t.id === turnId);
    if (!src) return;
    setLoading(true); setError('');
    try {
      const msg = `THE TURN TO REWRITE:\n${src.text}\n\n${SIMPLER_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${SIMPLER_RULES}`, 700);
      setTurns((list) => list.map((t) => (t.id === turnId
        ? { ...t, text: obj.reader, question: obj.question || t.question, simplified: true }
        : t)));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ---- where am I ----
  const catchUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError('');
    try {
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' · ')}\n\nTHE DISCOURSE SO FAR:\n${discourseText(turns)}\n\n${CATCHUP_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CATCHUP_RULES}`, 400);
      setTurns((list) => [...list, { id: `c${Date.now()}`, role: 'catchup', text: obj.reader, question: obj.question || '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const reset = () => {
    setDraws(null); setTurns([]); setSavedId(null); setFieldMode(null); setError('');
    setUsage({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  };

  // Sonnet list price: $3/M in, $15/M out; cache reads at 10%, cache writes at 125% of input.
  const estCost = ((usage.input_tokens || 0) * 3 + (usage.cache_read_input_tokens || 0) * 0.3
    + (usage.cache_creation_input_tokens || 0) * 3.75 + (usage.output_tokens || 0) * 15) / 1e6;

  const lastReader = [...turns].reverse().find((t) => t.role === 'reader');

  // The pills re-render with the switch: talk / ask the field / declare to the field.
  const activePills = !lastReader ? []
    : fieldMode === 'reflect' ? (lastReader.reflect || []).map((text) => ({ kind: 'reflect', text }))
      : fieldMode === 'forge' ? (lastReader.forge || []).map((text) => ({ kind: 'forge', text }))
        : (lastReader.chips || []);

  const switchBtn = (mode, label, glyph) => {
    const on = fieldMode === mode;
    const tone = mode === 'reflect'
      ? (on ? 'border-sky-500 bg-sky-900/40 text-sky-200' : 'border-zinc-700 text-zinc-500 hover:text-sky-300 hover:border-sky-700')
      : (on ? 'border-orange-500 bg-orange-900/40 text-orange-200' : 'border-zinc-700 text-zinc-500 hover:text-orange-300 hover:border-orange-700');
    return (
      <button onClick={() => setFieldMode(on ? null : mode)} disabled={loading}
        className={`px-3 py-1.5 rounded-full border text-xs transition-colors disabled:opacity-40 ${tone}`}>
        {glyph} {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-x-hidden">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 overflow-x-hidden">
        <div className="flex items-center justify-between mt-4 mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">EZ mode</span>
          <div className="flex items-center gap-3">
            <TextSizeSlider />
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">full reader →</Link>
          </div>
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
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
              placeholder="Ask it the way you would say it out loud."
              className="w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">cards</span>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setCardCount(n)}
                  className={`w-8 h-8 rounded-full text-sm border ${cardCount === n ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{n}</button>
              ))}
              <button onClick={begin} disabled={loading}
                className="ml-auto px-6 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm font-medium">
                {loading ? 'Drawing…' : 'Ask'}
              </button>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              The Reader opens brief and asks you one question. The reading unfolds from there.
              {userContext ? ' Your recent readings are in the room with you.' : ''}
            </p>
          </div>
        )}

        {allowed && draws && (
          <>
            {/* The original cards: the reference, not the reading */}
            <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-full">
              {draws.map((d, i) => {
                const t = getComponent(d.transient);
                return (
                  <div key={i} className="flex flex-col items-center max-w-full">
                    <CardImage transient={d.transient} status={d.status} cardName={t?.name} size="compact" showFrame={true} />
                    <span className="text-xs text-amber-300/90 mt-1 text-center">{drawLabel(d)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 italic mb-6 text-center break-words">“{question}”</p>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map((t) => (
                <div key={t.id} data-ez-turn={t.id}
                  className={t.role === 'you'
                    ? 'ml-4 sm:ml-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm text-amber-100/90 italic break-words'
                    : t.role === 'catchup'
                      ? 'rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 text-sm text-violet-100 break-words'
                      : 'rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 text-[15px] leading-relaxed text-zinc-200 break-words'}>

                  {t.role === 'catchup' && <div className="text-[10px] uppercase tracking-wider text-violet-300/70 mb-2">Where you are</div>}
                  {t.role === 'you' && t.mode && (
                    <div className={`text-[10px] uppercase tracking-wider mb-2 not-italic ${t.mode === 'reflect' ? 'text-sky-300/80' : 'text-orange-300/80'}`}>
                      {t.mode === 'reflect' ? '↩ Reflecting' : '⚡ Forging'}
                    </div>
                  )}

                  {/* A card drawn in answer to a reflect or a forge */}
                  {t.draw && (
                    <div className="flex flex-col items-center mb-3">
                      <CardImage transient={t.draw.transient} status={t.draw.status} cardName={getComponent(t.draw.transient)?.name} size="compact" showFrame={true} />
                      <span className="text-xs text-amber-300/90 mt-1 text-center">{drawLabel(t.draw)}</span>
                    </div>
                  )}

                  {ensureParagraphBreaks(t.text).split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{p.trim()}</p>
                  ))}

                  {t.role === 'reader' && !t.simplified && !loading && (
                    <button onClick={() => simplify(t.id)}
                      className="mt-2 text-[11px] text-zinc-600 hover:text-zinc-400 underline decoration-dotted">
                      say it simpler
                    </button>
                  )}
                </div>
              ))}
              {loading && <div className="text-xs text-zinc-500 animate-pulse pl-2">the Reader is listening…</div>}
              {error && <div className="text-xs text-red-400 pl-2 break-words">{error}</div>}
              <div ref={endRef} />
            </div>

            {/* Tier 2: the two switches — flipping one re-renders the pills below */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              {switchBtn('reflect', 'Reflect', '↩')}
              {switchBtn('forge', 'Forge', '⚡')}
              {fieldMode && (
                <span className="text-[11px] text-zinc-600">
                  {fieldMode === 'reflect' ? 'ask the field — a card will answer' : 'declare — a card will answer'}
                </span>
              )}
            </div>

            {/* Tier 1: the pills. Talk by default; questions under Reflect; declarations under Forge. */}
            {activePills.length > 0 && !loading && (
              <div className="mt-3 flex flex-col gap-2">
                {activePills.filter((c) => c?.text).map((c, i) => (
                  <button key={i} onClick={() => send(c.text, fieldMode)}
                    className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors break-words ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    {CHIP_LABEL[c.kind] && <span className="text-[10px] uppercase tracking-wider opacity-70 mr-2">{CHIP_LABEL[c.kind]}</span>}
                    {c.text}
                  </button>
                ))}
              </div>
            )}

            {/* Free text always present */}
            <div className="mt-4 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={fieldMode === 'reflect' ? 'Ask the field…' : fieldMode === 'forge' ? 'Declare what you will do…' : 'Answer in your own words…'}
                className="flex-1 min-w-0 rounded-lg bg-zinc-900/70 border border-zinc-700/60 px-3 py-2.5 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm whitespace-nowrap">
                {fieldMode ? 'Draw' : 'Say'}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={catchUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300">Where am I?</button>
              <button onClick={reset} className="underline decoration-dotted hover:text-zinc-300">New question</button>
              <span className="ml-auto font-mono text-zinc-600" title="fresh input / cached input (billed at 10%) / output">
                {(usage.input_tokens || 0).toLocaleString()} + {((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)).toLocaleString()} cached / {(usage.output_tokens || 0).toLocaleString()} out · ~${estCost.toFixed(3)}{savedId ? ' · saved' : ''}
              </span>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
