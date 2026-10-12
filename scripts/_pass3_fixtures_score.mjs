// PASS THREE, GATE 1 — score an auditor's answers to the 24 fixtures against Air's key: holds/fails agreement, false alarms (holds→fails),
// misses (fails→holds), and error-label overlap. npx tsx scripts/_pass3_fixtures_score.mjs <answers.json> [label]
import fs from 'node:fs';
const [FILE, LABEL = 'auditor'] = process.argv.slice(2);
const key = JSON.parse(fs.readFileSync('data/bakeoff/pass3/fixtures_key.json', 'utf8'));
let raw = fs.readFileSync(FILE, 'utf8'); const s = raw.indexOf('['), e = raw.lastIndexOf(']'); const ans = JSON.parse(raw.slice(s, e + 1));
let agree = 0, falseAlarm = [], miss = [], labelHit = 0, labelTotal = 0;
for (const a of ans) { const k = key[a.id]; if (!k) continue; const exp = k.claim_handling, got = a.claim_handling; if (exp === got) agree++; else if (exp === 'holds') falseAlarm.push(a.id); else miss.push(a.id); if (exp === 'fails') { labelTotal += k.target_errors.length; labelHit += k.target_errors.filter((t) => (a.errors || []).includes(t)).length; } }
console.log(`${LABEL}: ${agree}/${Object.keys(key).length} verdicts agree · false alarms (holds judged fails): ${falseAlarm.length} [${falseAlarm.join(',')}] · misses (fails judged holds): ${miss.length} [${miss.join(',')}] · error labels matched ${labelHit}/${labelTotal}`);
for (const a of ans) { const k = key[a.id]; if (k && k.claim_handling !== a.claim_handling) console.log(`  ${a.id} expected ${k.claim_handling}, got ${a.claim_handling}: ${String(a.reason || '').slice(0, 140)}`); }
