// The scar tests, tested: a bad reply that should trip every scar, and a clean reply that should trip none.
// Run: npx tsx scripts/scar_tests_selftest.mjs
import { lintOutput } from '../lib/bakeoff/lint.js';
const preset = { kind: 'opening' };
const bad = {
  gist: 'No — the draw does not show overwork.',
  reader: 'No. What\'s here isn\'t excess labor, honey. At some point you learned that the one holding the clipboard is you, and you need to stop needing a verdict. You\'re anxious about it. You must bond authentically with the part of you that isn\'t online yet.\n\nWith warmth,\nthe Reader',
  question: 'Is that it?', medicine: 'recognizable never as same trash', chips: [{ kind: 'answer', text: 'Yeah.' }],
};
const clean = {
  gist: 'The draw does not show overwork. It shows care nobody is counting.',
  reader: 'What the card shows is care that runs without anyone crediting it, including you. It has no name on it, so it doesn\'t get thanked and it doesn\'t get to stop.\n\nThe way through is on the card underneath: tell one person, this week, one thing you carried that nobody saw.',
  question: 'Which piece would you let someone see first?', medicine: 'Tell one person this week one thing you carried that nobody saw, and what you tend starts to count as yours again.', chips: [{ kind: 'answer', text: 'Probably the site.' }],
};
const t = (parsed) => JSON.stringify(parsed);
const want = ['pet', 'verdict2', 'backstory', 'groove', 'diagnosis', 'must', 'letter', 'commands', 'garble', 'gap'];
const b = lintOutput({ text: t(bad), parsed: bad, preset, draw: { status: 1 } });
const got = new Set(b.flags.map((f) => f.code));
console.log('bad reply flags:', b.flags.map((f) => `${f.code}(${f.detail})`).join(' · '));
const missed = want.filter((w) => !got.has(w));
console.log(missed.length ? `MISSED: ${missed.join(', ')}` : 'every scar tripped');
const c = lintOutput({ text: t(clean), parsed: clean, preset, draw: { status: 1 } });
const scarFlags = c.flags.filter((f) => want.includes(f.code));
console.log('clean reply scar flags:', scarFlags.length ? scarFlags.map((f) => `${f.code}(${f.detail})`).join(' · ') : 'none');
console.log('clean reply other flags:', c.flags.filter((f) => !want.includes(f.code)).map((f) => f.code).join(', ') || 'none');
process.exit(missed.length || scarFlags.length ? 1 : 0);
