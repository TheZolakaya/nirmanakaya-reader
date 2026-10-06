// TRACE — MEDICINE OPERATION COLLAPSE (Air, 2026-10-06: "78 medicines cannot become 4 journaling prompts"). READ-ONLY.
// The last N medicine-bearing production readings on the site (EZ openings), each stage of the pipeline side by side:
//   1 the draw's partner (the medicine) · 2 the canonical hand-written acts (lib/pour/medicineActs.js) · 3 the record's plain operation line (.697)
//   · 4 the poured floor cell's ask · 5 what the glass told the person to do (the opening's medicine box)
// then the PRIMARY ACTION VERB FAMILY at each stage, classified by the cheap lane against one fixed list. Writes the table to the shelf.
//   npx tsx scripts/trace_medicine_operations.mjs [N=20]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { buildKernel } = await import('../lib/kernel.js');
const { getComponent } = await import('../lib/corrections.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { lookupCell } = await import('../lib/pour/library.js');
const { callProvider } = await import('../lib/provider.js'); const { MODEL_IDS } = await import('../lib/modelConfig.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const P = JSON.parse(fs.readFileSync('lib/data/plain_propositions.json', 'utf8'));
const N = Number(process.argv[2] || 20);
const FAMILIES = ['SAY', 'WRITE', 'ASK', 'OBSERVE', 'CHOOSE', 'STOP', 'KEEP', 'RELEASE', 'MAKE', 'MOVE', 'JOIN', 'SEPARATE', 'PROTECT', 'WAIT', 'CHANGE', 'FEEL', 'OTHER'];
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('user_readings').select('id, created_at, topic, draws, interpretation').order('created_at', { ascending: false }).limit(200);
if (error) throw error;
const items = [];
for (const r of rows) {
  const turns = r.interpretation?.synthesis?._ez?.turns; if (!Array.isArray(turns)) continue;
  const open = turns.find((t) => t.role === 'reader' && String(t.medicine || '').trim()); if (!open) continue;
  const d = (r.draws || [])[0]; if (!d) continue;
  let k = null; try { k = buildKernel(d, DEFS); } catch {} const pid = k?.partnerId; if (pid == null) continue;
  const cell = lookupCell(d.transient, d.position, d.status);
  items.push({ when: r.created_at.slice(0, 16), q: String(r.topic || '').slice(0, 70), draw: `${['', 'Balanced', 'Too Much', 'Too Little', 'Unack.'][d.status]} ${getComponent(d.transient)?.name} in ${getComponent(d.position)?.name}`, partner: getComponent(pid)?.name, acts: (MEDICINE_ACTS[pid]?.acts || []).join(' · '), op: P.medicine?.[String(pid)]?.operation || '', ask: cell?.ask || '(hole)', glass: String(open.medicine).replace(/\s+/g, ' ').trim(), voice: open.voice || '?' });
  if (items.length >= N) break;
}
const SYS = `You classify the PRIMARY PHYSICAL OR BEHAVIOURAL ACTION a piece of advice asks a person to perform — the main verb of what they are to DO, not the reason or the hoped-for result. Choose exactly one family:
SAY (speak, tell, name aloud, declare, admit, voice) · WRITE (write down, journal, list, note, put on paper) · ASK (ask a question of someone) · OBSERVE (look, notice, trace, see, examine, sense) · CHOOSE (decide, pick, commit to a direction) · STOP (stop, refuse, drop a behaviour) · KEEP (keep, hold, maintain, defend, persist) · RELEASE (let go, put down, end, surrender) · MAKE (build, make, create, finish a piece of work, practise) · MOVE (go, take a step, act physically, start) · JOIN (be with, connect, share, celebrate with someone) · SEPARATE (sort, divide, distinguish, set apart) · PROTECT (guard, shield, set a boundary) · WAIT (pause, rest, leave undecided) · CHANGE (adjust, rebalance, alter) · FEEL (feel, let yourself feel, enjoy, take in) · OTHER.
Reply with ONLY lines "<number> <FAMILY>".`;
const classify = async (texts) => { const u = texts.map((t, i) => `${i + 1}. ${t.slice(0, 500)}`).join('\n'); const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 400, system: SYS, messages: [{ role: 'user', content: u }] }, { tag: 'trace' }); const raw = data?.content?.map((c) => c.text || '').join('\n') || ''; if (process.env.TRACE_DEBUG) console.log('RAW:', JSON.stringify(data).slice(0, 600)); const out = {}; for (const l of raw.split('\n')) { const m = l.match(/^\s*(\d+)[^A-Z]*([A-Z]+)/); if (m && FAMILIES.includes(m[2])) out[Number(m[1])] = m[2]; } return texts.map((_, i) => out[i + 1] || 'OTHER'); };
const famActs = await classify(items.map((x) => x.acts.split(' · ')[0] || '')); // the first canonical act (the lead act)
const famOp = await classify(items.map((x) => x.op));
const famAsk = await classify(items.map((x) => x.ask));
const famGlass = await classify(items.map((x) => x.glass));
const tally = (arr) => { const t = {}; for (const f of arr) t[f] = (t[f] || 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${n}`).join(' · '); };
const verbal = (arr) => arr.filter((f) => ['SAY', 'WRITE', 'ASK'].includes(f)).length;
const lines = ['# TRACE — MEDICINE OPERATION COLLAPSE (read-only)', `*True, 2026-10-06, on Air's order. The last ${items.length} medicine-bearing EZ readings on the site. Each stage's primary action classified by the cheap lane against one fixed family list (one vote — a pointer). Columns: the medicine partner; its lead canonical act; the record's plain operation (.697); the floor cell's ask; the glass.*`, '',
  '| stage | verbal families (SAY + WRITE + ASK) | distribution |', '|---|---|---|',
  `| 1 canonical lead act | ${verbal(famActs)} of ${items.length} | ${tally(famActs)} |`, `| 2 record operation (.697) | ${verbal(famOp)} of ${items.length} | ${tally(famOp)} |`, `| 3 floor cell's ask | ${verbal(famAsk)} of ${items.length} | ${tally(famAsk)} |`, `| 4 the glass | ${verbal(famGlass)} of ${items.length} | ${tally(famGlass)} |`, '',
  '## The readings', ''];
items.forEach((x, i) => lines.push(`### ${i + 1}. ${x.when} · ${x.draw} → ${x.partner} · voice ${x.voice}`, `- asked: ${x.q}`, `- canonical acts: ${x.acts} — **${famActs[i]}**`, `- record operation: ${x.op} — **${famOp[i]}**`, `- floor ask: ${x.ask} — **${famAsk[i]}**`, `- the glass: ${x.glass.slice(0, 400)} — **${famGlass[i]}**`, ''));
fs.writeFileSync('G:/My Drive/For Air Review/TRACE_True_Medicine_Operation_Collapse_2026-10-06.md', lines.join('\n'));
console.log(lines.slice(0, 11).join('\n'));
console.log('\nper reading (lead act → op → ask → glass):'); items.forEach((x, i) => console.log(`${String(i + 1).padStart(2)} ${x.partner.padEnd(22)} ${famActs[i].padEnd(9)} ${famOp[i].padEnd(9)} ${famAsk[i].padEnd(9)} ${famGlass[i]}`));
