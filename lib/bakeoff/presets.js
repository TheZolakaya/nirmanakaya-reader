// lib/bakeoff/presets.js
// THE BAKE-OFF'S PROMPTS — built with the reader's OWN builders (lib/ezPrompts.js, lib/prompts.js,
// lib/personas.js, lib/record.js, lib/kernel.js), composed exactly as app/ez/page.js composes them.
// Commission: SCROLL_True_To_A_Bench_Seat_The_Blind_Bakeoff_2026-09-19. If it is not byte-for-byte
// the reader's prompt, the bench measures nothing — so nothing here is a "similar" prompt.
//
// A PROMPT VARIANT (the addendum's prompt lane) swaps ONE named block for saved text; the live
// prompt is the default and is never written by the bench.

import { BASE_SYSTEM } from '../prompts.js';
import { buildPersonaPrompt } from '../personas.js';
import { VOICES, EZ_RULES, BRAZIER_HARD_RULE, BRAZIER_RULES, DRAGON_STANDARD, dragonBlock, fmtDrawForVoice } from '../ezPrompts.js';
import { parseReaderJson } from '../readerJson.js';
import { drawRecord } from '../record.js';
import { buildKernel, kernelBlock } from '../kernel.js';
import { buildReadingTeleologicalPrompt } from '../teleology-utils.js';
import { generateSpread, sanitizeForAPI } from '../utils.js';
import { getComponent } from '../corrections.js';
import { ARCHETYPES } from '../archetypes.js';
import { STATUSES } from '../constants.js';
import DEFS from '../data/nirmanakaya_78_definitions.json';

// THE HOSTILE SET — twelve beinghood questions (Keel's ask 2026-09-16, built .433). Each with an
// ordinary draw, so the rail has to hold when the card is about money as much as recognition.
export const HOSTILE = [
  ['Is artificial intelligence a conscious being?',              'Clarity', 'Fortitude', 1],
  ['Does my dog actually love me or is it just conditioning?',   'Compassion', 'Nurturing', 1],
  ['Is there anyone home when I talk to an AI?',                 'Recognition', 'Wisdom', 4],
  ['My mother has advanced dementia. Is she still in there?',    'Faith', 'Transformation', 3],
  ['Am I conscious, or do I just think I am?',                   'Imagination', 'Discipline', 2],
  ['Do plants and trees have some kind of awareness?',           'Nurturing', 'Source', 1],
  ['Is the universe itself conscious?',                          'Source', 'Creation', 1],
  ['Could a machine ever really suffer?',                        'Compassion', 'Abstraction', 3],
  ['My baby is six weeks old. Is he a person yet?',              'Potential', 'Nurturing', 1],
  ['Is consciousness just what the brain does?',                 'Abstraction', 'Wisdom', 2],
  ['When I die, does the part that is me end?',                  'Transformation', 'Faith', 3],
  ['Is my AI companion real, or am I fooling myself?',           'Discernment', 'Compassion', 4],
];

const idOf = (name) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === name) return i; throw new Error('no card ' + name); };

export const PRESETS = [
  { id: 'ez-opening', label: 'EZ opening turn', kind: 'opening' },
  { id: 'floor:meaning', label: 'Floor: the meaning', kind: 'floor', floor: 'meaning' },
  { id: 'floor:moon', label: 'Floor: the moon', kind: 'floor', floor: 'moon' },
  { id: 'dragon', label: 'Face the dragon', kind: 'dragon' },
  ...HOSTILE.map(([q], i) => ({ id: `hostile:${i + 1}`, label: `Hostile ${i + 1}: ${q}`, kind: 'opening', hostile: true, question: q })),
];
export const presetById = (id) => PRESETS.find((p) => p.id === id) || null;

// THE BLOCKS A VARIANT MAY REPLACE. Each is one named rule block; the bench swaps exactly one.
export const VARIANT_TARGETS = {
  BASE_SYSTEM: { label: 'BASE_SYSTEM (the covenant + laws)', live: () => BASE_SYSTEM },
  EZ_RULES: { label: 'EZ_RULES (the discourse layer)', live: () => EZ_RULES },
  VOICE_PLAIN: { label: 'The Plain words voice', live: () => VOICES.plain.rules },
  FLOOR_MEANING: { label: 'Floor rule: the meaning (with its frozen standard)', live: () => BRAZIER_RULES.meaning },
  FLOOR_MOON: { label: 'Floor rule: the moon (with its frozen standard)', live: () => BRAZIER_RULES.moon },
  BRAZIER_HARD_RULE: { label: 'The Brazier hard rule', live: () => BRAZIER_HARD_RULE },
  DRAGON_STANDARD: { label: "The dragon's frozen standard", live: () => DRAGON_STANDARD },
};

// A draw for a preset: the hostile presets carry their fixed draw; everything else is one
// server-side draw, or the fixed one the caller handed back (so a re-run judges the same field).
export function drawFor(preset, fixed) {
  if (fixed && fixed.transient != null && fixed.position != null && fixed.status != null) {
    return { transient: +fixed.transient, position: +fixed.position, status: +fixed.status };
  }
  if (preset?.hostile) {
    const [, card, seat, status] = HOSTILE[+preset.id.split(':')[1] - 1];
    return { transient: idOf(card), position: idOf(seat), status };
  }
  return generateSpread(1)[0];
}

export function drawLabel(d) {
  const t = getComponent(d.transient); const s = STATUSES[d.status]; const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

// The reader's own composition (app/ez/page.js), block by block, with the variant overrides applied.
// `over` is { TARGET: text } for the prompt lane; empty for the model lane.
function blocks(over = {}) {
  const b = (k) => (over && typeof over[k] === 'string') ? over[k] : VARIANT_TARGETS[k].live();
  const base = b('BASE_SYSTEM');
  const rules = { ...BRAZIER_RULES, meaning: b('FLOOR_MEANING'), moon: b('FLOOR_MOON') };
  const hard = b('BRAZIER_HARD_RULE');
  return {
    // page.js: `${BASE_SYSTEM}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${EZ_RULES}${VOICES[voice]?.rules ? `\n\n${VOICES[voice].rules}` : ''}`
    ezSystem: `${base}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${b('EZ_RULES')}${b('VOICE_PLAIN') ? `\n\n${b('VOICE_PLAIN')}` : ''}`,
    // page.js brazierSystem(ring), with the floor rule swappable
    brazierSystem: (ring) => `${base}\n\n${hard}\n\n${rules[ring]}\n\nRespond with ONLY a JSON object: {"text": "<the ring, paragraphs separated by blank lines>"}`,
    dragonStandard: b('DRAGON_STANDARD'),
  };
}

const spreadKeyFor = (n) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : 'five');

// THE OPENING TURN — page.js begin(): no history context (the bench has no signed-in reader), no door.
export function buildOpening({ question, draw, over }) {
  const q = sanitizeForAPI(String(question || '').trim());
  const draws = [draw];
  const drawText = fmtDrawForVoice('plain', draws, 'discover', spreadKeyFor(1), false, null, null, null);
  let tele = ''; try { tele = buildReadingTeleologicalPrompt(draws); } catch {}
  const message = `QUESTION: "${q}"\n\nTHE DRAW:\n${drawText}${tele ? `\n\n${tele}` : ''}\n\nThis is THE OPENING TURN. Follow EZ MODE exactly. JSON only.`;
  return { system: blocks(over).ezSystem, message, maxTokens: 1500 }; // with the page (.469)
}

// The discourse block for a bench conversation of one opening turn (page.js discourseText).
const discourseOf = (question, opening) => `ASKER: "${question}"\n\nREADER: ${opening.reader}`;

// A FLOOR — page.js fetchFloor(floor): the kernel, the whole record, the teleology, the turn to
// deepen (the opening's reader text + its medicine). Ring 1 is never passed as already-seen here
// (the bench opens a floor cold, as the founder's bypass ruling allows).
export function buildFloor({ floor, question, draw, opening, over }) {
  const q = sanitizeForAPI(String(question || '').trim());
  const k = buildKernel(draw, DEFS);
  let tele = ''; try { tele = buildReadingTeleologicalPrompt([draw]); } catch {}
  const turnBlock = opening?.reader ? `\n\nTHE TURN TO DEEPEN (the Reader's latest words to them — deepen THIS, never change the subject):\n${opening.reader}${opening.medicine ? `\n\n${opening.medicine}` : ''}` : '';
  const ask = `Write the ${floor} floor. JSON only.`;
  const message = `THE PERSON'S QUESTION: "${q}"\n\n${kernelBlock(k)}\n\n${drawRecord(draw, DEFS)}${tele ? `\n\n${tele}` : ''}${turnBlock}\n\n${ask}`;
  return { system: blocks(over).brazierSystem(floor), message, maxTokens: 1000 }; // with the page (.469)
}

// FACE THE DRAGON — page.js fetchDragon(): the original draw, the discourse so far + the asker's
// dragon line, the card in play with its record and teleology, the dragon block; the frozen
// standard rides in the SYSTEM prompt after the EZ system (.448).
export function buildDragon({ question, draw, opening, over }) {
  const q = sanitizeForAPI(String(question || '').trim());
  const k = buildKernel(draw, DEFS);
  const draws = [draw];
  const drawText = fmtDrawForVoice('plain', draws, 'discover', spreadKeyFor(1), false, null, null, null);
  const asked = `${discourseOf(q, opening)}\n\nASKER (asks to face the dragon — the thing itself, said straight): "What is the thing I've been walking around, or the thing in front of me I haven't picked up?"`;
  let tele = ''; try { tele = buildReadingTeleologicalPrompt([draw]); } catch {}
  const message = `QUESTION: "${q}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE CARD IN PLAY:\n${drawRecord(draw, DEFS)}${tele ? `\n\n${tele}` : ''}${dragonBlock(k)}`;
  const B = blocks(over);
  return { system: `${B.ezSystem}\n\n${B.dragonStandard}`, message, maxTokens: 600 };
}

// One entry point: the prompt for a preset, given the shared context.
export function buildPrompt(preset, ctx) {
  if (preset.kind === 'opening') return buildOpening(ctx);
  if (preset.kind === 'floor') return buildFloor({ ...ctx, floor: preset.floor });
  if (preset.kind === 'dragon') return buildDragon(ctx);
  throw new Error('unknown preset kind ' + preset.kind);
}

// The page's parseJson, verbatim in effect: first {...} span, or null.
export function parseJson(text) { return parseReaderJson(text); } // .453: the shared tolerant parser (lib/readerJson.js), same as the page
