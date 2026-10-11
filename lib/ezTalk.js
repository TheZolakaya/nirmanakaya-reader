// lib/ezTalk.js — THE LATER TURN'S COMPOSITION (Pass Two of the restructure, 2026-10-11). Lifted verbatim from app/ez/page.js so the page,
// the bench and — later, as its own release — the API door compose a talking turn from the same bytes. Nothing here is new text: every
// string was the page's. The page imports these; the bench calls buildTalkMessage. Until today the page was the only place a second
// turn could be composed, which is why the seven poolside readings (API door, one opening each) never heard a correction.
import { getComponent } from './corrections.js';
import { ARCHETYPES } from './archetypes.js';
import { STATUSES } from './constants.js';
import { drawRecord } from './record.js';
import { frameBlock, fmtDrawForEz, spreadKeyFor, HUNCH_LINE } from './ezOpening.js';
import { notesBlock } from './ezReview.js';
import DEFS from './data/nirmanakaya_78_definitions.json';

/** "Too Little Completion in Drive" — the six words a draw is named by. */
export function drawLabel(d) {
  if (!d) return '';
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

// THE DRAW, FROM THE RECORD — the same full record the advanced reader works from (founder, 2026-09-17: "the easy reader is easy on the
// user, not on the Reader API"). Used on every card-carrying turn; the opening adds the teleology block as well.
export function drawBrief(d) {
  return drawRecord(d, DEFS);
}

/** The discourse as the Reader is handed it: ASKER lines in quotes; READER lines labelled as its own earlier words (.699). */
export const discourseText = (list) => list.map((t) => {
  if (t.role === 'you') {
    const verb = t.mode === 'locate' ? 'ASKER ASKS THE FIELD WHERE IT IS (a locating signature was drawn)' : t.mode === 'reflect' ? 'ASKER REFLECTS (puts a question to the field)'
      : t.mode === 'forge' ? 'ASKER FORGES (declares)' : t.act ? 'ASKER (asks for one small thing to do)' : 'ASKER';
    return `${verb}: "${t.text}"`;
  }
  if (t.role === 'catchup') return '[catch-up signature shown]';
  // .528: the Reader's own medicine and question ride with its turn — later turns used to see 'One question.' and nothing
  const gave = t.medicine ? `\n  THE MEDICINE IT GAVE: ${t.medicine}` : '';
  const askedQ = t.question ? `\n  IT ASKED: "${t.question}"` : '';
  return `READER (you — your own earlier words, never the asker's)${t.draw ? (t.mode === 'locate' ? ` (reading the locating signature ${drawLabel(t.draw)} as a pointer)` : ` (on the newly drawn ${drawLabel(t.draw)})`) : t.act ? ' (one small act, then quiet)' : ''}: ${t.text}${gave}${askedQ}`; // .699: labelled as the Reader's own
});

// Every turn used to be re-sent in full on every call, so a long session paid more and more
// for its own history. Keep the newest within a budget and say how much was dropped.
export const DISCOURSE_CAP = 12000;
export function discourseBlock(list) {
  let lines = discourseText(list);
  let dropped = 0;
  while (lines.length > 1 && lines.join('\n\n').length > DISCOURSE_CAP) { lines = lines.slice(1); dropped += 1; }
  const note = dropped ? `\n\n(${dropped} earlier turn${dropped > 1 ? 's' : ''} omitted for length; the reading and its signatures are unchanged.)` : '';
  return lines.join('\n\n') + note;
}

// .536: THE REGISTER RIDES IN THE TURN. The five voices lived only at the tail of an ~18k-token system prompt, and
// flash weighs the turn far more than the system prompt (the question shape, the beinghood verdict, the trauma line
// and the AI question all had to move into the turn before they held). Founder: "not noticing much difference in
// our new voices." One line, every reader-facing turn, says which register this reply is in.
export const REGISTER_LINE = {
  plain: "PLAIN WORDS. Short everyday sentences a smart twelve-year-old follows; NONE of the map's language on glass — no signature, seat, status, medicine, house, channel or stage names; the meaning in their words only.",
  grown: "PLAIN WORDS, GROWN. For an adult who has never seen the map: plain, not simple — full sentences, adult vocabulary, no condescension — and still NONE of the map's language on glass.",
  map: "THE MAP'S WORDS. Name the signature, the seat, the status and the medicine by their names, and say what each is in the same breath; ordinary depth, the map speaking as itself.",
  deep: "DEEP. The map's words AND the derivation shown — how this signature in this seat with this status fixes this medicine, step by step, in a collegiate register; take the room you need.",
  friend: "FRIEND. The same reading told by a friend across the kitchen table — warm, direct, informal; the voice law and the persona card in the system prompt govern every word; no map's words.", // .712
  coach: "COACH. The same reading told by a good coach — what is happening in a sentence or two, then the move, what done looks like, how they will know; no map's words.",
  storyteller: "STORYTELLER. The same reading told as how this kind of thing tends to go, then turned back to them — the pattern, never an invented backstory; no map's words.",
  mystic: "MYSTIC. The same reading told with reverence and weight — every sentence still checkable, no prophecy, the larger philosophy left to Go deeper; no map's words.",
  mystical: "MYSTICAL. The house's own philosophy leaned all the way in — purpose (why this, now), the present as the only place authorship lives, the pillars, the geometry named and felt; no borrowed spirituality, only this house's; take the room you need.",
};
/** The register line appended to a reader-facing turn, exactly as the page's rawCall does it. */
export const withRegister = (userMessage, reg) => (REGISTER_LINE[reg] && !String(userMessage).includes('\n\nREGISTER — ') ? `${userMessage}\n\nREGISTER — ${REGISTER_LINE[reg]}` : userMessage);

// .558: a BALANCED card in play is never read as a gap (the founder, on Balanced Formation: "why do you keep leaning on a gap?")
export const BALANCED_LINE = `\n\nTHE SIGNATURE IN PLAY IS BALANCED. Nothing is missing and nothing is broken; do not find a gap, a floor that isn't there, a piece that "isn't online". The growth partner is an INVITATION — what this balance is free to feed next — and it is offered as one, never as a deficiency; if they push back that things are fine, they are right, and you say so without defending a gap you named.`;

/** The card whose medicine governs a talking turn, as the record keeps it. */
export const signatureInPlayBlock = (card) => `\n\nTHE SIGNATURE IN PLAY (its medicine governs this turn):\n${drawBrief(card)}`;

/** The head of every later turn: the question, the frame in force, the original draw by name, and the discourse heading. */
export const talkHead = ({ ctx = '', question = '', frame = null, drawText = '' }) => `${ctx}QUESTION: "${question}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n`;
export const TALK_TAIL = `\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;

/** The card in play for a list of turns: the newest reader turn that carries a draw and is not a pointer; else the opening's first draw. */
export const cardInPlay = (turns, draws) => [...turns].reverse().find((t) => t.role === 'reader' && t.draw && t.mode !== 'locate')?.draw || draws?.[0] || null;

/**
 * A plain talking turn's user message — the page's composition for the common case (no new signature, no locate funnel, no floors opened,
 * no move): head · discourse · the signature in play · the Balanced line when it applies · the house's notes on the last turn · the hunch
 * check · tail. `middle` replaces everything between the discourse and the tail when a caller composes its own (the page does).
 * `question` arrives already sanitized (the page runs sanitizeForAPI; the bench passes clean text).
 */
export function buildTalkMessage({ ctx = '', question = '', frame = null, draws = [], turns = [], notes = null, middle = null, hunch = true, recordOpts = null }) {
  const drawText = fmtDrawForEz(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null, false); // names only here; the card in play carries its record below
  const inPlay = cardInPlay(turns, draws);
  const mid = middle != null ? middle : `${recordOpts ? `\n\nTHE SIGNATURE IN PLAY (its medicine governs this turn):\n${drawRecord(inPlay, DEFS, question, '', recordOpts)}` : signatureInPlayBlock(inPlay)}${inPlay?.status === 1 ? BALANCED_LINE : ''}${notesBlock(notes)}${hunch ? HUNCH_LINE : ''}`; // hunch / recordOpts (Pass Two): a prompt set's choices; the defaults are the page's bytes
  return `${talkHead({ ctx, question, frame, drawText })}${discourseBlock(turns)}${mid}${TALK_TAIL}`;
}
