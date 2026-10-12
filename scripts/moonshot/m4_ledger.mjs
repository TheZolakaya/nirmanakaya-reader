// M4 — PHASE 17: THE LEDGERS. Prices every selector by enumeration, tests the label rule's alternatives, builds the derivation graph JSON,
// and writes the description-length comparison. All numbers printed here are the ones quoted in the shelf documents.
//   npx tsx scripts/moonshot/m4_ledger.mjs
import fs from 'node:fs';
import { K, KSTAR, W, W2, add, mul, frob, tr, name, laws, rightReadout, DIRS, partitionOf, ALPHABETS, SOUL_ALPHABET, ROLE_K, elementOfK, ELEMENTS } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { BEING_GROUPS, IDENTITY_GROUPS } = await import(R + 'lib/constants.js');
const { getComponent } = await import(R + 'lib/corrections.js');
const MANIFEST = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const PE = { Spirit: 'Fire', Mind: 'Air', Emotion: 'Water', Body: 'Earth' }, AE = { Intent: 'Fire', Cognition: 'Air', Resonance: 'Water', Structure: 'Earth' };
const groupOf = (G, id) => Object.keys(G).find((g) => G[g].members.includes(id));
const stageOf = (id) => { for (const g of Object.values(BEING_GROUPS)) for (const [s, m] of Object.entries(g.stages)) if (m === id) return s; };
const CARDS = MANIFEST.map((id) => { const c = getComponent(id); const bg = groupOf(BEING_GROUPS, id), ig = groupOf(IDENTITY_GROUPS, id); return { id, name: c.name, P: PE[c.house], A: AE[c.channel], Bel: BEING_GROUPS[bg].element, Iel: IDENTITY_GROUPS[ig].element, S: stageOf(id), B: bg, I: ig }; });
const alpha = SOUL_ALPHABET, E = elementOfK(alpha);
const coord = (c) => [alpha[c.P], alpha[c.A]];
const ROLE_OF_K = Object.fromEntries(Object.entries(ROLE_K).map(([r, k]) => [k, r]));
const f = (m, [a, b]) => add(frob(b), mul(m, a)); // the input-side functional of slope m
const log2 = (x) => Math.log2(x);

console.log('== S1 the side: the input side matches the TARGET in 24/24 alphabets and the output side in 0/24 — a target comparison, not a derivation (GPT validation): 1 bit unless a bridge is stated ==');
console.log('== S2 the slopes: naming the Γ-fixed direction Stage and the conjugate pair Being/Identity is a bridge; given the names, the assignment is forced by the involution fixed points: log2(6) = 2.58 bits unless the bridge is antecedent ==');

console.log('\n== S3 the label rule: uniform affine rules  E_m = λ(m)·f_m + β(m)  with λ ∈ {1, m, m²}, β ∈ {0, 1, m, m²} ==');
const LAMS = { '1': () => 1, 'm': (m) => m, 'm²': (m) => mul(m, m) }, BETAS = { '0': () => 0, '1': () => 1, 'm': (m) => m, 'm²': (m) => mul(m, m) };
const rules = []; for (const [ln, lam] of Object.entries(LAMS)) for (const [bn, bet] of Object.entries(BETAS)) rules.push({ label: `λ=${ln}, β=${bn}`, E: (m, ab) => add(mul(lam(m), f(m, ab)), bet(m)) });
const score = (rule) => { let s = 0, b = 0, i = 0; for (const c of CARDS) { const ab = coord(c); if (ROLE_OF_K[rule.E(1, ab)] === c.S) s++; if (E[rule.E(W2, ab)] === c.Bel) b++; if (E[rule.E(W, ab)] === c.Iel) i++; } return { s, b, i }; };
for (const r of rules) { const sc = score(r); r.sc = sc; console.log(`  ${r.label.padEnd(12)} Stage ${String(sc.s).padStart(2)}/16  Being ${String(sc.b).padStart(2)}/16  Identity ${String(sc.i).padStart(2)}/16`); }
const stageFit = rules.filter((r) => r.sc.s === 16), full = rules.filter((r) => r.sc.s === 16 && r.sc.b === 16 && r.sc.i === 16);
console.log(`  rules fitting the Stage roles (the Soul row): ${stageFit.length} of 12 → ${stageFit.map((r) => r.label).join(' | ')}`);
console.log(`  of those, rules also reproducing all 32 Being/Identity ruled elements: ${full.length} → ${full.map((r) => r.label).join(' | ')}`);
console.log(`  selector cost of the label rule after the Stage fit, if chosen by fit: log2(${stageFit.length}) = ${log2(stageFit.length).toFixed(2)} bits; the label data it reproduces is two bijections of four line-labels = 2·log2(24) = ${(2 * log2(24)).toFixed(2)} bits (NOT 64: the 32 printed labels repeat)`);
console.log('  AFTER THE GPT VALIDATION: the rule is selected by the antecedent Reflexive Grounding law (a group\'s element = its Seed member\'s Practice element), uniquely among all 576 label pairs → 0 new bits; the grounding law is charged as an antecedent dictionary (m2 §8.3b)');
// the independent-relabeling baseline: per readout, the 24 relabelings of 4 lines; 12 are affine in the line coordinate
const affineRelabelings = []; for (const lam of KSTAR) for (const bet of K) affineRelabelings.push((x) => add(mul(lam, x), bet));
const perReadout = { Being: W2, Identity: W }; const affineHits = {};
for (const [rn, m] of Object.entries(perReadout)) { affineHits[rn] = affineRelabelings.filter((rel) => CARDS.every((c) => E[rel(f(m, coord(c)))] === c[rn === 'Being' ? 'Bel' : 'Iel'])).length; }
console.log(`  baseline: the ruled labels are AFFINE functions of the line coordinate: Being ${affineHits.Being}/12 affine relabelings match, Identity ${affineHits.Identity}/12 (24 relabelings each in all; chance of affine-ness ½ each)`);
console.log(`  chance that a random uniform rule among ${stageFit.length} reproduces both 32-label sets: ≈ ${stageFit.length} × (1/24)² = ${(stageFit.length / 576 * 100).toFixed(2)}%`);

console.log('\n== S4 the alphabet: 24 bijections elements → K; the Soul row (antecedent, 2026-08-10) selects one; without it the geometry alone leaves all 24 ==');
console.log(`  cost if the Soul row were a free selector: log2(24) = ${log2(24).toFixed(2)} bits; it is an antecedent dictionary, so it is charged as a DICTIONARY, not a selector`);
console.log('== S5 orientation: the kernel names the order V→I→A→F, so the step is I = Will = ω by definition and the reversal is the gauge twin: 0 additional bits (the earlier "1 bit used three times" double-charged K0.cycle — GPT validation) ==');
console.log('== S6 the origin of the role chart (which role is 0) and the unit (= σ²): gauge, 0 bits (Aut(Q,σ) = Z4 is transitive) ==');

console.log('\n== DICTIONARIES (supplied, charged) ==');
const dict = [
  ['Soul row: roles ↔ elements (Seed Fire, Bridge Earth, Fruition Air, Feedback Water)', log2(24), 'antecedent (Generator brief 2026-08-10; the Soul channel derivation)'],
  ['elements ↔ houses (Spirit Fire, Mind Air, Emotion Water, Body Earth)', log2(24), 'canon'],
  ['elements ↔ channels (Intent Fire, Cognition Air, Resonance Water, Structure Earth)', log2(24), 'canon'],
  ['names of the 22 (and of 40 bounds, 16 agents)', NaN, 'semantic; not priced in bits'],
  ['bound numbers: the palindrome 1/10 Gestalt, 2/9 Spirit, 3/8 Mind, 4/7 Emotion, 5/6 Body; 1–5 inner', log2(120) + 1, 'supplied numbering on the sides (5! orderings of houses × inner/outer convention)'],
  ['agent rank names ↔ houses (Initiate Spirit, Catalyst Mind, Steward Emotion, Executor Body)', 0, 'a relabeling of the house axis; 0 structural bits'],
  ['the numbering 0–21 and the Forty-Fold Seal', NaN, 'EXCLUDED from this claim (the numerical spine is not generated by this kernel)'],
  ['Reduction outside the manifest (±9/+18 digit rule on 0,1,19,20,10,21)', NaN, 'supplied; not generated'],
];
for (const [what, bits, status] of dict) console.log(`  ${what}: ${Number.isNaN(bits) ? '—' : bits.toFixed(2) + ' bits'} — ${status}`);

console.log('\n== DESCRIPTION LENGTH (fixed codebook: 2 bits per element/role label, log2 per choice) ==');
const direct = {
  'sixteen × five readouts (P, A, B, I elements + Stage role)': 16 * 5 * 2,
  'V, D, R, G on the sixteen (four permutations)': 4 * 16 * 4,
  'the within-house Stage successor on the sixteen': 16 * 4,
  'Gestalt: elements, governance, Soul V/D/G targets (4 × (2 + 2 + 3×5))': 4 * (2 + 2 + 15),
  'two portals and their exchanges': 2,
  '40 bounds: parent (5 bits) + side (1 bit)': 40 * 6,
  '16 agents: parent (4 bits)': 16 * 4,
};
const directTotal = Object.values(direct).reduce((p, q) => p + q, 0);
for (const [k, v] of Object.entries(direct)) console.log(`  direct  ${k}: ${v} bits`); console.log(`  DIRECT TOTAL ≈ ${directTotal} bits`);
const kernelSide = {
  'K0: four typed roles in a cycle + Γ (relationality) + recursion-as-law (the type declaration; a fixed program, not target data)': 0,
  'orientation (S5)': 1,
  'label rule after the Stage fit (S3)': log2(stageFit.length),
  'Soul row dictionary': log2(24),
  'elements ↔ houses, elements ↔ channels': 2 * log2(24),
  'catalog rules C1–C3 (three declared typing rules; fixed program)': 0,
  'bound numbering dictionary': log2(120) + 1,
  'Soul Reduction + portal Reduction (supplied map: 6 targets among 22)': 6 * log2(22),
};
const kernelTotal = Object.values(kernelSide).reduce((p, q) => p + q, 0);
for (const [k, v] of Object.entries(kernelSide)) console.log(`  kernel  ${k}: ${v.toFixed(2)} bits`); console.log(`  (original ledger) KERNEL + SELECTORS + DICTIONARIES ≈ ${kernelTotal.toFixed(1)} bits of target-dependent choice WITH THE CONSTRUCTOR FREE`);
console.log('  THE RATIO IS WITHDRAWN (GPT compression audit, 2026-10-12): the 862-bit baseline encodes dependent tables independently (e.g. a correction is a 4-bit translation, not a 64-bit permutation; bounds and agents are generated by C2/C3), and the constructor is set to zero while it carries load-bearing choices. Fair accounting needs a common construction language charged on both sides.');
const revised = { 'orientation (named order given): 0': 0, 'label rule (Reflexive Grounding, antecedent): 0 new': 0, 'side (target comparison unless bridged)': 1, 'slope naming (bridge unless antecedent)': log2(6), 'Soul row + two element dictionaries': 3 * log2(24), 'Reflexive Grounding law (antecedent dictionary)': 1, 'bound numbering': log2(120) + 1, 'Reduction off the manifest': 6 * log2(22) };
const revisedTotal = Object.values(revised).reduce((p, q) => p + q, 0);
console.log(`  REVISED residual choice (constructor still free, GPT corrections applied): ${Object.entries(revised).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('; ')} → ≈ ${revisedTotal.toFixed(1)} bits. The GPT's broader selector codebook gives ≈ 102 bits plus the construction language. Verdict: MODERATE demonstrated structural compression; possibly HIGH; no invariant ratio.`);

// ---- the derivation graph ----
const N = (id, label, status, inputs = [], note = '') => ({ id, label, status, inputs, note });
const graph = { generated: new Date().toISOString(), legend: { SUPPLIED: 'in the kernel K0', ANTECEDENT: 'older canon used as a dictionary or premise', GENERATED: 'theorem from its inputs (checked by enumeration in scripts/moonshot)', CALIBRATED: 'selected because it matches the target; priced in SELECTOR_LEDGER', CORRESPONDENCE: 'a held-out canon fact the construction reproduces', FAILURE: 'not generated; remains supplied', OPEN: 'not attempted or not decidable here' }, nodes: [
  N('K0.roles', 'four typed interfaces V, I, A, F', 'SUPPLIED', [], 'Four is received (firing squad 2026-10-12: not forced by the functional semantics)'),
  N('K0.cycle', 'the oriented cycle V→I→A→F→V', 'SUPPLIED', ['K0.roles'], 'orientation = selector S5 (1 bit)'),
  N('K0.gamma', 'Γ: relational consequence (consequence respects the difference structure)', 'SUPPLIED', [], 'formalized as additivity of the consequence law; its algebraic shadow is the Galois automorphism'),
  N('K0.recursion', 'recursion with consequence h_{n+1} = U(h_n, outcome), H = T', 'SUPPLIED', ['K0.roles'], 'consequence carried in the role carrier (minimal: no new type)'),
  N('T', 'the three matchings + identity = Klein group T; Q a torsor', 'GENERATED', ['K0.roles']),
  N('K', 'the field K = {0,1,ω,ω²} as the scalar subalgebra of End(T)', 'GENERATED', ['T']),
  N('clock', 'every four-cycle is x ↦ x² + c; linear part = Frobenius = Γ; σ² = +1 = the unit', 'GENERATED', ['K0.cycle', 'K']),
  N('D4', '⟨σ, Γ⟩ = D4 = T ⋊ ⟨Γ⟩: one over four', 'GENERATED', ['clock']),
  N('A16', 'End_F2(T) = K ⊕ KΓ = K ∗ Gal ≅ M2(F2): sixteen laws; 256 → 16 by additivity', 'GENERATED', ['K', 'clock', 'K0.gamma', 'K0.recursion']),
  N('manifest-as-law', 'a manifest archetype is a consequence law (a verb)', 'ANTECEDENT', ['A16'], 'the Verb Shift doctrine: archetypes are verbs/processes; bounds nouns; agents gerunds'),
  N('rank', 'rank census 1/9/6', 'GENERATED', ['A16'], 'NO antecedent partition in canon (LOOKUP 2026-10-12): a prediction without a meaning yet'),
  N('spreads', 'two scalar actions → two AG(2,4) spreads; five readouts; exactly-once crossing automatic; no sixth', 'GENERATED', ['A16']),
  N('galois-2-1-2', 'Γ on the five input-side directions: two axes fixed, one mixed fixed, two swapped', 'GENERATED', ['spreads']),
  N('side', 'the input side (right action) is the one that matches, in all 24 shared alphabets', 'GENERATED', ['spreads', 'alphabet-shared'], 'replication finding 1; 0 bits'),
  N('alphabet-shared', 'Practice and Activity read in one alphabet (both coefficients live in K)', 'ANTECEDENT', [], 'canon: one element alphabet on houses and channels'),
  N('soul-row', 'Seed Fire · Bridge Earth · Fruition Air · Feedback Water', 'ANTECEDENT', [], 'Generator brief 2026-08-10; fixes the alphabet; log2(24) bits if it were free'),
  N('slopes', 'Stage = slope 1 (Γ-fixed), Identity = ω, Being = ω²', 'GENERATED', ['side', 'soul-row'], 'CORRESPONDENCE: canon singles out Stage and pairs Being/Identity'),
  N('labels', 'E_m = m·(f_m + 1) reproduces 16 Stage roles + 32 ruled Being/Identity elements', 'CALIBRATED', ['slopes', 'soul-row'], `1 of ${stageFit.length} uniform rules after the Stage fit (${log2(stageFit.length).toFixed(2)} bits) → 64 bits of label data; the Being/Identity elements were ruled 2026-10-04 from a different derivation`),
  N('ops-translations', 'V = +ωΓ, D = +Γ, R = +ωTr: three translations', 'CORRESPONDENCE', ['A16', 'labels']),
  N('D=sigma2', 'Diagonal = σ² = the clock-fixed translation (Seed↔Fruition)', 'GENERATED', ['clock', 'ops-translations']),
  N('orientation-use', 'V and R are the ω-multiples; VD and +ω²Tr unnamed: one orientation bit used thrice', 'CORRESPONDENCE', ['ops-translations', 'K0.cycle']),
  N('growth', 'current Growth = L∘Γ on the twelve, +Tr (Γ-fixed) on the pures; old = Reduction; Soul Growth k ↦ k·Tr', 'CORRESPONDENCE', ['A16', 'labels'], 'the Growth hunt\'s unlocated privilege is Γ-invariance'),
  N('cuts', 'Fire/Earth and Fire/Water cuts complete (ω, ω²), Fire/Air incomplete (Γ-fixed 1)', 'CORRESPONDENCE', ['labels', 'galois-2-1-2'], 'Fresh Mind 2026-10-04 reproduced and explained'),
  N('coarse-flips', 'V flips I, D flips A+B, R flips B', 'CORRESPONDENCE', ['ops-translations', 'cuts']),
  N('horizons', 'Wheel/World = Tr(Stage); inner/outer = cut ω of Stage; Vertical = cut ω²', 'CORRESPONDENCE', ['labels']),
  N('stage-clock-16', 'σ on the Stage coordinate = the within-house Stage order on all sixteen', 'GENERATED', ['clock', 'labels']),
  N('gestalt=K', 'the Gestalt four are K at the Soul scale (RPA statements; governance of own-element house; own-suit bounds)', 'ANTECEDENT', ['soul-row'], 'identification of the Gestalt with the four roles: June–August 2026 canon'),
  N('C1', 'archetype catalog = F2 ⊔ K ⊔ A (three scales as types) → 22', 'SUPPLIED', ['A16', 'K', 'gestalt=K'], 'catalog rule'),
  N('C2', 'bound = an oriented side of a non-ground law → 40', 'SUPPLIED', ['C1'], 'catalog rule; antecedent flavour: Bounds = nouns (the two nouns a verb connects); portals typed Ingress/Egress in the record'),
  N('C3', 'agent = a manifest law acting (A on itself by addition) → 16', 'SUPPLIED', ['C1'], 'catalog rule; antecedent flavour: Agents = gerunds, "X-as-behavior"'),
  N('78', '22 + 40 + 16 = 78', 'GENERATED', ['C1', 'C2', 'C3']),
  N('portals-F2', 'V, D, G exchange the portals; the portals are the two sides of the whole', 'CORRESPONDENCE', ['C1']),
  N('reduction-outside', 'Reduction on 0, 1, 19, 20, 10, 21 (±9/+18 digit rule)', 'FAILURE', [], 'supplied numbering rule'),
  N('numbering', 'the numbering 0–21, the Seal, the bound numbers', 'OPEN', [], 'excluded from this kernel\'s claim'),
  N('fivefold', 'the five directions carry A5; a 5-cycle needs F16 (the second Γ-extension) and a 6-way + 1-bit selector', 'GENERATED', ['spreads'], 'pentagram not forced; metric/φ not supplied'),
  N('lemniscate', 'T/Γ is a wedge of two circles: lobes V and A, crossing {I,F}, branch bit = the quotient\'s lost bit', 'GENERATED', ['clock', 'K0.gamma'], 'a canonical quotient; whether it is THE lemniscate is semantics'),
  N('agency', 'alternatives (A) and effect (the update) are present; selection is not', 'OPEN', ['A16', 'K0.recursion']),
] };
fs.writeFileSync('data/bakeoff/pass3/moonshot_graph.json', JSON.stringify(graph, null, 1));
const counts = {}; for (const n of graph.nodes) counts[n.status] = (counts[n.status] || 0) + 1;
console.log('\nderivation graph:', graph.nodes.length, 'nodes —', Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '), '→ data/bakeoff/pass3/moonshot_graph.json');
console.log('M4 done.');
