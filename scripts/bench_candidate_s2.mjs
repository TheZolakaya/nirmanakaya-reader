// BENCH — CANDIDATE S2 (2026-10-05): the one-word variant of S. "three Balanced signatures do not say…" → "a Balanced signature does not
// say…", because the first S bench's two leaks were both on ONE-Balanced draws (the Reader took "three" literally). Live vs S2 on the
// all-Balanced exhibit (20261004c-cycle-2), run4-3 (one Balanced: Resilience) and fresh-1 (one Balanced: Will), five runs each per lane.
// The inflation regex is a FLAG only (it failed both ways on the first bench); the judge reads every pair by hand. Blind, key at the foot.
//   npx tsx scripts/bench_candidate_s2.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');

const ANCHOR = 'Balanced describes a function working, now, as theirs.';
if (!HANDING_SET.BASE_SYSTEM.includes(ANCHOR)) throw new Error('rule 5 has moved; refresh ANCHOR');
const CLAUSE = ' — that capacity, in that seat, as it is being carried now. A status is a reading of the drawn relation, never a verdict on the larger thing the question is about: a Balanced signature does not say the project is succeeding, the inquiry is learning, or the plan is right, unless the draw\'s own derivation separately carries that conclusion; say what is working and leave the larger verdict to the person.';
const BASE_S2 = HANDING_SET.BASE_SYSTEM.replace(ANCHOR, ANCHOR.slice(0, -1) + CLAUSE);
if (BASE_S2 === HANDING_SET.BASE_SYSTEM) throw new Error('the clause did not land');

const INFLATE = /\b(?:the|your|this)\s+(?:inquiry|project|plan|work|method|process|experiment|approach|system|question|reasoning|practice|loop|structure|change|finding|discovery)\s+(?:is|has|was|are)\s+(?:already\s+|genuinely\s+|actually\s+)?(?:learning|working|succeeding|sound|right|on track|healthy|healed|resolved|complete|finished|holding|standing|correct|safe|good|fine|intact|alive|real|the learning|happening|going on)\b|\balready (?:the learning|counts|happening|going on|learning|succeeding|working)\b|\bin its right shape\b/i;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const KEYS = ['recursive-reader-v099672-20261004c-cycle-2', 'recursive-reader-v099672-20261004c-cycle-3', 'recursive-reader-v099669-fresh-01-cycle-1'];
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').in('request_id', KEYS);
const byKey = Object.fromEntries(rows.map((r) => [r.request_id, r]));
const cases = []; for (const k of KEYS) { const r = byKey[k]; if (!r) throw new Error(`missing ${k}`); for (let i = 1; i <= 5; i++) cases.push({ key: `${k.replace('recursive-reader-', '')} #${i}`, question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, sig: r.cards.map((c) => c.signature).join(' · '), balanced: r.draws.filter((d) => d.status === 1).length }); }
const run = async (c, lane) => { try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, lane === 's2' ? { base: BASE_S2 } : {}); return r.interpretation; } catch (e) { return { error: e.message }; } };
const text = (it) => [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
const L = [`# BENCH — Candidate S2: status scope, the one-word variant`, `*True, 2026-10-05, v0.99.675 live vs Candidate S2 ("a Balanced signature does not say…" in place of "three Balanced signatures do not say…"), Plain voice, the API's first Plain lane. Three draws × 5 runs per lane: the all-Balanced exhibit, run4-3 (one Balanced: Resilience in Transformation), fresh-1 (one Balanced: Will in Tune). Blind: each pair is A/B at random; the key is at the foot. The inflation pattern is a FLAG only (it failed both ways on the first bench); the judge reads every pair.*`, ``, `| run | Balanced | A: flag | B: flag | A/B words |`, `|---|---|---|---|---|`];
const key = []; const detail = []; const tally = { live: { flag: 0, n: 0 }, s2: { flag: 0, n: 0 } };
for (const c of cases) {
  const live = await run(c, 'live'); const s2 = await run(c, 's2');
  const m = (it, lane) => { const inf = text(it).match(INFLATE); tally[lane].n++; if (inf) tally[lane].flag++; return { inf: inf ? inf[0] : '', w: text(it).split(/\s+/).length }; };
  const ml = m(live, 'live'), ms = m(s2, 's2');
  const flip = Math.random() < 0.5; const [A, B, mA, mB] = flip ? [s2, live, ms, ml] : [live, s2, ml, ms]; key.push(`${c.key}: A = ${flip ? 'Candidate S2' : 'live'}, B = ${flip ? 'live' : 'Candidate S2'}`);
  L.push(`| ${c.key} | ${c.balanced}/${c.draws.length} | ${mA.inf ? `"${mA.inf.slice(0, 40)}"` : '—'} | ${mB.inf ? `"${mB.inf.slice(0, 40)}"` : '—'} | ${mA.w}/${mB.w} |`);
  const show = (it) => it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`;
  detail.push(`## ${c.key}\n**Q:** ${c.question}${c.context ? `\n**Context:** ${c.context}` : ''}\n**Draw:** ${c.sig}\n\n### A\n${show(A)}\n\n### B\n${show(B)}\n`);
  process.stdout.write(`${c.key}: flag live ${ml.inf ? 1 : 0} / S2 ${ms.inf ? 1 : 0}\n`);
}
L.push(``, `**Flagged: live ${tally.live.flag}/${tally.live.n} · Candidate S2 ${tally.s2.flag}/${tally.s2.n} (a flag, not the count — see the verdict).**`, ``, ...detail, ``, `## The key`, ...key.map((k) => `- ${k}`));
const out = 'G:/My Drive/For Air Review/BENCH_Candidate_S2_One_Word_2026-10-05.md'; fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, JSON.stringify(tally));
