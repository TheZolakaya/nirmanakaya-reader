// .716 the destination precision fix: denials and descriptive person-groups pass; credit given away still flags
const { destinationFlags: f } = await import('../lib/bakeoff/lint.js');
const d = [{ transient: 54, position: 4, status: 4 }]; const q = 'What is this low, restless feeling trying to tell me?';
const cases = [
  ['NEG', 'a structure, a pattern, a way of doing things that other people will stand on.'],
  ['NEG', 'a shape other people have started to live inside.'],
  ['NEG', 'That is not luck and it is not temperament.'],
  ["NEG", "It isn't the situation; it is you."],
  ['NEG', 'not because of luck, but because you built it'],
  ['POS', 'You keep putting it down to luck.'],
  ['POS', 'You give the credit to other people.'],
  ['POS', 'As if it was done by someone else.'],
  ['POS', 'It feels like it just happened to you.'],
  ['POS', 'You call it timing.'],
  ['POS', 'because of other people, the work never felt yours'],
];
let ok = 0; for (const [k, t] of cases) { const n = f(t, d, q, '').length; const pass = (k === 'POS') === (n > 0); if (pass) ok++; console.log(pass ? 'ok ' : 'BAD', k, n, t); }
console.log(`${ok}/${cases.length}`);
console.log('non-UA draw (want 0):', f('You give the credit to other people.', [{ transient: 54, position: 4, status: 1 }], q, '').length);
