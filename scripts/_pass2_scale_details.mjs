// which phrases tripped the lint's `scale` flag on Plain openings, per arm (the full bench's stored texts; no model call)
import fs from 'node:fs';
const m = await import('../lib/bakeoff/lint.js');
const j = JSON.parse(fs.readFileSync('data/bakeoff/restructure_full1.json', 'utf8'));
for (const arm of ['handing', 'merge', 'constitution', 'constitution-short']) {
  const rs = j.rows.filter((r) => r.arm === arm && r.voice === 'plain' && r.turn === 1 && (r.flags || []).includes('scale'));
  const hits = [];
  for (const r of rs) { const f = (m.lintOutput({ text: '', parsed: { reader: r.text, gist: r.gist, medicine: r.medicine, question: r.question }, preset: { kind: 'opening' }, hostile: false, draw: null, draws: undefined, question: '', voice: 'plain' }).flags || []).find((x) => x.code === 'scale'); if (f) hits.push(f.detail.replace(/"/g, '')); }
  const counts = {}; for (const h of hits) counts[h] = (counts[h] || 0) + 1;
  console.log(`${arm}: ${hits.length} of ${j.rows.filter((r) => r.arm === arm && r.voice === 'plain' && r.turn === 1).length} openings — ` + Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ×${v}`).join(' · '));
}
