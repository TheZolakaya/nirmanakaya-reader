// /app/api/mcp/route.js — THE CONNECTOR DOOR (2026-10-04). A remote MCP server (Streamable HTTP, stateless JSON-RPC 2.0) so a
// ChatGPT connector (Settings → Connectors, developer mode) or a Claude.ai connector can call the Nirmanakaya instrument from an
// ordinary fresh conversation: no Custom GPT, no copy/paste. Same instrument, same ledger as /api/external-reading.
// Tools: get_reading (idempotent with requestId) · retrieve_reading (by readingId, never draws) · search / fetch (the connector
// pair ChatGPT expects: look a reading up in the ledger, fetch one as text).
import { runReading, fetchById, ledger, asText, API_VERSION } from '../../../lib/externalReading.js';
import { VERSION } from '../../../lib/version.js';

export const dynamic = 'force-dynamic';
const PROTOCOL = '2025-06-18';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version', 'Access-Control-Expose-Headers': 'Mcp-Session-Id' };

const RULES = 'ONE GENUINE QUESTION = ONE DRAW. Always pass requestId (e.g. "<experiment>-<date>-<run>-cycle-<n>"); the first call with it makes the one draw and every later call with the same requestId AND the same question returns that same reading, never a second draw — so retry with the SAME requestId if anything fails. A requestId already bound to a DIFFERENT question is refused: one requestId names one question. Before a run, call search with your intended prefix; if anything exists, choose a new prefix. Never reuse a bound requestId for a new question. If status is "pending", call retrieve_reading with the readingId until it is "done". The response has two parts: "draws"/"cards" are the INSTRUMENT (the signature drawn, the seat it landed in, the status 1 Balanced / 2 Too Much / 3 Too Little / 4 Unacknowledged, and the medicine); "interpretation" is the reader\'s CURRENT WORDS. Read the draw yourself first.';

const TOOLS = [
  {
    name: 'get_reading',
    title: 'Nirmanakaya reading',
    description: `Make one reading from the Nirmanakaya instrument for a question. ${RULES}`,
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question, in the asker\'s own words.' },
        requestId: { type: 'string', maxLength: 200, description: 'Your idempotency key, e.g. recursive-reader-cycle-7. Same key → same reading. Always send one.' },
        context: { type: 'string', description: 'Optional context for the reader.' },
        cardCount: { type: 'integer', minimum: 1, maximum: 5, default: 1 },
        mode: { type: 'string', enum: ['discover', 'reflect', 'forge'], default: 'discover' },
        fast: { type: 'boolean', default: true, description: 'true = a short interpretation; false = the full reader (slower, longer).' },
        voice: { type: 'string', enum: ['plain', 'grown', 'deep', 'mystical'], default: 'plain', description: "The register. 'plain' is what people get on the site — plain words, none of the map's vocabulary; pass it to read as a user reads. 'deep' names the map's words and shows the derivation." },
      },
      required: ['question'],
    },
  },
  {
    name: 'retrieve_reading',
    title: 'Retrieve a Nirmanakaya reading',
    description: 'Retrieve a reading already made, by readingId. Never draws.',
    inputSchema: { type: 'object', properties: { readingId: { type: 'string', description: 'The readingId returned by get_reading.' } }, required: ['readingId'] },
  },
  {
    name: 'search',
    description: 'Search the ledger of readings already made: by requestId, readingId, or words of the question. Never draws.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'fetch',
    description: 'Fetch one reading already made, by its id, as text. Never draws.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const text = (t, structured) => ({ content: [{ type: 'text', text: t }], ...(structured ? { structuredContent: structured } : {}), isError: false });

async function callTool(name, args = {}) {
  const db = ledger();
  if (name === 'get_reading') {
    if (!args.question) throw new Error('question is required');
    // parity with the REST GET: the same arguments, the same stance — the transport adds nothing to the reading
    const r = await runReading({ question: String(args.question), context: args.context ? String(args.context) : '', cardCount: parseInt(args.cardCount) || 1, mode: args.mode || 'discover', fast: args.fast !== false, voice: ['plain', 'grown', 'deep', 'mystical'].includes(args.voice) ? args.voice : 'plain', requestId: args.requestId || null, monitor: null, collectiveScope: null, scopeSubject: null, stance: { complexity: 'friend', voice: 'warm', focus: 'feel', density: 'essential', scope: 'here', seriousness: 'grounded' } });
    return text(asText(r), r);
  }
  if (name === 'retrieve_reading' || name === 'fetch') {
    const id = String(args.readingId || args.id || '');
    if (!db) throw new Error('the ledger is not configured');
    const r = await fetchById(db, id);
    if (!r) return { content: [{ type: 'text', text: `no reading with id ${id}` }], isError: true };
    if (name === 'fetch') return text(JSON.stringify({ id: r.readingId, title: r.question, text: asText(r), url: `https://www.nirmanakaya.com/api/external-reading?readingId=${r.readingId}`, metadata: r.metadata }));
    return text(asText(r), r);
  }
  if (name === 'search') {
    if (!db) throw new Error('the ledger is not configured');
    const q = String(args.query || '').trim();
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    let query = db.from('external_readings').select('id, request_id, question, status, created_at').order('created_at', { ascending: false }).limit(10);
    query = uuid ? query.eq('id', q) : query.or(`request_id.eq.${q.replace(/[,()]/g, ' ')},question.ilike.%${q.replace(/[,()%]/g, ' ')}%`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const results = (data || []).map((row) => ({ id: row.id, title: `${row.question.slice(0, 80)}${row.request_id ? ` [${row.request_id}]` : ''} — ${row.status}`, url: `https://www.nirmanakaya.com/api/external-reading?readingId=${row.id}` }));
    return text(JSON.stringify({ results }));
  }
  throw new Error(`unknown tool ${name}`);
}

async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg?.id, -32600, 'invalid request');
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined || id === null;
  try {
    if (method === 'initialize') return ok(id, { protocolVersion: params.protocolVersion || PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'nirmanakaya-reader', title: 'The Nirmanakaya Reader', version: `${VERSION} (api ${API_VERSION})` }, instructions: `The Nirmanakaya instrument, through the same ledger as the REST API. ${RULES}` });
    if (method.startsWith('notifications/')) return null;
    if (method === 'ping') return ok(id, {});
    if (method === 'tools/list') return ok(id, { tools: TOOLS });
    if (method === 'tools/call') { const r = await callTool(params.name, params.arguments || {}); return isNotification ? null : ok(id, r); }
    if (method === 'resources/list') return ok(id, { resources: [] });
    if (method === 'prompts/list') return ok(id, { prompts: [] });
    return err(id, -32601, `method not found: ${method}`);
  } catch (e) {
    if (method === 'tools/call') return ok(id, { content: [{ type: 'text', text: `error: ${e.message}` }], isError: true });
    return err(id, -32603, e.message || 'internal error');
  }
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }
export async function GET() { return new Response('This is the Nirmanakaya MCP endpoint (Streamable HTTP, POST JSON-RPC). Connect it as a connector in ChatGPT (Settings → Connectors, developer mode) or Claude.ai, with no authentication. Docs: https://www.nirmanakaya.com/api/external-reading', { status: 405, headers: { ...CORS, Allow: 'POST, OPTIONS, DELETE', 'Content-Type': 'text/plain; charset=utf-8' } }); }
export async function DELETE() { return new Response(null, { status: 204, headers: CORS }); }
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json(err(null, -32700, 'parse error'), { status: 400, headers: CORS }); }
  const batch = Array.isArray(body);
  const out = (await Promise.all((batch ? body : [body]).map(handle))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers: CORS }); // notifications only
  return Response.json(batch ? out : out[0], { headers: { ...CORS, 'Cache-Control': 'no-store', 'Mcp-Protocol-Version': PROTOCOL } });
}
