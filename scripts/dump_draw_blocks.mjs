// dump the exact draw block the Reader is handed for each frozen Corpus B draw (the record, as text)
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { fmtDrawForEz, spreadKeyFor } = await import('../lib/ezOpening.js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
const out = [];
for (const r of rows) { out.push(`\n\n======== ${r.request_id} — ${r.cards.map((c) => c.signature).join(' · ')}\nQ: ${r.question}\n`); out.push(fmtDrawForEz(r.draws, r.mode || 'discover', spreadKeyFor(r.draws.length), false, null, null, null, true, r.question, r.context || '')); }
fs.writeFileSync(process.env.TEMP + '/draw_blocks.txt', out.join('\n')); console.log('written', process.env.TEMP + '/draw_blocks.txt');
