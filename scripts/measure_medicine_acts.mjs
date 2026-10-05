// MEASURE — a mechanical check of the medicine box against the partner's canonical acts (2026-10-05, Air's docket item 3, after the
// inspection). For each of the 133 bench boxes: the partner's acts' CONTENT WORDS (lib/pour/medicineActs.js, stopwords out, crude stem)
// against the box's content words; the score is how many of the partner's words appear. The 8 hand-marked drifts are listed in the
// INSPECT file; this prints the low-score boxes so precision and recall can be read off before anything goes in the lint.
//   npx tsx scripts/measure_medicine_acts.mjs [threshold=1]
import fs from 'node:fs';
const { getComponent } = await import('../lib/corrections.js');
const { buildKernel } = await import('../lib/kernel.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const THRESH = Number(process.argv[2] ?? 1);
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const STATUS = { Balanced: 1, 'Too Much': 2, 'Too Little': 3, Unacknowledged: 4 };
const STOP = new Set('a an the and or but of to in on at by for with from into onto as is are was were be been being it its it\'s this that these those you your yours yourself one once what which who whom when where why how not no nor so if then than too very can could will would shall should may might must do does did done doing have has had having here there now today week day without within about again more most much some any all each every own same other another same just only also still yet already ever never both either neither until while because though although whether ask asking asked way through small thing things something someone anyone person people get gets got back give gives giving keep keeps kept let lets make makes made take takes took come comes came go goes went'.split(/\s+/));
const stem = (w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s|ly)$/, '').replace(/(tion|ness|ment)$/, '');
const words = (t) => [...new Set(String(t || '').toLowerCase().replace(/[^a-z'\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem).filter((w) => w.length > 2))];
const DIR = 'G:/My Drive/For Air Review/';
const FILES = ['BENCH_Candidate_A_Tense_Is_Not_History_2026-10-05.md', 'BENCH_Candidate_S_Status_Scope_2026-10-05.md', 'BENCH_Candidate_S2_One_Word_2026-10-05.md', 'BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'];
const rows = [];
for (const f of FILES) {
  const md = fs.readFileSync(DIR + f, 'utf8');
  for (const part of md.split(/^## /m).slice(1)) {
    const key = part.split('\n')[0].trim(); if (/^The key|^The verdict/.test(key)) continue;
    const sigs = ((part.match(/\*\*Draw:\*\* (.+)/) || [])[1] || '').split(' · ');
    const partnersOf = sigs.map((s) => { const m = s.match(/^(Balanced|Too Much|Too Little|Unacknowledged) (.+?) in (.+)$/); if (!m) return null; try { const k = buildKernel({ transient: idOf(m[2]), position: idOf(m[3]), status: STATUS[m[1]] }, DEFS); return k?.partnerId ?? null; } catch { return null; } });
    const pid = partnersOf[0]; if (pid == null || !MEDICINE_ACTS[pid]) continue;
    const partner = MEDICINE_ACTS[pid].name;
    const actWordsOf = (id) => words(MEDICINE_ACTS[id].acts.join(' ') + ' ' + MEDICINE_ACTS[id].name);
    const actWords = actWordsOf(pid);
    const others = partnersOf.slice(1).filter((id) => id != null && id !== pid && MEDICINE_ACTS[id]);
    for (const b of part.split(/^### /m).slice(1)) {
      const lane = b[0]; const med = (b.match(/^> ◈ ?(.*)$/m) || [])[1] || ''; if (!med.trim()) continue;
      const mw = words(med); const hit = actWords.filter((w) => mw.includes(w));
      // THE COMPARATIVE CHECK: does the box match a LATER card's partner better than the first's? (5 of the 8 hand-marked drifts were that shape)
      const otherBest = others.map((id) => ({ name: MEDICINE_ACTS[id].name, score: actWordsOf(id).filter((w) => mw.includes(w)).length })).sort((a, b) => b.score - a.score)[0] || null;
      rows.push({ label: `${f.replace('BENCH_Candidate_', '').replace(/_2026.*$/, '')} · ${key} · ${lane}`, partner, score: hit.length, hit, med, otherBest });
    }
  }
}
rows.sort((a, b) => a.score - b.score);
const low = rows.filter((r) => r.score <= THRESH);
console.log(`${rows.length} boxes · ${low.length} at score ≤ ${THRESH}\n`);
for (const r of low) console.log(`[${r.score}] ${r.partner} · ${r.label}\n    hits: ${r.hit.join(', ') || '—'}\n    ${r.med.slice(0, 160)}\n`);
console.log('score distribution:', JSON.stringify(rows.reduce((a, r) => ((a[r.score] = (a[r.score] || 0) + 1), a), {})));
const swapped = rows.filter((r) => r.otherBest && r.otherBest.score > r.score && r.score <= 1);
console.log(`\nCOMPARATIVE: ${swapped.length} boxes match a later card's partner better than the first's (first ≤ 1):`);
for (const r of swapped) console.log(`  first ${r.partner} ${r.score} < ${r.otherBest.name} ${r.otherBest.score} · ${r.label}\n    ${r.med.slice(0, 120)}`);
