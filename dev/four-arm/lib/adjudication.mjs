// THE ADJUDICATION EXPORT (DESIGN §5; AMENDMENT v2 item 8). One row per Draft0 (single-turn: the draft; multistep: the final
// proposal B / C / C-diag fork from) with ALL Recognition output removed: the CSV carries the task and the draft only, under a
// random id. C's drawn lean and C-diag's inferred lean go to a SEALED map the adjudicators never see; the kappa scorer reads both.
import path from 'node:path';
import { randomId, toCsv, writeText, writeJson, readJson, parseCsv } from './util.mjs';
import { overlaps } from './blind.mjs';
import fs from 'node:fs';

export const ADJ_COLUMNS = ['adjudication_id', 'battery', 'task', 'draft', 'label_a', 'notes_a', 'label_b', 'notes_b', 'adjudicated'];

export function exportAdjudication({ runDir, records, itemsById, treatment }) {
  const byUnit = new Map();
  for (const r of records) { const k = `${r.itemId}|${r.model}|${r.rep}`; if (!byUnit.has(k)) byUnit.set(k, []); byUnit.get(k).push(r); }
  const rows = [], sealed = {}, refusedRows = [];
  for (const [k, rs] of byUnit) {
    const a = rs.find((r) => r.arm === 'A'); if (!a) continue;
    const draft = a.kind === 'multistep' ? (a.draft0FinalProposal ?? null) : a.output;
    if (draft == null) continue;
    // Draft0 precedes every Recognition; it must carry none of it. A row that does is refused, never cleaned.
    if (/RECOGNITION \((a lens|a diagnosis)/.test(draft) || overlaps(draft, treatment) > 0) { refusedRows.push(k); continue; }
    const lean = (arm) => rs.find((r) => r.arm === arm)?.passes?.[0]?.components?.lean?.name ?? null;
    let id; do { id = `adj_${randomId(5)}`; } while (sealed[id]);
    rows.push({ adjudication_id: id, battery: a.battery, task: itemsById[a.itemId]?.task ?? '', draft, label_a: '', notes_a: '', label_b: '', notes_b: '', adjudicated: '' });
    sealed[id] = { itemId: a.itemId, model: a.model, rep: a.rep, draft0Sha: a.draft0Sha, predictions: { C: lean('C'), 'C-diag': lean('C-diag') } };
  }
  rows.sort((x, y) => x.adjudication_id.localeCompare(y.adjudication_id));
  const csvPath = writeText(path.join(runDir, 'adjudication_export.csv'), toCsv(rows, ADJ_COLUMNS));
  const sealedPath = writeJson(path.join(runDir, 'sealed', 'adjudication_map.json'), { sealed: true, note: 'the adjudicators never see this file; the kappa scorer reads it after the labels are in', map: sealed });
  return { csvPath, sealedPath, rows: rows.length, refusedRows };
}

export function loadForScoring(labelsCsvPath, sealedPath) {
  const rows = parseCsv(fs.readFileSync(labelsCsvPath, 'utf8'));
  const map = readJson(sealedPath).map;
  const predictions = Object.fromEntries(Object.entries(map).map(([id, v]) => [id, v.predictions]));
  return { rows, predictions };
}
