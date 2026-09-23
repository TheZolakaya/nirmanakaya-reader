// THE ADDRESS AS A POINTER (v0.99.539) — FIND IT BY THE FIELD.
// Founder, 2026-09-22: "use a reflect kind of reading mode to 'find it' — narrowing ambiguity could be key… the four
// dimensional analysis." The FIND IT funnel (.366) narrowed with the Reader's questions (seat → status → medicine).
// Now the field is asked where the thing is and draws a card; the card's four-dimensional address is read as a
// pointer — WHERE in their life (Practice), HOW it is being done (Activity), WHAT kind of thing it is (Being), WHO
// they are in it (Identity) — and the card's element sets the register of the tell (the Experiential Layers, ruled
// 2026-08-18: Water feelings · Air stories · Earth signs · Fire pulls). Derive, don't interpret: the map points, the
// Reader offers candidates, the person names it. Group names and glosses from Four_Dimensions_Reference_Card.md
// (Kindle / Vessel / Passage / Mantle · Composure / Conviction / Exploration / Intimacy), founder-ruled.

import DEFS from './data/nirmanakaya_78_definitions.json';
import { ARCHETYPES } from './archetypes.js';
import { getComponent, getFullCorrection, getCorrectionTargetId } from './corrections.js';

// .562: A POINTER'S MEDICINE IS A DIRECTION, NEVER A MOVE (founder: "the pointers might have medicine, but those are pointers
// as well — directions from where you're standing"). The pointer's rebalancer partner has its own four coordinates, so the
// move from pointer to partner is a bearing in the same space: it says which way the ground slopes from where the thing is.
const SHORT = {
  practice: { Body: 'the material life', Emotion: 'feeling and relationship', Mind: 'thinking and choosing', Spirit: 'purpose and direction' },
  activity: { Intent: 'pointing', Cognition: 'distinguishing', Resonance: 'connecting', Structure: 'building' },
  being: { Mantle: 'a force beneath them', Kindle: 'a threshold through them', Vessel: 'a container they hold', Passage: 'something leaving them' },
  identity: { Composure: 'holding centre', Conviction: 'acting from centre', Exploration: 'venturing out', Intimacy: 'dissolving into another' },
};
const shortAddress = (a) => a && a.practice && a.activity
  ? [SHORT.practice[a.practice] || a.practice, SHORT.activity[a.activity] || a.activity, a.being ? SHORT.being[a.being] || a.being : null, a.identity ? SHORT.identity[a.identity] || a.identity : null].filter(Boolean).join(', ')
  : (a?.practice ? `${a.practice} — outside the grid` : '');
function directionLine(draw) {
  try {
    const trans = getComponent(draw.transient); const corr = getFullCorrection(draw.transient, draw.status);
    const pid = corr ? getCorrectionTargetId(corr, trans) : null; if (pid == null || pid === draw.transient) return null;
    const from = shortAddress(addressOf(draw.transient)), to = shortAddress(addressOf(pid)); if (!from || !to) return null;
    return `  ITS DIRECTION (the pointer's own rebalancer, read as a BEARING — which way the ground slopes from where the thing is — never as a move, never as a medicine): it leans from ${from} toward ${to} (${getComponent(pid)?.name}'s ground). Use it to rank the candidates; do not prescribe it.`;
  } catch { return null; }
}
import { STATUSES } from './constants.js';

const PRACTICE = {
  Body: 'the material life — work, money, health, the body, the things done with the hands',
  Emotion: 'feeling and relationship — who they love, what they feel, the bonds between people',
  Mind: 'thinking and choosing — meaning, decisions, what they tell themselves is true',
  Spirit: 'purpose and direction — what they are for, what they reach toward',
};
const ACTIVITY = {
  Intent: 'pointing — aiming, wanting, choosing a direction, committing to it',
  Cognition: 'distinguishing — thinking it through, testing, seeing what is actually true',
  Resonance: 'connecting — feeling-with, bonding, being moved, keeping a tie alive',
  Structure: 'building — making, holding, keeping, finishing, maintaining',
};
const BEING = {
  Mantle: 'BENEATH them — a force they stand on, something that underlies the rest (its verb: underlie)',
  Kindle: 'THROUGH them — a threshold being crossed, a knowing that changes the one who knows it (its verb: understand)',
  Vessel: 'AROUND them — a container they are holding, something in their keeping (its verb: hold)',
  Passage: 'AWAY from them — something being stripped, ended or released (its verb: release)',
};
const IDENTITY = {
  Composure: 'holding their centre in it — steady, present, not moved off themselves',
  Conviction: 'acting from their centre in it — moving, pushing, carrying it forward',
  Exploration: 'venturing out of their centre into it — the unknown, the not-yet-decided',
  Intimacy: 'dissolving their centre into another in it — entangled, merged, boundaries down',
};
const TELL = {
  Water: 'FEELINGS — what they feel when it is near',
  Air: 'STORIES — the story they tell about it, and to whom',
  Earth: 'SIGNS — what shows: the object, the habit, the place, the evidence',
  Fire: 'PULLS — what pulls them toward it or away from it',
};
const STATUS_HOLD = {
  1: 'Balanced — they are already holding it well; the pointer marks an invitation, not a problem',
  2: 'Too Much — they are braced for it, over-managing it, spending it before it arrives',
  3: 'Too Little — it is done or dormant but still tended, held open, giving nothing back',
  4: 'Unacknowledged — it is happening and being called "not really mine" or "doesn\'t matter"',
};

// The four coordinates for any signature: an archetype's own; a bound's or agent's through its parent archetype;
// Gestalt and the portals stand outside the grid (Practice only).
export function addressOf(id) {
  const sig = DEFS?.signatures?.[id];
  const comp = getComponent(id) || {};
  const c = sig?.coordinate4D;
  if (c?.practice && c?.activity) return { ...c, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null };
  if (comp.archetype != null && comp.archetype !== id) {
    const parent = DEFS?.signatures?.[comp.archetype]; const pc = parent?.coordinate4D;
    if (pc?.practice && pc?.activity) return { ...pc, name: comp.name || sig?.name, via: ARCHETYPES[comp.archetype]?.name || parent?.name || null, element: sig?.elementalDesignator || comp.element || pc.element || null };
  }
  return { practice: c?.practice || comp.house || null, activity: null, being: null, identity: null, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null, outside: c?.note || 'outside the grid' };
}

// The locating card, read four ways, as facts for the prompt. draw: { transient, position, status }.
export function addressBlock(draw) {
  if (!draw) return '';
  const a = addressOf(draw.transient);
  const seat = ARCHETYPES[draw.position];
  const seatA = draw.position != null ? addressOf(draw.position) : null;
  const status = STATUSES[draw.status]?.name || 'Balanced';
  const L = [];
  L.push(`THE LOCATING CARD — ${a.name} (${status})${seat ? `, landed in the seat of ${seat.name}` : ''}. Read its address as a POINTER to where the thing is:`);
  if (a.practice && a.activity) {
    if (a.via) L.push(`  (${a.name}'s address is its parent archetype's, ${a.via})`);
    L.push(`  WHERE it lives (Practice: ${a.practice}): ${PRACTICE[a.practice] || a.practice}`);
    L.push(`  HOW it is being done (Activity: ${a.activity}): ${ACTIVITY[a.activity] || a.activity}`);
    if (a.being) L.push(`  WHAT kind of thing it is (Being: ${a.being}): ${BEING[a.being] || a.being}`);
    if (a.identity) L.push(`  WHO they are in it (Identity: ${a.identity}): ${IDENTITY[a.identity] || a.identity}`);
  } else {
    L.push(`  This card stands outside the sixteen-cell grid (${a.practice || 'Gestalt / Portal'}): the thing is not in one room of their life — it is about the whole self, or a threshold the whole self is at. Point with the seat instead.`);
  }
  if (a.element && TELL[a.element]) L.push(`  THE TELL (its element, ${a.element}): ${TELL[a.element]}`);
  const dir = directionLine(draw); if (dir) L.push(dir);
  if (seatA && seatA.practice && seatA.activity) L.push(`  THE SEAT it landed in, ${seat?.name}: ${PRACTICE[seatA.practice] ? `where — ${PRACTICE[seatA.practice]}` : seatA.practice}; ${ACTIVITY[seatA.activity] ? `how — ${ACTIVITY[seatA.activity]}` : ''}`);
  L.push(`  HOW THEY ARE HOLDING IT (the pointer's status): ${STATUS_HOLD[draw.status] || status}`);
  return L.join('\n');
}
