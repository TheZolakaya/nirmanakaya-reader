// SMOKE — exercise the promoted guard on the API door: two Plain openings on the fresh-5 draw (where live drifted 2 of 5 times); watch the
// judge verdict, the re-ask path when it fires, and the acceptance decision in the log.   npx tsx scripts/smoke_medicine_promotion.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
const { getComponent } = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const draws = [{ transient: idOf('Resilience'), position: idOf('Faith'), status: 4 }, { transient: idOf('Preservation'), position: idOf('Culture'), status: 2 }, { transient: idOf('Passage'), position: idOf('Authority'), status: 1 }];
for (let i = 1; i <= 2; i++) {
  const r = await handingReading({ question: 'What practice would force me to preserve a contradiction long enough to learn from it instead of acting past it?', context: '', cardCount: 3, mode: 'discover', fast: true, voice: 'plain', requestId: null }, draws);
  console.log(`#${i} flags: ${(r.interpretation.flags || []).join(',') || 'none'}\n   medicine: ${r.interpretation.medicine.slice(0, 160)}`);
}
