// TRACE (read-only): how VERBAL is each layer of the medicine, across the whole library? Share of items whose act includes a verbal verb
// (say / tell / speak / name / write / list / note / journal / put into words / out loud / ask / describe / declare / state).
//   layer 1: the 78 × ~5 hand-written canonical acts · layer 2: the 78 plain operation lines (.697) · layer 3: all poured cells' asks (6,725)
import fs from 'node:fs';
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const P = JSON.parse(fs.readFileSync('lib/data/plain_propositions.json', 'utf8'));
const VERBAL = /\b(say|says|said|saying|tell|telling|speak|speaking|name|naming|write|writing|written|list|note|journal|words|out loud|aloud|ask|asking|describe|declare|state it|sentence)\b/i;
const WRITE = /\b(write|writing|written|list|note|journal|on paper|on one page|page)\b/i;
const share = (arr, re) => `${arr.filter((x) => re.test(x)).length} of ${arr.length} (${Math.round((100 * arr.filter((x) => re.test(x)).length) / arr.length)}%)`;
const acts = Object.values(MEDICINE_ACTS).flatMap((m) => m.acts);
const ops = Object.values(P.medicine).map((m) => m.operation);
const asks = []; const dir = 'data/pour/snapshot';
for (const f of fs.readdirSync(dir).filter((x) => /^\d+\.json$/.test(x))) { const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')); for (const seat of Object.values(j.seats || {})) for (const c of Object.values(seat || {})) if (c?.ask) asks.push(c.ask); }
console.log('| layer | contains a verbal act | contains writing |'); console.log('|---|---|---|');
console.log(`| 1 canonical acts (all ${acts.length}) | ${share(acts, VERBAL)} | ${share(acts, WRITE)} |`);
console.log(`| 2 plain operation lines (78) | ${share(ops, VERBAL)} | ${share(ops, WRITE)} |`);
console.log(`| 3 poured cells' asks (${asks.length}) | ${share(asks, VERBAL)} | ${share(asks, WRITE)} |`);
// which verbs dominate the cells' asks
const verbs = {}; for (const a of asks) for (const m of a.toLowerCase().matchAll(/\b(say|tell|name|write|list|note|ask|speak|describe|out loud)\b/g)) verbs[m[1]] = (verbs[m[1]] || 0) + 1;
console.log('\nverbal verbs in the cells\' asks:', Object.entries(verbs).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`).join(' · '));
