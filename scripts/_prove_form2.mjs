import { PROMPT_SETS, systemFor } from '../lib/promptSets.js';
const s = PROMPT_SETS['form-2'];
if (!s) { console.error('form-2 not registered'); process.exit(1); }
const sys = systemFor(s, 'plain');
const must = ['WHERE YOU SPEAK FROM.', 'THE SENTENCE.', 'THE SEVEN KINDS.', 'THE THREE DOORS.', "THE BODY'S PARTS.", 'WHEN THE MEDICINE IS A STATE.', 'THE TOOLS ON THE PAGE.', 'THE OPENING TURN (the first reply only).'];
const missing = must.filter((m) => !sys.includes(m));
console.log('form-2', s.version, 'system chars', sys.length, '| form-1 chars', systemFor(PROMPT_SETS['form-1'], 'plain').length);
console.log('order ok:', sys.indexOf('THE SENTENCE.') < sys.indexOf('THE SEVEN KINDS.') && sys.indexOf('THE SEVEN KINDS.') < sys.indexOf('THE THREE DOORS.') && sys.indexOf('THE THREE DOORS.') < sys.indexOf('THE OPENING TURN (the first reply only).'));
if (missing.length) { console.error('MISSING', missing); process.exit(1); }
console.log('all anchors present; schema field "hunch" present:', sys.includes('"hunch":'), '; voice para before THE SEED:', sys.indexOf('WHERE YOU SPEAK FROM.') < sys.indexOf('THE SEED. A draw is an instrument reading'));
