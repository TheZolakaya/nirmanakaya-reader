// .759 proof: the hint-echo filter on positives and negatives
import { stripPromptEcho } from '../lib/transcribeEcho.js';
const HINT = 'A question, spoken plainly. Punctuated, with capitals and full stops.';
const cases = [
  // positives — something must be stripped
  ['A question, spoken plainly. A question, spoken plainly. A question, spoken plainly.', '', true],
  ['A question, spoken plainly.', '', true],
  ['A question, spoken plainly. Punctuated, with capitals and full stops.', '', true],
  ['Why am I so tired of this project? A question, spoken plainly.', 'Why am I so tired of this project?', true],
  ['a question spoken plainly', '', true],
  ['Punctuated, with capitals and full stops. Should I keep going?', 'Should I keep going?', true],
  // negatives — untouched
  ['Why am I so tired of this project?', 'Why am I so tired of this project?', false],
  ['Can you say that plainly? I asked a question.', 'Can you say that plainly? I asked a question.', false],
  ['I feel like Nirmanakaya isn\'t working as well. What should I do?', 'I feel like Nirmanakaya isn\'t working as well. What should I do?', false],
  ['', '', false],
  ['A question.', 'A question.', false],
];
let fail = 0;
for (const [input, want, wantEchoed] of cases) {
  const got = stripPromptEcho(input, HINT);
  const ok = got.text === want && got.echoed === wantEchoed;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(input).slice(0, 70)} -> ${JSON.stringify(got.text).slice(0, 60)} echoed=${got.echoed}`);
}
console.log(fail ? `${fail} FAILED` : `all ${cases.length} pass`);
process.exit(fail ? 1 : 0);
