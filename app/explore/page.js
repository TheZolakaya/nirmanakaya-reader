'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import { BEING_GROUPS, IDENTITY_GROUPS, HOUSES, DIMENSION_VERBS } from '../../lib/constants.js';
import { NEIGHBORHOOD_CANON } from '../../lib/neighborhoods_canon.js';

// === COLORS ===
const C = {
  bg: '#030712', panel: '#0f172a', card: '#111827',
  text: '#e2e8f0', text2: '#94a3b8', text3: '#64748b',
  border: '#1e293b', accent: '#38bdf8',
  Practice: '#4ade80', Activity: '#ef4444', Being: '#fbbf24', Identity: '#a855f7', Stage: '#8b5cf6',
};

// === SHARED VISUALIZATION CONSTANTS ===
const VERTICES = {
  17: { bits: [0,0,0,0], name: 'Inspiration' },
   7: { bits: [1,0,0,0], name: 'Drive' },
   4: { bits: [0,1,0,0], name: 'Order' },
  12: { bits: [1,1,0,0], name: 'Sacrifice' },
   2: { bits: [0,0,0,1], name: 'Wisdom' },
  14: { bits: [1,0,0,1], name: 'Balance' },
  15: { bits: [0,1,0,1], name: 'Abstraction' },
   9: { bits: [1,1,0,1], name: 'Discipline' },
  18: { bits: [0,0,1,0], name: 'Imagination' },
   6: { bits: [1,0,1,0], name: 'Compassion' },
   5: { bits: [0,1,1,0], name: 'Culture' },
  11: { bits: [1,1,1,0], name: 'Equity' },
   3: { bits: [0,0,1,1], name: 'Nurturing' },
  13: { bits: [1,0,1,1], name: 'Change' },
  16: { bits: [0,1,1,1], name: 'Breakthrough' },
   8: { bits: [1,1,1,1], name: 'Fortitude' },
};

const SEEDS = {
  8: { name: 'Fortitude', traditional: 'Strength', paths: {
    Practice: { group: 'Body', verb: 'Embody', color: '#4ade80', seq: [8, 9, 11, 12] },
    Activity: { group: 'Structure', verb: 'Build', color: '#ef4444', seq: [8, 3, 13, 16] },
    Being: { group: 'Mantle', verb: 'Create', color: '#fbbf24', seq: [8, 7, 15, 18] },
    Identity: { group: 'Composure', verb: 'Center', color: '#a855f7', seq: [8, 5, 17, 14] },
  }},
  2: { name: 'Wisdom', traditional: 'High Priestess', paths: {
    Practice: { group: 'Spirit', verb: 'Witness', color: '#4ade80', seq: [2, 3, 17, 18] },
    Activity: { group: 'Cognition', verb: 'Distinguish', color: '#ef4444', seq: [2, 14, 15, 9] },
    Being: { group: 'Torch', verb: 'Understand', color: '#fbbf24', seq: [2, 5, 13, 12] },
    Identity: { group: 'Conviction', verb: 'Act', color: '#a855f7', seq: [2, 7, 11, 16] },
  }},
  4: { name: 'Order', traditional: 'Emperor', paths: {
    Practice: { group: 'Mind', verb: 'Channel', color: '#4ade80', seq: [4, 5, 15, 16] },
    Activity: { group: 'Intent', verb: 'Point', color: '#ef4444', seq: [4, 7, 17, 12] },
    Being: { group: 'Vessel', verb: 'Hold', color: '#fbbf24', seq: [4, 3, 11, 14] },
    Identity: { group: 'Exploration', verb: 'Venture', color: '#a855f7', seq: [4, 9, 13, 18] },
  }},
  6: { name: 'Compassion', traditional: 'Lovers', paths: {
    Practice: { group: 'Emotion', verb: 'Will', color: '#4ade80', seq: [6, 7, 13, 14] },
    Activity: { group: 'Resonance', verb: 'Connect', color: '#ef4444', seq: [6, 5, 11, 18] },
    Being: { group: 'Clearing', verb: 'Release', color: '#fbbf24', seq: [6, 9, 17, 16] },
    Identity: { group: 'Communion', verb: 'Merge', color: '#a855f7', seq: [6, 3, 15, 12] },
  }},
};

const VIZ_STAGES = {
  17: 'Fr', 7: 'Me', 4: 'Se', 12: 'Fb',
   2: 'Se', 14: 'Fb', 15: 'Fr', 9: 'Me',
  18: 'Fb', 6: 'Se', 5: 'Me', 11: 'Fr',
   3: 'Me', 13: 'Fr', 16: 'Fb', 8: 'Se',
};
const VIZ_STAGE_COLORS = { Se: '#22c55e', Me: '#f59e0b', Fr: '#06b6d4', Fb: '#7c3aed' };

const BEING_DEFS = {
  Mantle:   { verb: 'Create',     members: [8, 7, 15, 18] },
  Torch:    { verb: 'Understand', members: [2, 5, 13, 12] },
  Vessel:   { verb: 'Hold',       members: [4, 3, 11, 14] },
  Clearing: { verb: 'Release',    members: [6, 9, 17, 16] },
};
const IDENTITY_DEFS = {
  Composure:   { verb: 'Center',  members: [8, 5, 17, 14] },
  Conviction:  { verb: 'Act',     members: [2, 7, 11, 16] },
  Exploration: { verb: 'Venture', members: [4, 9, 13, 18] },
  Communion:   { verb: 'Merge',   members: [6, 3, 15, 12] },
};

const BEING_LOOKUP = {}, IDENTITY_LOOKUP = {};
Object.entries(BEING_DEFS).forEach(([n, d]) => d.members.forEach(p => { BEING_LOOKUP[p] = { group: n, verb: d.verb }; }));
Object.entries(IDENTITY_DEFS).forEach(([n, d]) => d.members.forEach(p => { IDENTITY_LOOKUP[p] = { group: n, verb: d.verb }; }));

const GRID = {
  17: { row: 0, col: 0 },  7: { row: 0, col: 1 },   4: { row: 0, col: 2 },  12: { row: 0, col: 3 },
   2: { row: 1, col: 0 }, 14: { row: 1, col: 1 },  15: { row: 1, col: 2 },   9: { row: 1, col: 3 },
  18: { row: 2, col: 0 },  6: { row: 2, col: 1 },   5: { row: 2, col: 2 },  11: { row: 2, col: 3 },
   3: { row: 3, col: 0 }, 13: { row: 3, col: 1 },  16: { row: 3, col: 2 },   8: { row: 3, col: 3 },
};
const ROW_LABELS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
const COL_LABELS = ['Spirit', 'Emotion', 'Mind', 'Body'];
const DIMENSION_ORDER = ['Practice', 'Activity', 'Being', 'Identity'];
const OFFSETS = [-6, -2, 2, 6];

// Tesseract constants
const BEING_T = { Mantle: { ids: [8,7,15,18], color: '#fbbf24' }, Torch: { ids: [2,5,13,12], color: '#22d3ee' }, Vessel: { ids: [4,3,11,14], color: '#4ade80' }, Clearing: { ids: [6,9,17,16], color: '#fb7185' } };
const IDENTITY_T = { Composure: { ids: [8,5,17,14], color: '#22d3ee' }, Conviction: { ids: [2,7,11,16], color: '#fbbf24' }, Exploration: { ids: [4,9,13,18], color: '#4ade80' }, Communion: { ids: [6,3,15,12], color: '#fb7185' } };
const PRACTICE_T = { Spirit: { ids: [17,2,18,3], color: '#c084fc' }, Emotion: { ids: [7,14,6,13], color: '#fb7185' }, Mind: { ids: [4,15,5,16], color: '#22d3ee' }, Body: { ids: [12,9,11,8], color: '#4ade80' } };
const STAGE_T = { Seed: { ids: [4,2,6,8], color: '#22c55e' }, Medium: { ids: [7,9,5,3], color: '#f59e0b' }, Fruition: { ids: [17,15,11,13], color: '#06b6d4' }, Feedback: { ids: [12,14,18,16], color: '#7c3aed' } };
const COLOR_MODES = { Being: BEING_T, Identity: IDENTITY_T, Practice: PRACTICE_T, Stage: STAGE_T };
// Group-specific colors: each group gets its own color from its aspect's tesseract color table
const GROUP_COLORS = {
  // Practice groups (from PRACTICE_T)
  Spirit: PRACTICE_T.Spirit.color, Mind: PRACTICE_T.Mind.color, Emotion: PRACTICE_T.Emotion.color, Body: PRACTICE_T.Body.color,
  // Activity groups (distinct colors for channels)
  Intent: '#ef4444', Cognition: '#22d3ee', Resonance: '#f59e0b', Structure: '#4ade80',
  // Being groups (from BEING_T)
  Mantle: BEING_T.Mantle.color, Torch: BEING_T.Torch.color, Vessel: BEING_T.Vessel.color, Clearing: BEING_T.Clearing.color,
  // Identity groups (from IDENTITY_T)
  Composure: IDENTITY_T.Composure.color, Conviction: IDENTITY_T.Conviction.color, Exploration: IDENTITY_T.Exploration.color, Communion: IDENTITY_T.Communion.color,
  // Stage groups (from STAGE_T)
  Seed: STAGE_T.Seed.color, Medium: STAGE_T.Medium.color, Fruition: STAGE_T.Fruition.color, Feedback: STAGE_T.Feedback.color,
};
const EDGE_COLORS = ['#4ade80', '#22d3ee', '#ef4444', '#f59e0b'];

const AFFINE_PLANES = [
  { ids: [17, 7, 5, 11], color: '#f59e0b', label: 'D1' },
  { ids: [2, 14, 16, 8], color: '#ef4444', label: 'D2' },
  { ids: [9, 15, 13, 3], color: '#8b5cf6', label: 'D3' },
  { ids: [12, 4, 6, 18], color: '#22d3ee', label: 'D4' },
];

// Build edges: Hamming distance 1
const EDGES = (() => {
  const ids = Object.keys(VERTICES).map(Number);
  const edges = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = VERTICES[ids[i]].bits, b = VERTICES[ids[j]].bits;
      let diff = -1, count = 0;
      for (let k = 0; k < 4; k++) { if (a[k] !== b[k]) { diff = k; count++; } }
      if (count === 1) edges.push({ from: ids[i], to: ids[j], bit: diff });
    }
  }
  return edges;
})();

// === EXPLORE-SPECIFIC CONSTANTS ===
const FULL_STAGES = {
  17: 'Fruition', 7: 'Medium', 4: 'Seed', 12: 'Feedback',
   2: 'Seed', 14: 'Feedback', 15: 'Fruition', 9: 'Medium',
  18: 'Feedback', 6: 'Seed', 5: 'Medium', 11: 'Fruition',
   3: 'Medium', 13: 'Fruition', 16: 'Feedback', 8: 'Seed',
};
const STAGE_SYMBOLS = { Seed: '\u2600', Medium: '\u263D', Fruition: '\u2600', Feedback: '\u263D' };
const FULL_STAGE_COLORS = { Seed: '#22c55e', Medium: '#f59e0b', Fruition: '#06b6d4', Feedback: '#7c3aed' };

// === STAGE GROUPS ===
const STAGE_GROUPS = {
  Seed:     { name: 'Seed',     verb: 'Initiate', members: [2, 4, 6, 8], description: 'The origin point in each house.' },
  Medium:   { name: 'Medium',   verb: 'Develop',  members: [3, 5, 7, 9], description: 'The developmental midpoint.' },
  Fruition: { name: 'Fruition', verb: 'Complete', members: [11, 13, 15, 17], description: 'The point of completion.' },
  Feedback: { name: 'Feedback', verb: 'Return',   members: [12, 14, 16, 18], description: 'The return and reflection.' },
};

// === TOROIDAL NEIGHBORHOODS (16 × 2×2 blocks, all sum to 40) ===
const NEIGHBORHOODS = {
  // Intent+Cognition row pair — Directed Perception mode
  'Luminous Direction':   { members: [17, 7, 2, 14],  practice: 'Spirit+Emotion',  activity: 'Intent+Cognition',  arc: 'Creation',   mode: 'Directed Perception',  collapses: 'Identity', color: '#f0c040',
    description: 'Inspiration and Drive aim consciousness while Wisdom and Balance discern the path. The visionary fire meets analytical clarity — aspiration with precision. This is where purpose finds its compass.' },
  'Commanded Power':      { members: [7, 4, 14, 15],  practice: 'Emotion+Mind',    activity: 'Intent+Cognition',  arc: 'Intensity',  mode: 'Directed Perception',  collapses: 'Being', color: '#e06050',
    description: 'Drive and Order direct while Balance and Abstraction evaluate. Passion harnessed by structure — the commander who thinks before acting. Authority exercised through understanding, not force.' },
  'Price of Knowing':     { members: [4, 12, 15, 9],  practice: 'Mind+Body',       activity: 'Intent+Cognition',  arc: 'Structure',  mode: 'Directed Perception',  collapses: 'Identity', color: '#50a0e0',
    description: 'Order and Sacrifice aim while Abstraction and Discipline discern. Knowledge earned through constraint — what you must give up to see clearly. The weight of understanding carried by those who do the work.' },
  'Sacred Witness':       { members: [12, 17, 9, 2],  practice: 'Body+Spirit',     activity: 'Intent+Cognition',  arc: 'Wisdom',     mode: 'Directed Perception',  collapses: 'Being', color: '#70d080',
    description: 'Sacrifice and Inspiration direct while Discipline and Wisdom observe. The body\'s devotion meets the spirit\'s sight. To witness without flinching — presence that holds both the beautiful and the terrible.' },
  // Cognition+Resonance row pair — Relational Knowing mode
  'Open Reception':       { members: [2, 14, 18, 6],  practice: 'Spirit+Emotion',  activity: 'Cognition+Resonance', arc: 'Creation',  mode: 'Relational Knowing',  collapses: 'Stage', color: '#f0c040',
    description: 'Wisdom and Balance perceive while Imagination and Compassion feel. The mind opens to what the heart already knows. Receptivity without agenda — allowing truth to arrive rather than hunting it down.' },
  'Anatomy of Relation':  { members: [14, 15, 6, 5],  practice: 'Emotion+Mind',    activity: 'Cognition+Resonance', arc: 'Intensity', mode: 'Relational Knowing',  collapses: 'Identity', color: '#e06050',
    description: 'Balance and Abstraction analyze while Compassion and Culture feel. Dissecting connection to understand it — the risk of losing the living thing while studying its parts. Relationship examined under the microscope.' },
  'Tested Truth':         { members: [15, 9, 5, 11],  practice: 'Mind+Body',       activity: 'Cognition+Resonance', arc: 'Structure', mode: 'Relational Knowing',  collapses: 'Stage', color: '#50a0e0',
    description: 'Abstraction and Discipline think while Culture and Equity feel. Truth that survives testing — not theoretical but proven through lived experience. The bridge between what you believe and what actually works.' },
  'Silent Knowing':       { members: [9, 2, 11, 18],  practice: 'Body+Spirit',     activity: 'Cognition+Resonance', arc: 'Wisdom',    mode: 'Relational Knowing',  collapses: 'Identity', color: '#70d080',
    description: 'Discipline and Wisdom perceive while Equity and Imagination resonate. Knowledge so deep it requires no words. The practitioner who has done the work long enough that understanding is simply present.' },
  // Resonance+Structure row pair — Grounded Holding mode
  'Fertile Transform':    { members: [18, 6, 3, 13],  practice: 'Spirit+Emotion',  activity: 'Resonance+Structure', arc: 'Creation',  mode: 'Grounded Holding',    collapses: 'Identity', color: '#f0c040',
    description: 'Imagination and Compassion connect while Nurturing and Change build. Transformation rooted in care — the compost heap where old forms decompose into new life. Creation that requires getting your hands dirty.' },
  'Relational Crisis':    { members: [6, 5, 13, 16],  practice: 'Emotion+Mind',    activity: 'Resonance+Structure', arc: 'Intensity', mode: 'Grounded Holding',    collapses: 'Being', color: '#e06050',
    description: 'Compassion and Culture feel while Change and Breakthrough materialize. When connection encounters its own limits — the crisis that forces relationship to evolve or die. Love tested by structural reality.' },
  'Load-Bearing Truth':   { members: [5, 11, 16, 8],  practice: 'Mind+Body',       activity: 'Resonance+Structure', arc: 'Structure', mode: 'Grounded Holding',    collapses: 'Identity', color: '#50a0e0',
    description: 'Culture and Equity resonate while Breakthrough and Fortitude hold. Truth that carries weight — the wall that must stand, the promise that must be kept. Structural integrity under real load.' },
  'Gentle Stewardship':   { members: [11, 18, 8, 3],  practice: 'Body+Spirit',     activity: 'Resonance+Structure', arc: 'Wisdom',    mode: 'Grounded Holding',    collapses: 'Being', color: '#70d080',
    description: 'Equity and Imagination connect while Fortitude and Nurturing build. Tending what was given to you — the gardener who maintains without owning, the parent who holds space without controlling. Strength in service of care.' },
  // Structure+Intent row pair (wraps) — Creative Building mode
  'Generative Force':     { members: [3, 13, 17, 7],  practice: 'Spirit+Emotion',  activity: 'Structure+Intent',   arc: 'Creation',  mode: 'Creative Building',   collapses: 'Stage', color: '#f0c040',
    description: 'Nurturing and Change construct while Inspiration and Drive aim. Raw creative power — the moment when building and vision fuse. Not planning to create but creating, now, with everything available.' },
  'Revolution':           { members: [13, 16, 7, 4],  practice: 'Emotion+Mind',    activity: 'Structure+Intent',   arc: 'Intensity', mode: 'Creative Building',   collapses: 'Identity', color: '#e06050',
    description: 'Change and Breakthrough build while Drive and Order direct. The old structure torn down to make way for what must come. Not destruction for its own sake but demolition in service of a clearer blueprint.' },
  'Foundation':           { members: [16, 8, 4, 12],  practice: 'Mind+Body',       activity: 'Structure+Intent',   arc: 'Structure', mode: 'Creative Building',   collapses: 'Stage', color: '#50a0e0',
    description: 'Breakthrough and Fortitude construct while Order and Sacrifice direct. The bedrock layer — what remains after everything unnecessary has been cleared away. Structure that can hold whatever is built on top of it.' },
  'Grace':                { members: [8, 3, 12, 17],  practice: 'Body+Spirit',     activity: 'Structure+Intent',   arc: 'Wisdom',    mode: 'Creative Building',   collapses: 'Identity', color: '#70d080',
    description: 'Fortitude and Nurturing build while Sacrifice and Inspiration aim. Strength surrendered to purpose. The lightest touch carrying the heaviest weight. When doing and being become indistinguishable.' },
};

// === COMBINATORICS: All 80 quadruples summing to 40 ===
// Mixed orbit classification (from Mixed_Quadruples_Analysis_Report.md + follow-up analysis):
// The 40 Mixed quads split into 5 structural families. Quads in the same
// family are "the same shape in different poses" — rotations and flips of
// the tesseract turn any member into any other family member. Quads in
// different families are genuinely different kinds of thing.
// Architectural weight ranges from load-bearing (O₃) to genuine residue (O₂, O₄).
// Names are provisional pending canonical derivation.
const MIXED_ORBITS = {
  O3: {
    name: 'Polarity Crosses',
    count: 4,
    signature: '[2,2,3,3,3,3]',
    color: '#fb7185',
    antipodallyClosed: true,
    weight: 'High',
    weightNote: 'The fifth fundamental Practice operation',
    oneLine: 'The fifth fundamental — 4 quads that saturate a Practice polarity across all Activities.',
    desc: 'Each quad covers all four Activities while confining Practice to a single polar pair. Two quads cross Spirit↔Body (outer polarity: transcendent vs. embodied): {2,8,12,18} and {3,9,11,17}. Two cross Mind↔Emotion (inner polarity: thought vs. feeling): {4,6,14,16} and {5,7,13,15}. Answers: "How does the full four-fold Activity move between the fundamental polar pair?" Antipodally closed. Perfectly balanced in every aspect. Architecturally equal in weight to Rows/Columns/Affines/Neighborhoods/Tetrahedra — the fifth fundamental Practice operation, diagonal rather than axis-aligned. Strongly recommended for promotion to a named category.',
    members: [[2,8,12,18],[3,9,11,17],[4,6,14,16],[5,7,13,15]],
  },
  O1: {
    name: 'Affinity Diagonals',
    count: 8,
    signature: '[1,1,2,2,3,3]',
    color: '#a78bfa',
    antipodallyClosed: true,
    weight: 'Medium-high',
    weightNote: 'Completes the Affine family',
    oneLine: 'The other Affines — 8 planes with Affine structure but non-parallel tiling.',
    desc: 'Every member is an affine 2-plane with the same (1,2,3) weight structure as the canonical Affine family. Difference: the canonical 4 Affines tile the grid in parallel; these 8 are the non-parallel affine planes that still sum to 40. Four live on Spirit+Mind (the "abstract" Practice pair), four on Emotion+Body (the "embodied" Practice pair). Self-contained under the opposite-corner flip — 4 mirror pairs. Not "broken Affines" — these are the other Affines the parallel class doesn\'t reach.',
    members: [[2,5,15,18],[2,5,16,17],[3,4,15,18],[3,4,16,17],[6,9,11,14],[6,9,12,13],[7,8,11,14],[7,8,12,13]],
  },
  O5: {
    name: 'Broken Vessels',
    count: 2,
    signature: '[1,2,2,3,3,4]',
    color: '#dc2626',
    antipodallyClosed: false,
    weight: 'Medium-low',
    weightNote: 'Anomaly worth flagging',
    oneLine: 'Three companions and a stranger — 2 anomaly quads in the receptive Beings.',
    desc: 'The only orbit where three members share a single Being group while one stands alone. {3,11,12,14}: three Vessels (Nurturing, Equity, Balance) with Sacrifice as the lone Torch. {6,8,9,17}: three Clearings (Compassion, Discipline, Inspiration) with Fortitude as the lone Mantle. Both quads center on the "receptive" Beings (Vessel, Clearing) with a single expressive break. Both completely fall apart under the opposite-corner flip — neither survives as a sum-40 quad. Worth a footnote in the canon, not a feature.',
    members: [[3,11,12,14],[6,8,9,17]],
  },
  O2: {
    name: 'Diameter Cluster',
    count: 16,
    signature: '[1,1,2,2,3,4]',
    color: '#5eead4',
    antipodallyClosed: false,
    weight: 'Low',
    weightNote: 'Antipodal-witness residue',
    oneLine: 'Antipodal witness + tight triad — the biggest residue family.',
    desc: 'Every member contains one pair of grid-antipodes (diagonally opposite corners of the 4×4 grid) plus a tight local cluster of three. Largest family of 40 Mixed. The "diameter + cluster" structure: a witness and its far opposite held together with two tightly-neighboring members. Carries a consistent 2110 aspect asymmetry (two members share, one with two others, one alone) that never appears in named categories. 4 members break when flipped to their opposite corners. Probably grouped with Diameter Chain under a parent label like "Antipodal Witness Quads" rather than named individually.',
    members: [[2,6,15,17],[2,7,15,16],[2,11,13,14],[3,5,14,18],[3,6,15,16],[4,5,13,18],[4,5,14,17],[4,9,13,14],[4,11,12,13],[5,8,13,14],[5,9,12,14],[6,7,9,18],[6,7,11,16],[6,7,12,15],[6,8,11,15],[7,8,9,16]],
  },
  O4: {
    name: 'Diameter Chain',
    count: 10,
    signature: '[1,1,2,3,3,4]',
    color: '#f59e0b',
    antipodallyClosed: false,
    weight: 'Low',
    weightNote: 'Antipodal-witness residue, chained',
    oneLine: 'Antipodal witness + two-step chain — secondary residue family.',
    desc: 'Same structural family as Diameter Cluster: every member contains a grid-antipodal pair. Difference: the remaining two members form a two-step chain of intermediates rather than a tight cluster. 10 quads, also 2110-asymmetric across aspects. 2 members break under the opposite-corner flip. Grouped with Diameter Cluster under the "Antipodal Witness" parent — both are the true residue once the load-bearing orbits (O₃, O₁) and the anomaly (O₅) are named.',
    members: [[2,8,13,17],[2,11,12,15],[3,7,12,18],[3,7,14,16],[3,9,12,16],[4,6,13,17],[4,8,11,17],[4,8,13,15],[5,7,12,16],[5,8,9,18]],
  },
};

// Build a canonical-key → orbit lookup for fast classification
const MIXED_ORBIT_LOOKUP = (() => {
  const map = {};
  for (const [orbit, info] of Object.entries(MIXED_ORBITS)) {
    for (const m of info.members) {
      const key = [...m].sort((a, b) => a - b).join(',');
      map[key] = orbit;
    }
  }
  return map;
})();

const QUADRUPLES_40 = (() => {
  const grid = {17:[0,0],7:[0,1],4:[0,2],12:[0,3],2:[1,0],14:[1,1],15:[1,2],9:[1,3],18:[2,0],6:[2,1],5:[2,2],11:[2,3],3:[3,0],13:[3,1],16:[3,2],8:[3,3]};
  const bits = {};
  for (const [p, [r,c]] of Object.entries(grid)) bits[p] = [r>>1, r&1, c>>1, c&1];
  const hamming = (a,b) => bits[a].reduce((s,v,i) => s + (v !== bits[b][i] ? 1 : 0), 0);

  const rows = [[4,7,12,17],[2,9,14,15],[5,6,11,18],[3,8,13,16]];
  const cols = [[2,3,17,18],[6,7,13,14],[4,5,15,16],[8,9,11,12]];
  const torusIds = Object.keys(NEIGHBORHOODS);
  const torusMembers = Object.values(NEIGHBORHOODS).map(n => [...n.members].sort((a,b)=>a-b));
  const affine = [[5,7,11,17],[2,8,14,16],[4,6,12,18],[3,9,13,15]];
  const tetrahedra = [[2,4,16,18],[2,7,13,18],[2,9,13,16],[3,5,15,17],[3,6,14,17],[3,8,14,15],[4,7,11,18],[4,9,11,16],[5,6,12,17],[5,8,12,15],[6,8,12,14],[7,9,11,13]];
  const mixed = [[2,5,15,18],[2,5,16,17],[2,6,15,17],[2,7,15,16],[2,8,12,18],[2,8,13,17],[2,11,12,15],[2,11,13,14],[3,4,15,18],[3,4,16,17],[3,5,14,18],[3,6,15,16],[3,7,12,18],[3,7,14,16],[3,9,11,17],[3,9,12,16],[3,11,12,14],[4,5,13,18],[4,5,14,17],[4,6,13,17],[4,6,14,16],[4,8,11,17],[4,8,13,15],[4,9,13,14],[4,11,12,13],[5,7,12,16],[5,7,13,15],[5,8,9,18],[5,8,13,14],[5,9,12,14],[6,7,9,18],[6,7,11,16],[6,7,12,15],[6,8,9,17],[6,8,11,15],[6,9,11,14],[6,9,12,13],[7,8,9,16],[7,8,11,14],[7,8,12,13]];

  const ROW_NAMES = ['Intent','Cognition','Resonance','Structure'];
  const COL_NAMES = ['Spirit','Emotion','Mind','Body'];

  const all = [];
  rows.forEach((m,i) => all.push({ members: m, category: 'Row', label: ROW_NAMES[i], color: '#ef4444' }));
  cols.forEach((m,i) => all.push({ members: m, category: 'Column', label: COL_NAMES[i], color: '#4ade80' }));
  torusMembers.forEach((m,i) => all.push({ members: m, category: 'Toroidal', label: torusIds[i], color: '#f0c040' }));
  affine.forEach((m,i) => all.push({ members: m, category: 'Affine', label: `Plane ${i+1}`, color: '#c084fc' }));
  tetrahedra.forEach((m,i) => all.push({ members: m, category: 'Tetrahedron', label: `T${i+1}`, color: '#22d3ee' }));
  mixed.forEach((m,i) => all.push({ members: m, category: 'Mixed', label: `M${String(i+1).padStart(2,'0')}`, color: '#64748b' }));

  all.forEach(q => {
    const dists = [];
    for (let i = 0; i < q.members.length; i++)
      for (let j = i+1; j < q.members.length; j++)
        dists.push(hamming(q.members[i], q.members[j]));
    q.distances = dists.sort((a,b)=>a-b);
    // Tag Mixed quads with their B₄ orbit classification
    if (q.category === 'Mixed') {
      const key = [...q.members].sort((a, b) => a - b).join(',');
      q.orbit = MIXED_ORBIT_LOOKUP[key] || null;
    }
  });

  return all;
})();

const QUAD_CATEGORIES = [
  { name: 'Row', count: 4, color: '#ef4444', desc: 'Grid rows (Activity groups)' },
  { name: 'Column', count: 4, color: '#4ade80', desc: 'Grid columns (Practice groups)' },
  { name: 'Toroidal', count: 16, color: '#f0c040', desc: 'Adjacent 2x2 on torus (Neighborhoods)' },
  { name: 'Affine', count: 4, color: '#c084fc', desc: 'Space diagonals through 4D' },
  { name: 'Tetrahedron', count: 12, color: '#22d3ee', desc: 'All pairwise distance = 2 (regular in 4D)' },
  { name: 'Mixed', count: 40, color: '#64748b', desc: 'No named geometric form' },
];

// === GROUP DEFINITIONS ===
const PRACTICE_GROUPS = {
  Spirit:  { name: 'Spirit',  question: 'Where?', verb: 'Witness',     members: [2, 3, 17, 18], description: 'Inner knowing and aspiration.' },
  Mind:    { name: 'Mind',    question: 'Where?', verb: 'Channel',     members: [4, 5, 15, 16], description: 'Pattern and structure.' },
  Emotion: { name: 'Emotion', question: 'Where?', verb: 'Will',        members: [6, 7, 13, 14], description: 'Feeling and drive.' },
  Body:    { name: 'Body',    question: 'Where?', verb: 'Embody',      members: [8, 9, 11, 12], description: 'Form and practice.' },
};
const ACTIVITY_GROUPS = {
  Intent:    { name: 'Intent',    question: 'How?', verb: 'Point',       members: [17, 7, 4, 12], description: 'Directed will and action -- purposeful movement toward chosen ends.' },
  Cognition: { name: 'Cognition', question: 'How?', verb: 'Distinguish', members: [2, 14, 15, 9], description: 'Mental clarity -- thought, analysis, and perception.' },
  Resonance: { name: 'Resonance', question: 'How?', verb: 'Connect',     members: [18, 6, 5, 11], description: 'Emotional attunement -- feeling and relationship.' },
  Structure: { name: 'Structure', question: 'How?', verb: 'Build',       members: [3, 13, 16, 8], description: 'Material form -- building, resources, and embodiment.' },
};

const ASPECTS = {
  Practice: { question: 'Where?', groups: PRACTICE_GROUPS, color: C.Practice },
  Activity: { question: 'How?',   groups: ACTIVITY_GROUPS, color: C.Activity },
  Being:    { question: 'What?',  groups: Object.fromEntries(Object.entries(BEING_GROUPS).map(([k,v]) => [k, { ...v, question: 'What?' }])), color: C.Being },
  Identity: { question: 'Who?',   groups: Object.fromEntries(Object.entries(IDENTITY_GROUPS).map(([k,v]) => [k, { ...v, question: 'Who?' }])), color: C.Identity },
  Stage:    { question: 'When?',  groups: STAGE_GROUPS, color: '#8b5cf6' },
};

// === REVERSE LOOKUPS ===
function getGroupsForArchetype(id) {
  const result = {};
  for (const [dim, aspect] of Object.entries(ASPECTS)) {
    for (const [gName, gDef] of Object.entries(aspect.groups)) {
      if (gDef.members.includes(id)) { result[dim] = gName; break; }
    }
  }
  return result;
}
function getBoundsForArchetype(id) {
  return Object.values(BOUNDS).filter(b => b.archetype === id);
}
function getAgentsForArchetype(id) {
  return Object.values(AGENTS).filter(a => a.archetype === id);
}

// === DERIVATION CONTENT ===
const DERIVATION_CONTENT = {
  aspects: {
    title: 'THE FOUR ASPECTS',
    body: 'Four is the minimum dimensionality for complete expression. Consciousness differentiates through I AM into 10 fundamental nodes, expressed across 4 dimensions = 40. Each dimension asks one irreducible question about experience. Together they fully characterize any moment of consciousness.\n\nThe Forty-Fold Seal: 10 nodes x 4 aspects = 40 interaction points. This is not arbitrary -- it is the minimum complete system.',
  },
  Practice: {
    title: 'PRACTICE -- The Grid Columns',
    body: 'Practice answers WHERE. The four houses (Spirit, Mind, Emotion, Body) are the domains of experience -- four distinct arenas in which consciousness operates. They form the columns of the Forty-Fold Seal grid.\n\nEach house is governed by one Soul House archetype. The governance relationship is asymmetric -- the governor operates through complementary (recursive) pairings, while the governed house operates through polar pairings.',
  },
  Activity: {
    title: 'ACTIVITY -- The Grid Rows',
    body: 'Activity answers HOW. The four channels (Intent, Cognition, Resonance, Structure) are the methods of engagement -- four distinct ways consciousness interacts with its domain. They form the rows of the Forty-Fold Seal grid.\n\nIn traditional systems these are the four elements: Fire, Air, Water, Earth. In physics: the four states of matter. The architecture uses the same four-fold pattern because four is structurally necessary, not culturally inherited.',
  },
  Being: {
    title: 'BEING -- Latin Square Overlay',
    body: 'Being answers WHAT. The four Being groups (Mantle, Torch, Vessel, Clearing) are a Latin square overlay on the grid -- an invisible fourth dimension that cuts diagonally across both Practice and Activity.\n\nEach group contains one archetype from every Practice, every Activity, every Stage, and every Identity. Maximum diversity. This guarantees that Being groups reveal patterns invisible to Practice or Activity alone.',
  },
  Identity: {
    title: 'IDENTITY -- Latin Square Overlay',
    body: 'Identity answers WHO. The four Identity groups (Composure, Conviction, Exploration, Communion) are the third Latin square on the grid -- a fifth mathematical dimension.\n\nIdentity\'s correction geometry differs from Being\'s: shadow identity (Unacknowledged) is corrected WITHIN the same group, not across groups. The architecture protects WHO you are. Your shadow self is illuminated by your own deepest mirror, not by becoming someone else.',
  },
};

// === SOUL HOUSE DATA ===
const SOUL_HOUSE = [
  { id: 0, name: 'Potential', house: 'Spirit', symbol: '\u2600' },
  { id: 1, name: 'Will', house: 'Body', symbol: null },
  { id: 19, name: 'Actualization', house: 'Mind', symbol: null },
  { id: 20, name: 'Awareness', house: 'Emotion', symbol: null },
];

// === VISUALIZATION HELPERS ===
const GX = 120, GY = 60, CS = 130, RS = 105, NW = 90, NH = 65;

function getNodeCenter(pos) {
  const g = GRID[pos];
  return g ? { x: GX + g.col * CS + NW / 2, y: GY + g.row * RS + NH / 2 } : { x: 0, y: 0 };
}

function perpOffset(x1, y1, x2, y2, offset) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { ox: (-dy / len) * offset, oy: (dx / len) * offset };
}

function abbrev(name) { return name.length <= 5 ? name : name.slice(0, 4); }

function rotate4D(point, aXW, aYZ, aXY = 0) {
  let [x, y, z, w] = point;
  const cA = Math.cos(aXW), sA = Math.sin(aXW);
  let nx = x * cA - w * sA, nw = x * sA + w * cA; x = nx; w = nw;
  const cB = Math.cos(aYZ), sB = Math.sin(aYZ);
  let ny = y * cB - z * sB, nz = y * sB + z * cB; y = ny; z = nz;
  const cC = Math.cos(aXY), sC = Math.sin(aXY);
  let nx2 = x * cC - y * sC, ny2 = x * sC + y * cC; x = nx2; y = ny2;
  return [x, y, z, w];
}

function project4Dto2D(p, pd4 = 4.0, pd3 = 6.0) {
  const [x, y, z, w] = p;
  const s4 = pd4 / (pd4 - w);
  const x3 = x * s4, y3 = y * s4, z3 = z * s4;
  const s3 = pd3 / (pd3 - z3);
  return { x: x3 * s3, y: y3 * s3, scale: s4 * s3 };
}

function projectVertex(bits, aXW, aYZ, aXY = 0) {
  return project4Dto2D(rotate4D(bits.map(b => b === 0 ? -1 : 1), aXW, aYZ, aXY));
}

function getVertexColor(id, mode) {
  for (const g of Object.values(COLOR_MODES[mode])) { if (g.ids.includes(id)) return g.color; }
  return '#e2e8f0';
}

// button style helper
const btn = (active, color = '#38bdf8') => ({
  padding: '5px 14px', borderRadius: 6, border: active ? `2px solid ${color}` : '1px solid #334155',
  background: active ? `${color}22` : '#0f172a', color: active ? color : '#64748b',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
});

// small button style for view controls row
const btnSm = (active, color = '#38bdf8') => ({
  padding: '3px 10px', borderRadius: 5, border: active ? `2px solid ${color}` : '1px solid #334155',
  background: active ? `${color}22` : '#0f172a', color: active ? color : '#64748b',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
});

// =============================================
// GRID VIEW COMPONENT (verbatim from /visualize)
// =============================================
function GridView({ selectedSeed, showAll, dimVisible, selectedBeingGroups, selectedIdentityGroups, showLabels, showTorus, compact, onSelectArchetype, highlightOverride, pathOverride, showTraditional, suppressSeedGlow }) {
  const groupFilterActive = selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0;

  const activePositions = useMemo(() => {
    if (highlightOverride && highlightOverride.size > 0) return highlightOverride;
    const set = new Set();
    if (groupFilterActive) {
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) BEING_DEFS[n].members.forEach(p => set.add(p)); });
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) IDENTITY_DEFS[n].members.forEach(p => set.add(p)); });
    } else if (showAll) {
      Object.values(SEEDS).forEach(s => DIMENSION_ORDER.forEach(d => { if (dimVisible[d]) s.paths[d].seq.forEach(p => set.add(p)); }));
    } else {
      const s = SEEDS[selectedSeed];
      if (s) DIMENSION_ORDER.forEach(d => { if (dimVisible[d]) s.paths[d].seq.forEach(p => set.add(p)); });
    }
    return set;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const seedPositions = useMemo(() => {
    if (groupFilterActive) {
      const set = new Set();
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) { const m = BEING_DEFS[n].members.find(p => VIZ_STAGES[p] === 'Se'); if (m !== undefined) set.add(m); } });
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) { const m = IDENTITY_DEFS[n].members.find(p => VIZ_STAGES[p] === 'Se'); if (m !== undefined) set.add(m); } });
      return set;
    }
    return showAll ? new Set([2, 4, 6, 8]) : new Set([selectedSeed]);
  }, [selectedSeed, showAll, groupFilterActive, selectedBeingGroups, selectedIdentityGroups]);

  const pathLines = useMemo(() => {
    const lines = [];
    // Use parent-computed paths when provided (covers all 4 aspects)
    if (pathOverride && pathOverride.length > 0) {
      pathOverride.forEach((p, pi) => {
        const seq = p.seq;
        for (let i = 0; i < seq.length; i++) {
          const from = getNodeCenter(seq[i]), to = getNodeCenter(seq[(i + 1) % seq.length]);
          const off = (pi - (pathOverride.length - 1) / 2) * 4;
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
          lines.push({ key: `po-${pi}-${i}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color: p.color, opacity: 0.8, markerId: `arrow-po-${pi}`, isReturn: i === seq.length - 1 });
        }
      });
      return lines;
    }
    if (groupFilterActive) {
      const so = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
      const draw = (members, color, label, off) => {
        const sorted = [...members].sort((a, b) => (so[VIZ_STAGES[a]] || 0) - (so[VIZ_STAGES[b]] || 0));
        for (let i = 0; i < sorted.length; i++) {
          const from = getNodeCenter(sorted[i]), to = getNodeCenter(sorted[(i + 1) % sorted.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
          lines.push({ key: `${label}-${i}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color, opacity: 0.8, markerId: `arrow-${label}`, isReturn: i === sorted.length - 1 });
        }
      };
      let bi = 0;
      selectedBeingGroups.forEach(n => { if (BEING_DEFS[n]) { draw(BEING_DEFS[n].members, '#fbbf24', `Being-${n}`, (bi - (selectedBeingGroups.size - 1) / 2) * 4); bi++; } });
      let ii = 0;
      selectedIdentityGroups.forEach(n => { if (IDENTITY_DEFS[n]) { draw(IDENTITY_DEFS[n].members, '#a855f7', `Identity-${n}`, (ii - (selectedIdentityGroups.size - 1) / 2) * 4); ii++; } });
      return lines;
    }
    const seeds = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
    const op = showAll ? 0.5 : 0.8;
    seeds.forEach(sk => {
      const s = SEEDS[sk]; if (!s) return;
      DIMENSION_ORDER.forEach((dim, di) => {
        if (!dimVisible[dim]) return;
        const p = s.paths[dim];
        for (let i = 0; i < p.seq.length; i++) {
          const from = getNodeCenter(p.seq[i]), to = getNodeCenter(p.seq[(i + 1) % p.seq.length]);
          const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, OFFSETS[di]);
          lines.push({ key: `${sk}-${dim}-${i}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color: p.color, opacity: i === p.seq.length - 1 ? op * 0.6 : op, markerId: `arrow-${dim}`, isReturn: i === p.seq.length - 1 });
        }
      });
    });
    return lines;
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups, pathOverride]);

  const TW = 4 * CS, TH = 4 * RS;
  function getTorusNodeCenter(pos, tc, tr) {
    const g = GRID[pos];
    return g ? { x: GX + tc * TW + g.col * CS + NW / 2, y: GY + tr * TH + g.row * RS + NH / 2 } : { x: 0, y: 0 };
  }

  const torusPathLines = useMemo(() => {
    if (!showTorus) return [];
    const lines = [];
    function nearest(fromPos, ftc, ftr, toPos) {
      const from = getTorusNodeCenter(fromPos, ftc, ftr);
      let best = Infinity, bestTo = from;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const c = getTorusNodeCenter(toPos, ftc + dc, ftr + dr);
        const d = (c.x - from.x) ** 2 + (c.y - from.y) ** 2;
        if (d < best) { best = d; bestTo = c; }
      }
      return { from, to: bestTo };
    }
    for (let tr = 0; tr < 3; tr++) for (let tc = 0; tc < 3; tc++) {
      const isC = tc === 1 && tr === 1;
      const tOp = isC ? 1.0 : 0.35;
      const add = (fp, tp, col, lbl, idx, off, bop) => {
        const { from, to } = nearest(fp, tc, tr, tp);
        const { ox, oy } = perpOffset(from.x, from.y, to.x, to.y, off);
        lines.push({ key: `t${tc}${tr}-${lbl}-${idx}`, x1: from.x + ox, y1: from.y + oy, x2: to.x + ox, y2: to.y + oy, color: col, opacity: tOp * bop, markerId: `arrow-${lbl}`, isReturn: false });
      };
      if (pathOverride && pathOverride.length > 0) {
        pathOverride.forEach((p, pi) => {
          const seq = p.seq;
          const off = (pi - (pathOverride.length - 1) / 2) * 4;
          for (let i = 0; i < seq.length; i++) add(seq[i], seq[(i + 1) % seq.length], p.color, `po-${pi}`, i, off, 0.8);
        });
      } else if (groupFilterActive) {
        const so = { Se: 0, Me: 1, Fr: 2, Fb: 3 };
        let bi = 0;
        selectedBeingGroups.forEach(n => { if (!BEING_DEFS[n]) return; const sorted = [...BEING_DEFS[n].members].sort((a, b) => (so[VIZ_STAGES[a]] || 0) - (so[VIZ_STAGES[b]] || 0)); const off = (bi - (selectedBeingGroups.size - 1) / 2) * 4; for (let i = 0; i < sorted.length; i++) add(sorted[i], sorted[(i + 1) % sorted.length], '#fbbf24', `Being-${n}`, i, off, 0.8); bi++; });
        let ii = 0;
        selectedIdentityGroups.forEach(n => { if (!IDENTITY_DEFS[n]) return; const sorted = [...IDENTITY_DEFS[n].members].sort((a, b) => (so[VIZ_STAGES[a]] || 0) - (so[VIZ_STAGES[b]] || 0)); const off = (ii - (selectedIdentityGroups.size - 1) / 2) * 4; for (let i = 0; i < sorted.length; i++) add(sorted[i], sorted[(i + 1) % sorted.length], '#a855f7', `Identity-${n}`, i, off, 0.8); ii++; });
      } else {
        const seeds = showAll ? Object.keys(SEEDS).map(Number) : [selectedSeed];
        const sOp = showAll ? 0.5 : 0.8;
        seeds.forEach(sk => { const s = SEEDS[sk]; if (!s) return; DIMENSION_ORDER.forEach((dim, di) => { if (!dimVisible[dim]) return; const p = s.paths[dim]; for (let i = 0; i < p.seq.length; i++) add(p.seq[i], p.seq[(i + 1) % p.seq.length], p.color, `${sk}-${dim}`, i, OFFSETS[di], sOp); }); });
      }
    }
    return lines;
  }, [showTorus, selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups, pathOverride]);

  const svgW = showTorus ? TW * 3 + GX * 2 : GX + 4 * CS + 40;
  const svgH = showTorus ? TH * 3 + GY * 2 : GY + 4 * RS + (showLabels ? 40 : 20);

  return (
    <div style={{ overflow: 'auto', width: '100%' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width={compact ? '100%' : svgW} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}>
        <defs>
          {DIMENSION_ORDER.map(dim => {
            const c = SEEDS[8].paths[dim].color;
            return <marker key={dim} id={`arrow-${dim}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d={`M0,0 L8,3 L0,6 Z`} fill={c} /></marker>;
          })}
          {Object.keys(BEING_DEFS).map(n => <marker key={`Being-${n}`} id={`arrow-Being-${n}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#fbbf24" /></marker>)}
          {Object.keys(IDENTITY_DEFS).map(n => <marker key={`Identity-${n}`} id={`arrow-Identity-${n}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#a855f7" /></marker>)}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } } .seed-glow { animation: pulse 2s ease-in-out infinite; }`}</style>
        </defs>

        {showTorus && [0,1,2].map(tr => [0,1,2].map(tc => (
          <rect key={`tile-${tc}-${tr}`} x={GX - NW/2 - 10 + tc * TW} y={GY - NH/2 - 10 + tr * TH} width={TW - CS + NW + 20} height={TH - RS + NH + 20} rx={8} fill="none" stroke={tc === 1 && tr === 1 ? '#334155' : '#1e293b'} strokeWidth={tc === 1 && tr === 1 ? 1.5 : 0.5} strokeDasharray={tc === 1 && tr === 1 ? 'none' : '4,4'} />
        )))}

        {ROW_LABELS.map((l, i) => <text key={`r${i}`} x={(showTorus ? GX + TW : GX) - 14} y={(showTorus ? GY + TH : GY) + i * RS + NH / 2 + 4} textAnchor="end" fill="#64748b" fontSize="13" fontWeight="500" fontFamily="system-ui">{l}</text>)}
        {COL_LABELS.map((l, i) => <text key={`c${i}`} x={(showTorus ? GX + TW : GX) + i * CS + NW / 2} y={(showTorus ? GY + TH : GY) - 14} textAnchor="middle" fill="#64748b" fontSize="13" fontWeight="500" fontFamily="system-ui">{l}</text>)}

        {(showTorus ? torusPathLines : pathLines).map(l => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={2.5} opacity={l.opacity} markerEnd={`url(#${l.markerId})`} strokeLinecap="round" />
        ))}

        {(showTorus ? [0,1,2].flatMap(tr => [0,1,2].map(tc => ({ tc, tr }))) : [{ tc: 0, tr: 0 }]).map(({ tc, tr }) => {
          const isC = showTorus ? (tc === 1 && tr === 1) : true;
          const tOp = isC ? 1 : 0.3;
          const oX = showTorus ? tc * TW : 0, oY = showTorus ? tr * TH : 0;
          return (
            <g key={`tile-${tc}-${tr}`} opacity={tOp}>
              {Object.entries(GRID).map(([ps, g]) => {
                const pos = Number(ps);
                const x = GX + oX + g.col * CS, y = GY + oY + g.row * RS;
                const isAct = activePositions.has(pos), isSeed = seedPositions.has(pos);
                const nOp = isAct ? 1 : (isC ? 0.25 : 0.15);
                let bc = '#334155';
                if (isSeed && isC && !suppressSeedGlow) bc = '#38bdf8'; else if (isAct) bc = '#64748b';
                return (
                  <g key={`${tc}${tr}-${pos}`} opacity={nOp} style={{ cursor: 'pointer' }} onClick={() => { if (isC && onSelectArchetype) onSelectArchetype(pos); }}>
                    {isSeed && isC && !suppressSeedGlow && <rect className="seed-glow" x={x-4} y={y-4} width={NW+8} height={NH+8} rx={8} fill="none" stroke="#38bdf8" strokeWidth={2} filter="url(#glow)" />}
                    <rect x={x} y={y} width={NW} height={NH} rx={6} fill="#0f172a" stroke={bc} strokeWidth={isSeed && isC && !suppressSeedGlow ? 2 : 1} />
                    <text x={x+NW/2} y={y+22} textAnchor="middle" fill={isAct ? '#f8fafc' : '#475569'} fontSize="22" fontWeight="700" fontFamily="system-ui">{pos}</text>
                    <text x={x+NW/2} y={y+40} textAnchor="middle" fill={isAct ? '#cbd5e1' : '#334155'} fontSize="14" fontFamily="system-ui">{showTraditional ? (ARCHETYPES[pos]?.traditional || VERTICES[pos]?.name || '') : (VERTICES[pos]?.name || '')}</text>
                    <text x={x+NW/2} y={y+55} textAnchor="middle" fill={isAct ? (VIZ_STAGE_COLORS[VIZ_STAGES[pos]] || '#475569') : '#1e293b'} fontSize="11" fontFamily="system-ui" fontWeight="600" letterSpacing="0.5">{VIZ_STAGES[pos] === 'Se' ? 'SEED' : VIZ_STAGES[pos] === 'Me' ? 'MED' : VIZ_STAGES[pos] === 'Fr' ? 'FRU' : 'FEED'}</text>
                    {showLabels && isAct && isC && <>
                      <text x={x+NW/2} y={y+NH+12} textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="system-ui">{BEING_LOOKUP[pos]?.group || ''}</text>
                      <text x={x+NW/2} y={y+NH+22} textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="system-ui">{IDENTITY_LOOKUP[pos]?.group || ''}</text>
                    </>}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =============================================
// TESSERACT VIEW COMPONENT (verbatim from /visualize)
// =============================================
function TesseractView({ colorMode, autoRotate, showAffinePlanes, affineShadeFill, highlightSet, activePaths, compact, zoom = 1, showStages = false, showTraditional = false, angleXW, setAngleXW, angleYZ, setAngleYZ, angleXY, setAngleXY, rotateAxis, onSelectArchetype }) {
  const [hovered, setHovered] = useState(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const anglesRef = useRef({ xw: angleXW, yz: angleYZ, xy: angleXY });
  const autoRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => { anglesRef.current = { xw: angleXW, yz: angleYZ, xy: angleXY }; }, [angleXW, angleYZ, angleXY]);
  useEffect(() => { autoRef.current = autoRotate; }, [autoRotate]);

  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      if (autoRef.current && !dragging.current) {
        const a = anglesRef.current;
        anglesRef.current = { xw: a.xw + 0.003, yz: a.yz + 0.002, xy: a.xy + 0.001 };
        setAngleXW(anglesRef.current.xw);
        setAngleYZ(anglesRef.current.yz);
        setAngleXY(anglesRef.current.xy);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [setAngleXW, setAngleYZ, setAngleXY]);

  const [rotateMode, setRotateMode] = useState(false);
  const rotateModeRef = useRef(false);
  useEffect(() => { rotateModeRef.current = rotateMode; }, [rotateMode]);
  const toggleRotate = useCallback((cx, cy) => {
    lastPos.current = { x: cx, y: cy };
    setRotateMode(p => !p);
  }, []);

  useEffect(() => {
    if (!rotateMode) return;
    const onMove = (e) => {
      const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      if (rotateAxis === 'XW+YZ') {
        setAngleXW(p => p + dx * 0.005);
        setAngleYZ(p => p + dy * 0.005);
      } else {
        setAngleXY(p => p + dx * 0.005);
        setAngleYZ(p => p + dy * 0.005);
      }
    };
    const onClick = (e) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
      setRotateMode(false);
    };
    window.addEventListener('mousemove', onMove);
    const timer = setTimeout(() => window.addEventListener('click', onClick), 100);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      clearTimeout(timer);
    };
  }, [rotateMode, rotateAxis]);

  const SZ = 700, CX = 350, CY = 350, SC = 160;
  const ids = Object.keys(VERTICES).map(Number);
  const projected = {};
  for (const id of ids) projected[id] = projectVertex(VERTICES[id].bits, angleXW, angleYZ, angleXY);
  const sortedIds = [...ids].sort((a, b) => projected[a].scale - projected[b].scale);
  const hasHighlight = highlightSet && highlightSet.size > 0;

  return (
    <div style={{ width: '100%' }}>
      {rotateMode && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#f59e0b', marginBottom: 4, fontWeight: 600 }}>
          ROTATE MODE ({rotateAxis}) — move mouse to rotate, click to lock
        </div>
      )}
      <svg
        viewBox={`${CX - SZ / 2 / zoom} ${CY - SZ / 2 / zoom} ${SZ / zoom} ${SZ / zoom}`}
        style={{ width: '100%', maxWidth: compact ? '100%' : 700, height: 'auto', cursor: rotateMode ? 'crosshair' : 'pointer', touchAction: 'none', display: 'block', margin: '0 auto' }}
        onClick={e => toggleRotate(e.clientX, e.clientY)}
        onWheel={e => { e.preventDefault(); setAngleXY(p => p + e.deltaY * 0.002); }}
        onTouchStart={e => { const t = e.touches[0]; toggleRotate(t.clientX, t.clientY); }}
      >
        <defs>
          <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x={CX - SZ / 2 / zoom} y={CY - SZ / 2 / zoom} width={SZ / zoom} height={SZ / zoom} fill="#0a0f1a" rx={12 / zoom} />

        {EDGES.map((edge, i) => {
          const a = projected[edge.from], b = projected[edge.to];
          const avg = (a.scale + b.scale) / 2;
          let op = 0.15 + Math.min(avg, 2) * 0.3;
          if (hasHighlight && !highlightSet.has(edge.from) && !highlightSet.has(edge.to)) op *= 0.2;
          return <line key={i} x1={CX + a.x * SC} y1={CY + a.y * SC} x2={CX + b.x * SC} y2={CY + b.y * SC} stroke={EDGE_COLORS[edge.bit]} strokeWidth={1.2} opacity={op} />;
        })}

        {showAffinePlanes !== null && (() => {
          const planesToShow = showAffinePlanes === 4 ? AFFINE_PLANES : [AFFINE_PLANES[showAffinePlanes]];
          return planesToShow.filter(Boolean).map((plane, pi) => {
            const pts = plane.ids.map(id => ({
              x: CX + projected[id].x * SC,
              y: CY + projected[id].y * SC,
              id,
            }));
            const lines = [];
            for (let i = 0; i < 4; i++) {
              for (let j = i + 1; j < 4; j++) {
                lines.push(
                  <line key={`af-${pi}-${i}${j}`}
                    x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y}
                    stroke={plane.color} strokeWidth={2.5} opacity={0.7}
                  />
                );
              }
            }
            const glows = pts.map((p, i) => (
              <circle key={`afg-${pi}-${i}`} cx={p.x} cy={p.y} r={18} fill={plane.color} opacity={0.2} />
            ));
            const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
            const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
            const pcx = pts.reduce((s, p) => s + p.x, 0) / 4;
            const pcy = pts.reduce((s, p) => s + p.y, 0) / 4;
            const hullSorted = [...pts].sort((a, b) => Math.atan2(a.y - pcy, a.x - pcx) - Math.atan2(b.y - pcy, b.x - pcx));
            const hullPoints = hullSorted.map(p => `${p.x},${p.y}`).join(' ');

            return (
              <g key={`afp-${pi}`}>
                {affineShadeFill && (
                  <polygon points={hullPoints} fill={plane.color} fillOpacity={0.12} stroke={plane.color} strokeWidth={0.5} strokeOpacity={0.3} />
                )}
                {glows}
                {lines}
                <text x={cx} y={cy - 10} textAnchor="middle" fill={plane.color} fontSize="11" fontWeight="700" opacity={0.9} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>
                  {plane.label} = 40
                </text>
                <text x={cx} y={cy + 4} textAnchor="middle" fill={plane.color} fontSize="8" opacity={0.6} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>
                  {plane.ids.join(' + ')}
                </text>
              </g>
            );
          });
        })()}

        {activePaths && activePaths.map((path, pi) => {
          const pts = path.seq.map(id => ({
            x: CX + projected[id].x * SC,
            y: CY + projected[id].y * SC,
            scale: projected[id].scale,
          }));
          const pcx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const pcy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const hullSorted = [...pts].sort((a, b) => Math.atan2(a.y - pcy, a.x - pcx) - Math.atan2(b.y - pcy, b.x - pcx));
          const segs = [];
          for (let i = 0; i < path.seq.length; i++) {
            const fromId = path.seq[i], toId = path.seq[(i + 1) % path.seq.length];
            const a = projected[fromId], b = projected[toId];
            if (!a || !b) continue;
            segs.push(
              <line key={`pp-${pi}-${i}`}
                x1={CX + a.x * SC} y1={CY + a.y * SC}
                x2={CX + b.x * SC} y2={CY + b.y * SC}
                stroke={path.color} strokeWidth={2.5} opacity={0.7}
                markerEnd={`url(#arrow-pp-${pi})`}
                strokeLinecap="round"
              />
            );
          }
          // Build continuous path string for animateMotion: S→M→Fr→Fb→back to S
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ` L${pts[0].x},${pts[0].y}`;
          // Compute segment lengths for sync
          const segLens = [];
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            segLens.push(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
          }
          const totalLen = segLens.reduce((s, l) => s + l, 0);
          const segFractions = segLens.map(l => l / totalLen); // fraction of total time per segment
          const dur = 5 + pi * 0.5; // slower, staggered
          // Only animate if nodes span multiple stages (process flow exists)
          const stages = new Set(path.seq.map(id => VIZ_STAGES[id]));
          const hasProcessFlow = stages.size > 1 && !path.noAnimate;
          return (
            <g key={`path-${pi}`}>
              <defs>
                <marker id={`arrow-pp-${pi}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L8,3 L0,6 Z" fill={path.color} />
                </marker>
                <path id={`motion-path-${pi}`} d={pathD} fill="none" />
              </defs>
              {affineShadeFill && pts.length >= 3 && (
                <polygon
                  points={hullSorted.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={path.color} fillOpacity={0.1}
                  stroke={path.color} strokeWidth={0.5} strokeOpacity={0.2}
                />
              )}
              {/* Glow layer — each segment gets one window of brightness per full cycle */}
              {hasProcessFlow && segs.map((seg, si) => {
                // Fractional start/end of this segment within the full cycle
                let startFrac = 0;
                for (let k = 0; k < si; k++) startFrac += segFractions[k];
                const endFrac = startFrac + segFractions[si];
                // Clamp to avoid floating point issues at boundaries
                const s = Math.max(0.001, startFrac);
                const e = Math.min(0.999, endFrac);
                // dark → bright at segment start → bright through segment → dark at segment end → dark rest
                const keyTimes = `0;${(s).toFixed(4)};${(s + 0.001).toFixed(4)};${(e - 0.001).toFixed(4)};${(e).toFixed(4)};1`;
                const values = '0.03;0.03;0.5;0.5;0.03;0.03';
                return (
                  <line key={`glow-${pi}-${si}`}
                    x1={seg.props.x1} y1={seg.props.y1} x2={seg.props.x2} y2={seg.props.y2}
                    stroke={path.color} strokeWidth={8} strokeLinecap="round" filter="url(#pathGlow)" opacity={0.03}>
                    <animate attributeName="opacity"
                      values={values}
                      keyTimes={keyTimes}
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      calcMode="linear"
                    />
                  </line>
                );
              })}
              {segs}
              {/* Node hit bursts — expanding ring at each vertex when ball arrives */}
              {hasProcessFlow && pts.map((pt, ni) => {
                // Fraction of cycle when ball arrives at this node
                let arrivalFrac = 0;
                for (let k = 0; k < ni; k++) arrivalFrac += segFractions[k];
                const a = Math.max(0.001, arrivalFrac);
                // Burst window = 10% of cycle or 0.08 fraction, whichever is smaller
                const burstFrac = Math.min(0.08, segFractions[ni] * 0.5 || 0.05);
                const b = Math.min(a + burstFrac, 0.999);
                // Scale burst to node depth
                const sc = pt.scale || 1;
                const ringMax = Math.round(15 + sc * 20);
                const ringStart = Math.round(3 + sc * 4);
                const flashMax = Math.round(6 + sc * 12);
                const swMax = (1.5 + sc * 2).toFixed(1);
                // Ring: r goes ringStart→ringMax during burst, stays 0 otherwise
                const rKeyTimes = `0;${a.toFixed(4)};${b.toFixed(4)};1`;
                const rValues = `0;${ringStart};${ringMax};0`;
                const opValues = '0;0.8;0;0';
                const swValues = `0;${swMax};0.5;0`;
                // Flash: quick white pop
                const fMid = Math.min(a + burstFrac * 0.4, b - 0.001);
                const fKeyTimes = `0;${a.toFixed(4)};${fMid.toFixed(4)};${b.toFixed(4)};1`;
                const fRValues = `0;0;${flashMax};0;0`;
                const fOpValues = '0;0;0.7;0;0';
                return (
                  <g key={`burst-${pi}-${ni}`}>
                    <circle cx={pt.x} cy={pt.y} fill="none" stroke={path.color} r={0} strokeWidth={0} opacity={0}>
                      <animate attributeName="r" values={rValues} keyTimes={rKeyTimes} dur={`${dur}s`} repeatCount="indefinite" calcMode="linear" />
                      <animate attributeName="opacity" values={opValues} keyTimes={rKeyTimes} dur={`${dur}s`} repeatCount="indefinite" calcMode="linear" />
                      <animate attributeName="stroke-width" values={swValues} keyTimes={rKeyTimes} dur={`${dur}s`} repeatCount="indefinite" calcMode="linear" />
                    </circle>
                    <circle cx={pt.x} cy={pt.y} r={0} fill="#fff" opacity={0}>
                      <animate attributeName="r" values={fRValues} keyTimes={fKeyTimes} dur={`${dur}s`} repeatCount="indefinite" calcMode="linear" />
                      <animate attributeName="opacity" values={fOpValues} keyTimes={fKeyTimes} dur={`${dur}s`} repeatCount="indefinite" calcMode="linear" />
                    </circle>
                  </g>
                );
              })}
              {/* Animated pulse traveling along the path */}
              {hasProcessFlow && <>
                <circle r={7} fill={path.color} opacity={0.9}>
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#motion-path-${pi}`} />
                  </animateMotion>
                </circle>
                <circle r={4} fill="#fff" opacity={0.7}>
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#motion-path-${pi}`} />
                  </animateMotion>
                </circle>
              </>}
            </g>
          );
        })}

        {sortedIds.map(id => {
          const p = projected[id];
          const sx = CX + p.x * SC, sy = CY + p.y * SC;
          const r = 8 + p.scale * 7;
          const color = getVertexColor(id, colorMode);
          const isHov = hovered === id;
          const dimmed = hasHighlight && !highlightSet.has(id);
          const baseOp = 0.3 + Math.min(p.scale, 2) * 0.3;
          return (
            <g key={id} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)} onClick={e => { if (onSelectArchetype) { e.stopPropagation(); onSelectArchetype(id); } }} style={{ cursor: 'pointer' }}>
              {hasHighlight && highlightSet.has(id) && <circle cx={sx} cy={sy} r={r + 8} fill={color} opacity={0.15} />}
              <circle cx={sx} cy={sy} r={isHov ? r + 4 : r} fill={color} opacity={dimmed ? baseOp * 0.2 : baseOp} stroke={isHov ? '#fff' : color} strokeWidth={isHov ? 2.5 : 1.5} />
              <text x={sx + r + 8} y={sy - 6} fill="#e2e8f0" fontSize={isHov ? 34 : 16 + p.scale * 10} fontWeight={isHov ? 700 : 600} opacity={dimmed ? 0.15 : 0.6 + Math.min(p.scale, 2) * 0.2} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>{id}</text>
              <text x={sx + r + 8} y={sy + 6 + p.scale * 12} fill={color} fontSize={isHov ? 26 : 12 + p.scale * 8} fontWeight={500} opacity={dimmed ? 0.1 : 0.55 + Math.min(p.scale, 2) * 0.2} style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}>{showTraditional ? (ARCHETYPES[id]?.traditional || VERTICES[id].name) : VERTICES[id].name}</text>
              {showStages && !dimmed && <text x={sx + r + 8} y={sy + 6 + p.scale * 12 + (isHov ? 20 : 10 + p.scale * 6)} fill={FULL_STAGE_COLORS[FULL_STAGES[id]] || '#64748b'} fontSize={isHov ? 18 : 8 + p.scale * 5} fontWeight={600} opacity={0.7 + Math.min(p.scale, 2) * 0.15} style={{ pointerEvents: 'none', fontFamily: 'system-ui', letterSpacing: '0.05em' }}>{FULL_STAGES[id]}</text>}
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div style={{ marginTop: 6, padding: '8px 14px', background: '#0f172a', borderRadius: 8, textAlign: 'center', fontSize: '0.8rem' }}>
          <span style={{ color: getVertexColor(hovered, colorMode), fontWeight: 700 }}>{hovered} — {VERTICES[hovered].name}</span>
          <span style={{ color: '#64748b', marginLeft: 10 }}>bits: [{VERTICES[hovered].bits.join(',')}]</span>
        </div>
      )}
    </div>
  );
}

// =============================================
// COLLAPSIBLE SIDEBAR WRAPPER (left only now)
// =============================================
function CollapsibleInfoPanel({ open, setOpen, children, textSize = 14 }) {
  if (!open) {
    return (
      <div onClick={() => setOpen(true)}
        style={{
          height: 30, background: C.panel, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          border: `1px solid ${C.border}`, transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = C.card}
        onMouseLeave={e => e.currentTarget.style.background = C.panel}>
        <span style={{ color: C.text3, fontSize: 12 }}>{'\u25BE'} show info</span>
      </div>
    );
  }
  return (
    <div style={{
      background: C.panel, borderRadius: 8,
      border: `1px solid ${C.border}`, padding: '12px 16px',
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span onClick={() => setOpen(false)} style={{ cursor: 'pointer', color: C.text3, fontSize: 11, transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = C.text}
          onMouseLeave={e => e.target.style.color = C.text3}>
          {'\u25B4'} hide
        </span>
      </div>
      <div style={{ zoom: textSize / 14, lineHeight: '1.6', columnCount: 2, columnGap: 24, columnRule: `1px solid ${C.border}` }}>
        {children}
      </div>
    </div>
  );
}

// =============================================
// SIDEBAR TEXT HELPER
// =============================================
function SidebarText({ title, body }) {
  const headerStyle = { letterSpacing: '0.12em', fontFamily: 'system-ui', textTransform: 'uppercase' };
  return (
    <>
      <div style={{ ...headerStyle, fontSize: 11, color: C.accent, marginBottom: 8 }}>{title}</div>
      {body.split('\n\n').map((p, i) => (
        <p key={i} style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, margin: '0 0 10px 0' }}>{p}</p>
      ))}
    </>
  );
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================
function ExploreDesktop() {
  // === VISUALIZATION STATE (from /visualize) ===
  const [selectedSeed, setSelectedSeed] = useState(8);
  const [showAll, setShowAll] = useState(true);
  const [dimVisible, setDimVisible] = useState({ Practice: true, Activity: true, Being: true, Identity: true });
  const [selectedBeingGroups, setSelectedBeingGroups] = useState(new Set());
  const [selectedIdentityGroups, setSelectedIdentityGroups] = useState(new Set());
  const [showLabels, setShowLabels] = useState(false);
  const [showTessStages, setShowTessStages] = useState(false);
  const [useGroupColors, setUseGroupColors] = useState(false);
  const [showTraditional, setShowTraditional] = useState(false);
  const [showTorus, setShowTorus] = useState(false);
  const [colorMode, setColorMode] = useState('Being');
  const [autoRotate, setAutoRotate] = useState(false);
  const [affinePlaneIdx, setAffinePlaneIdx] = useState(null);
  const [affineShadeFill, setAffineShadeFill] = useState(true);
  const [gridZoom, setGridZoom] = useState(1.15);
  const [tessZoom, setTessZoom] = useState(0.8);
  const [tessAngleXW, setTessAngleXW] = useState(0.4);
  const [tessAngleYZ, setTessAngleYZ] = useState(0.3);
  const [tessAngleXY, setTessAngleXY] = useState(0);
  const [tessRotateAxis, setTessRotateAxis] = useState('XW+YZ');

  // === EXPLORE STATE ===
  const [leftOpen, setLeftOpen] = useState(true);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [textSize, setTextSize] = useState(14); // actual px size

  // === ASPECT NAV STATE ===
  // Which aspect tab is selected (null = none, show default sidebar)
  const [selectedAspect, setSelectedAspect] = useState(null);

  // === SIDEBAR LEVEL: what's driving sidebar content ===
  // Track Practice/Activity/Stage/Neighborhood group selections
  const [selectedPracticeGroups, setSelectedPracticeGroups] = useState(new Set());
  const [selectedActivityGroups, setSelectedActivityGroups] = useState(new Set());
  const [selectedStageGroups, setSelectedStageGroups] = useState(new Set());
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [showCombinatorics, setShowCombinatorics] = useState(false);
  const [selectedQuadruple, setSelectedQuadruple] = useState(null);
  const [quadFilter, setQuadFilter] = useState(null);

  const sidebarLevel = useMemo(() => {
    if (selectedQuadruple !== null) return 'quadruple';
    if (selectedArchetype !== null) return 'archetype';
    if (selectedNeighborhood) return 'neighborhood';
    if (selectedBeingGroups.size > 0) return 'being';
    if (selectedIdentityGroups.size > 0) return 'identity';
    if (selectedAspect) return 'aspect';
    return 'default';
  }, [selectedQuadruple, selectedArchetype, selectedNeighborhood, selectedBeingGroups, selectedIdentityGroups, selectedAspect]);

  const headerStyle = { letterSpacing: '0.12em', fontFamily: 'system-ui', textTransform: 'uppercase' };

  // === VISUALIZATION ACTIONS ===
  const groupFilterActive = selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0 || selectedPracticeGroups.size > 0 || selectedActivityGroups.size > 0 || selectedStageGroups.size > 0 || selectedNeighborhood !== null || selectedQuadruple !== null;

  const selectSeed = (k) => { setShowAll(false); setSelectedBeingGroups(new Set()); setSelectedIdentityGroups(new Set()); setSelectedPracticeGroups(new Set()); setSelectedActivityGroups(new Set()); setSelectedStageGroups(new Set()); setSelectedNeighborhood(null); setSelectedQuadruple(null); setShowCombinatorics(false); setSelectedSeed(k); setSelectedArchetype(null); };

  const toggleGroupForAspect = (aspectName, groupName) => {
    setSelectedArchetype(null);
    setShowAll(false);
    if (aspectName === 'Being') {
      setSelectedBeingGroups(p => { const s = new Set(p); s.has(groupName) ? s.delete(groupName) : s.add(groupName); return s; });
    } else if (aspectName === 'Identity') {
      setSelectedIdentityGroups(p => { const s = new Set(p); s.has(groupName) ? s.delete(groupName) : s.add(groupName); return s; });
    } else if (aspectName === 'Practice') {
      setSelectedPracticeGroups(p => { const s = new Set(p); s.has(groupName) ? s.delete(groupName) : s.add(groupName); return s; });
    } else if (aspectName === 'Activity') {
      setSelectedActivityGroups(p => { const s = new Set(p); s.has(groupName) ? s.delete(groupName) : s.add(groupName); return s; });
    } else if (aspectName === 'Stage') {
      setSelectedStageGroups(p => { const s = new Set(p); s.has(groupName) ? s.delete(groupName) : s.add(groupName); return s; });
    }
  };

  const toggleDim = (d) => setDimVisible(p => ({ ...p, [d]: !p[d] }));

  const onSelectArchetype = useCallback((id) => {
    setSelectedArchetype(id);
    setShowAll(false);
  }, []);

  // === HIGHLIGHT SET & ACTIVE PATHS ===
  const { highlightSet, activePaths } = useMemo(() => {
    const set = new Set();
    const paths = [];
    const stageOrder = { Se: 0, Me: 1, Fr: 2, Fb: 3 };

    // Single archetype focus
    if (selectedArchetype !== null && !groupFilterActive && !showAll) {
      set.add(selectedArchetype);
      return { highlightSet: set, activePaths: paths };
    }

    if (groupFilterActive) {
      const gc = useGroupColors;
      // Practice groups
      selectedPracticeGroups.forEach(name => {
        if (PRACTICE_GROUPS[name]) {
          PRACTICE_GROUPS[name].members.forEach(p => set.add(p));
          const sorted = [...PRACTICE_GROUPS[name].members].sort((a, b) => (stageOrder[VIZ_STAGES[a]] || 0) - (stageOrder[VIZ_STAGES[b]] || 0));
          paths.push({ seq: sorted, color: gc ? (GROUP_COLORS[name] || '#4ade80') : '#4ade80' });
        }
      });
      // Activity groups
      selectedActivityGroups.forEach(name => {
        if (ACTIVITY_GROUPS[name]) {
          ACTIVITY_GROUPS[name].members.forEach(p => set.add(p));
          const sorted = [...ACTIVITY_GROUPS[name].members].sort((a, b) => (stageOrder[VIZ_STAGES[a]] || 0) - (stageOrder[VIZ_STAGES[b]] || 0));
          paths.push({ seq: sorted, color: gc ? (GROUP_COLORS[name] || '#ef4444') : '#ef4444' });
        }
      });
      selectedBeingGroups.forEach(n => {
        if (BEING_DEFS[n]) {
          BEING_DEFS[n].members.forEach(p => set.add(p));
          const sorted = [...BEING_DEFS[n].members].sort((a, b) => (stageOrder[VIZ_STAGES[a]] || 0) - (stageOrder[VIZ_STAGES[b]] || 0));
          paths.push({ seq: sorted, color: gc ? (GROUP_COLORS[n] || '#fbbf24') : '#fbbf24' });
        }
      });
      selectedIdentityGroups.forEach(n => {
        if (IDENTITY_DEFS[n]) {
          IDENTITY_DEFS[n].members.forEach(p => set.add(p));
          const sorted = [...IDENTITY_DEFS[n].members].sort((a, b) => (stageOrder[VIZ_STAGES[a]] || 0) - (stageOrder[VIZ_STAGES[b]] || 0));
          paths.push({ seq: sorted, color: gc ? (GROUP_COLORS[n] || '#a855f7') : '#a855f7' });
        }
      });
      selectedStageGroups.forEach(n => {
        if (STAGE_GROUPS[n]) {
          STAGE_GROUPS[n].members.forEach(p => set.add(p));
          paths.push({ seq: STAGE_GROUPS[n].members, color: gc ? (GROUP_COLORS[n] || FULL_STAGE_COLORS[n]) : (FULL_STAGE_COLORS[n] || '#8b5cf6') });
        }
      });
      // Neighborhoods
      if (selectedNeighborhood && NEIGHBORHOODS[selectedNeighborhood]) {
        const nb = NEIGHBORHOODS[selectedNeighborhood];
        nb.members.forEach(p => set.add(p));
        paths.push({ seq: nb.members, color: nb.color, noAnimate: true });
      }
      // Quadruples (combinatorics)
      if (selectedQuadruple !== null && QUADRUPLES_40[selectedQuadruple]) {
        const quad = QUADRUPLES_40[selectedQuadruple];
        quad.members.forEach(p => set.add(p));
        // Draw all 6 edges as separate 2-point paths
        const m = quad.members;
        const pairs = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
        pairs.forEach(([a,b]) => {
          paths.push({ seq: [m[a], m[b]], color: quad.color, noAnimate: true });
        });
      }
    } else if (selectedAspect && !showAll) {
      // Aspect selected but no specific group — highlight all groups in this aspect
      const aspectDef = ASPECTS[selectedAspect];
      if (aspectDef) {
        const aspectColor = { Practice: '#4ade80', Activity: '#ef4444', Being: '#fbbf24', Identity: '#a855f7', Stage: '#8b5cf6' }[selectedAspect] || '#e2e8f0';
        Object.entries(aspectDef.groups).forEach(([gName, g]) => {
          g.members.forEach(p => set.add(p));
          const sorted = [...g.members].sort((a, b) => (stageOrder[VIZ_STAGES[a]] || 0) - (stageOrder[VIZ_STAGES[b]] || 0));
          paths.push({ seq: sorted, color: useGroupColors ? (GROUP_COLORS[gName] || aspectColor) : aspectColor, opacity: 0.4 });
        });
      }
    } else if (showAll) {
      // All 16 — no highlight needed
    } else {
      const s = SEEDS[selectedSeed];
      if (s) DIMENSION_ORDER.forEach(d => {
        if (dimVisible[d]) {
          s.paths[d].seq.forEach(p => set.add(p));
          paths.push({ seq: s.paths[d].seq, color: s.paths[d].color });
        }
      });
    }
    return { highlightSet: set, activePaths: paths };
  }, [selectedSeed, showAll, dimVisible, groupFilterActive, selectedBeingGroups, selectedIdentityGroups, selectedPracticeGroups, selectedActivityGroups, selectedStageGroups, selectedNeighborhood, selectedQuadruple, selectedArchetype, selectedAspect, useGroupColors]);

  // === ARCHETYPE DETAIL DATA ===
  const archGroups = useMemo(() => {
    if (selectedArchetype === null) return {};
    return getGroupsForArchetype(selectedArchetype);
  }, [selectedArchetype]);

  const archBounds = useMemo(() => {
    if (selectedArchetype === null) return [];
    return getBoundsForArchetype(selectedArchetype);
  }, [selectedArchetype]);

  const archAgents = useMemo(() => {
    if (selectedArchetype === null) return [];
    return getAgentsForArchetype(selectedArchetype);
  }, [selectedArchetype]);

  // === GROUPS FOR CURRENT ASPECT ===
  const currentAspectGroups = useMemo(() => {
    if (!selectedAspect) return null;
    return ASPECTS[selectedAspect]?.groups || null;
  }, [selectedAspect]);

  // Which groups are "selected" for the current aspect (for Row 2 highlighting)
  const selectedGroupsForAspect = useMemo(() => {
    if (selectedAspect === 'Being') return selectedBeingGroups;
    if (selectedAspect === 'Identity') return selectedIdentityGroups;
    if (selectedAspect === 'Practice') return selectedPracticeGroups;
    if (selectedAspect === 'Activity') return selectedActivityGroups;
    if (selectedAspect === 'Stage') return selectedStageGroups;
    return new Set();
  }, [selectedAspect, selectedBeingGroups, selectedIdentityGroups, selectedPracticeGroups, selectedActivityGroups, selectedStageGroups]);

  // === SOUL HOUSE BAR ===
  function SoulHouseBar() {
    const nodeStyle = (active) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 10px',
      borderRadius: 6, background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(56,189,248,0.2)' : 'transparent'}`,
      cursor: 'pointer', transition: 'all 0.2s',
    });
    const isActive = (id) => selectedArchetype === id;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 8px',
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px 12px 0 0', flexWrap: 'wrap' }}>
        <div style={nodeStyle(false)}>
          <span style={{ fontSize: 14 }}>{'\u2600'}</span>
          <span style={{ fontSize: 10, color: C.text2, ...headerStyle }}>Source</span>
        </div>
        <span style={{ color: C.text3, fontSize: 11 }}>{'\u2190'}</span>
        {SOUL_HOUSE.map(sh => (
          <div key={sh.id} style={nodeStyle(isActive(sh.id))}
            onClick={() => setSelectedArchetype(sh.id)}>
            <span style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{sh.name} <span style={{ color: C.text3, fontSize: 10 }}>({sh.id})</span></span>
            <span style={{ fontSize: 9, color: C[Object.keys(ASPECTS).find(a => Object.values(ASPECTS[a].groups).some(g => g.name === sh.house)) || 'Practice'] || C.text3 }}>
              {'\u2193'} {sh.house}
            </span>
          </div>
        ))}
        <span style={{ color: C.text3, fontSize: 11 }}>{'\u2192'}</span>
        <div style={nodeStyle(false)}>
          <span style={{ fontSize: 14 }}>{'\u263D'}</span>
          <span style={{ fontSize: 10, color: C.text2, ...headerStyle }}>Creation</span>
        </div>
        <span style={{ color: '#334155', margin: '0 6px' }}>|</span>
        {['Seed', 'Medium', 'Fruition', 'Feedback'].map(s => (
          <span key={s} style={{ color: FULL_STAGE_COLORS[s], fontSize: 10 }}>
            {STAGE_SYMBOLS[s]} {s}
          </span>
        ))}
      </div>
    );
  }

  // === UNIFIED LEFT SIDEBAR CONTENT ===
  function SidebarContent() {
    // ARCHETYPE DETAIL VIEW
    if (sidebarLevel === 'archetype' && selectedArchetype !== null) {
      const arch = ARCHETYPES[selectedArchetype];
      const stage = FULL_STAGES[selectedArchetype];
      const groups = archGroups;
      return (
        <>
          {/* MEANING FIRST */}
          <div style={{ ...headerStyle, fontSize: 13, color: C.accent, marginBottom: 4 }}>{showTraditional ? arch?.traditional?.toUpperCase() : arch?.name?.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 8 }}>{showTraditional ? arch?.name : arch?.traditional} — Position {selectedArchetype}</div>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, marginBottom: 16 }}>{arch?.extended || arch?.description}</div>

          {/* DIMENSIONAL ADDRESS */}
          <div style={{ ...headerStyle, fontSize: 10, color: C.accent, marginBottom: 8 }}>DIMENSIONAL ADDRESS</div>
          {Object.entries(groups).map(([dim, gName]) => (
            <div key={dim} style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: C[dim] }}>{dim}:</span>{' '}
              <span style={{ color: C.text }}>{gName}</span>{' '}
              <span style={{ color: C.text3 }}>({DIMENSION_VERBS[dim]?.[gName]})</span>
            </div>
          ))}
          <div style={{ marginTop: 8, marginBottom: 16, fontSize: 12, color: C.text2, fontStyle: 'italic', lineHeight: 1.5 }}>
            &ldquo;The {stage || 'archetype'} of {Object.entries(groups).map(([dim, gName]) => {
              const verb = DIMENSION_VERBS[dim]?.[gName];
              return verb || gName;
            }).join(', ')}&rdquo;
          </div>

          {/* GROUP BADGES */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.entries(groups).map(([dim, gName]) => (
              <span key={dim} onClick={() => {
                setSelectedArchetype(null);
                setSelectedAspect(dim);
                if (dim === 'Being') { setSelectedBeingGroups(new Set([gName])); setSelectedIdentityGroups(new Set()); }
                else if (dim === 'Identity') { setSelectedIdentityGroups(new Set([gName])); setSelectedBeingGroups(new Set()); }
              }}
                style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                  background: `${useGroupColors ? (GROUP_COLORS[gName] || C[dim]) : C[dim]}15`,
                  border: `1px solid ${useGroupColors ? (GROUP_COLORS[gName] || C[dim]) : C[dim]}40`,
                  color: useGroupColors ? (GROUP_COLORS[gName] || C[dim]) : C[dim],
                }}>
                {dim}: {gName}
              </span>
            ))}
          </div>

          {/* TRANSIENT STATES */}
          {arch?.states && (
            <>
              <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>TRANSIENT STATES</div>
              {Object.entries(arch.states).map(([key, desc]) => {
                const stateColors = { balanced: '#22c55e', tooMuch: '#f59e0b', tooLittle: '#3b82f6', unacknowledged: '#a855f7' };
                const stateLabels = { balanced: 'Balanced', tooMuch: 'Too Much', tooLittle: 'Too Little', unacknowledged: 'Unacknowledged' };
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: stateColors[key] }}>{stateLabels[key]}</div>
                    <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                );
              })}
            </>
          )}

          {/* SIGNATURE PACKET */}
          {(archBounds.length > 0 || archAgents.length > 0) && (
            <div style={{ marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>SIGNATURE PACKET</div>
              {archBounds.filter(b => b.horizon === 'inner').length > 0 && (
                <div style={{ background: C.card, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.border}`, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 4, ...headerStyle }}>FLOOR (INNER)</div>
                  {archBounds.filter(b => b.horizon === 'inner').map(b => (
                    <div key={b.name} style={{ fontSize: 11, color: C.text2, marginBottom: 2 }}>
                      {b.name} <span style={{ color: C.text3 }}>({b.traditional}) &middot; {b.channel} {b.number}</span>
                    </div>
                  ))}
                </div>
              )}
              {archBounds.filter(b => b.horizon === 'outer').length > 0 && (
                <div style={{ background: C.card, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.border}`, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 4, ...headerStyle }}>CEILING (OUTER)</div>
                  {archBounds.filter(b => b.horizon === 'outer').map(b => (
                    <div key={b.name} style={{ fontSize: 11, color: C.text2, marginBottom: 2 }}>
                      {b.name} <span style={{ color: C.text3 }}>({b.traditional}) &middot; {b.channel} {b.number}</span>
                    </div>
                  ))}
                </div>
              )}
              {archAgents.length > 0 && (
                <div style={{ background: C.card, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 4, ...headerStyle }}>AGENTS</div>
                  {archAgents.map(a => (
                    <div key={a.name} style={{ fontSize: 11, color: C.text2, marginBottom: 2 }}>
                      {a.name} <span style={{ color: C.text3 }}>({a.traditional}) &middot; {a.nickname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STRUCTURAL POSITION (derivation, at bottom) */}
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>STRUCTURAL POSITION</div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
              <div><span style={{ color: C.text3 }}>House:</span> {arch?.house}</div>
              <div><span style={{ color: C.text3 }}>Channel:</span> {arch?.channel || 'None (Gestalt)'}</div>
              {stage && <div><span style={{ color: C.text3 }}>Stage:</span> <span style={{ color: FULL_STAGE_COLORS[stage] }}>{stage}</span></div>}
            </div>
          </div>
        </>
      );
    }

    // NEIGHBORHOOD VIEW
    if (sidebarLevel === 'neighborhood' && selectedNeighborhood && NEIGHBORHOODS[selectedNeighborhood]) {
      const nb = NEIGHBORHOODS[selectedNeighborhood];
      const canon = NEIGHBORHOOD_CANON[selectedNeighborhood];
      const sectionHead = { ...headerStyle, fontSize: 10, color: C.text3, marginTop: 18, marginBottom: 6 };
      const para = { fontSize: 12, color: C.text2, lineHeight: 1.65, marginBottom: 8 };
      return (
        <>
          <div style={{ ...headerStyle, fontSize: 14, color: nb.color, marginBottom: 4 }}>{selectedNeighborhood.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>
            Toroidal Neighborhood · {nb.arc} arc · {nb.mode} mode · Sum = 40
          </div>

          {canon && (
            <div style={{ ...para, color: C.text, fontStyle: 'italic', borderLeft: `2px solid ${nb.color}60`, paddingLeft: 12, marginBottom: 14 }}>
              {canon.definition}
            </div>
          )}

          {!canon && nb.description && (
            <div style={{ ...para, fontStyle: 'italic', borderLeft: `2px solid ${nb.color}40`, paddingLeft: 10, marginBottom: 14 }}>
              {nb.description}
            </div>
          )}

          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, marginBottom: 8 }}>
            <div><span style={{ color: C.text3 }}>Practice:</span> <span style={{ color: C.Practice }}>{nb.practice}</span></div>
            <div><span style={{ color: C.text3 }}>Activity:</span> <span style={{ color: C.Activity }}>{nb.activity}</span></div>
            <div style={{ marginTop: 6 }}>
              <span style={{ color: C.text3 }}>Collapses:</span> <span style={{ color: C[nb.collapses] || C.text }}>{nb.collapses}</span>
              <span style={{ color: C.text3, marginLeft: 12 }}>Complete in:</span>{' '}
              {['Stage', 'Being', 'Identity'].filter(d => d !== nb.collapses).map(d => (
                <span key={d} style={{ color: C[d] || C.text, marginRight: 8 }}>{d}</span>
              ))}
            </div>
          </div>

          <div style={sectionHead}>MEMBERS</div>
          {nb.members.map(id => {
            const arch = ARCHETYPES[id];
            const stg = FULL_STAGES[id];
            return (
              <div key={id} onClick={() => { setSelectedNeighborhood(null); setSelectedArchetype(id); setShowAll(false); }}
                style={{ fontSize: 12, color: C.text2, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', marginBottom: 3, transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: FULL_STAGE_COLORS[stg] }}>{STAGE_SYMBOLS[stg]}</span>{' '}
                <span style={{ fontWeight: 600 }}>{showTraditional ? (arch?.traditional || arch?.name) : arch?.name}</span>{' '}
                <span style={{ color: C.text3 }}>({id}) — {stg}</span>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4, fontStyle: 'italic' }}>
            Sum: {nb.members.reduce((s, id) => s + id, 0)} = 40
          </div>

          {canon && (
            <>
              <div style={sectionHead}>WHY THESE FOUR</div>
              <div style={para}>{canon.whyFour}</div>

              <div style={sectionHead}>THE COLLAPSE</div>
              <div style={para}>{canon.collapseMeans}</div>

              <div style={sectionHead}>PRACTICAL RECOGNITION</div>
              <div style={para}>{canon.practical}</div>

              <div style={sectionHead}>HEALTHY FORM</div>
              <div style={para}>{canon.healthy}</div>

              <div style={{ ...sectionHead, color: '#f59e0b80' }}>SHADOW FORM</div>
              <div style={{ ...para, color: '#fbbf24c0' }}>{canon.shadow}</div>

              <div style={sectionHead}>TORUS ADJACENCY</div>
              <div style={{ ...para, fontSize: 11, color: C.text3 }}>{canon.adjacency}</div>

              <div style={{ marginTop: 18, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.text3, lineHeight: 1.6 }}>
                <div><span style={{ color: '#22c55e' }}>●</span> Canonical confidence: <span style={{ color: C.text2 }}>{canon.confidence}</span></div>
                <div style={{ marginTop: 4 }}>Name status: <span style={{ color: C.text2, fontStyle: 'italic' }}>{canon.nameStatus}</span></div>
              </div>
            </>
          )}

          {!canon && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={sectionHead}>WHAT THIS MEANS</div>
              <div style={para}>
                This neighborhood is the smallest unit on the Seal that achieves both specificity and completeness.
                It is locally specific in {nb.collapses} (2 of 4 groups repeat), giving it a persistent identity.
                It is internally complete in the other two Latin square dimensions (all 4 groups present),
                giving it the full process space.
              </div>
            </div>
          )}
        </>
      );
    }

    // COMBINATORICS / QUADRUPLE VIEW
    if (sidebarLevel === 'quadruple' && selectedQuadruple !== null && QUADRUPLES_40[selectedQuadruple]) {
      const quad = QUADRUPLES_40[selectedQuadruple];
      const catInfo = QUAD_CATEGORIES.find(c => c.name === quad.category);
      const isGeometric = quad.category !== 'Mixed';
      return (
        <>
          <div style={{ ...headerStyle, fontSize: 14, color: quad.color, marginBottom: 4 }}>{quad.label}</div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 4 }}>{quad.category} — Sum = 40</div>
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 12 }}>{catInfo?.desc}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: isGeometric ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${isGeometric ? '#22c55e40' : '#64748b40'}`, color: isGeometric ? '#22c55e' : '#64748b' }}>
              {isGeometric ? 'GEOMETRIC' : 'MIXED'} — {isGeometric ? '1 of 40' : '1 of 40'}
            </span>
          </div>

          <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>MEMBERS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {quad.members.map(id => {
              const arch = ARCHETYPES[id];
              return (
                <div key={id} onClick={() => { setSelectedQuadruple(null); setSelectedArchetype(id); setShowAll(false); }}
                  style={{ padding: '6px 12px', borderRadius: 8, background: C.card, border: `1px solid ${quad.color}40`, cursor: 'pointer', textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: quad.color }}>{id}</div>
                  <div style={{ fontSize: 10, color: C.text2 }}>{showTraditional ? arch?.traditional : arch?.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 16 }}>
            {quad.members.join(' + ')} = {quad.members.reduce((s,v) => s+v, 0)}
          </div>

          <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>HAMMING DISTANCES</div>
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 16 }}>
            [{quad.distances.join(', ')}]
            {quad.category === 'Tetrahedron' && <span style={{ color: '#22d3ee', marginLeft: 8 }}>All equal = regular tetrahedron</span>}
          </div>

          <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>DIMENSIONAL MEMBERSHIP</div>
          {['Practice', 'Activity', 'Being', 'Identity', 'Stage'].map(dim => {
            const groups = new Set();
            const aspectDef = ASPECTS[dim];
            if (aspectDef) {
              Object.entries(aspectDef.groups).forEach(([gName, gDef]) => {
                quad.members.forEach(id => { if (gDef.members.includes(id)) groups.add(gName); });
              });
            }
            return (
              <div key={dim} style={{ fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: C[dim] || C.text3 }}>{dim}:</span>{' '}
                <span style={{ color: groups.size === 4 ? '#22c55e' : groups.size === 2 ? '#f59e0b' : C.text2 }}>
                  {[...groups].join(', ')} ({groups.size}/4)
                </span>
              </div>
            );
          })}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <button onClick={() => {
              const filtered = quadFilter ? QUADRUPLES_40.filter(q => q.category === quadFilter) : QUADRUPLES_40;
              const currentIdx = filtered.indexOf(quad);
              const prevIdx = (currentIdx - 1 + filtered.length) % filtered.length;
              setSelectedQuadruple(QUADRUPLES_40.indexOf(filtered[prevIdx]));
            }} style={btnSm(false, quad.color)}>Prev</button>
            <button onClick={() => {
              const filtered = quadFilter ? QUADRUPLES_40.filter(q => q.category === quadFilter) : QUADRUPLES_40;
              const currentIdx = filtered.indexOf(quad);
              const nextIdx = (currentIdx + 1) % filtered.length;
              setSelectedQuadruple(QUADRUPLES_40.indexOf(filtered[nextIdx]));
            }} style={btnSm(false, quad.color)}>Next</button>
          </div>
        </>
      );
    }

    // BEING GROUP VIEW
    if (sidebarLevel === 'being') {
      const groupNames = [...selectedBeingGroups];
      return (
        <>
          {groupNames.map(n => {
            const gDef = ASPECTS.Being.groups[n];
            const ext = gDef?.extended || gDef?.description || '';
            return (
              <div key={n} style={{ marginBottom: 20 }}>
                <div style={{ ...headerStyle, fontSize: 13, color: useGroupColors ? (GROUP_COLORS[n] || C.Being) : C.Being, marginBottom: 4 }}>{n.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>{gDef?.verb} — {gDef?.spatial || gDef?.description}</div>
                <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6, marginBottom: 12 }}>{ext}</div>

                <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>MEMBERS</div>
                {gDef?.members?.map(id => {
                  const stg = FULL_STAGES[id];
                  return (
                    <div key={id} onClick={() => setSelectedArchetype(id)}
                      style={{ fontSize: 12, color: C.text2, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', marginBottom: 3, transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ color: FULL_STAGE_COLORS[stg] }}>{STAGE_SYMBOLS[stg]}</span>
                      <span>{stg}: {showTraditional ? (ARCHETYPES[id]?.traditional || ARCHETYPES[id]?.name) : ARCHETYPES[id]?.name} ({id})</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* DERIVATION */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 8 }}>
            <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>HOW IT'S DERIVED</div>
            <SidebarText title="" body={DERIVATION_CONTENT.Being.body} />
          </div>
        </>
      );
    }

    // IDENTITY GROUP VIEW
    if (sidebarLevel === 'identity') {
      const groupNames = [...selectedIdentityGroups];
      return (
        <>
          {groupNames.map(n => {
            const gDef = ASPECTS.Identity.groups[n];
            const ext = gDef?.extended || gDef?.description || '';
            return (
              <div key={n} style={{ marginBottom: 20 }}>
                <div style={{ ...headerStyle, fontSize: 13, color: useGroupColors ? (GROUP_COLORS[n] || C.Identity) : C.Identity, marginBottom: 4 }}>{n.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>{gDef?.verb} — {gDef?.center || gDef?.description}</div>
                <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6, marginBottom: 12 }}>{ext}</div>

                <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>MEMBERS</div>
                {gDef?.members?.map(id => {
                  const stg = FULL_STAGES[id];
                  return (
                    <div key={id} onClick={() => setSelectedArchetype(id)}
                      style={{ fontSize: 12, color: C.text2, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', marginBottom: 3, transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ color: FULL_STAGE_COLORS[stg] }}>{STAGE_SYMBOLS[stg]}</span>
                      <span>{stg}: {showTraditional ? (ARCHETYPES[id]?.traditional || ARCHETYPES[id]?.name) : ARCHETYPES[id]?.name} ({id})</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* DERIVATION */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 8 }}>
            <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>HOW IT'S DERIVED</div>
            <SidebarText title="" body={DERIVATION_CONTENT.Identity.body} />
          </div>
        </>
      );
    }

    // ASPECT VIEW (selected aspect but no group yet)
    if (sidebarLevel === 'aspect' && selectedAspect) {
      const aspect = ASPECTS[selectedAspect];
      return (
        <>
          <div style={{ ...headerStyle, fontSize: 13, color: C[selectedAspect], marginBottom: 4 }}>{selectedAspect.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>{aspect?.question}</div>
          <SidebarText title="" body={DERIVATION_CONTENT[selectedAspect]?.body || ''} />
          <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>GROUPS</div>
            {Object.entries(aspect?.groups || {}).map(([gName, gDef]) => (
              <div key={gName} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: useGroupColors ? (GROUP_COLORS[gName] || C[selectedAspect]) : C[selectedAspect] }}>{gName}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{gDef?.verb} — {gDef?.description}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
                  {gDef?.members?.map(id => `${showTraditional ? (ARCHETYPES[id]?.traditional || ARCHETYPES[id]?.name) : ARCHETYPES[id]?.name} (${id})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    // DEFAULT VIEW
    return (
      <>
        <div style={{ ...headerStyle, fontSize: 13, color: C.text3, marginBottom: 4 }}>THE FOUR ASPECTS</div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>Where &middot; How &middot; What &middot; Who</div>

        {Object.entries(ASPECTS).map(([name, a]) => (
          <div key={name} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C[name] }}>{name} <span style={{ fontWeight: 400, color: C.text3 }}>({a.question})</span></div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {Object.entries(a.groups).map(([gName, gDef], i, arr) => {
                const verb = gDef.verb || gName;
                const gColor = useGroupColors ? (GROUP_COLORS[gName] || C.text2) : C.text2;
                return <span key={gName}><span style={{ color: gColor }}>{gName}</span><span style={{ color: C.text3 }}> ({verb}){i < arr.length - 1 ? ', ' : ''}</span></span>;
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
            Select an Aspect above to explore its groups.
          </div>
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6, marginTop: 4 }}>
            Click any archetype on the grid to see its detail.
          </div>
        </div>

        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ ...headerStyle, fontSize: 10, color: C.text3, marginBottom: 8 }}>HOW IT'S DERIVED</div>
          <SidebarText title="" body={DERIVATION_CONTENT.aspects.body} />
        </div>
      </>
    );
  }

  // === MAIN RENDER ===
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.border}`, background: C.panel }}>
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text, ...headerStyle }}>
          NIRMANAKAYA ARCHITECTURE EXPLORER
        </h1>
      </div>

      {/* EXPLORE + GROUPS toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, color: C.text3, fontWeight: 700, ...headerStyle }}>EXPLORE</span>
        {[...DIMENSION_ORDER, 'Stage'].map(dim => {
          const active = selectedAspect === dim;
          const hasGroups = (dim === 'Being' && selectedBeingGroups.size > 0) ||
            (dim === 'Identity' && selectedIdentityGroups.size > 0) ||
            (dim === 'Practice' && selectedPracticeGroups.size > 0) ||
            (dim === 'Activity' && selectedActivityGroups.size > 0) ||
            (dim === 'Stage' && selectedStageGroups.size > 0);
          return (
            <button key={dim} onClick={() => {
              if (selectedAspect === dim) {
                // Deselect this aspect — clear its groups only
                setSelectedAspect(null);
                if (dim === 'Being') setSelectedBeingGroups(new Set());
                if (dim === 'Identity') setSelectedIdentityGroups(new Set());
                if (dim === 'Practice') setSelectedPracticeGroups(new Set());
                if (dim === 'Activity') setSelectedActivityGroups(new Set());
                if (dim === 'Stage') setSelectedStageGroups(new Set());
                setSelectedArchetype(null);
                // If nothing else selected, go back to showAll
                const otherActive = (dim !== 'Being' && selectedBeingGroups.size > 0) ||
                  (dim !== 'Identity' && selectedIdentityGroups.size > 0) ||
                  (dim !== 'Practice' && selectedPracticeGroups.size > 0) ||
                  (dim !== 'Activity' && selectedActivityGroups.size > 0) ||
                  (dim !== 'Stage' && selectedStageGroups.size > 0);
                if (!otherActive) setShowAll(true);
              } else {
                setSelectedAspect(dim);
                setSelectedArchetype(null);
                setShowAll(false);
              }
            }} style={btn(active || hasGroups, C[dim])}>
              {dim}
            </button>
          );
        })}
        {selectedAspect && currentAspectGroups && (
          <>
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            {Object.entries(currentAspectGroups).map(([gName, gDef]) => {
              const isSelected = selectedGroupsForAspect.has(gName);
              const btnColor = useGroupColors && isSelected ? (GROUP_COLORS[gName] || C[selectedAspect]) : C[selectedAspect];
              return (
                <button key={gName} onClick={() => toggleGroupForAspect(selectedAspect, gName)}
                  style={{ ...btn(isSelected, btnColor), opacity: isSelected ? 1 : 0.7 }}>
                  {gName} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{gDef.verb}</span>
                </button>
              );
            })}
            <button onClick={() => {
              const allNames = Object.keys(currentAspectGroups);
              const allSelected = allNames.every(n => selectedGroupsForAspect.has(n));
              const setter = selectedAspect === 'Being' ? setSelectedBeingGroups
                : selectedAspect === 'Identity' ? setSelectedIdentityGroups
                : selectedAspect === 'Practice' ? setSelectedPracticeGroups
                : selectedAspect === 'Activity' ? setSelectedActivityGroups
                : setSelectedStageGroups;
              setter(allSelected ? new Set() : new Set(allNames));
              setShowAll(false);
              setSelectedArchetype(null);
            }} style={btnSm(false, '#e2e8f0')}>
              {Object.keys(currentAspectGroups).every(n => selectedGroupsForAspect.has(n)) ? 'None' : 'All'}
            </button>
          </>
        )}
        <span style={{ color: '#334155', fontSize: 10 }}>|</span>
        <button onClick={() => {
          if (selectedNeighborhood) {
            setSelectedNeighborhood(null);
            setShowAll(true);
          } else {
            // Show neighborhood picker — select first one
            setSelectedNeighborhood('Luminous Direction');
            setShowAll(false);
            setSelectedArchetype(null);
          }
        }} style={btn(selectedNeighborhood !== null, '#f0c040')}>
          Neighborhoods
        </button>
        {selectedNeighborhood !== null && (
          <>
            <select
              value={selectedNeighborhood || ''}
              onChange={e => { setSelectedNeighborhood(e.target.value); setShowAll(false); }}
              style={{
                background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
                borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit', maxWidth: 180,
              }}>
              <optgroup label="Intent+Cognition (Directed Perception)">
                {Object.entries(NEIGHBORHOODS).filter(([,n]) => n.mode === 'Directed Perception').map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
              <optgroup label="Cognition+Resonance (Relational Knowing)">
                {Object.entries(NEIGHBORHOODS).filter(([,n]) => n.mode === 'Relational Knowing').map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
              <optgroup label="Resonance+Structure (Grounded Holding)">
                {Object.entries(NEIGHBORHOODS).filter(([,n]) => n.mode === 'Grounded Holding').map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
              <optgroup label="Structure+Intent (Creative Building)">
                {Object.entries(NEIGHBORHOODS).filter(([,n]) => n.mode === 'Creative Building').map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
            </select>
          </>
        )}
        <span style={{ color: '#334155', fontSize: 10 }}>|</span>
        <button onClick={() => {
          if (showCombinatorics) {
            setShowCombinatorics(false);
            setSelectedQuadruple(null);
            setQuadFilter(null);
            setShowAll(true);
          } else {
            setShowCombinatorics(true);
            setSelectedNeighborhood(null);
            setSelectedArchetype(null);
            setSelectedAspect(null);
            setSelectedBeingGroups(new Set());
            setSelectedIdentityGroups(new Set());
            setSelectedPracticeGroups(new Set());
            setSelectedActivityGroups(new Set());
            setSelectedStageGroups(new Set());
            setSelectedQuadruple(null);
            setQuadFilter(null);
            setShowAll(true);
          }
        }} style={btn(showCombinatorics, '#22d3ee')}>
          Combinatorics
        </button>
        {showCombinatorics && (
          <>
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <span style={{ fontSize: 10, color: '#22d3ee', fontWeight: 600 }}>40+40=80</span>
            {QUAD_CATEGORIES.map(cat => (
              <button key={cat.name} onClick={() => {
                const newFilter = quadFilter === cat.name ? null : cat.name;
                setQuadFilter(newFilter);
                if (newFilter) {
                  const first = QUADRUPLES_40.findIndex(q => q.category === newFilter);
                  setSelectedQuadruple(first >= 0 ? first : null);
                  setShowAll(false);
                } else {
                  setSelectedQuadruple(null);
                  setShowAll(true);
                }
              }} style={btnSm(quadFilter === cat.name, cat.color)} title={cat.desc}>
                {cat.name} ({cat.count})
              </button>
            ))}
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <span style={{ fontSize: 9, color: C.text3, fontStyle: 'italic' }} title="The 40 'Mixed' quads split into 5 structural families (placeholders O₁–O₅). Same-family quads are the same shape in different poses; different-family quads are genuinely different kinds of thing.">Mixed families:</span>
            {Object.entries(MIXED_ORBITS).map(([oid, info]) => (
              <button key={oid} onClick={() => {
                const filterKey = `orbit:${oid}`;
                const newFilter = quadFilter === filterKey ? null : filterKey;
                setQuadFilter(newFilter);
                if (newFilter) {
                  const first = QUADRUPLES_40.findIndex(q => q.orbit === oid);
                  setSelectedQuadruple(first >= 0 ? first : null);
                  setShowAll(false);
                } else {
                  setSelectedQuadruple(null);
                  setShowAll(true);
                }
              }} style={btnSm(quadFilter === `orbit:${oid}`, info.color)} title={`${oid} · ${info.name} (${info.count})\nWeight: ${info.weight} — ${info.weightNote}\n\n${info.oneLine}\n\n${info.desc}`}>
                {oid} ({info.count})
              </button>
            ))}
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <span style={{ fontSize: 9, color: C.text3 }}>
              {(() => {
                if (!quadFilter) return 80;
                if (quadFilter.startsWith('orbit:')) {
                  const oid = quadFilter.split(':')[1];
                  return QUADRUPLES_40.filter(q => q.orbit === oid).length;
                }
                return QUADRUPLES_40.filter(q => q.category === quadFilter).length;
              })()} showing
            </span>
          </>
        )}
        {groupFilterActive && (
          <>
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <button onClick={() => {
              setSelectedBeingGroups(new Set());
              setSelectedIdentityGroups(new Set());
              setSelectedPracticeGroups(new Set());
              setSelectedActivityGroups(new Set());
              setSelectedStageGroups(new Set());
              setSelectedNeighborhood(null);
              setSelectedQuadruple(null);
              setShowCombinatorics(false);
              setQuadFilter(null);
              setSelectedAspect(null);
              setShowAll(true);
            }} style={btnSm(false, '#ef4444')}>Clear All</button>
          </>
        )}
      </div>

      {/* 3-PANE CONSOLE: Navigator | Visualizer | Inspector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1fr) 1.5fr minmax(300px, 380px)',
        gap: 12, padding: 12,
        height: 'calc(100vh - 105px)',
        overflow: 'hidden',
      }}>
        {/* LEFT — Navigator: Soul House Bar + Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, overflow: 'hidden' }}>
          <SoulHouseBar />
          <div style={{
            border: '1px solid #1e293b', borderRadius: '0 0 12px 12px', background: '#0f172a',
            display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>GRID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setShowLabels(p => !p)} style={btnSm(showLabels, '#e2e8f0')}>Labels</button>
                <button onClick={() => setShowTorus(p => !p)} style={btnSm(showTorus, '#f59e0b')}>Torus</button>
                <span style={{ color: '#334155', fontSize: 10 }}>|</span>
                <button onClick={() => setGridZoom(z => Math.max(0.3, z - 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>&minus;</button>
                <span style={{ fontSize: 10, color: '#64748b', minWidth: 32, textAlign: 'center' }}>{Math.round(gridZoom * 100)}%</span>
                <button onClick={() => setGridZoom(z => Math.min(3, z + 0.15))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>+</button>
              </div>
            </div>
            <div style={{ overflow: 'hidden', padding: 12, flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ transform: `scale(${gridZoom})`, transformOrigin: 'top center', transition: 'transform 0.15s' }}>
                <GridView
                  selectedSeed={groupFilterActive || selectedArchetype !== null ? null : selectedSeed}
                  showAll={groupFilterActive || selectedArchetype !== null ? false : showAll}
                  dimVisible={groupFilterActive || selectedArchetype !== null ? { Practice: false, Activity: false, Being: false, Identity: false } : dimVisible}
                  selectedBeingGroups={selectedBeingGroups}
                  selectedIdentityGroups={selectedIdentityGroups}
                  showLabels={showLabels} showTorus={showTorus} compact={true}
                  onSelectArchetype={onSelectArchetype}
                  highlightOverride={highlightSet.size > 0 ? highlightSet : null}
                  pathOverride={activePaths.length > 0 ? activePaths : null}
                  showTraditional={showTraditional}
                  suppressSeedGlow={showCombinatorics || selectedNeighborhood !== null || selectedBeingGroups.size > 0 || selectedIdentityGroups.size > 0 || selectedArchetype !== null}
                />
              </div>
            </div>
            {showCombinatorics && (
              <div style={{
                flex: '0 0 35%', minHeight: 120, maxHeight: '35%', overflowY: 'auto',
                background: '#0f172a', borderTop: `1px solid ${C.border}`,
                padding: 8,
              }}>
                <div style={{ fontSize: 10, color: C.text3, marginBottom: 6, ...headerStyle }}>
                  {(() => {
                    if (!quadFilter) return 'ALL 80 QUADRUPLES SUMMING TO 40';
                    if (quadFilter.startsWith('orbit:')) {
                      const oid = quadFilter.split(':')[1];
                      const info = MIXED_ORBITS[oid];
                      return `${oid} · ${info.name.toUpperCase()} (${info.count}) · WEIGHT: ${info.weight.toUpperCase()} — ${info.oneLine}`;
                    }
                    return `${quadFilter.toUpperCase()}S SUMMING TO 40`;
                  })()}
                </div>
                {(() => {
                  if (!quadFilter) return QUADRUPLES_40;
                  if (quadFilter.startsWith('orbit:')) {
                    const oid = quadFilter.split(':')[1];
                    return QUADRUPLES_40.filter(q => q.orbit === oid);
                  }
                  return QUADRUPLES_40.filter(q => q.category === quadFilter);
                })().map((quad) => {
                  const globalIdx = QUADRUPLES_40.indexOf(quad);
                  const isSelected = selectedQuadruple === globalIdx;
                  return (
                    <div key={globalIdx} onClick={() => {
                      if (isSelected) {
                        setSelectedQuadruple(null);
                        setShowAll(true);
                      } else {
                        setSelectedQuadruple(globalIdx);
                        setShowAll(false);
                      }
                    }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                        background: isSelected ? `${quad.color}15` : 'transparent',
                        border: isSelected ? `1px solid ${quad.color}40` : '1px solid transparent',
                        marginBottom: 2, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(56,189,248,0.04)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 9, color: quad.color, fontWeight: 700, minWidth: 55 }}>{quad.label}</span>
                      <span style={{ fontSize: 11, color: isSelected ? C.text : C.text2, fontFamily: 'monospace' }}>
                        {quad.members.join(', ')}
                      </span>
                      {quad.orbit && (
                        <span style={{ fontSize: 9, color: MIXED_ORBITS[quad.orbit].color, fontWeight: 600, marginLeft: 'auto' }} title={`${quad.orbit} · ${MIXED_ORBITS[quad.orbit].name}`}>
                          {quad.orbit}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: C.text3, marginLeft: quad.orbit ? 6 : 'auto' }}>{quad.category}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — Visualizer: Tesseract */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{
            border: '1px solid #1e293b', borderRadius: 12, background: '#0f172a',
            display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>TESSERACT</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setTessZoom(z => Math.max(0.5, z - 0.2))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>&minus;</button>
                <span style={{ fontSize: 10, color: '#64748b', minWidth: 32, textAlign: 'center' }}>{Math.round(tessZoom * 100)}%</span>
                <button onClick={() => setTessZoom(z => Math.min(3, z + 0.2))} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: '20px', padding: 0 }}>+</button>
              </div>
            </div>
            <div style={{ overflow: 'hidden', padding: 12, flex: 1 }}>
              <TesseractView
                colorMode={colorMode} autoRotate={autoRotate}
                showAffinePlanes={affinePlaneIdx}
                affineShadeFill={affineShadeFill}
                highlightSet={highlightSet}
                activePaths={activePaths}
                compact={true}
                zoom={tessZoom}
                showStages={showTessStages}
                showTraditional={showTraditional}
                angleXW={tessAngleXW} setAngleXW={setTessAngleXW}
                angleYZ={tessAngleYZ} setAngleYZ={setTessAngleYZ}
                angleXY={tessAngleXY} setAngleXY={setTessAngleXY}
                rotateAxis={tessRotateAxis}
                onSelectArchetype={onSelectArchetype}
              />
            </div>
          </div>
          {/* Tesseract controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', flexWrap: 'wrap' }}>
            <button onClick={() => setAutoRotate(p => !p)} style={btnSm(autoRotate, '#e2e8f0')} title="Auto-rotate the tesseract continuously">Rotate</button>
            <button onClick={() => setAffinePlaneIdx(p => p === null ? 0 : p >= 4 ? null : p + 1)} style={btnSm(affinePlaneIdx !== null, '#f59e0b')} title="Cycle the 4 affine diagonals (each sums to 40) — off → D1 → D2 → D3 → D4 → All 4 → off">
              {affinePlaneIdx === null ? 'Diagonals' : affinePlaneIdx === 4 ? 'All 4' : `D${affinePlaneIdx + 1}`}
            </button>
            <button onClick={() => setAffineShadeFill(p => !p)} style={btnSm(affineShadeFill, '#f59e0b')} title="Fill active diagonal plane with translucent shading">Shade</button>
            <button onClick={() => setShowTessStages(p => !p)} style={btnSm(showTessStages, '#22c55e')} title="Show stage labels (Seed / Medium / Fruition / Feedback) on each vertex">Stages</button>
            <button onClick={() => setUseGroupColors(p => !p)} style={btnSm(useGroupColors, '#c084fc')} title="Color vertices by selected group instead of color-mode dimension">Group Colors</button>
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <button onClick={() => setTessRotateAxis(p => p === 'XW+YZ' ? 'XY+ZW' : 'XW+YZ')} style={btnSm(false, '#94a3b8')} title="Toggle which 4D rotation axes your mouse drag controls (XW+YZ ↔ XY+ZW)">Axis: {tessRotateAxis}</button>
            <button onClick={() => { setTessAngleXW(0.4); setTessAngleYZ(0.3); setTessAngleXY(0); }} style={btnSm(false, '#94a3b8')} title="Reset to the default tesseract orientation">Default</button>
            <button onClick={() => { setTessAngleXW(0); setTessAngleYZ(0); setTessAngleXY(0); }} style={btnSm(false, '#94a3b8')} title="Flatten view — all rotation angles set to 0">Flat</button>
            <button onClick={() => { setTessAngleXW(0.78); setTessAngleYZ(0.55); setTessAngleXY(0.35); }} style={btnSm(false, '#94a3b8')} title="Classic three-quarter perspective view">Classic</button>
            <button onClick={() => { setTessAngleXW(1.2); setTessAngleYZ(0.8); setTessAngleXY(0.6); }} style={btnSm(false, '#94a3b8')} title="Deep tilted perspective — emphasizes 4D nesting">Deep</button>
            <button onClick={() => { setTessAngleXW(Math.PI/4); setTessAngleYZ(Math.PI/4); setTessAngleXY(Math.PI/4); }} style={btnSm(false, '#94a3b8')} title="Equal 45° rotation on all three axis pairs">45°</button>
            <span style={{ color: '#334155', fontSize: 10 }}>|</span>
            <span style={{ fontSize: 10, color: C.text3 }}>Color:</span>
            {Object.keys(COLOR_MODES).map(m => (
              <button key={m} onClick={() => setColorMode(m)} style={btnSm(colorMode === m, '#e2e8f0')} title={`Color vertices by ${m} grouping`}>{m}</button>
            ))}
          </div>
          {/* Color legend — shows selected groups when active, otherwise color mode */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '2px 4px', flexWrap: 'wrap' }}>
            {(() => {
              // Build legend entries from active selections
              const entries = [];
              const gc = useGroupColors;
              selectedPracticeGroups.forEach(n => entries.push({ name: n, color: gc ? GROUP_COLORS[n] : '#4ade80', aspect: 'Practice' }));
              selectedActivityGroups.forEach(n => entries.push({ name: n, color: gc ? GROUP_COLORS[n] : '#ef4444', aspect: 'Activity' }));
              selectedBeingGroups.forEach(n => entries.push({ name: n, color: gc ? GROUP_COLORS[n] : '#fbbf24', aspect: 'Being' }));
              selectedIdentityGroups.forEach(n => entries.push({ name: n, color: gc ? GROUP_COLORS[n] : '#a855f7', aspect: 'Identity' }));
              selectedStageGroups.forEach(n => entries.push({ name: n, color: gc ? GROUP_COLORS[n] : (FULL_STAGE_COLORS[n] || '#8b5cf6'), aspect: 'Stage' }));
              if (selectedNeighborhood && NEIGHBORHOODS[selectedNeighborhood]) {
                entries.push({ name: selectedNeighborhood, color: NEIGHBORHOODS[selectedNeighborhood].color, aspect: 'Neighborhood' });
              }
              // Fall back to color mode legend if no groups selected
              if (entries.length === 0) {
                return Object.entries(COLOR_MODES[colorMode]).map(([name, g]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                    <span style={{ fontSize: 9, color: g.color, fontWeight: 500 }}>{name}</span>
                  </div>
                ));
              }
              return entries.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                  <span style={{ fontSize: 9, color: e.color, fontWeight: 500 }}>{e.name}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* RIGHT — Inspector: Detail readout */}
        <div style={{
          background: '#0c1222', borderRadius: 12,
          border: '1px solid #1e293b',
          overflowY: 'auto', padding: '12px 16px',
          minHeight: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>INSPECTOR</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setShowTraditional(p => !p)}
                style={btnSm(showTraditional, '#f59e0b')}>{showTraditional ? 'TRAD' : 'VERB'}</button>
              <span style={{ color: '#334155', fontSize: 10 }}>|</span>
              <span style={{ fontSize: 10, color: C.text3 }}>Text:</span>
              <button onClick={() => setTextSize(s => Math.max(10, s - 2))}
                style={btnSm(false, '#e2e8f0')}>A&minus;</button>
              <button onClick={() => setTextSize(s => Math.min(24, s + 2))}
                style={btnSm(false, '#e2e8f0')}>A+</button>
              <span style={{ fontSize: 9, color: C.text3 }}>{textSize}px</span>
            </div>
          </div>
          <div style={{ zoom: textSize / 14, lineHeight: '1.5' }}>
            <SidebarContent />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MOBILE LAYOUT
// =============================================
function ExploreMobile() {
  // === STATE (mirrors desktop's relevant state) ===
  const [selectedSeed, setSelectedSeed] = useState(8);
  const [showAll, setShowAll] = useState(true);
  const [dimVisible] = useState({ Practice: true, Activity: true, Being: true, Identity: true });
  const [selectedBeingGroups, setSelectedBeingGroups] = useState(new Set());
  const [selectedIdentityGroups, setSelectedIdentityGroups] = useState(new Set());
  const [selectedPracticeGroups, setSelectedPracticeGroups] = useState(new Set());
  const [selectedActivityGroups, setSelectedActivityGroups] = useState(new Set());
  const [selectedStageGroups, setSelectedStageGroups] = useState(new Set());
  const [selectedAspect, setSelectedAspect] = useState('Practice');
  const [showLabels, setShowLabels] = useState(false);
  const [showTorus, setShowTorus] = useState(false);
  const [showTraditional, setShowTraditional] = useState(false);
  const [colorMode, setColorMode] = useState('Being');
  const [autoRotate, setAutoRotate] = useState(true);
  const [tessAngleXW, setTessAngleXW] = useState(0.4);
  const [tessAngleYZ, setTessAngleYZ] = useState(0.3);
  const [tessAngleXY, setTessAngleXY] = useState(0);
  const [tessRotateAxis] = useState('XW+YZ');
  const [selectedArchetype, setSelectedArchetype] = useState(null);

  // === MOBILE-SPECIFIC STATE ===
  const [primaryView, setPrimaryView] = useState('tesseract'); // 'tesseract' | 'grid'
  const [sheetOpen, setSheetOpen] = useState(null); // null | 'filters' | 'info' | 'controls'

  // Currently active groups for the selected aspect
  const selectedGroupsForAspect = useMemo(() => {
    if (selectedAspect === 'Being') return selectedBeingGroups;
    if (selectedAspect === 'Identity') return selectedIdentityGroups;
    if (selectedAspect === 'Practice') return selectedPracticeGroups;
    if (selectedAspect === 'Activity') return selectedActivityGroups;
    if (selectedAspect === 'Stage') return selectedStageGroups;
    return new Set();
  }, [selectedAspect, selectedBeingGroups, selectedIdentityGroups, selectedPracticeGroups, selectedActivityGroups, selectedStageGroups]);

  const currentAspectGroups = selectedAspect ? ASPECTS[selectedAspect]?.groups : null;

  const toggleGroupForAspect = useCallback((aspect, name) => {
    if (aspect === 'Being') setSelectedBeingGroups(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });
    else if (aspect === 'Identity') setSelectedIdentityGroups(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });
    else if (aspect === 'Practice') setSelectedPracticeGroups(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });
    else if (aspect === 'Activity') setSelectedActivityGroups(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });
    else if (aspect === 'Stage') setSelectedStageGroups(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });
    setShowAll(false);
  }, []);

  // Compute highlight set from active groups
  const highlightSet = useMemo(() => {
    if (showAll && selectedGroupsForAspect.size === 0) return null;
    const ids = new Set();
    [...selectedBeingGroups].forEach(g => BEING_GROUPS[g]?.members?.forEach(id => ids.add(id)));
    [...selectedIdentityGroups].forEach(g => IDENTITY_GROUPS[g]?.members?.forEach(id => ids.add(id)));
    [...selectedPracticeGroups].forEach(g => PRACTICE_GROUPS[g]?.members?.forEach(id => ids.add(id)));
    [...selectedActivityGroups].forEach(g => ACTIVITY_GROUPS[g]?.members?.forEach(id => ids.add(id)));
    [...selectedStageGroups].forEach(g => STAGE_GROUPS[g]?.members?.forEach(id => ids.add(id)));
    return ids.size > 0 ? ids : null;
  }, [showAll, selectedGroupsForAspect, selectedBeingGroups, selectedIdentityGroups, selectedPracticeGroups, selectedActivityGroups, selectedStageGroups]);

  const swapViews = () => setPrimaryView(p => p === 'tesseract' ? 'grid' : 'tesseract');
  const openSheet = (which) => setSheetOpen(s => s === which ? null : which);

  // Render the primary (full) view
  const renderPrimary = () => {
    if (primaryView === 'tesseract') {
      return (
        <TesseractView
          colorMode={colorMode}
          autoRotate={autoRotate}
          showAffinePlanes={false}
          affineShadeFill={true}
          highlightSet={highlightSet}
          activePaths={null}
          compact={false}
          zoom={0.85}
          showStages={false}
          showTraditional={showTraditional}
          angleXW={tessAngleXW}
          setAngleXW={setTessAngleXW}
          angleYZ={tessAngleYZ}
          setAngleYZ={setTessAngleYZ}
          angleXY={tessAngleXY}
          setAngleXY={setTessAngleXY}
          rotateAxis={tessRotateAxis}
          onSelectArchetype={(id) => { setSelectedArchetype(id); setSheetOpen('info'); }}
        />
      );
    }
    return (
      <GridView
        selectedSeed={selectedSeed}
        showAll={showAll}
        dimVisible={dimVisible}
        selectedBeingGroups={selectedBeingGroups}
        selectedIdentityGroups={selectedIdentityGroups}
        showLabels={showLabels}
        showTorus={showTorus}
        compact={false}
        onSelectArchetype={(id) => { setSelectedArchetype(id); setSheetOpen('info'); }}
        highlightOverride={highlightSet}
        pathOverride={null}
        showTraditional={showTraditional}
      />
    );
  };

  // Render the mini (corner) view
  const renderMini = () => {
    if (primaryView === 'tesseract') {
      // Mini = grid
      return (
        <div style={{ pointerEvents: 'none', transform: 'scale(0.4)', transformOrigin: 'top right' }}>
          <GridView
            selectedSeed={selectedSeed}
            showAll={showAll}
            dimVisible={dimVisible}
            selectedBeingGroups={selectedBeingGroups}
            selectedIdentityGroups={selectedIdentityGroups}
            showLabels={false}
            showTorus={false}
            compact={true}
            onSelectArchetype={() => {}}
            highlightOverride={highlightSet}
            pathOverride={null}
            showTraditional={false}
          />
        </div>
      );
    }
    // Mini = tesseract
    return (
      <div style={{ pointerEvents: 'none', transform: 'scale(0.5)', transformOrigin: 'top right' }}>
        <TesseractView
          colorMode={colorMode}
          autoRotate={autoRotate}
          showAffinePlanes={false}
          affineShadeFill={true}
          highlightSet={highlightSet}
          activePaths={null}
          compact={true}
          zoom={0.5}
          showStages={false}
          showTraditional={false}
          angleXW={tessAngleXW}
          setAngleXW={setTessAngleXW}
          angleYZ={tessAngleYZ}
          setAngleYZ={setTessAngleYZ}
          angleXY={tessAngleXY}
          setAngleXY={setTessAngleXY}
          rotateAxis={tessRotateAxis}
          onSelectArchetype={() => {}}
        />
      </div>
    );
  };

  // Get info content for selected archetype or current aspect
  const infoContent = useMemo(() => {
    if (selectedArchetype != null) {
      const a = ARCHETYPES[selectedArchetype];
      if (!a) return null;
      return {
        title: `${selectedArchetype} — ${a.name}`,
        subtitle: a.traditional || '',
        body: a.description || '',
      };
    }
    if (selectedAspect && DERIVATION_CONTENT[selectedAspect]) {
      return {
        title: DERIVATION_CONTENT[selectedAspect].title || selectedAspect,
        subtitle: '',
        body: DERIVATION_CONTENT[selectedAspect].body || '',
      };
    }
    return null;
  }, [selectedArchetype, selectedAspect]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#020617', color: '#e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* HEADER */}
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #1e293b', background: 'rgba(2, 6, 23, 0.95)' }}>
        <h1 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#cbd5e1' }}>
          NIRMANAKAYA EXPLORER
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => openSheet('filters')} style={mobileBtnStyle(sheetOpen === 'filters')}>
            ☰ Filters
          </button>
          <button onClick={() => openSheet('info')} style={mobileBtnStyle(sheetOpen === 'info')}>
            ⓘ Info
          </button>
        </div>
      </header>

      {/* PRIMARY CANVAS */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          {renderPrimary()}
        </div>

        {/* MINI-MAP (corner, tap to swap) */}
        <button
          onClick={swapViews}
          aria-label={`Swap to ${primaryView === 'tesseract' ? 'grid' : 'tesseract'} view`}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 130,
            height: 130,
            background: 'rgba(2, 6, 23, 0.85)',
            border: '1px solid #334155',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          {renderMini()}
          <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', pointerEvents: 'none' }}>
            TAP TO SWAP
          </div>
        </button>
      </main>

      {/* BOTTOM CONTROL BAR */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderTop: '1px solid #1e293b', overflowX: 'auto', whiteSpace: 'nowrap', background: 'rgba(2, 6, 23, 0.95)' }}>
        <button onClick={() => setAutoRotate(p => !p)} style={mobileBtnStyle(autoRotate)}>
          Rotate
        </button>
        <button onClick={() => setShowTraditional(p => !p)} style={mobileBtnStyle(showTraditional)}>
          {showTraditional ? 'TRAD' : 'VERB'}
        </button>
        <button onClick={() => setShowLabels(p => !p)} style={mobileBtnStyle(showLabels)}>
          Labels
        </button>
        <button onClick={() => setShowTorus(p => !p)} style={mobileBtnStyle(showTorus)}>
          Torus
        </button>
        <span style={{ flexShrink: 0, width: 1, height: 18, background: '#334155', margin: '0 4px' }} />
        <span style={{ flexShrink: 0, fontSize: 10, color: '#64748b' }}>Color:</span>
        {['Being', 'Identity', 'Practice', 'Stage'].map(mode => (
          <button key={mode} onClick={() => setColorMode(mode)} style={mobileBtnStyle(colorMode === mode)}>
            {mode}
          </button>
        ))}
      </div>

      {/* SHEETS (slide up overlays) */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(null)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '70vh',
              background: '#0f172a',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              border: '1px solid #334155',
              borderBottom: 'none',
              padding: 16,
              overflow: 'auto',
              animation: 'slideUp 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8' }}>
                {sheetOpen === 'filters' ? 'EXPLORE' : sheetOpen === 'info' ? 'INSPECTOR' : ''}
              </h2>
              <button onClick={() => setSheetOpen(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {sheetOpen === 'filters' && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {['Practice', 'Activity', 'Being', 'Identity', 'Stage'].map(dim => {
                    const active = selectedAspect === dim;
                    return (
                      <button key={dim} onClick={() => {
                        if (selectedAspect === dim) {
                          setSelectedAspect(null);
                          if (dim === 'Being') setSelectedBeingGroups(new Set());
                          if (dim === 'Identity') setSelectedIdentityGroups(new Set());
                          if (dim === 'Practice') setSelectedPracticeGroups(new Set());
                          if (dim === 'Activity') setSelectedActivityGroups(new Set());
                          if (dim === 'Stage') setSelectedStageGroups(new Set());
                          setShowAll(true);
                        } else {
                          setSelectedAspect(dim);
                          setSelectedArchetype(null);
                        }
                      }} style={mobileBtnStyle(active, C[dim])}>
                        {dim}
                      </button>
                    );
                  })}
                </div>
                {selectedAspect && currentAspectGroups && (
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, letterSpacing: '0.08em' }}>
                      {selectedAspect.toUpperCase()} GROUPS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(currentAspectGroups).map(([gName, gDef]) => {
                        const isSelected = selectedGroupsForAspect.has(gName);
                        return (
                          <button key={gName} onClick={() => toggleGroupForAspect(selectedAspect, gName)} style={mobileBtnStyle(isSelected, C[selectedAspect])}>
                            {gName} <span style={{ fontWeight: 400, opacity: 0.7 }}>{gDef.verb}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
                  <button onClick={() => {
                    setSelectedBeingGroups(new Set());
                    setSelectedIdentityGroups(new Set());
                    setSelectedPracticeGroups(new Set());
                    setSelectedActivityGroups(new Set());
                    setSelectedStageGroups(new Set());
                    setShowAll(true);
                    setSelectedArchetype(null);
                  }} style={mobileBtnStyle(false)}>
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {sheetOpen === 'info' && (
              <div>
                {infoContent ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                      {infoContent.title}
                    </div>
                    {infoContent.subtitle && (
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                        {infoContent.subtitle}
                      </div>
                    )}
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                      {infoContent.body}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 20 }}>
                    Tap an archetype on the map to see its details, or open Filters to explore by dimension.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile button style helper
function mobileBtnStyle(active, accentColor) {
  const accent = accentColor || '#94a3b8';
  return {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    background: active ? `${accent}22` : 'transparent',
    color: active ? accent : '#94a3b8',
    border: `1px solid ${active ? accent : '#334155'}`,
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };
}

// =============================================
// WRAPPER: branches by viewport width
// =============================================
export default function ExplorePage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile ? <ExploreMobile /> : <ExploreDesktop />;
}
