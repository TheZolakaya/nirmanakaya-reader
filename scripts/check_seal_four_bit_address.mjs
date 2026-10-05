// CHECK — Fresh Mind's FOUR-BIT ADDRESS (2026-10-05), a third implementation against the LIVE record (lib/constants.js groups,
// lib/corrections.js pairs and components), not against the package. The claim: ask "Fire or Earth → 0, Air or Water → 1" of each
// manifest position's Practice, Activity, Being and Identity; the four answers are a complete 16-address code; Stage = the agreement
// pattern of the Practice/Being/Identity answers; Vertical flips only Identity, Diagonal flips Activity+Being, Reduction flips only Being;
// all three leave Practice fixed. Controls: Fire/Water|Air/Earth also complete; Fire/Air|Water/Earth gives 8 addresses, even parity.
// ASSUMPTION (flagged): the code assigns no element to the Being and Identity groups. The finding implies Mantle=Earth, Kindle=Fire,
// Vessel=Water, Passage=Air; Composure=Earth, Conviction=Fire, Exploration=Air, Intimacy=Water. That mapping is tested, and every other
// assignment of the four elements to the four groups is tested too, so the report says whether the result depends on the choice.
//   npx tsx scripts/check_seal_four_bit_address.mjs
const { BEING_GROUPS, IDENTITY_GROUPS } = await import('../lib/constants.js');
const { getComponent, VERTICAL_PAIRS, DIAGONAL_PAIRS, REDUCTION_PAIRS } = await import('../lib/corrections.js');

const MANIFEST = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const PRACTICE_EL = { Spirit: 'Fire', Mind: 'Air', Emotion: 'Water', Body: 'Earth' };
const ACTIVITY_EL = { Intent: 'Fire', Cognition: 'Air', Resonance: 'Water', Structure: 'Earth' };
// 2026-10-05: the elements now come from the record itself (founder-ruled via Keel: Kindle Fire, Passage Water, Vessel Air, Mantle Earth;
// Conviction Fire, Intimacy Water, Exploration Air, Composure Earth). The first run of this script GUESSED Vessel Water / Passage Air from
// the names, which reversed the two control cuts; the main result never depended on it. No assumption remains.
const BEING_EL_FM = Object.fromEntries(Object.entries(BEING_GROUPS).map(([k, g]) => [k, g.element]));
const IDENTITY_EL_FM = Object.fromEntries(Object.entries(IDENTITY_GROUPS).map(([k, g]) => [k, g.element]));
for (const [k, v] of [...Object.entries(BEING_EL_FM), ...Object.entries(IDENTITY_EL_FM)]) if (!v) throw new Error(`no element on group ${k} in lib/constants.js`);
const groupOf = (groups, id) => Object.keys(groups).find((g) => groups[g].members.includes(id));
const stageOf = (id) => { for (const g of Object.values(BEING_GROUPS)) for (const [s, m] of Object.entries(g.stages)) if (m === id) return s; };

const dims = (id, beingEl, identityEl) => { const c = getComponent(id); return { P: PRACTICE_EL[c.house], A: ACTIVITY_EL[c.channel], B: beingEl[groupOf(BEING_GROUPS, id)], I: identityEl[groupOf(IDENTITY_GROUPS, id)] }; };
const CUTS = { 'Fire/Earth | Air/Water': (e) => (e === 'Fire' || e === 'Earth' ? 0 : 1), 'Fire/Water | Air/Earth': (e) => (e === 'Fire' || e === 'Water' ? 0 : 1), 'Fire/Air | Water/Earth': (e) => (e === 'Fire' || e === 'Air' ? 0 : 1) };
const addr = (id, cut, bEl, iEl) => { const d = dims(id, bEl, iEl); return [d.P, d.A, d.B, d.I].map(cut); };
const str = (a) => a.join('');

function report(bEl, iEl, label) {
  const out = [];
  const cut = CUTS['Fire/Earth | Air/Water'];
  const table = MANIFEST.map((id) => ({ id, name: getComponent(id).name, a: addr(id, cut, bEl, iEl), stage: stageOf(id) }));
  const uniq = new Set(table.map((t) => str(t.a))).size;
  out.push(`${label}: distinct addresses ${uniq}/16${uniq === 16 ? ' — COMPLETE' : ''}`);
  const named = { Fortitude: '0000', Compassion: '1111', Wisdom: '0100' };
  for (const [n, want] of Object.entries(named)) { const t = table.find((x) => x.name === n); out.push(`  ${n} = ${str(t.a)} (finding says ${want}) ${str(t.a) === want ? 'OK' : 'DIFFERS'}`); }
  // Stage as the agreement pattern of P, B, I
  const stageRule = (a) => { const [P, , B, I] = a; if (P === B && B === I) return 'Seed'; if (P !== B && B === I) return 'Bridge'; if (B !== P && P === I) return 'Fruition'; if (I !== P && P === B) return 'Feedback'; return '?'; };
  const stageOk = table.filter((t) => stageRule(t.a) === t.stage).length;
  out.push(`  Stage from (P,B,I) agreement: ${stageOk}/16 match the record`);
  // the three moves as bit flips
  const flips = (pairs) => { const seen = {}; for (const id of MANIFEST) { const to = pairs[id]; if (!MANIFEST.includes(to)) continue; const a = addr(id, cut, bEl, iEl), b = addr(to, cut, bEl, iEl); const k = ['P', 'A', 'B', 'I'].filter((_, i) => a[i] !== b[i]).join('+') || 'none'; seen[k] = (seen[k] || 0) + 1; } return seen; };
  out.push(`  Vertical flips: ${JSON.stringify(flips(VERTICAL_PAIRS))} (finding: I only)`);
  out.push(`  Diagonal flips: ${JSON.stringify(flips(DIAGONAL_PAIRS))} (finding: A+B)`);
  out.push(`  Reduction flips: ${JSON.stringify(flips(REDUCTION_PAIRS))} (finding: B only)`);
  // controls
  for (const [cname, c] of Object.entries(CUTS)) { if (cname.startsWith('Fire/Earth')) continue; const as = MANIFEST.map((id) => addr(id, c, bEl, iEl)); const u = new Set(as.map(str)).size; const parity = as.every((a) => a.reduce((x, y) => x + y, 0) % 2 === 0) ? 'all even parity' : as.every((a) => a.reduce((x, y) => x + y, 0) % 2 === 1) ? 'all odd parity' : 'mixed parity'; out.push(`  control ${cname}: ${u} distinct, ${parity}`); }
  return { out, uniq, stageOk, table };
}

const fm = report(BEING_EL_FM, IDENTITY_EL_FM, `the record's element map (Being ${JSON.stringify(BEING_EL_FM)}, Identity ${JSON.stringify(IDENTITY_EL_FM)})`);
{ const pure = MANIFEST.map((id) => { const d = dims(id, BEING_EL_FM, IDENTITY_EL_FM); const els = [d.P, d.A, d.B, d.I]; return new Set(els).size === 1 ? `${getComponent(id).name} (${els[0]})` : null; }).filter(Boolean); console.log(`Pure poles (one element in all four dimensions): ${pure.join(', ') || 'none'}`); }
console.log(fm.out.join('\n'));
console.log('\nThe sixteen addresses (P A B I under Fire/Earth=0):');
for (const t of fm.table.sort((x, y) => str(x.a).localeCompare(str(y.a)))) console.log(`  ${str(t.a)}  ${String(t.id).padStart(2)} ${t.name.padEnd(15)} ${t.stage}`);

// every other assignment of the four elements to the Being groups and to the Identity groups (24 × 24 = 576)
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
const ELS = ['Fire', 'Earth', 'Air', 'Water'];
const BG = Object.keys(BEING_GROUPS), IG = Object.keys(IDENTITY_GROUPS);
let complete = 0, completeAndStage = 0, total = 0;
const splitKey = (el, groups) => groups.filter((g) => el[g] === 'Fire' || el[g] === 'Earth').sort().join('+');
const bySplit = {};
for (const pb of perms(ELS)) for (const pi of perms(ELS)) {
  const bEl = Object.fromEntries(BG.map((g, i) => [g, pb[i]])), iEl = Object.fromEntries(IG.map((g, i) => [g, pi[i]]));
  total++; const r = report(bEl, iEl, '');
  if (r.uniq === 16) complete++; if (r.uniq === 16 && r.stageOk === 16) completeAndStage++;
  const k = `Being 0-side {${splitKey(bEl, BG)}} · Identity 0-side {${splitKey(iEl, IG)}}`; bySplit[k] = bySplit[k] || { complete: r.uniq === 16, stage: r.stageOk };
}
console.log(`\nAll ${total} element assignments to the Being and Identity groups: ${complete} give a complete 16-address code; ${completeAndStage} also recover Stage 16/16.`);
console.log('By which two groups sit on the Fire/Earth side (the only thing the first cut sees):');
for (const [k, v] of Object.entries(bySplit)) console.log(`  ${k}: ${v.complete ? 'complete' : 'collides'}, Stage ${v.stage}/16`);
