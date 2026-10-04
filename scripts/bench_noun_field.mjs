// BENCH — THE NOUN FIELD (2026-10-04): the exhibit draw (Unacknowledged Faith in Imagination, a right-now ask) and Keel's Denver question,
// N openings each, the record WITHOUT the FIELD line (NOUN_FIELD=0 for that lane, run in a separate process) and WITH it; the numbers are
// `unnamed` (something / the thing twice or more outside the closing question) and `listy` (more than four field nouns) — both should fall;
// if unnamed falls and listy rises, the selector is not firing (Keel).   npx tsx scripts/bench_noun_field.mjs [n=10] [lane=on|off]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const N = Number(process.argv[2]) || 10; const LANE = process.argv[3] === 'off' ? 'off' : 'on';
if (LANE === 'off') process.env.NOUN_FIELD = '0';
const { handingReading } = await import('../lib/externalReading.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { getComponent } = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const cases = [
  { key: 'exhibit-now', question: '', draws: [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }] },
  { key: 'denver', question: 'Should I take the job in Denver?', draws: [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }] },
];
const out = { lane: LANE, n: N, cases: {} };
for (const c of cases) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    try { const r = await handingReading({ question: c.question, context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, c.draws); const it = r.interpretation; const lint = lintOutput({ text: '', parsed: { gist: it.gist, reader: it.text, medicine: it.medicine, question: it.question, chips: it.chips, next: it.next }, preset: { kind: 'opening' }, hostile: false, draw: c.draws[0], draws: c.draws }); rows.push({ flags: lint.flags.map((f) => f.code), gist: it.gist, text: it.text, medicine: it.medicine, question: it.question }); }
    catch (e) { rows.push({ flags: ['error'], error: e.message }); }
    process.stdout.write(`${LANE} ${c.key} ${i + 1}/${N}: ${rows[rows.length - 1].flags.join(' ') || 'clean'}\n`);
  }
  out.cases[c.key] = rows;
}
fs.mkdirSync('data/bakeoff/nounfield', { recursive: true });
const file = `data/bakeoff/nounfield/${LANE}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`; fs.writeFileSync(file, JSON.stringify(out, null, 1));
const tally = (rows, code) => rows.filter((r) => r.flags.includes(code)).length;
for (const [k, rows] of Object.entries(out.cases)) console.log(`${LANE} ${k}: unnamed ${tally(rows, 'unnamed')}/${rows.length} · listy ${tally(rows, 'listy')}/${rows.length} · bothways ${tally(rows, 'bothways')} · binding ${tally(rows, 'binding')} · promise ${tally(rows, 'promise')}`);
console.log('saved', file);
