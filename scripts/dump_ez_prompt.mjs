// Dump the assembled EZ system prompt, paragraph-numbered, for reading. Run: npx tsx scripts/dump_ez_prompt.mjs [voice]
import { BASE_SYSTEM } from '../lib/prompts.js';
import { ezSystem } from '../lib/ezPrompts.js';
const sys = ezSystem(BASE_SYSTEM, process.argv[2] || 'plain');
const paras = sys.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
console.log(paras.map((p, i) => `[[${i + 1}]] ${p}`).join('\n\n'));
