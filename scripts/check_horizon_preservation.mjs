// CHECK — THE WHEEL/WORLD HORIZON UNDER THE CORRECTIONS (Air's commission, 2026-10-05, run on True's side against the live source).
// The question, exactly as Air set it: for each of Vertical, Diagonal and Reduction, does every source→target pair on the sixteen manifest
// archetypes preserve the binary horizon h(Seed)=h(Fruition)=0, h(Bridge)=h(Feedback)=1? And the Stage successor (Seed→Bridge→Fruition→
// Feedback→Seed within a house)? Growth is MEASURED, not predicted.
// PRE-REGISTERED EXPECTATION (Air, before this ran): Vertical 16/16 preserving · Diagonal 16/16 · Reduction 16/16 · Stage successor 0/16 preserving
// (16/16 toggling) · Growth: no prediction.
// Sources: lib/corrections.js (the live medicine tables) · lib/data/nirmanakaya_78_definitions.json (each archetype's "stage" in the record).
// The house tables for the Stage successor come from the record's stage field + practice, cross-checked against FINDING_Diagonal_Sums_Assertion_Source
// (Spirit 2/3/17/18, Mind 4/5/15/16, Emotion 6/7/13/14, Body 8/9/11/12).
import fs from 'node:fs';
const { DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS, GROWTH_PAIRS } = await import('../lib/corrections.js');
const defs = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const arche = Object.values(defs.signatures).filter((c) => c && typeof c === 'object' && 'stage' in c && Number(c.id) <= 21);
const byId = {}; for (const c of arche) byId[Number(c.id ?? c.number)] = c;
const manifest = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const h = (id) => ({ Seed: 0, Fruition: 0, Bridge: 1, Feedback: 1 })[byId[id]?.stage];
console.log('stage per manifest id:', manifest.map((id) => `${id}:${byId[id]?.stage}`).join(' '));
if (manifest.some((id) => h(id) === undefined)) throw new Error('a manifest archetype has no stage in the record');
// the Stage successor from the record: within each practice, Seed→Bridge→Fruition→Feedback→Seed
const order = ['Seed', 'Bridge', 'Fruition', 'Feedback'];
const practices = {}; for (const id of manifest) { const p = byId[id].practice || byId[id].house; (practices[p] ||= {})[byId[id].stage] = id; }
console.log('houses from the record:', Object.entries(practices).map(([p, s]) => `${p} ${order.map((k) => s[k]).join('/')}`).join(' · '));
const STAGE_NEXT = {}; for (const s of Object.values(practices)) for (let i = 0; i < 4; i++) STAGE_NEXT[s[order[i]]] = s[order[(i + 1) % 4]];
const report = (name, map) => {
  let pres = 0, tog = 0, out = 0; const bad = [];
  for (const id of manifest) { const t = Number(map[id]); if (!manifest.includes(t)) { out++; bad.push(`${id}→${t} (off the sixteen)`); continue; } if (h(id) === h(t)) pres++; else { tog++; bad.push(`${id}(${byId[id].stage})→${t}(${byId[t].stage})`); } }
  console.log(`${name.padEnd(16)} preserving ${pres}/16 · toggling ${tog}/16${out ? ` · off the sixteen ${out}` : ''}${bad.length && name !== 'Stage successor' ? '  [' + bad.join(', ') + ']' : ''}`);
  return { pres, tog, out };
};
console.log('\nh = 0 on Seed/Fruition (the 19 → Wheel diagonal), 1 on Bridge/Feedback (the 21 → World diagonal)\n');
const V = report('Vertical', VERTICAL_PAIRS), D = report('Diagonal', DIAGONAL_PAIRS), R = report('Reduction', REDUCTION_PAIRS), S = report('Stage successor', STAGE_NEXT);
const G = report('Growth (live)', GROWTH_PAIRS);
// the diagonal-class check behind the horizon: does each correction send a sum-19 pair to a sum-19 pair? (the pair = the id and its DIAGONAL partner)
const cls = (id) => (id + DIAGONAL_PAIRS[id] === 19 ? 19 : id + DIAGONAL_PAIRS[id] === 21 ? 21 : '?');
console.log('\ndiagonal sum per manifest id:', manifest.map((id) => `${id}:${cls(id)}`).join(' '));
console.log('h agrees with the diagonal class (19↔0, 21↔1) on all sixteen:', manifest.every((id) => (cls(id) === 19 ? 0 : 1) === h(id)));
// two Stage steps = Diagonal?
const twice = manifest.filter((id) => STAGE_NEXT[STAGE_NEXT[id]] === DIAGONAL_PAIRS[id]).length;
console.log(`S² = Diagonal on ${twice}/16 manifest archetypes`);
console.log('\nAgainst the pre-registered expectation:', V.pres === 16 && D.pres === 16 && R.pres === 16 && S.tog === 16 ? 'MATCH on all four' : 'MISMATCH — read the rows');
