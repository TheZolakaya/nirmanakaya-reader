// PASS THREE, GATE 0 — freeze the evidence (Air's second look, 2026-10-12). From the code as it stands, export: every assembled system prompt
// (4 arms × 3 voices), the exact opening payload for the six diagnostic cases under each arm (what the model is handed), the structural and
// "how this can look" record lines beside their canonical lines, the invariants draft beside the definitions, the judge rubric with its hash,
// and a note on the result-page/report discrepancy. No model call. Output: a folder on the shelf.
import fs from 'node:fs';
import crypto from 'node:crypto';
const OUT = process.argv[2] || 'G:/My Drive/For Air Review/BUNDLE_Pass_Two_Frozen_Evidence_2026-10-12';
fs.mkdirSync(OUT, { recursive: true });
const ps = await import('../lib/promptSets.js');
const o = await import('../lib/ezOpening.js');
const rec = await import('../lib/record.js');
const { seedParts } = await import('../lib/ezSeed.js');
const { RUBRIC } = await import('../lib/bakeoff/readerJudge.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const PLAIN = JSON.parse(fs.readFileSync('lib/data/plain_propositions.json', 'utf8'));
const INV = JSON.parse(fs.readFileSync('lib/data/invariants_78.json', 'utf8'));
const cases = JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')).cases;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const manifest = { frozen: new Date().toISOString(), commit: (() => { try { return require('node:child_process').execSync('git rev-parse HEAD').toString().trim(); } catch { return 'see git log'; } })(), files: {} };
const put = (name, text) => { fs.writeFileSync(`${OUT}/${name}`, text); manifest.files[name] = { sha256: sha(text), words: text.split(/\s+/).filter(Boolean).length }; };
// 1. assembled system prompts
for (const name of ps.PROMPT_SET_NAMES) for (const v of ['plain', 'friend', 'deep']) put(`SYSTEM_${name}_${v}.md`, `# ${name} · ${v} · assembled system prompt as the model receives it\n\n${ps.systemFor(ps.promptSetFor(name), v)}`);
// 2. the six diagnostic cases' opening payloads under each arm (plain), no dossier (the route appends it; Plain sets drop it)
const SIX = ['pool-1-alignment', 'pool-2-culture', 'pool-5-celebration', 'scale-50-life', 'pool-4-abstraction', 'adv-overwhelmed'];
for (const id of SIX) { const c = cases.find((x) => x.id === id); for (const name of ps.PROMPT_SET_NAMES) { const set = ps.promptSetFor(name); const draws = [c.draw]; const drawText = o.fmtDrawForEz(draws, 'discover', o.spreadKeyFor(1), false, null, null, null, true, c.question, c.context || '', ps.recordOpts(set)); let tele = ''; try { const seed = seedParts({ question: c.question, draws, index: 0 }); const addr = o.addressLines(draws[0]); tele = [ps.wantsTele(set, 'plain') ? seed.block : '', addr].filter(Boolean).join('\n\n'); } catch {} const msg = o.buildOpeningMessage({ question: c.question, context: c.context || '', drawText, tele, ...ps.openingOpts(set) }); put(`OPENING_${id}_${name}_plain.md`, `# ${id} · ${name} · plain · the opening's user turn as the model receives it (the route's dossier excluded)\n\n${msg}`); } }
// 3. the record lines beside their canonical lines
const lines = ['# The structural and "how this can look" lines beside their sources (lib/data/plain_propositions.json)', '', '## The four status lines', ''];
for (const s of [1, 2, 3, 4]) lines.push(`### status ${s}`, `- canonical: ${PLAIN.general[s].canonical || ''}`, `- plain (.695, second person): ${PLAIN.general[s].plain}`, `- structural (Pass Two): ${PLAIN.general[s].structural}`, '');
lines.push('## The sixty-six archetype states', '');
for (let id = 0; id < 22; id++) for (const k of ['tooMuch', 'tooLittle', 'unacknowledged']) { const st = PLAIN.states[id]?.[k]; if (!st) continue; lines.push(`### ${id} ${DEFS.signatures[id].name} · ${k}`, `- canonical: ${st.canonical || DEFS.signatures[id].states?.[k] || ''}`, `- plain (.695): ${st.plain}`, `- look (Pass Two): ${st.look}`, ''); }
put('RECORD_Structural_And_Look_Lines_Beside_Canonical.md', lines.join('\n'));
// 4. the invariants draft beside the definitions
const inv = ['# The invariants draft (lib/data/invariants_78.json) beside the definitions — DRAFT, not handed to the model', '', '| id | name | requires (description, first sentence) | fixed | source description |', '|---|---|---|---|---|'];
for (let id = 0; id < 78; id++) { const v = INV[String(id)]; const d = DEFS.signatures[id]; inv.push(`| ${id} | ${d.name} | ${v.requires} | ${Object.entries(v.fixed || {}).map(([k, x]) => `${k}: ${x}`).join(', ') || '—'} | ${String(d.description || '').replace(/\|/g, '/')} |`); }
put('INVARIANTS_78_Draft_Beside_Definitions.md', inv.join('\n'));
// 5. the judge rubric
put('JUDGE_Rubric_Reader_Judge.md', `# The Reader judge's rubric (lib/bakeoff/readerJudge.js) · sha1 ${crypto.createHash('sha1').update(RUBRIC).digest('hex').slice(0, 8)}\n\n${RUBRIC}`);
// 6. the discrepancy note and the case file
put('NOTE_Result_Page_vs_Full_Report.md', `# Why the result page and the full report differ\n\nThe full bench (label full1) scored every reply with Haiku 5.5 under rubric v3 during the run. Afterwards the 500 poolside rows were re-scored with Haiku under the final rubric (v4: the seat clarification) and Sonnet 5.5 was added as the second opinion on those rows (scripts/rejudge_restructure.mjs). The full report on the shelf was regenerated after that re-scoring; the result page's tables were written from the run's original scores and not regenerated. So the two differ on every cell that contains poolside rows (e.g. Handing Plain opening inner-state 0.09 vs 0.08; short Plain 0.24 vs 0.20). The frozen numbers for any further comparison are the re-scored ones in data/bakeoff/restructure_full1.json (rubricVersion set on re-scored rows). Non-poolside rows were scored once, under rubric v3.\n\nVersion qualification (Air §3.1): the shelf export PROMPT_Candidate_B_The_Constitution_Plain_2026-10-11.md was taken BEFORE the Plain guess marks and the status-sentence shape were added; the full bench ran AFTER them (the working tree at that time equals local commit 10401f8e). The two teaching examples Air found ("you are the one doing this and you are telling yourself it was done to you" in the word law; "not treating it as your own choice" in LITERAL FIRST) were present in every arm of the full bench, including both constitution variants, because those blocks were kept verbatim from the Handing. SYSTEM_*.md in this bundle are the bytes as of the freeze (after the Sonnet-judge fix, which touched no prompt).`);
put('CASES_restructure_cases.json', JSON.stringify(JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')), null, 1));
fs.writeFileSync(`${OUT}/MANIFEST.json`, JSON.stringify(manifest, null, 1));
console.log(`frozen ${Object.keys(manifest.files).length} files to ${OUT}`);
