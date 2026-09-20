// lib/provider.js
// THE ONE DOOR TO THE MODEL (v0.99.475). Every route that used to talk to api.anthropic.com goes through
// here. When READER_PROVIDER=deepseek (and a DEEPSEEK_API_KEY exists) the same Anthropic-format request
// is sent to DeepSeek's Anthropic-compatible endpoint with an EXPLICIT DeepSeek model id — never their
// claude-* name mapping, which would silently bill anything opus-named at v4-pro prices. If DeepSeek
// fails (network, 5xx, an error body, no content) the identical request goes to Anthropic with the
// original model, so nothing is ever lost to the cheaper door being shut. Unset = Anthropic, as before.
//
// Three shapes, one policy:
//   providerFetch(url, options)   drop-in for fetchWithRetry — routes keep their response.json() code
//   callProvider(body, {beta})    the reading route's shape: returns { data, provider, model, ok }
//   createMessage(params)         drop-in for client.messages.create() in the SDK routes
import Anthropic from '@anthropic-ai/sdk';
import { fetchWithRetry } from './fetchWithRetry.js';
import { READER_PROVIDER, DEEPSEEK_MODEL_IDS } from './modelConfig.js';

export const DEEPSEEK_URL = 'https://api.deepseek.com/anthropic/v1/messages';
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export const toDeepseekModel = (id) => {
  const s = String(id || '');
  if (s.startsWith('deepseek')) return s;
  if (s.includes('opus')) return DEEPSEEK_MODEL_IDS.opus;
  if (s.includes('haiku')) return DEEPSEEK_MODEL_IDS.haiku;
  return DEEPSEEK_MODEL_IDS.sonnet;
};

// On the DeepSeek route the person's own facts about their life stay home until the founder lifts it
// (READER_CONTEXT_ON_DEEPSEEK=all). Covers string content and text blocks alike.
const PERSONAL = /=== PERSONAL CONTEXT ===[\s\S]*?=== END PERSONAL CONTEXT ===\n?/g;
export const withholdPersonalContext = (messages) => {
  if (READER_PROVIDER !== 'deepseek' || process.env.READER_CONTEXT_ON_DEEPSEEK === 'all') return messages;
  if (!Array.isArray(messages)) return messages;
  return messages.map((m) => {
    if (typeof m.content === 'string') return { ...m, content: m.content.replace(PERSONAL, '') };
    if (Array.isArray(m.content)) return { ...m, content: m.content.map((b) => (b && b.type === 'text' && typeof b.text === 'string' ? { ...b, text: b.text.replace(PERSONAL, '') } : b)) };
    return m;
  });
};

const looksAnswered = (data) => !!data && !data.error && Array.isArray(data.content) && data.content.some((b) => b && b.type === 'text' && b.text);

// The DeepSeek-bound body. Flash THINKS BY DEFAULT when no thinking setting is sent and spends the whole
// max_tokens on it (the same trap that emptied the reader on Sonnet 5, .449–.451) — so a caller that
// set nothing gets thinking disabled here. A caller that set its own keeps it.
const forDeepseek = (body) => ({
  ...body,
  model: toDeepseekModel(body.model),
  thinking: body.thinking || { type: 'disabled' },
  messages: withholdPersonalContext(body.messages),
});
// Answers come back with text blocks first, so every route's content[0].text keeps working.
const textFirst = (data) => (data && Array.isArray(data.content)
  ? { ...data, content: [...data.content.filter((b) => b && b.type === 'text'), ...data.content.filter((b) => !(b && b.type === 'text'))] }
  : data);

async function sendRaw(provider, body, { beta } = {}) {
  const url = provider === 'deepseek' ? DEEPSEEK_URL : ANTHROPIC_URL;
  const key = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.ANTHROPIC_API_KEY;
  const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  if (beta) headers['anthropic-beta'] = beta; // ignored by DeepSeek, harmless
  const res = await fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { res, data };
}

/** The reading route's shape. Returns { data, provider, model, ok }. */
export async function callProvider(body, { beta, tag = 'provider' } = {}) {
  if (READER_PROVIDER === 'deepseek') {
    const model = toDeepseekModel(body.model);
    try {
      const { data } = await sendRaw('deepseek', forDeepseek(body), { beta });
      if (looksAnswered(data)) return { data: textFirst(data), provider: 'deepseek', model, ok: true };
      console.error(`[${tag}] deepseek answered with an error; falling back to anthropic:`, data?.error?.message || 'no content');
    } catch (e) {
      console.error(`[${tag}] deepseek call threw; falling back to anthropic:`, e.message);
    }
  }
  const { data } = await sendRaw('anthropic', body, { beta });
  return { data, provider: 'anthropic', model: body.model, ok: looksAnswered(data) };
}

/**
 * Drop-in for fetchWithRetry(url, options). Only a POST to the Anthropic messages URL is rerouted;
 * anything else passes straight through. On success the DeepSeek answer comes back as a normal
 * Response so the route's response.ok / response.json() code is untouched.
 */
export async function providerFetch(url, options = {}, maxRetries = 3) {
  const isMessages = String(url) === ANTHROPIC_URL && String(options.method || 'GET').toUpperCase() === 'POST';
  if (!isMessages || READER_PROVIDER !== 'deepseek') return fetchWithRetry(url, options, maxRetries);
  let body;
  try { body = JSON.parse(options.body); } catch { return fetchWithRetry(url, options, maxRetries); }
  const beta = (options.headers || {})['anthropic-beta'];
  const model = toDeepseekModel(body.model);
  try {
    const { data } = await sendRaw('deepseek', forDeepseek(body), { beta });
    if (looksAnswered(data)) { console.log(`[provider] ${model} served (${data.usage?.output_tokens ?? '?'} out)`); return new Response(JSON.stringify(textFirst(data)), { status: 200, headers: { 'content-type': 'application/json' } }); }
    console.error('[providerFetch] deepseek answered with an error; falling back to anthropic:', data?.error?.message || 'no content');
  } catch (e) {
    console.error('[providerFetch] deepseek call threw; falling back to anthropic:', e.message);
  }
  return fetchWithRetry(url, options, maxRetries);
}

/** Drop-in for client.messages.create(params) in the SDK routes. Same fallback. */
let anthropicClient = null, deepseekClient = null;
export async function createMessage(params, { tag = 'sdk' } = {}) {
  if (READER_PROVIDER === 'deepseek') {
    try {
      deepseekClient ||= new Anthropic({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/anthropic' });
      const r = await deepseekClient.messages.create(forDeepseek(params));
      if (looksAnswered(r)) { console.log(`[provider:${tag}] ${r.model} served (${r.usage?.output_tokens ?? '?'} out)`); return textFirst(r); }
      console.error(`[${tag}] deepseek returned no content; falling back to anthropic`);
    } catch (e) {
      console.error(`[${tag}] deepseek call threw; falling back to anthropic:`, e.message);
    }
  }
  anthropicClient ||= new Anthropic();
  return anthropicClient.messages.create(params);
}
