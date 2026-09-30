// THE HANDING BENCH — run the bake-off from the command line (the HTTP route is admin-gated on the founder's
// session; this uses the same library directly, with the keys from .env.local). Nothing here touches the Reader.
//
//   npx tsx scripts/bench_handing.mjs save   <id> <name> <file.json>   # store a variant: {"BASE_SYSTEM": "...", "EZ_RULES": "..."} (a set) or {"target":"EZ_RULES","text":"..."}
//   npx tsx scripts/bench_handing.mjs run    <variantId> [n=6] [hostile|ordinary] [model=or-v4.1-flash]  # LIVE vs the variant, on PRODUCTION'S FIRST LANE by default (OpenRouter · DeepSeek v4.1-flash); 'sonnet' = the last-rung fallback
//   npx tsx scripts/bench_handing.mjs tally  <batchId>                  # lint flags per lane, per section
//   npx tsx scripts/bench_handing.mjs shelf  <batchId>                  # the blind markdown to G:\My Drive\For Air Review (for the council's judging)
// The keys come from .env.local, read here (values never printed).
import fs from 'node:fs';
const ENV = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const line of ENV.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import { createBatch, runBatch, readBatch, exportMarkdown, sectionsOf } from '../lib/bakeoff/batch.js';
import { saveVariant, readVariants, writeToShelf, nextShelfName } from '../lib/bakeoff/store.js';

const [cmd, ...a] = process.argv.slice(2);
const need = (k) => { if (!process.env[k]) { console.error(`missing ${k} in .env.local`); process.exit(2); } };

if (cmd === 'save') {
  const [id, name, file] = a; const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = j.target ? saveVariant({ id, name, target: j.target, text: j.text, author: 'True' })
    : saveVariant({ id, name, target: 'SET', text: '', over: j, author: 'True' });
  console.log('saved variant', row.id, Object.keys(row.over || { [row.target]: 1 }).join('+'));
} else if (cmd === 'run') {
  need('ANTHROPIC_API_KEY');
  const [variantId, nRaw = '6', hostileRaw = '', model = 'or-v4.1-flash'] = a; const n = Number(nRaw) || 6; const hostile = hostileRaw === 'hostile';
  if (!readVariants().some((v) => v.id === variantId)) { console.error('no such variant', variantId); process.exit(2); }
  const b = createBatch({ n, lane: 'prompt', model, variants: [variantId], author: 'True', hostile });
  console.log(`batch ${b.id} code ${b.code}: ${b.runs.length} runs × ${sectionsOf(b).length} sections × ${b.lanes.length} lanes on ${b.lanes[0].label.split(' · ').pop()} — running…`);
  const t0 = Date.now();
  await runBatch(b.id);
  const done = readBatch(b.id);
  console.log(`status ${done.status}${done.error ? ' — ' + done.error : ''} in ${Math.round((Date.now() - t0) / 1000)}s`);
  tally(done);
} else if (cmd === 'tally') {
  const b = readBatch(a[0]); if (!b) { console.error('no batch'); process.exit(2); } tally(b);
} else if (cmd === 'shelf') {
  const b = readBatch(a[0]); if (!b) { console.error('no batch'); process.exit(2); }
  const name = nextShelfName(`BAKEOFF_BATCH_${b.id}`); const r = writeToShelf(name, exportMarkdown(b));
  console.log('shelf:', r?.path || r || name);
} else {
  console.log('usage: save | run | tally | shelf (see the header)'); process.exit(1);
}

function tally(b) {
  const per = {}; // lane -> code -> count
  let sections = 0;
  for (const run of b.runs) for (const [sid, sec] of Object.entries(run.sections || {})) {
    sections++;
    for (const row of sec.rows || []) {
      per[row.key] ||= { rows: 0, flagged: 0, codes: {}, words: 0, cost: 0 };
      const L = per[row.key]; L.rows++; L.words += row.lint?.words || 0; L.cost += row.cost || 0;
      const codes = (row.lint?.flags || []).map((f) => f.code);
      if (codes.length) L.flagged++;
      for (const c of new Set(codes)) L.codes[c] = (L.codes[c] || 0) + 1;
    }
  }
  console.log(`\n${b.runs.length} runs, ${sections} sections judged by the lints:`);
  for (const [key, L] of Object.entries(per)) {
    const codes = Object.entries(L.codes).sort((x, y) => y[1] - x[1]).map(([c, n]) => `${c}×${n}`).join(' ');
    console.log(`  ${key.padEnd(24)} rows ${L.rows}  flagged ${L.flagged}  avg words ${Math.round(L.words / Math.max(1, L.rows))}  $${L.cost.toFixed(3)}  ${codes || 'clean'}`);
  }
}
