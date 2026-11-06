// verify_r70_half_rule.mjs — R-70 (founder 2026-11-06), the half rule for all forty Bounds.
// Prints, for every Bound id 22..61 and every status that reaches getBoundCorrection (1 Balanced, 2 Too Much,
// 3 Too Little, 4 Unacknowledged), the bound id, the status, and the target id (or PORTAL:<id> / SELF).
// Run before and after a change to lib/corrections.js and diff the two outputs.
// Usage: node scripts/verify_r70_half_rule.mjs [path-to-corrections.js]   (default: lib/corrections.js)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, '..', 'lib', 'corrections.js');
const { getBoundCorrection, getComponent } = await import(pathToFileURL(target).href);

const STATUS = { 1: 'Balanced', 2: 'TooMuch', 3: 'TooLittle', 4: 'Unacknowledged' };
const lines = [];
for (let id = 22; id <= 61; id++) {
  const bound = getComponent(id);
  for (const status of [1, 2, 3, 4]) {
    const c = getBoundCorrection(bound, status);
    let out;
    if (!c) out = 'NULL';
    else if (c.isPortal) out = `PORTAL:${c.targetId} (${c.targetBound?.name})`;
    else if (c.isSelf) out = 'SELF';
    else out = `${c.targetId} (${c.targetBound?.traditional ?? c.targetBound?.name})`;
    lines.push(`${id} ${bound.traditional ?? bound.name} [arch ${bound.archetype}] | ${STATUS[status]} | ${c?.type ?? '-'} -> ${out}`);
  }
}
console.log(lines.join('\n'));
