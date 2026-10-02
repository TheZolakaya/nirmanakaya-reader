// THE LIBRARY — the poured cells as the Reader reaches them. Two layers (founder 2026-10-02):
//   the SNAPSHOT: data/pour/snapshot/<sig>.json, one file per card (22 seats × 4 statuses), written at build time from the live
//   set by scripts/pour_snapshot.mjs — the serving path reads one small file for the drawn card, no database on the reading path;
//   the TABLE (Supabase, every set with provenance, a live-set config row) is the source of truth the snapshot is cut from.
// lookupCell(sig, pos, status) is what readPlan takes. A missing cell returns null and the Reader reads from the record.
import fs from 'node:fs';
import path from 'node:path';
import { checkProvenance } from './joins.js';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'pour', 'snapshot');
const cache = new Map();

export function snapshotManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, 'manifest.json'), 'utf8')); } catch { return null; }
}

function loadCard(sig) {
  if (cache.has(sig)) return cache.get(sig);
  let card = null;
  try { card = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, `${String(sig).padStart(2, '0')}.json`), 'utf8')); } catch { card = null; }
  cache.set(sig, card);
  return card;
}

/** The poured cell for one draw, or null. Provenance is checked against a plan when one is given (a swept partner darkens the cell). */
export function lookupCell(sig, pos, status, plan = null) {
  const card = loadCard(Number(sig)); if (!card) return null;
  const cell = card.seats?.[String(pos)]?.[String(status)] || null; if (!cell) return null;
  if (plan) { const ok = checkProvenance(plan, cell); if (!ok.ok) return null; }
  return cell;
}

/** For readPlan: a lookup bound to nothing but the snapshot (provenance is checked by the caller's join step). */
export const snapshotLookup = (sig, pos, status) => lookupCell(sig, pos, status);
