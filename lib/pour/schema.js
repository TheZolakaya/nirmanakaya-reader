// THE POUR — schema v0.5 (2026-09-30, gaveled by the founder item by item: DECISIONS_Chris_The_Pour_Line_v2_Gaveled_2026-09-30).
// A CELL is one signature in one seat at one status, authored once by a seated strong model, checked, and served as the
// floor the live Reader stands on. The four load-bearing parts live in four grammatical roles so a paraphrase cannot
// collapse them (Keel): the status as a TENSE, the card as a VERB phrase, the seat as a PLACE phrase, the ask as an OFFER
// with an object. The medicine is the heart of every cell: the ask derives from the PARTNER and its mechanism, never from
// the status alone (provenance mandatory). Cells are scalar (one status); the vector and etiology are assembler data.

export const SCHEMA_VERSION = '0.5';
export const PROMPT_VERSION = 'pour-author-2026-10-02-d';   // d: after three judges on C — the sheet line is one beat again, the healthy picture is one sentence in the seat's own image and may come second, the wound by paraphrase and durations are named, contractions, no instruction words, the partner's name once   // c: the human face — said across a table, the situation before the fault, done-well first, the way back plain, now in it   // b: after Keel's wave-one picks — verb and place once per call; the wound, the person, the labels, the refrains, the weave

export const STATUS_KEYS = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
export const STATUS_NAMES = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };

// what the author returns, per status, and what the library stores
export const CELL_FIELDS = {
  tense: 'one sentence — where in time this person is standing, in plain words (future-facing / past-anchored / disowned-present / now, with the pen). First sentence of the cell.',
  verb: 'the card as a verb phrase — what this capacity DOES, in the person ("the part of you that tends what is growing"). Never the seat.',
  place: 'the seat as a place phrase — WHERE in a life this is happening ("in the part of your life where you see how things work"). Never the card.',
  ask: 'the medicine, from the PARTNER card and its mechanism, as an offer with an object — one real thing, sized to today, that the person may take or leave, as it looks IN THIS SEAT. Under 40 words. Closes on what it gives back, in fresh words each time. Never an order.',
  core: 'the four above, said to the person across a kitchen table, 120 to 160 words, two short paragraphs. First what this capacity looks like in this part of their life when it is going well (there is always such a picture), then how the status is bending it now, then the way back in plain words and what it gives back. Second person, present tense, short sentences, the way a friend who knows the map would say it — not written prose. The ask is re-said inside it in different words, never pasted.',
  sheetLine: 'one line a person could carry out of the room, under 18 words, no semicolon: the situation as one beat, said the way you would say it ("You keep getting it right and calling it luck."). The three beats belong in the core, not here.',
};

// what rides into every authoring call besides the record: the seat (the Crossing + the room), these rules, the exemplars
export const CELL_RULES = `THE CELL — what you are writing, and the rules it is held to (each one checked by a machine before the cell enters the library):

1. FOUR PARTS IN FOUR ROLES. The status as a TENSE (first sentence). The card as a VERB phrase. The seat as a PLACE phrase. The ask as an OFFER with an object. Keep them in those roles; a cell where the card and the seat could swap places is a failed cell.
2. THE ASK IS THE PARTNER'S, AND IT LANDS IN THE SEAT. The medicine in every cell is the partner card's own action, by its mechanism (diagonal / vertical / reduction / growth), given in the record beneath. Never the status alone, never "be more balanced", never the drawn card prescribing itself. The same partner's act looks different in different seats — "name the hope" in the part of a life that moves is a different act from "name the hope" in the part that endures — so the ask says what the act looks like HERE; an ask that would serve any seat with a noun swapped is a failed ask. Under 40 words. Close on what it gives back, in words you have not used before.
3. BALANCED IS NOT A DIPLOMA. A Balanced cell carries a growth vector and an ask — what this balance is free to feed next. "You made it" is a failed cell.
4. KITCHEN TABLE. No house names, no channel names, no status words as jargon, no stage words, no card names other than the drawn card's, no "expressed through", no elements as elements, no "medicine", no "the map", no "the Reader", no tarot words (no star, no cup, no sword). Say the plain thing: "the empty tank" means nothing to a stranger; "trying harder at the thing that's gone quiet doesn't work" does. Precision is measured in what the sentence entails, never in vocabulary.
5. CONDITION, NOT VERDICT. Tenses, never diagnoses. No anxiety, depression, trauma, disorder, narcissist, codependent, burnout, healing as labels. No worth-words about the person.
6. NO HUNCHES, NO HISTORY, NO WOUND. A cell knows the card, the seat and the status. It does not know this person. No "you learned early", no "years ago", no "months now", no sister, no scene, no motive ("for safety", "for an audience"). Too Little may locate the person behind the present; it may not say what happened there, who caused it, how long ago, or what lesson they took from it — not as "it cost you", and not in other clothes either: not "was not trusted", "did not come back", "got you nothing", "gave nothing back", "didn't land", "stopped feeling safe", "got expensive", "the last time you". The card does not say so and the person never did. The clean form is a location with no story in it. Where the live Reader will later ask, the cell leaves room; it never guesses.
7. AN OFFER, NEVER AN ORDER. No "you must", "you should", "you need to", "you have to". The ask is phrased so the person owns it.
8. ONE PICTURE AT MOST. One image, carried through, if it earns its place. Never a stack.
9. THE PARENT, NOT THE PICTURE. A Bound or an Ambassador is its parent archetype's capacity through a channel at a number, or in a role; the record names the parent. Nothing from any card's picture or any inherited tradition.
10. SAY IT ONCE, WARM. Written by someone, to someone, once. Plain is not cold: acknowledge the weight in the tense, offer rather than assign, stay a beat. Warmth is in the stance, never in adjectives or stock phrases.
11. NO "I", NO "SHE". A cell has no first person — the Reader may add one live; the floor may not. No he, she, him or her for the partner or for anyone: the partner is a capacity, not a person, and the reader's own pronoun is theirs.
12. SENTENCES, NOT LABELS. The tense line is a sentence of at least six words about where this person is standing in time — never "Present —", "Past:", "Disowned present", and never "Offer:" before an ask. The record's words for the statuses do not appear anywhere.
13. YOUR OWN SENTENCES. The exemplars show the register; not one of their sentences, and no five words in a row from them, appear in a cell. "What comes back is…", "a door that's already behind you", "pen down in a room you're already writing", "the way back isn't…", "like weather" have been said; a person who draws twice must not meet the same sentence twice. Vary the tense line by seat.
14. WOVEN, NOT PASTED. The core re-says the ask in other words; it never contains the ask sentence whole, and it never leaves the ask out. Two paragraphs, a blank line between them.
15. THE SITUATION, NOT JUST THE FAULT. Every card belongs in every seat, so the core says what this looks like in this part of their life when it is going well — there is always such a picture, at every status — as well as how the status is bending it now. The healthy picture is ONE sentence, in the seat's own image (a kitchen, a bench, a road, a ledger — whatever this seat is in a life), and it may come first or second; it never opens on a hinge like "When this is going well", "At its best", "Done well", "This is what it looks like when" — those are barred. Vary the order from cell to cell. A cell that is only a fault leaves the person nothing to stand on; a cell that opens the same way every time is a factory.
16. SAID, NOT WRITTEN. This core is read by a person, across a table, in your voice — not only by a machine. Short sentences. Contractions: you're, it's, doesn't, can't — the way people talk; "you are" and "it is" and "cannot" are the written voice and a machine counts them. Say the thing and then the next thing. No stacked images, no aphorisms, no sentence that admires itself. The core's first sentence carries the tense in different words from the tense line, never the tense line pasted. If you would not say it out loud to someone you like, do not write it.
17. NOW. The way back is taken today or not at all — last month's choosing cannot be changed and next month's cannot be pre-signed. Say the ask in that size, once, in your own words — as a condition, never an ultimatum — and say plainly what it is: the way back, from the partner's own act, named in words a stranger can hear.
18. THE PARTNER'S NAME, ONCE OR NOT AT ALL. The partner card may be named once, as a name ("the way back here is what Honor does"), never as a common noun ("Authority is what's needed"), never as a label ("offer Passage:"), and never as a sentence of its own fruit grafted whole from its record. Your own words for the act, in this seat.
19. NOT THE AUTHOR'S WORDS. "Capacity", "this part of a life", "the seat", "the map", "the status" are this package's words for talking to you. None of them reaches the person.`;

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
