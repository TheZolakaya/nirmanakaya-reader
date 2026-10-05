// .706: the lower-case status label — positives and negatives
const { plainNameFlags } = await import('../lib/bakeoff/lint.js');
const pos = ["Here's what came up: it's unacknowledged.", 'What came up reads as too little.', 'The status is balanced.'];
const neg = ["You're doing too much.", 'This is too much for one person.', 'Your work goes unacknowledged by everyone around you.', 'Your diet is balanced, and that part is working.', 'That is too little time to decide.'];
for (const s of pos) console.log('+', plainNameFlags(s).length ? 'FLAG' : 'miss', '|', s);
for (const s of neg) console.log('-', plainNameFlags(s).length ? 'FLAG (false positive)' : 'ok', '|', s);
