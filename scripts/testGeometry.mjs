// testGeometry.mjs — Geometry Engine fixtures. Run: npx tsx scripts/testGeometry.mjs
import { relate, displacement, rebalancerFor, buildDossier, sig } from '../lib/geometryEngine.js';

let fails = 0;
const A = (cond, msg) => { if (cond) console.log('  ok —', msg); else { console.error('  FAIL —', msg); fails++; } };

console.log('axis / diagonal / reduction:');
A(relate(2, 18).axisPair === true && relate(2, 18).sum === 20, 'Wisdom+Imagination axis pair, sum 20');
const d912 = relate(9, 12);
A(d912.diagonalPair === true && d912.sum === 21 && d912.sameHouse === 'Body', 'Discipline+Sacrifice diagonal 21, same house Body');
A(relate(17, 8).reductionKin === true, '17 and 8 share digit root (reduction kin)');

console.log('displacement:');
const disp = displacement(17, 8);
A(disp.computable && disp.distance === 4 && disp.distanceClass.startsWith('antipode'), '17->8 antipode (4-bit)');
const d1 = displacement(9, 12);
A(d1.computable && d1.distance === 1, 'Discipline->Sacrifice 1-bit (nearest door)');
A(displacement(0, 8).computable === false, 'Gestalt anchor not computable (outside 4x4)');

console.log('grid adjacency (medicine cabinet):');
const adj = relate(17, 2);
A(adj.gridAdjacency?.type === 'vertical-neighbor' && adj.gridAdjacency.sum === 19, '17/2 vertical neighbors sum 19 (diagonal-duality medicine)');
const adj2 = relate(2, 18);
A(adj2.gridAdjacency?.type === 'vertical-neighbor' && adj2.gridAdjacency.medicineClass.startsWith('vertical-duality'), '2/18 vertical-duality seam (sum 20)');

console.log('rebalancer:');
const rb = rebalancerFor(9, 2); // Too Much Discipline -> Sacrifice via diagonal
console.log('   raw shape sample:', JSON.stringify(sig(9).corrections?.tooMuch ?? sig(9).corrections, null, 0)?.slice(0, 220));
A(rb !== null, 'rebalancer object returned for Too Much Discipline');
if (rb?.target) A(rb.target.id === 12, `Too Much Discipline medicine = Sacrifice (12), got ${rb.target?.id}`);

console.log('dossier (fear-reading-shaped fixture):');
const dossier = buildDossier({
  question: 'Is the guidance now saying finish the work',
  cards: [
    { position: 4, transient: 34, status: 2 },   // Too Much (bound) in Order
    { position: 7, transient: 19, status: 3 },   // Too Little Actualization in Drive
    { position: 8, transient: 37, status: 1 },   // Balanced Guidance in Fortitude
  ],
});
A(dossier.perCard.length === 3 && dossier.pairwise.length === 3, 'dossier shape: 3 cards, 3 pairwise');
A(dossier.aggregates.statusDistribution['Balanced'] === 1, 'aggregates: status distribution');
A(dossier.literalNameHits.some((h) => h.name === 'Guidance'), 'literal-name hit: Guidance flagged high-signal');
A(dossier.perCard[2].cardToPosition !== null, 'card-to-position relation computed');

console.log('pattern hints:');
const d2 = buildDossier({ question: 'did I fail?', cards: [ { position: 14, transient: 70, status: 4 }, { position: 19, transient: 30, status: 3 }, { position: 11, transient: 64, status: 4 } ] });
A(d2.aggregates.patternHints.some((h) => h.includes('ZERO Too Much')), 'zero-Too-Much hint fires');
A(d2.aggregates.patternHints.some((h) => h.includes('contact, not ground')), 'under-contact hint fires');

console.log(fails === 0 ? '\nALL GEOMETRY FIXTURES PASS' : `\n${fails} FAILURES`);
process.exitCode = fails === 0 ? 0 : 1;
