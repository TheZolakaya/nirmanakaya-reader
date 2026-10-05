// the renderer's coinage family around Unacknowledged (the trace: 4 of 7 renderer inventions) + the taught figures, counted on lane A of bench files
import fs from 'node:fs';
const UA = /\b(the read\b|a read\b|that read\b|unowned|unattributed|signing your name|sign(?:ed)? (?:your name|it)|holding (?:it|that|this) as (?:yours|your own)|hold(?:ing)? it as yours|counting (?:it|that|this) as yours|not counting|author(?:ship)?|credit)\b/gi;
const FIG = /\b(door (?:that'?s |that is )?already behind|already behind you|anchor(?:ed)? in the past|brac(?:e|ing) (?:against|at|for)|write-access|empty seat|the pen\b|a current\b)\b/gi;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync('G:/My Drive/For Air Review/' + f, 'utf8'); const runs = s.split(/^## (?=readability)/m).slice(1); let ua = 0, fig = 0; const rows = [];
  for (const r of runs) { const k = r.split('\n')[0].trim().replace('readability-2026-10-05-', ''); const a = r.split(/^### A\n/m)[1]?.split(/^### B/m)[0] || ''; const u = (a.match(UA) || []).map((x) => x.toLowerCase()); const g = (a.match(FIG) || []).map((x) => x.toLowerCase()); ua += u.length; fig += g.length; rows.push(`${k}: UA-family ${u.length}${u.length ? ' (' + [...new Set(u)].join(', ') + ')' : ''} · taught figures ${g.length}${g.length ? ' (' + [...new Set(g)].join(', ') + ')' : ''}`); }
  console.log(`\n${f}\n  UA-coinage family total ${ua} · taught figures total ${fig}`); for (const x of rows) console.log('  ' + x);
}
