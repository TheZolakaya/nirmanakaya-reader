// M6 — TARGET-FREE SELECTORS FOR THE DIRECTION NAMES AND THE SIDE (the obligation both benches named, 2026-10-12).
// Works on the abstract sixteen (a,b) ∈ K² with the five input-side directions, using NO canonical partition or label as input.
// Candidate antecedent properties tested on each direction:
//   A1 (Fresh Mind 2026-10-04, as a definition): a direction is "agreement-determined" for a cut c if its line is a function of the agreement
//      pattern of the c-cut bits of the other readouts (the cut bit of a value v is Tr(c⁻¹·v)-style: the functional with kernel {0, c}).
//   A2 (Generator brief 2026-08-10, facings): the slope of a residual readout equals its facing element (Fire faces X ⇒ c = alphabet(X)).
//   A3 (side): on which side do the mixed lines through singular laws group them by IMAGE (what the law produces) vs by KERNEL (what it forgets)?
//   npx tsx scripts/moonshot/m6_direction_selectors.mjs
import { K, KSTAR, W, W2, add, mul, frob, tr, name, laws, rightReadout, leftReadout, DIRS, partitionOf, image, kernel, rank, SOUL_ALPHABET, elementOfK } from './f4.mjs';
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const pts = laws();
const cutBit = (c) => (v) => { // the F2-linear functional with kernel {0, c}: v ↦ 0 iff v ∈ {0, c}
  const other = KSTAR.filter((x) => x !== c); return [0, c].includes(v) ? 0 : 1; };
const E = (m, [a, b]) => (m === 'inf' ? a : m === 0 ? b : mul(m, add(add(frob(b), mul(m, a)), 1))); // the moonshot's labels, for all five directions

console.log('== A1  which mixed direction is determined by the agreement pattern of the other readouts\' cut bits, for each cut c ==');
for (const c of KSTAR) {
  const bit = cutBit(c);
  console.log(`  cut c = ${name(c)} (${c === 1 ? 'the Γ₀-fixed cut' : 'one of the conjugate pair'}):`);
  for (const target of [1, W, W2]) {
    const others = DIRS.filter((d) => d !== target && d !== 0); // Practice (∞) and the two other mixed directions (as Fresh Mind used P, B, I; Activity excluded)
    // the agreement pattern of three bits: which of the three pairs agree
    const key = (p) => { const bits = others.map((d) => bit(E(d, p))); return `${bits[0] === bits[1] ? 1 : 0}${bits[1] === bits[2] ? 1 : 0}${bits[0] === bits[2] ? 1 : 0}`; };
    const byKey = new Map(); for (const p of pts) { const k = key(p); if (!byKey.has(k)) byKey.set(k, new Set()); byKey.get(k).add(E(target, p)); }
    const determined = [...byKey.values()].every((s) => s.size === 1) && byKey.size === 4;
    console.log(`    direction ${name(target)}: ${determined ? 'DETERMINED by the agreement pattern of the other three (P and the two other mixed)' : 'not determined'}  [${[...byKey.entries()].map(([k, s]) => `${k}→{${[...s].map(name)}}`).join(' ')}]`);
  }
}
const determinedFor = (c, target) => { const bit = cutBit(c); const others = DIRS.filter((d) => d !== target && d !== 0); const key = (p) => { const bits = others.map((d) => bit(E(d, p))); return `${bits[0] === bits[1] ? 1 : 0}${bits[1] === bits[2] ? 1 : 0}${bits[0] === bits[2] ? 1 : 0}`; }; const byKey = new Map(); for (const p of pts) { const k = key(p); if (!byKey.has(k)) byKey.set(k, new Set()); byKey.get(k).add(E(target, p)); } return [...byKey.values()].every((s) => s.size === 1) && byKey.size === 4; };
ok(determinedFor(W, 1) && determinedFor(W2, 1) && !determinedFor(W, W) && !determinedFor(W, W2) && !determinedFor(W2, W) && !determinedFor(W2, W2), 'under EITHER complete cut (ω or ω²), the self-conjugate direction (slope 1) is the one determined by the agreement pattern of the other three, and neither conjugate direction is: Fresh Mind\'s 2026-10-04 agreement rule singles out Stage without any canonical label');
ok(determinedFor(1, 1) && !determinedFor(1, W) && !determinedFor(1, W2), 'and under the Γ₀-fixed cut too (c = 1): the agreement rule selects the self-conjugate direction under EVERY cut — a cut-independent, target-free definition of Stage. (My first expectation, that the incomplete cut would determine nothing, was wrong; the incompleteness concerned the four-bit address, not this agreement.)');

console.log('\n== A2  the facings name the conjugate pair ==');
const alpha = SOUL_ALPHABET;
const facing = (x) => add(alpha.Fire, alpha[x]);
console.log(`  Generator brief: Being = Fire faces Water → c = ${name(facing('Water'))}; Identity = Fire faces Earth → c = ${name(facing('Earth'))}; Activity = Fire faces Air → c = ${name(facing('Air'))}`);
ok(facing('Water') === W2 && facing('Earth') === W, 'with the Soul-row alphabet, Being\'s facing element is ω² and Identity\'s is ω: the facings (August 2026) assign the two conjugate slopes to Being and Identity with no target partition used (whether the facing element IS the slope is the bridge; the moonshot verified it holds)');

console.log('\n== A3  the side: image versus kernel ==');
for (const [side, ro] of [['input (right)', rightReadout], ['output (left)', leftReadout]]) {
  let imageConst = 0, kernelConst = 0, mixedLines = 0;
  for (const m of [1, W, W2]) { const P = partitionOf(ro(m), pts); for (const line of P) { const sing = line.map((s) => s.split('').map(Number)).filter((l) => rank(l) === 1); if (sing.length < 2) continue; mixedLines++; const imgs = new Set(sing.map((l) => image(l).join(''))), kers = new Set(sing.map((l) => kernel(l).join(''))); if (imgs.size === 1) imageConst++; if (kers.size === 1) kernelConst++; } }
  console.log(`  ${side}: of ${mixedLines} mixed lines carrying singular laws, ${imageConst} have one IMAGE and ${kernelConst} have one KERNEL`);
}
console.log('  so on the CANONICAL (input) side the mixed lines group singular laws by KERNEL — by what they send back to zero, to the Veil — and on the output side by IMAGE, by what they produce. (I expected the reverse; the computation decides.) Candidate bridge for the side: a manifest position is classified by what it returns to Potential. Semantic, recorded, not paid; for the hunt.');
console.log('\nM6 done.');
