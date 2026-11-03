// scripts/reading_feedback_test.mjs — BRIEF 08 item 1, THE FEEDBACK DOOR. Mocked auth and an in-memory database; no network, no accounts.
//   node scripts/reading_feedback_test.mjs
import { handleFeedbackPost, handleFeedbackGet, handleAdminFeedbackGet, toCsv, CSV_HEADER } from '../lib/readingFeedback.js';
import { getAuthUser } from '../lib/requireUser.js';
import { requireAdmin } from '../lib/adminAuth.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); } };

// ---- a tiny in-memory stand-in for the service-role client: from().select().eq().order().range().maybeSingle()/single(), upsert(onConflict) ----
function fakeDb(tables) {
  let seq = 0;
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.rng = null; this.one = null; }
    select() { return this; }
    eq(k, v) { this.f.push([k, v]); return this; }
    order(k, { ascending = true } = {}) { this.ord = [k, ascending]; return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    single() { this.one = 'single'; return this; }
    upsert(row, { onConflict } = {}) { this.op = 'upsert'; this.row = row; this.keys = String(onConflict || 'id').split(','); return this; }
    run() {
      const rows = tables[this.t] || (tables[this.t] = []);
      if (this.op === 'upsert') {
        let hit = rows.find((r) => this.keys.every((k) => r[k] === this.row[k]));
        if (hit) Object.assign(hit, this.row);
        else { hit = { id: `fb-${++seq}`, created_at: new Date(Date.now() + seq * 1000).toISOString(), ...this.row }; rows.push(hit); }
        return { data: { ...hit }, error: null };
      }
      let out = rows.filter((r) => this.f.every(([k, v]) => r[k] === v));
      if (this.ord) { const [k, asc] = this.ord; out = [...out].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (asc ? 1 : -1)); }
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
      if (this.one) return out.length ? { data: { ...out[0] }, error: null } : { data: null, error: this.one === 'single' ? { message: 'no rows' } : null };
      return { data: out.map((r) => ({ ...r })), error: null };
    }
    then(res, rej) { try { res(this.run()); } catch (e) { rej(e); } }
  }
  return { from: (t) => new Q(t), tables };
}

const ME = { id: '11111111-1111-4111-8111-111111111111', email: 'me@example.test' };
const THEM = { id: '22222222-2222-4222-8222-222222222222', email: 'them@example.test' };
const MINE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const THEIRS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OLD = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const db = fakeDb({ user_readings: [
  { id: MINE, user_id: ME.id, prompt: 'form-2' },
  { id: THEIRS, user_id: THEM.id, prompt: 'form-1' },
  { id: OLD, user_id: ME.id, prompt: null },
], reading_feedback: [] });
const SET_NAMES = ['handing', 'form-1', 'form-2'];
const asUser = (u) => ({ getUser: async () => u, db, version: '9.9.9-test', setNames: SET_NAMES });
const post = (body, headers = {}) => new Request('http://local.test/api/reading-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const get = (url, headers = {}) => new Request(url, { headers });

console.log('THE ROUTE (POST /api/reading-feedback):');
{
  const r = await handleFeedbackPost(post({ readingId: MINE, verdict: 'landed' }), asUser(null));
  check('no auth (mocked) → 401', r.status === 401);
  const r2 = await handleFeedbackPost(post({ readingId: MINE, verdict: 'landed' }), { ...asUser(null), getUser: getAuthUser });
  check('no Authorization header, the real getAuthUser → 401', r2.status === 401);
  check('nothing written without auth', db.tables.reading_feedback.length === 0);
}
{
  const r = await handleFeedbackPost(post({ readingId: MINE, verdict: 'landed', text: '  it named the thing  ', version: '0.0.1-client', prompt_set: 'handing' }), asUser(ME));
  const j = await r.json();
  const row = db.tables.reading_feedback[0];
  check('own reading → 200', r.status === 200, JSON.stringify(j));
  check('one row stored', db.tables.reading_feedback.length === 1);
  check('verdict and trimmed text stored', row?.verdict === 'landed' && row?.text === 'it named the thing');
  check('user_id is the token\'s user', row?.user_id === ME.id);
  check('version stamped server-side (client\'s 0.0.1-client ignored)', row?.version === '9.9.9-test');
  check('prompt_set stamped from the reading\'s own record (client\'s "handing" ignored)', row?.prompt_set === 'form-2');
}
{
  const before = { ...db.tables.reading_feedback[0] };
  const r = await handleFeedbackPost(post({ readingId: MINE, verdict: 'partly', text: '' }), asUser(ME));
  const row = db.tables.reading_feedback[0];
  check('second tap → 200', r.status === 200);
  check('second tap updates, does not duplicate (still 1 row)', db.tables.reading_feedback.length === 1);
  check('second tap: verdict now partly, empty text → null', row.verdict === 'partly' && row.text === null);
  check('second tap: same row id and created_at', row.id === before.id && row.created_at === before.created_at);
}
{
  const r = await handleFeedbackPost(post({ readingId: THEIRS, verdict: 'not_for_me', text: 'not mine to say' }), asUser(ME));
  check('someone else\'s reading → refused (404)', r.status === 404);
  check('nothing written for someone else\'s reading', !db.tables.reading_feedback.some((x) => x.reading_id === THEIRS));
  const r2 = await handleFeedbackPost(post({ readingId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', verdict: 'landed' }), asUser(ME));
  check('a reading that does not exist → 404 (same answer as someone else\'s)', r2.status === 404);
}
{
  check('bad verdict → 400', (await handleFeedbackPost(post({ readingId: MINE, verdict: 'great' }), asUser(ME))).status === 400);
  check('bad readingId → 400', (await handleFeedbackPost(post({ readingId: 'nope', verdict: 'landed' }), asUser(ME))).status === 400);
  check('not JSON → 400', (await handleFeedbackPost(new Request('http://local.test/x', { method: 'POST', body: '{' }), asUser(ME))).status === 400);
  check('no database → 500', (await handleFeedbackPost(post({ readingId: MINE, verdict: 'landed' }), { ...asUser(ME), db: null })).status === 500);
  const r = await handleFeedbackPost(post({ readingId: OLD, verdict: 'not_for_me', text: 'x'.repeat(5000) }), asUser(ME));
  const row = db.tables.reading_feedback.find((x) => x.reading_id === OLD);
  check('a reading with no recorded prompt set → prompt_set null (never guessed)', r.status === 200 && row?.prompt_set === null);
  check('text capped at 4000', row?.text?.length === 4000);
  await handleFeedbackPost(post({ readingId: OLD, verdict: 'not_for_me', text: '🌱'.repeat(4001) }), asUser(ME));
  const row2 = db.tables.reading_feedback.find((x) => x.reading_id === OLD);
  check('text capped at 4000 CHARACTERS (as the SQL char_length counts), no emoji split', Array.from(row2.text).length === 4000 && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(row2.text));
}

console.log('THE ROUTE (GET /api/reading-feedback):');
{
  check('no auth → 401', (await handleFeedbackGet(get(`http://local.test/api/reading-feedback?readingId=${MINE}`), asUser(null))).status === 401);
  const j = await (await handleFeedbackGet(get(`http://local.test/api/reading-feedback?readingId=${MINE}`), asUser(ME))).json();
  check('own row comes back', j.feedback?.verdict === 'partly');
  const j2 = await (await handleFeedbackGet(get(`http://local.test/api/reading-feedback?readingId=${MINE}`), asUser(THEM))).json();
  check('another user asking about my reading gets nothing', j2.feedback === null);
}

console.log('THE ADMIN ROUTE (GET /api/admin/feedback):');
{
  const r = await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback'), { requireAdmin, db });
  check('no token, the real requireAdmin → 401', r.status === 401);
  const r2 = await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback', { Authorization: 'Bearer' }), { requireAdmin, db });
  check('malformed token → 401', r2.status === 401);
  const deny403 = async () => ({ ok: false, response: Response.json({ error: 'Admin only' }, { status: 403 }) });
  check('signed in but not admin (mocked) → 403', (await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback'), { requireAdmin: deny403, db })).status === 403);

  const okAdmin = async () => ({ ok: true, user: { id: 'admin' } });
  // a few more rows from other versions
  db.tables.reading_feedback.push(
    { id: 'fb-x1', reading_id: THEIRS, user_id: THEM.id, verdict: 'landed', text: 'said "yes", then, more\nand a line', version: '0.99.700', prompt_set: 'form-1', created_at: '2026-11-01T10:00:00.000Z' },
    { id: 'fb-x2', reading_id: THEIRS, user_id: ME.id, verdict: 'not_for_me', text: '=HYPERLINK("http://x")', version: '0.99.700', prompt_set: 'form-1', created_at: '2026-11-01T11:00:00.000Z' },
  );
  const all = await (await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback'), { requireAdmin: okAdmin, db })).json();
  check('admin list: all rows', all.rows?.length === 4, JSON.stringify(all).slice(0, 200));
  check('admin list: newest first', all.rows.every((r, i, a) => i === 0 || a[i - 1].created_at >= r.created_at));
  check('admin list: versions for the filter', JSON.stringify(all.versions) === JSON.stringify(['9.9.9-test', '0.99.700']), JSON.stringify(all.versions));
  const byV = await (await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback?version=0.99.700'), { requireAdmin: okAdmin, db })).json();
  check('filter by version', byV.rows.length === 2 && byV.rows.every((r) => r.version === '0.99.700'));
  const byVV = await (await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback?version=0.99.700&verdict=landed'), { requireAdmin: okAdmin, db })).json();
  check('filter by version and verdict', byVV.rows.length === 1 && byVV.rows[0].id === 'fb-x1');
  check('bad verdict filter → 400', (await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback?verdict=meh'), { requireAdmin: okAdmin, db })).status === 400);

  const csvRes = await handleAdminFeedbackGet(get('http://local.test/api/admin/feedback?version=0.99.700&format=csv'), { requireAdmin: okAdmin, db });
  const csv = await csvRes.text();
  check('CSV: content type', (csvRes.headers.get('content-type') || '').startsWith('text/csv'));
  check('CSV: attachment filename carries the filter', /filename="reading_feedback_0\.99\.700\.csv"/.test(csvRes.headers.get('content-disposition') || ''));
  check('CSV: header row', csv.split('\r\n')[0] === CSV_HEADER.join(','));
  check('CSV: quotes, commas and line breaks quoted', csv.includes('"said ""yes"", then, more\nand a line"'));
  check('CSV: a formula-looking cell is defused', csv.includes(`"'=HYPERLINK(""http://x"")"`));
  check('CSV: header + 2 filtered rows', csv.trim().split('\r\n').length === 3, JSON.stringify(csv));
  console.log('\n  CSV as exported (version=0.99.700):\n' + csv.split('\r\n').map((l) => `    | ${l}`).join('\n'));
  check('CSV of nothing is the header alone', toCsv([]) === CSV_HEADER.join(',') + '\r\n');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
