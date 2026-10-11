// RE-JUDGE a restructure results file under the CURRENT rubric — no Reader calls, only the judge (a few hundredths of a cent a row), so the
// rubric can be tightened without regenerating a single reply. Writes data/bakeoff/restructure_<label>.json in place (scores, note, quotes,
// rubricVersion) and keeps the previous scores under prevScores.
//   npx tsx scripts/rejudge_restructure.mjs <label> [second=1] [only=caseId,...]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [LABEL = 'smoke2', ...rest] = process.argv.slice(2); const A = Object.fromEntries(rest.map((a) => { const i = a.indexOf('='); return i < 0 ? [a, '1'] : [a.slice(0, i), a.slice(i + 1)]; }));
const { judgeReply, JUDGE_MODELS, RUBRIC, fetchJudgePrice } = await import('../lib/bakeoff/readerJudge.js');
const crypto = await import('node:crypto'); const RUBRIC_V = crypto.createHash('sha1').update(RUBRIC).digest('hex').slice(0, 8);
const P = `data/bakeoff/restructure_${LABEL}.json`; const J = JSON.parse(fs.readFileSync(P, 'utf8'));
const cases = JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')).cases;
const price = await fetchJudgePrice(JUDGE_MODELS.haiku); console.log(`re-judging ${LABEL} under rubric ${RUBRIC_V} with ${price.model} ($${price.input}/$${price.output} per M, fetched live)`);
let cost = 0, n = 0; const ONLY = A.only ? A.only.split(',') : null;
for (const r of J.rows) {
  if (r.error || !r.text) continue; if (ONLY && !ONLY.includes(r.case)) continue; if (r.rubricVersion === RUBRIC_V && !A.force) continue;
  const c = cases.find((x) => x.id === r.case); if (!c) continue;
  const asker = r.turn >= 2 ? [c.t2] : []; if (r.turn >= 3) asker.push(c.t3);
  const reply = { gist: r.gist, reader: r.text, medicine: r.medicine, question: r.question };
  try {
    const j = await judgeReply({ question: c.question, context: c.context || '', askerTurns: asker, draw: c.draw, reply, turnIndex: r.turn });
    r.prevScores = r.prevScores || r.scores; r.scores = j.scores; r.note = j.scores?.note || ''; r.quotes = j.scores?.innerstate_quotes || []; r.rubricVersion = RUBRIC_V; cost += j.cost || 0; n++;
    if (A.second === '1' && r.group === 'poolside') { const s = await judgeReply({ question: c.question, context: c.context || '', askerTurns: asker, draw: c.draw, reply, turnIndex: r.turn, model: JUDGE_MODELS.sonnet }); r.second = s.scores; cost += s.cost || 0; }
    const sc = j.scores; console.log(`${r.case.padEnd(20)} ${r.voice.padEnd(5)} ${r.arm.padEnd(18)} r${r.run} T${r.turn} inst${sc?.instrument} com${sc?.commitment} inn${sc?.innerstate} pro${sc?.proportion} med${sc?.medicine}${sc?.revision != null ? ' rev' + sc.revision : ''} rea${sc?.readable} den${sc?.deniable}`);
  } catch (e) { console.log('judge failed on', r.key, e.message); }
  fs.writeFileSync(P, JSON.stringify({ ...J, rejudged: { rubric: RUBRIC_V, at: new Date().toISOString() } }, null, 1));
}
J.cost = (J.cost || 0) + cost; fs.writeFileSync(P, JSON.stringify({ ...J, rejudged: { rubric: RUBRIC_V, at: new Date().toISOString() } }, null, 1));
console.log(`re-judged ${n} rows · judge cost $${cost.toFixed(4)}`);
