'use client';
// components/admin/FeedbackTab.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02): the admin console's Feedback tab. "did this land?" —
// newest first, filter by version and verdict, export the filtered list as CSV. The person's words are shown as plain text (React
// escapes them; nothing here sets HTML). Nothing here calls a model. adminFetch carries the session token (GET /api/admin/feedback).
import { useState, useEffect } from 'react';

const VERDICT_LABEL = { landed: 'landed', partly: 'partly', not_for_me: 'not for me' };
const query = (f, extra = '') => `/api/admin/feedback?version=${encodeURIComponent(f.version)}&verdict=${encodeURIComponent(f.verdict)}${extra}`;

export default function FeedbackTab({ adminFetch }) {
  const [rows, setRows] = useState(null);
  const [versions, setVersions] = useState([]);
  const [filter, setFilter] = useState({ version: '', verdict: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (f = filter) => {
    setError(null); setBusy(true);
    try {
      const res = await adminFetch(query(f));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `failed (${res.status})`); return; }
      setRows(data.rows || []); setVersions(data.versions || []);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  useEffect(() => { load({ version: '', verdict: '' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const refilter = (patch) => { const f = { ...filter, ...patch }; setFilter(f); load(f); };
  const exportCsv = async () => {
    setError(null);
    try {
      const res = await adminFetch(query(filter, '&format=csv'));
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error || `failed (${res.status})`); return; }
      const blob = await res.blob();
      const name = (/filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '') || [])[1] || 'reading_feedback.csv';
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-light text-white">Feedback</h2>
        <p className="text-xs text-zinc-500 mt-1">What people said after a reading: landed, partly or not for me, and their own words. One row per reading per person (a second tap updates it). Version and prompt set are stamped by the server. No model reads this.</p>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-x-auto">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Version
            <select value={filter.version} onChange={(e) => refilter({ version: e.target.value })} className="mt-1 block bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 normal-case tracking-normal">
              <option value="">All versions</option>
              {[...new Set([...(filter.version ? [filter.version] : []), ...versions])].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Verdict
            <select value={filter.verdict} onChange={(e) => refilter({ verdict: e.target.value })} className="mt-1 block bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 normal-case tracking-normal">
              <option value="">All verdicts</option>
              {Object.entries(VERDICT_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <span className="text-xs text-zinc-500 pb-2">{rows ? `${rows.length} row${rows.length === 1 ? '' : 's'}` : ''}</span>
          <div className="ml-auto flex gap-3 pb-1">
            <button onClick={() => load()} disabled={busy} className="text-xs text-zinc-400 hover:text-amber-400 disabled:opacity-40">Refresh</button>
            <button onClick={exportCsv} disabled={busy || !rows?.length} className="px-3 py-1.5 text-xs rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white">Export CSV</button>
          </div>
        </div>
        {!rows ? (
          <p className="text-xs text-zinc-500">{error ? 'Feedback could not be loaded.' : 'Loading feedback...'}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-zinc-500">No feedback{filter.version || filter.verdict ? ' for this filter' : ' yet'}.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Verdict</th><th className="py-2 pr-3">Their words</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Prompt set</th><th className="py-2">Reading</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-700/30 text-zinc-300 align-top">
                  <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className={`py-2 pr-3 whitespace-nowrap ${r.verdict === 'landed' ? 'text-emerald-400' : r.verdict === 'partly' ? 'text-amber-300' : 'text-rose-300'}`}>{VERDICT_LABEL[r.verdict] || r.verdict}</td>
                  <td className="py-2 pr-3 whitespace-pre-wrap break-words max-w-xl">{r.text || <span className="text-zinc-600">—</span>}</td>
                  <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.version || '—'}</td>
                  <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.prompt_set || '—'}</td>
                  <td className="py-2 font-mono text-zinc-500" title={r.reading_id}>{String(r.reading_id || '').slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
