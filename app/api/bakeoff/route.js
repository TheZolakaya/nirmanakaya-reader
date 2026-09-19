// app/api/bakeoff/route.js
// THE BAKE-OFF RUN — one draw, the reader's own prompt, fanned to every checked lane in parallel.
// Admin-gated (lib/adminAuth). Model lane: the live prompt on several models. Prompt lane: one
// model, the live prompt beside named variants. Never both in one run (commission addendum).
// Nothing here touches the reader's routes, MODEL_IDS, or any prompt text.

import { requireAdmin } from '../../../lib/adminAuth.js';
import { presetById, drawFor, drawLabel, buildPrompt, buildOpening, parseJson } from '../../../lib/bakeoff/presets.js';
import { neededRepair } from '../../../lib/readerJson.js';
import { callModel, BENCH_MODELS } from '../../../lib/bakeoff/providers.js';
import { lintOutput } from '../../../lib/bakeoff/lint.js';
import { readVariants } from '../../../lib/bakeoff/store.js';

export const maxDuration = 120;

const shuffle = (a) => { const arr = [...a]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const LETTERS = 'ABCDEFGH';

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  let body; try { body = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const lane = body.lane === 'prompt' ? 'prompt' : 'model';
  const preset = presetById(body.preset || 'ez-opening');
  if (!preset) return Response.json({ error: `unknown preset ${body.preset}` }, { status: 400 });
  const question = String(preset.question || body.question || '').trim();
  if (!question) return Response.json({ error: 'a question is needed' }, { status: 400 });

  // The lanes.
  let lanes;
  if (lane === 'model') {
    const keys = [...new Set((body.models || []).filter((k) => BENCH_MODELS[k]))];
    if (keys.length < 2) return Response.json({ error: 'check two or more models' }, { status: 400 });
    lanes = keys.map((k) => ({ key: k, label: BENCH_MODELS[k].label, modelKey: k, over: {} }));
  } else {
    const modelKey = BENCH_MODELS[body.model] ? body.model : 'sonnet';
    const all = readVariants();
    const chosen = (body.variants || []).map((id) => all.find((v) => v.id === id)).filter(Boolean);
    if (!chosen.length) return Response.json({ error: 'pick at least one variant beside the live prompt' }, { status: 400 });
    lanes = [
      { key: 'live', label: `LIVE prompt · ${BENCH_MODELS[modelKey].label}`, modelKey, over: {} },
      ...chosen.map((v) => ({ key: v.id, label: `${v.name} (${v.target}) · ${BENCH_MODELS[modelKey].label}`, modelKey, over: { [v.target]: v.text } })),
    ];
  }

  const draw = drawFor(preset, body.draw);
  const t0 = Date.now();

  // The floors and the dragon deepen a TURN, so the bench first opens the reading once, on the
  // LIVE prompt and the live model (Sonnet), and hands that same opening to every lane. One thing
  // varies per comparison; the opening is shared context, never a lane.
  let opening = null, openingRow = null;
  if (preset.kind !== 'opening') {
    const p = buildOpening({ question, draw, over: {} });
    openingRow = await callModel({ modelKey: 'sonnet', system: p.system, message: p.message, maxTokens: p.maxTokens });
    if (openingRow.error) return Response.json({ error: `the shared opening failed: ${openingRow.error}` }, { status: 502 });
    opening = parseJson(openingRow.text);
    if (!opening?.reader) return Response.json({ error: 'the shared opening did not parse; run again', raw: openingRow.text?.slice(0, 400) }, { status: 502 });
  }

  const built = lanes.map((L) => ({ L, p: buildPrompt(preset, { question, draw, opening, over: L.over }) }));
  let results = await Promise.all(built.map(({ L, p }) => callModel({ modelKey: L.modelKey, system: p.system, message: p.message, maxTokens: p.maxTokens })));

  // THE READER'S OWN RETRY, mirrored (.453): the page re-asks ONCE when the envelope does not
  // parse. A bench that did not would measure something harsher than what a person gets. The
  // retry's cost and time are added to the lane's, and the lane is marked so the tally can show
  // how often each model needed it.
  const RETRY = '\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.';
  results = await Promise.all(results.map(async (r, i) => {
    if (r.error || !r.text || parseJson(r.text)) return r;
    const { L, p } = built[i];
    const again = await callModel({ modelKey: L.modelKey, system: p.system, message: p.message + RETRY, maxTokens: p.maxTokens });
    if (again.error) return { ...r, retried: true, note: `${r.note ? r.note + '; ' : ''}retry failed: ${again.error}` };
    const sum = (a, b, k) => (a?.[k] || 0) + (b?.[k] || 0);
    const usage = { input_tokens: sum(r.usage, again.usage, 'input_tokens'), output_tokens: sum(r.usage, again.usage, 'output_tokens'), cache_read_input_tokens: sum(r.usage, again.usage, 'cache_read_input_tokens'), cache_creation_input_tokens: sum(r.usage, again.usage, 'cache_creation_input_tokens') };
    return { ...again, retried: true, firstText: r.text, usage, cost: (r.cost || 0) + (again.cost || 0), ms: (r.ms || 0) + (again.ms || 0), note: `${r.note ? r.note + '; ' : ''}retried once (first reply did not parse)` };
  }));

  const rows = built.map(({ L, p }, i) => {
    const r = results[i];
    const parsed = r.text ? parseJson(r.text) : null;
    const lint = r.error ? { ok: false, flags: [{ code: 'error', detail: r.error }], words: 0, prose: '' } : lintOutput({ text: r.text, parsed, preset, hostile: !!preset.hostile });
    // parsed only because the shared parser repaired it (raw newlines in strings, fences, trailing commas): a flag, not a failure
    if (parsed && neededRepair(r.text)) lint.flags = [...(lint.flags || []), { code: 'json-repaired', detail: 'parsed only after repair (raw line breaks inside strings, fences or trailing commas)' }];
    if (r.retried) lint.flags = [...(lint.flags || []), { code: 'retried', detail: 'first reply did not parse; the reader\'s one retry was used' }];
    // .458: hit the reader's token cap — the envelope is incomplete (no medicine, no chips) even if the prose looks whole.
    // The founder spotted it on non-thinking flash: "doesn't include the end". A cut reply is not a shorter reading; it is a broken one.
    if (r.stop === 'max_tokens') lint.flags = [...(lint.flags || []), { code: 'cut', detail: `stopped at the token cap (${p.maxTokens}); the envelope is incomplete` }];
    return {
      key: L.key, label: L.label, modelKey: L.modelKey, model: r.model, provider: r.provider,
      text: r.text || '', parsed, prose: lint.prose, lint: { ok: lint.ok, flags: lint.flags, words: lint.words },
      usage: r.usage || null, cost: r.cost || 0, ms: r.ms, error: r.error || null, note: r.note || '', stop: r.stop || null, thinkingChars: r.thinkingChars || 0,
      promptChars: { system: p.system.length, message: p.message.length },
    };
  });

  // Blind order: shuffled here, lettered here; the page hides label/model until the pick.
  const lettered = shuffle(rows).map((r, i) => ({ ...r, letter: LETTERS[i] }));

  return Response.json({
    lane, preset: preset.id, presetKind: preset.kind, hostile: !!preset.hostile, question,
    draw, drawLabel: drawLabel(draw),
    opening: opening ? { reader: opening.reader, medicine: opening.medicine || '', question: opening.question || '', usage: openingRow.usage, cost: openingRow.cost, ms: openingRow.ms } : null,
    lanes: lettered, ms: Date.now() - t0, judge: gate.user.email,
  });
}
