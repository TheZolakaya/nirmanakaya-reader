// Every judge's pick, by run and section, resolved to lanes; then the totals. Run: npx tsx scripts/picks_matrix.mjs <batchId>
import { readBatch, sectionsOf } from '../lib/bakeoff/batch.js';
import { readVotes } from '../lib/bakeoff/store.js';
const b = readBatch(process.argv[2]); if (!b) { console.error('no batch'); process.exit(2); }
const votes = readVotes().filter((v) => v.batch === b.id);
const judges = [...new Set(votes.map((v) => v.judge))];
const short = (k) => (k === 'live' ? 'LIVE' : k === 'handing' ? 'HAND' : k);
console.log(`${b.id} ${b.hostile ? 'hostile' : 'ordinary'} — judges: ${judges.join(', ')}`);
console.log('run  section     ' + judges.map((j) => j.padEnd(10)).join(''));
const totals = {}; for (const j of judges) totals[j] = { live: 0, handing: 0, tie: 0, strongLive: 0, strongHanding: 0 };
for (const run of b.runs) for (const sec of sectionsOf(b)) {
  const cells = judges.map((j) => {
    const v = votes.find((x) => x.judge === j && x.run === run.i && x.section === sec.id); if (!v) return '·'.padEnd(10);
    if (v.pick === 'tie') { totals[j].tie++; return 'tie'.padEnd(10); }
    totals[j][v.pick]++; if (v.strength === 2) totals[j][v.pick === 'live' ? 'strongLive' : 'strongHanding']++;
    return (short(v.pick) + (v.strength === 2 ? '!' : '')).padEnd(10);
  });
  console.log(`${String(run.i).padEnd(4)} ${sec.id.padEnd(11)} ${cells.join('')}`);
}
console.log('\ntotals (picks; strong in parentheses):');
for (const j of judges) console.log(`  ${j.padEnd(10)} LIVE ${totals[j].live} (${totals[j].strongLive})   HANDING ${totals[j].handing} (${totals[j].strongHanding})   ties ${totals[j].tie}`);
const all = { live: 0, handing: 0 }; for (const j of judges) { all.live += totals[j].live; all.handing += totals[j].handing; }
console.log(`  ALL        LIVE ${all.live}   HANDING ${all.handing}`);
// by section across judges
const bySec = {}; for (const v of votes) { bySec[v.section] ||= { live: 0, handing: 0, tie: 0 }; bySec[v.section][v.pick] = (bySec[v.section][v.pick] || 0) + 1; }
console.log('  by section:', Object.entries(bySec).map(([s, c]) => `${s} L${c.live}/H${c.handing}${c.tie ? '/t' + c.tie : ''}`).join('  '));
