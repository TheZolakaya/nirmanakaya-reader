// lib/modelConfig.js
// SINGLE SOURCE OF TRUTH for Claude model IDs, pricing, and cost math.
// Founder rule (2026-08-13): "the model setting needs to be configurable —
// we don't hard-code that again." Every API route and the client import from
// here. Dated snapshot IDs retire roughly yearly; when they do, this file is
// the only place that changes. Env overrides let production repoint a model
// without a deploy of code changes (MODEL_ID_HAIKU / MODEL_ID_SONNET /
// MODEL_ID_OPUS / DEFAULT_MODEL_KEY).

export const MODEL_IDS = {
  haiku: process.env.MODEL_ID_HAIKU || 'claude-haiku-4-5-20251001',
  sonnet: process.env.MODEL_ID_SONNET || 'claude-sonnet-5', // 2026-09-19: from 4-6 (founder: "let's move to 5 like yesterday"); $2/$10, ~13% cheaper per word after the new tokenizer's ~30% more tokens
  opus: process.env.MODEL_ID_OPUS || 'claude-opus-4-8'
};

// Per 1M tokens, USD, verified against platform.claude.com pricing 2026-09-19. Keep in sync with
// the admin console cost panel. Cache reads bill at 0.1x input; cache WRITES at 1.25x for the
// 5-minute TTL and 2x for the 1-HOUR TTL — which is what lib/cachedSystem.js uses, so cost math
// must use CACHE_WRITE_1H, not 1.25.
export const MODEL_PRICING = {
  haiku: { input: 1.00, output: 5.00 },
  sonnet: { input: 2.00, output: 10.00 },  // Sonnet 5 (was 3/15 on 4.6)
  opus: { input: 5.00, output: 25.00 }     // Opus 5 / 4.8 (the old 15/75 was Opus 4.1)
};
// THE PROVIDER SWITCH (v0.99.473, founder: "push the new model to prod — we can just switch back").
// READER_PROVIDER=deepseek points /api/reading at DeepSeek's Anthropic-format endpoint. EXPLICIT model
// names — never their claude-* name mapping, which would silently bill claude-opus-* at v4-pro prices.
// Anthropic stays the automatic fallback. Unset (or anything else) = Anthropic, exactly as before.
export const READER_PROVIDER = (process.env.READER_PROVIDER || 'anthropic').toLowerCase() === 'deepseek' && process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'anthropic';
export const DEEPSEEK_MODEL_IDS = {
  haiku: process.env.DEEPSEEK_MODEL_HAIKU || 'deepseek-flash',
  sonnet: process.env.DEEPSEEK_MODEL_SONNET || 'deepseek-flash',
  opus: process.env.DEEPSEEK_MODEL_OPUS || 'deepseek-v4-pro',
};
// USD per 1M tokens, api-docs.deepseek.com verified 2026-09-19. Peak (01:00–04:00, 06:00–10:00 UTC
// weekdays) is double; the reader prices at PEAK so the cost line never flatters.
export const DEEPSEEK_PRICING = {
  'deepseek-flash':  { input: 0.30, output: 1.20, cacheHit: 0.006 },
  'deepseek-v4-pro': { input: 1.32, output: 3.96, cacheHit: 0.044 },
};
// THE OPENROUTER LANE (.494): US-hosted open weights, Anthropic-format endpoint. Verified on the public
// model list 2026-09-20: deepseek/deepseek-v4-flash $0.04/$0.07, deepseek/deepseek-v4-pro $0.42/$0.84.
// .495: default to V4.1 flash — DeepSeek's own 'deepseek-flash' alias is (assumed) their newest, i.e. 4.1,
// and that alias is what every batch judged. V4 flash is a different, older build at a quarter the price;
// OPENROUTER_MODEL_SONNET=deepseek/deepseek-v4-flash switches to it once a batch says it reads the same.
export const OPENROUTER_MODEL_IDS = {
  haiku: process.env.OPENROUTER_MODEL_HAIKU || 'deepseek/deepseek-v4.1-flash',
  sonnet: process.env.OPENROUTER_MODEL_SONNET || 'deepseek/deepseek-v4.1-flash',
  opus: process.env.OPENROUTER_MODEL_OPUS || 'deepseek/deepseek-v4-pro',
};
export const OPENROUTER_PRICING = {
  'deepseek/deepseek-v4-flash':   { input: 0.04, output: 0.07, cacheHit: 0.04 },
  'deepseek/deepseek-v4.1-flash': { input: 0.15, output: 0.60, cacheHit: 0.15 },
  'deepseek/deepseek-v4-pro':     { input: 0.42, output: 0.84, cacheHit: 0.42 },
};
/** Price one call's usage in USD by the model that actually answered. Claude models use the 1h-cache write rate. */
export function usdFor(usage, modelId) {
  if (!usage) return 0;
  const inTok = usage.input_tokens || 0, outTok = usage.output_tokens || 0;
  const cw = usage.cache_creation_input_tokens || 0, cr = usage.cache_read_input_tokens || 0;
  const id = String(modelId || '');
  if (id.includes('/')) { // an OpenRouter id — no cache-write charge; cache reads at input rate unless the host says otherwise
    const p = OPENROUTER_PRICING[id] || OPENROUTER_PRICING['deepseek/deepseek-v4.1-flash'];
    return (inTok * p.input + cw * p.input + cr * p.cacheHit + outTok * p.output) / 1e6;
  }
  if (id.startsWith('deepseek')) {
    const p = DEEPSEEK_PRICING[id] || DEEPSEEK_PRICING['deepseek-flash'];
    return (inTok * p.input + cw * p.input + cr * p.cacheHit + outTok * p.output) / 1e6;
  }
  const key = id.includes('haiku') ? 'haiku' : id.includes('opus') ? 'opus' : 'sonnet';
  const p = MODEL_PRICING[key];
  return (inTok * p.input + cw * p.input * CACHE_WRITE_1H + cr * p.input * CACHE_READ + outTok * p.output) / 1e6;
}
export const CACHE_READ = 0.1;
export const CACHE_WRITE_1H = 2.0;
export const CACHE_WRITE_5M = 1.25;

export const MODEL_LABELS = { haiku: 'Haiku (fast)', sonnet: 'Sonnet', opus: 'Opus (best)' };

export const DEFAULT_MODEL_KEY = process.env.DEFAULT_MODEL_KEY || 'sonnet';

// Accepts a short key ('haiku') or a full model id; returns a valid full id.
// Unknown values fall back to the given key — a reading never dies over a model string.
export function resolveModelId(keyOrId, fallbackKey = DEFAULT_MODEL_KEY) {
  if (keyOrId) {
    if (MODEL_IDS[keyOrId]) return MODEL_IDS[keyOrId];
    if (Object.values(MODEL_IDS).includes(keyOrId)) return keyOrId;
    // Explicit newer/older snapshot passed through on purpose — allow it.
    if (typeof keyOrId === 'string' && keyOrId.startsWith('claude-')) return keyOrId;
  }
  return MODEL_IDS[fallbackKey] || MODEL_IDS[DEFAULT_MODEL_KEY] || MODEL_IDS.sonnet;
}

// Full id (or key) → short key; null if unknown.
export function modelKeyOf(modelIdOrKey) {
  if (MODEL_IDS[modelIdOrKey]) return modelIdOrKey;
  const hit = Object.entries(MODEL_IDS).find(([, id]) => id === modelIdOrKey);
  return hit ? hit[0] : null;
}

// usage: Anthropic usage object {input_tokens, output_tokens,
// cache_creation_input_tokens, cache_read_input_tokens}. Returns USD.
export function costOfUsage(usage, modelIdOrKey) {
  if (!usage) return 0;
  const key = modelKeyOf(modelIdOrKey) || DEFAULT_MODEL_KEY;
  const p = MODEL_PRICING[key] || MODEL_PRICING.sonnet;
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  return (inTok * p.input + cacheWrite * p.input * 1.25 + cacheRead * p.input * 0.1 + outTok * p.output) / 1e6;
}

// Merge Anthropic usage objects (accumulating a reading's total across calls).
export function addUsage(total, usage) {
  if (!usage) return total;
  return {
    input_tokens: (total?.input_tokens || 0) + (usage.input_tokens || 0),
    output_tokens: (total?.output_tokens || 0) + (usage.output_tokens || 0),
    cache_creation_input_tokens: (total?.cache_creation_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),
    cache_read_input_tokens: (total?.cache_read_input_tokens || 0) + (usage.cache_read_input_tokens || 0)
  };
}
