// per-field word counts for lane A of a bench file: gist / prose / medicine / closing, plus prose sentences and the image count
import fs from 'node:fs';
const FIG = /\b(sand|bracing|anchor|current|door|tide|weather|thread|lens|mirror|wall|bridge|path|road|map|compass|engine|fire|water|wind|ground|foundation|wave|storm|seed|root|branch|knot|hands|shoulders|chest|throat|gut)\b/gi;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync('G:/My Drive/For Air Review/' + f, 'utf8');
  const runs = s.split(/^## (?=readability)/m).slice(1);
  const rows = [];
  for (const r of runs) {
    const key = r.split('\n')[0].trim(); const a = r.split(/^### A\n/m)[1]?.split(/^### B/m)[0] || '';
    const gist = (a.match(/^\*(.+?)\*$/m) || ['', ''])[1]; const med = (a.match(/^> ◈ ?(.+)$/m) || ['', ''])[1];
    const prose = a.replace(/^\*.+?\*$/gm, '').replace(/^> ◈.*$/gm, '').trim();
    const w = (t) => t.trim() ? t.trim().split(/\s+/).length : 0;
    const sents = prose.split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length;
    rows.push({ key: key.replace('readability-2026-10-05-', ''), gist: w(gist), prose: w(prose), med: w(med), sents, figWords: (prose.match(FIG) || []).length });
  }
  const avg = (k) => (rows.reduce((t, r) => t + r[k], 0) / rows.length).toFixed(0);
  console.log(`\n${f}\n  avg gist ${avg('gist')} · prose ${avg('prose')} · medicine ${avg('med')} · prose sentences ${avg('sents')} · figure-words in prose ${avg('figWords')}`);
  for (const r of rows) console.log(`  ${r.key}: gist ${r.gist} prose ${r.prose} med ${r.med} sents ${r.sents} fig ${r.figWords}`);
}
