// lib/readingFeedback.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02). "did this land?" — landed / partly / not for me, and an
// optional free field. The person's words are stored as they gave them and read by people: nothing here calls a model, summarises,
// scores or judges the text. Pure (no imports), so the routes inject auth and the database and the tests can mock both.
//   POST /api/reading-feedback        { readingId, verdict, text? } → { feedback }   one row per reading per person; a second tap updates it
//   GET  /api/reading-feedback?readingId=…                         → { feedback }   the caller's own row for that reading, or null
//   GET  /api/admin/feedback?version=&verdict=[&format=csv]        → { rows, versions } or text/csv   (requireAdmin)

export const VERDICTS = ['landed', 'partly', 'not_for_me'];
export const TEXT_MAX = 4000;
export const FEEDBACK_COLUMNS = 'id, reading_id, user_id, verdict, text, version, prompt_set, created_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export const isUuid = (s) => typeof s === 'string' && UUID.test(s);
export const cleanVerdict = (v) => (VERDICTS.includes(v) ? v : null);
/** The free field: trimmed, capped, empty → null. Otherwise exactly what the person wrote. */
export const cleanText = (t) => { if (typeof t !== 'string') return null; const s = t.trim().slice(0, TEXT_MAX); return s || null; };

/** The prompt set the reading was made with, as its own saved record says (the EZ reader writes it at save); a name the server does not
 *  know, or none, stamps null. Never taken from the feedback request. */
export const promptSetOf = (row, setNames) => { const p = String(row?.prompt || '').toLowerCase(); return p && setNames.includes(p) ? p : null; };

/** The caller's reading, or null when it is not theirs (or not there). Read through the service role, so the check is ours. */
async function ownReading(db, readingId, userId) {
  const { data, error } = await db.from('user_readings').select('id, user_id, prompt:interpretation->synthesis->_ez->>prompt').eq('id', readingId).maybeSingle();
  if (error) throw Object.assign(new Error('could not read the reading'), { status: 500 });
  return data && data.user_id === userId ? data : null;
}

/** POST: deps = { getUser(request) → user|null, db (service-role client)|null, version, setNames }. */
export async function handleFeedbackPost(request, { getUser, db, version, setNames }) {
  const user = await getUser(request);
  if (!user) return json({ error: 'Please sign in to continue.' }, 401);
  if (!db) return json({ error: 'Supabase not configured' }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'The request body must be JSON.' }, 400); }
  const readingId = String(body?.readingId || '');
  if (!isUuid(readingId)) return json({ error: 'readingId must be a reading id' }, 400);
  const verdict = cleanVerdict(body?.verdict);
  if (!verdict) return json({ error: "verdict must be 'landed', 'partly' or 'not_for_me'" }, 400);
  try {
    const reading = await ownReading(db, readingId, user.id);
    if (!reading) return json({ error: 'No such reading.' }, 404); // someone else's reading and a missing one look the same
    const row = { reading_id: readingId, user_id: user.id, verdict, text: cleanText(body?.text), version: String(version || '') || null, prompt_set: promptSetOf(reading, setNames) };
    const { data, error } = await db.from('reading_feedback').upsert(row, { onConflict: 'reading_id,user_id' }).select('verdict, text, version, prompt_set, created_at').single();
    if (error) return json({ error: 'could not save the feedback' }, 500);
    return json({ feedback: data });
  } catch (e) { return json({ error: e?.message || 'failed' }, e?.status || 500); }
}

/** GET (the person's own row for one reading, so the control shows what they already chose). */
export async function handleFeedbackGet(request, { getUser, db }) {
  const user = await getUser(request);
  if (!user) return json({ error: 'Please sign in to continue.' }, 401);
  if (!db) return json({ error: 'Supabase not configured' }, 500);
  const readingId = new URL(request.url).searchParams.get('readingId') || '';
  if (!isUuid(readingId)) return json({ error: 'readingId must be a reading id' }, 400);
  const { data, error } = await db.from('reading_feedback').select('verdict, text').eq('reading_id', readingId).eq('user_id', user.id).maybeSingle();
  if (error) return json({ error: 'could not read the feedback' }, 500);
  return json({ feedback: data || null });
}

// ---- the admin side ----

/** Every matching row, newest first, paged through PostgREST's 1000-row window up to `cap`. */
export async function listFeedback(db, { version, verdict, cap = 5000, columns = FEEDBACK_COLUMNS } = {}) {
  const out = [];
  for (let from = 0; from < cap; from += 1000) {
    let q = db.from('reading_feedback').select(columns).order('created_at', { ascending: false });
    if (version) q = q.eq('version', version);
    if (verdict) q = q.eq('verdict', verdict);
    const { data, error } = await q.range(from, Math.min(from + 999, cap - 1));
    if (error) throw Object.assign(new Error(error.message || 'could not read the feedback'), { status: 500 });
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** The versions present (the one with the newest feedback first), for the filter. */
export async function feedbackVersions(db) {
  const rows = await listFeedback(db, { cap: 20000, columns: 'version, created_at' });
  return [...new Set(rows.map((r) => r.version).filter(Boolean))];
}

export const CSV_HEADER = ['created_at', 'version', 'prompt_set', 'verdict', 'text', 'reading_id', 'user_id'];
/** One CSV cell: quoted when it holds a comma, quote or line break. A cell that a spreadsheet would run as a formula (= + - @, tab, CR)
 *  gets a leading apostrophe; nothing else about the person's words changes. */
export const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => [CSV_HEADER.join(','), ...rows.map((r) => CSV_HEADER.map((k) => csvCell(r[k])).join(','))].join('\r\n') + '\r\n';

/** GET for the admin tab: deps = { requireAdmin(request) → { ok, response }, db }. */
export async function handleAdminFeedbackGet(request, { requireAdmin, db }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  if (!db) return json({ error: 'Supabase not configured' }, 500);
  const p = new URL(request.url).searchParams;
  const version = (p.get('version') || '').trim().slice(0, 100) || null;
  const verdictRaw = (p.get('verdict') || '').trim();
  const verdict = verdictRaw ? cleanVerdict(verdictRaw) : null;
  if (verdictRaw && !verdict) return json({ error: "verdict must be 'landed', 'partly' or 'not_for_me'" }, 400);
  try {
    if (p.get('format') === 'csv') {
      const rows = await listFeedback(db, { version, verdict, cap: 20000 });
      const name = `reading_feedback${version ? `_${version.replace(/[^\w.+-]/g, '_')}` : ''}${verdict ? `_${verdict}` : ''}.csv`;
      return new Response(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
    }
    const [rows, versions] = await Promise.all([listFeedback(db, { version, verdict, cap: 1000 }), feedbackVersions(db)]);
    return json({ rows, versions });
  } catch (e) { return json({ error: e?.message || 'failed' }, e?.status || 500); }
}
