'use client';

// /ez — EZ MODE (the discourse layer — v2, 2026-09-14)
// The Reader opens BRIEF: the whole card in a few sentences, the verdict first if there is one,
// then ONE question back. Everything else unfolds in conversation.
//
// Three tiers of affordance, three visual weights (the founder's clutter ruling, 2026-09-14):
//   1. TALKING — pills written from each turn: Build / Push back / Clarify / Stair. No draw, cheap.
//      Unpack and Clarify from the full site are absorbed here: in a conversation they are
//      sentences, not buttons.
//   2. THE FIELD — two switches, Reflect and Forge. Flipping one RE-RENDERS the pills: four
//      questions to put to the field, or four declarations to forge from. Tapping one draws a card.
//   3. SIMPLER — a small link on a turn; re-says that turn plainly. A re-render, not a new turn.
//
// Gated: signed-in admins, or the ez_enabled feature flag. Production reading page untouched.
// Requirements: REQUIREMENTS_The_Discourse_Layer_EZ_Mode_2026-09-13.md (Hybrid + shelf).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_INFO } from '../../lib/constants';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from '../../lib/corrections';
import { generateSpread, formatDrawForAI, sanitizeForAPI, ensureParagraphBreaks } from '../../lib/utils';
import { BASE_SYSTEM } from '../../lib/prompts';
import { VOICES, EZ_RULES, BRAZIER_HARD_RULE, BRAZIER_RULES, DRAGON_STANDARD, brazierSystem, dragonBlock, doSomethingBlock } from '../../lib/ezPrompts';
import DEFS from '../../lib/data/nirmanakaya_78_definitions.json';
import { STARTER_KINDS, DOOR_SUBS, STARTERS, dailyPoolFor } from '../../lib/starters';
import { buildKernel, kernelBlock } from '../../lib/kernel';
import { drawRecord, medicineRecord as medicineRecordOf } from '../../lib/record';
import { buildReadingTeleologicalPrompt } from '../../lib/teleology-utils.js';
import { buildPersonaPrompt } from '../../lib/personas';
import { MODEL_IDS, MODEL_PRICING, CACHE_READ, CACHE_WRITE_1H, usdFor } from '../../lib/modelConfig';
import { parseReaderJson } from '../../lib/readerJson';
import { getUser, getSession, isAdmin, saveReading, updateReadingContent, getReadings, getReading, rememberAuthReturn } from '../../lib/supabase';
import AuthModal from '../../components/auth/AuthModal';
import { getHomeArchetype, getCardType, getCardImagePath, getCardThumbPath } from '../../lib/cardImages';
import TheMap from '../../components/map/TheMap';
import { runLanding, clearLanding, placeWordmark } from '../../components/map/landing';
import CardImage from '../../components/reader/CardImage';
import Minimap from '../../components/reader/Minimap';
import MinimapModal from '../../components/reader/MinimapModal';
import InfoModal from '../../components/shared/InfoModal';
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import BrandHeader from '../../components/layout/BrandHeader';
import { useBackdropPrefs, Backdrop, CornerControls } from '../../components/shared/SiteChrome';
import Footer from '../../components/layout/Footer';

const EZ_VERSION = 'ez-2';
const STATUS_COLOR = { 1: '#34d399', 2: '#fbbf24', 3: '#38bdf8', 4: '#a78bfa' };

// THE VOICES. The founder's wife read her first reading on 2026-09-14 and could not use it: "it
// was filled with a lot of our nomenclature ... just for people that were esoteric and really into
// tarot." The reading was correct and unusable. So EZ carries a VOICE, chosen once and changeable
// any time, that sets the register of every turn. The draw, the statuses and the medicine are
// untouched; only the words change. The architecture stays visible where it belongs — on the
// cards and the minimap — not in the vocabulary of the prose.
//
// "plain" is the default: anyone can read it. "map" is the reading in the map's own words, for
// people who know them. The voice block rides AFTER the EZ rules so it wins on wording.

// The EZ rules ride AFTER the base system (covenant + laws) so the Reader keeps every law it has.

// FIND IT — the funnel (founder, 2026-09-16 evening). The Reader names its own vagueness with
// a locate chip; tapping it runs up to three narrowing rounds whose questions come from the
// GEOMETRY, never from a wise reader's judgment: the seat says where to look, the status says
// what shape the thing has, the medicine is the tell. The Reader never names the thing.
const locateBlock = (loc, brief) => `

FIND IT. The person tapped "help me find it" about: "${loc.what}". This is narrowing turn ${loc.step}${loc.balanced ? ' (a Balanced card: ONE narrowing turn at most)' : ' (three at most)'}. The draw cannot name the thing; only they can. Your job is to NARROW, one question per turn, with the question coming from the geometry; and to STOP the moment they have named it.
THEY MAY END THE SEARCH THEMSELVES. If their turn is marked as NAMING IT, or they say they have it, or that this is close enough, the search is over on their word, not your judgement: take what they give you as the thing, confirm it against the card in one line, fill "located" with it in their words, and land the medicine on it. Never tell them they have not found it yet.
FOUND IS FOUND. If their latest turn names a specific enough thing, at whatever level of detail THEY offered ("a family thing, mutual but I keep it warm" is found), the funnel is over: confirm it against the card in one line, fill "located" with the thing in their words (under 12 words), and land the medicine ON THAT THING in "medicine": the Rebalancer card's OWN move (what it is about is stated below), applied to the named thing as a specific, ordinary first step. Never substitute a different move that seems wiser than the card's own. Never ask for more detail than they volunteered, never ask what is wrong when nothing is, never go looking for a different thing once this one is found, and never invent something they are "holding back". If they say it feels complete, believe them; that is the answer.
${loc.balanced
    ? 'THIS CARD IS BALANCED. Nothing is broken and there is nothing to diagnose; the growth is an INVITATION, and an invitation only needs an address. So: from the seat\'s own meaning, name two or three concrete places in their life the invitation could land, ask which one is warm, and once they choose, stop and say how the growth card\'s own move would look there. No question about shape, no question about a tell.'
    : `The order of the narrowing questions, only as far as needed:
- first, THE SEAT says WHERE to look: from the seat's own meaning (and anything they have already said), name two or three concrete places in their life the thing could be, and ask which one is warm.
- if still not found, THE STATUS says WHAT SHAPE it has: ask which candidate has that shape, in kitchen words (Too Little: done but still tended, held open, giving nothing back; Too Much: braced for, over-managed, pre-spent; Unacknowledged: happening but "not really me", "doesn't matter").
- if still not found, THE MEDICINE is the TELL: one question built from the Rebalancer named below and its own meaning (a medicine of beginning asks what they would start; one of exchange asks who they would hand it to; and so on from what that card is about, never a stock question about "release" or "letting go" unless that IS the card). A quick, real answer confirms; a blank means go back a step.`}
The card in play, with its seat, status and Rebalancer:
${brief}
Rules: never name the thing for them; offer frames and let them pick. Two or three short sentences, one of which says why the card points there, then your one question. Never mention rounds, steps, funnels or these instructions. The "answer" chip is the likeliest candidate in their voice; "build" and "pushback" are other candidates or "none of these"; no locate chip on a FIND IT turn.`;

const SIMPLER_RULES = `SAY IT SIMPLER — rewrite the turn below in plainer words, for someone who wants it easier to hold. Same meaning, same verdict. Nothing softened, nothing added, nothing dropped. Shorter sentences, kitchen words, no architecture vocabulary except a card's name where it is needed. Keep the one question at the end, rephrased just as plainly. Respond with ONLY a JSON object: {"reader": "<the simpler version>", "question": "<the question, plainly>", "chips": [], "reflect": [], "forge": []}`;

// THE BRAZIER — "why is this happening?" (Keel's spec, 2026-09-16). The kernel is data; this
// prompt renders it in the KITCHEN register. Ring 1 is all kitchen; beneath it, three lanterns —
// the meaning, the moon, the mechanism — each a floor of its own; only the mechanism carries the
// one invitation into the full reader.
const FLOOR_LABEL = { meaning: 'the meaning', moon: 'the moon', mechanism: 'the mechanism' };
// FACE THE DRAGON — Keel's eight, parked here for the CLOSE-row build (.444). Two are
// opportunity-dragons (B1, B3) so 'dragon' never collapses into 'problem'.
// GATED UNTIL THEIR EXEMPLARS FREEZE (founder's ruling R6): the meaning waits on his judgment of
// BRIEF_Ring_Two's eight; the moon's eight are not yet written. The bench shows all three.
const FLOORS_OPEN = { meaning: true, moon: true, mechanism: true }; // opened 2026-09-19 night (founder: "make this all accessible to all users")

// THE DO-SOMETHING BUTTON (Keel's spec §2). Not a mode. Consults nothing. One small real act,
// then the Reader goes quiet. The name is a config string — the founder picks.
const DO_SOMETHING_LABEL = 'One small step'; // founder, 2026-09-16 night (was 'what can I do about this?')
const DO_SOMETHING_HINT = 'one small real thing, in the next minute';

// FACE THE DRAGON (Keel's ADDENDUM_The_Moon_Comes_Back_Face_The_Dragon, 2026-09-19; the founder's
// ruling the same morning: NO drain gate — "the tap is the consent", "maybe that thing is a
// gas-breathing dragon"). The fierce door: the thing itself, said straight — the problem being
// walked around OR the opportunity not picked up. Chosen by name, never default.
const DRAGON_LABEL = 'Face the dragon';
const DRAGON_HINT = 'the thing itself, said straight — a problem walked around, or a gift not picked up';

const CLOSING_RULES = `WRITE THIS UP AND CLOSE. The person has asked for the whole reading in one piece, to keep. Write it for them to read next month, when the conversation is gone and only this is left. Under 300 words (raised from 220 on 2026-09-19 — it is the thing they keep), plain words, no framework vocabulary, no question at the end, nothing new introduced.
Five short parts, unlabelled, flowing as paragraphs:
1. What they came in asking, in their own words.
2. What the cards said — the card, where it landed, and what that meant, in the same plain terms the reading used.
3. What came out of the conversation: what they named, what they pushed back on, what they decided. Their words where you have them.
4. The way through, and the one move — concrete, as it was given.
5. One closing line that hands it back to them and lets them stop. Warm, unhurried, no instruction, no self-care advice, no promise about what will happen.
THE FROZEN STANDARD (Keel, from the founder's own sessions, 2026-09-19; a synthesis, not a new reading — gather everything drawn and said into one honest account of where the person is NOW; end with the state, not a question):
1. C1. The founder's 2026-09-19 session (Too Much Celebration in Drive → Balanced Source in Inspiration)
   Here's where you are. You asked what you're ready to complete, and the first card said: the thing you're already celebrating — the readiness is real, the timing was running a little ahead. Then you said the joy sharpens you, that you want to get there clean, and the field answered with the Wheel in the seat of your calling, balanced: a turn arriving that you didn't set in motion, and you present enough to meet it. So the two cards aren't a contradiction; they're a sequence. The celebration was early. Then you turned it into attention. Now you're standing at a threshold with your eyes open and the finish in sight — not sprinting, not stalling, looking harder at what's left. That's the state: ready, sharpened by the nearness, and the wheel has come round to you while you were here for it. Nothing is stuck. What's left is the last stretch, and you've already said what you're bringing to it: the joy, used as a lens.
2. C2. The founder's 2026-09-15 session (Balanced Preservation in Tune → Too Little Completion in Drive)
   Here's where you are. You asked what claiming this work's value would change, and the field said: you've already arrived — the part of you that holds things together is steady, and the missing piece was letting the work give something back. Then you asked which part you should be receiving, and the answer came sharper: the finish. Not the vision, not the process — the actual done-ness of what you've completed, which you've been stepping away from. So the picture is one thing seen twice: stable inside the work, not yet in exchange with it, and the specific channel that's closed is the feeling of finished. The way back isn't more building. It's one completed thing, held for ten seconds, let through you instead of past you. That's the state: solid ground, one channel shut, and the medicine is as small as standing still long enough to let a done thing land.
Respond with ONLY a JSON object: {"reader": "<the write-up>", "question": "", "chips": [], "reflect": [], "forge": []}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up card for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the card>", "question": "<the open thread as a question>", "chips": [], "reflect": [], "forge": []}`;

// THE LAYOUT BENCH — /ez?bench=1 (founder, 2026-09-16 night: "a bench where we're just looking at
// what the draw looks like and the structure, so we can futz with it in real time" without
// spending API calls or polluting his history). A fixed draw, a canned conversation, and every
// model call answered locally from the shapes below after a short delay so the pending states
// show too. Nothing is saved. Signed-in gate still applies.
const BENCH_DRAW = { transient: 51, position: 13, status: 3 }; // Too Little Completion in Transformation → Activation
const BENCH_QUESTION = "What's ready to close that I'm still holding open?";
const BENCH_CHIPS = [
  { kind: 'answer', text: "Honestly? Probably lighter than I want to admit." },
  { kind: 'build', text: "Yes, and I think I already know which one it is." },
  { kind: 'pushback', text: "No, it's more like I don't get to decide when it closes." },
  { kind: 'clarify', text: "What do you mean by 'a cycle that has finished'?" },
  { kind: 'stair', text: "What am I afraid happens the day after it closes?" },
  { kind: 'locate', what: 'the thing that is already done', text: "Help me find which thing this actually is." },
];
const BENCH_REFLECT = ["What is the door that's already shut?", "Why do I keep my hand on the handle?", "What would open if this closed?", "Is there something I owe it before it closes?"];
const BENCH_FORGE = ["I will say out loud that this is done.", "I will start one small thing this week.", "I will stop tending what stopped giving back.", "I will let the day after be a new day."];
const BENCH_OPENING = {
  reader: "Something is done. You already know what it is.\n\nThe card you drew is about the feeling of completion — that quiet click when something has genuinely finished. Not almost done, not wrapping up, but done. That feeling is supposed to land, settle, and release you. Right now it's running low. It's like standing at a door that's already swung shut, with your hand still on the handle.\n\nThe seat it landed in is the part of life where things change shape — where one thing ends so another can begin. When the sense of completion is quiet here, the old thing doesn't compost. You keep tending it out of habit, or loyalty, or because closing it feels like losing it.\n\nThe way through starts with igniting something new — not finishing the old thing, but striking a fresh spark somewhere nearby. When you begin something, your whole system reorients to what's coming instead of what was, and the held-open door lets go on its own.",
  question: "What would actually change for you if you let this one thing close today?",
  chips: BENCH_CHIPS, reflect: BENCH_REFLECT, forge: BENCH_FORGE,
  medicine: "The way through isn't forcing the close — it's starting something fresh. Pick one small, real beginning this week: a new conversation, a first page, a single action you haven't taken yet. When you ignite something new in the same space where the old thing lived, the hold releases on its own.",
  act: "I keep my hand on a door that's already shut. What's one small thing I could actually do about that in the next minute?",
};
const BENCH_TALK = {
  reader: "That fits. A thing you keep tending out of loyalty is exactly what this card calls held open — the loyalty is real, and so is the fact that it stopped giving anything back a while ago.\n\nNothing here says leave badly. It says the part of you that knows when something is finished has gone quiet, and that's why the hand stays on the handle.",
  question: "If it were gone tomorrow, what would you start?",
  chips: BENCH_CHIPS.slice(0, 5), reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '',
};
const BENCH_FUNNEL = {
  reader: "The card landed in the part of life where things change shape, so that's where to look. Three places this usually lives: a role you still show up for though the reason you started it is gone; a relationship that quietly ended but is still technically on; or a version of yourself you haven't officially retired.\n\nWhich of those is warm?",
  question: "Which one of those feels like the real one?",
  chips: [{ kind: 'answer', text: "Honestly, the role. I keep showing up out of habit." }, { kind: 'build', text: "It's the version of me one — a story that stopped being true." }, { kind: 'pushback', text: "None of those. It's something else." }],
  reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '', located: '',
};
const BENCH_ACT = { reader: "Pick one thing that is finished — one conversation, one project, one chapter — and say out loud: \"This is done.\" Two words. That's the spark. Not a plan, not a list. Just the sound of a door closing, in your own voice, right now.", question: '', chips: [], reflect: [], forge: [], medicine: '' };
const BENCH_RINGS = {
  1: "Part of you is still standing at a door that's already behind you — that's why the direction feels missing, and why the tending has started to feel like a job. Something here has genuinely finished; you can feel that it has. What this moment is asking isn't a decision or a ceremony. It's a single move: let something begin. Not the next big thing — something small, available, requiring nothing but a yes. A fresh page, a message started, one action that belongs entirely to now. That move doesn't close the old thing by force. It just puts you on the other side of it.",
  2: "The card is Completion, and it landed in Transformation — the seat where endings clear the ground for what comes next. Its status is Too Little: the sense of a thing being finished is running low, so the ending never quite lands.\n\nThe medicine runs on the vertical: a seat running on empty is charged through its twin, Activation — the fresh spark, beginning for its own sake. The geometry sends you there because you cannot push feeling into an empty seat; you put energy into the twin's own action and the current pulls through.",
  3: "Completion is the outer bound of Recognition in the Gestalt house, through the Resonance channel, at the Feedback stage: the point where a cycle is known to be whole. Too Little places it in the past tense — a door already behind you. The vertical pair fixes the medicine before any words are written: Activation, the first spark, through Intent.\n\nThis is a derivation, not a guess: the card, the seat and the status settle the partner. If you want every card laid out like this, the full reader holds it.",
};
const BENCH_FLOORS = {
  meaning: "Look at the picture on the card that shows the way through: a single flame, just caught. Not a bonfire — the first small light, the moment before it's anything. That's what this turn is asking of you, and it isn't tidy: it's to be the one who strikes it. The finished thing behind you is real, and it will stay finished whether or not you keep tending it. What only you can do is what comes next — the page nobody has asked for yet, the message that starts a thing instead of closing one. You're not being asked to be sure. You're being asked to be the one who begins.\n\nWhat's the small thing you'd start if nobody needed you to?",
  moon: "This came to you because a part of your life that governs endings was listening — and it noticed that something in you is still standing at a door that has already closed. That's the whole reason it's this card and not another: not a warning, an address. The turn arrived where you'd been waiting.\n\nHere's what it's for. Only this moment can be written in. The finished thing is read-only now; so is the version of you that finished it. But the pen is still in your hand, and it only writes here. Nothing about you is broken — you're the one making this, and the card is simply what your making looks like from the inside tonight: a door behind, an unlit match ahead. That's not a small thing. That's the whole of it, every time.",
  mechanism: BENCH_RINGS[2] + "\n\n" + BENCH_RINGS[3],
};
const benchReply = (msg) => {
  if (/Write ring (\d)\. JSON only\./.test(msg)) return { text: BENCH_RINGS[msg.match(/Write ring (\d)/)[1]] };
  if (/Write the (meaning|moon|mechanism) floor\. JSON only\./.test(msg)) return { text: BENCH_FLOORS[msg.match(/Write the (\w+) floor/)[1]] };
  if (msg.includes('ONE SMALL REAL ACT')) return BENCH_ACT;
  if (msg.includes('FACE THE DRAGON.')) return { reader: "The thing you're walking around: it's finished, and you know it's finished, and you keep tending it because tending is easier than being the one who says so. Nobody is waiting for your permission except you. Here's what's in front of you — not a ceremony, not a decision: one thing started today that has nothing to do with the old one. A page, a message, a first hour. Start it, and the door you've been standing in closes on its own.", question: '', chips: [], reflect: [], forge: [], medicine: '' };
  if (msg.includes('FIND IT. The person tapped')) return msg.includes('narrowing turn 1') ? BENCH_FUNNEL : { ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' };
  if (msg.includes('OTHER OPTIONS')) return { reader: '', question: '', chips: [...BENCH_CHIPS].reverse(), reflect: [...BENCH_REFLECT].reverse(), forge: [...BENCH_FORGE].reverse() };
  if (msg.includes('SAY IT SIMPLER')) return { reader: "Something is finished and you're still holding it. Start one small new thing and the old one will let go.", question: 'What would change if you let it close today?', chips: [], reflect: [], forge: [] };
  if (msg.includes('WHERE AM I')) return { reader: "You asked what's ready to close.\nThe card said: something is already done.\nYou found it: a role kept out of habit.\nOpen thread: what would you start?", question: 'What would you start?', chips: [], reflect: [], forge: [] };
  if (msg.includes('A NEW CARD WAS DRAWN')) return { ...BENCH_TALK, medicine: "This card's own medicine, rewritten from its Rebalancer, would sit here." };
  return BENCH_TALK;
};

// .453: the tolerant shared parser (lib/readerJson.js) — repairs raw line breaks inside strings,
// fences and trailing commas before giving up. Same parser the Bake-off uses.
function parseJson(text) { return parseReaderJson(text); }

function drawLabel(d) {
  if (!d) return '';
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

// THE BRIEF for a card drawn mid-conversation. Until 2026-09-15 the Reader was told six words
// about a reflect or forge card ("Too Little Completion in Drive") and nothing about its
// medicine, while the OPENING draw's rebalancer was restated in full every turn — so the
// model kept the only medicine it could see, and the new card's own correction was named on
// the page (computed here) and never administered in the prose. Keel's transcript note.
const MECHANISM = {
  1: 'GROWTH (Balanced): an invitation, optional — what this balance is free to feed next.',
  2: 'DIAGONAL (Too Much): authority in excess crosses the map to the opposite element; the medicine is that other pole\'s own action.',
  3: 'VERTICAL (Too Little): the seat is starved; the medicine is to charge its vertical twin — energy into the twin\'s own action, and the current pulls through the empty seat. Never push effort or feeling into the empty seat directly.',
  4: 'REDUCTION (Unacknowledged): authorship misattributed; the medicine returns toward the simpler, earlier form of the same line.',
};
const medicineRecord = (d) => medicineRecordOf(d, DEFS);

// THE DRAW, FROM THE RECORD — the same full record the advanced reader works from (founder,
// 2026-09-17: "the easy reader is easy on the user, not on the Reader API"). Used on every
// card-carrying turn; the opening adds the teleology block as well.
function drawBrief(d) {
  return drawRecord(d, DEFS);
}

// The medicine is computed, not generated: every imbalanced card already knows its
// correction card and the geometry that gets there.
function medicineFor(draws) {
  if (!Array.isArray(draws)) return [];
  return draws.map((d) => {
    const trans = getComponent(d.transient);
    const correction = getFullCorrection(d.transient, d.status);
    if (!correction) return null;
    const targetId = getCorrectionTargetId(correction, trans);
    if (targetId === null || targetId === undefined) return null;
    return {
      from: trans?.name,
      fromDraw: d,
      toId: targetId,
      to: getComponent(targetId)?.name,
      path: getCorrectionText(correction, trans, d.status) || '',
      balanced: d.status === 1
    };
  }).filter(Boolean);
}

// THE FIVE DOORS — derived by Keel (Water seat, 2026-09-14) from the five houses, which are
// already the taxonomy of human concern. Phrased as a person half-says it to themselves, not as
// the architecture names it. The house rides along to the Reader as framing, never as a verdict.
// The open field stays: the fluent keep their blank page, the pills carry everyone else.
// Renamed by the founder 2026-09-15 (morning): the houses in a person's own words, plus a
// sixth door where the cards choose — a daily reading with no question brought.
// "LET ONE BE CHOSEN FOR ME" — a house and one of its open sentences, with a memory, so the
// daily does not hand back yesterday's line or the same room two mornings running (Keel, 2026-09-17:
// "a random table with no memory will hand somebody 'What am I here for?' three days in a row and
// the daily stops feeling like a draw"). The pool is fenced in lib/starters.js.
const DAILY_KEY = 'nirmanakaya_daily_last';
const pickDaily = (doors) => {
  let last = {};
  try { last = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') || {}; } catch {}
  const houses = doors.slice(0, 5);
  const rooms = houses.filter((d) => d.id !== last.area);
  const house = (rooms.length ? rooms : houses)[Math.floor(Math.random() * (rooms.length ? rooms.length : houses.length))];
  const pool = dailyPoolFor(house.id);
  const fresh = pool.filter((t) => t !== last.text);
  const text = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))] || '';
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ area: house.id, text })); } catch {}
  return { door: { ...house, viaDaily: true }, text };
};

const DOORS = [
  { id: 'spirit',  house: 'Spirit',  label: 'Passions & beliefs', sub: DOOR_SUBS.spirit, breath: 'Your passions and your beliefs — what moves you, and what you hold to be true.' },
  { id: 'mind',    house: 'Mind',    label: 'Peace of mind',      sub: DOOR_SUBS.mind, breath: 'Your peace of mind — what your head keeps turning over.' },
  { id: 'emotion', house: 'Emotion', label: 'Relationships',      sub: DOOR_SUBS.emotion,           breath: 'Your relationships — the people in your life, and the space between you.' },
  { id: 'body',    house: 'Body',    label: 'Health & prosperity', sub: DOOR_SUBS.body,     breath: 'Your health and your prosperity — your body, your home, your money, what you carry.' },
  { id: 'gestalt', house: 'Gestalt', label: 'Fulfillment',        sub: DOOR_SUBS.gestalt,   breath: 'Your fulfillment — whether your life is adding up to what you meant it to be.' },
  { id: 'daily',   house: null,      label: 'My daily reading',   sub: 'let one of these be chosen for me', breath: '' },
];

// A loop that plays only while its parent (the button it sits in) is hovered, focused or
// touched (founder, 2026-09-16 night). Paused it shows its first frame, so it still reads as an icon.
function HoverVideo({ src, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const host = v.closest('button') || v.parentElement?.parentElement || v.parentElement;
    if (!host) return;
    const play = () => { try { v.play().catch(() => {}); } catch {} };
    const stop = () => { try { v.pause(); } catch {} };
    // PRIME THE FIRST FRAME: a paused video that has never played paints nothing on many phones
    // (blank until tapped — founder, 2026-09-17). A silent play-then-pause as soon as data arrives
    // leaves the first frame on screen.
    let primed = false;
    const prime = () => { if (primed) return; primed = true; try { const pr = v.play(); if (pr && pr.then) pr.then(() => { if (!host.matches(':hover')) v.pause(); }).catch(() => {}); } catch {} };
    if (v.readyState >= 2) prime(); else v.addEventListener('loadeddata', prime, { once: true });
    host.addEventListener('mouseenter', play); host.addEventListener('mouseleave', stop);
    host.addEventListener('focus', play); host.addEventListener('blur', stop);
    host.addEventListener('touchstart', play, { passive: true }); host.addEventListener('touchend', stop); host.addEventListener('touchcancel', stop);
    return () => {
      host.removeEventListener('mouseenter', play); host.removeEventListener('mouseleave', stop);
      host.removeEventListener('focus', play); host.removeEventListener('blur', stop);
      host.removeEventListener('touchstart', play); host.removeEventListener('touchend', stop); host.removeEventListener('touchcancel', stop);
    };
  }, []);
  return <video ref={ref} src={src} loop muted playsInline preload="auto" className={className} style={style} aria-hidden="true" />;
}

// THE READER IS WRITING — the one waiting indicator for every small wait (founder, 2026-09-17,
// four loops of his own): one of the four loops, chosen at random each time, beside the line in
// the rainbow that cycles like Say it. Not for the landing flight; for everywhere else we wait on
// the Reader. (ANIM-18.)
const WRITING_LOOPS = ['/video/writing1.mp4', '/video/writing2.mp4', '/video/writing3.mp4', '/video/writing4.mp4'];
function Writing({ label = 'the Reader is writing…', size = 160, className = '', scroll = true }) {
  const [src] = useState(() => WRITING_LOOPS[Math.floor(Math.random() * WRITING_LOOPS.length)]);
  const ref = useRef(null);
  // it was appearing half off the bottom of a phone screen (founder, 2026-09-17): bring it to the top
  // ONCE, when it first appears — never again when the prop flips (a flight ending flipped it and
  // the scroll yanked the view to the bottom just as the words arrived — founder, 2026-09-17)
  const scrollOnce = useRef(scroll);
  useEffect(() => {
    if (!scrollOnce.current) return;
    const t = setTimeout(() => {
      try { const el = ref.current; if (!el) return; window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' }); } catch {}
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className={`flex flex-col items-center gap-2 py-2 ${className}`} role="status" aria-live="polite">
      <span className="shrink-0 rounded-lg overflow-hidden" style={{ width: size, height: size }} aria-hidden="true">
        <video src={src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
      </span>
      <span className="font-serif text-[1.0625rem] tracking-wide text-center"
        style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite' }}>
        {label}
      </span>
    </div>
  );
}

const CHIP_STYLE = {
  answer: 'border-amber-400/60 text-amber-100 bg-amber-950/20 hover:bg-amber-900/30',
  build: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30',
  pushback: 'border-orange-500/40 text-orange-200 hover:bg-orange-900/30',
  clarify: 'border-sky-500/40 text-sky-200 hover:bg-sky-900/30',
  stair: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/30',
  locate: 'border-violet-400/60 text-violet-100 bg-violet-950/20 hover:bg-violet-900/30',
  reflect: 'border-sky-500/50 text-sky-200 hover:bg-sky-900/30',
  forge: 'border-orange-500/50 text-orange-200 hover:bg-orange-900/30',
};
const CHIP_LABEL = { answer: 'Answer', build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair', locate: 'Find it' };
// each kind's own colour (rgb triplet) for the hover breathe — shades of itself, never another hue
const CHIP_RGB = { answer: '251 191 36', build: '52 211 153', pushback: '251 146 60', clarify: '56 189 248', stair: '251 191 36', locate: '167 139 250', reflect: '56 189 248', forge: '251 146 60' };

// A drawn card and its geometry, SIDE BY SIDE and the same width — the founder's ruling
// 2026-09-14: "I think they're equally significant." The minimap is always shown, because the
// map is how a person sees this is a derivation with boundaries and not an agreeable machine.
// Tapping the art opens the card; tapping the map opens the RELATIONSHIP (this card, in this
// seat) through the same MinimapModal the full reader uses — not the card alone.
const HOUSE_GLOW = { Spirit: '#C44444', Mind: '#4A8B4A', Emotion: '#3D6A99', Body: '#8B6B3D', Gestalt: '#6B4D8A' };
const houseGlow = (archId) => HOUSE_GLOW[ARCHETYPES[archId]?.house] || HOUSE_GLOW.Gestalt;

function CardWithMap({ draw, onInfo, label, stacked = false }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [durableFront, setDurableFront] = useState(false); // hover or tap brings the durable to the front of the stack (founder, 2026-09-16 night)
  if (!draw) return null;
  const trans = getComponent(draw.transient);
  const home = getHomeArchetype(draw.transient);
  const cardType = getCardType(draw.transient);
  const boundIsInner = cardType === 'bound' && trans?.number <= 5;
  const seat = ARCHETYPES[draw.position]?.name;

  return (
    <div className="flex flex-col items-center max-w-full">
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full">
        {stacked ? (
          // THE PAIR, as the landing leaves it: the transient in front, the durable peeking out
          // to its right and behind — "transient in your durable, left to right". The box is the
          // flight's [data-slot="stack"] target, sized so the clones land on these very cards.
          <div data-slot="stack" className="relative shrink-0 w-[217px] h-[196px] sm:w-[287px] sm:h-[252px] mt-6">
            <img src={getCardImagePath(draw.position)} alt={seat || ''}
              className={`absolute rounded-lg w-[140px] sm:w-[185px] left-[77px] top-[20px] sm:left-[102px] sm:top-[26px] shadow-lg cursor-pointer transition-all duration-200 glow-pulse ${durableFront ? 'z-40 scale-[1.03]' : ''}`}
              style={{ '--glow': houseGlow(draw.position) }}
              onMouseLeave={() => setDurableFront(false)}
              onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })} />
            {/* the durable's reachable edge was under the transient's box; this hit area sits above both:
                hover (or a first tap) brings the durable to the front, where its own click opens it */}
            {!durableFront && (
              <div className="absolute z-30 left-[77px] top-[20px] sm:left-[102px] sm:top-[26px] w-[140px] sm:w-[185px] bottom-0 cursor-pointer"
                onMouseEnter={() => setDurableFront(true)} onClick={() => setDurableFront(true)} title={seat ? `in ${seat}` : ''} />
            )}
            <div style={{ '--glow': houseGlow(home) }} className="absolute left-0 top-0 z-10 rounded-lg transition-shadow duration-200 glow-pulse">
              <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
                size="compact" showFrame={true}
                className="!w-[140px] sm:!w-[185px]"
                onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
            </div>
            {/* The names, in the landing's own dress: the status above the transient, its name
                below it, the seat's name under the durable — the same plates the flight parks
                here, so the handoff is invisible. Each is the tap it always was. */}
            <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
              className="absolute left-0 w-[140px] sm:w-[185px] -top-[22px] text-center text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              style={{ color: STATUS_COLOR[draw.status] || '#e4e4e7', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {STATUSES[draw.status]?.prefix || 'Balanced'}
            </button>
            <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
              className="absolute left-0 w-[140px] sm:w-[185px] top-[148px] sm:top-[193px] text-center text-[19px] whitespace-nowrap"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#fde9b0', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {trans?.name}
            </button>
            {seat && (
              <button onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })}
                className="absolute left-[77px] sm:left-[102px] w-[140px] sm:w-[185px] top-[168px] sm:top-[219px] text-center text-[19px] whitespace-nowrap"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#b4b4bc', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                in {seat}
              </button>
            )}
          </div>
        ) : (
          <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
            size="compact" showFrame={true}
            className="!w-[140px] sm:!w-[185px]"
            onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
        )}

        <button data-slot="minimap" onClick={() => setMapOpen(true)}
          title="the geometry of this draw — tap to expand"
          className="ez-minimap w-[140px] h-[140px] sm:w-[185px] sm:h-[185px] shrink-0 rounded-lg overflow-hidden flex items-center justify-center transition-all hover:scale-[1.03] shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_0_20px_rgba(107,77,138,0.1)] glow-pulse-map"
          style={{
            '--glow': HOUSE_GLOW.Gestalt,
            background: 'rgba(13, 13, 26, 0.85)',
            border: '1px solid rgba(107, 77, 138, 0.4)'
          }}>
          {/* With the landing on, the header shows the FULL map, every glyph, as the flight's copy
              does — otherwise the two swap at the handoff and the little marks vanish. */}
          <Minimap fromId={home} toId={draw.position} size="card" singleMode={!stacked}
            fromCardType={cardType} boundIsInner={boundIsInner} />
        </button>
      </div>

      {!stacked && (
      <div className="mt-2 text-center text-xs break-words">
        <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
          title="what this status means"
          className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-2">
          {STATUSES[draw.status]?.prefix || 'Balanced'}
        </button>{' '}
        <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
          className="text-amber-300/90 hover:text-amber-200 underline decoration-dotted underline-offset-2">
          {trans?.name}
        </button>
        {seat && (
          <>
            <span className="text-zinc-500"> in </span>
            <button onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })}
              className="text-zinc-300 hover:text-zinc-100 underline decoration-dotted underline-offset-2">
              {seat}
            </button>
          </>
        )}
      </div>
      )}

      <MinimapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onReopen={() => setMapOpen(true)}
        fromId={home}
        toId={draw.position}
        transient={draw.transient}
        cardType={cardType}
        boundIsInner={boundIsInner}
        setSelectedInfo={onInfo}
        colorTheme="violet"
      />
    </div>
  );
}

export default function EZPage() {
  const [user, setUser] = useState(null);
  // the moving background and the corner controls, shared with the main page
  const chrome = useBackdropPrefs();
  const [allowed, setAllowed] = useState(null); // null = checking
  // THE LANDING in EZ — on for everyone since v0.99.300. ?anim=0 turns it off for a browser,
  // ?anim=1 turns it back on. Reduced-motion users never see it.
  const [animOn, setAnimOn] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [overlayTop, setOverlayTop] = useState(0);   // the map starts below the brand, which never leaves
  const [animPending, setAnimPending] = useState(false); // a flight is about to start: nothing may scroll itself
  const [landedWaiting, setLandedWaiting] = useState(false); // the flight has landed but the reply has not arrived: show 'the Reader is writing' under the parked cards (founder, 2026-09-17: the primary use case)
  const [overlayIn, setOverlayIn] = useState(false);
  // "only allow tap to skip if the reading is ready" — a skip with nothing to skip to is a freeze
  const [replyReady, setReplyReady] = useState(false);
  const readyRef = useRef(false);
  const cameraRef = useRef(null);
  const skipRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');   // what the reading was actually asked — the door's own line when nothing was typed
  // ONE CARD. EZ is one card by the founder's ruling (2026-09-15): the landing tells one card's
  // story, and the conversation goes from there. The 1/2/3 picker is gone.
  const cardCount = 1;
  const [draws, setDraws] = useState(null);
  const [voice, setVoice] = useState('plain');
  const [bench, setBench] = useState(false); // /ez?bench=1 — the layout bench: no API, nothing saved
  useEffect(() => { try { const v = localStorage.getItem('nkya_ez_voice'); if (v && VOICES[v]) setVoice(v); } catch {} }, []);
  const chooseVoice = (v) => { setVoice(v); try { localStorage.setItem('nkya_ez_voice', v); } catch {} };

  // WARM THE MAP while the person is still choosing a door: all 78 thumbnails (about 100KB each)
  // into the browser cache, so the map appears whole the moment it is asked for. Idle-time work.
  useEffect(() => {
    if (!animOn || typeof window === 'undefined') return;
    const run = () => { for (let i = 0; i < 78; i++) { const p = getCardThumbPath(i); if (p) { const im = new Image(); im.decoding = 'async'; im.src = p; } } };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 }); else window.setTimeout(run, 300);
  }, [animOn]);
  const [mapReady, setMapReady] = useState(false);
  // The draw block carries "MANDATORY: your interpretation MUST include the word <position>" — right
  // for the map's words, wrong for plain ones. Stripped at the source when the voice is plain.
  const fmtDraw = (...a) => { const t = formatDrawForAI(...a); return voice === 'plain' ? t.split('\n').filter(l => !l.includes('MANDATORY:')).join('\n') : t; };
  const voiceSwitch = (compact = false) => (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-zinc-500`}>
      <span>{compact ? 'voice' : 'Voice'}</span>
      {Object.entries(VOICES).map(([k, v]) => (
        <button key={k} onClick={() => chooseVoice(k)} title={k === 'plain' ? 'everyday words, no names for anything' : 'the reading in the map\'s own names'}
          className={`rounded-full px-3 py-1 border transition-colors ${voice === k ? 'border-amber-500/70 text-amber-300 bg-amber-950/20' : 'border-zinc-700/70 text-zinc-500 hover:text-zinc-300'}`}>
          {v.label}
        </button>
      ))}
    </div>
  );

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('anim');
      if (p === '1') localStorage.setItem('nkya_ez_anim', '1');
      if (p === '0') localStorage.setItem('nkya_ez_anim', '0');
      const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // ON for everyone on /ez (founder, 2026-09-14: "let's just push it to prod"); ?anim=0 turns it
      // off for a browser, ?anim=1 turns it back on; reduced-motion users never see it.
      if (!reduced && localStorage.getItem('nkya_ez_anim') !== '0') setAnimOn(true);
    } catch {}
  }, []);

  // The sequence plays on the real draw while the Reader writes. It is the shared module the
  // bench runs — components/map/landing.js — handed the map section below and this page's own
  // header as the place to land. A tap anywhere on the map skips to the finished header.
  const playLanding = async (draw, slotsSelector = '[data-ez-header]', scrollTop = true) => {
    const signal = { skip: false };
    skipRef.current = signal;
    let surface = null;
    for (let i = 0; i < 80; i++) {
      surface = document.querySelector('[data-ez-map] [data-map-surface]');
      if (surface && surface.querySelectorAll('[data-position]').length >= 78 && cameraRef.current) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!surface) return;
    placeWordmark(surface);
    if (scrollTop) { try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {} }
    setOverlayIn(true);
    // The first run on a phone was chunky until every card had buffered. So: wait for all 78
    // images to load (capped at ten seconds, in case one never does) before the seek begins.
    setMapReady(false);
    const imgs = [...surface.querySelectorAll('[data-position] img')];
    await Promise.race([
      Promise.all(imgs.map(im => (im.complete && im.naturalWidth > 0) ? Promise.resolve() : new Promise(res => { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); }))),
      new Promise(res => setTimeout(res, 10000))
    ]);
    setMapReady(true);
    await new Promise(r => setTimeout(r, 350));
    try {
      await runLanding({
        surface, cameraRef,
        draws: { [draw.position]: { transient: draw.transient, status: draw.status } },
        table: {}, slotsSelector, signal, flyWordmark: false
      });
    } catch { /* skipped */ }
    // the clones stay parked in the header while the page comes back; begin() clears them
  };
  // (tap-to-skip removed at the founder's word; the signal stays so a future control can use it)
  const [turns, setTurns] = useState([]); // {id, role:'reader'|'you'|'catchup', text, question, chips, reflect, forge, draw, mode, ts}
  const [input, setInput] = useState('');
  const [fieldMode, setFieldMode] = useState(null); // null | 'reflect' | 'forge'
  const [hasHistory, setHasHistory] = useState(false);
  const [door, setDoor] = useState(null);            // the chosen house door, or null
  // A question suggested from this account's own readings — ON DEMAND. The founder, 2026-09-15:
  // "I've had the same one show up every time ... I want to proactively press that button." So
  // nothing is generated on load; a tap asks for one, and "try another" asks for a different one,
  // with everything already suggested handed to the model to avoid.
  const [suggested, setSuggested] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(true); // the suggestion card can fold away and come back without a new ask
  const suggestedSeen = useRef([]);
  const suggestFromHistory = async () => {
    if (!user || suggesting) return;
    setSuggesting(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;
      const cr = await fetch('/api/user/context?draws=[]', { headers: { Authorization: `Bearer ${token}` } });
      const cj = await cr.json();
      if (!cj?.contextBlock) return;
      const avoid = suggestedSeen.current.length
        ? `

Already suggested this session — pick a DIFFERENT thread, not a rewording of these:
${suggestedSeen.current.map(q => `- ${q}`).join('\n')}`
        : '';
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${cj.contextBlock}

From this person's readings, write ONE short question they might want to take up today — a live thread, in their own voice, under 12 words. Name the actual subject if the history names one. Vary the angle: the whole history is fair game, not only the latest reading.${avoid}

Respond with ONLY JSON: {"q": "..."}` }],
          system: 'You write one short question and nothing else. JSON only.',
          model: MODEL_IDS.haiku, max_tokens: 120, userId: user.id
        })
      });
      const rj = await res.json();
      const q = parseJson(rj?.reading)?.q;
      const clean = (q && typeof q === 'string' && q.trim().length > 3) ? q.trim() : '';
      if (clean) { suggestedSeen.current.push(clean); setSuggested(clean); setSuggestOpen(true); }
    } catch {} finally { setSuggesting(false); }
  };
  const [selectedInfo, setSelectedInfo] = useState(null); // the main reader's detail modal, reused
  const [infoHistory, setInfoHistory] = useState([]);
  const [pastReadings, setPastReadings] = useState([]);   // this account's EZ readings, for live reload
  const [showPast, setShowPast] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false); // the five doors fold away under a toggle (founder, 2026-09-16)
  // ASK on an empty box does not error and does not draw: the button becomes an offer, and a
  // second tap draws for whatever is here (Keel's spec, section 1: wordlessness made a
  // dignified option, taught rather than sprung)
  const [wordless, setWordless] = useState(false);
  const questionRef = useRef(null);
  const contextRef = useRef(null);
  const [biggerOpen, setBiggerOpen] = useState(false); // the three deep starters, one tap further in
  // THE BOX IS THE ANCHOR. The frame used to be centred as a whole, so unfolding the areas grew it
  // and the box slid up. Now only the box-and-row part is measured, and the top padding is set so
  // THAT sits where the centred frame sat; whatever unfolds is added beneath it and the box stays.
  // The scrollbar's gutter is reserved all the time on this page, so the frame does not shift
  // left by half a scrollbar when the areas unfold and the page grows tall enough to scroll.
  useEffect(() => {
    const el = document.documentElement; const prev = el.style.scrollbarGutter;
    el.style.scrollbarGutter = 'stable';
    return () => { el.style.scrollbarGutter = prev; };
  }, []);
  const anchorRef = useRef(null);
  const [anchorPad, setAnchorPad] = useState(null);
  useEffect(() => {
    const el = anchorRef.current; if (!el) return;
    const fit = () => setAnchorPad(Math.max(16, Math.round((window.innerHeight * 0.62 - el.offsetHeight) / 2)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [draws, door, allowed]);
  const [explain, setExplain] = useState(null);           // 'reflect' | 'forge' | null
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const userContextRef = useRef(''); // history: the journey block the full reader injects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  // THE COST LEDGER (.447): one row per API call — purpose, fresh / cache-written / cache-read /
  // out, cents, cold or warm. Visible to admins and on the bench. The purpose is read off the
  // message itself so no caller has to be touched.
  const [ledger, setLedger] = useState([]);
  const [usd, setUsd] = useState(0); // running cost priced per call by the model that answered (.473)
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const purposeOf = (m) => {
    if (/YOUR LAST RENDER WAS \d+ WORDS/.test(m)) { const g = m.match(/Write the (\w+) floor/); return `${g ? 'the ' + g[1] : 'why (ring 1)'} (rewrite)`; }
    if (/NOT VALID JSON/.test(m)) return 'retry';
    if (/Write ring 1\. JSON only\./.test(m)) return 'why (ring 1)';
    const f = m.match(/Write the (meaning|moon|mechanism) floor\. JSON only\./); if (f) return `the ${f[1]}`;
    if (m.includes('FACE THE DRAGON.')) return 'face the dragon';
    if (m.includes('ONE SMALL REAL ACT')) return 'one small step';
    if (m.includes('OTHER OPTIONS. Do NOT write a new turn')) return 'other options';
    if (m.includes('WRITE THIS UP AND CLOSE')) return 'pull it together';
    if (m.includes('SAY IT SIMPLER')) return 'say it simpler';
    if (m.includes('WHERE AM I')) return 'where am I';
    if (m.includes('FIND IT. The person tapped')) return 'find it';
    if (m.includes('THE DISCOURSE SO FAR')) return 'turn';
    return 'opening';
  };
  // priced off lib/modelConfig (Sonnet, 1-hour cache: writes are 2x input, reads 0.1x)
  const centsOf = (u) => ((u.input_tokens || 0) * MODEL_PRICING.sonnet.input
    + (u.cache_read_input_tokens || 0) * MODEL_PRICING.sonnet.input * CACHE_READ
    + (u.cache_creation_input_tokens || 0) * MODEL_PRICING.sonnet.input * CACHE_WRITE_1H
    + (u.output_tokens || 0) * MODEL_PRICING.sonnet.output) / 1e4;
  const endRef = useRef(null);
  const saveTimer = useRef(null);

  // Gate: signed in AND (admin OR ez_enabled flag). Then load the history block.
  // Runs on mount and again the moment someone signs in, so the door opens in place.
  const checkGate = useCallback(async () => {
      try {
        const { user: u } = await getUser();
        setUser(u || null);
        let flag = false;
        try { const r = await fetch('/api/feature-flags'); const j = await r.json(); flag = !!j?.flags?.ez_enabled; } catch {}
        setAllowed(!!u && (isAdmin(u) || flag));
        if (u) {
          setHasHistory(true);
          // (the history question is no longer generated on load — see suggestFromHistory)
        }
      } catch { setAllowed(false); }
  }, []);

  useEffect(() => { rememberAuthReturn('/ez'); checkGate(); }, [checkGate]);

  // Persist the discourse with the reading (debounced), same table as every other reading.
  useEffect(() => {
    if (!savedId || turns.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns } }, usage }).catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [turns, savedId, usage]);

  const systemPrompt = `${BASE_SYSTEM}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${EZ_RULES}${VOICES[voice]?.rules ? `\n\n${VOICES[voice].rules}` : ''}`;

  const discourseText = useCallback((list) => list.map((t) => {
    if (t.role === 'you') {
      const verb = t.mode === 'reflect' ? 'ASKER REFLECTS (puts a question to the field)'
        : t.mode === 'forge' ? 'ASKER FORGES (declares)' : t.act ? 'ASKER (asks for one small thing to do)' : 'ASKER';
      return `${verb}: "${t.text}"`;
    }
    if (t.role === 'catchup') return '[catch-up card shown]';
    return `READER${t.draw ? ` (on the newly drawn ${drawLabel(t.draw)})` : t.act ? ' (one small act, then quiet)' : ''}: ${t.text}`;
  }), []);

  // Every turn used to be re-sent in full on every call, so a long session paid more and more
  // for its own history. Keep the newest within a budget and say how much was dropped.
  const discourseBlock = useCallback((list) => {
    let lines = discourseText(list);
    const CAP = 12000;
    let dropped = 0;
    while (lines.length > 1 && lines.join('\n\n').length > CAP) { lines = lines.slice(1); dropped += 1; }
    const note = dropped ? `\n\n(${dropped} earlier turn${dropped > 1 ? 's' : ''} omitted for length; the reading and its cards are unchanged.)` : '';
    return lines.join('\n\n') + note;
  }, [discourseText]);

  const rawCall = async (userMessage, system = systemPrompt, maxTokens = 1500) => { // 1100→1500 (.469): a 340-word opening plus its envelope on Sonnet 5's tokenizer sits right at 1100
    const t0 = Date.now();
    if (bench) { await new Promise((r) => setTimeout(r, 600)); return { reading: JSON.stringify(benchReply(userMessage)), usage: null }; }
    const res = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system, model: MODEL_IDS.sonnet, max_tokens: maxTokens, userId: user?.id })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.usage) setLedger((L) => [...L, {
      t: Date.now(), purpose: purposeOf(userMessage), ms: Date.now() - t0,
      fresh: data.usage.input_tokens || 0, written: data.usage.cache_creation_input_tokens || 0,
      read: data.usage.cache_read_input_tokens || 0, out: data.usage.output_tokens || 0,
      cents: usdFor(data.usage, data.model) * 100, model: data.model || '', provider: data.provider || '',
    }]);
    if (data.usage) setUsd((u) => u + usdFor(data.usage, data.model)); // priced by the model that ANSWERED (.473)
    if (data.usage) setUsage((u) => ({
      input_tokens: (u.input_tokens || 0) + (data.usage.input_tokens || 0),
      output_tokens: (u.output_tokens || 0) + (data.usage.output_tokens || 0),
      cache_read_input_tokens: (u.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0),
      cache_creation_input_tokens: (u.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0)
    }));
    return data;
  };

  // One strict retry before giving up. A dropped brace used to cost the person their turn and
  // the tokens both; now it costs one cheap re-ask.
  const callReader = async (userMessage, system = systemPrompt, maxTokens = 1500) => { // 1100→1500 (.469): a 340-word opening plus its envelope on Sonnet 5's tokenizer sits right at 1100
    let data = await rawCall(userMessage, system, maxTokens);
    let obj = parseJson(data.reading);
    if (!obj || !obj.reader) {
      data = await rawCall(
        `${userMessage}\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.`,
        system, maxTokens
      );
      obj = parseJson(data.reading);
    }
    if (!obj || !obj.reader) throw new Error('The Reader answered in a shape I could not read, twice. Nothing was lost — try that again.');
    return { obj, usage: data.usage };
  };

  // The question is shown after the medicine; a prose that ends by asking it too shows it
  // twice. The rule says not to, the model sometimes does anyway, so the repeat is stripped.
  const stripTrailingQuestion = (text, q) => {
    if (!text || !q) return text || '';
    const norm = (x) => x.replace(/[\s*_"'‘’“”.?!]+/g, '').toLowerCase();
    const paras = text.trim().split(/\n\n+/);
    const last = paras[paras.length - 1] || '';
    if (paras.length > 1 && norm(last) === norm(q)) return paras.slice(0, -1).join('\n\n');
    return text;
  };
  const readerTurn = (obj, extra = {}) => ({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    role: 'reader',
    text: stripTrailingQuestion(obj.reader, obj.question),
    question: obj.question || '',
    chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 7) : [], // answer, build, pushback, clarify, stair, and up to two locate chips (a cap of 5 was silently dropping Find it)
    reflect: Array.isArray(obj.reflect) ? obj.reflect.slice(0, 4) : [],
    forge: Array.isArray(obj.forge) ? obj.forge.slice(0, 4) : [],
    medicine: typeof obj.medicine === 'string' ? obj.medicine.trim() : '',
    located: typeof obj.located === 'string' ? obj.located.trim() : '',
    suggest: (obj.suggest && typeof obj.suggest === 'object' && obj.suggest.text) ? obj.suggest : null,
    closing: obj.closing === true,
    actLine: typeof obj.act === 'string' ? obj.act.trim() : '',
    ts: Date.now(),
    ...extra
  });

  // The journey block: recent readings, narrative summaries, and any personalization facts
  // the account has switched on. The route authenticates by Bearer token — a userId query
  // param silently returns an empty block, which is how EZ shipped without history yesterday.
  const loadHistory = async (drawsToUse) => {
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return '';
      const params = new URLSearchParams({ draws: JSON.stringify(drawsToUse || []) });
      const res = await fetch(`/api/user/context?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data?.contextBlock || '';
    } catch { return ''; }
  };

  const openInfo = (info) => {
    setInfoHistory((h) => (selectedInfo ? [...h, selectedInfo] : h));
    setSelectedInfo(info);
  };
  const goBackInfo = () => {
    setInfoHistory((h) => {
      if (!h.length) { setSelectedInfo(null); return h; }
      setSelectedInfo(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  // EZ readings save into the same table as every other reading, so reload is a filtered
  // query and four pieces of state — no separate save/load path was ever built.
  const loadPastList = async () => {
    try {
      const { data } = await getReadings(50);
      setPastReadings((data || []).filter((r) => r.mode === 'ez'));
      setShowPast(true);
    } catch { setError('Could not load your readings.'); }
  };

  // /ez?bench=1 — THE LAYOUT BENCH: a fixed draw and a canned conversation, no API, nothing saved
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let on = false;
    try { on = new URLSearchParams(window.location.search).get('bench') === '1'; } catch {}
    if (!on) return;
    setBench(true);
    setDraws([BENCH_DRAW]); setQuestion(BENCH_QUESTION); setAsked(BENCH_QUESTION); setSavedId(null);
    const now = Date.now();
    const opening = readerTurn(BENCH_OPENING);
    setTurns([
      { ...opening, id: 'b1', ts: now },
      { id: 'b2', role: 'you', text: 'Help me find which thing this actually is.', mode: null, ts: now + 1 },
      { ...readerTurn(BENCH_FUNNEL), id: 'b3', locating: { what: 'the thing that is already done', step: 1 }, ts: now + 2 },
      { id: 'b4', role: 'you', text: "Honestly, the role. I keep showing up out of habit.", mode: null, ts: now + 3 },
      { ...readerTurn({ ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' }), id: 'b5', locating: { what: 'the thing that is already done', step: 2 }, ts: now + 4 },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);

  // /ez?load=<id> — arriving from the journal or the main reader's redirect
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let id = null;
    try { id = new URLSearchParams(window.location.search).get('load'); } catch {}
    if (id) { openPast(id); try { window.history.replaceState(null, '', '/ez'); } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);
  const openPast = async (id) => {
    setLoading(true); setError('');
    try {
      const { data } = await getReading(id);
      const saved = data?.interpretation?.synthesis?._ez || data?.synthesis?._ez;
      const savedDraws = Array.isArray(data?.draws) ? data.draws : null;
      if (!saved?.turns?.length || !savedDraws) throw new Error('That reading has no conversation saved.');
      setQuestion(data.topic || data.question || '');
      setDraws(savedDraws.map((d) => ({ position: d.position, transient: d.transient, status: d.status })));
      setTurns(saved.turns);
      setSavedId(data.id);
      setShowPast(false); setDoor(null); setFieldMode(null);
      userContextRef.current = await loadHistory(savedDraws);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const scrollToEnd = () => requestAnimationFrame(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80));

  const spreadKeyFor = (n) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : 'five');

  // ---- the opening turn ----
  const begin = async () => {
    // A door with no added context is a complete question on its own — tap-and-draw must always
    // work. Added context, when there is any, IS the question; the door only frames it.
    const typed = sanitizeForAPI(question.trim());
    const q = typed || (door ? sanitizeForAPI(door.breath) : '');
    if (!q) { if (!wordless) { setWordless(true); return; } setWordless(false); }
    setAsked(q);
    setError(''); setLoading(true); setTurns([]); setSavedId(null); setFieldMode(null);
    const newDraws = generateSpread(cardCount);
    setDraws(newDraws);
    // one card only, for now; the answer never waits on the motion by more than the last flight
    const willAnimate = animOn && cardCount === 1;
    let landed = Promise.resolve();
    if (willAnimate) {
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
      // the map starts just under the tagline ("THE SOUL SEARCH ENGINE"), not over it
      const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
      setOverlayTop(brand ? Math.max(0, Math.round(brand.getBoundingClientRect().bottom + 6)) : 0);
      readyRef.current = false; setReplyReady(false);
      setOverlayIn(false); setRevealed(false); setAnimating(true);
      landed = playLanding(newDraws[0]).catch(() => {});
      landed.then(() => { if (!readyRef.current) setLandedWaiting(true); });
    }
    try {
      const sk = spreadKeyFor(cardCount);
      const drawText = fmtDraw(newDraws, 'discover', sk, false, null, null, null);
      const history = await loadHistory(newDraws);
      userContextRef.current = history;
      const ctx = history ? `${history}\n\n` : '';
      const doorBlock = door
        ? `\n\nTHE DOOR THEY CAME THROUGH: ${door.label} — "${door.breath}" (the ${door.house} house)${door.viaDaily ? ' — CHOSEN FOR THEM AT RANDOM as a daily reading; they brought no question of their own.' : ''}. This is where they located themselves before any card was drawn. Let it frame what you attend to; it is not a verdict, and the cards still say what they say.`
        : '';
      let tele = '';
      try { tele = buildReadingTeleologicalPrompt(newDraws); } catch {}
      const msg = `${ctx}QUESTION: "${q}"${doorBlock}\n\nTHE DRAW:\n${drawText}${tele ? `\n\n${tele}` : ''}\n\nThis is THE OPENING TURN. Follow EZ MODE exactly. JSON only.`;
      const { obj, usage: u } = await callReader(msg);
      const first = readerTurn(obj);
      setTurns([first]);
      readyRef.current = true; setReplyReady(true); setLandedWaiting(false);
      try {
        const { data } = await saveReading({
          question: q, cards: newDraws, letter: null,
          synthesis: { _ez: { version: EZ_VERSION, turns: [first], voice } },
          mode: 'ez', spreadType: door ? `ez-${sk}-${door.id}` : `ez-${sk}`, model: 'sonnet', tokenUsage: u, voice: 'friend'
        });
        if (data?.id) setSavedId(data.id);
      } catch {}
      if (!willAnimate) scrollToEnd();
    } catch (e) { setError(e.message); readyRef.current = true; setReplyReady(true); setLandedWaiting(false); }
    await landed;
    setLandedWaiting(false);
    if (willAnimate) {
      // the page comes back under the landed cards: header and discourse fade in, the map fades
      // out, and only then do the clones go — the real header sits exactly beneath them
      setRevealed(true);
      setOverlayIn(false);
      await new Promise(r => setTimeout(r, 700));
      clearLanding(document);
      setAnimating(false);
    } else {
      setRevealed(true);
    }
    setLoading(false);
  };

  // ---- every later turn; mode null = talk, 'reflect'/'forge' = a card is drawn ----
  const send = async (textIn, modeIn, opts) => {
    const mode = modeIn !== undefined ? modeIn : fieldMode;
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    // FIND IT: a tapped locate chip opens the funnel; a plain talking turn while it is open
    // continues it (up to three rounds, or until the Reader reports the thing located).
    let loc = null;
    const claimed = !!opts?.claim; // they are naming it themselves, or calling it close enough
    if (opts?.locate) loc = { what: opts.locate, step: 1 };
    else if (!mode) {
      const lr = [...turns].reverse().find((t) => t.role === 'reader');
      if (lr?.locating && !lr.located && (claimed || lr.locating.step < (lr.locating.balanced ? 2 : 3))) loc = { what: lr.locating.what, step: lr.locating.step + 1 };
    }
    setError(''); setLoading(true); setInput('');
    const newDraw = mode ? generateSpread(1)[0] : null;
    const you = { id: `y${Date.now()}`, role: 'you', text, mode: mode || null, ts: Date.now() };
    const withYou = [...turns, you];
    setFieldMode(null);
    // any new turn folds the panels (founder, 2026-09-17: "I'd rather have it minimized"); their answers
    // are kept for the same card, so reopening is free
    setBrazierOpen(false); setStepOpen(false); setDragonOpen(false);
    // THE NEW CARD LANDS IN ITS OWN TURN (founder, 2026-09-16, an experiment): a reflect or
    // forge draws its card at once, a pending reader turn holding only the stacked card is
    // added, the page is scrolled so that card sits just under the brand — where the header
    // sits for the opening — and the same landing flies the card into it while the reply is
    // fetched. The words arrive underneath when the Reader answers.
    const willAnimate = !!newDraw && animOn;
    const pid = `t${Date.now()}p`;
    const repliedRef = { current: false };
    let landed = Promise.resolve();
    if (willAnimate) {
      setAnimPending(true);
      setTurns([...withYou, { id: pid, role: 'reader', pending: true, draw: newDraw, mode, text: '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
        const top = Math.max(16, brand ? brand.getBoundingClientRect().bottom + 6 : 0);
        const el = document.querySelector(`[data-ez-turn="${pid}"]`);
        if (el) window.scrollBy({ top: el.getBoundingClientRect().top - top - 8, behavior: 'instant' });
        setOverlayTop(Math.max(0, Math.round(top)));
      } catch {}
      // the page beneath fades away for the flight, as it does for the opening (the founder
      // saw the conversation and the buttons showing through the map)
      setRevealed(false);
      setOverlayIn(false); setAnimating(true);
      landed = playLanding(newDraw, `[data-ez-turn="${pid}"]`, false);
      landed.then(() => { if (!repliedRef.current) setLandedWaiting(true); });
    } else {
      setTurns(withYou);
      scrollToEnd();
    }
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null, false); // names only here; the card in play carries its record below
      const ctx = userContextRef.current ? `${userContextRef.current}\n\n` : '';
      const fieldNow = [...withYou].reverse().find((t) => t.role === 'reader' && t.draw)?.draw || null;
      const newCardBlock = newDraw
        ? `\n\nA NEW CARD WAS DRAWN IN RESPONSE:\n${drawBrief(newDraw)}\n${(() => { try { return buildReadingTeleologicalPrompt([newDraw]); } catch { return ''; } })()}\nInterpret it as the field's answer to what they just ${mode === 'reflect' ? 'asked' : 'declared'}, in relation to the reading already on the table. THIS CARD'S MEDICINE LEADS NOW. The opening draw's medicine is at most secondary from here; do not call it the way through. Fill "medicine" from THIS card's Rebalancer and mechanism, and administer it — its card's own meaning must be in your words.`
        : `\n\nTHE CARD IN PLAY (its medicine governs this turn):\n${drawBrief(fieldNow || draws[0])}`;
      if (loc) loc.balanced = (fieldNow || draws[0])?.status === 1; // Balanced → the invitation only needs an address
      const findBlock = loc ? `${locateBlock(loc, drawBrief(fieldNow || draws[0]))}${claimed ? '\n\nTHEIR LATEST TURN IS THEM NAMING IT THEMSELVES. The search ends here on their word. Take it as the thing, confirm it against the card in one line, fill "located" with it in their words, and land the medicine on it — a specific, ordinary first move. Do not ask for more detail and do not tell them it is not specific enough.' : ''}` : '';
      const msg = `${ctx}QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(withYou)}${newCardBlock}${findBlock}${brazierBlock()}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      const { obj } = await callReader(msg);
      repliedRef.current = true; setLandedWaiting(false);
      const turn = readerTurn(obj, { ...(newDraw ? { draw: newDraw, mode } : {}), ...(loc ? { locating: loc } : {}) });
      if (willAnimate) {
        // the words arrive under the landed card; the same id keeps the card's element in place
        await landed;
        setTurns((list) => list.map((x) => (x.id === pid ? { ...turn, id: pid } : x)));
        setRevealed(true);
        setOverlayIn(false);
        await new Promise(r => setTimeout(r, 700));
        clearLanding(document);
        setAnimating(false); setAnimPending(false);
      } else {
        setTurns((list) => [...list, turn]);
        scrollToEnd();
      }
    } catch (e) {
      // Take the orphaned turn back out and hand the person their words again, so a failure
      // costs a tap instead of a thought.
      repliedRef.current = true; setLandedWaiting(false); setAnimPending(false);
      if (willAnimate) { if (skipRef.current) skipRef.current.skip = true; setRevealed(true); setOverlayIn(false); clearLanding(document); setAnimating(false); }
      setTurns((list) => list.filter((x) => x.id !== you.id && x.id !== pid));
      setInput(text);
      setFieldMode(mode || null);
      setError(e.message);
    }
    setLoading(false);
  };

  // ---- the do-something button: one small real act, no draw, no question ----
  const fieldCard = () => [...turns].reverse().find((t) => t.role === 'reader' && t.draw)?.draw || draws?.[0] || null;
  const actLineNow = () => { const t = [...turns].reverse().find((x) => x.role === 'reader' && x.actLine); return t?.actLine || ''; };
  // ONE SMALL STEP — a panel like the Brazier (founder, 2026-09-16 night): collapsed by default,
  // opening it fetches ONE act for the card in play and shows it inside; nothing enters the
  // transcript. The Reader is told what was handed over (see brazierBlock) so the pills know.
  const [stepOpen, setStepOpen] = useState(false);
  const [panelFirst, setPanelFirst] = useState('brazier'); // the opened panel takes the first full row; the other drops beneath
  const [stepText, setStepText] = useState('');
  const [stepBusy, setStepBusy] = useState(false);
  const stepKeyRef = useRef('');
  const fetchStep = async () => {
    const card = fieldCard(); if (!card || stepBusy) return;
    const k = buildKernel(card, DEFS);
    const line = actLineNow() || `What is one small real thing I can do about this in the next minute?`;
    setStepBusy(true); setError('');
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks for one small thing to do): "${line}"`;
      let tele = ''; try { tele = buildReadingTeleologicalPrompt([card]); } catch {}
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE CARD IN PLAY:\n${drawBrief(card)}${tele ? `\n\n${tele}` : ''}${doSomethingBlock(k)}`;
      const { obj } = await callReader(msg, systemPrompt, 500);
      setStepText(String(obj.reader || '').trim());
      // no pill regen here (.446): the next real turn already receives the step via brazierBlock; the regen was a second full call per door
      stepKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setStepBusy(false);
  };
  const toggleStep = () => {
    const next = !stepOpen;
    setStepOpen(next);
    if (next) {
      showPanels('step');
      if (!brazierOpen) setPanelFirst('step');
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== stepKeyRef.current || !stepText) { setStepText(''); fetchStep(); }
    }
  };

  // ---- FACE THE DRAGON: the fierce door, beside the step ----
  const [dragonOpen, setDragonOpen] = useState(false);
  const [dragonText, setDragonText] = useState('');
  const [dragonBusy, setDragonBusy] = useState(false);
  const dragonKeyRef = useRef('');
  const fetchDragon = async () => {
    const card = fieldCard(); if (!card || dragonBusy) return;
    const k = buildKernel(card, DEFS);
    setDragonBusy(true); setError('');
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks to face the dragon — the thing itself, said straight): "What is the thing I've been walking around, or the thing in front of me I haven't picked up?"`;
      let tele = ''; try { tele = buildReadingTeleologicalPrompt([card]); } catch {}
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE CARD IN PLAY:\n${drawBrief(card)}${tele ? `\n\n${tele}` : ''}${dragonBlock(k)}`;
      // the eight exemplars ride in the SYSTEM prompt so they are cached (.448: the ledger showed the
      // dragon's message at 4,040 fresh tokens, double any floor, because they rode in the message)
      const { obj } = await callReader(msg, `${systemPrompt}

${DRAGON_STANDARD}`, 600);
      setDragonText(String(obj.reader || '').trim());
      // no pill regen here (.446): the next real turn already receives the dragon via brazierBlock
      dragonKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setDragonBusy(false);
  };
  const toggleDragon = () => {
    const next = !dragonOpen;
    setDragonOpen(next);
    if (next) {
      showPanels('dragon');
      if (!brazierOpen && !stepOpen) setPanelFirst('dragon');
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== dragonKeyRef.current || !dragonText) { setDragonText(''); fetchDragon(); }
    }
  };

  // ---- THE BRAZIER: "why is this happening?" — beside the conversation, not in it ----
  const [brazierOpen, setBrazierOpen] = useState(false);
  const [brazier, setBrazier] = useState({});          // { [ring]: text }
  // WHAT THEY HAVE READ ABOUT WHY — handed to the Reader as background (founder, 2026-09-16
  // night), so the next turn and its pills build on where the person's understanding actually
  // is instead of repeating the tense line back to them. Background, never subject; never quoted.
  const brazierBlock = (over = {}) => {
    const rings = over.rings || brazier;
    const st = over.step !== undefined ? over.step : stepText;
    const dr = over.dragon !== undefined ? over.dragon : dragonText;
    const read = [1, 'meaning', 'moon', 'mechanism'].filter((r) => rings[r]);
    const step = (st ? `\n\nTHE ONE SMALL STEP THEY WERE HANDED (they opened "one small step"; background — do not repeat it, do not turn it into homework, build on it only if they bring it up):\n${st}` : '')
      + (dr ? `\n\nTHE DRAGON THEY ASKED TO FACE (they tapped "face the dragon" and read this; it is part of the conversation now — you may build on it and refer to it; never repeat it, never soften it back, never pile on):\n${dr}` : '');
    if (!read.length) return step;
    // Opened floors ENTER THE CONVERSATION (founder's ruling 2026-09-19: "it's an ongoing
    // conversation") — the Reader may build on them and refer to them; it just never repeats them.
    return `${step}\n\nWHAT THEY HAVE READ IN "WORDS TO THE WHYS" (they opened these; they are part of the conversation now, so build on them and refer to what they say where it helps — but never repeat them back, and never make the tense line the topic):\n${read.map((r) => `${r === 1 ? 'WHY THIS IS HAPPENING' : String(r).toUpperCase()}:\n${rings[r]}`).join('\n\n')}`;
  };
  const [floorsOpened, setFloorsOpened] = useState([]); // which lanterns they have opened, in order
  const [brazierBusy, setBrazierBusy] = useState(0);   // the ring being fetched, or 0
  const [brazierGlow, setBrazierGlow] = useState(false);
  const brazierKeyRef = useRef('');
  // ONE FETCH FOR RING 1 AND THE THREE FLOORS. Ring 1 is keyed to the card (why this is
  // happening); a floor deepens the latest TURN, so it is handed the Reader's newest words and
  // never changes the subject. Each floor stands alone (the founder's bypass ruling: the moon
  // cannot assume the meaning was read), so only ring 1 is passed as already-seen.
  const fetchFloor = async (floor) => {
    const card = fieldCard(); if (!card || brazierBusy) return;
    const key = `${card.transient}:${card.position}:${card.status}`;
    if (brazierKeyRef.current !== key) { brazierKeyRef.current = key; setBrazier({}); setFloorsOpened([]); }
    setBrazierBusy(floor); setError('');
    try {
      const k = buildKernel(card, DEFS);
      // the Brazier is the Why derivation in kitchen clothes (Keel's spec §1.2): it gets the kernel,
      // the whole record, and the same teleology block the advanced Why works from
      let tele = ''; try { tele = buildReadingTeleologicalPrompt([card]); } catch {}
      const lastTurn = [...turns].reverse().find((t) => t.role === 'reader');
      const turnBlock = (floor !== 1 && lastTurn?.text) ? `\n\nTHE TURN TO DEEPEN (the Reader's latest words to them — deepen THIS, never change the subject):\n${lastTurn.text}${lastTurn.medicine ? `\n\n${lastTurn.medicine}` : ''}` : '';
      const ring1 = (floor !== 1 && brazier[1]) ? `\n\nWHY THIS IS HAPPENING, already shown to them (do not repeat it):\n${brazier[1]}` : '';
      const ask = floor === 1 ? 'Write ring 1. JSON only.' : `Write the ${floor} floor. JSON only.`;
      const msg = `THE PERSON'S QUESTION: "${sanitizeForAPI(asked || question)}"\n\n${kernelBlock(k)}\n\n${drawRecord(card, DEFS)}${tele ? `\n\n${tele}` : ''}${turnBlock}${ring1}\n\n${ask}`;
      let data = await rawCall(msg, brazierSystem(floor), floor === 1 ? 500 : 1000); // floors 800→1000 with the band (.469)
      let obj = parseJson(data.reading);
      if (!obj?.text) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, brazierSystem(floor), 800); obj = parseJson(data.reading); }
      if (!obj?.text) throw new Error('The brazier went out — try again.');
      // the word limits are hard (ring 1 is 90–135 per Keel's spec; the floors 170 / 170 / 240)
      // .448: a 15% overrun is accepted — the ledger showed the moon and the mechanism each
      // paying for a whole second call to trim ~40 words, and the mechanism's rewrite still ran
      // long. The mechanism (three paragraphs of derivation) gets a cap it can actually meet.
      const LIMIT = { 1: 135, meaning: 250, moon: 250, mechanism: 300 }[floor]; // meaning/moon 170→250 (.469)
      const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
      if (words(obj.text) > LIMIT * 1.15) {
        data = await rawCall(`${msg}\n\nYOUR LAST RENDER WAS ${words(obj.text)} WORDS; THE HARD LIMIT IS ${LIMIT}. Rewrite it under the limit, same facts, same mechanism:\n${obj.text}`, brazierSystem(floor), 800);
        const again = parseJson(data.reading);
        if (again?.text && words(again.text) <= words(obj.text)) obj = again;
      }
      const next = { ...brazier, [floor]: obj.text.trim() };
      setBrazier(next);
      if (floor !== 1) setFloorsOpened((f) => (f.includes(floor) ? f : [...f, floor]));
      // no pill regen here (.446): the next real turn already receives every opened floor via brazierBlock
    } catch (e) { setError(e.message); }
    setBrazierBusy(0);
  };
  const fetchRing = (r) => fetchFloor(r);
  // A NEW CARD IN PLAY (a reflect or a forge) RESETS BOTH PANELS: their answers belonged to the old
  // card (founder, 2026-09-17: they stayed open and stale until closed and reopened).
  const fieldKey = (() => { const c = [...turns].reverse().find((t) => t.role === 'reader' && t.draw)?.draw || draws?.[0]; return c ? `${c.transient}:${c.position}:${c.status}` : ''; })();
  const fieldKeyRef = useRef(fieldKey);
  useEffect(() => {
    if (fieldKeyRef.current === fieldKey) return;
    fieldKeyRef.current = fieldKey;
    setBrazierOpen(false); setBrazier({}); setFloorsOpened([]); brazierKeyRef.current = '';
    setStepOpen(false); setStepText(''); stepKeyRef.current = '';
    setDragonOpen(false); setDragonText(''); dragonKeyRef.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);
  // THE FLOORS DEEPEN THE LATEST TURN (Keel's requirements §1): when a new Reader turn lands, the
  // opened floors belonged to the old one and are cleared; ring 1 (why this is happening) stays,
  // since it is about the card and the card has not changed.
  const lastReaderId = [...turns].reverse().find((t) => t.role === 'reader')?.id || '';
  const floorKeyRef = useRef(lastReaderId);
  useEffect(() => {
    if (floorKeyRef.current === lastReaderId) return;
    floorKeyRef.current = lastReaderId;
    setBrazier((b) => (b[1] ? { 1: b[1] } : {}));
    setFloorsOpened([]);
  }, [lastReaderId]);
  const toggleBrazier = () => {
    const next = !brazierOpen;
    setBrazierOpen(next);
    if (next) {
      showPanels('brazier');
      if (!stepOpen) setPanelFirst('brazier');
      setBrazierGlow(true); setTimeout(() => setBrazierGlow(false), 900);
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== brazierKeyRef.current || !brazier[1]) fetchRing(1);
    }
  };

  // ---- other options: fresh pills for the latest turn ----
  // The founder, 2026-09-15: the build / push back / clarify pills (and the reflects and
  // forges) should be regenerable. One call rewrites all three sets for the last reader turn,
  // told what it already offered so it takes a different angle; the turn's text is untouched.
  const [claiming, setClaiming] = useState(false); // the person is naming the thing themselves
  const [regenning, setRegenning] = useState(false);
  const regenPills = async (over = {}) => {
    if (loading || regenning || !lastReader || !draws) return;
    setRegenning(true); setError('');
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const prior = lastReader.pillsSeen || { chips: lastReader.chips || [], reflect: lastReader.reflect || [], forge: lastReader.forge || [] };
      const seen = [...prior.chips.map((c) => c.text), ...prior.reflect, ...prior.forge].filter(Boolean);
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(turns)}\n\n${brazierBlock(over)}\n\nOTHER OPTIONS. Do NOT write a new turn. For the reader's LATEST turn above, write a fresh set of chips (build, pushback, clarify, a stair if one is obvious, and a locate chip for anything the turn left unnamed — FIND IT), four reflects and four forges — the same rules as EZ MODE, from this exact moment. Take a DIFFERENT angle from these, which the person has already been offered and does not want:\n${seen.map((t) => `- ${t}`).join('\n')}\n\nRespond with ONLY JSON: {"reader": "", "question": "", "chips": [...], "reflect": [...], "forge": [...]}`;
      // callReader insists on a non-empty "reader"; this call has none, so it goes raw, with one retry
      let data = await rawCall(msg, systemPrompt, 900);
      let obj = parseJson(data.reading);
      if (!obj || !Array.isArray(obj.chips)) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, systemPrompt, 900); obj = parseJson(data.reading); }
      if (!obj || !Array.isArray(obj.chips)) throw new Error('Could not read the new options — try again.');
      const fresh = readerTurn({ ...obj, reader: obj.reader || ' ' });
      setTurns((list) => list.map((t) => (t.id === lastReader.id
        ? { ...t, chips: fresh.chips.length ? fresh.chips : t.chips, reflect: fresh.reflect.length ? fresh.reflect : t.reflect, forge: fresh.forge.length ? fresh.forge : t.forge,
            pillsSeen: { chips: [...prior.chips, ...fresh.chips], reflect: [...prior.reflect, ...fresh.reflect], forge: [...prior.forge, ...fresh.forge] } }
        : t)));
    } catch (e) { setError(e.message); }
    setRegenning(false);
  };

  // ---- say that again, simpler ----
  const simplify = async (turnId) => {
    if (loading) return;
    const src = turns.find((t) => t.id === turnId);
    if (!src) return;
    setLoading(true); setError('');
    try {
      const msg = `THE TURN TO REWRITE:\n${src.text}\n\n${SIMPLER_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${SIMPLER_RULES}`, 700);
      setTurns((list) => list.map((t) => (t.id === turnId
        ? { ...t, text: obj.reader, question: obj.question || t.question, simplified: true }
        : t)));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ---- where am I ----
  const catchUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError('');
    try {
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' · ')}\n\nTHE DISCOURSE SO FAR:\n${discourseBlock(turns)}\n\n${CATCHUP_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CATCHUP_RULES}`, 400);
      setTurns((list) => [...list, { id: `c${Date.now()}`, role: 'catchup', text: obj.reader, question: obj.question || '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // SUMMARIZE AND CLOSE (founder, 2026-09-17, from his sister's read: the conversation never ends).
  // The whole reading written up as one piece to keep, then a clean stop: come back any time, or
  // start a new reading. Nothing is locked — the box stays live under it.
  const closeUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError(''); setFieldMode(null);
    setBrazierOpen(false); setStepOpen(false); setDragonOpen(false);
    try {
      const msg = `QUESTION: "${sanitizeForAPI(asked || question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' ' + '\u00b7' + ' ')}\n\nTHE DISCOURSE SO FAR:\n${discourseBlock(turns)}${brazierBlock()}\n\n${CLOSING_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CLOSING_RULES}`, 1000) // 700→1000 with the band (.469);
      setTurns((list) => [...list, { id: `w${Date.now()}`, role: 'wrap', text: obj.reader, question: '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // EXPORT — the reading and the whole conversation as one markdown file, the way the full
  // reader exports (founder, 2026-09-16: "shift the export feature over").
  const exportMarkdown = () => {
    if (!draws) return;
    const L = [];
    L.push(`# Nirmanakaya — EZ reading`, ``, `**Asked:** ${question || (door ? door.breath : '')}`, `**When:** ${new Date().toLocaleString()}`, `**Voice:** ${VOICES[voice]?.label || voice}`, ``);
    L.push(`## The draw`);
    draws.forEach((d) => {
      const m = medicineFor([d])[0];
      L.push(`- ${drawLabel(d)}${m ? ` — ${m.balanced ? 'grows toward' : 'corrected by'} ${m.to}${m.path ? ` (${m.path})` : ''}` : ''}`);
    });
    L.push(``, `## The conversation`, ``);
    turns.forEach((t) => {
      if (t.role === 'you') { L.push(`**You${t.mode === 'reflect' ? ' (reflecting)' : t.mode === 'forge' ? ' (forging)' : t.act ? ' (asking for one small thing)' : ''}:** ${t.text}`, ``); return; }
      if (t.role === 'catchup') { L.push(`*Where am I:*`, ``, t.text, ``); return; }
      if (t.role === 'wrap') { L.push(`## The reading, written up`, ``, t.text, ``); return; }
      if (t.draw) L.push(`*A new card: ${drawLabel(t.draw)}*`, ``);
      L.push(`**Reader:**`, ``, t.text, ``);
      if (t.located) L.push(`*Found: ${t.located}*`, ``);
      if (t.medicine) L.push(`> ◈ ${t.medicine}`, ``);
      if (t.question) L.push(`*${t.question}*`, ``);
    });
    // the doors they opened — Words to the Whys (ring 1 + any floors), the dragon, the step
    if (brazier[1] || dragonText || stepText) {
      L.push(`## The doors`, ``);
      if (brazier[1]) L.push(`**Words to the Whys — why this is happening:**`, ``, brazier[1], ``);
      floorsOpened.filter((f) => brazier[f]).forEach((f) => L.push(`**${FLOOR_LABEL[f]}:**`, ``, brazier[f], ``));
      if (dragonText) L.push(`**Face the dragon:**`, ``, dragonText, ``);
      if (stepText) L.push(`**One small step:**`, ``, stepText, ``);
    }
    L.push(`---`, `*nirmanakaya.com/ez*`);
    const md = L.join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nirmanakaya-ez-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const reset = () => {
    setDraws(null); setTurns([]); setSavedId(null); setFieldMode(null); setError(''); setDoor(null); setQuestion('');
    setUsage({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
    setLedger([]); setUsd(0);
  };

  // Sonnet list price: $3/M in, $15/M out; cache reads at 10%, cache writes at 125% of input.
  const estCost = usd; // summed per call by the model that answered (.473) — Sonnet and DeepSeek priced apart

  // The pills come from the last reader turn that CARRIES pills: an act turn ("one small thing")
  // goes quiet on purpose, but the conversation must still be continuable from where it was
  // (founder, 2026-09-16 night: "after selecting one small thing, the pills are all gone").
  const lastReader = [...turns].reverse().find((t) => t.role === 'reader' && !t.act) || [...turns].reverse().find((t) => t.role === 'reader');
  // THE ENDING: the Reader may say the reading has done its work (closing), and the write-up turn
  // is the stop itself. Neither locks anything — the box stays live under both.
  const wrapped = turns.length > 0 && turns[turns.length - 1]?.role === 'wrap';
  const closingOffered = !!lastReader?.closing && !wrapped;
  // THE FIELD AT A TURN: the most recently drawn card up to and including that turn governs
  // its medicine container; before any reflect or forge, the opening draw. (The container
  // used to fall back to the opening draw on every talking turn — a stale growth box.)
  const firstReaderIdx = turns.findIndex((t) => t.role === 'reader');
  const fieldAt = (ti) => {
    for (let i = ti; i >= 0; i--) { const t = turns[i]; if (t?.role === 'reader' && t.draw) return [t.draw]; }
    return draws || [];
  };

  // The pills re-render with the switch: talk / ask the field / declare to the field.
  // WHILE THE READER IS WRITING (founder, 2026-09-17, on the phone): the things a person might tap
  // instead — the switches, the pills, the text box, the panels — dim and go inert, so the one
  // moving thing on the page is the indicator. Each section stays live only where its own
  // indicator lives.
  const anyBusy = loading || regenning || !!brazierBusy || stepBusy || dragonBusy;
  const dim = (on) => (on ? 'opacity-30 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300');
  const dimTop = dim(anyBusy);
  const dimPills = dim(loading || !!brazierBusy || stepBusy || dragonBusy);
  const dimBox = dim(anyBusy);
  const dimPanels = dim(loading); // NOT regenning: the pills reroll off screen while the panel's answer is being read
  /* WORDS TO THE WHYS and ONE SMALL STEP (founder, 2026-09-16 night): side by side while both
     are closed; the one you open takes a full row with its answer and the other drops
     beneath it on a row of its own. The step's loop sits flush RIGHT, the whys' flush LEFT. */
  const panelsRef = useRef(null);
  const showPanels = (kind) => { setTimeout(() => { try {
    const el = (kind && document.querySelector(`[data-ez-panel="${kind}"]`)) || panelsRef.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
  } catch {} }, 80); };
  const renderPanels = (which) => {
              const chev = (open) => <svg className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
              const header = (kind) => kind === 'brazier'
                ? (
                  <button onClick={toggleBrazier} className="relative w-full flex items-center gap-3 pl-16 pr-3 py-3 text-left overflow-hidden rounded-xl" style={{ minHeight: 52 }}>
                    <span className="absolute left-0 top-0 h-full w-14 overflow-hidden rounded-l-xl" aria-hidden="true"><HoverVideo src="/video/brazier.mp4" className="w-full h-full object-cover" /></span>
                    <span className="font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-zinc-200 break-words">Words to the Whys</span>
                    <span className="ml-auto">{chev(brazierOpen)}</span>
                  </button>
                ) : kind === 'dragon' ? (
                  <button onClick={toggleDragon} className="relative w-full flex items-center justify-center gap-3 px-3 py-3 text-center overflow-hidden rounded-xl" style={{ minHeight: 52 }}>
                    <span className="font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-rose-200 break-words">{DRAGON_LABEL}</span>
                    {chev(dragonOpen)}
                  </button>
                ) : (
                  <button onClick={toggleStep} className="relative w-full flex items-center gap-3 pl-3 pr-16 py-3 text-left overflow-hidden rounded-xl" style={{ minHeight: 52 }}>
                    <span className="absolute right-0 top-0 h-full w-14 overflow-hidden rounded-r-xl" aria-hidden="true"><HoverVideo src="/video/step.mp4" className="w-full h-full object-cover" /></span>
                    {chev(stepOpen)}
                    <span className="font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-zinc-200 break-words">{DO_SOMETHING_LABEL}</span>
                  </button>
                );
              const body = (kind) => kind === 'brazier'
                ? (brazierOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    {brazier[1] && ensureParagraphBreaks(brazier[1]).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={`r1${xi}`} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                    ))}
                    {floorsOpened.filter((f) => brazier[f]).map((f) => (
                      <div key={f} className="mt-4 pt-4 border-t border-zinc-800/70">
                        <div className="text-[0.625rem] uppercase tracking-wider text-zinc-500 mb-2">{FLOOR_LABEL[f]}</div>
                        {ensureParagraphBreaks(brazier[f]).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                          <p key={xi} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                        ))}
                        {f === 'mechanism' && (
                          <p className="mt-3 text-[0.8125rem]"><Link href={savedId ? `/advanced?load=${savedId}&bridge=1` : '/advanced'} className="text-cyan-300/90 underline decoration-dotted hover:text-cyan-200">open this reading in the full reader</Link> <span className="text-zinc-500">— your conversation stays saved here; there is a way back at the top of that page</span></p>
                        )}
                      </div>
                    ))}
                    {!!brazierBusy && <Writing scroll={false} label={brazierBusy === 1 ? 'the Reader is writing…' : `the Reader is opening ${FLOOR_LABEL[brazierBusy] || 'the floor'}…`} />}
                    {/* THE LANTERNS (Keel's requirements §2; founder 2026-09-19): three destinations, not a
                        staircase — any one in one tap. Lowercase, quiet, one row. A floor already opened
                        goes dim. Gated floors appear when their exemplars freeze; the bench shows all three. */}
                    {!brazierBusy && brazier[1] && (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        {/* real buttons, equally spaced, centred at the foot of the panel, each in its own
                            colour (founder, 2026-09-19 night, first look on production) */}
                        {/* gated floors show for admins too (founder, 2026-09-19 night: "I'm curious if this works before I go to sleep") */}
                        {['meaning', 'moon', 'mechanism'].filter((f) => FLOORS_OPEN[f] || bench || isAdmin(user)).map((f) => {
                          const tone = {
                            meaning: 'border-amber-400/90 bg-amber-950/30 text-amber-100 hover:bg-amber-900/40',
                            moon: 'border-violet-400/90 bg-violet-950/30 text-violet-100 hover:bg-violet-900/40',
                            mechanism: 'border-cyan-400/90 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-900/40',
                          }[f];
                          return (
                            <button key={f} onClick={() => fetchFloor(f)} disabled={!!brazier[f]}
                              className={`flex-1 basis-0 min-w-[7rem] max-w-[12rem] rounded-full border px-4 py-2 text-[0.875rem] font-serif transition-colors ${tone} ${brazier[f] ? 'opacity-40 cursor-default' : ''}`}>
                              {FLOOR_LABEL[f]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
                : kind === 'dragon' ? (dragonOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    <div className="text-[0.6875rem] text-rose-300/70 mb-2">{DRAGON_HINT}</div>
                    {dragonBusy && <Writing scroll={false} label="the Reader is naming it…" />}
                    {!dragonBusy && dragonText && ensureParagraphBreaks(dragonText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={xi} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                    ))}
                  </div>
                )) : (stepOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    <div className="text-[0.6875rem] text-zinc-500 mb-2">{DO_SOMETHING_HINT}</div>
                    {stepBusy && <Writing scroll={false} label="the Reader is finding the step…" />}
                    {!stepBusy && stepText && ensureParagraphBreaks(stepText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={xi} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                    ))}
                  </div>
                ));
              const frame = 'pill-breathe rounded-xl border bg-zinc-950/40';
              const glow = { '--pill': '139 92 246', borderColor: '#4c1d95' }; // dark purple at rest; breathes violet on hover
              const isOpen = (kind) => (kind === 'brazier' ? brazierOpen : kind === 'dragon' ? dragonOpen : stepOpen);
              // the row: whys · dragon · step (gentle door left, fierce door centre, the step right)
              const base = ['brazier', 'dragon', 'step'];
              const order = [panelFirst, ...base.filter((k) => k !== panelFirst)];
              const mine = order.filter((kind) => (which === 'open' ? isOpen(kind) : !isOpen(kind)));
              if (!mine.length) return null;
              // the shut ones share one row under the text box, in the row's own order
              if (which === 'closed' && mine.length > 1) {
                const dragonGlow = { '--pill': '244 63 94', borderColor: '#881337' }; // dark rose at rest; breathes red on hover
                return (
                  <div className="mt-4 flex items-stretch gap-2">
                    {base.filter((k) => mine.includes(k)).map((k) => (
                      <div key={k} style={k === 'dragon' ? dragonGlow : glow} className={`flex-1 min-w-0 ${frame}`}>{header(k)}</div>
                    ))}
                  </div>
                );
              }
              return (
                <div ref={which === 'open' ? panelsRef : undefined}>
                  {mine.map((kind, i) => (
                    <div key={kind} data-ez-panel={kind} style={kind === 'dragon' ? { '--pill': '244 63 94', borderColor: '#881337' } : glow} className={`${i === 0 ? 'mt-4' : 'mt-3'} ${frame}`}>{header(kind)}{which === 'open' ? body(kind) : null}</div>
                  ))}
                </div>
              );
  };

  const activePills = !lastReader ? []
    : fieldMode === 'reflect' ? (lastReader.reflect || []).map((text) => ({ kind: 'reflect', text }))
      : fieldMode === 'forge' ? (lastReader.forge || []).map((text) => ({ kind: 'forge', text }))
        : (lastReader.chips || []);

  // The two switches are, in the founder's words, "probably the most valuable buttons in the
  // whole thing" — and people scrolled past them. Now each takes half the row, sized like the
  // pills, with one line inside saying what it does.
  const switchBtn = (mode, label, glyph) => {
    const on = fieldMode === mode;
    const tone = mode === 'reflect'
      ? (on ? 'border-sky-400 bg-sky-900/40 text-sky-100' : 'border-sky-700/50 bg-sky-950/20 text-sky-200 hover:border-sky-500 hover:bg-sky-900/30')
      : (on ? 'border-orange-400 bg-orange-900/40 text-orange-100' : 'border-orange-700/50 bg-orange-950/20 text-orange-200 hover:border-orange-500 hover:bg-orange-900/30');
    const hint = mode === 'reflect' ? 'ask the cards a question' : 'declare a move — the cards answer';
    return (
      <button onClick={() => setFieldMode(on ? null : mode)} disabled={loading}
        className={`relative overflow-hidden flex-1 min-w-0 text-center rounded-lg border py-2.5 transition-colors disabled:opacity-40 ${mode === 'reflect' ? 'pl-16 pr-3' : 'pl-3 pr-16'} ${tone}`}>
        <span className="flex items-center justify-center gap-2 text-[0.9375rem] font-medium">
          {mode === 'reflect'
            ? <span className="absolute left-0 top-0 h-full w-14 overflow-hidden rounded-l-lg" aria-hidden="true"><HoverVideo src="/video/reflect.mp4" className="w-full h-full object-cover" style={{ mixBlendMode: 'screen' }} /></span>
            : <span className="absolute right-0 top-0 h-full w-14 overflow-hidden rounded-r-lg" aria-hidden="true"><HoverVideo src="/video/forge.mp4" className="w-full h-full object-cover" /></span>}
          <span>{label}</span>
        </span>
        <span className="block text-[0.6875rem] opacity-75 mt-0.5 break-words">{hint}</span>
      </button>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden ${chrome.prefs.theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={chrome.prefs.theme} style={{ '--content-dim': chrome.prefs.contentDim / 100 }}>
      {chrome.loaded && <Backdrop prefs={chrome.prefs} />}
      {user && <CornerControls prefs={chrome.prefs} set={chrome.set} onAuthChange={(u) => { if (!u) setUser(null); }}
        rightExtra={
          // the voice, as one toggle under the text size (founder, 2026-09-16): plain words / the map's words
          <button onClick={() => chooseVoice(voice === 'plain' ? 'map' : 'plain')}
            title={voice === 'plain' ? 'Plain words — tap for the map\'s words' : 'The map\'s words — tap for plain words'}
            className={`w-8 h-8 rounded-lg border backdrop-blur-sm text-[0.8125rem] font-medium flex items-center justify-center transition-all ${voice === 'plain' ? 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/40' : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
            {voice === 'plain' ? 'Aa' : '◈'}
          </button>
        } />}
      <div className="relative z-10 flex-1 flex flex-col w-full">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 overflow-x-hidden">
        {/* .482: a TEMPORARY door to the full reader while the two are being tuned side by side (founder). */}
        <div className="mt-3 flex justify-end">
          <Link href="/advanced" className="text-[0.75rem] tracking-wide text-zinc-500 underline decoration-dotted hover:text-zinc-300">full reader →</Link>
        </div>
        <div className="mt-3" />

        {allowed === null && <p className="text-zinc-500 text-sm">Checking the door…</p>}
        {allowed === false && !user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <p className="text-base text-zinc-200 mb-1">Sign in to begin.</p>
              <p className="text-sm text-zinc-500">Your readings are saved to your account so you can come back to them.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] text-sm font-medium">
                Sign in
              </button>
              <button onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm">
                Create an account
              </button>
            </div>
          </div>
        )}

        {allowed === false && user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
            <p className="mb-2">EZ mode is invite-only while it is being built.</p>
            <p className="text-zinc-500">You are signed in as {user.email}, but this account is not on the list yet.</p>
          </div>
        )}

        {allowed && !draws && !door && (
          <div style={{ paddingTop: anchorPad === null ? '20vh' : anchorPad }}>
          {/* THE ENTRY, like the front page: one frame, the box with Ask inside it, and one quiet
              row beneath — areas, past readings, from my readings, voice. Everything else folds.
              The frame sits in the middle of the screen (founder: "like Bing or Google, right
              there in the middle, very simple"). */}
          <div ref={anchorRef} className={`content-pane bg-zinc-900/30 border border-zinc-800/50 p-4 space-y-3 ${(areasOpen || showPast || (suggested && suggestOpen) || error) ? 'rounded-t-lg' : 'rounded-lg'}`}>
            <div className="relative">
              <div className="content-pane rounded-xl">
                <textarea ref={questionRef} value={question} onChange={(e) => { setQuestion(e.target.value); if (wordless) setWordless(false); }} onFocus={() => setWordless(false)} rows={4}
                  placeholder="What's on your mind? Ask it the way you would say it out loud."
                  style={{ animationDuration: '16s' }}
                  className={`animate-border-rainbow block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none`} />
              </div>
              {/* the offer sits INSIDE the box, outside the content-pane wrapper: a direct child of a
                  content-pane is forced into normal flow (the Ask-button trap, 2026-09-16) */}
              {wordless && (
                <div className="pointer-events-none absolute left-4 right-4 bottom-16 z-10 text-right text-[0.8125rem] leading-snug text-zinc-400">
                  You don’t have to have words. Tap again and the cards start.
                </div>
              )}
              <button onClick={begin} disabled={loading} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : wordless ? 'Draw for wherever I am' : 'Ask'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 items-center text-[0.8125rem]">
              <button onClick={() => (showPast ? setShowPast(false) : loadPastList())}
                className="justify-self-center text-zinc-400 hover:text-zinc-200 transition-colors">Load</button>
              <button onClick={() => setAreasOpen(!areasOpen)}
                className="justify-self-center flex items-center gap-1 text-amber-400/90 hover:text-amber-300 transition-colors">
                Unsure
                <svg className={`w-3.5 h-3.5 transition-transform ${areasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {user && hasHistory ? (
                <div className="justify-self-center flex items-center gap-1.5 text-violet-300/90">
                  <button onClick={() => { setAreasOpen(false); setShowPast(false); suggestFromHistory(); }} disabled={suggesting}
                    className="text-center hover:text-violet-200 transition-colors disabled:opacity-50">
                    {suggesting ? 'Reading your history…' : suggested ? 'Another' : 'Personalized'}
                  </button>
                  {suggested && !suggesting && (
                    <button onClick={() => setSuggestOpen(!suggestOpen)} title={suggestOpen ? 'fold it away' : 'show it again'}
                      className="hover:text-violet-200 transition-colors">
                      <svg className={`w-3.5 h-3.5 transition-transform ${suggestOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  )}
                </div>
              ) : <span />}
            </div>
          </div>

          {(areasOpen || showPast || (suggested && suggestOpen) || error) && (
          <div className="content-pane bg-zinc-900/30 border border-t-0 border-zinc-800/50 rounded-b-lg p-4 space-y-3">
            {areasOpen && (() => {
              const byId = Object.fromEntries(DOORS.map(d => [d.id, d]));
              // the minimap's own house colours (components/reader/Minimap.js CHANNEL_COLORS)
              const HOUSE_TINT = { spirit: '#C44444', mind: '#4A8B4A', emotion: '#3D6A99', body: '#8B6B3D', gestalt: '#6B4D8A', daily: '#a16207' };
              const Door = ({ d, className = '', delay = 0 }) => {
                const c = HOUSE_TINT[d.id];
                return (
                  <button key={d.id} onClick={() => {
                      // "My daily reading" chooses one of the five houses for them, at random
                      // "Let one be chosen for me": a house and one of its open sentences, never
                      // yesterday's (pickDaily); a chosen door brings no sentence of its own
                      const daily = d.id === 'daily' ? pickDaily(DOORS) : null;
                      setDoor(daily ? daily.door : d); setQuestion(daily ? daily.text : ''); setError(''); setBiggerOpen(false);
                    }}
                    className={`text-center rounded-xl border px-3 py-2.5 transition-colors break-words hover:brightness-125 ${className}`}
                    style={{ borderColor: c + '99', background: c + '26', animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${delay}ms` }}>
                    <span className="text-[0.9375rem] text-zinc-100">{d.label}</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">{d.sub}</span>
                  </button>
                );
              };
              // the Gestalt door is one cell wide, centred over the four; every cell the same height
              return (
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <div className="col-span-2 flex justify-center">
                    <Door d={byId.gestalt} className="w-[calc(50%-4px)]" delay={0} />
                  </div>
                  <Door d={byId.mind} delay={180} />
                  <Door d={byId.emotion} delay={360} />
                  <Door d={byId.body} delay={540} />
                  <Door d={byId.spirit} delay={720} />
                  {/* the five doors are the five aspects of self; the random choice is a link, not a sixth door */}
                  <div className="col-span-2 text-center pt-1">
                    <button onClick={() => { const daily = pickDaily(DOORS); setDoor(daily.door); setQuestion(daily.text); setError(''); setBiggerOpen(false); }}
                      className="text-sm text-amber-400/80 hover:text-amber-300 underline decoration-dotted underline-offset-4">
                      or let one be chosen for me — my daily reading
                    </button>
                  </div>
                </div>
              );
            })()}

            {showPast && (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] uppercase tracking-wider text-zinc-500">Your EZ readings</span>
                    <button onClick={() => setShowPast(false)} className="text-xs text-zinc-600 hover:text-zinc-300">close</button>
                  </div>
                  {pastReadings.length === 0 && <p className="text-xs text-zinc-600">Nothing here yet.</p>}
                  {pastReadings.slice(0, 12).map((r, ri) => (
                    // each row flashes the rainbow once as the list opens, top to bottom (the same
                    // one-shot the front page's Enter uses), staggered so it reads as a cascade
                    <button key={r.id} onClick={() => openPast(r.id)} disabled={loading}
                      style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${ri * 180}ms` }}
                      className="w-full text-left rounded-lg border border-zinc-700/50 px-3 py-2 hover:border-amber-500/40 transition-colors break-words disabled:opacity-40">
                      <span className="text-sm text-zinc-200 break-words">{r.topic || 'Untitled'}</span>
                      <span className="block text-[0.625rem] text-zinc-600 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
            )}

                {suggested && suggestOpen && (
                  <button onClick={() => { setDoor(null); setQuestion(suggested); setError(''); }}
                    style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: '-900ms' }}
                    className="w-full text-center rounded-xl border border-violet-700/50 bg-violet-950/20 px-4 py-3 break-words">
                    <span className="text-[0.625rem] uppercase tracking-wider text-violet-300/70 block mb-1">From your readings — tap to use</span>
                    <span className="text-[0.9375rem] text-violet-100">{suggested}</span>
                  </button>
                )}
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
          )}
          </div>
        )}

        {/* The context step: the door has been chosen, the box becomes "add anything that matters". */}
        {allowed && !draws && door && (
          <div className="space-y-5">
            <button onClick={() => { setDoor(null); setQuestion(''); setError(''); setBiggerOpen(false); }}
              className="rounded-lg border border-zinc-700/60 px-3 py-1.5 text-[0.9375rem] text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors">&larr; Something else</button>

            {door.viaDaily && <p className="text-[0.625rem] uppercase tracking-wider text-amber-400/80">Chosen for you today: {door.label}</p>}
            <p className="text-lg text-zinc-200 font-light break-words">{door.breath}</p>

            {/* THE STARTERS (Keel's spec, section 3): five pills in one universal grammar, worded per
                area. Tapping one FILLS the box, editable. The free field is never gated behind them. */}
            {!door.viaDaily && STARTERS[door.id] && (
              <div className="flex flex-col gap-2">
                {STARTER_KINDS.filter((k) => k.key !== 'bigger').map((k) => (
                  <button key={k.key} onClick={() => { setQuestion(STARTERS[door.id][k.key]); setError(''); setTimeout(() => { try { contextRef.current?.focus(); } catch {} }, 0); }}
                    className="pill-breathe text-left rounded-lg border border-zinc-700/60 px-3 py-2 text-[0.9375rem] text-zinc-200 break-words"
                    style={{ '--pill': '251 191 36' }}>
                    <span className="block text-[0.625rem] uppercase tracking-wider text-zinc-500 mb-0.5">{k.label}</span>
                    {STARTERS[door.id][k.key]}
                  </button>
                ))}
                <button onClick={() => setBiggerOpen(!biggerOpen)}
                  className="self-center flex items-center gap-1 text-[0.8125rem] text-zinc-400 hover:text-zinc-200 transition-colors">
                  A bigger question
                  <svg className={`w-3.5 h-3.5 transition-transform ${biggerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {biggerOpen && (
                  <div className="flex flex-col gap-2">
                    {STARTERS[door.id].bigger.map((bq) => (
                      <button key={bq} onClick={() => { setQuestion(bq); setError(''); setTimeout(() => { try { contextRef.current?.focus(); } catch {} }, 0); }}
                        className="pill-breathe text-left rounded-lg border border-violet-700/50 bg-violet-950/20 px-3 py-2 text-[0.9375rem] text-violet-100 break-words"
                        style={{ '--pill': '167 139 250' }}>
                        {bq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[0.9375rem] text-zinc-300 mb-1">
                Or ask it in your own words
              </label>
              <p className="text-xs text-zinc-500 mb-2">Tapping one above fills this box. Edit it, or draw as it stands.</p>
              <div className="relative">
                <div className="content-pane rounded-xl">
                  <textarea ref={contextRef} value={question} onChange={(e) => setQuestion(e.target.value)} rows={5}
                    placeholder="Whatever you would actually say out loud. A sentence or two is plenty."
                    className="block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
                </div>
                <button onClick={begin} disabled={loading} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : 'Draw'}</span>
                  <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
        )}

        {allowed && draws && (
          <>
            {/* The original cards: the reference, not the reading */}
            <div data-ez-header="" className="flex flex-col items-center gap-5 mb-6 max-w-full" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}>
              {draws.map((d, i) => (
                <CardWithMap key={i} draw={d} onInfo={openInfo} label={drawLabel(d)} stacked={animOn} />
              ))}
            </div>
            {/* THE MAP, laid over the whole screen while it plays. It is out of the page flow, so
                nothing clips it and nothing shifts; the cards fly to the page's own header
                underneath, and the overlay lifts when they land. */}
            {/* No tap-to-skip and no helper line: the founder cut both ("it looks like a
                helper or something"). The landing plays through; the reply waits for it. */}
            {animating && (
              <div data-ez-map="" className="fixed left-0 right-0 bottom-0 z-[90] select-none"
                style={{ top: overlayTop, background: 'rgba(9, 9, 11, 0.1)', opacity: overlayIn ? 1 : 0, transition: overlayIn ? 'opacity 900ms ease' : 'opacity 450ms ease' }}>
              {/* THE VIDEO BREATHES THROUGH (founder, 2026-09-16): the overlay is 10% black, barely
                  there, so the video plays under the map almost at full strength,
                  and the quicker fade-out brings the world back when the cards land. */}
                {landedWaiting && (
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: '56vh' }}>
                    <Writing scroll={false} />
                  </div>
                )}
                <TheMap drawMap={{}} colorLayer="status" initialZoom={0.45} showLabels={false} showHouseLabels={false}
                  lowRes showControls={false} cameraRef={cameraRef} className="w-full h-full" />
              </div>
            )}
            <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms ease' }}>
            {bench && (
              <div className="mb-4 rounded-md border border-fuchsia-700/50 bg-fuchsia-950/30 px-3 py-1.5 text-center text-[0.6875rem] uppercase tracking-wider text-fuchsia-200/90">
                layout bench — canned reading, no API calls, nothing saved
              </div>
            )}
            <p className="text-xs text-zinc-500 italic mb-6 text-center break-words">“{asked || question}”</p>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map((t, ti) => (
                <div key={t.id} data-ez-turn={t.id}
                  style={{ opacity: t.pending ? 0 : 1, transition: 'opacity 600ms ease' }}
                  className={t.role === 'you'
                    ? 'ml-4 sm:ml-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm text-amber-100/90 italic break-words'
                    : t.role === 'catchup'
                      ? 'rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 text-sm text-violet-100 break-words'
                    : t.role === 'wrap'
                      ? 'rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-5 text-[1rem] leading-relaxed text-emerald-50 break-words'
                      : 'rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 text-[0.9375rem] leading-relaxed text-zinc-200 break-words'}>

                  {t.role === 'catchup' && <div className="text-[0.625rem] uppercase tracking-wider text-violet-300/70 mb-2">Where you are</div>}
                  {t.role === 'wrap' && <div className="text-[0.625rem] uppercase tracking-wider text-emerald-300/70 mb-2">The reading, written up</div>}
                  {t.role === 'you' && t.mode && (
                    <div className={`text-[0.625rem] uppercase tracking-wider mb-2 not-italic ${t.mode === 'reflect' ? 'text-sky-300/80' : 'text-orange-300/80'}`}>
                      {t.mode === 'reflect' ? '↩ Reflecting' : '⚡ Forging'}
                    </div>
                  )}
                  {t.role === 'reader' && t.act && (
                    <div className="text-[0.625rem] uppercase tracking-wider mb-2 text-zinc-500">one small thing</div>
                  )}

                  {/* A card drawn in answer to a reflect or a forge */}
                  {t.draw && (
                    <div className="flex justify-center mb-3">
                      {/* the same stacked pair + minimap as the header (founder, 2026-09-16) */}
                      <CardWithMap draw={t.draw} onInfo={openInfo} label={drawLabel(t.draw)} stacked />
                    </div>
                  )}

                  {ensureParagraphBreaks(t.text).split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{p.trim()}</p>
                  ))}

                  {/* THE MEDICINE — its own container, because it is half the answer, not an aside.
                      The path is computed from the draw; the words come from the Reader. */}
                  {t.role === 'reader' && t.located && (
                    <p className="mt-3 text-xs text-violet-200/90 break-words"><span className="uppercase tracking-wider opacity-70 mr-2">Found</span>{t.located}</p>
                  )}
                  {t.role === 'reader' && t.medicine && !(t.draw || ti === firstReaderIdx) && (
                    <p className="mt-3 text-xs text-emerald-300/80 italic break-words">◈ {t.medicine}</p>
                  )}
                  {t.role === 'reader' && t.medicine && (t.draw || ti === firstReaderIdx) && (
                    <div className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3">
                      <div className="text-[0.625rem] uppercase tracking-wider text-emerald-300/80 mb-2">
                        {medicineFor(fieldAt(ti)).some((m) => m && !m.balanced) ? '◈ The medicine' : '◈ Where this can grow'}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                        {medicineFor(fieldAt(ti)).map((m, mi) => (
                          <div key={mi} className="flex flex-col items-center max-w-full">
                            <CardImage transient={m.toId} status={1} cardName={m.to} size="compact" showFrame={true}
                              onImageClick={() => openInfo({ type: 'card', id: m.toId, data: getComponent(m.toId) })} />
                            <span className="text-[0.6875rem] text-emerald-300/90 mt-1 text-center break-words">
                              {m.from} → {m.to}
                            </span>
                            {m.path && <span className="text-[0.625rem] text-emerald-500/60 text-center break-words">{m.path}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-emerald-100/90 leading-relaxed break-words">
                        {ensureParagraphBreaks(t.medicine).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                          <p key={xi} className="mb-2 last:mb-0">{x.trim()}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* The question, handed over AFTER the move. Founder's ruling 2026-09-14:
                      a question composed without the medicine in view ignores the very thing
                      the person just read. */}
                  {t.role === 'reader' && t.question && (
                    <p className="mt-4 text-[1.0625rem] leading-snug text-amber-300/90 break-words">{t.question}</p>
                  )}

                  {t.role === 'reader' && !t.simplified && !loading && (
                    <button onClick={() => simplify(t.id)}
                      className="mt-2 text-[0.6875rem] text-zinc-600 hover:text-zinc-400 underline decoration-dotted">
                      say it simpler
                    </button>
                  )}

                  {/* PULL IT TOGETHER, inline at the base of the LATEST message, centred, every turn
                      (founder, 2026-09-19 night: the footer link was "super tiny… impossible to find").
                      The footer link stays; this is the one people will see. The label is provisional. */}
                  {t.role === 'reader' && t.id === lastReader?.id && !wrapped && !loading && (
                    <div className="mt-4 flex justify-center">
                      <button onClick={closeUp}
                        className="rounded-full border border-emerald-600/50 bg-emerald-950/20 px-5 py-2 text-[0.875rem] font-serif text-emerald-100 hover:bg-emerald-900/30 transition-colors">
                        pull it together
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && <Writing scroll={!animating && !animPending} />}
              {error && <div className="text-xs text-red-400 pl-2 break-words">{error}</div>}
              <div ref={endRef} />
            </div>

            {/* AN OPEN PANEL FOLLOWS THE CONVERSATION (founder, 2026-09-17): its answer renders here,
                above the block that never moves — Reflect and Forge, the pills, the text box, and
                whichever panel is still shut. */}
            {(brazierOpen || stepOpen || dragonOpen) && <div className={dimPanels}>{renderPanels('open')}</div>}

            {/* THE DOORS, right above Reflect and Forge (founder, 2026-09-19 night, first live pass:
                beneath the text box they were out of sight too often) */}
            <div className={dimPanels}>{renderPanels('closed')}</div>

            <div className={dimTop}>
            {/* Tier 2: the two switches — flipping one re-renders the pills below */}
            <div className="mt-5 flex items-stretch gap-2">
              {switchBtn('reflect', 'Reflect', '↩')}
              {switchBtn('forge', 'Forge', '⚡')}
            </div>
            <div className="mt-1 flex justify-between text-[0.6875rem]">
              <button onClick={() => setExplain(explain === 'reflect' ? null : 'reflect')} className="text-zinc-500 hover:text-sky-300 underline decoration-dotted">what is Reflect?</button>
              <button onClick={() => setExplain(explain === 'forge' ? null : 'forge')} className="text-zinc-500 hover:text-orange-300 underline decoration-dotted">what is Forge?</button>
            </div>
            </div>

            {explain && (
              <div className={`mt-3 rounded-lg border p-3 text-sm break-words ${explain === 'reflect' ? 'border-sky-700/40 bg-sky-950/20 text-sky-100' : 'border-orange-700/40 bg-orange-950/20 text-orange-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {explain === 'reflect' ? (
                      <>
                        <p className="font-medium mb-1">Reflect — you ask, the field answers.</p>
                        <p className="text-[0.8125rem] opacity-90">Use it when you genuinely do not know something and want the architecture to speak to it. You put a question; a new card is drawn and read as the answer to that question, in light of the reading already on the table.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Forge — you declare, the field responds.</p>
                        <p className="text-[0.8125rem] opacity-90">Use it when you are not asking but stating: what you will do, choose, commit to, or stop. A new card is drawn as the architecture&rsquo;s response to your declaration. It may affirm it, complicate it, or redirect it.</p>
                      </>
                    )}
                    <p className="text-xs opacity-60 mt-2">Either way the original cards never change. A new card is a lens, not a replacement.</p>
                  </div>
                  <button onClick={() => setExplain(null)} className="text-xs opacity-60 hover:opacity-100">close</button>
                </div>
              </div>
            )}

            <div className={dimPills}>
            {/* Tier 1: the pills. Talk by default; questions under Reflect; declarations under Forge. */}
            {activePills.length > 0 && !loading && (
              <div className="mt-3 flex flex-col gap-2">
                {activePills.filter((c) => c?.text).map((c, i) => (
                  <button key={i} onClick={() => send(c.text, fieldMode, c.kind === 'locate' ? { locate: c.what || c.text } : undefined)} disabled={regenning}
                    style={{ '--pill': CHIP_RGB[c.kind] || CHIP_RGB.build }}
                    className={`pill-breathe flex items-baseline gap-2 text-left rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-40 ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    {/* a fixed label column (sized to PUSH BACK) so every pill's text starts at the same x */}
                    {CHIP_LABEL[c.kind] && <span className="w-[7.6em] shrink-0 text-[0.625rem] uppercase tracking-wider opacity-70">{CHIP_LABEL[c.kind]}</span>}
                    <span className="flex-1 min-w-0 break-words">{c.text}</span>
                  </button>
                ))}
                {lastReader?.suggest && !loading && (() => {
                  const sg = lastReader.suggest;
                  const tone = sg.kind === 'reflect' ? 'border-sky-500/60 text-sky-100 bg-sky-950/30 hover:bg-sky-900/40'
                    : sg.kind === 'forge' ? 'border-orange-500/60 text-orange-100 bg-orange-950/30 hover:bg-orange-900/40'
                      : 'border-violet-400/60 text-violet-100 bg-violet-950/30 hover:bg-violet-900/40';
                  const label = sg.kind === 'reflect' ? '↩ Ask the field this' : sg.kind === 'forge' ? '⚡ Declare this' : '◇ Find which thing this is';
                  return (
                    <button onClick={() => send(sg.text, sg.kind === 'locate' ? null : sg.kind, sg.kind === 'locate' ? { locate: sg.what || sg.text } : undefined)}
                      className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors break-words ${tone}`}>
                      <span className="block text-[0.625rem] uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
                      {sg.text}
                    </button>
                  );
                })()}
                {lastReader?.locating && !lastReader.located && !loading && (
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    <button onClick={() => { setClaiming(true); try { document.querySelector('textarea[placeholder]')?.focus(); } catch {} }}
                      className="px-3 py-1.5 rounded-full border border-violet-500/40 text-[0.8125rem] text-violet-200 hover:bg-violet-900/20">
                      I've got it — let me name it
                    </button>
                    <button onClick={() => send("That's close enough — let's go with that.", undefined, { claim: true })}
                      className="px-3 py-1.5 rounded-full border border-zinc-600/60 text-[0.8125rem] text-zinc-300 hover:bg-zinc-800/40">
                      Close enough
                    </button>
                  </div>
                )}
                {closingOffered && !loading && (
                  <button onClick={closeUp}
                    className="text-left rounded-lg border border-emerald-600/50 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-900/30 transition-colors break-words">
                    <span className="block text-[0.625rem] uppercase tracking-wider opacity-70 mb-0.5">that may be the whole of it</span>
                    Pull it together
                  </button>
                )}
                {regenning ? <Writing className="self-center mt-1" label="the Reader is finding more choices…" scroll={false} /> : (
                  <button onClick={() => regenPills()}
                    className="self-center mt-1 px-4 py-2 rounded-full border border-amber-500/40 text-sm text-amber-300 hover:bg-amber-900/20 hover:border-amber-400 transition-colors">
                    ↻ More choices
                  </button>
                )}
              </div>
            )}

            {/* Free text always present */}
            </div>
            <div className={dimBox}>
            {/* Say sits INSIDE the box, bottom-right, the rainbow word with the chevron — the same
                treatment as Ask on the front box (founder, 2026-09-16 night) */}
            <div className="mt-4 relative">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(undefined, undefined, claiming ? { claim: true } : undefined); setClaiming(false); } }}
                placeholder={claiming ? 'Name it in your own words — whatever you have got…' : fieldMode === 'reflect' ? 'Ask the field…' : fieldMode === 'forge' ? 'Declare what you will do…' : 'Answer in your own words…'}
                style={{ '--pill': '251 191 36' }} className="pill-breathe block w-full resize-y rounded-xl bg-zinc-900/70 border border-zinc-700/60 px-4 pt-3 pb-14 text-[1.0625rem] leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={() => { send(undefined, undefined, claiming ? { claim: true } : undefined); setClaiming(false); }} disabled={loading || !input.trim()} style={{ borderColor: '#2447c9' }} className="group absolute bottom-3 right-3 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border hover:brightness-125 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite' }}>{loading ? '...' : fieldMode ? 'Draw' : 'Say it'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            </div>
            <div className={dimPanels}>
            {null /* the closed panels moved above Reflect and Forge (.445) */}

            </div>

            {wrapped && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-center">
                <p className="text-[0.9375rem] text-zinc-300">This reading is saved. Come back to it any time under <span className="text-zinc-100">Load</span>.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button onClick={exportMarkdown} className="rounded-lg border border-zinc-700 px-4 py-2 text-[0.9375rem] text-zinc-200 hover:border-zinc-500 transition-colors">Keep a copy</button>
                  <button onClick={reset} className="rounded-lg border border-amber-600/60 px-4 py-2 text-[0.9375rem] text-amber-100 hover:border-amber-400 hover:bg-amber-950/30 transition-colors">Start a new reading</button>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Or keep talking below — nothing is closed off.</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={catchUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300">Where am I?</button>
              <button onClick={reset} className="underline decoration-dotted hover:text-zinc-300">New question</button>
              <button onClick={exportMarkdown} className="underline decoration-dotted hover:text-zinc-300">Export</button>
              {!wrapped && <button onClick={closeUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300 disabled:opacity-40">pull it together</button>}
              <span className="ml-auto font-mono text-zinc-600" title="fresh input / cached input (billed at 10%) / output">
                {(usage.input_tokens || 0).toLocaleString()} + {((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)).toLocaleString()} cached / {(usage.output_tokens || 0).toLocaleString()} out · ~${estCost.toFixed(3)}{savedId ? ' · saved' : ''}
              </span>
            </div>

            {/* THE COST LEDGER (.447) — admins and the bench. One row per call. "cold" = this call
                had to WRITE the prompt cache (125% of input) instead of reading it (10%). */}
            {(isAdmin(user) || bench) && ledger.length > 0 && (
              <div className="mt-2 text-xs text-zinc-500">
                <button onClick={() => setLedgerOpen(!ledgerOpen)} className="underline decoration-dotted hover:text-zinc-300">
                  {ledgerOpen ? 'hide' : 'show'} the cost ledger · {ledger.length} call{ledger.length === 1 ? '' : 's'} · {ledger.filter((r) => r.written > 0).length} cold
                </button>
                {ledgerOpen && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="font-mono text-[0.6875rem] text-zinc-400 tabular-nums">
                      <thead className="text-zinc-600">
                        <tr><th className="text-left pr-3">call</th><th className="text-left pr-3">door</th><th className="text-right pr-3">fresh</th><th className="text-right pr-3">written</th><th className="text-right pr-3">read</th><th className="text-right pr-3">out</th><th className="text-right pr-3">¢</th><th className="text-right pr-3">s</th><th className="text-left"></th></tr>
                      </thead>
                      <tbody>
                        {ledger.map((r, i) => (
                          <tr key={i} className={r.written > 0 ? 'text-amber-300/80' : ''}>
                            <td className="pr-3 whitespace-nowrap">{r.purpose}</td>
                            <td className="pr-3 whitespace-nowrap text-zinc-500">{r.model || ''}</td>
                            <td className="text-right pr-3">{r.fresh.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.written.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.read.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.out.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.cents.toFixed(2)}</td>
                            <td className="text-right pr-3">{(r.ms / 1000).toFixed(1)}</td>
                            <td>{r.written > 0 ? 'cold' : ''}</td>
                          </tr>
                        ))}
                        <tr className="text-zinc-300 border-t border-zinc-800">
                          <td className="pr-3 pt-1">total</td>
                          <td></td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.fresh, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.written, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.read, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.out, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.cents, 0).toFixed(2)}</td>
                          <td></td><td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        )}
      </main>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => { setAuthOpen(false); setAllowed(null); checkGate(); }}
        initialMode={authMode}
      />

      {selectedInfo && (
        <InfoModal
          info={selectedInfo}
          onClose={() => { setSelectedInfo(null); setInfoHistory([]); }}
          setSelectedInfo={openInfo}
          showTraditional={false}
          canGoBack={infoHistory.length > 0}
          onGoBack={goBackInfo}
        />
      )}

      <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}><Footer /></div>
    </div>
  );
}
