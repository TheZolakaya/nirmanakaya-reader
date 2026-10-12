// M11 — THE FOUNDER'S ANSWER TO THE VEIL BENCH: "chirality, a combination of maximality and duality" (2026-10-12).
// Read in the bench's terms: the Veil's two sides are a chiral pair — two THINGS related by a MIRROR (duality) that reflects the WHOLE (maximality:
// nothing is left un-reflected, so the mirror has no fixed point). The G-force is the OTHER involution: it keeps each side of the Veil and trades what is
// beyond it, and it is the same difference in the mirror (it commutes with the mirror).
// Checked by enumeration over carriers of size 2..7: minimum size, number of (mirror, G-force) pairs, the structure at the minimum, and negative controls.
//   npx tsx scripts/moonshot/m11_chirality.mjs
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
const isId = (p) => p.every((v, i) => v === i);
const isInvolution = (p) => p.every((v, i) => p[v] === i);
const fixedPointFree = (p) => p.every((v, i) => v !== i);
const compose = (p, q) => p.map((_, i) => p[q[i]]);
const commute = (p, q) => compose(p, q).join() === compose(q, p).join();

console.log('== 1. a Veil {0, 1}; a mirror m (duality: m swaps 0 and 1; maximality: m moves everything); a G-force g (nontrivial, fixes 0 and 1, the same in the mirror) ==');
const results = {};
for (let n = 2; n <= 7; n++) {
  const all = perms([...Array(n).keys()]);
  const mirrors = all.filter((p) => isInvolution(p) && fixedPointFree(p) && p[0] === 1);
  const gforces = all.filter((p) => !isId(p) && p[0] === 0 && p[1] === 1);
  const pairs = []; for (const m of mirrors) for (const g of gforces) if (commute(m, g)) pairs.push([m, g]);
  results[n] = { mirrors: mirrors.length, gforces: gforces.length, pairs: pairs.length, examples: pairs.slice(0, 3) };
  console.log(`  n = ${n}: mirrors ${mirrors.length} · G-forces ${gforces.length} · commuting (mirror, G-force) pairs ${pairs.length}`);
}
ok(results[2].pairs === 0 && results[3].pairs === 0 && results[4].pairs >= 1, 'THEOREM: the least carrier for a Veil with a mirror of the whole and a Veil-keeping G-force is four (two and three admit none)');
ok(results[4].pairs === 1, 'and at four the pair is UNIQUE: the mirror is (0 1)(2 3), the G-force is (2 3)');
const [[m4, g4]] = results[4].examples;
console.log(`  at n = 4: mirror ${JSON.stringify(m4)} · G-force ${JSON.stringify(g4)} · their product ${JSON.stringify(compose(m4, g4))} = the bare swap of the Veil's two sides, holding what is beyond`);

console.log('\n== 2. the structure at four is the field F4 with the Veil as F2: the mirror is x ↦ x + 1, the G-force is x ↦ x² ==');
// F4 = {0, 1, ω = 2, ω² = 3}; +1: 0↔1, ω↔ω²; Frobenius: fixes 0, 1; ω↔ω²
const plus1 = [1, 0, 3, 2], frob = [0, 1, 3, 2];
ok(m4.join() === plus1.join() && g4.join() === frob.join(), 'under 0 = IS-NOT, 1 = IS, {2, 3} = the pair beyond the Veil: the mirror is the translation by 1 (σ², the Depth step) and the G-force is the Frobenius');
ok(commute(plus1, frob) && compose(plus1, frob).join() === [1, 0, 2, 3].join(), 'they commute; their product is the swap of IS and IS-NOT alone — the three involutions (mirror, G-force, bare swap) with the identity form a Klein group, the semilinear group of the line over F2');
// the two-bit reading: each of the four = (Veil bit, beyond bit); the mirror flips the Veil bit of everything; the G-force flips it only beyond the Veil
const bits = { 0: [0, 0], 1: [1, 0], 2: [0, 1], 3: [1, 1] }; // x = a + b·ω → (a, b)
const flipsVeilBit = (p, x) => bits[p[x]][0] !== bits[x][0] && bits[p[x]][1] === bits[x][1];
ok([0, 1, 2, 3].every((x) => flipsVeilBit(plus1, x)), 'the two-bit reading: every one of the four is (Veil bit, beyond bit); the mirror flips the Veil bit of all four and nothing else');
ok([2, 3].every((x) => flipsVeilBit(frob, x)) && frob[0] === 0 && frob[1] === 1, 'the G-force flips the Veil bit only where the beyond bit is 1: it is the mirror applied beyond the Veil only — "you are different (beyond the Veil the sides trade) and I love you (the Veil holds)"');
ok(new Set([0, 1, 2, 3].map((x) => bits[x].join())).size === 4, 'MAXIMALITY as completeness: all four combinations of the two bits are filled, so with two two-sided distinctions (the Veil, and within/beyond it) the carrier is exactly four — no minimality premise, only "every combination that can be filled is filled"');

console.log('\n== 3. negative controls ==');
const n4 = perms([0, 1, 2, 3]);
const noMirror = n4.filter((p) => !isId(p) && p[0] === 0 && p[1] === 1).length;
ok(noMirror === 1, 'without the mirror (m5\'s setting) four still admits exactly one G-force: the mirror adds structure, not the count');
const mirrorFixesSomething = perms([0, 1, 2]).filter((p) => isInvolution(p) && p[0] === 1).length; // on three points a mirror swapping 0,1 must fix the third: not "of the whole"
ok(mirrorFixesSomething === 1, 'if the mirror may leave something un-reflected (no maximality), three points admit a mirror (0 1) — but still no Veil-keeping G-force (needs two beyond the Veil), so the count stays four; maximality is about the mirror\'s reach, not the count');
const regions = (() => { // sides as regions kept setwise: blocks {0} and {1, 2}; a nontrivial permutation keeping each block
  const ps = perms([0, 1, 2]).filter((p) => !isId(p) && p[0] === 0 && new Set([p[1], p[2]]).size === 2 && [p[1], p[2]].every((v) => v >= 1)); return ps.length; })();
ok(regions === 1, 'the benches\' attack stands as stated: if the sides are REGIONS kept as blocks, three suffice — chirality answers it by making the sides THINGS, each the other\'s mirror image, so the four stands');
// n = 6 also admits pairs: "exactly four" by minimality OR by the two-bit completeness, not by the symmetries alone
ok(results[6].pairs > 1, 'six admits several pairs too: the symmetries alone give AT LEAST four; EXACTLY four needs either the least carrier or the two-bit completeness reading of maximality');
console.log('\nM11 done.');
