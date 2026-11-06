#!/usr/bin/env node
// THE FOUR-ARM HARNESS — the command line. Nothing here spends money unless PAID_RUNS_ENABLED=true is set by the founder.
//
//   node dev/four-arm/run.mjs dry                                  the free dry run: PREREG (plans/dry-all.json) → run → REPORT
//   node dev/four-arm/run.mjs prereg --plan <name|path> [--run <id>] [--cap <usd>] [--offline]
//   node dev/four-arm/run.mjs estimate --run <id> [--cap <usd>]    print the estimate; refuse when the worst case exceeds the cap
//   node dev/four-arm/run.mjs run --run <id>                       execute a PREREG'd run (refuses without one, or if it is stale)
//   node dev/four-arm/run.mjs report --run <id>                    print a run's REPORT.md
//   node dev/four-arm/run.mjs report --synthetic [n]               the headline rule on a synthetic n-item sample (default 10)
//   node dev/four-arm/run.mjs kappa --run <id> --labels <csv>      score the adjudicated labels (C-diag, and C as the chance baseline)
//   node dev/four-arm/run.mjs kappa --synthetic                    the kappa scorer on a synthetic label set
//
// The smoke test, once the founder sets the paid flag (and FOUR_ARM_MODELS):
//   PAID_RUNS_ENABLED=true node dev/four-arm/run.mjs prereg --plan smoke-feb10 --run smoke-feb10-w0 --cap 5
//   PAID_RUNS_ENABLED=true node dev/four-arm/run.mjs run --run smoke-feb10-w0
process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.warn(`${w.name}: ${w.message}`); });

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt = null) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

const main = async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { PAID, RUNS_DIR } = await import('./lib/config.mjs');
  const banner = () => console.log(PAID ? '*** PAID_RUNS_ENABLED=true: provider calls WILL be made and paid for ***' : 'paid runs OFF: every model answer is a deterministic MOCK; nothing is spent');

  if (cmd === 'dry') {
    banner();
    if (PAID) throw new Error('REFUSED: the dry run runs with PAID_RUNS_ENABLED unset');
    const { loadPlan, writePrereg } = await import('./lib/prereg.mjs');
    const { executeRun } = await import('./lib/runner.mjs');
    const plan = loadPlan(opt('plan', 'dry-all'));
    const runId = opt('run') || `dry-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    const { dir } = await writePrereg(plan, { runId, capUsd: opt('cap') ? Number(opt('cap')) : undefined, offline: !!opt('offline') });
    console.log(`PREREG written: ${path.join(dir, `PREREG_${runId}.md`)}`);
    const { R } = await executeRun(runId);
    console.log(`\nHEADLINE: ${R.headline.headline ?? '(none)'}`); for (const r of R.headline.refusals) console.log(r);
    console.log(`REPORT: ${path.join(dir, 'REPORT.md')}`);
    return R.integrity.ok ? 0 : 1;
  }
  if (cmd === 'prereg') {
    banner();
    const { loadPlan, writePrereg } = await import('./lib/prereg.mjs');
    const plan = loadPlan(opt('plan') || (() => { throw new Error('--plan is required'); })());
    const { dir, prereg } = await writePrereg(plan, { runId: opt('run') || undefined, capUsd: opt('cap') ? Number(opt('cap')) : undefined, offline: !!opt('offline') });
    console.log(`PREREG written: ${path.join(dir, `PREREG_${prereg.runId}.md`)}\nestimate: worst $${prereg.estimate.worstUsd.toFixed(4)}, likely $${prereg.estimate.likelyUsd.toFixed(4)} (${prereg.prices.source === 'MOCK' ? 'MOCK prices' : 'fetched prices'}), cap $${prereg.capUsd}`);
    return 0;
  }
  if (cmd === 'estimate') {
    const { costGate } = await import('./lib/cost.mjs');
    const { readJson } = await import('./lib/util.mjs');
    const p = readJson(path.join(RUNS_DIR, opt('run'), 'prereg.json'));
    const cap = opt('cap') ? Number(opt('cap')) : p.capUsd;
    try { costGate(p.estimate, cap); console.log('within the cap: the run may start'); return 0; } catch (e) { console.log(e.message); return 3; }
  }
  if (cmd === 'run') {
    banner();
    const { executeRun } = await import('./lib/runner.mjs');
    const { R, dir } = await executeRun(opt('run'));
    console.log(`\nHEADLINE: ${R.headline.headline ?? '(none)'}`); for (const r of R.headline.refusals) console.log(r);
    console.log(`REPORT: ${path.join(dir, 'REPORT.md')}`);
    return R.integrity.ok ? 0 : 1;
  }
  if (cmd === 'report') {
    if (opt('synthetic')) {
      const { headlineOnSynthetic } = await import('./lib/synthetic.mjs');
      const n = Number(opt('synthetic')) || 10;
      const s = headlineOnSynthetic(n);
      console.log(`a synthetic ${n}-item sample, labelled a paid confirmatory wave with a calibrated judge (${s.rows} records):`);
      for (const c of s.contrasts) console.log(`  ${c.battery} ${c.metric}: ${c.x} ${c.meanX.toFixed(2)} vs ${c.y} ${c.meanY.toFixed(2)}, improvement ${c.improvement.toFixed(2)}, 95% CI [${c.ci[0].toFixed(2)}, ${c.ci[1].toFixed(2)}], n=${c.n}`);
      console.log(`  triggers: ${s.triggers.map((t) => `${t.id} ${t.status}`).join(', ')}`);
      console.log(`HEADLINE: ${s.headline.headline}`); for (const r of s.headline.refusals) console.log(r);
      return 0;
    }
    console.log(fs.readFileSync(path.join(RUNS_DIR, opt('run'), 'REPORT.md'), 'utf8'));
    return 0;
  }
  if (cmd === 'kappa') {
    const { scoreAgreement, syntheticLabelSet } = await import('./lib/kappa.mjs');
    const { loadForScoring } = await import('./lib/adjudication.mjs');
    const { rows, predictions, truth } = opt('synthetic') ? syntheticLabelSet() : { ...loadForScoring(opt('labels'), path.join(RUNS_DIR, opt('run'), 'sealed', 'adjudication_map.json')), truth: null };
    const s = scoreAgreement(rows, predictions, { margin: 0.2 });
    if (truth) console.log(`a SYNTHETIC label set: ${JSON.stringify(truth)}`);
    console.log(`rule ${s.rule.id}: ${s.rule.steps.join('; ')}`);
    console.log(`items ${s.n}; scored ${s.usable}; excluded as uncertain ${s.excludedUncertain} (${(s.fractionUnclassifiable * 100).toFixed(1)}% unclassifiable)`);
    const show = (name, k) => { console.log(`  ${name}: kappa ${k.kappa == null ? '-' : k.kappa.toFixed(3)} = (p_o ${k.po?.toFixed(3)} - p_e ${k.pe?.toFixed(3)}) / (1 - p_e), n=${k.n}`); };
    show('the two adjudicators', s.interAdjudicator);
    for (const [arm, r] of Object.entries(s.byArm)) {
      console.log(`${arm}${arm === 'C' ? ' (the lens: the chance baseline)' : ' (the inference)'}:`);
      show('vs the adjudicated label (primary)', r.primary); show('vs adjudicator A', r.vsAdjudicatorA); show('vs adjudicator B', r.vsAdjudicatorB);
      console.log(`  chance from the ACTUAL marginals: predictions ${Object.entries(r.primary.marginals.prediction).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(', ')}; labels ${Object.entries(r.primary.marginals.label).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(', ')}`);
      console.log(`  per condition: ${Object.entries(r.primary.perCondition).map(([k, v]) => `${k} precision ${v.precision == null ? '-' : v.precision.toFixed(2)} recall ${v.recall == null ? '-' : v.recall.toFixed(2)}`).join('; ')}`);
      console.log(`  any-match (secondary): observed ${r.anyMatch.observed?.toFixed(3)}, expected ${r.anyMatch.expected?.toFixed(3)}, kappa ${r.anyMatch.kappa?.toFixed(3)}`);
    }
    console.log(`C-diag minus C (kappa): ${s.cDiagOverChance.difference?.toFixed(3)}; margin ${s.cDiagOverChance.margin}; beats the chance baseline by the margin: ${s.cDiagOverChance.beatsBaseline}`);
    return 0;
  }
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  return cmd ? 2 : 0;
};

main().then((code) => process.exit(code)).catch((e) => { console.error(e?.message || e); process.exit(e?.name === 'RefusedError' || e?.name === 'OverCapError' || e?.name === 'HoldError' ? 3 : 1); });
