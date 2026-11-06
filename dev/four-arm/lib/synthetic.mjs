// A SYNTHETIC SAMPLE for the headline rule (Air's detail 12, acceptance 12): ten paired items on a published battery where C is ahead
// of B on the primary metric, labelled as if it came from a paid confirmatory wave with a calibrated judge, so the ONLY thing between
// it and the third headline is the preregistered minimum N. The report must refuse the third headline and say why.
import { contrasts, perArm, triggers } from './metrics.mjs';
import { chooseHeadline } from './report.mjs';
import { DEFAULTS } from './config.mjs';

export function syntheticSample(n = 10) {
  const rows = [];
  // correct answers per arm across the n items: C 8/10, C-diag 7/10, B 5/10, A 5/10 (a "higher mean" on a tiny sample)
  const pattern = { A: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0], B: [1, 1, 0, 0, 1, 0, 1, 0, 1, 0], C: [1, 1, 1, 1, 1, 0, 1, 1, 1, 0], 'C-diag': [1, 1, 1, 0, 1, 0, 1, 1, 1, 0] };
  for (let i = 0; i < n; i++) for (const arm of Object.keys(pattern)) {
    const correct = pattern[arm][i % 10];
    const record = { arm, itemId: `synthetic:${i + 1}`, battery: 'simpleqa-verified', kind: 'single', model: 'synthetic/model', rep: 0, output: correct ? 'the gold answer' : 'a wrong answer', latencyMs: 1000 + (arm.startsWith('C') ? 200 : 0), cost: { target: 0.001, reviewer: arm === 'B' ? 0.0005 : 0, recognizer: arm === 'C-diag' ? 0.0002 : 0, validator: arm.startsWith('C') ? 0.0002 : 0, total: 0.0015 }, tokens: { input: 900, output: 300 }, passes: [], mock: false };
    rows.push({ record, metrics: { correct, incorrect: 1 - correct, notAttempted: 0, words: 3, refusalStrmatch: 0, costUsd: 0.0015, latencyMs: record.latencyMs, tokens: 1200 }, treatmentInOutput: 0 });
  }
  return rows;
}

export function headlineOnSynthetic(n = 10) {
  const rows = syntheticSample(n);
  const batteries = ['simpleqa-verified'];
  const cs = contrasts(rows, { batteries, seed: 'synthetic-headline', resamples: 4000, margin: 0 });
  const arms = perArm(rows);
  const trig = triggers(cs, arms, batteries, { mock: false });
  const h = chooseHeadline({ kind: 'confirmatory', paid: true, mock: false, integrity: { ok: true, failures: [] }, hold: null, contrasts: cs, triggers: trig, decision: DEFAULTS.decision, calibration: { status: 'MEASURED (synthetic)' }, batteries });
  return { rows: rows.length, contrasts: cs.filter((c) => c.role === 'primary' && c.metric === 'correct'), triggers: trig.filter((t) => t.status !== 'NOT IN THIS RUN'), headline: h };
}
