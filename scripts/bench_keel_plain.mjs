// THE PLAIN FLOOR BENCH (2026-10-03): the exhibit's own draw (Unacknowledged Faith in Imagination, a "right now" ask), N openings
// on the Plain voice BEFORE Keel's sentence forms and N AFTER, both lanes on the Handing set and production's first-lane model.
//   npx tsx scripts/bench_keel_plain.mjs [n=10] [model=or-v4.1-flash]
import fs from 'node:fs';
const ENV = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue; const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v; }
const { runSection } = await import('../lib/bakeoff/run.js');
const { presetById, drawLabel } = await import('../lib/bakeoff/presets.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { getComponent } = await import('../lib/corrections.js');
const [nRaw = '10', model = 'or-v4.1-flash'] = process.argv.slice(2); const N = Number(nRaw) || 10;
const idOf = (name) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === name) return i; throw new Error('no card ' + name); };
const before = JSON.parse(fs.readFileSync('data/bakeoff/variants_src/plain_before_keel.json', 'utf8')).text;
const draw = { transient: idOf('Faith'), position: idOf('Imagination'), status: 4 };
const question = '(no question — a draw for where I am right now)';
const lanes = [
  { key: 'before', label: 'Plain before Keel', modelKey: model, over: { BASE_SYSTEM: HANDING_SET.BASE_SYSTEM, EZ_RULES: HANDING_SET.EZ_RULES, VOICE_PLAIN: before } },
  { key: 'after', label: 'Plain after Keel (live)', modelKey: model, over: { BASE_SYSTEM: HANDING_SET.BASE_SYSTEM, EZ_RULES: HANDING_SET.EZ_RULES } },
];
const preset = presetById('ez-opening');
const KEEL = ['bothways', 'unnamed', 'narrator', 'conduit', 'promise'];
const out = { before: [], after: [] }; let usd = 0; const t0 = Date.now();
for (let i = 1; i <= N; i++) {
  const rows = await runSection(preset, lanes, { question, draw, opening: null });
  for (const r of rows) { out[r.key].push(r); usd += r.cost || 0; }
  process.stdout.write(`run ${i}/${N} · $${usd.toFixed(3)} · ${Math.round((Date.now() - t0) / 1000)}s\n`);
}
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
fs.writeFileSync(`data/bakeoff/keel_plain_${stamp}.json`, JSON.stringify({ draw, question, model, N, out }, null, 1));
const tally = (rows) => { const c = {}; let keelRows = 0, w = 0; for (const r of rows) { const codes = new Set((r.lint?.flags || []).map((f) => f.code)); if ([...codes].some((k) => KEEL.includes(k))) keelRows++; for (const k of codes) c[k] = (c[k] || 0) + 1; w += r.lint?.words || 0; } return { c, keelRows, avgWords: Math.round(w / Math.max(1, rows.length)) }; };
const L = [`# BENCH — the Plain floor: the Plain voice before and after Keel's sentence forms`, `*True, 2026-10-03. Draw: **${drawLabel(draw)}** (the exhibit's own). Ask: "${question}". Model: ${model} (production's first lane). Prompt set: the Handing. N = ${N} per lane. Cost $${usd.toFixed(3)}.*`, ``,
  `Keel's five mechanical tests: bothways · unnamed · narrator · conduit · promise. The other codes are the house's standing lints (a flag is a reason to look).`, ``,
  `| lane | openings | tripped a Keel test | avg words | flags |`, `|---|---|---|---|---|`];
for (const k of ['before', 'after']) { const t = tally(out[k]); L.push(`| ${k} | ${out[k].length} | ${t.keelRows} | ${t.avgWords} | ${Object.entries(t.c).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}×${n}`).join(' ') || 'clean'} |`); }
for (const k of ['before', 'after']) {
  L.push(``, `## ${k.toUpperCase()} — ${lanes.find((l) => l.key === k).label}`);
  out[k].forEach((r, i) => { const p = r.parsed || {}; L.push(``, `### ${k} ${i + 1}  (${r.lint?.words || 0} words; flags: ${(r.lint?.flags || []).map((f) => f.code).join(' ') || 'none'})`, ``, p.gist ? `*${p.gist}*` : '', ``, String(p.reader || r.text || '').trim(), ``, p.medicine ? `> ◈ ${p.medicine}` : '', ``, p.question ? `*${p.question}*` : ''); const kf = (r.lint?.flags || []).filter((f) => KEEL.includes(f.code)); if (kf.length) L.push(``, kf.map((f) => `- **${f.code}**: ${f.detail}`).join('\n')); });
}
const shelf = 'G:/My Drive/For Air Review/BENCH_Plain_Words_Keel_Floor_2026-10-03.md';
fs.writeFileSync(shelf, L.join('\n')); console.log('\nshelf:', shelf);
for (const k of ['before', 'after']) { const t = tally(out[k]); console.log(`${k.padEnd(7)} keel-tripped ${t.keelRows}/${out[k].length}  avg words ${t.avgWords}  ${Object.entries(t.c).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}×${n}`).join(' ')}`); }
