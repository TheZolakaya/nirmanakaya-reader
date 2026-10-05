// BENCH — THE REPAIR (2026-10-05, Air: "test the repair, not just the detector"). Offline, no new draws: for every box the corrected judge
// FAILED on the frozen 133 (EVAL_True_Medicine_Act_Judge_Verdicts_…_votes2.json), re-ask the Reader ONCE on the stored reading's own draw
// with the same set-aside sentence production would use, naming the medicine fault. The retry runs through handingReading's full guard,
// so it comes back with the judge's own two-vote verdict on the retry (interpretation.flags → medicineact:<verdict>, absent = PASS) and the
// lint's structural flags. Writes the original/retry medicine pairs BLIND (A/B at random, key at the foot) with the retry's verdict and
// scars, plus the retry's prose, so the pairs can be read. Success per Air: the wrong action becomes the correct action (positive fidelity
// verdict on the retry — UNCERTAIN is not proof), without a new structural fault, without flattening or losing lawful combinations.
//   npx tsx scripts/bench_medicine_repair.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { getComponent } = await import('../lib/corrections.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const DIR = 'G:/My Drive/For Air Review/';
const verdicts = JSON.parse(fs.readFileSync(DIR + 'EVAL_True_Medicine_Act_Judge_Verdicts_2026-10-05_votes2.json', 'utf8'));
const triggers = verdicts.filter((r) => r.verdict.startsWith('FAIL'));
console.log(`${triggers.length} trigger boxes (FAIL_*) of ${verdicts.length}`);

// label → the stored reading's draw and question
const UA_FAITH_IMAG = [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }];
const requestIdOf = (key) => { const k = key.replace(/ #\d+$/, ''); if (k.startsWith('recursive-reader-') || k.startsWith('mind-seat-')) return k; if (k.startsWith('run4-')) return 'recursive-reader-v099672-' + k.slice(5); if (/^v0996/.test(k)) return 'recursive-reader-' + k; return null; };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = [...new Set(triggers.map((t) => requestIdOf(t.label.split(' · ')[1])).filter(Boolean))];
const { data: rows } = ids.length ? await db.from('external_readings').select('request_id, question, context, mode, draws').in('request_id', ids) : { data: [] };
const ledger = Object.fromEntries((rows || []).map((r) => [r.request_id, r]));
const caseOf = (t) => { const key = t.label.split(' · ')[1]; if (key.startsWith('control-exhibit-now')) return { question: '', context: '', draws: UA_FAITH_IMAG, mode: 'discover' }; if (key.startsWith('control-denver')) return { question: 'Should I take the job in Denver?', context: '', draws: UA_FAITH_IMAG, mode: 'discover' }; const r = ledger[requestIdOf(key)]; return r ? { question: r.question, context: r.context || '', draws: r.draws, mode: r.mode } : null; };
const noteOf = (t) => { const intended = MEDICINE_ACTS[t.pid]; const acts = intended.acts.slice(0, 3).join('; '); if (t.verdict === 'FAIL_OTHER_CARD') { return `the medicine box does a later signature's act in place of the opening's — the opening's medicine is ${intended.name}'s own action, from the record: ${acts}; write the box as that act, done small, today`; } return `the medicine box does not do the opening's medicine — ${intended.name}'s own action, from the record: ${acts}; write the box as that act, done small, today`; };

const out = [`# BENCH — the repair: one re-ask on the judge's trigger set, read blind`, `*True, 2026-10-05. Offline, no new draws. Each trigger box from the corrected two-vote eval re-asked ONCE on its stored draw with production's set-aside sentence naming the medicine fault. The retry ran through the full guard, so its own two-vote verdict (absent = PASS) and structural flags are shown. Pairs are A/B at random; the key is at the foot. Success: the wrong action becomes the correct one on a positive verdict, with no new structural fault and no flattening.*`, '', '| trigger | truth | first verdict | retry verdict | retry scars | words A/B |', '|---|---|---|---|---|---|'];
const key = []; const detail = []; const tally = { n: 0, pass: 0, uncertain: 0, fail: 0, scars: 0, error: 0 };
const SCARS = new Set(['garble', 'letter', 'commands', 'pet', 'tarot', 'bothways', 'narrator', 'conduit', 'promise', 'binding', 'listy', 'destination', 'plainname']);
for (const t of triggers) {
  const c = caseOf(t); if (!c) { out.push(`| ${t.label} | ${t.truth} | ${t.verdict} | (no stored draw) | | |`); continue; }
  tally.n++;
  let it, err = null;
  try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, { setAside: noteOf(t) }); it = r.interpretation; } catch (e) { err = e.message; }
  if (err) { tally.error++; out.push(`| ${t.label} | ${t.truth} | ${t.verdict} | ERROR ${err.slice(0, 40)} | | |`); continue; }
  const flags = it.flags || []; const empty = !String(it.medicine || '').trim(); const mv = empty ? 'EMPTY' : (flags.find((f) => String(f).startsWith('medicineact:')) || 'medicineact:PASS').split(':')[1]; const scars = flags.filter((f) => SCARS.has(f)); // an EMPTY box is not a PASS: the judge skips an empty medicine, so an absent flag must not read as approval (first run of this bench counted one empty retry as PASS)
  if (mv === 'PASS') tally.pass++; else if (mv === 'UNCERTAIN') tally.uncertain++; else if (mv === 'EMPTY') tally.empty = (tally.empty || 0) + 1; else tally.fail++; if (scars.length) tally.scars++;
  const flip = Math.random() < 0.5; const [A, B] = flip ? [it.medicine, t.med] : [t.med, it.medicine]; key.push(`${t.label}: A = ${flip ? 'retry' : 'original'}, B = ${flip ? 'original' : 'retry'}`);
  out.push(`| ${t.label} | ${t.truth} | ${t.verdict} | ${mv} | ${scars.join(',') || '—'} | ${String(A).split(/\s+/).length}/${String(B).split(/\s+/).length} |`);
  detail.push(`## ${t.label}`, `**Intended medicine:** ${MEDICINE_ACTS[t.pid].name} — ${MEDICINE_ACTS[t.pid].acts.join(' · ')}`, `**Other drawn medicines:** ${t.others.filter((o) => o != null).map((o) => MEDICINE_ACTS[o]?.name).filter(Boolean).join(', ') || 'none'}`, `**First verdict:** ${t.verdict} · **truth:** ${t.truth}`, '', `### A`, `> ◈ ${A}`, '', `### B`, `> ◈ ${B}`, '', `<details><summary>the retry's prose (for new faults and flattening)</summary>`, '', `*${it.gist || ''}*`, '', it.text || '', '', `*${it.question || ''}*`, '', `</details>`, '');
  process.stdout.write(`${t.label}: retry ${mv}${scars.length ? ' scars ' + scars.join(',') : ''}\n`);
}
out.push('', `**Retries: ${tally.n} · positive verdict (PASS) ${tally.pass} · UNCERTAIN ${tally.uncertain} (not proof) · still FAIL ${tally.fail} · with a structural scar ${tally.scars} · errors ${tally.error}.**`, '', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const path = DIR + 'BENCH_True_Medicine_Repair_One_ReAsk_2026-10-05.md'; fs.writeFileSync(path, out.join('\n')); console.log('shelf:', path, JSON.stringify(tally));
