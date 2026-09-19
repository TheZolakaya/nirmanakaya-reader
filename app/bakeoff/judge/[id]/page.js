'use client';
// app/bakeoff/judge/[id]/page.js — THE PER-SECTION CHOOSER (addendum 4 §2–3).
// A judge (a person: the founder, family, friends) opens /bakeoff/judge/<batchId>?code=XXXXXX,
// gives a short name, and walks the batch run by run, section by section: the draw's pictures at
// the top, then the opening pair (blind, lettered, its own shuffle), pick + tags; then the meaning;
// the moon; the mechanism; the dragon; the step. Each section is its own vote. Ties allowed.
// Names reveal per run only after all six sections are judged. Progress is saved on the server,
// so a judge can leave and come back. No account; nothing else is reachable from here.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ARCHETYPES } from '../../../../lib/archetypes';
import { getComponent } from '../../../../lib/corrections';
import CardImage from '../../../../components/reader/CardImage';

const TAGS = ['truer', 'prettier', 'warmer', 'flat', 'preachy', 'makes me feel seen', 'makes me feel angry', 'too much', 'too little'];
const glass = (t) => String(t || '').replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"').replace(/[–—―]/g, '—').replace(/…/g, '...').replace(/[   ]/g, ' ').replace(/[ \t]+\n/g, '\n');
const cents = (usd) => `${((usd || 0) * 100).toFixed(2)}¢`;

export default function JudgePage() {
  const { id } = useParams();
  const params = useSearchParams();
  const code = (params.get('code') || '').toUpperCase();
  const [judge, setJudge] = useState('');
  const [nameIn, setNameIn] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [runIdx, setRunIdx] = useState(null);     // run.i being judged
  const [tags, setTags] = useState({});           // `${letter}|${tag}` → true
  const [note, setNote] = useState('');
  const [reveal, setReveal] = useState(null);     // the revealed run after its sixth vote

  useEffect(() => { try { const n = localStorage.getItem('nkya_bakeoff_judge'); if (n) { setJudge(n); setNameIn(n); } } catch {} }, []);

  const load = useCallback(async (j) => {
    setError('');
    try {
      const res = await fetch(`/api/bakeoff/judge?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}&judge=${encodeURIComponent(j || '')}`);
      const d = await res.json(); if (!res.ok || d.error) throw new Error(d.error || `HTTP ${res.status}`);
      setData(d);
    } catch (e) { setError(e.message); }
  }, [id, code]);
  useEffect(() => { load(judge); }, [judge, load]);
  // while the batch is still being generated, refresh every few seconds
  useEffect(() => { if (data?.view?.status && data.view.status !== 'done' && data.view.status !== 'error') { const t = setInterval(() => load(judge), 5000); return () => clearInterval(t); } }, [data?.view?.status, judge, load]);

  const sections = data?.sections || [];
  const runs = data?.view?.runs || [];
  const judged = data?.judged || {};
  // the first run with an unjudged generated section
  const nextRun = useMemo(() => runs.find((r) => sections.some((s) => r.sections[s.id] && !judged[`${r.i}:${s.id}`])) || null, [runs, sections, judged]);
  const run = runs.find((r) => r.i === runIdx) || nextRun;
  const section = run ? sections.find((s) => run.sections[s.id] && !judged[`${run.i}:${s.id}`]) : null;
  const doneCount = Object.keys(judged).length;
  const totalCount = runs.reduce((n, r) => n + Object.keys(r.sections).length, 0);

  const begin = () => { const n = nameIn.trim(); if (!n) return; try { localStorage.setItem('nkya_bakeoff_judge', n); } catch {} setJudge(n); };

  const vote = async (pick, strength = 1) => {
    if (!run || !section || busy) return;
    setBusy(true); setError('');
    const tagMap = {}; for (const k of Object.keys(tags)) { if (!tags[k]) continue; const [letter, t] = k.split('|'); (tagMap[letter] = tagMap[letter] || []).push(t); }
    try {
      const res = await fetch('/api/bakeoff/judge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, code, judge, run: run.i, section: section.id, pick, strength, tags: tagMap, note }) });
      const d = await res.json(); if (!res.ok || d.error) throw new Error(d.error || `HTTP ${res.status}`);
      setTags({}); setNote('');
      setData((old) => ({ ...old, judged: d.judged }));
      if (d.runRevealed) { setReveal(d.reveal); setRunIdx(run.i); }
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const nextAfterReveal = () => { setReveal(null); setRunIdx(null); load(judge); };

  if (!code) return <main className="p-6 font-sans text-zinc-200 bg-zinc-950 min-h-screen">This judge link is missing its code. Ask for the full link.</main>;
  if (error && !data) return <main className="p-6 font-sans text-zinc-200 bg-zinc-950 min-h-screen">{error}</main>;
  if (!judge) return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 font-sans p-6 flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl text-amber-300">Which reading is better?</h1>
      <p className="text-zinc-400 max-w-md text-center">You&apos;ll see two versions of the same reading, side by side, one section at a time. Tap the one that lands better. Nothing about who wrote which is shown until you&apos;ve judged a whole reading. There are no wrong answers; your feeling is the data.</p>
      <input value={nameIn} onChange={(e) => setNameIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && begin()} placeholder="your first name" className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-lg" />
      <button onClick={begin} className="px-5 py-2 rounded bg-amber-500 text-black text-lg">Start</button>
    </main>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 font-sans p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-zinc-500">
        <span className="text-amber-300 text-lg">Which reading is better?</span>
        <span>judge: {judge}</span>
        <span>{doneCount} of {totalCount} sections judged</span>
        {data?.view?.status !== 'done' && <span className="text-amber-400">the batch is still being written ({data?.view?.status})…</span>}
        {error && <span className="text-rose-400">{error}</span>}
      </header>

      {reveal ? (
        <section className="space-y-3">
          <h2 className="text-xl text-emerald-300">Reading {reveal.i} judged — here is who wrote what</h2>
          <p className="text-zinc-400">&quot;{reveal.question}&quot; · {reveal.drawLabel}</p>
          {sections.map((s) => { const sec = reveal.sections[s.id]; if (!sec) return null; const j = judged[`${reveal.i}:${s.id}`]; return (
            <div key={s.id} className="border border-zinc-800 rounded p-3">
              <div className="text-zinc-400 mb-1">{s.label} — you picked <b className="text-amber-300">{j?.pick === 'tie' ? 'about the same' : j?.pick}{j?.strength === 2 ? ' (strongly)' : ''}</b></div>
              <div className="flex flex-wrap gap-4 text-sm">{sec.rows.map((r) => <span key={r.letter}><b className="text-amber-300">{r.letter}</b> = {r.label} <span className="text-zinc-500">· {cents(r.cost)} · {r.words} words{r.flags?.length ? ` · ${r.flags.join(', ')}` : ''}</span></span>)}</div>
            </div>); })}
          <button onClick={nextAfterReveal} className="px-5 py-2 rounded bg-amber-500 text-black">Next reading</button>
        </section>
      ) : !run || !section ? (
        <section className="text-center py-12 space-y-2">
          <div className="text-xl text-emerald-300">{totalCount && doneCount >= totalCount ? 'All judged. Thank you.' : 'Nothing to judge yet — the batch is still being written.'}</div>
          <div className="text-zinc-500">{doneCount} sections judged</div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex flex-col items-center">
              <CardImage transient={run.draw.transient} status={run.draw.status} cardName={getComponent(run.draw.transient)?.name || ''} size="compact" showFrame={true} />
              <span className="mt-1 text-xs text-zinc-300">{getComponent(run.draw.transient)?.name}</span>
            </div>
            <span className="text-zinc-600 text-xl">in</span>
            <div className="flex flex-col items-center">
              <CardImage transient={run.draw.position} status={1} cardName={ARCHETYPES[run.draw.position]?.name || ''} size="compact" showFrame={true} />
              <span className="mt-1 text-xs text-zinc-300">{ARCHETYPES[run.draw.position]?.name}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500 text-sm">reading {run.i} of {runs.length} · {run.drawLabel}</div>
            <div className="text-lg text-zinc-100">&quot;{run.question}&quot;</div>
            <div className="text-amber-300 mt-1 uppercase tracking-wider text-sm">{section.label}</div>
            <div className="text-zinc-600 text-xs">{sections.map((s) => <span key={s.id} className={`mx-1 ${judged[`${run.i}:${s.id}`] ? 'text-emerald-500' : s.id === section.id ? 'text-amber-300' : ''}`}>{s.label}</span>)}</div>
          </div>

          {run.sections[section.id].error ? <div className="text-rose-400 text-center">{run.sections[section.id].error}</div> : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(run.sections[section.id].rows.length, 3)}, minmax(0, 1fr))` }}>
              {run.sections[section.id].rows.map((r) => (
                <div key={r.letter} className="border border-zinc-800 rounded p-3 space-y-2">
                  <div className="text-2xl text-amber-300">{r.letter}</div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-100">{glass(r.prose || r.text)}</p>
                  {r.parsed?.medicine && <p className="italic text-amber-200/80 whitespace-pre-wrap text-[15px]">{glass(r.parsed.medicine)}</p>}
                  {r.parsed?.question && <p className="text-sky-200/80 text-[15px]">{glass(r.parsed.question)}</p>}
                  {section.id === 'opening' && r.parsed?.chips?.length > 0 && <details className="text-xs text-zinc-500"><summary>what you could say next</summary><ul className="mt-1 space-y-1">{r.parsed.chips.map((c, i) => <li key={i}>{c.text}</li>)}</ul></details>}
                  <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-1">{TAGS.map((t) => { const k = `${r.letter}|${t}`; return <button key={t} onClick={() => setTags({ ...tags, [k]: !tags[k] })} className={`px-1.5 py-0.5 rounded border text-[11px] ${tags[k] ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-500'}`}>{t}</button>; })}</div>
                  {run.sections[section.id].rows.length !== 2 && <div className="flex gap-2"><button onClick={() => vote(r.letter, 1)} disabled={busy} className="px-3 py-1 rounded bg-zinc-200 text-black">this one</button><button onClick={() => vote(r.letter, 2)} disabled={busy} className="px-3 py-1 rounded bg-amber-300 text-black font-semibold">strongly</button></div>}
                </div>
              ))}
            </div>
          )}

          {run.sections[section.id].rows?.length === 2 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-2">
              <span className="text-amber-300 font-semibold mr-1">A</span>
              <button onClick={() => vote('A', 2)} disabled={busy} className="px-3 py-2 rounded border border-amber-400 bg-amber-950/40 text-amber-100 font-semibold">◀ Strongly</button>
              <button onClick={() => vote('A', 1)} disabled={busy} className="px-3 py-2 rounded border border-amber-600/60 text-amber-200">◀ Prefer</button>
              <button onClick={() => vote('tie', 1)} disabled={busy} className="px-3 py-2 rounded border border-zinc-600 text-zinc-300">About the same</button>
              <button onClick={() => vote('B', 1)} disabled={busy} className="px-3 py-2 rounded border border-amber-600/60 text-amber-200">Prefer ▶</button>
              <button onClick={() => vote('B', 2)} disabled={busy} className="px-3 py-2 rounded border border-amber-400 bg-amber-950/40 text-amber-100 font-semibold">Strongly ▶</button>
              <span className="text-amber-300 font-semibold ml-1">B</span>
            </div>
          )}
          {run.sections[section.id].rows?.length > 2 && <div className="text-center"><button onClick={() => vote('tie', 1)} disabled={busy} className="px-3 py-1 rounded border border-zinc-600 text-zinc-300">can&apos;t decide</button></div>}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a note, if you want (optional)" className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm" />
          <p className="text-zinc-600 text-xs text-center">The feelings under each column are optional and are saved with your pick. Who wrote which is shown after all six sections of this reading.</p>
        </section>
      )}
    </main>
  );
}
