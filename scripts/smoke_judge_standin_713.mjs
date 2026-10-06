// .713 the judge's verbal-standin clause, flag-only — the two regression fixtures (Catalyst of Intent, Command) and three that must NOT flag
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { judgeMedicineAct } = await import('../lib/bakeoff/medicineJudge.js'); const { getComponent } = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const CASES = [
  ['Catalyst of Intent', 'The move is one decisive act you already know the shape of: say it out loud to him and hold it, without going back to check. What it buys you is relief — the decision stops living in your head and starts living in the room.', true],
  ['Command', "The way through is to give your next step your own clear say-so — a plain yes or no, said in your own voice, even when you can't see past it. It's for the relief of something settling: you said it, so it's real, and it's yours.", true],
  ['Assertion', "The way back is to say the shape of the thing out loud, once, as yours, without arguing it.", false],
  ['Preservation', 'Keep the routine you already built exactly as it is this week: no reopening it, no rebuilding it; let it stand.', false],
  ['Catalyst of Intent', 'Make the call today and act on it before lunch: send the cancellation, move the meeting, take the first step — no announcement first.', false],
];
let ok = 0;
for (const [name, text, expect] of CASES) { const j = await judgeMedicineAct({ medicine: text, partnerId: idOf(name), otherPartnerIds: [] }); const hit = !!j.verbalStandin; if (hit === expect) ok++; console.log(`${hit === expect ? '✓' : '✗'} ${name}: verbalStandin=${hit} (expected ${expect}) · enforced verdict ${j.verdict} · votes ${j.votes?.join('/') || ''}`); }
console.log(`${ok} of ${CASES.length}`);
