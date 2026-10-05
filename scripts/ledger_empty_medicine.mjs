// how often does a DONE opening leave the API door with an empty medicine box? (the .675 count rule can keep an original whose box is empty)
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('external_readings').select('request_id, reader_version, status, interpretation, created_at').gte('created_at', '2026-10-04T00:00:00Z').eq('status', 'done').order('created_at', { ascending: true });
if (error) throw error;
const by = {};
for (const r of rows) { const v = r.reader_version || '?'; by[v] ||= { n: 0, empty: 0, kept: 0, ids: [] }; by[v].n++; const med = String(r.interpretation?.medicine || '').trim(); if (!med) { by[v].empty++; by[v].ids.push(r.request_id || '(none)'); if (/original kept/.test(r.interpretation?.medicineJudge?.decision || '')) by[v].kept++; } }
console.log(`${rows.length} done readings since 2026-10-04`);
for (const [v, s] of Object.entries(by)) console.log(`${v}: ${s.n} done, ${s.empty} empty medicine${s.empty ? ` (${s.kept} after an 'original kept' retry) — ${s.ids.slice(0, 6).join(', ')}` : ''}`);
