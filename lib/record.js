// THE DRAW, FROM THE RECORD — everything the record holds about a drawn card, its seat, its
// status and its medicine, as a block of facts for a composer prompt. Built for the easy
// reader (founder, 2026-09-17: "the easy reader is easy on the user, not on the Reader API"),
// which had been handed names and plumbing and was inventing the rest from tarot memory.
// DEFS (the 78-definitions JSON) is injected so this stays loadable in plain node for tests.

import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from './corrections.js';
import { ARCHETYPES } from './archetypes.js';
import { STATUSES, STATUS_INFO } from './constants.js';

const STATE_KEY = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
const MECHANISM = {
  1: 'GROWTH (Balanced): an invitation, optional by definition; what this balance is free to feed next.',
  2: "DIAGONAL (Too Much): the capacity in excess crosses the map to the opposite element; the medicine is the partner's own action.",
  3: "VERTICAL (Too Little): the seat is running on empty; the medicine is to charge its vertical twin — energy into the partner's own action pulls the current through the starved seat. Never push effort or feeling into the empty seat directly.",
  4: 'REDUCTION (Unacknowledged): authorship misattributed; the medicine returns toward the simpler, earlier form of the same line.',
};

const firstSentences = (text, n) => String(text || '').split(/(?<=\.)\s/).slice(0, n).join(' ');

// .489: THE TAROT NAME NEVER GOES TO THE MODEL. It used to ride in the record's lineage — "Reverie
// (Recognition through Resonance, 4 of Cups)" — and that one handle is how the model reached the whole
// inherited corpus (the refused cup, the beggars at the lit window). New decks will carry none of that
// imagery; the record is the meaning. The name stays on the page, for people, and nowhere in a prompt.
function lineage(def, comp) {
  if (!def) return '';
  const parent = def.associatedArchetypeName ? `${def.associatedArchetypeName} through ${def.channel || def.house || ''}` : (def.house ? `${def.house} house${def.channel ? `, ${def.channel} channel` : ''}` : '');
  return parent ? ` (${parent})` : '';
}

// The medicine card alone (what it is, its balanced face)
export function medicineRecord(d, DEFS) {
  if (!d) return '';
  const trans = getComponent(d.transient);
  const corr = getFullCorrection(d.transient, d.status);
  const toId = corr ? getCorrectionTargetId(corr, trans) : null;
  if (toId == null) return '';
  const c = getComponent(toId) || {};
  const def = DEFS?.signatures?.[toId] || null;
  return [
    `THE MEDICINE CARD, FROM THE RECORD: ${c.name}${lineage(def, c)}`,
    c.description ? `  what it is: ${c.description}` : null,
    c.extended ? `  more: ${firstSentences(c.extended, 2)}` : null,
    def?.states?.balanced ? `  its balanced face (the face the medicine speaks from): ${def.states.balanced}` : null,
    `  mechanism: ${MECHANISM[d.status] || ''}`,
  ].filter(Boolean).join('\n');
}

// The whole draw: card, seat, status, medicine
export function drawRecord(d, DEFS) {
  if (!d) return '';
  const c = getComponent(d.transient) || {};
  const def = DEFS?.signatures?.[d.transient] || null;
  const seat = ARCHETYPES[d.position] || {};
  const seatDef = DEFS?.signatures?.[d.position] || null;
  const st = STATUSES[d.status] || {};
  const info = STATUS_INFO[d.status] || {};
  const stateKey = STATE_KEY[d.status];
  // a Bound's or Agent's four states in the record are its parent archetype's — quote them for archetypes only
  const stateLine = def?.class === 'Archetype' && def?.states?.[stateKey] ? def.states[stateKey] : null;
  const numberLine = def?.decadeNumber ? `${def.decadeNumber}${def.numberKeyword ? ` — ${def.numberKeyword}` : ''}` : null;
  const roleLine = def?.agentRank ? `${def.agentRank}${def.agentRankHouse ? ` of ${def.agentRankHouse}` : ''}` : null;
  return [
    `THE DRAW, FROM THE RECORD (facts; render them in the person's words — never quote the record's vocabulary on glass):`,
    `THE CARD — ${c.name}${lineage(def, c)}${def?.class ? ` — ${def.class}` : ''}`,
    c.description ? `  what it is: ${c.description}` : null,
    c.extended ? `  in full: ${c.extended}` : null,
    numberLine ? `  its number: ${numberLine}` : null,
    roleLine ? `  its role: ${roleLine}` : null,
    def?.stage ? `  stage: ${def.stage}${def.innerOuter ? `; horizon: ${String(def.innerOuter).toLowerCase()}` : ''}${def.house ? `; house: ${def.house}` : ''}${def.channel ? `; channel: ${def.channel}` : ''}` : null,
    `THE SEAT — ${seat.name || '?'}${seatDef ? ` (${seatDef.house || ''} house${seatDef.stage ? `, ${seatDef.stage} stage` : ''})` : ''}`,
    seat.description ? `  what it is: ${seat.description}` : null,
    seat.extended ? `  in full: ${seat.extended}` : null,
    `THE STATUS — ${st.name || 'Balanced'}${info.orientation ? ` (${info.orientation})` : ''}`,
    info.description ? `  in general: ${info.description}` : null,
    stateLine ? `  on THIS card: ${stateLine}` : null,
    medicineRecord(d, DEFS),
  ].filter(Boolean).join('\n');
}
