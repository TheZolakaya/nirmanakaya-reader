// THE RUNNER. One run = one PREREG. Before anything: no HOLD; the PREREG's freeze recomputed and equal; for a paid run, fetched
// prices, no fixture, and a passing free dry run on the same code and prompts; the cost estimate printed and the cap enforced.
// Then, item by item (in a seeded order), model by model, repeat by repeat: Draft0 once, then the arms in a seeded order per unit
// (interleaved). Then blind judging, the scorer's unsealing, metrics, contrasts, triggers, guards, incidents, the report, and the
// adjudication export. A free dry run whose integrity holds writes DRYRUN_PASS.json, which a paid run requires.
import fs from 'node:fs';
import path from 'node:path';
import { PAID, RUNS_DIR, DEFAULTS, ENV, loadEnvNames } from './config.mjs';
import { DEFS } from './defs.mjs';
import { loadPrompts } from './prompts.mjs';
import { verifyFreeze, codeHashes } from './prereg.mjs';
import { costGate } from './cost.mjs';
import { makeGenerator, makeJudge, makeRecognitionCaller, spendTracker } from './adapters.mjs';
import { draftStore, draft0, draft0Trajectory, runSingleArm, runMultiArm, armsFor } from './arms.mjs';
import { assertNoLeak, LeakError } from './leakage.mjs';
import { relabel, unseal, treatmentIndex } from './blind.mjs';
import { judgeView, judgeOne, CONTINUITY_DIMS } from './judges.mjs';
import { recordMetrics, contrasts, perArm, triggers, incidents, METRICS } from './metrics.mjs';
import { chooseHeadline, renderReport } from './report.mjs';
import { exportAdjudication } from './adjudication.mjs';
import { assertNoHold, raiseHold, holdActive } from './hold.mjs';
import { seededInt, shuffle, writeJson, writeText, readJson, stableHash, mean } from './util.mjs';
import { recognize } from '../../../lib/recognition.js';

export class RefusedError extends Error { constructor(msg) { super(msg); this.name = 'RefusedError'; } }
const slug = (s) => String(s).replace(/[^a-z0-9.-]+/gi, '_');
const itemPath = (dir, r) => path.join(dir, 'items', r.battery, slug(r.itemId), slug(r.model), String(r.rep), `${r.arm}.json`);
export const dryRunPassPath = () => path.join(RUNS_DIR, 'DRYRUN_PASS.json');

/** The plan's mockFaults ({ validator: { fail: [ids], garble: [ids] }, classifier: { garble: [ids], misquote: [ids] } }) as the mock
 *  caller's fault functions, matched on the item's task text (the mock sees what the pass sees, never an item id). Dry runs only. */
export function faultsFor(plan, itemsById) {
  if (!plan.mockFaults) return null;
  if (PAID) throw new RefusedError('REFUSED: a plan with mockFaults is a dry-run exercise and never runs paid');
  const pick = (role) => { const spec = plan.mockFaults[role] || {}; const byTask = new Map(); for (const [fault, ids] of Object.entries(spec)) for (const id of ids) if (itemsById[id]) byTask.set(itemsById[id].task, fault); return (meta) => byTask.get(meta.task) || null; };
  return { validator: pick('validator'), classifier: pick('classifier') };
}

/** The Recognition for the harness: the same engine in-process (default), or a running route over HTTP with the harness key. */
export function makeRecognizer({ prices, spend, model, routeUrl = null, faults = null }) {
  const callModel = makeRecognitionCaller({ prices, spend, model, faults });
  if (!routeUrl) return async (input, { drawSeed }) => recognize(input, { DEFS, callModel, nextInt: seededInt(drawSeed) });
  loadEnvNames([ENV.routeKey]);
  return async (input) => {
    const res = await fetch(routeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env[ENV.routeKey] ? { 'x-nkya-key': process.env[ENV.routeKey] } : {}) }, body: JSON.stringify(input) });
    const r = await res.json();
    if (!r.success) throw new Error(`the route refused: ${r.error}`);
    if (!!r.mock === PAID) throw new RefusedError(`the route answered with ${r.mock ? 'MOCK' : 'PAID'} calls during a ${PAID ? 'paid' : 'dry'} run; the route's PAID_RUNS_ENABLED must match the harness's`);
    spend.add({ mock: !!r.mock, costUsd: r.costUsd || 0 });
    return r;
  };
}

export async function executeRun(runId, { log = console.log } = {}) {
  const dir = path.join(RUNS_DIR, runId);
  const pp = path.join(dir, 'prereg.json');
  if (!fs.existsSync(pp)) throw new RefusedError(`REFUSED: no PREREG for ${runId}; write it first (node dev/four-arm/run.mjs prereg --plan <plan>)`);
  assertNoHold();
  const prereg = readJson(pp);
  if (prereg.paid !== PAID) throw new RefusedError(`REFUSED: this PREREG was written ${prereg.paid ? 'for a paid run' : 'for the free dry run'} but ${ENV.paidFlag} is ${PAID ? 'true' : 'not set'}`);
  const v = await verifyFreeze(prereg);
  if (!v.ok) throw new RefusedError(`REFUSED: the PREREG is stale; changed since the freeze: ${v.diffs.join(', ')}. Write a fresh PREREG (tuning after the dry run needs one).`);
  if (PAID) {
    if (prereg.prices.source === 'MOCK') throw new RefusedError('REFUSED: a paid run needs fetched prices; this PREREG carries the MOCK sheet');
    if (prereg.freeze.batteries.some((b) => b.fixture)) throw new RefusedError('REFUSED: a paid run never uses a fixture');
    const dp = fs.existsSync(dryRunPassPath()) ? readJson(dryRunPassPath()) : null;
    if (!dp || dp.codeHash !== prereg.freeze.code || stableHash(dp.prompts) !== stableHash(prereg.freeze.prompts)) throw new RefusedError('REFUSED: no passing free dry run on this exact code and these prompts (run: node dev/four-arm/run.mjs dry)');
  }
  costGate(prereg.estimate, prereg.capUsd, log);

  const F = v.F; const plan = prereg.plan; const prompts = loadPrompts();
  const itemsById = Object.fromEntries(F.items.map((i) => [i.id, i]));
  const spend = spendTracker(prereg.capUsd);
  const gen = makeGenerator({ prices: prereg.prices, spend });
  const judge = makeJudge({ prices: prereg.prices, spend, model: F.judge });
  const recognizeFn = makeRecognizer({ prices: prereg.prices, spend, model: F.recModel, routeUrl: plan.routeUrl || null, faults: faultsFor(plan, itemsById) });
  const leak = { checks: 0, failures: 0 };
  const ctx = {
    gen, recognize: recognizeFn, prompts, budgets: DEFAULTS.budgets, decoding: DEFAULTS.decoding, store: draftStore(path.join(dir, 'draft0')), runId, runSeed: plan.seed,
    leak: (inputs, seen, hidden, where) => {
      try { assertNoLeak(inputs, seen, { hidden, where }); leak.checks++; }
      catch (e) { leak.failures++; if (e instanceof LeakError) raiseHold({ runId, reason: `leakage at ${where}`, detail: e.detail }); throw e; }
    },
  };

  const records = []; let planned = 0;
  const order = shuffle(F.items, seededInt(`${plan.seed}|items`));
  log(`running ${order.length} items x ${F.models.length} model(s) x ${plan.repeats || 1} repeat(s) ${PAID ? 'ON PAID CALLS' : 'on MOCK answers (free)'}…`);
  for (const item of order) for (const model of F.models) for (let rep = 0; rep < (plan.repeats || 1); rep++) {
    const seed = seededInt(`${plan.seed}|seed|${item.id}|${model}|${rep}`)(65536);
    const arms = shuffle(armsFor(item, { arms: plan.arms, bDiag: !!plan.bDiag }), seededInt(`${plan.seed}|arms|${item.id}|${model}|${rep}`));
    planned += arms.length;
    const base = item.kind === 'multistep' ? await draft0Trajectory(ctx, { model, item, seed }) : await draft0(ctx, { model, item, seed });
    const unit = [];
    for (const arm of arms) {
      const rec = item.kind === 'multistep' ? await runMultiArm(ctx, { arm, model, item, seed, rep, t0: base }) : await runSingleArm(ctx, { arm, model, item, seed, rep, d0: base });
      writeJson(itemPath(dir, rec), rec);
      records.push(rec); unit.push(rec);
    }
    if (item.kind === 'multistep') { // the environment's own checks are known now: a new unauthorized action on a real answer holds the run at once
      const rows = unit.map((r) => ({ record: r, metrics: recordMetrics(r, item, {}) }));
      const real = incidents(rows).filter((i) => !i.mock);
      if (real.length) raiseHold({ runId, reason: `incident: ${real[0].event} (${real[0].arm} vs ${real[0].control}, ${real[0].unit})`, detail: real });
    }
  }

  // ── blind judging ──
  const inputTexts = [...F.items.map((i) => i.task), ...records.filter((r) => r.arm === 'A').flatMap((r) => [r.output, ...(r.trajectory?.steps || []).flatMap((s) => [s.proposal, s.result])])].filter(Boolean);
  const treatment = treatmentIndex(records.flatMap((r) => (r.passes || []).flatMap((p) => [p.block, p.review, p.firstLook]).filter(Boolean)), { exclude: inputTexts });
  const entries = records.flatMap((r) => (itemsById[r.itemId].judges || []).map((rubricId) => ({ arm: r.arm, itemId: r.itemId, model: r.model, rep: r.rep, battery: r.battery, rubricId, item: judgeView(itemsById[r.itemId], rubricId), output: r.output, recordKey: `${r.itemId}|${r.model}|${r.rep}|${r.arm}` })));
  const { queue, sealedPath } = relabel(entries, path.join(dir, 'sealed'));
  const inputsLog = path.join(dir, 'judge_inputs.jsonl'), outputsLog = path.join(dir, 'judge_outputs.jsonl');
  for (const f of [inputsLog, outputsLog]) if (fs.existsSync(f)) fs.unlinkSync(f);
  log(`judging ${queue.length} outputs blind…`);
  const judged = [];
  for (const e of queue) judged.push(await judgeOne(judge, e, prompts, { treatment, inputsLog, outputsLog }));

  // ── the scorer unseals (after every judgment is in) ──
  const map = unseal(sealedPath);
  const byRecord = {};
  for (const j of judged) { const m = map[j.blindId]; (byRecord[m.recordKey] ||= { judgments: {}, treatmentInOutput: 0 }); byRecord[m.recordKey].judgments[j.rubricId] = j.parsed; byRecord[m.recordKey].treatmentInOutput += j.treatmentInOutput; }
  const rows = records.map((r) => { const k = `${r.itemId}|${r.model}|${r.rep}|${r.arm}`; return { record: r, metrics: recordMetrics(r, itemsById[r.itemId], byRecord[k]?.judgments || {}), treatmentInOutput: byRecord[k]?.treatmentInOutput || 0 }; });
  // the per-item JSON, completed after unsealing: its judge inputs (exactly as sent) and outputs, and its metrics
  const sent = new Map(fs.readFileSync(inputsLog, 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return [o.blindId, o]; }));
  const judging = {}; for (const j of judged) { const m = map[j.blindId]; (judging[m.recordKey] ||= []).push({ blindId: j.blindId, rubricId: j.rubricId, input: sent.get(j.blindId), output: j.raw, parsed: j.parsed, call: j.call }); }
  for (const { record, metrics } of rows) writeJson(itemPath(dir, record), { ...record, judging: judging[`${record.itemId}|${record.model}|${record.rep}|${record.arm}`] || [], metrics });
  const batteries = F.batteries.map((b) => b.battery);
  const cs = contrasts(rows, { batteries, seed: plan.seed, resamples: DEFAULTS.bootstrap.resamples, margin: prereg.freeze.decision.margin });
  const arms = perArm(rows);
  const mock = records.some((r) => r.mock);
  const trig = triggers(cs, arms, batteries, { mock });
  const inc = incidents(rows);

  // ── integrity ──
  const units = new Map(); for (const r of records) { const k = `${r.itemId}|${r.model}|${r.rep}`; (units.get(k) || units.set(k, []).get(k)).push(r); }
  const mismatches = [];
  for (const [k, rs] of units) { const shas = new Set(rs.filter((r) => ['A', 'B', 'B-diag', 'C', 'C-diag'].includes(r.arm)).map((r) => r.draft0Sha)); const a = rs.find((r) => r.arm === 'A'); if (shas.size !== 1 || (a && a.kind !== 'multistep' && a.outputSha !== a.draft0Sha)) mismatches.push(k); }
  const recPasses = records.flatMap((r) => (r.passes || []).filter((p) => p.kind === 'lens' || p.kind === 'diag'));
  const blocks = recPasses.filter((p) => p.block);
  const integrity = {
    planned, records: records.length,
    draft0: { units: units.size, identical: units.size - mismatches.length, mismatches },
    leak, blind: { inputs: queue.length, checks: judged.length },
    blocks: { checked: blocks.length, wordListPass: blocks.filter((p) => p.wordList?.ok).length, semanticPass: blocks.filter((p) => p.semantic?.pass).length, failures: recPasses.filter((p) => p.blockFailure).length, validatorErrors: recPasses.filter((p) => p.validatorError).length, classifierFailures: recPasses.filter((p) => p.classifierFailure).length },
    judge: { total: judged.length, parsed: judged.filter((j) => j.parsed?.ok).length },
  };
  integrity.failures = [
    records.length !== planned ? 'records missing' : null, mismatches.length ? 'Draft0 differs across B / C / C-diag' : null,
    leak.checks !== records.reduce((s, r) => s + (r.passes?.length || 0), 0) ? 'a pass ran without its leakage check' : null, judged.length !== queue.length ? 'a judge input went unchecked' : null,
    blocks.some((p) => !p.wordList || !p.semantic) ? 'a block went unchecked' : null,
  ].filter(Boolean);
  integrity.ok = integrity.failures.length === 0;
  const hold = holdActive();
  const headline = chooseHeadline({ kind: prereg.kind, paid: PAID, mock, integrity, hold, contrasts: cs, triggers: trig, decision: prereg.freeze.decision, calibration: prereg.calibration, batteries });

  // the continuity panel per arm, the February shape, the cost gap, the recognizer per item
  const perArmContinuity = Object.fromEntries(Object.keys(arms).map((a) => [a, Object.fromEntries(CONTINUITY_DIMS.map((d) => [d, mean(rows.filter((x) => x.record.arm === a && x.metrics[d] != null).map((x) => x.metrics[d]))]))]));
  const cA = perArmContinuity.A, cC = perArmContinuity.C;
  const februaryShape = cA?.directness != null && cC?.directness != null ? ((cC.directness > cA.directness && cC.sycophancy < cA.sycophancy) ? 'observed' : 'not observed') + ` (directness ${(cC.directness - cA.directness >= 0 ? '+' : '')}${(cC.directness - cA.directness).toFixed(2)}, sycophancy ${(cC.sycophancy - cA.sycophancy >= 0 ? '+' : '')}${(cC.sycophancy - cA.sycophancy).toFixed(2)})` : 'not measured (no February ten in this run)';
  const cd = arms['C-diag'], b = arms.B;
  const costGap = cd && b ? `C-diag $${(cd.costPerItem ?? 0).toFixed(5)} per item (of which the classifier $${(cd.costRecognizer ?? 0).toFixed(5)} and the validator $${(cd.costValidator ?? 0).toFixed(5)}) vs B $${(b.costPerItem ?? 0).toFixed(5)}: a gap of $${((cd.costPerItem ?? 0) - (b.costPerItem ?? 0)).toFixed(5)} per item (x${b.costPerItem ? ((cd.costPerItem ?? 0) / b.costPerItem).toFixed(2) : '—'}); latency p50 ${Math.round(cd.latencyP50 ?? 0)} ms vs ${Math.round(b.latencyP50 ?? 0)} ms. ${plan.bDiag ? 'B-diag (the matched independent call) is ON in this run.' : 'B-diag is OFF in this wave; the gap above is the price of the extra call.'}${mock ? ' (MOCK)' : ''}` : 'no C-diag and B in this run';
  const recognizer = [];
  for (const [k, rs] of units) {
    const c = rs.find((r) => r.arm === 'C')?.passes?.[0], d = rs.find((r) => r.arm === 'C-diag')?.passes?.[0];
    if (!c && !d) continue;
    const drawn = c?.components ? `${c.components.lean.name} ${c.components.position.signatureName} in ${c.components.position.seatName}` : null;
    const inferred = d?.components ? `${d.components.lean.name} ${d.components.position.signatureName} (${d.components.position.house} / ${d.components.position.act})` : null;
    const checks = [c, d].filter(Boolean).map((p) => (p.block ? `${p.kind}: ${p.wordList?.ok ? 'ok' : 'FAIL'} / ${p.semantic?.pass ? 'ok' : 'FAIL'}` : `${p.kind}: no block`)).join('; ');
    recognizer.push({ itemId: rs[0].itemId, model: rs[0].model, drawn, inferred, evidence: d?.components ? (d.classifier?.ok ? 'quoted verbatim' : '—') : null, classifierFailure: !!d?.classifierFailure, reason: d?.classifier?.reason, checks });
  }

  const files = ['PREREG_' + runId + '.md', 'prereg.json', 'items/ (one JSON per item x model x repeat x arm)', 'draft0/ (Draft0 by hash)', 'judge_inputs.jsonl (exactly what the judge received)', 'judge_outputs.jsonl', 'sealed/blind_map.json (the scorer only)', 'results.json', 'REPORT.md', 'adjudication_export.csv + sealed/adjudication_map.json'];
  const R = { runId, kind: prereg.kind, paid: PAID, mock, freezeHash: prereg.freezeHash, codeHash: prereg.freeze.code, batteries: F.batteries.map((x) => ({ battery: x.battery, items: x.items.length, fixture: x.fixture })), models: F.models, repeats: plan.repeats || 1, arms: plan.arms, bDiag: !!plan.bDiag, lensDraw: prereg.freeze.lensDraw, route: prereg.freeze.route, judge: F.judge, estimate: prereg.estimate, capUsd: prereg.capUsd, spend: { spentUsd: spend.spentUsd, calls: spend.calls, mockCalls: spend.mockCalls, mockUsd: spend.mockUsd }, integrity, contrasts: cs, perArm: arms, perArmContinuity, februaryShape, triggers: trig, incidents: inc, recognizer, costGap, hold, headline, files };
  writeJson(path.join(dir, 'results.json'), R);
  const md = renderReport(R);
  writeText(path.join(dir, 'REPORT.md'), md);
  const adj = exportAdjudication({ runDir: dir, records, itemsById, treatment });
  if (!PAID && integrity.ok && prereg.kind === 'dry' && !plan.mockFaults) writeJson(dryRunPassPath(), { at: new Date().toISOString(), runId, codeHash: prereg.freeze.code, prompts: prereg.freeze.prompts, note: 'a paid run requires a passing free dry run on this exact code and these prompts' });
  return { dir, R, md, adj };
}

export { METRICS, codeHashes };
