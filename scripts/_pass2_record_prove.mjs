// PASS TWO, STEP 3 — prove the record: with no opts, byte-identical to HEAD's record for every draw tried; with opts, the new lines appear.
// needs lib/_head_record.js = git show HEAD:lib/record.js (written by the caller, not committed)
import fs from 'node:fs';
const now = await import('../lib/record.js');
const head = await import('../lib/_head_record.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const draws = [{ transient: 25, position: 14, status: 4 }, { transient: 5, position: 18, status: 2 }, { transient: 54, position: 17, status: 3 }, { transient: 38, position: 8, status: 4 }, { transient: 24, position: 2, status: 1 }, { transient: 62, position: 17, status: 1 }, { transient: 15, position: 7, status: 4 }];
let same = 0;
for (const d of draws) { const a = now.drawRecord(d, DEFS, 'How is it going?', ''); const b = head.drawRecord(d, DEFS, 'How is it going?', ''); if (a === b) same++; else { console.log('DIFF on', JSON.stringify(d)); console.log(a.slice(0, 400)); console.log('---'); console.log(b.slice(0, 400)); } }
console.log(`no opts: ${same}/${draws.length} byte-identical to HEAD`);
const s = now.drawRecord(draws[1], DEFS, 'What does the map show about reducing the prompt?', '', { statusLines: 'structural', invariants: true });
console.log('\n== structural + invariants, Too Much Culture in Imagination:\n' + s.split('\n').filter((l) => /STATUS|plain words|can look|requires|MEDICINE SIGNATURE/.test(l)).join('\n'));
const u = now.drawRecord(draws[0], DEFS, 'How is the project going?', '', { statusLines: 'structural' });
console.log('\n== structural only, Unacknowledged Alignment in Tune:\n' + u.split('\n').filter((l) => /STATUS|plain words|can look/.test(l)).join('\n'));
