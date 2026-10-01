// THE TWO PACKETS for an outside reader (founder, 2026-10-01: "a fresh set of eyes"):
//   the STRANGER's — N cells from a set, person-facing text only (sheet line + core), numbered, no key, no map, no prompt
//   the ENGINEER's — the author's package as it is sent (seat + rules + a record), the lint list, the judges' files, the same cells with the key
//   npx tsx scripts/pour_packets.mjs [set=d] [author=or-v4.1-flash] [n=24]
import fs from 'node:fs';
import path from 'node:path';
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { authoringPackage } from '../lib/pour/assemble.js';
import { STATUS_NAMES, PROMPT_VERSION } from '../lib/pour/schema.js';
import { writeToShelf } from '../lib/bakeoff/store.js';

const [SET = 'd', AUTHOR = 'or-v4.1-flash', N = '24'] = process.argv.slice(2);
const dir = `data/pour/cells_${SET}_${AUTHOR}`;
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((r) => !(r.hardOpen > 0));
function rng(seed) { let x = seed >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const r = rng(20261001);
const per = Math.ceil(Number(N) / 4); const picked = []; const usedCalls = new Set();
for (const status of [1, 2, 3, 4]) {
  const pool = rows.filter((x) => !usedCalls.has(x.signature_id + '-' + x.position_id)).sort(() => r() - 0.5);
  const byHouse = {}; for (const x of pool) (byHouse[x.house] ||= []).push(x);
  let n = 0; const houses = Object.keys(byHouse);
  while (n < per && houses.some((h) => byHouse[h].length)) { for (const h of houses) { const x = byHouse[h].shift(); if (!x || n >= per) continue; const c = x.cells.find((c) => c.status === status); if (!c) continue; picked.push({ row: x, cell: c }); usedCalls.add(x.signature_id + '-' + x.position_id); n++; } }
}
picked.sort(() => r() - 0.5);
const date = new Date().toISOString().slice(0, 10);
const clean = (t) => String(t || '').replace(/\\n/g, '\n');

// the stranger's packet
const stranger = [`# Twenty-four short readings — ${date}`, '', 'Each one was written to be read by one person about one part of their life. Read each as if it were written to you.', ''];
picked.forEach(({ cell }, i) => stranger.push(`## ${i + 1}`, '', `*${cell.sheetLine}*`, '', clean(cell.core), ''));
const sName = `PACKET_Stranger_Set_${SET.toUpperCase()}_Twenty_Four_Readings_No_Key_${date}.md`;
writeToShelf(sName, stranger.join('\n'));

// the key (stays with the founder; goes into the engineer's packet only)
const key = picked.map(({ row, cell }, i) => `${i + 1}. ${row.signature} in ${row.seat} · ${STATUS_NAMES[cell.status]} · medicine ${String(cell.provenance?.mechanism || '').toUpperCase()} → ${cell.provenance?.partner || '?'} · ${row.attempts.length} attempt(s)`);

// the engineer's packet
const pkg = authoringPackage(53, 1, DEFS, { exemplars: fs.readFileSync('data/pour/exemplars_worked_cells.md', 'utf8'), author: AUTHOR });
const lintSrc = fs.readFileSync('lib/pour/lint.js', 'utf8');
const lintLines = lintSrc.split('\n').filter((l) => /^(const [A-Z_]+ = \/|\/\/ )/.test(l.trim()) || /(hard|soft)\('/.test(l)).map((l) => l.trim()).join('\n');
const picks = fs.readdirSync('G:\\My Drive\\For Air Review').filter((f) => /^PICKS_.*Pour_Wave_One/.test(f)).sort();
const engineer = [`# The engineer's packet — the Pour, set ${SET.toUpperCase()} — ${date}`, '',
  `Author model: ${AUTHOR} (DeepSeek v4.1-flash via OpenRouter). Prompt version: ${PROMPT_VERSION}. Up to five attempts per call; a machine checks every cell and re-rolls with the flags named.`, '',
  '## 1. The same twenty-four readings, with the key', '', ...key, '',
  '## 2. The author\'s package as sent (system block), for one example call: Stewardship in Will', '', '```', pkg.system, '```', '',
  '## 3. The user message for that call (the four records)', '', '```', pkg.message.slice(0, 6000) + (pkg.message.length > 6000 ? '\n… (truncated; the remaining status records have the same shape)' : ''), '```', '',
  '## 4. The machine checks (from lib/pour/lint.js — the regexes and every hard/soft flag)', '', '```', lintLines, '```', '',
  '## 5. The judges\' files on the shelf (G:\\My Drive\\For Air Review)', '', ...picks.map((p) => `- ${p}`), '',
  '## 6. What the rules have already been caught causing', '', '- Rule 15 ("the situation before the fault") produced an opening hinge, "When this is going well…", in ~150 of 388 cells of set C.', '- The example sentence in rule 6 ("you\'re still standing where you stopped") was copied into 51 cells of set C.', '- The exemplars\' sentences were copied near-verbatim in set A ("what comes back is" in 174 cells), so now any five words in a row from an exemplar or a rule is refused.', '- The author\'s own instruction words ("capacity", "this part of a life", "the seat") reached 45, 31 and 12 cells of set C before they were barred.', ''];
const eName = `PACKET_Engineer_The_Pour_Set_${SET.toUpperCase()}_Prompt_Lints_Key_${date}.md`;
writeToShelf(eName, engineer.join('\n'));
console.log(`stranger: G:\\My Drive\\For Air Review\\${sName} (${picked.length} cells)\nengineer: G:\\My Drive\\For Air Review\\${eName}`);
