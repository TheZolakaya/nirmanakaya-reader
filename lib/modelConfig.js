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
  sonnet: process.env.MODEL_ID_SONNET || 'claude-sonnet-4-6',
  opus: process.env.MODEL_ID_OPUS || 'claude-opus-4-8'
};

// Per 1M tokens, USD. Keep in sync with the admin console cost panel.
// Cache reads bill at 0.1x input; cache writes at 1.25x input.
export const MODEL_PRICING = {
  haiku: { input: 1.00, output: 5.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 }
};

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
