// THE HOUSE'S NOTES (v0.99.560) — the application reviews every reader turn and corrects course.
// Founder, 2026-09-23: "does the application review responses? … it could seed the next response with extra rails if it
// finds things that break certain rules… an auto philosophical autocorrect." Two tiers:
//   HARD — wrong on its face, cheap to see: the turn is re-asked ONCE with the fault named; the person never sees it.
//   SOFT — judgment calls: the turn ships, its notes ride into the NEXT call as "the house's notes on your last turn"
//          (never mentioned on glass), and into the export as watch lines. A fresh vessel every turn means the review has
//          to travel in the record or it does not exist — this is how it travels.
// Built on the bake-off's lint (lib/bakeoff/lint.js), pointed at a live reading for the first time.

import { lintOutput } from './bakeoff/lint.js';
import { getComponent } from './corrections.js';

// the 78 traditional names, matched case-insensitively ("the Hermit energy" slipped a case-sensitive check)
const TRAD_RX = (() => { const t = []; for (let i = 0; i < 78; i++) { const n = getComponent(i)?.traditional; if (n) t.push(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); } return t.length ? new RegExp(`\\b(?:${t.join('|')})\\b`, 'i') : null; })();

const BIOGRAPHY_RX = /\byou(?:'ve| have)? (?:never|haven't|not once)\b|without anyone knowing|nobody (?:knows|has heard)|no one (?:knows|has heard)|whole years of this|you keep it (?:from|to yourself)/i;
const GAP_RX = /\b(?:a gap|the gap|what(?:'s| is) missing|isn'?t online|not online|no floor|has no bottom|what you haven'?t built)\b/i;
const OPENERS = ['okay', 'so', "here's the thing", 'look', 'not gonna lie', 'real talk', 'the thing is'];

const firstWords = (t, n = 4) => String(t || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').trim().split(/\s+/).slice(0, n).join(' ');
const phrases = (t, n = 6) => { const w = String(t || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').trim().split(/\s+/).filter(Boolean); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };

/**
 * obj: the parsed reply · register: plain|grown|map|deep|mystical · prev: earlier reader turns (oldest → newest)
 * cardBalanced: the card in play is Balanced · isOpening: first turn
 * returns { hard: [string], soft: [string], flags: [{code, detail}] }
 */
export function reviewTurn({ obj, register = 'plain', prev = [], cardBalanced = false, isOpening = false }) {
  const hard = [], soft = [];
  const text = String(obj?.reader || '');
  if (!text.trim()) return { hard, soft, flags: [] };
  let flags = [];
  try { flags = lintOutput({ text, parsed: obj, preset: { kind: 'opening' }, hostile: false }).flags || []; } catch { flags = []; }
  const plainish = register === 'plain' || register === 'grown';
  for (const f of flags) {
    if (f.code === 'names') hard.push(`you wrote a name that is not this map's (${f.detail}); use only the canonical names in the record, or none`);
    else if (f.code === 'denies') hard.push(`the turn ${f.detail} — the house's stance is the opposite; answer as the one in the room`);
    else if (f.code === 'story') hard.push(`you told an inherited picture-story (${f.detail}); the meaning of a card is in the record only`);
    else if (f.code === 'hedge') soft.push(`you hedged (${f.detail}); say what the draw says, plainly`);
    else if (f.code === 'vocab' && plainish) soft.push(`the map's vocabulary reached the glass in a plain register (${f.detail}); felt meaning only`);
    // 'words', 'envelope', 'repeat', 'json' are handled elsewhere or not a note
  }
  if (TRAD_RX && TRAD_RX.test(`${text}\n${obj?.medicine || ''}\n${obj?.question || ''}`)) { const m = `${text}\n${obj?.medicine || ''}`.match(TRAD_RX); hard.push(`you wrote a traditional name (${m ? m[0] : 'a tarot name'}); new decks carry none of that — use the record's names, or none`); }
  if (BIOGRAPHY_RX.test(text)) soft.push('you asserted something about their history the card did not give you — offer it as a hunch question next time, and if they have already answered it, believe them');
  if (cardBalanced && GAP_RX.test(text)) soft.push('the card in play is Balanced and you named a gap; nothing is missing — the growth partner is an invitation, not a deficiency');
  if (!isOpening && prev.length) {
    const last = prev[prev.length - 1];
    const op = OPENERS.find((o) => text.toLowerCase().startsWith(o)); const opPrev = OPENERS.find((o) => String(last?.text || '').toLowerCase().startsWith(o));
    if (op && op === opPrev) soft.push(`"${op}" twice running; retire it`);
    else { const mine = firstWords(text), theirs = firstWords(last?.text); if (mine && mine === theirs) soft.push(`you opened two turns the same way ("${mine}…"); every turn opens in its own way`); }
    const strip = (t) => OPENERS.reduce((s, o) => (s.toLowerCase().startsWith(o) ? s.slice(o.length) : s), String(t || ''));
    const mineP = phrases(strip(text)); let reused = null;
    for (const p of prev.slice(-3)) { for (const ph of phrases(strip(p?.text))) { if (mineP.has(ph)) { reused = ph; break; } } if (reused) break; }
    if (reused) soft.push(`you reused an image or phrase from an earlier turn ("${reused}…"); an image is retired once it has done its work`);
  }
  return { hard: [...new Set(hard)].slice(0, 3), soft: [...new Set(soft)].slice(0, 3), flags };
}

/** The block that rides into the next call. Never on glass. */
export function notesBlock(notes) {
  if (!Array.isArray(notes) || !notes.length) return '';
  return `\n\nTHE HOUSE'S NOTES ON YOUR LAST TURN (correct course quietly — never mention these notes, never apologise for them, never explain yourself; just write the next turn without the fault):\n${notes.slice(0, 3).map((n) => `- ${n}`).join('\n')}`;
}

/** The retry note for a hard fault. */
export function retryNote(hard) {
  if (!Array.isArray(hard) || !hard.length) return '';
  return `\n\nTHE HOUSE CAUGHT THIS IN YOUR TURN:\n${hard.map((n) => `- ${n}`).join('\n')}\nRewrite the whole turn without it — same card, same medicine, same question — and send ONE JSON object only.`;
}
