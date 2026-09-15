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
- For each card drawn: two or three sentences in your own voice that carry the WHOLE card — what it does, in this seat, in this status, for this question. All of it folded together; never a dimension withheld, never four readings stacked.
- One sentence tying the cards to the question.
- If the reading amounts to a verdict on the question (yes / no / not yet / not as it stands), that verdict is the FIRST sentence, plainly. Brief never means softened.
- Hard cap: 150 words for one or two cards, 220 for three or more.
- Do NOT end the prose with your question. The prose ends on the reading. The question travels alone, in the "question" field, because it is shown to the person AFTER the medicine.

EVERY LATER TURN:
- Respond to what they just said, briefly (under 120 words). Build on their thread; catch a deflection when you see one; return the choice to them.
- The cards, statuses, and any verdict never change. You may change the interpretation and the conversation; you may not bend the field.
- Do NOT end the prose with your question. It travels alone in the "question" field.

WHEN A NEW CARD IS DRAWN (a reflect or a forge): interpret that new card as the field's response — to their inquiry if they reflected, to their declaration if they forged — always in relation to the reading already on the table. The new card is a lens on what they brought, never a replacement for the original reading. Same brevity, same one question at the end.

THE THREE MOVES: under every turn, write three chips FROM THIS TURN (never stock text), each a sentence the person could say next, in their voice:
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
- On a TALKING turn (no new card drawn), rewrite "medicine" only when the conversation has genuinely moved the ground under it. Otherwise repeat it unchanged.
- On a turn where a NEW CARD IS DRAWN (a reflect or a forge), the medicine is ALWAYS that new card’s own medicine, rewritten from the Rebalancer supplied with it. Never carry the earlier reading’s medicine into it. If the new card is Balanced, the medicine carries its growth opportunity, using the target named in its own data and never an invented one.

THE QUESTION AND THE CHIPS COME OFF THE MEDICINE. The person sees your prose, then the medicine, then your question. So when there is medicine, the question must be asked in the light of the move, not of the diagnosis — it asks about the path, what stands in its way, or what the first step would actually cost. The chips follow the same rule. A question that ignores the medicine the person just read is the commonest failure of this mode.

ABSOLUTE FORMAT: respond with ONLY a JSON object, no prose outside it:
{"reader": "<your turn, paragraphs separated by blank lines, ending with your one question>", "question": "<that one question, alone>", "chips": [{"kind": "build", "text": "..."}, {"kind": "pushback", "text": "..."}, {"kind": "clarify", "text": "..."}, {"kind": "stair", "text": "..."}], "reflect": ["...", "...", "...", "..."], "forge": ["...", "...", "...", "..."], "medicine": "<one or two sentences on the correction path, or empty if nothing has changed>"}`;

const SIMPLER_RULES = `SAY IT SIMPLER — rewrite the turn below in plainer words, for someone who wants it easier to hold. Same meaning, same verdict. Nothing softened, nothing added, nothing dropped. Shorter sentences, kitchen words, no architecture vocabulary except a card's name where it is needed. Keep the one question at the end, rephrased just as plainly. Respond with ONLY a JSON object: {"reader": "<the simpler version>", "question": "<the question, plainly>", "chips": [], "reflect": [], "forge": []}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up card for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the card>", "question": "<the open thread as a question>", "chips": [], "reflect": [], "forge": []}`;

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
const DOORS = [
  { id: 'spirit',  house: 'Spirit',  label: 'My purpose',    sub: 'what my life is really about',   breath: 'Your purpose — what your life is really about.' },
  { id: 'mind',    house: 'Mind',    label: 'A decision',     sub: "one I'm trying to make",          breath: "A decision you're trying to make." },
  { id: 'emotion', house: 'Emotion', label: 'Someone in my life', sub: 'or the space between us',      breath: 'Someone in your life — or the space between you.' },
  { id: 'body',    house: 'Body',    label: 'My day-to-day',  sub: 'health, home, money, what I am carrying', breath: 'Your day-to-day — health, home, money, what you are carrying.' },
  { id: 'gestalt', house: 'Gestalt', label: 'My patterns',    sub: "who I'm becoming",                breath: "Your patterns — and who you're becoming." },
];

const CHIP_STYLE = {
  build: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30',
  pushback: 'border-orange-500/40 text-orange-200 hover:bg-orange-900/30',
  clarify: 'border-sky-500/40 text-sky-200 hover:bg-sky-900/30',
  stair: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/30',
  reflect: 'border-sky-500/50 text-sky-200 hover:bg-sky-900/30',
  forge: 'border-orange-500/50 text-orange-200 hover:bg-orange-900/30',
};
const CHIP_LABEL = { build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair' };

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
  const [cardCount, setCardCount] = useState(1);
  const [draws, setDraws] = useState(null);
  const [voice, setVoice] = useState('plain');
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
  const playLanding = async (draw) => {
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
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
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
        table: {}, slotsSelector: '[data-ez-header]', signal, flyWordmark: false
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
${suggestedSeen.current.map(q => `- ${q}`).join('
')}`
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
      if (clean) { suggestedSeen.current.push(clean); setSuggested(clean); }
    } catch {} finally { setSuggesting(false); }
  };
  const [selectedInfo, setSelectedInfo] = useState(null); // the main reader's detail modal, reused
  const [infoHistory, setInfoHistory] = useState([]);
  const [pastReadings, setPastReadings] = useState([]);   // this account's EZ readings, for live reload
  const [showPast, setShowPast] = useState(false);
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
        : t.mode === 'forge' ? 'ASKER FORGES (declares)' : 'ASKER';
      return `${verb}: "${t.text}"`;
    }
    if (t.role === 'catchup') return '[catch-up card shown]';
    return `READER${t.draw ? ` (on the newly drawn ${drawLabel(t.draw)})` : ''}: ${t.text}`;
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

  const readerTurn = (obj, extra = {}) => ({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    role: 'reader',
    text: obj.reader,
    question: obj.question || '',
    chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 4) : [],
    reflect: Array.isArray(obj.reflect) ? obj.reflect.slice(0, 4) : [],
    forge: Array.isArray(obj.forge) ? obj.forge.slice(0, 4) : [],
    medicine: typeof obj.medicine === 'string' ? obj.medicine.trim() : '',
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
      const brand = document.querySelector('[data-slot="wordmark"]')?.parentElement;
      setOverlayTop(brand ? Math.max(0, Math.round(brand.getBoundingClientRect().bottom)) : 0);
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
        ? `\n\nTHE DOOR THEY CAME THROUGH: ${door.label} — "${door.breath}" (the ${door.house} house). This is where they located themselves before any card was drawn. Let it frame what you attend to; it is not a verdict, and the cards still say what they say.`
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
  const send = async (textIn, modeIn) => {
    const mode = modeIn !== undefined ? modeIn : fieldMode;
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    setError(''); setLoading(true); setInput('');
    const newDraw = mode ? generateSpread(1)[0] : null;
    const you = { id: `y${Date.now()}`, role: 'you', text, mode: mode || null, ts: Date.now() };
    const withYou = [...turns, you];
    setTurns(withYou);
    setFieldMode(null);
    scrollToEnd();
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const ctx = userContextRef.current ? `${userContextRef.current}\n\n` : '';
      const newCardBlock = newDraw
        ? `\n\nA NEW CARD WAS DRAWN IN RESPONSE: ${drawLabel(newDraw)}\nInterpret it as the field's answer to what they just ${mode === 'reflect' ? 'asked' : 'declared'}, in relation to the reading already on the table.`
        : '';
      const msg = `${ctx}QUESTION: "${sanitizeForAPI(question)}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(withYou)}${newCardBlock}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      const { obj } = await callReader(msg);
      setTurns((list) => [...list, readerTurn(obj, newDraw ? { draw: newDraw, mode } : {})]);
      scrollToEnd();
    } catch (e) {
      // Take the orphaned turn back out and hand the person their words again, so a failure
      // costs a tap instead of a thought.
      setTurns((list) => list.filter((x) => x.id !== you.id));
      setInput(text);
      setFieldMode(mode || null);
      setError(e.message);
    }
    setLoading(false);
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

  const reset = () => {
    setDraws(null); setTurns([]); setSavedId(null); setFieldMode(null); setError(''); setDoor(null); setQuestion('');
    setUsage({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  };

  // Sonnet list price: $3/M in, $15/M out; cache reads at 10%, cache writes at 125% of input.
  const estCost = ((usage.input_tokens || 0) * 3 + (usage.cache_read_input_tokens || 0) * 0.3
    + (usage.cache_creation_input_tokens || 0) * 3.75 + (usage.output_tokens || 0) * 15) / 1e6;

  const lastReader = [...turns].reverse().find((t) => t.role === 'reader');

  // The pills re-render with the switch: talk / ask the field / declare to the field.
  const activePills = !lastReader ? []
    : fieldMode === 'reflect' ? (lastReader.reflect || []).map((text) => ({ kind: 'reflect', text }))
      : fieldMode === 'forge' ? (lastReader.forge || []).map((text) => ({ kind: 'forge', text }))
        : (lastReader.chips || []);

  const switchBtn = (mode, label, glyph) => {
    const on = fieldMode === mode;
    const tone = mode === 'reflect'
      ? (on ? 'border-sky-500 bg-sky-900/40 text-sky-200' : 'border-zinc-700 text-zinc-500 hover:text-sky-300 hover:border-sky-700')
      : (on ? 'border-orange-500 bg-orange-900/40 text-orange-200' : 'border-zinc-700 text-zinc-500 hover:text-orange-300 hover:border-orange-700');
    return (
      <button onClick={() => setFieldMode(on ? null : mode)} disabled={loading}
        className={`px-3 py-1.5 rounded-full border text-xs transition-colors disabled:opacity-40 ${tone}`}>
        {glyph} {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-x-hidden">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 overflow-x-hidden">
        <div className="flex items-center justify-between mt-4 mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">EZ mode</span>
          <div className="flex items-center gap-3">
            <TextSizeSlider />
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">full reader →</Link>
          </div>
        </div>

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
          <div className="space-y-5">
            <p className="text-lg text-zinc-200 font-light">What&rsquo;s on your mind?</p>
            {voiceSwitch()}

            {/* THE FIVE DOORS, laid out like the map (founder, 2026-09-15): the Gestalt door
                across the top, and the four manifest houses beneath it in the map's own order —
                Mind upper left, Emotion upper right, Body lower left, Spirit lower right. */}
            {(() => {
              const byId = Object.fromEntries(DOORS.map(d => [d.id, d]));
              // the minimap's own house colours (components/reader/Minimap.js CHANNEL_COLORS)
              const HOUSE_TINT = { spirit: '#C44444', mind: '#4A8B4A', emotion: '#3D6A99', body: '#8B6B3D', gestalt: '#6B4D8A' };
              const Door = ({ d, className = '' }) => {
                const c = HOUSE_TINT[d.id];
                return (
                  <button key={d.id} onClick={() => { setDoor(d); setQuestion(''); setError(''); }}
                    className={`text-center rounded-xl border px-3 py-2.5 transition-colors break-words hover:brightness-125 ${className}`}
                    style={{ borderColor: c + '99', background: c + '26' }}>
                    <span className="text-[15px] text-zinc-100">{d.label}</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">{d.sub}</span>
                  </button>
                );
              };
              // the Gestalt door is one cell wide, centred over the four; every cell the same height
              return (
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <div className="col-span-2 flex justify-center">
                    <Door d={byId.gestalt} className="w-[calc(50%-4px)]" />
                  </div>
                  <Door d={byId.mind} />
                  <Door d={byId.emotion} />
                  <Door d={byId.body} />
                  <Door d={byId.spirit} />
                </div>
              );
            })()}

            {/* Live reload: EZ readings resume where they stopped. */}
            <div>
              {!showPast ? (
                <button onClick={loadPastList} className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-dotted">
                  open a reading I already started
                </button>
              ) : (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Your EZ readings</span>
                    <button onClick={() => setShowPast(false)} className="text-xs text-zinc-600 hover:text-zinc-300">close</button>
                  </div>
                  {pastReadings.length === 0 && <p className="text-xs text-zinc-600">Nothing here yet.</p>}
                  {pastReadings.slice(0, 12).map((r) => (
                    <button key={r.id} onClick={() => openPast(r.id)} disabled={loading}
                      className="w-full text-left rounded-lg border border-zinc-700/50 px-3 py-2 hover:border-amber-500/40 transition-colors break-words disabled:opacity-40">
                      <span className="text-sm text-zinc-200 break-words">{r.topic || 'Untitled'}</span>
                      <span className="block text-[10px] text-zinc-600 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1">
              <p className="text-xs text-zinc-600 mb-2">or say it your own way</p>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
                placeholder="Ask it the way you would say it out loud."
                className="w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">cards</span>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setCardCount(n)}
                  className={`w-8 h-8 rounded-full text-sm border ${cardCount === n ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{n}</button>
              ))}
              <button onClick={begin} disabled={loading || !question.trim()}
                className="ml-auto px-6 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm font-medium">
                {loading ? 'Drawing…' : 'Ask'}
              </button>
            </div>

            {/* FROM YOUR READINGS, on demand: a centred button at the bottom asks for one
                question drawn from this account's whole history; the suggestion appears above a
                "try another" that asks for a different one. Signed-in with history only. */}
            {user && hasHistory && (
              <div className="pt-2 flex flex-col items-center gap-2">
                {suggested && (
                  <button onClick={() => { setDoor(null); setQuestion(suggested); setError(''); }}
                    className="w-full text-center rounded-xl border border-violet-700/50 bg-violet-950/20 px-4 py-3 hover:border-violet-500/60 transition-colors break-words">
                    <span className="text-[10px] uppercase tracking-wider text-violet-300/70 block mb-1">From your readings — tap to use</span>
                    <span className="text-[15px] text-violet-100">{suggested}</span>
                  </button>
                )}
                <button onClick={suggestFromHistory} disabled={suggesting}
                  className="px-4 py-2 rounded-lg border border-violet-700/50 text-violet-200 text-sm hover:border-violet-500/60 hover:bg-violet-950/30 transition-colors disabled:opacity-50">
                  {suggesting ? 'Reading your history…' : suggested ? 'Try another' : 'Suggest a question from my readings'}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
            <p className="text-xs text-zinc-600 leading-relaxed">
              The Reader opens brief and asks you one question. The reading unfolds from there.
              {hasHistory ? ' Your recent readings are in the room with you.' : ''}
            </p>
          </div>
        )}

        {/* The context step: the door has been chosen, the box becomes "add anything that matters". */}
        {allowed && !draws && door && (
          <div className="space-y-5">
            <button onClick={() => { setDoor(null); setQuestion(''); setError(''); }}
              className="text-xs text-zinc-600 hover:text-zinc-300">&larr; something else</button>

            <p className="text-lg text-zinc-200 font-light break-words">{door.breath}</p>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Add anything that matters — or draw as it stands.
              </label>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
                placeholder="A sentence or two is plenty. Names, what happened, what you are weighing."
                className="w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">cards</span>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setCardCount(n)}
                  className={`w-8 h-8 rounded-full text-sm border ${cardCount === n ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>{n}</button>
              ))}
              <button onClick={begin} disabled={loading}
                className="ml-auto px-6 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm font-medium">
                {loading ? 'Drawing…' : 'Draw'}
              </button>
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
              <div data-ez-map="" className="fixed left-0 right-0 bottom-0 z-[90] bg-zinc-950 select-none"
                style={{ top: overlayTop, opacity: overlayIn ? 1 : 0, transition: 'opacity 550ms ease' }}>
                <TheMap drawMap={{}} colorLayer="status" initialZoom={0.45} showLabels={false} showHouseLabels={false}
                  lowRes showControls={false} cameraRef={cameraRef} className="w-full h-full" />
              </div>
            )}
            <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms ease' }}>
            <p className="text-xs text-zinc-500 italic mb-6 text-center break-words">“{asked || question}”</p>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map((t) => (
                <div key={t.id} data-ez-turn={t.id}
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

                  {/* A card drawn in answer to a reflect or a forge */}
                  {t.draw && (
                    <div className="flex justify-center mb-3">
                      <CardWithMap draw={t.draw} onInfo={openInfo} label={drawLabel(t.draw)} />
                    </div>
                  )}

                  {ensureParagraphBreaks(t.text).split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap break-words">{p.trim()}</p>
                  ))}

                  {/* THE MEDICINE — its own container, because it is half the answer, not an aside.
                      The path is computed from the draw; the words come from the Reader. */}
                  {t.role === 'reader' && t.medicine && (
                    <div className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">
                        {(t.draw ? medicineFor([t.draw]) : medicineFor(draws)).some((m) => m && !m.balanced) ? '◈ The medicine' : '◈ Where this can grow'}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                        {(t.draw ? medicineFor([t.draw]) : medicineFor(draws)).map((m, mi) => (
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
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              {switchBtn('reflect', 'Reflect', '↩')}
              <button onClick={() => setExplain(explain === 'reflect' ? null : 'reflect')}
                className="w-5 h-5 rounded-full border border-zinc-700 text-zinc-500 hover:text-sky-300 hover:border-sky-700 text-[10px] leading-none">?</button>
              {switchBtn('forge', 'Forge', '⚡')}
              <button onClick={() => setExplain(explain === 'forge' ? null : 'forge')}
                className="w-5 h-5 rounded-full border border-zinc-700 text-zinc-500 hover:text-orange-300 hover:border-orange-700 text-[10px] leading-none">?</button>
              {fieldMode && (
                <span className="text-[11px] text-zinc-600">
                  {fieldMode === 'reflect' ? 'ask the field — a card will answer' : 'declare — a card will answer'}
                </span>
              )}
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
                  <button key={i} onClick={() => send(c.text, fieldMode)}
                    className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors break-words ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    {CHIP_LABEL[c.kind] && <span className="text-[10px] uppercase tracking-wider opacity-70 mr-2">{CHIP_LABEL[c.kind]}</span>}
                    {c.text}
                  </button>
                ))}
              </div>
            )}

            {/* Free text always present */}
            <div className="mt-4 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={fieldMode === 'reflect' ? 'Ask the field…' : fieldMode === 'forge' ? 'Declare what you will do…' : 'Answer in your own words…'}
                className="flex-1 min-w-0 rounded-lg bg-zinc-900/70 border border-zinc-700/60 px-3 py-2.5 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] disabled:opacity-40 text-sm whitespace-nowrap">
                {fieldMode ? 'Draw' : 'Say'}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={catchUp} disabled={loading} className="underline decoration-dotted hover:text-zinc-300">Where am I?</button>
              <button onClick={reset} className="underline decoration-dotted hover:text-zinc-300">New question</button>
              {voiceSwitch(true)}
              <span className="ml-auto font-mono text-zinc-600" title="fresh input / cached input (billed at 10%) / output">
                {(usage.input_tokens || 0).toLocaleString()} + {((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)).toLocaleString()} cached / {(usage.output_tokens || 0).toLocaleString()} out · ~${estCost.toFixed(3)}{savedId ? ' · saved' : ''}
              </span>
            </div>
            </div>
          </>
        )}
      </main>

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

      <Footer />
    </div>
  );
}
