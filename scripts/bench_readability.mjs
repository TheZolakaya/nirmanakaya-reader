// BENCH — READABILITY (the campaign opened 2026-10-05 by the founder with Air). A fresh cheap-lane instance is handed a Plain opening with
// NO architecture explained and asked the six questions: (1) in one sentence, what did it tell you? (2) what does it want you to do? (3) which
// sentence did you have to reread? (4) which sounded meaningful but you couldn't explain literally? (5) where did it use an image when plain
// English would have been clearer? (6) rewrite it in words you'd say to a friend. A second call grades the paraphrase (1) against the gist the
// Reader wrote: MATCH / PARTIAL / MISS — the killer metric: if the reader cannot paraphrase it after one read, Plain has failed.
// Readings: the founder's exhibit (the upload) + the L bench's live-lane Plain openings (12 mechanism + 6 personal). Writes markdown to the shelf.
//   npx tsx scripts/bench_readability.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { callProvider } = await import('../lib/provider.js');
const { MODEL_IDS } = await import('../lib/modelConfig.js');
const ask = async (system, user, max = 900) => { const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: max, system, messages: [{ role: 'user', content: user }] }, { tag: 'readability' }); if (data?.error) throw new Error(data.error.message); return data.content?.map((i) => i.text || '').join('\n') || ''; };

// --- the readings
const readings = [];
const ex = fs.readFileSync('C:/Users/chris/.claude/uploads/4466b7a6-0b7d-4675-8061-9b56f052ad10/a6244c8c-nirmanakaya-ez-2026-10-05.md', 'utf8');
{ const q = (ex.match(/\*\*Asked:\*\* (.+)/) || [])[1]; const body = ex.split('**Reader:**')[1].split('## The doors')[0].trim(); const gist = (body.match(/^\*(.+?)\*$/m) || [])[1] || ''; const med = (body.match(/^> ◈ ?(.*)$/m) || [])[1] || ''; const question = (body.match(/\n\*([^*\n]+\?)\*\s*$/) || [])[1] || ''; const prose = body.replace(/^\*(.+?)\*$/m, '').replace(/^> ◈.*$/m, '').replace(/\n\*[^*\n]+\?\*\s*$/, '').trim(); readings.push({ key: 'exhibit · quiet my mind', question: q, gist, prose, medicine: med, closing: question, draw: 'Too Little Executor of Intent in Recognition' }); }
// INPUT: default = the L bench's live lane (the baseline); or `--file <bench md> --lane <A|B|live|<name>>` to read another bench's lane
// (a key line "X: A = <name>, B = <name>" picks the lane by name; otherwise the letter is used as given), and `--out <shelf filename>`.
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FILE = arg('--file', 'G:/My Drive/For Air Review/BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'); const LANE = arg('--lane', 'live'); const OUT = arg('--out', 'BENCH_True_Readability_Six_Questions_2026-10-05.md'); const NO_EXHIBIT = process.argv.includes('--no-exhibit');
if (NO_EXHIBIT) readings.length = 0;
const L = fs.readFileSync(FILE, 'utf8');
const keyLines = L.split('## The key')[1] || ''; const laneByKey = Object.fromEntries([...keyLines.matchAll(/^- (.+?): A = ([^,]+), B = (.+)$/gm)].map((m) => [m[1].trim(), m[2].trim() === LANE ? 'A' : m[3].trim() === LANE ? 'B' : null]));
for (const part of L.split(/^## /m).slice(1)) {
  const key = part.split('\n')[0].trim(); if (/^The key|^The verdict/.test(key)) continue; const lane = laneByKey[key] || (/^[AB]$/.test(LANE) ? LANE : null); if (!lane) continue;
  const q = (part.match(/\*\*Q:\*\* (.+)/) || [])[1] || ''; const blocks = part.split(/^### /m).slice(1); const b = blocks.find((x) => x[0] === lane); if (!b) continue;
  const body = b.slice(1).trim(); const gist = (body.match(/^\*(.+?)\*$/m) || [])[1] || ''; const med = (body.match(/^> ◈ ?(.*)$/m) || [])[1] || ''; const closing = (body.match(/\n\*([^*\n]+\?)\*\s*$/) || [])[1] || ''; const prose = body.replace(/^\*(.+?)\*$/m, '').replace(/^> ◈.*$/m, '').replace(/\n\*[^*\n]+\?\*\s*$/, '').trim();
  readings.push({ key: `${FILE.split('/').pop().replace('BENCH_', '').replace(/_2026.*$/, '')} · ${key} (${LANE})`, question: q.replace(/\(no question.*\)/, '').trim(), gist, prose, medicine: med, closing, draw: (part.match(/\*\*Draw:\*\* (.+)/) || [])[1] || '' });
}
console.log(`${readings.length} readings`);

const READER_SYS = 'You are an ordinary, intelligent adult. You have never heard of this system and nobody will explain it to you. You asked the question shown and received the reading shown. Answer the six questions honestly and briefly, in plain English, as yourself. Do not flatter the reading. Number your answers 1–6.';
const GRADER_SYS = 'You compare two short texts. The first is what a reading was MEANT to say. The second is what an ordinary reader said it told them after one read. Answer with one token — MATCH if the reader\'s sentence carries the meant text\'s main point; PARTIAL if it carries part of it or adds a different point; MISS if it misses or contradicts it — then one short sentence saying why.';
// TWO REFERENCES (Air, 2026-10-05): the Reader's own gist can be fuzzy or wrong, so matching it proves little on its own. Reference A = the
// structural meaning built from the record for the draw (status + capacity + seat + the partner's acts); reference B = the gist. Four cases:
// A&B match = success · B only = the gist was off (interpretation) · A only = the gist obscured a right structure (gist problem) · neither = Plain failed.
const { getComponent } = await import('../lib/corrections.js');
const { buildKernel } = await import('../lib/kernel.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const STATUS_WORD = { Balanced: 'is working, as their own, now', 'Too Much': 'is being done more than the moment asks', 'Too Little': 'is being done less than the moment asks', Unacknowledged: 'is being done and not held as their own' };
const structuralRef = (drawLine) => (drawLine || '').split(' · ').map((s, i) => { const m = s.match(/^(Balanced|Too Much|Too Little|Unacknowledged) (.+?) in (.+)$/); if (!m) return null; const t = idOf(m[2]), p = idOf(m[3]); const c = getComponent(t), seat = getComponent(p); let partner = null; try { partner = buildKernel({ transient: t, position: p, status: { Balanced: 1, 'Too Much': 2, 'Too Little': 3, Unacknowledged: 4 }[m[1]] }, DEFS)?.partnerId ?? null; } catch {} const acts = partner != null && MEDICINE_ACTS[partner] ? MEDICINE_ACTS[partner].acts.slice(0, 2).join('; ') : ''; return `${i === 0 ? 'The main capacity' : 'Also'}: ${c?.description || c?.name} — it ${STATUS_WORD[m[1]]}, in the part of life about ${seat?.description || seat?.name}.${i === 0 && acts ? ` The way through: ${acts}.` : ''}`; }).filter(Boolean).join(' ');
const out = [`# READABILITY — the six questions on ${readings.length} Plain openings, fresh instance, no architecture explained`, `*True, 2026-10-05, the campaign's first measurement. Reader = the cheap lane as an ordinary adult; grader = the same lane comparing the reader's one-sentence paraphrase with the gist the Reader wrote. Killer metric: MATCH rate on (1). The reread / could-not-explain / image answers (3–5) are the fog corpus.*`, ''];
const tally = { MATCH: 0, PARTIAL: 0, MISS: 0 }; const fog = [];
for (const r of readings) {
  const shown = `${r.question ? `YOUR QUESTION: ${r.question}\n\n` : 'YOU ASKED NOTHING — it is a reading for where you are right now.\n\n'}THE READING:\n\n${r.gist}\n\n${r.prose}\n\nThe way through: ${r.medicine}\n\n${r.closing}`;
  const a = await ask(READER_SYS, `${shown}\n\nQUESTIONS:\n1. In one sentence, what did the reading tell you?\n2. What does it want you to do, if anything?\n3. Which sentence did you have to reread? Quote it.\n4. Which sentence sounded meaningful but you could not explain literally? Quote it.\n5. Where did it use an image or metaphor when plain English would have been clearer? Quote it.\n6. Rewrite the reading in the words you would actually say to a friend (three to five sentences).`);
  const one = (a.match(/1\.\s*([\s\S]*?)(?=\n\s*2\.)/) || [])[1]?.trim() || a.split('\n')[0];
  const g = await ask(GRADER_SYS, `MEANT (the reading's own gist): ${r.gist}\n\nREADER SAID (one sentence): ${one}`, 80);
  const grade = (g.match(/MATCH|PARTIAL|MISS/) || ['MISS'])[0]; tally[grade]++;
  const refA = structuralRef(r.draw); let gradeA = 'n/a', gA = '';
  if (refA) { gA = await ask(GRADER_SYS, `MEANT (the structural meaning, from the record): ${refA}\n\nREADER SAID (one sentence): ${one}`, 80); gradeA = (gA.match(/MATCH|PARTIAL|MISS/) || ['MISS'])[0]; }
  const caseOf = gradeA === 'n/a' ? '' : (gradeA === 'MATCH' && grade === 'MATCH') ? 'SUCCESS (structure and gist both carried)' : (grade === 'MATCH') ? 'INTERPRETATION (matched the gist, not the structure — the gist may be off)' : (gradeA === 'MATCH') ? 'GIST PROBLEM (the structure came through; the gist obscured it)' : (gradeA === 'MISS' && grade === 'MISS') ? 'PLAIN FAILED (neither)' : 'READABILITY (partial on both)';
  tally.cases = tally.cases || {}; if (caseOf) tally.cases[caseOf.split(' (')[0]] = (tally.cases[caseOf.split(' (')[0]] || 0) + 1;
  for (const n of [3, 4, 5]) { const ans = (a.match(new RegExp(`${n}\\.\\s*([\\s\\S]*?)(?=\\n\\s*${n + 1}\\.|$)`)) || [])[1]?.trim(); if (ans) fog.push(`- (${n === 3 ? 'reread' : n === 4 ? 'could not explain' : 'image'}) ${ans.replace(/\s+/g, ' ').slice(0, 220)} — *${r.key}*`); }
  out.push(`## ${r.key}`, r.question ? `**Q:** ${r.question}` : '**Q:** (none — right now)', `**gist (what it meant):** ${r.gist}`, refA ? `**structural meaning (from the record):** ${refA}` : '', '', `**paraphrase vs gist: ${grade}** — ${g.replace(/\s+/g, ' ').slice(0, 200)}`, refA ? `**paraphrase vs structure: ${gradeA}** — ${gA.replace(/\s+/g, ' ').slice(0, 200)}\n**case: ${caseOf}**` : '', '', '**the fresh reader:**', '', a.trim(), '');
  process.stdout.write(`${grade.padEnd(8)} ${r.key}\n`);
}
out.splice(3, 0, `**Paraphrase after one read, vs the gist — MATCH ${tally.MATCH} · PARTIAL ${tally.PARTIAL} · MISS ${tally.MISS} of ${readings.length}.** Against both references (Air's four cases): ${Object.entries(tally.cases || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || 'n/a'}.`, '', '## The fog corpus (what had to be reread, could not be explained, or was an image where plain words would do)', '', ...fog, '');
const path = 'G:/My Drive/For Air Review/' + OUT; fs.writeFileSync(path, out.join('\n')); console.log('\n', JSON.stringify(tally), '\nshelf:', path);
