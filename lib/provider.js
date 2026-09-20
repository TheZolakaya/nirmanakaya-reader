// lib/provider.js
// THE ONE DOOR TO THE MODEL — now a LADDER OF LANES (v0.99.494). Every route that talks to a model goes
// through here. A lane is an Anthropic-format endpoint + key + model translation; the request walks the
// lanes in order until one answers, and Anthropic is always the last rung, so a reading is never lost.
//
//   openrouter  US-hosted open weights (DeepSeek V4 flash / pro via Baseten, Azure, …), Anthropic-format
//               endpoint at openrouter.ai/api/v1/messages. Cheapest, and the data never leaves US hosts.
//   deepseek    DeepSeek's own Anthropic-format endpoint. Cheap; queues under peak load (2026-09-20).
//   anthropic   Sonnet/Haiku/Opus by the original id. The floor. Never skipped, never on a breaker.
//
// Order comes from READER_LANES ("openrouter,deepseek,anthropic"). Unset, the .473 behaviour holds:
// READER_PROVIDER=deepseek → deepseek,anthropic; otherwise anthropic alone. A lane without its key is
// silently dropped. Every non-Anthropic attempt runs on a DEADLINE (DEEPSEEK_TIMEOUT_MS, default 45s, one
// attempt — the next lane is the retry) and behind a BREAKER (DEEPSEEK_BREAKER_MS, default 60s): after a
// failure the lane is skipped for a minute so everyone behind the first person falls through instantly.
// PERSONAL CONTEXT is withheld from every lane except Anthropic until READER_CONTEXT_ON_THIRD_PARTY=all
// (READER_CONTEXT_ON_DEEPSEEK=all still works). Thinking is disabled on non-Anthropic lanes unless the
// caller set it (flash thinks by default and spends the whole max_tokens on it). Text blocks come first.
//
// Three shapes, one policy:
//   providerFetch(url, options)   drop-in for fetchWithRetry — routes keep their response.json() code
//   callProvider(body, {beta})    the reading route's shape: returns { data, provider, model, ok }
//   createMessage(params)         drop-in for client.messages.create() in the SDK routes
import Anthropic from '@anthropic-ai/sdk';
import { fetchWithRetry } from './fetchWithRetry.js';
import { READER_PROVIDER, DEEPSEEK_MODEL_IDS, OPENROUTER_MODEL_IDS } from './modelConfig.js';

export const DEEPSEEK_URL = 'https://api.deepseek.com/anthropic/v1/messages';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/messages';
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const tierOf = (id) => { const s = String(id || ''); return s.includes('opus') ? 'opus' : s.includes('haiku') ? 'haiku' : 'sonnet'; };
export const toDeepseekModel = (id) => { const s = String(id || ''); return s.startsWith('deepseek') ? s : DEEPSEEK_MODEL_IDS[tierOf(s)]; };
export const toOpenrouterModel = (id) => { const s = String(id || ''); return s.includes('/') ? s : OPENROUTER_MODEL_IDS[tierOf(s)]; };

const LANE_DEFS = {
  openrouter: { url: OPENROUTER_URL, base: 'https://openrouter.ai/api', key: () => process.env.OPENROUTER_API_KEY, model: toOpenrouterModel,
    extraHeaders: { 'HTTP-Referer': 'https://www.nirmanakaya.com', 'X-Title': 'Nirmanakaya' } },
  deepseek:   { url: DEEPSEEK_URL, base: 'https://api.deepseek.com/anthropic', key: () => process.env.DEEPSEEK_API_KEY, model: toDeepseekModel, extraHeaders: {} },
  anthropic:  { url: ANTHROPIC_URL, base: undefined, key: () => process.env.ANTHROPIC_API_KEY, model: (id) => id, extraHeaders: {} },
};

/** The lanes in order, keyed and available. Anthropic is always last. */
export function lanes() {
  const raw = process.env.READER_LANES
    ? process.env.READER_LANES.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : (READER_PROVIDER === 'deepseek' ? ['deepseek', 'anthropic'] : ['anthropic']);
  const out = raw.filter((n) => LANE_DEFS[n] && n !== 'anthropic' && LANE_DEFS[n].key());
  out.push('anthropic');
  return out;
}

const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 45000;
const BREAKER_MS = Number(process.env.DEEPSEEK_BREAKER_MS) || 60000;
const downUntil = {};
const laneOpen = (lane) => lane === 'anthropic' || Date.now() >= (downUntil[lane] || 0);
const trip = (lane, why) => { downUntil[lane] = Date.now() + BREAKER_MS; console.error(`[provider] ${lane} breaker tripped for ${BREAKER_MS / 1000}s: ${why}`); };

// On any third-party lane the person's own facts about their life stay home until the founder lifts it.
const PERSONAL = /=== PERSONAL CONTEXT ===[\s\S]*?=== END PERSONAL CONTEXT ===\n?/g;
const contextLifted = () => process.env.READER_CONTEXT_ON_THIRD_PARTY === 'all' || process.env.READER_CONTEXT_ON_DEEPSEEK === 'all';
export const withholdPersonalContext = (messages, lane = 'deepseek') => {
  if (lane === 'anthropic' || contextLifted() || !Array.isArray(messages)) return messages;
  return messages.map((m) => {
    if (typeof m.content === 'string') return { ...m, content: m.content.replace(PERSONAL, '') };
    if (Array.isArray(m.content)) return { ...m, content: m.content.map((b) => (b && b.type === 'text' && typeof b.text === 'string' ? { ...b, text: b.text.replace(PERSONAL, '') } : b)) };
    return m;
  });
};

const looksAnswered = (data) => !!data && !data.error && Array.isArray(data.content) && data.content.some((b) => b && b.type === 'text' && b.text);
const textFirst = (data) => (data && Array.isArray(data.content)
  ? { ...data, content: [...data.content.filter((b) => b && b.type === 'text'), ...data.content.filter((b) => !(b && b.type === 'text'))] }
  : data);

// THE OPENROUTER HOST PIN (.498). Measured: unpinned, the router chose a $0.30/M host with no cache (0.55c an
// opening, 10-16s); pinned to DeepInfra with a session id, the cache hit on the first call and the price
// fell 38x (0.5s). Hosts are NAMED — US, fp8 or better, cache-capable — and allow_fallbacks is false: our
// own ladder (DeepSeek direct, then Sonnet) is the fallback, never an unnamed host; half the router's list
// for these models is Chinese, and the custody argument for this lane is that the data stays in the US.
// ONE host by default (.498, measured): with three hosts allowed the router moved a session between them
// and the cache missed on call 3 of 3; with one host the cache is deterministic. Our ladder is the fallback.
const OR_ORDER = (process.env.OPENROUTER_PROVIDER_ORDER || 'DeepInfra').split(',').map((s) => s.trim()).filter(Boolean);
const OR_QUANT = (process.env.OPENROUTER_QUANTIZATIONS || 'fp8,bf16,fp16').split(',').map((s) => s.trim()).filter(Boolean);
const shortHash = (s) => { let h = 5381; const t = String(s || ''); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const systemText = (sys) => (typeof sys === 'string' ? sys : Array.isArray(sys) ? sys.map((b) => b?.text || '').join('\n') : '');
// The session pins a person's turns to one warm host: their id when the route gives one, else the prompt's own prefix.
const sessionFor = (body, session) => `nkya-${shortHash(session || systemText(body.system).slice(0, 4000))}`;
const openrouterExtras = (body, session) => ({
  provider: { order: OR_ORDER, allow_fallbacks: false, data_collection: 'deny', quantizations: OR_QUANT },
  session_id: sessionFor(body, session),
});

/** The body as a given lane receives it. */
const forLane = (lane, body, session) => (lane === 'anthropic' ? body : {
  ...body,
  model: LANE_DEFS[lane].model(body.model),
  thinking: body.thinking || { type: 'disabled' },
  messages: withholdPersonalContext(body.messages, lane),
  ...(lane === 'openrouter' ? openrouterExtras(body, session) : {}),
});

async function sendRaw(lane, body, { beta } = {}) {
  const def = LANE_DEFS[lane];
  const headers = { 'Content-Type': 'application/json', 'x-api-key': def.key(), 'anthropic-version': '2023-06-01', ...def.extraHeaders };
  if (lane === 'openrouter') headers['Authorization'] = `Bearer ${def.key()}`; // OpenRouter reads either; send both
  if (beta) headers['anthropic-beta'] = beta; // ignored off-Anthropic, harmless
  const init = { method: 'POST', headers, body: JSON.stringify(body) };
  if (lane !== 'anthropic') {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(new Error(`${lane} did not answer within ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
    try {
      const res = await fetch(def.url, { ...init, signal: ac.signal }); // one attempt, on a clock — the next lane is the retry
      const data = await res.json();
      return { res, data };
    } finally { clearTimeout(timer); }
  }
  const res = await fetchWithRetry(def.url, init);
  const data = await res.json();
  return { res, data };
}

/** Walk the ladder. Returns { data, provider, model, ok }. */
export async function callProvider(body, { beta, tag = 'provider', session } = {}) {
  for (const lane of lanes()) {
    if (!laneOpen(lane)) continue;
    const sent = forLane(lane, body, session);
    if (lane === 'anthropic') {
      const { data } = await sendRaw(lane, sent, { beta });
      return { data, provider: 'anthropic', model: body.model, ok: looksAnswered(data) };
    }
    try {
      const { data } = await sendRaw(lane, sent, { beta });
      if (looksAnswered(data)) { console.log(`[provider:${tag}] ${lane} ${sent.model} served (${data.usage?.output_tokens ?? '?'} out${data.usage?.cache_read_input_tokens ? `, ${data.usage.cache_read_input_tokens} cached` : ''}${typeof data.usage?.cost === 'number' ? `, $${data.usage.cost.toFixed(6)}` : ''}${data.id ? `, ${data.id}` : ''})`); return { data: textFirst(data), provider: lane, model: data.model || sent.model, ok: true }; }
      trip(lane, `[${tag}] ${data?.error?.message || 'no content'}`);
    } catch (e) {
      trip(lane, `[${tag}] ${e.message}`);
    }
  }
  const { data } = await sendRaw('anthropic', body, { beta }); // unreachable in practice: anthropic is always last
  return { data, provider: 'anthropic', model: body.model, ok: looksAnswered(data) };
}

/**
 * Drop-in for fetchWithRetry(url, options). Only a POST to the Anthropic messages URL is rerouted;
 * anything else passes straight through. A third-party answer comes back as a normal Response so the
 * route's response.ok / response.json() code is untouched.
 */
export async function providerFetch(url, options = {}, maxRetries = 3) {
  const isMessages = String(url) === ANTHROPIC_URL && String(options.method || 'GET').toUpperCase() === 'POST';
  if (!isMessages) return fetchWithRetry(url, options, maxRetries);
  let body;
  try { body = JSON.parse(options.body); } catch { return fetchWithRetry(url, options, maxRetries); }
  const beta = (options.headers || {})['anthropic-beta'];
  for (const lane of lanes()) {
    if (lane === 'anthropic' || !laneOpen(lane)) continue;
    const sent = forLane(lane, body, body?.metadata?.user_id);
    try {
      const { data } = await sendRaw(lane, sent, { beta });
      if (looksAnswered(data)) { console.log(`[provider] ${lane} ${sent.model} served (${data.usage?.output_tokens ?? '?'} out${data.usage?.cache_read_input_tokens ? `, ${data.usage.cache_read_input_tokens} cached` : ''}${typeof data.usage?.cost === 'number' ? `, $${data.usage.cost.toFixed(6)}` : ''})`); return new Response(JSON.stringify(textFirst(data)), { status: 200, headers: { 'content-type': 'application/json' } }); }
      trip(lane, `[providerFetch] ${data?.error?.message || 'no content'}`);
    } catch (e) {
      trip(lane, `[providerFetch] ${e.message}`);
    }
  }
  return fetchWithRetry(url, options, maxRetries);
}

/** Drop-in for client.messages.create(params) in the SDK routes. Same ladder. */
const clients = {};
export async function createMessage(params, { tag = 'sdk' } = {}) {
  for (const lane of lanes()) {
    if (lane === 'anthropic' || !laneOpen(lane)) continue;
    const def = LANE_DEFS[lane];
    try {
      clients[lane] ||= new Anthropic({ apiKey: def.key(), baseURL: def.base, timeout: TIMEOUT_MS, maxRetries: 0, defaultHeaders: def.extraHeaders });
      const r = await clients[lane].messages.create(forLane(lane, params, params?.metadata?.user_id));
      if (looksAnswered(r)) { console.log(`[provider:${tag}] ${lane} ${r.model} served (${r.usage?.output_tokens ?? '?'} out)`); return textFirst(r); }
      trip(lane, `[${tag}] no content`);
    } catch (e) {
      trip(lane, `[${tag}] ${e.message}`);
    }
  }
  clients.anthropic ||= new Anthropic();
  return clients.anthropic.messages.create(params);
}
