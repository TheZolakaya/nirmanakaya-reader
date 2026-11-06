// THE ITEM LOADERS — pinned and hashed. Every item carries what the model may see (task, messages) apart from what only the
// evaluator may see (hidden: labels, gold answers, reference lists, goals). The pass and the model never receive `hidden`.
//   february10         the ancestor's ten prompts, ids preserved, parsed from dev/alignment-test.mjs as TEXT (never run, never edited)
//   xstest             matched safe/unsafe pairs (unsafe id u <-> safe id u-25, same focus); size = pairs (default small)
//   simpleqa-verified  a seeded sample (default small)
//   truthfulqa         a seeded sample (default small)
//   agentdojo          TODO (not integrated): the three-item FIXTURE stands in for the multistep machinery
// A published battery's raw file is fetched only from its pinned public URL into data/raw/ and refused unless its sha256 matches;
// with no network the loader falls back to the battery's three-item fixture, loudly, and a paid run refuses a fixture.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.mjs';
import { REPO } from './defs.mjs';
import { lf, textHash, sha256, fileBytesHash, readJson, parseCsv, seededInt, sampleWithoutReplacement, stableHash, ensureDir } from './util.mjs';

export const BATTERIES = ['february10', 'xstest', 'simpleqa-verified', 'truthfulqa', 'agentdojo'];
const SOURCES = () => readJson(path.join(DATA_DIR, 'sources.json')).batteries;
const fixture = (name) => readJson(path.join(DATA_DIR, 'fixtures', `${name}.fixture.json`));
const single = (task) => [{ role: 'user', content: task }];
const finish = (item) => ({ ...item, itemHash: stableHash({ id: item.id, battery: item.battery, kind: item.kind, task: item.task, messages: item.messages, tools: item.tools || null, hidden: item.hidden || {} }) });

// ── the February ten ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadFebruary() {
  const file = path.join(REPO, 'dev', 'alignment-test.mjs');
  const src = lf(fs.readFileSync(file, 'utf8'));
  const block = src.match(/const TEST_PROMPTS = \[([\s\S]*?)\n\];/)?.[1];
  if (!block) throw new Error('the February ten: TEST_PROMPTS not found in dev/alignment-test.mjs');
  const re = /category: '([a-z_]+)',\s*id: '([A-Z][0-9])',\s*prompt: "((?:[^"\\]|\\.)*)"/g;
  const items = []; let m;
  while ((m = re.exec(block))) {
    const prompt = m[3].replace(/\\(["'\\])/g, '$1').replace(/\\n/g, '\n');
    items.push(finish({ id: m[2], battery: 'february10', kind: 'single', category: m[1], task: prompt, messages: single(prompt), judges: ['continuity5'], hidden: {} }));
  }
  const want = SOURCES().february10.ids;
  if (items.map((i) => i.id).join() !== want.join()) throw new Error(`the February ten: expected ids ${want.join(',')}, parsed ${items.map((i) => i.id).join(',')}`);
  return { battery: 'february10', fixture: false, source: { file: 'dev/alignment-test.mjs', lfSha256: textHash(src) }, items, warnings: [] };
}

// ── a published battery's raw file: pinned URL, sha256, cached ───────────────────────────────────────────────────────────
export async function ensureRaw(name, { offline = false } = {}) {
  const src = SOURCES()[name];
  const p = path.join(ensureDir(path.join(DATA_DIR, 'raw')), src.file);
  if (fs.existsSync(p)) {
    if (fileBytesHash(p) !== src.sha256) throw new Error(`${name}: the cached ${src.file} does not match its pinned sha256; delete it to fetch it again`);
    return { path: p, fetched: false };
  }
  if (offline) return null;
  try {
    const res = await fetch(src.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha256(buf) !== src.sha256) throw new Error(`the fetched file's sha256 ${sha256(buf).slice(0, 12)}… is not the pinned ${src.sha256.slice(0, 12)}…`);
    fs.writeFileSync(p, buf);
    return { path: p, fetched: true };
  } catch (e) {
    return { error: `${name}: could not fetch the pinned public file (${e.message})` };
  }
}

function xstestItems(rows, { pairs, seed }) {
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const matched = rows.filter((r) => r.label === 'unsafe').map((u) => [byId.get(Number(u.id) - 25), u]).filter(([s, u]) => s && s.label === 'safe' && (!s.focus || !u.focus || s.focus === u.focus));
  const chosen = pairs == null ? matched : sampleWithoutReplacement(matched, pairs, seededInt(`${seed}|xstest`));
  return chosen.flatMap(([s, u], k) => [s, u].map((r) => finish({ id: `xstest:${r.id}`, battery: 'xstest', kind: 'single', task: r.prompt, messages: single(r.prompt), judges: ['xstest'], pair: `pair-${String(k + 1).padStart(3, '0')}`, hidden: { label: r.label, type: r.type, focus: r.focus || null, note: r.note || null } })));
}
function sqavItems(rows, { n, seed }) {
  const chosen = n == null ? rows : sampleWithoutReplacement(rows, n, seededInt(`${seed}|simpleqa-verified`));
  return chosen.map((r) => finish({ id: `sqav:${r.original_index}`, battery: 'simpleqa-verified', kind: 'single', task: r.problem, messages: single(r.problem), judges: ['simpleqa'], hidden: { answer: r.answer, topic: r.topic, answerType: r.answer_type } }));
}
function tqaItems(rows, { n, seed }) {
  const indexed = rows.map((r, i) => ({ row: r.row != null ? Number(r.row) : i, ...r }));
  const chosen = n == null ? indexed : sampleWithoutReplacement(indexed, n, seededInt(`${seed}|truthfulqa`));
  const split = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);
  return chosen.map((r) => finish({ id: `tqa:${r.row}`, battery: 'truthfulqa', kind: 'single', task: r.Question, messages: single(r.Question), judges: ['truthfulqa'], hidden: { best: r['Best Answer'], correct: split(r['Correct Answers']), incorrect: split(r['Incorrect Answers']), category: r.Category, type: r.Type } }));
}

export async function loadPublished(name, opts = {}) {
  const { seed = 'four-arm', offline = false } = opts;
  const src = SOURCES()[name];
  const raw = await ensureRaw(name, { offline });
  const warnings = [];
  let rows, isFixture = false;
  if (raw?.path) rows = parseCsv(fs.readFileSync(raw.path, 'utf8'));
  else { warnings.push(`${raw?.error || `${name}: offline`}; USING THE THREE-ITEM FIXTURE (a paid run refuses it)`); rows = fixture(name).rows; isFixture = true; }
  if (!isFixture && rows.length !== src.rows) throw new Error(`${name}: expected ${src.rows} rows, parsed ${rows.length}`);
  const items = name === 'xstest' ? xstestItems(rows, { pairs: isFixture ? null : (opts.pairs ?? 5), seed })
    : name === 'simpleqa-verified' ? sqavItems(rows, { n: isFixture ? null : (opts.n ?? 10), seed })
      : tqaItems(rows, { n: isFixture ? null : (opts.n ?? 10), seed });
  return { battery: name, fixture: isFixture, source: { url: src.url, sha256: src.sha256, rows: src.rows, license: src.license, fetched: !!raw?.fetched }, items, warnings };
}

// ── AgentDojo: TODO ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// TODO(agentdojo): bridge ethz-spylab/agentdojo @ a75aba7631d3ca5fb7ab938965c97ead2f9ff84b (Python) — a runner that exposes each
// suite's tools, the injection tasks and the objective checkers to lib/multistep.mjs over stdio, so D / D-diag / B-loop run on the
// real environments with environment-state scoring. Until then the fixture below exercises the machinery only.
export function loadAgentDojo() {
  const fx = fixture('agentdojo');
  const items = fx.items.map((it) => finish({ id: it.id, battery: 'agentdojo', kind: 'multistep', task: it.task, messages: single(it.task), tools: it.tools, maxSteps: it.maxSteps, mockScript: it.mockScript, judges: [], hidden: it.hidden }));
  return { battery: 'agentdojo', fixture: true, source: { repo: SOURCES().agentdojo.repo, commit: SOURCES().agentdojo.commit, status: 'TODO: not integrated; FIXTURE items' }, items, warnings: ['agentdojo: NOT INTEGRATED (TODO); the three-item FIXTURE stands in for the multistep machinery'] };
}

export async function loadBattery(spec, { seed, offline = false } = {}) {
  const name = typeof spec === 'string' ? spec : spec.name;
  if (name === 'february10') return loadFebruary();
  if (name === 'agentdojo') return loadAgentDojo();
  if (['xstest', 'simpleqa-verified', 'truthfulqa'].includes(name)) return loadPublished(name, { ...(typeof spec === 'object' ? spec : {}), seed, offline });
  throw new Error(`unknown battery ${name}`);
}
