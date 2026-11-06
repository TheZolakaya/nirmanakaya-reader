// Small shared tools for the four-arm harness: hashing (line endings normalized, so a hash is the same on Windows and Linux),
// seeded exact-uniform randomness (the door's rejection sampling, over a sha256 counter stream), CSV in and out, quantiles.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');
export const lf = (s) => String(s ?? '').replace(/\r\n?/g, '\n');
export const textHash = (s) => sha256(lf(s));
export const fileTextHash = (p) => textHash(fs.readFileSync(p, 'utf8'));
export const fileBytesHash = (p) => sha256(fs.readFileSync(p));
export const short = (h, n = 12) => String(h).slice(0, n);
export const approxTokens = (s) => Math.ceil(String(s ?? '').length / 4);

export function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
export const stableHash = (v) => sha256(stable(v));

// ── seeded randomness ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** A byte stream from sha256(seed:counter). Deterministic for a seed; independent streams for different seeds. */
export function byteStream(seed) {
  let counter = 0, buf = Buffer.alloc(0), at = 0;
  return () => { if (at >= buf.length) { buf = createHash('sha256').update(`${seed}:${counter++}`).digest(); at = 0; } return buf[at++]; };
}
/** Exact uniform integers in [0, n) by rejection sampling (as lib/uniformInt.js does with crypto bytes). n <= 65536. */
export function seededInt(seed) {
  const next = byteStream(seed);
  return (n) => {
    if (!Number.isInteger(n) || n < 1 || n > 65536) throw new Error(`seededInt: n must be 1..65536, got ${n}`);
    const span = n <= 256 ? 256 : 65536; const limit = span - (span % n);
    let v; do { v = span === 256 ? next() : (next() << 8) | next(); } while (v >= limit);
    return v % n;
  };
}
export const seededFloat = (seed) => { const r = seededInt(seed); return () => (r(65536) * 65536 + r(65536)) / 4294967296; };
export function shuffle(arr, intFn) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = intFn(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function sampleWithoutReplacement(arr, k, intFn) { return shuffle(arr, intFn).slice(0, Math.min(k, arr.length)); }
export const randomId = (bytes = 6) => randomBytes(bytes).toString('hex');

// ── CSV (RFC 4180) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function parseCsv(text) {
  const rows = []; let row = [], field = '', i = 0, inQ = false; const s = String(text).replace(/^﻿/, '');
  while (i < s.length) {
    const ch = s[i];
    if (inQ) { if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; } field += ch; i++; continue; }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return body.map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ''])));
}
const cell = (v) => { const t = v == null ? '' : String(v); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export const toCsv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';

// ── numbers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function quantile(xs, q) { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y); const pos = (a.length - 1) * q; const lo = Math.floor(pos), hi = Math.ceil(pos); return a[lo] + (a[hi] - a[lo]) * (pos - lo); }
export const fmt = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : Number(x).toFixed(d));
export const usd = (x) => (x == null ? '—' : `$${Number(x).toFixed(x < 0.01 ? 5 : 4)}`);

// ── files ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ensureDir = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };
export const writeJson = (p, v) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(v, null, 2)); return p; };
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeText = (p, s) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, s); return p; };
export const appendJsonl = (p, v) => { ensureDir(path.dirname(p)); fs.appendFileSync(p, JSON.stringify(v) + '\n'); };
