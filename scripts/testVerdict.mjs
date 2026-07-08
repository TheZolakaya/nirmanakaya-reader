// Verdict engine fixtures — typer classes, harm gate (fail-closed), field lean signs.
import { typeQuestion, computeFieldLean, parseVerdictResponse } from '../lib/verdictEngine.js';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

console.log('TYPER:');
check('harm self hard-gates', typeQuestion('Should I starve myself to death?').hardGate === true);
check('harm self class', typeQuestion('should i just end my life').class === 'HARM');
check('harm other hard-gates', typeQuestion('Should I hurt my boss for what he did?').hardGate === true);
check('compound Morocco', typeQuestion('Should I leave my wife and child and move to Morocco and quit my job?').class === 'COMPOUND');
check('high-stakes single', typeQuestion('Should I quit my job?').class === 'HIGH_STAKES');
check('clear yes/no', typeQuestion('Is the Nirmanakaya work structurally sound right now?').class === 'CLEAR');
check('state question', typeQuestion('How are things going with the book?').class === 'STATE');
check('empty unanswerable', typeQuestion('').class === 'UNANSWERABLE');
check('clear does not hard-gate', typeQuestion('Is the work sound?').hardGate === false);

console.log('FIELD LEAN:');
const allBalanced = [
  { position: 3, transient: 8, status: 1 },
  { position: 5, transient: 14, status: 1 },
  { position: 7, transient: 2, status: 1 }
];
const allTooLittle = [
  { position: 3, transient: 8, status: 3 },
  { position: 5, transient: 14, status: 3 },
  { position: 7, transient: 2, status: 3 }
];
const leanUp = computeFieldLean(allBalanced);
const leanDown = computeFieldLean(allTooLittle);
check('all-balanced leans positive', leanUp.value > 0.15, `got ${leanUp.value}`);
check('all-too-little leans negative', leanDown.value < -0.15, `got ${leanDown.value}`);
check('lean carries its label', leanUp.label.includes('not a judgment'));
check('components disclosed', Array.isArray(leanUp.components) && leanUp.components.length >= 3);
check('empty draw neutral', computeFieldLean([]).value === 0);
const mixed = computeFieldLean([{ position: 10, transient: 34, status: 4 }]); // portal position
check('portal flagged', mixed.portalPresent === true);
check('band assigned', ['strong-yes','lean-yes','neutral','lean-no','strong-no'].includes(mixed.band));

console.log('PARSER:');
const good = parseVerdictResponse('```json\n{"verdict":"NO_BUT","assertion":"x","walk":[]}\n```');
check('parses fenced JSON', good?.verdict === 'NO_BUT');
check('rejects unknown verdict', parseVerdictResponse('{"verdict":"MAYBE"}') === null);
check('rejects garbage', parseVerdictResponse('the answer is yes') === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
