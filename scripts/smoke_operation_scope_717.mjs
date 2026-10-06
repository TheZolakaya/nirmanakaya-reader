// .717 the operation guard's scope, proved on the real failure corpus: every quote of the draw's own medicine line still flags; the two
// ordinary-English matches on other cards' lines (never handed to the model) no longer do. OP_SCOPE=0 restores the all-78 check.
import fs from 'node:fs';
const { operationFlags } = await import('../lib/bakeoff/lint.js');
let own = 0, ownOk = 0, other = 0, otherOk = 0;
for (const lane of ['base', 'constraint']) for (const r of JSON.parse(fs.readFileSync(`data/bakeoff/opcopy_${lane}.json`, 'utf8'))) for (const h of r.opHits) {
  const n = operationFlags(h.sentence, [r.draw]).length;
  if (h.ownMedicine) { own++; if (n) ownOk++; else console.log('MISSED own quote:', h.sentence); } else { other++; if (!n) otherOk++; else console.log('still flags other-card match:', h.sentence); }
}
console.log(`own-medicine quotes still caught: ${ownOk}/${own} · other-card ordinary-English matches cleared: ${otherOk}/${other}`);
console.log('no draws given (all-78 check as before):', operationFlags('rather than in what is in front of you today').length);
