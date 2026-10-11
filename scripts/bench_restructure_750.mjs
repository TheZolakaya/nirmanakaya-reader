// THE RESTRUCTURE BENCH (Pass Two, 2026-10-11) — the same fixed draws and questions through every prompt set, three turns deep, judged blind.
//   T1 the opening through handingReading (the real API path, every guard on); T2 a scripted pushback; T3 the real issue — composed with
//   lib/ezTalk.js, the page's own later-turn bytes, on the set's system. Every reply: the lint, and the Reader judge (Claude Haiku 5.5, a
//   different family than the Reader's lane; Sonnet 5.5 as the second opinion with second=1). Prices fetched live; a per-run cap; never Fable.
//   READER_LANES=openrouter,anthropic npx tsx scripts/bench_restructure_750.mjs label=smoke groups=poolside arms=handing,merge,constitution voices=plain,deep turns=3 runs=1 cap=2.5
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const A = Object.fromEntries(process.argv.slice(2).map((a) => { const i = a.indexOf('='); return i < 0 ? [a, '1'] : [a.slice(0, i), a.slice(i + 1)]; }));
const LABEL = A.label || 'smoke', ARMS = (A.arms || 'handing,merge,constitution').split(','), VOICES = (A.voices || 'plain,deep').split(','), TURNS = Number(A.turns || 3), RUNS = Number(A.runs || 1), GROUPS = (A.groups || 'poolside').split(','), CAP = Number(A.cap || 2.5), SECOND = A.second === '1', ONLY = A.only ? A.only.split(',') : null;
const { handingReading } = await import('../lib/externalReading.js');
const { promptSetFor, systemFor } = await import('../lib/promptSets.js');
const { buildTalkMessage, withRegister } = await import('../lib/ezTalk.js');
const { callProvider } = await import('../lib/provider.js');
const { buildCachedSystem, ANTHROPIC_BETA_HEADERS } = await import('../lib/cachedSystem.js');
const { MODEL_IDS, thinkingFor } = await import('../lib/modelConfig.js');
const { lintOutput } = await import('../lib/bakeoff/lint.js');
const { lintVoice } = await import('../lib/ezPrompts.js');
const { judgeReply, fetchJudgePrice, JUDGE_MODELS, DIMENSIONS } = await import('../lib/bakeoff/readerJudge.js');
const CASES = JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')).cases.filter((c) => GROUPS.includes('all') || GROUPS.includes(c.group)).filter((c) => !ONLY || ONLY.includes(c.id));
const READER_MODEL = process.env.OPENROUTER_MODEL_SONNET || 'deepseek/deepseek-v4.1-flash';
const readerPrice = await fetchJudgePrice(READER_MODEL); const judgePrice = await fetchJudgePrice(JUDGE_MODELS.haiku); const secondPrice = SECOND ? await fetchJudgePrice(JUDGE_MODELS.sonnet) : null;
console.log(`reader ${readerPrice.model} $${readerPrice.input}/$${readerPrice.output} per M · judge ${judgePrice.model} $${judgePrice.input}/$${judgePrice.output}${secondPrice ? ` · second ${secondPrice.model} $${secondPrice.input}/$${secondPrice.output}` : ''} (fetched live) · cap $${CAP} · ${CASES.length} cases × ${VOICES.length} voices × ${ARMS.length} arms × ${RUNS} run(s) × ${TURNS} turns`);
const OUT = `data/bakeoff/restructure_${LABEL}.json`;
const prior = fs.existsSync(OUT) && A.resume === '1' ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const rows = prior?.rows || []; let cost = prior?.cost || 0; const lanes = prior?.lanes || {};
const have = (k) => rows.some((r) => r.key === k);
const { parseReaderJson } = await import('../lib/readerJson.js'); // the production parser, with its repairs
const parseJson = (t) => { try { return parseReaderJson(t); } catch { return null; } };
const priceTokens = (u, p) => (((u?.input_tokens || 0) + (u?.cache_creation_input_tokens || 0) + (u?.cache_read_input_tokens || 0)) * p.input + (u?.output_tokens || 0) * p.output) / 1e6;
const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const FLAGS = ['scale', 'backstory', 'premise', 'diagnosis', 'scope', 'destination', 'figure', 'operation', 'bothways', 'unnamed', 'words', 'vocab'];
const save = () => fs.writeFileSync(OUT, JSON.stringify({ label: LABEL, arms: ARMS, voices: VOICES, turns: TURNS, runs: RUNS, groups: GROUPS, readerModel: READER_MODEL, readerPrice, judgePrice, secondPrice, cost, lanes, rows }, null, 1));
async function talk({ set, voice, question, frame, draw, turns }) {
  const sys = systemFor(set, voice); const msg = withRegister(buildTalkMessage({ question, frame, draws: [draw], turns, hunch: set.turn?.hunch !== false, recordOpts: set.record || null }), voice);
  const call = async (m) => { const t0 = Date.now(); const { data, provider, model } = await callProvider({ model: MODEL_IDS.sonnet, ...thinkingFor(MODEL_IDS.sonnet), max_tokens: (voice === 'deep' || voice === 'mystical') ? 2400 : 1500, system: buildCachedSystem(sys), messages: [{ role: 'user', content: m }] }, { beta: ANTHROPIC_BETA_HEADERS, tag: 'bench-talk' }); if (data?.error) throw new Error(data.error.message); return { text: data.content?.map((i) => i.text || '').join('\n') || '', usage: data.usage || null, provider, model: model || MODEL_IDS.sonnet, ms: Date.now() - t0 }; };
  let r = await call(msg); let obj = parseJson(r.text); const usage = [r.usage]; let ms = r.ms;
  if (!obj || !obj.reader) { r = await call(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.`); obj = parseJson(r.text); usage.push(r.usage); ms += r.ms; }
  return { obj: obj || { reader: r.text, gist: '', medicine: '', question: '' }, usage, provider: r.provider, model: r.model, ms, parsed: !!(obj && obj.reader) };
}
let stopped = false;
async function runCell(c, voice, arm, run) {
  if (stopped) return;
  if (cost > CAP) { if (!stopped) console.log(`STOP: $${cost.toFixed(3)} passed the cap $${CAP}`); stopped = true; save(); return; }
  const key1 = `${c.id}|${voice}|${arm}|${run}|1`; if (have(key1) && (TURNS === 1 || have(`${c.id}|${voice}|${arm}|${run}|${TURNS}`))) return;
  const set = promptSetFor(arm); const draw = c.draw; const t0 = Date.now();
  let res, it; try { res = await handingReading({ question: c.question, context: c.context || '', cardCount: 1, mode: 'discover', fast: true, voice, requestId: null }, [draw], { promptSet: arm }); it = res.interpretation; } catch (e) { console.log(`${c.id} ${voice} ${arm} r${run} T1 ERROR ${e.message}`); rows.push({ key: key1, case: c.id, group: c.group, voice, arm, run, turn: 1, error: e.message }); save(); return; }
  const u1 = res.usage; const c1 = priceTokens(u1, readerPrice); cost += c1; const lane = `${u1?.provider || '?'}:${u1?.model || ''}`; lanes[lane] = (lanes[lane] || 0) + 1;
  const reply1 = { gist: it.gist, reader: it.text, medicine: it.medicine, question: it.question };
  const flags1 = (lintOutput({ text: '', parsed: { ...it, reader: it.text }, preset: { kind: 'opening' }, hostile: false, draw, draws: [draw], question: c.question, context: c.context || '', voice: lintVoice(voice) }).flags || []).map((f) => f.code).filter((f) => FLAGS.includes(f));
  let j1 = null, s1 = null; try { j1 = await judgeReply({ question: c.question, context: c.context || '', askerTurns: [], draw, reply: reply1, turnIndex: 1 }); cost += j1.cost || 0; if (SECOND && c.group === 'poolside') { s1 = await judgeReply({ question: c.question, context: c.context || '', askerTurns: [], draw, reply: reply1, turnIndex: 1, model: JUDGE_MODELS.sonnet }); cost += s1.cost || 0; } } catch (e) { console.log('  judge failed:', e.message); }
  rows.push({ key: key1, case: c.id, group: c.group, voice, arm, run, turn: 1, gist: it.gist, text: it.text, medicine: it.medicine, question: it.question, frame: it.frame || null, aim: it.aim || null, flags: flags1, medicineJudge: it.medicineJudge?.first || null, personaFallback: !!it.personaFallback, scores: j1?.scores || null, note: j1?.scores?.note || '', quotes: j1?.scores?.innerstate_quotes || [], second: s1?.scores || null, words: words(it.text), ms: Date.now() - t0, cost: c1, lane, promptSet: res.promptSet || arm });
  const sc = (s) => (s ? `inst${s.instrument} com${s.commitment} inn${s.innerstate} pro${s.proportion} med${s.medicine} rea${s.readable} den${s.deniable}` : 'no-judge');
  console.log(`${c.id.padEnd(20)} ${voice.padEnd(5)} ${arm.padEnd(18)} r${run} T1 ${String(words(it.text)).padStart(3)}w ${sc(j1?.scores)}${s1 ? ' | S:' + sc(s1.scores) : ''} [${flags1.join(',')}] $${c1.toFixed(4)}`);
  save();
  // later turns
  let turns = [{ id: 't1', role: 'reader', text: it.text, medicine: it.medicine, question: it.question }]; const asker = [];
  for (let t = 2; t <= TURNS; t++) {
    const keyT = `${c.id}|${voice}|${arm}|${run}|${t}`; if (have(keyT)) continue;
    const said = t === 2 ? c.t2 : c.t3; if (!said) break;
    turns = [...turns, { id: `y${t}`, role: 'you', text: said }]; asker.push(said);
    let tk; try { tk = await talk({ set, voice, question: c.question, frame: it.frame || null, draw, turns }); } catch (e) { console.log(`${c.id} ${voice} ${arm} r${run} T${t} ERROR ${e.message}`); rows.push({ key: keyT, case: c.id, group: c.group, voice, arm, run, turn: t, error: e.message }); save(); break; }
    const ct = tk.usage.reduce((a, u) => a + priceTokens(u, readerPrice), 0); cost += ct; const laneT = `${tk.provider || '?'}:${tk.model || ''}`; lanes[laneT] = (lanes[laneT] || 0) + 1;
    const o = tk.obj; const replyT = { gist: o.gist, reader: o.reader, medicine: o.medicine, question: o.question };
    const flagsT = (lintOutput({ text: '', parsed: { ...o }, preset: { kind: 'talk' }, hostile: false, draw, draws: [draw], question: c.question, context: c.context || '', voice: lintVoice(voice) }).flags || []).map((f) => f.code).filter((f) => FLAGS.includes(f));
    let jt = null, st = null; try { jt = await judgeReply({ question: c.question, context: c.context || '', askerTurns: [...asker], draw, reply: replyT, turnIndex: t }); cost += jt.cost || 0; if (SECOND && c.group === 'poolside') { st = await judgeReply({ question: c.question, context: c.context || '', askerTurns: [...asker], draw, reply: replyT, turnIndex: t, model: JUDGE_MODELS.sonnet }); cost += st.cost || 0; } } catch (e) { console.log('  judge failed:', e.message); }
    rows.push({ key: keyT, case: c.id, group: c.group, voice, arm, run, turn: t, said, gist: o.gist, text: o.reader, medicine: o.medicine, question: o.question, flags: flagsT, parsed: tk.parsed, scores: jt?.scores || null, note: jt?.scores?.note || '', quotes: jt?.scores?.innerstate_quotes || [], second: st?.scores || null, words: words(o.reader), ms: tk.ms, cost: ct, lane: laneT, promptSet: arm });
    console.log(`${''.padEnd(20)} ${voice.padEnd(5)} ${arm.padEnd(18)} r${run} T${t} ${String(words(o.reader)).padStart(3)}w ${sc(jt?.scores)}${jt?.scores?.revision != null ? ` rev${jt.scores.revision}` : ''}${st ? ' | S:' + sc(st.scores) : ''} [${flagsT.join(',')}] $${ct.toFixed(4)}`);
    turns = [...turns, { id: `t${t}`, role: 'reader', text: o.reader, medicine: o.medicine, question: o.question }];
    save();
  }
}
// THE POOL (par=N): cells run N at a time; the host lanes and the judge take concurrency, and a full bench fits in an evening instead of a day
const cells = []; for (const c of CASES) for (const voice of VOICES) for (const arm of ARMS) for (let run = 1; run <= RUNS; run++) cells.push([c, voice, arm, run]);
const PAR = Math.max(1, Number(A.par || 1)); let next = 0;
await Promise.all(Array.from({ length: Math.min(PAR, cells.length) }, async () => { while (next < cells.length && !stopped) { const cell = cells[next++]; try { await runCell(...cell); } catch (e) { console.log('cell failed:', cell[0].id, cell[1], cell[2], e.message); } } }));
save();
// the summary: per arm × voice, mean score per dimension (T1 and later turns apart), flag counts, median words, cost
const mean = (xs) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) : NaN);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const lines = [`# restructure bench · ${LABEL} · ${new Date().toISOString().slice(0, 16)} · reader ${READER_MODEL} · judge ${judgePrice.model}${SECOND ? ' + ' + secondPrice.model : ''} · cost $${cost.toFixed(3)}`, '', '| arm | voice | n | turn | instr | commit | inner | prop | medicine | revision | readable | deniable | scale/back/prem/diag/scope | median words |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const arm of ARMS) for (const voice of VOICES) for (const which of ['T1', 'T2+']) {
  const rs = rows.filter((r) => r.arm === arm && r.voice === voice && !r.error && r.scores && (which === 'T1' ? r.turn === 1 : r.turn > 1)); if (!rs.length) continue;
  const m = (d) => mean(rs.map((r) => r.scores[d]).filter((x) => typeof x === 'number' && !Number.isNaN(x))).toFixed(2);
  const fc = (f) => rs.filter((r) => (r.flags || []).includes(f)).length;
  lines.push(`| ${arm} | ${voice} | ${rs.length} | ${which} | ${m('instrument')} | ${m('commitment')} | ${m('innerstate')} | ${m('proportion')} | ${m('medicine')} | ${which === 'T1' ? '—' : m('revision')} | ${m('readable')} | ${m('deniable')} | ${fc('scale')}/${fc('backstory')}/${fc('premise')}/${fc('diagnosis')}/${fc('scope')} | ${med(rs.map((r) => r.words))} |`);
}
lines.push('', `lanes: ${Object.entries(lanes).map(([k, v]) => `${k} ×${v}`).join(' · ')}`, `errors: ${rows.filter((r) => r.error).length} · unparsed later turns: ${rows.filter((r) => r.turn > 1 && r.parsed === false).length} · persona fallbacks: ${rows.filter((r) => r.personaFallback).length}`);
fs.writeFileSync(`data/bakeoff/restructure_${LABEL}.md`, lines.join('\n'));
console.log('\n' + lines.join('\n'));
