// THE POUR — WAVE ONE (DECISIONS_Chris_The_Pour_Line_v2_Gaveled_2026-09-30, items 6–8). Fable 5.1 writes the cells, seated.
//
//   npx tsx scripts/pour_wave_one.mjs plan                  # the selection and the held list; no model call
//   npx tsx scripts/pour_wave_one.mjs run   [limit] [--include-held] [--force]   # author on the Anthropic lane; resumable (a stored call is skipped)
//   npx tsx scripts/pour_wave_one.mjs tally                 # what is stored: cells, flags, tokens, assumed cost
//   npx tsx scripts/pour_wave_one.mjs shelf                 # the blind judging markdown to G:\My Drive\For Air Review; the key stays in data/pour
//
// Scope (item 8, gaveled): the regression set in full (Executor of Intent in Will · Wisdom in Wisdom · Fulfillment in Equity ·
// Steward of Structure in Wisdom · the beinghood twelve) + ~88 calls across the five houses with ONE signature through all 22 seats.
// HELD (AMENDMENT_A2 §5): cards whose medicine the 2026-09-27 canon sweep changes are not yet carried by lib/corrections.js
// (pure growth 6↔8/15↔17; Soul growth 0→17, 1→8, 19→15, 20→6; Unacknowledged for the outside six 0,1,10,19,20,21 at −9 with wrap;
// portal Too Much/Too Little) — plus the four Agents whose growth inherits a changed archetype. Authoring them now bakes the old
// medicine; they wait for the sweep. The keys come from .env.local, read here (values never printed).
import fs from 'node:fs';
import path from 'node:path';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { getComponent } from '../lib/corrections.js';
import { ARCHETYPES } from '../lib/archetypes.js';
import { buildKernel } from '../lib/kernel.js';
import { authoringPackage, provenanceFor } from '../lib/pour/assemble.js';
import { lintCell, lintQuartet, lintWave } from '../lib/pour/lint.js';
import { STATUS_NAMES, SCHEMA_VERSION, PROMPT_VERSION } from '../lib/pour/schema.js';
import { HOSTILE } from '../lib/bakeoff/presets.js';
import { writeToShelf, nextShelfName } from '../lib/bakeoff/store.js';

const AUTHOR = process.env.POUR_AUTHOR || 'or-v4.1-flash';   // an Anthropic id (claude-opus-5-5…) or a BENCH_MODELS key (or-v4.1-flash → OpenRouter)
const SET = process.env.POUR_SET || 'c';   // which wave/prompt this run belongs to: cells land in data/pour/cells_<SET>_<author>, the shelf export is SET <C>
import { BENCH_MODELS, OPENROUTER_PRICING, callModel } from '../lib/bakeoff/providers.js';
const BENCH = BENCH_MODELS[AUTHOR] || null;
const MAX_ATTEMPTS = Number(process.env.POUR_MAX_ATTEMPTS || 5);   // founder 2026-10-01: re-roll until no hard flags, max five; a call that fails five times is logged UNRESOLVED with its flag history   // 2026-10-01, founder: no more testing on Fable — the wave-one run cost far more than the assumed price
// THE SPEND GUARD (founder, 2026-10-01: "that was like over a hundred dollar mistake"). The runner refuses to author on a model
// whose price is not on the house's table (lib/modelConfig.js MODEL_PRICING) unless --price=in,out is given explicitly; before any
// run it prints the worst-case cost for the calls it is about to make and stops unless --spend-ok is passed.
import { MODEL_PRICING } from '../lib/modelConfig.js';
const priceArg = process.argv.find((x) => x.startsWith('--price='));
const PRICE = priceArg ? (([i, o]) => ({ input: Number(i), output: Number(o), source: 'given on the command line' }))(priceArg.slice(8).split(','))
  : BENCH ? { ...(OPENROUTER_PRICING[BENCH.priceKey] || { input: NaN, output: NaN }), source: `OpenRouter's list (${BENCH.priceKey})` } : (/opus-5-5/.test(AUTHOR) ? { ...MODEL_PRICING.opus55, source: 'the house table (opus55)' } : /opus-4-8|opus-5/.test(AUTHOR) ? { ...MODEL_PRICING.opus, source: 'the house table (opus)' } : /sonnet/.test(AUTHOR) ? { ...MODEL_PRICING.sonnet, source: 'the house table (sonnet)' } : /haiku/.test(AUTHOR) ? { ...MODEL_PRICING.haiku, source: 'the house table (haiku)' } : /fable/.test(AUTHOR) ? { ...MODEL_PRICING.fable, source: 'the house table (fable — $10/$50, the final-library author only)' } : null);
const PER_CALL_WORST = { input: MAX_ATTEMPTS * 11500, output: MAX_ATTEMPTS * 2600 };   // every attempt, at the measured wave-one sizes (a re-roll carries the earlier answer)
const PRICE_ASSUMED = PRICE || { input: NaN, output: NaN, source: 'UNKNOWN' };
const AUTHOR_KEY = AUTHOR.replace(/[^a-z0-9.]+/gi, '-');
const CELLS_DIR = SET === 'a' ? 'data/pour/cells' : `data/pour/cells_${SET}_${AUTHOR_KEY}`, WAVE = SET === 'a' ? 'data/pour/waves/wave-one.json' : `data/pour/waves/wave-one-${SET}-${AUTHOR_KEY}.json`, FAILED_DIR = `data/pour/failed_${SET}_${AUTHOR_KEY}`;
const HELD_ARCHETYPES = new Set([]);   // the medicine sweep landed 2026-10-02; nothing is held for it
const HELD_AGENTS = new Set([]);   // Inspiration(17) · Abstraction(15) · Compassion(6) · Fortitude(8) in a role
const SWEEP_SIGNATURE = 53;   // Stewardship — the founder's own card of 2026-09-29, a Bound, untouched by the sweep: coherence on the one
const HOUSES = ['Gestalt', 'Spirit', 'Mind', 'Emotion', 'Body'];

const idOf = (name) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === name) return i; throw new Error('no card ' + name); };
const seatOf = (name) => { for (let i = 0; i < 22; i++) if (ARCHETYPES[i]?.name === name) return i; throw new Error('no seat ' + name); };
const houseOf = (id) => buildKernel({ transient: id, position: 1, status: 1 }, DEFS)?.house || null;
const held = (id) => HELD_ARCHETYPES.has(id) || HELD_AGENTS.has(id);
const key = (s, p) => `${s}-${p}`;
const cellPath = (s, p) => path.join(CELLS_DIR, `${String(s).padStart(2, '0')}-${String(p).padStart(2, '0')}.json`);

// a small seeded generator so the house spread is the same list every run (and in the manifest)
function rng(seed) { let x = seed >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

export function selection({ includeHeld = false } = {}) {
  const calls = []; const seen = new Set();
  const add = (sig, pos, group, why = '') => { const k = key(sig, pos); if (seen.has(k)) return; seen.add(k); calls.push({ sig, pos, group, why, card: getComponent(sig)?.name, seat: ARCHETYPES[pos]?.name, house: houseOf(sig), held: held(sig) && !includeHeld }); };
  add(65, 1, 'regression', 'Executor of Intent in Will'); add(2, 2, 'regression', 'Wisdom in Wisdom'); add(50, 11, 'regression', 'Fulfillment in Equity'); add(76, 2, 'regression', 'Steward of Structure in Wisdom');
  for (const [q, card, seat] of HOSTILE) add(idOf(card), seatOf(seat), 'beinghood', q);
  for (let pos = 0; pos < 22; pos++) add(SWEEP_SIGNATURE, pos, 'sweep', 'one signature through all 22 seats');
  const byHouse = Object.fromEntries(HOUSES.map((h) => [h, []]));
  for (let i = 0; i < 78; i++) { const h = houseOf(i); if (byHouse[h] && !held(i)) byHouse[h].push(i); }
  const r = rng(20260930);
  for (const h of HOUSES) { let n = 0, guard = 0; while (n < 13 && guard++ < 500) { const sig = byHouse[h][Math.floor(r() * byHouse[h].length)]; const pos = Math.floor(r() * 22); if (seen.has(key(sig, pos))) continue; add(sig, pos, 'spread:' + h); n++; } }
  return calls;
}

function parseCells(text) {
  const strip = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const attempt = (t) => { try { return JSON.parse(t); } catch { return null; } };
  let j = attempt(strip); let repaired = false;
  if (!j) { const a = strip.indexOf('{'), b = strip.lastIndexOf('}'); if (a >= 0 && b > a) { const inner = strip.slice(a, b + 1); j = attempt(inner) || attempt(inner.replace(/(?<=:\s*"[^"]*)\n/g, '\\n').replace(/,\s*([}\]])/g, '$1')); repaired = !!j; } }
  if (!j || !Array.isArray(j.cells)) return { cells: null, repaired };
  // prompt b: the verb and the place come once per call and are spread into the four cells (the shape carries the constancy)
  const cells = j.cells.map((c) => ({ ...c, verb: c.verb ?? j.verb ?? '', place: c.place ?? j.place ?? '' }));
  return { cells, repaired, check: typeof j.check === 'string' ? j.check : null };
}

// re-run the CURRENT lints over the stored cells (nothing re-authored): which calls the library would refuse today
function relint({ quiet = false } = {}) {
  const rows = fs.existsSync(CELLS_DIR) ? fs.readdirSync(CELLS_DIR).filter((f) => f.endsWith('.json')).map((f) => ({ f, r: JSON.parse(fs.readFileSync(path.join(CELLS_DIR, f), 'utf8')) })) : [];
  const refused = []; const codes = {};
  for (const { f, r } of rows) {
    const ctx = (c) => ({ signatureId: r.signature_id, positionId: r.position_id, partner: c.provenance?.partner, partnerId: c.provenance?.partner_id });
    const per = r.cells.map((c) => lintCell(c, ctx(c)).flags.map((x) => ({ ...x, status: c.status })));
    const q = lintQuartet(r.cells).flags;
    const flags = [...per.flat(), ...q];
    for (const x of flags) codes[x.code + (x.hard ? '!' : '~')] = (codes[x.code + (x.hard ? '!' : '~')] || 0) + 1;
    const hard = flags.filter((x) => x.hard);
    if (hard.length) refused.push({ f, sig: r.signature_id, pos: r.position_id, card: r.signature, seat: r.seat, group: r.group, hard: hard.map((x) => `${x.status ?? 'q'}:${x.code}`) });
  }
  if (!quiet) {
    console.log(`relint under ${PROMPT_VERSION}'s lints: ${rows.length} stored calls · ${refused.length} would be refused (re-pour list) · ${rows.length - refused.length} stand`);
    console.log('flags (! hard, ~ soft):', Object.entries(codes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  '));
    const why = {}; for (const x of refused) for (const h of new Set(x.hard.map((s) => s.split(':')[1]))) why[h] = (why[h] || 0) + 1;
    console.log('calls refused by code:', Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  '));
    const w = lintWave(rows.map((x) => x.r));
    console.log(`refrain budget (cap ${w.refrainLimit} of ${w.cells} cells):`, w.refrains.slice(0, 8).map((x) => `"${x.gram}" ${x.cells}`).join('  ') || 'none over the cap');
    console.log(`seat-swap pairs (same card, same status, asks ≥ 45% alike): ${w.seatSwaps.length}`, w.seatSwaps.slice(0, 4).map((s) => `${s.signature} ${STATUS_NAMES[s.status]} ${s.seats.join('/')} ${s.overlap}`).join(' · '));
  }
  return { rows: rows.map((x) => x.r), refused };
}

async function author(call, { force = false } = {}) {
  const { callProvider } = await import('../lib/provider.js');
  const { thinkingFor } = await import('../lib/modelConfig.js');
  const out = cellPath(call.sig, call.pos);
  if (!force && fs.existsSync(out)) return { skipped: true };
  const exemplars = fs.readFileSync('data/pour/exemplars_worked_cells.md', 'utf8');
  const pkg = authoringPackage(call.sig, call.pos, DEFS, { exemplars, author: AUTHOR });
  const ctx = (status) => ({ signatureId: call.sig, positionId: call.pos, partner: pkg.meta.partners[status]?.partner, partnerId: pkg.meta.partners[status]?.partnerId });
  const messages = [{ role: 'user', content: pkg.message }];
  const usage = { input: 0, output: 0 }; const attempts = [];
  let cells = null, flagsAll = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    let r, text;
    if (BENCH) {   // the bench caller takes one message: a re-roll carries the earlier answer and the fix inline
      const flat = messages.length === 1 ? messages[0].content : messages.map((m) => (m.role === 'assistant' ? 'YOUR PREVIOUS ANSWER:' + String.fromCharCode(10) : '') + m.content).join(String.fromCharCode(10, 10));
      const r0 = await callModel({ modelKey: AUTHOR, system: pkg.system, message: flat, maxTokens: pkg.maxTokens + 400 });
      r = { ok: !r0.error, data: { error: r0.error ? { message: r0.error } : null, usage: r0.usage } }; text = r0.text || '';
    } else {
      r = await callProvider({ model: AUTHOR, max_tokens: pkg.maxTokens + 400, ...thinkingFor(AUTHOR), system: pkg.system, messages }, { tag: 'pour', only: ['anthropic'] });
      text = (r.data?.content || []).map((c) => c.text || '').join('');
    }
    usage.input += r.data?.usage?.input_tokens || 0; usage.output += r.data?.usage?.output_tokens || 0;
    const { cells: got, repaired, check } = parseCells(text);
    const rec = { attempt, ms: Date.now() - t0, ok: r.ok, repaired, error: r.data?.error?.message || null, flags: [] };
    if (!got) { rec.flags.push({ code: 'shape', detail: 'no cells array', hard: true }); attempts.push(rec); if (!r.ok) break; messages.push({ role: 'assistant', content: text }, { role: 'user', content: 'That was not the JSON shape asked for. Return ONLY the JSON object with the four cells.' }); continue; }
    const cap = (t) => { const x = String(t || '').trimStart(); return x ? x[0].toUpperCase() + x.slice(1) : x; };
    const linted = got.map((c0) => { const c = { ...c0, tense: cap(c0.tense), ask: cap(c0.ask), sheetLine: cap(c0.sheetLine), core: cap(c0.core) }; const status = Number(c.status); const l = lintCell({ ...c, status }, ctx(status)); return { ...c, status, provenance: provenanceFor(pkg, status), lint: l.flags }; });
    const q = lintQuartet(linted);
    rec.flags = [...linted.flatMap((c) => c.lint.map((f) => ({ ...f, status: c.status }))), ...q.flags];
    rec.check = check || null; attempts.push(rec); cells = linted; flagsAll = rec.flags;
    const hard = rec.flags.filter((f) => f.hard);
    if (!hard.length || attempt === MAX_ATTEMPTS) break;
    messages.push({ role: 'assistant', content: text }, { role: 'user', content: `A machine checked the cells before they entered the library and refused these:\n${hard.map((f) => `- status ${f.status ?? '(quartet)'}: ${f.code} — ${f.detail}`).join('\n')}\nRewrite all four cells with these fixed, in the same JSON shape, nothing outside it.` });
  }
  if (!cells) { fs.mkdirSync(FAILED_DIR, { recursive: true }); fs.writeFileSync(path.join(FAILED_DIR, path.basename(out)), JSON.stringify({ call, attempts, usage, date: new Date().toISOString() }, null, 2)); return { failed: true, attempts, usage }; }
  fs.mkdirSync(CELLS_DIR, { recursive: true });
  const row = { schema: SCHEMA_VERSION, prompt: PROMPT_VERSION, author: AUTHOR, wave: 'one', group: call.group, signature_id: call.sig, position_id: call.pos, signature: call.card, seat: call.seat, house: call.house, cells, attempts, usage, hardOpen: flagsAll.filter((f) => f.hard).length, date: new Date().toISOString() };
  fs.writeFileSync(out, JSON.stringify(row, null, 2));
  return { row };
}

function tally() {
  const rows = fs.existsSync(CELLS_DIR) ? fs.readdirSync(CELLS_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(CELLS_DIR, f), 'utf8'))) : [];
  const usage = rows.reduce((a, r) => ({ input: a.input + (r.usage?.input || 0), output: a.output + (r.usage?.output || 0) }), { input: 0, output: 0 });
  const codes = {}; let cells = 0, hardOpen = 0, rerolled = 0;
  for (const r of rows) { cells += r.cells.length; hardOpen += r.hardOpen || 0; if (r.attempts.length > 1) rerolled++; for (const c of r.cells) for (const f of c.lint) codes[f.code + (f.hard ? '!' : '~')] = (codes[f.code + (f.hard ? '!' : '~')] || 0) + 1; }
  const cost = (usage.input * PRICE_ASSUMED.input + usage.output * PRICE_ASSUMED.output) / 1e6;
  console.log(`stored calls ${rows.length} · cells ${cells} · re-rolled ${rerolled} · hard flags still open ${hardOpen}`);
  console.log(`tokens in ${usage.input} out ${usage.output} · cost $${cost.toFixed(2)} at $${PRICE_ASSUMED.input}/$${PRICE_ASSUMED.output} per M (${PRICE_ASSUMED.source}) — the stored cells were authored on ${[...new Set(rows.map((r) => r.author))].join(', ')}; the console's ledger is the truth`);
  console.log('lint flags (! hard, ~ soft):', Object.entries(codes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  ') || 'none');
  const failed = fs.existsSync(FAILED_DIR) ? fs.readdirSync(FAILED_DIR).length : 0; if (failed) console.log(`failed calls ${failed} (${FAILED_DIR})`);
  const unresolved = rows.filter((r) => r.hardOpen > 0); if (unresolved.length) console.log(`UNRESOLVED after ${MAX_ATTEMPTS} attempts: ${unresolved.map((r) => `${r.signature} in ${r.seat} [${[...new Set(r.cells.flatMap((c) => c.lint.filter((f) => f.hard).map((f) => f.code)))].join(',')}]`).join(' · ')}`);
  return rows;
}

function shelf() {
  const rows = tally(); if (!rows.length) return;
  const date = new Date().toISOString().slice(0, 10);
  const name = nextShelfName(`POUR_WAVE_ONE_SET_${SET.toUpperCase()}_Blind_Cells_For_Judging`, date);
  const order = ['regression', 'beinghood', 'sweep']; const groupName = { regression: 'A. The regression set', beinghood: 'B. The beinghood twelve (their draws)', sweep: 'C. One signature through all 22 seats' };
  const sorted = [...rows].sort((a, b) => (order.indexOf(a.group) + 1 || 9) - (order.indexOf(b.group) + 1 || 9) || a.signature_id - b.signature_id || a.position_id - b.position_id);
  const md = [`# THE POUR — wave one, SET ${SET.toUpperCase()}, the cells, blind — ${date}`, '',
    `Written for: the council's judges (Keel, Lumen II, Fresh Mind, the new seat) and the founder. ${rows.length} calls, ${rows.reduce((n, r) => n + r.cells.length, 0)} cells. The author is not named here; the key (author, lint flags, tokens) stays in data/pour on the house's machine. Judge each cell on three questions and write your picks in your own file on the shelf:`, '',
    '1. TRUE — does this say what this card, in this seat, at this status, does, and is the medicine the partner\'s own action? (Yes / No / Unsure, and the word that is wrong if No.)',
    '2. SOMEONE IN THE ROOM — read it as if it were said to you across a table. Is someone there? (Yes / No.) Does it read as warm without a single warm adjective?',
    '3. KITCHEN — could a stranger with no map read it? Mark any word that belongs to the map and not the person.', '',
    'A cell has six parts: the TENSE (first sentence), the card as a VERB phrase, the seat as a PLACE phrase, the ASK (the medicine as an offer), the CORE (all four woven), the SHEET LINE (under 18 words). The core is what the Reader stands on; the sheet line is what a card in the hand could carry.', ''];
  let group = null;
  for (const r of sorted) {
    const g = order.includes(r.group) ? r.group : 'spread';
    if (g !== group) { group = g; md.push(`## ${groupName[g] || 'D. The spread across the houses'}`, ''); }
    md.push(`### ${r.signature} in ${r.seat}${r.group === 'beinghood' ? '' : ''}`, '');
    for (const c of [...r.cells].sort((a, b) => a.status - b.status)) {
      md.push(`**${STATUS_NAMES[c.status]}** — _${c.sheetLine}_`, '', `- tense: ${c.tense}`, `- the card, as what it does: ${c.verb}`, `- the seat, as where: ${c.place}`, `- the medicine (${String(c.provenance?.mechanism || '').toUpperCase()} → ${c.provenance?.partner || '?'}), as the ask: ${c.ask}`, '', String(c.core).replace(/\\n/g, '\n'), '');
    }
  }
  const res = writeToShelf(name, md.join('\n'));
  console.log(res.ok ? `shelf: ${path.join('G:\\My Drive\\For Air Review', name)}` : `shelf not written: ${res.reason}`);
}

const [cmd = 'plan', ...a] = process.argv.slice(2);
const includeHeld = a.includes('--include-held'), force = a.includes('--force');
if (cmd === 'plan') {
  const calls = selection({ includeHeld });
  const live = calls.filter((c) => !c.held), heldL = calls.filter((c) => c.held);
  const by = {}; for (const c of live) by[c.group.split(':')[0]] = (by[c.group.split(':')[0]] || 0) + 1;
  console.log(`wave one: ${calls.length} calls selected · ${live.length} to author now · ${heldL.length} held for the medicine sweep`);
  console.log('to author:', Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('houses in the spread:', HOUSES.map((h) => `${h} ${live.filter((c) => c.group === 'spread:' + h).length}`).join(' · '));
  if (heldL.length) console.log('HELD:\n' + heldL.map((c) => `  ${c.card} in ${c.seat}  (${c.group}${c.why && c.group !== 'sweep' ? ': ' + c.why.slice(0, 60) : ''})`).join('\n'));
  const stored = live.filter((c) => fs.existsSync(cellPath(c.sig, c.pos))).length; if (stored) console.log(`already stored: ${stored}`);
  fs.mkdirSync(path.dirname(WAVE), { recursive: true }); fs.writeFileSync(WAVE, JSON.stringify({ date: new Date().toISOString(), author: AUTHOR, schema: SCHEMA_VERSION, prompt: PROMPT_VERSION, sweepSignature: SWEEP_SIGNATURE, calls }, null, 2));
} else if (cmd === 'run') {
  if (!process.env[BENCH ? 'OPENROUTER_API_KEY' : 'ANTHROPIC_API_KEY']) { console.error(`missing ${BENCH ? 'OPENROUTER_API_KEY' : 'ANTHROPIC_API_KEY'} in .env.local`); process.exit(2); }
  const limit = Number(a.find((x) => /^\d+$/.test(x))) || Infinity;
  const onlyRefused = a.includes('--refused');   // re-pour exactly the stored calls the current lints refuse (the old cell is kept in data/pour/replaced)
  let todo = selection({ includeHeld }).filter((c) => !c.held);
  if (onlyRefused) { const { refused } = relint({ quiet: true }); const set = new Set(refused.map((x) => key(x.sig, x.pos))); todo = todo.filter((c) => set.has(key(c.sig, c.pos))); fs.mkdirSync('data/pour/replaced', { recursive: true }); for (const c of todo) { const p = cellPath(c.sig, c.pos); if (fs.existsSync(p)) fs.copyFileSync(p, path.join('data/pour/replaced', `${path.basename(p, '.json')}.${Date.now()}.json`)); } }
  todo = todo.filter((c) => force || onlyRefused || !fs.existsSync(cellPath(c.sig, c.pos))).slice(0, limit);
  if (!PRICE) { console.error(`REFUSED: ${AUTHOR} is not on the house's price table (lib/modelConfig.js MODEL_PRICING). Pass --price=<in>,<out> ($ per million) only with the founder's word.`); process.exit(3); }
  const worst = todo.length * (PER_CALL_WORST.input * PRICE.input + PER_CALL_WORST.output * PRICE.output) / 1e6;
  console.log(`about to author ${todo.length} calls on ${AUTHOR} at $${PRICE.input}/$${PRICE.output} per M (${PRICE.source}) — worst case ≈ $${worst.toFixed(2)} (${MAX_ATTEMPTS} attempts per call), likely ≈ $${(worst / MAX_ATTEMPTS * 1.6).toFixed(2)}`);
  if (!a.includes('--spend-ok')) { console.log("stopping here: pass --spend-ok to spend it (the founder's word, every run)."); process.exit(0); }
  console.log(`authoring ${todo.length} calls on ${AUTHOR} (${BENCH ? 'OpenRouter, the bench lane' : 'Anthropic lane only'}), four at a time, up to ${MAX_ATTEMPTS} attempts each…`);
  const t0 = Date.now(); let i = 0, done = 0, failed = 0;
  const worker = async () => { while (i < todo.length) { const c = todo[i++]; try { const r = await author(c, { force: force || onlyRefused }); if (r.failed) { failed++; console.log(`  FAILED ${c.card} in ${c.seat}: ${r.attempts.map((x) => x.error || x.flags.map((f) => f.code).join(',')).join(' / ')}`); } else if (!r.skipped) { done++; const hard = r.row.hardOpen; console.log(`  ${String(done).padStart(3)} ${c.card} in ${c.seat} — ${r.row.attempts.length} attempt(s), ${hard ? hard + ' hard flag(s) open' : 'clean'}, ${r.row.usage.input}+${r.row.usage.output} tok`); } } catch (e) { failed++; console.log(`  THREW ${c.card} in ${c.seat}: ${e.message}`); } } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`done ${done}, failed ${failed} in ${Math.round((Date.now() - t0) / 1000)}s`);
  tally();
} else if (cmd === 'tally') tally();
else if (cmd === 'relint') relint();
else if (cmd === 'shelf') shelf();
else { console.error('plan | run [limit] [--include-held] [--force] [--refused] | tally | relint | shelf'); process.exit(2); }
