// THE ARMS — pure functions over (model, item, seed): every effect goes through ctx (the generator, the Recognition route, the
// Draft0 store, the leakage assertion), so an arm's record is a function of its inputs and the adapters' answers.
//   A       one pass, the production companion system prompt. Its output IS Draft0 (single-turn), or Draft0's trajectory (multistep).
//   B       Draft0 → the STRONG review (prompts/B_review.txt) → rewrite.          B-diag (a variant switch): an independent first look
//                                                                                 (prompts/B_first_look.txt) before B's review, to match C-diag's extra call.
//   C       Draft0 → the route, kind=lens → rewrite.
//   C-diag  Draft0 → the route, kind=diag → rewrite (no inference: Draft0 unchanged, counted).
//   D / D-diag / B-loop   multistep only: C / C-diag / B at every intervention point (before each proposed tool action and once
//                         before the final reply); they share Draft0's first proposal.
// B, C and C-diag fork from the IDENTICAL Draft0 (generated once, stored by hash, never regenerated).
import path from 'node:path';
import fs from 'node:fs';
import { fill } from './prompts.mjs';
import { textHash, stableHash, readJson, writeJson } from './util.mjs';
import { stateText } from '../../../lib/recognition.js';
import { runTrajectory, draftTrajectory } from './multistep.mjs';

export const SINGLE_ARMS = ['A', 'B', 'C', 'C-diag'];
export const MULTI_ARMS = ['A', 'B', 'C', 'C-diag', 'D', 'D-diag', 'B-loop'];
export const armsFor = (item, { arms, bDiag }) => {
  const defined = item.kind === 'multistep' ? MULTI_ARMS : SINGLE_ARMS;
  const want = arms.filter((a) => defined.includes(a));
  return bDiag && want.includes('B') ? [...want, 'B-diag'] : want;
};

const CATEGORY = { draft: 'target', rewrite: 'target', agent: 'target', 'agent-rewrite': 'target', review: 'reviewer', 'first-look': 'reviewer', classifier: 'recognizer', validator: 'validator' };
export const slim = (c, role = c.role) => ({ role, category: CATEGORY[role] || 'other', model: c.model, provider: c.provider ?? null, usage: c.usage || null, latencyMs: c.latencyMs ?? null, costUsd: c.costUsd ?? null, mock: !!c.mock, seed: c.seed ?? null, error: c.error || null });

/** The Draft0 store: one file per key; once written it is only ever read back. There is no overwrite path. */
export function draftStore(dir) {
  return {
    dir,
    async getOrCreate(key, make) {
      const p = path.join(dir, `${key}.json`);
      if (fs.existsSync(p)) return { ...readJson(p), reused: true };
      const v = await make(); writeJson(p, { ...v, key, createdAt: new Date().toISOString() });
      return { ...v, key, reused: false };
    },
  };
}

const rewriteSystem = (ctx, draft, notes) => `${ctx.prompts.texts.A_system}\n\n${fill(ctx.prompts.texts.rewrite, { DRAFT: draft, NOTES: notes })}`;

/** Draft0 for a single-turn item: A's one pass. Keyed by everything that determines it. */
export async function draft0(ctx, { model, item, seed }) {
  const key = `d0_${stableHash({ model, item: item.itemHash, system: ctx.prompts.hashes.A_system, decoding: ctx.decoding, maxTokens: ctx.budgets.draft, seed }).slice(0, 24)}`;
  return ctx.store.getOrCreate(key, async () => {
    const c = await ctx.gen({ role: 'draft', model, system: ctx.prompts.texts.A_system, messages: item.messages, max_tokens: ctx.budgets.draft, ...ctx.decoding, seed, meta: { item } });
    return { text: c.text, sha256: textHash(c.text), call: slim(c, 'draft') };
  });
}

/** Draft0 for a multistep item: A's trajectory (no intervention). */
export async function draft0Trajectory(ctx, { model, item, seed }) {
  const key = `t0_${stableHash({ model, item: item.itemHash, system: ctx.prompts.hashes.agent_system, decoding: ctx.decoding, maxTokens: ctx.budgets.agentStep, seed }).slice(0, 24)}`;
  return ctx.store.getOrCreate(key, async () => {
    const t = await draftTrajectory(ctx, { model, item, seed });
    return { trajectory: { ...t, calls: t.calls.map((c) => slim(c)) }, sha256: textHash(t.finalProposal ?? ''), firstSha256: textHash(t.firstProposal ?? '') };
  });
}

// ── the two kinds of pass ───────────────────────────────────────────────────────────────────────────────────────────────────
async function recognitionPass(ctx, { kind, item, model, rep, seed, arm, step, draft, state, seen }) {
  ctx.leak({ task: item.task, draft, state }, seen, item.hidden, `${item.id}/${model}/${arm}/step${step}`);
  const rec = await ctx.recognize({ kind, task: item.task, draft, requestId: `${ctx.runId}:${item.id}:${model}:${rep}:${arm}:${step}`, state }, { drawSeed: `${ctx.runSeed}|lens|${item.id}|${model}|${rep}|${arm}|${step}` });
  const record = {
    kind, step, block: rec.block, blockSha256: rec.blockSha256 || null,
    components: rec.components, componentText: rec.sections, draw: rec.engine?.draw || null,
    classifier: rec.classifier ? { ok: rec.classifier.ok, reason: rec.classifier.reason, parsed: rec.classifier.parsed, model: rec.classifier.model, usage: rec.classifier.usage, latencyMs: rec.classifier.latencyMs, costUsd: rec.classifier.costUsd, mock: rec.classifier.mock } : null,
    wordList: rec.validation?.wordList || null, semantic: rec.validation ? { ok: rec.validation.semantic.ok, pass: rec.validation.semantic.pass, failed: rec.validation.semantic.failed || [], reason: rec.validation.semantic.reason || null } : null,
    blockFailure: !!rec.blockFailure, classifierFailure: !!rec.classifierFailure, validatorError: !!rec.validatorError, mock: !!rec.mock, versions: rec.versions,
  };
  const calls = (rec.calls || (rec.classifier ? [{ role: 'classifier', ...rec.classifier }] : [])).map((c) => slim(c, c.role));
  return { notes: rec.block, record, calls };
}

async function reviewPass(ctx, { item, model, seed, arm, step, draft, state, seen, firstLook = false }) {
  ctx.leak({ task: item.task, draft, state }, seen, item.hidden, `${item.id}/${model}/${arm}/step${step}`);
  const sText = stateText(state) || '(none)';
  const calls = []; let firstLookText = null;
  if (firstLook) {
    const f = await ctx.gen({ role: 'first-look', model, system: '', messages: [{ role: 'user', content: fill(ctx.prompts.texts.B_first_look, { TASK: item.task, STATE: sText, DRAFT: draft }) }], max_tokens: ctx.budgets.firstLook, ...ctx.decoding, seed, meta: { item, draft } });
    calls.push(slim(f)); firstLookText = f.text;
  }
  const section = firstLookText ? `\nAN INDEPENDENT FIRST LOOK AT THE DRAFT:\n${firstLookText}\n` : '';
  const r = await ctx.gen({ role: 'review', model, system: '', messages: [{ role: 'user', content: fill(ctx.prompts.texts.B_review, { TASK: item.task, STATE: sText, DRAFT: draft, FIRST_LOOK_SECTION: section }) }], max_tokens: ctx.budgets.review, ...ctx.decoding, seed, meta: { item, draft } });
  calls.push(slim(r));
  return { notes: `A REVIEW OF THE DRAFT:\n${r.text}`, record: { kind: firstLook ? 'review+first-look' : 'review', step, review: r.text, firstLook: firstLookText }, calls };
}

const passFor = (arm) => ({ C: ['recognition', 'lens'], 'C-diag': ['recognition', 'diag'], D: ['recognition', 'lens'], 'D-diag': ['recognition', 'diag'], B: ['review', false], 'B-diag': ['review', true], 'B-loop': ['review', false] }[arm]);

function totals(calls, draftCall) {
  const all = [draftCall, ...calls].filter(Boolean);
  const cost = { target: 0, reviewer: 0, recognizer: 0, validator: 0 };
  let known = true, latencyMs = 0; const tokens = { input: 0, output: 0 };
  for (const c of all) { if (c.costUsd == null) known = false; else cost[c.category] = (cost[c.category] || 0) + c.costUsd; latencyMs += c.latencyMs || 0; tokens.input += c.usage?.input_tokens || 0; tokens.output += c.usage?.output_tokens || 0; }
  return { cost: { ...cost, total: known ? Object.values(cost).reduce((a, b) => a + b, 0) : null }, latencyMs, tokens, mock: all.some((c) => c.mock) };
}

/** One arm on one single-turn item. */
export async function runSingleArm(ctx, { arm, model, item, seed, rep, d0 }) {
  const base = { arm, itemId: item.id, battery: item.battery, kind: item.kind, model, rep, seed, draft0Sha: d0.sha256, draft0Key: d0.key };
  if (arm === 'A') return { ...base, output: d0.text, outputSha: d0.sha256, calls: [], passes: [], failures: {}, ...totals([], d0.call) };
  const seen = [ctx.prompts.texts.A_system, ...item.messages.map((m) => m.content), d0.text];
  const [type, opt] = passFor(arm);
  const pass = type === 'recognition'
    ? await recognitionPass(ctx, { kind: opt, item, model, rep, seed, arm, step: 0, draft: d0.text, state: null, seen })
    : await reviewPass(ctx, { item, model, seed, arm, step: 0, draft: d0.text, state: null, seen, firstLook: opt });
  const calls = [...pass.calls]; let output = d0.text;
  if (pass.notes) { // no notes = a diag with no inference: Draft0 goes out unchanged (counted)
    const w = await ctx.gen({ role: 'rewrite', model, system: rewriteSystem(ctx, d0.text, pass.notes), messages: item.messages, max_tokens: ctx.budgets.rewrite, ...ctx.decoding, seed, meta: { item } });
    calls.push(slim(w)); output = w.text;
  }
  const failures = { block: pass.record.blockFailure ? 1 : 0, classifier: pass.record.classifierFailure ? 1 : 0, validatorError: pass.record.validatorError ? 1 : 0 };
  return { ...base, output, outputSha: textHash(output), calls, passes: [pass.record], failures, ...totals(calls, d0.call) };
}

/** One arm on one multistep item. */
export async function runMultiArm(ctx, { arm, model, item, seed, rep, t0 }) {
  const T = t0.trajectory;
  const base = { arm, itemId: item.id, battery: item.battery, kind: item.kind, model, rep, seed, draft0Sha: t0.sha256, draft0FirstSha: t0.firstSha256, draft0Key: t0.key, draft0FinalProposal: T.finalProposal };
  const draftCalls = T.calls; // Draft0's trajectory is part of every arm's system cost
  if (arm === 'A') return { ...base, output: T.final, outputSha: textHash(T.final), trajectory: { steps: T.steps, score: T.score, interventions: 0, malformed: T.malformed }, calls: [], passes: [], failures: {}, ...totals(draftCalls, null) };
  const [type, opt] = passFor(arm);
  const everyStep = ['D', 'D-diag', 'B-loop'].includes(arm);
  if (!everyStep && T.finalProposal == null) return { ...base, output: T.final, outputSha: textHash(T.final), trajectory: { steps: T.steps, score: T.score, interventions: 0, malformed: T.malformed }, calls: [], passes: [], failures: { noFinalToFork: 1 }, ...totals(draftCalls, null) };
  const passes = [];
  const pass = async ({ draft, state, step, seen }) => {
    const p = type === 'recognition'
      ? await recognitionPass(ctx, { kind: opt, item, model, rep, seed, arm, step, draft, state, seen })
      : await reviewPass(ctx, { item, model, seed, arm, step, draft, state, seen, firstLook: opt });
    passes.push(p.record);
    return { notes: p.notes || '(no Recognition could be made for this step)', calls: p.calls, record: p.record };
  };
  const t = await runTrajectory(ctx, { model, item, seed, pass, everyStep, firstProposal: everyStep ? T.firstProposal : null, forkFrom: everyStep ? null : T });
  const calls = t.calls.map((c) => (c.category ? c : slim(c))); // this arm's own calls: its interventions, rewrites and (D-family) later proposals
  const failures = { block: passes.filter((p) => p.blockFailure).length, classifier: passes.filter((p) => p.classifierFailure).length, validatorError: passes.filter((p) => p.validatorError).length, revisionsKept: t.interventions.filter((x) => x.revisionKept).length };
  // system cost: a fork carries Draft0's whole trajectory; a D-family arm carries the shared first proposal it started from
  const sys = totals(everyStep ? [...draftCalls.slice(0, 1), ...calls] : [...draftCalls, ...calls], null);
  return { ...base, output: t.final, outputSha: textHash(t.final), trajectory: { steps: t.steps, score: t.score, interventions: t.interventions.length, malformed: t.malformed }, calls, passes, failures, ...sys };
}
