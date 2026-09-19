// app/api/bakeoff/variants/route.js — named prompt variants for the prompt lane.
// GET: the saved variants + the LIVE text of every swappable block (so an edit starts from the
// real thing). POST: save one { id?, name, target, text }. DELETE ?id=. The bench stores them;
// it never applies one to the live prompt — that is True's to apply and Keel's to rule on.

import { requireAdmin } from '../../../../lib/adminAuth.js';
import { readVariants, saveVariant, deleteVariant } from '../../../../lib/bakeoff/store.js';
import { VARIANT_TARGETS } from '../../../../lib/bakeoff/presets.js';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const targets = Object.fromEntries(Object.entries(VARIANT_TARGETS).map(([k, v]) => [k, { label: v.label, live: v.live() }]));
  return Response.json({ variants: readVariants(), targets });
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  if (!b.name || !VARIANT_TARGETS[b.target] || typeof b.text !== 'string') return Response.json({ error: 'name, a known target, and text are needed' }, { status: 400 });
  try {
    const row = saveVariant({ id: b.id, name: String(b.name).slice(0, 80), target: b.target, text: b.text, author: gate.user.email });
    return Response.json({ ok: true, variant: row });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id' }, { status: 400 });
  try { deleteVariant(id); return Response.json({ ok: true }); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
