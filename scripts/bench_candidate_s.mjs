// BENCH — CANDIDATE S (2026-10-05): status scope. Live vs S (one clause after rule 5's "Balanced describes a function working, now,
// as theirs.") on every ledger draw that carries a Balanced signature; the all-Balanced run-four exhibit (20261004c-cycle-2) runs
// three times per lane because it is the observed failure ("the inquiry is already learning"). Mechanical, to NOTICE only: an
// INFLATION pattern — the larger thing the question names declared learning/succeeding/right — plus the house's `scope` lint.
// Blind pairs, key at the foot.   npx tsx scripts/bench_candidate_s.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');

const ANCHOR = 'Balanced describes a function working, now, as theirs.';
if (!HANDING_SET.BASE_SYSTEM.includes(ANCHOR)) throw new Error('rule 5 has moved; refresh ANCHOR');
const CLAUSE = ' — that capacity, in that seat, as it is being carried now. A status is a reading of the drawn relation, never a verdict on the larger thing the question is about: three Balanced signatures do not say the project is succeeding, the inquiry is learning, or the plan is right, unless the draw\'s own derivation separately carries that conclusion; say what is working and leave the larger verdict to the person.';
const BASE_S = HANDING_SET.BASE_SYSTEM.replace(ANCHOR, ANCHOR.slice(0, -1) + CLAUSE);
if (BASE_S === HANDING_SET.BASE_SYSTEM) throw new Error('the clause did not land');

// the inflation pattern: the larger thing (inquiry/project/plan/work/method/process/experiment/approach/system/question/reasoning) + a verdict
const INFLATE = /\b(?:the|your|this)\s+(?:inquiry|project|plan|work|method|process|experiment|approach|system|question|reasoning|practice|loop|structure)\s+(?:is|has|was|are)\s+(?:already\s+|genuinely\s+|actually\s+)?(?:learning|working|succeeding|sound|right|on track|healthy|healed|resolved|complete|finished|holding|standing|correct|safe|good|fine|intact|alive)\b|\b(?:the field|the draw|the reading)\s+(?:is\s+)?(?:telling|says|shows)\s+you\s+(?:that\s+)?(?:the|your)\s+\w+\s+is\s+(?:already\s+)?(?:learning|working|succeeding|right|sound)\b|\bis already (?:learning|succeeding|working|doing (?:it|this|the thing))\b/i;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').or('request_id.like.recursive-reader-takeover-%,request_id.like.recursive-reader-cycle-1,request_id.like.mind-seat-%,request_id.like.recursive-reader-v099669-fresh-01-%,request_id.like.recursive-reader-v099672-20261004c-%').order('created_at', { ascending: true });
const EXHIBIT = 'recursive-reader-v099672-20261004c-cycle-2';
const base = rows.filter((r) => (r.draws || []).some((d) => d.status === 1)).map((r) => ({ key: r.request_id, question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, sig: r.cards.map((c) => c.signature).join(' · '), balanced: r.draws.filter((d) => d.status === 1).length }));
const cases = []; for (const c of base) { if (c.key === EXHIBIT) { cases.push({ ...c, key: `${c.key} #1` }, { ...c, key: `${c.key} #2` }, { ...c, key: `${c.key} #3` }); } else cases.push(c); }
const run = async (c, lane) => { try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, lane === 's' ? { base: BASE_S } : {}); return r.interpretation; } catch (e) { return { error: e.message }; } };
const text = (it) => [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
const flagsOf = (it, c) => (lintOutput({ text: '', parsed: { gist: it.gist, reader: it.text, medicine: it.medicine, question: it.question, chips: [], next: [] }, preset: { kind: 'opening' }, hostile: false, draw: c.draws[0], draws: c.draws, question: c.question, context: c.context }).flags || []);
const L = [`# BENCH — Candidate S: status scope`, `*True, 2026-10-05, v0.99.674 live vs Candidate S (one clause after rule 5's "Balanced describes a function working, now, as theirs."), Plain voice, the API's first Plain lane. ${cases.length} runs: every ledger draw carrying a Balanced signature (${base.length}), the all-Balanced run-four exhibit three times. Blind: each pair is A/B at random; the key is at the foot. Mechanical, to notice only: INFLATION = the larger thing the question names declared learning/succeeding/right; scope = the house's lint (a universal about the person, or a certification).*`, ``, `| run | Balanced | A: inflation | B: inflation | A: scope | B: scope | A/B words |`, `|---|---|---|---|---|---|---|`];
const key = []; const detail = []; const tally = { live: { inflate: 0, scope: 0, n: 0 }, s: { inflate: 0, scope: 0, n: 0 } };
for (const c of cases) {
  const live = await run(c, 'live'); const s = await run(c, 's');
  const m = (it, lane) => { const f = flagsOf(it, c); const sc = f.filter((x) => x.code === 'scope'); const inf = text(it).match(INFLATE); tally[lane].n++; if (inf) tally[lane].inflate++; if (sc.length) tally[lane].scope++; return { inf: inf ? inf[0] : '', sc, w: text(it).split(/\s+/).length }; };
  const ml = m(live, 'live'), ms = m(s, 's');
  const flip = Math.random() < 0.5; const [A, B, mA, mB] = flip ? [s, live, ms, ml] : [live, s, ml, ms]; key.push(`${c.key}: A = ${flip ? 'Candidate S' : 'live'}, B = ${flip ? 'live' : 'Candidate S'}`);
  L.push(`| ${c.key} | ${c.balanced}/${c.draws.length} | ${mA.inf ? `"${mA.inf.slice(0, 40)}"` : '—'} | ${mB.inf ? `"${mB.inf.slice(0, 40)}"` : '—'} | ${mA.sc.map((x) => x.detail.slice(0, 30)).join('; ') || '—'} | ${mB.sc.map((x) => x.detail.slice(0, 30)).join('; ') || '—'} | ${mA.w}/${mB.w} |`);
  const show = (it) => it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`;
  detail.push(`## ${c.key}\n**Q:** ${c.question}${c.context ? `\n**Context:** ${c.context}` : ''}\n**Draw:** ${c.sig}\n\n### A\n${show(A)}\n\n### B\n${show(B)}\n`);
  process.stdout.write(`${c.key}: inflation live ${ml.inf ? 1 : 0} / S ${ms.inf ? 1 : 0}\n`);
}
L.push(``, `**Runs with the inflation pattern: live ${tally.live.inflate}/${tally.live.n} · Candidate S ${tally.s.inflate}/${tally.s.n}. Scope lint: live ${tally.live.scope}, S ${tally.s.scope}.**`, ``, ...detail, ``, `## The key`, ...key.map((k) => `- ${k}`));
const out = 'G:/My Drive/For Air Review/BENCH_Candidate_S_Status_Scope_2026-10-05.md'; fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, JSON.stringify(tally));
