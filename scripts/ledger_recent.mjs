// LEDGER — the most recent external readings: request id, version, status, the judge's flag, the medicine's first words.   npx tsx scripts/ledger_recent.mjs [n=12]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const n = Number(process.argv[2] || 12);
const { data, error } = await db.from('external_readings').select('request_id, created_at, status, interpretation, cards, reader_version, fast').order('created_at', { ascending: false }).limit(n);
if (error) { console.error(error.message); process.exit(1); }
for (const r of data) {
  const it = r.interpretation || {}; const flags = Array.isArray(it.flags) ? it.flags : []; const ver = r.reader_version || '?';
  console.log(`${r.created_at.slice(0, 16)} ${String(r.request_id).slice(0, 60).padEnd(60)} v${ver} fast=${r.fast} ${r.status} | ${(r.cards || []).map((c) => c.signature).join(' · ').slice(0, 90)}\n   flags: ${flags.join(',') || '—'}\n   ◈ ${String(it.medicine || '').slice(0, 110)}`);
}
