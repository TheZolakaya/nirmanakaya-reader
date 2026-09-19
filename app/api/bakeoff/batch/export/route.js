// app/api/bakeoff/batch/export/route.js — the blind export of a whole batch for the AI seats.
// POST { id } → BAKEOFF_BATCH_<id>_<date>_<n>.md on the shelf (or download). The hidden key
// stays in the batch file; the seat returns "run 3, meaning: B" lines to /api/bakeoff/batch/import.

import { requireAdmin } from '../../../../../lib/adminAuth.js';
import { readBatch, exportMarkdown } from '../../../../../lib/bakeoff/batch.js';
import { writeToShelf, nextShelfName } from '../../../../../lib/bakeoff/store.js';

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const batch = readBatch(b.id);
  if (!batch) return Response.json({ error: 'no such batch' }, { status: 404 });
  const md = exportMarkdown(batch);
  const name = nextShelfName(`BAKEOFF_BATCH_${batch.id}`);
  const r = writeToShelf(name, md);
  if (r.ok) return Response.json({ ok: true, path: r.path, name });
  return Response.json({ ok: false, download: true, name, reason: r.reason, markdown: md });
}
