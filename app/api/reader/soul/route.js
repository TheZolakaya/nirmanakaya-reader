// GET /api/reader/soul — the live lines of the Reader's soul file (.777). Public, read-only; the page appends them to its system prompt.
import { soulDb, getConfig, liveLines } from '../../../../lib/readerSoul.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = soulDb();
    const cfg = await getConfig(db);
    const lines = cfg.notes_on === false ? [] : await liveLines(db, cfg.soul_cap);
    return Response.json({ lines: lines.map((l) => l.line) }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    return Response.json({ lines: [], error: String(e?.message || e).slice(0, 200) });
  }
}
