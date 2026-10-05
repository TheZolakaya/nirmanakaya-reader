// BENCH — LITERAL-FIRST PLAIN on the frozen Corpus B draws (Air's order, 2026-10-05): the ten wild readings' own draws and questions,
// re-rendered with the `plainlit` register (Plain + LITERAL_FIRST), written in the bench A/B format so scripts/bench_readability.mjs can
// put the eight questions (+ reading level) to them: `--file BENCH_Plain_Literal_First_Corpus_B_2026-10-05.md --lane literal --no-exhibit`.
// The original .688 renderings are in the ledger (readability-2026-10-05-B-*) and frozen on the shelf as CORPUS_B_Run_One….
//   npx tsx scripts/bench_plain_literal.mjs [reps=1]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const REPS = Math.max(1, Number(process.argv[2] || 1));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards, interpretation').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
console.log(`${rows.length} frozen draws`);
const out = [`# BENCH — literal-first Plain (the plainlit register) on the frozen Corpus B draws`, `*True, 2026-10-05. Lane A = plainlit (Plain + LITERAL_FIRST); lane B = the original .688 Plain rendering the fresh GPT read. Same draws, same questions. Readability: scripts/bench_readability.mjs on this file, lane literal vs lane original.*`, '', '| run | words A/B | figures on glass A/B (door/anchor/bracing/signing/holding it as yours/hands/write-access/seat/vacuum) | flags A |', '|---|---|---|---|'];
const FIG = /\b(?:door(?:way)?s? (?:that'?s |that is |already )?(?:already )?behind|anchor(?:ed)? in the past|bracing at|sign(?:ed|ing)? (?:your name|as yours|for it)|holding it as yours|holding (?:it|this) as (?:your own|yours)|in your hands|out of your hands|write-access|empty seat|\bseat\b|vacuum|a door that'?s already)\b/gi;
const key = []; const detail = [];
for (const r of rows) {
  for (let i = 1; i <= REPS; i++) {
    let it; try { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plainlit', requestId: null }, r.draws); it = res.interpretation; } catch (e) { it = { error: e.message }; }
    const orig = r.interpretation || {}; const k = REPS > 1 ? `${r.request_id} #${i}` : r.request_id;
    const tA = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n'); const tB = [orig.gist, orig.text, orig.medicine, orig.question].filter(Boolean).join('\n\n');
    const fA = (tA.match(FIG) || []).length, fB = (tB.match(FIG) || []).length;
    out.push(`| ${k} | ${tA.split(/\s+/).length}/${tB.split(/\s+/).length} | ${fA}/${fB} | ${(it.flags || []).join(',') || '—'} |`);
    key.push(`${k}: A = literal, B = original`);
    const show = (x) => x.error ? `error: ${x.error}` : `*${x.gist || ''}*\n\n${x.text || ''}\n\n> ◈ ${x.medicine || ''}\n\n*${x.question || ''}*`;
    detail.push(`## ${k}\n**Q:** ${r.question}\n**Draw:** ${r.cards.map((c) => c.signature).join(' · ')}\n\n### A\n${show(it)}\n\n### B\n${show(orig)}\n`);
    process.stdout.write(`${k}: ${tA.split(/\s+/).length} words, figures ${fA} (orig ${fB})${it.flags?.length ? ' flags ' + it.flags.join(',') : ''}\n`);
  }
}
out.push('', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const path = 'G:/My Drive/For Air Review/BENCH_Plain_Literal_First_Corpus_B_2026-10-05.md'; fs.writeFileSync(path, out.join('\n')); console.log('shelf:', path);
