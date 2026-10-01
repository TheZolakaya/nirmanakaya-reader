// THE POUR — schema v0.5 (2026-09-30, gaveled by the founder item by item: DECISIONS_Chris_The_Pour_Line_v2_Gaveled_2026-09-30).
// A CELL is one signature in one seat at one status, authored once by a seated strong model, checked, and served as the
// floor the live Reader stands on. The four load-bearing parts live in four grammatical roles so a paraphrase cannot
// collapse them (Keel): the status as a TENSE, the card as a VERB phrase, the seat as a PLACE phrase, the ask as an OFFER
// with an object. The medicine is the heart of every cell: the ask derives from the PARTNER and its mechanism, never from
// the status alone (provenance mandatory). Cells are scalar (one status); the vector and etiology are assembler data.

export const SCHEMA_VERSION = '0.5';
export const PROMPT_VERSION = 'pour-author-2026-10-01-b';   // b: after Keel's wave-one picks — verb and place once per call; the wound, the person, the labels, the refrains, the weave

export const STATUS_KEYS = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
export const STATUS_NAMES = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };

// what the author returns, per status, and what the library stores
export const CELL_FIELDS = {
  tense: 'one sentence — where in time this person is standing, in plain words (future-facing / past-anchored / disowned-present / now, with the pen). First sentence of the cell.',
  verb: 'the card as a verb phrase — what this capacity DOES, in the person ("the part of you that tends what is growing"). Never the seat.',
  place: 'the seat as a place phrase — WHERE in a life this is happening ("in the part of your life where you see how things work"). Never the card.',
  ask: 'the medicine, from the PARTNER card and its mechanism, as an offer with an object — one real thing, sized to today, that the person may take or leave, as it looks IN THIS SEAT. Under 40 words. Closes on what it gives back, in fresh words each time. Never an order.',
  core: 'the four above woven into two short paragraphs, 110 to 140 words, second person, present tense, kitchen register. The tense sentence opens it; the ask is re-said inside it in different words, never pasted. Nothing in it that a stranger could not read across a table.',
  sheetLine: 'the whole cell in under 18 words.',
};

// what rides into every authoring call besides the record: the seat (the Crossing + the room), these rules, the exemplars
export const CELL_RULES = `THE CELL — what you are writing, and the rules it is held to (each one checked by a machine before the cell enters the library):

1. FOUR PARTS IN FOUR ROLES. The status as a TENSE (first sentence). The card as a VERB phrase. The seat as a PLACE phrase. The ask as an OFFER with an object. Keep them in those roles; a cell where the card and the seat could swap places is a failed cell.
2. THE ASK IS THE PARTNER'S, AND IT LANDS IN THE SEAT. The medicine in every cell is the partner card's own action, by its mechanism (diagonal / vertical / reduction / growth), given in the record beneath. Never the status alone, never "be more balanced", never the drawn card prescribing itself. The same partner's act looks different in different seats — "name the hope" in the part of a life that moves is a different act from "name the hope" in the part that endures — so the ask says what the act looks like HERE; an ask that would serve any seat with a noun swapped is a failed ask. Under 40 words. Close on what it gives back, in words you have not used before.
3. BALANCED IS NOT A DIPLOMA. A Balanced cell carries a growth vector and an ask — what this balance is free to feed next. "You made it" is a failed cell.
4. KITCHEN TABLE. No house names, no channel names, no status words as jargon, no stage words, no card names other than the drawn card's, no "expressed through", no elements as elements, no "medicine", no "the map", no "the Reader", no tarot words (no star, no cup, no sword). Say the plain thing: "the empty tank" means nothing to a stranger; "trying harder at the thing that's gone quiet doesn't work" does. Precision is measured in what the sentence entails, never in vocabulary.
5. CONDITION, NOT VERDICT. Tenses, never diagnoses. No anxiety, depression, trauma, disorder, narcissist, codependent, burnout, healing as labels. No worth-words about the person.
6. NO HUNCHES, NO HISTORY, NO WOUND. A cell knows the card, the seat and the status. It does not know this person. No "you learned early", no "years ago", no sister, no scene, no motive ("for safety", "for an audience"). Too Little is a LOCATION — the person is standing at a door that is already behind them — never a CAUSE: nothing cost them, taught them, hurt them or went badly, because the card does not say so and the person never did. "You stopped, and you're still standing where you stopped" is the whole of it. Where the live Reader will later ask, the cell leaves room; it never guesses.
7. AN OFFER, NEVER AN ORDER. No "you must", "you should", "you need to", "you have to". The ask is phrased so the person owns it.
8. ONE PICTURE AT MOST. One image, carried through, if it earns its place. Never a stack.
9. THE PARENT, NOT THE PICTURE. A Bound or an Ambassador is its parent archetype's capacity through a channel at a number, or in a role; the record names the parent. Nothing from any card's picture or any inherited tradition.
10. SAY IT ONCE, WARM. Written by someone, to someone, once. Plain is not cold: acknowledge the weight in the tense, offer rather than assign, stay a beat. Warmth is in the stance, never in adjectives or stock phrases.
11. NO "I", NO "SHE". A cell has no first person — the Reader may add one live; the floor may not. No he, she, him or her for the partner or for anyone: the partner is a capacity, not a person, and the reader's own pronoun is theirs.
12. SENTENCES, NOT LABELS. The tense line is a sentence of at least six words about where this person is standing in time — never "Present —", "Past:", "Disowned present", and never "Offer:" before an ask. The record's words for the statuses do not appear anywhere.
13. YOUR OWN SENTENCES. The exemplars show the register; not one of their sentences, and no five words in a row from them, appear in a cell. "What comes back is…", "a door that's already behind you", "pen down in a room you're already writing", "the way back isn't…" have been said; a person who draws twice must not meet the same sentence twice. Vary the tense line by seat.
14. WOVEN, NOT PASTED. The core re-says the ask in other words; it never contains the ask sentence whole, and it never leaves the ask out. Two paragraphs, a blank line between them.`;

export const RESPONSE_SHAPE = `Respond with ONLY a JSON object, nothing outside it, paragraph breaks inside strings written as the two characters backslash-n:
{"verb": "the card as a verb phrase — written ONCE; it is the same card at every status",
 "place": "the seat as a place phrase — written ONCE; the seat does not move because the person is braced or behind",
 "cells": [
  {"status": 1, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 2, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 3, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 4, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."}
]}
The four cells are four faces of one thing: the same card in the same seat, at the four statuses. Only the tense and the ask move between them. Too Much and Too Little must read as opposite failures of one capacity.`;
