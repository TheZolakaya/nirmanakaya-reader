// .707 THE ONE VOICE LAW (Air: "shared voice constitution → thin persona card, including Plain; do not maintain the same prohibitions in two places").
// Cuts the Plain voice's literal in lib/ezPrompts.js into the voice-independent law (the record rule, the forbidden words, what stays the same) and
// Plain's own card (its head, the twelve-year-old, Keel's sentences), declared ONCE above VOICES; Plain is then composed from them in its original
// order, so the production prompt is byte-identical (checked by scripts/capture_plain_rules.mjs before/after).
import fs from 'node:fs';
const p = 'lib/ezPrompts.js'; let s = fs.readFileSync(p, 'utf8');
const startMark = "    rules: `THE VOICE — PLAIN WORDS."; const i0 = s.indexOf(startMark); if (i0 < 0) throw new Error('start missing');
const litStart = i0 + "    rules: `".length; const endMark = "`\n  },\n  plainlit"; const i1 = s.indexOf(endMark, litStart); if (i1 < 0) throw new Error('end missing');
const body = s.slice(litStart, i1); const paras = body.split('\n\n'); if (paras.length !== 6) throw new Error(`expected 6 source paragraphs, got ${paras.length}`);
const [head, twelve, record, forbidden, sentences, stays] = paras;
const decl = `// .707 THE ONE VOICE LAW — the voice-independent part of how the Reader speaks, written ONCE. Plain is composed from it (below, byte-identical to .706);
// the personas inherit the same constants (lib/personaVoices.js). Edit a prohibition here and every voice gets it.
export const VOICE_LAW_RECORD = \`${record}\`;
export const VOICE_LAW_FORBIDDEN = \`${forbidden}\`;
export const VOICE_LAW_STAYS = \`${stays}\`;
// PLAIN'S OWN CARD — what makes Plain Plain, on top of the law
export const PLAIN_CARD_HEAD = \`${head}\n\n${twelve}\`;
export const PLAIN_CARD_SENTENCES = \`${sentences}\`;

`;
const vIdx = s.indexOf('export const VOICES = {'); if (vIdx < 0) throw new Error('VOICES missing');
s = s.slice(0, litStart - '`'.length) + '`${PLAIN_CARD_HEAD}\\n\\n${VOICE_LAW_RECORD}\\n\\n${VOICE_LAW_FORBIDDEN}\\n\\n${PLAIN_CARD_SENTENCES}\\n\\n${VOICE_LAW_STAYS}`' + s.slice(i1 + 1);
s = s.slice(0, vIdx) + decl + s.slice(vIdx);
fs.writeFileSync(p, s); console.log('refactored: law ×3 + Plain card ×2 declared once; Plain composed');
