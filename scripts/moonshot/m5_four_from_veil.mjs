// M5 — FOUR FROM THE VEIL (True, 2026-10-12). The claim, in plain words: a two-sided Veil plus one real difference that keeps both sides of the
// Veil where they are needs at least four things, and in the smallest case the difference trades exactly the two things beyond the Veil.
// Checked by enumeration over all carriers of size 2..7. Negative controls: a difference allowed to flip the Veil needs only two; a difference
// allowed to fix one side and move the other needs only three. No canon data is read.
//   npx tsx scripts/moonshot/m5_four_from_veil.mjs
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
const isIdentity = (p) => p.every((v, i) => v === i);
const movedCount = (p) => p.filter((v, i) => v !== i).length;

console.log('== the minimum carrier for "a Veil (two sides) + one difference that keeps both sides" ==');
const results = {};
for (let n = 2; n <= 7; n++) {
  const all = perms([...Array(n).keys()]);
  const keepsVeil = all.filter((p) => !isIdentity(p) && p[0] === 0 && p[1] === 1);      // the Veil is {0,1}; both sides fixed; nontrivial
  const flipsVeilOK = all.filter((p) => !isIdentity(p) && new Set([p[0], p[1]]).size === 2 && [p[0], p[1]].every((v) => v < 2)); // nontrivial, Veil preserved as a set (may flip)
  const oneSideFixed = all.filter((p) => !isIdentity(p) && p[0] === 0);                   // only one side held
  results[n] = { keepsVeil: keepsVeil.length, flipsVeilOK: flipsVeilOK.length, oneSideFixed: oneSideFixed.length, minimalMoves: keepsVeil.length ? Math.min(...keepsVeil.map(movedCount)) : null };
  console.log(`  n = ${n}: differences keeping both sides of the Veil: ${keepsVeil.length}${keepsVeil.length ? ` (smallest moves ${results[n].minimalMoves} things)` : ''} · allowed to flip the Veil: ${flipsVeilOK.length} · holding one side only: ${oneSideFixed.length}`);
}
ok(results[2].keepsVeil === 0 && results[3].keepsVeil === 0 && results[4].keepsVeil >= 1, 'THEOREM: no carrier of size 2 or 3 admits a nontrivial difference that fixes both sides of the Veil; size 4 is the minimum (a nontrivial permutation moves at least two points, and neither may be a side of the Veil)');
ok(results[4].keepsVeil === 1 && results[4].minimalMoves === 2, 'in the minimal case there is EXACTLY ONE such difference and it trades the two things beyond the Veil: two kept, two traded — the shape of Γ₀ on the roles (V, A fixed; I, F exchanged)');
ok(results[2].flipsVeilOK === 1, 'NEGATIVE CONTROL 1: if the difference may flip the Veil (IS ↔ IS-NOT), two things suffice — so "keeps both sides" is the load-bearing clause');
ok(results[3].oneSideFixed === 1, 'NEGATIVE CONTROL 2: if only one side of the Veil must be kept, three things suffice — so "both sides" is load-bearing, not just "the Veil"');
ok(results[5].keepsVeil > 1 && results[6].keepsVeil > 1, 'LIMIT: larger carriers also admit such differences (and more than one), so EXACTLY four needs the minimality premise ("the first articulation adds the least it must"); without it the theorem gives AT LEAST four');

console.log('\n== what the minimal four carries for free ==');
// a four-set with a distinguished pair {0,1} and the swap (2 3): the three matchings, the Klein group, and the field whose Frobenius is that swap
const Q = [0, 1, 2, 3]; const matchings = perms(Q).filter((p) => p.every((v, i) => v !== i && p[v] === i));
ok(matchings.length === 3, 'the four-set has its three matchings (the Klein group) with no further choice');
// in F4 = {0,1,ω,ω²} the Frobenius fixes 0 and 1 and swaps ω, ω²: the Veil-keeping difference IS the Galois automorphism of the unique field on four elements
const frob = [0, 1, 3, 2]; const diff = perms(Q).filter((p) => !isIdentity(p) && p[0] === 0 && p[1] === 1)[0];
ok(diff.every((v, i) => v === frob[i]), 'the unique Veil-keeping difference on four things is the Frobenius of F4 under the identification Veil = {0, 1}: the G-force is the Galois automorphism, the Veil is its fixed field');
console.log('\nM5 done.');
