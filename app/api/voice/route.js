// THE READER'S VOICE, one piece at a time (2026-10-03). POST { text, voice } → { url, secs } — a Replicate audio URL the page plays.
// POST { warm: true } wakes the model when the person taps Ask, so the first real piece doesn't pay a cold start.
// Admin-only while it's benched (the founder's flag); the identity comes from the verified token (lib/adminAuth.js).
import { requireAdmin } from '../../../lib/adminAuth.js';
import { speakPiece, forTheEar, MAX_PIECE } from '../../../lib/voice/kokoro.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let body = {}; try { body = await request.json(); } catch {}
  try {
    if (body.warm) { const r = await speakPiece('Hi.', body.voice); return Response.json({ ok: true, warmed: true, secs: r.secs }); }
    const text = forTheEar(body.text);
    if (!text) return Response.json({ error: 'nothing to say' }, { status: 400 });
    if (text.length > MAX_PIECE) return Response.json({ error: `piece too long (${text.length} > ${MAX_PIECE})` }, { status: 400 });
    const r = await speakPiece(text, body.voice);
    return Response.json({ url: r.url, secs: r.secs });
  } catch (e) {
    return Response.json({ error: String(e.message || e).slice(0, 200) }, { status: 502 });
  }
}
