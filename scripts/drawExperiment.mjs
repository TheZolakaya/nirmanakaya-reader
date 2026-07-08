// Verdict-engine design experiment — single-card reading on a design assertion.
// Uses the app's own crypto draw (generateSpread) and the real geometry engine,
// so the draw is as sacred as any production reading. Reading-random law intact.
import { generateSpread } from '../lib/utils.js';
import { drawsToCards, buildCardDossier, formatCardGeometry } from '../lib/geometryEngine.js';

const QUESTION = process.argv[2] || 'No question provided — pass the question as the first argument.';

const draws = generateSpread(1);
const cards = drawsToCards(draws);
const dossier = buildCardDossier({ question: QUESTION, cards, index: 0 });

console.log('QUESTION:', QUESTION);
console.log('\nDRAW:', JSON.stringify(draws[0]));
console.log('\nDOSSIER:', JSON.stringify(dossier, null, 2));
console.log('\nFORMATTED GEOMETRY:\n' + formatCardGeometry(dossier));
