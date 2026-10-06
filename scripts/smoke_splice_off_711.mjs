// .711: with the splice off, a record line's "something" stays "something" (no field noun asserted into it); SPLICE=1 restores it
import fs from 'node:fs';
const { drawRecord } = await import('../lib/record.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
let some = 0, sample = '';
for (let t = 0; t < 78; t++) for (const st of [1, 2, 3, 4]) { const b = drawRecord({ transient: t, position: 4, status: st }, DEFS, 'What should I do about the plan for my work?'); const n = (b.match(/\bsomething\b/gi) || []).length; some += n; if (n && !sample) sample = (b.split('\n').find((l) => /\bsomething\b/i.test(l)) || '').slice(0, 200); }
console.log(`SPLICE=${process.env.SPLICE || 'off'}: "something" left in record lines across 312 draw blocks: ${some}`); if (sample) console.log('  e.g.', sample);
