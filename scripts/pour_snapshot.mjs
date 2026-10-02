// Cut the SNAPSHOT from a stored set: data/pour/snapshot/<sig>.json (78 files) + manifest.json. Only cells with no hard lint flag
// open and a provenance that still matches the record are written; the rest are listed in the manifest as holes.
//   npx tsx scripts/pour_snapshot.mjs [set=l] [author=or-v4.1-flash]
import fs from 'node:fs';
import path from 'node:path';
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { readPlan } from '../lib/pour/assemble.js';
import { checkProvenance } from '../lib/pour/joins.js';
import { getComponent } from '../lib/corrections.js';

const [SET = 'l', AUTHOR = 'or-v4.1-flash'] = process.argv.slice(2);
const dir = `data/pour/cells_${SET}_${AUTHOR}`; const out = 'data/pour/snapshot';
fs.mkdirSync(out, { recursive: true });
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const cards = {}; const holes = []; let written = 0, refused = 0, stale = 0;
for (const r of rows) {
  for (const c of r.cells) {
    const hard = (c.lint || []).some((f) => f.hard);
    if (hard) { refused++; holes.push({ sig: r.signature_id, pos: r.position_id, status: c.status, why: 'hard lint open' }); continue; }
    const plan = readPlan({ transient: r.signature_id, position: r.position_id, status: c.status }, DEFS);
    const pv = checkProvenance(plan, c);
    if (!pv.ok) { stale++; holes.push({ sig: r.signature_id, pos: r.position_id, status: c.status, why: pv.flags.map((f) => f.detail).join('; ').slice(0, 120) }); continue; }
    const card = (cards[r.signature_id] ||= { signature_id: r.signature_id, signature: r.signature, set: SET, prompt: r.prompt, author: r.author, seats: {} });
    (card.seats[String(r.position_id)] ||= {})[String(c.status)] = { tense: c.tense, verb: c.verb, place: c.place, ask: c.ask, core: c.core, sheetLine: c.sheetLine, provenance: c.provenance };
    written++;
  }
}
for (let sig = 0; sig < 78; sig++) {
  const card = cards[sig] || { signature_id: sig, signature: getComponent(sig)?.name, set: SET, seats: {} };
  fs.writeFileSync(path.join(out, `${String(sig).padStart(2, '0')}.json`), JSON.stringify(card, null, 1));
}
const expected = 78 * 22 * 4;
const manifest = { set: SET, author: AUTHOR, cut: new Date().toISOString(), cells: written, expected, missing: expected - written, refused, stale, holes: holes.slice(0, 500), prompts: [...new Set(rows.map((r) => r.prompt))] };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`snapshot cut from set ${SET}: ${written} cells of ${expected} (${refused} refused by a hard flag, ${stale} stale against the record, ${expected - written - 0} not yet poured or held) → ${out}`);
