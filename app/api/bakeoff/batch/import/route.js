// app/api/bakeoff/batch/import/route.js — a seat's picks come back as text; stored as votes
// under the seat's name. POST { id, judge, text } → { stored, skipped, bad }.
// Lines: "run 3, meaning: B" · "run 3, moon: A!" (strong) · "run 4, opening: tie".

import { requireAdmin } from '../../../../../lib/adminAuth.js';
import { readBatch, parsePicks, laneForLetter, lanesOf } from '../../../../../lib/bakeoff/batch.js';
import { presetById, SECTIONS } from '../../../../../lib/bakeoff/presets.js';
import { appendVote, readVotes } from '../../../../../lib/bakeoff/store.js';

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const batch = readBatch(b.id);
  if (!batch) return Response.json({ error: 'no such batch' }, { status: 404 });
  const judge = String(b.judge || '').trim().slice(0, 40);
  if (!judge) return Response.json({ error: 'a judge name is needed (Keel, Gemini, the GPT Mind seat…)' }, { status: 400 });
  const { picks, bad } = parsePicks(b.text);
  const already = new Set(readVotes().filter((v) => v.batch === batch.id && v.judge === judge).map((v) => `${v.run}:${v.section}`));
  let stored = 0; const skipped = [];
  for (const p of picks) {
    const run = batch.runs.find((r) => r.i === p.run); const sec = SECTIONS.find((s) => s.id === p.section);
    if (!run || !sec || !run.sections[sec.id]) { skipped.push(`run ${p.run} ${p.section}: not in this batch`); continue; }
    if (already.has(`${p.run}:${p.section}`)) { skipped.push(`run ${p.run} ${p.section}: already judged by ${judge}`); continue; }
    const lanes = lanesOf(batch, p.run, p.section);
    let pick = 'tie';
    if (p.pick !== 'tie') { const L = laneForLetter(batch, p.run, p.section, p.pick); if (!L) { skipped.push(`run ${p.run} ${p.section}: no column ${p.pick}`); continue; } pick = L.key; }
    appendVote({ judge, judgeKind: 'seat', batch: batch.id, run: p.run, section: p.section, lane: batch.lane, preset: presetById(sec.preset).id, question: run.question, draw: run.draw, lanes, pick, pickLetter: p.pick === 'tie' ? null : p.pick, strength: p.strength, tags: {}, note: '', cost_visible: false, version: batch.version });
    already.add(`${p.run}:${p.section}`); stored += 1;
  }
  return Response.json({ ok: true, stored, skipped, bad });
}
