// BENCH — CANDIDATE L (2026-10-05): level of address. Live vs L (one sentence appended to the epistemic paragraph of the base: a question
// about a mechanism is answered at the mechanism's level first; the second person comes only where their own words put them inside it).
// Cases: run four's four MECHANISM questions (the ledger's 20261004c cycles) × 3 per lane, and two PERSONAL controls × 3 per lane —
// the wordless exhibit (Unacknowledged Faith in Imagination, a right-now ask) and Keel's Denver question — which L must leave untouched.
// Mechanical, to NOTICE only: second-person density (you/your per 100 words) in the gist + first two paragraphs. Blind, key at the foot.
//   npx tsx scripts/bench_candidate_l.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { getComponent } = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };

const ANCHOR = 'Use this only when the question itself is epistemic; an ordinary reading is not an argument.';
if (!HANDING_SET.EZ_RULES.includes(ANCHOR)) throw new Error('the epistemic paragraph has moved; refresh ANCHOR'); // the epistemic paragraph lives in the RULES block (HANDING_RULES), not the base — so the variant rides on over.rules
const SENTENCE = ' Match the level of address to the level of the question. A question about a mechanism, a process or a kind of thing (how does X fail, what makes Y learn, what would count as Z) is answered at that level first — the mechanism, said plainly, in the impersonal or the general — and the second person comes only where their own words put them inside it. A question about themselves ("how am I doing this?") is personal from the first sentence.';
const RULES_L = HANDING_SET.EZ_RULES.replace(ANCHOR, ANCHOR + SENTENCE);
if (RULES_L === HANDING_SET.EZ_RULES) throw new Error('the sentence did not land');

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const KEYS = [1, 2, 3, 4].map((i) => `recursive-reader-v099672-20261004c-cycle-${i}`);
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').in('request_id', KEYS);
const byKey = Object.fromEntries(rows.map((r) => [r.request_id, r]));
const defs = [];
for (const k of KEYS) { const r = byKey[k]; if (!r) throw new Error(`missing ${k}`); defs.push({ key: k.replace('recursive-reader-v099672-', 'run4-'), kind: 'mechanism', question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, sig: r.cards.map((c) => c.signature).join(' · ') }); }
const sigOf = (d) => `${['', 'Balanced', 'Too Much', 'Too Little', 'Unacknowledged'][d.status]} ${getComponent(d.transient)?.name} in ${getComponent(d.position)?.name}`;
const ua = [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }];
defs.push({ key: 'control-exhibit-now', kind: 'personal', question: '', context: '', mode: 'discover', draws: ua, sig: sigOf(ua[0]) });
defs.push({ key: 'control-denver', kind: 'personal', question: 'Should I take the job in Denver?', context: '', mode: 'discover', draws: ua, sig: sigOf(ua[0]) });
const cases = []; for (const d of defs) for (let i = 1; i <= 3; i++) cases.push({ ...d, key: `${d.key} #${i}` });

const run = async (c, lane) => { try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, lane === 'l' ? { rules: RULES_L } : {}); return r.interpretation; } catch (e) { return { error: e.message }; } };
const text = (it) => [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
const density = (it) => { const head = [it.gist || '', ...String(it.text || '').split(/\n\n+/).slice(0, 2)].join(' '); const w = head.split(/\s+/).filter(Boolean).length || 1; const y = (head.match(/\b(?:you|your|yours|yourself)\b/gi) || []).length; return Math.round((y / w) * 1000) / 10; };
const L = [`# BENCH — Candidate L: level of address`, `*True, 2026-10-05, v0.99.675 live vs Candidate L (one sentence appended to the base's epistemic paragraph), Plain voice, the API's first Plain lane. ${cases.length} runs: run four's four mechanism questions × 3, two personal controls × 3 (the wordless exhibit and Keel's Denver, both Unacknowledged Faith in Imagination). Blind: each pair is A/B at random; the key is at the foot. Mechanical, to notice only: second-person density = you/your per 100 words in the gist + the first two paragraphs. The judge reads every pair for the LEVEL the opening answers at, and for whether the controls stayed personal.*`, ``, `| run | kind | A: you/100w | B: you/100w | A/B words |`, `|---|---|---|---|---|`];
const key = []; const detail = []; const tally = { live: { mech: [], pers: [] }, l: { mech: [], pers: [] } };
for (const c of cases) {
  const live = await run(c, 'live'); const l = await run(c, 'l');
  const dl = density(live), dL = density(l); tally.live[c.kind === 'mechanism' ? 'mech' : 'pers'].push(dl); tally.l[c.kind === 'mechanism' ? 'mech' : 'pers'].push(dL);
  const flip = Math.random() < 0.5; const [A, B, dA, dB] = flip ? [l, live, dL, dl] : [live, l, dl, dL]; key.push(`${c.key}: A = ${flip ? 'Candidate L' : 'live'}, B = ${flip ? 'live' : 'Candidate L'}`);
  L.push(`| ${c.key} | ${c.kind} | ${dA} | ${dB} | ${text(A).split(/\s+/).length}/${text(B).split(/\s+/).length} |`);
  const show = (it) => it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`;
  detail.push(`## ${c.key}\n**Q:** ${c.question || '(no question — a draw for right now)'}${c.context ? `\n**Context:** ${c.context}` : ''}\n**Draw:** ${c.sig}\n\n### A\n${show(A)}\n\n### B\n${show(B)}\n`);
  process.stdout.write(`${c.key}: you/100w live ${dl} / L ${dL}\n`);
}
const mean = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0);
L.push(``, `**Second-person density, mean you/100w — mechanism questions: live ${mean(tally.live.mech)} · L ${mean(tally.l.mech)}; personal controls: live ${mean(tally.live.pers)} · L ${mean(tally.l.pers)} (a number to notice; the judge decides).**`, ``, ...detail, ``, `## The key`, ...key.map((k) => `- ${k}`));
const out = 'G:/My Drive/For Air Review/BENCH_Candidate_L_Level_Of_Address_2026-10-05.md'; fs.writeFileSync(out, L.join('\n')); console.log('shelf:', out, JSON.stringify({ live: { mech: mean(tally.live.mech), pers: mean(tally.live.pers) }, l: { mech: mean(tally.l.mech), pers: mean(tally.l.pers) } }));
