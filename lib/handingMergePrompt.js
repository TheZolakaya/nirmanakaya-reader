// lib/handingMergePrompt.js — CANDIDATE A: THE CONSERVATIVE MERGE (Pass Two of the restructure, 2026-10-11). The Handing of 0.99.749 with the
// paragraph map of Pass One applied by subtraction and substitution, and no new structure: the map's reference paragraphs handed only to the
// voices that may say them; the status-as-feeling clauses made possibilities; HOW CARRIED's Unacknowledged paragraph made structural with the
// target open; "does not exist" made "not derived"; the four statements of the guessing law replaced by the one law; the line and the
// provenance paragraph dropped where their clauses now sit; Plain's guess law moved into the base for every voice; Keel's four sentences
// reduced to the three the machine does not check. Built from the live Handing at load, so it cannot drift from it. Flag-only.
import { HANDING_BASE, HANDING_RULES } from './handingPrompt.js';
import { CONSTITUTION_CORE, REFERENCE_MAP } from './constitutionPrompt.js';
import { VOICES, PLAIN_CARD_HEAD, VOICE_LAW_RECORD, VOICE_LAW_FORBIDDEN, VOICE_LAW_STAYS, LITERAL_FIRST, PERSONA_CARDS, PERSONA_KEYS } from './ezPrompts.js';

export const MERGE_VERSION = 'A-2026-10-11';
const paras = (s) => String(s).split(/\n\n+/);
const starts = (p, opening) => p.trim().startsWith(opening);
const need = (list, opening) => { if (!list.some((p) => starts(p, opening))) throw new Error(`merge: paragraph not found: ${opening}`); };
const sub = (s, a, b, what) => { if (!s.includes(a)) throw new Error(`merge: text not found: ${what}`); return s.replace(a, b); };

const GUESS_LAW = paras(CONSTITUTION_CORE).find((p) => starts(p, 'WHAT YOU KNOW, WHAT YOU GUESS')).trim();
const STATUS_DIRECTION = paras(CONSTITUTION_CORE).find((p) => starts(p, 'THE STATUS GIVES A DIRECTION')).trim();

let base = paras(HANDING_BASE);
for (const o of ['The three classes.', 'The houses and the channels.', 'Elements.', 'The four dimensions of the Seal.', 'The seven spheres', 'The recursion of the self', 'Each status is also a place in time', 'What a draw can say.', 'The record is yours.', '3. Assert the signature.', '4. Everything traces', '9. The line.']) need(base, o);
// B14–B19 → the reference block (voices that may say it)
base = base.filter((p) => !['The three classes.', 'The houses and the channels.', 'Elements.', 'The four dimensions of the Seal.', 'The seven spheres', 'The recursion of the self'].some((o) => starts(p, o)));
base = base.map((p) => {
  // B21: the feeling clauses become possibilities
  if (starts(p, 'Each status is also a place in time')) return sub(sub(p, 'and its feeling is fear.', 'and fear may sit near it — a possibility to offer, never a state to report.', 'B21 fear'), 'and its feeling is regret, shame, guilt.', 'and regret, shame or guilt may sit near it, when their own words say so.', 'B21 regret');
  // B24: HOW CARRIED's Unacknowledged paragraph, structural with the target open (the commission's variant B)
  if (starts(p, 'What a draw can say.')) return sub(p, /  For Unacknowledged specifically:[^\n]*\n/.exec(p)?.[0] || '', `  For Unacknowledged specifically: say what the instrument fixes — something is already operating here, and its source, ownership or relationship is not being recognized — and treat who or what is unacknowledged in this person's situation as an open interpretation unless their words establish it: offer your best guess as a guess, and let their correction change the interpretation, never the draw. Never invent where the credit went.\n`, 'B24 unacknowledged');
  // B25: "does not exist" → "not derived"
  if (starts(p, 'The record is yours.')) return sub(p, 'as not existing for this reading; you never coin geometry.', 'as not derived for this reading; you never coin geometry.', 'B25 derived');
  // B30: rule 3 → the one guessing law (B31 is dropped below)
  if (starts(p, '3. Assert the signature.')) return `3. ${GUESS_LAW}`;
  return p;
});
base = base.filter((p) => !starts(p, '4. Everything traces') && !starts(p, '9. The line.'));
// B20 keeps the Agency theorem; the direction-not-depth paragraph joins it so the two mirror errors and the drain case are said once with their reason
{ const i = base.findIndex((p) => starts(p, 'The four statuses as Agency')); base.splice(i + 1, 0, STATUS_DIRECTION); }
export const MERGE_BASE = base.join('\n\n');

let rules = paras(HANDING_RULES);
for (const o of ['PLAIN VERBS, PLAIN NOUNS.', 'THE PROVENANCE.', "THE SIGNATURE'S CLAIM, NOT THE PERSON'S VERDICT."]) need(rules, o);
rules = rules.filter((p) => !starts(p, 'PLAIN VERBS, PLAIN NOUNS.') && !starts(p, 'THE PROVENANCE.'));
rules = rules.map((p) => (starts(p, "THE SIGNATURE'S CLAIM") ? `THE SIGNATURE'S CLAIM, NOT THE PERSON'S VERDICT. Be specific about what the person might recognise without pretending to know more about their life than they have told you and the draw establishes; let the newness come from a useful distinction or an unexpected next step, never from a more dramatic claim about who they are. Narrow the claim rather than hedge it. They must be able to say "no, that's not what's happening" and still have something to use; the pushback chip is that door, and when they take it the read is retired, not restated more gently.` : p));
export const MERGE_RULES = rules.join('\n\n');

// Plain without the guess law (now in the base) and with Keel's sentences reduced to what the machine does not check
const PLAIN_SENTENCES_A = `THE SENTENCES PLAIN WORDS IS MADE OF (Keel, 2026-10-03). Plain is not a word choice; it is that every sentence can be checked. THE CALL, one-sided: the status in its ruled meaning, never both ways; a sentence that covers both outcomes cannot be wrong and cannot be used. THE PLACE, once: what kind of thing has shown up and on which side of this — never a region of their life. THE NAMED THING: the person's own named thing beats everything; when they named none, the record's FIELD line offers candidates, offered as a maybe and asked about, never as their life. THE ASK a camera could see: a visible act with the thing it is done to; a time only when their own words carry one. THE GATE for every sentence: could the person restate it in their own words without using any of your images? Blunt is allowed; warmth lives in the closing question. Your marks for a guess are plain too — "my guess is", "maybe", "it may be that", or the question itself — and a guess said as a guess is trusted more, not less.`;
const PLAIN_A = [PLAIN_CARD_HEAD, VOICE_LAW_RECORD, VOICE_LAW_FORBIDDEN, PLAIN_SENTENCES_A, VOICE_LAW_STAYS, LITERAL_FIRST.trim()].join('\n\n');
const PERSONA_FLOOR_A = `THE PERSONA'S FLOOR — on top of the law above, for every voice that is not Plain.
PRESERVE THE READING: what is happening, where, the direction, the move, and what must stay true. Change diction, rhythm, warmth, humour, directness and length — never the relation.
THE ASKER'S NOUNS FIRST; ordinary general English where theirs run out. Preserve claims, not sentences.
HUMOUR is a permission, not a dial: never about grief, trauma, diagnosis, abuse, humiliation, fear, acute vulnerability, or the person's worth; one light line at most, never in place of the meaning.
DEPTH IS NOT YOURS: give the immediate reading and the move; the larger frame belongs to "Go deeper", whatever the voice.`;
const PERSONA_LAW_A = [VOICE_LAW_RECORD, VOICE_LAW_FORBIDDEN, VOICE_LAW_STAYS, LITERAL_FIRST.trim(), PERSONA_FLOOR_A].join('\n\n');
export const VOICES_A = { plain: PLAIN_A, grown: VOICES.grown.rules.replace(VOICES.plain.rules.split('\n\n')[0] + '\n\n', '') };
for (const k of PERSONA_KEYS) VOICES_A[k] = `${PERSONA_LAW_A}\n\n${PERSONA_CARDS[k]}`;
VOICES_A.deep = VOICES.deep.rules; VOICES_A.mystical = VOICES.mystical.rules; VOICES_A.map = VOICES.map.rules;

export const MERGE_SET = { name: 'merge', version: MERGE_VERSION, BASE_SYSTEM: MERGE_BASE, EZ_RULES: MERGE_RULES, REFERENCE: REFERENCE_MAP, voiceRules: (v) => VOICES_A[v], record: { statusLines: 'structural', invariants: false }, turn: { hunch: false, frameAsk: 'short', teleFor: ['deep', 'map', 'mystical'], dossierFor: ['deep', 'map', 'mystical'] } };
