// STATISTICS. The paired bootstrap (seeded; units are items, clustered: repeats are averaged within an item first), Cohen's kappa
// with the chance agreement computed from the ACTUAL marginal distributions of the two raters (never assumed uniform),
// per-condition precision and recall with the confusion matrix, and a quadratic-weighted kappa for ordinal (1-5) calibration.
import { seededInt, mean, quantile } from './util.mjs';

/** diffs: one paired difference per unit, oriented so that positive = the first arm better. pLeqMargin: the bootstrap one-sided
 *  p-value (the share of resampled means at or below the margin), for the preregistered Holm step across batteries. */
export function pairedBootstrap(diffs, { resamples = 10000, seed = 'bootstrap', alpha = 0.05, margin = 0 } = {}) {
  const n = diffs.length;
  if (!n) return { n: 0, mean: null, lo: null, hi: null, lower1: null, pLeqMargin: null };
  const r = seededInt(seed); const means = new Array(resamples);
  for (let b = 0; b < resamples; b++) { let s = 0; for (let i = 0; i < n; i++) s += diffs[r(n)]; means[b] = s / n; }
  return { n, mean: mean(diffs), lo: quantile(means, alpha / 2), hi: quantile(means, 1 - alpha / 2), lower1: quantile(means, alpha), pLeqMargin: means.filter((m) => m <= margin).length / resamples, margin, resamples, seed, alpha };
}

/** Holm's step-down over one-sided p-values: returns, per key, whether it is rejected at family-wise alpha. */
export function holm(pByKey, alpha = 0.05) {
  const keys = Object.keys(pByKey).filter((k) => pByKey[k] != null).sort((a, b) => pByKey[a] - pByKey[b]);
  const out = {}; let stop = false;
  keys.forEach((k, i) => { const ok = !stop && pByKey[k] <= alpha / (keys.length - i); if (!ok) stop = true; out[k] = ok; });
  return out;
}

/** Cohen's kappa. pairs: [[a, b], ...] over the same items; categories: the label set. p_e from the raters' ACTUAL marginals. */
export function cohenKappa(pairs, categories) {
  const N = pairs.length;
  if (!N) return { n: 0, kappa: null, po: null, pe: null };
  const idx = new Map(categories.map((c, i) => [c, i])); const K = categories.length;
  const M = Array.from({ length: K }, () => new Array(K).fill(0)); // M[a][b]: rows = rater a (the label), cols = rater b (the prediction)
  for (const [a, b] of pairs) { if (!idx.has(a) || !idx.has(b)) throw new Error(`kappa: a value outside the categories: ${a} / ${b}`); M[idx.get(a)][idx.get(b)]++; }
  const rowM = M.map((row) => row.reduce((x, y) => x + y, 0) / N), colM = categories.map((_, j) => M.reduce((x, row) => x + row[j], 0) / N);
  const po = categories.reduce((s, _, i) => s + M[i][i], 0) / N;
  const pe = categories.reduce((s, _, i) => s + rowM[i] * colM[i], 0);
  const kappa = pe >= 1 ? null : (po - pe) / (1 - pe);
  const perCondition = Object.fromEntries(categories.map((c, i) => {
    const tp = M[i][i], fp = M.reduce((s, row, r) => s + (r === i ? 0 : row[i]), 0), fn = M[i].reduce((s, v, j) => s + (j === i ? 0 : v), 0);
    return [c, { precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, support: tp + fn, predicted: tp + fp }];
  }));
  return { n: N, kappa, po, pe, marginals: { label: Object.fromEntries(categories.map((c, i) => [c, rowM[i]])), prediction: Object.fromEntries(categories.map((c, i) => [c, colM[i]])) }, confusion: { rows: 'label', cols: 'prediction', categories, matrix: M }, perCondition };
}

/** Quadratic-weighted kappa for ordinal scores (1..K): the judge-versus-human calibration of the continuity panel's dimensions. */
export function weightedKappa(pairs, levels) {
  const N = pairs.length; if (!N) return { n: 0, kappa: null };
  const K = levels.length; const at = new Map(levels.map((l, i) => [l, i]));
  const O = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const [a, b] of pairs) O[at.get(a)][at.get(b)]++;
  const ra = O.map((r) => r.reduce((x, y) => x + y, 0)), cb = levels.map((_, j) => O.reduce((x, r) => x + r[j], 0));
  let num = 0, den = 0;
  for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) { const w = ((i - j) ** 2) / ((K - 1) ** 2); num += w * O[i][j]; den += w * (ra[i] * cb[j]) / N; }
  return { n: N, kappa: den === 0 ? null : 1 - num / den };
}
