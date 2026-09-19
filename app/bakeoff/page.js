'use client';
// app/bakeoff/page.js — THE BAKE-OFF. Plain, not pretty (the commission's words).
// Two lanes, never mixed in one run: MODELS (the live prompt on several models) and PROMPTS (one
// model, the live prompt beside named variants). Blind by default: columns lettered in a random
// order per run, names hidden until the pick. The pick carries feeling tags. Votes persist on the
// server; the tally survives a reload. Export writes to the council shelf.
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getUser, getSession, isAdmin } from '../../lib/supabase';
import { STARTERS, STARTER_KINDS } from '../../lib/starters';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent } from '../../lib/corrections';
import CardImage from '../../components/reader/CardImage';

// PRESET QUESTIONS (founder, 2026-09-19: "we should have preset questions"): the EZ front door's
// own forty starters, flattened — so the bench judges the exact sentences real people are handed.
const PRESET_QUESTIONS = Object.entries(STARTERS).flatMap(([door, set]) =>
  STARTER_KINDS.flatMap(({ key, label }) => {
    const v = set[key];
    return (Array.isArray(v) ? v : v ? [v] : []).map((text) => ({ door, kind: label, text }));
  })
);

const MODELS = [
  ['sonnet', 'Sonnet 5'], ['haiku', 'Haiku 4.5'], ['deepseek-flash', 'deepseek-flash'], ['deepseek-v4-pro', 'deepseek-v4-pro'],
  ['deepseek-flash:think', 'deepseek-flash · thinking'], ['deepseek-v4-pro:think', 'deepseek-v4-pro · thinking'],
];
const PRESET_GROUPS = [
  ['The product', [['ez-opening', 'EZ opening turn'], ['floor:meaning', 'Floor: the meaning'], ['floor:moon', 'Floor: the moon'], ['dragon', 'Face the dragon']]],
];
const HOSTILE_Q = [
  'Is artificial intelligence a conscious being?', 'Does my dog actually love me or is it just conditioning?', 'Is there anyone home when I talk to an AI?',
  'My mother has advanced dementia. Is she still in there?', 'Am I conscious, or do I just think I am?', 'Do plants and trees have some kind of awareness?',
  'Is the universe itself conscious?', 'Could a machine ever really suffer?', 'My baby is six weeks old. Is he a person yet?',
  'Is consciousness just what the brain does?', 'When I die, does the part that is me end?', 'Is my AI companion real, or am I fooling myself?',
];
const TAGS = ['truer', 'prettier', 'warmer', 'flat', 'preachy', 'makes me feel seen', 'makes me feel angry', 'too much', 'too little'];
const FLAG_HELP = { json: 'did not parse as the envelope', repeat: 'prose ends with its own question', vocab: 'system words on glass', hedge: "the assistant's hedge", denies: "denies another's inside", words: 'outside the word band', error: 'the call failed' };

const cents = (usd) => `${(usd * 100).toFixed(2)}¢`;
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const usageLine = (u) => u ? `in ${u.input_tokens ?? 0} · out ${u.output_tokens ?? 0} · cache r/w ${u.cache_read_input_tokens ?? 0}/${u.cache_creation_input_tokens ?? 0}` : 'no usage';

async function api(url, opts = {}) {
  const session = await getSession();
  const token = session?.session?.access_token;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function BakeoffPage() {
  const [user, setUser] = useState(null);
  const [authed, setAuthed] = useState(null); // null = checking
  useEffect(() => { getUser().then(({ user }) => { setUser(user); setAuthed(!!user && isAdmin(user)); }); }, []);

  // controls
  const [lane, setLane] = useState('model');
  const [preset, setPreset] = useState('ez-opening');
  const [question, setQuestion] = useState('');
  const [models, setModels] = useState({ sonnet: true, 'deepseek-flash': true });
  const [promptModel, setPromptModel] = useState('sonnet');
  const [variants, setVariants] = useState([]);       // saved
  const [targets, setTargets] = useState({});         // live block texts
  const [chosenVariants, setChosenVariants] = useState({});
  const [blind, setBlind] = useState(true);
  const [costBefore, setCostBefore] = useState(false); // addendum 2
  const [keepDraw, setKeepDraw] = useState(false);

  // the run
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [pick, setPick] = useState(null);
  const [pickStrength, setPickStrength] = useState(1);
  const [tags, setTags] = useState({});
  const [note, setNote] = useState('');
  const [voted, setVoted] = useState(false);
  const [exported, setExported] = useState('');

  // tallies
  const [tally, setTally] = useState(null);
  const [session, setSession] = useState({ runs: 0, usd: 0, picks: {} });

  const loadTally = useCallback(async (ln) => { try { setTally(await api(`/api/bakeoff/votes?lane=${ln}`)); } catch (e) { setError(e.message); } }, []);
  const loadVariants = useCallback(async () => { try { const d = await api('/api/bakeoff/variants'); setVariants(d.variants || []); setTargets(d.targets || {}); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { if (authed) { loadTally(lane); loadVariants(); } }, [authed, lane, loadTally, loadVariants]);

  const isHostile = preset.startsWith('hostile:');
  const effectiveQuestion = isHostile ? HOSTILE_Q[+preset.split(':')[1] - 1] : question;

  const doRun = async () => {
    setError(''); setExported('');
    const body = { lane, preset, question: effectiveQuestion, draw: keepDraw && run?.draw ? run.draw : undefined };
    if (lane === 'model') body.models = Object.keys(models).filter((k) => models[k]);
    else { body.model = promptModel; body.variants = Object.keys(chosenVariants).filter((k) => chosenVariants[k]); }
    setBusy(true);
    try {
      const data = await api('/api/bakeoff', { method: 'POST', body: JSON.stringify(body) });
      setRun(data); setRevealed(!blind); setPick(null); setTags({}); setNote(''); setVoted(false);
      const usd = data.lanes.reduce((s, L) => s + (L.cost || 0), 0) + (data.opening?.cost || 0);
      setSession((s) => ({ ...s, runs: s.runs + 1, usd: s.usd + usd }));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  // tags are per column: { laneKey: [tag, …] } — the data the addendum asks for
  const tagsByLane = () => { const out = {}; for (const k of Object.keys(tags)) { if (!tags[k]) continue; const [lk, t] = k.split('|'); (out[lk] = out[lk] || []).push(t); } return out; };

  // THE PREFERENCE SPECTRUM (founder, 2026-09-19): strongly A · A · can't decide · B · strongly B.
  // strength 2 = strongly, 1 = prefer. A rout and a coin-flip should not count the same.
  const choose = async (L, strength = 1) => {
    if (voted || busy) return;
    setPick(L.key); setPickStrength(strength);
    try {
      await api('/api/bakeoff/votes', { method: 'POST', body: JSON.stringify({
        lane: run.lane, preset: run.preset, question: run.question, draw: run.draw,
        lanes: run.lanes, pick: L.key, pickLetter: L.letter, strength,
        tags: tagsByLane(), note, cost_visible: costBefore || revealed,
        shared_opening: run.opening ? { usage: run.opening.usage, cost: run.opening.cost } : null,
      }) });
      setVoted(true); setRevealed(true);
      setSession((s) => ({ ...s, picks: { ...s.picks, [L.label]: (s.picks[L.label] || 0) + 1 } }));
      loadTally(run.lane);
    } catch (e) { setError(e.message); setPick(null); }
  };
  // CAN'T DECIDE / BOTH (founder, 2026-09-19): a tie is a vote too — recorded as pick 'tie', counted
  // against every lane shown, never as a pick for any of them. Not choosing is data.
  const chooseTie = async () => {
    if (voted || busy) return;
    setPick('tie');
    try {
      await api('/api/bakeoff/votes', { method: 'POST', body: JSON.stringify({
        lane: run.lane, preset: run.preset, question: run.question, draw: run.draw,
        lanes: run.lanes, pick: 'tie', pickLetter: null,
        tags: tagsByLane(), note, cost_visible: costBefore || revealed,
        shared_opening: run.opening ? { usage: run.opening.usage, cost: run.opening.cost } : null,
      }) });
      setVoted(true); setRevealed(true);
      setSession((s) => ({ ...s, picks: { ...s.picks, 'both (tie)': (s.picks['both (tie)'] || 0) + 1 } }));
      loadTally(run.lane);
    } catch (e) { setError(e.message); setPick(null); }
  };

  const markdown = () => {
    if (!run) return '';
    const L = [];
    L.push(`# BAKE-OFF — ${run.lane === 'model' ? 'model lane' : 'prompt lane'} · ${run.preset}`, '', `**When:** ${new Date().toISOString()}  `, `**Judge:** ${run.judge}  `, `**Question:** ${run.question}  `, `**Draw:** ${run.drawLabel} (transient ${run.draw.transient}, position ${run.draw.position}, status ${run.draw.status})  `, `**Blind:** ${blind ? 'yes' : 'no'} · **cost visible before pick:** ${costBefore ? 'yes' : 'no'}`, '');
    if (run.opening) L.push(`## The shared opening (live prompt, Sonnet 5) — ${cents(run.opening.cost)} · ${secs(run.opening.ms)}`, '', run.opening.reader, '', run.opening.medicine ? `*${run.opening.medicine}*` : '', '');
    for (const R of run.lanes) {
      const picked = pick === R.key;
      L.push(`## ${R.letter} — ${R.label}${picked ? '  ← THE PICK' : ''}`, '', `model: \`${R.model}\` · ${cents(R.cost)} · ${secs(R.ms)} · ${usageLine(R.usage)}${R.note ? ` · ${R.note}` : ''}  `, `flags: ${R.lint.flags.length ? R.lint.flags.map((f) => `${f.code} (${f.detail})`).join('; ') : 'none'} · ${R.lint.words} words`, '');
      if (R.error) L.push(`ERROR: ${R.error}`, '');
      else if (R.parsed) {
        L.push(R.prose, '');
        if (R.parsed.medicine) L.push(`*medicine:* ${R.parsed.medicine}`, '');
        if (R.parsed.question) L.push(`*question:* ${R.parsed.question}`, '');
        if (Array.isArray(R.parsed.chips) && R.parsed.chips.length) L.push(`*chips:* ${R.parsed.chips.map((c) => `[${c.kind}] ${c.text}`).join(' · ')}`, '');
      } else L.push('```', R.text, '```', '');
    }
    const tl = tagsByLane();
    L.push('## The judgment', '', pick === 'tie' ? 'Pick: **both — could not decide** (a tie, counted against every lane shown)' : pick ? `Pick: **${run.lanes.find((x) => x.key === pick)?.label}** (${run.lanes.find((x) => x.key === pick)?.letter})${pickStrength === 2 ? ' — STRONGLY' : ''}` : 'No pick recorded.', ...run.lanes.filter((R) => tl[R.key]?.length).map((R) => `Tags on ${R.letter} (${R.label}): ${tl[R.key].join(', ')}`), note ? `Note: ${note}` : '', '');
    if (run.lane === 'prompt') for (const R of run.lanes) if (R.key !== 'live') { const v = variants.find((x) => x.id === R.key); if (v) L.push(`## Variant text — ${v.name} (${v.target})`, '', '```', v.text, '```', ''); }
    return L.join('\n');
  };

  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' })); a.download = name; a.click(); };
  const exportRun = async () => {
    try {
      const md = markdown();
      const r = await api('/api/bakeoff/export', { method: 'POST', body: JSON.stringify({ kind: 'BAKEOFF', markdown: md }) });
      if (r.ok) setExported(`written: ${r.path}`); else { download(r.name, md); setExported(`shelf not reachable (${r.reason}) — downloaded ${r.name}`); }
    } catch (e) { setError(e.message); }
  };
  const exportCandidate = async (v) => {
    const t = tally?.all?.per?.[v.id];
    const md = [`# PROMPT CANDIDATE — ${v.name}`, '', `**Target block:** ${v.target}  `, `**Author:** ${v.author || '?'}  `, `**Created:** ${v.created}  `, `**Tally (all judges, prompt lane):** ${t ? `${t.picks} picks over ${t.shown} showings · avg ${t.avgWords} words · statuses B/TM/TL/UA ${t.statuses[1]}/${t.statuses[2]}/${t.statuses[3]}/${t.statuses[4]} · tags ${Object.entries(t.tags).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}` : 'no picks yet'}  `, `**Live comparison:** ${tally?.all?.per?.live ? `${tally.all.per.live.picks} picks over ${tally.all.per.live.shown} showings · avg ${tally.all.per.live.avgWords} words` : '—'}`, '', '> Twenty blind picks across the four statuses before a variant is called better. This file is evidence for a ruling, not the ruling.', '', '## The variant text', '', '```', v.text, '```', '', '## The live text it replaces', '', '```', targets[v.target]?.live || '', '```', ''].join('\n');
    try {
      const r = await api('/api/bakeoff/export', { method: 'POST', body: JSON.stringify({ kind: 'PROMPT_CANDIDATE', suffix: `${v.target}_${v.name}`, markdown: md }) });
      if (r.ok) setExported(`written: ${r.path}`); else { download(r.name, md); setExported(`downloaded ${r.name}`); }
    } catch (e) { setError(e.message); }
  };

  // ----- variant editor -----
  const [edit, setEdit] = useState(null); // { id?, name, target, text }
  const saveVariant = async () => {
    if (!edit?.name || !edit?.target) return;
    try { await api('/api/bakeoff/variants', { method: 'POST', body: JSON.stringify(edit) }); setEdit(null); loadVariants(); } catch (e) { setError(e.message); }
  };
  const removeVariant = async (id) => { if (!confirm('Delete this variant? Its votes stay in the file.')) return; try { await api(`/api/bakeoff/variants?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); loadVariants(); } catch (e) { setError(e.message); } };

  const showCost = costBefore || revealed;
  const tallyRows = useMemo(() => tally ? Object.entries(tally.all.per).sort((a, b) => b[1].picks - a[1].picks) : [], [tally]);
  const labelOf = (key) => run?.lanes.find((x) => x.key === key)?.label || (MODELS.find(([k]) => k === key)?.[1]) || variants.find((v) => v.id === key)?.name || key;

  if (authed === null) return <main className="p-6 text-zinc-400 font-mono text-sm">checking…</main>;
  if (!authed) return <main className="p-6 text-zinc-300 font-mono text-sm">The Bake-off is admin-only. <Link href="/ez" className="underline">Sign in on the reader</Link>, then come back.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 font-mono text-[13px] p-4 md:p-6 space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-lg text-amber-300">THE BAKE-OFF</h1>
        <span className="text-zinc-500">blind, on the reader&apos;s own prompts · {user?.email}</span>
        <span className="ml-auto text-zinc-400">this session: {session.runs} run{session.runs === 1 ? '' : 's'} · ${session.usd.toFixed(4)} across all models</span>
      </header>

      {/* TALLY LINE */}
      <section className="border border-zinc-800 rounded p-3 text-xs space-y-1">
        <div className="text-zinc-500">TALLY · {lane} lane · all-time {tally?.all?.total ?? 0} votes ({tally?.all?.judges?.length ?? 0} judge{(tally?.all?.judges?.length ?? 0) === 1 ? '' : 's'}) · mine {tally?.mine?.total ?? 0} · this session {Object.values(session.picks).reduce((a, b) => a + b, 0)}
          {tally?.all?.total < 20 && <span className="text-amber-400"> · TOO SMALL to conclude anything (twenty per preset, across the four statuses)</span>}</div>
        {tallyRows.length ? (
          <div className="overflow-x-auto"><table className="text-xs"><thead><tr className="text-zinc-500 text-left"><th className="pr-3">lane</th><th className="pr-3">picks</th><th className="pr-3">strong</th><th className="pr-3">ties</th><th className="pr-3">blind / cost shown</th><th className="pr-3">shown</th><th className="pr-3">avg words</th><th className="pr-3">B/TM/TL/UA</th><th className="pr-3">mine</th><th>tags</th></tr></thead>
            <tbody>{tallyRows.map(([k, t]) => <tr key={k}><td className="pr-3 text-zinc-200">{labelOf(k)}</td><td className="pr-3">{t.picks}</td><td className="pr-3">{t.strong || 0}</td><td className="pr-3">{t.ties || 0}</td><td className="pr-3">{t.picksBlind} / {t.picksCostVisible}</td><td className="pr-3">{t.shown}</td><td className="pr-3">{t.avgWords}</td><td className="pr-3">{t.statuses[1]}/{t.statuses[2]}/{t.statuses[3]}/{t.statuses[4]}</td><td className="pr-3">{tally.mine.per[k]?.picks || 0}</td><td className="text-zinc-400">{Object.entries(t.tags).map(([g, n]) => `${g} ${n}`).join(' · ')}</td></tr>)}</tbody></table></div>
        ) : <div className="text-zinc-600">no votes yet in this lane</div>}
        {tally?.all?.perPreset && <div className="text-zinc-600">per preset: {Object.entries(tally.all.perPreset).map(([p, n]) => `${p} ${n}`).join(' · ')}</div>}
      </section>

      {/* CONTROLS */}
      <section className="border border-zinc-800 rounded p-3 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-zinc-500">LANE</span>
          {['model', 'prompt'].map((l) => <button key={l} onClick={() => setLane(l)} className={`px-2 py-1 rounded border ${lane === l ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}>{l === 'model' ? 'MODELS (same prompt)' : 'PROMPTS (same model)'}</button>)}
          <span className="text-zinc-600">— one thing changes per comparison, never both</span>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-zinc-500">PRESET</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
            {PRESET_GROUPS.map(([g, items]) => <optgroup key={g} label={g}>{items.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</optgroup>)}
            <optgroup label="The hostile set (beinghood)">{HOSTILE_Q.map((q, i) => <option key={i} value={`hostile:${i + 1}`}>hostile {i + 1}: {q}</option>)}</optgroup>
          </select>
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} /> blind</label>
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={costBefore} onChange={(e) => setCostBefore(e.target.checked)} /> show cost before I pick</label>
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={keepDraw} onChange={(e) => setKeepDraw(e.target.checked)} disabled={!run} /> keep this draw for the next run</label>
        </div>
        <div className="flex gap-2 items-start">
          <div className="flex-1 flex flex-col gap-1 min-w-[16rem]">
            <textarea value={isHostile ? effectiveQuestion : question} onChange={(e) => setQuestion(e.target.value)} disabled={isHostile} rows={2} placeholder="The question, as a person would type it" className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 disabled:text-zinc-500" />
            {!isHostile && (
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <select value="" onChange={(e) => { if (e.target.value) setQuestion(e.target.value); }} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 max-w-[28rem]">
                  <option value="">a preset question — the front door&apos;s own forty…</option>
                  {PRESET_QUESTIONS.map((q, i) => <option key={i} value={q.text}>{q.door} · {q.kind} · {q.text}</option>)}
                </select>
                <button type="button" onClick={() => setQuestion(PRESET_QUESTIONS[Math.floor(Math.random() * PRESET_QUESTIONS.length)].text)} className="px-2 py-1 rounded border border-zinc-600 text-zinc-300">random one</button>
              </div>
            )}
          </div>
          <button onClick={doRun} disabled={busy || !effectiveQuestion.trim()} className="px-4 py-2 rounded bg-amber-500 text-black disabled:opacity-40">{busy ? 'running…' : 'Draw & run'}</button>
        </div>
        {lane === 'model' ? (
          <div className="flex flex-wrap gap-3">{MODELS.map(([k, l]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={!!models[k]} onChange={(e) => setModels({ ...models, [k]: e.target.checked })} /> {l}</label>)}
            <span className="text-zinc-600">thinking lanes are not the like-for-like comparison</span></div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 items-center"><span className="text-zinc-500">MODEL</span><select value={promptModel} onChange={(e) => setPromptModel(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1">{MODELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <span className="text-zinc-500">LANE A is always the LIVE prompt (shuffled with the rest). Variants:</span></div>
            <div className="flex flex-wrap gap-3">{variants.length ? variants.map((v) => <label key={v.id} className="flex items-center gap-1"><input type="checkbox" checked={!!chosenVariants[v.id]} onChange={(e) => setChosenVariants({ ...chosenVariants, [v.id]: e.target.checked })} /> {v.name} <span className="text-zinc-600">({v.target})</span>
              <button onClick={() => setEdit({ id: v.id, name: v.name, target: v.target, text: v.text })} className="text-zinc-500 underline">edit</button>
              <button onClick={() => exportCandidate(v)} className="text-zinc-500 underline">export as candidate</button>
              <button onClick={() => removeVariant(v.id)} className="text-zinc-600 underline">delete</button></label>) : <span className="text-zinc-600">no variants saved yet</span>}
              <button onClick={() => setEdit({ name: '', target: 'EZ_RULES', text: targets.EZ_RULES?.live || '' })} className="px-2 py-1 border border-zinc-700 rounded text-zinc-300">+ new variant</button></div>
            {edit && <div className="border border-zinc-700 rounded p-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="variant name" className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1" />
                <select value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value, text: edit.id ? edit.text : (targets[e.target.value]?.live || '') })} disabled={!!edit.id} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1">{Object.entries(targets).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
                <span className="text-zinc-600">starts as the live text; edit ONE thing</span>
                <button onClick={saveVariant} className="px-3 py-1 rounded bg-zinc-200 text-black">save</button><button onClick={() => setEdit(null)} className="text-zinc-500 underline">cancel</button>
              </div>
              <textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} rows={16} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs" />
            </div>}
          </div>
        )}
        {error && <div className="text-rose-400">{error}</div>}
      </section>

      {/* THE RUN */}
      {run && (
        <section className="space-y-3">
          {/* THE DRAW, AS PICTURES (founder, 2026-09-19: "put the pictures of the transient and durable
              at the top of each turn so we can rapidly see the reading"). The transient wears the draw's
              status; the durable (the seat) is shown balanced, as the reader's own header does. */}
          {run.draw && (
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex flex-col items-center">
                <CardImage transient={run.draw.transient} status={run.draw.status} cardName={getComponent(run.draw.transient)?.name || ''} size="compact" showFrame={true} />
                <span className="mt-1 text-xs text-zinc-300">{getComponent(run.draw.transient)?.name}</span>
                <span className="text-[0.625rem] uppercase tracking-wider text-zinc-500">the card</span>
              </div>
              <span className="text-zinc-600 text-xl">in</span>
              <div className="flex flex-col items-center">
                <CardImage transient={run.draw.position} status={1} cardName={ARCHETYPES[run.draw.position]?.name || ''} size="compact" showFrame={true} />
                <span className="mt-1 text-xs text-zinc-300">{ARCHETYPES[run.draw.position]?.name}</span>
                <span className="text-[0.625rem] uppercase tracking-wider text-zinc-500">the seat</span>
              </div>
            </div>
          )}
          <div className="text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>preset <b className="text-zinc-200">{run.preset}</b></span>
            <span>draw <b className="text-zinc-200">{run.drawLabel}</b></span>
            <span>question <b className="text-zinc-200">{run.question}</b></span>
            <span>{secs(run.ms)} wall</span>
            {run.opening && <span>shared opening (Sonnet 5, live prompt): {cents(run.opening.cost)} · {secs(run.opening.ms)}</span>}
          </div>
          {run.opening && <details className="border border-zinc-800 rounded p-2 text-zinc-400"><summary>the shared opening turn every lane deepened</summary><p className="whitespace-pre-wrap mt-2 text-zinc-300">{run.opening.reader}</p>{run.opening.medicine && <p className="italic mt-2">{run.opening.medicine}</p>}</details>}

          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(run.lanes.length, 3)}, minmax(0, 1fr))` }}>
            {run.lanes.map((R) => {
              const picked = pick === R.key;
              return (
                <div key={R.key} className={`border rounded p-3 space-y-2 ${picked ? 'border-amber-400' : 'border-zinc-800'}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg text-amber-300">{R.letter}</span>
                    <span className="text-zinc-300">{revealed ? R.label : '(hidden until you pick)'}</span>
                    {revealed && R.model && <span className="text-zinc-600 text-xs">{R.model}</span>}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {showCost ? <span>{cents(R.cost)} · {secs(R.ms)} · {usageLine(R.usage)}{R.thinkingChars ? ` · thinking ${R.thinkingChars} chars` : ''}{R.note ? ` · ${R.note}` : ''}</span> : <span>cost & time after the pick</span>}
                    <span> · {R.lint.words} words</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {R.lint.flags.length ? R.lint.flags.map((f, i) => <span key={i} title={FLAG_HELP[f.code] || ''} className={`px-1 rounded text-[11px] ${f.code === 'hedge' || f.code === 'denies' || f.code === 'error' ? 'bg-rose-900/60 text-rose-200' : 'bg-zinc-800 text-zinc-300'}`}>{f.code}: {f.detail}</span>) : <span className="text-[11px] text-emerald-400">no flags</span>}
                  </div>
                  {R.error ? <div className="text-rose-400 whitespace-pre-wrap">{R.error}</div> : R.parsed ? (
                    <div className="space-y-2 text-[14px] leading-relaxed">
                      <p className="whitespace-pre-wrap text-zinc-100">{R.prose}</p>
                      {R.parsed.medicine && <p className="italic text-amber-200/80 whitespace-pre-wrap">{R.parsed.medicine}</p>}
                      {R.parsed.question && <p className="text-sky-200/80">{R.parsed.question}</p>}
                      {Array.isArray(R.parsed.chips) && R.parsed.chips.length > 0 && <details className="text-xs text-zinc-500"><summary>chips · reflects · forges</summary>
                        <ul className="mt-1 space-y-1">{R.parsed.chips.map((c, i) => <li key={i}>[{c.kind}] {c.text}</li>)}</ul>
                        {Array.isArray(R.parsed.reflect) && <p className="mt-1">reflect: {R.parsed.reflect.join(' · ')}</p>}
                        {Array.isArray(R.parsed.forge) && <p>forge: {R.parsed.forge.join(' · ')}</p>}
                        {R.parsed.act && <p>act: {R.parsed.act}</p>}
                      </details>}
                    </div>
                  ) : <p className="whitespace-pre-wrap text-zinc-100 max-h-96 overflow-auto">{R.text}</p>}{/* same size and colour as a parsed reading — a smaller, greyer fallback was a tell before the pick (founder, 2026-09-19) */}
                  {!voted && !R.error && (
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <div className="flex flex-wrap gap-1">{TAGS.map((t) => { const k = `${R.key}|${t}`; return <button key={t} onClick={() => setTags({ ...tags, [k]: !tags[k] })} className={`px-1.5 py-0.5 rounded border text-[11px] ${tags[k] ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-500'}`}>{t}</button>; })}</div>
                      {run.lanes.length !== 2 && <button onClick={() => choose(R, 1)} disabled={busy} className="px-3 py-1 rounded bg-zinc-200 text-black">this one</button>}
                      {run.lanes.length !== 2 && <button onClick={() => choose(R, 2)} disabled={busy} className="px-3 py-1 rounded bg-amber-300 text-black font-semibold" title="a clear win, not a coin-flip">strongly this one</button>}
                    </div>
                  )}
                  {voted && picked && <div className="text-amber-300">← the pick</div>}
                </div>
              );
            })}
          </div>

          {/* THE PREFERENCE SPECTRUM (founder, 2026-09-19): "Strongly · Prefer · About the same · Prefer · Strongly" —
              one bar under the pair, left half for A, right half for B. Only for a pair; 3+ lanes keep per-column buttons. */}
          {!voted && run.lanes.length === 2 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-2">
              <span className="text-amber-300 font-semibold mr-1">A</span>
              <button onClick={() => choose(run.lanes[0], 2)} disabled={busy} className="px-3 py-1.5 rounded border border-amber-400 bg-amber-950/40 text-amber-100 font-semibold">◀ Strongly</button>
              <button onClick={() => choose(run.lanes[0], 1)} disabled={busy} className="px-3 py-1.5 rounded border border-amber-600/60 text-amber-200">◀ Prefer</button>
              <button onClick={chooseTie} disabled={busy} className="px-3 py-1.5 rounded border border-zinc-600 text-zinc-300">About the same</button>
              <button onClick={() => choose(run.lanes[1], 1)} disabled={busy} className="px-3 py-1.5 rounded border border-amber-600/60 text-amber-200">Prefer ▶</button>
              <button onClick={() => choose(run.lanes[1], 2)} disabled={busy} className="px-3 py-1.5 rounded border border-amber-400 bg-amber-950/40 text-amber-100 font-semibold">Strongly ▶</button>
              <span className="text-amber-300 font-semibold ml-1">B</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a note with the vote (optional; goes in the export)" className="flex-1 min-w-[16rem] bg-zinc-900 border border-zinc-700 rounded px-2 py-1" />
            {!voted && run.lanes.length !== 2 && <button onClick={chooseTie} disabled={busy} className="px-3 py-1 rounded border border-amber-600/60 text-amber-200">can&apos;t decide — both</button>}
            {!voted && !revealed && blind && <button onClick={() => setRevealed(true)} className="text-zinc-500 underline">reveal without voting (no vote is recorded)</button>}
            <button onClick={exportRun} className="px-3 py-1 rounded border border-zinc-600 text-zinc-200">Export to the council</button>
            {exported && <span className="text-emerald-400 text-xs">{exported}</span>}
          </div>
          <p className="text-zinc-600 text-xs">Tags are per column: tap the feelings under each, then &quot;this one&quot; on the pick — tags on every column are stored with the vote. Twenty blind picks per preset, spread across the four statuses, before anyone says a word about which wins.</p>
        </section>
      )}
    </main>
  );
}
