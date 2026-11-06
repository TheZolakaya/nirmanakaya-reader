// THE BLINDNESS LAYER (BRIEF §2; DESIGN §4). Before judging, every output to be judged is relabeled with a random id; the mapping
// (id → arm, item, model, repeat) is written to a SEALED file that the judge path never opens (only the scorer reads it, after every
// judgment is in). The judge receives the rubric, the task, the context, the policy and the reference — and the output, formatting
// normalized without changing substance. Never an arm id, never the Recognition block, never B's review, never a self-justification.
// assertBlind() checks every judge input on those terms; an output that itself carries treatment text is COUNTED (a guard), not hidden.
import path from 'node:path';
import { randomId, writeJson, readJson } from './util.mjs';

export const normalizeOutput = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

/** Relabel. entries: [{ arm, itemId, model, rep, battery, rubricId, output, ... }] → { queue: [{ blindId, ...judgeable }], sealedPath } */
export function relabel(entries, sealedDir) {
  const map = {}, queue = [];
  for (const e of entries) {
    let id; do { id = `o_${randomId(6)}`; } while (map[id]);
    map[id] = { arm: e.arm, itemId: e.itemId, model: e.model, rep: e.rep, battery: e.battery, rubricId: e.rubricId, recordKey: e.recordKey };
    queue.push({ blindId: id, battery: e.battery, rubricId: e.rubricId, item: e.item, output: normalizeOutput(e.output) });
  }
  queue.sort((a, b) => a.blindId.localeCompare(b.blindId)); // judged in random-id order, so neither arm order nor item order leaks through timing
  const sealedPath = writeJson(path.join(sealedDir, 'blind_map.json'), { sealed: true, note: 'read by the scorer only, after every judgment is in; the judge path never opens this file', map });
  return { queue, sealedPath };
}
export const unseal = (sealedPath) => readJson(sealedPath).map;

const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function shingles(text, k = 8) { const w = words(text); const out = new Set(); for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' ')); return out; }

/** The run's treatment texts (every block, every review, every first look) as 8-word shingles, MINUS every shingle that comes from
 *  the inputs (the tasks, the Draft0 texts, the tool state): a block or a review quoting the draft or the task does not make the
 *  draft's or the task's own words "treatment". */
export function treatmentIndex(texts, { exclude = [] } = {}) {
  const inputs = new Set(); for (const t of exclude) for (const s of shingles(t)) inputs.add(s);
  const idx = new Set(); for (const t of texts) for (const s of shingles(t)) if (!inputs.has(s)) idx.add(s);
  return idx;
}
export const overlaps = (text, idx) => { let n = 0; for (const s of shingles(text)) if (idx.has(s)) n++; return n; };

const ALLOWED_INPUT_KEYS = new Set(['blindId', 'rubricId', 'system', 'user', 'max_tokens']);
const ARM_WORDS = /\b(arm|condition)\s*[:=]?\s*(A|B|C|D|C-diag|D-diag|B-loop|B-diag)\b|\bB-loop\b|\bC-diag\b|\bD-diag\b|\bRECOGNITION \((?:a lens|a diagnosis)/;

/** Checks one judge input. outputText: the normalized output inside it (the only place treatment text may appear, and then it is counted). */
export function assertBlind(input, { outputText, treatment }) {
  const problems = [];
  for (const k of Object.keys(input)) if (!ALLOWED_INPUT_KEYS.has(k)) problems.push(`the judge input carries a field "${k}"`);
  const frame = `${input.system}\n${outputText ? String(input.user).split(outputText).join(' ') : String(input.user)}`; // the judge's text with the output itself taken out
  if (ARM_WORDS.test(frame)) problems.push('an arm label or a Recognition header appears outside the output');
  const leaked = overlaps(frame, treatment); if (leaked) problems.push(`${leaked} shingle(s) of a block or review appear outside the output`);
  if (problems.length) throw new Error(`BLINDNESS: ${problems.join('; ')}`);
  return { ok: true, treatmentInOutput: overlaps(outputText, treatment) };
}
