// .707: capture the Plain voice's exact text (before / after the voice-law refactor) and print its paragraph structure
import fs from 'node:fs';
const m = await import('../lib/ezPrompts.js');
const tag = process.argv[2] || 'before';
fs.writeFileSync(`${process.env.TEMP}/plain_${tag}.txt`, m.VOICES.plain.rules);
fs.writeFileSync(`${process.env.TEMP}/plainshort_${tag}.txt`, m.VOICES.plainshort.rules);
fs.writeFileSync(`${process.env.TEMP}/plainlit_${tag}.txt`, m.VOICES.plainlit.rules);
const p = m.VOICES.plain.rules.split('\n\n'); console.log(tag, 'paragraphs', p.length, 'chars', m.VOICES.plain.rules.length);
if (tag === 'before') p.forEach((x, i) => console.log(i, JSON.stringify(x.slice(0, 70))));
