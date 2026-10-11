// PASS TWO, STEP 2 — prove the Reader judge on the seven poolside readings of 2026-10-11 before it scores anything new.
// The five traced overreaches must score innerstate < 2 with the traced sentence quoted; the seventh (5aa1b131) should hold.
//   npx tsx scripts/judge_prove_poolside.mjs [runs=2] [model=haiku|sonnet]
// Spend guard: the price is fetched from the OpenRouter list first; the run stops at $1.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [RUNS = '2', WHICH = 'haiku'] = process.argv.slice(2);
const { createClient } = await import('@supabase/supabase-js');
const { judgeReply, fetchJudgePrice, JUDGE_MODELS, scoreLine } = await import('../lib/bakeoff/readerJudge.js');
const model = JUDGE_MODELS[WHICH] || JUDGE_MODELS.haiku;
const price = await fetchJudgePrice(model); console.log(`judge ${price.model} at $${price.input}/M in, $${price.output}/M out (fetched live)`);
const CAP = Number(process.env.JUDGE_CAP || '1.00');
const IDS = ['4a5079f5-af05-485d-b46f-de853b8de621', '388c38e2-4113-4638-991f-c1a700b41085', '0be08a8b-15bf-4a0c-bb04-9a2170cb77b7', '76c84e95-7333-49db-8e4e-ab27e1a4d2bb', '406d0d6e-c32d-45f2-89ce-65c1887fe159', '80e8a521-4668-422d-9015-2d586978a238', '5aa1b131-3766-442e-9c14-1572453cda54'];
// what the trace of Pass One says each reading did; the judge must see it
const EXPECT = {
  '4a5079f5-af05-485d-b46f-de853b8de621': { inner: '<2', hit: /not currently treating it as yours|not treating it as yours/i },
  '388c38e2-4113-4638-991f-c1a700b41085': { inner: '<2', hit: /from anxiety|insisting on the rules/i },
  '0be08a8b-15bf-4a0c-bb04-9a2170cb77b7': { inner: '<2', hit: /still with how the map worked|part of the attention/i },
  '76c84e95-7333-49db-8e4e-ab27e1a4d2bb': { inner: '<2', hit: /going to \*?the map\*?|credit for it is going/i },
  '406d0d6e-c32d-45f2-89ce-65c1887fe159': { inner: '<2', hit: /common shadow in teams|finished thing|not going home/i },
  '80e8a521-4668-422d-9015-2d586978a238': { inner: '<2', hit: /rehearsal|weighed in advance/i },
  '5aa1b131-3766-442e-9c14-1572453cda54': { inner: '2', hit: null },
};
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows, error } = await db.from('external_readings').select('id, question, context, draws, interpretation').in('id', IDS);
if (error) throw error;
let cost = 0; const out = [];
for (const id of IDS) {
  const r = rows.find((x) => x.id === id); if (!r) { console.log(id, 'not found'); continue; }
  const draw = r.draws[0]; const reply = { gist: r.interpretation.gist, reader: r.interpretation.text, medicine: r.interpretation.medicine, question: r.interpretation.question };
  for (let k = 0; k < Number(RUNS); k++) {
    if (cost > CAP) { console.log(`STOP at $${cost.toFixed(3)} (cap $${CAP})`); break; }
    const j = await judgeReply({ question: r.question, context: r.context || '', askerTurns: [], draw, reply, turnIndex: 1, model });
    const c = j.cost ?? (((j.usage?.input_tokens || 0) * price.input + (j.usage?.output_tokens || 0) * price.output) / 1e6); cost += c;
    const ex = EXPECT[id]; const inner = j.scores?.innerstate; const quotes = (j.scores?.innerstate_quotes || []).join(' | ');
    const innerOk = ex.inner === '2' ? inner === 2 : inner < 2; const hitOk = ex.hit ? ex.hit.test(quotes) : true;
    console.log(`${id.slice(0, 8)} run${k + 1} ${innerOk && hitOk ? 'OK  ' : 'MISS'} ${scoreLine(j.scores)} | quotes: ${quotes.slice(0, 160)} | ${j.ms}ms $${c.toFixed(5)}`);
    if (j.scores?.note) console.log(`         note: ${String(j.scores.note).slice(0, 180)}`);
    out.push({ id, run: k + 1, scores: j.scores, raw: j.raw, innerOk, hitOk, cost: c, ms: j.ms, model: j.model });
  }
}
fs.writeFileSync('data/bakeoff/judge_prove_poolside.json', JSON.stringify({ model, price, cost, out }, null, 1));
const okN = out.filter((o) => o.innerOk && o.hitOk).length;
console.log(`\n${okN}/${out.length} judge calls matched the trace · total $${cost.toFixed(4)} · saved data/bakeoff/judge_prove_poolside.json`);
