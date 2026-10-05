// the direct measure for Air's abstraction bolt: how often the house's category words reach the glass (lane A of a bench file), per reading
import fs from 'node:fs';
const WORDS = /\b(authorship|credit|capacity|capacities|faculty|faculties|landing|lands|fairness|fair call|proportion|region of (?:the|your)self|no name on it|weigh(?:ed|ing)?|the (?:exchange|share))\b/gi;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync('G:/My Drive/For Air Review/' + f, 'utf8'); const runs = s.split(/^## (?=readability)/m).slice(1); let total = 0; const tally = {}; const rows = [];
  for (const r of runs) { const key = r.split('\n')[0].trim().replace('readability-2026-10-05-', ''); const a = r.split(/^### A\n/m)[1]?.split(/^### B/m)[0] || ''; const hits = (a.match(WORDS) || []).map((x) => x.toLowerCase()); total += hits.length; for (const h of hits) tally[h] = (tally[h] || 0) + 1; rows.push(`${key}: ${hits.length}${hits.length ? ' (' + [...new Set(hits)].join(', ') + ')' : ''}`); }
  console.log(`\n${f}\n  total ${total} across ${runs.length}; ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · ')}`); for (const x of rows) console.log('  ' + x);
}
