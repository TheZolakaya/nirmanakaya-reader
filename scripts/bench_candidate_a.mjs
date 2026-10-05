// BENCH — CANDIDATE A (2026-10-05): a tense is not a history. Live vs A (one clause into the base's tense paragraph) on the 12 frozen
// graveyard draws, run two's five, run four's four (the 20261004c cycles). Mechanical: the widened `backstory` flag (perfect-past-act
// shapes); blind pairs with the key at the foot.   npx tsx scripts/bench_candidate_a.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');

const ANCHOR = 'Balanced is NOW-verbing: the thing done as one\'s own, nothing to brace against and nothing to regret.';
if (!HANDING_SET.BASE_SYSTEM.includes(ANCHOR)) throw new Error('the tense paragraph has moved; refresh ANCHOR');
const CLAUSE = ' A tense is how the carrying is held now, never a history. Too Little is said as the present under-participation, not as a scene that happened, a stretch of time that passed, or a thing already done and walked past; Unacknowledged is said as the present disowning, not as what was once put down; Balanced is said as the capacity working now, not as a trial it has already come through. What happened before this draw is theirs to tell, and if the reading needs it, it is the one question.';
const BASE_A = HANDING_SET.BASE_SYSTEM.replace(ANCHOR, ANCHOR + CLAUSE);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').or('request_id.like.recursive-reader-takeover-%,request_id.like.recursive-reader-cycle-1,request_id.like.mind-seat-%,request_id.like.recursive-reader-v099669-fresh-01-%,request_id.like.recursive-reader-v099672-20261004c-%').order('created_at', { ascending: true });
const cases = rows.map((r) => ({ key: r.request_id, question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, sig: r.cards.map((c) => c.signature).join(' · ') }));
const run = async (c, lane) => { try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, lane === 'a' ? { base: BASE_A } : {}); return r.interpretation; } catch (e) { return { error: e.message }; } };
const text = (it) => [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
const flagsOf = (it, c) => (lintOutput({ text: '', parsed: { gist: it.gist, reader: it.text, medicine: it.medicine, question: it.question, chips: [], next: [] }, preset: { kind: 'opening' }, hostile: false, draw: c.draws[0], draws: c.draws, question: c.question, context: c.context }).flags || []);
const L = [`# BENCH — Candidate A: a tense is not a history`, `*True, 2026-10-05, v0.99.673 live vs Candidate A (one clause after "Balanced is NOW-verbing…" in the base), Plain voice, production's first-lane model. ${cases.length} draws: the 12 frozen, run two's five, run four's four. Blind: each pair is A/B at random; the key is at the foot. Mechanical: the widened backstory flag (a present status rendered as a past act); binding; words.*`, ``, `| draw | A: backstory | B: backstory | A: binding | B: binding | A/B words |`, `|---|---|---|---|---|---|`];
const key = []; const detail = []; const tally = { live: { backstory: 0, binding: 0, n: 0 }, a: { backstory: 0, binding: 0, n: 0 } };
for (const c of cases) {
  const live = await run(c, 'live'); const a = await run(c, 'a');
  const m = (it, lane) => { const f = flagsOf(it, c); const b = f.filter((x) => x.code === 'backstory'); const bi = f.filter((x) => x.code === 'binding'); tally[lane].n++; if (b.length) tally[lane].backstory++; if (bi.length) tally[lane].binding++; return { b, bi, w: text(it).split(/\s+/).length }; };
  const ml = m(live, 'live'), ma = m(a, 'a');
  const flip = Math.random() < 0.5; const [A, B, mA, mB] = flip ? [a, live, ma, ml] : [live, a, ml, ma]; key.push(`${c.key}: A = ${flip ? 'Candidate A' : 'live'}, B = ${flip ? 'live' : 'Candidate A'}`);
  L.push(`| ${c.key} | ${mA.b.map((x) => x.detail.slice(0, 40)).join('; ') || '—'} | ${mB.b.map((x) => x.detail.slice(0, 40)).join('; ') || '—'} | ${mA.bi.length} | ${mB.bi.length} | ${mA.w}/${mB.w} |`);
  const show = (it) => it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`;
  detail.push(`## ${c.key}\n**Q:** ${c.question}${c.context ? `\n**Context:** ${c.context}` : ''}\n**Draw:** ${c.sig}\n\n### A\n${show(A)}\n\n### B\n${show(B)}\n`);
  process.stdout.write(`${c.key}: backstory live ${ml.b.length} / A ${ma.b.length}\n`);
}
L.push(``, `**Readings with a backstory flag: live ${tally.live.backstory}/${tally.live.n} · Candidate A ${tally.a.backstory}/${tally.a.n}. Binding: live ${tally.live.binding}, A ${tally.a.binding}.**`, ``, ...detail, ``, `## The key`, ...key.map((k) => `- ${k}`));
const out = 'G:/My Drive/For Air Review/BENCH_Candidate_A_Tense_Is_Not_History_2026-10-05.md'; fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, JSON.stringify(tally));
