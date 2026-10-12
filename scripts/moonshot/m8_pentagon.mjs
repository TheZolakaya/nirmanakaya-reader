// M8 — THE PENTAGON IS THE CLOCK WITH THE SOUL INSERTED; THE SEAL AND "THE VEIL IS FIRE" FIX THE ALPHABET AND THE COOLING ORDER.
// Claims checked: (1) the Seal's column order Spirit-Emotion-Mind-Body = Fire-Water-Air-Earth = 0, ω², 1, ω is the inverse clock σ⁻¹ on K;
// (2) the founder's star trace Soul-Spirit-Mind-Emotion-Body is the Möbius map s(t) = ω/(t+ω) on P¹(K) with Soul = ∞, of order 5, and the
// circle Spirit-Emotion-Soul-Mind-Body is s²; (3) inserting the Soul into the inverse clock at each of its four gaps gives four pentagons;
// their stars restricted to K give four cooling orders; the Seal is magic for exactly two of them, and "Fire first" picks the canonical one;
// (4) with cooling and columns canonical, the Seal is magic for exactly the four translates of the Soul-row alphabet, and "the Veil is Fire"
// (0 ↦ Fire) picks the Soul row — so GIVEN the pentagon's two orderings (cooling, columns), the Seal + Seed = Fire pin the Soul row, and January's two rules hold as consequences.
//   npx tsx scripts/moonshot/m8_pentagon.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, inv, name, SOUL_ALPHABET, ROLE_K, ELEMENTS, perms, clock } from './f4.mjs';
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const INF = 'inf';
const alpha = SOUL_ALPHABET; const el = Object.fromEntries(Object.entries(alpha).map(([e, k]) => [k, e]));
const HOUSE_OF = { Fire: 'Spirit', Air: 'Mind', Water: 'Emotion', Earth: 'Body' };
const show = (seq) => seq.map((x) => (x === INF ? 'Soul' : HOUSE_OF[el[x]])).join('→');

console.log('== 1. the circle on the four manifest houses is the inverse clock ==');
const sigmaInv = (x) => add(frob(x), W2);
const circleK = [0, W2, 1, W]; // Spirit, Emotion, Mind, Body (the Seal's columns; the counterclockwise circle without the Soul)
ok(circleK.every((x, i) => sigmaInv(x) === circleK[(i + 1) % 4]), `Fire→Water→Air→Earth (${show(circleK)}) is x ↦ x² + ω² = σ⁻¹: the pentagon's circle walk is the role clock run backwards`);
const cooling = [0, 1, W2, W]; // Fire, Air, Water, Earth
const coolMap = (x) => add(mul(W, frob(x)), 1);
ok(cooling.every((x, i) => coolMap(x) === cooling[(i + 1) % 4]), `the cooling order Fire→Air→Water→Earth is x ↦ ω·x² + 1 = ω·σ⁻¹(x): the star restricted to the four, the inverse clock scaled by Will`);

console.log('\n== 2. the star and the circle on P¹(K) with Soul = ∞ ==');
const mobius = ([a, b, c, d]) => (t) => { if (t === INF) return c === 0 ? INF : mul(a, inv(c)); const den = add(mul(c, t), d); const numr = add(mul(a, t), b); return den === 0 ? INF : mul(numr, inv(den)); };
const s = mobius([0, W, 1, W]);       // s(t) = ω/(t + ω)
const starSeq = [INF]; for (let i = 0; i < 4; i++) starSeq.push(s(starSeq[i]));
ok(starSeq.join() === [INF, 0, 1, W2, W].join() && s(W) === INF, `the star s(t) = ω/(t+ω): ${show(starSeq)}→Soul — the founder's first stroke (Soul→Spirit) and the cooling order, order 5`);
const s2 = (t) => s(s(t)); const circSeq = [0]; for (let i = 0; i < 4; i++) circSeq.push(s2(circSeq[i]));
ok(circSeq.join() === [0, W2, INF, 1, W].join(), `s² is the circle: ${show(circSeq)}→Spirit — the counterclockwise walk, skip-two of the star, with the Soul between Emotion and Mind`);
const c = mobius([1, W, 1, W2]);      // c(t) = (t+ω)/(t+ω²)
ok(K.concat([INF]).every((t) => c(t) === s2(t)), 'the circle as a Möbius map is c(t) = (t+ω)/(t+ω²), and c = s²; s = c³');

console.log('\n== 3. four ways to insert the Soul into the inverse clock; the Seal keeps two; "Fire first" keeps one ==');
// the inverse clock on K as a cycle: 0 → ω² → 1 → ω → 0; insert ∞ in each gap; the star is the cube of that 5-cycle; its restriction to K is a cooling order
const cycleInv = [0, W2, 1, W];
const sealMagic = (coolingOrder, colsOrder) => { // reuse m7's formula; rows = channels in coolingOrder, cols = houses in colsOrder
  const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]);
  const rank = Object.fromEntries(coolingOrder.map((k, i) => [k, i + 1]));
  const num = {}; for (const h of K) for (const ch of K) { const st = add(add(frob(ch), h), 1); const t = T1.has(st) ? 1 : 0; const N = 2 * rank[h] + t; num[`${h}|${ch}`] = INNER.has(st) ? N : 20 - N; }
  const g = coolingOrder.map((ch) => colsOrder.map((h) => num[`${h}|${ch}`]));
  const sums = []; for (let i = 0; i < 4; i++) sums.push(g[i].reduce((p, q) => p + q, 0)); for (let j = 0; j < 4; j++) sums.push(g.map((r) => r[j]).reduce((p, q) => p + q, 0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) sums.push(g[i][j] + g[i][(j + 1) % 4] + g[(i + 1) % 4][j] + g[(i + 1) % 4][(j + 1) % 4]);
  return sums.every((x) => x === 40);
};
const results = [];
for (let gap = 0; gap < 4; gap++) {
  const five = [...cycleInv.slice(0, gap + 1), INF, ...cycleInv.slice(gap + 1)]; // ∞ inserted after position gap
  const next = (t) => five[(five.indexOf(t) + 1) % 5];
  const cube = (t) => next(next(next(t)));
  const star = [INF]; for (let i = 0; i < 4; i++) star.push(cube(star[i]));
  const coolingOrder = star.slice(1); // the star restricted to K, read after the Soul
  const magic = sealMagic(coolingOrder, circleK);
  results.push({ gap, five, coolingOrder, magic });
  console.log(`  Soul after ${five[gap] === INF ? '?' : HOUSE_OF[el[five[gap]]]} in the circle: pentagon ${show(five)}; star → cooling ${coolingOrder.map((k) => el[k]).join('-')}; Seal magic: ${magic}`);
}
ok(results.filter((r) => r.magic).length === 2, 'the Seal is magic for exactly two of the four Soul positions');
const fireFirst = results.filter((r) => r.magic && r.coolingOrder[0] === alpha.Fire);
ok(fireFirst.length === 1 && fireFirst[0].coolingOrder.join() === cooling.join(), `"Fire first" (the Veil leads) picks one: the Soul between Emotion and Mind, cooling Fire-Air-Water-Earth — the canonical pentagon`);
ok(fireFirst[0].five.join() === [0, W2, INF, 1, W].join(), 'and that pentagon is the founder\'s: Spirit, Emotion, Soul, Mind, Body counterclockwise; forward (the clock) the Soul sits between Fruition and Feedback');

console.log('\n== 4. the Seal and "the Veil is Fire" select the alphabet, GIVEN the cooling order and the columns ==');
// vary the alphabet (elements → K); build Stage from the kernel; the numbering by the formula; test the canonical Seal
const sealForAlphabet = (al) => { const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]); const coolE = ['Fire', 'Air', 'Water', 'Earth'], colsE = ['Fire', 'Water', 'Air', 'Earth']; const rank = Object.fromEntries(coolE.map((e, i) => [e, i + 1])); const num = {}; for (const h of ELEMENTS) for (const ch of ELEMENTS) { const st = add(add(frob(al[ch]), al[h]), 1); const t = T1.has(st) ? 1 : 0; const N = 2 * rank[h] + t; num[`${h}|${ch}`] = INNER.has(st) ? N : 20 - N; } const g = coolE.map((ch) => colsE.map((h) => num[`${h}|${ch}`])); const sums = []; for (let i = 0; i < 4; i++) sums.push(g[i].reduce((p, q) => p + q, 0)); for (let j = 0; j < 4; j++) sums.push(g.map((r) => r[j]).reduce((p, q) => p + q, 0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) sums.push(g[i][j] + g[i][(j + 1) % 4] + g[(i + 1) % 4][j] + g[(i + 1) % 4][(j + 1) % 4]); return sums.every((x) => x === 40); };
const alphabets = perms(K).map((p) => Object.fromEntries(ELEMENTS.map((e, i) => [e, p[i]])));
const magicAlphas = alphabets.filter(sealForAlphabet);
const isTranslate = (al) => K.some((k) => ELEMENTS.every((e) => al[e] === add(alpha[e], k)));
ok(magicAlphas.length === 4 && magicAlphas.every(isTranslate), `with the canonical cooling and columns, the Seal is magic for exactly ${magicAlphas.length} alphabets, all translates α + k of the Soul row (the Seal sees only differences)`);
const veilFire = magicAlphas.filter((al) => al.Fire === 0);
ok(veilFire.length === 1 && ELEMENTS.every((e) => veilFire[0][e] === alpha[e]), '"the Veil is Fire" (0 ↦ Fire, i.e. Potential wears Fire) picks the Soul row: Fire 0, Air 1, Earth ω, Water ω²');
const soulRow = Object.fromEntries(Object.entries(ROLE_K).map(([role, k]) => [role, el[k]]));
ok(soulRow.Seed === 'Fire' && soulRow.Bridge === 'Earth' && soulRow.Fruition === 'Air' && soulRow.Feedback === 'Water', `the Soul row follows: Seed ${soulRow.Seed}, Bridge ${soulRow.Bridge}, Fruition ${soulRow.Fruition}, Feedback ${soulRow.Feedback} — given the pentagon's two orderings, January's constraints hold as consequences`);
// January's two rules as theorems: Soul node channel pairs bracket (ranks sum 4 and 6); Soul diagonal channel sums 3 and 7
const rankOf = { Fire: 1, Air: 2, Water: 3, Earth: 4 };
const nodeA = rankOf[soulRow.Seed] + rankOf[soulRow.Feedback], nodeB = rankOf[soulRow.Bridge] + rankOf[soulRow.Fruition], diagA = rankOf[soulRow.Seed] + rankOf[soulRow.Fruition], diagB = rankOf[soulRow.Bridge] + rankOf[soulRow.Feedback];
ok([nodeA, nodeB].sort().join() === '4,6' && diagA === 3 && diagB === 7, `January's constraints hold as consequences: Soul node channel sums ${nodeA} and ${nodeB} (bracketing the manifest's 5, 5); Soul diagonal channel sums ${diagA} and ${diagB} (pointing at World and Wheel)`);
fs.writeFileSync('data/bakeoff/pass3/moonshot_m8.json', JSON.stringify({ circleIsInverseClock: true, star: starSeq, circle: circSeq, gaps: results, magicAlphabets: magicAlphas, soulRow }, null, 1));
console.log('\nM8 done; data/bakeoff/pass3/moonshot_m8.json written.');
