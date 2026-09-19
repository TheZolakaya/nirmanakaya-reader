// app/api/bakeoff/judge/route.js — THE PANEL'S DOOR (addendum 4 §3). No account, no admin gate:
// a batch id + its shared code + a short judge name. Nothing else is reachable from here — this
// route reads one batch blind and writes votes under the name; it never returns lane names for a
// run until that run's six sections are all judged by this judge.
// GET ?id&code&judge → the blind view + this judge's progress. POST { id, code, judge, run, section, pick (letter|'tie'), strength, tags, note }.

import { readBatch, blindView, laneForLetter, lanesOf, sectionsOf } from '../../../../lib/bakeoff/batch.js';
import { presetById, SECTIONS } from '../../../../lib/bakeoff/presets.js';
import { appendVote, readVotes } from '../../../../lib/bakeoff/store.js';

const open = (id, code) => {
  const b = readBatch(id);
  if (!b) return { error: Response.json({ error: 'no such batch' }, { status: 404 }) };
  if (!code || String(code).toUpperCase() !== b.code) return { error: Response.json({ error: 'wrong batch code' }, { status: 403 }) };
  return { b };
};
const name = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 40);
const progressOf = (batchId, judge) => { const m = {}; for (const v of readVotes()) if (v.batch === batchId && v.judge === judge && v.section) m[`${v.run}:${v.section}`] = { pick: v.pickLetter || 'tie', strength: v.strength || 1 }; return m; };

export async function GET(request) {
  const u = new URL(request.url);
  const { b, error } = open(u.searchParams.get('id'), u.searchParams.get('code'));
  if (error) return error;
  const judge = name(u.searchParams.get('judge'));
  const judged = judge ? progressOf(b.id, judge) : {};
  return Response.json({ view: blindView(b, judged), judged, sections: sectionsOf(b).map((s) => ({ id: s.id, label: s.label })), code: b.code });
}

export async function POST(request) {
  let body; try { body = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const { b, error } = open(body.id, body.code);
  if (error) return error;
  const judge = name(body.judge);
  if (!judge) return Response.json({ error: 'a name is needed' }, { status: 400 });
  const run = b.runs.find((r) => r.i === +body.run); const sec = SECTIONS.find((s) => s.id === body.section);
  if (!run || !sec || !run.sections[sec.id]) return Response.json({ error: 'no such run/section' }, { status: 400 });
  if (progressOf(b.id, judge)[`${run.i}:${sec.id}`]) return Response.json({ error: 'already judged' }, { status: 409 });
  const lanes = lanesOf(b, run.i, sec.id);
  let pick = 'tie', pickLetter = null;
  if (body.pick && body.pick !== 'tie') { const L = laneForLetter(b, run.i, sec.id, String(body.pick).toUpperCase()); if (!L) return Response.json({ error: 'no such column' }, { status: 400 }); pick = L.key; pickLetter = String(body.pick).toUpperCase(); }
  // tags arrive per LETTER from a blind judge; store them per lane key so the tally reads them
  const tags = {}; if (body.tags && typeof body.tags === 'object') for (const [letter, list] of Object.entries(body.tags)) { const L = laneForLetter(b, run.i, sec.id, letter); if (L && Array.isArray(list) && list.length) tags[L.key] = list.map(String).slice(0, 12); }
  try {
    appendVote({ judge, judgeKind: 'person', batch: b.id, run: run.i, section: sec.id, lane: b.lane, preset: run.preset || presetById(sec.preset).id, question: run.question, draw: run.draw, lanes, pick, pickLetter, strength: body.strength === 2 ? 2 : 1, tags, note: String(body.note || '').slice(0, 2000), cost_visible: false, version: b.version });
  } catch (e) { return Response.json({ error: `vote not saved: ${e.message}` }, { status: 500 }); }
  const judged = progressOf(b.id, judge);
  const done = sectionsOf(b).every((s) => judged[`${run.i}:${s.id}`]);
  return Response.json({ ok: true, judged, runRevealed: done, reveal: done ? blindView(b, judged).runs.find((r) => r.i === run.i) : null });
}
