// app/api/admin/keys/route.js — 2026-10-30 (BRIEF 01, THE KEYED DOOR): the Keys tab's server side. Admin only (requireAdmin).
//   GET                                   → { keys: [{ id, label, shape, owner, daily_cap, active, created_at, last_used_at, today }] }
//   POST { action: 'mint', label, shape, owner, dailyCap } → { key, row }   (the plaintext key, shown once; only its hash is kept)
//   POST { action: 'remint', id }         → { key, row }   (a new secret for the same label; the old one stops working at once)
//   POST { action: 'revoke', id }         → { row }
import { requireAdmin } from '../../../../lib/adminAuth.js';
import { ledger } from '../../../../lib/externalReading.js';
import { listKeys, mintKey, remintKey, revokeKey } from '../../../../lib/apiKeys.js';

export const dynamic = 'force-dynamic';

const fail = (e) => Response.json({ error: e?.message || 'failed' }, { status: e?.status || 500 });

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const db = ledger();
  if (!db) return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  try { return Response.json({ keys: await listKeys(db) }, { headers: { 'Cache-Control': 'no-store' } }); } catch (e) { return fail(e); }
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const db = ledger();
  if (!db) return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  let body = {};
  try { body = await request.json(); } catch { return Response.json({ error: 'The request body must be JSON.' }, { status: 400 }); }
  try {
    if (body.action === 'mint') return Response.json(await mintKey(db, { label: body.label, shape: body.shape, owner: body.owner, dailyCap: body.dailyCap }), { headers: { 'Cache-Control': 'no-store' } });
    if (body.action === 'remint') { if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 }); return Response.json(await remintKey(db, String(body.id)), { headers: { 'Cache-Control': 'no-store' } }); }
    if (body.action === 'revoke') { if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 }); return Response.json({ row: await revokeKey(db, String(body.id)) }); }
    return Response.json({ error: 'action must be mint, remint or revoke' }, { status: 400 });
  } catch (e) { return fail(e); }
}
