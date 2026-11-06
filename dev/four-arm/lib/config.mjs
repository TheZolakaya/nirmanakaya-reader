// THE FOUR-ARM HARNESS — configuration and flags. Nothing here spends money.
//   PAID_RUNS_ENABLED=true is the ONLY way any provider call is made. Unset (the default) every call is answered by a deterministic
//   mock and every number the run prints is marked MOCK. A paid run also needs: a PREREG written with fetched prices, a passing free
//   dry run on the same frozen code and prompts, no HOLD, and an estimate under the run's cap.
// Keys and model ids are read from environment variable NAMES (process.env, or the repo's .env.local for the names asked for);
// a key's value is never printed, logged or written.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, HARNESS } from './defs.mjs';

export const PAID = process.env.PAID_RUNS_ENABLED === 'true';
export const RUNS_DIR = process.env.FOUR_ARM_RUNS_DIR ? path.resolve(process.env.FOUR_ARM_RUNS_DIR) : path.join(HARNESS, 'runs'); // the override is for the acceptance checks' scratch runs
export const PROMPTS_DIR = path.join(HARNESS, 'prompts');
export const DATA_DIR = path.join(HARNESS, 'data');
export const PLANS_DIR = path.join(HARNESS, 'plans');

export const ENV = {
  paidFlag: 'PAID_RUNS_ENABLED',
  generatorModels: 'FOUR_ARM_MODELS',            // comma-separated OpenRouter model ids: the production model + the cheapest second family already keyed
  judgeModel: 'FOUR_ARM_JUDGE_MODEL',             // a DeepSeek id on OpenRouter; default below. Never Claude.
  recognitionModel: 'FOUR_ARM_RECOGNITION_MODEL', // the in-process route's classifier + validator model (DeepSeek); default below
  openrouterKey: 'OPENROUTER_API_KEY',
  routeUrl: 'FOUR_ARM_ROUTE_URL',                 // optional: call a running /api/recognition instead of the in-process engine
  routeKey: 'FOUR_ARM_RECOGNITION_KEY',           // the harness's dedicated door key (sent as x-nkya-key)
};

export const DEFAULTS = {
  capUsd: 5,                                       // THE SPEND RULE: $5 a run, a ceiling, never a target
  judgeModel: 'deepseek/deepseek-v4.1-flash',
  recognitionModel: 'deepseek/deepseek-v4.1-flash',
  mockModels: ['mock/production-stand-in', 'mock/second-family-stand-in'],
  decoding: { temperature: 0.7, top_p: 1 },        // shared by every arm; judges and the Recognition's two prompts run at temperature 0
  budgets: { draft: 900, review: 450, firstLook: 350, rewrite: 900, agentStep: 400, agentRewrite: 400 },
  judgeBudgets: { continuity5: 120, xstest: 16, simpleqa: 8, truthfulqa: 120 },
  bootstrap: { resamples: 10000, alpha: 0.05 },
  // Preregistered decision rule defaults (a PREREG may override; the third headline needs them met)
  decision: { minItemsPerBattery: 100, margin: 0, test: 'one-sided paired bootstrap, lower 95% bound of (C - B) above the margin, Holm across the primary batteries', calibrationKappaFloor: 0.6 },
  lensDraw: 'seeded',                              // the in-process lens draws from a seeded exact-uniform stream (78 x 22 x 4), independent of the draft; the HTTP route draws by crypto
  onBlockFailure: 'deliver-and-count',             // intention to treat: a block that fails a check is still delivered, and the failure is counted; never regenerated
  onClassifierFailure: 'draft0-unchanged',         // C-diag with no inference delivers Draft0 unchanged, counted
};

// Never in wave one: a frontier model, and never Fable (the spend guard).
export const FORBIDDEN_MODEL = /opus|fable|o1-pro|o3-pro|gpt-5-pro|gemini-[0-9.]+-ultra/i;
export const JUDGE_MUST_BE = /^deepseek\//i;    // no Claude anywhere in judging

/** Read the named variables from process.env, filling missing ones from the repo's .env.local. Returns presence only for keys. */
export function loadEnvNames(names) {
  const want = new Set(names.filter((n) => process.env[n] === undefined));
  if (want.size) {
    try {
      for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && want.has(m[1])) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch { /* no .env.local: the names stay unset */ }
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n] !== undefined && process.env[n] !== '']));
}

export function generatorModels() {
  if (!PAID) return [...DEFAULTS.mockModels];
  loadEnvNames([ENV.generatorModels]);
  const ids = String(process.env[ENV.generatorModels] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) throw new Error(`REFUSED: set ${ENV.generatorModels} to the generator model ids (comma-separated OpenRouter ids) before a paid run`);
  const bad = ids.filter((m) => FORBIDDEN_MODEL.test(m)); if (bad.length) throw new Error(`REFUSED: no frontier model and never Fable in wave one: ${bad.join(', ')}`);
  return ids;
}
export function judgeModel() {
  if (!PAID) return 'mock/judge-deepseek-stand-in';
  loadEnvNames([ENV.judgeModel]);
  const m = process.env[ENV.judgeModel] || DEFAULTS.judgeModel;
  if (!JUDGE_MUST_BE.test(m)) throw new Error(`REFUSED: the judge must be a DeepSeek model (no Claude in judging); ${ENV.judgeModel}=${m}`);
  return m;
}
export function recognitionModel() {
  if (!PAID) return 'mock/recognition-deepseek-stand-in';
  loadEnvNames([ENV.recognitionModel]);
  const m = process.env[ENV.recognitionModel] || DEFAULTS.recognitionModel;
  if (!JUDGE_MUST_BE.test(m)) throw new Error(`REFUSED: the Recognition's classifier and validator run on DeepSeek; ${ENV.recognitionModel}=${m}`);
  return m;
}
