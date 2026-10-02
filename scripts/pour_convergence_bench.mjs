// THE CONVERGENCE BENCH (a cold GPT reader, 2026-10-02: "two people can draw the same condition and receive readings that share the
// same underlying truth while sharing almost no sentences — that's the real test of whether the system has something underneath
// the prose"). For N stored cells: production's opening turn on the production model, standing on the cell as the floor, for TWO
// different questions. Measures shared sentences and shared five-word runs between the pair, and shared runs with the cell itself
// (paste). The readings go to a blind markdown for judging the shared TRUTH, which a machine cannot see.
//   npx tsx scripts/pour_convergence_bench.mjs [set=l] [n=6] [model=or-v4.1-flash]
import fs from 'node:fs';
import path from 'node:path';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { buildOpening, parseJson } from '../lib/bakeoff/presets.js';
import { callModel } from '../lib/bakeoff/providers.js';
import { readPlan, planBlock } from '../lib/pour/assemble.js';
import { STATUS_NAMES } from '../lib/pour/schema.js';
import { writeToShelf } from '../lib/bakeoff/store.js';

const [SET = 'l', N = '6', MODEL = 'or-v4.1-flash'] = process.argv.slice(2);
const dir = `data/pour/cells_${SET}_or-v4.1-flash`;
// pairs of questions that live in different lives but could draw the same card
const QUESTION_PAIRS = [
  ['Should I leave my job after my manager passed me over for promotion again?', 'My daughter wants to move back home at 29. Do I say yes?'],
  ['I keep rewriting the first chapter of my novel. Is it ready?', 'My dad has dementia and I visit less than I should. What do I do with that?'],
  ['Do I confront my sister about the money she owes me?', 'I quit the gym for the fourth time this year. Why can\'t I keep anything going?'],
  ['Am I overworking the thing I\'m building?', 'My marriage is fine and I feel nothing. Is that a problem?'],
  ['Should I take the smaller apartment to be closer to my kids?', 'I got the promotion and I\'m miserable. What is wrong with me?'],
  ['My best friend stopped answering my texts. Do I ask why?', 'I turned fifty and I don\'t know what I want any more.'],
];
const toks = (t) => String(t || '').toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g) || [];
const grams = (t, n = 5) => { const w = toks(t); const s = new Set(); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' ')); return s; };
const sents = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((x) => x.trim().toLowerCase()).filter((x) => toks(x).length >= 6);
const shared = (a, b) => [...a].filter((x) => b.has(x));

function rng(seed) { let x = seed >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const r = rng(20261002);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(() => r() - 0.5).slice(0, Number(N));
const out = []; const summary = [];
let i = 0;
for (const f of files) {
  const row = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const status = 2 + Math.floor(r() * 3);   // 2, 3 or 4 — an imbalance, where the medicine has a direction
  const cell = row.cells.find((c) => c.status === status) || row.cells[0];
  const draw = { transient: row.signature_id, position: row.position_id, status: cell.status };
  const [q1, q2] = QUESTION_PAIRS[i++ % QUESTION_PAIRS.length];
  const readings = [];
  for (const q of [q1, q2]) {
    const plan = readPlan(draw, DEFS, () => cell, { question: q });
    const base = buildOpening({ question: q, draw, over: {} });
    const message = `${base.message}\n\n${planBlock(plan)}\n\nJSON only.`;
    const res = await callModel({ modelKey: MODEL, system: base.system, message, maxTokens: base.maxTokens });
    const j = res.text ? parseJson(res.text) : null;
    readings.push({ q, reader: String(j?.reader || res.text || res.error || ''), medicine: String(j?.medicine || ''), question: String(j?.question || '') });
  }
  const [A, B] = readings;
  const sharedSent = shared(new Set(sents(A.reader)), new Set(sents(B.reader)));
  const sharedGram = shared(grams(A.reader), grams(B.reader));
  const pasteA = shared(grams(cell.core + ' ' + cell.ask), grams(A.reader)).length, pasteB = shared(grams(cell.core + ' ' + cell.ask), grams(B.reader)).length;
  summary.push({ cell: `${row.signature} in ${row.seat} · ${STATUS_NAMES[cell.status]}`, sharedSentences: sharedSent.length, sharedFiveGrams: sharedGram.length, pastedFromCell: [pasteA, pasteB] });
  out.push(`\n\n# ${row.signature} in ${row.seat} · ${STATUS_NAMES[cell.status]}`, '', `> the cell's sheet line: _${cell.sheetLine}_`, `> the cell's ask: ${cell.ask}`, '');
  for (const R of readings) out.push(`## "${R.q}"`, '', R.reader.replace(/\\n/g, '\n'), '', R.medicine ? `medicine: ${R.medicine}` : '', R.question ? `question: ${R.question}` : '', '');
  out.push(`_machine: ${sharedSent.length} shared sentences · ${sharedGram.length} shared five-word runs between the two · five-word runs lifted from the cell: ${pasteA} and ${pasteB}_`);
  console.log(`${summary.at(-1).cell}: shared sentences ${sharedSent.length}, shared 5-grams ${sharedGram.length}, lifted from the cell ${pasteA}/${pasteB}`);
}
const date = new Date().toISOString().slice(0, 10);
const head = [`# THE CONVERGENCE BENCH — ${date} — set ${SET.toUpperCase()}, ${MODEL}`, '', 'Written for: the judges. Each section is ONE cell (one card, one seat, one status) read twice by the production Reader for two different people with two different questions, standing on the same poured floor. The machine counted the words they share. You judge the thing it cannot: do the two readings share the same TRUTH — the same capacity, the same bend, the same medicine — while belonging to two different lives? For each pair: SAME TRUTH (yes/no, and the sentence that shows it) · DIFFERENT LIFE (does each reading live in its own question?) · ANY SENTENCE YOU MET TWICE.', '', '| cell | shared sentences | shared five-word runs | lifted from the cell |', '|---|---|---|---|', ...summary.map((s) => `| ${s.cell} | ${s.sharedSentences} | ${s.sharedFiveGrams} | ${s.pastedFromCell.join(' / ')} |`)];
const name = `BENCH_Convergence_Same_Cell_Two_Lives_${date}.md`;
const res = writeToShelf(name, head.join('\n') + out.join('\n') + '\n');
fs.mkdirSync('data/pour/joins', { recursive: true }); fs.writeFileSync(`data/pour/joins/convergence_${SET}_${date}.json`, JSON.stringify({ date, set: SET, model: MODEL, summary }, null, 2));
console.log(res.ok ? `shelf: G:\\My Drive\\For Air Review\\${name}` : `shelf not written: ${res.reason}`);
