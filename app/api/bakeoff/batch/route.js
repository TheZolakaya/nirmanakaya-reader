// app/api/bakeoff/batch/route.js — THE BATCH (addendum 4). Admin.
// POST { n, lane, models | model + variants } → creates the batch file and starts it in the
// background (a detached promise on the local server; the file is the progress).
// GET → the list of batches; GET ?id= → one batch, full (admin sees names; the judge view does not).

import { requireAdmin } from '../../../../lib/adminAuth.js';
import { createBatch, runBatch, readBatch, listBatches, summary } from '../../../../lib/bakeoff/batch.js';

export const maxDuration = 60;

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  try {
    const n = Math.max(1, Math.min(40, +b.n || 10));
    const batch = createBatch({ n, lane: b.lane === 'prompt' ? 'prompt' : 'model', models: b.models || [], model: b.model, variants: b.variants || [], author: gate.user.email });
    // fire and forget: the run writes the file after every section
    runBatch(batch.id).catch((e) => console.error('batch', batch.id, e));
    return Response.json({ ok: true, batch: summary(batch) });
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get('id');
  if (id) { const b = readBatch(id); return b ? Response.json({ batch: b, summary: summary(b) }) : Response.json({ error: 'no such batch' }, { status: 404 }); }
  return Response.json({ batches: listBatches() });
}
