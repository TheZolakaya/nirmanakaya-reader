// THE DRAW, FROM THE RECORD — everything the record holds about a drawn card, its seat, its
// status and its medicine, as a block of facts for a composer prompt. Built for the easy
// reader (founder, 2026-09-17: "the easy reader is easy on the user, not on the Reader API"),
// which had been handed names and plumbing and was inventing the rest from tarot memory.
// DEFS (the 78-definitions JSON) is injected so this stays loadable in plain node for tests.

import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from './corrections.js';
import { ARCHETYPES } from './archetypes.js';
import { STATUSES, STATUS_INFO } from './constants.js';
import { fieldLines, fieldNouns } from './nounField.js'; // THE NOUN FIELD (2026-10-04): the nouns the Reader may point at
import PLAIN from './data/plain_propositions.json'; // THE PROPOSITION LAYER (.695): the status field + the back-in-balance face, in plain words, canonical kept beside

// THE SPLICE (Keel, 2026-10-04): definitions may say "something"; the record never does. When a record line's verb has an open object,
// the field fills it before the Reader sees the line — "putting something down" reaches the model as "putting the hours a direction costs down".
// The Reader cannot quote a blank it never saw. Off with NOUN_FIELD=0 (the bench's switch).
const splice = (text, nouns) => { if (!text || !nouns?.length) return text; let i = 0; return String(text).replace(/\b(?:something|some thing)\b/gi, () => nouns[i++ % nouns.length]); };

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
export function medicineRecord(d, DEFS, nouns = []) {
  if (!d) return '';
  const trans = getComponent(d.transient);
  const corr = getFullCorrection(d.transient, d.status);
  const toId = corr ? getCorrectionTargetId(corr, trans) : null;
  if (toId == null) return '';
  const c = getComponent(toId) || {};
  const def = DEFS?.signatures?.[toId] || null;
  // .697 THE MEDICINE AS AN OPERATION (Air, after the first .695 production read): the record hands the Reader the way through as the operation
  // this medicine licenses, in plain words (lib/data/plain_propositions.json `medicine`, 78 by hand), its face as the parent's plain Balanced line,
  // and the mechanism in plain words; the Reader instantiates the operation inside the person's own problem (the Handing's medicine rule).
  // PLAIN_PROPOSITIONS=0 restores the canonical block.
  const PL = process.env.PLAIN_PROPOSITIONS === '0' ? null : PLAIN;
  const op = PL?.medicine?.[String(toId)]?.operation || null;
  const faceOwner = def?.class === 'Archetype' ? toId : (def?.associatedArchetype != null ? def.associatedArchetype : null);
  const plainFace = (PL && faceOwner != null) ? (PL.states?.[String(faceOwner)]?.balanced?.plain || null) : null;
  const plainMech = PL?.mechanism?.[String(d.status)]?.plain || null;
  return [
    `THE MEDICINE SIGNATURE, FROM THE RECORD: ${c.name}${lineage(def, c)}`,
    op ? `  the way through, in plain words — the OPERATION this medicine licenses; say it inside the person's own problem, in their nouns, never in these words or as a new scene: ${op}` : (c.description ? `  what it is: ${splice(c.description, nouns)}` : null),
    op ? null : (c.extended ? `  more: ${splice(firstSentences(c.extended, 2), nouns)}` : null),
    plainFace ? `  the face it speaks from, in plain words (what the person gets back): ${plainFace}` : (def?.states?.balanced ? `  its balanced face (the face the medicine speaks from): ${splice(def.states.balanced, nouns)}` : null),
    plainMech ? `  how the way through works, in plain words: ${plainMech}` : `  mechanism: ${MECHANISM[d.status] || ''}`,
  ].filter(Boolean).join('\n');
}

// The whole draw: card, seat, status, medicine
export function drawRecord(d, DEFS, question = '', context = '') { // question/context (2026-10-04): the field's selector reads the person's words
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
  // .556: THE OTHER SIDE — the card's own balanced face (a Bound's or Agent's is its parent archetype's), what the medicine is FOR
  const balancedFace = d.status !== 1 ? (def?.class === 'Archetype' ? def?.states?.balanced : (def?.associatedArchetype != null ? DEFS?.signatures?.[def.associatedArchetype]?.states?.balanced : null)) : null;
  const backLine = balancedFace ? `${balancedFace}${def?.class !== 'Archetype' && def?.associatedArchetypeName ? ` (its parent ${def.associatedArchetypeName}'s balanced face, which this signature carries)` : ''}` : null;
  // .695 the plain propositions for this draw's status field (null = fall back to the canonical line)
  const PL = process.env.PLAIN_PROPOSITIONS === '0' ? null : PLAIN;
  const plainGeneral = PL?.general?.[String(d.status)]?.plain || null;
  const plainState = (PL && def?.class === 'Archetype' && stateLine) ? (PL.states?.[String(d.transient)]?.[stateKey]?.plain || null) : null;
  const faceOwner = def?.class === 'Archetype' ? d.transient : (def?.associatedArchetype != null ? def.associatedArchetype : null);
  const plainBack = (PL && backLine && faceOwner != null) ? (PL.states?.[String(faceOwner)]?.balanced?.plain || null) : null;
  const numberLine = def?.decadeNumber ? `${def.decadeNumber}${def.numberKeyword ? ` — ${def.numberKeyword}` : ''}` : null;
  const roleLine = def?.agentRank ? `${def.agentRank}${def.agentRankHouse ? ` of ${def.agentRankHouse}` : ''}` : null;
  let nouns = []; try { nouns = process.env.NOUN_FIELD === '0' ? [] : fieldNouns(d, `${question || ''} ${context || ''}`); } catch {}
  const S = (t) => splice(t, nouns);
  return [
    `THE DRAW, FROM THE RECORD (facts; render them in the person's words — never quote the record's vocabulary on glass):`,
    `THE SIGNATURE — ${c.name}${lineage(def, c)}${def?.class ? ` — ${def.class}` : ''}`,
    c.description ? `  what it is: ${S(c.description)}` : null,
    c.extended ? `  in full: ${S(c.extended)}` : null,
    numberLine ? `  its number: ${numberLine}` : null,
    roleLine ? `  its role: ${roleLine}` : null,
    def?.stage ? `  stage: ${def.stage}${def.innerOuter ? `; horizon: ${String(def.innerOuter).toLowerCase()}` : ''}${def.house ? `; house: ${def.house}` : ''}${def.channel ? `; channel: ${def.channel}` : ''}` : null,
    `THE SEAT — ${seat.name || '?'}${seatDef ? ` (${seatDef.house || ''} house${seatDef.stage ? `, ${seatDef.stage} stage` : ''})` : ''}`,
    seat.description ? `  what it is: ${S(seat.description)}` : null,
    seat.extended ? `  in full: ${S(seat.extended)}` : null,
    `THE STATUS — ${st.name || 'Balanced'}${info.orientation ? ` (${info.orientation})` : ''}`,
    // THE PROPOSITION LAYER (.695, Air 2026-10-05: "a translation surface on canon"): the status field and the back-in-balance face reach the Reader
    // as frozen plain propositions (lib/data/plain_propositions.json; the canonical line kept beside each). Benched on the frozen Corpus B ten:
    // the renderer stopped coining nouns for Unacknowledged (11→5), the record's own face phrases stopped reaching the glass, status carried 10/10.
    // PLAIN_PROPOSITIONS=0 restores the canonical lines (the kill switch). The medicine block is the next separable increment.
    plainGeneral ? `  in plain words: ${S(plainGeneral)}` : (info.description ? `  in general: ${S(info.description)}` : null),
    plainState ? `  on THIS card, in plain words: ${S(plainState)}` : (stateLine ? `  on THIS card: ${S(stateLine)}` : null),
    plainBack ? `  WHEN IT IS BACK IN BALANCE, in plain words (what the medicine is FOR; the other side): ${S(plainBack)}` : (backLine ? `  WHEN IT IS BACK IN BALANCE (this signature's own face — what the medicine is FOR; the other side): ${S(backLine)}` : null),
    medicineRecord(d, DEFS, nouns),
    (() => { try { return process.env.NOUN_FIELD === '0' ? null : (fieldLines(d, question, context) || null); } catch { return null; } })(), // THE FIELD, after the medicine; NOUN_FIELD=0 is the bench's off switch
  ].filter(Boolean).join('\n');
}
