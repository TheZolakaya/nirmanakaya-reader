// lib/bakeoff/store.js
// VOTES AND VARIANTS ON DISK — append-only JSONL for the picks, one JSON file for the prompt
// variants, under data/bakeoff/ (the commission's "if the seat would rather not touch the schema").
// The tally survives a reload because it is recomputed from the file every time. On Vercel the
// filesystem is read-only, so this bench persists on the founder's machine (port 3210) — which is
// where it runs. A write failure is returned, never swallowed.

import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'data', 'bakeoff');
const VOTES = path.join(DIR, 'votes.jsonl');
const VARIANTS = path.join(DIR, 'variants.json');
const ensure = () => { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); };

export function readVotes() {
  if (!fs.existsSync(VOTES)) return [];
  return fs.readFileSync(VOTES, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

export function appendVote(vote) {
  ensure();
  const row = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, ts: new Date().toISOString(), ...vote };
  fs.appendFileSync(VOTES, JSON.stringify(row) + '\n');
  return row;
}

// The tally: picks per lane key (a model key or a variant id) per preset and overall, with the
// feeling-tag counts beside each, and the status spread of the draws judged (the ≥20-across-four
// rule needs it visible).
export function tally(votes, { lane, judge } = {}) {
  const rows = votes.filter((v) => (!lane || v.lane === lane) && (!judge || v.judge === judge));
  const per = {};
  const slot = (key) => per[key] || (per[key] = { picks: 0, picksCostVisible: 0, picksBlind: 0, shown: 0, words: 0, tags: {}, presets: {}, statuses: { 1: 0, 2: 0, 3: 0, 4: 0 } });
  const bump = (key, v) => {
    const t = slot(key);
    t.picks += 1;
    if (v.cost_visible) t.picksCostVisible += 1; else t.picksBlind += 1;   // addendum 2: split by whether cost was visible
    t.presets[v.preset] = (t.presets[v.preset] || 0) + 1;
    if (v.draw?.status) t.statuses[v.draw.status] = (t.statuses[v.draw.status] || 0) + 1;
  };
  for (const v of rows) {
    if (v.pick) bump(v.pick, v);
    // addendum 3: average output length per lane, over every run the lane appeared in (picked or not);
    // the feeling tags are per column, so each lane collects its own
    const tagMap = (v.tags && !Array.isArray(v.tags)) ? v.tags : {};
    for (const L of v.lanes || []) {
      const t = slot(L.key); t.shown += 1; t.words += L.words || 0;
      for (const g of tagMap[L.key] || []) t.tags[g] = (t.tags[g] || 0) + 1;
    }
  }
  for (const t of Object.values(per)) t.avgWords = t.shown ? Math.round(t.words / t.shown) : 0;
  const perPreset = {};
  for (const v of rows) { perPreset[v.preset] = (perPreset[v.preset] || 0) + 1; }
  const judges = [...new Set(rows.map((v) => v.judge).filter(Boolean))];
  return { total: rows.length, per, perPreset, judges };
}

export function readVariants() {
  if (!fs.existsSync(VARIANTS)) return [];
  try { return JSON.parse(fs.readFileSync(VARIANTS, 'utf8')) || []; } catch { return []; }
}

export function saveVariant(v) {
  ensure();
  const all = readVariants();
  const id = v.id || `${v.target}:${String(v.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const i = all.findIndex((x) => x.id === id);
  const row = { id, name: v.name, target: v.target, text: v.text, author: v.author || null, created: i >= 0 ? all[i].created : new Date().toISOString(), updated: new Date().toISOString() };
  if (i >= 0) all[i] = row; else all.push(row);
  fs.writeFileSync(VARIANTS, JSON.stringify(all, null, 2));
  return row;
}

export function deleteVariant(id) {
  const all = readVariants().filter((x) => x.id !== id);
  ensure(); fs.writeFileSync(VARIANTS, JSON.stringify(all, null, 2));
}

// The council shelf. Written if the server can see the drive, else the caller downloads.
export const SHELF = 'G:\\My Drive\\For Air Review';
export function writeToShelf(name, markdown) {
  try {
    if (!fs.existsSync(SHELF)) return { ok: false, reason: 'shelf not visible from this server' };
    const p = path.join(SHELF, name);
    fs.writeFileSync(p, markdown, 'utf8');
    return { ok: true, path: p };
  } catch (e) { return { ok: false, reason: e.message }; }
}
export function nextShelfName(prefix, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  let n = 1;
  try { const have = fs.readdirSync(SHELF).filter((f) => f.startsWith(`${prefix}_${d}_`)); n = have.length + 1; } catch {}
  return `${prefix}_${d}_${n}.md`;
}
