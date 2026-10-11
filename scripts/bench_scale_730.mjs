// .730 THE SIZE OF THE CLAIM — before/after on the SAME draws and questions. "Before" = the prompt set from git (origin/main),
// "after" = the working tree. The real Handing path (handingReading), one render each. Judged two ways: the lint's new
// `scale` flag (plus backstory/premise) and a phrase count — and then READ, every pair, before anything is said about it.
//   npx tsx scripts/bench_scale_730.mjs <label> [draws=3] [seed=11]
//   needs lib/_bench_before_handingPrompt_729.js = git show origin/main:lib/handingPrompt.js (not committed)
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [LABEL = 'scale730', NDRAWS = '3', SEED = '11'] = process.argv.slice(2);
const { handingReading } = await import('../lib/externalReading.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const BEFORE = process.env.SKIP_BEFORE === '1' ? null : await import('../lib/_bench_before_handingPrompt_729.js'); // the old text, for `over`; SKIP_BEFORE=1 runs the after side only (step-2 bench: before = the other checkout)
const QS = [
  { k: 'today',    q: 'Why did the app crash right after today\'s deploy?' },
  { k: 'work',     q: 'Why does this keep happening in my engineering work?' },
  { k: 'life',     q: 'Why have I repeated this pattern my whole life?' },
  { k: 'now',      q: '' },                                   // no question: the "now" frame
  { k: 'incident', q: 'What does this incident show me right now?' },
  { k: 'vague',    q: 'What is going on?' },
];
let s = Number(SEED); const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
// one draw per status (2,3,4) so Too Much, Too Little and Unacknowledged are each on the bench; plus random extras
const draws = [2, 3, 4].map((st) => ({ transient: Math.floor(rnd() * 78), position: Math.floor(rnd() * 22), status: st }));
while (draws.length < Number(NDRAWS)) draws.push({ transient: Math.floor(rnd() * 78), position: Math.floor(rnd() * 22), status: 1 + Math.floor(rnd() * 4) });
const PH = /\bpart of (?:your|a|the|their) life\b|\b(?:has|have|had) been\b|\ba long time\b|\bfor (?:years|months|weeks)\b|\bover and over\b|\bused to be\b|\bevery (?:morning|day|time)\b|\balways\b|\blifelong\b/gi;
const rows = []; let cost = 0;
const CAP = Number(process.env.BENCH_CAP || '2.00'); // the spend guard: stop the run at this many dollars of reported cost
const PRIOR = process.env.AFTER_ONLY === '1' && fs.existsSync('data/bakeoff/scale_scale730.json') ? JSON.parse(fs.readFileSync('data/bakeoff/scale_scale730.json','utf8')) : null;
const PRICE = { in: Number(process.env.PRICE_IN || '0.30'), out: Number(process.env.PRICE_OUT || '1.20') }; // per 1M tokens, fetched live before the run
let lanes = {};
const one = async (d, q, which) => {
  if (which === 'before' && process.env.SKIP_BEFORE === '1') return { which, text: '', gist: '', medicine: '', flags: [], phrases: [] };
  if (PRIOR && which === 'before') { const prev = PRIOR.rows.find((r) => r.k === QS.find((x) => x.q === q)?.k && r.d.transient === d.transient && r.d.position === d.position && r.d.status === d.status); if (prev) return prev.before; }
  const over = which === 'before' ? { base: BEFORE.HANDING_SET.BASE_SYSTEM, rules: BEFORE.HANDING_SET.EZ_RULES } : {};
  let it, res; try { res = await handingReading({ question: q, context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'friend', requestId: null }, [d], over); it = res.interpretation; } catch (e) { it = { error: e.message }; res = {}; }
  for (const u of [].concat(res?.usage || [])) { if (!u) continue; cost += ((u.input_tokens || 0) * PRICE.in + (u.output_tokens || 0) * PRICE.out) / 1e6; }
  const lane = res?.usage?.provider ? `${res.usage.provider}:${res.usage.model || ''}` : 'unknown'; lanes[lane] = (lanes[lane] || 0) + 1;
  const text = String(it.text || it.error || '');
  const flags = (lintOutput({ text: '', parsed: { ...it, reader: it.text }, preset: { kind: 'opening' }, hostile: false, draw: d, draws: [d], question: q, voice: 'plain' }).flags || []).map((f) => f.code);
  const phrases = (text.match(PH) || []).map((x) => x.toLowerCase());
  return { which, text, gist: it.gist || '', medicine: it.medicine || '', flags, phrases };
};
for (const [di, d] of draws.entries()) for (const { k, q } of QS) {
  if (cost > CAP) { console.log(`STOP: reported cost $${cost.toFixed(3)} passed the cap $${CAP}`); break; }
  const before = await one(d, q, 'before'); const after = await one(d, q, 'after');
  rows.push({ draw: di, d, k, q, before, after });
  fs.writeFileSync(`data/bakeoff/scale_${LABEL}.json`, JSON.stringify({ draws, rows, cost }, null, 1));
  console.log(`draw ${di} (st${d.status} t${d.transient}/p${d.position}) ${k.padEnd(8)} before: scale=${before.flags.includes('scale') ? 'Y' : '-'} ph=${before.phrases.length} | after: scale=${after.flags.includes('scale') ? 'Y' : '-'} ph=${after.phrases.length}`);
}
const n = rows.length; const sum = (w, f) => rows.filter((r) => f(r[w])).length;
console.log(`\n${LABEL}: ${n} pairs · scale flag before ${sum('before', (x) => x.flags.includes('scale'))}/${n} after ${sum('after', (x) => x.flags.includes('scale'))}/${n} · any life phrase before ${sum('before', (x) => x.phrases.length)}/${n} after ${sum('after', (x) => x.phrases.length)}/${n} · backstory/premise before ${sum('before', (x) => x.flags.some((c) => c === 'backstory' || c === 'premise'))} after ${sum('after', (x) => x.flags.some((c) => c === 'backstory' || c === 'premise'))} · cost at the live price ${cost.toFixed(3)} · lanes ${JSON.stringify(lanes)}`);
