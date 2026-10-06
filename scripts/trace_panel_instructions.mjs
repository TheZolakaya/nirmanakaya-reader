// TRACE (read-only): do the panels' OWN instructions — the step, the medicine course, the dragon — and the Handing's medicine rules push the Reader
// toward verbal acts (say / write / name / tell)? Counts the words and lists the sentences that carry them.
import fs from 'node:fs';
const m = await import('../lib/ezPrompts.js'); const K = await import('../lib/kernel.js'); const H = await import('../lib/handingPrompt.js');
const D = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const k = K.buildKernel({ transient: 28, position: 9, status: 3 }, D);
const RE = /\b(write|writes|written|paper|journal|note it|list|say|says|said|speak|tell|name it|out loud|aloud|one sentence|in words)\b/gi;
const show = (name, text) => { const t = String(text); const hits = (t.match(RE) || []).map((x) => x.toLowerCase()); const c = {}; hits.forEach((h) => (c[h] = (c[h] || 0) + 1)); console.log(`\n== ${name} (${t.split(/\s+/).length} words): ${JSON.stringify(c)}`); t.split(/(?<=[.!?])\s+/).filter((s) => RE.test(s) && (RE.lastIndex = 0, true)).slice(0, 10).forEach((s) => console.log('  •', s.replace(/\s+/g, ' ').slice(0, 260))); };
show('the step (doSomethingBlock)', m.doSomethingBlock(k));
show('the medicine course (medicineBlock)', m.medicineBlock(k));
show('the dragon (dragonBlock)', m.dragonBlock(k));
const rules = H.HANDING_SET.EZ_RULES; const med = rules.split('\n').filter((l) => /medicine/i.test(l)).join('\n');
show('the Handing rules, medicine lines', med);
