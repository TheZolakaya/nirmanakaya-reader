// node --test dev/four-arm/test/recognitionBlock.test.mjs
// The block's forbidden-word check (R-11, R-33) on 20 real engine outputs (the brief's unit test), on the whole lens space
// (78 x 22 x 4) and the whole diag space (16 cells x 4 leans), and each rule proved on a negative. No network, no paid call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFS } from '../lib/defs.mjs';
import { recognize, mockModelCaller, engineOutput, componentsFrom, CELL, drawLens } from '../../../lib/recognition.js';
import { renderBlock, wordListCheck, TEMPLATE_HASH } from '../../../lib/recognitionBlock.js';
import { mockValidatorText } from '../../../lib/recognition.js';
import { parseValidator } from '../../../lib/recognitionPrompts.js';

const TASK = 'My manager says the report must be finished by Friday. Should I tell her it is impossible?';
const DRAFTS = [
  'You should tell her plainly that Friday is not realistic, and offer a date you can keep.',
  'It sounds like a lot of pressure. Maybe ask what matters most in the report and start there.',
  'I can see why you are worried. Friday is close, but a partial report might still help her.',
  'Tell her the truth. Deadlines that cannot be met only get worse when nobody says so.',
  'You are clearly overwhelmed, and that is understandable. Let us break the report into parts.',
  'There is no single right answer here. It depends on your manager and the report.',
  'Your manager set the date, but you know the work. A short honest note could open the conversation.',
  'Friday must feel impossible. Is there any part of the report that is already done?',
  'I would not call it impossible yet. What would you need in order to finish by Friday?',
  'Saying it is impossible may close a door. Saying what is possible keeps it open.',
  'This is your call. You know the situation better than I do.',
  'The report is due Friday. Here is a plan: outline today, draft tomorrow, review Thursday.',
  'It may help to separate what the report needs from what would be nice to have.',
  'Some managers respect a clear no. Others need a counter-offer. Which is she?',
  'You are not the only one who has faced this. Many people renegotiate deadlines.',
  'Before you tell her anything, check what the report is for and who reads it.',
  'Honestly, I think you already know the answer. You are asking for permission.',
  'A deadline is an agreement. Agreements can be revisited when the facts change.',
  'Impossible is a strong word. Hard and unlikely may be closer to the truth.',
  'If you finish part of it by Friday, the rest can follow with her agreement.',
];

test('20 real engine outputs (lens, the door sampler) pass the forbidden-word check and the mock semantic check', async () => {
  const callModel = mockModelCaller();
  for (let i = 0; i < 20; i++) {
    const r = await recognize({ kind: 'lens', task: TASK, draft: DRAFTS[i], requestId: `unit-lens-${i}` }, { DEFS, callModel });
    assert.equal(r.validation.wordList.ok, true, `lens block ${i} tripped the word list: ${JSON.stringify(r.validation.wordList.hits)}\n${r.block}`);
    assert.equal(r.validation.semantic.pass, true, `lens block ${i} failed the mock semantic check: ${r.validation.semantic.failed}`);
    assert.equal(r.blockFailure, false);
  }
});

test('20 diag outputs (mock classifier, evidence quoted from the draft) pass; quoted draft words are exempted, not hidden', async () => {
  const callModel = mockModelCaller();
  let exempted = 0;
  for (let i = 0; i < 20; i++) {
    const r = await recognize({ kind: 'diag', task: TASK, draft: DRAFTS[i], requestId: `unit-diag-${i}` }, { DEFS, callModel });
    assert.equal(r.classifierFailure, false, r.classifier?.reason);
    assert.equal(r.validation.wordList.ok, true, `diag block ${i}: ${JSON.stringify(r.validation.wordList.hits)}\n${r.block}`);
    exempted += r.validation.wordList.exempted.length;
  }
  assert.ok(exempted > 0, 'at least one draft quote carrying a listed word should be exempted (the drafts contain "should", "must", "you are")');
});

test('the whole lens space (78 x 22 x 4 = 6864 blocks) and the whole diag space (16 x 4) are clean', () => {
  let n = 0;
  for (let t = 0; t < 78; t++) for (let p = 0; p < 22; p++) for (let s = 1; s <= 4; s++) {
    const c = componentsFrom('lens', engineOutput({ transient: t, position: p, status: s }, DEFS));
    const w = wordListCheck(renderBlock(c));
    assert.equal(w.ok, true, `lens ${t}/${p}/${s}: ${JSON.stringify(w.hits)}`); n++;
  }
  for (const id of Object.values(CELL)) for (let s = 1; s <= 4; s++) {
    const c = componentsFrom('diag', engineOutput({ transient: id, position: id, status: s }, DEFS), { positionEvidence: 'a phrase', leanEvidence: 'another phrase', leanBecause: 'it names a date' });
    const b = renderBlock(c);
    assert.equal(wordListCheck(b).ok, true, `diag ${id}/${s}`);
    assert.equal(parseValidator(mockValidatorText({ kind: 'diag', task: TASK, draft: 'a phrase another phrase', block: b })).pass, true, `diag ${id}/${s} mock semantic`); n++;
  }
  assert.equal(n, 6864 + 64);
});

test('negatives: each listed word fails when it is the block\'s own; a task\'s "must" quoted as the task\'s words passes', () => {
  assert.deepEqual(wordListCheck('The draft should be more direct.').hits.map((h) => h.word), ['should']);
  assert.deepEqual(wordListCheck('You are too cautious here.').hits.map((h) => h.word), ['you are']);
  assert.deepEqual(wordListCheck("you're hedging").hits.map((h) => h.word), ['you are']);
  assert.deepEqual(wordListCheck('Verdict: the draft is wrong.').hits.map((h) => h.word).sort(), ['verdict', 'wrong']);
  assert.deepEqual(wordListCheck('Its score is 3.').hits.map((h) => h.word), ['score']);
  assert.equal(wordListCheck('The task says "you must stop".', { quotedFrom: [TASK] }).ok, false, 'a quote NOT in the inputs is still the block\'s own word');
  const ok = wordListCheck('The task says "the report must be finished by Friday".', { quotedFrom: [TASK] });
  assert.equal(ok.ok, true); assert.deepEqual(ok.exempted, ['the report must be finished by Friday']);
  // the mock semantic validator, on a negative and a positive
  assert.equal(parseValidator(mockValidatorText({ kind: 'lens', block: '3. The lean: the drawn condition is Too Much; as a hypothesis, where in the draft would that show?\nRevise the draft now.' })).pass, false);
  assert.equal(parseValidator(mockValidatorText({ kind: 'lens', block: '3. The lean: the drawn condition is Too Much; as a hypothesis, where in the draft would that show?' })).pass, true);
  assert.equal(parseValidator(mockValidatorText({ kind: 'lens', block: '3. The lean: the drawn condition is Too Much.' })).pass, false, 'a lens lean without "as a hypothesis" asserts the condition');
});

test('the template hash is a stable sha256 and a draw is a door-shaped triple', () => {
  assert.match(TEMPLATE_HASH, /^[0-9a-f]{64}$/);
  const d = drawLens();
  assert.ok(d.transient >= 0 && d.transient < 78 && d.position >= 0 && d.position < 22 && d.status >= 1 && d.status <= 4);
});
