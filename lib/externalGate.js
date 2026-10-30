// lib/externalGate.js — 2026-10-07 (.728): the two open reading doors (/api/external-reading and /api/mcp) had no off switch
// and no spending limit; every new question was a paid draw on the house's key. Both doors call this BEFORE a new draw.
//   EXTERNAL_API_ENABLED=0  → both doors answer 503 (close them from Vercel; takes effect on the next deploy) — keys included
//   EXTERNAL_DAILY_CAP      → new UNKEYED draws allowed per rolling 24h across both doors (default 100, founder 2026-10-07)
// A retry of a requestId already in the ledger is not a new draw and always passes.
// 2026-10-30 (BRIEF 01, THE KEYED DOOR): a caller may send a key (`key=` or the `x-nkya-key` header; lib/apiKeys.js). With a key, that
// key's own daily cap applies and its label is written onto the ledger row; the global cap counts unkeyed rows only, so keyed and
// anonymous callers never spend each other's budget. A key that is sent but wrong or revoked fails (401) — it never falls back to the
// global cap. No key: exactly as before.
import { fetchByRequestId } from './externalReading.js';
import { verifyKey, countToday, since24h } from './apiKeys.js';

export const DEFAULT_DAILY_CAP = 100;

export function doorClosed() {
  return process.env.EXTERNAL_API_ENABLED === '0';
}

export const CLOSED_MESSAGE = 'The Nirmanakaya reading API is closed for now. Readings are still open at https://www.nirmanakaya.com.';

// Returns { ok: true, key } when a new draw may go ahead (key = the verified api_keys row, or null for an unkeyed call),
// or { ok: false, status, error } when it may not.
export async function drawAllowed(db, requestId, rawKey = null) {
  const deny = (status, error) => ({ ok: false, status, error });
  if (doorClosed()) return deny(503, CLOSED_MESSAGE);
  let key = null;
  if (rawKey) { // checked before anything else, so a revoked key fails at once — even on a retry
    const v = await verifyKey(db, rawKey);
    if (!v.ok) return deny(v.status, v.error);
    key = v.key;
  }
  if (!db) return { ok: true, key: null }; // no ledger configured (local dev without keys): nothing to count
  const rid = requestId && String(requestId).trim().slice(0, 200);
  if (rid) {
    const have = await fetchByRequestId(db, rid).catch(() => null);
    if (have) return { ok: true, key }; // an idempotent retry returns the reading it names — never a new draw
  }
  if (key) { // THE KEY'S OWN CAP
    const c = await countToday(db, key.label);
    if (c.error) return deny(503, 'The reading API could not check this key\'s daily limit just now. Please try again shortly.'); // fail closed
    if (c.count >= key.daily_cap) return deny(429, `This key has reached its limit of ${key.daily_cap} new readings in 24 hours. Please try again tomorrow; a reading already asked for (same requestId) can still be retrieved.`);
    return { ok: true, key };
  }
  const cap = parseInt(process.env.EXTERNAL_DAILY_CAP, 10);
  const limit = Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_DAILY_CAP;
  const since = since24h();
  let { count, error } = await db.from('external_readings').select('id', { count: 'exact', head: true }).is('api_key_label', null).gte('created_at', since);
  // The key column may not be in yet (SQL not run). A head:true count hides PostgREST's error body (a bare 400, empty message), so the
  // column cannot be told apart from any other failure here: on ANY error, count every row as before. That count is never smaller, so
  // the fallback can only be stricter, never looser.
  if (error) ({ count, error } = await db.from('external_readings').select('id', { count: 'exact', head: true }).gte('created_at', since));
  if (error) return deny(503, 'The reading API could not check its daily limit just now. Please try again shortly.'); // fail closed: an uncounted door is an unmetered one
  if ((count || 0) >= limit) return deny(429, `The reading API has reached its limit of ${limit} new readings in 24 hours. Please try again tomorrow; a reading you already asked for (same requestId) can still be retrieved.`);
  return { ok: true, key: null };
}
