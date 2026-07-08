// === GEOMETRY ENGINE — the deterministic core of Reader V2 ===
// (SPEC_Reader_V2_Geometry_Engine_2026-07-07 Layer 2 + Addendum A Tier 2/3)
//
// Pure functions over the all-encompassing signature spec (lib/data/nirmanakaya_78_definitions.json,
// generated from lib sources by scripts/generate78.mjs). The interpreter never derives math —
// it RECEIVES math. This module computes it: per-signature records, pairwise relations,
// displacement vectors/distances, meaningful sums, rebalancer context, draw-level aggregates,
// literal-name hits, and the assembled Structural Dossier.
//
// LAW (reading-random / map-deterministic): nothing here touches draws. Draws stay on the
// server-side crypto path. This engine only ANALYZES what was drawn.

import DEFS from './data/nirmanakaya_78_definitions.json';

const SIGS = DEFS.signatures;
const POSITIONS = DEFS.positions;

// Forty-Fold Seal (canonical) — for grid adjacency (the medicine cabinet)
const GRID_ORDER = [[17, 7, 4, 12], [2, 14, 15, 9], [18, 6, 5, 11], [3, 13, 16, 8]];
const GRID_POS = {};
GRID_ORDER.forEach((row, r) => row.forEach((id, c) => { GRID_POS[id] = { r, c }; }));

export const MEANINGFUL_SUMS = new Set([19, 20, 21, 40]);

export function sig(id) { return SIGS[id] ?? null; }
export function position(id) { return POSITIONS[id] ?? null; }

// compact record for dossier injection (keeps token cost low)
export function sigLite(id) {
  const s = SIGS[id]; if (!s) return null;
  return {
    id: s.id, name: s.name, traditional: s.traditional, class: s.class,
    house: s.house, channel: s.channel, element: s.element,
    stage: s.stage, innerOuter: s.innerOuter,
    operation: s.operation ?? s.parentOperation ?? null,
    decadeNumber: s.decadeNumber, agentRank: s.agentRank,
    associatedArchetype: s.associatedArchetype, associatedArchetypeName: s.associatedArchetypeName,
    digitRoot: s.digitRoot,
    flags: { portal: s.flags.portal, originalTriplet: s.flags.originalTriplet, selfPaired: s.flags.selfPaired, outsideMirror: s.flags.outsideMirror },
  };
}

// resolve any signature to its manifest-archetype anchor (for 4D work): archetypes -> self (if manifest),
// bounds/agents -> parent archetype (if manifest). Returns null for Gestalt/portal anchors.
function manifestAnchor(id) {
  const s = SIGS[id]; if (!s) return null;
  const anchorId = s.class === 'Archetype' ? s.id : s.associatedArchetype;
  const a = SIGS[anchorId];
  return a?.coordinate4D?.bits ? anchorId : null;
}

export function displacement(aId, bId) {
  const a = manifestAnchor(aId), b = manifestAnchor(bId);
  if (a == null || b == null) return { computable: false, reason: 'one or both anchors outside the 4x4 (Gestalt/portal)' };
  const A = SIGS[a].coordinate4D, B = SIGS[b].coordinate4D;
  const dims = ['practice', 'activity', 'being', 'identity'];
  const bitNames = ['practice-bit', 'activity-bit', 'being-bit', 'identity-bit'];
  let distance = 0; const differing = [];
  for (let i = 0; i < 4; i++) if (A.bits[i] !== B.bits[i]) { distance++; differing.push(bitNames[i]); }
  const aligned = dims.filter((d) => A[d] === B[d]);
  const distanceClass = distance === 0 ? 'same-cell' : distance === 1 ? 'nearest-door (edge)' : distance === 2 ? 'inversion (face diagonal)' : distance === 3 ? 'three-bit' : 'antipode (space diagonal)';
  return { computable: true, anchorA: a, anchorB: b, distance, distanceClass, differingBits: differing, alignedDimensions: aligned };
}

// grid adjacency between two MANIFEST archetype anchors (medicine-cabinet neighborhood)
function gridAdjacency(aId, bId) {
  const A = GRID_POS[aId], B = GRID_POS[bId];
  if (!A || !B) return null;
  const dr = (A.r - B.r + 4) % 4, dc = (A.c - B.c + 4) % 4;
  const vert = dc === 0 && (dr === 1 || dr === 3);
  const horiz = dr === 0 && (dc === 1 || dc === 3);
  if (!vert && !horiz) return null;
  const sum = aId + bId;
  if (vert) return { type: 'vertical-neighbor', sum, medicineClass: sum === 20 ? 'vertical-duality (Too Little medicine)' : 'diagonal-duality (Too Much medicine)' };
  return { type: 'horizontal-neighbor', sum, moveClass: (sum === 16 || sum === 24) ? 'one-bit practice hop' : 'full practice inversion' };
}

export function relate(aId, bId) {
  const a = SIGS[aId], b = SIGS[bId]; if (!a || !b) return null;
  const sum = aId + bId;
  const anchorA = manifestAnchor(aId), anchorB = manifestAnchor(bId);
  const anchorSum = (anchorA != null && anchorB != null) ? anchorA + anchorB : null;
  const rel = {
    a: aId, b: bId, sum,
    meaningfulSum: MEANINGFUL_SUMS.has(sum) ? sum : null,
    axisPair: (a.class === 'Archetype' && b.class === 'Archetype' && sum === 20 && aId !== 10),
    diagonalPair: (a.class === 'Archetype' && b.class === 'Archetype' && (sum === 19 || sum === 21) && a.house === b.house),
    reductionKin: a.digitRoot === b.digitRoot,
    parityInteraction: `${a.operation ?? a.parentOperation ?? '?'}–${b.operation ?? b.parentOperation ?? '?'}`,
    sameHouse: a.house === b.house ? a.house : null,
    sameChannel: (a.channel && a.channel === b.channel) ? a.channel : null,
    sameStage: a.stage === b.stage ? a.stage : null,
    sameClass: a.class === b.class ? a.class : null,
    sameInnerOuter: a.innerOuter === b.innerOuter ? a.innerOuter : null,
    majorKinship: null,
    displacement: displacement(aId, bId),
    gridAdjacency: (anchorA != null && anchorB != null) ? gridAdjacency(anchorA, anchorB) : null,
    anchorSum,
    anchorAxisPair: anchorSum === 20 && anchorA !== 10,
  };
  // major–minor kinship: shared governing archetype through any association route
  const routes = (s) => new Set([s.class === 'Archetype' ? s.id : s.associatedArchetype, s.majorAssociationByDecade?.id, s.majorAssociationByReduction].filter((x) => x != null));
  const shared = [...routes(a)].filter((x) => routes(b).has(x));
  if (shared.length) rel.majorKinship = shared.map((x) => ({ id: x, name: SIGS[x]?.name ?? null }));
  return rel;
}

const STATUS_KEY = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
const STATUS_NAME = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };

export function rebalancerFor(signatureId, status) {
  const s = SIGS[signatureId]; if (!s?.corrections) return null;
  const c = s.corrections[STATUS_KEY[status]]; if (!c) return null;
  const targetId = c.targetId ?? c.target?.id ?? null;
  const target = targetId != null ? sigLite(targetId) : null;
  return {
    pathway: c.type ?? (status === 1 ? 'GROWTH' : status === 2 ? 'DIAGONAL' : status === 3 ? 'VERTICAL' : 'REDUCTION'),
    raw: c,
    target,
    distance: targetId != null ? displacement(signatureId, targetId) : null,
    medicineFlags: target ? { originalTriplet: target.flags.originalTriplet, portal: target.flags.portal } : null,
  };
}

export function literalNameHits(question, ids) {
  if (!question) return [];
  const q = question.toLowerCase();
  const hits = [];
  for (const id of ids) {
    const s = SIGS[id]; if (!s) continue;
    for (const word of [s.name, s.traditional].filter(Boolean)) {
      const w = word.toLowerCase().replace(/^the /, '');
      if (w.length >= 4 && q.includes(w)) hits.push({ id, name: s.name, matched: word, note: 'literal-name hit — high signal' });
    }
  }
  return hits;
}

export function aggregates(cards) {
  const dist = { Balanced: 0, 'Too Much': 0, 'Too Little': 0, Unacknowledged: 0 };
  const spread = (field) => {
    const m = {};
    for (const c of cards) { const v = SIGS[c.transient]?.[field] ?? 'n/a'; m[v] = (m[v] ?? 0) + 1; }
    return m;
  };
  for (const c of cards) dist[STATUS_NAME[c.status]]++;
  const pairSums = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const s = cards[i].transient + cards[j].transient;
    if (MEANINGFUL_SUMS.has(s)) pairSums.push({ ids: [cards[i].transient, cards[j].transient], sum: s });
  }
  const trips = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) for (let k = j + 1; k < cards.length; k++) {
    const s = cards[i].transient + cards[j].transient + cards[k].transient;
    if (MEANINGFUL_SUMS.has(s)) trips.push({ ids: [cards[i].transient, cards[j].transient, cards[k].transient], sum: s });
  }
  const hints = [];
  if (dist['Too Much'] === 0 && cards.length >= 3) hints.push('ZERO Too Much anywhere — overdrive/error narratives find no structural support in this draw');
  if (dist.Balanced === cards.length) hints.push('ALL Balanced — full confirmation topology');
  if (dist.Unacknowledged + dist['Too Little'] === cards.length && cards.length >= 2) hints.push('every imbalance is an UNDER-contact state — the issue is contact, not ground');
  if (cards.some((c) => SIGS[c.transient]?.flags.portal || SIGS[c.position]?.flags?.portal)) hints.push('portal present — threshold dynamics in play');
  if (cards.some((c) => SIGS[c.transient]?.flags.originalTriplet)) hints.push('original-triplet member drawn (9/10/11 — the transmission corner)');
  return {
    statusDistribution: dist,
    houseSpread: spread('house'), stageSpread: spread('stage'), innerOuterSpread: spread('innerOuter'), classSpread: spread('class'),
    meaningfulPairSums: pairSums, meaningfulTripleSums: trips,
    patternHints: hints,
  };
}

// === ROUTE-SIZED DOSSIER VARIANTS ===

// normalize raw draws (defensive) -> cards
export function drawsToCards(draws) {
  if (!Array.isArray(draws)) return [];
  return draws
    .filter((d) => d && d.position != null && d.transient != null && d.status != null)
    .map((d) => ({ position: d.position, transient: d.transient, status: d.status }));
}

// Compact digest for the LETTER (small output budget — aggregates + hints + literal hits only)
export function buildDigest({ question = null, cards = [] }) {
  return {
    _dossier: 'Geometry Engine digest — deterministic facts for this draw. State as fact; do not re-derive.',
    aggregates: aggregates(cards),
    literalNameHits: literalNameHits(question, [...new Set(cards.flatMap((c) => [c.transient, c.position]))]),
  };
}

// Per-card dossier for CARD-DEPTH calls: this card's full relations + its bonds to the other cards
export function buildCardDossier({ question = null, cards = [], index = 0 }) {
  const c = cards[index]; if (!c) return null;
  return {
    _dossier: 'Geometry Engine card dossier — deterministic facts for THIS card. State as fact; own synthesis as synthesis; do not re-derive or invent arithmetic.',
    status: STATUS_NAME[c.status],
    transient: sigLite(c.transient),
    position: sigLite(c.position),
    cardToPosition: relate(c.transient, c.position),
    rebalancer: rebalancerFor(c.transient, c.status),
    relationsToOtherCards: cards
      .map((x, i) => (i !== index ? { withCardIndex: i, otherTransient: sigLite(x.transient)?.name, relation: relate(c.transient, x.transient) } : null))
      .filter(Boolean),
    drawAggregates: aggregates(cards),
    literalNameHits: literalNameHits(question, [c.transient, c.position]),
  };
}

// === THE STRUCTURAL DOSSIER ===
// cards: [{ position: 0-21, transient: 0-77, status: 1-4 }]
export function buildDossier({ question = null, cards = [] }) {
  const perCard = cards.map((c, i) => ({
    index: i,
    status: STATUS_NAME[c.status],
    transient: sigLite(c.transient),
    position: sigLite(c.position),
    cardToPosition: relate(c.transient, c.position),
    rebalancer: rebalancerFor(c.transient, c.status),
  }));
  const pairwise = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    pairwise.push({ cards: [i, j], relation: relate(cards[i].transient, cards[j].transient) });
  }
  const ids = cards.flatMap((c) => [c.transient, c.position, ...(rebalancerFor(c.transient, c.status)?.target ? [rebalancerFor(c.transient, c.status).target.id] : [])]);
  return {
    _dossier: 'Geometry Engine v1 — all values computed, none interpreted. Facts below may be stated as facts (Constitution law 5).',
    question,
    perCard,
    pairwise,
    aggregates: aggregates(cards),
    literalNameHits: literalNameHits(question, [...new Set(ids)]),
  };
}
