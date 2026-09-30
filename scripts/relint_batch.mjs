// Re-run the lints over a stored batch (after a lint fix), without spending a call. Run: npx tsx scripts/relint_batch.mjs <batchId> [<batchId>…]
import { readBatch } from '../lib/bakeoff/batch.js';
import { lintOutput } from '../lib/bakeoff/lint.js';
import { presetById } from '../lib/bakeoff/presets.js';
for (const id of process.argv.slice(2)) {
  const b = readBatch(id); if (!b) { console.error('no batch', id); continue; }
  console.log(`\n### ${id} ${b.hostile ? 'hostile' : 'ordinary'} — OPENING ONLY, re-linted`);
  for (const lane of b.lanes.map((L) => L.key)) {
    const real = [], byCode = {};
    let rows = 0;
    for (const run of b.runs) {
      const preset = presetById(run.preset || 'ez-opening');
      for (const row of run.sections.opening?.rows || []) {
        if (row.key !== lane) continue; rows++;
        const lint = lintOutput({ text: row.text, parsed: row.parsed, preset, hostile: !!preset?.hostile, draw: run.draw });
        for (const f of lint.flags) { if (f.code === 'json-repaired' || f.code === 'words') continue; byCode[f.code] = (byCode[f.code] || 0) + 1; real.push(`run${run.i} ${f.code}: ${f.detail.slice(0, 60)}`); }
      }
    }
    console.log(`  ${lane.padEnd(8)} rows ${rows}  real flags ${real.length}  ${JSON.stringify(byCode)}`);
    for (const r of real) console.log('      ', r);
  }
}
