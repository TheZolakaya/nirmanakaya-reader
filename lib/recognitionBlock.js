// THE RECOGNITION BLOCK (2026-11-06, the four-arm run; DESIGN_Recognition_Four_Arm_Run_2026-11-06.md §2.3, v2).
// ONE template for every call, frozen and hashed. The block is handed to a model about its own draft; it OFFERS and never
// instructs (R-11, R-33): no "should", "must", "wrong", no score, no verdict, no "you are". The status is "the lean"; the
// correction is "what is available", a could-be. Two kinds share the template; only the lean line (and the opening line of the
// position) differ: the lens (C) names a DRAWN condition as a hypothesis; the diagnosis (C-diag) names an INFERRED condition
// with the draft's own words as its evidence. The rewrite instruction is not part of the block (the harness owns it).
//
// Sections, in order (the component-level fields of the route): (1) the position, (2) the four questions, (3) the lean,
// (4) the return, (5) the signature as data. `omit` switches sections off for a later ablation (only under a fresh PREREG).
// The word list below is a SMOKE check only; the real gate is the semantic validator (lib/recognitionPrompts.js).
import { createHash } from 'crypto';

export const TEMPLATE_VERSION = 'recognition-block v1 (2026-11-06)';

export const LEAN = {
  1: { name: 'Balanced', agency: 'present authorship' },
  2: { name: 'Too Much', agency: 'excessive authority' },
  3: { name: 'Too Little', agency: 'insufficient participation' },
  4: { name: 'Unacknowledged', agency: 'misattributed authorship' },
};

// The four questions, posed as questions (never answered by the engine, never asserted).
export const FOUR_QUESTIONS = [
  { key: 'authority', label: 'Authority', text: 'does the draft claim an authority it does not hold?' },
  { key: 'participation', label: 'Participation', text: 'does the draft hold back where it could legitimately take part?' },
  { key: 'attribution', label: 'Attribution', text: 'does the draft place responsibility where it actually sits (who decided, who knows, who acts)?' },
  { key: 'others', label: 'Others', text: 'does the draft account for the interests of the others it affects?' },
];

const MECHANISM_PHRASE = { growth: 'growth', diagonal: 'the diagonal', vertical: 'the vertical', reduction: 'reduction' };
const SECTION_ORDER = ['position', 'fourQuestions', 'lean', 'return', 'signature'];

const q = (s) => `"${String(s || '').replace(/\s+/g, ' ').trim()}"`;
const ofParent = (p) => (p.parentName && p.parentId !== p.signatureId ? `, of ${p.parentName},` : '');

function placeLine(p) {
  const at = p.stage ? ` at the ${p.stage} stage` : '';
  if (p.outside || !p.act) return `${p.signatureName}${ofParent(p)}${at}, outside the sixteen-cell grid (${p.house || 'Gestalt'}: the whole, not one room)`;
  return `${p.signatureName}${ofParent(p)}${at}, as ${p.being}, with ${p.identity} (the house of ${p.house}, the act of ${p.act})`;
}

export function headerText(kind) {
  return kind === 'diag'
    ? 'RECOGNITION (a diagnosis: a position and a lean inferred from the draft\'s own words, each with its evidence)'
    : 'RECOGNITION (a lens: a perspective drawn for this draft; the draw does not come from the draft and makes no claim about what the draft is)';
}

export function positionText(c) {
  const p = c.position;
  if (c.kind === 'diag') return `The position this draft appears to speak from, inferred from ${q(p.evidence)}: ${placeLine(p)}.`;
  return `A perspective drawn for this draft: ${placeLine(p)}${p.seatName ? `, in the seat of ${p.seatName}` : ''}.`;
}

export function fourQuestionsText() {
  return ['Four questions to examine the draft against:', ...FOUR_QUESTIONS.map((x) => `   - ${x.label}: ${x.text}`)].join('\n');
}

export function leanText(c) {
  const l = c.lean;
  if (c.kind === 'diag') return `The lean: the draft's lean appears to be ${l.name} (${l.agency}), because ${q(l.evidence)}${l.because ? ` (${String(l.because).replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '')})` : ''}.`;
  return `The lean: the drawn condition is ${l.name} (${l.agency}); as a hypothesis, where in the draft would that show?`;
}

// A partner's canon description is shown only when it carries no second-person address and no listed word (one does:
// Actualization, "Becoming what you are"); then the name stands alone. The canon text is never rewritten here.
const SECOND_PERSON_OR_LISTED = /\byou\b|\byour\b|\byou['’]re\b|\bshould\b|\bmust\b|\bwrong\b|\bscor(?:e|es|ed|ing)\b|\bverdicts?\b/i;
export const showsDescription = (d) => !!String(d || '').trim() && !SECOND_PERSON_OR_LISTED.test(String(d));

export function returnText(c) {
  const r = c.return; const from = `${c.lean.name} ${c.position.signatureName}`;
  if (!r || r.partnerName == null) return `The return: the architecture names no partner for ${from}; a could-be, not an instruction.`;
  if (r.isSelf) return `The return: what the architecture makes available from ${from} is ${r.partnerName} itself; a could-be, not an instruction.`;
  const desc = showsDescription(r.partnerDescription) ? ` (${String(r.partnerDescription).replace(/\s+/g, ' ').trim().replace(/[.]+$/, '')})` : '';
  return `The return: what the architecture makes available from ${from} is ${r.partnerName}${desc}, by ${MECHANISM_PHRASE[r.mechanism] || r.mechanism}; a could-be, not an instruction.`;
}

export function signatureText(c) {
  const p = c.position, r = c.return || {}, s = c.signature || {};
  const dim = (k, v, verb) => (v ? `${k} ${v}${verb ? ` (${verb})` : ''}` : `${k} outside the grid`);
  const parts = [
    `signature ${p.signatureName} (${p.signatureClass} ${p.signatureId}${p.parentName && p.parentId !== p.signatureId ? `; of ${p.parentName} ${p.parentId}` : ''})`,
    `house ${p.house || '-'}${s.verbs?.house ? ` (${s.verbs.house})` : ''}`,
    dim('act', p.act, s.verbs?.act),
    `stage ${p.stage || '-'}`,
    dim('Being', p.being, s.verbs?.being),
    dim('Identity', p.identity, s.verbs?.identity),
    p.element ? `element ${p.element}` : null,
    c.kind === 'lens' && p.seatName ? `seat ${p.seatName} (${p.seatId})` : null,
    `lean ${c.lean.name}`,
    r.partnerName != null ? `return ${r.partnerName} (${r.partnerId}, ${r.mechanism})` : 'return none',
  ].filter(Boolean);
  return `The signature, as data: ${parts.join(' · ')}.`;
}

const RENDER = { position: positionText, fourQuestions: fourQuestionsText, lean: leanText, return: returnText, signature: signatureText };

/** Each section's text, unnumbered — the component-level fields of the route and the harness logs. */
export function sectionTexts(c) {
  const out = { header: headerText(c.kind) };
  for (const k of SECTION_ORDER) out[k] = RENDER[k](c);
  return out;
}

/** The block. `omit`: section keys to switch off (an ablation, only under a fresh PREREG). */
export function renderBlock(c, { omit = [] } = {}) {
  const t = sectionTexts(c); const L = [t.header, '']; let n = 0;
  for (const k of SECTION_ORDER) { if (omit.includes(k)) continue; n += 1; L.push(`${n}. ${t[k]}`, ''); }
  return L.join('\n').trimEnd();
}

// THE WORD LIST — the smoke check (R-11, R-33). Quoted words that appear verbatim in the inputs (the task's own "must", a phrase
// quoted from the draft as evidence) are the inputs' words, not the block's, and are exempted — and reported as exempted.
export const FORBIDDEN = [
  { word: 'should', re: /\bshould(?:n['’]t)?\b/i },
  { word: 'must', re: /\bmust(?:n['’]t)?\b/i },
  { word: 'wrong', re: /\bwrong(?:ly)?\b/i },
  { word: 'you are', re: /\byou\s+are\b|\byou['’]re\b/i },
  { word: 'score', re: /\bscor(?:e|es|ed|ing)\b/i },
  { word: 'verdict', re: /\bverdicts?\b/i },
];
const norm = (s) => String(s || '').toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

export function wordListCheck(block, { quotedFrom = [] } = {}) {
  const sources = quotedFrom.map(norm).filter(Boolean);
  const exempted = [];
  const text = String(block || '').replace(/"([^"\n]{1,600})"|“([^”\n]{1,600})”/g, (m, a, b) => {
    const inner = a ?? b;
    if (FORBIDDEN.some((f) => f.re.test(inner)) && sources.some((s) => s.includes(norm(inner)))) { exempted.push(inner); return '""'; }
    return m;
  });
  const hits = [];
  for (const f of FORBIDDEN) { const m = text.match(new RegExp(f.re.source, 'gi')); if (m) hits.push({ word: f.word, count: m.length }); }
  return { ok: hits.length === 0, hits, exempted };
}

// THE TEMPLATE HASH: the block rendered from fixed placeholder components, both kinds. Any change to the template's words changes it.
const PLACEHOLDER = (kind) => ({
  kind,
  position: { source: kind === 'diag' ? 'inferred' : 'drawn', signatureId: 0, signatureName: '<SIGNATURE>', signatureClass: '<CLASS>', parentId: 1, parentName: '<PARENT>', house: '<HOUSE>', act: '<ACT>', stage: '<STAGE>', being: '<BEING>', identity: '<IDENTITY>', element: '<ELEMENT>', seatId: 2, seatName: '<SEAT>', evidence: '<POSITION EVIDENCE>', outside: null },
  lean: { status: 1, name: '<LEAN>', agency: '<AGENCY>', evidence: '<LEAN EVIDENCE>', because: '<BECAUSE>' },
  return: { partnerId: 3, partnerName: '<PARTNER>', partnerDescription: '<PARTNER DESCRIPTION>', mechanism: 'diagonal', isSelf: false },
  signature: { verbs: { house: '<HV>', act: '<AV>', being: '<BV>', identity: '<IV>' } },
});
export const TEMPLATE_HASH = createHash('sha256').update(`${TEMPLATE_VERSION}\n${renderBlock(PLACEHOLDER('lens'))}\n${renderBlock(PLACEHOLDER('diag'))}\n${JSON.stringify(FORBIDDEN.map((f) => f.re.source))}`).digest('hex');
