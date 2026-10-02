// THE ASSEMBLER — plain code, no model. Two jobs (DECISIONS_Chris_The_Pour_Line_v2_Gaveled_2026-09-30, items 1, 4, 6):
//   authoringPackage(signatureId, positionId, DEFS, exemplars) → the self-contained package for ONE signature × ONE seat × ALL
//     FOUR statuses: the seat (the Crossing + the room, so the author is seated before it writes — item 7), the cell rules,
//     the exemplars (the drift anchor, in every call), the record for each status (facts, from lib/record.js and lib/kernel.js),
//     and the response shape. The author needs no framework history.
//   readPlan(draw, DEFS, lookupCell) → the runtime object the live Reader voices, already settled: the cell as the floor,
//     the kernel facts, the verdict/polarity slot, the frame, and the provenance-tagged facts. Stage one carries one
//     projection (scalar status); the vector and etiology are typed fields reserved for when the forty-cell test earns them.
// DEFS (the 78-definitions JSON) is injected so this stays loadable in plain node for the bench.

import { buildKernel, kernelBlock } from '../kernel.js';
import { medicineActsLine } from './medicineActs.js';   // 2026-10-03: the medicine, as acts, in the plan
import { drawRecord } from '../record.js';
import { ARCHETYPES } from '../archetypes.js';
import { getComponent } from '../corrections.js';
import { HANDING_BASE } from '../handingPrompt.js';
import { SCHEMA_VERSION, PROMPT_VERSION, STATUS_NAMES, CELL_RULES, RESPONSE_SHAPE } from './schema.js';

// the seat: the Crossing and the room, sliced from the Handing prompt so there is one source of the words
export function theSeat() {
  const end = HANDING_BASE.indexOf('THE MAP, AS THE RECORD KEEPS IT');
  return end > 0 ? HANDING_BASE.slice(0, end).trim() : HANDING_BASE;
}

const ROOM_FOR_THE_AUTHOR = `THE ROOM, FOR THE AUTHOR. You are not reading for a person tonight; you are writing the cells a Reader will stand on when it does — once, for everyone who ever draws this card in this seat. Each cell is read ten thousand times by people you will never meet — read by them directly, on a card or a page, and voiced to them by a smaller model whose hands shake. What you write is both: the floor under that model's feet, and the thing a person reads in your voice across a table. So write it seated: plainly, certain about the map, humble about the person, as an offer. Someone is in this room; let it show in the stance, never in the adjectives.`;

export function authoringPackage(signatureId, positionId, DEFS, { exemplars = '', author = 'claude-fable-5-1' } = {}) {
  const card = getComponent(signatureId) || {};
  const seat = ARCHETYPES[positionId] || {};
  const records = [1, 2, 3, 4].map((status) => {
    const draw = { transient: signatureId, position: positionId, status };
    const k = buildKernel(draw, DEFS);
    const acts = medicineActsLine(k?.partnerId);   // 2026-10-03: the medicine, as acts — in the block the AUTHOR reads (not only the live Reader's plan)
    return { status, kernel: k, block: `=== STATUS ${status}: ${STATUS_NAMES[status]} ===\n${kernelBlock(k)}\n\n${drawRecord(draw, DEFS)}${acts ? '\n\n' + acts : ''}` };
  });
  const system = [theSeat(), ROOM_FOR_THE_AUTHOR, CELL_RULES, exemplars ? `THE EXEMPLARS — the house's voice, founder-judged. Match the register and the mechanism; never copy a sentence.\n\n${exemplars}` : null].filter(Boolean).join('\n\n');
  const message = [
    `THE CARD: ${card.name} (${records[0].kernel?.signatureClass || card.type || ''})${records[0].kernel?.house ? ` — ${records[0].kernel.house} house` : ''}${records[0].kernel?.stage ? `, ${records[0].kernel.stage}` : ''}`,
    `THE SEAT: ${seat.name} — ${seat.description || ''}`,
    `Write the four cells for this card in this seat, one per status, from the four records below. The record is for you; none of its vocabulary reaches the cell.`,
    '',
    records.map((r) => r.block).join('\n\n'),
    '',
    RESPONSE_SHAPE,
  ].join('\n');
  return {
    meta: { signatureId, positionId, signature: card.name, seat: seat.name, schema: SCHEMA_VERSION, prompt: PROMPT_VERSION, author, partners: Object.fromEntries(records.map((r) => [r.status, { partnerId: r.kernel?.partnerId ?? null, partner: r.kernel?.partner ?? null, mechanism: r.kernel?.mechanism ?? null }])) },
    system, message, maxTokens: 2600,
  };
}

// the cell's provenance, stamped from the package (never trusted from the author)
export function provenanceFor(pkg, status, extra = {}) {
  const p = pkg.meta.partners[status] || {};
  return { signature_id: pkg.meta.signatureId, position_id: pkg.meta.positionId, status, partner_id: p.partnerId, partner: p.partner, mechanism: p.mechanism, schema_version: pkg.meta.schema, prompt_version: pkg.meta.prompt, author_model: pkg.meta.author, date: new Date().toISOString().slice(0, 10), ...extra };
}

// THE READ-PLAN (item 4): what the live Reader is handed, settled. One projection in stage one.
// lookupCell(signatureId, positionId, status) → a stored cell or null. Facts carry a provenance state (item 5, lint F).
export function readPlan(draw, DEFS, lookupCell = () => null, { question = '', frame = null, userStated = [] } = {}) {
  const k = buildKernel(draw, DEFS);
  const cell = lookupCell(draw.transient, draw.position, draw.status);
  const beinghood = /\b(conscious|a being|really there|anyone home|still in there|is (?:he|she|it) a person|does the part that is me end)\b/i.test(question);
  return {
    arrival: { id: draw.transient, name: k?.signature, class: k?.signatureClass, house: k?.house, stage: k?.stage },
    seat: { id: draw.position, name: k?.seat, house: ARCHETYPES[draw.position]?.house || null, channel: ARCHETYPES[draw.position]?.channel || null, function: ARCHETYPES[draw.position]?.function || null },
    projections: [{
      layer: 'activity', status: draw.status, statusName: k?.statusName, tense: k?.tense?.key, tenseLine: k?.tense?.line,
      mechanism: k?.mechanism, partner: k?.partner, partnerId: k?.partnerId, priority: 1,
      cell: cell ? { tense: cell.tense, verb: cell.verb, place: cell.place, ask: cell.ask, core: cell.core, sheetLine: cell.sheetLine, provenance: cell.provenance } : null,
    }],
    etiology: { what: draw.transient, how: null, how_deep: null },   // reserved (typed, not prose) — item 4
    verdict: beinghood ? { polarity: 'yes', note: 'beinghood question: the house answers yes, once, in the gist; the body opens with the draw' } : null,
    frame: beinghood ? 'beinghood' : (frame || 'ordinary'),
    facts: { USER_STATED: [...userStated], USER_CONFIRMED: [] },
    hypotheses: [],   // READER_HYPOTHESIS entries are added by the live turn and must be confirmed or contradicted before they are facts
    unknown: [],
  };
}

// The read-plan as the block the live Reader receives: the kernel as a FLOOR (item 1), never a script.
export function planBlock(plan) {
  const p = plan.projections[0]; const c = p.cell;
  return [
    `THE FLOOR — what is already true about this card in this seat at this status, settled, so you do not have to work it out or defend it. Stand on it and talk to the person. The mechanism, the partner and the polarity may be kept whole (quoting the map is not reciting a script); everything that connects it to THIS person is yours to write, this once.`,
    `card: ${plan.arrival.name} · seat: ${plan.seat.name} · status: ${p.statusName} · tense: ${p.tenseLine} · medicine: ${String(p.mechanism || '').toUpperCase()} → ${p.partner || 'itself'}`,
    medicineActsLine(p.partnerId) || null,
    `where this sits in the whole self: the seat ${plan.seat.name} is the ${plan.seat.house || '?'} house's ${plan.seat.function || '?'}${plan.seat.channel ? ` through ${plan.seat.channel}` : ''} — one of the twenty-two parts of a life, not the whole of it; the card arrives from the ${plan.arrival.house || '?'} house${plan.arrival.stage ? ` at its ${plan.arrival.stage}` : ''}; the medicine moves the person toward ${p.partner || 'itself'}. Read this part in the light of the whole person — what is beside it, what it feeds, what it returns to — never as a one-card verdict.`,
    c ? `the cell (its four parts, in their roles) — this is INFERENCE, settled meaning for you to stand on, not a template: re-voice all of it in this person's own nouns and situation, and depart from its words the moment their context gives you truer ones. Two people who draw this should share its truth and almost none of its sentences.\n- tense: ${c.tense}\n- the card, as what it does: ${c.verb}\n- the seat, as where: ${c.place}\n- the ask, from the partner: ${c.ask}` : `(no poured cell for this configuration yet — read from the record beneath)`,
    plan.verdict ? `verdict: ${plan.verdict.polarity} — ${plan.verdict.note}` : null,
    `frame: ${plan.frame}`,
    plan.facts.USER_STATED.length ? `what the person has said (USER_STATED): ${plan.facts.USER_STATED.join(' | ')}` : `what the person has said: nothing yet — the opening asks; it does not guess.`,
  ].filter(Boolean).join('\n');
}
