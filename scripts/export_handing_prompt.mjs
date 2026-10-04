// EXPORT THE HANDING, VERBATIM, to the shared drive — so the seats and any third party can read and propose on the prompt the
// Reader actually runs (founder, 2026-10-04). Re-run after any edit:  npx tsx scripts/export_handing_prompt.mjs
import fs from 'node:fs';
import { HANDING_BASE, HANDING_RULES } from '../lib/handingPrompt.js';
import { VOICES, ezSystem } from '../lib/ezPrompts.js';
import { VERSION } from '../lib/version.js';
const day = new Date().toISOString().slice(0, 10);
const w = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const assembled = ezSystem(HANDING_BASE, 'plain', { rules: HANDING_RULES });
const out = `# THE HANDING — the Reader's prompt, verbatim
*Exported from the repo on ${day} at v${VERSION} by scripts/export_handing_prompt.mjs. This is the text the Reader runs on nirmanakaya.com/ez for every signed-in person (live for everyone since v0.99.590). Edits land in lib/handingPrompt.js (the two blocks) and lib/ezPrompts.js (the voices); this file is a copy for reading and proposing, never the source.*

## How the three blocks become one prompt
The system prompt the model receives is assembled by \`ezSystem(HANDING_BASE, voice, { rules: HANDING_RULES })\`: BLOCK 1 (the base), then BLOCK 2 (the discourse rules), then BLOCK 3 (the voice chosen by the person — Plain words by default). Any paragraph of the base whose opening repeats one in the rules is dropped from the base so nothing is said twice. The draw, the record, the address and the question arrive in the user turn, not here. Sizes today: base ${w(HANDING_BASE)} words · rules ${w(HANDING_RULES)} words · Plain voice ${w(VOICES.plain.rules)} words · assembled ${w(assembled)} words.

Proposals: write them as replacements for a named paragraph, with the reason, so they can be benched (the Handing bench runs a variant against the live prompt on the same draws and a blind judge picks).

---

## BLOCK 1 — HANDING_BASE (lib/handingPrompt.js)

${HANDING_BASE}

---

## BLOCK 2 — HANDING_RULES, the discourse layer (lib/handingPrompt.js)

${HANDING_RULES}

---

## BLOCK 3 — THE VOICES (lib/ezPrompts.js)

### Plain words (the default)

${VOICES.plain.rules}

### Plain words, grown

${VOICES.grown.rules}

### Deep

${VOICES.deep.rules}

### Mystical

${VOICES.mystical?.rules || '(not defined)'}
`;
const dir = 'G:/My Drive/For Air Review';
const file = `${dir}/PROMPT_The_Handing_Verbatim_${day}.md`;
fs.writeFileSync(file, out);
fs.writeFileSync(`${dir}/PROMPT_The_Handing_Verbatim_LATEST.md`, out); // a fixed name the seats can always open
console.log('wrote', file, 'and PROMPT_The_Handing_Verbatim_LATEST.md ·', w(out), 'words');
