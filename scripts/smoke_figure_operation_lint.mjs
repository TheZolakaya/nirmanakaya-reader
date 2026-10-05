// .700: prove the two new Plain-gated flags on positives and negatives
const { figureFlags, operationFlags, lintOutput } = await import('../lib/bakeoff/lint.js');
const pos1 = "The ending is done; the signing of it isn't. You're standing at a door that's already behind you.";
const pos2 = 'And the way through is the same move — give the mess a shape it can be carried in: one rule, a time, a place, or the order things go in.';
const neg = 'You decided and then you reopened it. Pick one decision you already made and leave it made this week.';
console.log('figure +:', figureFlags(pos1).map((f) => f.detail.slice(0, 70)));
console.log('figure -:', figureFlags(neg));
console.log('operation +:', operationFlags(pos2).map((f) => f.detail.slice(0, 90)));
console.log('operation -:', operationFlags(neg));
const r = lintOutput({ text: '', parsed: { reader: pos1 + ' ' + pos2, medicine: 'x', question: 'y?', chips: [{ text: 'a' }] }, preset: { kind: 'opening' }, hostile: false, draw: null, draws: [], question: 'q', context: '', voice: 'plain' });
console.log('through lintOutput, Plain:', r.flags.filter((f) => ['figure', 'operation'].includes(f.code)).map((f) => f.code));
const r2 = lintOutput({ text: '', parsed: { reader: pos1 + ' ' + pos2, medicine: 'x', question: 'y?', chips: [{ text: 'a' }] }, preset: { kind: 'opening' }, hostile: false, draw: null, draws: [], question: 'q', context: '', voice: 'deep' });
console.log('through lintOutput, Deep (gated off):', r2.flags.filter((f) => ['figure', 'operation'].includes(f.code)).length);
