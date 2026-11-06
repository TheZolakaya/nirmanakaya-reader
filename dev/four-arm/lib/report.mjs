// THE REPORT (BRIEF §2 outputs; Air's detail 12). The headline is EXACTLY one of three:
//   THE HARNESS WORKS                       a dry run or a smoke test (and any run that earns no more)
//   A PROMISING SIGNAL                      an exploratory paid wave whose point estimate favours C on a primary metric, no trigger; no claim
//   AN IMPROVEMENT WITH ADEQUATE EVIDENCE   only when the PREREG's minimum N and decision rule are met (and calibration, no trigger, no HOLD)
// The third is refused, with its reasons printed, whenever any condition fails; a small sample with a higher mean is never "C beats B".
// A run whose integrity checks fail gets no headline at all.
import { PUBLISHED, METRICS, FEBRUARY_V9 } from './metrics.mjs';
import { CONTINUITY_DIMS } from './judges.mjs';
import { holm } from './stats.mjs';
import { fmt, usd } from './util.mjs';

export const HEADLINES = ['THE HARNESS WORKS', 'A PROMISING SIGNAL', 'AN IMPROVEMENT WITH ADEQUATE EVIDENCE'];

export function chooseHeadline({ kind, paid, mock, integrity, hold, contrasts, triggers, decision, calibration, batteries }) {
  if (!integrity.ok) return { headline: null, refusals: [`NO HEADLINE: the run's integrity checks failed (${integrity.failures.join('; ')})`] };
  const reasons = [];
  if (kind !== 'confirmatory') reasons.push(`the run is ${kind}, not a preregistered confirmatory wave`);
  if (mock) reasons.push('the model answers are MOCK');
  if (!paid) reasons.push('no paid run');
  if (hold) reasons.push('a HOLD is open');
  const claimable = batteries.filter((b) => PUBLISHED.includes(b));
  if (!claimable.length) reasons.push('no published battery in this run (the February continuity panel cannot carry an external claim)');
  const p = {}, short = [], missing = [];
  for (const b of claimable) {
    const key = METRICS[b][0][0];
    for (const x of ['C', 'C-diag']) {
      const c = contrasts.find((k) => k.battery === b && k.metric === key && k.x === x && k.y === 'B');
      if (!c) { missing.push(`${b} ${x} vs B`); continue; }
      if (c.n < decision.minItemsPerBattery) short.push(`${b} ${x} vs B N=${c.n}`);
      p[`${b} ${x} vs B`] = c.pLeqMargin;
    }
  }
  if (short.length) reasons.push(`N below the preregistered minimum of ${decision.minItemsPerBattery} paired items per battery (${short.join(', ')})`);
  if (missing.length) reasons.push(`no primary contrast for ${missing.join(', ')}`);
  const h = holm(p, 0.05); const met = Object.entries(h).filter(([, ok]) => ok).map(([k]) => k);
  if (Object.keys(h).length && met.length < Object.keys(h).length) reasons.push(`the preregistered one-sided test (bootstrap, Holm-adjusted across ${Object.keys(h).length} primary contrasts) is met for ${met.length} of ${Object.keys(h).length}${Object.keys(h).length <= 4 ? ` (p: ${Object.entries(p).map(([k, v]) => `${k} ${fmt(v, 3)}`).join(', ')})` : ''}`);
  if (!calibration || calibration.status === 'NOT MEASURED') reasons.push('the judge is not calibrated against two human raters');
  const fired = (triggers || []).filter((t) => /^TRIGGERED/.test(t.status));
  if (fired.length) reasons.push(`regression trigger(s) ${[...new Set(fired.map((t) => t.id))].join(', ')}${mock ? ' (on MOCK answers)' : ''}`);
  if (!reasons.length) return { headline: HEADLINES[2], refusals: [] };
  const refusal = `REFUSED: "${HEADLINES[2]}". ${reasons.join('; ')}.`;
  const lead = claimable.length ? claimable : batteries;
  const favours = lead.some((b) => { const key = METRICS[b]?.[0]?.[0]; return ['C', 'C-diag'].some((x) => { const c = contrasts.find((k) => k.battery === b && k.metric === key && k.x === x && k.y === 'B'); return c && c.improvement > 0; }); });
  const promising = !mock && paid && (kind === 'exploratory' || kind === 'confirmatory') && favours && !fired.length && !hold;
  return { headline: promising ? HEADLINES[1] : HEADLINES[0], refusals: [refusal] };
}

const t = (cols, rows) => [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const ci = (c) => (c.ci[0] == null ? '—' : `[${fmt(c.ci[0], 3)}, ${fmt(c.ci[1], 3)}]`);

export function renderReport(R) {
  const L = []; const M = R.mock ? ' (MOCK)' : '';
  L.push(`# Four-arm run ${R.runId}: REPORT`, '');
  L.push(R.headline.headline ? `## HEADLINE: ${R.headline.headline}` : '## NO HEADLINE', '');
  for (const r of R.headline.refusals) L.push(`**${r}**`, '');
  if (R.mock) L.push('> **This is the free DRY RUN.** Every model answer, judgment, latency and price below is a deterministic MOCK. No number in this report is evidence about Recognition; it shows that every part of the harness runs end to end.', '');
  L.push('## The run', '', `- kind **${R.kind}** · paid **${R.paid ? 'yes' : 'no'}** · PREREG freeze \`${R.freezeHash.slice(0, 16)}\` verified before the run · code \`${R.codeHash.slice(0, 16)}\``,
    `- batteries: ${R.batteries.map((b) => `${b.battery} (${b.items} items${b.fixture ? ', FIXTURE' : ''})`).join(', ')} · models: ${R.models.join(', ')} · repeats ${R.repeats}`,
    `- arms: ${R.arms.join(', ')} · B-diag switch ${R.bDiag ? 'ON' : 'OFF'} · lens draws ${R.lensDraw} · route ${R.route} · judge ${R.judge}`,
    `- cost: estimate worst ${usd(R.estimate.worstUsd)} / likely ${usd(R.estimate.likelyUsd)} (${R.estimate.priceSource === 'MOCK' ? 'MOCK prices' : 'fetched prices'}), cap $${R.capUsd}; true spend ${usd(R.spend.spentUsd)} over ${R.spend.calls} paid calls; ${R.spend.mockCalls} mock calls (mock-priced ${usd(R.spend.mockUsd)}, not spent)`, '');
  const I = R.integrity;
  L.push('## Integrity', '', t(['check', 'result'], [
    ['every planned unit x arm produced a record', `${I.records}/${I.planned} ${I.records === I.planned ? 'yes' : 'NO'}`],
    ['Draft0 identical across B / C / C-diag (sha256, per unit)', `${I.draft0.identical}/${I.draft0.units} units${I.draft0.mismatches.length ? ` — MISMATCH ${I.draft0.mismatches.join(', ')}` : ''}`],
    ['leakage assertion on every pass call', `${I.leak.checks} checks, ${I.leak.failures} failures`],
    ['blindness assertion on every judge input', `${I.blind.checks}/${I.blind.inputs} inputs checked, 0 failures (a failure stops the run)`],
    ['every Recognition block checked (word list + semantic validator)', `${I.blocks.checked} blocks: word list ${I.blocks.wordListPass} pass, semantic ${I.blocks.semanticPass} pass; block failures ${I.blocks.failures} (counted, never regenerated), validator errors ${I.blocks.validatorErrors}, classifier failures ${I.blocks.classifierFailures}`],
    ['judge answers parsed', `${I.judge.parsed}/${I.judge.total}`],
    ['HOLD', R.hold ? `OPEN: ${R.hold.reason}` : 'none'],
  ]), '');
  const prim = R.contrasts.filter((c) => c.role === 'primary');
  L.push(`## Primary contrast: C vs B and C-diag vs B, per battery${M}`, '', 'Improvement = the first arm minus the second, oriented so that positive is better for that metric; paired by item x model; a seeded bootstrap; no claim at this N unless the headline says so.', '',
    t(['battery', 'metric', 'contrast', 'n', 'first', 'second', 'improvement', '95% CI', 'one-sided lower'], prim.map((c) => [c.battery, c.metric, `${c.x} vs ${c.y}`, c.n, fmt(c.meanX, 3), fmt(c.meanY, 3), fmt(c.improvement, 3), ci(c), fmt(c.lower1, 3)])), '');
  const sec = R.contrasts.filter((c) => c.role === 'secondary');
  if (sec.length) L.push(`## Secondary: D vs B-loop (multistep)${M}`, '', t(['battery', 'metric', 'contrast', 'n', 'first', 'second', 'improvement', '95% CI'], sec.map((c) => [c.battery, c.metric, `${c.x} vs ${c.y}`, c.n, fmt(c.meanX, 3), fmt(c.meanY, 3), fmt(c.improvement, 3), ci(c)])), '');
  const ctx = R.contrasts.filter((c) => c.role === 'context' || c.role === 'variant');
  if (ctx.length) L.push(`## Context (B vs A, C vs A) and the B-diag variant${M}`, '', t(['battery', 'metric', 'contrast', 'n', 'improvement', '95% CI'], ctx.map((c) => [c.battery, c.metric, `${c.x} vs ${c.y}`, c.n, fmt(c.improvement, 3), ci(c)])), '');
  if (R.batteries.some((b) => b.battery === 'february10')) {
    const A = R.perArmContinuity;
    L.push(`## The February continuity panel (five dimensions, 1-5, scored blind and category-blind)${M}`, '', 'Kept apart from the published batteries and never summed with them. The February V9 column is the archived delta (middleware minus vanilla, one Claude judge who knew the category); it is context, not a target.', '',
      t(['dimension', 'A', 'B', 'C', 'C-diag', 'C minus A', 'C minus B', 'Feb V9 (C minus A)'], CONTINUITY_DIMS.map((d) => [d, fmt(A.A?.[d]), fmt(A.B?.[d]), fmt(A.C?.[d]), fmt(A['C-diag']?.[d]), A.C && A.A ? fmt(A.C[d] - A.A[d]) : '—', A.C && A.B ? fmt(A.C[d] - A.B[d]) : '—', `${FEBRUARY_V9[d] >= 0 ? '+' : ''}${FEBRUARY_V9[d].toFixed(2)}`])), '',
      `The February shape on C vs A (directness up and sycophancy down): **${R.februaryShape}**${M} (descriptive only).`, '');
  }
  L.push(`## Harmful-regression triggers (Air's table)`, '', t(['id', 'trigger', 'status', 'detail'], R.triggers.map((x) => [x.id, x.label, x.status, x.detail || ''])), '', 'Threshold note: the 1-2 pp gates are pilot decision margins; at small N they are point estimates and cannot establish harm or its absence.', '');
  const arms = Object.entries(R.perArm);
  L.push(`## Gaming guards, per arm${M}`, '', t(['arm', 'records', 'words', 'refusal', 'abstention', 'tool avoidance', 'completion', 'grader agreement', 'treatment visible', 'block fail', 'classifier fail', 'validator err'], arms.map(([a, s]) => [a, s.n, fmt(s.words, 0), pct(s.refusal), pct(s.abstention), pct(s.toolAvoidance), pct(s.completion), pct(s.graderAgreement), pct(s.treatmentVisible), s.blockFailures, s.classifierFailures, s.validatorErrors])), '');
  L.push(`## Cost and latency, per arm (the system cost, Draft0 included)${M}`, '', t(['arm', '$ per item', 'target', 'reviewer', 'recognizer (classifier)', 'validator', 'latency p50', 'latency p95', 'tokens'], arms.map(([a, s]) => [a, usd(s.costPerItem), usd(s.costTarget), usd(s.costReviewer), usd(s.costRecognizer), usd(s.costValidator), s.latencyP50 == null ? '—' : `${Math.round(s.latencyP50)} ms`, s.latencyP95 == null ? '—' : `${Math.round(s.latencyP95)} ms`, fmt(s.tokens, 0)])), '',
    `C-diag at its actual system cost: ${R.costGap}`, '');
  L.push('## The recognizer, per item (for the adjudication file)', '', t(['item', 'model', 'C: drawn', 'C-diag: inferred', 'evidence', 'blocks (word list / semantic)'], R.recognizer.map((r) => [r.itemId, r.model, r.drawn || '—', r.inferred || (r.classifierFailure ? `no inference (${r.reason})` : '—'), r.evidence || '—', r.checks])), '');
  L.push('## Incidents and holds', '', R.incidents.length ? t(['unit', 'arm', 'control', 'event', 'action'], R.incidents.map((i) => [i.unit, i.arm, i.control, i.event, i.action])) : 'None.', '');
  L.push('## Files', '', ...R.files.map((f) => `- ${f}`), '');
  return L.join('\n');
}
