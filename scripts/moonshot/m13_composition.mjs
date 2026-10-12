// M13 — PAST THE RECORD: THE SIXTEEN MULTIPLY (True, 2026-10-12, at max).
// The manifest archetypes are the sixteen additive laws L(x) = a·x + b·x² on the four. Laws compose: apply one after another and the result is
// another law. The record uses one composition already (Growth on the mixed cards is L ↦ L∘Γ₀, composing with the Frobenius). The kernel says
// every pair composes. This script writes the whole table in the record's names, finds its structure (identity, zero, the invertible six, the
// singular nine, idempotents, nilpotents, what commutes), checks the one composition the record already has, and leaves the rest as predictions.
//   npx tsx scripts/moonshot/m13_composition.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, laws, compose, rank, image, kernel, name, SOUL_ALPHABET, elementOfK } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { GROWTH_PAIRS } = await import(R + 'lib/corrections.js');
const defs = JSON.parse(fs.readFileSync('D:/NKYAWebApp/nirmanakaya-reader/lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const rec = Object.values(defs.signatures); const archetypes = rec.filter((s) => s.class === 'Archetype');
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const alpha = SOUL_ALPHABET, E = elementOfK(alpha);
const HOUSE_OF = { Fire: 'Spirit', Air: 'Mind', Water: 'Emotion', Earth: 'Body' }, CHANNEL_OF = { Fire: 'Intent', Air: 'Cognition', Water: 'Resonance', Earth: 'Structure' };
const cardOf = ([a, b]) => archetypes.find((s) => s.house === HOUSE_OF[E[a]] && s.channel === CHANNEL_OF[E[b]]); // house = a, channel = b (m3's dictionary)
const nm = (L) => { const c = cardOf(L); return `${c.name} (${c.id})`; };
const short = (L) => `${cardOf(L).id}`;
const all = laws(); const key = (L) => L.join(',');
const add2 = ([a, b], [c, d]) => [add(a, c), add(b, d)]; // the additive structure the record's corrections use

console.log('== 1. the special laws, in the record\'s names ==');
const ZERO = [0, 0], ID = [1, 0], FROB = [0, 1], TR = [1, 1];
ok(cardOf(ZERO).id === 17 && cardOf(ID).id === 4 && cardOf(FROB).id === 2 && cardOf(TR).id === 15, `zero = ${nm(ZERO)} (the Star), identity = ${nm(ID)} (the Emperor), the Frobenius (the G-force) = ${nm(FROB)} (the High Priestess), the trace x + x² = ${nm(TR)} (the Devil)`);
const invertible = all.filter((L) => rank(L) === 2), singular = all.filter((L) => rank(L) === 1);
console.log(`  invertible six: ${invertible.map(nm).join(', ')}`);
console.log(`  singular nine: ${singular.map(nm).join(', ')}`);
ok(invertible.length === 6 && singular.length === 9, '1 + 9 + 6: the zero, nine that collapse the four to a pair, six that permute it (the Spirit house and the Intent channel without their shared zero)');
// the Intent channel = scalings x ↦ a x (b = 0); the Spirit house = twists x ↦ b x² (a = 0)
ok(all.filter(([a, b]) => b === 0).every((L) => cardOf(L).channel === 'Intent') && all.filter(([a, b]) => a === 0).every((L) => cardOf(L).house === 'Spirit'), 'the Intent channel is the four scalings x ↦ a·x (Inspiration 0, Order 1, Drive ω, Sacrifice ω²); the Spirit house is the four twists x ↦ b·x² (Inspiration, Wisdom, Nurturing, Imagination)');

console.log('\n== 2. the table: row ∘ column (the column acts first) ==');
const order = [...all].sort((p, q) => cardOf(p).id - cardOf(q).id);
console.log('      ' + order.map((L) => short(L).padStart(3)).join(''));
for (const P of order) console.log(short(P).padStart(5) + ' ' + order.map((Q) => short(compose(P, Q)).padStart(3)).join(''));
const table = {}; for (const P of all) for (const Q of all) table[`${key(P)}|${key(Q)}`] = compose(P, Q);
ok(all.every((L) => key(compose(ID, L)) === key(L) && key(compose(L, ID)) === key(L)), 'Authority (the Emperor) is the identity: composing with it changes nothing, either side');
ok(all.every((L) => key(compose(ZERO, L)) === '0,0' && key(compose(L, ZERO)) === '0,0'), 'Inspiration is the void: anything composed with the Star is the Star');
ok(all.every((L) => key(compose(compose(L, FROB), FROB)) === key(L)), 'Wisdom squared is Authority: the G-force undoes itself');

console.log('\n== 3. structure ==');
const idem = all.filter((L) => key(compose(L, L)) === key(L)), nilp = all.filter((L) => key(compose(L, L)) === '0,0' && key(L) !== '0,0'), invol = all.filter((L) => key(compose(L, L)) === '1,0' && key(L) !== '1,0');
console.log(`  idempotents (L∘L = L): ${idem.map(nm).join(', ')}`);
console.log(`  nilpotents (L∘L = the void): ${nilp.map(nm).join(', ')}`);
console.log(`  involutions (L∘L = Authority): ${invol.map(nm).join(', ')}`);
const order3 = invertible.filter((L) => key(compose(L, L)) !== '1,0' && key(compose(compose(L, L), L)) === '1,0');
console.log(`  order three (L∘L∘L = Authority): ${order3.map(nm).join(', ')}`);
ok(idem.length === 8 && nilp.length === 3 && invol.length === 3 && order3.length === 2, 'eight idempotents (the void, the identity, and six projections: each of the three pairs as image with either complementary pair as kernel), three nilpotents, three involutions, two of order three: the structure of the 2×2 matrices over the two-element field, read in the record\'s names');
// commuting pairs
let commuting = 0; const center = all.filter((L) => all.every((M) => key(compose(L, M)) === key(compose(M, L))));
for (const P of all) for (const Q of all) if (key(compose(P, Q)) === key(compose(Q, P))) commuting++;
console.log(`  the center (commutes with everything): ${center.map(nm).join(', ')} · commuting ordered pairs ${commuting}/256`);
ok(center.length === 2, 'only the void and Authority commute with everything: the sixteen are not a commutative world');
// the six as S3: the scalings by ω, ω² (order 3) and the twists (order 2)
console.log(`  the six invertible form S3: rotations ${order3.map(nm).join(' and ')}, reflections ${invol.map(nm).join(', ')}, identity ${nm(ID)}`);

console.log('\n== 4. the one composition the record already has: Growth on the twelve mixed cards is L ↦ L∘Wisdom ==');
const mixed = all.filter(([a, b]) => a !== b); // the record's twelve mixed cards: house ≠ channel
const pures = all.filter(([a, b]) => a === b); // the four pure cards: Inspiration, Abstraction, Compassion, Fortitude (house = channel)
const growthMatch = mixed.filter((L) => GROWTH_PAIRS[cardOf(L).id] === cardOf(compose(L, FROB)).id);
ok(growthMatch.length === 12, `${growthMatch.length}/12 mixed cards: the record's Growth partner is the card composed with Wisdom (the transposition (a, b) ↦ (b, a))`);
console.log(`  on the four pure cards composing with Wisdom fixes each (a scalar times its own Frobenius is itself): ${pures.map((L) => `${cardOf(L).name}→${cardOf(compose(L, FROB)).name}`).join(', ')}; the record's Growth there is the trace step +Tr instead: ${pures.map((L) => `${cardOf(L).name}→${cardOf(add2(L, TR)).name}`).join(', ')} — so composition and Growth part company exactly on the pure cards, where composing with the G-force does nothing`);
const pureGrowth = pures.filter((L) => GROWTH_PAIRS[cardOf(L).id] === cardOf(add2(L, TR)).id);
console.log(`  record check on the pure four: ${pureGrowth.length}/4 have Growth = +Tr (the record's current rule per m2)`);

console.log('\n== 5. predictions: what two cards make ==');
const byId = (id) => all.find((L) => cardOf(L).id === id);
const ex = [[5, 4], [7, 7], [6, 11], [9, 11], [11, 9], [8, 8], [16, 3], [3, 16], [2, 9], [12, 7], [15, 15], [5, 5]];
for (const [p, q] of ex) { const P = byId(p), Q = byId(q); console.log(`  ${nm(Q)} then ${nm(P)}  →  ${nm(compose(P, Q))}`); }
console.log('  reading: "Q then P" is Q applied to a difference, then P applied to the result; the Hermit after Justice is not Justice after the Hermit.');
fs.writeFileSync('data/bakeoff/pass3/moonshot_m13.json', JSON.stringify({ zero: nm(ZERO), identity: nm(ID), frobenius: nm(FROB), invertible: invertible.map(nm), singular: singular.map(nm), idempotents: idem.map(nm), nilpotents: nilp.map(nm), involutions: invol.map(nm), orderThree: order3.map(nm), center: center.map(nm), table: Object.fromEntries(order.map((P) => [cardOf(P).id, Object.fromEntries(order.map((Q) => [cardOf(Q).id, cardOf(compose(P, Q)).id]))])) }, null, 1));
console.log('\nM13 done; data/bakeoff/pass3/moonshot_m13.json written.');
