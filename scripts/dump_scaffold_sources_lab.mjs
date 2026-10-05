// LAB (Air's scaffold task, 2026-10-05): for each frozen Corpus B draw, every canonical source a scaffold field may trace to — the signature,
// the seat, the status (canonical + plain), the card's state line, the back-in-balance face, the medicine partner + its operation line + its acts,
// the mechanism, and the current poured cell (for contrast only). Written to %TEMP%/scaffold_sources.txt.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { getComponent } = await import('../lib/corrections.js');
const { buildKernel } = await import('../lib/kernel.js');
const { STATUS_INFO } = await import('../lib/constants.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { lookupCell } = await import('../lib/pour/library.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const P = JSON.parse(fs.readFileSync('lib/data/plain_propositions.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, draws').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
const KEY = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
const out = [];
for (const r of rows) {
  const d = r.draws[0]; const sig = getComponent(d.transient) || {}; const seat = getComponent(d.position) || {}; const def = DEFS.signatures[d.transient] || {};
  const k = buildKernel(d, DEFS); const pid = k?.partnerId; const partner = pid != null ? getComponent(pid) : null;
  const parentId = def.class === 'Archetype' ? d.transient : def.associatedArchetype; const parent = DEFS.signatures[parentId] || {};
  const cell = lookupCell(d.transient, d.position, d.status);
  out.push(`\n======== ${r.request_id} — ${STATUS_INFO[d.status].name} ${sig.name} in ${seat.name}  (sig ${d.transient}, seat ${d.position}, status ${d.status})`,
    `QUESTION: ${r.question}`,
    `SIGNATURE: ${sig.name} (${def.class}${def.associatedArchetypeName ? `; parent ${def.associatedArchetypeName}` : ''}) — ${sig.description}`,
    `SEAT: ${seat.name} — ${seat.description}`,
    `STATUS canonical: ${STATUS_INFO[d.status].description} | plain: ${P.general[d.status].plain}`,
    def.class === 'Archetype' ? `STATE LINE (card): ${def.states?.[KEY[d.status]]}` : `STATE LINE (parent ${parent.name}): ${parent.states?.[KEY[d.status]]}`,
    d.status !== 1 ? `BACK-IN-BALANCE (parent face): ${parent.states?.balanced} | plain: ${P.states[String(parentId)]?.balanced?.plain}` : `BALANCED — the partner is growth`,
    partner ? `PARTNER: ${partner.name} — ${partner.description} | OPERATION: ${P.medicine[String(pid)]?.operation}` : 'PARTNER: none',
    partner ? `ACTS: ${(MEDICINE_ACTS[pid]?.acts || []).join(' · ')}` : '',
    `MECHANISM: ${P.mechanism[d.status].plain}`,
    cell ? `CELL (contrast only) tense: ${cell.tense} | place: ${cell.place} | ask: ${cell.ask}` : 'CELL: hole');
}
fs.writeFileSync(process.env.TEMP + '/scaffold_sources.txt', out.join('\n')); console.log('written');
