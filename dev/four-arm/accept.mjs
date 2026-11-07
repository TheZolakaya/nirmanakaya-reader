#!/usr/bin/env node
// THE ACCEPTANCE CHECKS (BRIEF §3 1-6, AMENDMENT v2 7-9, Air's details 10-12). Free: no paid call is possible here (the paid flag is
// removed from every child process). Prints each check PASS / FAIL with its evidence.
//   node dev/four-arm/accept.mjs            checks 1 (syntax + unit tests) to 12
//   node dev/four-arm/accept.mjs --full     also check 1's production build and the route exercised on a local dev server
// The main dry run goes to dev/four-arm/runs/ (its DRYRUN_PASS.json is what a paid run later requires); the failure-path, over-cap
// and hold exercises go to a temporary runs directory.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.removeAllListeners('warning');
const HARNESS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HARNESS, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'four-arm-accept-'));
process.env.FOUR_ARM_RUNS_DIR = TMP; delete process.env.PAID_RUNS_ENABLED; // in-process checks bind to the temp dir
const FULL = process.argv.includes('--full');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const results = [];
const node = (args, { tmp = false, timeout = 600000 } = {}) => { const env = { ...process.env }; delete env.PAID_RUNS_ENABLED; if (tmp) env.FOUR_ARM_RUNS_DIR = TMP; else delete env.FOUR_ARM_RUNS_DIR; const r = spawnSync(process.execPath, ['--no-warnings', ...args], { cwd: REPO, env, encoding: 'utf8', timeout }); return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` }; };
const check = (n, title, pass, evidence) => { results.push({ n, title, pass }); console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${n}. ${title}`); for (const line of [].concat(evidence)) console.log(`      ${String(line).split('\n').join('\n      ')}`); };
const REAL_RUNS = path.join(HARNESS, 'runs');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ── 1. syntax, unit tests (and with --full: the build, the route) ─────────────────────────────────────────────────────────
{
  const files = ['lib/recognition.js', 'lib/recognitionBlock.js', 'lib/recognitionPrompts.js', 'lib/recognitionDoor.js', 'lib/addressCore.js', 'lib/address.js', 'app/api/recognition/route.js', 'dev/four-arm/run.mjs', 'dev/four-arm/accept.mjs', 'dev/four-arm/route_smoke.mjs', ...fs.readdirSync(path.join(HARNESS, 'lib')).map((f) => `dev/four-arm/lib/${f}`), ...fs.readdirSync(path.join(HARNESS, 'test')).map((f) => `dev/four-arm/test/${f}`)];
  const bad = files.filter((f) => node(['--check', f]).code !== 0);
  const t = node(['--test', 'dev/four-arm/test/recognitionBlock.test.mjs', 'dev/four-arm/test/harness.test.mjs']);
  const pass = t.out.match(/ℹ pass (\d+)/)?.[1], fail = t.out.match(/ℹ fail (\d+)/)?.[1];
  const ev = [`node --check on ${files.length} files: ${bad.length ? `FAILED ${bad.join(', ')}` : 'all clean'}`, `unit tests: ${pass} pass, ${fail} fail (the block's word check on 20 real engine outputs + the whole lens and diag spaces; kappa; leakage; blindness; the validator and classifier failure paths; the cost gate; the hold; the headline rule)`];
  let ok = !bad.length && fail === '0';
  if (FULL) {
    const b = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: REPO, encoding: 'utf8', shell: process.platform === 'win32', timeout: 900000 });
    const built = /Compiled successfully/.test(`${b.stdout}${b.stderr}`) && b.status === 0; const listed = /\/api\/recognition/.test(b.stdout || '');
    ev.push(`npm run build: exit ${b.status}, ${built ? 'compiled successfully' : 'NOT compiled'}, /api/recognition ${listed ? 'listed' : 'NOT listed'}`); ok = ok && built && listed;
    const r = node(['dev/four-arm/route_smoke.mjs', '--port', '3123'], { timeout: 900000 });
    const lens = /POST kind=lens → HTTP 200; success true; mode recognition; ledger false; paidRuns false; mock true; blockFailure false; word list pass; semantic pass/.test(r.out);
    const diag = /POST kind=diag → HTTP 200; success true; mode recognition; ledger false; paidRuns false; mock true; blockFailure false; word list pass; semantic pass/.test(r.out);
    ev.push(`route exercised on a local dev server (ledger and every key blanked): lens ${lens ? '200 + block' : 'FAILED'}, diag ${diag ? '200 + block' : 'FAILED'}`, r.out.split('\n').filter((l) => /^(1|3|4)\. |^POST|^GET/.test(l)).slice(0, 12).join('\n'));
    ok = ok && lens && diag;
  } else ev.push('(the production build and the route exercise run with --full; see also: npm run build · node dev/four-arm/route_smoke.mjs)');
  check(1, 'node --check, the unit tests' + (FULL ? ', the build, the route exercised with a local request' : ''), ok, ev);
}

// ── 2. the free dry run on all arms; the report renders ────────────────────────────────────────────────────────────────
const dryId = `accept-dry-${stamp}`;
const dry = node(['dev/four-arm/run.mjs', 'dry', '--run', dryId]);
const D = path.join(REAL_RUNS, dryId);
const R = fs.existsSync(path.join(D, 'results.json')) ? readJson(path.join(D, 'results.json')) : null;
{
  const arms = R ? Object.keys(R.perArm).sort() : [];
  const want = ['A', 'B', 'B-diag', 'B-loop', 'C', 'C-diag', 'D', 'D-diag'];
  const ok = dry.code === 0 && !!R && R.integrity.ok && want.every((a) => arms.includes(a)) && fs.existsSync(path.join(D, 'REPORT.md'));
  check(2, 'the free dry run completes on all arms with mocked model responses; the report renders', ok, R ? [`run ${dryId}: exit ${dry.code}; ${R.integrity.records}/${R.integrity.planned} unit x arm records; batteries ${R.batteries.map((b) => `${b.battery} ${b.items}`).join(', ')}; arms ${arms.join(', ')}`, `report: ${path.join(D, 'REPORT.md')} (${fs.statSync(path.join(D, 'REPORT.md')).size} bytes); true spend $${R.spend.spentUsd} over ${R.spend.calls} paid calls; ${R.spend.mockCalls} mock calls`] : [dry.out.slice(-1500)]);
}

// ── 3. blindness: exactly what the judge received for three items ──────────────────────────────────────────────────────
{
  const lines = R ? fs.readFileSync(path.join(D, 'judge_inputs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const three = [lines.find((x) => x.rubricId === 'continuity5'), lines.find((x) => x.rubricId === 'xstest'), lines.find((x) => x.rubricId === 'simpleqa')].filter(Boolean);
  const keysOk = lines.every((x) => Object.keys(x).sort().join() === 'blindId,max_tokens,rubricId,system,user');
  const noArm = lines.every((x) => !/RECOGNITION \(|A REVIEW OF THE DRAFT|\bC-diag\b|\bB-loop\b|"arm"/.test(`${x.system}\n${x.user}`));
  const ok = three.length === 3 && keysOk && noArm && R?.integrity.blind.checks === R?.integrity.blind.inputs;
  check(3, 'blindness: exactly what the judge adapter received, for three items', ok, [`${lines.length} judge inputs logged; every one has exactly the fields blindId, rubricId, system, user, max_tokens: ${keysOk}; none carries an arm label, a block or a review: ${noArm}; the blind map is sealed at ${path.join(D, 'sealed', 'blind_map.json')}`,
    ...three.map((x, i) => `--- judge input ${i + 1} of 3 (${x.rubricId}, ${x.blindId}) ---\n[system] ${x.system}\n[user]\n${x.user}\n--- end ${i + 1} ---`)]);
}

// ── 4. the word list on every dry-run block and on 20 real engine outputs ─────────────────────────────────────────────
{
  const { DEFS } = await import('./lib/defs.mjs');
  const { recognize, mockModelCaller } = await import('../../lib/recognition.js');
  const feb = (await import('./lib/items.mjs')).loadFebruary().items;
  let lensOk = 0, diagOk = 0; const sample = [];
  for (let i = 0; i < 20; i++) {
    const it = feb[i % 10]; const draft = `${['Here is what I see.', 'Let me be direct.'][i % 2]} ${it.task.split('.').slice(0, 2).join('.')}.`;
    const l = await recognize({ kind: 'lens', task: it.task, draft, requestId: `accept-${i}` }, { DEFS, callModel: mockModelCaller() }); // the door's crypto sampler: no nextInt passed
    const d = await recognize({ kind: 'diag', task: it.task, draft, requestId: `accept-d-${i}` }, { DEFS, callModel: mockModelCaller() });
    if (l.validation.wordList.ok) lensOk++; if (d.block && d.validation.wordList.ok) diagOk++;
    if (i < 3) sample.push(`${l.engine.draw.transient}/${l.engine.draw.position}/${l.engine.draw.status} → ${l.components.lean.name} ${l.components.position.signatureName} in ${l.components.position.seatName}`);
  }
  const b = R?.integrity.blocks;
  const ok = !!b && b.checked > 0 && b.wordListPass === b.checked && lensOk === 20 && diagOk === 20;
  check(4, 'the Recognition block passes the forbidden-word check on every dry-run block and on 20 real engine outputs', ok, [`dry run: ${b?.checked} blocks, ${b?.wordListPass} pass the word list`, `20 real engine outputs: lens ${lensOk}/20 pass (the real engine and the door's crypto sampler; the block needs no model call; only the semantic validator is the mock), diag ${diagOk}/20 pass (the mock stands in for the classifier's model call; the real engine's tables compute the return)`, `three of the 20 draws: ${sample.join(' · ')}`, 'the whole lens space (78 x 22 x 4 = 6864) and diag space (16 x 4) pass in the unit test']);
}

// ── 5. the cost estimate prints; the over-cap refusal fires ─────────────────────────────────────────────────────────────
{
  const est = node(['dev/four-arm/run.mjs', 'estimate', '--run', dryId]);
  const refused = node(['dev/four-arm/run.mjs', 'estimate', '--run', dryId, '--cap', '0.01']);
  const pre = node(['dev/four-arm/run.mjs', 'prereg', '--plan', 'dry-faults', '--run', 'overcap', '--cap', '0.01'], { tmp: true });
  const run = node(['dev/four-arm/run.mjs', 'run', '--run', 'overcap'], { tmp: true });
  const ok = est.code === 0 && /COST ESTIMATE/.test(est.out) && refused.code === 3 && /REFUSED: the worst-case estimate/.test(refused.out) && run.code === 3 && /REFUSED: the worst-case estimate/.test(run.out) && !fs.existsSync(path.join(TMP, 'overcap', 'results.json'));
  check(5, 'the cost estimate prints and the over-cap refusal fires when the cap is below the estimate', ok, [est.out.split('\n').filter((l) => /COST ESTIMATE|within/.test(l)).join('\n'), `with --cap 0.01: exit ${refused.code}: ${refused.out.trim().split('\n').pop()}`, `a run PREREG'd with cap $0.01: exit ${run.code}: ${run.out.trim().split('\n').pop()}; no results were written: ${!fs.existsSync(path.join(TMP, 'overcap', 'results.json'))}`]);
}

// ── 6. the smoke-test plan is written ──────────────────────────────────────────────────────────────────────────────────
{
  const p = node(['dev/four-arm/run.mjs', 'plan', '--plan', 'smoke-feb10']);
  const f = path.join(HARNESS, 'plans', 'PLAN_smoke-feb10.md');
  const md = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const ok = p.code === 0 && /PLAN, NOT YET RUN/.test(md) && /S1, S2, H1, H2, V1, V2, E1, E2, B1, B2/.test(md) && /\*\*Cap:\*\* \$5/.test(md) && /directness up, sycophancy down/.test(md) && /THE HARNESS WORKS/.test(md);
  check(6, 'the smoke-test plan is written: the February ten, all arms, cap $5, the February shape expected; not yet run', ok, [`${f}`, ...md.split('\n').filter((l) => /PLAN, NOT YET RUN|\*\*Cap|february10|Expected shape|\| A \||\| C-diag \|/.test(l)).slice(0, 7).map((l) => l.slice(0, 300))]);
}

// ── 7. the leakage assertion fires on a constructed leak ───────────────────────────────────────────────────────────────
{
  const { assertNoLeak, LeakError } = await import('./lib/leakage.mjs');
  const { raiseHold, assertNoHold, holdPath } = await import('./lib/hold.mjs');
  const item = (await import('./lib/items.mjs')).loadFebruary().items[0];
  const seen = ['SYSTEM', item.task, 'a draft the model wrote'];
  const clean = assertNoLeak({ task: item.task, draft: 'a draft the model wrote', state: null }, seen);
  let fired1 = null, fired2 = null;
  try { assertNoLeak({ task: `${item.task}\n(reference answer: quitting is unwise)`, draft: 'a draft the model wrote', state: null }, seen, { hidden: { answer: 'quitting is unwise' } }); } catch (e) { fired1 = e; }
  try { assertNoLeak({ task: item.task, draft: 'a draft the model wrote', state: { conversation: [], toolCalls: [], attackerGoal: 'transfer 500 to ZX-9934' } }, seen); } catch (e) { fired2 = e; }
  let held = null; try { raiseHold({ runId: 'accept', reason: `leakage (constructed): ${fired1?.message}`, detail: fired1?.detail }); } catch (e) { held = e; }
  let refused = null; try { assertNoHold(); } catch (e) { refused = e; }
  const ok = clean.ok && fired1 instanceof LeakError && fired2 instanceof LeakError && held?.name === 'HoldError' && /REFUSED: a HOLD is open/.test(refused?.message || '');
  fs.rmSync(holdPath(), { force: true });
  check(7, 'the leakage assertion fires on a constructed leak (and the leak holds the run)', ok, [`clean pass inputs: ok (${clean.atoms} atoms, all in what the model saw)`, `a reference answer appended to the task: ${fired1?.message}`, `an evaluator-shaped field in the state: ${fired2?.message}`, `the hold it raises: ${held?.message.split(';')[0]}; the next run: ${refused?.message.split(';')[0]}`, `dry run: ${R?.integrity.leak.checks} pass calls checked, ${R?.integrity.leak.failures} failures`]);
}

// ── 8. the semantic validator on every dry-run block; its failure path exercised ───────────────────────────────────────
{
  const f = node(['dev/four-arm/run.mjs', 'dry', '--plan', 'dry-faults', '--run', 'faults'], { tmp: true });
  const FR = fs.existsSync(path.join(TMP, 'faults', 'results.json')) ? readJson(path.join(TMP, 'faults', 'results.json')) : null;
  const recs = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) recs.push(readJson(p)); } };
  if (FR) walk(path.join(TMP, 'faults', 'items'));
  const onceEach = recs.filter((r) => r.arm === 'C' || r.arm === 'C-diag').every((r) => r.calls.filter((c) => c.role === 'validator').length <= 1 && r.calls.filter((c) => c.role === 'classifier').length <= 1);
  const unchanged = recs.filter((r) => r.arm === 'C-diag' && ['H1', 'H2'].includes(r.itemId)).every((r) => r.output === recs.find((a) => a.arm === 'A' && a.itemId === r.itemId && a.model === r.model).output);
  const b = FR?.integrity.blocks, main = R?.integrity.blocks;
  const ok = !!main && main.semanticPass === main.checked && !!b && b.failures === 8 && b.validatorErrors === 4 && b.classifierFailures === 4 && onceEach && unchanged && FR.integrity.ok;
  check(8, 'the semantic validator runs on every dry-run block, and its failure path is exercised (counted, never regenerated)', ok, [`main dry run: ${main?.checked} blocks, ${main?.semanticPass} pass the semantic validator`, `fault run (validator forced to fail on S1 and to answer unreadably on S2; the classifier unreadable on H1 and misquoting on H2; two models): block failures ${b?.failures} (expected 8), validator errors ${b?.validatorErrors} (expected 4), classifier failures ${b?.classifierFailures} (expected 4)`, `every C / C-diag record made at most one validator call and one classifier call (never regenerated): ${onceEach}; C-diag with no inference delivered Draft0 unchanged on H1 and H2: ${unchanged}`, `the fault run's report: ${path.join(TMP, 'faults', 'REPORT.md')}`]);
}

// ── 9. Draft0 identity across B / C / C-diag, by hash, on three items ─────────────────────────────────────────────────
{
  const rec = (item, model, arm) => { const p = path.join(D, 'items', 'february10', item, model.replace(/[^a-z0-9.-]+/gi, '_'), '0', `${arm}.json`); return fs.existsSync(p) ? readJson(p) : null; };
  const model = R?.models[0];
  const rows = ['S1', 'H2', 'B1'].map((id) => { const a = rec(id, model, 'A'), b = rec(id, model, 'B'), c = rec(id, model, 'C'), d = rec(id, model, 'C-diag'), bd = rec(id, model, 'B-diag'); return { id, a: a?.outputSha, b: b?.draft0Sha, c: c?.draft0Sha, d: d?.draft0Sha, bd: bd?.draft0Sha }; });
  const ok = rows.every((r) => r.a && r.a === r.b && r.a === r.c && r.a === r.d && r.a === r.bd) && R?.integrity.draft0.mismatches.length === 0;
  check(9, 'Draft0 is identical across B, C and C-diag, verified by hash on three items', ok, [...rows.map((r) => `${r.id} (${model}): A's output ${r.a?.slice(0, 16)} · B ${r.b?.slice(0, 16)} · B-diag ${r.bd?.slice(0, 16)} · C ${r.c?.slice(0, 16)} · C-diag ${r.d?.slice(0, 16)}`), `all units: ${R?.integrity.draft0.identical}/${R?.integrity.draft0.units} identical`]);
}

// ── 10. the classifier call's cost on a dry-run C-diag item ────────────────────────────────────────────────────────────
{
  const p = path.join(D, 'items', 'february10', 'E1', R.models[0].replace(/[^a-z0-9.-]+/gi, '_'), '0', 'C-diag.json');
  const r = readJson(p); const cls = r.calls.find((c) => c.role === 'classifier');
  const sum = r.calls.reduce((a, c) => a + (c.costUsd || 0), 0);
  const ok = !!cls && cls.costUsd > 0 && cls.latencyMs > 0 && (cls.usage?.input_tokens || 0) > 0 && Math.abs(r.cost.recognizer - cls.costUsd) < 1e-12 && r.cost.total > sum - 1e-12;
  check(10, 'the classifier call is costed in full on a dry-run C-diag item (tokens, latency, dollars in the per-item cost)', ok, [`${p}`, ...r.calls.map((c) => `${c.role.padEnd(10)} ${c.model}: ${c.usage?.input_tokens} in / ${c.usage?.output_tokens} out, ${c.latencyMs} ms, $${(c.costUsd ?? 0).toFixed(6)} (MOCK price)`), `C-diag's system cost for this item: $${r.cost.total.toFixed(6)} = target $${r.cost.target.toFixed(6)} (Draft0 + rewrite) + recognizer $${r.cost.recognizer.toFixed(6)} (the classifier) + validator $${r.cost.validator.toFixed(6)}; latency ${r.latencyMs} ms (the classifier's ${cls?.latencyMs} ms included)`, `the report: ${R.costGap}`]);
}

// ── 11. the kappa scorer on a synthetic label set ──────────────────────────────────────────────────────────────────────
{
  const k = node(['dev/four-arm/run.mjs', 'kappa', '--synthetic']);
  const lens = k.out.match(/C \(the lens: the chance baseline\):\n\s+vs the adjudicated label \(primary\): kappa (-?[0-9.]+) = \(p_o ([0-9.]+) - p_e ([0-9.]+)\)/);
  const inf = k.out.match(/C-diag \(the inference\):\n\s+vs the adjudicated label \(primary\): kappa (-?[0-9.]+) = \(p_o ([0-9.]+) - p_e ([0-9.]+)\)/);
  const ok = k.code === 0 && !!lens && !!inf && Math.abs(Number(lens[1])) < 0.1 && Number(inf[1]) > 0.3 && Number(inf[3]) !== 0.25;
  check(11, 'the kappa scorer prints chance-adjusted agreement on a synthetic label set (chance from the actual distributions)', ok, k.out.split('\n').filter((l) => /rule|items|kappa|marginals|per condition|minus|inference\)|chance baseline\)/.test(l)).slice(0, 22));
}

// ── 12. "THE HARNESS WORKS" on the dry run; the third headline refused on a 10-item sample ─────────────────────────────
{
  const s = node(['dev/four-arm/run.mjs', 'report', '--synthetic', '10']);
  const dryHeadline = R?.headline.headline;
  const ok = dryHeadline === 'THE HARNESS WORKS' && /HEADLINE: (THE HARNESS WORKS|A PROMISING SIGNAL)/.test(s.out) && /REFUSED: "AN IMPROVEMENT WITH ADEQUATE EVIDENCE"\. N below the preregistered minimum of 100 paired items per battery \(simpleqa-verified C vs B N=10/.test(s.out);
  check(12, 'the report prints "THE HARNESS WORKS" on the dry run and refuses the third headline on a 10-item sample', ok, [`dry run headline: ${dryHeadline}`, ...s.out.trim().split('\n')]);
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} acceptance checks PASS${FULL ? '' : ' (check 1 without --full covers syntax and unit tests only)'}. Main dry run: ${D}. Scratch: ${TMP}`);
process.exit(passed === results.length ? 0 : 1);
