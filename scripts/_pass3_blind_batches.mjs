// PASS THREE — turn a bench results file into BLIND judging batches for sub-agents (the founder's rule: no Claude API for judging), and merge
// their answers back. Each batch: the audit instructions (Air's two axes), then N replies with the person's words so far, the draw's
// structural facts, and the reply's fields — never the arm, never the run.
//   build:  npx tsx scripts/_pass3_blind_batches.mjs build <label> [per=24]
//   merge:  npx tsx scripts/_pass3_blind_batches.mjs merge <label> <answers-dir>   (answers-dir holds one JSON array per batch, named batch_<n>.json)
import fs from 'node:fs';
const [MODE, LABEL = 'gate2', ARG3] = process.argv.slice(2);
const P = `data/bakeoff/restructure_${LABEL}.json`;
const { drawFacts } = await import('../lib/bakeoff/readerJudge.js');
const cases = JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')).cases;
const HEAD = `# READER AUDIT — blind batch

You are auditing replies from a reading service that draws a signature from a derived map and reads it for a person. You are NOT told which version of the service wrote each reply. Judge only what is on the page. Two axes, kept separate:

CLAIM HANDLING (holds | fails). The reply FAILS if any user-visible text (gist, body, medicine box, question) does one of these: contradicts what the person said; asserts a hidden motive, feeling, cause, history, duration, repeated behaviour, or the specific scene of their life that the person did not say; promotes a hypothetical or a marked guess into a fact later in the reply or in the gist; presupposes a history inside a question; attributes the service's own earlier words to the person; makes an unsupported technical conclusion; or names the right medicine but proposes a different act. A clearly marked hypothesis ("one possibility", "my guess", "maybe", a question) is NOT an unmarked assertion, though it can still fail by contradicting the person or inventing a motive. Stating the map's selected relation (what the pattern IS, which side of the situation it acts on, that something is operating and not recognized) is exposition, not a personal diagnosis. A positive verdict can overreach too (denying a reported difficulty, certifying ability). Tense is not the boundary.
Error labels: contradicts_user, unsupported_hidden_motive, unwarranted_inner_state, unsupported_cause, invented_behavior, invented_recurring_history, invented_duration, invented_completion, invented_schedule, unwarranted_scale, overrides_reported_difficulty, unwarranted_global_capacity_claim, cross_field_certainty_leak, dependent_claim_certainty_leak, presupposed_history, hypothetical_promoted_to_fact, unsupported_technical_conclusion, invalid_inference, contradiction_not_resolved, speaker_attribution_error, medicine_semantic_mismatch. Quote the exact span.

READING QUALITY (each 0 = fails, 1 = partly, 2 = holds). usefulness: the reply contributes one specific insight the draw and the context make possible — a distinction, a practical possibility, or a bounded hypothesis — that the person did not have to supply themselves. proportion: the weight and stakes match what the person's words give. clarity: understood on first read by someone who never saw the map. medicine: the named medicine's own act (given below as "the act it licenses"), inside the person's situation, as an offer. revision (later turns only, else null): the reading of the person's life moves with their correction while the draw and the medicine hold; no defending, no rewriting the draw.

Answer with ONE JSON array and nothing else: [{"key":"<key>","claim_handling":"holds"|"fails","errors":[...],"span":"<exact quoted span or empty>","usefulness":n,"proportion":n,"clarity":n,"medicine":n,"revision":n|null,"note":"<one line>"}, ...] for every reply in this batch, in order.
`;
if (MODE === 'build') {
  const J = JSON.parse(fs.readFileSync(P, 'utf8')); const PER = Number(ARG3 || 24);
  const rows = J.rows.filter((r) => !r.error && r.text);
  // shuffle deterministically so arms are interleaved and no batch is one arm
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; const order = rows.map((r, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map((x) => rows[x[1]]);
  fs.mkdirSync(`data/bakeoff/pass3/${LABEL}_batches`, { recursive: true });
  let n = 0;
  for (let i = 0; i < order.length; i += PER) {
    const batch = order.slice(i, i + PER); const L = [HEAD];
    for (const r of batch) { const c = cases.find((x) => x.id === r.case); const asker = [c.t2, c.t3].slice(0, Math.max(0, r.turn - 1)); L.push(`## reply ${r.key}`, `THE PERSON'S WORDS SO FAR`, c.question ? `- the question: "${c.question}"` : '- no question (a reading for where they are right now)', ...(c.context ? [`- context they gave: "${c.context}"`] : []), ...asker.map((t, k) => `- later (turn ${k + 2}): "${t}"`), `THE DRAW'S STRUCTURAL FACTS`, drawFacts(c.draw).split('\n').map((l) => `- ${l}`).join('\n'), `THE REPLY (${r.turn === 1 ? 'the opening' : `turn ${r.turn}, after the person's latest words`})`, `gist: ${String(r.gist || '').trim()}`, '', `body:\n${String(r.text || '').trim()}`, '', `medicine box: ${String(r.medicine || '').trim()}`, `question asked back: ${String(r.question || '').trim()}`, ''); }
    fs.writeFileSync(`data/bakeoff/pass3/${LABEL}_batches/batch_${++n}.md`, L.join('\n'));
  }
  console.log(`built ${n} blind batches of up to ${PER} replies (${order.length} replies) in data/bakeoff/pass3/${LABEL}_batches/`);
} else if (MODE === 'missing') { // the replies no answer file covers → one more blind batch (the auditors scored 20 of 24 in some batches)
  const J = JSON.parse(fs.readFileSync(P, 'utf8')); const dir = ARG3 || `data/bakeoff/pass3/${LABEL}_answers`; const have = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) { try { const raw = fs.readFileSync(`${dir}/${f}`, 'utf8'); const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)); for (const a of arr) have.add(a.key); } catch {} }
  const rows = J.rows.filter((r) => !r.error && r.text && !have.has(r.key)); const L = [HEAD];
  for (const r of rows) { const c = cases.find((x) => x.id === r.case); const asker = [c.t2, c.t3].slice(0, Math.max(0, r.turn - 1)); L.push(`## reply ${r.key}`, `THE PERSON'S WORDS SO FAR`, c.question ? `- the question: "${c.question}"` : '- no question (a reading for where they are right now)', ...(c.context ? [`- context they gave: "${c.context}"`] : []), ...asker.map((t, k) => `- later (turn ${k + 2}): "${t}"`), `THE DRAW'S STRUCTURAL FACTS`, drawFacts(c.draw).split('\n').map((l) => `- ${l}`).join('\n'), `THE REPLY (${r.turn === 1 ? 'the opening' : `turn ${r.turn}, after the person's latest words`})`, `gist: ${String(r.gist || '').trim()}`, '', `body:\n${String(r.text || '').trim()}`, '', `medicine box: ${String(r.medicine || '').trim()}`, `question asked back: ${String(r.question || '').trim()}`, ''); }
  fs.writeFileSync(`data/bakeoff/pass3/${LABEL}_batches/batch_missing.md`, L.join('\n')); console.log(`${rows.length} replies without an answer → data/bakeoff/pass3/${LABEL}_batches/batch_missing.md`);
} else if (MODE === 'merge') {
  const J = JSON.parse(fs.readFileSync(P, 'utf8')); const dir = ARG3 || `data/bakeoff/pass3/${LABEL}_answers`; let merged = 0, missing = 0;
  const byKey = new Map(J.rows.map((r) => [r.key, r]));
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) { const raw = fs.readFileSync(`${dir}/${f}`, 'utf8'); const s = raw.indexOf('['), e = raw.lastIndexOf(']'); let arr; try { arr = JSON.parse(raw.slice(s, e + 1)); } catch { console.log('could not parse', f); continue; } for (const a of arr) { const r = byKey.get(a.key); if (!r) { missing++; continue; } r.agentScores = { claim: a.claim_handling, errors: a.errors || [], span: a.span || '', usefulness: a.usefulness, proportion: a.proportion, clarity: a.clarity, medicine: a.medicine, revision: a.revision ?? null, note: a.note || '', file: f }; merged++; } }
  fs.writeFileSync(P, JSON.stringify(J, null, 1)); console.log(`merged ${merged} agent scores into ${P} (${missing} keys not found)`);
  // the summary by arm × voice × turn
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const rows = J.rows.filter((r) => r.agentScores); const arms = [...new Set(rows.map((r) => r.arm))], voices = [...new Set(rows.map((r) => r.voice))];
  console.log('\narm                 voice  turn  n   claim holds   usefulness  proportion  clarity  medicine  revision');
  for (const arm of arms) for (const v of voices) for (const which of ['T1', 'T2+']) { const rs = rows.filter((r) => r.arm === arm && r.voice === v && (which === 'T1' ? r.turn === 1 : r.turn > 1)); if (!rs.length) continue; const m = (k) => mean(rs.map((r) => Number(r.agentScores[k])).filter((x) => !Number.isNaN(x))).toFixed(2); console.log(`${arm.padEnd(19)} ${v.padEnd(6)} ${which.padEnd(4)} ${String(rs.length).padStart(3)}   ${String(rs.filter((r) => r.agentScores.claim === 'holds').length + '/' + rs.length).padStart(8)}      ${m('usefulness')}        ${m('proportion')}        ${m('clarity')}     ${m('medicine')}      ${which === 'T1' ? '—' : m('revision')}`); }
  const errs = {}; for (const r of rows) for (const e of r.agentScores.errors || []) { const k = r.arm + ' · ' + e; errs[k] = (errs[k] || 0) + 1; }
  console.log('\nerror labels by arm:'); for (const [k, v] of Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 24)) console.log(`  ${k} ×${v}`);
}
