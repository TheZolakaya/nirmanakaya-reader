// bench/run.mjs — fire preregistered fixtures at the verdict route, save specimens.
// Usage: node bench/run.mjs [fixture-name]   (dev server must be running)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BENCH_URL || 'http://localhost:3000';
const only = process.argv[2] || null;

const fixturesDir = join(ROOT, 'fixtures');
const resultsDir = join(ROOT, 'results');
mkdirSync(resultsDir, { recursive: true });

const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
  .filter(f => !only || f.replace('.json', '') === only);
if (!files.length) { console.error(`No fixtures matched ${only || '(any)'}`); process.exit(1); }

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

for (const file of files) {
  const fixture = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'));
  const name = file.replace('.json', '');
  console.log(`\n=== ${name}: ${fixture.title} ===`);
  const runs = [];
  for (const q of fixture.questions) {
    process.stdout.write(`  → "${q.slice(0, 70)}" ... `);
    const res = await fetch(`${BASE}/api/verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, draws: fixture.draws, model: fixture.model || undefined })
    });
    const data = await res.json();
    const v = data.verdict || null;
    console.log(v ? `${v.verdict}: ${v.headline}` : (data.error || 'no verdict'));
    runs.push({ question: q, verdict: v?.verdict || null, headline: v?.headline || null, qualifier: v?.qualifier || null, walk: v?.walk || null, lean: data.lean || null, typer: data.typer || null, raw: data });
  }
  const specimen = { fixture: name, title: fixture.title, passCriteria: fixture.passCriteria, draws: fixture.draws, ranAt: new Date().toISOString(), target: BASE, runs };
  const out = join(resultsDir, `${name}-${stamp}.json`);
  writeFileSync(out, JSON.stringify(specimen, null, 2));
  console.log(`  specimen → bench/results/${name}-${stamp}.json`);
}
console.log('\nBattery complete. Read the specimens; the pass criteria are in each file.');
