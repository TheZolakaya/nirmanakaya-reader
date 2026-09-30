// Feed a judge's pick lines (a PICKS file from the shelf) into the bake-off's votes, exactly as the judge door would.
// Run: npx tsx scripts/ingest_picks.mjs <batchId> <judgeName> <picksFile>   — then `npx tsx scripts/ingest_picks.mjs tally <batchId>`
import fs from 'node:fs';
import { readBatch, parsePicks, laneForLetter, lanesOf, sectionsOf } from '../lib/bakeoff/batch.js';
import { appendVote, readVotes, tally } from '../lib/bakeoff/store.js';
import { presetById } from '../lib/bakeoff/presets.js';

const [a0, a1, a2] = process.argv.slice(2);
if (a0 === 'tally') {
  const b = readBatch(a1); if (!b) { console.error('no batch'); process.exit(2); }
  const votes = readVotes().filter((v) => v.batch === b.id);
  const judges = [...new Set(votes.map((v) => v.judge))];
  console.log(`batch ${b.id} (${b.hostile ? 'hostile' : 'ordinary'}): ${votes.length} votes from ${judges.join(', ') || 'nobody'}`);
  for (const j of [null, ...judges]) {
    const t = tally(votes, { judge: j || undefined });
    console.log(`\n  ${j ? 'judge ' + j : 'ALL JUDGES'}`);
    for (const [lane, s] of Object.entries(t.per || t)) if (s && typeof s === 'object' && 'picks' in s) console.log(`    ${lane.padEnd(10)} picks ${s.picks}  strong ${s.strong}  ties ${s.ties}  shown ${s.shown}`);
  }
  // per section, who won
  const bySec = {};
  for (const v of votes) { const k = v.section; bySec[k] ||= {}; bySec[k][v.pick] = (bySec[k][v.pick] || 0) + 1; }
  console.log('\n  by section:', JSON.stringify(bySec));
  process.exit(0);
}
const [batchId, judge, file] = [a0, a1, a2];
const b = readBatch(batchId); if (!b) { console.error('no batch', batchId); process.exit(2); }
const text = fs.readFileSync(file, 'utf8');
const { picks, bad } = parsePicks(text);
const already = new Set(readVotes().filter((v) => v.batch === b.id && v.judge === judge).map((v) => `${v.run}:${v.section}`));
let n = 0, skipped = 0, dup = 0;
for (const p of picks) {
  const run = b.runs.find((r) => r.i === p.run); if (!run) { skipped++; continue; }
  const sec = sectionsOf(b).find((s) => s.id === p.section); if (!sec || !run.sections[sec.id]) { skipped++; continue; }
  if (already.has(`${run.i}:${sec.id}`)) { dup++; continue; }
  const lanes = lanesOf(b, run.i, sec.id);
  const lane = p.pick === "tie" ? null : laneForLetter(b, run.i, sec.id, p.pick); const pick = p.pick === "tie" ? "tie" : (lane && (lane.key || lane));
  if (!pick) { skipped++; continue; }
  appendVote({ judge, judgeKind: 'seat', batch: b.id, run: run.i, section: sec.id, lane: b.lane, preset: run.preset || presetById(sec.preset).id, question: run.question, draw: run.draw, lanes, pick, pickLetter: p.pick, strength: p.strength, tags: {}, note: '', at: new Date().toISOString() });
  n++; already.add(`${run.i}:${sec.id}`);
}
console.log(`${judge}: ${picks.length} pick lines parsed, ${n} votes written, ${dup} already there, ${skipped} skipped${bad.length ? `, ${bad.length} unparsed lines (first: ${JSON.stringify(bad[0]).slice(0, 80)})` : ''}`);
