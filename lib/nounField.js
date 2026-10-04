// lib/nounField.js — THE NOUN FIELD (5 × 5), the council's merged cells, ruled by the founder 2026-10-04.
// Canon source: G:\My Drive\For Air Review\NOUN_FIELD_5x5_Merged_Council_Cells_For_True_2026-10-04.md (Keel, merging True's draft,
// the New Seat's reply and Keel's reply). A ruled list, not a computed output. This file transcribes it and selects from it.
//
// Shape: each house seen through each house. "the X of Y" = a signature from house X appearing on a seat from house Y. Bounds and
// Agents use their parent archetype's house. Channel is a selector INSIDE the cell, never a multiplier: every cell has four groups —
// wanted/chosen/started (Intent) · named/written/counted (Cognition) · shared/exchanged/felt (Resonance) · built/kept/standing (Structure).
// The record hands the Reader three or four nouns, never a whole cell; the person's own named thing beats the field's noun every time.
import { getComponent } from './corrections.js';
import DEFS from './data/nirmanakaya_78_definitions.json';

export const GROUPS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
const G = { Intent: 0, Cognition: 1, Resonance: 2, Structure: 3 };

// FIELD[seatHouse][signatureHouse] = [intent[], cognition[], resonance[], structure[]]  — "the <signature house> of <seat house>"
// The canon's home is DEFS.field (written from this seed by scripts/write_noun_field_to_json.mjs); this seed is the source until then.
const SEED = {
  Body: {
    Body: [['the lift you\'re working toward', 'the shift you took'], ['the body\'s age', 'the number on the scale'], ['sex', 'the hand you hold', 'the pain you\'ve told someone about'], ['sleep', 'food', 'breath', 'illness']],
    Mind: [['the diet you chose', 'the appointment you booked'], ['the budget', 'the calendar', 'the to-do list', 'the schedule', 'the paycheck', 'the boss on the calendar'], ['the plan you made with someone', 'the shared account'], ['the lease', 'the insurance', 'the training plan', 'the workplace']],
    Emotion: [['what you crave', 'who you want near'], ['the appointment you keep moving'], ['touch', 'appetite', 'tiredness', 'the dog'], ['the chair you always take', 'the bed']],
    Spirit: [['the trip you keep not taking', 'the running shoes by the door'], ['the hour of the day you\'re most alive'], ['the instrument', 'the craft tools', 'home'], ['the garden', 'the trail', 'the kitchen you cook in for joy']],
    Gestalt: [['what you\'d leave behind'], ['the savings', 'what you owe', 'the estate'], ['the inheritance', 'the home you share'], ['the house', 'what you own']],
  },
  Mind: {
    Body: [['the contract you signed'], ['the notes', 'the rule written down', 'the feed', 'the hours on screen'], ['the shared doc', 'the meeting'], ['the desk', 'the files', 'the tools', 'the system you actually run']],
    Mind: [['the decision', 'the strategy'], ['the plan', 'the theory', 'the argument', 'the written contradiction'], ['the argument you\'re having with someone'], ['the model', 'the spreadsheet']],
    Emotion: [['the idea you love'], ['the opinion you hold hard'], ['the doubt you can\'t argue away', 'the person you argue with in your head'], ['the position you took in a fight']],
    Spirit: [['the big idea', 'the question you keep returning to'], ['the belief about how things work', 'the sentence you\'d put on the wall'], ['the book you reread', 'the teacher'], ['the principle you keep']],
    Gestalt: [['the field you chose'], ['the worldview', 'the name of your trade'], ['the people who think like you'], ['the body of your work']],
  },
  Emotion: {
    Body: [['the text sent or not sent'], ['the phone', 'the calendar of who you saw'], ['the hug', 'the meal shared', 'tears', 'the raised voice'], ['the door closed', 'the bed']],
    Mind: [['the apology owed'], ['the story you tell about the other person'], ['the terms of the relationship'], ['the rule about who gets in']],
    Emotion: [['longing', 'jealousy'], ['fear', 'relief'], ['love', 'grief', 'tenderness'], ['anger', 'resentment']],
    Spirit: [['the person you\'d drop everything for'], ['the promise you made'], ['the friend you\'d call from the hospital', 'the bond you\'d call a vocation'], ['the one you\'d forgive anything']],
    Gestalt: [['the ones you owe a call'], ['the people you\'ve lost'], ['the friends', 'the people at work'], ['the marriage', 'the family']],
  },
  Spirit: {
    Body: [['the trip you keep not taking'], ['the money and hours a direction costs'], ['the person you\'d have to leave or bring'], ['the place you\'d have to live', 'the daily practice']],
    Mind: [['the plan for your life', 'the vocation named', 'the career'], ['the belief written down', 'the five-year picture'], ['the mentor\'s advice you keep'], ['the vow']],
    Emotion: [['the pull toward a person or a path'], ['dread about what\'s coming'], ['hope', 'awe', 'despair'], ['homesickness for a life']],
    Spirit: [['the thing you\'d do if money weren\'t a question'], ['the one sentence you\'d say you\'re for'], ['the person you\'d be if it went right'], ['the name of the path']],
    Gestalt: [['the retirement date', 'the place you intend to end up'], ['the year you picture yourself in', 'the name you want remembered'], ['who you want there at the end'], ['the will']],
  },
  Gestalt: {
    Body: [['the wedding', 'the start date'], ['the diagnosis', 'the retirement', 'the birth', 'the funeral'], ['the reunion'], ['the move']],
    Mind: [['the name you give this stage'], ['the chapter you say you\'re in', 'the story of your life as you tell it'], ['the version you tell other people'], ['the plan for the whole']],
    Emotion: [['readiness', 'the new-start lift'], ['the restlessness before a turn'], ['the end-of-something ache'], ['the settledness of a long season']],
    Spirit: [['what you\'d want said at the end'], ['the thread you\'d say runs through all of it'], ['who you\'d say it to'], ['the one thing you\'d keep if you lost the rest']],
    Gestalt: [['the cycle opening'], ['the name of the chapter you\'d give this whole life so far'], ['who\'s been in all of it'], ['the arc', 'the cycle closing']],
  },
};
export const FIELD = (DEFS?.field && DEFS.field.Body) ? Object.fromEntries(Object.entries(DEFS.field).filter(([k]) => k !== '_note')) : SEED;
const HOUSE_WORD = { Body: 'body', Mind: 'mind', Emotion: 'emotion', Spirit: 'spirit', Gestalt: 'gestalt', Portal: 'gestalt' };

// The house a signature reads in: an archetype's own; a Bound's or Agent's is its parent's (ruled 2026-10-03). Portals read as Gestalt.
export function houseOf(id) {
  const c = getComponent(id) || {};
  let h = c.house;
  if (c.archetype != null && c.archetype !== id) h = (getComponent(c.archetype) || {}).house || h;
  if (h === 'Portal') h = 'Gestalt';
  return FIELD[h] ? h : null;
}
export function channelOf(id) {
  const c = getComponent(id) || {};
  const ch = c.channel || (c.archetype != null ? (getComponent(c.archetype) || {}).channel : null);
  return G[ch] != null ? ch : null;
}
export const cellName = (sigHouse, seatHouse) => `the ${HOUSE_WORD[sigHouse]} of ${HOUSE_WORD[seatHouse]}`;

const words = (t) => new Set(String(t || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4));
const STOP = new Set(['the', 'you', 'your', "you're", "you'd", 'with', 'that', 'what', 'who', 'keep', 'about', 'someone', 'something', 'into', 'from', 'this', 'have', 'been', 'take', 'took', 'made', 'make']);
const touches = (noun, qWords) => { for (const w of noun.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/)) if (w.length >= 4 && !STOP.has(w) && qWords.has(w)) return true; return false; };

// THE SELECTOR (rule 6 / the record-line spec): the signature's channel group supplies the first two nouns; the third comes from whichever
// group the person's words touch; a fourth only if the person named nothing. Never a whole cell.
export function selectNouns(cell, channel, question = '', { max = 4, personNamed = false } = {}) {
  if (!cell) return [];
  const qWords = words(question);
  const gi = G[channel] ?? 0;
  const out = [];
  for (const n of cell[gi]) { if (out.length < 2) out.push(n); }
  // the group the person's words touch (other than the signature's own), its first touching noun
  let touched = null;
  for (let k = 0; k < 4 && !touched; k++) { if (k === gi) continue; const hit = cell[k].find((n) => touches(n, qWords)); if (hit) touched = hit; }
  if (touched && !out.includes(touched)) out.push(touched);
  else { for (let k = 0; k < 4 && out.length < 3; k++) { if (k === gi) continue; const n = cell[k][0]; if (n && !out.includes(n)) out.push(n); } }
  if (!personNamed && out.length < max) { for (let k = 0; k < 4 && out.length < max; k++) { for (const n of cell[k]) { if (!out.includes(n)) { out.push(n); break; } } } }
  return out.slice(0, max);
}

// THE FIELD line(s) for a draw, for the record block. question/context: the person's words (the selector reads them; their own named thing wins).
export function fieldLines(draw, question = '', context = '') {
  if (!draw || draw.transient == null || draw.position == null) return '';
  const sigH = houseOf(draw.transient), seatH = houseOf(draw.position); const ch = channelOf(draw.transient);
  if (!sigH || !seatH) return '';
  const q = `${question || ''} ${context || ''}`;
  const cross = FIELD[seatH]?.[sigH]; const diag = FIELD[sigH]?.[sigH];
  const personNamed = words(q).size > 6; // a question with words in it has named things the Reader must prefer; the field hands fewer
  const a = selectNouns(cross, ch, q, { max: 4, personNamed }); const b = selectNouns(diag, ch, q, { max: 3, personNamed: true });
  if (!a.length) return '';
  return [
    `THE FIELD (nouns you may point at — the person's own named thing beats these; "something" appears once, in the closing question, and nowhere else): ${cellName(sigH, seatH)} — ${a.join('; ')}`,
    b.length ? `THE FIELD, if not that: ${cellName(sigH, sigH)} — ${b.join('; ')}` : null,
  ].filter(Boolean).join('\n');
}

// Every noun in the field, for the lint (listy: more than four field nouns in one reading means the selector is not being honoured)
export const ALL_NOUNS = (() => { const s = new Set(); for (const seat of Object.values(FIELD)) for (const cell of Object.values(seat)) for (const g of cell) for (const n of g) s.add(n); return [...s]; })();

// The cross cell's nouns for a draw, for the lint's re-ask (the same selection the record line hands over)
export function fieldNouns(draw, question = '') {
  if (!draw || draw.transient == null || draw.position == null) return [];
  const sigH = houseOf(draw.transient), seatH = houseOf(draw.position); if (!sigH || !seatH) return [];
  return selectNouns(FIELD[seatH]?.[sigH], channelOf(draw.transient), question, { max: 4, personNamed: false });
}
