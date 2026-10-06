// .718 the repair on real copies from the failure corpus: a positive (a real copied sentence) is rewritten and checks clean; a negative
// (a fault list with anything besides 'operation') is refused.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { repairOperation } = await import('../lib/operationRepair.js'); const { operationFlags } = await import('../lib/bakeoff/lint.js');
const R = JSON.parse(fs.readFileSync('data/bakeoff/opcopy_base.json', 'utf8')).filter((r) => r.opHits.length).slice(0, 4);
for (const r of R) {
  const obj = { gist: r.gist, reader: r.reader, medicine: r.medicineBox, question: '' };
  const faults = operationFlags([obj.gist, obj.reader, obj.medicine].join(' '), [r.draw]);
  const rep = await repairOperation(obj, faults);
  const after = rep ? operationFlags([rep.obj.gist, rep.obj.reader, rep.obj.medicine].join(' '), [r.draw]) : faults;
  console.log(`\n${r.persona} ${r.label}: ${faults.length} fault → ${rep ? rep.repaired.length + ' sentence(s) rewritten' : 'no repair'} → after: ${after.length ? 'STILL ' + after.length : 'clean'}`);
  for (const x of rep?.repaired || []) console.log(`  FROM: ${x.from}\n  TO:   ${x.to}`);
}
const neg = await repairOperation({ reader: 'x' }, [{ code: 'operation', detail: '"a b c d e…" is the record\'s own operation line for Support, quoted' }, { code: 'weather', detail: 'x' }]);
console.log('\nnegative (operation + weather) refused:', neg === null);
