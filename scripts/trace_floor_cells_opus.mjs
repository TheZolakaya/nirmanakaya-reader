// SOURCE-TRACE WITH THE CELL AS A SIXTH SOURCE (Opus bench instance, 2026-10-05, on True's commission; no model calls).
// For every phrase the three counters flag on lane A of a floor bench file (abstraction words, the UA coinage family, the taught figures,
// the record's verbatim phrases), find which sources carry its wording: USER (question + context) · RECORD (the draw block handed to the
// Reader) · ACTS (the partner's medicine acts) · HANDING (base + rules) · VOICE (Plain's rules) · CELL (the poured cell's four parts) ·
// SCAFFOLD (the rest of the floor block: header, the tense line, the acts line, the seat line). A hit "traces to the cell" when its wording
// is in the CELL and in none of USER/RECORD/ACTS/HANDING/VOICE/SCAFFOLD.
// Second measure: every three-word run in lane A that appears in the CELL and in no other source (the cell's own wording on the glass).
// Run on the floor-OFF file too: that render never saw the cell, so its count is the chance/shared-meaning baseline.
//   npx tsx scripts/trace_floor_cells_opus.mjs BENCH_Opus_Floor_ON_Corpus_B_2026-10-05.md [more files]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { fmtDrawForEz } = await import('../lib/ezOpening.js');
const { spreadKeyFor } = await import('../lib/ezOpening.js').catch(() => ({}));
const { HANDING_BASE, HANDING_RULES } = await import('../lib/handingPrompt.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { buildKernel } = await import('../lib/kernel.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const CELLS = JSON.parse(fs.readFileSync('scripts/floor_cells_corpus_b_opus.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws').like('request_id', 'readability-2026-10-05-B-%');
const byId = Object.fromEntries(rows.map((r) => [r.request_id, r]));

// the counters' patterns, verbatim from count_abstractions / count_ua_family / count_record_verbatim
const WORDS = /\b(authorship|credit|capacity|capacities|faculty|faculties|landing|lands|fairness|fair call|proportion|region of (?:the|your)self|no name on it|weigh(?:ed|ing)?|the (?:exchange|share))\b/gi;
const UA = /\b(the read\b|a read\b|that read\b|unowned|unattributed|signing your name|sign(?:ed)? (?:your name|it)|holding (?:it|that|this) as (?:yours|your own)|hold(?:ing)? it as yours|counting (?:it|that|this) as yours|not counting|author(?:ship)?|credit)\b/gi;
const FIG = /\b(door (?:that'?s |that is )?already behind|already behind you|anchor(?:ed)? in the past|brac(?:e|ing) (?:against|at|for)|write-access|empty seat|the pen\b|a current\b)\b/gi;
const PH = ['contains rather than crushes', 'without argument', 'surrender as fulfillment', 'structures fall', 'continues to deepen', 'patterns that liberate', 'connection without fusion', 'solitude connects', 'refinement serves', 'which star', 'harvested momentum', 'holding space', 'beginner', 'every moment fresh', 'obsessive calculation', 'flowing exchange', 'genuine engagement', 'cultivated', 'radiance', 'fulfillment, not defeat', 'without clutching', 'seed state', 'balanced face', 'province', 'stage'];

const root = (w) => w.toLowerCase().replace(/(ness|ings|ing|ed|es|s)$/, '').replace(/(ies|y)$/, '').replace(/[^a-z' -]/g, '');
const termRx = (t) => new RegExp('\\b' + t.toLowerCase().split(/\s+/).map((w, i, a) => (i === a.length - 1 ? root(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*' : w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('\\s+'), 'i');
const toks = (s) => String(s).toLowerCase().replace(/[’']/g, "'").split(/[^a-z']+/).filter(Boolean);
const trigrams = (s) => { const t = toks(s); const o = new Set(); for (let i = 0; i + 2 < t.length; i++) o.add(t.slice(i, i + 3).join(' ')); return o; };
const STOPTRI = (g) => g.split(' ').every((w) => /^(the|a|an|and|or|of|to|in|on|at|it|is|you|your|that|this|what|for|with|as|be|are|not|one|so|do|but|if|they|them|their|i|me|my|was|have|has|from|by|just|when|then|there|its|it's|you're|don't)$/.test(w));
const sentenceOf = (text, idx) => { const s = text.lastIndexOf('.', idx) + 1; const e = text.indexOf('.', idx); return text.slice(s, e < 0 ? undefined : e + 1).replace(/\s+/g, ' ').trim(); };

const report = [];
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync('G:/My Drive/For Air Review/' + f, 'utf8');
  const runs = s.split(/^## (?=readability)/m).slice(1);
  const T = { hits: 0, cellOnly: 0, cellAndOther: 0, notCell: 0, scaffoldOnly: 0, nowhere: 0 }; const lines = []; let triCell = 0; const triList = [];
  for (const r of runs) {
    const id = r.split('\n')[0].trim(); const row = byId[id]; const a = r.split(/^### A\n/m)[1]?.split(/^### B/m)[0] || '';
    const floor = CELLS[id]?.floorText || '';
    const rawCell = (floor.split(/^the cell \(its four parts.*$/m)[1] || '').split(/^frame:/m)[0];
    const cellPart = rawCell.replace(/^- (tense|the card, as what it does|the seat, as where|the ask, from the partner): /gm, '');
    const scaffold = rawCell ? floor.replace(rawCell, '') : floor;
    const k = buildKernel(row.draws[0], DEFS); const acts = MEDICINE_ACTS[k?.partnerId]; const actsText = acts ? acts.acts.join('. ') : '';
    const drawText = fmtDrawForEz(row.draws, 'discover', spreadKeyFor ? spreadKeyFor(row.draws.length) : null, false, null, null, null, true, row.question, row.context || '');
    const SRC = { USER: `${row.question} ${row.context || ''}`, RECORD: drawText, ACTS: actsText, HANDING: HANDING_BASE + '\n' + HANDING_RULES, VOICE: VOICES.plain.rules, SCAFFOLD: scaffold, CELL: cellPart };
    const found = [];
    for (const rx of [WORDS, UA, FIG]) for (const m of a.matchAll(rx)) found.push({ term: m[0], idx: m.index });
    for (const p of PH) { let i = a.toLowerCase().indexOf(p); while (i >= 0) { found.push({ term: p, idx: i }); i = a.toLowerCase().indexOf(p, i + 1); } }
    const seen = new Set();
    for (const h of found) {
      const k2 = h.term.toLowerCase() + '@' + h.idx; if (seen.has(k2)) continue; seen.add(k2);
      const rx = termRx(h.term); const where = Object.entries(SRC).filter(([, t]) => rx.test(t)).map(([n]) => n);
      T.hits++;
      const others = where.filter((n) => n !== 'CELL');
      if (where.includes('CELL') && !others.length) T.cellOnly++; else if (where.includes('CELL')) T.cellAndOther++; else T.notCell++;
      if (!where.length) T.nowhere++; if (others.length === 1 && others[0] === 'SCAFFOLD' && !where.includes('CELL')) T.scaffoldOnly++;
      lines.push(`- ${id.replace('readability-2026-10-05-', '')} "${h.term}" → ${where.join(', ') || 'none (renderer)'}${where.includes('CELL') && !others.length ? '  ← CELL ONLY' : ''}\n    > ${sentenceOf(a, h.idx).slice(0, 240)}`);
    }
    // the cell's own wording on the glass: trigrams in lane A that are in the cell and in no other source
    const cellTri = trigrams(cellPart); const otherTri = new Set(); for (const [n, t] of Object.entries(SRC)) if (n !== 'CELL') for (const g of trigrams(t)) otherTri.add(g);
    const mine = [...trigrams(a)].filter((g) => cellTri.has(g) && !otherTri.has(g) && !STOPTRI(g));
    triCell += mine.length; if (mine.length) triList.push(`- ${id.replace('readability-2026-10-05-', '')}: ${mine.map((g) => `"${g}"`).join(' · ')}`);
  }
  report.push(`## ${f}`, `Flagged hits ${T.hits}: CELL ONLY ${T.cellOnly} · in the cell AND another source ${T.cellAndOther} · not in the cell ${T.notCell} (of which floor scaffold only ${T.scaffoldOnly}; in no source = renderer ${T.nowhere}).`, `Cell-only three-word runs on the glass: ${triCell}`, ...triList, '', '### Every flagged hit', ...lines, '');
}
process.stdout.write(report.join('\n') + '\n');
