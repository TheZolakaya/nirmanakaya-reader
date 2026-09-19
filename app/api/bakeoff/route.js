// app/api/bakeoff/route.js
// THE BAKE-OFF RUN — one draw, the reader's own prompt, fanned to every checked lane in parallel.
// Admin-gated (lib/adminAuth). Model lane: the live prompt on several models. Prompt lane: one
// model, the live prompt beside named variants. Never both in one run (commission addendum).
// Nothing here touches the reader's routes, MODEL_IDS, or any prompt text.
// The fan-out, the retries, the floor rewrite and the flags live in lib/bakeoff/run.js, shared
// with the batch (addendum 4) so the single run and the batch measure the same thing.

import { requireAdmin } from '../../../lib/adminAuth.js';
import { presetById, drawFor, drawLabel, buildOpening, parseJson } from '../../../lib/bakeoff/presets.js';
import { callModel, BENCH_MODELS } from '../../../lib/bakeoff/providers.js';
import { runSection } from '../../../lib/bakeoff/run.js';
import { readVariants } from '../../../lib/bakeoff/store.js';

export const maxDuration = 120;

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

  // The floors, the dragon and the step deepen a TURN, so the bench first opens the reading once,
  // on the LIVE prompt and the live model (Sonnet), and hands that same opening to every lane.
  // One thing varies per comparison; the opening is shared context, never a lane.
  let opening = null, openingRow = null;
  if (preset.kind !== 'opening') {
    const p = buildOpening({ question, draw, over: {} });
    openingRow = await callModel({ modelKey: 'sonnet', system: p.system, message: p.message, maxTokens: p.maxTokens });
    if (openingRow.error) return Response.json({ error: `the shared opening failed: ${openingRow.error}` }, { status: 502 });
    opening = parseJson(openingRow.text);
    if (!opening?.reader) return Response.json({ error: 'the shared opening did not parse; run again', raw: openingRow.text?.slice(0, 400) }, { status: 502 });
  }

  const lettered = await runSection(preset, lanes, { question, draw, opening });

  return Response.json({
    lane, preset: preset.id, presetKind: preset.kind, hostile: !!preset.hostile, question,
    draw, drawLabel: drawLabel(draw),
    opening: opening ? { reader: opening.reader, medicine: opening.medicine || '', question: opening.question || '', usage: openingRow.usage, cost: openingRow.cost, ms: openingRow.ms } : null,
    lanes: lettered, ms: Date.now() - t0, judge: gate.user.email,
  });
}
