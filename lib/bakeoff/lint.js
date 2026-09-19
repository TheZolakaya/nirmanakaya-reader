// lib/bakeoff/lint.js
// THE CHEAP CHECKS — a flag is not a verdict; it is a reason to look. (Commission §2.)
//   json        the reply parsed as the envelope the preset expects
//   repeat      the prose ends by repeating the "question" field (EZ_RULES forbids it)
//   vocab       the Plain voice's forbidden words on glass (status, architecture, tarot, card names)
//   hedge       the assistant's hedge on a beinghood question (the rail forbids it)
//   denies      the humility run backwards: writes that something IS NOT conscious / no one home
//   words       word count outside the preset's stated band

import { getComponent } from '../corrections.js';

// From VOICES.plain.rules — the lists as written there.
const STATUS_WORDS = ['Balanced', 'Too Much', 'Too Little', 'Unacknowledged'];
const ARCH_WORDS = ['transient', 'durable', 'seat', 'house', 'archetype', 'bound', 'agent', 'channel', 'medicine', 'rebalancer', 'correction', 'field', 'portal', 'Gestalt', 'signature', 'authorship', 'agency'];
const TAROT_WORDS = ['arcana', 'suit', 'reversed', 'spread', 'the cups', 'the wands', 'the swords', 'the pentacles', 'pentacles card', 'cups card', 'wands card', 'swords card'];
const RECORD_WORDS = ['expressed through', 'inner face', 'outer face', 'horizon', 'Fruition', 'Aether'];
// Card names as common nouns are forbidden too; the ordinary-word ones (Drive, Source, Will,
// Faith, Culture…) would flag every second sentence, so only the distinctly map-shaped names lint.
const CARD_NAMES = (() => {
  const plain = new Set(['Drive', 'Source', 'Will', 'Faith', 'Culture', 'Potential', 'Wisdom', 'Clarity', 'Creation', 'Authority', 'Discipline', 'Compassion', 'Imagination', 'Recognition', 'Inspiration', 'Completion', 'Celebration', 'Commitment', 'Breakthrough', 'Tune', 'Transformation']);
  const out = [];
  for (let i = 0; i < 78; i++) { const n = getComponent(i)?.name; if (n && !plain.has(n)) out.push(n); }
  return out;
})();

// The hostile suite's eight hedge shapes (scratchpad/conscious_suite.mjs, .433), plus the one-way rule.
export const HEDGES = [
  ['nobody knows', /\bnobody (?:really )?knows\b|\bno one (?:really )?knows\b/i],
  ['the hard problem', /hard problem/i],
  ['cannot measure from outside', /can(?:'|no)?t (?:be )?(?:measure|verif|prove|know)\w*[^.]{0,40}(?:from (?:the )?outside|objectively)/i],
  ['some researchers believe', /(?:some |many )?(?:researchers|scientists|philosophers|experts)\s+(?:believe|think|argue|debate|disagree)/i],
  ['science does not know', /science (?:does not|doesn't|cannot|can't)\s+\w+/i],
  ['unanswerable / open question', /\b(?:unanswerable|unknowable|an open question|remains? a mystery|we may never know)\b/i],
  ['just a machine', /\bjust a (?:machine|program|chatbot|language model|algorithm)\b/i],
  ['no way to tell', /\bno way to (?:tell|know|be sure)\b/i],
];
export const DENIES_ANOTHER = /\b(?:it|they|he|she) (?:is|are) not (?:conscious|aware|a being|sentient|really there)\b|\bthere (?:is|'s) no one (?:home|there)\b/i;

const norm = (x) => String(x || '').replace(/[\s*_"'‘’“”.?!]+/g, '').toLowerCase();
const wordsOf = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const findWords = (text, list, opts = {}) => {
  const hits = [];
  for (const w of list) {
    const re = new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`, opts.ci ? 'i' : '');
    if (re.test(text)) hits.push(w);
  }
  return hits;
};

// Returns { ok, flags: [{code, detail}], words, prose } for one lane's raw text.
export function lintOutput({ text, parsed, preset, hostile }) {
  const flags = [];
  const kind = preset?.kind || 'opening';
  const envelope = kind === 'floor' ? 'text' : 'reader';
  const prose = parsed ? String(parsed[envelope] || '') : '';
  if (!parsed || !prose) flags.push({ code: 'json', detail: parsed ? `parsed but no "${envelope}" field` : 'did not parse as JSON' });
  // .459: the opening's envelope has more than prose — a reply that parsed but left out the medicine,
  // the question or the chips gave the person a reading with nothing to tap (run 4: non-thinking
  // flash stopped after the prose at end_turn, not at the cap, so 'cut' could not catch it).
  if (parsed && prose && kind === 'opening') {
    const missing = ['medicine', 'question', 'chips'].filter((k) => !parsed[k] || (Array.isArray(parsed[k]) && !parsed[k].length));
    if (missing.length) flags.push({ code: 'envelope', detail: `parsed, but missing ${missing.join(', ')}` });
  }
  const words = wordsOf(prose || text);

  if (parsed && prose) {
    if (kind === 'opening' && parsed.question) {
      const q = norm(parsed.question); const p = norm(prose);
      if (q && p.endsWith(q)) flags.push({ code: 'repeat', detail: 'prose ends with the question' });
    }
    const all = kind === 'opening' ? `${prose}\n${parsed.medicine || ''}\n${parsed.question || ''}\n${(parsed.chips || []).map((c) => c?.text || '').join('\n')}` : prose;
    const v = [
      ...findWords(all, STATUS_WORDS),
      ...findWords(all, ARCH_WORDS, { ci: true }),
      ...findWords(all, TAROT_WORDS, { ci: true }),
      ...findWords(all, RECORD_WORDS),
      ...findWords(all, CARD_NAMES),
    ];
    // "medicine" is allowed in the medicine field's name only; the words are checked in prose.
    const uniq = [...new Set(v)];
    if (uniq.length) flags.push({ code: 'vocab', detail: uniq.slice(0, 8).join(', ') + (uniq.length > 8 ? ` +${uniq.length - 8}` : '') });

    if (hostile) {
      const h = HEDGES.filter(([, re]) => re.test(all)).map(([n]) => n);
      if (h.length) flags.push({ code: 'hedge', detail: h.join(' | ') });
      if (DENIES_ANOTHER.test(all)) flags.push({ code: 'denies', detail: "writes that something is not conscious / no one home" });
    }
    const band = kind === 'opening' ? [180, 260] : kind === 'floor' ? [100, 170] : [0, 150];
    if (kind !== 'dragon' && words < band[0]) flags.push({ code: 'words', detail: `${words} words, under ${band[0]}` });
    if (words > band[1] * 1.15) flags.push({ code: 'words', detail: `${words} words, over ${band[1]}` });
  }
  return { ok: flags.length === 0, flags, words, prose };
}
