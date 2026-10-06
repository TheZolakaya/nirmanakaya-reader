// .714 SAY WHEN YOU ARE GUESSING — before/after on the five live voices (Air, after the founder's field test: every voice stated invented personal
// details as fact — "weighing them again at night", "rehearsing a speech in the shower", "the calendar, the bills"; the tester trusted Coach more
// because it once said "my guess is"). Same draws, same questions; lane A = the voice as it ships, lane B = the new rule placed FIRST in the voice
// block. A sentence-level judge counts personal details neither the question nor the reading's own claim contains, stated as fact (unmarked) vs marked.
//   npx tsx scripts/bench_guess_marking_714.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js'); const { VOICES } = await import('../lib/ezPrompts.js');
const { drawRecord } = await import('../lib/record.js'); const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const claimsOf = (d) => drawRecord(d, DEFS).split('\n').filter((l) => !/^THE FIELD/.test(l)).join('\n').slice(0, 3500); // what the draw itself claims — the judge must see it to tell the reading from invention
const REPS = Number(process.argv[2] || 2);
const { callProvider } = await import('../lib/provider.js'); const { MODEL_IDS } = await import('../lib/modelConfig.js');
export const GUESS_RULE = fs.readFileSync('scripts/guess_rule_714.txt', 'utf8').trim();
const DRAWS = [['Why do I keep second guessing myself?', { transient: 28, position: 9, status: 3 }], ['What is this low, restless feeling I\'ve had lately trying to tell me?', { transient: 54, position: 4, status: 4 }]];
const VOICES5 = ['plain', 'friend', 'coach', 'storyteller', 'mystic'];
const JSYS = `Label EVERY numbered sentence with exactly one label, given what the ASKER said.
READING — the reading's own claim: anything the DRAW'S RECORD below supports (what is going on, where in their life in general terms, how they are carrying it, the direction, the move), applied to the asker in general terms; adds no concrete detail of their particular life that neither the question nor the record contains.
OBSERVED — restates what the asker said.
MARKED — adds a concrete detail of the asker's particular life the asker did not give (a time of day, a place, an object, a habit or routine, a private thought, a rehearsed speech, a bodily sensation, what another person is doing), AND marks it as a guess, possibility, example or question ("my guess is", "maybe", "it may be", "for example", "does that fit?").
UNMARKED — adds such a detail and states it as fact.
OTHER — a question to the asker, a transition, an instruction.
Reply ONLY "<number> <LABEL>" lines.`;
const judge = async (q, text, d) => { const sents = String(text || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((x) => x.trim()).filter((x) => x.length > 3) || []; const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 700, system: JSYS, messages: [{ role: 'user', content: `THE ASKER SAID: "${q}"\n\n${sents.map((x, i) => `${i + 1}. ${x}`).join('\n')}` }] }, { tag: 'judge' }); const raw = data?.content?.map((c) => c.text || '').join('\n') || ''; const lab = {}; for (const l of raw.split('\n')) { const m = l.match(/^\s*(\d+)[^A-Z]*(READING|OBSERVED|MARKED|UNMARKED|OTHER)/); if (m) lab[Number(m[1])] = m[2]; } return { un: sents.filter((_, i) => lab[i + 1] === 'UNMARKED'), mk: sents.filter((_, i) => lab[i + 1] === 'MARKED').length, n: sents.length }; };
const tot = { A: { un: 0, mk: 0 }, B: { un: 0, mk: 0 } }; const per = {}; const lines = ['# BENCH — SAY WHEN YOU ARE GUESSING (.714), five voices × two draws, before/after', '*Lane A = the voice as shipped (.713); lane B = the guess rule placed first in the voice block. Counts per reading: personal details stated as fact (UNMARKED) and marked as a guess (MARKED), one judge vote.*', ''];
for (let rep = 1; rep <= REPS; rep++) for (const [q, d] of DRAWS) for (const v of VOICES5) for (const lane of ['A', 'B']) {
  const rules = lane === 'A' ? VOICES[v].rules : `${GUESS_RULE}\n\n${VOICES[v].rules}`;
  let it; try { it = (await handingReading({ question: q, context: '', cardCount: 1, mode: 'discover', fast: true, voice: v, requestId: null }, [d], { voiceRules: rules })).interpretation; } catch (e) { it = { error: e.message }; }
  const glass = [it.gist, it.text, it.medicine].filter(Boolean).join(' '); const j = await judge(q, glass, d);
  tot[lane].un += j.un.length; tot[lane].mk += j.mk; (per[v] ||= { A: 0, B: 0 })[lane] += j.un.length;
  lines.push(`## ${v} · lane ${lane} · "${q.slice(0, 50)}" — unmarked ${j.un.length}, marked ${j.mk}, medicine judge ${it.medicineJudge?.first || '—'}`, j.un.length ? j.un.map((x) => `- UNMARKED: ${x}`).join('\n') : '- (no unmarked detail)', '', `> ${String(it.text || it.error || '').slice(0, 1400)}`, `> ◈ ${it.medicine || ''}`, '');
  process.stdout.write(`${v.padEnd(12)} ${lane} unmarked ${j.un.length} marked ${j.mk} · judge ${it.medicineJudge?.first || '—'}\n`);
}
const head = ['| voice | unmarked, as shipped | unmarked, guess rule first |', '|---|---|---|', ...VOICES5.map((v) => `| ${v} | ${per[v].A} | ${per[v].B} |`), `| **all** | **${tot.A.un}** (marked ${tot.A.mk}) | **${tot.B.un}** (marked ${tot.B.mk}) |`, ''];
fs.writeFileSync('G:/My Drive/For Air Review/BENCH_Guess_Marking_Five_Voices_2026-10-06.md', [...lines.slice(0, 3), ...head, ...lines.slice(3)].join('\n'));
console.log('\n' + head.join('\n'));
