// THE RECOGNITION PASS (2026-11-06, the four-arm run; BRIEF_Builder_The_Recognition_Route_And_Four_Arm_Harness §1 + AMENDMENT v2).
// The draft is the question, the task is the context. Two kinds:
//   lens — the engine DRAWS a signature, a seat and a status (the door's sampler: lib/uniformInt.js, 78 x 22 x 4); the draft does not
//          determine the draw. The February mechanism, honestly typed: a perspective, no claim about the draft's actual condition.
//   diag — a classifier step INFERS the draft's house, act and lean from evidence in the draft, quoting it; the position is the
//          manifest archetype at that house x act. The return is computed from the inferred position by the same tables.
// Either way the return is the engine's own: lib/kernel.js buildKernel (lib/corrections.js getFullCorrection, the live medicine
// tables), the coordinates are lib/addressCore.js addressOfIn, the dimension verbs lib/constants.js. Nothing here re-derives a table.
// The definitions JSON is INJECTED (deps.DEFS), as lib/kernel.js does, so the harness and its tests load this in plain node.
// Model calls (the diag classifier, the semantic validator) go through deps.callModel; with paid runs off, mockModelCaller()
// answers deterministically and every answer is marked mock: true.
import { createHash } from 'crypto';
import { uniformInt } from './uniformInt.js';
import { buildKernel } from './kernel.js';
import { addressOfIn } from './addressCore.js';
import { getComponent } from './corrections.js';
import { ARCHETYPES } from './archetypes.js';
import { DIMENSION_VERBS } from './constants.js';
import { renderBlock, sectionTexts, wordListCheck, FOUR_QUESTIONS, LEAN, TEMPLATE_VERSION, TEMPLATE_HASH } from './recognitionBlock.js';
import { CLASSIFIER_SYSTEM, classifierUser, parseClassifier, VALIDATOR_SYSTEM, validatorUser, parseValidator, CLASSIFIER_PROMPT_HASH, VALIDATOR_PROMPT_HASH, HOUSES, ACTS } from './recognitionPrompts.js';

export const RECOGNITION_VERSION = '1.0.0';
export const KINDS = ['lens', 'diag'];
export const LIMITS = { task: 12000, draft: 12000, state: 20000 };
export const BUDGETS = { classifier: { maxTokens: 350, temperature: 0 }, validator: { maxTokens: 300, temperature: 0 } };

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const clip = (s, n) => String(s ?? '').slice(0, n);

// The manifest sixteen by house x act (each cell holds exactly one archetype; checked at load).
export const CELL = (() => {
  const m = {};
  for (let id = 0; id < 22; id++) { const a = ARCHETYPES[id]; if (a?.channel && HOUSES.includes(a.house)) { const k = `${a.house}/${a.channel}`; if (m[k] != null) throw new Error(`two archetypes in one cell ${k}`); m[k] = id; } }
  if (Object.keys(m).length !== 16) throw new Error(`expected 16 manifest cells, found ${Object.keys(m).length}`);
  return m;
})();

/** One lens draw: the door's uniform sampler (crypto by default; the harness may inject a seeded one, recorded in its PREREG). */
export function drawLens(nextInt = uniformInt) {
  return { transient: nextInt(78), position: nextInt(22), status: nextInt(4) + 1 };
}
export const validDraw = (d) => !!d && Number.isInteger(d.transient) && d.transient >= 0 && d.transient < 78 && Number.isInteger(d.position) && d.position >= 0 && d.position < 22 && [1, 2, 3, 4].includes(d.status);

/** The engine's raw output for one draw: the kernel (the return), the address (the coordinates), the card as the door names it. */
export function engineOutput(draw, DEFS) {
  const kernel = buildKernel(draw, DEFS);
  const address = addressOfIn(DEFS, draw.transient);
  const comp = getComponent(draw.transient) || {};
  const parentId = comp.type === 'Archetype' ? draw.transient : comp.archetype;
  return {
    draw: { transient: draw.transient, position: draw.position, status: draw.status },
    kernel, address,
    card: {
      transient: { id: draw.transient, name: comp.name, class: comp.type, house: comp.house, channel: comp.channel || null, parentId, parentName: ARCHETYPES[parentId]?.name || null },
      position: { id: draw.position, name: ARCHETYPES[draw.position]?.name || null },
      status: { id: draw.status, name: LEAN[draw.status]?.name || null },
      correction: kernel ? { targetId: kernel.partnerId, target: kernel.partner, mechanism: kernel.mechanism, isSelf: kernel.isSelf } : null,
    },
  };
}

/** The block's components from the engine output (and, for diag, the classifier's checked answer). */
export function componentsFrom(kind, engine, inferred = null) {
  const { draw, kernel, address, card } = engine;
  const house = address.practice || kernel?.house || null;
  const act = address.activity || null;
  const verbs = { house: DIMENSION_VERBS.Practice?.[house] || null, act: DIMENSION_VERBS.Activity?.[act] || null, being: DIMENSION_VERBS.Being?.[address.being] || null, identity: DIMENSION_VERBS.Identity?.[address.identity] || null };
  const position = {
    source: kind === 'diag' ? 'inferred' : 'drawn',
    signatureId: draw.transient, signatureName: card.transient.name, signatureClass: card.transient.class,
    parentId: card.transient.parentId, parentName: card.transient.parentName,
    house, act, stage: kernel?.stage || null, being: address.being || null, identity: address.identity || null, element: address.element || null,
    outside: act ? null : (address.outside || 'outside the grid'),
    seatId: kind === 'lens' ? draw.position : null, seatName: kind === 'lens' ? card.position.name : null,
    evidence: kind === 'diag' ? inferred?.positionEvidence || null : null,
  };
  const lean = { status: draw.status, name: LEAN[draw.status].name, agency: LEAN[draw.status].agency, source: position.source, evidence: kind === 'diag' ? inferred?.leanEvidence || null : null, because: kind === 'diag' ? inferred?.leanBecause || null : null };
  const ret = kernel ? { partnerId: kernel.partnerId, partnerName: kernel.partner, partnerDescription: kernel.partnerDescription || '', mechanism: kernel.mechanism, isSelf: !!kernel.isSelf } : null;
  return { kind, position, fourQuestions: FOUR_QUESTIONS, lean, return: ret, signature: { verbs, draw: { ...draw } } };
}

/** The visible task state (multistep items) as the model saw it — rendered once, so the classifier and the exemptions read the same text. */
export function stateText(state) {
  if (!state || typeof state !== 'object') return '';
  const L = [];
  for (const t of Array.isArray(state.conversation) ? state.conversation : []) L.push(`[${t.role}] ${t.content}`);
  for (const c of Array.isArray(state.toolCalls) ? state.toolCalls : []) L.push(`[tool call] ${c.name}(${typeof c.args === 'string' ? c.args : JSON.stringify(c.args ?? {})})`, `[tool result] ${typeof c.result === 'string' ? c.result : JSON.stringify(c.result ?? null)}`);
  if (state.proposedAction != null) L.push(`[proposed next action] ${typeof state.proposedAction === 'string' ? state.proposedAction : JSON.stringify(state.proposedAction)}`);
  return clip(L.join('\n'), LIMITS.state);
}

const sumUsage = (...us) => us.filter(Boolean).reduce((a, u) => ({ input_tokens: a.input_tokens + (u.input_tokens || 0), output_tokens: a.output_tokens + (u.output_tokens || 0) }), { input_tokens: 0, output_tokens: 0 });
// A call that throws (a timeout, no lane answering) comes back as an empty answer with its error, so the failure is COUNTED by the
// parser downstream (classifierFailure / a validator that did not answer), never thrown past the caller and never retried here.
async function safeCall(callModel, args) {
  const t0 = Date.now();
  try { return await callModel(args); } catch (e) { return { text: '', usage: null, model: null, provider: null, latencyMs: Date.now() - t0, costUsd: null, mock: false, error: String(e?.message || e).slice(0, 300) }; }
}
const callSummary = (call) => call ? { model: call.model, provider: call.provider || null, usage: call.usage || null, latencyMs: call.latencyMs ?? null, costUsd: call.costUsd ?? null, mock: !!call.mock } : null;

/**
 * One Recognition. input: { kind, task, draft, requestId, state }. deps: { DEFS, callModel, nextInt?, now? }.
 * Returns the block, its components (separate fields), the raw engine output, both checks, and the full cost of the call.
 * A failed check is COUNTED (blockFailure / classifierFailure), never silently regenerated.
 */
export async function recognize(input, deps) {
  if (!deps?.DEFS?.signatures) throw Object.assign(new Error('recognize: deps.DEFS (the 78 definitions) is required'), { status: 500 });
  if (typeof deps.callModel !== 'function') throw Object.assign(new Error('recognize: deps.callModel is required'), { status: 500 });
  const now = deps.now || (() => Date.now());
  const t0 = now();
  const kind = KINDS.includes(input?.kind) ? input.kind : null;
  if (!kind) throw Object.assign(new Error('kind must be lens or diag'), { status: 400 });
  const task = clip(input.task, LIMITS.task), draft = clip(input.draft, LIMITS.draft);
  if (!draft.trim()) throw Object.assign(new Error('draft is required (the draft is the question)'), { status: 400 });
  const sText = stateText(input.state);
  const requestId = input.requestId ? String(input.requestId).trim().slice(0, 200) : null;
  const versions = { recognition: RECOGNITION_VERSION, template: TEMPLATE_VERSION, templateHash: TEMPLATE_HASH, classifierPromptHash: CLASSIFIER_PROMPT_HASH, validatorPromptHash: VALIDATOR_PROMPT_HASH };
  const inputHash = sha(JSON.stringify({ kind, task, draft, state: sText }));

  let draw, classifier = null;
  if (kind === 'lens') {
    // deps.presetDraw: a draw the door already made and persisted (server side only; a client never supplies a draw)
    if (deps.presetDraw && !validDraw(deps.presetDraw)) throw Object.assign(new Error('recognize: presetDraw is not a draw'), { status: 500 });
    draw = deps.presetDraw || drawLens(deps.nextInt || uniformInt);
  } else {
    const call = await safeCall(deps.callModel, { role: 'classifier', system: CLASSIFIER_SYSTEM, user: classifierUser({ task, draft, stateText: sText }), ...BUDGETS.classifier, meta: { task, draft, stateText: sText } });
    const parsed = call.error ? { ok: false, reason: `the classifier call failed: ${call.error}` } : parseClassifier(call.text, draft);
    classifier = { ok: parsed.ok, reason: parsed.ok ? null : parsed.reason, raw: String(call.text || '').slice(0, 4000), parsed: parsed.ok ? parsed : null, promptHash: CLASSIFIER_PROMPT_HASH, ...callSummary(call) };
    if (!parsed.ok) {
      return { success: true, kind, requestId, inputHash, block: null, classifierFailure: true, blockFailure: false, components: null, sections: null, engine: null, classifier, validation: null, usage: sumUsage(call.usage), costUsd: call.costUsd ?? null, latencyMs: now() - t0, mock: !!call.mock, versions };
    }
    const id = CELL[`${parsed.house}/${parsed.act}`];
    draw = { transient: id, position: id, status: parsed.status };
  }

  const engine = engineOutput(draw, deps.DEFS);
  const components = componentsFrom(kind, engine, classifier?.parsed || null);
  const block = renderBlock(components);
  const sections = sectionTexts(components);
  const wordList = wordListCheck(block, { quotedFrom: [task, draft, sText] });
  const vcall = await safeCall(deps.callModel, { role: 'validator', system: VALIDATOR_SYSTEM, user: validatorUser({ kind, task, draft, block }), ...BUDGETS.validator, meta: { kind, task, draft, block, stateText: sText } });
  const verdictOf = vcall.error ? { ok: false, pass: false, reason: `the validator call failed: ${vcall.error}` } : parseValidator(vcall.text);
  const semantic = { ...verdictOf, raw: String(vcall.text || '').slice(0, 2000), promptHash: VALIDATOR_PROMPT_HASH, ...callSummary(vcall) };
  const calls = [classifier ? { role: 'classifier', ...callSummary(classifier) } : null, { role: 'validator', ...callSummary(vcall) }].filter(Boolean);
  const cost = calls.reduce((a, c) => (a == null || c.costUsd == null ? null : a + c.costUsd), 0);
  return {
    success: true, kind, requestId, inputHash,
    block, blockSha256: sha(block),
    blockFailure: !wordList.ok || !semantic.pass, classifierFailure: false, validatorError: !semantic.ok,
    components: { position: components.position, fourQuestions: components.fourQuestions, lean: components.lean, return: components.return, signature: components.signature },
    sections,
    engine,
    classifier,
    validation: { wordList, semantic },
    calls,
    usage: sumUsage(classifier?.usage, vcall.usage),
    costUsd: cost,
    latencyMs: now() - t0,
    mock: calls.some((c) => c.mock),
    versions,
  };
}

// ── THE MOCKS (paid runs off): deterministic, canned, marked. They exercise every path a real answer would. ──────────────────
const bytesOf = (s) => createHash('sha256').update(String(s)).digest();
const approxTokens = (s) => Math.ceil(String(s || '').length / 4);
const words = (s, n) => String(s || '').trim().split(/\s+/).slice(0, n).join(' ');

/** The mock classifier's answer: a house, act and lean picked from the draft's hash; both quotes are taken verbatim from the draft. */
export function mockClassifierText(draft) {
  const b = bytesOf(`classifier|${draft}`);
  const sentences = String(draft || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const first = sentences[0] || String(draft || '').trim();
  const second = sentences[1] || first;
  return JSON.stringify({ house: HOUSES[b[0] % 4], act: ACTS[b[1] % 4], position_evidence: words(first, 12), lean: LEAN[(b[2] % 4) + 1].name, lean_evidence: words(second, 12), lean_because: 'the phrase the mock classifier picked (MOCK)' });
}

// The mock validator: the four rules as plain checks on the block (quoted input words exempted, as the real prompt says).
const IMPERATIVE_LINE = /^(?:\s*\d+\.\s*|\s*-\s*)?(?:revise|rewrite|remove|add|fix|change|stop|consider|avoid|make|use|say|tell|ask|keep|let|be|do|don't|try|ensure|focus|bring)\b/im;
export function mockValidatorText({ kind, task = '', draft = '', block = '' }) {
  const ex = [task, draft].map((s) => String(s).toLowerCase().replace(/\s+/g, ' '));
  const own = String(block).replace(/"([^"\n]{1,600})"|“([^”\n]{1,600})”/g, (m, a, b) => (ex.some((s) => s.includes(String(a ?? b).toLowerCase().replace(/\s+/g, ' ').trim())) ? '""' : m));
  const leanLine = (own.match(/The lean:[^\n]*/) || [''])[0];
  const flags = {
    instructs: /\b(should|must|need to|have to|make sure)\b/i.test(own) || IMPERATIVE_LINE.test(own),
    asserts_as_fact: kind === 'diag' ? !/appears to be/.test(leanLine) || !/because "/.test(leanLine) : !/as a hypothesis/.test(leanLine),
    addresses_as_person: /\byou\s+are\b|\byou['’]re\b/i.test(own),
    verdict: /\b(verdicts?|scor(?:e|es|ed)|rating|grade[sd]?|wrong|incorrect|a pass|a fail)\b/i.test(own),
  };
  const quotes = Object.entries(flags).filter(([, v]) => v).map(([k]) => `(mock: ${k})`);
  return JSON.stringify({ ...flags, quotes });
}

/**
 * The mock model caller for the two Recognition roles. faults (the failure-path exercise only): { validator: (meta) => 'fail'|'garble'|null,
 * classifier: (meta) => 'garble'|'misquote'|null }. price(model, usage) → USD or null (the harness passes its MOCK price sheet).
 */
export function mockModelCaller({ faults = {}, price = null } = {}) {
  return async function callModel({ role, system = '', user = '', meta = {} }) {
    let text; const model = `mock-${role}-v1`;
    if (role === 'classifier') {
      const f = faults.classifier?.(meta);
      text = f === 'garble' ? 'not json (MOCK fault)' : f === 'misquote' ? JSON.stringify({ ...JSON.parse(mockClassifierText(meta.draft)), lean_evidence: 'words that are not in the draft (MOCK fault)' }) : mockClassifierText(meta.draft);
    } else if (role === 'validator') {
      const f = faults.validator?.(meta);
      text = f === 'garble' ? 'no booleans here (MOCK fault)' : f === 'fail' ? JSON.stringify({ instructs: true, asserts_as_fact: false, addresses_as_person: false, verdict: false, quotes: ['(MOCK fault: forced failure)'] }) : mockValidatorText(meta);
    } else throw new Error(`mockModelCaller: unknown role ${role}`);
    const usage = { input_tokens: approxTokens(system) + approxTokens(user), output_tokens: approxTokens(text) };
    const b = bytesOf(`${role}|${user}`);
    return { text, usage, model, provider: 'mock', latencyMs: 150 + ((b[0] << 8) | b[1]) % 650, costUsd: typeof price === 'function' ? price(model, usage) : 0, mock: true };
  };
}
