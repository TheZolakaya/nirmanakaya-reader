// THE LIBRARY MEASURE (2026-10-03): the whole stored library under one prompt version, measured the way the samples were —
// the spoken family, "one" and clocks in the asks, the 3-gram chorus, the paragraph-two hinges, the ask openers, the seat swaps —
// plus a BLIND PACKET: twelve cells, old beside new, shuffled and unlabeled, for the founder's eye.
//   npx tsx scripts/pour_measure_library.mjs [prompt-version-suffix, default o] [--packet]
import fs from 'node:fs';
import { lintWave } from '../lib/pour/lint.js';
const suffix = process.argv.find((a) => /^[a-z]$/.test(a)) || 'o';
const PROMPT = `pour-author-2026-10-03-${suffix}`;
const dir = 'data/pour/cells_l_or-v4.1-flash';
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ f, j: JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')) })).filter((x) => x.j.prompt === PROMPT).map((x) => x.j);
const cells = rows.flatMap((r) => r.cells);
const SPOKEN = /\bout loud\b|\btell (?:one|a|someone)\b[^.]{0,30}\b(?:person|friend|someone)\b|\bone (?:other |trusted )?person you trust\b|\bwitness/i;
const pct = (n, d) => `${Math.round(100 * n / Math.max(1, d))}%`;
const un = rows.filter((r) => r.hardOpen > 0).length; const openCells = cells.filter((c) => (c.lint || []).some((f) => f.hard)).length;
const spoken = cells.filter((c) => SPOKEN.test([c.ask, c.core, c.sheetLine].join(' '))).length;
const ones = cells.filter((c) => /\bone\b/i.test(c.ask || '')).length; const clocks = cells.filter((c) => /\b(week|month|today|tonight|day|hour|minute|year)\b/i.test(c.ask || '')).length;
const speechOpen = cells.filter((c) => /^(?:say|tell|speak|admit|announce|declare|confess)\b/i.test(String(c.ask || '').trim())).length;
console.log(`=== THE LIBRARY UNDER ${PROMPT} ===`);
console.log(`calls ${rows.length} · cells ${cells.length} · calls with an open hard flag ${un} (${pct(un, rows.length)}) · cells with one ${openCells} (${pct(openCells, cells.length)})`);
console.log(`spoken family ${spoken} cells (${pct(spoken, cells.length)}; set l had 40%) · asks opening on a speech verb ${speechOpen} (${pct(speechOpen, cells.length)})`);
console.log(`"one" in the ask ${pct(ones, cells.length)} (set l: 91%) · a clock in the ask ${pct(clocks, cells.length)} (set l: ~45%)`);
const w = lintWave(rows);
console.log(`3-gram chorus over 1 in 20 (${w.trigramLimit} cells): ${w.trigrams.length ? w.trigrams.slice(0, 12).map((x) => `${x.gram} ${x.cells}`).join(' · ') : 'none'}`);
console.log(`4-gram refrains over 1 in 8: ${w.refrains.length ? w.refrains.slice(0, 8).map((x) => `${x.gram} ${x.cells}`).join(' · ') : 'none'}`);
console.log(`paragraph-two hinges by status over 1 in 40: ${w.hinges.length ? w.hinges.map((x) => `${x.key} ${x.cells}`).join(' · ') : 'none'}`);
console.log(`ask opening verbs: ${w.askOpeners.map((x) => `${x.word} ${x.share}%`).join('  ')}`);
console.log(`seat-swap pairs (asks ≥45% alike across seats): ${w.seatSwaps.length}`);
if (process.argv.includes('--packet')) {
  // old = the set-l cell for the same signature/seat/status, from data/pour/replaced (the last replaced copy) or the snapshot
  const snap = (sig) => { try { return JSON.parse(fs.readFileSync(`data/pour/snapshot/${String(sig).padStart(2, '0')}.json`, 'utf8')); } catch { return null; } };
  const pick = []; const seen = new Set(); let guard = 0;
  while (pick.length < 12 && guard++ < 5000) { const r = rows[Math.floor(Math.random() * rows.length)]; const st = 1 + Math.floor(Math.random() * 4); const c = r.cells.find((x) => x.status === st); if (!c || (c.lint || []).some((f) => f.hard)) continue; const key = `${r.signature_id}/${r.position_id}/${st}`; if (seen.has(key)) continue;
    const old = snap(r.signature_id)?.seats?.[r.position_id]?.[st]; if (!old?.core) continue; seen.add(key); pick.push({ r, c, old, st }); }
  const lines = ['# BLIND PACKET — twelve cells, two versions each, A/B shuffled (True, ' + new Date().toISOString().slice(0, 10) + ')', '', 'For each pair: which version would you rather be handed, and in one line why. The key is in the companion file.', ''];
  const key = [];
  pick.forEach(({ r, c, old, st }, i) => { const flip = Math.random() < 0.5; const [A, B] = flip ? [old, c] : [c, old]; key.push(`${i + 1}. ${r.signature} in ${r.seat} · status ${st} — A = ${flip ? 'OLD (set l)' : 'NEW (prompt ' + suffix + ')'}, B = ${flip ? 'NEW' : 'OLD'}`);
    lines.push(`## ${i + 1}. ${r.signature} in ${r.seat} · ${['', 'Balanced', 'Too Much', 'Too Little', 'Unacknowledged'][st]}`, '', `**A**`, '', A.core, '', `*${A.sheetLine}*`, '', `> ${A.ask}`, '', `**B**`, '', B.core, '', `*${B.sheetLine}*`, '', `> ${B.ask}`, ''); });
  const out = `G:/My Drive/For Air Review/BLIND_PACKET_Pour_Library_${suffix}_vs_l_${new Date().toISOString().slice(0, 10)}.md`;
  fs.writeFileSync(out, lines.join('\n')); fs.writeFileSync(out.replace('.md', '_KEY.md'), key.join('\n') + '\n');
  console.log('blind packet written:', out, '(+ _KEY)');
}
