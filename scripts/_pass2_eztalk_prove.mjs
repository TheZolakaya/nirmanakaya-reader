// Pass Two, step 1: prove lib/ezTalk.js composes a later turn with every block the page composes. No model call.
const m = await import('../lib/ezTalk.js');
const draws = [{ transient: 25, position: 14, status: 4 }];
const turns = [
  { id: 't1', role: 'reader', text: 'Opening text here.', medicine: 'The move is Commitment.', question: 'Is it held as yours?' },
  { id: 'y1', role: 'you', text: 'No, I do feel ownership; the issue is whether the Reader has room to work.' },
];
const msg = m.buildTalkMessage({ question: 'How is the project going?', frame: { k: 'making', detail: 'the Nirmanakaya project' }, draws, turns, notes: ['you hedged (x); say what the draw says, plainly'] });
const must = [
  'QUESTION: "How is the project going?"',
  'THE FRAME — this reading is about a thing I\'m making: "the Nirmanakaya project"',
  'THE ORIGINAL DRAW (unchanged):',
  'Unacknowledged Alignment',
  'THE DISCOURSE SO FAR, in order:',
  'READER (you — your own earlier words, never the asker\'s): Opening text here.',
  '  THE MEDICINE IT GAVE: The move is Commitment.',
  '  IT ASKED: "Is it held as yours?"',
  'ASKER: "No, I do feel ownership',
  'THE SIGNATURE IN PLAY (its medicine governs this turn):',
  'THE DRAW, FROM THE RECORD',
  'THE HOUSE\'S NOTES ON YOUR LAST TURN',
  'HUNCH CHECK:',
  'Respond to the asker\'s latest turn. Follow EZ MODE (a later turn). JSON only.',
];
const missing = must.filter((f) => !msg.includes(f));
console.log('talk message:', msg.split(/\s+/).length, 'words; fragments missing:', missing.length ? missing : 'none');
console.log('register suffix ok:', m.withRegister('x', 'friend').endsWith(m.REGISTER_LINE.friend), '| label:', m.drawLabel(draws[0]), '| balanced line chars:', m.BALANCED_LINE.length);
const balanced = m.buildTalkMessage({ question: 'q', draws: [{ transient: 24, position: 2, status: 1 }], turns: [{ role: 'reader', text: 'x' }, { role: 'you', text: 'fine' }] });
console.log('balanced line present on a Balanced card:', balanced.includes('THE SIGNATURE IN PLAY IS BALANCED'));
if (process.argv[2] === 'dump') console.log('\n' + msg);
