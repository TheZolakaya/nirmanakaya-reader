// Which lane sat behind which letter, for named sections of a batch. Run: npx tsx scripts/letters.mjs <batchId> "1:opening,2:opening,6:mechanism" …
import { readBatch, lanesOf } from '../lib/bakeoff/batch.js';
const [id, list] = process.argv.slice(2);
const b = readBatch(id); if (!b) { console.error('no batch'); process.exit(2); }
const want = list ? list.split(',').map((s) => s.trim()) : b.runs.flatMap((r) => Object.keys(r.sections).map((s) => `${r.i}:${s}`));
for (const w of want) {
  const [run, sec] = w.split(':'); const lanes = lanesOf(b, +run, sec);
  console.log(`${id} run ${run} ${sec}: ${lanes.map((L) => `${L.letter}=${L.key}`).join('  ')}`);
}
