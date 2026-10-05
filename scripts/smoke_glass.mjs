import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { fetchById, ledger, asGlass, glassPayload } = await import('../lib/externalReading.js');
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await db.from('external_readings').select('id').eq('request_id', 'recursive-reader-v099683-20261005a-cycle-1').limit(1);
const r = await fetchById(ledger(), data[0].id);
console.log(asGlass(r)); console.log('\nstructured keys:', Object.keys(glassPayload(r)).join(','));
