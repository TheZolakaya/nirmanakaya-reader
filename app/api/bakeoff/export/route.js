// app/api/bakeoff/export/route.js — "Export to the council". The page composes the markdown
// (it holds the outputs); this writes it to the shelf if the drive is visible from the server,
// else hands it back for a download. { kind: 'BAKEOFF' | 'PROMPT_CANDIDATE', suffix?, markdown }.

import { requireAdmin } from '../../../../lib/adminAuth.js';
import { writeToShelf, nextShelfName, SHELF } from '../../../../lib/bakeoff/store.js';

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const kind = b.kind === 'PROMPT_CANDIDATE' ? 'PROMPT_CANDIDATE' : 'BAKEOFF';
  if (typeof b.markdown !== 'string' || !b.markdown.trim()) return Response.json({ error: 'nothing to export' }, { status: 400 });
  const safe = (s) => String(s || '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60);
  const prefix = kind === 'PROMPT_CANDIDATE' ? `PROMPT_CANDIDATE_${safe(b.suffix)}` : 'BAKEOFF';
  const name = nextShelfName(prefix);
  const r = writeToShelf(name, b.markdown);
  if (r.ok) return Response.json({ ok: true, path: r.path, name });
  return Response.json({ ok: false, download: true, name, reason: r.reason, shelf: SHELF });
}
