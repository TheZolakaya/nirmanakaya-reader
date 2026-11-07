// One-off: does lib/addressCore.js (branch) return exactly what main's inlined addressOf returned, for all 78 ids?
// The old body is copied verbatim from `git show main:lib/address.js` (the lines removed in commit 3014ed04).
import fs from 'node:fs';
import { getComponent } from '../../lib/corrections.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { addressOfIn } from '../../lib/addressCore.js';

const DEFS = JSON.parse(fs.readFileSync(new URL('../../lib/data/nirmanakaya_78_definitions.json', import.meta.url), 'utf8'));

function addressOf_main(id) {
  const sig = DEFS?.signatures?.[id];
  const comp = getComponent(id) || {};
  const c = sig?.coordinate4D;
  if (c?.practice && c?.activity) return { ...c, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null };
  if (comp.archetype != null && comp.archetype !== id) {
    const parent = DEFS?.signatures?.[comp.archetype]; const pc = parent?.coordinate4D;
    if (pc?.practice && pc?.activity) return { ...pc, name: comp.name || sig?.name, via: ARCHETYPES[comp.archetype]?.name || parent?.name || null, element: sig?.elementalDesignator || comp.element || pc.element || null };
  }
  return { practice: c?.practice || comp.house || null, activity: null, being: null, identity: null, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null, outside: c?.note || 'outside the grid' };
}

let same = 0, diff = [];
for (let id = 0; id < 78; id++) {
  const a = JSON.stringify(addressOf_main(id));
  const b = JSON.stringify(addressOfIn(DEFS, id));
  if (a === b) same++; else diff.push({ id, main: a, branch: b });
}
console.log(`identical ${same}/78; differing ${diff.length}`);
for (const d of diff.slice(0, 5)) console.log(JSON.stringify(d));
console.log('sample id 7 (branch):', JSON.stringify(addressOfIn(DEFS, 7)));
process.exit(diff.length ? 1 : 0);
