// /app/api/external-reading/route.js
// External API for any AI or client that can make an HTTP call. The instrument and the ledger live in lib/externalReading.js
// (shared with /api/mcp, the connector door). v3.1.0: persist-then-interpret, requestId idempotency, readingId retrieval, format=text.
import { runReading, fetchById, respond, ledger, apiDocs } from '../../../lib/externalReading.js';

export const dynamic = 'force-dynamic';

// A HEAD never draws (a probe used to run a whole reading)
export async function HEAD() { return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } }); }

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.readingId) { const db = ledger(); const have = db ? await fetchById(db, body.readingId) : null; return have ? respond(have, body.format) : Response.json({ success: false, error: 'no reading with that id' }, { status: 404 }); }
    if (!body.question) return Response.json({ success: false, error: 'question is required' }, { status: 400 });
    const result = await runReading({ ...body, mode: body.mode || 'discover', fast: body.fast !== undefined ? !!body.fast : false });
    return respond(result, body.format);
  } catch (error) {
    if (error?.status === 409) return Response.json({ success: false, error: error.message, readingId: error.readingId || null }, { status: 409 }); // a requestId bound to another question
    console.error('External reading error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to generate reading' }, { status: 500 });
  }
}

// GET endpoint - documentation OR reading via query params
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('question');
  const format = searchParams.get('format') || 'json';

  // Retrieval by id: the persisted reading, never a new draw
  const readingId = searchParams.get('readingId');
  if (readingId) {
    try {
      const db = ledger(); if (!db) return Response.json({ success: false, error: 'the ledger is not configured' }, { status: 503 });
      const have = await fetchById(db, readingId);
      return have ? respond(have, format) : Response.json({ success: false, error: 'no reading with that id' }, { status: 404 });
    } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
  }

  if (!question) return Response.json(apiDocs());

  try {
    const result = await runReading({
      question,
      context: searchParams.get('context') || '',
      cardCount: parseInt(searchParams.get('cardCount')) || 1,
      mode: searchParams.get('mode') || 'discover',
      fast: searchParams.get('fast') !== 'false',
      voice: searchParams.get('voice') || null, // .685: the register; absent = plain (what a user reads)
      requestId: searchParams.get('requestId') || null,
      monitor: searchParams.get('monitor') || null,
      collectiveScope: searchParams.get('collectiveScope') || null,
      scopeSubject: searchParams.get('scopeSubject') || null,
      stance: { complexity: 'friend', voice: 'warm', focus: 'feel', density: 'essential', scope: 'here', seriousness: 'grounded' }
    });
    return respond(result, format);
  } catch (error) {
    if (error?.status === 409) return Response.json({ success: false, error: error.message, readingId: error.readingId || null }, { status: 409 }); // a requestId bound to another question
    console.error('External reading error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to generate reading' }, { status: 500 });
  }
}
