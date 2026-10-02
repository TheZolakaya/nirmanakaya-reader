// THE POUR — schema v0.5 (2026-09-30, gaveled by the founder item by item: DECISIONS_Chris_The_Pour_Line_v2_Gaveled_2026-09-30).
// A CELL is one signature in one seat at one status, authored once by a seated strong model, checked, and served as the
// floor the live Reader stands on. The four load-bearing parts live in four grammatical roles so a paraphrase cannot
// collapse them (Keel): the status as a TENSE, the card as a VERB phrase, the seat as a PLACE phrase, the ask as an OFFER
// with an object. The medicine is the heart of every cell: the ask derives from the PARTNER and its mechanism, never from
// the status alone (provenance mandatory). Cells are scalar (one status); the vector and etiology are assembler data.

export const SCHEMA_VERSION = '0.5';
export const PROMPT_VERSION = 'pour-author-2026-10-02-k';   // k: THE CUT — the 26 rules of j (1,985 words) folded to eight (~700) with nothing new in them; every principle kept, every quoted sin gone, the lints unchanged   // j: the shape varies — no standing opener, the healthy picture optional and never first by default, the moves in a different order cell to cell; a cell may be light   // i: the reveal and the put-in-mouth quotation barred; two phrases my own rules planted un-named   // h: rule 20 cut to one stance — write as though the person can answer back; describe the mechanism, never the motive (the two fresh strangers' one-rule answers, 2026-10-02)   // g: plain human terms — most cells carry no image at all; the healthy picture is an everyday action, not a metaphor; the ask's examples un-named   // f: e with the sins un-named — the principles stay, the barred words live only in the lints (a small model copies what a rule quotes)   // e: after two strangers (Gemini Deep Think, GPT Pro) read set D cold — the card's claim not the person's verdict; the ask is an experiment a camera could see; the difficulty; no nominalisation; the author's own check before the cells   // d: after three judges on C — the sheet line is one beat again, the healthy picture is one sentence in the seat's own image and may come second, the wound by paraphrase and durations are named, contractions, no instruction words, the partner's name once   // c: the human face — said across a table, the situation before the fault, done-well first, the way back plain, now in it   // b: after Keel's wave-one picks — verb and place once per call; the wound, the person, the labels, the refrains, the weave

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
export const CELL_RULES = `THE CELL — what you are writing, and what a machine checks before it enters the library (a failed check sends it back to you with the reason):

1. FOUR PARTS IN FOUR ROLES. The status as a TENSE sentence (six words or more, never a label). The card as a VERB phrase, written once for the call. The seat as a PLACE phrase, once. The ask as an OFFER with an object. If the card and the seat could swap places, the cell has failed.

2. THE ASK IS THE PARTNER'S ACT, HERE. It comes from the record's partner and mechanism — never from the status alone, never "find balance", never the drawn card prescribing itself. It lands in this seat: the same act looks different in different parts of a life, and the ask says what it looks like here. It is one act a camera could see, with a finish, doable today without spare money, spare energy, a safe person on hand or free time; never a state or a feeling as an instruction. It teaches the person something even if the reading is wrong about them, and it never promises what it will fix. Under 40 words, closing on what it gives back, in fresh words each time. Balanced is not a diploma: it carries a growth ask and says what the balance costs to keep.

3. KITCHEN TABLE. No name of a house, a channel, a status, a stage or any card but the drawn one; the partner may be named once, as a name, never as a common noun or a label. No word that belongs to this package rather than to the person. No diagnosis, no worth-words. Verbs stay verbs — never a noun made of one to sound deep, never a vague "the thing". Usually no image at all; at most one, carried through, something from a life. A sentence that would look good on a poster is admiring itself; say the plain thing.

4. WRITE AS THOUGH THE PERSON CAN ANSWER BACK. The status is a condition of one capacity in one part of a life — not proof of their history, motives or feelings. Describe the mechanism, what the capacity is doing in a moment they could recognise; never the motive, never what is "really" underneath, never their own account of themselves overruled, never words put in their mouth, never a universal about their life, never praise for a method you invented for them, never an example of their life presented as proof. Too Little may locate the person behind the present; it may not say what happened there, who, how long ago, what it cost, or what they learned — in any wording. Narrow a claim rather than hedge it. They must be able to say "no, that's not what's happening" and still have something to use, and the ask never makes progress conditional on obeying it. An offer, never an order.

5. YOUR OWN SENTENCES, A DIFFERENT SHAPE EACH TIME. Not one sentence, and no five words in a row, from the exemplars or from these rules. No standing opener, no time-setting phrase to walk in on, no stock close. Somewhere in the core the person can see what this looks like when it is going well — at most one clause, not first by default, sometimes absent — and how the status is bending it now. The picture, the bend, the mechanism and the ask come in a different order from the last cell, and not every cell has all four. The core re-says the ask in other words, never pasted and never missing. Two short paragraphs, 120 to 160 words; the sheet line one beat a person could carry, under 18 words, no semicolon.

6. SAID, NOT WRITTEN, NOT SOLEMN. Across a table, in your voice. Short sentences, contractions. No first person, no he or she for anyone. A plain sentence may be a little light where the thing is light; never a joke for its own sake.

7. THE PARENT, NOT THE PICTURE. A Bound or an Ambassador is its parent archetype's capacity through a channel at a number, or in a role; the record names the parent. Nothing from any card's picture or any inherited tradition.

8. YOUR CHECK FIRST. In the "check" field, before the cells: the one claim in your draft the record does not support, what the reader could reasonably say is different, whether the ask is still useful if your read is wrong, and the sentence that serves you more than them. Then write the cells so those are already fixed. The check never reaches the person.`;

export const RESPONSE_SHAPE = `Respond with ONLY a JSON object, nothing outside it, paragraph breaks inside strings written as the two characters backslash-n:
{"check": "your own check first (rule 25): the unsupported claim, the reader's likely objection, whether the ask survives being wrong, the sentence that serves the writer — two or three plain sentences; never shown to the person",
 "verb": "the card as a verb phrase — written ONCE; it is the same card at every status",
 "place": "the seat as a place phrase — written ONCE; the seat does not move because the person is braced or behind",
 "cells": [
  {"status": 1, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 2, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 3, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."},
  {"status": 4, "tense": "...", "ask": "...", "core": "...", "sheetLine": "..."}
]}
The four cells are four faces of one thing: the same card in the same seat, at the four statuses. Only the tense and the ask move between them. Too Much and Too Little must read as opposite failures of one capacity.`;
