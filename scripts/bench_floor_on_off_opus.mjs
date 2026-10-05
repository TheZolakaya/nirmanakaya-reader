// BENCH — THE FLOOR ON / FLOOR OFF (an Opus bench instance, 2026-10-05, on True's commission; bench only, nothing ships).
// The frozen Corpus B ten (ledger request_ids readability-2026-10-05-B-1..10), rendered through handingReading with the production Plain
// voice and the CURRENT record. ONE variable: the poured floor. --floor on = production (POUR_FLOOR unset); --floor off = POUR_FLOOR=0
// set in this process before lib/externalReading.js is imported. Lane B of the file = the .690 literal-first render (historical).
// The cell text under each draw (the floor block, exactly as appendFloor builds it, provenance check included) is saved beside the bench
// for the trace (scripts/trace_floor_cells_opus.mjs).
// OpenRouter Flash only: the Anthropic rung of the ladder is disabled in this process (an empty key), so a fall-through fails instead of spending.
//   npx tsx scripts/bench_floor_on_off_opus.mjs --floor on|off
import fs from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FLOOR = arg('--floor', 'on'); if (!['on', 'off'].includes(FLOOR)) throw new Error('--floor on|off');
if (FLOOR === 'off') process.env.POUR_FLOOR = '0'; else delete process.env.POUR_FLOOR;
process.env.ANTHROPIC_API_KEY = ''; // Flash only — no Anthropic fall-through
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
if (FLOOR === 'off' && process.env.POUR_FLOOR !== '0') throw new Error('POUR_FLOOR not 0');
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { appendFloor } = await import('../lib/pour/floorHook.js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
if (error || !rows?.length) throw new Error('ledger: ' + (error?.message || 'no rows'));
const LIT = fs.readFileSync('G:/My Drive/For Air Review/BENCH_Plain_Literal_First_Corpus_B_2026-10-05.md', 'utf8');
const litLane = (key) => { const part = LIT.split(/^## (?=readability)/m).find((p) => p.startsWith(key + '\n')); return part?.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; };
const LANE = `floor_${FLOOR}`;
const out = [`# BENCH — the poured floor ${FLOOR.toUpperCase()} — on the frozen Corpus B draws`, `*Opus bench instance, 2026-10-05. Lane A = production Plain on the current record with the poured floor ${FLOOR === 'on' ? 'ON (as production)' : 'OFF (POUR_FLOOR=0 in the render process)'}; lane B = the .690 literal-first render (historical). Same draws, same questions. OpenRouter Flash.*`, '', '| run | floor blocks with a cell | words A | flags A | served by |', '|---|---|---|---|---|'];
const key = []; const detail = []; const cells = {};
for (const r of rows) {
  const id = r.request_id;
  // the floor exactly as production builds it (independent of whether this lane sends it), for the trace
  const probe = appendFloor([{ role: 'user', content: r.question || '' }], r.draws, { enabled: true });
  const floorText = probe.messages[0].content.slice((r.question || '').length);
  cells[id] = { floorText, withCell: probe.floors };
  let it, usage = {};
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plain', requestId: null }, r.draws); it = res.interpretation; usage = res.usage || {}; break; }
    catch (e) { it = { error: e.message }; console.error(`${id} attempt ${attempt} failed: ${e.message}`); }
  }
  const tA = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  out.push(`| ${id} | ${probe.floors}/${r.draws.length} | ${it.error ? '—' : tA.split(/\s+/).length} | ${(it.flags || []).join(',') || (it.error ? 'ERROR' : '—')} | ${usage.provider || '?'} ${usage.model || ''} |`);
  key.push(`${id}: A = ${LANE}, B = literal`);
  const show = (x) => x.error ? `error: ${x.error}` : `*${x.gist || ''}*\n\n${x.text || ''}\n\n> ◈ ${x.medicine || ''}\n\n*${x.question || ''}*`;
  detail.push(`## ${id}\n**Q:** ${r.question}\n**Draw:** ${r.cards.map((c) => c.signature).join(' · ')}\n\n### A\n${show(it)}\n\n### B\n${litLane(id)}\n`);
  process.stdout.write(`${id}: ${it.error ? 'ERROR ' + it.error : tA.split(/\s+/).length + ' words'} · cells ${probe.floors}/${r.draws.length} · ${usage.provider || '?'} ${usage.model || ''}${it.flags?.length ? ' · flags ' + it.flags.join(',') : ''}\n`);
}
out.push('', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const name = `BENCH_Opus_Floor_${FLOOR.toUpperCase()}_Corpus_B_2026-10-05.md`; fs.writeFileSync('G:/My Drive/For Air Review/' + name, out.join('\n')); console.log('shelf:', name);
fs.writeFileSync('scripts/floor_cells_corpus_b_opus.json', JSON.stringify(cells, null, 2));
