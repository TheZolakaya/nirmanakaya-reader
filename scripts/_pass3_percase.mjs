// PASS THREE — the per-case × turn claim-holds table for a benched label, one column per arm, after `_pass3_blind_batches.mjs merge <label>`.
//   npx tsx scripts/_pass3_percase.mjs <label>
import fs from 'node:fs';
const LABEL = process.argv[2] || 'lessons';
const J = JSON.parse(fs.readFileSync(`data/bakeoff/restructure_${LABEL}.json`, 'utf8'));
const rows = J.rows.filter((r) => r.agentScores);
const arms = [...new Set(J.rows.map((r) => r.arm))], cases = [...new Set(J.rows.map((r) => r.case))];
const scored = J.rows.filter((r) => !r.error && r.text).length;
console.log(`${rows.length} of ${scored} replies scored\n`);
const cell = (arm, c, t) => { const rs = rows.filter((r) => r.arm === arm && r.case === c && r.turn === t); return rs.length ? `${rs.filter((r) => r.agentScores.claim === 'holds').length}/${rs.length}` : '—'; };
const runs = new Set(J.rows.map((r) => r.run)).size, voices = new Set(J.rows.map((r) => r.voice)).size; console.log(`claim holds, ${voices} voices × ${runs} run(s) (${voices * runs} a cell)`);
console.log(['case'.padEnd(20), 'turn', ...arms.map((a) => a.padEnd(22))].join(' '));
for (const c of cases) for (const t of [1, 2, 3]) console.log([c.padEnd(20), String(t).padEnd(4), ...arms.map((a) => cell(a, c, t).padEnd(22))].join(' '));
console.log('\ntotals by arm');
for (const a of arms) { const rs = rows.filter((r) => r.arm === a); const h = rs.filter((r) => r.agentScores.claim === 'holds').length; const open = rs.filter((r) => r.turn === 1), later = rs.filter((r) => r.turn > 1); console.log(`  ${a.padEnd(22)} ${h}/${rs.length}   openings ${open.filter((r) => r.agentScores.claim === 'holds').length}/${open.length}   later ${later.filter((r) => r.agentScores.claim === 'holds').length}/${later.length}`); }
console.log('\nby voice');
for (const a of arms) for (const v of ['plain', 'friend']) { const rs = rows.filter((r) => r.arm === a && r.voice === v); if (rs.length) console.log(`  ${a.padEnd(22)} ${v.padEnd(7)} ${rs.filter((r) => r.agentScores.claim === 'holds').length}/${rs.length}`); }
console.log('\nerror labels by arm');
for (const a of arms) { const e = {}; for (const r of rows.filter((r) => r.arm === a)) for (const k of r.agentScores.errors || []) e[k] = (e[k] || 0) + 1; console.log(`  ${a}: ${Object.entries(e).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)'}`); }
