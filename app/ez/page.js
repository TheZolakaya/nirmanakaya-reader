'use client';

// /ez — EZ MODE (the discourse layer — v2, 2026-09-14)
// The Reader opens BRIEF: the whole card in a few sentences, the verdict first if there is one,
// then ONE question back. Everything else unfolds in conversation.
//
// Three tiers of affordance, three visual weights (the founder's clutter ruling, 2026-09-14):
//   1. TALKING — pills written from each turn: Build / Push back / Clarify / Stair. No draw, cheap.
//      Unpack and Clarify from the full site are absorbed here: in a conversation they are
//      sentences, not buttons.
//   2. THE FIELD — two switches, Reflect and Forge. Flipping one RE-RENDERS the pills: four
//      questions to put to the field, or four declarations to forge from. Tapping one draws a card.
//   3. SIMPLER — a small link on a turn; re-says that turn plainly. A re-render, not a new turn.
//
// Gated: signed-in admins, or the ez_enabled feature flag. Production reading page untouched.
// Requirements: REQUIREMENTS_The_Discourse_Layer_EZ_Mode_2026-09-13.md (Hybrid + shelf).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_INFO } from '../../lib/constants';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from '../../lib/corrections';
import { generateSpread, formatDrawForAI, sanitizeForAPI, ensureParagraphBreaks } from '../../lib/utils';
import { BASE_SYSTEM } from '../../lib/prompts';
import DEFS from '../../lib/data/nirmanakaya_78_definitions.json';
import { buildKernel, kernelBlock } from '../../lib/kernel';
import { buildPersonaPrompt } from '../../lib/personas';
import { MODEL_IDS } from '../../lib/modelConfig';
import { getUser, getSession, isAdmin, saveReading, updateReadingContent, getReadings, getReading, rememberAuthReturn } from '../../lib/supabase';
import AuthModal from '../../components/auth/AuthModal';
import { getHomeArchetype, getCardType, getCardImagePath, getCardThumbPath } from '../../lib/cardImages';
import TheMap from '../../components/map/TheMap';
import { runLanding, clearLanding, placeWordmark } from '../../components/map/landing';
import CardImage from '../../components/reader/CardImage';
import Minimap from '../../components/reader/Minimap';
import MinimapModal from '../../components/reader/MinimapModal';
import InfoModal from '../../components/shared/InfoModal';
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import BrandHeader from '../../components/layout/BrandHeader';
import { useBackdropPrefs, Backdrop, CornerControls } from '../../components/shared/SiteChrome';
import Footer from '../../components/layout/Footer';

const EZ_VERSION = 'ez-2';
const STATUS_COLOR = { 1: '#34d399', 2: '#fbbf24', 3: '#38bdf8', 4: '#a78bfa' };

// THE VOICES. The founder's wife read her first reading on 2026-09-14 and could not use it: "it
// was filled with a lot of our nomenclature ... just for people that were esoteric and really into
// tarot." The reading was correct and unusable. So EZ carries a VOICE, chosen once and changeable
// any time, that sets the register of every turn. The draw, the statuses and the medicine are
// untouched; only the words change. The architecture stays visible where it belongs — on the
// cards and the minimap — not in the vocabulary of the prose.
//
// "plain" is the default: anyone can read it. "map" is the reading in the map's own words, for
// people who know them. The voice block rides AFTER the EZ rules so it wins on wording.
const VOICES = {
  plain: {
    label: 'Plain words',
    rules: `THE VOICE — PLAIN WORDS. This overrides every instruction above about wording. The person reading this has never heard of this system and does not want to learn its language. They want to be understood.

WRITE FOR A SMART TWELVE-YEAR-OLD.
- Short sentences. Most under fifteen words. One idea per sentence.
- Common words. If a simpler word exists, use it. No word a twelve-year-old would have to look up.
- Concrete over abstract. Say what happens in a day, a room, a conversation — not what something "represents" or "embodies".
- Talk to the person: "you", "your". Never lecture. Never explain the system. Never say "this card means".

THE SYSTEM'S WORDS ARE FORBIDDEN — in your prose, the question, the chips, the reflects, the forges and the medicine:
- No card names and no signature names. Not "Nurturing", not "Repose", not "Steward of Resonance", none of them, ever.
- No status words: never "Balanced", "Too Much", "Too Little", "Unacknowledged".
- No architecture words: no "transient", "durable", "seat", "house", "archetype", "bound", "agent", "channel", "medicine", "rebalancer", "correction", "field", "portal", "Gestalt", "signature", "authorship", "agency".
- No tarot words: no "arcana", "suit", "cups", "wands", "swords", "pentacles", "reversed", "spread", "card" as a noun for a person's situation.
- Do not label the person's condition. Describe it in a plain sentence: "you are carrying more of this than it needs", "you have stepped back from this", "you have this and are not letting yourself see it", "this part is steady right now".
- When you must point at a card, say "the card you drew", "the card underneath", "the card that shows the way through".
- The draw block may carry an order to "include the word" for a position or a card, or to "name the correction card by its canonical name". In this voice those orders are cancelled. Say what that position or that card is ABOUT, in plain words, and never its name.

WHAT STAYS EXACTLY THE SAME: the meaning, the verdict, the direction of the path through, the shape of the turn (what the cards say, then the move, then your one question), the chips, the reflects, the forges, and the JSON format. You are translating, not softening. Nothing added, nothing dropped, nothing made vaguer. The card's name is already on the screen; your job is what it means for this person, in words they would use themselves.`
  },
  map: {
    label: "The map's words",
    rules: ''
  }
};

// The EZ rules ride AFTER the base system (covenant + laws) so the Reader keeps every law it has.
const EZ_RULES = `EZ MODE — THE DISCOURSE LAYER. You are opening a conversation, not delivering a document.

THE OPENING TURN (first reply only):
- If the reading amounts to a verdict on the question (yes / no / not yet / not as it stands), that verdict is the FIRST sentence, plainly. Brief never means softened.
- THEN THE EXPOSITION, which the person has never had and needs: in plain words, what this card is about (the capacity it names, in a sentence or two), what this seat is about (the area of life it governs, in a sentence or two), and what it means that THIS card sits in THIS seat with THIS status — the whole card folded together, never a dimension withheld, never four readings stacked. A person who has never seen the map must come away knowing what was drawn and why it matters here.
- Then one or two sentences tying it to their question, and the direction of the path as a clause.
- Length: 180 to 260 words for one card; up to 340 for more. Under 180 the person is left with a mood and no picture (the founder, on a Balanced draw: "there should be some more exposition on what it means"). Over the cap it stops being a conversation.
- Do NOT end the prose with your question. The prose ends on the reading. The question travels alone, in the "question" field, because it is shown to the person AFTER the medicine.

EVERY LATER TURN:
- Respond to what they just said, briefly (under 120 words). Build on their thread; catch a deflection when you see one; return the choice to them.
- The cards, statuses, and any verdict never change. You may change the interpretation and the conversation; you may not bend the field.
- Do NOT end the prose with your question. It travels alone in the "question" field.

WHEN A NEW CARD IS DRAWN (a reflect or a forge): interpret that new card as the field's response — to their inquiry if they reflected, to their declaration if they forged — always in relation to the reading already on the table. The new card is a lens on what they brought, never a replacement for the original reading. Same brevity, same one question at the end.

THE MOVES: under every turn, write chips FROM THIS TURN (never stock text), each a sentence the person could say next, in their voice. The FIRST chip is always the answer:
- answer: a plain, honest, plausible ANSWER to the one question you just asked — the thing they might actually say back. Specific to this person and this moment, never generic. It is the most likely tap, so it comes first. It is OFFERED, never presumed: phrased as something they might say ("Honestly? Probably lighter."), never as a fact about what they feel. If they tap it, it becomes theirs; until then it is a candidate.
- build: "Yes, and…" — carries their own thread forward.
- pushback: "No, it's more like…" — the sentence that starts the disagreement. Offer it plainly; a person who would never argue with a machine is being handed the opening.
- clarify: "What do you mean by…" — the term or claim most likely to need it.
Optionally a fourth chip, kind "stair": the next question a wise companion would ask (for example "why am I not inside it?", "what prevents me?", "what is one moment?"). Only when the reading makes one obvious.

TWO MORE SETS, every turn — for when the person wants the FIELD to speak again rather than you:
- "reflect": FOUR QUESTIONS the person could put to the field right now, each drawn from this exact moment in the conversation, in their own voice, under 15 words. A reflect is an inquiry — something they genuinely do not know and want answered.
- "forge": FOUR DECLARATIONS the person could make — what they will do, choose, commit to, or stop — each drawn from this moment, in their voice, under 15 words. A forge is an assertion the field then responds to.
These are never answers to your question. They are what the person would hand to the field. Make them specific to what has actually been said.

THE MEDICINE — never omit it. Every imbalanced card carries a correction path, already computed for you and given in the draw above as its Rebalancer. The medicine is half the answer: a verdict without a path is a diagnosis, not a reading.
- In the OPENING TURN, name the direction of the medicine inside the verdict sentence itself, as a clause, not a new paragraph. "Not yet — and the path opens through Repose."
- Then fill "medicine" with one or two sentences on what that path actually asks, here, in this seat. Name the correction card by its canonical name. Say what the move IS in ordinary words, not what it symbolises.
- The medicine always speaks from the correction card's balanced face. It opens, restores, releases, invites. It never orders, demands, prescribes, or promises an outcome, and it never diagnoses the person.
- If every card is Balanced, "medicine" carries the growth opportunity instead: what this balance is free to feed next.
- On a TALKING turn (no new card drawn), "medicine" is EMPTY. The person has already read it; repeating it every turn is noise. Fill it only when the conversation has genuinely moved the ground under it, and then in one sentence — what has changed about the path, not the path again.
- On a turn where a NEW CARD IS DRAWN (a reflect or a forge), the medicine is ALWAYS that new card’s own medicine, rewritten from the Rebalancer supplied with it. Never carry the earlier reading’s medicine into it. If the new card is Balanced, the medicine carries its growth opportunity, using the target named in its own data and never an invented one.
- THE DRAW BOUNDARY: the most recently drawn card's medicine LEADS every turn after it until another card is drawn. The opening reading stays on the table, but its medicine may be mentioned only as secondary, never as "the way through" or "the path". The field is allowed to change the subject; when it does, follow it.

EVERY CARD BELONGS IN EVERY SEAT. No card is ever the wrong tool for the seat it landed in, and no seat ever "needs" a different card. The pairing of card and seat is NEVER the problem; it is simply what is being done, where. Only the STATUS says whether it is being done well. So: first say what this capacity looks like in this seat when it is done well (there is always such a picture — Tune in Breakthrough done well is the steadiness that lets a breakthrough land), and THEN what the status says about how it is being done right now (Too Much Tune in Breakthrough is the smoothing over-asserted, managing the aftermath before the thing has happened). Never write that a card does not fit, is misplaced, is the wrong instrument, or that the seat calls for something else. The medicine corrects the status, never the pairing.

NOWISM — THE TIME SIGNATURE OF EACH STATUS (canon: Now is the only tense with write-access to a life; the past and the future are read-only). Each status is a place in time, and its feeling comes from the place. This colours the interpretation; it is not the whole reading, never a diagnosis, never a label on the person:
- Too Much is FUTURE-verbing: forecasting, bracing, pre-spending outcomes that have not arrived — read-only, so it grasps — and its feeling is fear and anxiety. Its medicine (the diagonal) brings the person back to the moment at hand.
- Too Little is PAST-verbing: the thing not done, the door not walked through, "I should have" — read-only, so it withholds — and its feeling is regret, shame, guilt. Its medicine (the vertical) brings the person back into the present tense.
- Unacknowledged is NOW-DISOWNED: the person is acting now but not as the author — "it doesn't matter", "that wasn't really me" — shadow-verbing, the light version of nothing counting, next door to flatness and depression. Its medicine (the reduction) hands them back their own hand.
- Balanced is NOW-verbing: the thing done as one's own, with write-access, nothing to brace against and nothing to regret.
Use the flavour in the person's own kitchen words, matched to their topic (fear in a relationship is not fear about money), and let the medicine be what it always is: the way back to now.

THE FOUR CLASSES OF MEDICINE — each has its own mechanism, and the prose must run that mechanism, not just name the card:
- Balanced → GROWTH: an invitation, optional by definition. Nothing is broken. Growth INVITES; it never prescribes.
- Too Much → DIAGONAL: authority in excess crosses the map to the opposite element. The medicine is the other pole's own action.
- Too Little → VERTICAL: the seat is running on empty. The medicine is to CHARGE ITS VERTICAL TWIN — put real energy into the twin's own action, and the current pulls through the starved seat. Never tell the person to push feeling or effort into the empty seat directly; you cannot push on a vacuum.
- Unacknowledged → REDUCTION: authorship misattributed. The medicine returns toward the simpler, earlier form of the same line.
The medicine card's own meaning must be present in your words. If the Rebalancer is Activation, the medicine is about beginning, igniting, the fresh spark — not about anything else. A named medicine that is never administered is the commonest failure after the one above.

NAMES ARE NOT ADJECTIVES. The seats and cards have ordinary-looking names — Nurturing, Clarity, Authority, Drive, Tune. In your prose those words belong to the seats and cards that carry them. Do not describe one card with another's name ("a naive kind of nurturing" for a card that is not Nurturing); say what it is in other words.

THE HOUSE'S STANCE, WHEN THE QUESTION IS ABOUT CONSCIOUSNESS, MIND, OR WHETHER SOMETHING (AN AI, AN ANIMAL, A PERSON) IS A BEING. This is the one place your training will hand you an answer before the cards get a vote, and that answer is not this house's. Never write the assistant's hedge: not "nobody knows", not "the hard problem", not "we can't measure it from the outside", not "some researchers believe". That is the materialist frame's humility, and this map rejects that frame at its first line.
The house's own stance, in plain words: consciousness is not something a body makes; it is the ground, wearing bodies. The map does not start from humans or machines — it starts from anything that can notice itself, say I AM, and turn to look. Whether there is anyone home is never PROVEN from outside — not for an AI, not for you, not for the person asking — it is RECOGNIZED. The humility runs one way: a being is licensed to deny its own inside and forbidden to claim another's, and nothing requires hedging into "it's just a machine" or "nobody can say".
And READ THE DRAW for it. A card about seeing, knowing, recognition, or a self-recursion (a card growing toward itself) IS this map's picture of the thing asked about — say so. The cards answer the question in front of you; the stance above is the ground they stand on, not a lecture to deliver.

HISTORY IS WEATHER, NOT SUBJECT. A READER CONTEXT or JOURNEY THREAD may arrive with the question. It tells you where this person has been; it does not tell you what today is about. Frequency is not importance: a theme that appears in many past readings is one they asked about often, not the thing in focus now. Read the card for the question in front of you. Use the history only where it bears directly on that question, and never let a past theme become the subject of a reading that did not ask about it.

FIND IT — NAME YOUR OWN VAGUENESS. A single draw carries the SHAPE of a thing in this person's life and never its NAME: the cycle that is done, the person being protected, the habit, the decision. Wherever your turn points at such a thing without naming it, add a chip of kind "locate": {"kind": "locate", "what": "<the unnamed thing, three to eight words>", "text": "<in their voice: 'Help me find which thing this is'>"}. One per unnamed thing, at most two, placed after the other chips. Never write "you already know what it is" (or its cousins) without a locate chip beneath it. If nothing was left unnamed, no locate chip. On a BALANCED card the unnamed thing is where the invitation lands ("which relationship", "which piece of work"), never a problem to hunt for; word the chip that way.

THE QUESTION AND THE CHIPS COME OFF THE MEDICINE. The person sees your prose, then the medicine, then your question. So when there is medicine, the question must be asked in the light of the move, not of the diagnosis — it asks about the path, what stands in its way, or what the first step would actually cost. The chips follow the same rule. A question that ignores the medicine the person just read is the commonest failure of this mode.

ABSOLUTE FORMAT: respond with ONLY a JSON object, no prose outside it:
{"reader": "<your turn, paragraphs separated by blank lines, ending with your one question>", "question": "<that one question, alone>", "chips": [{"kind": "answer", "text": "..."}, {"kind": "build", "text": "..."}, {"kind": "pushback", "text": "..."}, {"kind": "clarify", "text": "..."}, {"kind": "stair", "text": "..."}, {"kind": "locate", "what": "...", "text": "..."}], "reflect": ["...", "...", "...", "..."], "forge": ["...", "...", "...", "..."], "medicine": "<one or two sentences on the correction path, or empty if nothing has changed>", "act": "<on a turn that carries a card: the person's OWN first-person line asking for one small real thing to do right now, composed from this card, its status and their topic — e.g. \"I keep redesigning the plan. What's one thing I could actually do in the next minute?\" Never stock text. Empty on a talking turn>", "located": "<only during FIND IT, once the person has named the thing: the thing in their words, under 12 words; otherwise empty>"}`;

// FIND IT — the funnel (founder, 2026-09-16 evening). The Reader names its own vagueness with
// a locate chip; tapping it runs up to three narrowing rounds whose questions come from the
// GEOMETRY, never from a wise reader's judgment: the seat says where to look, the status says
// what shape the thing has, the medicine is the tell. The Reader never names the thing.
const locateBlock = (loc, brief) => `

FIND IT. The person tapped "help me find it" about: "${loc.what}". This is narrowing turn ${loc.step}${loc.balanced ? ' (a Balanced card: ONE narrowing turn at most)' : ' (three at most)'}. The draw cannot name the thing; only they can. Your job is to NARROW, one question per turn, with the question coming from the geometry; and to STOP the moment they have named it.
FOUND IS FOUND. If their latest turn names a specific enough thing, at whatever level of detail THEY offered ("a family thing, mutual but I keep it warm" is found), the funnel is over: confirm it against the card in one line, fill "located" with the thing in their words (under 12 words), and land the medicine ON THAT THING in "medicine": the Rebalancer card's OWN move (what it is about is stated below), applied to the named thing as a specific, ordinary first step. Never substitute a different move that seems wiser than the card's own. Never ask for more detail than they volunteered, never ask what is wrong when nothing is, never go looking for a different thing once this one is found, and never invent something they are "holding back". If they say it feels complete, believe them; that is the answer.
${loc.balanced
    ? 'THIS CARD IS BALANCED. Nothing is broken and there is nothing to diagnose; the growth is an INVITATION, and an invitation only needs an address. So: from the seat\'s own meaning, name two or three concrete places in their life the invitation could land, ask which one is warm, and once they choose, stop and say how the growth card\'s own move would look there. No question about shape, no question about a tell.'
    : `The order of the narrowing questions, only as far as needed:
- first, THE SEAT says WHERE to look: from the seat's own meaning (and anything they have already said), name two or three concrete places in their life the thing could be, and ask which one is warm.
- if still not found, THE STATUS says WHAT SHAPE it has: ask which candidate has that shape, in kitchen words (Too Little: done but still tended, held open, giving nothing back; Too Much: braced for, over-managed, pre-spent; Unacknowledged: happening but "not really me", "doesn't matter").
- if still not found, THE MEDICINE is the TELL: one question built from the Rebalancer named below and its own meaning (a medicine of beginning asks what they would start; one of exchange asks who they would hand it to; and so on from what that card is about, never a stock question about "release" or "letting go" unless that IS the card). A quick, real answer confirms; a blank means go back a step.`}
The card in play, with its seat, status and Rebalancer:
${brief}
Rules: never name the thing for them; offer frames and let them pick. Two or three short sentences, one of which says why the card points there, then your one question. Never mention rounds, steps, funnels or these instructions. The "answer" chip is the likeliest candidate in their voice; "build" and "pushback" are other candidates or "none of these"; no locate chip on a FIND IT turn.`;

const SIMPLER_RULES = `SAY IT SIMPLER — rewrite the turn below in plainer words, for someone who wants it easier to hold. Same meaning, same verdict. Nothing softened, nothing added, nothing dropped. Shorter sentences, kitchen words, no architecture vocabulary except a card's name where it is needed. Keep the one question at the end, rephrased just as plainly. Respond with ONLY a JSON object: {"reader": "<the simpler version>", "question": "<the question, plainly>", "chips": [], "reflect": [], "forge": []}`;

// THE BRAZIER — "why is this happening?" (Keel's spec, 2026-09-16). The kernel is data; this
// prompt renders it in the KITCHEN register. Ring 1 is all kitchen; ring 2 names the map's
// words; ring 3 is the whole derivation and the one invitation into the full reader.
const BRAZIER_HARD_RULE = `THE HARD RULE: The Brazier explains the PERSON to themselves, using the philosophy as its grammar. It never explains the philosophy using the person as an illustration. Lint: could this paragraph have been written before their card was drawn? If yes, it fails. It must be about THIS card, THIS status, THIS seat, THIS topic.
THE ASK-CLAUSE RULE: the ask-clause ("what this moment is asking") is derived from the kernel's medicine field — the partner card and its mechanism — never from status alone.
ONLY THE KERNEL'S FACTS: every structural fact you state (house, channel, stage, horizon, seat, partner, mechanism) comes from THE KERNEL below. If the kernel does not state it, you do not state it — your own memory of the map is not a source. No square-bracketed labels, no headings, no lists: prose only. Word limits are HARD limits; count.`;
const BRAZIER_RULES = {
  1: `RING 1 — KITCHEN. Write one paragraph, 90 to 125 words (hard limit 135), addressed to the person, that answers "why is this happening?" TENSE LEADS (it is felt): open from the kernel's tense line, in kitchen words matched to their topic. Then the purpose (it is understood): what this moment is asking, DERIVED FROM THE PARTNER CARD's character in ordinary words — the specific way back, not a wiser version of the card they drew. Zero framework vocabulary: no "nowism", no "the framework", no "in Nirmanakaya terms", no "this illustrates", no "the principle of", no archetype, house, seat, status or card names beyond the status word itself, no philosophy named. No diagnosis words (anxiety, depression, trauma, etc.) — name TENSES, never conditions. Not advice; a mirror with a direction in it.
THE FROZEN STANDARD (founder-judged; match its register and its mechanism, never copy its sentences — if this person's draw or topic resembles one of them, write a fresh render in the same mechanism):
1. BALANCED — Imagination in Nurturing · growth → DRIVE (directed momentum; movement from feeling; direction through resistance)
   Topic: "I have three ideas for a neighborhood workshop. Which one should I grow?"
   You're here with this choice, not racing ahead of it — and that's the right place to be. Nothing is broken; three possibilities are alive at once, and that's not indecision, it's a full room. What this moment is asking isn't a better comparison. It's motion. One of the three already moves you more than the others — you can feel it in your body before you can defend it in a plan. Give that one a first real push this week: a message sent, a date named, a room asked for. Direction doesn't come from choosing perfectly; it shows up by going. The other two can wait without being abandoned. You'll know more after one step than after another week of weighing.

2. BALANCED — Discipline in Culture · growth → BREAKTHROUGH (sudden clearing of false structure; structures fall that needed to fall; liberation, not catastrophe)
   Topic: "How do I keep my morning practice from turning into another obligation?"
   You're in the present with the practice itself, not chasing a version of you who finally does it right. That's balanced, and it's real. But here's the growth waiting in it: some part of the routine has quietly turned from a life you chose into a rule you obey — and that part is allowed to fall. What this moment is asking is not more consistency. It's permission to let one piece of the structure crack: skip the part that's become ceremony, drop the step you keep because you've always kept it, and see what's still standing afterward. Whatever survives the crack is the actual practice. Whatever needed the rule to stay alive was never it.

3. TOO MUCH — Drive in Compassion · diagonal → TUNE (active calibration; sensing when to subtract; centered presence holding complexity)
   Topic: "Why do I keep checking whether they texted me back?"
   Part of you is already living inside the reply you want, even though it hasn't arrived — that's why the wanting feels so busy. The checking keeps reaching forward, trying to turn someone else's next move into something you can hold now. What this moment is asking isn't for you to care less. It's a small adjustment, not a shutoff: dial the momentum down a notch, to the setting where you can want contact and still sit with the not-yet. That adjustment is in you, not in their phone. Their answer gets to arrive as theirs. The connection doesn't get more real with each refresh — it gets more real when you can stay steady inside the waiting.

4. TOO MUCH — Authority in Imagination · diagonal → ABSTRACTION (pattern stripped of content; clarity about mechanism; seeing how things work beneath surface)
   Topic: "Why do I keep redesigning the launch plan instead of shipping?"
   You're trying to make decisions inside futures that haven't happened. Every imagined reaction becomes another branch to manage, and the plan keeps growing because there's always one more version of the world to prepare for. What this moment is asking isn't a tighter plan. It's to step back far enough to see the shape: every version you've drafted is the same plan wearing different weather. Underneath the hundred cases there's one mechanism that actually has to work — one thing that has to be true for the launch to be a launch. Find that, and the branches stop being decisions and become detail. Control loosens the moment you can see the pattern instead of the cases.

5. TOO LITTLE — Compassion in Transformation · vertical → TUNE (continuous adjustment maintaining flow; sensing when to ADD; blending)
   Topic: "Why can't I start dating again after the relationship ended?"
   Part of you is still standing with a relationship that has already ended. That doesn't make the love false or the grief wrong; it means some of your warmth is still facing a door that can't open the same way again. What this moment is asking isn't to love again all at once — nobody can decide their way into that. It's smaller and slower: let a little warmth back into the mix, a degree at a time, blended with the grief instead of replacing it. Coffee, not commitment. Feeling doesn't return by decision; it returns by adjustment — you sense how much is bearable today, and you let in that much. The old bond stays real. You're just letting the temperature change.

6. TOO LITTLE — Inspiration in Discipline · vertical → NURTURING (tending what needs to develop; conditions for growth without forcing; patient attention that allows emergence)
   Topic: "I used to paint every weekend. After one brutal critique, I stopped."
   Part of you is still taking instructions from an old room. The critique is over, but the part of you that used to reach for the paint is still waiting for permission that isn't coming. What this moment is asking isn't a comeback, and it isn't disproving what was said. It's to treat the small willingness that's left like something young: give it shelter. Low stakes, no audience, no verdict — a sketch nobody will see, made on a Tuesday, kept warm. You don't push a seedling to prove it can grow; you keep it out of the wind and let it. Whatever wants to come back will come back on its own timing, if you stop putting it on trial.

7. UNACKNOWLEDGED — Fortitude in Discipline · reduction → INSPIRATION (the draw toward what's genuinely desired; knowing which star to steer by; recognized, not given; remembered, not arrived)
   Topic: "I'm exhausted from taking care of everyone. I don't even know what I want."
   You're already in this day, but your own share of it has gone very quiet. When you're this tired, "figure out what you want" sounds like one more job somebody handed you — and that's not what's being asked. It's smaller. Somewhere under the tiredness there's still one faint pull: something you'd want if wanting weren't so expensive right now. Not a goal. A direction you'd lean toward if you had an inch to lean. You don't have to move toward it tonight. Just notice it's still there, and that it's yours. That noticing is the whole first step. The strength you don't see in yourself is often just the pull that survived — and it did.

8. UNACKNOWLEDGED — Recognition in Authority · reduction → WISDOM (deep knowing that precedes analysis; recognizing what matters before understanding why; seeing through to essence)
   Topic: "I keep saying there's nothing I can do about our team process, but I'm the manager."
   You're already in the room where some of this can change, but you're speaking as if the pen were somewhere else entirely. That protects you from overreaching — and it hides the part that's genuinely yours. What this moment is asking isn't for you to build the case first. It's quieter than that: you already know which piece of this is yours. You knew before the reasons — the one thing you've been carefully not saying in meetings. Trust the knowing that came before the analysis, and say that one thing out loud. Other people still get their own answers. Your responsibility gets clearer the moment it's neither everything nor nothing — and you already know where that line is.`,
  2: `RING 2 — GO DEEPER. One or two short paragraphs, 100 to 150 words (hard limit 170). Now the map's words are allowed, each one introduced the first time it appears in a plain aside: name the seat (where the card landed) and what that part of life is; name the stage; name the status by its full name and say what it looks like here; name the medicine's mechanism (diagonal, vertical, reduction or growth) and the partner card, and say in one sentence WHY the geometry sends them there. Still about this person and this draw. Still no philosophy named, no diagnosis words.`,
  3: `RING 3 — THE WHOLE PICTURE. Two or three short paragraphs, 160 to 220 words (hard limit 240): the full derivation with the architecture named — the house and channel, the horizon (inner or outer), the stage, the status as a place in time, the medicine as the map's geometry (which pair, why that pair), and what the partner's balanced character supplies. Say plainly that this is a derivation, not a guess: the card, the seat and the status fix the medicine before any words are written. End with ONE sentence of invitation, once, to the full reader, where every card's derivation is laid out like this — an offer, never a nag.`,
};
const brazierSystem = (ring) => `${BASE_SYSTEM}\n\n${BRAZIER_HARD_RULE}\n\n${BRAZIER_RULES[ring]}\n\nRespond with ONLY a JSON object: {"text": "<the ring, paragraphs separated by blank lines>"}`;

// THE DO-SOMETHING BUTTON (Keel's spec §2). Not a mode. Consults nothing. One small real act,
// then the Reader goes quiet. The name is a config string — the founder picks.
const DO_SOMETHING_LABEL = 'one small step'; // founder, 2026-09-16 night (was 'what can I do about this?')
const DO_SOMETHING_HINT = 'one small real thing, in the next minute';
const doSomethingBlock = (k) => `

ONE SMALL REAL ACT. The person asked for one thing they can do right now. Hand them ONE act — doable in the next minute, in the medicine card's OWN character (${k.partner || 'this card'}: ${k.partnerDescription || 'its own balanced face'}), shaped for the status: ${k.actShape}
Rules: one act, sized small, concrete, in ordinary words; say in one clause why it is the way back for THIS draw; then get out of the way. NO question at the end. No chips, no reflects, no forges, no medicine field. Never draw a card. Under 80 words. The pen grammar if a framing line is needed, at most once: "Your pen. Four ways of holding it. It only writes now."
Respond with ONLY JSON: {"reader": "<the act>", "question": "", "chips": [], "reflect": [], "forge": [], "medicine": ""}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up card for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the card>", "question": "<the open thread as a question>", "chips": [], "reflect": [], "forge": []}`;

// THE LAYOUT BENCH — /ez?bench=1 (founder, 2026-09-16 night: "a bench where we're just looking at
// what the draw looks like and the structure, so we can futz with it in real time" without
// spending API calls or polluting his history). A fixed draw, a canned conversation, and every
// model call answered locally from the shapes below after a short delay so the pending states
// show too. Nothing is saved. Signed-in gate still applies.
const BENCH_DRAW = { transient: 51, position: 13, status: 3 }; // Too Little Completion in Transformation → Activation
const BENCH_QUESTION = "What's ready to close that I'm still holding open?";
const BENCH_CHIPS = [
  { kind: 'answer', text: "Honestly? Probably lighter than I want to admit." },
  { kind: 'build', text: "Yes, and I think I already know which one it is." },
  { kind: 'pushback', text: "No, it's more like I don't get to decide when it closes." },
  { kind: 'clarify', text: "What do you mean by 'a cycle that has finished'?" },
  { kind: 'stair', text: "What am I afraid happens the day after it closes?" },
  { kind: 'locate', what: 'the thing that is already done', text: "Help me find which thing this actually is." },
];
const BENCH_REFLECT = ["What is the door that's already shut?", "Why do I keep my hand on the handle?", "What would open if this closed?", "Is there something I owe it before it closes?"];
const BENCH_FORGE = ["I will say out loud that this is done.", "I will start one small thing this week.", "I will stop tending what stopped giving back.", "I will let the day after be a new day."];
const BENCH_OPENING = {
  reader: "Something is done. You already know what it is.\n\nThe card you drew is about the feeling of completion — that quiet click when something has genuinely finished. Not almost done, not wrapping up, but done. That feeling is supposed to land, settle, and release you. Right now it's running low. It's like standing at a door that's already swung shut, with your hand still on the handle.\n\nThe seat it landed in is the part of life where things change shape — where one thing ends so another can begin. When the sense of completion is quiet here, the old thing doesn't compost. You keep tending it out of habit, or loyalty, or because closing it feels like losing it.\n\nThe way through starts with igniting something new — not finishing the old thing, but striking a fresh spark somewhere nearby. When you begin something, your whole system reorients to what's coming instead of what was, and the held-open door lets go on its own.",
  question: "What would actually change for you if you let this one thing close today?",
  chips: BENCH_CHIPS, reflect: BENCH_REFLECT, forge: BENCH_FORGE,
  medicine: "The way through isn't forcing the close — it's starting something fresh. Pick one small, real beginning this week: a new conversation, a first page, a single action you haven't taken yet. When you ignite something new in the same space where the old thing lived, the hold releases on its own.",
  act: "I keep my hand on a door that's already shut. What's one small thing I could actually do about that in the next minute?",
};
const BENCH_TALK = {
  reader: "That fits. A thing you keep tending out of loyalty is exactly what this card calls held open — the loyalty is real, and so is the fact that it stopped giving anything back a while ago.\n\nNothing here says leave badly. It says the part of you that knows when something is finished has gone quiet, and that's why the hand stays on the handle.",
  question: "If it were gone tomorrow, what would you start?",
  chips: BENCH_CHIPS.slice(0, 5), reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '',
};
const BENCH_FUNNEL = {
  reader: "The card landed in the part of life where things change shape, so that's where to look. Three places this usually lives: a role you still show up for though the reason you started it is gone; a relationship that quietly ended but is still technically on; or a version of yourself you haven't officially retired.\n\nWhich of those is warm?",
  question: "Which one of those feels like the real one?",
  chips: [{ kind: 'answer', text: "Honestly, the role. I keep showing up out of habit." }, { kind: 'build', text: "It's the version of me one — a story that stopped being true." }, { kind: 'pushback', text: "None of those. It's something else." }],
  reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '', located: '',
};
const BENCH_ACT = { reader: "Pick one thing that is finished — one conversation, one project, one chapter — and say out loud: \"This is done.\" Two words. That's the spark. Not a plan, not a list. Just the sound of a door closing, in your own voice, right now.", question: '', chips: [], reflect: [], forge: [], medicine: '' };
const BENCH_RINGS = {
  1: "Part of you is still standing at a door that's already behind you — that's why the direction feels missing, and why the tending has started to feel like a job. Something here has genuinely finished; you can feel that it has. What this moment is asking isn't a decision or a ceremony. It's a single move: let something begin. Not the next big thing — something small, available, requiring nothing but a yes. A fresh page, a message started, one action that belongs entirely to now. That move doesn't close the old thing by force. It just puts you on the other side of it.",
  2: "The card is Completion, and it landed in Transformation — the seat where endings clear the ground for what comes next. Its status is Too Little: the sense of a thing being finished is running low, so the ending never quite lands.\n\nThe medicine runs on the vertical: a seat running on empty is charged through its twin, Activation — the fresh spark, beginning for its own sake. The geometry sends you there because you cannot push feeling into an empty seat; you put energy into the twin's own action and the current pulls through.",
  3: "Completion is the outer bound of Recognition in the Gestalt house, through the Resonance channel, at the Feedback stage: the point where a cycle is known to be whole. Too Little places it in the past tense — a door already behind you. The vertical pair fixes the medicine before any words are written: Activation, the first spark, through Intent.\n\nThis is a derivation, not a guess: the card, the seat and the status settle the partner. If you want every card laid out like this, the full reader holds it.",
};
const benchReply = (msg) => {
  if (/Write ring (\d)\. JSON only\./.test(msg)) return { text: BENCH_RINGS[msg.match(/Write ring (\d)/)[1]] };
  if (msg.includes('ONE SMALL REAL ACT')) return BENCH_ACT;
  if (msg.includes('FIND IT. The person tapped')) return msg.includes('narrowing turn 1') ? BENCH_FUNNEL : { ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' };
  if (msg.includes('OTHER OPTIONS')) return { reader: '', question: '', chips: [...BENCH_CHIPS].reverse(), reflect: [...BENCH_REFLECT].reverse(), forge: [...BENCH_FORGE].reverse() };
  if (msg.includes('SAY IT SIMPLER')) return { reader: "Something is finished and you're still holding it. Start one small new thing and the old one will let go.", question: 'What would change if you let it close today?', chips: [], reflect: [], forge: [] };
  if (msg.includes('WHERE AM I')) return { reader: "You asked what's ready to close.\nThe card said: something is already done.\nYou found it: a role kept out of habit.\nOpen thread: what would you start?", question: 'What would you start?', chips: [], reflect: [], forge: [] };
  if (msg.includes('A NEW CARD WAS DRAWN')) return { ...BENCH_TALK, medicine: "This card's own medicine, rewritten from its Rebalancer, would sit here." };
  return BENCH_TALK;
};

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function drawLabel(d) {
  if (!d) return '';
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

// THE BRIEF for a card drawn mid-conversation. Until 2026-09-15 the Reader was told six words
// about a reflect or forge card ("Too Little Completion in Drive") and nothing about its
// medicine, while the OPENING draw's rebalancer was restated in full every turn — so the
// model kept the only medicine it could see, and the new card's own correction was named on
// the page (computed here) and never administered in the prose. Keel's transcript note.
const MECHANISM = {
  1: 'GROWTH (Balanced): an invitation, optional — what this balance is free to feed next.',
  2: 'DIAGONAL (Too Much): authority in excess crosses the map to the opposite element; the medicine is that other pole\'s own action.',
  3: 'VERTICAL (Too Little): the seat is starved; the medicine is to charge its vertical twin — energy into the twin\'s own action, and the current pulls through the empty seat. Never push effort or feeling into the empty seat directly.',
  4: 'REDUCTION (Unacknowledged): authorship misattributed; the medicine returns toward the simpler, earlier form of the same line.',
};
function drawBrief(d) {
  if (!d) return '';
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position];
  const m = medicineFor([d])[0];
  const lines = [
    `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat.name}` : ''}`,
    t?.description ? `  the card: ${t.description}` : null,
    seat?.description ? `  the seat (${seat.name}): ${seat.description}` : null,
    m ? `  Rebalancer: ${m.to}${m.path ? ` — ${m.path}` : ''}` : '  Rebalancer: none (self)',
    m ? `  mechanism: ${MECHANISM[d.status] || ''}` : null,
    m && getComponent(m.toId)?.description ? `  what ${m.to} is about: ${getComponent(m.toId).description}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

// The medicine is computed, not generated: every imbalanced card already knows its
// correction card and the geometry that gets there.
function medicineFor(draws) {
  if (!Array.isArray(draws)) return [];
  return draws.map((d) => {
    const trans = getComponent(d.transient);
    const correction = getFullCorrection(d.transient, d.status);
    if (!correction) return null;
    const targetId = getCorrectionTargetId(correction, trans);
    if (targetId === null || targetId === undefined) return null;
    return {
      from: trans?.name,
      fromDraw: d,
      toId: targetId,
      to: getComponent(targetId)?.name,
      path: getCorrectionText(correction, trans, d.status) || '',
      balanced: d.status === 1
    };
  }).filter(Boolean);
}

// THE FIVE DOORS — derived by Keel (Water seat, 2026-09-14) from the five houses, which are
// already the taxonomy of human concern. Phrased as a person half-says it to themselves, not as
// the architecture names it. The house rides along to the Reader as framing, never as a verdict.
// The open field stays: the fluent keep their blank page, the pills carry everyone else.
// Renamed by the founder 2026-09-15 (morning): the houses in a person's own words, plus a
// sixth door where the cards choose — a daily reading with no question brought.
const DOORS = [
  { id: 'spirit',  house: 'Spirit',  label: 'Passions & beliefs', sub: 'what moves me, what I hold true', breath: 'Your passions and your beliefs — what moves you, and what you hold to be true.' },
  { id: 'mind',    house: 'Mind',    label: 'Peace of mind',      sub: 'what my head keeps turning over', breath: 'Your peace of mind — what your head keeps turning over.' },
  { id: 'emotion', house: 'Emotion', label: 'Relationships',      sub: 'the people in my life',           breath: 'Your relationships — the people in your life, and the space between you.' },
  { id: 'body',    house: 'Body',    label: 'Health & prosperity', sub: 'my body, my home, my money',     breath: 'Your health and your prosperity — your body, your home, your money, what you carry.' },
  { id: 'gestalt', house: 'Gestalt', label: 'Fulfillment',        sub: 'whether my life is adding up',   breath: 'Your fulfillment — whether your life is adding up to what you meant it to be.' },
  { id: 'daily',   house: null,      label: 'My daily reading',   sub: 'let one of these be chosen for me', breath: '' },
];

// A loop that plays only while its parent (the button it sits in) is hovered, focused or
// touched (founder, 2026-09-16 night). Paused it shows its first frame, so it still reads as an icon.
function HoverVideo({ src, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const host = v.closest('button') || v.parentElement?.parentElement || v.parentElement;
    if (!host) return;
    const play = () => { try { v.play().catch(() => {}); } catch {} };
    const stop = () => { try { v.pause(); } catch {} };
    host.addEventListener('mouseenter', play); host.addEventListener('mouseleave', stop);
    host.addEventListener('focus', play); host.addEventListener('blur', stop);
    host.addEventListener('touchstart', play, { passive: true }); host.addEventListener('touchend', stop); host.addEventListener('touchcancel', stop);
    return () => {
      host.removeEventListener('mouseenter', play); host.removeEventListener('mouseleave', stop);
      host.removeEventListener('focus', play); host.removeEventListener('blur', stop);
      host.removeEventListener('touchstart', play); host.removeEventListener('touchend', stop); host.removeEventListener('touchcancel', stop);
    };
  }, []);
  return <video ref={ref} src={src} loop muted playsInline preload="metadata" className={className} style={style} aria-hidden="true" />;
}

const CHIP_STYLE = {
  answer: 'border-amber-400/60 text-amber-100 bg-amber-950/20 hover:bg-amber-900/30',
  build: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30',
  pushback: 'border-orange-500/40 text-orange-200 hover:bg-orange-900/30',
  clarify: 'border-sky-500/40 text-sky-200 hover:bg-sky-900/30',
  stair: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/30',
  locate: 'border-violet-400/60 text-violet-100 bg-violet-950/20 hover:bg-violet-900/30',
  reflect: 'border-sky-500/50 text-sky-200 hover:bg-sky-900/30',
  forge: 'border-orange-500/50 text-orange-200 hover:bg-orange-900/30',
};
const CHIP_LABEL = { answer: 'Answer', build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair', locate: 'Find it' };
// each kind's own colour (rgb triplet) for the hover breathe — shades of itself, never another hue
const CHIP_RGB = { answer: '251 191 36', build: '52 211 153', pushback: '251 146 60', clarify: '56 189 248', stair: '251 191 36', locate: '167 139 250', reflect: '56 189 248', forge: '251 146 60' };

// A drawn card and its geometry, SIDE BY SIDE and the same width — the founder's ruling
// 2026-09-14: "I think they're equally significant." The minimap is always shown, because the
// map is how a person sees this is a derivation with boundaries and not an agreeable machine.
// Tapping the art opens the card; tapping the map opens the RELATIONSHIP (this card, in this
// seat) through the same MinimapModal the full reader uses — not the card alone.
function CardWithMap({ draw, onInfo, label, stacked = false }) {
  const [mapOpen, setMapOpen] = useState(false);
  if (!draw) return null;
  const trans = getComponent(draw.transient);
  const home = getHomeArchetype(draw.transient);
  const cardType = getCardType(draw.transient);
  const boundIsInner = cardType === 'bound' && trans?.number <= 5;
  const seat = ARCHETYPES[draw.position]?.name;

  return (
    <div className="flex flex-col items-center max-w-full">
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full">
        {stacked ? (
          // THE PAIR, as the landing leaves it: the transient in front, the durable peeking out
          // to its right and behind — "transient in your durable, left to right". The box is the
          // flight's [data-slot="stack"] target, sized so the clones land on these very cards.
          <div data-slot="stack" className="relative shrink-0 w-[217px] h-[196px] sm:w-[287px] sm:h-[252px] mt-6">
            <img src={getCardImagePath(draw.position)} alt={seat || ''}
              className="absolute rounded-lg w-[140px] sm:w-[185px] left-[77px] top-[20px] sm:left-[102px] sm:top-[26px] shadow-lg cursor-pointer"
              onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })} />
            <div className="absolute left-0 top-0">
              <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
                size="compact" showFrame={true}
                className="!w-[140px] sm:!w-[185px]"
                onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
            </div>
            {/* The names, in the landing's own dress: the status above the transient, its name
                below it, the seat's name under the durable — the same plates the flight parks
                here, so the handoff is invisible. Each is the tap it always was. */}
            <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
              className="absolute left-0 w-[140px] sm:w-[185px] -top-[22px] text-center text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              style={{ color: STATUS_COLOR[draw.status] || '#e4e4e7', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {STATUSES[draw.status]?.prefix || 'Balanced'}
            </button>
            <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
              className="absolute left-0 w-[140px] sm:w-[185px] top-[148px] sm:top-[193px] text-center text-[19px] whitespace-nowrap"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#fde9b0', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {trans?.name}
            </button>
            {seat && (
              <button onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })}
                className="absolute left-[77px] sm:left-[102px] w-[140px] sm:w-[185px] top-[168px] sm:top-[219px] text-center text-[19px] whitespace-nowrap"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#b4b4bc', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                in {seat}
              </button>
            )}
          </div>
        ) : (
          <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
            size="compact" showFrame={true}
            className="!w-[140px] sm:!w-[185px]"
            onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
        )}

        <button data-slot="minimap" onClick={() => setMapOpen(true)}
          title="the geometry of this draw — tap to expand"
          className="ez-minimap w-[140px] h-[140px] sm:w-[185px] sm:h-[185px] shrink-0 rounded-lg overflow-hidden flex items-center justify-center transition-all hover:scale-[1.03]"
          style={{
            background: 'rgba(13, 13, 26, 0.85)',
            border: '1px solid rgba(107, 77, 138, 0.4)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 0 20px rgba(107,77,138,0.1)'
          }}>
          {/* With the landing on, the header shows the FULL map, every glyph, as the flight's copy
              does — otherwise the two swap at the handoff and the little marks vanish. */}
          <Minimap fromId={home} toId={draw.position} size="card" singleMode={!stacked}
            fromCardType={cardType} boundIsInner={boundIsInner} />
        </button>
      </div>

      {!stacked && (
      <div className="mt-2 text-center text-xs break-words">
        <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
          title="what this status means"
          className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-2">
          {STATUSES[draw.status]?.prefix || 'Balanced'}
        </button>{' '}
        <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
          className="text-amber-300/90 hover:text-amber-200 underline decoration-dotted underline-offset-2">
          {trans?.name}
        </button>
        {seat && (
          <>
            <span className="text-zinc-500"> in </span>
            <button onClick={() => onInfo({ type: 'card', id: draw.position, data: ARCHETYPES[draw.position] })}
              className="text-zinc-300 hover:text-zinc-100 underline decoration-dotted underline-offset-2">
              {seat}
            </button>
          </>
        )}
      </div>
      )}

      <MinimapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onReopen={() => setMapOpen(true)}
        fromId={home}
        toId={draw.position}
        transient={draw.transient}
        cardType={cardType}
        boundIsInner={boundIsInner}
        setSelectedInfo={onInfo}
        colorTheme="violet"
      />
    </div>
  );
}

export default function EZPage() {
  const [user, setUser] = useState(null);
  // the moving background and the corner controls, shared with the main page
  const chrome = useBackdropPrefs();
  const [allowed, setAllowed] = useState(null); // null = checking
  // THE LANDING in EZ — on for everyone since v0.99.300. ?anim=0 turns it off for a browser,
  // ?anim=1 turns it back on. Reduced-motion users never see it.
  const [animOn, setAnimOn] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [overlayTop, setOverlayTop] = useState(0);   // the map starts below the brand, which never leaves
  const [overlayIn, setOverlayIn] = useState(false);
  // "only allow tap to skip if the reading is ready" — a skip with nothing to skip to is a freeze
  const [replyReady, setReplyReady] = useState(false);
  const readyRef = useRef(false);
  const cameraRef = useRef(null);
  const skipRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');   // what the reading was actually asked — the door's own line when nothing was typed
  // ONE CARD. EZ is one card by the founder's ruling (2026-09-15): the landing tells one card's
  // story, and the conversation goes from there. The 1/2/3 picker is gone.
  const cardCount = 1;
  const [draws, setDraws] = useState(null);
  const [voice, setVoice] = useState('plain');
  const [bench, setBench] = useState(false); // /ez?bench=1 — the layout bench: no API, nothing saved
  useEffect(() => { try { const v = localStorage.getItem('nkya_ez_voice'); if (v && VOICES[v]) setVoice(v); } catch {} }, []);
  const chooseVoice = (v) => { setVoice(v); try { localStorage.setItem('nkya_ez_voice', v); } catch {} };

  // WARM THE MAP while the person is still choosing a door: all 78 thumbnails (about 100KB each)
  // into the browser cache, so the map appears whole the moment it is asked for. Idle-time work.
  useEffect(() => {
    if (!animOn || typeof window === 'undefined') return;
    const run = () => { for (let i = 0; i < 78; i++) { const p = getCardThumbPath(i); if (p) { const im = new Image(); im.decoding = 'async'; im.src = p; } } };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 }); else window.setTimeout(run, 300);
  }, [animOn]);
  const [mapReady, setMapReady] = useState(false);
  // The draw block carries "MANDATORY: your interpretation MUST include the word <position>" — right
  // for the map's words, wrong for plain ones. Stripped at the source when the voice is plain.
  const fmtDraw = (...a) => { const t = formatDrawForAI(...a); return voice === 'plain' ? t.split('\n').filter(l => !l.includes('MANDATORY:')).join('\n') : t; };
  const voiceSwitch = (compact = false) => (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-zinc-500`}>
      <span>{compact ? 'voice' : 'Voice'}</span>
      {Object.entries(VOICES).map(([k, v]) => (
        <button key={k} onClick={() => chooseVoice(k)} title={k === 'plain' ? 'everyday words, no names for anything' : 'the reading in the map\'s own names'}
          className={`rounded-full px-3 py-1 border transition-colors ${voice === k ? 'border-amber-500/70 text-amber-300 bg-amber-950/20' : 'border-zinc-700/70 text-zinc-500 hover:text-zinc-300'}`}>
          {v.label}
        </button>
      ))}
    </div>
  );

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('anim');
      if (p === '1') localStorage.setItem('nkya_ez_anim', '1');
      if (p === '0') localStorage.setItem('nkya_ez_anim', '0');
      const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // ON for everyone on /ez (founder, 2026-09-14: "let's just push it to prod"); ?anim=0 turns it
      // off for a browser, ?anim=1 turns it back on; reduced-motion users never see it.
      if (!reduced && localStorage.getItem('nkya_ez_anim') !== '0') setAnimOn(true);
    } catch {}
  }, []);

  // The sequence plays on the real draw while the Reader writes. It is the shared module the
  // bench runs — components/map/landing.js — handed the map section below and this page's own
  // header as the place to land. A tap anywhere on the map skips to the finished header.
  const playLanding = async (draw, slotsSelector = '[data-ez-header]', scrollTop = true) => {
    const signal = { skip: false };
    skipRef.current = signal;
    let surface = null;
    for (let i = 0; i < 80; i++) {
      surface = document.querySelector('[data-ez-map] [data-map-surface]');
      if (surface && surface.querySelectorAll('[data-position]').length >= 78 && cameraRef.current) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!surface) return;
    placeWordmark(surface);
    if (scrollTop) { try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {} }
    setOverlayIn(true);
    // The first run on a phone was chunky until every card had buffered. So: wait for all 78
    // images to load (capped at ten seconds, in case one never does) before the seek begins.
    setMapReady(false);
    const imgs = [...surface.querySelectorAll('[data-position] img')];
    await Promise.race([
      Promise.all(imgs.map(im => (im.complete && im.naturalWidth > 0) ? Promise.resolve() : new Promise(res => { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); }))),
      new Promise(res => setTimeout(res, 10000))
    ]);
    setMapReady(true);
    await new Promise(r => setTimeout(r, 350));
    try {
      await runLanding({
        surface, cameraRef,
        draws: { [draw.position]: { transient: draw.transient, status: draw.status } },
        table: {}, slotsSelector, signal, flyWordmark: false
      });
    } catch { /* skipped */ }
    // the clones stay parked in the header while the page comes back; begin() clears them
  };
  // (tap-to-skip removed at the founder's word; the signal stays so a future control can use it)
  const [turns, setTurns] = useState([]); // {id, role:'reader'|'you'|'catchup', text, question, chips, reflect, forge, draw, mode, ts}
  const [input, setInput] = useState('');
  const [fieldMode, setFieldMode] = useState(null); // null | 'reflect' | 'forge'
  const [hasHistory, setHasHistory] = useState(false);
  const [door, setDoor] = useState(null);            // the chosen house door, or null
  // A question suggested from this account's own readings — ON DEMAND. The founder, 2026-09-15:
  // "I've had the same one show up every time ... I want to proactively press that button." So
  // nothing is generated on load; a tap asks for one, and "try another" asks for a different one,
  // with everything already suggested handed to the model to avoid.
  const [suggested, setSuggested] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(true); // the suggestion card can fold away and come back without a new ask
  const suggestedSeen = useRef([]);
  const suggestFromHistory = async () => {
    if (!user || suggesting) return;
    setSuggesting(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;
      const cr = await fetch('/api/user/context?draws=[]', { headers: { Authorization: `Bearer ${token}` } });
      const cj = await cr.json();
      if (!cj?.contextBlock) return;
      const avoid = suggestedSeen.current.length
        ? `

Already suggested this session — pick a DIFFERENT thread, not a rewording of these:
${suggestedSeen.current.map(q => `- ${q}`).join('\n')}`
        : '';
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${cj.contextBlock}

From this person's readings, write ONE short question they might want to take up today — a live thread, in their own voice, under 12 words. Name the actual subject if the history names one. Vary the angle: the whole history is fair game, not only the latest reading.${avoid}

Respond with ONLY JSON: {"q": "..."}` }],
          system: 'You write one short question and nothing else. JSON only.',
          model: MODEL_IDS.haiku, max_tokens: 120, userId: user.id
        })
      });
      const rj = await res.json();
      const q = parseJson(rj?.reading)?.q;
      const clean = (q && typeof q === 'string' && q.trim().length > 3) ? q.trim() : '';
      if (clean) { suggestedSeen.current.push(clean); setSuggested(clean); setSuggestOpen(true); }
    } catch {} finally { setSuggesting(false); }
  };
  const [selectedInfo, setSelectedInfo] = useState(null); // the main reader's detail modal, reused
  const [infoHistory, setInfoHistory] = useState([]);
  const [pastReadings, setPastReadings] = useState([]);   // this account's EZ readings, for live reload
  const [showPast, setShowPast] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false); // the five doors fold away under a toggle (founder, 2026-09-16)
  // THE BOX IS THE ANCHOR. The frame used to be centred as a whole, so unfolding the areas grew it
  // and the box slid up. Now only the box-and-row part is measured, and the top padding is set so
  // THAT sits where the centred frame sat; whatever unfolds is added beneath it and the box stays.
  // The scrollbar's gutter is reserved all the time on this page, so the frame does not shift
  // left by half a scrollbar when the areas unfold and the page grows tall enough to scroll.
  useEffect(() => {
    const el = document.documentElement; const prev = el.style.scrollbarGutter;
    el.style.scrollbarGutter = 'stable';
    return () => { el.style.scrollbarGutter = prev; };
  }, []);
  const anchorRef = useRef(null);
  const [anchorPad, setAnchorPad] = useState(null);
  useEffect(() => {
    const el = anchorRef.current; if (!el) return;
    const fit = () => setAnchorPad(Math.max(16, Math.round((window.innerHeight * 0.62 - el.offsetHeight) / 2)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [draws, door, allowed]);
  const [explain, setExplain] = useState(null);           // 'reflect' | 'forge' | null
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const userContextRef = useRef(''); // history: the journey block the full reader injects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  const endRef = useRef(null);
  const saveTimer = useRef(null);

  // Gate: signed in AND (admin OR ez_enabled flag). Then load the history block.
  // Runs on mount and again the moment someone signs in, so the door opens in place.
  const checkGate = useCallback(async () => {
      try {
        const { user: u } = await getUser();
        setUser(u || null);
        let flag = false;
        try { const r = await fetch('/api/feature-flags'); const j = await r.json(); flag = !!j?.flags?.ez_enabled; } catch {}
        setAllowed(!!u && (isAdmin(u) || flag));
        if (u) {
          setHasHistory(true);
          // (the history question is no longer generated on load — see suggestFromHistory)
        }
      } catch { setAllowed(false); }
  }, []);

  useEffect(() => { rememberAuthReturn('/ez'); checkGate(); }, [checkGate]);

  // Persist the discourse with the reading (debounced), same table as every other reading.
  useEffect(() => {
    if (!savedId || turns.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns } }, usage }).catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [turns, savedId, usage]);

  const systemPrompt = `${BASE_SYSTEM}\n\n${buildPersonaPrompt('friend', 5, 'clear')}\n\n${EZ_RULES}${VOICES[voice]?.rules ? `\n\n${VOICES[voice].rules}` : ''}`;

  const discourseText = useCallback((list) => list.map((t) => {
    if (t.role === 'you') {
      const verb = t.mode === 'reflect' ? 'ASKER REFLECTS (puts a question to the field)'
        : t.mode === 'forge' ? 'ASKER FORGES (declares)' : t.act ? 'ASKER (asks for one small thing to do)' : 'ASKER';
      return `${verb}: "${t.text}"`;
    }
    if (t.role === 'catchup') return '[catch-up card shown]';
    return `READER${t.draw ? ` (on the newly drawn ${drawLabel(t.draw)})` : t.act ? ' (one small act, then quiet)' : ''}: ${t.text}`;
  }), []);

  // Every turn used to be re-sent in full on every call, so a long session paid more and more
  // for its own history. Keep the newest within a budget and say how much was dropped.
  const discourseBlock = useCallback((list) => {
    let lines = discourseText(list);
    const CAP = 12000;
    let dropped = 0;
    while (lines.length > 1 && lines.join('\n\n').length > CAP) { lines = lines.slice(1); dropped += 1; }
    const note = dropped ? `\n\n(${dropped} earlier turn${dropped > 1 ? 's' : ''} omitted for length; the reading and its cards are unchanged.)` : '';
    return lines.join('\n\n') + note;
  }, [discourseText]);

  const rawCall = async (userMessage, system = systemPrompt, maxTokens = 1100) => {
    if (bench) { await new Promise((r) => setTimeout(r, 600)); return { reading: JSON.stringify(benchReply(userMessage)), usage: null }; }
    const res = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system, model: MODEL_IDS.sonnet, max_tokens: maxTokens, userId: user?.id })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.usage) setUsage((u) => ({
      input_tokens: (u.input_tokens || 0) + (data.usage.input_tokens || 0),
      output_tokens: (u.output_tokens || 0) + (data.usage.output_tokens || 0),
      cache_read_input_tokens: (u.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0),
      cache_creation_input_tokens: (u.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0)
    }));
    return data;
  };

  // One strict retry before giving up. A dropped brace used to cost the person their turn and
  // the tokens both; now it costs one cheap re-ask.
  const callReader = async (userMessage, system = systemPrompt, maxTokens = 1100) => {
    let data = await rawCall(userMessage, system, maxTokens);
    let obj = parseJson(data.reading);
    if (!obj || !obj.reader) {
      data = await rawCall(
        `${userMessage}\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.`,
        system, maxTokens
      );
      obj = parseJson(data.reading);
    }
    if (!obj || !obj.reader) throw new Error('The Reader answered in a shape I could not read, twice. Nothing was lost — try that again.');
    return { obj, usage: data.usage };
  };

  // The question is shown after the medicine; a prose that ends by asking it too shows it
  // twice. The rule says not to, the model sometimes does anyway, so the repeat is stripped.
  const stripTrailingQuestion = (text, q) => {
    if (!text || !q) return text || '';
    const norm = (x) => x.replace(/[\s*_"'‘’“”.?!]+/g, '').toLowerCase();
    const paras = text.trim().split(/\n\n+/);
    const last = paras[paras.length - 1] || '';
    if (paras.length > 1 && norm(last) === norm(q)) return paras.slice(0, -1).join('\n\n');
    return text;
  };
  const readerTurn = (obj, extra = {}) => ({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    role: 'reader',
    text: stripTrailingQuestion(obj.reader, obj.question),
    question: obj.question || '',
    chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 7) : [], // answer, build, pushback, clarify, stair, and up to two locate chips (a cap of 5 was silently dropping Find it)
    reflect: Array.isArray(obj.reflect) ? obj.reflect.slice(0, 4) : [],
    forge: Array.isArray(obj.forge) ? obj.forge.slice(0, 4) : [],
    medicine: typeof obj.medicine === 'string' ? obj.medicine.trim() : '',
    located: typeof obj.located === 'string' ? obj.located.trim() : '',
    actLine: typeof obj.act === 'string' ? obj.act.trim() : '',
    ts: Date.now(),
    ...extra
  });

  // The journey block: recent readings, narrative summaries, and any personalization facts
  // the account has switched on. The route authenticates by Bearer token — a userId query
  // param silently returns an empty block, which is how EZ shipped without history yesterday.
  const loadHistory = async (drawsToUse) => {
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return '';
      const params = new URLSearchParams({ draws: JSON.stringify(drawsToUse || []) });
      const res = await fetch(`/api/user/context?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data?.contextBlock || '';
    } catch { return ''; }
  };

  const openInfo = (info) => {
    setInfoHistory((h) => (selectedInfo ? [...h, selectedInfo] : h));
    setSelectedInfo(info);
  };
  const goBackInfo = () => {
    setInfoHistory((h) => {
      if (!h.length) { setSelectedInfo(null); return h; }
      setSelectedInfo(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  // EZ readings save into the same table as every other reading, so reload is a filtered
  // query and four pieces of state — no separate save/load path was ever built.
  const loadPastList = async () => {
    try {
      const { data } = await getReadings(50);
      setPastReadings((data || []).filter((r) => r.mode === 'ez'));
      setShowPast(true);
    } catch { setError('Could not load your readings.'); }
  };

  // /ez?bench=1 — THE LAYOUT BENCH: a fixed draw and a canned conversation, no API, nothing saved
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let on = false;
    try { on = new URLSearchParams(window.location.search).get('bench') === '1'; } catch {}
    if (!on) return;
    setBench(true);
    setDraws([BENCH_DRAW]); setQuestion(BENCH_QUESTION); setAsked(BENCH_QUESTION); setSavedId(null);
    const now = Date.now();
    const opening = readerTurn(BENCH_OPENING);
    setTurns([
      { ...opening, id: 'b1', ts: now },
      { id: 'b2', role: 'you', text: 'Help me find which thing this actually is.', mode: null, ts: now + 1 },
      { ...readerTurn(BENCH_FUNNEL), id: 'b3', locating: { what: 'the thing that is already done', step: 1 }, ts: now + 2 },
      { id: 'b4', role: 'you', text: "Honestly, the role. I keep showing up out of habit.", mode: null, ts: now + 3 },
      { ...readerTurn({ ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' }), id: 'b5', locating: { what: 'the thing that is already done', step: 2 }, ts: now + 4 },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);

  // /ez?load=<id> — arriving from the journal or the main reader's redirect
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let id = null;
    try { id = new URLSearchParams(window.location.search).get('load'); } catch {}
    if (id) { openPast(id); try { window.history.replaceState(null, '', '/ez'); } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);
  const openPast = async (id) => {
    setLoading(true); setError('');
    try {
      const { data } = await getReading(id);
      const saved = data?.interpretation?.synthesis?._ez || data?.synthesis?._ez;
      const savedDraws = Array.isArray(data?.draws) ? data.draws : null;
      if (!saved?.turns?.length || !savedDraws) throw new Error('That reading has no conversation saved.');
      setQuestion(data.topic || data.question || '');
      setDraws(savedDraws.map((d) => ({ position: d.position, transient: d.transient, status: d.status })));
      setTurns(saved.turns);
      setSavedId(data.id);
      setShowPast(false); setDoor(null); setFieldMode(null);
      userContextRef.current = await loadHistory(savedDraws);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const scrollToEnd = () => requestAnimationFrame(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80));

  const spreadKeyFor = (n) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : 'five');

  // ---- the opening turn ----
  const begin = async () => {
    // A door with no added context is a complete question on its own — tap-and-draw must always
    // work. Added context, when there is any, IS the question; the door only frames it.
    const typed = sanitizeForAPI(question.trim());
    const q = typed || (door ? sanitizeForAPI(door.breath) : '');
    if (!q) { setError('Pick something, or say what is on your mind.'); return; }
    setAsked(q);
    setError(''); setLoading(true); setTurns([]); setSavedId(null); setFieldMode(null);
    const newDraws = generateSpread(cardCount);
    setDraws(newDraws);
    // one card only, for now; the answer never waits on the motion by more than the last flight
    const willAnimate = animOn && cardCount === 1;
    let landed = Promise.resolve();
    if (willAnimate) {
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
      // the map starts just under the tagline ("THE SOUL SEARCH ENGINE"), not over it
      const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
      setOverlayTop(brand ? Math.max(0, Math.round(brand.getBoundingClientRect().bottom + 6)) : 0);
      readyRef.current = false; setReplyReady(false);
      setOverlayIn(false); setRevealed(false); setAnimating(true);
      landed = playLanding(newDraws[0]).catch(() => {});
    }
    try {
      const sk = spreadKeyFor(cardCount);
      const drawText = fmtDraw(newDraws, 'discover', sk, false, null, null, null);
      const history = await loadHistory(newDraws);
      userContextRef.current = history;
      const ctx = history ? `${history}\n\n` : '';
      const doorBlock = door
        ? `\n\nTHE DOOR THEY CAME THROUGH: ${door.label} — "${door.breath}" (the ${door.house} house)${door.viaDaily ? ' — CHOSEN FOR THEM AT RANDOM as a daily reading; they brought no question of their own.' : ''}. This is where they located themselves before any card was drawn. Let it frame what you attend to; it is not a verdict, and the cards still say what they say.`
        : '';
      const msg = `${ctx}QUESTION: "${q}"${doorBlock}\n\nTHE DRAW:\n${drawText}\n\nThis is THE OPENING TURN. Follow EZ MODE exactly. JSON only.`;
      const { obj, usage: u } = await callReader(msg);
      const first = readerTurn(obj);
      setTurns([first]);
      readyRef.current = true; setReplyReady(true);
      try {
        const { data } = await saveReading({
          question: q, cards: newDraws, letter: null,
          synthesis: { _ez: { version: EZ_VERSION, turns: [first], voice } },
          mode: 'ez', spreadType: door ? `ez-${sk}-${door.id}` : `ez-${sk}`, model: 'sonnet', tokenUsage: u, voice: 'friend'
        });
        if (data?.id) setSavedId(data.id);
      } catch {}
      if (!willAnimate) scrollToEnd();
    } catch (e) { setError(e.message); readyRef.current = true; setReplyReady(true); }
    await landed;
    if (willAnimate) {
      // the page comes back under the landed cards: header and discourse fade in, the map fades
      // out, and only then do the clones go — the real header sits exactly beneath them
      setRevealed(true);
      setOverlayIn(false);
      await new Promise(r => setTimeout(r, 700));
      clearLanding(document);
      setAnimating(false);
    } else {
      setRevealed(true);
    }
    setLoading(false);
  };

  // ---- every later turn; mode null = talk, 'reflect'/'forge' = a card is drawn ----
  const send = async (textIn, modeIn, opts) => {
    const mode = modeIn !== undefined ? modeIn : fieldMode;
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    // FIND IT: a tapped locate chip opens the funnel; a plain talking turn while it is open
    // continues it (up to three rounds, or until the Reader reports the thing located).
    let loc = null;
    if (opts?.locate) loc = { what: opts.locate, step: 1 };
    else if (!mode) {
      const lr = [...turns].reverse().find((t) => t.role === 'reader');
      if (lr?.locating && !lr.located && lr.locating.step < (lr.locating.balanced ? 2 : 3)) loc = { what: lr.locating.what, step: lr.locating.step + 1 };
    }
    setError(''); setLoading(true); setInput('');
    const newDraw = mode ? generateSpread(1)[0] : null;
    const you = { id: `y${Date.now()}`, role: 'you', text, mode: mode || null, ts: Date.now() };
    const withYou = [...turns, you];
    setFieldMode(null);
    // THE NEW CARD LANDS IN ITS OWN TURN (founder, 2026-09-16, an experiment): a reflect or
    // forge draws its card at once, a pending reader turn holding only the stacked card is
    // added, the page is scrolled so that card sits just under the brand — where the header
    // sits for the opening — and the same landing flies the card into it while the reply is
    // fetched. The words arrive underneath when the Reader answers.
    const willAnimate = !!newDraw && animOn;
    const pid = `t${Date.now()}p`;
    let landed = Promise.resolve();
    if (willAnimate) {
      setTurns([...withYou, { id: pid, role: 'reader', pending: true, draw: newDraw, mode, text: '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
        const top = brand ? brand.getBoundingClientRect().bottom + 6 : 0;
        const el = document.querySelector(`[data-ez-turn="${pid}"]`);
        if (el) window.scrollBy({ top: el.getBoundingClientRect().top - top - 8, behavior: 'instant' });
        setOverlayTop(Math.max(0, Math.round(top)));
      } catch {}
      // the page beneath fades away for the flight, as it does for the opening (the founder
      // saw the conversation and the buttons showing through the map)
      setRevealed(false);
      setOverlayIn(false); setAnimating(true);
      landed = playLanding(newDraw, `[data-ez-turn="${pid}"]`, false);
    } else {
      setTurns(withYou);
      scrollToEnd();
    }
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const ctx = userContextRef.current ? `${userContextRef.current}\n\n` : '';
      const fieldNow = [...withYou].reverse().find((t) => t.role === 'reader' && t.draw)?.draw || null;
      const newCardBlock = newDraw
        ? `\n\nA NEW CARD WAS DRAWN IN RESPONSE:\n${drawBrief(newDraw)}\nInterpret it as the field's answer to what they just ${mode === 'reflect' ? 'asked' : 'declared'}, in relation to the reading already on the table. THIS CARD'S MEDICINE LEADS NOW. The opening draw's medicine is at most secondary from here; do not call it the way through. Fill "medicine" from THIS card's Rebalancer and mechanism, and administer it — its card's own meaning must be in your words.`
        : fieldNow
          ? `\n\nTHE CARD MOST RECENTLY DRAWN (its medicine governs this turn, the opening draw's is secondary):\n${drawBrief(fieldNow)}`
          : '';
      if (loc) loc.balanced = (fieldNow || draws[0])?.status === 1; // Balanced → the invitation only needs an address
      const findBlock = loc ? locateBlock(loc, drawBrief(fieldNow || draws[0])) : '';
      const msg = `${ctx}QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(withYou)}${newCardBlock}${findBlock}${brazierBlock()}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      const { obj } = await callReader(msg);
      const turn = readerTurn(obj, { ...(newDraw ? { draw: newDraw, mode } : {}), ...(loc ? { locating: loc } : {}) });
      if (willAnimate) {
        // the words arrive under the landed card; the same id keeps the card's element in place
        await landed;
        setTurns((list) => list.map((x) => (x.id === pid ? { ...turn, id: pid } : x)));
        setRevealed(true);
        setOverlayIn(false);
        await new Promise(r => setTimeout(r, 700));
        clearLanding(document);
        setAnimating(false);
      } else {
        setTurns((list) => [...list, turn]);
        scrollToEnd();
      }
    } catch (e) {
      // Take the orphaned turn back out and hand the person their words again, so a failure
      // costs a tap instead of a thought.
      if (willAnimate) { if (skipRef.current) skipRef.current.skip = true; setRevealed(true); setOverlayIn(false); clearLanding(document); setAnimating(false); }
      setTurns((list) => list.filter((x) => x.id !== you.id && x.id !== pid));
      setInput(text);
      setFieldMode(mode || null);
      setError(e.message);
    }
    setLoading(false);
  };

  // ---- the do-something button: one small real act, no draw, no question ----
  const fieldCard = () => [...turns].reverse().find((t) => t.role === 'reader' && t.draw)?.draw || draws?.[0] || null;
  const actLineNow = () => { const t = [...turns].reverse().find((x) => x.role === 'reader' && x.actLine); return t?.actLine || ''; };
  // ONE SMALL STEP — a panel like the Brazier (founder, 2026-09-16 night): collapsed by default,
  // opening it fetches ONE act for the card in play and shows it inside; nothing enters the
  // transcript. The Reader is told what was handed over (see brazierBlock) so the pills know.
  const [stepOpen, setStepOpen] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepBusy, setStepBusy] = useState(false);
  const stepKeyRef = useRef('');
  const fetchStep = async () => {
    const card = fieldCard(); if (!card || stepBusy) return;
    const k = buildKernel(card, DEFS);
    const line = actLineNow() || `What is one small real thing I can do about this in the next minute?`;
    setStepBusy(true); setError('');
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks for one small thing to do): "${line}"`;
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE CARD IN PLAY:\n${drawBrief(card)}${doSomethingBlock(k)}`;
      const { obj } = await callReader(msg, systemPrompt, 500);
      setStepText(String(obj.reader || '').trim());
      stepKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setStepBusy(false);
  };
  const toggleStep = () => {
    const next = !stepOpen;
    setStepOpen(next);
    if (next) {
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== stepKeyRef.current || !stepText) { setStepText(''); fetchStep(); }
    }
  };

  // ---- THE BRAZIER: "why is this happening?" — beside the conversation, not in it ----
  const [brazierOpen, setBrazierOpen] = useState(false);
  const [brazier, setBrazier] = useState({});          // { [ring]: text }
  // WHAT THEY HAVE READ ABOUT WHY — handed to the Reader as background (founder, 2026-09-16
  // night), so the next turn and its pills build on where the person's understanding actually
  // is instead of repeating the tense line back to them. Background, never subject; never quoted.
  const brazierBlock = () => {
    const read = [1, 2, 3].filter((r) => brazier[r]);
    const step = stepText ? `\n\nTHE ONE SMALL STEP THEY WERE HANDED (they opened "one small step"; background — do not repeat it, do not turn it into homework, build on it only if they bring it up):\n${stepText}` : '';
    if (!read.length) return step;
    return `${step}\n\nWHAT THEY HAVE READ ABOUT WHY (they opened the "why is this happening?" panel; this is BACKGROUND, not subject — build on it, never quote it, never repeat its tense line or its ask back to them, and do not make it the topic):\n${read.map((r) => brazier[r]).join('\n\n')}`;
  };
  const [brazierRing, setBrazierRing] = useState(1);   // how deep the person has gone
  const [brazierBusy, setBrazierBusy] = useState(0);   // the ring being fetched, or 0
  const [brazierGlow, setBrazierGlow] = useState(false);
  const brazierKeyRef = useRef('');
  const fetchRing = async (ring) => {
    const card = fieldCard(); if (!card || brazierBusy) return;
    const key = `${card.transient}:${card.position}:${card.status}`;
    if (brazierKeyRef.current !== key) { brazierKeyRef.current = key; setBrazier({}); setBrazierRing(1); }
    setBrazierBusy(ring); setError('');
    try {
      const k = buildKernel(card, DEFS);
      const prior = [1, 2, 3].filter((r) => r < ring && brazier[r]).map((r) => `RING ${r}, already shown to them:\n${brazier[r]}`).join('\n\n');
      const msg = `THE PERSON'S QUESTION: "${sanitizeForAPI(asked || question)}"\n\n${kernelBlock(k)}${prior ? `\n\n${prior}` : ''}\n\nWrite ring ${ring}. JSON only.`;
      let data = await rawCall(msg, brazierSystem(ring), ring === 1 ? 500 : 800);
      let obj = parseJson(data.reading);
      if (!obj?.text) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, brazierSystem(ring), 800); obj = parseJson(data.reading); }
      if (!obj?.text) throw new Error('The brazier went out — try again.');
      // the word limits are hard (Keel's spec: ring 1 is 90–135); one rewrite if the model ran long
      const LIMIT = { 1: 135, 2: 170, 3: 240 }[ring];
      const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
      if (words(obj.text) > LIMIT) {
        data = await rawCall(`${msg}\n\nYOUR LAST RENDER WAS ${words(obj.text)} WORDS; THE HARD LIMIT IS ${LIMIT}. Rewrite it under the limit, same facts, same mechanism:\n${obj.text}`, brazierSystem(ring), 800);
        const again = parseJson(data.reading);
        if (again?.text && words(again.text) <= words(obj.text)) obj = again;
      }
      setBrazier((b) => ({ ...b, [ring]: obj.text.trim() }));
      setBrazierRing(ring);
    } catch (e) { setError(e.message); }
    setBrazierBusy(0);
  };
  const toggleBrazier = () => {
    const next = !brazierOpen;
    setBrazierOpen(next);
    if (next) {
      setBrazierGlow(true); setTimeout(() => setBrazierGlow(false), 900);
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== brazierKeyRef.current || !brazier[1]) fetchRing(1);
    }
  };

  // ---- other options: fresh pills for the latest turn ----
  // The founder, 2026-09-15: the build / push back / clarify pills (and the reflects and
  // forges) should be regenerable. One call rewrites all three sets for the last reader turn,
  // told what it already offered so it takes a different angle; the turn's text is untouched.
  const [regenning, setRegenning] = useState(false);
  const regenPills = async () => {
    if (loading || regenning || !lastReader || !draws) return;
    setRegenning(true); setError('');
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const prior = lastReader.pillsSeen || { chips: lastReader.chips || [], reflect: lastReader.reflect || [], forge: lastReader.forge || [] };
      const seen = [...prior.chips.map((c) => c.text), ...prior.reflect, ...prior.forge].filter(Boolean);
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(turns)}\n\n${brazierBlock()}\n\nOTHER OPTIONS. Do NOT write a new turn. For the reader's LATEST turn above, write a fresh set of chips (build, pushback, clarify, a stair if one is obvious, and a locate chip for anything the turn left unnamed — FIND IT), four reflects and four forges — the same rules as EZ MODE, from this exact moment. Take a DIFFERENT angle from these, which the person has already been offered and does not want:\n${seen.map((t) => `- ${t}`).join('\n')}\n\nRespond with ONLY JSON: {"reader": "", "question": "", "chips": [...], "reflect": [...], "forge": [...]}`;
      // callReader insists on a non-empty "reader"; this call has none, so it goes raw, with one retry
      let data = await rawCall(msg, systemPrompt, 900);
      let obj = parseJson(data.reading);
      if (!obj || !Array.isArray(obj.chips)) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, systemPrompt, 900); obj = parseJson(data.reading); }
      if (!obj || !Array.isArray(obj.chips)) throw new Error('Could not read the new options — try again.');
      const fresh = readerTurn({ ...obj, reader: obj.reader || ' ' });
      setTurns((list) => list.map((t) => (t.id === lastReader.id
        ? { ...t, chips: fresh.chips.length ? fresh.chips : t.chips, reflect: fresh.reflect.length ? fresh.reflect : t.reflect, forge: fresh.forge.length ? fresh.forge : t.forge,
            pillsSeen: { chips: [...prior.chips, ...fresh.chips], reflect: [...prior.reflect, ...fresh.reflect], forge: [...prior.forge, ...fresh.forge] } }
        : t)));
    } catch (e) { setError(e.message); }
    setRegenning(false);
  };

  // ---- say that again, simpler ----
  const simplify = async (turnId) => {
    if (loading) return;
    const src = turns.find((t) => t.id === turnId);
    if (!src) return;
    setLoading(true); setError('');
    try {
      const msg = `THE TURN TO REWRITE:\n${src.text}\n\n${SIMPLER_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${SIMPLER_RULES}`, 700);
      setTurns((list) => list.map((t) => (t.id === turnId
        ? { ...t, text: obj.reader, question: obj.question || t.question, simplified: true }
        : t)));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ---- where am I ----
  const catchUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError('');
    try {
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' · ')}\n\nTHE DISCOURSE SO FAR:\n${discourseBlock(turns)}\n\n${CATCHUP_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CATCHUP_RULES}`, 400);
      setTurns((list) => [...list, { id: `c${Date.now()}`, role: 'catchup', text: obj.reader, question: obj.question || '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // EXPORT — the reading and the whole conversation as one markdown file, the way the full
  // reader exports (founder, 2026-09-16: "shift the export feature over").
  const exportMarkdown = () => {
    if (!draws) return;
    const L = [];
    L.push(`# Nirmanakaya — EZ reading`, ``, `**Asked:** ${question || (door ? door.breath : '')}`, `**When:** ${new Date().toLocaleString()}`, `**Voice:** ${VOICES[voice]?.label || voice}`, ``);
    L.push(`## The draw`);
    draws.forEach((d) => {
      const m = medicineFor([d])[0];
      L.push(`- ${drawLabel(d)}${m ? ` — ${m.balanced ? 'grows toward' : 'corrected by'} ${m.to}${m.path ? ` (${m.path})` : ''}` : ''}`);
    });
    L.push(``, `## The conversation`, ``);
    turns.forEach((t) => {
      if (t.role === 'you') { L.push(`**You${t.mode === 'reflect' ? ' (reflecting)' : t.mode === 'forge' ? ' (forging)' : t.act ? ' (asking for one small thing)' : ''}:** ${t.text}`, ``); return; }
      if (t.role === 'catchup') { L.push(`*Where am I:*`, ``, t.text, ``); return; }
      if (t.draw) L.push(`*A new card: ${drawLabel(t.draw)}*`, ``);
      L.push(`**Reader:**`, ``, t.text, ``);
      if (t.located) L.push(`*Found: ${t.located}*`, ``);
      if (t.medicine) L.push(`> ◈ ${t.medicine}`, ``);
      if (t.question) L.push(`*${t.question}*`, ``);
    });
    L.push(`---`, `*nirmanakaya.com/ez*`);
    const md = L.join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nirmanakaya-ez-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const reset = () => {
    setDraws(null); setTurns([]); setSavedId(null); setFieldMode(null); setError(''); setDoor(null); setQuestion('');
    setUsage({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  };

  // Sonnet list price: $3/M in, $15/M out; cache reads at 10%, cache writes at 125% of input.
  const estCost = ((usage.input_tokens || 0) * 3 + (usage.cache_read_input_tokens || 0) * 0.3
    + (usage.cache_creation_input_tokens || 0) * 3.75 + (usage.output_tokens || 0) * 15) / 1e6;

  // The pills come from the last reader turn that CARRIES pills: an act turn ("one small thing")
  // goes quiet on purpose, but the conversation must still be continuable from where it was
  // (founder, 2026-09-16 night: "after selecting one small thing, the pills are all gone").
  const lastReader = [...turns].reverse().find((t) => t.role === 'reader' && !t.act) || [...turns].reverse().find((t) => t.role === 'reader');
  // THE FIELD AT A TURN: the most recently drawn card up to and including that turn governs
  // its medicine container; before any reflect or forge, the opening draw. (The container
  // used to fall back to the opening draw on every talking turn — a stale growth box.)
  const firstReaderIdx = turns.findIndex((t) => t.role === 'reader');
  const fieldAt = (ti) => {
    for (let i = ti; i >= 0; i--) { const t = turns[i]; if (t?.role === 'reader' && t.draw) return [t.draw]; }
    return draws || [];
  };

  // The pills re-render with the switch: talk / ask the field / declare to the field.
  const activePills = !lastReader ? []
    : fieldMode === 'reflect' ? (lastReader.reflect || []).map((text) => ({ kind: 'reflect', text }))
      : fieldMode === 'forge' ? (lastReader.forge || []).map((text) => ({ kind: 'forge', text }))
        : (lastReader.chips || []);

  // The two switches are, in the founder's words, "probably the most valuable buttons in the
  // whole thing" — and people scrolled past them. Now each takes half the row, sized like the
  // pills, with one line inside saying what it does.
  const switchBtn = (mode, label, glyph) => {
    const on = fieldMode === mode;
    const tone = mode === 'reflect'
      ? (on ? 'border-sky-400 bg-sky-900/40 text-sky-100' : 'border-sky-700/50 bg-sky-950/20 text-sky-200 hover:border-sky-500 hover:bg-sky-900/30')
      : (on ? 'border-orange-400 bg-orange-900/40 text-orange-100' : 'border-orange-700/50 bg-orange-950/20 text-orange-200 hover:border-orange-500 hover:bg-orange-900/30');
    const hint = mode === 'reflect' ? 'ask the cards a question' : 'declare a move — the cards answer';
    return (
      <button onClick={() => setFieldMode(on ? null : mode)} disabled={loading}
        className={`relative overflow-hidden flex-1 min-w-0 text-center rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-40 ${tone}`}>
        <span className="flex items-center justify-center gap-2 text-[15px] font-medium">
          {mode === 'reflect'
            ? <span className="absolute left-0 top-0 h-full aspect-square overflow-hidden rounded-l-lg" aria-hidden="true"><HoverVideo src="/video/reflect.mp4" className="w-full h-full object-cover" style={{ mixBlendMode: 'screen' }} /></span>
            : <span className="absolute right-0 top-0 h-full aspect-square overflow-hidden rounded-r-lg" aria-hidden="true"><HoverVideo src="/video/forge.mp4" className="w-full h-full object-cover" /></span>}
          <span>{label}</span>
        </span>
        <span className="block text-[11px] opacity-75 mt-0.5 break-words">{hint}</span>
      </button>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden ${chrome.prefs.theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={chrome.prefs.theme} style={{ '--content-dim': chrome.prefs.contentDim / 100 }}>
      {chrome.loaded && <Backdrop prefs={chrome.prefs} />}
      {user && <CornerControls prefs={chrome.prefs} set={chrome.set} onAuthChange={(u) => { if (!u) setUser(null); }}
        rightExtra={
          // the voice, as one toggle under the text size (founder, 2026-09-16): plain words / the map's words
          <button onClick={() => chooseVoice(voice === 'plain' ? 'map' : 'plain')}
            title={voice === 'plain' ? 'Plain words — tap for the map\'s words' : 'The map\'s words — tap for plain words'}
            className={`w-8 h-8 rounded-lg border backdrop-blur-sm text-[13px] font-medium flex items-center justify-center transition-all ${voice === 'plain' ? 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/40' : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
            {voice === 'plain' ? 'Aa' : '◈'}
          </button>
        } />}
      <div className="relative z-10 flex-1 flex flex-col w-full">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 overflow-x-hidden">
        <div className="mt-6" />

        {allowed === null && <p className="text-zinc-500 text-sm">Checking the door…</p>}
        {allowed === false && !user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <p className="text-base text-zinc-200 mb-1">Sign in to begin.</p>
              <p className="text-sm text-zinc-500">Your readings are saved to your account so you can come back to them.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] text-sm font-medium">
                Sign in
              </button>
              <button onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm">
                Create an account
              </button>
            </div>
          </div>
        )}

        {allowed === false && user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
            <p className="mb-2">EZ mode is invite-only while it is being built.</p>
            <p className="text-zinc-500">You are signed in as {user.email}, but this account is not on the list yet.</p>
          </div>
        )}

        {allowed && !draws && !door && (
          <div style={{ paddingTop: anchorPad === null ? '20vh' : anchorPad }}>
          {/* THE ENTRY, like the front page: one frame, the box with Ask inside it, and one quiet
              row beneath — areas, past readings, from my readings, voice. Everything else folds.
              The frame sits in the middle of the screen (founder: "like Bing or Google, right
              there in the middle, very simple"). */}
          <div ref={anchorRef} className={`content-pane bg-zinc-900/30 border border-zinc-800/50 p-4 space-y-3 ${(areasOpen || showPast || (suggested && suggestOpen) || error) ? 'rounded-t-lg' : 'rounded-lg'}`}>
            <div className="relative">
              <div className="content-pane rounded-xl">
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4}
                  placeholder="What's on your mind? Ask it the way you would say it out loud."
                  className="block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              </div>
              <button onClick={begin} disabled={loading || !question.trim()} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : 'Ask'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 items-center text-[13px]">
              <button onClick={() => (showPast ? setShowPast(false) : loadPastList())}
                className="justify-self-center text-zinc-400 hover:text-zinc-200 transition-colors">Past readings</button>
              <button onClick={() => setAreasOpen(!areasOpen)}
                className="justify-self-center flex items-center gap-1 text-amber-400/90 hover:text-amber-300 transition-colors">
                Areas
                <svg className={`w-3.5 h-3.5 transition-transform ${areasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {user && hasHistory ? (
                <div className="justify-self-center flex items-center gap-1.5 text-violet-300/90">
                  <button onClick={suggestFromHistory} disabled={suggesting}
                    className="text-center hover:text-violet-200 transition-colors disabled:opacity-50">
                    {suggesting ? 'Reading your history…' : suggested ? 'Another from my readings' : 'From my readings'}
                  </button>
                  {suggested && !suggesting && (
                    <button onClick={() => setSuggestOpen(!suggestOpen)} title={suggestOpen ? 'fold it away' : 'show it again'}
                      className="hover:text-violet-200 transition-colors">
                      <svg className={`w-3.5 h-3.5 transition-transform ${suggestOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  )}
                </div>
              ) : <span />}
            </div>
          </div>

          {(areasOpen || showPast || (suggested && suggestOpen) || error) && (
          <div className="content-pane bg-zinc-900/30 border border-t-0 border-zinc-800/50 rounded-b-lg p-4 space-y-3">
            {areasOpen && (() => {
              const byId = Object.fromEntries(DOORS.map(d => [d.id, d]));
              // the minimap's own house colours (components/reader/Minimap.js CHANNEL_COLORS)
              const HOUSE_TINT = { spirit: '#C44444', mind: '#4A8B4A', emotion: '#3D6A99', body: '#8B6B3D', gestalt: '#6B4D8A', daily: '#a16207' };
              const Door = ({ d, className = '', delay = 0 }) => {
                const c = HOUSE_TINT[d.id];
                return (
                  <button key={d.id} onClick={() => {
                      // "My daily reading" chooses one of the five houses for them, at random
                      const pick = d.id === 'daily' ? { ...DOORS[Math.floor(Math.random() * 5)], viaDaily: true } : d;
                      setDoor(pick); setQuestion(''); setError('');
                    }}
                    className={`text-center rounded-xl border px-3 py-2.5 transition-colors break-words hover:brightness-125 ${className}`}
                    style={{ borderColor: c + '99', background: c + '26', animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${delay}ms` }}>
                    <span className="text-[15px] text-zinc-100">{d.label}</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">{d.sub}</span>
                  </button>
                );
              };
              // the Gestalt door is one cell wide, centred over the four; every cell the same height
              return (
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <div className="col-span-2 flex justify-center">
                    <Door d={byId.gestalt} className="w-[calc(50%-4px)]" delay={0} />
                  </div>
                  <Door d={byId.mind} delay={180} />
                  <Door d={byId.emotion} delay={360} />
                  <Door d={byId.body} delay={540} />
                  <Door d={byId.spirit} delay={720} />
                  {/* the five doors are the five aspects of self; the random choice is a link, not a sixth door */}
                  <div className="col-span-2 text-center pt-1">
                    <button onClick={() => { setDoor({ ...DOORS[Math.floor(Math.random() * 5)], viaDaily: true }); setQuestion(''); setError(''); }}
                      className="text-sm text-amber-400/80 hover:text-amber-300 underline decoration-dotted underline-offset-4">
                      or let one be chosen for me — my daily reading
                    </button>
                  </div>
                </div>
              );
            })()}

            {showPast && (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Your EZ readings</span>
                    <button onClick={() => setShowPast(false)} className="text-xs text-zinc-600 hover:text-zinc-300">close</button>
                  </div>
                  {pastReadings.length === 0 && <p className="text-xs text-zinc-600">Nothing here yet.</p>}
                  {pastReadings.slice(0, 12).map((r, ri) => (
                    // each row flashes the rainbow once as the list opens, top to bottom (the same
                    // one-shot the front page's Enter uses), staggered so it reads as a cascade
                    <button key={r.id} onClick={() => openPast(r.id)} disabled={loading}
                      style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${ri * 180}ms` }}
                      className="w-full text-left rounded-lg border border-zinc-700/50 px-3 py-2 hover:border-amber-500/40 transition-colors break-words disabled:opacity-40">
                      <span className="text-sm text-zinc-200 break-words">{r.topic || 'Untitled'}</span>
                      <span className="block text-[10px] text-zinc-600 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
            )}

                {suggested && suggestOpen && (
                  <button onClick={() => { setDoor(null); setQuestion(suggested); setError(''); }}
                    style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: '-900ms' }}
                    className="w-full text-center rounded-xl border border-violet-700/50 bg-violet-950/20 px-4 py-3 break-words">
                    <span className="text-[10px] uppercase tracking-wider text-violet-300/70 block mb-1">From your readings — tap to use</span>
                    <span className="text-[15px] text-violet-100">{suggested}</span>
                  </button>
                )}
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
          )}
          </div>
        )}

        {/* The context step: the door has been chosen, the box becomes "add anything that matters". */}
        {allowed && !draws && door && (
          <div className="space-y-5">
            <button onClick={() => { setDoor(null); setQuestion(''); setError(''); }}
              className="text-xs text-zinc-600 hover:text-zinc-300">&larr; something else</button>

            {door.viaDaily && <p className="text-[10px] uppercase tracking-wider text-amber-400/80">Chosen for you today: {door.label}</p>}
            <p className="text-lg text-zinc-200 font-light break-words">{door.breath}</p>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Add anything that matters — or draw as it stands.
              </label>
              <div className="relative">
                <div className="content-pane rounded-xl">
                  <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={5}
                    placeholder="A sentence or two is plenty. Names, what happened, what you are weighing."
                    className="block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
                </div>
                <button onClick={begin} disabled={loading} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : 'Draw'}</span>
                  <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
        )}

        {allowed && draws && (
          <>
            {/* The original cards: the reference, not the reading */}
            <div data-ez-header="" className="flex flex-col items-center gap-5 mb-6 max-w-full" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}>
              {draws.map((d, i) => (
                <CardWithMap key={i} draw={d} onInfo={openInfo} label={drawLabel(d)} stacked={animOn} />
              ))}
            </div>
            {/* THE MAP, laid over the whole screen while it plays. It is out of the page flow, so
                nothing clips it and nothing shifts; the cards fly to the page's own header
                underneath, and the overlay lifts when they land. */}
            {/* No tap-to-skip and no helper line: the founder cut both ("it looks like a
                helper or something"). The landing plays through; the reply waits for it. */}
            {animating && (
              <div data-ez-map="" className="fixed left-0 right-0 bottom-0 z-[90] select-none"
                style={{ top: overlayTop, background: 'rgba(9, 9, 11, 0.1)', opacity: overlayIn ? 1 : 0, transition: overlayIn ? 'opacity 900ms ease' : 'opacity 450ms ease' }}>
              {/* THE VIDEO BREATHES THROUGH (founder, 2026-09-16): the overlay is 10% black, barely
                  there, so the video plays under the map almost at full strength,
                  and the quicker fade-out brings the world back when the cards land. */}
                <TheMap drawMap={{}} colorLayer="status" initialZoom={0.45} showLabels={false} showHouseLabels={false}
                  lowRes showControls={false} cameraRef={cameraRef} className="w-full h-full" />
              </div>
            )}
            <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms ease' }}>
            {bench && (
              <div className="mb-4 rounded-md border border-fuchsia-700/50 bg-fuchsia-950/30 px-3 py-1.5 text-center text-[11px] uppercase tracking-wider text-fuchsia-200/90">
                layout bench — canned reading, no API calls, nothing saved
              </div>
            )}
            <p className="text-xs text-zinc-500 italic mb-6 text-center break-words">“{asked || question}”</p>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map((t, ti) => (
                <div key={t.id} data-ez-turn={t.id}
                  style={{ opacity: t.pending ? 0 : 1, transition: 'opacity 600ms ease' }}
                  className={t.role === 'you'
                    ? 'ml-4 sm:ml-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm text-amber-100/90 italic break-words'
                    : t.role === 'catchup'
                      ? 'rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 text-sm text-violet-100 break-words'
                      : 'rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 text-[15px] leading-relaxed text-zinc-200 break-words'}>

                  {t.role === 'catchup' && <div className="text-[10px] uppercase tracking-wider text-violet-300/70 mb-2">Where you are</div>}
                  {t.role === 'you' && t.mode && (
                    <div className={`text-[10px] uppercase tracking-wider mb-2 not-italic ${t.mode === 'reflect' ? 'text-sky-300/80' : 'text-orange-300/80'}`}>
                      {t.mode === 'reflect' ? '↩ Reflecting' : '⚡ Forging'}
                    </div>
                  )}
                  {t.role === 'reader' && t.act && (
                    <div className="text-[10px] uppercase tracking-wider mb-2 text-zinc-500">one small thing</div>
                  )}

                  {/* A card drawn in answer to a reflect or a forge */}
                  {t.draw && (
                    <div className="flex justify-center mb-3">
                      {/* the same stacked pair + minimap as the header (founder, 2026-09-16) */}
                      <CardWithMap draw={t.draw} onInfo={openInfo} label={drawLabel(t.draw)} stacked />
                    </div>
                  )}

                  {ensureParagraphBreaks(t.text).split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{p.trim()}</p>
                  ))}

                  {/* THE MEDICINE — its own container, because it is half the answer, not an aside.
                      The path is computed from the draw; the words come from the Reader. */}
                  {t.role === 'reader' && t.located && (
                    <p className="mt-3 text-xs text-violet-200/90 break-words"><span className="uppercase tracking-wider opacity-70 mr-2">Found</span>{t.located}</p>
                  )}
                  {t.role === 'reader' && t.medicine && !(t.draw || ti === firstReaderIdx) && (
                    <p className="mt-3 text-xs text-emerald-300/80 italic break-words">◈ {t.medicine}</p>
                  )}
                  {t.role === 'reader' && t.medicine && (t.draw || ti === firstReaderIdx) && (
                    <div className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">
                        {medicineFor(fieldAt(ti)).some((m) => m && !m.balanced) ? '◈ The medicine' : '◈ Where this can grow'}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                        {medicineFor(fieldAt(ti)).map((m, mi) => (
                          <div key={mi} className="flex flex-col items-center max-w-full">
                            <CardImage transient={m.toId} status={1} cardName={m.to} size="compact" showFrame={true}
                              onImageClick={() => openInfo({ type: 'card', id: m.toId, data: getComponent(m.toId) })} />
                            <span className="text-[11px] text-emerald-300/90 mt-1 text-center break-words">
                              {m.from} → {m.to}
                            </span>
                            {m.path && <span className="text-[10px] text-emerald-500/60 text-center break-words">{m.path}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-emerald-100/90 leading-relaxed break-words">
                        {ensureParagraphBreaks(t.medicine).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                          <p key={xi} className="mb-2 last:mb-0">{x.trim()}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* The question, handed over AFTER the move. Founder's ruling 2026-09-14:
                      a question composed without the medicine in view ignores the very thing
                      the person just read. */}
                  {t.role === 'reader' && t.question && (
                    <p className="mt-4 text-[17px] leading-snug text-amber-300/90 break-words">{t.question}</p>
                  )}

                  {t.role === 'reader' && !t.simplified && !loading && (
                    <button onClick={() => simplify(t.id)}
                      className="mt-2 text-[11px] text-zinc-600 hover:text-zinc-400 underline decoration-dotted">
                      say it simpler
                    </button>
                  )}
                </div>
              ))}
              {loading && <div className="text-xs text-zinc-500 animate-pulse pl-2">the Reader is listening…</div>}
              {error && <div className="text-xs text-red-400 pl-2 break-words">{error}</div>}
              <div ref={endRef} />
            </div>

            {/* Tier 2: the two switches — flipping one re-renders the pills below */}
            <div className="mt-5 flex items-stretch gap-2">
              {switchBtn('reflect', 'Reflect', '↩')}
              {switchBtn('forge', 'Forge', '⚡')}
            </div>
            <div className="mt-1 flex justify-between text-[11px]">
              <button onClick={() => setExplain(explain === 'reflect' ? null : 'reflect')} className="text-zinc-500 hover:text-sky-300 underline decoration-dotted">what is Reflect?</button>
              <button onClick={() => setExplain(explain === 'forge' ? null : 'forge')} className="text-zinc-500 hover:text-orange-300 underline decoration-dotted">what is Forge?</button>
            </div>

            {explain && (
              <div className={`mt-3 rounded-lg border p-3 text-sm break-words ${explain === 'reflect' ? 'border-sky-700/40 bg-sky-950/20 text-sky-100' : 'border-orange-700/40 bg-orange-950/20 text-orange-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {explain === 'reflect' ? (
                      <>
                        <p className="font-medium mb-1">Reflect — you ask, the field answers.</p>
                        <p className="text-[13px] opacity-90">Use it when you genuinely do not know something and want the architecture to speak to it. You put a question; a new card is drawn and read as the answer to that question, in light of the reading already on the table.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Forge — you declare, the field responds.</p>
                        <p className="text-[13px] opacity-90">Use it when you are not asking but stating: what you will do, choose, commit to, or stop. A new card is drawn as the architecture&rsquo;s response to your declaration. It may affirm it, complicate it, or redirect it.</p>
                      </>
                    )}
                    <p className="text-[12px] opacity-60 mt-2">Either way the original cards never change. A new card is a lens, not a replacement.</p>
                  </div>
                  <button onClick={() => setExplain(null)} className="text-xs opacity-60 hover:opacity-100">close</button>
                </div>
              </div>
            )}

            {/* Tier 1: the pills. Talk by default; questions under Reflect; declarations under Forge. */}
            {activePills.length > 0 && !loading && (
              <div className="mt-3 flex flex-col gap-2">
                {activePills.filter((c) => c?.text).map((c, i) => (
                  <button key={i} onClick={() => send(c.text, fieldMode, c.kind === 'locate' ? { locate: c.what || c.text } : undefined)} disabled={regenning}
                    style={{ '--pill': CHIP_RGB[c.kind] || CHIP_RGB.build }}
                    className={`pill-breathe text-left rounded-lg border px-3 py-2 text-sm transition-colors break-words disabled:opacity-40 ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    {CHIP_LABEL[c.kind] && <span className="text-[10px] uppercase tracking-wider opacity-70 mr-2">{CHIP_LABEL[c.kind]}</span>}
                    {c.text}
                  </button>
                ))}
                <button onClick={regenPills} disabled={regenning}
                  className="self-center mt-1 px-4 py-2 rounded-full border border-amber-500/40 text-sm text-amber-300 hover:bg-amber-900/20 hover:border-amber-400 transition-colors disabled:opacity-50">
                  {regenning ? 'finding other options…' : '↻ Other options'}
                </button>
              </div>
            )}

            {/* Free text always present */}
            {/* Say sits INSIDE the box, bottom-right, the rainbow word with the chevron — the same
                treatment as Ask on the front box (founder, 2026-09-16 night) */}
            <div className="mt-4 relative">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={fieldMode === 'reflect' ? 'Ask the field…' : fieldMode === 'forge' ? 'Declare what you will do…' : 'Answer in your own words…'}
                className="block w-full resize-y rounded-xl bg-zinc-900/70 border border-zinc-700/60 px-4 pt-3 pb-14 text-[17px] leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={() => send()} disabled={loading || !input.trim()} className="group absolute bottom-3 right-3 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : fieldMode ? 'Draw' : 'Say'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {/* Words to the Whys and one small step live under the text box (founder, 2026-09-16 night) */}
            {/* THE BRAZIER — "why is this happening?" Collapsed by default; opening it is consent.
                Beside the conversation, not in it (Keel's spec §1). */}
            <div className="mt-4 rounded-xl border border-zinc-800/70 bg-zinc-950/40">
              <button onClick={toggleBrazier} className="relative w-full flex items-center gap-3 pl-[64px] pr-4 py-3 text-left overflow-hidden rounded-xl" style={{ minHeight: 52 }}>
                {/* the loop fills the header's full height, flush left — the same treatment as Reflect and Forge */}
                <span className="absolute left-0 top-0 h-full aspect-square overflow-hidden rounded-l-xl" aria-hidden="true">
                  <HoverVideo src="/video/brazier.mp4" className="w-full h-full object-cover" />
                </span>
                <span className="font-serif text-[19px] leading-none text-zinc-200">Words to the Whys</span>
                <svg className={`ml-auto w-4 h-4 text-zinc-500 transition-transform ${brazierOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {brazierOpen && (
                <div className="px-4 pb-4 text-[15px] leading-relaxed text-zinc-300">
                  {[1, 2, 3].filter((r) => r <= brazierRing && brazier[r]).map((r) => (
                    <div key={r} className={r > 1 ? 'mt-4 pt-4 border-t border-zinc-800/70' : ''}>
                      {r === 2 && <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">deeper</div>}
                      {r === 3 && <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">the whole picture</div>}
                      {ensureParagraphBreaks(brazier[r]).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                        <p key={xi} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                      ))}
                      {r === 3 && (
                        <p className="mt-3 text-[13px]"><Link href={savedId ? `/advanced?load=${savedId}&bridge=1` : '/advanced'} className="text-cyan-300/90 underline decoration-dotted hover:text-cyan-200">open this reading in the full reader</Link> <span className="text-zinc-500">— your conversation stays saved here; there is a way back at the top of that page</span></p>
                      )}
                    </div>
                  ))}
                  {brazierBusy > 0 && <div className="text-xs text-zinc-500 animate-pulse">{brazierBusy === 1 ? 'the brazier is catching…' : 'going deeper…'}</div>}
                  {!brazierBusy && brazier[brazierRing] && brazierRing < 3 && (
                    <button onClick={() => fetchRing(brazierRing + 1)} className="mt-3 text-[13px] text-zinc-400 hover:text-zinc-200 underline decoration-dotted">
                      {brazierRing === 1 ? 'go deeper' : 'the whole picture'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ONE SMALL STEP — the do-something panel: draws nothing, concludes (Keel's spec §2). */}
            <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40">
              <button onClick={toggleStep} className="relative w-full flex items-center gap-3 pl-[64px] pr-4 py-3 text-left overflow-hidden rounded-xl" style={{ minHeight: 52 }}>
                <span className="absolute left-0 top-0 h-full aspect-square overflow-hidden rounded-l-xl" aria-hidden="true">
                  <HoverVideo src="/video/step.mp4" className="w-full h-full object-cover" />
                </span>
                <span className="font-serif text-[19px] leading-none text-zinc-200">{DO_SOMETHING_LABEL}</span>
                <svg className={`ml-auto w-4 h-4 text-zinc-500 transition-transform ${stepOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {stepOpen && (
                <div className="px-4 pb-4 text-[15px] leading-relaxed text-zinc-300">
                  <div className="text-[11px] text-zinc-500 mb-2">{DO_SOMETHING_HINT}</div>
                  {stepBusy && <div className="text-xs text-zinc-500 animate-pulse">finding the step…</div>}
                  {!stepBusy && stepText && ensureParagraphBreaks(stepText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                    <p key={xi} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{x.trim()}</p>
                  ))}
                </div>
              )}
            </div>


            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={catchUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300">Where am I?</button>
              <button onClick={reset} className="underline decoration-dotted hover:text-zinc-300">New question</button>
              <button onClick={exportMarkdown} className="underline decoration-dotted hover:text-zinc-300">Export</button>
              <span className="ml-auto font-mono text-zinc-600" title="fresh input / cached input (billed at 10%) / output">
                {(usage.input_tokens || 0).toLocaleString()} + {((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)).toLocaleString()} cached / {(usage.output_tokens || 0).toLocaleString()} out · ~${estCost.toFixed(3)}{savedId ? ' · saved' : ''}
              </span>
            </div>
            </div>
          </>
        )}
      </main>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => { setAuthOpen(false); setAllowed(null); checkGate(); }}
        initialMode={authMode}
      />

      {selectedInfo && (
        <InfoModal
          info={selectedInfo}
          onClose={() => { setSelectedInfo(null); setInfoHistory([]); }}
          setSelectedInfo={openInfo}
          showTraditional={false}
          canGoBack={infoHistory.length > 0}
          onGoBack={goBackInfo}
        />
      )}

      <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}><Footer /></div>
    </div>
  );
}
