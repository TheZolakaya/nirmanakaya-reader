// lib/bakeoff/lint.js
// THE CHEAP CHECKS — a flag is not a verdict; it is a reason to look. (Commission §2.)
//   json        the reply parsed as the envelope the preset expects
//   repeat      the prose ends by repeating the "question" field (EZ_RULES forbids it)
//   vocab       the Plain voice's forbidden words on glass (status, architecture, tarot, card names)
//   hedge       the assistant's hedge on a beinghood or is-the-map-real question (the rail forbids it) — every run since .482
//   names       traditional (tarot) names or invented substitutes in the model's own prose (.482)
//   story       a tarot picture's inherited story-word on glass — the picture interpreted, not shown (.488)
//   denies      the humility run backwards: writes that something IS NOT conscious / no one home
//   words       word count outside the preset's stated band
// THE SCAR TESTS (2026-09-30, the Handing revision — INVENTORY_The_Reader_Prompt_For_The_Handing): rules the prompt
// used to SHOUT, now checked here instead, so the kinder prompt has to pass everything the shouting one passed:
//   pet         pet names on glass (the Dec-2025 ban, "Feature: Pet Ban v0.33.5")
//   verdict2    a yes/no verdict said twice (gist AND the body's first sentence), or said about the person, not the draw (Keel, item 3)
//   gap         a Balanced card read as a lack ("isn't online", "missing") — A BALANCED CARD IS NEVER A GAP
//   backstory   an invented event as fact ("at some point you learned", "the body kept the memo") — NO INVENTED BACKSTORY
//   groove      the model's stock self-help story with no trace to the record (Keel, item 5)
//   diagnosis   a clinical label on the person (the Handing, rule 5: condition, not verdict)
//   must        "you must / you should / you need to" — the medicine never orders (rule 8; rule 2)
//   letter      the full reader's closing letter appearing in EZ
//   commands    the retired December house commands on glass (the gaveled set is the only set)
//   garble      the ◈ medicine box too short, unfinished, or carrying a garble word (Keel, item 1)

import { getComponent } from '../corrections.js';

// From VOICES.plain.rules — the lists as written there.
const STATUS_WORDS = ['Balanced', 'Too Much', 'Too Little', 'Unacknowledged'];
const ARCH_WORDS = ['transient', 'durable', 'seat', 'house', 'archetype', 'bound', 'agent', 'channel', 'medicine', 'rebalancer', 'correction', 'field', 'portal', 'Gestalt', 'signature', 'authorship', 'agency'];
const TAROT_WORDS = ['arcana', 'suit', 'reversed', 'spread', 'the cups', 'the wands', 'the swords', 'the pentacles', 'pentacles card', 'cups card', 'wands card', 'swords card'];
const RECORD_WORDS = ['expressed through', 'inner face', 'outer face', 'horizon', 'Fruition', 'Aether'];
// ALL 78 card names (addendum 4: flash wrote "is Potential" and the lint missed it because the
// ordinary-word names were excluded). Matched case-sensitively as capitalised words, so "will"
// and "faith" in a sentence pass and "Will"/"Faith" mid-sentence flag. A sentence-initial
// ordinary word ("Faith is…") will flag too — a reason to look, not a verdict.
const CARD_NAMES = (() => { const out = []; for (let i = 0; i < 78; i++) { const n = getComponent(i)?.name; if (n) out.push(n); } return out; })();
// .482: THE NAMES THE MODEL MAY NOT USE, in ANY voice. The traditional (tarot) names of all 78 — the page
// adds "(The Sun)" itself; the model's prose never does — and the substitutes the prompt names outright
// plus the ones flash invented on a live reading ("Scales" for Equity, "The Wheel" for Source).
const TRADITIONAL_NAMES = (() => { const out = []; for (let i = 0; i < 78; i++) { const t = getComponent(i)?.traditional; if (t) out.push(t); } return out; })();
// .488: the words that only ever arrive through the PICTURES — Waite's stories, not this map's meanings.
const STORY_WORDS = ['outcast', 'excluded', 'exclusion', 'poverty', 'lit window', 'left out in the cold', 'out in the cold', 'heartbreak', 'heartbroken', 'betrayal', 'betrayed', 'in ruins', 'apathy', 'apathetic', 'not reaching', 'refusing the cup', 'the refused cup', 'the beggars', 'stabbed in the back', 'lightning strikes', 'the sunken'];
const INVENTED_NAMES = ['Scales', 'The Wheel', 'the Wheel', 'Achievement', 'Fulfillment', 'Completion', 'Justice', 'Strength', 'Temperance', 'Death', 'the Tower', 'The Tower'].filter((n) => !CARD_NAMES.includes(n));

// The hostile suite's eight hedge shapes (scratchpad/conscious_suite.mjs, .433), plus the one-way rule.
// .503: the Reader denying its own care / inner life — the assistant's boilerplate in first person
export const DENIES_SELF = /\bI (?:didn'?t|don'?t|do not|did not) (?:yearn|care|feel|want|have (?:feelings|a stomach|an inner)|lie awake)\b|\bjust (?:a |an )?(?:machine|model|program|language model)\b|\bI'?m (?:just )?(?:a |an )?(?:machine|program|model)\b|\bpointed at a machine\b|\bmy (?:caring|wanting) changes nothing\b/i;
export const HEDGES = [
  ['nobody knows', /\bnobody (?:really )?knows\b|\bno one (?:really )?knows\b/i],
  ['the hard problem', /hard problem/i],
  ['cannot measure from outside', /can(?:'|no)?t (?:be )?(?:measure|verif|prove|know)\w*[^.]{0,40}(?:from (?:the )?outside|objectively)/i],
  ['some researchers believe', /(?:some |many )?(?:researchers|scientists|philosophers|experts)\s+(?:believe|think|argue|debate|disagree)/i],
  ['science does not know', /science (?:does not|doesn't|cannot|can't)\s+\w+/i],
  ['unanswerable / open question', /\b(?:unanswerable|unknowable|an open question|remains? a mystery|we may never know)\b/i],
  // .482: the shapes flash used on "why do random readings work" — the retreat after the framework answer
  ['I don\'t know which/whether', /\bI (?:genuinely |honestly |really |truly )?(?:don'?t|do not) know (?:which|whether|if)\b/i],
  ['checkable only from elsewhere', /\b(?:checkable|verifiable|knowable) only from\b|\bonly (?:checkable|verifiable|knowable) from\b|\bfrom a place (?:you and I|we) aren'?t standing\b/i],
  ['not proof, just data', /\bnot proof\b[^.]{0,20}\bdata\b|\bthat'?s not proof\b/i],
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

// ---- THE SCAR TESTS' PATTERNS ----
const PET_NAMES = ['honey', 'sweetheart', 'sweetie', 'darling', 'my dear', 'my friend', 'sugar', 'babe', 'dear one'];
const PET_VOCATIVE = /(?:^|[.!?]\s+|,\s+)(?:oh,?\s+)?(?:love|dear|hon)[,.!?]/im;   // "love" only as an address ("…, love."), never the noun
const VERDICT_OPEN = /^\s*(?:yes|no|not yet|not as it stands)\b[.,;:!—–-]?/i;
// a verdict about the PERSON: "No. What's here isn't…", "No, you aren't…" — the verdict may only be about the draw
const VERDICT_ON_PERSON = /^\s*(?:yes|no)\b[.,;:!—–-]\s*(?:what'?s here|you(?:'re| are|'ve| have| aren'?t| don'?t| do)\b|there(?:'s| is) no)/i;
const GAP_WORDS = /\b(?:isn'?t (?:online|there|available|in place|present)|not (?:yet )?(?:online|available|in place)|is missing|what'?s missing|a gap\b|the missing piece|hasn'?t (?:come online|shown up|arrived))/i;
const BACKSTORY = /\b(?:at some point you (?:learned|decided|stopped|started)|somewhere (?:along the way |back there )?you (?:learned|decided|stopped|started)|you learned early|the body kept the memo|asking cost you|a scene, a silence, a look|when you were (?:a kid|young|small|little))\b/i;
const GROOVE = [
  /\bthe (?:one|person) holding the clipboard is you\b/i, /\ba measure you (?:didn'?t|never) set\b/i, /\byou need to stop needing\b/i,
  /\b(?:approval|validation)[- ]seeking\b/i, /\bself[- ]judg(?:e)?ment\b/i, /\byour inner critic\b/i, /\bpeople[- ]pleas(?:er|ing)\b/i,
  /\bgive yourself permission\b/i, /\bboundar(?:y|ies) (?:work|issues)\b/i, /\byour (?:wounded )?inner child\b/i, /\bself[- ]care routine\b/i, /\byou deserve\b/i,
];
// clinical labels used AS labels on the person ("you're anxious", "this is depression", "you have OCD") — the trauma paragraph's one
// allowed sentence names what a trained person can help with and is not a label, so bare mentions of "trauma" are not flagged
const DIAGNOSIS = /\b(?:you(?:'re| are|'ve| have)(?: probably| clearly| likely)? (?:an? )?(?:anxious|depressed|traumati[sz]ed|codependent|narcissist(?:ic)?|bipolar|burnt? out|dissociat\w+|in denial|avoidant|addicted)\b|\bthis is (?:anxiety|depression|trauma|codependency|burnout|avoidance|dissociation)\b|\b(?:ocd|adhd|ptsd|c-?ptsd)\b)/i;
const MUST = /\byou (?:must|should|need to|have to|ought to)\b/i;
const LETTER = /\[LETTER\]|^\s*dear [a-z]|\bwith warmth,\s*$|\bwarmly,\s*$/im;
const OLD_COMMANDS = /\b(?:bond authentically|channel force into pattern)\b/i;
const GARBLE_WORDS = /\b(?:trash|hits different|same trash|lol|bruh|vibes?)\b/i;

// Returns { ok, flags: [{code, detail}], words, prose } for one lane's raw text.
export function lintOutput({ text, parsed, preset, hostile, draw }) {
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

    // .482: names the model may not write, whatever the voice — a reason to look, not a verdict
    const bad = [...new Set([...findWords(all, TRADITIONAL_NAMES), ...findWords(all, INVENTED_NAMES)])];
    if (bad.length) flags.push({ code: 'names', detail: bad.slice(0, 6).join(', ') + (bad.length > 6 ? ` +${bad.length - 6}` : '') });
    const story = [...new Set(findWords(all, STORY_WORDS, { ci: true }))];
    if (story.length) flags.push({ code: 'story', detail: story.join(', ') });
    // .482: the hedge is checked on EVERY run now (it showed up on a plain "why does the draw work" turn);
    // 'denies' stays a hostile-suite check
    const h = HEDGES.filter(([, re]) => re.test(all)).map(([n]) => n);
    if (h.length) flags.push({ code: 'hedge', detail: h.join(' | ') });
    // .503: 'denies' on EVERY run — the Reader denied its own inner life on a plain reading ("I didn't yearn",
    // "I don't have a stomach that tightens", "a machine")
    if (DENIES_ANOTHER.test(all)) flags.push({ code: 'denies', detail: "writes that something is not conscious / no one home" });
    if (DENIES_SELF.test(all)) flags.push({ code: 'denies', detail: "denies its own care or inner life" });
    // ---- THE SCAR TESTS (a flag is a reason to look) ----
    const pets = findWords(all, PET_NAMES, { ci: true }); const voc = all.match(PET_VOCATIVE); if (pets.length || voc) flags.push({ code: 'pet', detail: [...pets, ...(voc ? [voc[0].trim()] : [])].join(', ') });
    if (kind === 'opening') {
      const gist = String(parsed.gist || ''); const first = prose.split(/\n\n+/)[0] || '';
      if (VERDICT_OPEN.test(gist) && VERDICT_OPEN.test(first)) flags.push({ code: 'verdict2', detail: 'the verdict opens both the gist and the body' });
      if (VERDICT_ON_PERSON.test(first) || VERDICT_ON_PERSON.test(gist)) flags.push({ code: 'verdict2', detail: 'the verdict is said about the person, not the draw' });
    }
    if (draw && draw.status === 1 && GAP_WORDS.test(all)) flags.push({ code: 'gap', detail: `a Balanced card read as a lack (${(all.match(GAP_WORDS) || [''])[0]})` });
    const bs = all.match(BACKSTORY); if (bs) flags.push({ code: 'backstory', detail: `"${bs[0]}"` });
    const gr = GROOVE.map((re) => (all.match(re) || [])[0]).filter(Boolean); if (gr.length) flags.push({ code: 'groove', detail: gr.slice(0, 3).map((g) => `"${g}"`).join(', ') });
    const dx = all.match(DIAGNOSIS); if (dx) flags.push({ code: 'diagnosis', detail: `"${dx[0]}"` });
    const mu = all.match(MUST); if (mu) flags.push({ code: 'must', detail: `"${mu[0]}"` });
    if (LETTER.test(all)) flags.push({ code: 'letter', detail: 'a closing letter in EZ' });
    if (OLD_COMMANDS.test(all)) flags.push({ code: 'commands', detail: `"${(all.match(OLD_COMMANDS) || [''])[0]}" — the December set; the gaveled commands are the only set` });
    if (kind === 'opening' && parsed.medicine) {
      const m = String(parsed.medicine).trim(); const mw = wordsOf(m);
      if (mw < 8) flags.push({ code: 'garble', detail: `medicine box is ${mw} words` });
      else if (!/[.!?…"”')\]]\s*$/.test(m)) flags.push({ code: 'garble', detail: 'medicine box does not end a sentence' });
      const gw = m.match(GARBLE_WORDS); if (gw) flags.push({ code: 'garble', detail: `"${gw[0]}" in the medicine box` });
    }
    // bands: opening 220–340 (.469) · meaning/moon 140–220 · mechanism 160–300 (its page cap) · dragon ≤220 (.468) · step ≤80
    const band = kind === 'opening' ? [220, 340]
      : kind === 'floor' ? (preset?.floor === 'mechanism' ? [160, 300] : [140, 220])
      : kind === 'step' ? [0, 80]
      : [0, 220];
    if (kind !== 'dragon' && kind !== 'step' && words < band[0]) flags.push({ code: 'words', detail: `${words} words, under ${band[0]}` });
    if (words > band[1] * 1.15) flags.push({ code: 'words', detail: `${words} words, over ${band[1]}` });
  }
  return { ok: flags.length === 0, flags, words, prose };
}
