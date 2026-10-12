// M3 — PHASES 9–12: THE TYPED CATALOG FROM THE KERNEL'S CANONICAL OBJECTS, AND THE COMPARISON WITH THE RECORD'S 78.
// The model has exactly three canonical finite sets of laws, nested by scale:  F2 = {0,1} (the ground field, Γ-fixed scalars)  ⊂  K (the four
// roles as scalars)  ⊂  A = End_F2(T) (the sixteen response laws).  Three catalog rules are SUPPLIED and declared here:
//   C1 (archetype = law, three scales kept as separate types):  Archetypes = F2 ⊔ K ⊔ A  → 2 + 4 + 16 = 22
//   C2 (bound = an oriented side of a law; the ground has no sides):  Bounds = (K ⊔ A) × {inner, outer}  → 2 × 20 = 40
//   C3 (agent = a manifest law acting, the gerund; only the manifest acts):  Agents = A  → 16
// Then the record's own catalog is read and the typed structure compared, cell by cell.
//   npx tsx scripts/moonshot/m3_catalog.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, tr, name, laws, SOUL_ALPHABET, ROLE_K, elementOfK } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { getComponent, GROWTH_PAIRS, VERTICAL_PAIRS, DIAGONAL_PAIRS, REDUCTION_PAIRS } = await import(R + 'lib/corrections.js');
const Kc = await import(R + 'lib/constants.js');
const defs = JSON.parse(fs.readFileSync('D:/NKYAWebApp/nirmanakaya-reader/lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const S = defs.signatures;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const alpha = SOUL_ALPHABET, E = elementOfK(alpha);
const HOUSE_OF = { Fire: 'Spirit', Air: 'Mind', Water: 'Emotion', Earth: 'Body' }, CHANNEL_OF = { Fire: 'Intent', Air: 'Cognition', Water: 'Resonance', Earth: 'Structure' };
const PE = { Spirit: 'Fire', Mind: 'Air', Emotion: 'Water', Body: 'Earth' }, AE = { Intent: 'Fire', Cognition: 'Air', Resonance: 'Water', Structure: 'Earth' };

console.log('== PHASE 9 — 22 ==');
// the model's three scales
const ground = [0, 1];                      // F2
const scalars = K;                          // K
const manifest = laws();                    // A
console.log(`  F2 = {${ground.map(name).join(', ')}}  K = {${scalars.map(name).join(', ')}}  A = sixteen laws (a,b)`);
ok(ground.length + scalars.length + manifest.length === 22, '2 + 4 + 16 = 22 under C1 (three scales as three types)');
// the record: 2 portals, 4 Gestalt, 16 manifest
const rec = Object.values(S);
const archetypes = rec.filter((s) => s.class === 'Archetype'), bounds = rec.filter((s) => s.class === 'Bound'), agents = rec.filter((s) => s.class === 'Agent');
const portals = archetypes.filter((s) => s.house === 'Portal'), gestalt = archetypes.filter((s) => s.house === 'Gestalt'), manifestR = archetypes.filter((s) => !['Portal', 'Gestalt'].includes(s.house));
ok(portals.length === 2 && gestalt.length === 4 && manifestR.length === 16 && archetypes.length === 22, `the record: ${portals.length} portals, ${gestalt.length} Gestalt, ${manifestR.length} manifest = ${archetypes.length} archetypes`);
console.log(`  portals typed as: ${portals.map((p) => `${p.name} (${p.stage})`).join(', ')} — the two sides of the whole (ingress/egress); the model's F2 = {0, 1} = {before distinction, after exhaustive distinction}`);
// Gestalt ↔ K via the Soul row: stage of each Gestalt archetype and its element in the Soul row
const gestaltK = gestalt.map((g) => ({ name: g.name, stage: g.stage, k: ROLE_K[g.stage], element: E[ROLE_K[g.stage]] }));
ok(gestaltK.every((g) => g.k !== undefined) && new Set(gestaltK.map((g) => g.k)).size === 4, `Gestalt ↔ K: ${gestaltK.map((g) => `${g.name}=${g.stage}=${name(g.k)}=${g.element}`).join(', ')}`);
// the Gestalt's bounds live in the suit of its own element (channel = its own scalar)
const gestaltBounds = bounds.filter((b) => b.house === 'Gestalt');
ok(gestaltBounds.length === 8 && gestaltBounds.every((b) => { const g = gestaltK.find((x) => x.name === b.associatedArchetypeName); return g && CHANNEL_OF[g.element] === b.channel && [1, 10].includes(b.decadeNumber); }), 'each Gestalt archetype owns the 1 and the 10 of the suit of its own element (Potential→Wands/Intent, Will→Pentacles/Structure, Actualization→Swords/Cognition, Recognition→Cups/Resonance): the Gestalt row of the bound table is k ↦ (Gestalt, k)');

console.log('\n== PHASE 10 — 40 ==');
const sides = ['inner', 'outer'];
const modelBounds = [...scalars.map((k) => ({ kind: 'K', k })), ...manifest.map(([a, b]) => ({ kind: 'A', a, b }))].flatMap((anchor) => sides.map((side) => ({ anchor, side })));
ok(modelBounds.length === 40, '2 × (4 + 16) = 40 under C2 (two oriented sides per non-ground law)');
// the record's bound grid: channel × house(5) × polarity, with the house↔number dictionary 1/10 Gestalt, 2/9 Spirit, 3/8 Mind, 4/7 Emotion, 5/6 Body
const NUM_HOUSE = { 1: 'Gestalt', 2: 'Spirit', 3: 'Mind', 4: 'Emotion', 5: 'Body', 6: 'Body', 7: 'Emotion', 8: 'Mind', 9: 'Spirit', 10: 'Gestalt' };
ok(bounds.length === 40 && bounds.every((b) => NUM_HOUSE[b.decadeNumber] === b.house && b.innerOuter === (b.decadeNumber <= 5 ? 'Inner' : 'Outer')), 'the record\'s 40 bounds = 4 suits × 10 numbers; number → house is the palindrome 1/10 Gestalt, 2/9 Spirit, 3/8 Mind, 4/7 Emotion, 5/6 Body; 1–5 inner, 6–10 outer');
const manifestBounds = bounds.filter((b) => b.house !== 'Gestalt');
ok(manifestBounds.every((b) => { const parent = S[b.associatedArchetype]; return parent && parent.house === b.house && parent.channel === b.channel; }), 'every manifest bound belongs to the manifest archetype of its (house, channel): the bound is a SIDE of that law');
const perArch = {}; for (const b of bounds) (perArch[b.associatedArchetype] ||= []).push(b.innerOuter);
ok(Object.keys(perArch).length === 20 && Object.values(perArch).every((v) => v.length === 2 && v.includes('Inner') && v.includes('Outer')), 'exactly two bounds per non-portal archetype (one Inner, one Outer) for all 20; none for the portals');
console.log('  model dictionary: bound (law, side) ↔ record bound (suit = the law\'s twist coefficient b read as a channel, number = the house of its scalar part a with the side)');
// verify: the manifest bound's suit is the parent's channel (= b) and the inner/outer side has two numbers per house: this is the full product (K ⊔ A) × 2 with a number dictionary
const numbersByHouse = {}; for (const b of manifestBounds) (numbersByHouse[b.house] ||= new Set()).add(b.decadeNumber);
console.log('  numbers per house:', Object.entries(numbersByHouse).map(([h, s]) => `${h}: {${[...s].sort((x, y) => x - y).join(',')}}`).join('  '), ' — a supplied numbering dictionary on the sides (not generated here)');

console.log('\n== PHASE 11 — 16 Agents ==');
ok(agents.length === 16, 'the record has 16 agents');
const RANK_HOUSE = Object.fromEntries(Object.entries(Kc.ROLE_PROPERTIES).map(([r, p]) => [r, p.domain]));
ok(agents.every((g) => RANK_HOUSE[g.agentRank] === g.house && S[g.associatedArchetype].house === g.house && S[g.associatedArchetype].channel === g.channel), `agent (rank, suit) ↔ manifest (house(rank), channel): ranks are house labels — ${Object.entries(RANK_HOUSE).map(([r, h]) => `${r}=${h}`).join(', ')}; every agent is its parent law "as behavior" (the record's own words: "X-as-behavior")`);
ok(new Set(agents.map((g) => g.associatedArchetype)).size === 16 && agents.every((g) => !['Gestalt', 'Portal'].includes(S[g.associatedArchetype].house)), 'one agent per manifest law, none at Gestalt or the portals (C3: only the manifest acts)');
console.log('  model dictionary: Agent(L) = the law L as a move (the translation M ↦ M + L of the manifest field; A acts on itself by addition — a theorem); rank = the house of L\'s scalar part a, suit = L\'s twist part b');

console.log('\n== PHASE 12 — 78 ==');
ok(22 + 40 + 16 === 78 && rec.length === 78, `K0 + C1 + C2 + C3 (+ the dictionaries) ⇒ 22 + 40 + 16 = 78; the record has ${rec.length} signatures in three disjoint classes (${archetypes.length}/${bounds.length}/${agents.length})`);
// the operations on the portals
ok([VERTICAL_PAIRS, DIAGONAL_PAIRS, GROWTH_PAIRS].every((P) => P[10] === 21 && P[21] === 10), 'V, D and Growth exchange the two portals (10↔21): the only nontrivial permutation of the 2-set F2');
console.log(`  Reduction on the portals and the Soul follows the numbering (±9 / +18 digit rule): 10→${REDUCTION_PAIRS[10]} (${getComponent(REDUCTION_PAIRS[10]).name}), 21→${REDUCTION_PAIRS[21]} (${getComponent(REDUCTION_PAIRS[21]).name}), 0→${REDUCTION_PAIRS[0]}, 1→${REDUCTION_PAIRS[1]}, 19→${REDUCTION_PAIRS[19]}, 20→${REDUCTION_PAIRS[20]} — NOT generated by the kernel: a supplied numbering rule (within the manifest it is the translation +ω·Tr, which the kernel does give)`);
// the Soul (Gestalt) operations: V and D within K, R and G into the manifest
const soulOps = [0, 1, 19, 20].map((id) => ({ id, name: getComponent(id).name, V: getComponent(VERTICAL_PAIRS[id]).name, D: getComponent(DIAGONAL_PAIRS[id]).name, R: getComponent(REDUCTION_PAIRS[id]).name, G: getComponent(GROWTH_PAIRS[id]).name }));
console.log('  the Soul scale\'s operations:', soulOps.map((o) => `${o.name}: V→${o.V} D→${o.D} R→${o.R} G→${o.G}`).join(' | '));
const roleK = { 0: 0, 1: W, 19: 1, 20: W2 };
ok([0, 1, 19, 20].every((id) => roleK[VERTICAL_PAIRS[id]] === add(roleK[id], W2)) && [0, 1, 19, 20].every((id) => roleK[DIAGONAL_PAIRS[id]] === add(roleK[id], 1)), 'on K the Soul Vertical is +ω² (Seed↔Feedback) and the Soul Diagonal is +1 (Seed↔Fruition): the same two translations of the role line as in every manifest house');
console.log(`  Soul Reduction: ${soulOps.map((o) => `${o.name}→${o.R}`).join(', ')} — leaves K into the manifest (a supplied map in the record; see the ledger)`);
fs.writeFileSync('data/bakeoff/pass3/moonshot_m3.json', JSON.stringify({ gestaltK, soulOps, numbersByHouse: Object.fromEntries(Object.entries(numbersByHouse).map(([h, s]) => [h, [...s]])), rankHouse: RANK_HOUSE }, null, 1));
console.log('\nM3 done.');
