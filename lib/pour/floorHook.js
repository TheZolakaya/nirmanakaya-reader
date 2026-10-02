// THE FLOOR HOOK — the poured cell under the live Reader (founder-flagged; off unless POUR_FLOOR=1). Beside the Geometry Engine's
// dossier in /api/reading: for every draw in the request, the read-plan is built from the record with the snapshot's cell as the
// floor, and its block is appended to the final user message — never the system prompt (the cached blocks stay byte-stable).
// Fail-open: any error leaves the messages untouched. A missing or stale cell leaves the Reader on the record, as today.
import DEFS from '../data/nirmanakaya_78_definitions.json';
import { readPlan, planBlock } from './assemble.js';
import { lookupCell } from './library.js';

export const FLOOR_ENABLED = process.env.POUR_FLOOR === '1';

export function appendFloor(messages, draws, { enabled = FLOOR_ENABLED, turn = null } = {}) {
  if (!enabled || turn === 'talk') return { messages, floors: 0 };
  try {
    if (!Array.isArray(draws) || !draws.length || !Array.isArray(messages) || !messages.length) return { messages, floors: 0 };
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx < 0 || typeof messages[lastUserIdx].content !== 'string') return { messages, floors: 0 };
    const question = String(messages.find((m) => m.role === 'user')?.content || '').slice(0, 500);
    const blocks = [];
    for (const d of draws) {
      if (!d || d.transient == null || d.position == null || d.status == null) continue;
      const draw = { transient: Number(d.transient), position: Number(d.position), status: Number(d.status) };
      const plan = readPlan(draw, DEFS, (sig, pos, status) => lookupCell(sig, pos, status), { question });
      // provenance: a cell whose partner no longer matches the record is dropped (the Reader reads from the record)
      const cell = plan.projections[0]?.cell;
      if (cell && (cell.provenance?.partner_id !== plan.projections[0].partnerId || cell.provenance?.mechanism !== plan.projections[0].mechanism)) plan.projections[0].cell = null;
      blocks.push(planBlock(plan));
    }
    if (!blocks.length) return { messages, floors: 0 };
    const block = '\n\n' + blocks.join('\n\n');
    return { messages: messages.map((m, i) => (i === lastUserIdx ? { ...m, content: m.content + block } : m)), floors: blocks.filter((b) => !b.includes('no poured cell')).length };
  } catch (e) {
    console.error('Floor hook skipped:', e?.message);
    return { messages, floors: 0 };
  }
}
