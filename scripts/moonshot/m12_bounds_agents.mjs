// M12 — WHAT THE SEED PRODUCES, ONE LEVEL DOWN: THE FORTY BOUNDS AND THE SIXTEEN AGENTS FROM THE SAME RANK (True, 2026-10-12, at max).
// The archetype numbering (m7) is: house rank r (Soul 0, then the cooling order 1..4), inner N = 2r + t, outer N = 20 − (2r + t).
// Claim: the bounds and the agents are the SAME rank read two more ways, with no new choice:
//   bound (law, side): inner number r + 1, outer 10 − r  — the rank once, offset to the Ace, mirrored in the decade (polarity, the noun);
//   agent (law):       rank r itself, 1..4, no Soul       — the rank bare (collapse, the gerund);
//   archetype:         2r + t                            — the rank doubled and split by the Stage bit (recursion, the verb).
// Checked against the record: every bound's number, house, suit, parent and span; every agent's rank, house, suit and parent; the role span;
// then the kernel's corrections carried into the bound and agent layers ("the archetype's partner, with the side flipped").
//   npx tsx scripts/moonshot/m12_bounds_agents.mjs
import fs from 'node:fs';
import { K, W, W2, add, mul, frob, laws, name, SOUL_ALPHABET, ROLE_K, elementOfK } from './f4.mjs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { GROWTH_PAIRS, VERTICAL_PAIRS, DIAGONAL_PAIRS, REDUCTION_PAIRS } = await import(R + 'lib/corrections.js');
const defs = JSON.parse(fs.readFileSync('D:/NKYAWebApp/nirmanakaya-reader/lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const S = defs.signatures, rec = Object.values(S);
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const alpha = SOUL_ALPHABET, E = elementOfK(alpha);
const HOUSE_OF = { Fire: 'Spirit', Air: 'Mind', Water: 'Emotion', Earth: 'Body' }, CHANNEL_OF = { Fire: 'Intent', Air: 'Cognition', Water: 'Resonance', Earth: 'Structure' };
const SUIT_OF = { Fire: 'Wands', Air: 'Swords', Water: 'Cups', Earth: 'Pentacles' };
const COOL = ['Fire', 'Air', 'Water', 'Earth']; const rank = Object.fromEntries(COOL.map((e, i) => [e, i + 1])); // Soul = 0
const INNER = new Set([ROLE_K.Seed, ROLE_K.Bridge]), T1 = new Set([ROLE_K.Bridge, ROLE_K.Fruition]);
const stage = (h, c) => add(add(frob(alpha[c]), alpha[h]), 1);
const archNumber = (h, c) => { const s = stage(h, c); const t = T1.has(s) ? 1 : 0; const N = 2 * rank[h] + t; return INNER.has(s) ? N : 20 - N; };
const soulNumber = (c) => { const k = alpha[c]; const t = T1.has(k) ? 1 : 0; return INNER.has(k) ? t : 20 - t; }; // the Soul archetype whose channel element is c
const archetypes = rec.filter((s) => s.class === 'Archetype'), bounds = rec.filter((s) => s.class === 'Bound'), agents = rec.filter((s) => s.class === 'Agent');
const archAt = (house, channel) => archetypes.find((a) => a.house === house && a.channel === channel);

console.log('== 1. one rank, three readings ==');
// the archetype layer (re-checked so this script is end to end)
ok(COOL.every((h) => COOL.every((c) => archAt(HOUSE_OF[h], CHANNEL_OF[c]).id === archNumber(h, c))), 'archetypes: N = 2r + t inner, 20 − (2r + t) outer, reproduces the 16 manifest numbers; the Soul: ' + COOL.map((c) => `${E[alpha[c]] === c ? '' : ''}${CHANNEL_OF[c]}→${soulNumber(c)}`).join(', '));
const soulArch = (c) => archetypes.find((a) => a.id === soulNumber(c)); // the record's Gestalt archetypes carry no channel field; the Soul row names them
const ROLE_NAME = { 0: 'Seed', 2: 'Bridge', 1: 'Fruition', 3: 'Feedback' };
ok(COOL.every((c) => soulArch(c)?.house === 'Gestalt' && soulArch(c)?.stage === ROLE_NAME[alpha[c]]), 'and the four Soul numbers 0, 1, 19, 20 by the same rule with rank 0, each landing on the Gestalt archetype whose Stage is the role its element wears (the Soul row)');
// the bound layer: inner r + 1, outer 10 − r; suit = channel; parent = the archetype at (house, channel)
const boundRule = (houseEl, side) => (side === 'Inner' ? (houseEl ? rank[houseEl] + 1 : 1) : (houseEl ? 10 - rank[houseEl] : 10));
let bNum = 0, bSuit = 0, bParent = 0, bSpan = 0, bStage = 0;
for (const b of bounds) {
  const houseEl = b.house === 'Gestalt' ? null : Object.keys(HOUSE_OF).find((e) => HOUSE_OF[e] === b.house);
  const chanEl = Object.keys(CHANNEL_OF).find((e) => CHANNEL_OF[e] === b.channel);
  if (boundRule(houseEl, b.innerOuter) === b.decadeNumber) bNum++;
  if (b.element === chanEl && b.traditional.endsWith(SUIT_OF[chanEl])) bSuit++;
  const parent = houseEl ? archAt(b.house, b.channel) : soulArch(chanEl);
  if (parent && b.associatedArchetype === parent.id) bParent++;
  const r = houseEl ? rank[houseEl] : 0; if (b.numberSpan === 9 - 2 * r) bSpan++;
  if (parent && b.stage === parent.stage) bStage++;
}
ok(bNum === 40, `bounds: inner number = rank + 1, outer = 10 − rank (the Soul at the Ace and the Ten): ${bNum}/40 numbers`);
ok(bSuit === 40 && bParent === 40, `bounds: the suit is the law's channel and the parent is the law at (house, channel): ${bSuit}/40, ${bParent}/40`);
ok(bSpan === 40, `bounds: the record's numberSpan (outer − inner) is 9 − 2·rank: 9, 7, 5, 3, 1 for Soul, Spirit, Mind, Emotion, Body — ${bSpan}/40`);
ok(bStage === 40, `bounds: each bound carries its law's Stage: ${bStage}/40`);
console.log('  the palindrome: inner + outer = (r + 1) + (10 − r) = 11 for every house; the archetypes\' Vertical pairs sum to 20: the bound layer mirrors in the decade as the archetype layer mirrors in the score');
// the agent layer: rank = house rank; suit = channel; parent = the law
const RANKS = ['Initiate', 'Catalyst', 'Steward', 'Executor']; // Page, Knight, Queen, King
let aRank = 0, aParent = 0;
for (const a of agents) { const houseEl = Object.keys(HOUSE_OF).find((e) => HOUSE_OF[e] === a.house); if (RANKS[rank[houseEl] - 1] === a.agentRank && a.agentRankHouse === a.house) aRank++; const parent = archAt(a.house, a.channel); if (parent && a.associatedArchetype === parent.id) aParent++; }
ok(aRank === 16 && aParent === 16, `agents: rank = house rank in the cooling order (Page Spirit, Knight Mind, Queen Emotion, King Body); suit = channel; parent = the law: ${aRank}/16, ${aParent}/16`);
const { ROLE_PROPERTIES } = await import(R + 'lib/constants.js');
const spanOK = COOL.every((h) => { const r = rank[h]; const role = RANKS[r - 1]; const outer = (19 - 2 * r) + (20 - 2 * r), inner = (2 * r) + (2 * r + 1); return ROLE_PROPERTIES[role].span === outer - inner && outer - inner === 38 - 8 * r && ROLE_PROPERTIES[role].boundNumbers.join() === `${r + 1},${10 - r}`; });
ok(spanOK, 'agents: the record\'s role span (30, 22, 14, 6) is the house\'s outer pair sum minus its inner pair sum, 38 − 8·rank, and the role\'s boundNumbers are the house\'s bound pair: both fall out of the archetype numbering');

console.log('\n== 2. three polarities, three cuts ==');
// archetype inner/outer = the ω-cut of Stage (m7); bound inner/outer = its own side; agent inner/outer: the canon (CANONICAL_78_CORRECTIONS Part VI) says by rank, Page/Knight inner
const canonAgentPolarity = (a) => (['Initiate', 'Catalyst'].includes(a.agentRank) ? 'Inner' : 'Outer');
const lightHeavy = (a) => { const houseEl = Object.keys(HOUSE_OF).find((e) => HOUSE_OF[e] === a.house); return [0, 1].includes(alpha[houseEl]) ? 'Inner' : 'Outer'; }; // F2 = the light pair {Fire, Air}
ok(agents.every((a) => canonAgentPolarity(a) === lightHeavy(a)), 'the canon\'s agent polarity (Page, Knight inner; Queen, King outer) is the LIGHT/HEAVY cut of the house: Fire and Air are F2, the Veil pair; Water and Earth the conjugates — the Γ₀-fixed cut (c = 1)');
const jsonDiffers = agents.filter((a) => a.innerOuter !== canonAgentPolarity(a));
console.log(`  FLAG for the founder: lib/data/nirmanakaya_78_definitions.json gives agents the innerOuter of their parent archetype's NUMBER (generate78.mjs line 45–48), which disagrees with the corrections canon's rank rule on ${jsonDiffers.length}/16 agents: ${jsonDiffers.map((a) => `${a.traditional} (json ${a.innerOuter}, canon ${canonAgentPolarity(a)})`).join('; ')}`);
console.log('  so the three classes carry three different polarities: archetype = the ω-cut of its Stage (Seed, Bridge inner); bound = its own side; agent = the 1-cut of its house (light inner). The ω²-cut of the house is the gender ruling. Three cuts of K, three named polarities of the record.');

console.log('\n== 3. the corrections carried into the bound and agent layers ==');
// kernel translations on the manifest, as archetype ids: V = (0, ω), D = (0, 1), R = (ω, ω) on (house, channel)
const idOf = (h, c) => archAt(HOUSE_OF[h], CHANNEL_OF[c]).id;
const translate = (id, u, v) => { const a = archetypes.find((x) => x.id === id); const h = Object.keys(HOUSE_OF).find((e) => HOUSE_OF[e] === a.house), c = Object.keys(CHANNEL_OF).find((e) => CHANNEL_OF[e] === a.channel); return idOf(E[add(alpha[h], u)], E[add(alpha[c], v)]); };
const manifestIds = archetypes.filter((a) => a.house !== 'Gestalt' && ![10, 21].includes(a.id)).map((a) => a.id);
ok(manifestIds.every((id) => translate(id, 0, W) === VERTICAL_PAIRS[id] && translate(id, 0, 1) === DIAGONAL_PAIRS[id] && translate(id, W, W) === REDUCTION_PAIRS[id]), 'on the 16 manifest archetypes the record\'s Vertical, Diagonal and Reduction partners are the translations (0, ω), (0, 1), (ω, ω) — re-checked here');
// the bound layer, against the LIVE library (lib/corrections.js, which the 2026-10-02 ruling changed; the data file's copies predate it):
// target = the partner archetype's bound with the side flipped (CANONICAL_78_CORRECTIONS: "follow the associated Archetype's path with polarity flip")
const { getFullCorrection } = await import(R + 'lib/corrections.js');
const live = (id) => { const out = {}; for (const status of [1, 2, 3, 4]) { const f = getFullCorrection(id, status); if (!f) continue; const t = f.type ?? f.correctionType; const target = f.targetId ?? f.targetAgentId ?? f.targetBound?.id ?? f.targetAgent?.id; out[t] = { target, isSelf: !!f.isSelf }; } return out; };
const PAIRS = { growth: GROWTH_PAIRS, diagonal: DIAGONAL_PAIRS, vertical: VERTICAL_PAIRS, reduction: REDUCTION_PAIRS };
const boundOf = (parentId, side) => bounds.find((b) => b.associatedArchetype === parentId && b.innerOuter === side);
const flip = (sd) => (sd === 'Inner' ? 'Outer' : 'Inner');
const portal = (id) => id === 10 || id === 21;
const tally = {};
for (const [type, pairs] of Object.entries(PAIRS)) { tally[type] = { match: 0, miss: [], portalRefs: 0 };
  for (const b of bounds) { const L = live(b.id)[type]; if (!L) { tally[type].miss.push(`${b.traditional}: live has no ${type}`); continue; }
    const partner = pairs[b.associatedArchetype]; let predicted;
    if (portal(partner)) { predicted = partner; tally[type].portalRefs++; } // where the family goes to a portal the bound refers to the portal itself (.582)
    else predicted = boundOf(partner, flip(b.innerOuter))?.id;
    if (predicted === L.target) tally[type].match++; else tally[type].miss.push(`${b.traditional} → live ${S[L.target]?.traditional ?? L.target}${L.isSelf ? ' (self)' : ''}, predicted ${S[predicted]?.traditional ?? predicted}`); } }
for (const [type, t] of Object.entries(tally)) console.log(`  bounds ${type.padEnd(9)}: ${t.match}/40 are "the law's partner, side flipped"${t.portalRefs ? ` (${t.portalRefs} refer to a portal, as the .582 ruling says)` : ''}${t.miss.length ? `; misses: ${t.miss.slice(0, 5).join(' · ')}${t.miss.length > 5 ? ` · +${t.miss.length - 5}` : ''}` : ''}`);
ok(tally.diagonal.match === 40 && tally.vertical.match === 40 && tally.reduction.match === 40, 'Diagonal, Vertical and Reduction reach the bound layer with ONE rule, the law\'s partner with the side flipped (portal partners kept as the portal): 120/120');
// growth: where the live bound table and the archetype table disagree, and how
const lag = [];
for (const b of bounds) { const L = live(b.id).growth; const liveParent = S[L.target]?.associatedArchetype; const archParent = GROWTH_PAIRS[b.associatedArchetype]; if (liveParent !== archParent) lag.push({ bound: b.traditional, parent: b.associatedArchetype, parentName: b.associatedArchetypeName, liveParent, archParent, sibling: bounds.find((x) => x.associatedArchetype === b.associatedArchetype && x.id !== b.id) }); }
const pureOld = lag.filter((x) => [17, 8, 15, 6].includes(x.parent));
const siblingSplit = lag.filter((x) => { const sib = x.sibling; const sibLive = S[live(sib.id).growth.target]?.associatedArchetype; return sibLive === GROWTH_PAIRS[sib.associatedArchetype]; });
console.log(`  growth lag, ${lag.length} bounds: ${lag.map((x) => `${x.bound} [${x.parentName}] → live partner ${S[x.liveParent] ? archetypes.find((a) => a.id === x.liveParent)?.name : x.liveParent} (${x.liveParent}), archetype table says ${archetypes.find((a) => a.id === x.archParent)?.name} (${x.archParent})`).join(' · ')}`);
console.log(`  of these, ${pureOld.length} are the bounds of the four PURE cards (Inspiration, Fortitude, Abstraction, Compassion), still paired 17↔8 and 15↔6: the OLD completion (+ω·Tr, which is Reduction's pairing), while GROWTH_PAIRS now pairs them 17↔15 and 8↔6 (+Tr); and ${siblingSplit.length} (${siblingSplit.map((x) => x.bound).join(', ')}) disagree with their own sibling bound, so one archetype has two different Growth partners at the bound layer`);
console.log(`  FLAG for the founder: lib/corrections.js BOUND_GROWTH_TARGETS lags GROWTH_PAIRS on these ${lag.length} bounds; the flip rule gives the consistent table. Proposed entries (for your ruling, not applied): ${lag.map((x) => { const sib = x.sibling; const want = boundOf(GROWTH_PAIRS[x.parent], flip(bounds.find((b) => b.traditional === x.bound).innerOuter)); return `${x.bound} → ${want?.traditional}`; }).join('; ')}`);
ok(tally.growth.match + lag.length === 40, `the ${tally.growth.match} bounds whose live growth agrees with the archetype table all follow the flip rule; the ${lag.length} that do not are exactly the lag — the rule has no other exceptions`);
// the agent layer: target = the partner archetype's agent (one agent per law; no side to flip)
const agentOf = (parentId) => agents.find((a) => a.associatedArchetype === parentId);
const atally = {};
for (const [type, pairs] of Object.entries(PAIRS)) { atally[type] = { match: 0, miss: [] }; for (const a of agents) { const L = live(a.id)[type]; if (!L) { atally[type].miss.push(`${a.traditional}: live has no ${type}`); continue; } const partner = pairs[a.associatedArchetype]; const predicted = portal(partner) ? partner : agentOf(partner)?.id; if (predicted === L.target) atally[type].match++; else atally[type].miss.push(`${a.traditional} → live ${S[L.target]?.traditional ?? L.target}, predicted ${S[predicted]?.traditional ?? predicted}`); } }
for (const [type, t] of Object.entries(atally)) console.log(`  agents ${type.padEnd(9)}: ${t.match}/16${t.miss.length ? `; misses: ${t.miss.slice(0, 4).join(' · ')}` : ''}`);
const allAgents = Object.values(atally).every((t) => t.match === 16);
ok(allAgents, allAgents ? 'every agent correction in the live record is its law\'s partner\'s agent (64/64): the corrections reach the agent layer with no rule at all beyond "the same law"; the agents follow the current archetype table, the bounds lag it' : 'agent misses above');
// the data file's staleness, stated
const stale = bounds.filter((b) => { const j = b.corrections; const L = live(b.id); return j && ((j.balanced?.targetId !== L.growth?.target) || (j.unacknowledged?.targetId !== L.reduction?.target)); }).length;
console.log(`  FLAG for the founder: lib/data/nirmanakaya_78_definitions.json (generated 2026-09-27) still carries pre-.582 bound corrections for ${stale}/40 bounds (Aces and Tens as their own medicine); the live library is right and the data file needs regenerating (npx tsx scripts/generate78.mjs)`);
console.log('\nM12 done.');
