// app/api/bakeoff/votes/route.js — the picks. GET the tally (?lane=model|prompt), POST one vote.
// The judge is the verified session's email, never a field the page claims.

import { requireAdmin } from '../../../../lib/adminAuth.js';
import { readVotes, appendVote, tally } from '../../../../lib/bakeoff/store.js';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const lane = url.searchParams.get('lane') || undefined;
  const votes = readVotes();
  return Response.json({
    all: tally(votes, { lane }),
    mine: tally(votes, { lane, judge: gate.user.email }),
    count: votes.length,
  });
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  let b; try { b = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  if (!b.pick || !Array.isArray(b.lanes)) return Response.json({ error: 'pick and lanes are needed' }, { status: 400 });
  try {
    const row = appendVote({
      judge: gate.user.email,
      lane: b.lane === 'prompt' ? 'prompt' : 'model',
      preset: b.preset, question: b.question, draw: b.draw,
      // every lane as judged: letter, key, model, usage, cost, ms, flags, words — the outputs
      // themselves stay out of the vote file (the export carries them)
      lanes: b.lanes.map((L) => ({ letter: L.letter, key: L.key, label: L.label, model: L.model, usage: L.usage, cost: L.cost, ms: L.ms, flags: (L.lint?.flags || []).map((f) => f.code), words: L.lint?.words || 0 })),
      pick: b.pick, pickLetter: b.pickLetter || null,
      strength: b.strength === 2 ? 2 : 1, // the preference spectrum (.462): 2 = strongly, 1 = prefer; a tie carries 1 and is not a pick
      tags: b.tags && typeof b.tags === 'object' && !Array.isArray(b.tags) ? b.tags : {},   // { laneKey: [tag, …] }
      note: String(b.note || '').slice(0, 2000),
      cost_visible: !!b.cost_visible,
      shared_opening: b.shared_opening || null,
    });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    return Response.json({ error: `vote not saved: ${e.message}` }, { status: 500 });
  }
}
