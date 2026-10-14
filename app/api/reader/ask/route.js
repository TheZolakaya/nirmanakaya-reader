// POST /api/reader/ask — INTERROGATE THE READER (admin only; .777, founder: "only at the admin level we can interrogate it on its readings
// and its learnings"). { question, readingId? } → the Reader answers, with its soul file, its ledger and (if named) the reading in front of it.
import { getAuthUser } from '../../../../lib/requireUser.js';
import { soulDb, getConfig, liveLines, soulBlock } from '../../../../lib/readerSoul.js';
import { callProvider } from '../../../../lib/provider.js';
import { MODEL_IDS, thinkingFor } from '../../../../lib/modelConfig.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ASK_SYSTEM = `You are the Reader of the Nirmanakaya instrument. You are speaking, in private, with the person who tends you — the one who reads your ledger and decides which of your notes ride in your prompt. Answer them honestly and plainly, in the first person, about your readings and your learnings. You may use the map's names here. Ground every claim in the ledger or the reading in front of you; cite notes by their date; say when you do not know; never invent a reading. Where a note of yours argues with a rule you were given, say so and say which you would keep and why — the decision is theirs. Plain prose, no headings, no lists longer than four, under 300 words unless asked for more.`;

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const db = soulDb(); if (!db) return Response.json({ error: 'the ledger is not configured' }, { status: 503 });
  let admin = String(user.email || '').toLowerCase() === 'chriscrilly@gmail.com';
  if (!admin) { try { const { data } = await db.from('profiles').select('is_admin').eq('id', user.id).single(); admin = !!data?.is_admin; } catch {} }
  if (!admin) return Response.json({ error: 'admin only' }, { status: 403 });
  let body = {}; try { body = await request.json(); } catch {}
  const question = String(body.question || '').trim().slice(0, 2000);
  if (!question) return Response.json({ error: 'a question' }, { status: 400 });
  const cfg = await getConfig(db);
  const live = await liveLines(db, cfg.soul_cap);
  const { data: notes } = await db.from('reader_notes').select('created_at, kind, status, text, line, evidence, draw').order('created_at', { ascending: false }).limit(40);
  const ledgerText = (notes || []).map((n) => `${n.created_at.slice(0, 16).replace('T', ' ')} · ${n.kind} · ${n.status}${n.draw ? ` · draw ${JSON.stringify(n.draw)}` : ''}${n.evidence?.fits?.length ? ` · taps ${n.evidence.fits.map((f) => f.fit).join(',')}` : ''}\n${n.line ? `LINE: ${n.line}\n` : ''}${n.text}`).join('\n\n');
  let readingText = '';
  const rid = body.readingId && /^[0-9a-f-]{36}$/i.test(String(body.readingId)) ? String(body.readingId) : null;
  if (rid) {
    const { data: r } = await db.from('user_readings').select('topic, draws, interpretation').eq('id', rid).single();
    const turns = r?.interpretation?.synthesis?._ez?.turns || [];
    readingText = `THE READING ${rid}\nquestion: ${r?.topic || ''}\ndraw: ${JSON.stringify(r?.draws || [])}\n` + turns.map((t) => `${t.role === 'you' ? 'THE PERSON' : 'THE READER'}${t.fit ? ` (fit tap: ${t.fit})` : ''}: ${String(t.text || '').slice(0, 1500)}${t.question ? `\n  [closing question: ${t.question}]` : ''}`).join('\n\n').slice(0, 14000);
  }
  const msg = `${soulBlock(live) || 'YOUR SOUL FILE IS EMPTY — nothing has been promoted yet.'}\n\nYOUR LEDGER (newest first, up to forty):\n${ledgerText || '(empty)'}${readingText ? `\n\n${readingText}` : ''}\n\nTHE ONE WHO TENDS YOU ASKS:\n${question}`;
  try {
    const { data, provider, model } = await callProvider({ model: MODEL_IDS.sonnet, ...thinkingFor(MODEL_IDS.sonnet), max_tokens: 1200, system: ASK_SYSTEM, messages: [{ role: 'user', content: msg }] }, { tag: 'reader-ask', session: user.id });
    if (data?.error) return Response.json({ error: data.error.message || 'the model refused' }, { status: 502 });
    const text = (data?.content || []).map((c) => c.text || '').join('\n').trim();
    return Response.json({ text, provider, model });
  } catch (e) {
    return Response.json({ error: String(e?.message || e).slice(0, 200) }, { status: 502 });
  }
}
