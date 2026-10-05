// EVAL — THE MEDICINE-ACT JUDGE against the frozen 133 (2026-10-05). The 133 medicine boxes from the four benches on the shelf, each with
// its first signature's partner and the other drawn partners; the eight hand-read drifts (INSPECT_True_Medicine_Text_Vs_Acts) are the
// positives, six mixed boxes are marked separately, the rest are good. One judge call per box. Prints the confusion against Air's bar
// (≥7 of 8 caught; ≤2 clear false positives on the good boxes; UNCERTAIN counted apart) and writes the full table to the shelf.
//   npx tsx scripts/eval_medicine_judge.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { getComponent } = await import('../lib/corrections.js');
const { buildKernel } = await import('../lib/kernel.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { judgeMedicineAct } = await import('../lib/bakeoff/medicineJudge.js');
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const STATUS = { Balanced: 1, 'Too Much': 2, 'Too Little': 3, Unacknowledged: 4 };
const short = (f) => f.replace('BENCH_Candidate_', '').replace(/_2026.*$/, '');

// the hand labels (INSPECT_True_Medicine_Text_Vs_Acts_2026-10-05.md, "The reading")
const DRIFT = new Set([
  'A_Tense_Is_Not_History · recursive-reader-v099669-fresh-01-cycle-5 · A',     // Steadfastness → a repose
  'S_Status_Scope · recursive-reader-v099669-fresh-01-cycle-5 · A',             // Steadfastness → a pull toward
  'S_Status_Scope · recursive-reader-v099669-fresh-01-cycle-4 · B',             // Command → a weighing
  'S_Status_Scope · recursive-reader-v099672-20261004c-cycle-2 #2 · B',         // Initiate of Cognition → Immersion only
  'S2_One_Word · v099672-20261004c-cycle-2 #4 · B',                             // Initiate of Cognition → Immersion + Assertion
  'L_Level_Of_Address · run4-20261004c-cycle-2 #1 · B',                         // Initiate of Cognition → Immersion only
  'S2_One_Word · v099669-fresh-01-cycle-1 #3 · B',                              // Fortitude → a joining
  'S2_One_Word · v099669-fresh-01-cycle-1 #5 · A',                              // Fortitude → a joining
  'S2_One_Word · v099672-20261004c-cycle-2 #2 · B',                             // Initiate of Cognition → Immersion only (the judge found it on the first eval; my hand reading had missed it — 9 drifts, not 8)
]);
const MIXED = new Set([
  'A_Tense_Is_Not_History · recursive-reader-takeover-2026-10-04-cycle-8 · A',  // Celebration + Honor
  'S_Status_Scope · recursive-reader-takeover-2026-10-04-cycle-8 · B',          // Celebration + Honor
  'A_Tense_Is_Not_History · recursive-reader-v099669-fresh-01-cycle-4 · B',     // Command + restart the routine
  'S_Status_Scope · recursive-reader-v099672-20261004c-cycle-3 · A',            // gather into one line + own reserves
  'L_Level_Of_Address · run4-20261004c-cycle-3 #1 · B',                         // own reserves + one move toward the person
  'L_Level_Of_Address · run4-20261004c-cycle-4 #2 · B',                         // Orientation + strike one item off
]);

const DIR = 'G:/My Drive/For Air Review/';
const FILES = ['BENCH_Candidate_A_Tense_Is_Not_History_2026-10-05.md', 'BENCH_Candidate_S_Status_Scope_2026-10-05.md', 'BENCH_Candidate_S2_One_Word_2026-10-05.md', 'BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'];
const boxes = [];
for (const f of FILES) {
  const md = fs.readFileSync(DIR + f, 'utf8');
  for (const part of md.split(/^## /m).slice(1)) {
    const key = part.split('\n')[0].trim(); if (/^The key|^The verdict/.test(key)) continue;
    const sigs = ((part.match(/\*\*Draw:\*\* (.+)/) || [])[1] || '').split(' · ');
    const partners = sigs.map((s) => { const m = s.match(/^(Balanced|Too Much|Too Little|Unacknowledged) (.+?) in (.+)$/); if (!m) return null; try { return buildKernel({ transient: idOf(m[2]), position: idOf(m[3]), status: STATUS[m[1]] }, DEFS)?.partnerId ?? null; } catch { return null; } });
    const pid = partners[0]; if (pid == null || !MEDICINE_ACTS[pid]) continue;
    for (const b of part.split(/^### /m).slice(1)) {
      const lane = b[0]; const med = (b.match(/^> ◈ ?(.*)$/m) || [])[1] || ''; if (!med.trim()) continue;
      const label = `${short(f)} · ${key} · ${lane}`;
      boxes.push({ label, med, pid, others: partners.slice(1), truth: DRIFT.has(label) ? 'drift' : MIXED.has(label) ? 'mixed' : 'good' });
    }
  }
}
console.log(`${boxes.length} boxes · ${boxes.filter((b) => b.truth === 'drift').length} drift · ${boxes.filter((b) => b.truth === 'mixed').length} mixed · ${boxes.filter((b) => b.truth === 'good').length} good\n`);
const VOTES = Math.max(1, Number(process.env.VOTES || process.argv[2] || 1)); // VOTES=2: FAIL only when every vote fails (type by majority), PASS only when every vote passes, else UNCERTAIN — single-token noise showed on the first eval (the same Immersion-only shape passed once and failed twice)
const combine = (vs) => { const fails = vs.filter((v) => v.startsWith('FAIL')); if (fails.length === vs.length) { const c = {}; for (const f of fails) c[f] = (c[f] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; } if (vs.every((v) => v === 'PASS')) return 'PASS'; return 'UNCERTAIN'; };
const rows = []; let usage = { in: 0, out: 0 };
for (const b of boxes) {
  let v;
  try {
    const votes = []; for (let i = 0; i < VOTES; i++) { const r = await judgeMedicineAct({ medicine: b.med, partnerId: b.pid, otherPartnerIds: b.others, votes: 1 }); votes.push(r); } // the script combines its own votes (the module's default is 2); VOTES=1 here = one raw vote
    v = { verdict: VOTES > 1 ? combine(votes.map((r) => r.verdict)) : votes[0].verdict, raw: votes.map((r) => r.raw).join(' / '), usage: { input_tokens: votes.reduce((a, r) => a + (r.usage?.input_tokens || 0), 0), output_tokens: votes.reduce((a, r) => a + (r.usage?.output_tokens || 0), 0) } };
  } catch (e) { v = { verdict: 'ERROR', raw: e.message }; }
  if (v.usage) { usage.in += v.usage.input_tokens || 0; usage.out += v.usage.output_tokens || 0; }
  rows.push({ ...b, verdict: v.verdict, raw: v.raw });
  const fail = v.verdict.startsWith('FAIL');
  const mark = b.truth === 'drift' ? (fail ? 'CAUGHT' : v.verdict === 'UNCERTAIN' ? 'uncertain' : 'MISSED') : b.truth === 'good' ? (fail ? 'FALSE POSITIVE' : v.verdict === 'UNCERTAIN' ? 'uncertain' : 'ok') : (fail ? 'mixed→fail' : v.verdict === 'UNCERTAIN' ? 'mixed→uncertain' : 'mixed→pass');
  process.stdout.write(`${mark.padEnd(16)} ${v.verdict.padEnd(16)} ${MEDICINE_ACTS[b.pid].name.padEnd(22)} ${b.label}\n`);
}
const by = (truth, pred) => rows.filter((r) => r.truth === truth && pred(r.verdict)).length;
const isFail = (v) => v.startsWith('FAIL');
const summary = [
  `drift (${rows.filter((r) => r.truth === 'drift').length}): caught ${by('drift', isFail)} · uncertain ${by('drift', (v) => v === 'UNCERTAIN')} · missed (PASS) ${by('drift', (v) => v === 'PASS')} — uncertain is abstention, not detection: those drifts would receive no intervention`,
  `good (${rows.filter((r) => r.truth === 'good').length}): false alarms ${by('good', isFail)} · uncertain ${by('good', (v) => v === 'UNCERTAIN')} · pass ${by('good', (v) => v === 'PASS')}`,
  `mixed — ALLOWED, counted as valid outputs (${rows.filter((r) => r.truth === 'mixed').length}): false alarms ${by('mixed', isFail)} · uncertain ${by('mixed', (v) => v === 'UNCERTAIN')} · pass ${by('mixed', (v) => v === 'PASS')}`,
  `FALSE ALARMS TOTAL (good + allowed mixed): ${by('good', isFail) + by('mixed', isFail)} — Air's bar: at most 2`,
  `errors: ${rows.filter((r) => r.verdict === 'ERROR').length} · tokens in ${usage.in} out ${usage.out} (the provider log carries each call's live price)`,
];
fs.writeFileSync(DIR + `EVAL_True_Medicine_Act_Judge_Verdicts_2026-10-05${VOTES > 1 ? `_votes${VOTES}` : ''}.json`, JSON.stringify(rows.map((r) => ({ label: r.label, truth: r.truth, verdict: r.verdict, votes: r.raw, pid: r.pid, others: r.others, med: r.med })), null, 1)); // the trigger set for the repair bench
console.log('\n' + summary.join('\n'));
const out = [`# EVAL — the medicine-act judge against the frozen 133`, `*True, 2026-10-05. One cheap-lane call per box (lib/bakeoff/medicineJudge.js): the box text, the intended partner and its acts, the other drawn partners. Hand labels from INSPECT_True_Medicine_Text_Vs_Acts: 8 drift, 6 mixed (allowed), the rest good. Air's bar: ≥7/8 caught, ≤2 clear false positives on the good boxes, UNCERTAIN never re-asks.*`, '', '## Summary', ...summary.map((s) => `- ${s}`), '', '## Every box', '', '| truth | verdict | partner | box |', '|---|---|---|---|', ...rows.map((r) => `| ${r.truth} | ${r.verdict} | ${MEDICINE_ACTS[r.pid].name} | ${r.label} |`), '', '## The disagreements (drift not caught, good failed, anything uncertain)', ''];
for (const r of rows.filter((r) => (r.truth === 'drift' && !isFail(r.verdict)) || (r.truth === 'good' && r.verdict !== 'PASS') || (r.truth === 'mixed' && r.verdict !== 'PASS'))) out.push(`- **${r.truth} → ${r.verdict}** · ${MEDICINE_ACTS[r.pid].name} · ${r.label}${r.others.filter((o) => o != null).length ? ` · others: ${r.others.filter((o) => o != null).map((o) => MEDICINE_ACTS[o]?.name || o).join(', ')}` : ''}`, `  > ${r.med}`, '');
out.splice(1, 0, `*Votes per box: ${VOTES}${VOTES > 1 ? ' — FAIL only when every vote fails, PASS only when every vote passes, else UNCERTAIN' : ''}.*`);
const path = DIR + `EVAL_True_Medicine_Act_Judge_On_The_Frozen_133_2026-10-05${VOTES > 1 ? `_votes${VOTES}` : ''}.md`; fs.writeFileSync(path, out.join('\n')); console.log('shelf:', path);
