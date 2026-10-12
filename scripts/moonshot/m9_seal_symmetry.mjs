// M9 — WHAT THE SEAL CAN AND CANNOT SEE (the structure behind m7's counts, 2026-10-12).
// The numbering n(h,c) = 2·rank(h) + t  (inner)  |  20 − (2·rank(h) + t)  (outer), with Stage(h,c) = α(c)² + α(h) + 1,
// inner = the ω-cut bit of Stage is 0 (Stage ∈ {Seed, Bridge}), t = the ω²-cut bit of Stage (t = 1 on Bridge, Fruition).
// Claims: (1) the ROW condition of the Seal (each channel's four houses sum to 40) ⟺ the ω-cut of the alphabet pairs the ranks {1,4} and {2,3}
//         (the two extremes of the cooling order together, the two middles together) — 8 of 24 alphabets per cooling order;
//         (2) the BLOCK condition (toroidal 2×2) pins the houses' cyclic adjacency to ONE undirected 4-cycle (8 of 24 column orders = its rotations and
//         reflections), and that cycle is the clock's: Fire–Water–Air–Earth = 0–ω²–1–ω, i.e. σ (either direction);
//         (3) with cooling and columns fixed, the Seal's symmetry on alphabets is EXACTLY the Klein group of translations α ↦ α + k (4 of 24);
//         with alphabet and columns fixed, EXACTLY the translation orbit of the cooling order (4 of 24) — the same group T on the other side;
//         (4) over all 576 (alphabet, cooling) pairs the Seal admits some column order for 96 = for every alphabet, one T-orbit of 4 cooling orders;
//         (5) anchors: with columns canonical, "Fire wears 0" alone leaves N pairs; "Fire wears 0" + "Fire is first" leaves 1 — counted, not assumed.
//   npx tsx scripts/moonshot/m9_seal_symmetry.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, tr, name, ELEMENTS, perms, ROLE_K, SOUL_ALPHABET } from './f4.mjs';
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]);
const alphabets = perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])));
const orders = perms(ELEMENTS);
const numbering = (al, cooling) => { const rank = Object.fromEntries(cooling.map((e, i) => [e, i + 1])); const num = {}; for (const h of ELEMENTS) for (const c of ELEMENTS) { const st = add(add(frob(al[c]), al[h]), 1); const t = T1.has(st) ? 1 : 0; const N = 2 * rank[h] + t; num[`${h}|${c}`] = INNER.has(st) ? N : 20 - N; } return num; };
const grid = (num, rows, cols) => rows.map((c) => cols.map((h) => num[`${h}|${c}`]));
const rowsMagic = (g) => g.every((r) => r.reduce((p, q) => p + q, 0) === 40);
const colsMagic = (g) => [0, 1, 2, 3].every((j) => g.map((r) => r[j]).reduce((p, q) => p + q, 0) === 40);
const blocksMagic = (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (g[i][j] + g[i][(j + 1) % 4] + g[(i + 1) % 4][j] + g[(i + 1) % 4][(j + 1) % 4] !== 40) return false; return true; };
const COOL = ['Fire', 'Air', 'Water', 'Earth'], COLS = ['Fire', 'Water', 'Air', 'Earth'];
const alpha = SOUL_ALPHABET;
const sameAlpha = (a, b) => ELEMENTS.every((e) => a[e] === b[e]);
const cutBit = (c) => (v) => ([0, c].includes(v) ? 0 : 1); // the functional with kernel {0, c}

console.log('== 1. the row condition, in words ==');
// ι(s) = ω-cut bit of Stage (kernel {0, ω}); t(s) = ω²-cut bit (kernel {0, ω²})
ok(K.every((s) => (INNER.has(s) ? 0 : 1) === cutBit(W)(s)) && K.every((s) => (T1.has(s) ? 1 : 0) === cutBit(W2)(s)), 'inner/outer is the ω-cut of Stage (kernel {Seed, Bridge}) and t is the ω²-cut (kernel {Seed, Feedback} = the Vertical): the two complete cuts of the chain are the two bits of the number');
let rowOK = 0, ruleOK = 0, agree = 0;
for (const al of alphabets) for (const cool of orders) {
  const num = numbering(al, cool); const rm = rowsMagic(grid(num, cool, COLS));
  const rank = Object.fromEntries(cool.map((e, i) => [e, i + 1]));
  const pairA = ELEMENTS.filter((e) => cutBit(W)(al[e]) === 0); // the houses whose element lies in the Veil coset {0, ω}
  const rule = pairA.reduce((p, e) => p + rank[e], 0) === 5;
  if (rm) rowOK++; if (rule) ruleOK++; if (rm === rule) agree++;
}
ok(rowOK === 192 && ruleOK === 192 && agree === 576, `ROW CONDITION ⟺ the two houses whose elements lie in {0, ω} (the inner coset) have ranks summing to 5, i.e. they are the two extremes {1,4} or the two middles {2,3} of the cooling order — ${rowOK}/576 pairs, the rule agrees on all 576`);
ok(colsMagic(grid(numbering(alpha, COOL), COOL, COLS)) && alphabets.every((al) => orders.every((cool) => colsMagic(grid(numbering(al, cool), cool, COLS)))), 'the COLUMN condition (each house sums to 40) holds for all 576: a theorem, as m7 said');

console.log('\n== 2. the block condition pins one undirected 4-cycle of houses ==');
const num0 = numbering(alpha, COOL);
const magicCols = orders.filter((cols) => blocksMagic(grid(num0, COOL, cols)) && rowsMagic(grid(num0, COOL, cols)));
const cyc = (cols) => { const i = cols.indexOf('Fire'); const r = [...cols.slice(i), ...cols.slice(0, i)]; const rev = [r[0], r[3], r[2], r[1]]; return [r.join('-'), rev.join('-')].sort()[0]; }; // undirected cycle normal form
const cycles = new Set(magicCols.map(cyc));
ok(magicCols.length === 8 && cycles.size === 1, `with the Soul-row alphabet and canonical cooling, ${magicCols.length} column orders are magic and they are the rotations and reflections of ONE cycle: ${[...cycles][0]} (undirected)`);
const circleK = COLS.map((e) => alpha[e]); const sigma = (x) => add(frob(x), W), sigmaInv = (x) => add(frob(x), W2);
ok(circleK.every((x, i) => sigmaInv(x) === circleK[(i + 1) % 4]) || circleK.every((x, i) => sigma(x) === circleK[(i + 1) % 4]), 'and that cycle is the clock\'s own cycle on K (0–ω²–1–ω): the Seal\'s blocks force the pentagon\'s circumference to be the role clock, up to direction');
// is this true for every magic pair, in K-terms?
let allClock = true, pairsWithCols = 0;
for (const al of alphabets) for (const cool of orders) { const num = numbering(al, cool); const mc = orders.filter((cols) => blocksMagic(grid(num, cool, cols)) && rowsMagic(grid(num, cool, cols))); if (!mc.length) continue; pairsWithCols++; for (const cols of mc) { const ck = cols.map((e) => al[e]); const isClock = ck.every((x, i) => sigmaInv(x) === ck[(i + 1) % 4]) || ck.every((x, i) => sigma(x) === ck[(i + 1) % 4]); if (!isClock) allClock = false; } }
ok(pairsWithCols === 96 && allClock, `for ALL ${pairsWithCols} (alphabet, cooling) pairs that admit a magic Seal, every magic column order is the clock's cycle in K: the circumference = σ is a theorem of the Seal, not a reading of the drawing`);

console.log('\n== 3. the Seal\'s symmetry group is the Klein group of translations, on either side ==');
const magicAlphas = alphabets.filter((al) => { const g = grid(numbering(al, COOL), COOL, COLS); return rowsMagic(g) && blocksMagic(g); });
const translates = K.map((k) => Object.fromEntries(ELEMENTS.map((e) => [e, add(alpha[e], k)])));
ok(magicAlphas.length === 4 && translates.every((t) => magicAlphas.some((m) => sameAlpha(m, t))), 'alphabets (cooling, columns fixed): exactly the four translates α + k, k ∈ K');
const magicCools = orders.filter((cool) => { const g = grid(numbering(alpha, cool), cool, COLS); return rowsMagic(g) && blocksMagic(g); });
const translateCool = (k) => COOL.map((e) => ELEMENTS.find((f) => alpha[f] === add(alpha[e], k))); // the cooling order with each house replaced by its translate
ok(magicCools.length === 4 && K.every((k) => magicCools.some((c) => c.join() === translateCool(k).join())), `cooling orders (alphabet, columns fixed): exactly the four translates of Fire-Air-Water-Earth by T: ${magicCools.map((c) => c.join('-')).join(' | ')}`);
ok(magicCools.every((c) => c.join() === translateCool(0).join() || [translateCool(1), translateCool(W), translateCool(W2)].some((t) => t.join() === c.join())), 'in element terms the four are id, (Fire Air)(Water Earth), (Fire Water)(Air Earth), (Fire Earth)(Air Water): the three matchings of the four and the identity — the Klein group T itself');
// why: α ↦ α+1 leaves Stage unchanged; α ↦ α+ω adds 1 to Stage (inner↔outer AND t flipped): the Seal cannot tell, and nothing else is invisible to it
const stageTable = (al) => ELEMENTS.flatMap((h) => ELEMENTS.map((c) => add(add(frob(al[c]), al[h]), 1)));
ok(stageTable(translates[1]).join() === stageTable(alpha).join(), 'α + 1 gives the IDENTICAL Stage table (Tr(1) = 0): the chain cannot distinguish α from α + 1 at all');
ok(stageTable(translates[W]).every((s, i) => s === add(stageTable(alpha)[i], 1)), 'α + ω adds 1 to every Stage (Seed↔Fruition, Bridge↔Feedback): the Seal\'s sums survive the swap of inner and outer');

console.log('\n== 4. over all 576 pairs ==');
let perAlpha = []; for (const al of alphabets) { const cs = orders.filter((cool) => orders.some((cols) => { const g = grid(numbering(al, cool), cool, cols); return rowsMagic(g) && blocksMagic(g); })); perAlpha.push(cs.length); }
ok(perAlpha.every((n) => n === 4) && perAlpha.reduce((p, q) => p + q, 0) === 96, 'every alphabet admits exactly 4 cooling orders (one T-orbit); 24 × 4 = 96 pairs; each pair admits 8 column orders (one cycle); 768 triples');

console.log('\n== 5. anchors: how many pairs survive, with columns canonical ==');
const survivors = (pred) => { const out = []; for (const al of alphabets) for (const cool of orders) { if (!pred(al, cool)) continue; const g = grid(numbering(al, cool), cool, COLS); if (rowsMagic(g) && blocksMagic(g)) out.push([al, cool]); } return out; };
const sAll = survivors(() => true), sFire0 = survivors((al) => al.Fire === 0), sFireFirst = survivors((al, cool) => cool[0] === 'Fire'), sBoth = survivors((al, cool) => al.Fire === 0 && cool[0] === 'Fire');
console.log(`  magic pairs with the canonical column order (Fire, Water, Air, Earth): ${sAll.length} · with Fire ↦ 0: ${sFire0.length} · with Fire first: ${sFireFirst.length} · with both: ${sBoth.length}`);
for (const [al, cool] of sBoth) console.log(`    α = ${ELEMENTS.map((e) => `${e[0]}${name(al[e])}`).join(' ')} · cooling ${cool.join('-')}`);
ok(sBoth.length >= 1 && sBoth.some(([al, cool]) => sameAlpha(al, alpha) && cool.join() === COOL.join()), 'the canonical pair is among the survivors');
const canonicalOnly = sBoth.length === 1;
console.log(canonicalOnly ? 'PASS  Fire ↦ 0 and Fire first, with the canonical columns and the Seal, pin the pair uniquely' : `NOTE  ${sBoth.length} pairs survive both anchors: the anchors + Seal do NOT pin the pair alone; the remaining freedom is listed above`);
// what else separates the survivors? the Soul row (Seed Fire, Bridge Earth, Fruition Air, Feedback Water) reads off α: Seed = α⁻¹(0) etc.
for (const [al, cool] of sBoth) { const el = Object.fromEntries(ELEMENTS.map((e) => [al[e], e])); console.log(`    Soul row from α: Seed ${el[0]}, Bridge ${el[W]}, Fruition ${el[1]}, Feedback ${el[W2]} · ranks: ${cool.map((e, i) => `${e} ${i + 1}`).join(', ')}`); }
console.log('\n== 6. Reduction as a map, and its number: +9 on the manifest IS the row condition ==');
// Reduction (the digit-root pairing 2↔11, 3↔12, …, 9↔18) as the kernel's translation: house h ↦ h + ω, channel c ↦ c + ω (so Stage ↦ Stage + ω² + ω = Stage + 1, for EVERY alphabet).
let equiv = 0, redOK = 0;
for (const al of alphabets) for (const cool of orders) {
  const num = numbering(al, cool); const el = Object.fromEntries(ELEMENTS.map((e) => [al[e], e]));
  const plus9 = ELEMENTS.every((h) => ELEMENTS.every((c) => { const n = num[`${h}|${c}`]; if (n > 10) return true; const h2 = el[add(al[h], W)], c2 = el[add(al[c], W)]; return num[`${h2}|${c2}`] === n + 9; }));
  const rm = rowsMagic(grid(num, cool, COLS)); if (plus9) redOK++; if (plus9 === rm) equiv++;
}
ok(redOK === 192 && equiv === 576, `for every (alphabet, cooling): "the translation (h+ω, c+ω) adds 9 to every inner manifest number" ⟺ "every channel row of the Seal sums to 40" — ${redOK}/576 pairs, agreeing on all 576. Reduction = +9 and the Seal's rows are ONE fact`);
const num0b = numbering(alpha, COOL); const el0 = Object.fromEntries(ELEMENTS.map((e) => [alpha[e], e]));
const pairs = ELEMENTS.flatMap((h) => ELEMENTS.map((c) => [num0b[`${h}|${c}`], num0b[`${el0[add(alpha[h], W)]}|${el0[add(alpha[c], W)]}`]])).filter(([a]) => a < 10).sort((x, y) => x[0] - y[0]);
console.log(`  canonical pairs: ${pairs.map(([a, b]) => `${a}↔${b}`).join(' ')} — house Fire↔Earth, Air↔Water (the extremes and the middles exchanged); channel Fire↔Earth, Air↔Water; Stage Seed↔Fruition, Bridge↔Feedback`);
console.log('\n== 7. after the hostile read (2026-10-12): the record grid, the general symmetry, and what the blocks add beyond the rows ==');
const GRID_ORDER = [[17, 7, 4, 12], [2, 14, 15, 9], [18, 6, 5, 11], [3, 13, 16, 8]]; // lib/geometryEngine.js
ok(JSON.stringify(grid(numbering(alpha, COOL), COOL, COLS)) === JSON.stringify(GRID_ORDER), 'the formula reproduces the record\'s Seal grid cell for cell (lib/geometryEngine.js GRID_ORDER; rows = channels Fire, Air, Water, Earth; columns = houses Fire, Water, Air, Earth)');
let coolingsWithSurvivors = 0, orbitsOK = 0;
for (const cool of orders) { const mags = alphabets.filter((al) => { const g = grid(numbering(al, cool), cool, COLS); return rowsMagic(g) && blocksMagic(g); }); if (!mags.length) continue; coolingsWithSurvivors++; const base = mags[0]; const allTranslates = mags.length === 4 && mags.every((m) => K.some((k) => ELEMENTS.every((e) => m[e] === add(base[e], k)))); if (allTranslates) orbitsOK++; }
ok(coolingsWithSurvivors > 0 && orbitsOK === coolingsWithSurvivors, `for every one of the ${coolingsWithSurvivors} cooling orders that admit a magic alphabet (canonical columns), the magic alphabets are exactly one translation orbit of four`);
let alphasOK = 0;
for (const al of alphabets) { const cs = orders.filter((cool) => orders.some((cols) => { const g = grid(numbering(al, cool), cool, cols); return rowsMagic(g) && blocksMagic(g); })); const trn = (k) => cs[0].map((e) => ELEMENTS.find((f) => al[f] === add(al[e], k))); if (cs.length === 4 && K.every((k) => cs.some((c) => c.join() === trn(k).join()))) alphasOK++; }
ok(alphasOK === 24, 'for every one of the 24 alphabets, its four admissible cooling orders are the four translates of one another: the Klein orbit, in general and not only at the canonical point');
let rowPass = 0, admit = 0, agreeHalving = 0;
for (const al of alphabets) for (const cool of orders) { const num = numbering(al, cool); if (!rowsMagic(grid(num, cool, COLS))) continue; rowPass++; const adm = orders.some((cols) => blocksMagic(grid(num, cool, cols))); if (adm) admit++; const genderAlternates = add(al[cool[0]], al[cool[2]]) === W2 && add(al[cool[1]], al[cool[3]]) === W2; if (adm === genderAlternates) agreeHalving++; }
ok(rowPass === 192 && admit === 96 && agreeHalving === 192, `of the ${rowPass} row-passing pairs, ${admit} admit a circle and ${rowPass - admit} admit none; the ones that admit are exactly those whose cooling order ALTERNATES GENDER (the +ω² pairs sit at positions 1 and 3, 2 and 4): the blocks demand two things, the circle is the clock AND the cooling alternates gender`);
fs.writeFileSync('data/bakeoff/pass3/moonshot_m9.json', JSON.stringify({ rowRule: 'inner-coset houses have ranks summing to 5', cycle: [...cycles][0], magicAlphas, magicCools, perAlpha, anchors: { all: sAll.length, fire0: sFire0.length, fireFirst: sFireFirst.length, both: sBoth.map(([al, cool]) => ({ al, cool })) } }, null, 1));
console.log('\nM9 done; data/bakeoff/pass3/moonshot_m9.json written.');
