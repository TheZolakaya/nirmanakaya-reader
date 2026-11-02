// HOTFIX 0.99.796 (2026-11-02): the medicine judge is DeepSeek only. Offline selftest: fetch is stubbed, placeholder keys only, nothing
// leaves the machine. Run: npx tsx scripts/judge_lanes_selftest.mjs
const { JUDGE_LANES, judgeMedicineAct } = await import('../lib/bakeoff/medicineJudge.js');
const { callProvider } = await import('../lib/provider.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');

let pass = 0, fail = 0;
const ok = (cond, what, detail = '') => { if (cond) { pass++; console.log(`PASS  ${what}`); } else { fail++; console.log(`FAIL  ${what}  ${detail}`); } };

// 1. the judge's lanes are DeepSeek hosts only
ok(Array.isArray(JUDGE_LANES) && JUDGE_LANES.length > 0 && JUDGE_LANES.every((l) => l === 'openrouter' || l === 'deepseek'), 'JUDGE_LANES are DeepSeek hosts only', JSON.stringify(JUDGE_LANES));

// a stubbed network: every request fails; the URLs are recorded
const saved = { fetch: globalThis.fetch, lanes: process.env.READER_LANES, ds: process.env.DEEPSEEK_API_KEY, or: process.env.OPENROUTER_API_KEY, an: process.env.ANTHROPIC_API_KEY };
let urls = [];
globalThis.fetch = async (u) => { urls.push(String(u)); return { ok: false, status: 599, json: async () => ({ error: { message: 'stubbed' } }), text: async () => 'stubbed', headers: { get: () => null } }; };
process.env.DEEPSEEK_API_KEY = 'selftest-placeholder'; process.env.OPENROUTER_API_KEY = 'selftest-placeholder'; process.env.ANTHROPIC_API_KEY = 'selftest-placeholder';
process.env.READER_LANES = 'openrouter,deepseek,anthropic';
const body = { model: 'claude-sonnet-5', max_tokens: 12, messages: [{ role: 'user', content: 'selftest' }] };
const anthropicHit = () => urls.some((u) => /anthropic\.com/.test(u));

try {
  // 2. an only-list without Anthropic: both DeepSeek lanes tried, Anthropic never reached, no answer
  urls = [];
  const r = await callProvider(body, { tag: 'selftest', only: ['openrouter', 'deepseek'] });
  ok(urls.length > 0 && !anthropicHit() && r.provider !== 'anthropic' && r.ok === false && r.data?.error, 'callProvider only:[openrouter, deepseek] with every lane down: no Claude, an error back', JSON.stringify({ urls, provider: r.provider, ok: r.ok }));

  // 3. the judge itself, every DeepSeek lane down: UNCERTAIN, never a certification, never Claude
  urls = [];
  const partnerId = Object.keys(MEDICINE_ACTS).map(Number).find((k) => MEDICINE_ACTS[k]);
  const j = await judgeMedicineAct({ medicine: 'What is ready over there is the good news itself, shared on the day it lands.', partnerId });
  ok(j.verdict === 'UNCERTAIN', 'judge with no DeepSeek lane answering → UNCERTAIN', `verdict ${j.verdict}`);
  ok(!anthropicHit(), 'the judge never reached the Anthropic rung', JSON.stringify(urls));

  // 4. every other caller is unchanged: with no only-list, the ladder still ends on Anthropic
  urls = [];
  await callProvider(body, { tag: 'selftest' }).catch(() => null);
  ok(anthropicHit(), 'a caller with no only-list still falls through to Anthropic (unchanged)', JSON.stringify(urls));
} finally {
  globalThis.fetch = saved.fetch;
  for (const [k, v] of [['READER_LANES', saved.lanes], ['DEEPSEEK_API_KEY', saved.ds], ['OPENROUTER_API_KEY', saved.or], ['ANTHROPIC_API_KEY', saved.an]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
}

console.log(`\n${pass} PASS, ${fail} FAIL${fail ? '' : ' — all passed'}`);
process.exit(fail ? 1 : 0);
