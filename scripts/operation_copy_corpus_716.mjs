// .716 AIR'S OPERATION-COPY PROCEDURE, steps 1–2 (and 3 with `constraint`): build a real failure corpus of persona renders that trip the
// operation guard, and measure the overlap. Each persona is rendered through the Plain door with its own rules (voice 'plain' + voiceRules),
// so the guard and its one re-ask run exactly as production but no Plain fallback replaces the text — the text that WOULD have fallen back
// is kept. Per render: every operation hit with the field it sits in, the matched record line, whether that line is THIS draw's medicine,
// the longest shared word run with it, the share of medicine-box words found in it; plus the canonical acts, the floor's medicine, the judge.
//   npx tsx scripts/operation_copy_corpus_716.mjs base 2          → data/bakeoff/opcopy_base.json
//   npx tsx scripts/operation_copy_corpus_716.mjs constraint 2    → the same with Air's paraphrase constraint ahead of every voice's rules
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const LANE = process.argv[2] || 'base'; const REPS = Number(process.argv[3] || 2);
const { handingReading } = await import('../lib/externalReading.js'); const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { VOICES, PERSONA_LAW } = await import('../lib/ezPrompts.js'); const { buildKernel } = await import('../lib/kernel.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js'); const { appendFloor } = await import('../lib/pour/floorHook.js');
const { drawRecord } = await import('../lib/record.js'); const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const { callProvider } = await import('../lib/provider.js'); const { MODEL_IDS } = await import('../lib/modelConfig.js');
const PLAIN = JSON.parse(fs.readFileSync('lib/data/plain_propositions.json', 'utf8'));
export const CONSTRAINT = fs.readFileSync('scripts/operation_constraint_716.txt', 'utf8').trim();
const PERSONAS = { friend: VOICES.friend.rules, coach: VOICES.coach.rules, storyteller: VOICES.storyteller.rules, mystic: `${PERSONA_LAW}\n\n${fs.readFileSync('scripts/mystic_card_716e.txt', 'utf8').trim()}` };
const DRAWS = [
  ['Where am I right now in my life, in terms of what I need to understand next?', { transient: 14, position: 8, status: 1 }, 'field test 1'],
  ['Where am I right now in my life, and what deserves my attention next?', { transient: 26, position: 3, status: 3 }, 'field test 2'],
  ['Why do I keep second guessing myself?', { transient: 28, position: 9, status: 3 }, 'second-guessing'],
  ["What is this low, restless feeling I've had lately trying to tell me?", { transient: 54, position: 4, status: 4 }, 'restless feeling'],
];
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
const FUNC = new Set('a an the and or but of to in on at for with by from as is are was were be been it its this that these those you your yours they them their what which who when where how not no so if then than one some any just'.split(' '));
const longestRun = (a, b) => { const A = words(a), B = words(b); let best = []; for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) { let k = 0; while (A[i + k] && A[i + k] === B[j + k]) k++; if (k > best.length) best = A.slice(i, i + k); } return best.join(' '); };
const shareIn = (box, line) => { const L = new Set(words(line).filter((w) => !FUNC.has(w))); const W = words(box).filter((w) => !FUNC.has(w)); return W.length ? Math.round((100 * W.filter((w) => L.has(w)).length) / W.length) : 0; };
const opByName = Object.fromEntries(Object.values(PLAIN.medicine).map((m) => [m.name, m.operation]));
const floorMedicine = (q, d) => { try { const { messages } = appendFloor([{ role: 'user', content: q }], [d], { enabled: true }); const blk = messages[0].content.slice(q.length); const lines = blk.split('\n').filter((l) => /medicine|way through|the move|act/i.test(l)); return lines.join(' ').slice(0, 900) || blk.slice(0, 600); } catch (e) { return `(floor unavailable: ${e.message})`; } };
const JSYS = `Label EVERY numbered sentence with exactly one label, given what the ASKER said and THE DRAW'S RECORD.
READING — the reading's own claim: anything the record supports, applied to the asker in general terms; adds no concrete detail of their particular life. OBSERVED — restates the asker. MARKED — adds a concrete detail of their particular life they did not give (a time, place, object, routine, private thought, bodily sensation, another person's doing) and marks it as a guess, possibility, example or question. UNMARKED — adds such a detail stated as fact. OTHER — a question, a transition, an instruction.
Reply ONLY "<number> <LABEL>" lines.`;
const claimsOf = (d) => drawRecord(d, DEFS).split('\n').filter((l) => !/^THE FIELD/.test(l)).join('\n').slice(0, 3500);
const invented = async (q, text, d) => { const sents = String(text || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((x) => x.trim()).filter((x) => x.length > 3) || []; const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 700, system: JSYS, messages: [{ role: 'user', content: `THE ASKER SAID: "${q}"\n\nTHE DRAW'S RECORD:\n${claimsOf(d)}\n\nTHE SENTENCES:\n${sents.map((x, i) => `${i + 1}. ${x}`).join('\n')}` }] }, { tag: 'judge' }); const raw = data?.content?.map((c) => c.text || '').join('\n') || ''; const lab = {}; for (const l of raw.split('\n')) { const m = l.match(/^\s*(\d+)[^A-Z]*(READING|OBSERVED|MARKED|UNMARKED|OTHER)/); if (m) lab[Number(m[1])] = m[2]; } return sents.filter((_, i) => lab[i + 1] === 'UNMARKED'); };
const OUT = `data/bakeoff/opcopy_${LANE}.json`; const rows = [];
for (let rep = 1; rep <= REPS; rep++) for (const [q, d, label] of DRAWS) for (const [persona, rules] of Object.entries(PERSONAS)) {
  const vr = LANE === 'constraint' ? `${CONSTRAINT}\n\n${rules}` : rules;
  let it; try { it = (await handingReading({ question: q, context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, [d], { voiceRules: vr })).interpretation; } catch (e) { it = { error: e.message }; }
  const fields = { gist: it.gist || '', reader: it.text || '', medicine: it.medicine || '', question: it.question || '' };
  const all = (lintOutput({ text: '', parsed: { ...it, reader: it.text }, preset: { kind: 'opening' }, hostile: false, draw: d, draws: [d], question: q, context: '', voice: 'plain' }).flags || []);
  const hard = all.filter((f) => ['operation', 'destination', 'plainname', 'conduit', 'figure', 'narrator'].includes(f.code)).map((f) => f.code);
  const partnerId = buildKernel(d, DEFS)?.partnerId; const partnerName = PLAIN.medicine[String(partnerId)]?.name; const ownOp = PLAIN.medicine[String(partnerId)]?.operation || '';
  const hits = [];
  for (const f of all.filter((x) => x.code === 'operation')) {
    const m = f.detail.match(/^"(.+?)…" is the record's own operation line for (.+?), quoted/); if (!m) continue;
    const gram = m[1].toLowerCase(); const card = m[2]; const line = opByName[card] || '';
    const field = Object.entries(fields).find(([, t]) => (' ' + words(t).join(' ') + ' ').includes(' ' + gram + ' '))?.[0] || '?';
    const sent = (fields[field] || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]*/g)?.find((s) => (' ' + words(s).join(' ') + ' ').includes(' ' + gram + ' ')) || '';
    hits.push({ gram, card, ownMedicine: card === partnerName, field, sentence: sent.trim(), line, longestRun: longestRun(fields[field], line), boxShareInLine: shareIn(fields.medicine, line) });
  }
  const un = await invented(q, [fields.gist, fields.reader, fields.medicine].join(' '), d);
  const row = { lane: LANE, persona, label, rep, draw: d, partner: partnerName, canonicalActs: MEDICINE_ACTS[partnerId]?.acts || [], recordOperation: ownOp, floorMedicine: floorMedicine(q, d), medicineBox: fields.medicine, judge: it.medicineJudge?.first || '—', verbalStandin: !!it.medicineJudge?.verbalStandin, hard, wouldFallBack: hard.length > 0, opHits: hits, ownOpLongestRun: longestRun([fields.reader, fields.medicine].join(' '), ownOp), boxShareInOwnOp: shareIn(fields.medicine, ownOp), unmarked: un, gist: fields.gist, reader: fields.reader };
  rows.push(row); fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  console.log(`${LANE} ${persona.padEnd(11)} ${label.padEnd(16)} r${rep}: ${hard.length ? 'WOULD FALL BACK ' + hard.join(',') : 'clean'} · judge ${row.judge}${hits.length ? ' · OP: ' + hits.map((h) => `[${h.field}] "${h.gram}" (${h.ownMedicine ? 'own medicine' : 'OTHER card ' + h.card}, run ${words(h.longestRun).length})`).join(' ') : ''}`);
}
