// DUMP — a ledger run for inspection: per cycle the question, context, each card's signature / status record line / correction, the FIELD line the
// Reader was handed, and the full interpretation. Writes markdown to stdout.   npx tsx scripts/ledger_dump_run.mjs <request_id prefix>
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { fieldLines } = await import('../lib/nounField.js');
const { getComponent } = await import('../lib/corrections.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const prefix = process.argv[2]; if (!prefix) throw new Error('prefix');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await db.from('external_readings').select('*').like('request_id', prefix + '%').order('created_at', { ascending: true });
const out = [`# LEDGER DUMP — ${prefix}* (${data.length} readings)`, ''];
for (const r of data) {
  out.push(`## ${r.request_id} · v${r.reader_version} · fast=${r.fast}`, `**Q:** ${r.question}`, r.context ? `**Context:** ${r.context}` : '**Context:** (none)', '');
  for (const [i, c] of (r.cards || []).entries()) {
    const d = r.draws[i]; let fl = ''; try { fl = fieldLines(d, r.question || '') || ''; } catch (e) { fl = `(field: ${e.message})`; }
    out.push(`- **${c.signature}** — status record: "${c.status?.record || ''}" · medicine: ${c.correction ? `${c.correction.target} (${c.correction.type}) — ${c.correction.via}` : 'none (Balanced)'}`, `  transient desc: ${c.transient?.description || ''} · seat: ${c.position?.name} (${c.position?.house}/${c.position?.channel})`, `  FIELD: ${String(fl).replace(/\n/g, ' ').slice(0, 400)}`);
  }
  const it = r.interpretation || {};
  out.push('', `**gist:** ${it.gist || ''}`, '', it.text || it.raw || JSON.stringify(it).slice(0, 2000), '', `**◈ medicine:** ${it.medicine || ''}`, '', `**question:** ${it.question || ''}`, `**flags:** ${(it.flags || []).join(', ')}`, '');
}
out.push('## Merge (43) — the record', `desc: ${getComponent(43)?.description} · ${getComponent(43)?.extended || ''}`, `acts: ${MEDICINE_ACTS[43]?.acts.join(' · ')} · people: ${MEDICINE_ACTS[43]?.people}`, `DEFS: ${JSON.stringify(DEFS.signatures?.[43] || {}).slice(0, 900)}`);
process.stdout.write(out.join('\n'));
