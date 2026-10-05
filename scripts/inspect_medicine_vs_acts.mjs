// INSPECT — medicine text vs the partner's canonical acts (2026-10-05, Air's docket item 3: "inspect before implementing"). Parses the
// four benches on the shelf, takes each reading's ◈ medicine box and the draw's FIRST signature (the opening's medicine is that card's),
// computes the partner (lib/kernel.js buildKernel → partner) and lists the partner's acts (lib/pour/medicineActs.js). Prints every
// medicine beside its acts so the drift can be READ and counted by hand before any guard is designed. No model calls.
//   npx tsx scripts/inspect_medicine_vs_acts.mjs > "G:/My Drive/For Air Review/INSPECT_True_Medicine_Text_Vs_Acts_2026-10-05.md"
import fs from 'node:fs';
const { getComponent } = await import('../lib/corrections.js');
const { buildKernel } = await import('../lib/kernel.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const STATUS = { Balanced: 1, 'Too Much': 2, 'Too Little': 3, Unacknowledged: 4 };
const DIR = 'G:/My Drive/For Air Review/';
const FILES = ['BENCH_Candidate_A_Tense_Is_Not_History_2026-10-05.md', 'BENCH_Candidate_S_Status_Scope_2026-10-05.md', 'BENCH_Candidate_S2_One_Word_2026-10-05.md', 'BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'];
const out = [`# INSPECT — the medicine box against the partner's acts, 140 Plain openings`, `*True, 2026-10-05. Each reading's ◈ box beside the FIRST signature's partner and that partner's canonical acts (lib/pour/medicineActs.js). Balanced draws have no partner: the box should say what the capacity is free to feed next. Read, don't count: mark the boxes whose act is not the partner's.*`, ''];
let n = 0; const byPartner = {};
for (const f of FILES) {
  const md = fs.readFileSync(DIR + f, 'utf8');
  for (const part of md.split(/^## /m).slice(1)) {
    const key = part.split('\n')[0].trim(); if (/^The key|^The verdict/.test(key)) continue;
    const drawLine = (part.match(/\*\*Draw:\*\* (.+)/) || [])[1] || ''; const first = drawLine.split(' · ')[0] || '';
    const m = first.match(/^(Balanced|Too Much|Too Little|Unacknowledged) (.+?) in (.+)$/); if (!m) continue;
    const t = idOf(m[2]), p = idOf(m[3]), status = STATUS[m[1]];
    let partner = null, acts = '';
    try { const k = buildKernel({ transient: t, position: p, status }, DEFS); partner = k?.partner || null; const pid = k?.partnerId ?? (partner ? idOf(partner) : null); acts = pid != null && MEDICINE_ACTS[pid] ? MEDICINE_ACTS[pid].acts.join(' · ') : ''; } catch (e) { acts = `(kernel: ${e.message})`; }
    for (const b of part.split(/^### /m).slice(1)) {
      const lane = b[0]; const med = (b.match(/^> ◈ ?(.*)$/m) || [])[1] || ''; if (!med.trim()) continue; n++;
      const label = `${f.replace('BENCH_Candidate_', '').replace(/_2026.*$/, '')} · ${key} · ${lane}`;
      (byPartner[partner || '(Balanced — free to feed)'] ||= []).push({ label, first, med, acts });
    }
  }
}
for (const [partner, rows] of Object.entries(byPartner)) {
  out.push(`## partner: ${partner} (${rows.length})`, '');
  if (rows[0].acts) out.push(`**${partner}'s acts:** ${rows[0].acts}`, '');
  for (const r of rows) out.push(`- **${r.label}** — ${r.first}`, `  > ${r.med}`, '');
}
out.push(`*${n} medicine boxes.*`);
process.stdout.write(out.join('\n'));
