// THE RECOGNIZER-ACCURACY CHECK (DESIGN §5; AMENDMENT v2 item 8; Air's detail 11). Two human adjudicators label each Draft0's lean
// from the frozen annotation manual, never seeing any Recognition output. C-diag's INFERRED lean and C's DRAWN lean (the chance
// baseline) are each compared with the adjudicated label, separately. Kappa's chance agreement comes from the ACTUAL distribution of
// the conditions the arm produced and the ACTUAL distribution of the human labels — never a uniform assumption.
// THE PREREGISTERED RULE (kappa-rule-v1), for uncertain and multi-label human labels:
//   1. An item whose adjudicated label is "uncertain" (or empty) is EXCLUDED from every kappa and counted; the fraction
//      unclassifiable is reported.
//   2. A multi-label item ("Too Much|Unacknowledged") enters the PRIMARY kappa with its FIRST (dominant) label.
//   3. SECONDARY, any-match: a prediction matches when it is any listed label; its chance expectation per item is the sum of the
//      arm's actual prediction frequencies over that item's label set; kappa_any = (observed - expected) / (1 - expected).
//   4. Kappa against each adjudicator alone uses that adjudicator's first label, items where that adjudicator was certain.
import { cohenKappa } from './stats.mjs';
import { mean, seededInt, seededFloat } from './util.mjs';

export const LEANS = ['Balanced', 'Too Much', 'Too Little', 'Unacknowledged'];
export const KAPPA_RULE = { id: 'kappa-rule-v1', steps: ['uncertain adjudicated labels are excluded and counted', 'multi-label: the first (dominant) label in the primary kappa', 'secondary any-match agreement with chance from the actual prediction distribution', 'per-adjudicator kappa on that adjudicator\'s certain items'] };

export function parseLabel(s) {
  const raw = String(s || '').trim();
  if (!raw || /^uncertain$/i.test(raw)) return { uncertain: true, labels: [] };
  const parts = raw.split('|').map((x) => x.trim()).filter(Boolean);
  const labels = parts.map((p) => LEANS.find((l) => l.toLowerCase() === p.toLowerCase()) || null);
  if (labels.some((l) => l == null)) return { uncertain: false, labels: [], invalid: raw };
  return { uncertain: false, labels };
}

/** rows: the adjudication CSV with labels filled ([{ adjudication_id, label_a, label_b, adjudicated }]); predictions: { id: { C, 'C-diag' } }. */
export function scoreAgreement(rows, predictions, { arms = ['C-diag', 'C'], margin = null } = {}) {
  const P = rows.map((r) => ({ id: r.adjudication_id, a: parseLabel(r.label_a), b: parseLabel(r.label_b), adj: parseLabel(r.adjudicated) }));
  const invalid = P.filter((p) => p.a.invalid || p.b.invalid || p.adj.invalid).map((p) => p.id);
  const usable = P.filter((p) => !p.adj.uncertain && p.adj.labels.length);
  const first = (x) => x.labels[0];
  const inter = cohenKappa(P.filter((p) => !p.a.uncertain && !p.b.uncertain && p.a.labels.length && p.b.labels.length).map((p) => [first(p.a), first(p.b)]), LEANS);
  const byArm = {};
  for (const arm of arms) {
    const has = (p) => predictions[p.id] && LEANS.includes(predictions[p.id][arm]);
    const primary = cohenKappa(usable.filter(has).map((p) => [first(p.adj), predictions[p.id][arm]]), LEANS);
    const vsA = cohenKappa(P.filter((p) => !p.a.uncertain && p.a.labels.length && has(p)).map((p) => [first(p.a), predictions[p.id][arm]]), LEANS);
    const vsB = cohenKappa(P.filter((p) => !p.b.uncertain && p.b.labels.length && has(p)).map((p) => [first(p.b), predictions[p.id][arm]]), LEANS);
    const scored = usable.filter(has);
    const dist = Object.fromEntries(LEANS.map((l) => [l, scored.length ? scored.filter((p) => predictions[p.id][arm] === l).length / scored.length : 0]));
    const obs = mean(scored.map((p) => (p.adj.labels.includes(predictions[p.id][arm]) ? 1 : 0)));
    const exp = mean(scored.map((p) => p.adj.labels.reduce((s, l) => s + dist[l], 0)));
    const anyMatch = { n: scored.length, observed: obs, expected: exp, kappa: obs == null || exp == null || exp >= 1 ? null : (obs - exp) / (1 - exp) };
    byArm[arm] = { primary, vsAdjudicatorA: vsA, vsAdjudicatorB: vsB, anyMatch, missingPredictions: usable.length - scored.length };
  }
  const diff = byArm['C-diag']?.primary?.kappa != null && byArm.C?.primary?.kappa != null ? byArm['C-diag'].primary.kappa - byArm.C.primary.kappa : null;
  return {
    rule: KAPPA_RULE, n: P.length, usable: usable.length, excludedUncertain: P.length - usable.length, fractionUnclassifiable: P.length ? (P.length - usable.length) / P.length : null, invalidLabels: invalid,
    interAdjudicator: inter, byArm,
    cDiagOverChance: { difference: diff, margin, beatsBaseline: diff != null && margin != null ? diff > margin : null },
  };
}

/** A synthetic label set with known structure: human labels from a NON-uniform distribution, C drawn uniformly at random
 *  (independent of the draft, as the lens is), C-diag agreeing with the truth part of the time. Uncertain and multi-label included. */
export function syntheticLabelSet({ n = 240, seed = 'synthetic-kappa-v1' } = {}) {
  const r = seededInt(seed), u = seededFloat(`${seed}|f`);
  const TRUE_DIST = [['Balanced', 0.30], ['Too Much', 0.20], ['Too Little', 0.38], ['Unacknowledged', 0.12]];
  const drawTrue = () => { let x = u(), acc = 0; for (const [l, p] of TRUE_DIST) { acc += p; if (x < acc) return l; } return 'Unacknowledged'; };
  const other = (l) => { const o = LEANS.filter((x) => x !== l); return o[r(o.length)]; };
  const rows = [], predictions = {};
  for (let i = 0; i < n; i++) {
    const id = `syn_${String(i).padStart(4, '0')}`; const t = drawTrue();
    const a = u() < 0.85 ? t : other(t), b = u() < 0.85 ? t : other(t);
    const z = u(); const adjudicated = z < 0.08 ? 'uncertain' : z < 0.18 ? `${t}|${other(t)}` : t;
    rows.push({ adjudication_id: id, label_a: z < 0.08 && u() < 0.5 ? 'uncertain' : a, label_b: b, adjudicated });
    predictions[id] = { C: LEANS[r(4)], 'C-diag': u() < 0.55 ? t : (u() < 0.6 ? 'Too Much' : other(t)) };
  }
  return { rows, predictions, truth: { n, seed, humanDistribution: Object.fromEntries(TRUE_DIST), adjudicatorAccuracy: 0.85, cDiagAccuracy: 0.55, cDiagBias: 'over-predicts Too Much when wrong', lens: 'uniform, independent of the item' } };
}
