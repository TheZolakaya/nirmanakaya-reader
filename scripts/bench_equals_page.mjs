// The bench measures nothing unless it sends byte-for-byte what the page sends. Run: npx tsx scripts/bench_equals_page.mjs
import { BASE_SYSTEM } from '../lib/prompts.js';
import { ezSystem } from '../lib/ezPrompts.js';
import { buildOpening } from '../lib/bakeoff/presets.js';
const page = ezSystem(BASE_SYSTEM, 'plain');
const bench = buildOpening({ question: 'Am I overworking this?', draw: { transient: 53, position: 1, status: 4 }, over: {} }).system;
if (page === bench) { console.log(`bench === page: ${page.length} chars, ${page.split(/\s+/).length} words`); process.exit(0); }
let i = 0; while (i < page.length && page[i] === bench[i]) i++;
console.log(`DIFFER at char ${i}\n page: …${page.slice(Math.max(0, i - 60), i + 120)}\n bench: …${bench.slice(Math.max(0, i - 60), i + 120)}`);
process.exit(1);
