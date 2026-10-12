// FULL-KERNEL MOONSHOT (True, 2026-10-12) — the shared library.
// F4 = {0, 1, ω, ω²} as integers 0,1,2,3 with addition = XOR (ω² = ω + 1 ⇒ 3 = 2 ^ 1) and the multiplication table below.
// Everything downstream (the kernel, the response algebra, the canon comparison) imports from here, so one arithmetic serves all scripts.
export const K = [0, 1, 2, 3];
export const KSTAR = [1, 2, 3];
export const W = 2, W2 = 3; // ω, ω²
export const add = (x, y) => x ^ y;
const MUL = [[0, 0, 0, 0], [0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2]];
export const mul = (x, y) => MUL[x][y];
export const inv = (x) => { if (x === 0) throw new Error('inverse of 0'); return KSTAR.find((y) => mul(x, y) === 1); };
export const frob = (x) => mul(x, x); // x ↦ x²: fixes 0 and 1, swaps ω ↔ ω²
export const tr = (x) => add(x, frob(x)); // trace to F2: 0,1 ↦ 0; ω, ω² ↦ 1
export const name = (x) => ['0', '1', 'ω', 'ω²'][x];

// A response law L_{a,b}(x) = a x + b x²; sixteen of them = End_F2(F4) ≅ M2(F2).
export const L = (a, b) => (x) => add(mul(a, x), mul(b, frob(x)));
export const laws = () => K.flatMap((a) => K.map((b) => [a, b]));
export const applyLaw = ([a, b], x) => add(mul(a, x), mul(b, frob(x)));
export const compose = ([a, b], [c, d]) => [add(mul(a, c), mul(b, frob(d))), add(mul(a, d), mul(b, frob(c)))]; // (a,b)∘(c,d) = (ac + b d², ad + b c²)
export const rank = ([a, b]) => (a === 0 && b === 0 ? 0 : (a === 0 || b === 0 ? 2 : 1));
export const image = ([a, b]) => [...new Set(K.map((x) => applyLaw([a, b], x)))].sort();
export const kernel = ([a, b]) => K.filter((x) => applyLaw([a, b], x) === 0);

// The two scalar actions and their five readouts (as functionals on the coefficient pair).
// left (output side):  λ∘L_{a,b} = L_{λa, λb}; lines a + m b = const (m ∈ K) and b = const.
// right (input side):  L_{a,b}∘λ = L_{aλ, bλ²}; in (x,y) = (a, b²): lines y + m x = const and x = const.
export const leftReadout = (m) => ([a, b]) => (m === 'inf' ? b : add(a, mul(m, b)));
export const rightReadout = (m) => ([a, b]) => (m === 'inf' ? a : add(frob(b), mul(m, a)));
export const DIRS = ['inf', 0, 1, 2, 3];
export const partitionOf = (fn, pts) => { const m = new Map(); for (const p of pts) { const v = fn(p); if (!m.has(v)) m.set(v, []); m.get(v).push(p); } return [...m.values()].map((c) => c.map((p) => p.join('')).sort()).sort((x, y) => x[0].localeCompare(y[0])); };
export const samePartition = (P, Q) => JSON.stringify(P) === JSON.stringify(Q);

// All 24 bijections {Fire, Air, Water, Earth} → K (the alphabets), and the one the Soul row fixes.
export const ELEMENTS = ['Fire', 'Air', 'Water', 'Earth'];
export const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
export const ALPHABETS = perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])));
// THE SOUL ROW (COUNCIL_BRIEF_The_Generator_Formula_Complete_2026-08-10, §2, machine-verified invariant): Seed=Fire (0 Potential) · Bridge=Earth (1 Will)
// · Fruition=Air (19 Actualization) · Feedback=Water (20 Recognition). With the kernel's chart Seed=0, Fruition=σ²(Seed)=1 (the unit), Bridge=ω, Feedback=ω²:
export const SOUL_ROW = { Seed: 'Fire', Bridge: 'Earth', Fruition: 'Air', Feedback: 'Water' };
export const ROLE_K = { Seed: 0, Bridge: W, Fruition: 1, Feedback: W2 };
export const SOUL_ALPHABET = { Fire: 0, Air: 1, Earth: W, Water: W2 };
export const elementOfK = (alpha) => Object.fromEntries(Object.entries(alpha).map(([e, k]) => [k, e]));
export const clock = (x) => add(frob(x), W); // σ(x) = x² + ω  (Γ, then the Will step): 0→ω→1→ω²→0 = Seed→Bridge→Fruition→Feedback
