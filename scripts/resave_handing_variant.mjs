// Re-save the bench's 'handing' variant from lib/handingPrompt.js, so the bench measures the Handing as it is now
// (the variant is a stored SET; editing the module does not change it). Run after any edit: npx tsx scripts/resave_handing_variant.mjs
import { HANDING_SET } from '../lib/handingPrompt.js';
import { saveVariant } from '../lib/bakeoff/store.js';
const row = saveVariant({ id: 'handing', name: 'The Handing (seat · map · Handing · stance · craft)', target: 'SET', text: '', over: HANDING_SET, author: 'True' });
const w = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
console.log(`saved variant ${row.id}: BASE_SYSTEM ${w(HANDING_SET.BASE_SYSTEM)} words · EZ_RULES ${w(HANDING_SET.EZ_RULES)} words`);
