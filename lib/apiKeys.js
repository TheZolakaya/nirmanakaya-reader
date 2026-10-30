// lib/apiKeys.js — 2026-10-30 (BRIEF 01, THE KEYED DOOR): per-caller keys for the two reading doors (/api/external-reading and /api/mcp).
// A key has a label (written onto every ledger row it makes), a shape (SEAT: a seat pulling for itself · DELEGATE: an AI acting for a
// named user), an owner (the seat's name, or the user id a delegate acts for), its own daily cap, and an on/off switch.
// The plaintext key is shown ONCE, at mint; only its SHA-256 hash is stored (table api_keys: service role only, RLS on, no policies).
// "Today" is a rolling 24 hours, the same window as the global cap in lib/externalGate.js.
import { createHash, randomBytes } from 'crypto';

export const SHAPES = ['SEAT', 'DELEGATE'];
export const DEFAULT_KEY_CAP = 20;
const PREFIX = 'nkya_';
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = 'id, label, shape, owner, daily_cap, active, created_at, last_used_at'; // never the hash

export const hashKey = (plain) => createHash('sha256').update(String(plain)).digest('hex');
const newPlainKey = () => PREFIX + randomBytes(32).toString('base64url');
export const since24h = () => new Date(Date.now() - DAY_MS).toISOString();

// The key a request carries: `key=` in the query string, or the `x-nkya-key` header. The query string wins when both are sent.
// Returns the trimmed string, or null when no key was sent. An empty `key=` counts as no key.
export function keyFrom(request) {
  let q = null;
  try { q = new URL(request.url).searchParams.get('key'); } catch {}
  const h = request.headers?.get?.('x-nkya-key') ?? null;
  const k = String(q || h || '').trim();
  return k ? k.slice(0, 200) : null;
}

// Postgres / PostgREST: the table or column is not there yet (the SQL has not been run).
export const isMissingSchema = (error) => !!error && (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code) || /does not exist|could not find the .* (column|table)|schema cache/i.test(String(error.message || '')));

function cleanCap(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
}

// Mint a new key. Returns { key: <plaintext, shown once>, row } or throws with .status.
export async function mintKey(db, { label, shape = 'SEAT', owner = null, dailyCap = DEFAULT_KEY_CAP } = {}) {
  const lab = String(label || '').trim().slice(0, 80);
  if (!lab) throw Object.assign(new Error('A label is required.'), { status: 400 });
  if (!/^[A-Za-z0-9 ._:@-]+$/.test(lab)) throw Object.assign(new Error('A label may use letters, digits, spaces and . _ : @ - only.'), { status: 400 });
  const shp = String(shape || 'SEAT').toUpperCase();
  if (!SHAPES.includes(shp)) throw Object.assign(new Error('The shape must be SEAT or DELEGATE.'), { status: 400 });
  const own = owner == null ? '' : String(owner).trim().slice(0, 200);
  if (shp === 'DELEGATE' && !UUID.test(own)) throw Object.assign(new Error('A DELEGATE key needs the user id it acts for (a uuid) as its owner.'), { status: 400 });
  const cap = cleanCap(dailyCap);
  if (cap === null) throw Object.assign(new Error('The daily cap must be a whole number from 0 to 100000.'), { status: 400 });
  const key = newPlainKey();
  const { data, error } = await db.from('api_keys').insert({ label: lab, key_hash: hashKey(key), shape: shp, owner: own || null, daily_cap: cap, active: true }).select(COLS).single();
  if (error) {
    if (error.code === '23505') throw Object.assign(new Error(`A key labelled "${lab}" already exists. Re-mint it, or choose another label.`), { status: 409 });
    if (isMissingSchema(error)) throw Object.assign(new Error('The api_keys table is not in the database yet (run supabase/api_keys_2026-10-30.sql).'), { status: 503 });
    throw Object.assign(new Error(`The key could not be minted: ${error.message}`), { status: 500 });
  }
  return { key, row: data };
}

// Re-mint: a new secret for the same row (same label, shape, owner and cap). The old key stops working at once; the row is switched on.
export async function remintKey(db, id) {
  const key = newPlainKey();
  const { data, error } = await db.from('api_keys').update({ key_hash: hashKey(key), active: true }).eq('id', id).select(COLS).maybeSingle();
  if (error) throw Object.assign(new Error(`The key could not be re-minted: ${error.message}`), { status: 500 });
  if (!data) throw Object.assign(new Error('No key with that id.'), { status: 404 });
  return { key, row: data };
}

// Revoke: switched off at once. The row stays, so its ledger rows keep their label and a re-mint can bring it back.
export async function revokeKey(db, id) {
  const { data, error } = await db.from('api_keys').update({ active: false }).eq('id', id).select(COLS).maybeSingle();
  if (error) throw Object.assign(new Error(`The key could not be revoked: ${error.message}`), { status: 500 });
  if (!data) throw Object.assign(new Error('No key with that id.'), { status: 404 });
  return data;
}

// Verify a plaintext key. Returns { ok: true, key: row } | { ok: false, status, error }. Never falls back to the global cap.
export async function verifyKey(db, plain) {
  if (!db) return { ok: false, status: 503, error: 'The reading API cannot check keys just now (no ledger is configured).' };
  const { data, error } = await db.from('api_keys').select(COLS).eq('key_hash', hashKey(plain)).maybeSingle();
  if (error) return { ok: false, status: 503, error: 'The reading API could not check the key just now. Please try again shortly.' };
  if (!data) return { ok: false, status: 401, error: 'This key is not recognised. Check it, or ask for a new one.' };
  if (!data.active) return { ok: false, status: 401, error: 'This key has been revoked. Ask for a new one.' };
  try { await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id); } catch {} // best effort; a failed stamp never blocks a reading
  return { ok: true, key: data };
}

// New readings a key has made in the last 24 hours. Returns { count } | { error }.
export async function countToday(db, label) {
  const { count, error } = await db.from('external_readings').select('id', { count: 'exact', head: true }).eq('api_key_label', label).gte('created_at', since24h());
  return error ? { error } : { count: count || 0 };
}

// Every key with its count for the last 24 hours (the admin's Keys tab).
export async function listKeys(db) {
  const { data, error } = await db.from('api_keys').select(COLS).order('created_at', { ascending: false });
  if (error) throw Object.assign(new Error(isMissingSchema(error) ? 'The api_keys table is not in the database yet (run supabase/api_keys_2026-10-30.sql).' : `The keys could not be listed: ${error.message}`), { status: isMissingSchema(error) ? 503 : 500 });
  return Promise.all((data || []).map(async (r) => { const c = await countToday(db, r.label); return { ...r, today: c.error ? null : c.count }; })); // one exact count per key (a row fetch would stop at the API's 1000-row page)
}
