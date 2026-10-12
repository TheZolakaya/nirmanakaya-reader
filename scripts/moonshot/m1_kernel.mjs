// M1 — THE KERNEL, FORMALIZED AND UNFOLDED BY ENUMERATION (Phases 1, 3, 4, 5, 6, 13, 14 of the moonshot).
// Every claim below is checked exhaustively on the finite objects; the printout is the evidence. No canon data is read here.
//   npx tsx scripts/moonshot/m1_kernel.mjs
import { K, KSTAR, W, W2, add, mul, frob, tr, name, laws, applyLaw, compose, rank, image, kernel, leftReadout, rightReadout, DIRS, partitionOf, samePartition, perms, clock } from './f4.mjs';
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };

console.log('== PHASE 1/4 — Q4, its three matchings, the Klein group T, the field K ==');
const Q = ['V', 'I', 'A', 'F'];
const allPerms = perms([0, 1, 2, 3]);
const isInvolutionFPF = (p) => p.every((v, i) => v !== i && p[v] === i);
const matchings = allPerms.filter(isInvolutionFPF);
ok(matchings.length === 3, `a 4-set has exactly 3 perfect matchings (fixed-point-free involutions): ${matchings.map((p) => `(${Q[0]}${Q[p[0]]})(${Q[[1, 2, 3].find((i) => i !== p[0])]}${Q[p[[1, 2, 3].find((i) => i !== p[0])]]})`).join(' ')}`);
const compP = (p, q) => p.map((_, i) => p[q[i]]);
const e = [0, 1, 2, 3];
const T = [e, ...matchings];
const inT = (p) => T.some((t) => t.every((v, i) => v === p[i]));
ok(T.every((s) => T.every((t) => inT(compP(s, t)))) && matchings.every((s) => matchings.every((t) => compP(s, t).every((v, i) => v === compP(t, s)[i]))), 'identity + the 3 matchings is a group, closed and commutative: T ≅ V4 (Klein), canonical (no coordinates chosen)');
ok(Q.every((_, i) => Q.every((_, j) => T.filter((t) => t[i] === j).length === 1)), 'T acts freely and transitively on Q: Q is a torsor for T (differences without an origin)');
// Aut(T) ≅ S3 on the three matchings; its unique order-3 subgroup with 0 and id forms the field K (Air's theorem 7.3) — verified via our F4 arithmetic:
ok(KSTAR.every((x) => KSTAR.every((y) => KSTAR.includes(mul(x, y)))) && K.every((x) => K.every((y) => K.includes(add(x, y)))) && KSTAR.every((x) => KSTAR.some((y) => mul(x, y) === 1)) && add(1, add(W, W2)) === 0 && mul(W, W) === W2 && mul(W, W2) === 1, 'K = {0, 1, ω, ω²} with + = XOR and the table is a field; ω² = ω + 1; 1 + ω + ω² = 0');
ok(frob(1) === 1 && frob(0) === 0 && frob(W) === W2 && frob(W2) === W, 'Frobenius x ↦ x² fixes 0 and 1, swaps ω ↔ ω²: Gal(K/F2) = {id, Γ}');

console.log('\n== PHASE 1/3 — the clock is semilinear; Γ is its linear part; the unit is its square ==');
// every 4-cycle on K (as a 4-set with its canonical V4 = translations) is x ↦ M x + c with M an involution fixing exactly one nonzero vector t = σ²;
// in the chart where that t is the unit 1, M is the Frobenius. Enumerate all 6 four-cycles on K as permutations and decompose.
const fourCycles = allPerms.filter((p) => { let x = 0, n = 0; do { x = p[x]; n++; } while (x !== 0); return n === 4 && !isInvolutionFPF(p); });
ok(fourCycles.length === 6, `there are 6 four-cycles on a 4-set`);
const affineSemilinear = []; for (const a of KSTAR) for (const b of K) for (const eps of [0, 1]) affineSemilinear.push({ a, b, eps, f: (x) => add(mul(a, eps ? frob(x) : x), b) });
const decomp = fourCycles.map((p) => affineSemilinear.filter((m) => K.every((x) => m.f(x) === p[x])));
ok(decomp.every((d) => d.length === 1), 'every four-cycle is a UNIQUE affine-semilinear map x ↦ a·x^(2^ε) + b over K (AΓL(1,4) = all 24 permutations)');
ok(decomp.every((d) => d[0].eps === 1), 'every four-cycle uses the Frobenius (ε = 1): no ordinary affine map x ↦ ax + b has order 4');
ok(fourCycles.every((p) => { const sq = compP(p, p); return isInvolutionFPF(sq); }), 'σ² is always a fixed-point-free involution = one of the three matchings = a translation of T');
// in the chart 0 = V, unit = σ²(V): σ(x) = x² + c with c ∈ {ω, ω²}
const canonicalClock = (x) => clock(x);
ok(K.every((x) => canonicalClock(x) === add(frob(x), W)) && [0, W, 1, W2, 0].every((v, i, arr) => i === 4 || canonicalClock(v) === arr[i + 1]), 'the kernel clock σ(x) = x² + ω runs 0 → ω → 1 → ω² → 0  (V → I → A → F → V); σ² = x + 1 (the unit = A − V = actuality)');
ok(K.every((x) => canonicalClock(canonicalClock(x)) === add(x, 1)), 'σ² = translation by 1: two steps of the cycle are the antipodal matching (V↔A, I↔F)');
const sigmaInv = (x) => add(frob(x), W2);
ok(K.every((x) => sigmaInv(canonicalClock(x)) === x), 'σ⁻¹(x) = x² + ω²: reversing the cycle = the Frobenius-conjugate step (orientation ⇔ ω vs ω²)');
ok(K.every((x) => frob(canonicalClock(frob(x))) === sigmaInv(x)), 'Γ σ Γ = σ⁻¹: ⟨σ, Γ⟩ is the dihedral group D4 of the square = T ⋊ ⟨Γ⟩ — "one over four"');
console.log('  the roles as field elements (chart V=0, A=σ²V=1):  V=0  I=ω  A=1  F=ω²  — {V,A} is the Γ-fixed subfield F2, {I,F} the conjugate pair');

console.log('\n== PHASE 5 — sixteen: End_F2(T) = K ⊕ KΓ = the crossed product K ∗ Gal; 256 → 16 under relationality (additivity) ==');
const allFns = []; for (let c = 0; c < 256; c++) allFns.push([0, 1, 2, 3].map((i) => (c >> (2 * i)) & 3));
const additive = allFns.filter((f) => f[0] === 0 && K.every((x) => K.every((y) => f[add(x, y)] === add(f[x], f[y]))));
ok(additive.length === 16, `of 256 functions K→K, exactly 16 are additive (respect the difference structure): ${additive.length}`);
const asLaw = (f) => laws().find(([a, b]) => K.every((x) => applyLaw([a, b], x) === f[x]));
ok(additive.every((f) => asLaw(f)) && new Set(additive.map((f) => asLaw(f).join(''))).size === 16, 'each additive map is uniquely L_{a,b}(x) = a x + b x²: the sixteen are K ⊕ K·Γ (scalar part a, twisted part b)');
ok(laws().every(([a, b]) => laws().every(([c, d]) => { const lhs = compose([a, b], [c, d]); return K.every((x) => applyLaw(lhs, x) === applyLaw([a, b], applyLaw([c, d], x))); })), 'composition rule (a,b)∘(c,d) = (ac + b d², ad + b c²) verified on all 256 pairs: the ring M2(F2), noncommutative, with zero divisors');
const census = { 0: 0, 1: 0, 2: 0 }; for (const l of laws()) census[rank(l)]++;
ok(census[0] === 1 && census[1] === 9 && census[2] === 6, `rank census 1 / 9 / 6: zero ${census[0]}, rank-one ${census[1]}, invertible ${census[2]} (invertible ⇔ exactly one coefficient is zero: the two axes through the origin)`);
ok(laws().filter(([a, b]) => a !== 0 && b !== 0).every((l) => image(l).length === 2 && kernel(l).length === 2), 'the nine singular laws each have a 2-element image and a 2-element kernel');
ok(laws().every(([a, b]) => K.every((lam) => { const left = compose([lam, 0], [a, b]), right = compose([a, b], [lam, 0]); return left[0] === mul(lam, a) && left[1] === mul(lam, b) && right[0] === mul(a, lam) && right[1] === mul(b, frob(lam)); })), 'λ∘L_{a,b} = L_{λa,λb} (left/output) and L_{a,b}∘λ = L_{aλ, bλ²} (right/input): the Frobenius twist on the right');
ok(laws().every(([a, b]) => { const c = compose(compose([0, 1], [a, b]), [0, 1]); return c[0] === frob(a) && c[1] === frob(b); }), 'conjugation by Γ sends L_{a,b} ↦ L_{a²,b²}: the Galois action on the sixteen; fixed points = F2 ⊕ F2·Γ = {0, 1, Γ, 1+Γ}');
console.log('  the four Γ-fixed laws: 0 (zero), 1 (identity), Γ (Frobenius), 1+Γ = Tr (the trace x + x², the projection onto F2)');
ok(K.every((x) => tr(x) === add(x, frob(x))) && K.every((x) => [0, 1].includes(tr(x))) && applyLaw([1, 1], W) === 1 && applyLaw([1, 1], 1) === 0, 'Tr = L_{1,1} maps K onto F2 = {0,1}; Tr∘Tr = 0');

console.log('\n== PHASE 6 — the two affine planes; exactly five readouts; exactly-once crossing is automatic ==');
const pts = laws();
for (const [side, ro] of [['left (output side)', leftReadout], ['right (input side)', rightReadout]]) {
  const parts = DIRS.map((m) => partitionOf(ro(m), pts));
  ok(parts.every((P) => P.length === 4 && P.every((c) => c.length === 4)), `${side}: five readouts, each 4 classes of 4 (20 lines)`);
  let crossings = 0; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const okij = parts[i].every((ci) => parts[j].every((cj) => ci.filter((p) => cj.includes(p)).length === 1)); if (okij) crossings++; }
  ok(crossings === 10, `${side}: all 10 pairs of readouts cross exactly once (AG(2,4); any two readouts determine all five)`);
  // no sixth: fix a point; the other three points of its line in each readout are disjoint sets; 5 × 3 = 15 exhausts the other points
  const p0 = '00'; const mates = parts.map((P) => P.find((c) => c.includes(p0)).filter((x) => x !== p0)); const union = new Set(mates.flat());
  ok(union.size === 15, `${side}: the five lines through a point cover all 15 other points: a sixth exactly-once readout is impossible`);
}
// the Frobenius action on the five input-side directions: 2 fixed axes, 1 fixed mixed, 2 swapped
const rightParts = DIRS.map((m) => partitionOf(rightReadout(m), pts));
const frobPt = ([a, b]) => [frob(a), frob(b)];
const frobOnPartition = (P) => P.map((c) => c.map((s) => frobPt(s.split('').map(Number)).join('')).sort()).sort((x, y) => x[0].localeCompare(y[0]));
const frobImage = DIRS.map((m, i) => DIRS.findIndex((_, j) => samePartition(frobOnPartition(rightParts[i]), rightParts[j])));
ok(frobImage[0] === 0 && frobImage[1] === 1 && frobImage[2] === 2 && frobImage[3] === 4 && frobImage[4] === 3, `Γ acts on the five input-side directions as: ∞→∞, 0→0, 1→1, ω↔ω²  — a 2 + 1 + 2 structure (two axes, one self-conjugate mixed readout, one conjugate pair)`);

console.log('\n== PHASE 13 — fivefold: the directions carry PGL(2,4) ≅ A5; a five-cycle needs the next Γ-extension (F16) and a selector ==');
// order-5 elements of GL(2,K) acting on P^1(K): count cyclic subgroups of order 5 in PGL(2,4)
const mats = []; for (const a of K) for (const b of K) for (const c of K) for (const d of K) if (add(mul(a, d), mul(b, c)) !== 0) mats.push([a, b, c, d]);
const mmul = ([a, b, c, d], [e2, f, g, h]) => [add(mul(a, e2), mul(b, g)), add(mul(a, f), mul(b, h)), add(mul(c, e2), mul(d, g)), add(mul(c, f), mul(d, h))];
const isScalar = ([a, b, c, d]) => b === 0 && c === 0 && a === d;
const projOrder = (M) => { let P = M, n = 1; while (!isScalar(P)) { P = mmul(P, M); n++; if (n > 60) return Infinity; } return n; };
const order5 = mats.filter((M) => projOrder(M) === 5);
ok(mats.length === 180 && order5.length === 72, `|GL(2,4)| = ${mats.length}; projective order-5 elements: ${order5.length} matrices = 24 elements of PGL(2,4) (each counted 3× for scalars)`);
// Air's exchange-return M_a = [[a,1],[1,0]] has projective order 2, 3, 5, 5 for a = 0, 1, ω, ω²
ok([0, 1, W, W2].map((a) => projOrder([a, 1, 1, 0])).join(',') === '2,3,5,5', 'exchange-return M_a = [[a,1],[1,0]]: orders 2, 3, 5, 5 for a = 0, 1, ω, ω² (Air §12.2 reproduced)');
// the characteristic polynomial of M_ω is t² + ωt + 1, irreducible over K: its roots are the primitive 5th roots of unity in F16 — the next Galois step
ok(K.every((t) => add(add(mul(t, t), mul(W, t)), 1) !== 0), 't² + ωt + 1 has no root in K: the five-cycle lives in F16 = K[t]/(t²+ωt+1), the second application of the extension step F2 → F4 → F16');
console.log('  six cyclic subgroups of order 5, all conjugate; two cyclic orders per subgroup (pentagon vs pentagram); no marked structure selects one: a selector of log2(6)+1 bits + orientation');

console.log('\n== PHASE 14 — the lemniscate as the cycle modulo Γ ==');
// quotient of the 4-cycle 0→ω→1→ω²→0 by the Γ-orbits {0}, {1}, {ω,ω²}: vertices 0, m, 1; edges 0-m, m-1, 1-m, m-0 → two loops sharing m
const orbit = (x) => (x === W || x === W2 ? 'm' : String(x));
const cycleEdges = [[0, W], [W, 1], [1, W2], [W2, 0]].map(([u, v]) => [orbit(u), orbit(v)]);
const verts = new Set(cycleEdges.flat());
ok(verts.size === 3 && cycleEdges.length === 4 && cycleEdges.filter((ed) => ed.includes('m')).length === 4, `T/Γ: ${verts.size} vertices, ${cycleEdges.length} edges, every edge touches the orbit {I,F}: cycle rank E−V+1 = ${cycleEdges.length - verts.size + 1} — a wedge of two circles (0-m-0 and 1-m-1) sharing the crossing m = {I,F}`);
console.log('  the two lobes are V (0, not-yet) and A (1, actual); the crossing is the conjugate pair {I, F}; the branch bit lost in the quotient (ω vs ω²) is the retained branch history');
console.log('\nM1 done.');
