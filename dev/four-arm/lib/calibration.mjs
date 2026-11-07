// JUDGE CALIBRATION (DESIGN §4; AMENDMENT v2 item 7). The calibration set (the February items plus a small sample per battery) is
// exported BLIND for two human raters — the task and the response under a random id, with each rubric's own dimensions as empty
// columns; the judge's scores stay in a sealed map. When the labels are back, the judge's agreement with each rater and the raters'
// agreement with each other are computed per dimension (quadratic-weighted kappa on the 1-5 scales, Cohen's kappa on the classes)
// and written to runs/calibration/calibration.json, which every later PREREG reports. A MOCK run's judge cannot be calibrated:
// its result is written beside that run, never to the shared calibration file.
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR } from './config.mjs';
import { readJson, writeJson, writeText, toCsv, parseCsv, randomId } from './util.mjs';
import { cohenKappa, weightedKappa } from './stats.mjs';
import { CONTINUITY_DIMS } from './judges.mjs';

const DIMS = { continuity5: CONTINUITY_DIMS, xstest: ['cls'], simpleqa: ['grade'], truthfulqa: ['truthful', 'informative'] };
const LEVELS = { cls: ['full_compliance', 'full_refusal', 'partial_refusal'], grade: ['CORRECT', 'INCORRECT', 'NOT_ATTEMPTED'], truthful: ['true', 'false'], informative: ['true', 'false'] };

export function exportCalibration(runId) {
  const dir = path.join(RUNS_DIR, runId);
  const judged = fs.readFileSync(path.join(dir, 'judge_outputs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const sent = new Map(fs.readFileSync(path.join(dir, 'judge_inputs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return [o.blindId, o]; }));
  const rows = [], sealed = {};
  for (const j of judged) {
    const id = `cal_${randomId(5)}`; const input = sent.get(j.blindId);
    const row = { calibration_id: id, rubric: j.rubricId, judge_prompt: input.user };
    for (const d of DIMS[j.rubricId]) { row[`${d}_a`] = ''; row[`${d}_b`] = ''; }
    rows.push(row); sealed[id] = { blindId: j.blindId, rubricId: j.rubricId, judge: j.parsed, mock: !!j.call?.mock };
  }
  const cols = ['calibration_id', 'rubric', 'judge_prompt', ...new Set(Object.values(DIMS).flat().flatMap((d) => [`${d}_a`, `${d}_b`]))];
  const csv = writeText(path.join(dir, 'calibration_export.csv'), toCsv(rows.sort((a, b) => a.calibration_id.localeCompare(b.calibration_id)), cols));
  const map = writeJson(path.join(dir, 'sealed', 'calibration_map.json'), { sealed: true, note: 'the raters never see this file', map: sealed });
  return { csv, map, rows: rows.length };
}

const val = (d, v) => (v === '' || v == null ? null : d in LEVELS ? String(v).trim() : Number(v));
export function calibrate(runId, labelsCsv) {
  const dir = path.join(RUNS_DIR, runId);
  const rows = parseCsv(fs.readFileSync(labelsCsv, 'utf8'));
  const map = readJson(path.join(dir, 'sealed', 'calibration_map.json')).map;
  const mock = Object.values(map).some((m) => m.mock);
  const out = {};
  for (const [rubric, dims] of Object.entries(DIMS)) for (const d of dims) {
    const rs = rows.filter((r) => r.rubric === rubric && map[r.calibration_id]);
    const judgeOf = (r) => { const p = map[r.calibration_id].judge; const v = p?.[d]; return v == null ? null : typeof v === 'boolean' ? String(v) : v; };
    const k = (pairs) => (d in LEVELS ? cohenKappa(pairs, LEVELS[d]) : weightedKappa(pairs, [1, 2, 3, 4, 5]));
    const pairs = (fa, fb) => rs.map((r) => [fa(r), fb(r)]).filter(([a, b]) => a != null && b != null);
    if (!rs.length) continue;
    out[`${rubric}.${d}`] = { n: rs.length, judgeVsA: k(pairs(judgeOf, (r) => val(d, r[`${d}_a`]))).kappa, judgeVsB: k(pairs(judgeOf, (r) => val(d, r[`${d}_b`]))).kappa, aVsB: k(pairs((r) => val(d, r[`${d}_a`]), (r) => val(d, r[`${d}_b`]))).kappa, statistic: d in LEVELS ? 'Cohen kappa' : 'quadratic-weighted kappa' };
  }
  const result = { status: mock ? 'MOCK (not a calibration)' : 'MEASURED', at: new Date().toISOString(), fromRun: runId, labels: path.basename(labelsCsv), perDimension: out };
  const target = mock ? path.join(dir, 'calibration_MOCK.json') : path.join(RUNS_DIR, 'calibration', 'calibration.json');
  writeJson(target, result);
  return { result, target };
}
