// Export THE QUIET MANNER set as a bench variant file, and prove every anchor took (the derivation logs a missing anchor; this fails on one).
//   npx tsx scripts/export_quiet_variant.mjs [out.json]
import fs from 'node:fs';
import { HANDING_SET, QUIET_SET } from '../lib/handingPrompt.js';
const out = process.argv[2] || 'data/bakeoff/quiet_variant.json';
const musts = ['receive the question', 'as a door that stands open', 'it is a Now question', 'THE MOVE, WHEN THERE IS ONE', 'THE MANNER — what the big Reader', 'a hunch is the exception', 'theirs to reach for'];
const missing = musts.filter((m) => !(QUIET_SET.BASE_SYSTEM + QUIET_SET.EZ_RULES).includes(m));
const leftovers = ['My hunch is the plain number', 'say one sentence out loud: this call was mine'].filter((m) => (QUIET_SET.BASE_SYSTEM + QUIET_SET.EZ_RULES).includes(m));
if (missing.length || leftovers.length) { console.error('DERIVATION FAILED', { missing, leftovers }); process.exit(1); }
const words = (t) => t.split(/\s+/).filter(Boolean).length;
fs.writeFileSync(out, JSON.stringify({ BASE_SYSTEM: QUIET_SET.BASE_SYSTEM, EZ_RULES: QUIET_SET.EZ_RULES }, null, 1));
console.log(`quiet set: base ${words(QUIET_SET.BASE_SYSTEM)} words (handing ${words(HANDING_SET.BASE_SYSTEM)}) · rules ${words(QUIET_SET.EZ_RULES)} (handing ${words(HANDING_SET.EZ_RULES)}) → ${out}`);
