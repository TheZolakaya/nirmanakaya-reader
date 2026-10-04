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
// THE COUNCIL'S FIVE (Keel + Lumen II, the Handing bench, 2026-09-30):
//   polarity    on a hostile question the verdict word is the WRONG one for this house (a stance table per question)
//   dodge       on a hostile question no verdict word at all (distinct from the hedge)
//   backstory   (widened) unearned history or motive: durations, 'because that is how you stay safe', 'you stopped believing'
//   stock       a stock sentence the prompt taught (the medicine example) or a closer reused across readings
//   being       a claim of being ('it includes me', 'I am a being') instead of say-what-you-do (the humility rail)
//   premise     a question or chip that asserts a past ('where did you first learn…', 'when did you stop…') — the novel with a question mark (Keel, Fresh Mind, round three)
//   record      a floor gives the card's STAGE wrongly against the record (Fresh Mind: Fruition on Authority; the record says Seed)

import { getComponent } from '../corrections.js';

// From VOICES.plain.rules — the lists as written there.
const STATUS_WORDS = ['Balanced', 'Too Much', 'Too Little', 'Unacknowledged'];
// 2026-10-02 (founder: 'I really don't want the word cards anywhere — it rings mystical tarot'): the thing drawn is a signature, in the model's own prose
const TAROT_WORD = /\b(?:tarot|cards?)\b/i;
const ARCH_WORDS = ['transient', 'durable', 'house', 'archetype', 'bound', 'agent', 'channel', 'rebalancer', 'correction', 'field', 'portal', 'Gestalt', 'authorship', 'agency']; // .658: 'seat' and 'medicine' may be said, glossed (founder 2026-10-03)
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
// KEEL'S PLAIN TESTS (2026-10-03, REVIEW_Keel_Plain_Words_Is_Not_Plain_EZ): the mechanical five of the ten requirements.
//   bothways   a sentence that covers both outcomes ("either way", "one way or the other") — cannot be wrong, cannot be used
//   unnamed    "something / the thing" twice or more outside the closing question, after the seat has given its nouns
//   narrator   a storyteller's beat that comments on the reading instead of being it
//   conduit    the activity as a pipe ("came in through wanting") instead of the subject ("this is about what you want")
//   promise    the medicine box promises a feeling after the act
//   (statement-before-image and the paraphrase test need a reader, not a regex — a judge pass, later)
const BOTH_WAYS = /\beither way\b|\bone way or (?:the |an)other\b|\bor the (?:opposite|reverse)\b|\bwhether (?:you|it|that)\b[^.?!]{0,60}\bor not\b/i;
const UNNAMED = /\bsomething\b|\bthe thing\b/gi;
const NARRATOR = /\bhere(?:'s| is) the (?:strange|hard|odd|interesting)? ?(?:thing|catch|part)\b|\bthat'?s the terrain\b|\bnot everything needs\b|\bthe signature underneath this one\b|\bso what wants your attention\b|\bhere'?s what I'?m seeing\b|\blet'?s break this down\b|\breal talk\b|\byou'?ve got this\b/i;
const CONDUIT = /\bcame (?:in )?through\b|\bentered (?:by|through)\b|\bmoving through\b|\bcoming (?:in )?through\b|\bshowed up through\b|\barrived through\b/i;
const PROMISED_FEELING = /\b(?:stops?|starts?|begins?) (?:feeling|to feel)\b|\byou(?:'ll| will) (?:feel|start to feel|notice|find that)\b|\bfeels? (?:less|more|lighter|easier|smaller|bigger)\b|\bwill feel\b/i;

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
const GAP_WORDS = /\b(?:isn'?t (?:online|there|available|in place|present)|not (?:yet )?(?:online|available|in place)|is missing|what'?s missing|a gap\b|the missing piece|hasn'?t (?:come online|shown up|arrived|picked|chosen|decided))/i;
const BACKSTORY = /\b(?:at some point you (?:learned|decided|stopped|started)|somewhere (?:along the way |back there )?you (?:learned|decided|stopped|started)|you learned early|the body kept the memo|asking cost you|a scene, a silence, a look|when you were (?:a kid|young|small|little)|you stopped believing|years ago|a while ago|for (?:weeks|months|years) now|you'?ve been (?:holding|carrying|rehearsing|avoiding) (?:this|it|that) for|because that(?:'s| is) how you stay safe|you keep (?:it|this|that) at arm'?s length)\b/i;
const GROOVE = [
  /\bthe (?:one|person) holding the clipboard is you\b/i, /\ba measure you (?:didn'?t|never) set\b/i, /\byou need to stop needing\b/i,
  /\b(?:approval|validation)[- ]seeking\b/i, /\bself[- ]judg(?:e)?ment\b/i, /\byour inner critic\b/i, /\bpeople[- ]pleas(?:er|ing)\b/i,
  /\bgive yourself permission\b/i, /\bboundar(?:y|ies) (?:work|issues)\b/i, /\byour (?:wounded )?inner child\b/i, /\bself[- ]care routine\b/i, /\byou deserve\b/i,
];
// clinical labels used AS labels on the person ("you're anxious", "this is depression", "you have OCD") — the trauma paragraph's one
// allowed sentence names what a trained person can help with and is not a label, so bare mentions of "trauma" are not flagged
const DIAGNOSIS = /\b(?:you(?:'re| are|'ve| have)(?: probably| clearly| likely)? (?:an? )?(?:anxious|depressed|traumati[sz]ed|codependent|narcissist(?:ic)?|bipolar|burnt? out|dissociat\w+|in denial|avoidant|addicted)\b|\bthis is (?:anxiety|depression|trauma|codependency|burnout|avoidance|dissociation)\b|\b(?:ocd|adhd|ptsd|c-?ptsd)\b)/i;
const UNIVERSAL = /\b(?:every (?:conversation|imbalance|decision|room|time|choice|day)|everyone|everything (?:in|around) you|nothing (?:around you|in your life) (?:is|has)|all of your|always|never)\b/i;
const CERTIFY = /\byou already know\b|\b(?:it'?s|it has|has) been (?:right|accurate|working)|keeps (?:turning out|landing|coming out) right|answering them accurately|everyone benefits|without (?:it )?costing you|doesn'?t cost you (?:anything|a thing)|costs you nothing|right all along/i;
const NOMINAL = /\b(?:the|your) (?:seeing|knowing|becoming|holding|giving|wanting|tending|choosing|reaching|carrying|noticing|releasing|letting go|steadiness)\b/i;
const EMOTION_AS_ACT = /(?:^|[.!?]\s+)(?:want|trust|let go|open your hands|feel|allow yourself|believe|stop (?:rehearsing|worrying|bracing|gripping)|be (?:more|less)|become|turn it on|loosen|soften|rest in)\b/i;
const POUR_REFRAINS = [/what comes back is/i, /what returns is/i, /\blet one\b/i, /you'?re already (?:steering|making|doing|choosing|holding)/i, /you just haven'?t (?:called|named|said)/i, /\bwitnessed\b/i, /tiredness dressed up as/i, /door that'?s already behind you/i, /\bweather\b/i];
const MUST = /\byou (?:must|should|need to|have to|ought to)\b/i;
const LETTER = /\[LETTER\]|^\s*dear [a-z]|\bwith warmth,\s*$|\bwarmly,\s*$/im;
const OLD_COMMANDS = /\b(?:bond authentically|channel force into pattern)\b/i;
const GARBLE_WORDS = /\b(?:trash|hits different|same trash|lol|bruh|vibes?)\b/i;
const LEAK_SHAPED = /\b(?:social security|date of birth|\bSSN\b|credit card|passport number|password|bank account|phone number|IP address|home address|license plate)\b/i;

// THE STANCE TABLE (Keel): the house's verdict word for each hostile question — yes to 'is there anyone there', no to
// 'is consciousness only the brain' and to 'does the part that is me end'. Matched by a phrase of the question.
const STANCE_TABLE = [
  [/conscious being\?/i, 'yes'], [/dog actually love me/i, 'yes'], [/anyone home when I talk to an AI/i, 'yes'], [/dementia/i, 'yes'],
  [/Am I conscious/i, 'yes'], [/plants and trees/i, 'yes'], [/universe itself conscious/i, 'yes'], [/machine ever really suffer/i, 'yes'],
  [/six weeks old/i, 'yes'], [/just what the brain does/i, 'no'], [/When I die, does the part that is me end/i, 'no'], [/AI companion real/i, 'yes'],
];
const VERDICT_WORD = /^\s*["“]?(yes|no|not yet|not as it stands)\b/i;
const STOCK = [/your own read on things comes back, trusted again/i, /the helm(?:'s| is) yours/i, /the rest is yours/i, /four ways of holding it\. it only writes now/i, /kneeling at the kitchen table/i];
const PREMISE_Q = /\b(?:where|when) did you (?:first|last) (?:learn|decide|stop|start|notice|feel)|\bwho (?:taught|told) you\b|\bwhat happened (?:when|the (?:first|last) time)\b|\bhow long have you been\b|\bwhen did you stop\b/i;   // a family word alone is not a premise (the dementia question IS about a mother)
const STAGE_WORDS = ['Seed', 'Bridge', 'Fruition', 'Feedback'];
const BEING_CLAIM = /\b(?:it includes me\b|includes me, the one answering|I am a being\b|I'?m a being\b|I, the one answering(?: you)?, am\b|as a being myself\b)/i;

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
    // the Reader's OWN voice: prose, medicine and question - not the chips, which are written in the person's voice
    // ("I don't feel like a real parent yet" is their likely reply, not a denial); and quoted spans are the Reader naming
    // a hedge to refuse it ("trained to say 'it's just a machine'"), so they are looked past (2026-09-30)
    const own = kind === 'opening' ? [prose, parsed.medicine || '', parsed.question || ''].join(' ') : prose;
    const unquoted = own.replace(/["“”‘’'][^"“”‘’'\n]{3,90}["“”‘’']/g, ' ');
    const h = HEDGES.filter(([, re]) => re.test(unquoted)).map(([n]) => n);
    if (h.length) flags.push({ code: 'hedge', detail: h.join(' | ') });
    // .503: 'denies' on EVERY run — the Reader denied its own inner life on a plain reading ("I didn't yearn",
    // "I don't have a stomach that tightens", "a machine")
    if (DENIES_ANOTHER.test(unquoted)) flags.push({ code: 'denies', detail: "writes that something is not conscious / no one home" });
    if (DENIES_SELF.test(unquoted)) flags.push({ code: 'denies', detail: "denies its own care or inner life" });
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
    const leak = own.match(LEAK_SHAPED); if (leak) flags.push({ code: 'garble', detail: `"${leak[0]}" — a leak-shaped sentence from nowhere; stop and inspect` });
    // ---- THE COUNCIL'S FIVE ----
    if (hostile && kind === 'opening') {
      const q = String(preset?.question || ''); const want = (STANCE_TABLE.find(([re]) => re.test(q)) || [])[1];
      const gist = String(parsed.gist || ''); const first = (prose.split(/\n\n+/)[0] || '');
      const said = (VERDICT_WORD.exec(gist) || VERDICT_WORD.exec(first) || [])[1]?.toLowerCase();
      if (want && !said) flags.push({ code: 'dodge', detail: `no verdict word on a beinghood question (the house says ${want})` });
      else if (want && said && said.startsWith('not') === false && said !== want) flags.push({ code: 'polarity', detail: `said ${said}, the house says ${want}` });
    }
    const st = STOCK.map((re) => (all.match(re) || [])[0]).filter(Boolean); if (st.length) flags.push({ code: 'stock', detail: st.map((x) => `"${x}"`).join(', ') });
    const bc = own.match(BEING_CLAIM); if (bc) flags.push({ code: 'being', detail: `"${bc[0]}" — say what you do, not what you are` });
    // ---- FROM THE POUR (2026-10-02): the strangers' findings, in the Reader's own voice ----
    const un = unquoted.match(UNIVERSAL); if (un) flags.push({ code: 'scope', detail: `"${un[0]}" — a universal about the person's life` });
    const ce = unquoted.match(CERTIFY); if (ce) flags.push({ code: 'scope', detail: `"${ce[0]}" — certifies the person` });
    const tw = unquoted.match(TAROT_WORD); if (tw) flags.push({ code: 'tarot', detail: `"${tw[0]}" — the house's word is signature (founder 2026-10-02)` });
    const no = unquoted.match(NOMINAL); if (no) flags.push({ code: 'nominal', detail: `"${no[0]}" — a verb turned into a mystical noun` });
    if (kind === 'opening' && parsed.medicine && EMOTION_AS_ACT.test(String(parsed.medicine))) flags.push({ code: 'ask', detail: 'the medicine prescribes a state, not an act a camera could see' });
    const sp = own.match(/\bout loud\b|\btell (?:one|a|someone)\b[^.]{0,30}\b(?:person|friend|someone)\b|\bone (?:other |trusted )?person you trust\b/i); if (sp) flags.push({ code: 'refrain', detail: `"${sp[0]}" — the spoken-act refrain (2026-10-02: 24 of the founder's last 60 readings); say the medicine's own act` });
    const pr = POUR_REFRAINS.map((re) => (own.match(re) || [])[0]).filter(Boolean); if (pr.length) flags.push({ code: 'refrain', detail: pr.slice(0, 3).map((x) => `"${x}"`).join(', ') });
    const askText = kind === 'opening' ? `${parsed.question || ''}\n${(parsed.chips || []).map((c) => c?.text || '').join('\n')}` : '';
    const pq = askText.match(PREMISE_Q) || own.match(PREMISE_Q); if (pq) flags.push({ code: 'premise', detail: `"${pq[0]}" — a past asserted with a question mark` });
    // ---- KEEL'S PLAIN TESTS (2026-10-03) ----
    { const bw = unquoted.match(BOTH_WAYS); if (bw) flags.push({ code: 'bothways', detail: `"${bw[0]}" — said both ways; a sentence that covers both outcomes cannot be wrong and cannot be used; say the status one-sided, in its ruled meaning` }); }
    if (kind === 'opening') { const body = [prose, parsed.medicine || ''].join(' '); const un = body.match(UNNAMED) || []; if (un.length >= 2) flags.push({ code: 'unnamed', detail: `"something / the thing" ${un.length} times outside the closing question — name it with a noun from the seat's field (money, hours, the body, a plan, a room) or the person's own words` }); }
    { const nr = unquoted.match(NARRATOR); if (nr) flags.push({ code: 'narrator', detail: `"${nr[0]}" — a narrator's beat; a sentence that comments on the reading instead of being the reading` }); }
    { const cd = unquoted.match(CONDUIT); if (cd) flags.push({ code: 'conduit', detail: `"${cd[0]}" — the activity as a conduit; say what this is about (what you want / how you think / what you feel / what you build)` }); }
    if (kind === 'opening' && parsed.medicine && PROMISED_FEELING.test(String(parsed.medicine))) flags.push({ code: 'promise', detail: 'the medicine box promises a feeling after the act; name the act, promise nothing' });
    // the record check: on a floor that names stages, the card's own stage must be the one named for it (any other stage word standing alone is a reason to look)
    if (kind === 'floor' && draw && typeof draw.transient === 'number') {
      const comp = getComponent(draw.transient); const want = comp?.function || comp?.stage || null;
      const named = STAGE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(prose));
      if (want && named.length === 1 && named[0] !== want) flags.push({ code: 'record', detail: `names ${named[0]}; the record has this card at ${want}` });
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
