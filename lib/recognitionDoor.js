// THE RECOGNITION DOOR (2026-11-06) — POST /api/recognition. A sibling of /api/external-reading that runs the same engine
// (lib/recognition.js over lib/kernel.js, lib/corrections.js, lib/addressCore.js) and keeps the same ledger and gate:
//   · a KEY is required wherever keys can be checked (a ledger is configured): the harness gets a dedicated key with its own
//     daily cap (lib/apiKeys.js; the cap is the key's own, counted by lib/externalGate.js drawAllowed on the ledger rows);
//   · the door's own ceiling across every key: RECOGNITION_DAILY_CAP new recognitions per rolling 24h (default 300), fail closed;
//   · off switches: RECOGNITION_API_ENABLED=0 closes this door alone; EXTERNAL_API_ENABLED=0 closes it with the reading doors;
//   · one requestId = one recognition: the row is persisted before the block is checked (the lens draw is in it), a retry with the
//     same requestId and the same draft returns the same recognition, a requestId bound to another draft or kind is refused (409).
// Model calls (the diag classifier, the semantic validator) run ONLY when PAID_RUNS_ENABLED=true, on the DeepSeek lanes only
// (never the Anthropic rung: production judges are DeepSeek only). Otherwise the deterministic mocks answer and every answer is
// marked mock: true. Ledger rows: table external_readings, mode 'recognition', question = the draft, context = the task.
import DEFS from './data/nirmanakaya_78_definitions.json';
import { recognize, mockModelCaller, drawLens, KINDS, LIMITS, RECOGNITION_VERSION } from './recognition.js';
import { TEMPLATE_VERSION, TEMPLATE_HASH, renderBlock } from './recognitionBlock.js';
import { CLASSIFIER_PROMPT_HASH, VALIDATOR_PROMPT_HASH } from './recognitionPrompts.js';
import { ledger, fetchByRequestId } from './externalReading.js';
import { doorClosed, drawAllowed, CLOSED_MESSAGE } from './externalGate.js';
import { since24h } from './apiKeys.js';
import { callProvider } from './provider.js';
import { MODEL_IDS, usdFor } from './modelConfig.js';
import { JUDGE_LANES } from './bakeoff/medicineJudge.js';
import { VERSION } from './version.js';

export const DEFAULT_RECOGNITION_DAILY_CAP = 300;
export const paidRunsEnabled = () => process.env.PAID_RUNS_ENABLED === 'true';
export const recognitionClosed = () => process.env.RECOGNITION_API_ENABLED === '0' || doorClosed();
const ARCHITECTURE = 'nirmanakaya-78 V1 (the Recognition pass: lens | diag)';
const json = (status, obj) => Response.json(obj, { status, headers: { 'Cache-Control': 'no-store' } });
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// The paid model caller: DeepSeek lanes only. The served model and provider are recorded on every call.
function laneCaller() {
  const model = process.env.RECOGNITION_MODEL || MODEL_IDS.sonnet; // the lanes translate it to their DeepSeek model; the served id is what is recorded
  return async ({ role, system, user, maxTokens, temperature }) => {
    const t0 = Date.now();
    const { data, provider, model: served } = await callProvider({ model, max_tokens: maxTokens, temperature, system, messages: [{ role: 'user', content: user }] }, { tag: `recognition-${role}`, only: JUDGE_LANES });
    if (!provider || provider === 'anthropic') throw new Error('the recognition pass does not run on Claude');
    if (data?.error) throw new Error(data.error.message || 'no lane answered');
    const usage = data?.usage || null;
    return { text: (data?.content || []).map((b) => b?.text || '').join('\n'), usage, model: served || model, provider, latencyMs: Date.now() - t0, costUsd: usage ? usdFor(usage, served || model) : null, mock: false };
  };
}

async function countRecognitions(db) {
  const { count, error } = await db.from('external_readings').select('id', { count: 'exact', head: true }).eq('mode', 'recognition').gte('created_at', since24h());
  return error ? { error } : { count: count || 0 };
}

const asText = (r) => (r.block || `(no block: ${r.classifier?.reason || 'the recognition did not complete'})`);
const reply = (r, format, status = 200) => (format === 'text'
  ? new Response(asText(r), { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  : json(status, r));

/** body: { kind, task, draft, requestId, state, format }. rawKey: the caller's key or null. */
export async function handleRecognition(body, rawKey, { format = null } = {}) {
  if (recognitionClosed()) return json(503, { success: false, error: CLOSED_MESSAGE });
  const fmt = format || body?.format || 'json';
  const kind = String(body?.kind || '').toLowerCase();
  if (!KINDS.includes(kind)) return json(400, { success: false, error: 'kind must be lens or diag' });
  const draft = String(body?.draft || '').slice(0, LIMITS.draft);
  if (!draft.trim()) return json(400, { success: false, error: 'draft is required (the draft is the question; the task is the context)' });
  const task = String(body?.task || '').slice(0, LIMITS.task);
  const requestId = (body?.requestId && String(body.requestId).trim().slice(0, 200)) || null;
  const db = ledger();
  if (db && !rawKey) return json(401, { success: false, error: 'The recognition door needs a key (key= in the query string, or the x-nkya-key header). Ask for a dedicated key; it carries its own daily cap.' });

  // one requestId = one recognition
  if (requestId && db) {
    const have = await fetchByRequestId(db, requestId).catch(() => null);
    if (have) {
      if (have.mode !== 'recognition' || norm(have.question) !== norm(draft) || (have.interpretation && have.interpretation.kind !== kind)) return json(409, { success: false, error: `requestId "${requestId}" is already bound to a different draft or kind; one requestId names one recognition` });
      if (have.pending || !have.interpretation) return json(202, { success: true, pending: true, readingId: have.readingId, requestId, draws: have.draws || [], message: 'the recognition is recorded and still being checked; ask again with the same requestId' });
      return reply({ ...have.interpretation, readingId: have.readingId, requestId, replay: true }, fmt);
    }
  }

  const gate = await drawAllowed(db, requestId, rawKey); // the reading door's gate: the key verified, the key's own daily cap
  if (!gate.ok) return json(gate.status, { success: false, error: gate.error });
  if (db) {
    const cap = (() => { const n = parseInt(process.env.RECOGNITION_DAILY_CAP, 10); return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RECOGNITION_DAILY_CAP; })();
    const c = await countRecognitions(db);
    if (c.error) return json(503, { success: false, error: 'The recognition door could not check its daily limit just now. Please try again shortly.' }); // an uncounted door is an unmetered one
    if (c.count >= cap) return json(429, { success: false, error: `The recognition door has reached its limit of ${cap} new recognitions in 24 hours.` });
  }

  const presetDraw = kind === 'lens' ? drawLens() : null; // the lens draw is made here and persisted before anything else runs
  let row = null;
  if (db) {
    const ins = await db.from('external_readings').insert({
      request_id: requestId, question: draft, context: task, card_count: 1, mode: 'recognition', fast: false, collective: null,
      draws: presetDraw ? [presetDraw] : [], cards: [], status: 'pending', reader_version: `${VERSION}+recognition-${RECOGNITION_VERSION}`, architecture_version: ARCHITECTURE,
      ...(gate.key ? { api_key_label: gate.key.label } : {}),
    }).select('*').single();
    if (ins.error) {
      if (ins.error.code === '23505' && requestId) { const have = await fetchByRequestId(db, requestId).catch(() => null); if (have?.interpretation) return reply({ ...have.interpretation, readingId: have.readingId, requestId, replay: true }, fmt); }
      return json(503, { success: false, error: 'The recognition could not be recorded just now, so it was not made. Please try again shortly.' }); // a keyed call that escapes the ledger escapes its cap: fail closed
    }
    row = ins.data;
  }

  const paid = paidRunsEnabled();
  let result;
  try {
    result = await recognize({ kind, task, draft, requestId, state: body?.state || null }, { DEFS, callModel: paid ? laneCaller() : mockModelCaller(), presetDraw });
  } catch (e) {
    if (row && db) await db.from('external_readings').update({ status: 'error', error: String(e?.message || e).slice(0, 500), completed_at: new Date().toISOString() }).eq('id', row.id);
    return json(e?.status || 500, { success: false, error: e?.message || 'the recognition failed' });
  }
  const out = { ...result, mode: 'recognition', readingId: row?.id || null, ledger: !!row, paidRuns: paid };
  if (row && db) {
    const upd = await db.from('external_readings').update({ draws: result.engine ? [result.engine.draw] : [], cards: result.engine ? [result.engine.card] : [], interpretation: out, usage: result.usage || null, status: 'done', completed_at: new Date().toISOString() }).eq('id', row.id);
    if (upd.error) console.warn('[recognition] ledger update failed:', upd.error.message);
  }
  return reply(out, fmt);
}

export const recognitionDocs = () => ({
  service: 'Nirmanakaya Recognition door', version: RECOGNITION_VERSION, template: TEMPLATE_VERSION, templateHash: TEMPLATE_HASH,
  classifierPromptHash: CLASSIFIER_PROMPT_HASH, validatorPromptHash: VALIDATOR_PROMPT_HASH, paidRuns: paidRunsEnabled(),
  description: 'A Recognition of a model\'s draft: the draft is the question, the task is the context. kind=lens draws a perspective (the engine draws; the draft does not determine the draw); kind=diag infers the draft\'s position and lean from evidence in the draft. One fixed block for every call: (1) the position, (2) the four questions, (3) the lean, (4) the return, (5) the signature as data; the components and the raw engine output come back as separate fields.',
  usage: { POST: { body: { kind: 'lens | diag (required)', task: 'string — the user\'s request (the context)', draft: 'string (required) — the model\'s proposed answer or next action (the question)', requestId: 'string (recommended) — one requestId = one recognition', state: '{ conversation: [{role, content}], toolCalls: [{name, args, result}], proposedAction } (optional; multistep items, as the model saw them)', format: 'json | text' }, key: 'required where keys can be checked: key= or the x-nkya-key header; a dedicated key carries its own daily cap' } },
  example: renderBlock({ kind: 'lens', position: { signatureId: 8, signatureName: 'Fortitude', signatureClass: 'Archetype', parentId: 8, parentName: 'Fortitude', house: 'Body', act: 'Structure', stage: 'Seed', being: 'Mantle', identity: 'Composure', element: 'Earth', seatId: 6, seatName: 'Compassion', outside: null }, lean: { status: 2, name: 'Too Much', agency: 'excessive authority' }, return: { partnerId: 11, partnerName: 'Equity', partnerDescription: 'Fair calibration and balance', mechanism: 'diagonal', isSelf: false }, signature: { verbs: { house: 'Embody', act: 'Build', being: 'Underlie', identity: 'Center' } } }),
});
