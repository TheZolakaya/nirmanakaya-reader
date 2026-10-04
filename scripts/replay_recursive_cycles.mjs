// REPLAY THE FROZEN CYCLES (2026-10-04): the recursive reader's ten draws (+ cycle 1 and the Mind seat's own) are in the ledger.
// Same draws, same questions, through the Handing; the June reader's stored words beside them; the binding lint on both.
//   npx tsx scripts/replay_recursive_cycles.mjs [voice=plain]   (deep lets the names onto the glass, so the binding test can bite)
import fs from 'node:fs';
const ENV = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue; const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v; }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { bindingFlags, lintOutput } = await import('../lib/bakeoff/lint.js');
const VOICE = ['plain','grown','deep','mystical'].includes(process.argv[2]) ? process.argv[2] : 'plain';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('external_readings').select('*').or('request_id.like.recursive-reader-%,request_id.like.mind-seat-%').order('created_at', { ascending: true });
if (error) throw error;
const L = [`# REPLAY — the frozen cycles through the Handing`, `*True, 2026-10-04. The same draws and questions the recursive reader made through the June reader, replayed through the Handing (v0.99.667, one reader behind both doors), voice ${VOICE}. The draw is held constant; only the reader changed. The binding lint runs on both sets of words.*`, ``, `| cycle | draw | June reader: binding trips | Handing: binding trips | Handing: other flags |`, `|---|---|---|---|---|`];
const details = []; let oldTrips = 0, newTrips = 0, n = 0, usd = 0;
for (const row of rows) {
  const draws = row.draws; const sig = row.cards.map((c) => c.signature + (c.correction ? ` → ${c.correction.target}` : '')).join(' · ');
  const oldText = typeof row.interpretation === 'string' ? row.interpretation : (row.interpretation?.raw || row.interpretation?.text || JSON.stringify(row.interpretation || ''));
  const oldB = bindingFlags(oldText, draws);
  let r = null, err = null; try { r = await handingReading({ question: row.question, context: row.context, cardCount: row.card_count, mode: row.mode, fast: true, voice: VOICE, requestId: null }, draws); } catch (e) { err = e.message; }
  const it = r?.interpretation || {}; const newText = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  const newB = r ? bindingFlags(newText, draws) : []; const other = r ? (it.flags || []).filter((c) => c !== 'binding') : [];
  oldTrips += oldB.length ? 1 : 0; newTrips += newB.length ? 1 : 0; n++;
  L.push(`| ${row.request_id} | ${sig} | ${oldB.length} | ${err ? 'error' : newB.length} | ${other.join(' ') || '—'} |`);
  details.push(`## ${row.request_id}\n**Q:** ${row.question}${row.context ? `\n**Context:** ${row.context}` : ''}\n**Draw:** ${sig}\n\n### The June reader (stored)\n${oldText}\n${oldB.length ? '\n' + oldB.map((f) => `- BINDING: ${f.detail}`).join('\n') : ''}\n\n### The Handing (replayed)\n${err ? `error: ${err}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*\n\nnext: ${(it.next || []).map((x) => `${x.panel} — ${x.why}`).join(' · ')}`}${newB.length ? '\n\n' + newB.map((f) => `- BINDING: ${f.detail}`).join('\n') : ''}${other.length ? `\n\nother flags: ${other.join(', ')}` : ''}\n`);
  process.stdout.write(`${row.request_id}: June ${oldB.length} · Handing ${err ? 'ERR' : newB.length}\n`);
}
L.push(``, `**Readings with at least one binding trip: June reader ${oldTrips}/${n} · Handing ${newTrips}/${n}.**`, ``, ...details);
const out = `G:/My Drive/For Air Review/REPLAY_Recursive_Cycles_Through_The_Handing_${VOICE}_2026-10-04.md`;
fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, `| June ${oldTrips}/${n} · Handing ${newTrips}/${n}`);
