// The Handing prompt, measured beside the live one (same yardstick as measure_ez_prompt.mjs). Run: npx tsx scripts/measure_handing.mjs
import fs from 'node:fs';
import { BASE_SYSTEM } from '../lib/prompts.js';
import { ezSystem } from '../lib/ezPrompts.js';
import { HANDING_BASE, HANDING_RULES, HANDING_SET } from '../lib/handingPrompt.js';
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const neg = (t) => (t.match(/\b(never|do not|don't|not once|must|always|only|forbid|refuse|zero exceptions|hard rule)\b/gi) || []).length;
const caps = (t) => (t.match(/\b[A-Z]{3,}(?:\s+[A-Z'’]{2,})*\b/g) || []).length;
const row = (name, sys) => console.log(`${name.padEnd(9)} words ${String(words(sys)).padStart(6)}  paragraphs ${String(sys.split(/\n\n+/).filter(Boolean).length).padStart(4)}  commands ${String(neg(sys)).padStart(4)}  shouted ${String(caps(sys)).padStart(4)}  ~tokens ${Math.round(words(sys) * 1.3)}`);
const live = ezSystem(BASE_SYSTEM, 'plain');
const handing = ezSystem(HANDING_BASE, 'plain', { rules: HANDING_RULES });
row('live', live); row('handing', handing);
console.log(`\nhanding: base ${words(HANDING_BASE)} words, craft ${words(HANDING_RULES)} words, voice ${words(handing) - words(HANDING_BASE) - words(HANDING_RULES)} words`);
console.log('first 30 words the Reader reads:\n  ' + handing.split(/\s+/).slice(0, 30).join(' '));
const out = process.argv[2]; if (out) { fs.writeFileSync(out, JSON.stringify(HANDING_SET, null, 1)); console.log('wrote set to', out); }
