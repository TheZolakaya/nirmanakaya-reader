// Upload a stored set to the pour_cells table (upsert on set/card/seat/status). Needs the service role key in .env.local
// (SUPABASE_SERVICE_ROLE_KEY) and the table from supabase/pour_cells.sql. Values are never printed.
//   npx tsx scripts/pour_upload.mjs [set=l] [author=or-v4.1-flash]
import fs from 'node:fs';
import path from 'node:path';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import { createClient } from '@supabase/supabase-js';
const [SET = 'l', AUTHOR = 'or-v4.1-flash'] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const dir = `data/pour/cells_${SET}_${AUTHOR}`;
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const c of r.cells) rows.push({ set_key: SET, author: r.author, prompt_version: r.prompt, schema_version: r.schema, signature_id: r.signature_id, position_id: r.position_id, status: c.status, partner_id: c.provenance?.partner_id ?? null, partner: c.provenance?.partner ?? null, mechanism: c.provenance?.mechanism ?? null, tense: c.tense, verb: c.verb, place: c.place, ask: c.ask, core: c.core, sheet_line: c.sheetLine, attempts: r.attempts?.length || 1, hard_open: (c.lint || []).filter((x) => x.hard).length, lint: c.lint || [], authored_at: r.date });
}
let done = 0;
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await sb.from('pour_cells').upsert(rows.slice(i, i + 200), { onConflict: 'set_key,signature_id,position_id,status' });
  if (error) { console.error('upsert failed at', i, error.message); process.exit(1); }
  done += Math.min(200, rows.length - i);
}
console.log(`uploaded ${done} cells of set ${SET} to pour_cells`);
