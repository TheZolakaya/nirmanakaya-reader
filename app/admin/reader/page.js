'use client';
// /admin/reader — THE READER'S SOUL FILE, tended (.777, founder 2026-10-14). The ledger (notes + self-readings), the live lines that ride
// in the prompt, the config (notes on/off, the self-reading cadence, the cap), and a box to interrogate the Reader about its readings
// and its learnings. Admin only; the routes check again.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSession, getUser, isAdmin } from '../../../lib/supabase';

async function adminFetch(url, options = {}) {
  const session = await getSession();
  const token = session?.session?.access_token;
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(url, { ...options, headers });
}

const CAP = 'text-[0.625rem] font-mono uppercase tracking-[0.15em] text-zinc-500';
const BTN = 'rounded-lg border px-3 py-1 text-[0.75rem] font-mono uppercase tracking-[0.1em] transition-colors';

export default function ReaderSoulAdmin() {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [data, setData] = useState({ notes: [], config: {}, live: [] });
  const [filter, setFilter] = useState('staged');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState({}); // id → line being edited
  const [ask, setAsk] = useState(''); const [askReading, setAskReading] = useState(''); const [answer, setAnswer] = useState(''); const [asking, setAsking] = useState(false);

  useEffect(() => { (async () => { const u = await getUser(); setUser(u); setAllowed(!!u && isAdmin(u)); })(); }, []);
  const load = async () => { setErr(''); const r = await adminFetch(`/api/reader/notes?status=all`); const j = await r.json().catch(() => ({})); if (!r.ok) { setErr(j.error || 'failed'); return; } setData(j); };
  useEffect(() => { if (allowed) load(); }, [allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (body, label) => { setBusy(label); setErr(''); try { const r = await adminFetch('/api/reader/notes', { method: 'PATCH', body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'failed'); await load(); } finally { setBusy(''); } };
  const doAsk = async () => { if (!ask.trim()) return; setAsking(true); setAnswer(''); setErr(''); try { const r = await adminFetch('/api/reader/ask', { method: 'POST', body: JSON.stringify({ question: ask, readingId: askReading.trim() || null }) }); const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'failed'); else setAnswer(j.text || ''); } finally { setAsking(false); } };

  if (allowed === null) return <main className="min-h-screen bg-zinc-950 text-zinc-300 p-6 font-mono text-sm">Checking the door…</main>;
  if (!allowed) return <main className="min-h-screen bg-zinc-950 text-zinc-300 p-6 font-mono text-sm">Admin only. <Link href="/" className="underline">Home</Link></main>;

  const cfg = data.config || {};
  const notes = (data.notes || []).filter((n) => filter === 'all' || n.status === filter);
  const when = (s) => String(s || '').slice(0, 16).replace('T', ' ');

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-4 py-6 sm:px-8 max-w-4xl mx-auto">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-mono uppercase tracking-[0.2em] text-amber-300">The Reader&apos;s soul file</h1>
        <div className="flex items-center gap-4"><Link href="/admin" className={`${CAP} hover:text-zinc-300`}>admin</Link><Link href="/" className={`${CAP} hover:text-zinc-300`}>home</Link></div>
      </header>
      {err && <p className="mb-4 text-rose-300 text-sm">{err}</p>}

      {/* THE LIVE FILE */}
      <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
        <div className={`${CAP} mb-2`}>The live file — rides in the prompt, under the rules · {data.live?.length || 0} of {cfg.soul_cap} lines</div>
        {!data.live?.length && <p className="text-sm text-zinc-500">Empty. Nothing promoted yet.</p>}
        <ol className="space-y-2">
          {(data.live || []).map((l, i) => (
            <li key={l.id} className="flex items-start gap-3 text-sm">
              <span className="font-mono text-zinc-600 w-5 shrink-0">{i + 1}</span>
              <span className="flex-1 text-amber-100/90">{l.line}</span>
              <button disabled={!!busy} onClick={() => patch({ id: l.id, order_no: i }, 'order')} className={`${BTN} border-zinc-700 text-zinc-500 hover:text-zinc-300`} title="pin this position">pin</button>
              <button disabled={!!busy} onClick={() => patch({ id: l.id, status: 'struck' }, 'strike')} className={`${BTN} border-rose-700/60 text-rose-300 hover:bg-rose-950/40`}>strike</button>
            </li>
          ))}
        </ol>
      </section>

      {/* CONFIG */}
      <section className="mb-8 rounded-xl border border-zinc-800 p-4">
        <div className={`${CAP} mb-3`}>Config</div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.notes_on !== false} onChange={(e) => patch({ config: { notes_on: e.target.checked } }, 'cfg')} /> notes on</label>
          <label className="flex items-center gap-2">self-reading every <input type="number" min="0" className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5" defaultValue={cfg.self_reading_every ?? 1} onBlur={(e) => patch({ config: { self_reading_every: e.target.value } }, 'cfg')} /> closed readings (0 = never)</label>
          <label className="flex items-center gap-2">cap <input type="number" min="1" className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5" defaultValue={cfg.soul_cap ?? 16} onBlur={(e) => patch({ config: { soul_cap: e.target.value } }, 'cfg')} /> lines</label>
          <span className="text-zinc-500">closed readings so far: {cfg.closed_count ?? 0}</span>
        </div>
      </section>

      {/* THE LEDGER */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className={CAP}>The ledger</div>
          <div className="flex gap-1">{['staged', 'live', 'struck', 'all'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`${BTN} ${filter === f ? 'border-amber-500/60 text-amber-200' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>{f}</button>)}</div>
        </div>
        {!notes.length && <p className="text-sm text-zinc-500">Nothing here.</p>}
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className={`rounded-xl border p-3 text-sm ${n.kind === 'self-reading' ? 'border-violet-800/50 bg-violet-950/10' : 'border-zinc-800 bg-zinc-900/40'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                <span className={CAP}>{when(n.created_at)}</span>
                <span className={`${CAP} ${n.kind === 'self-reading' ? 'text-violet-300' : 'text-zinc-400'}`}>{n.kind}</span>
                <span className={`${CAP} ${n.status === 'live' ? 'text-amber-300' : n.status === 'struck' ? 'text-rose-400' : 'text-zinc-500'}`}>{n.status}</span>
                {n.draw && <span className={CAP}>draw {n.draw.transient}/{n.draw.position}/{n.draw.status}</span>}
                {n.evidence?.fits?.length ? <span className={CAP}>taps {n.evidence.fits.map((f) => f.fit).join(' · ')}</span> : null}
                {n.reading_id && <Link href={`/ez?load=${n.reading_id}`} className={`${CAP} underline decoration-dotted hover:text-zinc-300`}>the reading</Link>}
              </div>
              <p className="whitespace-pre-wrap text-zinc-200 leading-relaxed">{n.text}</p>
              {n.status !== 'live' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input value={edit[n.id] ?? (n.line || (n.kind === 'note' ? n.text : ''))} onChange={(e) => setEdit((E) => ({ ...E, [n.id]: e.target.value }))} placeholder="the line as it will ride in the prompt" className="flex-1 min-w-[16rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-amber-100" />
                  <button disabled={!!busy} onClick={() => patch({ id: n.id, status: 'live', line: edit[n.id] ?? (n.line || (n.kind === 'note' ? n.text : '')) }, 'promote')} className={`${BTN} border-amber-500/60 text-amber-200 hover:bg-amber-950/40`}>promote</button>
                  {n.status !== 'struck' && <button disabled={!!busy} onClick={() => patch({ id: n.id, status: 'struck' }, 'strike')} className={`${BTN} border-rose-700/60 text-rose-300 hover:bg-rose-950/40`}>strike</button>}
                  {n.status === 'struck' && <button disabled={!!busy} onClick={() => patch({ id: n.id, status: 'staged' }, 'restage')} className={`${BTN} border-zinc-700 text-zinc-400 hover:text-zinc-200`}>restage</button>}
                </div>
              )}
              {n.status === 'live' && n.line && n.line !== n.text && <p className="mt-2 text-amber-200/90 text-sm"><span className={CAP}>line </span>{n.line}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* ASK */}
      <section className="mb-12 rounded-xl border border-zinc-800 p-4">
        <div className={`${CAP} mb-2`}>Ask the Reader — about its readings and its learnings</div>
        <textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={3} placeholder="What did you learn from the last five readings? Which of your notes would you keep?" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={askReading} onChange={(e) => setAskReading(e.target.value)} placeholder="a reading id (optional)" className="flex-1 min-w-[16rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-zinc-300" />
          <button disabled={asking || !ask.trim()} onClick={doAsk} className={`${BTN} border-violet-500/60 text-violet-200 hover:bg-violet-950/40 disabled:opacity-40`}>{asking ? 'asking…' : 'ask'}</button>
        </div>
        {answer && <div className="mt-4 rounded-lg border border-violet-800/40 bg-violet-950/10 p-3 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{answer}</div>}
      </section>
    </main>
  );
}
