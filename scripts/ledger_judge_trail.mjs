import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await db.from('external_readings').select('request_id, reader_version, interpretation').like('request_id', (process.argv[2] || 'readability-') + '%').order('created_at', { ascending: true });
for (const r of data) console.log(r.request_id.padEnd(32), 'v' + r.reader_version, JSON.stringify(r.interpretation?.medicineJudge || null), '| flags:', (r.interpretation?.flags || []).join(','));
