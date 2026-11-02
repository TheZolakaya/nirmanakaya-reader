// CHECK — GROWTH IS THE TWIN (DIRECTION_04, 4A + 4B; BRIEF_04). Rulings of 2026-11-02:
//   R-48: the Balanced medicine, Growth, is the twin — swap Fire for Air and Earth for Water in all four dimensions
//         (Practice, Activity, Being, Identity).
//   R-49 (keep-side): a bound's growth is the twin parent's bound on the SAME side (inner stays inner, outer stays outer);
//         an agent's growth is the twin parent's agent. The corrections (V, D, R) keep their side flip.
// The script computes the expected rows from the element tables and the rulings, prints them (that printout is the spec the
// edit must match), and runs four checks against the LIVE tables in lib/corrections.js:
//   1. the twin, recomputed (16/16), no overlap with V/D/R (8/8 pairs), stage kept (16/16), no fixed point
//   2. bounds and agents recomputed by R-49 (40/40, 16/16; the 8 Soul-row bounds equal the base commit's values)
//   3. Lumen's law: λ = side XOR the parent's half is preserved by every medicine, 32/32 on each of V, D, R, G
//   4. the diff count: lib/corrections.js against the base commit changes exactly the 48 expected table rows plus comment
//      lines; the V, D and R tables are byte-identical
// Run from the repo root:  node scripts/check_growth_twin.mjs [--base=<commit>]   (base defaults to `git merge-base HEAD main`)
// Exit code 0 only when every check passes. On the unedited table the checks are EXPECTED to fail on exactly the 48 rows and
// Lumen's law on G only; the CALIBRATION block at the end says whether that is what happened.
// Sources: lib/archetypes.js (house, channel, stage = `function`, bound `horizon`, parents) · lib/constants.js (CHANNELS element,
// BEING_GROUPS, IDENTITY_GROUPS) · lib/viz/palette.js HOUSE_ELEMENT (cross-checked against lib/geometryEngine.js PRACTICE_ELEMENT).
// No new dependency.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const { ARCHETYPES, BOUNDS, AGENTS } = await import('../lib/archetypes.js');
const { CHANNELS, BEING_GROUPS, IDENTITY_GROUPS } = await import('../lib/constants.js');
const { HOUSE_ELEMENT } = await import('../lib/viz/palette.js');
const C = await import('../lib/corrections.js');
const { GROWTH_PAIRS, DIAGONAL_PAIRS, VERTICAL_PAIRS, REDUCTION_PAIRS, getFullCorrection, getCorrectionTargetId, getComponent } = C;

const results = []; // { name, pass, detail }
const record = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const nm = (id) => { const c = getComponent(id); return c?.traditional ? `${c.name} (${c.traditional})` : c?.name; };

// ---------- the element tables ----------
const geoSrc = fs.readFileSync('lib/geometryEngine.js', 'utf8');
const pm = geoSrc.match(/const PRACTICE_ELEMENT = (\{[^}]*\})/);
const PRACTICE_ELEMENT_GEO = pm ? Function(`return (${pm[1]})`)() : null;
const MANIFEST = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
const SOUL = [0, 1, 19, 20];
const PORTALS = [10, 21];
const SWAP = { Fire: 'Air', Air: 'Fire', Earth: 'Water', Water: 'Earth' };
const groupOf = (groups, id) => Object.values(groups).find((g) => g.members.includes(id));
const addr = (id) => {
  const a = ARCHETYPES[id];
  return {
    P: HOUSE_ELEMENT[a.house], A: CHANNELS[a.channel]?.element,
    B: groupOf(BEING_GROUPS, id)?.element, I: groupOf(IDENTITY_GROUPS, id)?.element,
    stage: a.function,
  };
};
const key = (v) => `${v.P}/${v.A}/${v.B}/${v.I}`;
const HALF = { Seed: 0, Bridge: 0, Fruition: 1, Feedback: 1 };

console.log('=== THE ELEMENT TABLES ===');
console.log('Practice (house → element, lib/viz/palette.js HOUSE_ELEMENT):', ['Spirit', 'Mind', 'Emotion', 'Body'].map((h) => `${h}=${HOUSE_ELEMENT[h]}`).join(' '));
console.log('Activity (channel → element, lib/constants.js CHANNELS):', Object.keys(CHANNELS).map((c) => `${c}=${CHANNELS[c].element}`).join(' '));
console.log('Being (lib/constants.js BEING_GROUPS):', Object.values(BEING_GROUPS).map((g) => `${g.name}=${g.element} [${g.members.join(',')}]`).join(' '));
console.log('Identity (lib/constants.js IDENTITY_GROUPS):', Object.values(IDENTITY_GROUPS).map((g) => `${g.name}=${g.element} [${g.members.join(',')}]`).join(' '));
const geoAgrees = PRACTICE_ELEMENT_GEO && ['Spirit', 'Mind', 'Emotion', 'Body'].every((h) => PRACTICE_ELEMENT_GEO[h] === HOUSE_ELEMENT[h]);
console.log('cross-check: lib/geometryEngine.js PRACTICE_ELEMENT', geoAgrees ? 'agrees' : 'DISAGREES', JSON.stringify(PRACTICE_ELEMENT_GEO));
console.log('\nthe sixteen addresses (P/A/B/I, stage):');
const byKey = {};
for (const id of MANIFEST) {
  const v = addr(id);
  console.log(`  ${String(id).padStart(2)} ${ARCHETYPES[id].name.padEnd(15)} ${key(v).padEnd(24)} ${v.stage}`);
  (byKey[key(v)] ||= []).push(id);
}
const tablesSound = geoAgrees && MANIFEST.every((id) => Object.values(addr(id)).every(Boolean)) && Object.values(byKey).every((l) => l.length === 1) && Object.keys(byKey).length === 16;
record('element tables complete; the sixteen addresses are distinct', tablesSound);

// ---------- the twin, recomputed ----------
const TWIN = {};
for (const id of MANIFEST) {
  const v = addr(id);
  const w = { P: SWAP[v.P], A: SWAP[v.A], B: SWAP[v.B], I: SWAP[v.I] };
  const hits = byKey[key(w)] || [];
  if (hits.length !== 1) throw new Error(`twin of ${id} not unique: ${key(w)} → ${hits}`);
  TWIN[id] = hits[0];
}

// ---------- the base commit's tables (parsed as text; nothing evaluated) ----------
const arg = process.argv.find((a) => a.startsWith('--base='));
const BASE = arg ? arg.slice(7) : execSync('git merge-base HEAD main').toString().trim();
const baseSrc = execSync(`git show ${BASE}:lib/corrections.js`).toString();
const nowSrc = fs.readFileSync('lib/corrections.js', 'utf8');
function parseTables(src) {
  const lines = src.split(/\r?\n/); const tables = {}; let cur = null;
  lines.forEach((line, i) => {
    const open = line.match(/^(?:export )?const ([A-Z_]+) = \{\s*$/);
    if (open) { cur = { name: open[1], start: i + 1, end: null, rows: {}, rowLine: {}, text: [] }; tables[cur.name] = cur; }
    if (cur) {
      cur.text.push(line);
      const r = line.match(/^\s*(\d+):\s*(\d+|null)\s*,?/);
      if (r) { cur.rows[+r[1]] = r[2] === 'null' ? null : +r[2]; cur.rowLine[+r[1]] = { no: i + 1, text: line }; }
      if (/^\};\s*$/.test(line)) { cur.end = i + 1; cur = null; }
    }
  });
  return { lines, tables };
}
const base = parseTables(baseSrc), now = parseTables(nowSrc);
const BG = base.tables.GROWTH_PAIRS.rows, BB = base.tables.BOUND_GROWTH_TARGETS.rows, BA = base.tables.AGENT_GROWTH_TARGETS.rows;

// ---------- the expected rows ----------
const EXP_G = {}; for (const id of Object.keys(BG).map(Number)) EXP_G[id] = MANIFEST.includes(id) ? TWIN[id] : BG[id];
const changedParents = MANIFEST.filter((id) => TWIN[id] !== BG[id]);
const boundOf = (arch, side) => { const l = Object.entries(BOUNDS).filter(([, b]) => b.archetype === arch && b.horizon === side); if (l.length !== 1) throw new Error(`bound of ${arch}/${side}: ${l.length}`); return +l[0][0]; };
const agentOf = (arch) => { const l = Object.entries(AGENTS).filter(([, a]) => a.archetype === arch); if (l.length !== 1) throw new Error(`agent of ${arch}: ${l.length}`); return +l[0][0]; };
const flip = (s) => (s === 'inner' ? 'outer' : 'inner');
const EXP_B = {}, EXP_A = {};
for (const [k, b] of Object.entries(BOUNDS)) {
  const id = +k;
  if (MANIFEST.includes(b.archetype)) EXP_B[id] = boundOf(TWIN[b.archetype], b.horizon); // R-49: twin parent, SAME side
  else EXP_B[id] = BB[id]; // Soul row: unchanged (a separate question)
}
for (const [k, a] of Object.entries(AGENTS)) EXP_A[+k] = agentOf(TWIN[a.archetype]); // twin parent's agent
const diffRows = (exp, baseRows) => Object.keys(exp).map(Number).filter((id) => exp[id] !== baseRows[id]);
const dG = diffRows(EXP_G, BG), dB = diffRows(EXP_B, BB), dA = diffRows(EXP_A, BA);

console.log('\n=== THE EXPECTED ROWS (the spec the edit must match; base', BASE.slice(0, 8) + ') ===');
console.log(`\nGROWTH_PAIRS — ${dG.length} rows change:`);
for (const id of dG) console.log(`  ${String(id).padStart(2)}: ${BG[id]} → ${EXP_G[id]}   ${ARCHETYPES[id].name} → ${ARCHETYPES[EXP_G[id]].name}  (was ${ARCHETYPES[BG[id]].name}; ${addr(id).stage}→${addr(EXP_G[id]).stage})`);
console.log(`\nBOUND_GROWTH_TARGETS — ${dB.length} rows change:`);
for (const id of dB) {
  const b = BOUNDS[id], o = BOUNDS[BB[id]], n = BOUNDS[EXP_B[id]];
  const kind = changedParents.includes(b.archetype) ? 'parent changes, side kept' : 'parent unchanged, side stops flipping';
  console.log(`  ${id}: ${BB[id]} → ${EXP_B[id]}   ${b.traditional} (${b.name}, ${b.horizon} of ${ARCHETYPES[b.archetype].name}) → ${n.traditional} (${n.name}, ${n.horizon} of ${ARCHETYPES[n.archetype].name})  [was ${o.traditional} (${o.name}, ${o.horizon} of ${ARCHETYPES[o.archetype].name}); ${kind}]`);
}
console.log(`\nAGENT_GROWTH_TARGETS — ${dA.length} rows change:`);
for (const id of dA) console.log(`  ${id}: ${BA[id]} → ${EXP_A[id]}   ${AGENTS[id].traditional} (${ARCHETYPES[AGENTS[id].archetype].name}) → ${AGENTS[EXP_A[id]].traditional} (${ARCHETYPES[AGENTS[EXP_A[id]].archetype].name})  [was ${AGENTS[BA[id]].traditional} (${ARCHETYPES[AGENTS[BA[id]].archetype].name})]`);
console.log(`\nexpected changes: ${dG.length} + ${dB.length} + ${dA.length} = ${dG.length + dB.length + dA.length}`);
const BRIEF_ARCH = [3, 5, 7, 9, 12, 14, 16, 18];
record('the expected change list matches the brief (8 archetype rows 3,5,7,9,12,14,16,18 + 32 manifest bound rows + 8 agent rows = 48)',
  JSON.stringify(dG) === JSON.stringify(BRIEF_ARCH) && JSON.stringify(changedParents) === JSON.stringify(BRIEF_ARCH) && dB.length === 32 && dB.every((id) => MANIFEST.includes(BOUNDS[id].archetype)) && dA.length === 8 && dA.every((id) => BRIEF_ARCH.includes(AGENTS[id].archetype)),
  `archetype rows [${dG}], bound rows ${dB.length}, agent rows ${dA.length}`);

// ---------- CHECK 1: the twin ----------
console.log('\n=== CHECK 1 — the twin, recomputed ===');
const g1 = MANIFEST.filter((id) => GROWTH_PAIRS[id] === TWIN[id]);
record(`1a. twin recomputed equals GROWTH_PAIRS on the manifest sixteen: ${g1.length}/16`, g1.length === 16,
  MANIFEST.filter((id) => GROWTH_PAIRS[id] !== TWIN[id]).map((id) => `${id}: table ${GROWTH_PAIRS[id]}, twin ${TWIN[id]}`).join('; '));
const pairs = []; for (const id of MANIFEST) { const t = GROWTH_PAIRS[id]; if (MANIFEST.includes(t) && id < t && GROWTH_PAIRS[t] === id) pairs.push([id, t]); }
const clash = (a, t) => [['vertical', VERTICAL_PAIRS], ['diagonal', DIAGONAL_PAIRS], ['reduction', REDUCTION_PAIRS]].filter(([, M]) => M[a] === t || M[t] === a).map(([n]) => n);
const clean = pairs.filter(([a, t]) => clash(a, t).length === 0);
record(`1b. no growth pair equals a vertical, diagonal or reduction pair: ${clean.length}/8 (live table has ${pairs.length} manifest growth pairs)`, pairs.length === 8 && clean.length === 8,
  pairs.filter(([a, t]) => clash(a, t).length).map(([a, t]) => `${a}↔${t} is also ${clash(a, t).join('+')}`).join('; '));
const keep = MANIFEST.filter((id) => addr(id).stage === addr(GROWTH_PAIRS[id])?.stage);
record(`1c. every growth pair keeps the stage: ${keep.length}/16`, keep.length === 16,
  MANIFEST.filter((id) => !keep.includes(id)).map((id) => `${id}(${addr(id).stage})→${GROWTH_PAIRS[id]}(${addr(GROWTH_PAIRS[id]).stage})`).join(' '));
const fixedA = Object.keys(GROWTH_PAIRS).map(Number).filter((id) => GROWTH_PAIRS[id] === id || GROWTH_PAIRS[id] == null);
const fixedBA = [...Object.keys(BOUNDS), ...Object.keys(AGENTS)].map(Number).filter((id) => { const c = getFullCorrection(id, 1); return !c || c.isSelf || getCorrectionTargetId(c, getComponent(id)) === id; });
record(`1d. growth has no fixed point (22 archetypes, 40 bounds, 16 agents)`, fixedA.length === 0 && fixedBA.length === 0, [...fixedA, ...fixedBA].join(','));

// ---------- CHECK 2: bounds and agents ----------
console.log('\n=== CHECK 2 — the bounds and agents, recomputed by R-49 ===');
const liveG = (id) => { const c = getFullCorrection(id, 1); return getCorrectionTargetId(c, getComponent(id)); };
const bm = Object.keys(BOUNDS).map(Number).filter((id) => MANIFEST.includes(BOUNDS[id].archetype));
const bs = Object.keys(BOUNDS).map(Number).filter((id) => SOUL.includes(BOUNDS[id].archetype));
const bmOk = bm.filter((id) => liveG(id) === EXP_B[id]);
// the Soul row: today's value, and the 2026-10-02 family rule it was made by (the family's growth partner, opposite side)
const bsOk = bs.filter((id) => liveG(id) === BB[id] && BB[id] === boundOf(GROWTH_PAIRS[BOUNDS[id].archetype], flip(BOUNDS[id].horizon)));
record(`2a. bound growth: ${bmOk.length}/32 manifest by R-49 + ${bsOk.length}/8 Soul-row equal to the base values = ${bmOk.length + bsOk.length}/40`, bmOk.length === 32 && bsOk.length === 8,
  [...bm.filter((id) => !bmOk.includes(id)).map((id) => `${id}: live ${liveG(id)}, R-49 ${EXP_B[id]}`), ...bs.filter((id) => !bsOk.includes(id)).map((id) => `${id} (Soul row): live ${liveG(id)}, base ${BB[id]}`)].join('; '));
const ag = Object.keys(AGENTS).map(Number);
const agChanged = ag.filter((id) => changedParents.includes(AGENTS[id].archetype));
const agOk = ag.filter((id) => liveG(id) === EXP_A[id] && (agChanged.includes(id) || EXP_A[id] === BA[id]));
record(`2b. agent growth: ${agOk.filter((id) => agChanged.includes(id)).length}/8 changed parents by the twin-agent rule + ${agOk.filter((id) => !agChanged.includes(id)).length}/8 unchanged = ${agOk.length}/16`, agOk.length === 16,
  ag.filter((id) => !agOk.includes(id)).map((id) => `${id}: live ${liveG(id)}, twin agent ${EXP_A[id]}`).join('; '));

// ---------- CHECK 3: Lumen's law ----------
console.log("\n=== CHECK 3 — Lumen's law: λ = side XOR the parent's half (Seed/Bridge 0, Fruition/Feedback 1), preserved by every medicine ===");
const lam = (bid) => (BOUNDS[bid].horizon === 'outer' ? 1 : 0) ^ HALF[ARCHETYPES[BOUNDS[bid].archetype].function];
const lumen = {};
for (const [M, status] of [['V', 3], ['D', 2], ['R', 4], ['G', 1]]) {
  const bad = [];
  for (const id of bm) {
    const c = getFullCorrection(id, status); const t = getCorrectionTargetId(c, getComponent(id));
    if (!BOUNDS[t] || !MANIFEST.includes(BOUNDS[t].archetype)) { bad.push(`${id}→${t} (off the manifest bounds)`); continue; }
    if (lam(t) !== lam(id)) bad.push(`${id}→${t} (λ ${lam(id)}→${lam(t)})`);
  }
  lumen[M] = { ok: 32 - bad.length, bad };
  record(`3${M}. Lumen's law on ${M}: ${32 - bad.length}/32`, bad.length === 0, bad.join(' '));
}
console.log(`Lumen's law total: ${Object.values(lumen).reduce((s, x) => s + x.ok, 0)}/128`);

// ---------- CHECK 4: the diff count ----------
console.log(`\n=== CHECK 4 — the diff of lib/corrections.js against ${BASE.slice(0, 8)} ===`);
const diff = execSync(`git diff -U0 ${BASE} -- lib/corrections.js`).toString().split(/\r?\n/);
const tableAt = (tables, lineNo) => Object.values(tables).find((t) => lineNo >= t.start && lineNo <= t.end);
let oldNo = 0, newNo = 0; const removed = [], added = [];
for (const l of diff) {
  const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (h) { oldNo = +h[1]; newNo = +h[2]; continue; }
  if (l.startsWith('---') || l.startsWith('+++')) continue;
  if (l.startsWith('-')) removed.push({ no: oldNo++, text: l.slice(1) });
  else if (l.startsWith('+')) added.push({ no: newNo++, text: l.slice(1) });
}
const ROW = /^\s*(\d+):\s*(\d+|null)\s*,?/;
const GROWTH_TABLES = ['GROWTH_PAIRS', 'BOUND_GROWTH_TARGETS', 'AGENT_GROWTH_TARGETS'];
const classify = (tables, x) => { const t = tableAt(tables, x.no); const r = x.text.match(ROW); if (t && r) return { kind: 'row', table: t.name, id: +r[1] }; if (/^\s*\/\//.test(x.text)) return { kind: 'comment' }; return { kind: 'other' }; };
const rc = removed.map((x) => ({ ...x, ...classify(base.tables, x) })), ac = added.map((x) => ({ ...x, ...classify(now.tables, x) }));
const rowsBy = (list) => { const o = {}; for (const x of list) if (x.kind === 'row') (o[x.table] ||= []).push(x.id); return o; };
const remRows = rowsBy(rc), addRows = rowsBy(ac);
const others = [...rc, ...ac].filter((x) => x.kind === 'other' || (x.kind === 'row' && !GROWTH_TABLES.includes(x.table)));
const expRows = { GROWTH_PAIRS: dG, BOUND_GROWTH_TARGETS: dB, AGENT_GROWTH_TARGETS: dA };
const sameSet = (a = [], b = []) => JSON.stringify([...a].sort((x, y) => x - y)) === JSON.stringify([...b].sort((x, y) => x - y));
for (const t of GROWTH_TABLES) console.log(`  ${t}: ${(addRows[t] || []).length} rows changed (expected ${expRows[t].length})`);
const totalRows = GROWTH_TABLES.reduce((s, t) => s + (addRows[t] || []).length, 0);
console.log(`  comment lines: ${rc.filter((x) => x.kind === 'comment').length} removed, ${ac.filter((x) => x.kind === 'comment').length} added`);
record(`4a. exactly the 48 expected table rows change: ${totalRows}/48`, GROWTH_TABLES.every((t) => sameSet(addRows[t], expRows[t]) && sameSet(remRows[t], expRows[t])),
  GROWTH_TABLES.filter((t) => !sameSet(addRows[t], expRows[t])).map((t) => `${t} changed [${addRows[t] || []}] vs expected [${expRows[t]}]`).join('; '));
record('4b. no other line changes (every other changed line is a comment)', others.length === 0, others.map((x) => `L${x.no}: ${x.text.trim().slice(0, 80)}`).join(' | '));
const VDR = ['DIAGONAL_PAIRS', 'VERTICAL_PAIRS', 'REDUCTION_PAIRS', 'AGENT_DIAGONAL_TARGETS', 'AGENT_VERTICAL_TARGETS', 'AGENT_REDUCTION_TARGETS'];
const vdrSame = VDR.filter((t) => base.tables[t] && now.tables[t] && base.tables[t].text.join('\n') === now.tables[t].text.join('\n'));
record(`4c. the V, D and R tables are byte-identical: ${vdrSame.length}/${VDR.length} (${VDR.join(', ')})`, vdrSame.length === VDR.length);
const growthComments = nowSrc.split(/\r?\n/).filter((l) => /side flipped/i.test(l) && /growth/i.test(l));
record('4d. no comment in lib/corrections.js says "side flipped" for growth', growthComments.length === 0, growthComments.map((l) => l.trim().slice(0, 100)).join(' | '));

// ---------- summary and calibration ----------
const failed = results.filter((r) => !r.pass);
console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} checks pass ===`);
if (failed.length) console.log('failing:', failed.map((r) => r.name.split(':')[0]).join(' · '));
// Calibration: what the unedited table should show (BRIEF_04): the live table differs from the expected rows on exactly 48 rows,
// and Lumen's law holds on V, D and R and fails on G only.
const liveDiff = [...MANIFEST, ...SOUL, ...PORTALS].filter((id) => GROWTH_PAIRS[id] !== EXP_G[id]).length
  + Object.keys(BOUNDS).map(Number).filter((id) => liveG(id) !== EXP_B[id]).length
  + ag.filter((id) => liveG(id) !== EXP_A[id]).length;
console.log(`\nCALIBRATION: the live tables differ from the expected rows on ${liveDiff} rows; Lumen's law V ${lumen.V.ok}/32 · D ${lumen.D.ok}/32 · R ${lumen.R.ok}/32 · G ${lumen.G.ok}/32.`);
if (liveDiff === 48) console.log("  This is the UNEDITED table as the brief predicts it: exactly 48 rows differ" + (lumen.V.ok === 32 && lumen.D.ok === 32 && lumen.R.ok === 32 && lumen.G.ok < 32 ? ", and Lumen's law fails on G only." : ", BUT Lumen's law does not fail on G only — report this."));
else if (liveDiff === 0) console.log('  The live tables equal the expected rows.');
else console.log('  NEITHER the unedited nor the edited table — report this.');
process.exit(failed.length ? 1 : 0);
