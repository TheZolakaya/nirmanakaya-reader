// BENCH — THE PROPOSITION LAYER, by field (Air's order, 2026-10-05: status first, back-in-balance second, medicine third; each isolated; the founder:
// "run through everything that was in that list"). The frozen Corpus B ten, re-rendered under the PRODUCTION Plain voice (.690) with the chosen record
// fields replaced by the frozen plain propositions — nothing else moves (voice, guards, signature, seat, field).
//   npx tsx scripts/bench_proposition_layer.mjs --fields back            → BENCH_Proposition_back_Corpus_B_2026-10-05.md
//   npx tsx scripts/bench_proposition_layer.mjs --fields medicine
//   npx tsx scripts/bench_proposition_layer.mjs --fields status,back,medicine   (the sum)
// Fields: status = the status field's two record lines (scripts/status_propositions_2026-10-05.json) · back = the WHEN IT IS BACK IN BALANCE line ·
// medicine = the medicine block's what-it-is / more / balanced face / mechanism lines (scripts/propositions_back_and_medicine_2026-10-05.json).
// The headers (canonical names) always stay: the Handing's lanes and the medicine-name check key on them.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FIELDS = new Set(arg('--fields', 'back').split(',').map((s) => s.trim())); const TAG = [...FIELDS].join('_');
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const ST = JSON.parse(fs.readFileSync('scripts/status_propositions_2026-10-05.json', 'utf8'));
const BM = JSON.parse(fs.readFileSync('scripts/propositions_back_and_medicine_2026-10-05.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards, interpretation').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
const LIT = fs.readFileSync('G:/My Drive/For Air Review/BENCH_Plain_Literal_First_Corpus_B_2026-10-05.md', 'utf8');
const litLane = (key) => { const part = LIT.split(/^## (?=readability)/m).find((p) => p.startsWith(key)); return part?.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; };
const out = [`# BENCH — the proposition layer, fields: ${[...FIELDS].join(' + ')} — on the frozen Corpus B draws`, `*True, 2026-10-05. Lane A = production Plain (.690) with the named record field(s) replaced by the frozen plain propositions; lane B = the .690 literal-first render with the record untouched (same voice; instrument numbers in BENCH_True_Readability_Corpus_B_Literal_2026-10-05.md). Same draws, same questions.*`, '', '| run | substituted lines | words A | flags A |', '|---|---|---|---|'];
const key = []; const detail = [];
for (const r of rows) {
  let subs = 0; const id = r.request_id;
  const hook = (text, draws) => {
    const st = draws[0].status; let t = text;
    if (FIELDS.has('status')) { const g = ST.general[String(st)]; const c = ST.card[id]; if (g) t = t.replace(/^  in general: .*$/m, () => { subs++; return `  in plain words: ${g.plain}`; }); if (c) t = t.replace(/^  on THIS card: .*$/m, () => { subs++; return `  on THIS card, in plain words: ${c.plain}`; }); }
    if (FIELDS.has('back')) { const b = BM.back[id]; if (b) t = t.replace(/^  WHEN IT IS BACK IN BALANCE \(.*?\): .*$/m, () => { subs++; return `  WHEN IT IS BACK IN BALANCE, in plain words (what the medicine is FOR; the other side): ${b.plain}`; }); }
    if (FIELDS.has('medicine')) { const m = BM.medicine[id]; const mech = BM.mechanism[String(st)]; const i = t.indexOf('THE MEDICINE SIGNATURE'); const j = t.indexOf('THE FIELD', i); if (m && i >= 0) { let block = t.slice(i, j >= 0 ? j : undefined);
      block = block.replace(/^  what it is: .*$/m, () => { subs++; return `  what it is, in plain words: ${m.what_plain}`; }).replace(/^  more: .*\n/m, () => { subs++; return ''; }).replace(/^  its balanced face \(.*?\): .*$/m, () => { subs++; return `  the face it speaks from, in plain words: ${m.face_plain}`; });
      if (mech) block = block.replace(/^  mechanism: .*$/m, () => { subs++; return `  how the way through works, in plain words: ${mech.plain}`; });
      t = t.slice(0, i) + block + (j >= 0 ? t.slice(j) : ''); } }
    return t; };
  let it; try { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plain', requestId: null }, r.draws, { drawText: hook }); it = res.interpretation; } catch (e) { it = { error: e.message }; }
  const tA = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  out.push(`| ${id} | ${subs} | ${tA.split(/\s+/).length} | ${(it.flags || []).join(',') || '—'} |`); key.push(`${id}: A = prop_${TAG}, B = literal`);
  const show = (x) => x.error ? `error: ${x.error}` : `*${x.gist || ''}*\n\n${x.text || ''}\n\n> ◈ ${x.medicine || ''}\n\n*${x.question || ''}*`;
  detail.push(`## ${id}\n**Q:** ${r.question}\n**Draw:** ${r.cards.map((c) => c.signature).join(' · ')}\n\n### A\n${show(it)}\n\n### B\n${litLane(id)}\n`);
  process.stdout.write(`${id}: ${subs} line(s) substituted, ${tA.split(/\s+/).length} words${it.flags?.length ? ' flags ' + it.flags.join(',') : ''}\n`);
}
out.push('', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const name = `BENCH_Proposition_${TAG}_Corpus_B_2026-10-05.md`; fs.writeFileSync('G:/My Drive/For Air Review/' + name, out.join('\n')); console.log('shelf:', name);
const glass = [`# CORPUS B, run one — the same ten questions and draws, rendered with the plain propositions in the record for: ${[...FIELDS].join(' + ')} (production Plain voice)`, '*For a fresh reader. Read each once, as a message from someone, and answer the nine questions. You do not know how it works and nobody will explain it.*', ''];
for (const d of detail) { const k = d.split('\n')[0].replace('## ', ''); const q = (d.match(/\*\*Q:\*\* (.+)/) || [])[1] || ''; const a = d.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; glass.push('---', '', `**requestId:** ${k}`, '', `You asked: ${q}`, '', a.replace(/^\*(.+?)\*$/m, '$1').replace(/^> ◈ ?/m, 'The way through: ').replace(/\n\*([^*\n]+\?)\*\s*$/, '\n$1'), ''); }
fs.writeFileSync(`G:/My Drive/For Air Review/CORPUS_B_Run_One_Proposition_${TAG}_For_Fresh_Eyes_2026-10-05.md`, glass.join('\n'));
