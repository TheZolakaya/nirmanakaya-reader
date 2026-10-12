// M2 — PHASE 8: THE CANONICAL MIDDLE, OPENED AFTER THE STRUCTURE IS FROZEN.
// The live record (lib/constants.js, lib/corrections.js, lib/data/nirmanakaya_78_definitions.json) is read here for the first time in the chain.
// The abstract construction (f4.mjs / m1) is NOT changed after this comparison. Each match is classified in the printout.
//   npx tsx scripts/moonshot/m2_canon.mjs [all]      (all = also report every one of the 24 alphabets, not only the Soul row)
import fs from 'node:fs';
import { K, KSTAR, W, W2, add, mul, frob, tr, name, laws, applyLaw, compose, rank, rightReadout, leftReadout, DIRS, partitionOf, samePartition, ALPHABETS, SOUL_ALPHABET, ROLE_K, elementOfK, clock, ELEMENTS } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { BEING_GROUPS, IDENTITY_GROUPS } = await import(R + 'lib/constants.js');
const { getComponent, VERTICAL_PAIRS, DIAGONAL_PAIRS, REDUCTION_PAIRS, GROWTH_PAIRS } = await import(R + 'lib/corrections.js');
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const ALL = process.argv.includes('all');

// ---- the live record: the sixteen with their five readouts and element labels ----
const MANIFEST = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const PE = { Spirit: 'Fire', Mind: 'Air', Emotion: 'Water', Body: 'Earth' }, AE = { Intent: 'Fire', Cognition: 'Air', Resonance: 'Water', Structure: 'Earth' };
const groupOf = (G, id) => Object.keys(G).find((g) => G[g].members.includes(id));
const stageOf = (id) => { for (const g of Object.values(BEING_GROUPS)) for (const [s, m] of Object.entries(g.stages)) if (m === id) return s; };
const CARDS = MANIFEST.map((id) => { const c = getComponent(id); const bg = groupOf(BEING_GROUPS, id), ig = groupOf(IDENTITY_GROUPS, id); return { id, name: c.name, P: PE[c.house], A: AE[c.channel], house: c.house, channel: c.channel, B: bg, Bel: BEING_GROUPS[bg].element, I: ig, Iel: IDENTITY_GROUPS[ig].element, S: stageOf(id) }; });
const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const canonPart = (key) => { const m = {}; for (const c of CARDS) (m[c[key]] ||= []).push(c.id); return Object.values(m).map((x) => x.sort((p, q) => p - q)).sort((x, y) => x[0] - y[0]); };
const CANON = { Practice: canonPart('P'), Activity: canonPart('A'), Being: canonPart('B'), Identity: canonPart('I'), Stage: canonPart('S') };
const asIdPartition = (P, coord) => P.map((cls) => cls.map((s) => coord[s]).sort((p, q) => p - q)).sort((x, y) => x[0] - y[0]);
const same = (P, Q) => JSON.stringify(P) === JSON.stringify(Q);

function analyse(alpha, verbose) {
  const E = elementOfK(alpha);
  // the coefficient pair of each card: a = alphabet(Practice element), b = alphabet(Activity element)  — THE SHARED ALPHABET (both coordinates live in K)
  const coord = {}; for (const c of CARDS) coord[`${alpha[c.P]}${alpha[c.A]}`] = c.id;
  const pts = laws();
  const res = { alpha, matches: {}, side: null };
  for (const [side, ro] of [['right', rightReadout], ['left', leftReadout]]) {
    const parts = Object.fromEntries(DIRS.map((m) => [String(m), asIdPartition(partitionOf(ro(m), pts), coord)]));
    const found = {}; for (const [rname, P] of Object.entries(CANON)) { const m = Object.keys(parts).find((k) => same(parts[k], P)); if (m !== undefined) found[rname] = m; }
    res.matches[side] = found;
    if (Object.keys(found).length === 5) res.side = res.side ? 'both' : side;
  }
  if (!verbose) return res;
  console.log(`\nalphabet  Fire=${name(alpha.Fire)} Air=${name(alpha.Air)} Earth=${name(alpha.Earth)} Water=${name(alpha.Water)}`);
  for (const side of ['right', 'left']) console.log(`  ${side.padEnd(5)} side matches: ${JSON.stringify(res.matches[side])}`);
  return res;
}

console.log('== 8.1  Which side? Over all 24 alphabets (both coordinates read in the same alphabet) ==');
const summary = ALPHABETS.map((a) => analyse(a, false));
const rightAll = summary.filter((r) => Object.keys(r.matches.right).length === 5).length, leftAll = summary.filter((r) => Object.keys(r.matches.left).length === 5).length;
ok(rightAll === 24 && leftAll === 0, `input side (right action) matches all five canonical readouts in ${rightAll}/24 alphabets; output side (left action) in ${leftAll}/24  (replication's finding 1 reproduced; the side is forced by the shared alphabet)`);
const slopes = summary.map((r) => `S=${r.matches.right.Stage},B=${r.matches.right.Being},I=${r.matches.right.Identity}`);
ok(summary.every((r) => r.matches.right.Practice === 'inf' && r.matches.right.Activity === '0'), 'in every alphabet Practice is the direction ∞ (a = const) and Activity the direction 0 (b = const): the two axes of the response algebra');
console.log('  which element plays the self-conjugate slope 1 decides which mixed readout is Stage:', [...new Set(summary.map((r) => `${elementOfK(r.alpha)[1]}→${Object.entries(r.matches.right).find(([, m]) => m === '1')[0]}`))].join('  '));

console.log('\n== 8.2  THE SOUL-ROW ALPHABET (antecedent: Generator brief 2026-08-10; Seed=Fire, Bridge=Earth, Fruition=Air, Feedback=Water; kernel chart V=0, A=1, I=ω, F=ω²) ==');
const alpha = SOUL_ALPHABET; const E = elementOfK(alpha);
const soul = analyse(alpha, true);
ok(soul.matches.right.Stage === '1' && soul.matches.right.Identity === String(W) && soul.matches.right.Being === String(W2), `under the Soul row: Stage = slope 1 (the Γ-FIXED mixed readout), Identity = slope ω, Being = slope ω² (the Γ-conjugate pair)  — PREDICTION: the canon singles out Stage (no element, the process engine) and pairs Being/Identity (the two Latin-square dimensions)`);

console.log('\n== 8.3  THE LABELS: one formula for all three mixed readouts  E_m(a,b) = m·(b² + m·a + 1), read back through the same alphabet ==');
const coord = (c) => [alpha[c.P], alpha[c.A]];
const Em = (m, [a, b]) => mul(m, add(add(frob(b), mul(m, a)), 1));
const ROLE_OF_K = Object.fromEntries(Object.entries(ROLE_K).map(([r, k]) => [k, r]));
let stageHits = 0, beingHits = 0, identityHits = 0;
for (const c of CARDS) { const [a, b] = coord(c); if (ROLE_OF_K[Em(1, [a, b])] === c.S) stageHits++; if (E[Em(W2, [a, b])] === c.Bel) beingHits++; if (E[Em(W, [a, b])] === c.Iel) identityHits++; }
ok(stageHits === 16, `Stage(card) = E_1(a,b) = b² + a + 1, read as a ROLE through the Soul row: ${stageHits}/16  (Seed=0, Bridge=ω, Fruition=1, Feedback=ω²)`);
ok(beingHits === 16, `Being element(card) = E_ω²(a,b): ${beingHits}/16 match the FOUNDER-RULED elements of 2026-10-04 (Kindle Fire · Passage Water · Vessel Air · Mantle Earth)`);
ok(identityHits === 16, `Identity element(card) = E_ω(a,b): ${identityHits}/16 match the FOUNDER-RULED elements (Conviction Fire · Intimacy Water · Exploration Air · Composure Earth)`);
console.log('  the origin card (Fire/Fire = the zero law) carries the three slopes as its three labels:', CARDS.filter((c) => c.P === 'Fire' && c.A === 'Fire').map((c) => `${c.name}: Stage ${c.S}=${name(Em(1, [0, 0]))}, Identity ${c.Iel}=${name(Em(W, [0, 0]))}, Being ${c.Bel}=${name(Em(W2, [0, 0]))}`).join(''));
const wis = CARDS.find((c) => c.name === 'Wisdom'); console.log(`  the all-zero-labels card is (a,b) = (0,1) = Γ itself: ${wis.name} (${wis.P}/${wis.A}): Stage ${wis.S}, Being ${wis.Bel}, Identity ${wis.Iel}`);
// how special is the Soul row? count alphabets under which the single formula reproduces all three label sets
const labelScore = (al) => { const EE = elementOfK(al); let s = 0; for (const c of CARDS) { const ab = [al[c.P], al[c.A]]; const mS = Number(analyse(al, false).matches.right.Stage), mB = Number(analyse(al, false).matches.right.Being), mI = Number(analyse(al, false).matches.right.Identity); if (ROLE_OF_K[Em(mS, ab)] === c.S) s++; if (EE[Em(mB, ab)] === c.Bel) s++; if (EE[Em(mI, ab)] === c.Iel) s++; } return s; };
const scores = ALPHABETS.map((al) => ({ al, s: labelScore(al) }));
const perfect = scores.filter((x) => x.s === 48);
const soulRowHolds = (al) => al.Fire === ROLE_K.Seed && al.Earth === ROLE_K.Bridge && al.Air === ROLE_K.Fruition && al.Water === ROLE_K.Feedback;
ok(perfect.length === 2 && perfect.some((x) => ELEMENTS.every((e) => x.al[e] === alpha[e])) && perfect.filter((x) => soulRowHolds(x.al)).length === 1, `alphabets under which the one formula reproduces all 48 labels (16 Stage roles + 16 Being + 16 Identity elements), with the role chart fixed: ${perfect.length} of 24 — the Soul row, and its shift by 1 (Fire↔Air, i.e. Fire = Fruition), which the Soul row's own identification Seed = Fire excludes. The Γ-conjugate alphabets score 40 only because the role chart was held fixed (they are the orientation gauge). Score distribution: ${[...new Set(scores.map((x) => x.s))].sort((p, q) => q - p).map((v) => `${v}×${scores.filter((x) => x.s === v).length}`).join(' ')}`);
console.log('  the two perfect alphabets:', perfect.map((x) => ELEMENTS.map((e) => `${e}=${name(x.al[e])}`).join(' ') + (soulRowHolds(x.al) ? '  ← the Soul row' : '  ← Fire = Fruition, Air = Seed: excluded by the Soul row')).join(' | '));

console.log('\n== 8.3b  THE LABEL RULE DERIVED (after the GPT validation, 2026-10-12): Reflexive Grounding selects it among all 576 label pairs ==');
// Antecedent rule (FINDING_Elemental_Governance_Mapping, Sept 1 gaveled amendment; residual self-seeding, March/Aug 2026): a Being or Identity
// group's element is the Practice element of its unique Seed member. With Stage = b² + a + 1 fixed, the Seed cards satisfy b² = a + 1, so on the
// Seed transversal f_m = (m+1)a + 1; demanding label(f_m) = a for all four a forces label(z) = m(z+1), i.e. E_m = m(f_m + 1). No target label used.
const permsK = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => permsK([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
const allLabelings = permsK(K); // 24 bijections K → K, as arrays indexed by the functional value
let survivors = [];
for (const rB of allLabelings) for (const rI of allLabelings) { const r = { [W2]: rB, [W]: rI }; let good = true; for (const m of [W, W2]) for (const a of K) { const seedB2 = add(a, 1); const fm = add(seedB2, mul(m, a)); if (r[m][fm] !== a) { good = false; break; } } if (good) survivors.push(r); }
ok(survivors.length === 1 && [W, W2].every((m) => K.every((z) => survivors[0][m][z] === mul(m, add(z, 1)))), `of 576 label pairs for Being and Identity, exactly ${survivors.length} satisfies "the group's element = its Seed member's Practice element", and it is E_m = m·(f_m + 1) — the rule is a CONSEQUENCE of the antecedent grounding law, not a fit (GPT self_seeding.py reproduced)`);
// and the same rule applied to Stage (m = 1) gives the Soul row normalization S = f_1 + 1 — consistent, though the Stage instance is an input here
ok(K.every((a) => { const s = add(add(add(a, 1), a), 1); return s === 0; }), 'with the same normalization at m = 1 every Seed card has Stage value 0: the Stage line through Γ is Seed (the Soul row\'s 0 = Fire = Potential)');

console.log('\n== 8.4  Rank classes under the Soul row ==');
const zero = CARDS.find((c) => coord(c).join('') === '00'); const inv6 = CARDS.filter((c) => rank(coord(c)) === 2).map((c) => c.name); const r1 = CARDS.filter((c) => rank(coord(c)) === 1).map((c) => c.name);
console.log(`  zero law: ${zero.name} (${zero.P}/${zero.A})  — Air's calibrated chart had the same (Inspiration = 0000)`);
console.log(`  invertible six: ${inv6.join(', ')}  = the Spirit house (the KΓ axis) and the Intent channel (the K axis), minus the zero`);
console.log(`  rank-one nine: ${r1.join(', ')}`);
ok(CARDS.filter((c) => c.P === c.A).every((c) => rank(coord(c)) < 2), 'the four pure cards are never invertible (they lie on the trace line a = b; replication finding 3)');
const pures = CARDS.filter((c) => c.P === c.A); console.log('  the pure diagonal a = b is K·Tr, the multiples of the trace map:', pures.map((c) => `${c.name}=${name(coord(c)[0])}·Tr`).join(', '));
console.log(`  the ring's 1 (identity law, (1,0)) is ${CARDS.find((c) => coord(c).join('') === '10').name}; Γ itself ((0,1)) is ${CARDS.find((c) => coord(c).join('') === '01').name}; Tr ((1,1)) is ${CARDS.find((c) => coord(c).join('') === '11').name}`);

console.log('\n== 8.5  The corrections as translations of the response algebra ==');
const vec = (pairs) => { const diffs = new Set(); for (const c of CARDS) { const t = pairs[c.id]; if (!byId[t]) continue; const [a, b] = coord(c), [a2, b2] = coord(byId[t]); diffs.add(`${add(a, a2)}${add(b, b2)}`); } return [...diffs]; };
const lawName = (s) => { const c = CARDS.find((x) => coord(x).join('') === s); return c ? c.name : '?'; };
const V = vec(VERTICAL_PAIRS), D = vec(DIAGONAL_PAIRS), Rr = vec(REDUCTION_PAIRS);
ok(V.length === 1 && D.length === 1 && Rr.length === 1, `each correction is ONE translation of the sixteen: V = +(${V[0].split('').map(Number).map(name)}) = +${lawName(V[0])}, D = +(${D[0].split('').map(Number).map(name)}) = +${lawName(D[0])}, R = +(${Rr[0].split('').map(Number).map(name)}) = +${lawName(Rr[0])}`);
ok(D[0] === '01', 'Diagonal = +Γ (adding the Frobenius law): the clock-fixed translation = σ² on the Stage coordinate (Seed↔Fruition) — PREDICTED by the kernel (two steps of the cycle = the antipode)');
ok(V[0] === `0${W}`, 'Vertical = +ωΓ (the ω-multiple of Γ); its Γ-conjugate +ω²Γ is the unnamed composite V∘D');
ok(Rr[0] === `${W}${W}`, 'Reduction = +ω·Tr (the ω-multiple of the trace law = +Fortitude); its Γ-conjugate +ω²Tr (+Compassion) is unnamed');
const stageShift = (t) => { const [a, b] = t.split('').map(Number); return frob(b); }; // adding (0,c) shifts the Stage coordinate E_1 by c²
console.log(`  on the Stage coordinate (within a house): D shifts by ${name(stageShift(D[0]))} (= the unit: Seed↔Fruition), V by ${name(stageShift(V[0]))} (Seed↔Feedback), V∘D by ${name(frob(add(W, 1)))} (Seed↔Bridge): the three matchings of the roles = T`);
// Growth
const Gm = {}; for (const c of CARDS) { const t = GROWTH_PAIRS[c.id]; if (!byId[t]) continue; const [a, b] = coord(c), [a2, b2] = coord(byId[t]); Gm[c.name] = { pure: c.P === c.A, delta: `${add(a, a2)}${add(b, b2)}`, swap: a2 === b && b2 === a }; }
ok(Object.values(Gm).filter((g) => !g.pure).every((g) => g.swap), 'current Growth on the twelve mixed cards = transposition (a,b) ↦ (b,a) = L ↦ L∘Γ (precomposition with the generative twist)');
ok(Object.values(Gm).filter((g) => g.pure).every((g) => g.delta === '11'), 'current Growth on the four pure cards = +Tr (+Abstraction): the Γ-FIXED translation along the trace line; the old completion (+ωTr) was Reduction; the third (+ω²Tr) is unnamed');
console.log('  the clock as it acts on the sixteen within a house (P fixed, Stage ↦ σ(Stage)):');
let clockHits = 0; for (const c of CARDS) { const [a, b] = coord(c); const s = Em(1, [a, b]); const s2 = clock(s); const nb = frob(add(add(s2, a), 1)); const target = CARDS.find((x) => coord(x)[0] === a && coord(x)[1] === nb); const expectedStage = ['Seed', 'Bridge', 'Fruition', 'Feedback'][(['Seed', 'Bridge', 'Fruition', 'Feedback'].indexOf(c.S) + 1) % 4]; if (target && target.S === expectedStage && target.house === c.house) clockHits++; }
ok(clockHits === 16, `σ on the Stage coordinate reproduces the canonical within-house Stage order Seed→Bridge→Fruition→Feedback for ${clockHits}/16 cards; on coefficients it is (a,b) ↦ (a, b² + Tr(a) + ω²)`);

console.log('\n== 8.6  The coarse cuts: the two complete 4-bit addresses are the Γ-conjugate pair; the incomplete one is Γ-fixed ==');
const CUTS = [['Fire/Earth | Air/Water', (e) => (['Fire', 'Earth'].includes(e) ? 0 : 1)], ['Fire/Water | Air/Earth', (e) => (['Fire', 'Water'].includes(e) ? 0 : 1)], ['Fire/Air | Water/Earth', (e) => (['Fire', 'Air'].includes(e) ? 0 : 1)]];
for (const [label, cut] of CUTS) { const addrs = new Set(CARDS.map((c) => [c.P, c.A, c.Bel, c.Iel].map(cut).join(''))); const cK = add(alpha.Fire, alpha[label.split('/')[1].split(' ')[0]]); console.log(`  ${label}: ${addrs.size}/16 distinct addresses; the cut's kernel element c = Fire + partner = ${name(cK)} ${cK === 1 ? '(Γ-fixed)' : '(Γ-conjugate pair)'}`); }
ok(new Set(CARDS.map((c) => [c.P, c.A, c.Bel, c.Iel].map(CUTS[2][1]).join(''))).size === 8 && new Set(CARDS.map((c) => [c.P, c.A, c.Bel, c.Iel].map(CUTS[0][1]).join(''))).size === 16 && new Set(CARDS.map((c) => [c.P, c.A, c.Bel, c.Iel].map(CUTS[1][1]).join(''))).size === 16, 'Fresh Mind 2026-10-04 reproduced: Fire/Earth and Fire/Water cuts complete (16), Fire/Air cut incomplete (8) — and the model says why: the incomplete cut is the Γ-fixed element 1 = Air; the complete two are ω and ω²');
// coarse bit effects of V, D, R (Fresh Mind: V flips I only, D flips A+B, R flips B)
const cutFE = CUTS[0][1]; const bits = (c) => [c.P, c.A, c.Bel, c.Iel].map(cutFE).join('');
const flips = (pairs) => { const s = new Set(); for (const c of CARDS) { const t = byId[pairs[c.id]]; if (!t) continue; s.add(bits(c).split('').map((x, i) => (x !== bits(t)[i] ? 'PABI'[i] : '')).join('')); } return [...s].join('/'); };
ok(flips(VERTICAL_PAIRS) === 'I' && flips(DIAGONAL_PAIRS) === 'AB' && flips(REDUCTION_PAIRS) === 'B', `coarse-bit flips: V ${flips(VERTICAL_PAIRS)}, D ${flips(DIAGONAL_PAIRS)}, R ${flips(REDUCTION_PAIRS)} (Fresh Mind's four-bit finding, now consequences of the three translations)`);

console.log('\n== 8.7  The facings of the Generator formula are the slopes ==');
const facing = (e1, e2) => add(alpha[e1], alpha[e2]);
console.log(`  Activity: Fire faces Air → c = ${name(facing('Fire', 'Air'))} (= Stage's slope, Γ-fixed) · Being: Fire faces Water → c = ${name(facing('Fire', 'Water'))} (= Being's slope) · Identity: Fire faces Earth → c = ${name(facing('Fire', 'Earth'))} (= Identity's slope)`);
console.log(`  the Stage pairings as translations of the role line: D (Seed↔Fruition) = +1, V (Seed↔Feedback) = +ω², V∘D (Seed↔Bridge) = +ω — "four of anything can pair three ways": one K* for both`);

console.log('\n== 8.8  The horizons are the three 2+2 splits of the Stage line; Gestalt governance is the alphabet; Soul Growth is k ↦ k·Tr ==');
const Kc = await import(R + 'lib/constants.js');
const stageK = (c) => Em(1, coord(c));
const wheel = CARDS.filter((c) => Kc.WHEEL_WORLD_ASSOCIATION[c.id] === 'Wheel').map((c) => stageK(c)), world = CARDS.filter((c) => Kc.WHEEL_WORLD_ASSOCIATION[c.id] === 'World').map((c) => stageK(c));
ok(wheel.every((k) => tr(k) === 0) && world.every((k) => tr(k) === 1), 'Wheel/World (the 19/21 diagonal horizon) = Tr(Stage): Wheel = {Seed, Fruition} = the Γ-fixed roles {0,1} = F2; World = {Bridge, Feedback} = the conjugate pair {ω, ω²}');
const inner = CARDS.filter((c) => Kc.INNER_OUTER_HORIZON[c.id] === 'inner').map((c) => stageK(c)), outer = CARDS.filter((c) => Kc.INNER_OUTER_HORIZON[c.id] === 'outer').map((c) => stageK(c));
ok(inner.every((k) => [0, W].includes(k)) && outer.every((k) => [1, W2].includes(k)), 'inner/outer (the numbering horizon 2–9 | 11–18) = the split {Seed, Bridge} | {Fruition, Feedback} = cosets of {0, ω}: the cut c = ω (the Fire/Earth cut applied to the role)');
console.log('  the third split {Seed, Feedback} | {Bridge, Fruition} = cosets of {0, ω²} is the Vertical pairing: the three horizons of the Stage line are the three c ∈ K* (Fresh Mind\'s "diagonal horizon, vertical division, opening/closing arcs")');
const gov = Object.entries(Kc.GOVERNANCE_MAP).filter(([id]) => ['0', '1', '19', '20'].includes(id)).map(([id, g]) => ({ id: Number(id), name: getComponent(Number(id)).name, house: g.house, k: ROLE_K[getComponent(Number(id)).stage || { 0: 'Seed', 1: 'Bridge', 19: 'Fruition', 20: 'Feedback' }[id]] }));
ok(gov.every((g) => alpha[PE[g.house]] === g.k), `Gestalt governance: ${gov.map((g) => `${g.name}(${name(g.k)}) governs ${g.house}(${PE[g.house]})`).join(', ')} — each Soul scalar governs the house of its own element (the alphabet again)`);
const soulGrowth = [0, 1, 19, 20].map((id) => { const t = byId[GROWTH_PAIRS[id]]; const k = { 0: 0, 1: W, 19: 1, 20: W2 }[id]; return { id, name: getComponent(id).name, k, target: t ? t.name : GROWTH_PAIRS[id], ab: t ? coord(t) : null }; });
ok(soulGrowth.every((g) => g.ab && g.ab[0] === g.k && g.ab[1] === g.k), `current Soul Growth: ${soulGrowth.map((g) => `${g.name}(${name(g.k)}) → ${g.target} = ${name(g.k)}·Tr`).join(', ')} — the scalar k sent to the pure law k·Tr, the unique law with scalar part k fixed by Γ-precomposition (the Growth hunt's H3, now as a formula)`);
const portalStage = [10, 21].map((id) => `${getComponent(id).name}: ${JSON.parse(fs.readFileSync('D:/NKYAWebApp/nirmanakaya-reader/lib/data/nirmanakaya_78_definitions.json', 'utf8')).signatures[id].stage}`);
console.log(`  the portals are typed in the record as ${portalStage.join(' / ')}: the two sides of the whole; under V, D and Growth they only exchange (10↔21) — the one nontrivial permutation of a 2-set; Reduction leaves them by the digit rule (10→1, 21→12), which the kernel does not give`);

if (ALL) { console.log('\n== every alphabet (for the selector ledger) =='); for (const r of summary) console.log(`  ${ELEMENTS.map((e) => `${e[0]}=${name(r.alpha[e])}`).join(' ')}  right:${JSON.stringify(r.matches.right)}  labels ${labelScore(r.alpha)}/48`); }
fs.writeFileSync('data/bakeoff/pass3/moonshot_m2.json', JSON.stringify({ cards: CARDS, soulAlphabet: alpha, matches: soul.matches, V, D, R: Rr, growth: Gm }, null, 1));
console.log('\nM2 done; data/bakeoff/pass3/moonshot_m2.json written.');
