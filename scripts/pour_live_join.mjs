// THE LIVE JOIN, SAMPLED — the founder's question (2026-10-01): "will our model be able to turn these into contextual kitchen
// table?" Production's opening turn (the live EZ prompt, the production model) on a draw, twice: once as production sends it
// today (no floor), once with the poured cell under it as THE FLOOR. Nothing saved to any account; the bench's own lanes.
//   npx tsx scripts/pour_live_join.mjs [model=or-v4.1-flash] [n]
import fs from 'node:fs';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { buildOpening, parseJson } from '../lib/bakeoff/presets.js';
import { callModel } from '../lib/bakeoff/providers.js';
import { readPlan, planBlock } from '../lib/pour/assemble.js';
import { STATUS_NAMES } from '../lib/pour/schema.js';

const MODEL = process.argv[2] || 'or-v4.1-flash';
const N = Number(process.argv[3]) || 99;
const SAMPLE = [   // [signature, seat, status, question] — stored wave-one cells; the questions are the bench's, not anyone's account
  [65, 1, 4, 'Am I overworking Nirmanakaya?'],
  [50, 11, 2, 'Should I ask my sister to pay back what she owes me?'],
  [12, 9, 3, "I keep starting at the gym and quitting after two weeks. What's wrong with me?"],
  [13, 12, 3, 'When I die, does the part that is me end?'],
];
const cellOf = (sig, pos, status) => { const p = `data/pour/cells/${String(sig).padStart(2, '0')}-${String(pos).padStart(2, '0')}.json`; if (!fs.existsSync(p)) return null; const r = JSON.parse(fs.readFileSync(p, 'utf8')); return r.cells.find((c) => c.status === status) || null; };
const w = (t) => String(t || '').split(/\s+/).filter(Boolean).length;

const out = [];
for (const [sig, pos, status, question] of SAMPLE.slice(0, N)) {
  const draw = { transient: sig, position: pos, status };
  const cell = cellOf(sig, pos, status);
  const plan = readPlan(draw, DEFS, () => cell, { question });
  const base = buildOpening({ question, draw, over: {} });
  const lanes = [
    ['production today (no floor)', base.message],
    ['with the poured cell as the floor', `${base.message}\n\n${planBlock(plan)}\n\nThe floor is settled; stand on it and talk to the person in your own words. JSON only.`],
  ];
  out.push(`\n\n# ${plan.arrival.name} in ${plan.seat.name} · ${STATUS_NAMES[status]} · "${question}"`);
  if (cell) out.push(`\n> the cell's sheet line: _${cell.sheetLine}_\n> the cell's ask: ${cell.ask}`);
  for (const [label, message] of lanes) {
    const t0 = Date.now();
    const r = await callModel({ modelKey: MODEL, system: base.system, message, maxTokens: base.maxTokens });
    const j = r.text ? parseJson(r.text) : null;
    const reader = j?.reader || j?.text || r.text || r.error || '(nothing)';
    out.push(`\n## ${label} — ${r.model || MODEL}, ${Math.round((Date.now() - t0) / 1000)}s, ${w(reader)} words`);
    out.push(String(reader).replace(/\\n/g, '\n'));
    if (j?.medicine) out.push(`\nmedicine field: ${typeof j.medicine === 'string' ? j.medicine : JSON.stringify(j.medicine)}`);
    if (j?.question) out.push(`question: ${j.question}`);
    console.log(`${plan.arrival.name} in ${plan.seat.name} · ${label}: ${w(reader)} words, ${Math.round((Date.now() - t0) / 1000)}s${r.error ? ' ERROR ' + r.error : ''}`);
  }
}
fs.mkdirSync('data/pour/joins', { recursive: true });
const file = `data/pour/joins/live_join_${MODEL}_${new Date().toISOString().slice(0, 10)}.md`;
fs.writeFileSync(file, `# The live join, sampled — ${MODEL} — ${new Date().toISOString().slice(0, 16)}\n${out.join('\n')}\n`);
console.log('wrote', file);
