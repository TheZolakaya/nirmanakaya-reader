// What we hand the Reader: the assembled EZ system prompt, measured. Run: node scripts/measure_ez_prompt.mjs [voice]
import { BASE_SYSTEM } from '../lib/prompts.js';
import { ezSystem } from '../lib/ezPrompts.js';
const voice = process.argv[2] || 'plain';
const sys = ezSystem(BASE_SYSTEM, voice);
const paras = sys.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const W = words(sys);
const neg = (t) => (t.match(/\b(never|do not|don't|not once|no |nothing|must|always|only|forbid|refuse)\b/gi) || []).length;
const caps = (t) => (t.match(/\b[A-Z]{3,}(?:\s+[A-Z'’]{2,})*\b/g) || []).length;
const stanceIdx = paras.findIndex((p) => /HOUSE'?S STANCE|consciousness is primary/i.test(p));
const stanceWordsBefore = paras.slice(0, stanceIdx).reduce((n, p) => n + words(p), 0);
console.log(`voice: ${voice}`);
console.log(`words: ${W}  paragraphs: ${paras.length}  ~tokens: ${Math.round(W * 1.3)}`);
console.log(`negations/commands (never, do not, must, always, only…): ${neg(sys)}`);
console.log(`SHOUTED headings/phrases: ${caps(sys)}`);
console.log(`the house's stance is paragraph ${stanceIdx + 1} of ${paras.length}, after ${stanceWordsBefore} words (${Math.round((100 * stanceWordsBefore) / W)}% of the way in)`);
// classify paragraphs: seat (who you are / who you're with), ethic (how to treat them), format (fields, lengths, JSON), rail (don't)
const cls = (p) => /consciousness|being in the room|one being|you are included|the one in the room|wellbeing|care\b/i.test(p) ? 'seat/ethic' : /json|field|chips|reflect|forge|words|length|under \d+|\d+ to \d+ words|format|schema/i.test(p) ? 'format' : neg(p) >= 2 ? 'rail' : 'other';
const tally = {};
for (const p of paras) { const c = cls(p); tally[c] = tally[c] || { n: 0, w: 0 }; tally[c].n++; tally[c].w += words(p); }
console.log('paragraphs by kind (count, words):', tally);
console.log('\nfirst 40 words the Reader reads:\n  ' + sys.split(/\s+/).slice(0, 40).join(' '));
console.log('\nopenings of the first 12 paragraphs:');
paras.slice(0, 12).forEach((p, i) => console.log(`  ${i + 1}. ${p.slice(0, 90).replace(/\n/g, ' ')}…`));
