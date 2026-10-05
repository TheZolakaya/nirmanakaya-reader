// .701: the floor block for one draw — no taught figure, no licence to quote the map
import fs from 'node:fs';
const { readPlan, planBlock } = await import('../lib/pour/assemble.js'); const { lookupCell } = await import('../lib/pour/library.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
for (const d of [{ transient: 28, position: 9, status: 3 }, { transient: 65, position: 4, status: 2 }]) { const b = planBlock(readPlan(d, DEFS, lookupCell, { question: 'Why do I keep second guessing myself?' })); const bad = b.match(/door that'?s already behind|bracing at a future|with the pen|quoting the map/gi); console.log(`draw ${d.transient}/${d.position}/${d.status}: figures or licence on the floor block: ${bad ? bad.join(', ') : 'none'} · lines: ${b.split('\n').length}`); }
