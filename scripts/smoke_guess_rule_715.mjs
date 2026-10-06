// .715: every live voice's block starts with the guess rule
const m = await import('../lib/ezPrompts.js');
for (const v of ['plain', 'friend', 'coach', 'storyteller', 'mystic']) console.log(v.padEnd(12), 'starts with the guess rule:', m.VOICES[v].rules.startsWith('SAY WHEN YOU ARE GUESSING'));
