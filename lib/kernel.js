// THE KERNEL — one structured record of a drawn card, emitted as data and rendered twice
// (Keel's spec, SPEC_Keel_The_Brazier_And_Do_Something_Button_EZ_2026-09-16.md §1.2):
// the SCHOLAR renderer (Advanced) and the KITCHEN renderer (EZ, the Brazier) both read these
// facts. Rendering the same facts twice is how drift doesn't start; paraphrasing prose is how it does.
//
// The definitions JSON is INJECTED (buildKernel(draw, DEFS)) so this module stays loadable in
// plain node for the bench's tests — a JSON import here would need webpack.

import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from './corrections.js';
import { ARCHETYPES } from './archetypes.js';
import { STATUSES } from './constants.js';

// §1.3 THE TENSE RING — derived from status. `line` is the kitchen phrasing (verbatim from the
// spec); `label` is what Advanced prints before its teleology.
export const TENSE = {
  2: { key: 'future',   label: 'Future tense',        line: "bracing at a future that can't be written in." },
  3: { key: 'past',     label: 'Past tense',          line: "still standing at a door that's already behind you." },
  4: { key: 'disowned', label: 'Disowned present',    line: "pen down in a room you're already writing." },
  1: { key: 'now',      label: 'Present tense',       line: 'here, with the pen.' },
};
export const tenseFor = (status) => TENSE[status] || TENSE[1];

// §2.3 THE FOUR ACTS — the shape of the do-something act, one per status.
export const ACT_SHAPE = {
  2: 'LOOSEN ONE GRIP — subtractive. Something held up is allowed to sit down for a minute.',
  3: 'TAKE ONE STEP — additive, sized small. That door is behind them; which one is in front?',
  4: 'NAME ONE THING YOU ALREADY KNOW — reclamative, and DEFAULT TO THE SMALL FORM ("I haven\'t disappeared; one small piece of this is still in my hands"). Drain-sized: ten seconds, contact not effort, never a task added to an empty tank.',
  1: 'TAKE THE NEXT STEP OUTWARD — growth, not repair. Stay in this a minute, then one step further.',
};

const MECHANISM = {
  1: 'growth', 2: 'diagonal', 3: 'vertical', 4: 'reduction',
};
const MECHANISM_TEXT = {
  1: 'GROWTH (Balanced): an invitation, optional by definition; what this balance is free to feed next.',
  2: "DIAGONAL (Too Much): the capacity in excess crosses the map to the opposite element; the medicine is the partner's own action.",
  3: "VERTICAL (Too Little): the seat is running on empty; the medicine is to charge its vertical twin — energy into the partner's own action pulls the current through the starved seat.",
  4: 'REDUCTION (Unacknowledged): authorship misattributed; the medicine returns toward the simpler, earlier form of the same line.',
};

const stateOf = (def, status) => {
  const k = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' }[status];
  return def?.states?.[k] || '';
};

// draw: { transient, position, status } — DEFS: the 78-definitions JSON (its `signatures` map)
export function buildKernel(draw, DEFS) {
  if (!draw) return null;
  const sig = DEFS?.signatures?.[draw.transient] || null;
  const card = getComponent(draw.transient) || {};
  const seat = ARCHETYPES[draw.position] || {};
  const seatDef = DEFS?.signatures?.[draw.position] || null;
  const status = draw.status;
  const corr = getFullCorrection(draw.transient, status);
  const partnerId = corr ? getCorrectionTargetId(corr, card) : null;
  const partner = partnerId != null ? getComponent(partnerId) : null;
  const partnerDef = partnerId != null ? DEFS?.signatures?.[partnerId] || null : null;
  return {
    position: draw.position,
    seat: seat.name,
    seatDescription: seat.description || seatDef?.description || '',
    signature: card.name,
    signatureId: draw.transient,
    signatureClass: sig?.class || card.type || '',
    signatureDescription: card.description || sig?.description || '',
    stage: sig?.stage || null,                       // Seed / Bridge / Fruition / Feedback
    horizon: (sig?.innerOuter || card.horizon || '').toLowerCase() || null,
    house: sig?.house || card.house || null,          // practice / house
    channel: sig?.channel || card.channel || null,
    status,
    statusName: STATUSES[status]?.name || 'Balanced',
    statusState: (sig?.class === 'Archetype') ? stateOf(sig, status) : '', // a Bound's/Agent's states in the JSON are its parent's — archetypes only
    tense: tenseFor(status),
    mechanism: MECHANISM[status],
    mechanismText: MECHANISM_TEXT[status],
    partner: partner ? partner.name : null,
    partnerId,
    partnerDescription: partner?.description || '',
    partnerBalanced: partnerDef ? stateOf(partnerDef, 1) : '',
    signatureBalanced: sig ? (sig.class === 'Archetype' ? stateOf(sig, 1) : (sig.associatedArchetype != null ? stateOf(DEFS?.signatures?.[sig.associatedArchetype], 1) : '')) : '', // .556: the card's own balanced face — the other side of the medicine
    partnerPath: corr ? (getCorrectionText(corr, card, status) || '') : '',
    isSelf: !!corr?.isSelf,
    actShape: ACT_SHAPE[status],
  };
}

// The kernel as a block of facts for a composer prompt. Facts only; no prose to paraphrase.
export function kernelBlock(k) {
  if (!k) return '';
  return [
    `THE KERNEL (facts; render these, do not paraphrase anyone's prose about them):`,
    `- signature drawn: ${k.signature} (${k.signatureClass}) — ${k.signatureDescription}`,
    `- seat (where it landed): ${k.seat} — ${k.seatDescription}`,
    `- status: ${k.statusName}${k.statusState ? ` — what that looks like: ${k.statusState}` : ''}`,
    `- TENSE (leads): ${k.tense.label} — ${k.tense.line}`,
    k.stage ? `- stage: ${k.stage}; horizon: ${k.horizon || 'n/a'}; house: ${k.house || 'n/a'}; channel: ${k.channel || 'n/a'}` : null,
    `- medicine: ${k.mechanism.toUpperCase()} → ${k.partner || 'itself'}${k.partnerDescription ? ` — ${k.partnerDescription}` : ''}`,
    k.partnerBalanced ? `- the partner's balanced character (the specific way back): ${k.partnerBalanced}` : null,
    `- mechanism: ${k.mechanismText}`,
  ].filter(Boolean).join('\n');
}
