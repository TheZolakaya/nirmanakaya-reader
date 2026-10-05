// SMOKE — one call to the medicine-act judge, env loaded as the bench scripts load it.   npx tsx scripts/smoke_medicine_judge.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { judgeMedicineAct } = await import('../lib/bakeoff/medicineJudge.js');
const cases = [
  ['PASS expected (faithful Steadfastness paraphrase)', { medicine: 'Sit with the hardest part of what is closing on what you already have, then stop for the day. No borrowed energy, no good mood required.', partnerId: 56, otherPartnerIds: [35, 49] }],
  ['FAIL_OTHER_CARD expected (Repose where Steadfastness was intended)', { medicine: 'The way through is quiet: let the mind sit instead of working the problem. Put the contradiction on a page, unedited, and leave every attempt to resolve it for tomorrow.', partnerId: 56, otherPartnerIds: [35, 49] }],
];
for (const [k, c] of cases) { const r = await judgeMedicineAct(c); console.log(`${k}\n  -> ${r.verdict} (votes ${r.votes.join(' / ')}) · ${r.provider} ${r.model} · in ${r.usage?.input_tokens} out ${r.usage?.output_tokens}`); }
