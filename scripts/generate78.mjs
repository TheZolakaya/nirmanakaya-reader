// generate78.mjs — THE ALL-ENCOMPASSING SIGNATURE SPEC generator
// Emits lib/data/nirmanakaya_78_definitions.json: every attribute we know for all 78 signatures,
// assembled from the canonical lib sources (single source of truth) + ruled attributes
// (Reader V2 Addendum A, 2026-07-07). Pending rulings A/B/C are carried as explicit flags.
// Run: npx tsx scripts/generate78.mjs

import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { SIGNATURE_INDEX, POSITION_INDEX } from '../lib/signatureIndex.js';
import { BEING_GROUPS, IDENTITY_GROUPS } from '../lib/constants.js';

// ---- ruled/derived tables ----
const GRID_ORDER = [[17, 7, 4, 12], [2, 14, 15, 9], [18, 6, 5, 11], [3, 13, 16, 8]]; // Forty-Fold Seal (canonical)
const QUADRANT = (r, c) => (r < 2 ? (c < 2 ? 'NW' : 'NE') : (c < 2 ? 'SW' : 'SE'));
const VERTICES = { // 4D bit coordinates (tesseract), canonical per /seal
  17:[0,0,0,0], 7:[1,0,0,0], 4:[0,1,0,0], 12:[1,1,0,0],
   2:[0,0,0,1], 14:[1,0,0,1], 15:[0,1,0,1], 9:[1,1,0,1],
  18:[0,0,1,0], 6:[1,0,1,0], 5:[0,1,1,0], 11:[1,1,1,0],
   3:[0,0,1,1], 13:[1,0,1,1], 16:[0,1,1,1], 8:[1,1,1,1],
};
const HOUSE_GENDER = { Mind: 'male', Body: 'male', Spirit: 'female', Emotion: 'female' }; // RULED 2026-07-07
const ROLE_GENDER = { Initiate: 'female', Steward: 'female', Catalyst: 'male', Executor: 'male' }; // via rank-house
const ROLE_RANK_HOUSE = { Initiate: 'Spirit', Catalyst: 'Mind', Steward: 'Emotion', Executor: 'Body' };

const beingOf = {}, identityOf = {}, stageInBeing = {};
for (const [g, def] of Object.entries(BEING_GROUPS)) for (const m of def.members) beingOf[m] = g;
for (const [g, def] of Object.entries(IDENTITY_GROUPS)) for (const m of def.members) identityOf[m] = g;

const reductionChain = (n) => { const chain = [n]; while (n >= 10) { n = Math.floor(n / 10) + (n % 10); chain.push(n); } return chain; };

const gridDataFor = (id) => {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (GRID_ORDER[r][c] === id) {
    const col = GRID_ORDER.map((row) => row[c]);
    const rank = [...col].sort((a, b) => a - b).indexOf(id) + 1;
    return { row: r + 1, column: c + 1, quadrant: QUADRANT(r, c), rankInColumn: rank, rankSquareValue: rank };
  }
  return null;
};

const innerOuter = (sig) => { // RULED: archetypes 0-9 Inner, 11-20 Outer, portals excluded; bounds decade 1-5/6-10; agents inherit
  if (sig.type === 'Archetype') {
    if (sig.id === 10 || sig.id === 21) return 'Portal (outside the split)';
    return sig.id <= 9 ? 'Inner' : 'Outer';
  }
  if (sig.type === 'Bound') return sig.number <= 5 ? 'Inner' : 'Outer';
  // Agent: inherit through associated archetype
  const p = sig.parentArchetypeId;
  if (p === 10 || p === 21) return 'Portal (outside the split)';
  return p <= 9 ? 'Inner' : 'Outer';
};

const genderFor = (sig) => {
  if (sig.type === 'Archetype' || sig.type === 'Bound') {
    if (sig.house === 'Gestalt' || sig.house === 'Portal') return { value: null, pendingRuling: 'A (Gestalt/portal gender)' };
    if (sig.type === 'Bound') return { value: null, pendingRuling: 'B (bound gender route: channel->house->gender, unconfirmed)', provisionalViaChannelHouse: HOUSE_GENDER[{ Fire: 'Spirit', Air: 'Mind', Water: 'Emotion', Earth: 'Body' }[sig.element]] ?? null };
    return { value: HOUSE_GENDER[sig.house] ?? null, pendingRuling: null };
  }
  return { value: ROLE_GENDER[sig.role] ?? null, pendingRuling: null, via: `rank-house ${ROLE_RANK_HOUSE[sig.role]}` };
};

// ---- assemble ----
const out = {};
let stageFlags = [];
for (let id = 0; id <= 77; id++) {
  const s = SIGNATURE_INDEX[id];
  if (!s) { console.error('MISSING id', id); continue; }
  const isArch = s.type === 'Archetype';
  const rec = {
    // Tier 1 — identity
    id: s.id, name: s.name, traditional: s.traditional, class: s.type,
    house: s.house, channel: s.channel, element: s.element,
    decadeNumber: s.number ?? null, numberKeyword: s.numberKeyword ?? null,
    agentRank: s.role ?? null, agentRankHouse: s.role ? ROLE_RANK_HOUSE[s.role] : null,
    associatedArchetype: isArch ? null : s.parentArchetypeId,
    associatedArchetypeName: isArch ? null : s.parentArchetypeName,
    // operation/parity — RULED for archetypes (walk step parity); bounds/agents carry parent's + own-decade parity, semantics FLAGGED
    operation: isArch ? (id % 2 === 0 ? 'Recursion' : 'Polarity') : null,
    parentOperation: isArch ? null : (s.parentArchetypeId % 2 === 0 ? 'Recursion' : 'Polarity'),
    operationNote: isArch ? null : 'FLAG: own-operation semantics for bounds/agents not yet ruled; parentOperation provided',
    innerOuter: innerOuter(s),
    gender: genderFor(s),
    coordinate4D: isArch && beingOf[id] ? {
      practice: s.house, activity: s.channel, being: beingOf[id], identity: identityOf[id],
      bits: VERTICES[id] ?? null,
    } : (isArch ? { practice: s.house, activity: s.channel, being: null, identity: null, bits: null, note: id === 10 || id === 21 ? 'portal — outside 4x4' : 'Gestalt — outside 4x4' } : null),
    elementalDesignator: s.element ?? null,
    digitRootChain: reductionChain(id), digitRoot: reductionChain(id).at(-1),
    majorAssociationByStructure: isArch ? null : s.parentArchetypeId,
    majorAssociationByDecade: (!isArch && s.number != null) ? { id: s.number, name: SIGNATURE_INDEX[s.number]?.name ?? null } : null, // e.g. bound 37 (6 of Swords) -> 6 Compassion
    majorAssociationByReduction: isArch ? null : reductionChain(id).at(-1),
    grid: isArch ? gridDataFor(id) : null,
    creationStepPosition: isArch ? id : null,
    flags: {
      portal: id === 10 || id === 21,
      originalTriplet: id === 9 || id === 10 || id === 11,
      selfPaired: id === 10,
      outsideMirror: id === 21,
      innerOuterHorizon: s.horizon ?? null,       // engine's existing horizon field, preserved
      wheelWorld: s.wheelWorld ?? null,
    },
    stage: s.function ?? null,                    // Seed/Medium/Fruition/Feedback where known
    // Tier 2 — pairwise systems (per-signature resolution)
    corrections: s.corrections ?? null,           // all four pathways pre-resolved (growth/diagonal/vertical/reduction)
    // descriptive canon
    description: s.description ?? null, extended: s.extended ?? null,
    states: s.states ?? null,
    scale: s.scale ?? null, numberHouse: s.numberHouse ?? null, numberSpan: s.numberSpan ?? null,
    domain: s.domain ?? null, nickname: s.nickname ?? null, boundNumbers: s.boundNumbers ?? null,
  };
  if (!rec.stage) stageFlags.push(id);
  out[id] = rec;
}

// ---- assertions (fixtures) ----
const A = (cond, msg) => { if (!cond) { console.error('ASSERT FAIL:', msg); process.exitCode = 1; } };
A(Object.keys(out).length === 78, '78 signatures');
for (let n = 0; n <= 9; n++) A(n + (20 - n) === 20, 'axis');
for (let r = 0; r < 4; r++) A(GRID_ORDER[r].reduce((a, b) => a + b) === 40, 'row 40');
for (let c = 0; c < 4; c++) A(GRID_ORDER.reduce((a, row) => a + row[c], 0) === 40, 'col 40');
const sixteen = Object.values(out).filter((r) => r.coordinate4D?.bits);
A(sixteen.length === 16, '16 manifest coords');
A(out[10].flags.portal && out[21].flags.outsideMirror && out[9].flags.originalTriplet, 'flags');
A(out[5].innerOuter === 'Inner' && out[14].innerOuter === 'Outer' && out[10].innerOuter.startsWith('Portal'), 'inner/outer ruling');

const doc = {
  _meta: {
    title: 'Nirmanakaya 78 — the all-encompassing signature spec',
    version: '1.0.0', generated: new Date().toISOString(),
    provenance: 'Generated from canonical lib sources (archetypes.js, constants.js, corrections.js via signatureIndex.js) + ruled attributes per SPEC_Reader_V2_Addendum_A_Variable_Manifest_2026-07-07. Lib remains single source of truth; regenerate with npx tsx scripts/generate78.mjs. Excel workbooks are NOT a source.',
    pendingRulings: {
      A: 'Gestalt/portal gender — gender.value null on those records',
      B: 'Bound gender route — provisionalViaChannelHouse provided, value null until ruled',
      C: 'Balance Growth System canon tag — growth pathway INCLUDED (shipping since Feb in corrections.js); presentation tag awaits Council',
    },
    flags: { stageMissingForIds: stageFlags, note: stageFlags.length ? 'Stage attribute absent for these ids — pull all-78 stage table from V9; do not guess (Addendum A Tier1 item 17).' : 'stage present for all 78' },
  },
  positions: POSITION_INDEX,
  signatures: out,
};

mkdirSync(new URL('../lib/data/', import.meta.url), { recursive: true });
const target = new URL('../lib/data/nirmanakaya_78_definitions.json', import.meta.url);
writeFileSync(target, JSON.stringify(doc, null, 2));
copyFileSync(target, 'D:/Nirmanakaya_Wiki/nirmanakaya_78_definitions.json');
console.log(`WROTE ${Object.keys(out).length} signatures + ${Object.keys(POSITION_INDEX).length} positions.`);
console.log(`Stage missing for ${stageFlags.length} ids${stageFlags.length ? ': ' + stageFlags.join(',') : ''}`);
console.log('Copies: lib/data/nirmanakaya_78_definitions.json + D:/Nirmanakaya_Wiki/');
