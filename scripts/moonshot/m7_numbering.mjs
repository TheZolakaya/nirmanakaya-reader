// M7 — THE NUMBERING FROM THE FIELD (True, 2026-10-12, at the founder's "green for liftoff").
// Hypothesis: the archetype numbers 0–21 are a FORMULA on kernel objects plus one supplied order (the cooling order of the elements):
//   rank r(house) = position in the cooling order, Soul = 0, then the four elements;
//   node type t = 0 for the {Seed, Feedback} pair, 1 for the {Bridge, Fruition} pair   (the ω²-matching of the role line = the Vertical);
//   inner = {Seed, Bridge} (the ω-matching's Veil coset), outer = {Fruition, Feedback};
//   number = 2r + t if inner, 20 − (2r + t) if outer; portals at 10 (ingress) and 21 (egress).
// Stage of a manifest card comes from the kernel: s(a,b) = b² + a + 1 with a = alphabet(house element), b = alphabet(channel element).
// Then the Forty-Fold Seal (rows = channels in cooling order, columns = houses in the circle order) is TESTED, not assumed, and the test is
// run over all 24 alphabets × 24 cooling orders × 24 column orders to see what the Seal selects.
//   npx tsx scripts/moonshot/m7_numbering.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, name, SOUL_ALPHABET, ROLE_K, elementOfK, ELEMENTS, perms } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { getComponent, REDUCTION_PAIRS, GROWTH_PAIRS } = await import(R + 'lib/corrections.js');
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const HOUSES = { Spirit: 'Fire', Mind: 'Air', Emotion: 'Water', Body: 'Earth' }, CHANNELS = { Intent: 'Fire', Cognition: 'Air', Resonance: 'Water', Structure: 'Earth' };
const MANIFEST = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const recordNumber = {}; for (const id of MANIFEST) { const c = getComponent(id); recordNumber[`${HOUSES[c.house]}|${CHANNELS[c.channel]}`] = id; }
const stageK = (alpha, h, c) => { const a = alpha[h], b = alpha[c]; return add(add(frob(b), a), 1); }; // the kernel's Stage coordinate, as a role value
const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]);
const numbering = (alpha, cooling) => { // cooling: array of the four elements in order; Soul first implicitly (rank 0)
  const rank = Object.fromEntries(cooling.map((e, i) => [e, i + 1]));
  const num = {};
  for (const h of ELEMENTS) for (const c of ELEMENTS) { const s = stageK(alpha, h, c); const t = T1.has(s) ? 1 : 0; const N = 2 * rank[h] + t; num[`${h}|${c}`] = INNER.has(s) ? N : 20 - N; }
  // the Soul: role k ∈ K is its own Stage; Soul rank 0
  const soul = {}; for (const [role, k] of Object.entries(ROLE_K)) { const t = T1.has(k) ? 1 : 0; soul[role] = INNER.has(k) ? t : 20 - t; }
  return { num, soul, portals: { ingress: 10, egress: 21 } };
};
const COOL = ['Fire', 'Air', 'Water', 'Earth'];           // plasma, gas, liquid, solid — the star trace (supplied)
const CIRCLE = ['Fire', 'Water', 'Air', 'Earth'];         // Spirit, Emotion, Mind, Body — the Seal's column order (the circle walk)
const sealSums = (num, rowsOrder, colsOrder) => { // rows = channels, cols = houses; returns the 24 sums: 4 rows, 4 cols, 16 toroidal 2×2 blocks
  const g = rowsOrder.map((c) => colsOrder.map((h) => num[`${h}|${c}`]));
  const sums = [];
  for (let i = 0; i < 4; i++) sums.push(g[i].reduce((p, q) => p + q, 0));
  for (let j = 0; j < 4; j++) sums.push(g.map((row) => row[j]).reduce((p, q) => p + q, 0));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) sums.push(g[i][j] + g[i][(j + 1) % 4] + g[(i + 1) % 4][j] + g[(i + 1) % 4][(j + 1) % 4]);
  return { g, sums, magic: sums.every((x) => x === 40) };
};

console.log('== 1. The formula under the Soul-row alphabet and the cooling order reproduces the record ==');
const { num, soul } = numbering(SOUL_ALPHABET, COOL);
const hits = Object.keys(recordNumber).filter((k) => num[k] === recordNumber[k]).length;
ok(hits === 16, `manifest numbers reproduced: ${hits}/16`);
ok(soul.Seed === 0 && soul.Bridge === 1 && soul.Fruition === 19 && soul.Feedback === 20, `Soul numbers: Potential ${soul.Seed}, Will ${soul.Bridge}, Actualization ${soul.Fruition}, Recognition ${soul.Feedback}`);
console.log('  the formula: number = 2·rank(house) + t for Seed/Bridge, 20 − that for Fruition/Feedback; rank Soul 0, Fire 1, Air 2, Water 3, Earth 4; t = 0 for the Seed/Feedback node, 1 for the Bridge/Fruition node');

console.log('\n== 2. What is a theorem of the formula for EVERY alphabet and cooling order ==');
let vert = true, diag = true, cols = true, nodeCount = true;
for (const alpha of perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])))) for (const cooling of perms(ELEMENTS)) {
  const { num: n } = numbering(alpha, cooling);
  for (const h of ELEMENTS) { const byStage = {}; for (const c of ELEMENTS) byStage[stageK(alpha, h, c)] = n[`${h}|${c}`]; if (byStage[ROLE_K.Seed] + byStage[ROLE_K.Feedback] !== 20 || byStage[ROLE_K.Bridge] + byStage[ROLE_K.Fruition] !== 20) vert = false; if (byStage[ROLE_K.Seed] + byStage[ROLE_K.Fruition] !== 19 || byStage[ROLE_K.Bridge] + byStage[ROLE_K.Feedback] !== 21) diag = false; const colSum = ELEMENTS.reduce((p, c) => p + n[`${h}|${c}`], 0); if (colSum !== 40) cols = false; }
  if (new Set(Object.values(n)).size !== 16) nodeCount = false;
}
ok(vert, 'vertical pairs sum to 20 in every house, for every alphabet and cooling order (the 1991 ladder is a theorem of the formula)');
ok(diag, 'Seed+Fruition = 19 and Bridge+Feedback = 21 in every house, always (the Wheel/World diagonal encoding is a theorem of the formula)');
ok(cols, 'every HOUSE sums to 40, always (the Seal\'s column sums are automatic)');
ok(nodeCount, 'the sixteen numbers are always distinct (2–9 and 11–18)');

console.log('\n== 3. What the Seal\'s ROW sums and 2×2 BLOCKS select ==');
// rows: each channel has one card of each Stage; its sum is 40 iff the inner cards' houses have complementary ranks (r + r\' = 5)
const alphabets = perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])));
const coolings = perms(ELEMENTS), colOrders = perms(ELEMENTS);
let rowMagic = [], fullMagic = [], fullMagicCanonCols = [];
for (const alpha of alphabets) for (const cooling of coolings) {
  const { num: n } = numbering(alpha, cooling);
  const rowsOK = ELEMENTS.every((c) => ELEMENTS.reduce((p, h) => p + n[`${h}|${c}`], 0) === 40);
  if (rowsOK) rowMagic.push({ alpha, cooling });
  if (rowsOK) { for (const colsOrder of colOrders) { const { magic } = sealSums(n, cooling, colsOrder); if (magic) { fullMagic.push({ alpha, cooling, colsOrder }); if (colsOrder.join() === CIRCLE.join()) fullMagicCanonCols.push({ alpha, cooling }); } } }
}
const fmt = (alpha) => ELEMENTS.map((e) => `${e[0]}${name(alpha[e])}`).join(' ');
console.log(`  (alphabet, cooling) pairs with all four channel-row sums = 40: ${rowMagic.length} of 576`);
console.log(`  (alphabet, cooling, column order) triples with the full Seal (rows, columns, 16 toroidal blocks) = 40: ${fullMagic.length} of 13824`);
const soulRowCanon = fullMagic.filter((x) => ELEMENTS.every((e) => x.alpha[e] === SOUL_ALPHABET[e]) && x.cooling.join() === COOL.join());
console.log(`  of those, with the Soul-row alphabet and the canonical cooling order: ${soulRowCanon.length}, column orders: ${soulRowCanon.map((x) => x.colsOrder.join('-')).join(' | ')}`);
ok(soulRowCanon.some((x) => x.colsOrder.join() === CIRCLE.join()), 'the canonical Seal (columns Spirit, Emotion, Mind, Body) is magic under the derived numbering');
// which alphabets survive the full Seal with the canonical cooling order and canonical columns?
const survAlpha = fullMagic.filter((x) => x.cooling.join() === COOL.join() && x.colsOrder.join() === CIRCLE.join());
console.log(`  alphabets making the canonical Seal magic (cooling and columns fixed to the record): ${survAlpha.length} of 24 → ${survAlpha.map((x) => fmt(x.alpha)).join(' | ')}`);
// which cooling orders survive with the Soul-row alphabet (columns free)?
const survCool = [...new Set(fullMagic.filter((x) => ELEMENTS.every((e) => x.alpha[e] === SOUL_ALPHABET[e])).map((x) => x.cooling.join('-')))];
console.log(`  cooling orders making SOME Seal magic under the Soul-row alphabet: ${survCool.length} of 24 → ${survCool.join(' | ')}`);
// structure of the survivors: how many distinct (alphabet, cooling) pairs, and is there a symmetry?
const pairKeys = [...new Set(fullMagic.map((x) => `${fmt(x.alpha)} // ${x.cooling.join('-')}`))];
console.log(`  distinct (alphabet, cooling) pairs admitting a magic Seal: ${pairKeys.length}`);
for (const k of pairKeys.slice(0, 12)) console.log('    ', k);

console.log('\n== 4. Reduction on the manifest is +9 under the formula; Growth; the digit rule off the manifest ==');
const idOf = {}; for (const [k, v] of Object.entries(recordNumber)) idOf[v] = k;
let plus9 = 0; for (const id of MANIFEST) { const t = REDUCTION_PAIRS[id]; if (MANIFEST.includes(t) && Math.abs(num[idOf[id]] - num[idOf[t]]) === 9) plus9++; }
ok(plus9 === 16, `Reduction on the manifest = the translation +(ω,ω) = a change of 9 in the number for all ${plus9}/16 cards (house h → its rank-complement 5 − h, Stage shifted by the diagonal, inner ↔ outer: 2r + t ↦ 9 + 2r + t)`);
console.log('  off the manifest the record\'s Reduction follows the digital root (mod 9): 0→18, 1→19, 19→10, 20→11, 10→1, 21→12 — definable once the numbering exists; not generated by the kernel');
const growthSums = MANIFEST.map((id) => [id, GROWTH_PAIRS[id]]).filter(([a, b]) => a < b).map(([a, b]) => `${a}+${b}=${a + b}`);
console.log('  Growth pair sums (for the record):', growthSums.join(', '));

console.log('\n== 5. The two tens ==');
// the Tetractys ten: multisets {x,y} of K = the orbits of the swap (a,b)↦(b,a) on the sixteen; the node ten: N = 2r + t over the five houses
const swapOrbits = new Set(); for (const h of ELEMENTS) for (const c of ELEMENTS) swapOrbits.add([h, c].sort().join('&'));
console.log(`  Tetractys ten (unordered element pairs with repetition): ${swapOrbits.size}; node ten (2 per house × 5 houses): ${2 * 5}`);
console.log('  no structural bijection is claimed here; the numbering uses the node ten');
fs.writeFileSync('data/bakeoff/pass3/moonshot_m7.json', JSON.stringify({ numbering: num, soul, rowMagic: rowMagic.length, fullMagic: fullMagic.length, survivorsAlphabetCanonSeal: survAlpha.map((x) => x.alpha), survivorCoolings: survCool, pairKeys }, null, 1));
console.log('\nM7 done; data/bakeoff/pass3/moonshot_m7.json written.');
