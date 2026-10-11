// THE FLOOR's status, admin-only: is the poured snapshot present inside the deployed function, how many cells, cut from which
// set, and does one lookup work. GET /api/pour/status (signed in as an admin). Nothing here reads a person's data.
import { requireAdmin } from '../../../../lib/adminAuth.js';
import { snapshotManifest, lookupCell } from '../../../../lib/pour/library.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const manifest = snapshotManifest();
  const sample = lookupCell(65, 1, 4);   // Executor of Intent in Will, Unacknowledged — the founder's own draw from the first night
  return Response.json({
    floor: { admins: process.env.POUR_FLOOR === '1', everyone: process.env.POUR_FLOOR === '1' }, // .742: off unless POUR_FLOOR=1
    snapshot: manifest ? { set: manifest.set, author: manifest.author, cut: manifest.cut, cells: manifest.cells, expected: manifest.expected, missing: manifest.missing, prompts: manifest.prompts } : null,
    sample: sample ? { sheetLine: sample.sheetLine, ask: sample.ask, partner: sample.provenance?.partner, mechanism: sample.provenance?.mechanism } : null,
    ok: !!manifest && !!sample,
  });
}
