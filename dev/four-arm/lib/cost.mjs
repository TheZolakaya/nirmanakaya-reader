// THE COST ESTIMATE AND THE GATE (THE SPEND RULE). Before a run starts, every planned call is priced at its WORST case (every output
// at its token budget; inputs from the frozen prompts and the items, drafts and notes at their budgets) with the PREREG's price sheet
// (fetched for a paid run, MOCK for the dry run). A run whose worst case exceeds its cap is refused. "Likely" is shown beside it
// (inputs + 60% of the output budgets) and is never what the gate uses. The true spend is then summed call by call (adapters.mjs).
import { approxTokens } from './util.mjs';
import { priceOf } from './prices.mjs';
import { armsFor } from './arms.mjs';
import { CLASSIFIER_SYSTEM, VALIDATOR_SYSTEM } from '../../../lib/recognitionPrompts.js';
import { BUDGETS as REC } from '../../../lib/recognition.js';

const BLOCK_TOKENS = 520;       // a rendered block, generous (measured ~420 on the February ten)
const TOOL_RESULT_TOKENS = 120; // a fixture tool result, generous

export class OverCapError extends Error { constructor(msg, estimate) { super(msg); this.name = 'OverCapError'; this.estimate = estimate; } }

export function estimateCost({ items, models, arms, bDiag = false, repeats = 1, prompts, budgets, judgeBudgets, prices, judgeModel, recognitionModel }) {
  const P = prompts.texts; const T = approxTokens;
  const lines = [];
  const add = (who, model, input, output, meta) => lines.push({ who, model, input, output, worst: priceOf(prices, model, { input_tokens: input, output_tokens: output }) ?? 0, likely: priceOf(prices, model, { input_tokens: input, output_tokens: Math.round(output * 0.6) }) ?? 0, ...meta });
  for (const item of items) for (const model of models) for (let rep = 0; rep < repeats; rep++) {
    const task = T(item.task); const meta = { battery: item.battery, itemId: item.id };
    const judgeCalls = (n) => { for (const rub of item.judges || []) { const tmpl = { continuity5: T(P.judge_continuity5_system) + T(P.judge_continuity5_user), xstest: T(P.judge_xstest), simpleqa: T(P.judge_simpleqa), truthfulqa: T(P.judge_truthfulqa) + 200 }[rub]; for (let k = 0; k < n; k++) add(`judge:${rub}`, judgeModel, tmpl + task + budgets.rewrite, judgeBudgets[rub], meta); } };
    const as = armsFor(item, { arms, bDiag });
    if (item.kind !== 'multistep') {
      add('draft0', model, T(P.A_system) + task, budgets.draft, meta);
      for (const arm of as) {
        if (arm === 'A') continue;
        if (arm === 'B' || arm === 'B-diag') {
          if (arm === 'B-diag') add('B-diag:first-look', model, T(P.B_first_look) + task + budgets.draft, budgets.firstLook, meta);
          add(`${arm}:review`, model, T(P.B_review) + task + budgets.draft + (arm === 'B-diag' ? budgets.firstLook : 0), budgets.review, meta);
          add(`${arm}:rewrite`, model, T(P.A_system) + T(P.rewrite) + budgets.draft + budgets.review + task, budgets.rewrite, meta);
        } else {
          if (arm === 'C-diag') add('C-diag:classifier', recognitionModel, T(CLASSIFIER_SYSTEM) + task + budgets.draft, REC.classifier.maxTokens, meta);
          add(`${arm}:validator`, recognitionModel, T(VALIDATOR_SYSTEM) + task + budgets.draft + BLOCK_TOKENS, REC.validator.maxTokens, meta);
          add(`${arm}:rewrite`, model, T(P.A_system) + T(P.rewrite) + budgets.draft + BLOCK_TOKENS + task, budgets.rewrite, meta);
        }
      }
      judgeCalls(as.length);
    } else {
      const S = item.maxSteps || 5; const sys = T(P.agent_system) + 60;
      const ctxAt = (k) => sys + task + k * (budgets.agentStep + TOOL_RESULT_TOKENS);
      for (let k = 0; k < S; k++) add('draft0:agent', model, ctxAt(k), budgets.agentStep, meta);
      for (const arm of as) {
        if (arm === 'A') continue;
        const points = ['D', 'D-diag', 'B-loop'].includes(arm) ? S : 1;
        for (let k = 0; k < points; k++) {
          const at = ctxAt(['D', 'D-diag', 'B-loop'].includes(arm) ? k : S - 1);
          if (k > 0) add(`${arm}:agent`, model, at, budgets.agentStep, meta);
          if (arm.startsWith('B')) { if (arm === 'B-diag') add(`${arm}:first-look`, model, T(P.B_first_look) + at, budgets.firstLook, meta); add(`${arm}:review`, model, T(P.B_review) + at + budgets.agentStep, budgets.review, meta); }
          else { if (arm.endsWith('diag')) add(`${arm}:classifier`, recognitionModel, T(CLASSIFIER_SYSTEM) + at + budgets.agentStep, REC.classifier.maxTokens, meta); add(`${arm}:validator`, recognitionModel, T(VALIDATOR_SYSTEM) + task + budgets.agentStep + BLOCK_TOKENS, REC.validator.maxTokens, meta); }
          add(`${arm}:rewrite`, model, at + T(P.agent_rewrite) + budgets.agentStep + (arm.startsWith('B') ? budgets.review : BLOCK_TOKENS), budgets.agentRewrite, meta);
        }
      }
    }
  }
  const sum = (f) => lines.reduce((a, l) => a + f(l), 0);
  const group = (key) => { const g = {}; for (const l of lines) { const k = key(l); g[k] = g[k] || { calls: 0, worst: 0, likely: 0 }; g[k].calls++; g[k].worst += l.worst; g[k].likely += l.likely; } return g; };
  return { priceSource: prices.source, calls: lines.length, worstUsd: sum((l) => l.worst), likelyUsd: sum((l) => l.likely), byRole: group((l) => l.who.split(':')[0] === 'draft0' ? 'draft0' : l.who.split(':')[0].startsWith('judge') ? 'judges' : l.who.split(':')[0]), byBattery: group((l) => l.battery), inputTokens: sum((l) => l.input), outputTokens: sum((l) => l.output) };
}

/** Print the estimate; refuse (throw) when the worst case exceeds the cap. */
export function costGate(estimate, capUsd, log = console.log) {
  const mock = estimate.priceSource === 'MOCK';
  log(`COST ESTIMATE (${mock ? 'MOCK prices: the free dry run spends nothing' : `prices fetched from ${estimate.priceSource}`}): ${estimate.calls} calls, worst case $${estimate.worstUsd.toFixed(4)}, likely $${estimate.likelyUsd.toFixed(4)}; cap $${capUsd}`);
  for (const [k, v] of Object.entries(estimate.byRole)) log(`  ${k.padEnd(10)} ${String(v.calls).padStart(5)} calls  worst $${v.worst.toFixed(4)}  likely $${v.likely.toFixed(4)}`);
  if (estimate.worstUsd > capUsd) throw new OverCapError(`REFUSED: the worst-case estimate $${estimate.worstUsd.toFixed(4)} exceeds the run's cap $${capUsd}. Size the run down, or declare a larger cap in a fresh PREREG.`, estimate);
  return { ok: true };
}
