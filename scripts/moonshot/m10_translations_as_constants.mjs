// M10 — WHICH TRANSLATIONS OF THE GRID ACT ON THE NUMBERS AS CONSTANTS (True, 2026-10-12, after m9).
// The three named corrections are translations of (house, channel) ∈ K²: in the canon's coordinates V = (0, ω) (sum 20),
// D = (0, 1) (sum 19 on Wheel, 21 on World), R = (ω, ω) (difference 9). The formula builds V and D in; m9 §6 showed R = +9 ⟺ the Seal's rows.
// Question: is "a named correction acts as a constant" one principle? For every translation (u, v) of K² and every (alphabet, cooling):
// does n(h+u, c+v) − n(h, c) or n(h+u, c+v) + n(h, c) take one value (or one value per Wheel/World class)? Which translations are constants
// for the canon, and does "R acts as SOME constant difference" (no 9 supplied) already ⟺ the row condition?
//   npx tsx scripts/moonshot/m10_translations_as_constants.mjs
import { K, W, W2, add, mul, frob, tr, name, ELEMENTS, perms, ROLE_K, SOUL_ALPHABET } from './f4.mjs';
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]);
const stage = (al, h, c) => add(add(frob(al[c]), al[h]), 1);
const numbering = (al, cooling) => { const rank = Object.fromEntries(cooling.map((e, i) => [e, i + 1])); const num = {}; for (const h of ELEMENTS) for (const c of ELEMENTS) { const st = stage(al, h, c); const t = T1.has(st) ? 1 : 0; const N = 2 * rank[h] + t; num[`${h}|${c}`] = INNER.has(st) ? N : 20 - N; } return num; };
const COOL = ['Fire', 'Air', 'Water', 'Earth'], COLS = ['Fire', 'Water', 'Air', 'Earth'];
const alpha = SOUL_ALPHABET;
const alphabets = perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])));
const orders = perms(ELEMENTS);
const rowsMagic = (num, cool) => cool.every((c) => COLS.reduce((s, h) => s + num[`${h}|${c}`], 0) === 40);
const el = (al) => Object.fromEntries(ELEMENTS.map((e) => [al[e], e]));
// how a translation (u, v) acts: for each cell, the partner's number; report the sums and differences, overall and per Wheel/World class (Tr(Stage))
const action = (al, num, u, v) => { const E = el(al); const sums = new Set(), diffs = new Set(), byClass = { 0: new Set(), 1: new Set() }, byClassSum = { 0: new Set(), 1: new Set() };
  for (const h of ELEMENTS) for (const c of ELEMENTS) { const n = num[`${h}|${c}`]; const n2 = num[`${E[add(al[h], u)]}|${E[add(al[c], v)]}`]; sums.add(n + n2); diffs.add(Math.abs(n - n2)); const cls = tr(stage(al, h, c)); byClass[cls].add(Math.abs(n - n2)); byClassSum[cls].add(n + n2); }
  return { constSum: sums.size === 1 ? [...sums][0] : null, constDiff: diffs.size === 1 ? [...diffs][0] : null, classSum: byClassSum[0].size === 1 && byClassSum[1].size === 1 ? [[...byClassSum[0]][0], [...byClassSum[1]][0]] : null, classDiff: byClass[0].size === 1 && byClass[1].size === 1 ? [[...byClass[0]][0], [...byClass[1]][0]] : null }; };

console.log('== 1. the canon: which of the 16 translations (house + u, channel + v) act as constants ==');
const num0 = numbering(alpha, COOL);
const canonNames = { '0,2': 'V (Vertical)', '0,1': 'D (Diagonal)', '2,2': 'R (Reduction)', '0,3': 'V∘D (unnamed)' };
for (const u of K) for (const v of K) { if (u === 0 && v === 0) continue; const a = action(alpha, num0, u, v); const tag = canonNames[`${u},${v}`] ? ` ← ${canonNames[`${u},${v}`]}` : '';
  const desc = a.constSum != null ? `constant SUM ${a.constSum}` : a.constDiff != null ? `constant DIFFERENCE ${a.constDiff}` : a.classSum ? `sums ${a.classSum[0]} (Wheel) / ${a.classSum[1]} (World)` : a.classDiff ? `differences ${a.classDiff[0]} (Wheel) / ${a.classDiff[1]} (World)` : 'not constant';
  console.log(`  (${name(u)}, ${name(v)}): ${desc}${tag}`); }
const a = (u, v) => action(alpha, num0, u, v);
ok(a(0, W).constSum === 20 && a(0, 1).classSum?.join() === '19,21' && a(0, W2).constDiff === 1 && a(W, W).constDiff === 9, 'the canon: V = (0, ω) sum 20 · D = (0, 1) sums 19/21 by horizon · V∘D = (0, ω²) difference 1 · R = (ω, ω) difference 9 — all three named corrections (and the unnamed fourth channel step) act as constants');
const constantOnes = []; for (const u of K) for (const v of K) { if (u === 0 && v === 0) continue; const x = a(u, v); if (x.constSum != null || x.constDiff != null || x.classSum || x.classDiff) constantOnes.push(`(${name(u)},${name(v)})`); }
console.log(`  translations that act as constants for the canon: ${constantOnes.join(' ')}`);

console.log('\n== 2. over all 576 (alphabet, cooling): which translations are ALWAYS constants, which are constants exactly when the rows are magic ==');
const tally = {}; for (const u of K) for (const v of K) { if (u === 0 && v === 0) continue; tally[`${u},${v}`] = { always: 0, iffRows: 0, total: 0 }; }
let rowsCount = 0;
for (const al of alphabets) for (const cool of orders) { const num = numbering(al, cool); const rm = rowsMagic(num, cool); if (rm) rowsCount++;
  for (const key of Object.keys(tally)) { const [u, v] = key.split(',').map(Number); const x = action(al, num, u, v); const isConst = x.constSum != null || x.constDiff != null || !!x.classSum || !!x.classDiff; tally[key].total++; if (isConst) tally[key].always++; if (isConst === rm) tally[key].iffRows++; } }
for (const [key, t] of Object.entries(tally)) { const [u, v] = key.split(',').map(Number); const tag = canonNames[key] ? ` ← ${canonNames[key]}` : ''; console.log(`  (${name(u)}, ${name(v)}): constant in ${t.always}/576${t.always === 576 ? ' (ALWAYS: built into the formula)' : t.iffRows === 576 ? ' (EXACTLY when the rows are magic)' : t.always === 0 ? ' (never)' : ''}${tag}`); }
ok(tally['0,2'].always === 576 && tally['0,1'].always === 576 && tally['0,3'].always === 576, 'the three CHANNEL translations (0,1), (0,ω), (0,ω²) are constants for every alphabet and cooling: V, D and V∘D are built into the formula (Fruition = 19 − Seed, Feedback = 20 − Seed, Bridge = Seed + 1)');
ok(tally['2,2'].iffRows === 576 && tally['2,2'].always === rowsCount, `R = (ω, ω) acts as a constant for EXACTLY the ${rowsCount} pairs whose rows are magic — with NO constant supplied: "Reduction acts as a constant, as the Vertical does" is the row condition. The Seal's rows are the demand that the third named correction be represented like the other two`);
const othersNever = Object.entries(tally).filter(([k]) => !['0,1', '0,2', '0,3', '2,2'].includes(k)).every(([, t]) => t.always === 0 || t.iffRows === 576);
console.log(`  the other translations: ${othersNever ? 'none is a constant unless it coincides with the row condition' : 'see the table above'}`);
// which value does R's constant take when it exists?
const rValues = new Set(); for (const al of alphabets) for (const cool of orders) { const num = numbering(al, cool); const x = action(al, num, W, W); if (x.constDiff != null) rValues.add(x.constDiff); if (x.constSum != null) rValues.add(`sum ${x.constSum}`); }
console.log(`  the constant R takes, over the magic pairs: ${[...rValues].join(', ')} — so 9 is forced once R is a constant at all (the inner Seeds 2, 4, 6, 8 and the extremes/middles pairing leave 9 as the only difference)`);
ok(rValues.size === 1 && rValues.has(9), 'the 9 is not supplied: whenever R acts as a constant it is the difference 9');
console.log('\nM10 done.');
