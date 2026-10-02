// lib/bakeoff/providers.js
// THE FAN-OUT — one call shape, two providers. Anthropic exactly as app/api/reading/route.js sends
// it (cached system blocks, 1h-TTL beta header). DeepSeek through its Anthropic-format endpoint
// (https://api.deepseek.com/anthropic) — same request body; its docs say cache_control is IGNORED,
// so the blocks are sent anyway and the returned `usage` is logged as the evidence.
//
// NOTHING HERE IS REACHABLE FROM A USER'S READING. The bench is admin-gated; the reader's routes
// never import this file.

import { fetchWithRetry } from '../fetchWithRetry.js';
import { buildCachedSystem, ANTHROPIC_BETA_HEADERS } from '../cachedSystem.js';
import { MODEL_IDS, MODEL_PRICING, CACHE_READ, CACHE_WRITE_1H } from '../modelConfig.js';

// The lanes a judge may check. `thinking` lanes exist only so the like-for-like (non-thinking)
// lane is never mistaken for the whole comparison.
export const BENCH_MODELS = {
  'sonnet':               { label: 'Sonnet 5',                provider: 'anthropic', id: () => MODEL_IDS.sonnet, priceKey: 'sonnet' },
  'haiku':                { label: 'Haiku 4.5',               provider: 'anthropic', id: () => MODEL_IDS.haiku,  priceKey: 'haiku' },
  'deepseek-flash':       { label: 'deepseek-flash',          provider: 'deepseek',  id: () => 'deepseek-flash',  priceKey: 'deepseek-flash',  thinking: false },
  'deepseek-v4-pro':      { label: 'deepseek-v4-pro',         provider: 'deepseek',  id: () => 'deepseek-v4-pro', priceKey: 'deepseek-v4-pro', thinking: false },
  'deepseek-flash:think': { label: 'deepseek-flash (thinking)',  provider: 'deepseek', id: () => 'deepseek-flash',  priceKey: 'deepseek-flash',  thinking: true },
  'deepseek-v4-pro:think':{ label: 'deepseek-v4-pro (thinking)', provider: 'deepseek', id: () => 'deepseek-v4-pro', priceKey: 'deepseek-v4-pro', thinking: true },
  // .496: the same weights on US hosts, through OpenRouter's Anthropic-format endpoint. Cost comes back
  // in usage.cost, exact; the price table is the fallback.
  'or-v4.1-flash':        { label: 'OpenRouter · v4.1-flash',  provider: 'openrouter', id: () => 'deepseek/deepseek-v4.1-flash', priceKey: 'deepseek/deepseek-v4.1-flash', thinking: false },
  'or-v4-flash':          { label: 'OpenRouter · v4-flash',    provider: 'openrouter', id: () => 'deepseek/deepseek-v4-flash',   priceKey: 'deepseek/deepseek-v4-flash',   thinking: false },
  'or-v4-pro':            { label: 'OpenRouter · v4-pro',      provider: 'openrouter', id: () => 'deepseek/deepseek-v4-pro',     priceKey: 'deepseek/deepseek-v4-pro',     thinking: false },
  // 2026-09-30 (founder: "another round with a different model… up a tier with DeepSeek… MiMo"): the candidates, same lane, same pinning
  'or-mimo-flash':        { label: 'OpenRouter · MiMo v2.6 flash', provider: 'openrouter', id: () => 'xiaomi/mimo-v2.6-flash', priceKey: 'xiaomi/mimo-v2.6-flash', thinking: false },
  'or-mimo-pro':          { label: 'OpenRouter · MiMo v2.6 pro',   provider: 'openrouter', id: () => 'xiaomi/mimo-v2.6-pro',   priceKey: 'xiaomi/mimo-v2.6-pro',   thinking: false },
  'or-kimi-k2.6':         { label: 'OpenRouter · Kimi K2.6',       provider: 'openrouter', id: () => 'moonshotai/kimi-k2.6',    priceKey: 'moonshotai/kimi-k2.6',    thinking: false },
  'or-glm-5.3-flash':     { label: 'OpenRouter · GLM 5.3 flash',   provider: 'openrouter', id: () => 'z-ai/glm-5.3-flash',      priceKey: 'z-ai/glm-5.3-flash',      thinking: false },
  // 2026-09-30 (founder: "what about the llama models?"): Meta's newest open weights, for the same bench
  'or-llama-3.3-70b':     { label: 'OpenRouter · Llama 3.3 70B',   provider: 'openrouter', id: () => 'meta-llama/llama-3.3-70b-instruct', priceKey: 'meta-llama/llama-3.3-70b-instruct', thinking: false },
  'or-llama-4-maverick':  { label: 'OpenRouter · Llama 4 Maverick', provider: 'openrouter', id: () => 'meta-llama/llama-4-maverick',       priceKey: 'meta-llama/llama-4-maverick',       thinking: false },
  // 2026-09-30: the same production lane at a cooler sampling tail (Gemini's tip via the founder): does the garbage sentence come from the tail?
  'or-v4.1-flash:t0.6':   { label: 'OpenRouter · v4.1-flash · temp 0.6', provider: 'openrouter', id: () => 'deepseek/deepseek-v4.1-flash', priceKey: 'deepseek/deepseek-v4.1-flash', thinking: false, temperature: 0.6, top_p: 0.9 },
};
export const OPENROUTER_PRICING = { // USD per 1M, openrouter.ai/api/v1/models 2026-09-20 (fallback only; usage.cost is the truth)
  'deepseek/deepseek-v4.1-flash': { input: 0.30, output: 1.20 }   /* 2026-10-03: was 0.15/0.60 — half the list price; the runner now fetches the live price and treats this as a fallback */,
  'deepseek/deepseek-v4-flash':   { input: 0.04, output: 0.07 },
  'deepseek/deepseek-v4-pro':     { input: 0.42, output: 0.84 },
  'xiaomi/mimo-v2.6-flash': { input: 0.14, output: 0.28 }, 'xiaomi/mimo-v2.6-pro': { input: 0.43, output: 0.87 },   // openrouter.ai list 2026-09-30 (fallback; usage.cost is the truth)
  'moonshotai/kimi-k2.6': { input: 0.65, output: 3.41 }, 'z-ai/glm-5.3-flash': { input: 0.15, output: 0.50 },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.10, output: 0.32 }, 'meta-llama/llama-4-maverick': { input: 0.19, output: 0.65 },
};

// USD per 1M tokens, api-docs.deepseek.com, verified 2026-09-19. Peak = 01:00–04:00 and
// 06:00–10:00 UTC on weekdays (6–9pm and 11pm–3am Pacific — when readings actually happen).
export const DEEPSEEK_PRICING = {
  'deepseek-flash':  { peak: { input: 0.30, output: 1.20, cacheHit: 0.006 }, off: { input: 0.15, output: 0.60, cacheHit: 0.003 } },
  'deepseek-v4-pro': { peak: { input: 1.32, output: 3.96, cacheHit: 0.044 }, off: { input: 0.66, output: 1.98, cacheHit: 0.022 } },
};
export function deepseekIsPeak(date = new Date()) {
  const h = date.getUTCHours(), d = date.getUTCDay();
  const weekday = d >= 1 && d <= 5;
  return weekday && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
}

// USD for one call's usage on one lane. Anthropic: modelConfig's rates (1h cache writes at 2x).
// DeepSeek: input at the full rate, cache hits at the hit rate (if its usage ever reports any).
export function costOf(usage, modelKey, at = new Date()) {
  if (!usage) return 0;
  const m = BENCH_MODELS[modelKey]; if (!m) return 0;
  const inTok = usage.input_tokens || 0, outTok = usage.output_tokens || 0;
  const cw = usage.cache_creation_input_tokens || 0, cr = usage.cache_read_input_tokens || 0;
  if (m.provider === 'anthropic') {
    const p = MODEL_PRICING[m.priceKey];
    return (inTok * p.input + cw * p.input * CACHE_WRITE_1H + cr * p.input * CACHE_READ + outTok * p.output) / 1e6;
  }
  if (m.provider === 'openrouter') {
    if (typeof usage.cost === 'number') return usage.cost; // exact, from the router
    const p = OPENROUTER_PRICING[m.priceKey] || OPENROUTER_PRICING['deepseek/deepseek-v4.1-flash'];
    return ((inTok + cw + cr) * p.input + outTok * p.output) / 1e6;
  }
  const p = DEEPSEEK_PRICING[m.priceKey][deepseekIsPeak(at) ? 'peak' : 'off'];
  return (inTok * p.input + cw * p.input + cr * p.cacheHit + outTok * p.output) / 1e6;
}

function endpointFor(provider) {
  if (provider === 'anthropic') return { url: 'https://api.anthropic.com/v1/messages', key: process.env.ANTHROPIC_API_KEY };
  if (provider === 'openrouter') return { url: 'https://openrouter.ai/api/v1/messages', key: process.env.OPENROUTER_API_KEY };
  // The founder's .env.local spells it DEEPSEEK_API_key; Windows env is case-insensitive, Linux is not — accept both.
  return { url: 'https://api.deepseek.com/anthropic/v1/messages', key: process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_key };
}

// One call. Never throws: a failed lane is a row with `error`, so the other lanes still land.
export async function callModel({ modelKey, system, message, maxTokens }) {
  const m = BENCH_MODELS[modelKey];
  const t0 = Date.now();
  if (!m) return { modelKey, error: `unknown model ${modelKey}`, ms: 0 };
  const { url, key } = endpointFor(m.provider);
  if (!key) return { modelKey, model: m.id(), provider: m.provider, error: `${m.provider} key not configured`, ms: 0 };

  // A THINKING lane gets headroom for its thinking (bench-side only; the prompt is untouched):
  // at the reader's own cap both DeepSeek thinking lanes spent all 1,100 tokens thinking and
  // returned no text (measured 2026-09-19). Non-thinking lanes send the reader's cap exactly.
  const body = {
    model: m.id(),
    max_tokens: maxTokens + (m.thinking ? 6000 : 0),
    system: buildCachedSystem(system),   // the reader's exact cache split, for both providers
    messages: [{ role: 'user', content: message }],
  };
  // DeepSeek defaults to THINKING; the like-for-like lane turns it off explicitly. If the
  // endpoint rejects the field, the call is retried without it and the row says so.
  if (m.provider === 'deepseek' || m.provider === 'openrouter') body.thinking = m.thinking ? { type: 'enabled', budget_tokens: 4096 } : { type: 'disabled' };
  // the reader's own fix (v0.99.451): Sonnet 5 defaults to ADAPTIVE thinking when the field is omitted; the reader runs with it disabled, so the bench measures the reader as it is
  if (m.provider === 'anthropic') body.thinking = { type: 'disabled' };
  if (typeof m.temperature === 'number') body.temperature = m.temperature;   // a lane may set the sampling tail; the reader itself sends none (provider defaults)
  if (typeof m.top_p === 'number') body.top_p = m.top_p;
  // 2026-09-30: the OpenRouter lane is pinned the way production pins it (lib/provider.js .540): the first named host,
  // no router fallbacks, no data collection — so the bench meets the same weights on the same iron the Reader does.
  if (m.provider === 'openrouter' && String(m.id()) === 'deepseek/deepseek-v4.1-flash') {   // the pin is production's pin for ITS model; every other id goes where the router serves it
    const order = (process.env.OPENROUTER_PROVIDER_ORDER || 'Together,Parasail,Novita').split(',').map((x) => x.trim()).filter(Boolean);
    // 2026-10-03: a BATCH (the Pour) has no one waiting, so it may offer the whole named order (cheap hosts first) instead of only the
    // first; the Reader keeps the single-host pin. Set OPENROUTER_BATCH=1 to offer the list. Router fallbacks stay off either way.
    body.provider = { order: process.env.OPENROUTER_BATCH === '1' ? order : [order[0]], allow_fallbacks: false, data_collection: 'deny' };
  }

  const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  if (m.provider === 'anthropic') headers['anthropic-beta'] = ANTHROPIC_BETA_HEADERS;
  if (m.provider === 'openrouter') { headers['Authorization'] = `Bearer ${key}`; headers['HTTP-Referer'] = 'https://www.nirmanakaya.com'; headers['X-Title'] = 'Nirmanakaya bake-off'; }

  let note = '';
  const send = async (b) => {
    const res = await fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(b) });
    return res.json();
  };
  try {
    let data = await send(body);
    if (data?.error && (m.provider === 'deepseek' || m.provider === 'openrouter') && /thinking/i.test(JSON.stringify(data.error))) {
      note = `thinking field rejected (${data.error.message || 'error'}); retried without it`;
      const { thinking, ...rest } = body; data = await send(rest);
    }
    if (data?.error) return { modelKey, model: m.id(), provider: m.provider, error: data.error.message || JSON.stringify(data.error), ms: Date.now() - t0, note };
    if (data?.provider) note = (note ? note + '; ' : '') + `served by ${data.provider}`;   // 2026-10-03: the host that served, for the price check
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text || '').join('\n');
    const thinkingChars = (data.content || []).filter((c) => c.type === 'thinking').reduce((n, c) => n + (c.thinking || '').length, 0);
    return {
      modelKey, model: data.model || m.id(), provider: m.provider,
      text, usage: data.usage || null, ms: Date.now() - t0,
      cost: costOf(data.usage, modelKey), thinkingChars, note,
      stop: data.stop_reason || null,
    };
  } catch (e) {
    return { modelKey, model: m.id(), provider: m.provider, error: e.message, ms: Date.now() - t0, note };
  }
}
