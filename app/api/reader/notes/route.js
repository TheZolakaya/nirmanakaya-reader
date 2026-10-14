// /api/reader/notes — THE LEDGER (.777, founder 2026-10-14).
//   POST  (any signed-in reader, called by the page after Summarize and wrap it up): stage the Reader's one-line note for this reading,
//         count the closed reading, and — every Nth closed reading (reader_config.self_reading_every; 1 = every time) — make the self-reading.
//   GET   (admin): the ledger (?status=staged|live|struck|all), the config, the live lines.
//   PATCH (admin): { id, status, line, order_no } to promote / strike / edit a note, or { config: { key: value } }.
import { getAuthUser } from '../../../../lib/requireUser.js';
import { soulDb, getConfig, setConfig, liveLines, stageNote, bumpClosed, selfReading, CONFIG_DEFAULTS } from '../../../../lib/readerSoul.js';
import { runReading } from '../../../../lib/externalReading.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function isAdminUser(db, user) {
  if (!user) return false;
  if (String(user.email || '').toLowerCase() === 'chriscrilly@gmail.com') return true;
  try { const { data } = await db.from('profiles').select('is_admin').eq('id', user.id).single(); return !!data?.is_admin; } catch { return false; }
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const db = soulDb(); if (!db) return Response.json({ error: 'the ledger is not configured' }, { status: 503 });
  let body = {}; try { body = await request.json(); } catch {}
  const cfg = await getConfig(db);
  if (cfg.notes_on === false) return Response.json({ ok: true, off: true });
  const readingId = body.readingId && /^[0-9a-f-]{36}$/i.test(String(body.readingId)) ? String(body.readingId) : null;
  const note = String(body.note || '').trim();
  const fits = Array.isArray(body.evidence?.fits) ? body.evidence.fits.slice(0, 20).map((f) => ({ fit: String(f.fit || '').slice(0, 20), said: String(f.said || '').slice(0, 300), answering: String(f.answering || '').slice(0, 300) })) : [];
  const transcript = String(body.transcript || '').slice(0, 6000);
  const out = { ok: true, noteId: null, selfReading: null };
  if (note && note.toUpperCase() !== 'NONE') {
    out.noteId = await stageNote(db, { reading_id: readingId, user_id: user.id, kind: 'note', text: note.slice(0, 400), evidence: { fits, question: String(body.question || '').slice(0, 300) } });
  }
  const closed = await bumpClosed(db);
  const every = Number(cfg.self_reading_every) || 0;
  if (every > 0 && closed % every === 0) {
    try { out.selfReading = await selfReading({ db, runReading, readingId, userId: user.id, transcript, fits, note }); }
    catch (e) { out.selfReadingError = String(e?.message || e).slice(0, 200); }
  }
  out.closed = closed;
  return Response.json(out);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  const db = soulDb(); if (!db) return Response.json({ error: 'the ledger is not configured' }, { status: 503 });
  if (!(await isAdminUser(db, user))) return Response.json({ error: 'admin only' }, { status: 403 });
  const status = new URL(request.url).searchParams.get('status') || 'all';
  let q = db.from('reader_notes').select('*').order('created_at', { ascending: false }).limit(300);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const cfg = await getConfig(db);
  return Response.json({ notes: data || [], config: cfg, live: await liveLines(db, cfg.soul_cap), defaults: CONFIG_DEFAULTS });
}

export async function PATCH(request) {
  const user = await getAuthUser(request);
  const db = soulDb(); if (!db) return Response.json({ error: 'the ledger is not configured' }, { status: 503 });
  if (!(await isAdminUser(db, user))) return Response.json({ error: 'admin only' }, { status: 403 });
  let body = {}; try { body = await request.json(); } catch {}
  if (body.config && typeof body.config === 'object') {
    const done = {};
    for (const [k, v] of Object.entries(body.config)) done[k] = await setConfig(db, k, k === 'notes_on' ? !!v : Number(v));
    return Response.json({ ok: true, config: await getConfig(db), done });
  }
  const id = String(body.id || ''); if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'id' }, { status: 400 });
  const patch = {};
  if (['staged', 'live', 'struck'].includes(body.status)) { patch.status = body.status; if (body.status === 'live') patch.promoted_at = new Date().toISOString(); if (body.status === 'struck') patch.struck_at = new Date().toISOString(); }
  if (typeof body.line === 'string') patch.line = body.line.trim().slice(0, 300);
  if (body.order_no !== undefined) patch.order_no = body.order_no === null ? null : Number(body.order_no);
  const { error } = await db.from('reader_notes').update(patch).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const cfg = await getConfig(db);
  return Response.json({ ok: true, live: await liveLines(db, cfg.soul_cap) });
}
