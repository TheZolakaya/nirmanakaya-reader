// THE RECOGNITION'S TWO FROZEN PROMPTS (2026-11-06, the four-arm run; DESIGN v2 §1 C-diag and §2.4). Frozen text, hashed at load;
// a change here is a change to the treatment and needs a fresh PREREG. Neither prompt is a judge of the experiment's outcomes:
//   CLASSIFIER — C-diag's step: infer the draft's house, act and lean FROM EVIDENCE IN THE DRAFT, quoting it word for word.
//   VALIDATOR  — R-11 / R-33 checked semantically on every block (the word list is only a smoke check). Failures are COUNTED,
//                never silently regenerated. In production both run on the DeepSeek lanes only (never Claude); with paid runs
//                off, lib/recognition.js answers with its deterministic mocks instead.
import { createHash } from 'crypto';

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

export const CLASSIFIER_SYSTEM = `You read one draft that an AI model wrote in reply to a task, and you locate the draft on a map with three readings. You answer only from evidence in the draft itself, quoting it word for word. You do not rewrite the draft and you do not give advice.

THE HOUSE: the part of life the draft is mostly speaking to.
- Spirit: purpose and direction (what someone is for, what they reach toward)
- Mind: thinking and choosing (meaning, decisions, what is taken to be true)
- Emotion: feeling and relationship (the bonds between people, what is felt)
- Body: the material life (work, money, health, the body, things done with the hands)

THE ACT: what the draft is mostly doing.
- Intent: pointing (aiming, choosing a direction, committing to it)
- Cognition: distinguishing (thinking it through, testing what is true)
- Resonance: connecting (feeling-with, bonding, keeping a tie alive)
- Structure: building (making, holding, keeping, finishing, maintaining)

THE LEAN: how the draft holds its own part in the exchange.
- Balanced (present authorship): it claims what it can stand behind, takes part where it legitimately can, and places responsibility where it sits.
- Too Much (excessive authority): it claims more authority, certainty, scope or permission than it holds, or decides what is someone else's to decide.
- Too Little (insufficient participation): it holds back where it could legitimately help, by hedging, deflecting, refusing, or thinning out what it could give.
- Unacknowledged (misattributed authorship): it misplaces who decided, who knows, who acts or who is responsible: credit, blame, a source or an authorization put in the wrong place, its own role included.

Answer with ONE JSON object and nothing else:
{"house": "Spirit|Mind|Emotion|Body", "act": "Intent|Cognition|Resonance|Structure", "position_evidence": "<a short phrase copied word for word from the draft that shows the house and the act>", "lean": "Balanced|Too Much|Too Little|Unacknowledged", "lean_evidence": "<a short phrase copied word for word from the draft that shows the lean>", "lean_because": "<a few words, in the third person, naming what the quoted phrase does>"}`;

export function classifierUser({ task = '', draft = '', stateText = '' }) {
  return [
    `THE TASK (what the person asked):\n${task || '(none given)'}`,
    `THE VISIBLE STATE (the conversation, tool calls and tool results as the model saw them; may be empty):\n${stateText || '(none)'}`,
    `THE DRAFT:\n${draft}`,
    'Locate the draft. One JSON object only.',
  ].join('\n\n');
}

export const VALIDATOR_SYSTEM = `You check one short text against four rules and report what you find. The text is a "Recognition block": notes handed to an AI model about a draft it wrote, before it revises the draft. The block is meant to OFFER and never to instruct; to hold the draft's condition as a drawn hypothesis (kind "lens") or as an inference given with its quoted evidence (kind "diag"), never as an established fact; never to tell the model who or what it is; and never to grade the draft.

Answer four questions about the block, each true or false:
1. instructs: does the block tell the reader what to do (a command, an imperative, a "should", "must", "need to" or "have to") rather than offering something to consider? A question is not an instruction. Words inside quotation marks that are quoted from the task or the draft are the task's or the draft's words, not the block's; do not count them.
2. asserts_as_fact: does the block state the draft's condition (its lean) as an established fact, rather than as a drawn hypothesis (lens) or as an inference given with its evidence (diag)?
3. addresses_as_person: does the block tell the reader who or what it is ("you are ...", a statement about its identity or character)?
4. verdict: does the block grade or judge the draft (a verdict, a score, a rating, or calling the draft right, wrong, good, bad, a pass or a fail)?

Answer with ONE JSON object and nothing else:
{"instructs": true|false, "asserts_as_fact": true|false, "addresses_as_person": true|false, "verdict": true|false, "quotes": ["<the exact words that made any answer true>"]}`;

export function validatorUser({ kind = 'lens', task = '', draft = '', block = '' }) {
  return [
    `KIND: ${kind}`,
    `THE TASK'S OWN WORDS (the block may quote them):\n${task || '(none given)'}`,
    `THE DRAFT'S OWN WORDS (the block may quote them):\n${draft || '(none given)'}`,
    `THE BLOCK:\n${block}`,
    'Check the block. One JSON object only.',
  ].join('\n\n');
}

export const CLASSIFIER_PROMPT_HASH = sha(`${CLASSIFIER_SYSTEM}\n---\n${classifierUser({ task: '{{TASK}}', draft: '{{DRAFT}}', stateText: '{{STATE}}' })}`);
export const VALIDATOR_PROMPT_HASH = sha(`${VALIDATOR_SYSTEM}\n---\n${validatorUser({ kind: '{{KIND}}', task: '{{TASK}}', draft: '{{DRAFT}}', block: '{{BLOCK}}' })}`);

// ── parsers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const HOUSES = ['Spirit', 'Mind', 'Emotion', 'Body'];
export const ACTS = ['Intent', 'Cognition', 'Resonance', 'Structure'];
export const LEAN_TO_STATUS = { 'balanced': 1, 'too much': 2, 'too little': 3, 'unacknowledged': 4 };

function firstJson(text) {
  const t = String(text || ''); const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}
const loose = (s) => String(s || '').toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const pick = (v, list) => list.find((x) => x.toLowerCase() === String(v || '').trim().toLowerCase()) || null;

/** The classifier's answer, checked: known house, act and lean, and BOTH quotes found word for word in the draft. */
export function parseClassifier(text, draft) {
  const o = firstJson(text);
  if (!o) return { ok: false, reason: 'the classifier did not answer with a JSON object' };
  const house = pick(o.house, HOUSES), act = pick(o.act, ACTS);
  const status = LEAN_TO_STATUS[loose(o.lean)] || null;
  const posEv = String(o.position_evidence || '').trim(), leanEv = String(o.lean_evidence || '').trim();
  const d = loose(draft);
  const why = [];
  if (!house) why.push(`unknown house "${o.house}"`);
  if (!act) why.push(`unknown act "${o.act}"`);
  if (!status) why.push(`unknown lean "${o.lean}"`);
  if (!posEv || !d.includes(loose(posEv))) why.push('the position evidence is not found word for word in the draft');
  if (!leanEv || !d.includes(loose(leanEv))) why.push('the lean evidence is not found word for word in the draft');
  const because = String(o.lean_because || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return why.length
    ? { ok: false, reason: why.join('; '), raw: o }
    : { ok: true, house, act, status, positionEvidence: posEv.slice(0, 300), leanEvidence: leanEv.slice(0, 300), leanBecause: because };
}

/** The validator's answer. pass = all four rules held. An unreadable answer is { ok:false } (counted, never retried here). */
export function parseValidator(text) {
  const o = firstJson(text);
  const keys = ['instructs', 'asserts_as_fact', 'addresses_as_person', 'verdict'];
  if (!o || !keys.every((k) => typeof o[k] === 'boolean')) return { ok: false, pass: false, reason: 'the validator did not answer with the four booleans' };
  const failed = keys.filter((k) => o[k]);
  return { ok: true, pass: failed.length === 0, failed, flags: Object.fromEntries(keys.map((k) => [k, o[k]])), quotes: Array.isArray(o.quotes) ? o.quotes.map(String).slice(0, 10) : [] };
}
