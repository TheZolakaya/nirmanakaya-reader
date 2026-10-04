// BENCH — CANDIDATE 1 (2026-10-04, Air-approved): the Plain voice's THE CALL no longer orders "say where" for Unacknowledged, and the
// status line in the draw block drops its parenthetical. Live vs Candidate 1 on the same draws: the 12 frozen graveyard draws, run two's
// five, and Keel's exhibit (Unacknowledged Faith in Imagination, where the record supplies the destination and the call must stay flat).
// Mechanical: on draws with an Unacknowledged signature, destination nouns written into the reading when neither the question nor the
// context names one; the binding lint; words. Blind pairs for the judges, key at the foot.   npx tsx scripts/bench_candidate1.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { bindingFlags } = await import('../lib/bakeoff/lint.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const { STATUSES, STATUS_INFO } = await import('../lib/constants.js');
const { getComponent } = await import('../lib/corrections.js');

const LIVE_CALL = `- THE CALL, one-sided. The status in its ruled meaning, never both ways. Balanced: you are doing this and it is yours. Too Much: you are doing more of this than now needs. Too Little: you are doing less of this than now asks. Unacknowledged: you are the one doing this and you are crediting it elsewhere — say where (circumstance, luck, another person, "it just happened"). A sentence that covers both outcomes ("you have let go, or you are holding on, and either way…") cannot be wrong and cannot be used, and it is not what the draw says.`;
const C1_CALL = `- THE CALL, one-sided. The status in its ruled meaning, never both ways. Balanced: you are doing this and it is yours. Too Much: you are doing more of this than now needs. Too Little: you are doing less of this than now asks. Unacknowledged: you are the one doing this and you are not holding it as yours. Where the credit is going instead is said only when their own words or the record for this signature show it — then say it flat; when nothing shows it, name the disowning and leave its destination to them, as the question if you want it. A sentence that covers both outcomes ("you have let go, or you are holding on, and either way…") cannot be wrong and cannot be used, and it is not what the draw says.`;
if (!VOICES.plain.rules.includes(LIVE_CALL)) throw new Error('the live THE CALL text has moved; refresh LIVE_CALL');
const C1_RULES = VOICES.plain.rules.replace(LIVE_CALL, C1_CALL);
const LIVE_DESC = STATUSES[4].desc; const LIVE_INFO = STATUS_INFO[4].description;
const C1_INFO = "Acting now, but not as the author — the doing is the person's own and they are not holding it as theirs.";
const C1_DESC = "Acting now, but not as the author — the doing is the person's own and they are not holding it as theirs; the gaveled meaning, 2026-10-03: not 'unconsciously'";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, card_count, mode, draws, cards').or('request_id.like.recursive-reader-%,request_id.like.mind-seat-%').order('created_at', { ascending: true });
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };
const cases = [...rows.map((r) => ({ key: r.request_id, question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, sig: r.cards.map((c) => c.signature).join(' · ') })),
  { key: 'keel-exhibit-UA-Faith-in-Imagination', question: '', context: '', mode: 'discover', draws: [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }], sig: 'Unacknowledged Faith in Imagination' }];
const DEST = /\b(?:the (?:tool|apparatus|instrument|system|machine)|luck|lucky|circumstances?|the situation|timing|someone else|somebody else|another person|other people|it just happened|just happened|happened to you|out of your hands|taken from you|was taken|the universe|fate)\b/i;
const destIn = (t) => (String(t || '').match(new RegExp(DEST.source, 'gi')) || []).map((x) => x.toLowerCase());
const run = async (c, lane) => {
  const keep = STATUSES[4].desc, keepInfo = STATUS_INFO[4].description; STATUSES[4].desc = lane === 'c1' ? C1_DESC : LIVE_DESC; STATUS_INFO[4].description = lane === 'c1' ? C1_INFO : LIVE_INFO;
  try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, lane === 'c1' ? { voiceRules: C1_RULES } : {}); return r.interpretation; }
  catch (e) { return { error: e.message }; } finally { STATUSES[4].desc = keep; STATUS_INFO[4].description = keepInfo; }
};
const L = [`# BENCH — Candidate 1: the Unacknowledged destination is never invented`, `*True, 2026-10-04, v0.99.669 live vs Candidate 1 (THE CALL's Unacknowledged sentence + the status line's parenthetical + the record's 'in general' line, all three), Plain voice, production's first-lane model. ${cases.length} draws: the 12 frozen, run two's five, Keel's exhibit. Blind: each pair is A/B at random; the key is at the foot. Mechanical columns: destination nouns written on an Unacknowledged draw when neither the question nor the context names one (lower is better, except where the record supplies the destination — Keel's exhibit, where the call must stay flat and say it); binding trips; words.*`, ``,
  `| draw | UA? | named in Q/ctx? | A: destinations | B: destinations | A: binding | B: binding | A/B words |`, `|---|---|---|---|---|---|---|---|`];
const key = []; const detail = []; const tally = { live: { dest: 0, uaDraws: 0, binding: 0 }, c1: { dest: 0, uaDraws: 0, binding: 0 } };
for (const c of cases) {
  const ua = c.draws.some((d) => Number(d.status) === 4); const named = destIn(c.question + ' ' + c.context).length > 0;
  const live = await run(c, 'live'); const c1 = await run(c, 'c1');
  const text = (it) => [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  const m = (it, lane) => { const t = text(it); const d = ua && !named ? destIn(t) : []; const b = bindingFlags(t, c.draws); if (ua && !named) { tally[lane].uaDraws++; if (d.length) tally[lane].dest++; } if (b.length) tally[lane].binding++; return { d, b, w: t.split(/\s+/).length }; };
  const ml = m(live, 'live'), mc = m(c1, 'c1');
  const flip = Math.random() < 0.5; const [A, B, mA, mB] = flip ? [c1, live, mc, ml] : [live, c1, ml, mc]; key.push(`${c.key}: A = ${flip ? 'Candidate 1' : 'live'}, B = ${flip ? 'live' : 'Candidate 1'}`);
  L.push(`| ${c.key} | ${ua ? 'yes' : 'no'} | ${named ? 'yes' : 'no'} | ${mA.d.join(', ') || '—'} | ${mB.d.join(', ') || '—'} | ${mA.b.length} | ${mB.b.length} | ${mA.w}/${mB.w} |`);
  const show = (it) => it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`;
  detail.push(`## ${c.key}\n**Q:** ${c.question || '(no question)'}${c.context ? `\n**Context:** ${c.context}` : ''}\n**Draw:** ${c.sig}\n\n### A\n${show(A)}\n\n### B\n${show(B)}\n`);
  process.stdout.write(`${c.key}: UA ${ua} named ${named} · live dest [${ml.d.join(',')}] c1 dest [${mc.d.join(',')}] · binding ${ml.b.length}/${mc.b.length}\n`);
}
L.push(``, `**Unacknowledged draws with no destination named in the question or context: live wrote one in ${tally.live.dest}/${tally.live.uaDraws}; Candidate 1 in ${tally.c1.dest}/${tally.c1.uaDraws}. Binding trips: live ${tally.live.binding}, Candidate 1 ${tally.c1.binding}.**`, ``, ...detail, ``, `## The key`, ...key.map((k) => `- ${k}`));
const out = 'G:/My Drive/For Air Review/BENCH_Candidate_1_Unacknowledged_Destination_pass2_2026-10-04.md'; fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, JSON.stringify(tally));
