// lib/externalGate.js — 2026-10-07 (.728): the two open reading doors (/api/external-reading and /api/mcp) had no off switch
// and no spending limit; every new question was a paid draw on the house's key. Both doors call this BEFORE a new draw.
//   EXTERNAL_API_ENABLED=0  → both doors answer 503 (close them from Vercel; takes effect on the next deploy)
//   EXTERNAL_DAILY_CAP      → new draws allowed per rolling 24h across both doors (default 100, founder 2026-10-07)
// A retry of a requestId already in the ledger is not a new draw and always passes.
import { fetchByRequestId } from './externalReading.js';

export const DEFAULT_DAILY_CAP = 100;

export function doorClosed() {
  return process.env.EXTERNAL_API_ENABLED === '0';
}

export const CLOSED_MESSAGE = 'The Nirmanakaya reading API is closed for now. Readings are still open at https://www.nirmanakaya.com.';

// Returns null when a new draw may go ahead, or { status, error } when it may not.
export async function drawAllowed(db, requestId) {
  if (doorClosed()) return { status: 503, error: CLOSED_MESSAGE };
  if (!db) return null; // no ledger configured (local dev without keys): nothing to count
  const rid = requestId && String(requestId).trim().slice(0, 200);
  if (rid) {
    const have = await fetchByRequestId(db, rid).catch(() => null);
    if (have) return null; // an idempotent retry returns the reading it names — never a new draw
  }
  const cap = parseInt(process.env.EXTERNAL_DAILY_CAP, 10);
  const limit = Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_DAILY_CAP;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await db.from('external_readings').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if (error) return { status: 503, error: 'The reading API could not check its daily limit just now. Please try again shortly.' }; // fail closed: an uncounted door is an unmetered one
  if ((count || 0) >= limit) return { status: 429, error: `The reading API has reached its limit of ${limit} new readings in 24 hours. Please try again tomorrow; a reading you already asked for (same requestId) can still be retrieved.` };
  return null;
}
