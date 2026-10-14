// lib/readerSoul.js — THE READER'S SOUL FILE (founder, 2026-10-14; .777).
// A ledger of the Reader's own notes about reading (one line after a closed reading, tied to a fit tap or a thing the
// person said) and its SELF-READINGS (one card on its own work, through the same door the council uses), and the LIVE
// LINES — the few the founder has promoted — that ride in the prompt UNDER THE RULES. A line never licenses breaking a rule.
// Tables: reader_notes (the ledger; status staged | live | struck) · reader_config (notes_on, self_reading_every, soul_cap, closed_count).
// Server-only except soulBlock() (pure), which the page uses to append the lines it fetched from /api/reader/soul.
import { createClient } from '@supabase/supabase-js';

export const soulDb = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

export const CONFIG_DEFAULTS = { notes_on: true, self_reading_every: 1, soul_cap: 16, closed_count: 0 };

export async function getConfig(db) {
  const out = { ...CONFIG_DEFAULTS };
  if (!db) return out;
  const { data } = await db.from('reader_config').select('key, value');
  for (const r of data || []) out[r.key] = r.value;
  return out;
}

export async function setConfig(db, key, value) {
  if (!db || !(key in CONFIG_DEFAULTS)) return false;
  const { error } = await db.from('reader_config').upsert({ key, value, updated_at: new Date().toISOString() });
  return !error;
}

/** The live lines, in the order the founder set (order_no, then promotion time), capped. */
export async function liveLines(db, cap = null) {
  if (!db) return [];
  const { data } = await db.from('reader_notes').select('id, line, text, order_no, promoted_at').eq('status', 'live').order('order_no', { ascending: true, nullsFirst: false }).order('promoted_at', { ascending: true });
  const lines = (data || []).map((r) => ({ id: r.id, line: String(r.line || r.text || '').trim() })).filter((r) => r.line);
  const n = Number.isFinite(Number(cap)) && Number(cap) > 0 ? Number(cap) : CONFIG_DEFAULTS.soul_cap;
  return lines.slice(0, n);
}

/** The block that rides in the prompt. Pure. */
export function soulBlock(lines) {
  const L = (lines || []).map((x) => (typeof x === 'string' ? x : x?.line)).map((s) => String(s || '').trim()).filter(Boolean);
  if (!L.length) return '';
  return `NOTES FROM EARLIER READINGS — THE READER'S OWN. Written by you after readings you gave, kept by the one who tends this instrument. They sit UNDER the rules above: a note never licenses breaking a rule; where a note and a rule disagree, the rule stands.\n${L.map((s) => `- ${s}`).join('\n')}`;
}

export async function stageNote(db, row) {
  if (!db) return null;
  const { data, error } = await db.from('reader_notes').insert({ ...row, status: 'staged' }).select('id').single();
  if (error) { console.warn('[soul] stage failed:', error.message); return null; }
  return data?.id || null;
}

/** closed_count += 1; returns the new count. */
export async function bumpClosed(db) {
  const cfg = await getConfig(db);
  const n = (Number(cfg.closed_count) || 0) + 1;
  await setConfig(db, 'closed_count', n);
  return n;
}

export const SELF_QUESTION = 'What in the reading I just gave served this person, and what did not?';

/** One card on its own work, through the same door the council uses (runReading is passed in to avoid an import cycle). */
export async function selfReading({ db, runReading, readingId, userId, transcript, fits, note }) {
  const requestId = `self-${readingId || Date.now()}`;
  const context = [
    'THE QUERENT IS THE READER OF THIS INSTRUMENT, asking about the reading it just gave.',
    `THE READING I GAVE (the transcript, abridged):\n${String(transcript || '').slice(-1400)}`,
    fits && fits.length ? `WHAT CAME BACK (the fit taps): ${fits.map((f) => `${f.fit}${f.said ? ` — "${String(f.said).slice(0, 120)}"` : ''}`).join(' · ')}` : 'WHAT CAME BACK: no fit taps this time.',
    note ? `MY OWN NOTE: ${note}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 2000);
  const r = await runReading({ question: SELF_QUESTION, context, cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId, monitor: null, collectiveScope: null, scopeSubject: null });
  const it = r?.interpretation || {};
  const text = typeof it === 'string' ? it : [it.gist, it.text, it.medicine ? `The way through: ${it.medicine}` : '', it.question].filter(Boolean).join('\n\n');
  const id = await stageNote(db, { reading_id: readingId || null, user_id: userId || null, kind: 'self-reading', text: text || '(no words came back)', evidence: { fits: fits || [], note: note || null, requestId, externalReadingId: r?.readingId || null }, draw: (r?.draws || [])[0] || null, interpretation: typeof it === 'string' ? it : JSON.stringify(it) });
  return { id, text, draw: (r?.draws || [])[0] || null, externalReadingId: r?.readingId || null };
}
