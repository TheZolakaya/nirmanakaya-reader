// THE READ: print finished cells in full, for a person to read — not a count.
//   npx tsx scripts/pour_read.mjs [prompt-suffix=o] [count=12] [seed=1] [--status N] [--class Archetype|Bound|Agent] [--clean]
import fs from 'node:fs';
const a = process.argv.slice(2);
const suffix = a.find((x) => /^[a-z]$/.test(x)) || 'o'; const count = Number(a.find((x) => /^\d+$/.test(x)) || 12); const seed0 = Number((a.find((x) => /^seed=\d+$/.test(x)) || 'seed=1').slice(5));
const statusOnly = a.includes('--status') ? Number(a[a.indexOf('--status') + 1]) : null; const classOnly = a.includes('--class') ? a[a.indexOf('--class') + 1] : null; const cleanOnly = a.includes('--clean');
const dir = 'data/pour/cells_l_or-v4.1-flash'; const ST = ['', 'BALANCED', 'TOO MUCH', 'TOO LITTLE', 'UNACKNOWLEDGED'];
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'))).filter((j) => j.prompt === `pour-author-2026-10-03-${suffix}`);
const klass = (id) => (id < 22 ? 'Archetype' : id < 62 ? 'Bound' : 'Agent');
let seed = seed0; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pool = []; for (const r of rows) for (const c of r.cells) { if (statusOnly && c.status !== statusOnly) continue; if (classOnly && klass(r.signature_id) !== classOnly) continue; if (cleanOnly && (c.lint || []).some((f) => f.hard)) continue; pool.push({ r, c }); }
const picked = []; const seen = new Set();
while (picked.length < count && picked.length < pool.length) { const x = pool[Math.floor(rnd() * pool.length)]; const k = `${x.r.signature_id}/${x.r.position_id}/${x.c.status}`; if (seen.has(k)) continue; seen.add(k); picked.push(x); }
for (const { r, c } of picked) {
  const flags = (c.lint || []).filter((f) => f.hard).map((f) => f.code);
  console.log(`\n######## ${r.signature} (${klass(r.signature_id)}) in ${r.seat} · ${ST[c.status]} · medicine → ${c.provenance?.partner}${flags.length ? ' · OPEN: ' + flags.join(',') : ''}`);
  console.log(`tense: ${c.tense}`); console.log(c.core); console.log(`— ${c.sheetLine}`); if (c.act) console.log(`act chosen: ${c.act}`); console.log(`> ${c.ask}`);
}
