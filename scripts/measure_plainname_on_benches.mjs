// MEASURE — THE PLAIN NAME flag against the four benches' 140 Plain openings (2026-10-05). Parses the shelf's bench files
// (### A / ### B blocks: *gist*, body, > ◈ medicine, *question*), runs plainNameFlags on gist+body+medicine+question, and prints every
// hit with its reading key so the hand-marked 14 can be compared against the flag's own list. No model calls.
//   npx tsx scripts/measure_plainname_on_benches.mjs
import fs from 'node:fs';
const { plainNameFlags } = await import('../lib/bakeoff/lint.js');
const DIR = 'G:/My Drive/For Air Review/';
const FILES = ['BENCH_Candidate_A_Tense_Is_Not_History_2026-10-05.md', 'BENCH_Candidate_S_Status_Scope_2026-10-05.md', 'BENCH_Candidate_S2_One_Word_2026-10-05.md', 'BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'];
let total = 0, flagged = 0; const rows = [];
for (const f of FILES) {
  const md = fs.readFileSync(DIR + f, 'utf8');
  const keyRe = /^## (?!The key|The verdict)(.+)$/gm; const parts = md.split(/^## /m).slice(1);
  for (const part of parts) {
    const key = part.split('\n')[0].trim(); if (/^The key|^The verdict/.test(key)) continue;
    const blocks = part.split(/^### /m).slice(1);
    for (const b of blocks) {
      const lane = b[0]; const body = b.slice(1).trim();
      if (body.startsWith('error:')) continue;
      total++;
      const fl = plainNameFlags(body);
      if (fl.length) { flagged++; rows.push(`${f.replace('BENCH_Candidate_', '').replace(/_2026.*$/, '')} · ${key} · ${lane}: ${fl[0].detail.split(' — the Plain voice')[0]}`); }
    }
  }
}
console.log(`${flagged} of ${total} Plain openings flagged by plainname\n`);
console.log(rows.join('\n'));
