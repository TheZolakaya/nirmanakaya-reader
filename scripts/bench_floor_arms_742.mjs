// .742 THE FLOOR, THREE ARMS (the sitting's step 5): the same draws and questions as the .730 bench, through the real Handing path, with
//   on       — today's poured cell under the draw (the floor as it is)
//   off      — no floor: the record alone (the propositions of .695/.697 already hand status, face and operation in plain words)
//   scaffold — the four derived fields (scripts/derive_scaffold_lab.mjs draws …) in the floor's place, with Air's sentence high in the base
// Measured: the lint's flags, floor sentences copied onto the glass (five-word runs from the cell's own lines, or the scaffold's), the medicine judge,
// words, guess-marks — and every reading saved to be read.
//   READER_PROVIDER=openrouter npx tsx scripts/bench_floor_arms_742.mjs [label=floor742] [arms=on,off,scaffold]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [LABEL = 'floor742', ARMS = 'on,off,scaffold'] = process.argv.slice(2);
const { handingReading } = await import('../lib/externalReading.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { lookupCell } = await import('../lib/pour/library.js');
const SC = JSON.parse(fs.readFileSync('data/bakeoff/scaffold_derived_draws.json', 'utf8'));
const QS = [
  { k: 'today', q: "Why did the app crash right after today's deploy?" }, { k: 'work', q: 'Why does this keep happening in my engineering work?' }, { k: 'life', q: 'Why have I repeated this pattern my whole life?' },
  { k: 'now', q: '' }, { k: 'incident', q: 'What does this incident show me right now?' }, { k: 'vague', q: 'What is going on?' },
];
const draws = [{ transient: 50, position: 8, status: 2 }, { transient: 64, position: 7, status: 3 }, { transient: 30, position: 14, status: 4 }];
const AIR_LINE = "THE FLOOR'S FIELDS. Beneath each draw you may be handed four fields — CONDITION, DOMAIN, OPERATION, INVARIANT. These fields are meaning constraints to instantiate in the asker's situation. They are not sentences to quote or paraphrase closely. Preserve the relations; create the wording.";
const paras = HANDING_SET.BASE_SYSTEM.split(/\n\n/); const BASE_SC = [paras[0], AIR_LINE, ...paras.slice(1)].join('\n\n');
const scId = (d, i) => `draw-${i}-t${d.transient}p${d.position}s${d.status}`;
const scaffoldBlock = (s) => `\n\nTHE FLOOR — meaning constraints for this draw (instantiate in the asker's situation; do not quote; preserve the relations, create the wording):\nCONDITION: ${s.CONDITION}\nDOMAIN: ${s.DOMAIN}\nOPERATION: ${s.OPERATION}\nINVARIANT: ${s.INVARIANT}`;
const runs5 = (src) => { const w = String(src || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean); const out = []; for (let i = 0; i + 5 <= w.length; i++) out.push(w.slice(i, i + 5).join(' ')); return out; };
const copied = (text, sources) => { const t = ' ' + String(text).toLowerCase().replace(/[^a-z'\s]/g, ' ').replace(/\s+/g, ' ') + ' '; const hits = new Set(); for (const s of sources) for (const r of runs5(s)) if (t.includes(' ' + r + ' ')) hits.add(r); return [...hits]; };
const PRICE = { in: Number(process.env.PRICE_IN || '0.30'), out: Number(process.env.PRICE_OUT || '1.20') }; let cost = 0;
const rows = [];
for (const [di, d] of draws.entries()) {
  const cell = lookupCell(d.transient, d.position, d.status) || {}; const cellLines = [cell.tense, cell.verb, cell.place, cell.ask].filter(Boolean);
  const sc = SC[scId(d, di)] || {}; const scLines = [sc.CONDITION, sc.DOMAIN, sc.OPERATION, sc.INVARIANT].filter(Boolean);
  for (const { k, q } of QS) for (const arm of ARMS.split(',')) {
    process.env.POUR_FLOOR = arm === 'on' ? '1' : '0';
    const over = arm === 'scaffold' ? { base: BASE_SC, drawText: (t) => t + scaffoldBlock(sc) } : {};
    let it, res; try { res = await handingReading({ question: q, context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'friend', requestId: null }, [d], over); it = res.interpretation; } catch (e) { it = { error: e.message }; res = {}; }
    const u = res?.usage || {}; cost += ((u.input_tokens || 0) * PRICE.in + (u.output_tokens || 0) * PRICE.out) / 1e6;
    const text = String(it.text || it.error || '');
    const flags = (lintOutput({ text: '', parsed: { ...it, reader: text }, preset: { kind: 'opening' }, hostile: false, draw: d, draws: [d], question: q, voice: 'plain' }).flags || []).map((f) => f.code);
    const row = { draw: di, d, k, q, arm, text, gist: it.gist || '', medicine: it.medicine || '', flags, judge: it.medicineJudge?.first || '—', fallback: !!it.personaFallback, copiedCell: copied(text + ' ' + (it.medicine || ''), cellLines), copiedScaffold: copied(text + ' ' + (it.medicine || ''), scLines), guess: /\bmy guess is\b|\bmaybe\b|\bit may be that\b/i.test(text), words: text.split(/\s+/).filter(Boolean).length };
    rows.push(row); fs.writeFileSync(`data/bakeoff/floor_arms_${LABEL}.json`, JSON.stringify({ draws, rows, cost }, null, 1));
    console.log(`${di} ${k.padEnd(8)} ${arm.padEnd(8)} judge ${String(row.judge).padEnd(9)} flags[${flags.filter((c) => ['scale', 'backstory', 'premise', 'operation', 'figure', 'scope'].includes(c)).join(',')}] cell-copies ${row.copiedCell.length} scaffold-copies ${row.copiedScaffold.length} words ${row.words}`);
  }
}
const arms = ARMS.split(','); const summ = (arm) => { const r = rows.filter((x) => x.arm === arm); const n = r.length; const c = (f) => r.filter(f).length; return `${arm.padEnd(9)} n ${n} · scale ${c((x) => x.flags.includes('scale'))} · backstory/premise ${c((x) => x.flags.some((f) => f === 'backstory' || f === 'premise'))} · operation ${c((x) => x.flags.includes('operation'))} · figure ${c((x) => x.flags.includes('figure'))} · judge PASS ${c((x) => x.judge === 'PASS')} · fallback ${c((x) => x.fallback)} · cell-copies ${r.reduce((s, x) => s + x.copiedCell.length, 0)} · scaffold-copies ${r.reduce((s, x) => s + x.copiedScaffold.length, 0)} · guess-marked ${c((x) => x.guess)} · median words ${[...r.map((x) => x.words)].sort((a, b) => a - b)[Math.floor(n / 2)]}`; };
console.log('\n' + arms.map(summ).join('\n') + `\ncost at the live price $${cost.toFixed(3)}`);
