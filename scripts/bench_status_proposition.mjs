// BENCH — THE STATUS PROPOSITION (Air's order, 2026-10-05: "status line first… a parallel human-facing field, not a rewrite of the canonical
// record… freeze the propositions… rerender the same ten with only the status proposition substituted… no new voice rule").
// The frozen Corpus B ten, re-rendered with the PRODUCTION Plain voice (.690, literal-first) and ONE change in the record the Reader is handed:
// the status field's two record lines ("in general: …" and "on THIS card: …") are replaced by the frozen plain propositions in
// scripts/status_propositions_2026-10-05.json. The status header (its canonical name) stays, so the Handing's status lanes still fire.
// Nothing else moves: signature, seat, back-in-balance face, medicine, field, voice, guards.
//   npx tsx scripts/bench_status_proposition.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const PROPS = JSON.parse(fs.readFileSync('scripts/status_propositions_2026-10-05.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards, interpretation').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
// lane B for the A/B file = the .690 literal-first render (same voice, no proposition), from its bench file on the shelf
const LIT = fs.readFileSync('G:/My Drive/For Air Review/BENCH_Plain_Literal_First_Corpus_B_2026-10-05.md', 'utf8');
const litLane = (key) => { const part = LIT.split(/^## (?=readability)/m).find((p) => p.startsWith(key)); const a = part?.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; return a; };
const out = [`# BENCH — the status proposition on the frozen Corpus B draws`, `*True, 2026-10-05. Lane A = production Plain (.690) with the status field's record lines replaced by the frozen plain propositions (scripts/status_propositions_2026-10-05.json); lane B = the .690 literal-first render with the record untouched (the apples-to-apples baseline; its instrument numbers are in BENCH_True_Readability_Corpus_B_Literal_2026-10-05.md). Same draws, same questions, same voice.*`, '', '| run | substituted lines | words A | flags A |', '|---|---|---|---|'];
const key = []; const detail = [];
for (const r of rows) {
  let subs = 0;
  const hook = (text, draws) => { const st = draws[0].status; const g = PROPS.general[String(st)]; const c = PROPS.card[r.request_id]; let t = text;
    if (g) t = t.replace(/^  in general: .*$/m, () => { subs++; return `  in plain words: ${g.plain}`; });
    if (c) t = t.replace(/^  on THIS card: .*$/m, () => { subs++; return `  on THIS card, in plain words: ${c.plain}`; });
    return t; };
  let it; try { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plain', requestId: null }, r.draws, { drawText: hook }); it = res.interpretation; } catch (e) { it = { error: e.message }; }
  const tA = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  out.push(`| ${r.request_id} | ${subs} | ${tA.split(/\s+/).length} | ${(it.flags || []).join(',') || '—'} |`);
  key.push(`${r.request_id}: A = statusprop, B = literal`);
  const show = (x) => x.error ? `error: ${x.error}` : `*${x.gist || ''}*\n\n${x.text || ''}\n\n> ◈ ${x.medicine || ''}\n\n*${x.question || ''}*`;
  detail.push(`## ${r.request_id}\n**Q:** ${r.question}\n**Draw:** ${r.cards.map((c) => c.signature).join(' · ')}\n\n### A\n${show(it)}\n\n### B\n${litLane(r.request_id)}\n`);
  process.stdout.write(`${r.request_id}: ${subs} line(s) substituted, ${tA.split(/\s+/).length} words${it.flags?.length ? ' flags ' + it.flags.join(',') : ''}\n`);
}
out.push('', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const path = 'G:/My Drive/For Air Review/BENCH_Status_Proposition_Corpus_B_2026-10-05.md'; fs.writeFileSync(path, out.join('\n')); console.log('shelf:', path);
const glass = ['# CORPUS B, run one — the same ten questions and draws, rendered with the status proposition in the record (production Plain voice)', '*For a fresh reader. Read each once, as a message from someone, and answer the nine questions. You do not know how it works and nobody will explain it.*', ''];
for (const d of detail) { const k = d.split('\n')[0].replace('## ', ''); const q = (d.match(/\*\*Q:\*\* (.+)/) || [])[1] || ''; const a = d.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; glass.push('---', '', `**requestId:** ${k}`, '', `You asked: ${q}`, '', a.replace(/^\*(.+?)\*$/m, '$1').replace(/^> ◈ ?/m, 'The way through: ').replace(/\n\*([^*\n]+\?)\*\s*$/, '\n$1'), ''); }
fs.writeFileSync('G:/My Drive/For Air Review/CORPUS_B_Run_One_Status_Proposition_For_Fresh_Eyes_2026-10-05.md', glass.join('\n'));
