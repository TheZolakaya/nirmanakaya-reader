// /app/api/recognition/route.js — the Recognition pass as a route (2026-11-06, the four-arm run). A sibling of the external
// reading door that runs the same engine; the logic, the gate and the ledger live in lib/recognitionDoor.js.
import { handleRecognition, recognitionDocs } from '../../../lib/recognitionDoor.js';
import { keyFrom } from '../../../lib/apiKeys.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // diag makes two model calls (the classifier, the validator) when paid runs are on

export async function HEAD() { return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } }); }

// GET never draws: it documents the door
export async function GET() { return Response.json(recognitionDocs(), { headers: { 'Cache-Control': 'no-store' } }); }

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ success: false, error: 'the body must be JSON' }, { status: 400 }); }
  try {
    return await handleRecognition(body, keyFrom(request), { format: new URL(request.url).searchParams.get('format') });
  } catch (error) {
    console.error('Recognition error:', error);
    return Response.json({ success: false, error: error?.message || 'the recognition failed' }, { status: 500 });
  }
}
