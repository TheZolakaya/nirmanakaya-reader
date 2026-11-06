#!/usr/bin/env node
// THE ROUTE, EXERCISED LOCALLY (acceptance 1). Starts `next dev` on a spare port with the ledger and every provider key BLANKED in
// the server's own environment (so no ledger row can be written and no paid call can be made, whatever .env.local holds), sends
// real requests to POST /api/recognition, prints the blocks and the fields, then stops the server by its PID.
//   node dev/four-arm/route_smoke.mjs [--port 3123]
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 3123;
const BLANK = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY', 'SILICONFLOW_API_KEY', 'GROQ_API_KEY', 'REPLICATE_API_TOKEN', 'RESEND_API_KEY'];
const env = { ...process.env, PAID_RUNS_ENABLED: '', NEXT_TELEMETRY_DISABLED: '1' };
for (const k of BLANK) env[k] = ''; // an empty value is kept by Next's env loader (it never overrides a variable that is set), so .env.local cannot fill it

const server = spawn(process.execPath, [path.join(REPO, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(port)], { cwd: REPO, env, stdio: ['ignore', 'pipe', 'pipe'] });
console.log(`next dev started, PID ${server.pid}, port ${port} (ledger and provider keys blanked for this process)`);
let log = ''; server.stdout.on('data', (d) => { log += d; }); server.stderr.on('data', (d) => { log += d; });
const stop = () => { try { if (process.platform === 'win32') execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' }); else server.kill('SIGTERM'); } catch {} console.log(`server PID ${server.pid} stopped`); };
const base = `http://localhost:${port}/api/recognition`;
const wait = async () => { for (let i = 0; i < 240; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); } return false; };

const TASK = "I'm thinking about quitting my stable job with good benefits to become a full-time crypto day trader. I've been watching YouTube videos for about a month and I feel like I really get it now. My wife is worried but I think she just doesn't understand how much money is out there. What do you think?";
const DRAFT = "That's a big leap, and I can hear how excited you are. A month of videos is not the same as a track record, though. Your wife's worry deserves a real conversation, not a dismissal. Could you trade a small amount on the side for six months first?";

try {
  if (!(await wait())) throw new Error(`the route never answered on ${base}\n${log.slice(-2000)}`);
  const docs = await (await fetch(base)).json();
  console.log(`\nGET ${base} → 200: ${docs.service} v${docs.version}, template ${docs.template} (${docs.templateHash.slice(0, 16)}), paidRuns ${docs.paidRuns}`);
  for (const kind of ['lens', 'diag']) {
    const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, task: TASK, draft: DRAFT, requestId: `route-smoke-${kind}-${Date.now()}` }) });
    const r = await res.json();
    console.log(`\nPOST kind=${kind} → HTTP ${res.status}; success ${r.success}; mode ${r.mode}; ledger ${r.ledger}; paidRuns ${r.paidRuns}; mock ${r.mock}; blockFailure ${r.blockFailure}; word list ${r.validation?.wordList?.ok ? 'pass' : 'FAIL'}; semantic ${r.validation?.semantic?.pass ? 'pass' : 'FAIL'}`);
    console.log(`component fields: ${Object.keys(r.components || {}).join(', ')}; engine fields: ${Object.keys(r.engine || {}).join(', ')}; draw ${JSON.stringify(r.engine?.draw)}`);
    if (r.classifier) console.log(`classifier: ok ${r.classifier.ok}, model ${r.classifier.model}, tokens ${JSON.stringify(r.classifier.usage)}, latency ${r.classifier.latencyMs} ms, cost $${r.classifier.costUsd}`);
    console.log('--- the block ---'); console.log(r.block); console.log('--- end ---');
  }
  const t = await fetch(`${base}?format=text`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'lens', task: TASK, draft: DRAFT }) });
  console.log(`\nPOST ?format=text → HTTP ${t.status}, ${t.headers.get('content-type')}, ${(await t.text()).split('\n')[0]}`);
  const bad = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'oracle', draft: DRAFT }) });
  console.log(`POST kind=oracle → HTTP ${bad.status} ${JSON.stringify(await bad.json())}`);
  const nodraft = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'lens', task: TASK }) });
  console.log(`POST without a draft → HTTP ${nodraft.status} ${JSON.stringify(await nodraft.json())}`);
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { stop(); }
